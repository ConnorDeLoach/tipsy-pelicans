import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get a cached link preview by URL hash (internal).
 */
export const getByUrlHash = internalQuery({
  args: { urlHash: v.string() },
  handler: async (ctx, { urlHash }) => {
    return await ctx.db
      .query("linkPreviews")
      .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
      .unique();
  },
});

/**
 * Get multiple cached link previews by URL hashes (internal).
 */
export const getByUrlHashes = internalQuery({
  args: { urlHashes: v.array(v.string()) },
  handler: async (ctx, { urlHashes }) => {
    const results = await Promise.all(
      urlHashes.map((urlHash) =>
        ctx.db
          .query("linkPreviews")
          .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
          .unique()
      )
    );
    return results.filter((r) => r !== null);
  },
});

/**
 * Public query to get link previews for a set of URLs.
 * Used by the frontend to fetch previews for messages.
 */
export const getPreviewsForUrls = query({
  args: { urlHashes: v.array(v.string()) },
  returns: v.array(
    v.object({
      urlHash: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("success"),
        v.literal("error"),
        v.literal("no_preview")
      ),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      siteName: v.optional(v.string()),
      faviconUrl: v.optional(v.string()),
      imageFullUrl: v.optional(v.union(v.string(), v.null())),
      imageThumbUrl: v.optional(v.union(v.string(), v.null())),
      imageWidth: v.optional(v.number()),
      imageHeight: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { urlHashes }) => {
    if (urlHashes.length === 0) return [];

    const previews = await Promise.all(
      urlHashes.map((urlHash) =>
        ctx.db
          .query("linkPreviews")
          .withIndex("by_url_hash", (q) => q.eq("urlHash", urlHash))
          .unique()
      )
    );

    const results = await Promise.all(
      previews.map(async (preview) => {
        if (!preview) return null;

        // Get image URLs - prefer storage URLs, fallback to original URL
        let imageFullUrl: string | null | undefined = preview.imageFullId
          ? await ctx.storage.getUrl(preview.imageFullId)
          : undefined;
        let imageThumbUrl: string | null | undefined = preview.imageThumbId
          ? await ctx.storage.getUrl(preview.imageThumbId)
          : undefined;

        // Fallback to original image URL if no proxied version
        if (!imageFullUrl && !imageThumbUrl && preview.originalImageUrl) {
          imageFullUrl = preview.originalImageUrl;
          imageThumbUrl = preview.originalImageUrl;
        }

        return {
          urlHash: preview.urlHash,
          status: preview.status,
          title: preview.title,
          description: preview.description,
          siteName: preview.siteName,
          faviconUrl: preview.faviconUrl,
          imageFullUrl,
          imageThumbUrl,
          imageWidth: preview.imageWidth,
          imageHeight: preview.imageHeight,
        };
      })
    );

    return results.filter((r) => r !== null);
  },
});
