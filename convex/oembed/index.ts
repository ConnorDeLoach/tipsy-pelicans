/**
 * oEmbed Module
 *
 * Provides Instagram, Facebook, and Threads post embedding via Meta's oEmbed API.
 *
 * Usage:
 * - Use `requestEmbed` action to fetch embed data for a URL
 * - Use `getEmbed` / `getEmbeds` queries to retrieve cached embed data
 * - Use `extractEmbeddableUrls` helper to find embeddable URLs in message text
 */

// Re-export public API
export {
  requestEmbed,
  extractEmbeddableUrls,
  isEmbeddableUrl,
} from "./instagram";
export { getEmbed, getEmbeds } from "./queries";

// Re-export types
export type { CachedEmbedData, RequestEmbedResult } from "./instagram";
export {
  messageEmbedValidator,
  OEMBED_CACHE_TTL_MS,
  OEMBED_USER_RATE_LIMIT,
  INSTAGRAM_URL_PATTERN,
  FACEBOOK_URL_PATTERN,
  THREADS_URL_PATTERN,
} from "./model";
