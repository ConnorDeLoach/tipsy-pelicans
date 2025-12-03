import * as cheerio from "cheerio";
import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * General Open Graph provider.
 * Extracts og:*, twitter:*, and standard meta tags from any URL.
 * This is the catch-all provider with lowest priority.
 */
export const ogProvider: LinkPreviewProvider = {
  name: "og",
  priority: 0, // Lowest priority, catch-all

  matches: () => true, // Matches any URL

  extract: async (html: string, url: URL): Promise<ParsedPreview | null> => {
    const $ = cheerio.load(html);

    /**
     * Get meta content from multiple possible selectors.
     * Returns first non-empty value found.
     */
    const getMeta = (selectors: string[]): string | undefined => {
      for (const sel of selectors) {
        const content = $(sel).attr("content");
        if (content?.trim()) return content.trim();
      }
      return undefined;
    };

    // Extract title (OG > Twitter > HTML title)
    const title =
      getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      $("title").text().trim() ||
      undefined;

    // Extract description (OG > Twitter > meta description)
    const description = getMeta([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]);

    // Extract image (OG > Twitter)
    let imageUrl = getMeta([
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]);

    // Resolve relative image URLs
    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        imageUrl = new URL(imageUrl, url.origin).toString();
      } catch {
        // Invalid URL, ignore
        imageUrl = undefined;
      }
    }

    // Extract site name
    const siteName = getMeta(['meta[property="og:site_name"]']);

    // Extract type
    const type = getMeta(['meta[property="og:type"]']);

    // Extract or derive favicon
    let faviconUrl =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href");

    // Resolve relative favicon URLs
    if (faviconUrl && !faviconUrl.startsWith("http")) {
      try {
        faviconUrl = new URL(faviconUrl, url.origin).toString();
      } catch {
        faviconUrl = undefined;
      }
    }

    // Fallback to default favicon path
    if (!faviconUrl) {
      faviconUrl = `${url.origin}/favicon.ico`;
    }

    // Skip if no meaningful OG data found
    // (user preference: skip preview entirely if no OG tags)
    if (!title && !description && !imageUrl) {
      return null;
    }

    return {
      title,
      description,
      imageUrl,
      siteName,
      type,
      faviconUrl,
    };
  },
};
