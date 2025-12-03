import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { linkPreviewStatusValidator } from "./model";

/**
 * Upsert a link preview cache entry.
 */
export const upsertCache = internalMutation({
  args: {
    url: v.string(),
    urlHash: v.string(),
    canonicalUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    siteName: v.optional(v.string()),
    type: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    originalImageUrl: v.optional(v.string()),
    imageFullId: v.optional(v.id("_storage")),
    imageThumbId: v.optional(v.id("_storage")),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    status: linkPreviewStatusValidator,
    errorMessage: v.optional(v.string()),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if entry already exists
    const existing = await ctx.db
      .query("linkPreviews")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", args.urlHash))
      .unique();

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        canonicalUrl: args.canonicalUrl,
        title: args.title,
        description: args.description,
        siteName: args.siteName,
        type: args.type,
        faviconUrl: args.faviconUrl,
        originalImageUrl: args.originalImageUrl,
        imageFullId: args.imageFullId,
        imageThumbId: args.imageThumbId,
        imageWidth: args.imageWidth,
        imageHeight: args.imageHeight,
        status: args.status,
        errorMessage: args.errorMessage,
        fetchedAt: args.fetchedAt,
        expiresAt: args.expiresAt,
      });
      return existing._id;
    }

    // Insert new cache entry
    return await ctx.db.insert("linkPreviews", args);
  },
});

/**
 * Mark a preview as pending (before fetch starts).
 */
export const markPending = internalMutation({
  args: {
    url: v.string(),
    urlHash: v.string(),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { url, urlHash, fetchedAt, expiresAt }) => {
    const existing = await ctx.db
      .query("linkPreviews")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
      .unique();

    if (existing) {
      // Already exists, don't overwrite
      return existing._id;
    }

    return await ctx.db.insert("linkPreviews", {
      url,
      urlHash,
      status: "pending",
      fetchedAt,
      expiresAt,
    });
  },
});

/**
 * Clean up expired cache entries (run periodically via cron).
 */
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deleted = 0;

    // Find expired entries (limit to 100 per run to avoid timeout)
    const expired = await ctx.db
      .query("linkPreviews")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100);

    for (const entry of expired) {
      // Delete associated storage files
      if (entry.imageFullId) {
        await ctx.storage.delete(entry.imageFullId);
      }
      if (entry.imageThumbId) {
        await ctx.storage.delete(entry.imageThumbId);
      }
      await ctx.db.delete(entry._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[LinkPreview] Cleaned up ${deleted} expired cache entries`);
    }

    return { deleted };
  },
});

/**
 * Delete a cache entry by URL hash (for testing/debugging).
 */
export const deleteByUrlHash = internalMutation({
  args: { urlHash: v.string() },
  handler: async (ctx, { urlHash }) => {
    const entry = await ctx.db
      .query("linkPreviews")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
      .unique();

    if (!entry) return { deleted: false };

    if (entry.imageFullId) {
      await ctx.storage.delete(entry.imageFullId);
    }
    if (entry.imageThumbId) {
      await ctx.storage.delete(entry.imageThumbId);
    }
    await ctx.db.delete(entry._id);

    return { deleted: true };
  },
});
