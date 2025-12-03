import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * YouTube-specific provider using oEmbed API.
 * YouTube blocks OG tags for bot User-Agents, so we use their public API instead.
 */
export const youtubeProvider: LinkPreviewProvider = {
  name: "youtube",
  priority: 10, // Higher priority than generic OG

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "youtu.be" ||
      host === "m.youtube.com"
    );
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    // Normalize URL for oEmbed
    let videoUrl = url.toString();

    // Convert youtu.be short URLs to full format
    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.slice(1);
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        videoUrl
      )}&format=json`;

      const response = await fetch(oembedUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[YouTube] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Extract video ID for thumbnail
      let videoId: string | null = null;
      const match = videoUrl.match(/[?&]v=([^&]+)/);
      if (match) {
        videoId = match[1];
      }

      // YouTube oEmbed returns: title, author_name, author_url, thumbnail_url, etc.
      return {
        title: data.title,
        description: `By ${data.author_name}`, // oEmbed doesn't include description
        siteName: "YouTube",
        type: "video",
        // Use high-quality thumbnail (maxresdefault or hqdefault)
        imageUrl: videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : data.thumbnail_url,
        faviconUrl: "https://www.youtube.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[YouTube] oEmbed error:`, error);
      return null;
    }
  },
};
