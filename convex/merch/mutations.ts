import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const insertProduct = internalMutation({
  args: {
    legacyId: v.number(),
    title: v.string(),
    price: v.number(),
    description: v.string(),
    category: v.string(),
    image: v.string(),
    rating: v.object({ rate: v.number(), count: v.number() }),
  },
  handler: async (ctx, doc) => {
    // If product with same legacyId exists, skip insert
    const existing = await ctx.db
      .query("products")
      .withIndex("by_legacy_id", (q) => q.eq("legacyId", doc.legacyId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("products", doc);
  },
});
