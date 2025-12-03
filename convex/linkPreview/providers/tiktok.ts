import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * TikTok provider using oEmbed API (no auth required).
 */
export const tiktokProvider: LinkPreviewProvider = {
  name: "tiktok",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return (
      host === "tiktok.com" ||
      host === "www.tiktok.com" ||
      host === "vm.tiktok.com" ||
      host === "m.tiktok.com"
    );
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(
        url.toString()
      )}`;

      const response = await fetch(oembedUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.error(`[TikTok] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      return {
        title: data.title,
        description: `By @${data.author_name}`,
        siteName: "TikTok",
        type: "video",
        imageUrl: data.thumbnail_url,
        faviconUrl: "https://www.tiktok.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[TikTok] oEmbed error:`, error);
      return null;
    }
  },
};
