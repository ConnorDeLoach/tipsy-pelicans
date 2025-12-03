import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * Vimeo provider using oEmbed API (no auth required).
 */
export const vimeoProvider: LinkPreviewProvider = {
  name: "vimeo",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return host === "vimeo.com" || host === "www.vimeo.com";
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
        url.toString()
      )}`;

      const response = await fetch(oembedUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.error(`[Vimeo] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      return {
        title: data.title,
        description: data.description || `By ${data.author_name}`,
        siteName: "Vimeo",
        type: "video",
        imageUrl: data.thumbnail_url,
        faviconUrl: "https://vimeo.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[Vimeo] oEmbed error:`, error);
      return null;
    }
  },
};
