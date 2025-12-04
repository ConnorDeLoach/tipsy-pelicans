import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * Extract TikTok video ID from various URL formats.
 * Supports:
 * - https://www.tiktok.com/@user/video/1234567890
 * - https://vm.tiktok.com/ABC123/
 * - https://m.tiktok.com/v/1234567890
 */
function extractVideoId(url: URL): string | null {
  const pathname = url.pathname;

  // Standard format: /@user/video/videoId
  const videoMatch = pathname.match(/\/video\/(\d+)/);
  if (videoMatch) {
    return videoMatch[1];
  }

  // Mobile format: /v/videoId
  const mobileMatch = pathname.match(/\/v\/(\d+)/);
  if (mobileMatch) {
    return mobileMatch[1];
  }

  return null;
}

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

      // Extract video ID from URL or oEmbed response
      let videoId = extractVideoId(url);

      // Fallback: try to extract from the embed HTML if URL parsing failed
      if (!videoId && data.html) {
        const idMatch = data.html.match(/data-video-id="(\d+)"/);
        if (idMatch) {
          videoId = idMatch[1];
        }
      }

      return {
        title: data.title,
        description: `By @${data.author_name}`,
        siteName: "TikTok",
        type: "video",
        imageUrl: data.thumbnail_url,
        faviconUrl: "https://www.tiktok.com/favicon.ico",
        videoId: videoId ?? undefined,
        embedProvider: "tiktok",
      };
    } catch (error) {
      console.error(`[TikTok] oEmbed error:`, error);
      return null;
    }
  },
};
