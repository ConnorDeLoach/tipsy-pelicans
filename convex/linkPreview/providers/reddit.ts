import type { LinkPreviewProvider, ParsedPreview } from "./types";

/**
 * Reddit provider using their JSON API (append .json to any URL).
 * Reddit doesn't have oEmbed but their JSON API is open.
 */
export const redditProvider: LinkPreviewProvider = {
  name: "reddit",
  priority: 10,

  matches: (url: URL) => {
    const host = url.hostname.toLowerCase();
    return (
      host === "reddit.com" ||
      host === "www.reddit.com" ||
      host === "old.reddit.com" ||
      host === "new.reddit.com"
    );
  },

  extract: async (_html: string, url: URL): Promise<ParsedPreview | null> => {
    try {
      // Reddit's JSON API - append .json to the URL
      let jsonUrl = url.toString();
      // Remove trailing slash if present
      if (jsonUrl.endsWith("/")) {
        jsonUrl = jsonUrl.slice(0, -1);
      }
      jsonUrl += ".json";

      const response = await fetch(jsonUrl, {
        headers: {
          Accept: "application/json",
          // Reddit requires a User-Agent
          "User-Agent": "TipsyPelicans/1.0",
        },
      });

      if (!response.ok) {
        console.error(`[Reddit] JSON API returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Reddit returns an array, first element is the post, second is comments
      const postData = data[0]?.data?.children?.[0]?.data;
      if (!postData) {
        console.error(`[Reddit] Could not find post data`);
        return null;
      }

      // Get subreddit for description
      const subreddit =
        postData.subreddit_name_prefixed || `r/${postData.subreddit}`;

      // Get thumbnail (Reddit provides various preview sizes)
      let imageUrl: string | undefined;
      if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
        imageUrl = postData.thumbnail;
      }
      // Try to get higher quality preview
      if (postData.preview?.images?.[0]?.source?.url) {
        imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, "&");
      }

      return {
        title: postData.title,
        description: `${subreddit} • ${postData.score} points • ${postData.num_comments} comments`,
        siteName: "Reddit",
        type: postData.is_video ? "video" : "article",
        imageUrl,
        faviconUrl: "https://www.reddit.com/favicon.ico",
      };
    } catch (error) {
      console.error(`[Reddit] JSON API error:`, error);
      return null;
    }
  },
};
