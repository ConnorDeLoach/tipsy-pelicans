import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Upsert oEmbed cache entry
 */
export const upsertCache = internalMutation({
  args: {
    url: v.string(),
    urlHash: v.string(),
    provider: v.union(
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("threads")
    ),
    html: v.string(),
    authorName: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    thumbnailWidth: v.optional(v.number()),
    thumbnailHeight: v.optional(v.number()),
    width: v.optional(v.number()),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if entry already exists
    const existing = await ctx.db
      .query("oembedCache")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", args.urlHash))
      .unique();

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        html: args.html,
        authorName: args.authorName,
        thumbnailUrl: args.thumbnailUrl,
        thumbnailWidth: args.thumbnailWidth,
        thumbnailHeight: args.thumbnailHeight,
        width: args.width,
        fetchedAt: args.fetchedAt,
        expiresAt: args.expiresAt,
      });
      return existing._id;
    }

    // Insert new cache entry
    return await ctx.db.insert("oembedCache", args);
  },
});

/**
 * Update embed status on a message
 */
export const updateEmbedStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    urlHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, urlHash, status, errorMessage }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      console.error(`[oEmbed] Message not found: ${messageId}`);
      return;
    }

    // Update the embed status in the embeds array
    const embeds = message.embeds ?? [];
    const updatedEmbeds = embeds.map((embed) => {
      if (embed.urlHash === urlHash) {
        return {
          type: embed.type,
          url: embed.url,
          urlHash: embed.urlHash,
          status,
          errorMessage: errorMessage ?? embed.errorMessage,
        } as const;
      }
      return embed;
    });

    await ctx.db.patch(messageId, { embeds: updatedEmbeds });
  },
});

/**
 * Clean up expired cache entries (run periodically via cron)
 */
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deleted = 0;

    // Find expired entries (limit to 100 per run to avoid timeout)
    const expired = await ctx.db
      .query("oembedCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100);

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[oEmbed] Cleaned up ${deleted} expired cache entries`);
    }

    return { deleted };
  },
});
