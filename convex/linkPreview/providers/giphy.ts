import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * Giphy provider using oEmbed API (no auth required).
 */
export const giphyProvider: LinkPreviewProvider = {
  name: "giphy",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return (
      host === "giphy.com" ||
      host === "www.giphy.com" ||
      host === "media.giphy.com"
    );
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      const oembedUrl = `https://giphy.com/services/oembed?url=${encodeURIComponent(
        url.toString()
      )}`;

      const response = await fetch(oembedUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.error(`[Giphy] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Extract GIF URL from embed HTML if available
      let imageUrl = data.url;
      if (data.image) {
        imageUrl = data.image;
      }

      return {
        title: data.title || "GIF",
        description: "Giphy",
        siteName: "Giphy",
        type: "image",
        imageUrl,
        faviconUrl: "https://giphy.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[Giphy] oEmbed error:`, error);
      return null;
    }
  },
};
