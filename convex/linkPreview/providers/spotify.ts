import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * Spotify provider using oEmbed API (no auth required).
 * Works for tracks, albums, playlists, artists, episodes, shows.
 */
export const spotifyProvider: LinkPreviewProvider = {
  name: "spotify",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return host === "open.spotify.com" || host === "spotify.com";
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(
        url.toString()
      )}`;

      const response = await fetch(oembedUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.error(`[Spotify] oEmbed returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Determine type from URL path
      const pathParts = url.pathname.split("/");
      const contentType = pathParts[1] || "music"; // track, album, playlist, artist, etc.

      return {
        title: data.title,
        description: `${
          contentType.charAt(0).toUpperCase() + contentType.slice(1)
        } on Spotify`,
        siteName: "Spotify",
        type: "music",
        imageUrl: data.thumbnail_url,
        faviconUrl: "https://open.spotify.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[Spotify] oEmbed error:`, error);
      return null;
    }
  },
};
