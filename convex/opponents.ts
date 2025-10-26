import { query } from "./_generated/server";
import { v } from "convex/values";

export const listOpponents = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? false;
    let rows;
    if (activeOnly) {
      rows = await ctx.db
        .query("opponents")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      rows = await ctx.db.query("opponents").withIndex("by_name_lowercase").collect();
    }
    return rows.sort((a, b) => a.nameLowercase.localeCompare(b.nameLowercase));
  },
});
