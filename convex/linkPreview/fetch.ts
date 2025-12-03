import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  normalizeUrl,
  hashUrl,
  isUrlSafeToFetch,
  LINK_PREVIEW_TTL_MS,
  FETCH_TIMEOUT_MS,
  MAX_HTML_BYTES,
} from "./model";
import { getProviderForUrl } from "./providers";

// Get the app URL for calling Next.js API routes
function getAppUrl(): string {
  // Use CONVEX_SITE_URL which is set by Convex, or APP_URL env var
  // Note: In local dev, image processing won't work unless you deploy
  // or use a tunnel - but text preview will still work
  return process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
}

/**
 * Fetch HTML from a URL with timeout and size limits.
 */
async function fetchHtml(
  url: string
): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Use a real browser User-Agent to avoid bot detection
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[LinkPreview] HTTP ${response.status} for ${url}`);
      return null;
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      console.log(`[LinkPreview] Non-HTML content type: ${contentType}`);
      return null;
    }

    // Read with size limit
    const reader = response.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      totalSize += value.length;

      if (totalSize > MAX_HTML_BYTES) {
        // We have enough to parse <head>, stop reading
        break;
      }
    }

    const decoder = new TextDecoder();
    const html = decoder.decode(
      chunks.reduce((acc, chunk) => {
        const result = new Uint8Array(acc.length + chunk.length);
        result.set(acc);
        result.set(chunk, acc.length);
        return result;
      }, new Uint8Array(0))
    );

    return { html, finalUrl: response.url };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[LinkPreview] Timeout fetching ${url}`);
    } else {
      console.error(`[LinkPreview] Error fetching ${url}:`, error);
    }
    return null;
  }
}

/**
 * Process an image through the Next.js API route.
 */
async function processImage(imageUrl: string): Promise<{
  full: ArrayBuffer;
  thumb: ArrayBuffer;
  width: number;
  height: number;
} | null> {
  const appUrl = getAppUrl();

  try {
    const response = await fetch(`${appUrl}/api/link-preview/process-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[LinkPreview] Image processing failed: ${error}`);
      return null;
    }

    const data = await response.json();

    // Convert base64 to ArrayBuffer
    const fullBytes = Uint8Array.from(atob(data.full), (c) => c.charCodeAt(0));
    const thumbBytes = Uint8Array.from(atob(data.thumb), (c) =>
      c.charCodeAt(0)
    );

    return {
      full: fullBytes.buffer,
      thumb: thumbBytes.buffer,
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error(`[LinkPreview] Error processing image:`, error);
    return null;
  }
}

/**
 * Process a single URL and cache the preview.
 */
export const processUrl = internalAction({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const normalizedUrl = normalizeUrl(url);
    const urlHash = await hashUrl(normalizedUrl);
    const now = Date.now();

    // Check if we have a valid cached entry
    const cached = await ctx.runQuery(
      internal.linkPreview.queries.getByUrlHash,
      { urlHash }
    );

    if (cached && cached.expiresAt > now && cached.status !== "pending") {
      console.log(`[LinkPreview] Cache hit for ${normalizedUrl}`);
      return;
    }

    // Validate URL is safe to fetch
    if (!isUrlSafeToFetch(normalizedUrl)) {
      console.error(`[LinkPreview] Unsafe URL blocked: ${normalizedUrl}`);
      await ctx.runMutation(internal.linkPreview.mutations.upsertCache, {
        url: normalizedUrl,
        urlHash,
        status: "error",
        errorMessage: "URL blocked for security reasons",
        fetchedAt: now,
        expiresAt: now + LINK_PREVIEW_TTL_MS,
      });
      return;
    }

    // Mark as pending
    await ctx.runMutation(internal.linkPreview.mutations.markPending, {
      url: normalizedUrl,
      urlHash,
      fetchedAt: now,
      expiresAt: now + LINK_PREVIEW_TTL_MS,
    });

    // Fetch HTML
    console.log(`[LinkPreview] Fetching ${normalizedUrl}`);
    const fetchResult = await fetchHtml(normalizedUrl);

    if (!fetchResult) {
      await ctx.runMutation(internal.linkPreview.mutations.upsertCache, {
        url: normalizedUrl,
        urlHash,
        status: "error",
        errorMessage: "Failed to fetch URL",
        fetchedAt: now,
        expiresAt: now + LINK_PREVIEW_TTL_MS,
      });
      return;
    }

    const { html, finalUrl } = fetchResult;

    // Parse with appropriate provider
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(finalUrl);
    } catch {
      parsedUrl = new URL(normalizedUrl);
    }

    const provider = getProviderForUrl(parsedUrl);
    console.log(`[LinkPreview] Using provider: ${provider.name}`);

    // Debug: check for OG tags in the HTML
    const hasOgTitle = html.includes("og:title");
    const hasOgDesc = html.includes("og:description");
    const hasOgImage = html.includes("og:image");
    console.log(
      `[LinkPreview] OG tags found: title=${hasOgTitle}, desc=${hasOgDesc}, image=${hasOgImage}`
    );

    // Log the <head> section if small enough
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      console.log(`[LinkPreview] Head length: ${headMatch[1].length} chars`);
    }

    const parsed = await provider.extract(html, parsedUrl);

    if (!parsed) {
      // No OG data found, mark as no_preview
      console.log(`[LinkPreview] No preview data for ${normalizedUrl}`);
      await ctx.runMutation(internal.linkPreview.mutations.upsertCache, {
        url: normalizedUrl,
        urlHash,
        canonicalUrl: finalUrl !== normalizedUrl ? finalUrl : undefined,
        status: "no_preview",
        fetchedAt: now,
        expiresAt: now + LINK_PREVIEW_TTL_MS,
      });
      return;
    }

    // Process image if present
    let imageFullId: string | undefined;
    let imageThumbId: string | undefined;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (parsed.imageUrl) {
      console.log(`[LinkPreview] Processing image: ${parsed.imageUrl}`);
      const imageData = await processImage(parsed.imageUrl);

      if (imageData) {
        // Store images in Convex storage
        const fullBlob = new Blob([imageData.full], { type: "image/webp" });
        const thumbBlob = new Blob([imageData.thumb], { type: "image/webp" });

        imageFullId = await ctx.storage.store(fullBlob);
        imageThumbId = await ctx.storage.store(thumbBlob);
        imageWidth = imageData.width;
        imageHeight = imageData.height;

        console.log(`[LinkPreview] Stored images for ${normalizedUrl}`);
      }
    }

    // Save to cache
    await ctx.runMutation(internal.linkPreview.mutations.upsertCache, {
      url: normalizedUrl,
      urlHash,
      canonicalUrl: finalUrl !== normalizedUrl ? finalUrl : undefined,
      title: parsed.title,
      description: parsed.description,
      siteName: parsed.siteName,
      type: parsed.type,
      faviconUrl: parsed.faviconUrl,
      imageFullId: imageFullId as any, // Type coercion for storage ID
      imageThumbId: imageThumbId as any,
      imageWidth,
      imageHeight,
      status: "success",
      fetchedAt: now,
      expiresAt: now + LINK_PREVIEW_TTL_MS,
    });

    console.log(
      `[LinkPreview] Successfully cached preview for ${normalizedUrl}`
    );
  },
});

/**
 * Process all URLs extracted from a message.
 * Called asynchronously after message is sent.
 */
export const processMessageUrls = internalAction({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (ctx, { urls }) => {
    // Process each URL (they run in parallel within the action)
    await Promise.all(
      urls.map((url) =>
        ctx.runAction(internal.linkPreview.fetch.processUrl, { url })
      )
    );
  },
});
