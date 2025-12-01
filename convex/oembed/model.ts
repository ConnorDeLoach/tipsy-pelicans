import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * oEmbed cache table for storing fetched embed data from Meta Graph API.
 * Caches Instagram/Facebook/Threads embed HTML to avoid repeated API calls.
 */
export const oembedCacheTable = defineTable({
  // Original URL (normalized - query params stripped)
  url: v.string(),
  // SHA-256 hash of URL for efficient indexing
  urlHash: v.string(),
  // Provider type
  provider: v.union(
    v.literal("instagram"),
    v.literal("facebook"),
    v.literal("threads")
  ),
  // Embed HTML returned by Meta oEmbed API
  html: v.string(),
  // Metadata from response
  authorName: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  thumbnailWidth: v.optional(v.number()),
  thumbnailHeight: v.optional(v.number()),
  width: v.optional(v.number()),
  // Timestamps
  fetchedAt: v.number(),
  // Cache expires after 24 hours (Meta recommends refreshing periodically)
  expiresAt: v.number(),
})
  .index("by_url_hash", ["urlHash"])
  .index("by_expires", ["expiresAt"]);

/**
 * Embed status for tracking embeds attached to messages.
 */
export const embedStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("error")
);

/**
 * Embed object validator for message embeds field.
 */
export const messageEmbedValidator = v.object({
  type: v.union(
    v.literal("instagram"),
    v.literal("facebook"),
    v.literal("threads")
  ),
  url: v.string(),
  urlHash: v.string(),
  status: embedStatusValidator,
  errorMessage: v.optional(v.string()),
});

// Cache TTL: 24 hours in milliseconds
export const OEMBED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Rate limit: max embeds per user per minute
export const OEMBED_USER_RATE_LIMIT = 10;

// URL patterns for supported providers
export const INSTAGRAM_URL_PATTERN =
  /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[\w-]+\/?/i;

export const FACEBOOK_URL_PATTERN =
  /^https?:\/\/(www\.|m\.)?facebook\.com\/.+\/(posts|videos|photos|watch)\/.+/i;

export const THREADS_URL_PATTERN =
  /^https?:\/\/(www\.)?threads\.net\/@[\w.]+\/post\/[\w]+/i;
