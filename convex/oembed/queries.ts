import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get cached embed by URL hash (internal use)
 */
export const getCachedEmbed = internalQuery({
  args: { urlHash: v.string() },
  handler: async (ctx, { urlHash }) => {
    return await ctx.db
      .query("oembedCache")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
      .unique();
  },
});

/**
 * Get embed data for display (public query)
 * Returns null if not cached or expired
 */
export const getEmbed = query({
  args: { urlHash: v.string() },
  handler: async (ctx, { urlHash }) => {
    const cached = await ctx.db
      .query("oembedCache")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
      .unique();

    if (!cached || cached.expiresAt < Date.now()) {
      return null;
    }

    return {
      url: cached.url,
      provider: cached.provider,
      html: cached.html,
      authorName: cached.authorName,
      thumbnailUrl: cached.thumbnailUrl,
      width: cached.width,
    };
  },
});

/**
 * Get multiple embeds by URL hashes (for message rendering)
 */
export const getEmbeds = query({
  args: { urlHashes: v.array(v.string()) },
  handler: async (ctx, { urlHashes }) => {
    const now = Date.now();
    const results: Record<
      string,
      {
        url: string;
        provider: string;
        html: string;
        authorName?: string;
        thumbnailUrl?: string;
        width?: number;
      } | null
    > = {};

    for (const urlHash of urlHashes) {
      const cached = await ctx.db
        .query("oembedCache")
        .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
        .unique();

      if (cached && cached.expiresAt > now) {
        results[urlHash] = {
          url: cached.url,
          provider: cached.provider,
          html: cached.html,
          authorName: cached.authorName,
          thumbnailUrl: cached.thumbnailUrl,
          width: cached.width,
        };
      } else {
        results[urlHash] = null;
      }
    }

    return results;
  },
});
