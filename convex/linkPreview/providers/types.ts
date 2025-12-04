/**
 * Parsed preview data from a provider.
 */
export interface ParsedPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  type?: string;
  faviconUrl?: string;
  /** Video ID for embeddable video content (e.g., TikTok, YouTube) */
  videoId?: string;
  /** Provider name for embed routing (e.g., "tiktok", "youtube") */
  embedProvider?: string;
}

/**
 * Link preview provider interface.
 * Providers extract preview data from HTML for specific URL patterns.
 */
export interface LinkPreviewProvider {
  /** Provider name for logging */
  name: string;

  /** Priority (higher = checked first, 0 = catch-all) */
  priority: number;

  /** Check if this provider handles the given URL */
  matches: (url: URL) => boolean;

  /**
   * Extract preview data from HTML.
   * Returns null if no meaningful preview data found.
   */
  extract: (html: string, url: URL) => Promise<ParsedPreview | null>;
}
