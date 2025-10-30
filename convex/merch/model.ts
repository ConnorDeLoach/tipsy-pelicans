import { defineTable } from "convex/server";
import { v } from "convex/values";

export const productsTable = defineTable({
  legacyId: v.number(),
  title: v.string(),
  price: v.number(),
  description: v.string(),
  category: v.string(),
  image: v.string(),
  rating: v.object({ rate: v.number(), count: v.number() }),
})
  .index("by_category", ["category"]) // for category filtering
  .index("by_legacy_id", ["legacyId"]); // to fetch by shopsense/fakestore numeric id
