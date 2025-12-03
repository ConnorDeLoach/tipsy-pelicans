import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * SoundCloud provider using oEmbed API (no auth required).
 */
export const soundcloudProvider: LinkPreviewProvider = {
  name: "soundcloud",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return host === "soundcloud.com" || host === "www.soundcloud.com";
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(
        url.toString()
      )}&format=json`;

      const response = await fetch(oembedUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.error(`[SoundCloud] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      return {
        title: data.title,
        description:
          data.description?.slice(0, 200) || `By ${data.author_name}`,
        siteName: "SoundCloud",
        type: "music",
        imageUrl: data.thumbnail_url,
        faviconUrl: "https://soundcloud.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[SoundCloud] oEmbed error:`, error);
      return null;
    }
  },
};
