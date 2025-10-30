import { query } from "../_generated/server";
import { v } from "convex/values";

export const listProducts = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    if (category) {
      return await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    }
    return await ctx.db.query("products").collect();
  },
});

export const getProductByLegacyId = query({
  args: { legacyId: v.number() },
  handler: async (ctx, { legacyId }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
      .unique();
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return Array.from(new Set(products.map((p) => p.category)));
  },
});

export const listProductsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});
