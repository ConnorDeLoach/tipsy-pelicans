import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  INSTAGRAM_URL_PATTERN,
  FACEBOOK_URL_PATTERN,
  THREADS_URL_PATTERN,
  OEMBED_CACHE_TTL_MS,
} from "./model";

// Meta Graph API version
const GRAPH_API_VERSION = "v21.0";

// Meta oEmbed endpoints
const OEMBED_ENDPOINTS = {
  instagram: `https://graph.facebook.com/${GRAPH_API_VERSION}/instagram_oembed`,
  facebook: `https://graph.facebook.com/${GRAPH_API_VERSION}/oembed_post`,
  threads: `https://graph.facebook.com/${GRAPH_API_VERSION}/threads_oembed`,
} as const;

type Provider = keyof typeof OEMBED_ENDPOINTS;

/**
 * Meta oEmbed API response structure
 */
interface OEmbedResponse {
  version: string;
  author_name?: string;
  provider_name: string;
  provider_url: string;
  width: number;
  html: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

/**
 * Cached embed data structure
 */
export interface CachedEmbedData {
  url: string;
  urlHash: string;
  provider: Provider;
  html: string;
  authorName?: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  width?: number;
  fetchedAt: number;
  expiresAt: number;
}

/**
 * Result of requesting an embed
 */
export type RequestEmbedResult =
  | {
      success: true;
      data: {
        html: string;
        authorName?: string;
        thumbnailUrl?: string;
        provider: Provider;
      };
    }
  | { success: false; error: string };

/**
 * Normalize URL by removing query parameters and trailing slashes
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query params and hash
    parsed.search = "";
    parsed.hash = "";
    // Remove trailing slash
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Generate SHA-256 hash of URL for cache lookup
 */
async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Detect provider from URL
 */
function detectProvider(url: string): Provider | null {
  if (INSTAGRAM_URL_PATTERN.test(url)) return "instagram";
  if (FACEBOOK_URL_PATTERN.test(url)) return "facebook";
  if (THREADS_URL_PATTERN.test(url)) return "threads";
  return null;
}

/**
 * Validate that a URL is supported for embedding
 */
export function isEmbeddableUrl(url: string): boolean {
  return detectProvider(url) !== null;
}

/**
 * Extract all embeddable URLs from a message body
 */
export function extractEmbeddableUrls(body: string): string[] {
  // Match URLs in the message
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = body.match(urlRegex) || [];

  return matches
    .map(normalizeUrl)
    .filter(isEmbeddableUrl)
    .filter((url, index, self) => self.indexOf(url) === index); // dedupe
}

/**
 * Fetch oEmbed data from Meta Graph API
 * This is an internal action called by the scheduler
 */
export const fetchOEmbed = internalAction({
  args: {
    url: v.string(),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { url, messageId }): Promise<CachedEmbedData | null> => {
    const normalizedUrl = normalizeUrl(url);
    const urlHash = await hashUrl(normalizedUrl);
    const provider = detectProvider(normalizedUrl);

    if (!provider) {
      console.error(`[oEmbed] Unsupported URL provider: ${url}`);
      if (messageId) {
        await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
          messageId,
          urlHash,
          status: "error",
          errorMessage: "Unsupported URL",
        });
      }
      return null;
    }

    // Check cache first
    const cached: CachedEmbedData | null = (await ctx.runQuery(
      internal.oembed.queries.getCachedEmbed,
      {
        urlHash,
      }
    )) as CachedEmbedData | null;

    if (cached && cached.expiresAt > Date.now()) {
      // Cache hit - update message if provided
      if (messageId) {
        await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
          messageId,
          urlHash,
          status: "ready",
        });
      }
      return cached;
    }

    // Fetch from Meta API
    const appId = process.env.META_APP_ID;
    const clientToken = process.env.META_CLIENT_TOKEN;

    if (!appId || !clientToken) {
      console.error("[oEmbed] Missing META_APP_ID or META_CLIENT_TOKEN");
      if (messageId) {
        await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
          messageId,
          urlHash,
          status: "error",
          errorMessage: "Server configuration error",
        });
      }
      return null;
    }

    const accessToken = `${appId}|${clientToken}`;
    const endpoint = OEMBED_ENDPOINTS[provider];
    const apiUrl = new URL(endpoint);
    apiUrl.searchParams.set("url", normalizedUrl);
    apiUrl.searchParams.set("omitscript", "true");
    apiUrl.searchParams.set("access_token", accessToken);

    try {
      console.log(`[oEmbed] Fetching ${provider} embed for: ${normalizedUrl}`);

      const response = await fetch(apiUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[oEmbed] API error ${response.status}: ${errorText}`);

        if (messageId) {
          await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
            messageId,
            urlHash,
            status: "error",
            errorMessage: `API error: ${response.status}`,
          });
        }
        return null;
      }

      const data: OEmbedResponse = await response.json();

      if (!data.html) {
        console.error("[oEmbed] No HTML in response");
        if (messageId) {
          await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
            messageId,
            urlHash,
            status: "error",
            errorMessage: "No embed HTML returned",
          });
        }
        return null;
      }

      // Store in cache
      const now = Date.now();
      const cacheData = {
        url: normalizedUrl,
        urlHash,
        provider,
        html: data.html,
        authorName: data.author_name,
        thumbnailUrl: data.thumbnail_url,
        thumbnailWidth: data.thumbnail_width,
        thumbnailHeight: data.thumbnail_height,
        width: data.width,
        fetchedAt: now,
        expiresAt: now + OEMBED_CACHE_TTL_MS,
      };

      await ctx.runMutation(internal.oembed.mutations.upsertCache, cacheData);

      // Update message embed status
      if (messageId) {
        await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
          messageId,
          urlHash,
          status: "ready",
        });
      }

      console.log(`[oEmbed] Successfully cached embed for: ${normalizedUrl}`);
      return cacheData;
    } catch (error) {
      console.error("[oEmbed] Fetch error:", error);
      if (messageId) {
        await ctx.runMutation(internal.oembed.mutations.updateEmbedStatus, {
          messageId,
          urlHash,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
      return null;
    }
  },
});

/**
 * Public action to request an embed (for demo/review page)
 * Rate limited and validates URL before processing
 */
export const requestEmbed = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<RequestEmbedResult> => {
    const normalizedUrl = normalizeUrl(url);
    const provider = detectProvider(normalizedUrl);

    if (!provider) {
      return {
        success: false,
        error: "URL is not a supported Instagram, Facebook, or Threads post",
      };
    }

    const urlHash = await hashUrl(normalizedUrl);

    // Check cache first
    const cached: CachedEmbedData | null = (await ctx.runQuery(
      internal.oembed.queries.getCachedEmbed,
      {
        urlHash,
      }
    )) as CachedEmbedData | null;

    if (cached && cached.expiresAt > Date.now()) {
      return {
        success: true,
        data: {
          html: cached.html,
          authorName: cached.authorName,
          thumbnailUrl: cached.thumbnailUrl,
          provider: cached.provider,
        },
      };
    }

    // Fetch fresh data
    const result: CachedEmbedData | null = (await ctx.runAction(
      internal.oembed.instagram.fetchOEmbed,
      {
        url: normalizedUrl,
      }
    )) as CachedEmbedData | null;

    if (!result) {
      return {
        success: false,
        error: "Failed to fetch embed data from Meta API",
      };
    }

    return {
      success: true,
      data: {
        html: result.html,
        authorName: result.authorName,
        thumbnailUrl: result.thumbnailUrl,
        provider: result.provider,
      },
    };
  },
});
