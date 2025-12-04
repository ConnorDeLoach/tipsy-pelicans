import { defineTable } from "convex/server";
import { v } from "convex/values";

// Cache TTL: 7 days in milliseconds
export const LINK_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Fetch constraints
export const FETCH_TIMEOUT_MS = 5000;
export const MAX_HTML_BYTES = 100 * 1024; // 100KB - OG tags are in <head>
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Image dimensions (matches existing chat image pattern)
export const PREVIEW_FULL_MAX_DIMENSION = 640;
export const PREVIEW_THUMB_MAX_DIMENSION = 320;

export const linkPreviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("success"),
  v.literal("error"),
  v.literal("no_preview") // URL fetched but no OG data found
);

export type LinkPreviewStatus = "pending" | "success" | "error" | "no_preview";

export const linkPreviewsTable = defineTable({
  // URL identification
  url: v.string(), // Original URL
  urlHash: v.string(), // SHA-256 for dedup/indexing
  canonicalUrl: v.optional(v.string()), // After redirects

  // OG metadata
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  siteName: v.optional(v.string()),
  type: v.optional(v.string()), // og:type (website, article, video, etc.)
  faviconUrl: v.optional(v.string()),

  // Image URL (direct link, not proxied)
  originalImageUrl: v.optional(v.string()),

  // Legacy: Proxied image (stored in Convex storage) - kept for existing data
  imageFullId: v.optional(v.id("_storage")),
  imageThumbId: v.optional(v.id("_storage")),
  imageWidth: v.optional(v.number()),
  imageHeight: v.optional(v.number()),

  // Embed support for video content
  videoId: v.optional(v.string()), // Platform-specific video ID for embedding
  embedProvider: v.optional(v.string()), // Provider name (e.g., "tiktok", "youtube")

  // Status tracking
  status: linkPreviewStatusValidator,
  errorMessage: v.optional(v.string()),

  // Timestamps
  fetchedAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_url_hash", ["urlHash"])
  .index("by_expires", ["expiresAt"])
  .index("by_status", ["status"]);

/**
 * Normalize URL by removing tracking params and trailing slashes.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common tracking params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
    ];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    // Remove hash
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
 * Generate SHA-256 hash of URL for cache lookup.
 */
export async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract all HTTP(S) URLs from a message body.
 */
export function extractUrls(body: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = body.match(urlRegex) || [];

  return matches
    .map(normalizeUrl)
    .filter((url, index, self) => self.indexOf(url) === index); // dedupe
}

/**
 * Validate URL is safe to fetch (basic SSRF protection).
 */
export function isUrlSafeToFetch(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http(s)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // Block localhost and private IPs
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") ||
      host.startsWith("172.17.") ||
      host.startsWith("172.18.") ||
      host.startsWith("172.19.") ||
      host.startsWith("172.2") ||
      host.startsWith("172.30.") ||
      host.startsWith("172.31.") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
