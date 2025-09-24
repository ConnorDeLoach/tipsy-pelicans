import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPlayers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("players").withIndex("by_name").collect();
  },
});

export const addPlayer = mutation({
  args: {
    name: v.string(),
    position: v.optional(v.string()),
    number: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("players", {
      ...args,
      createdAt: now,
    });
    return id;
  },
});

export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.optional(v.string()),
    position: v.optional(v.string()),
    number: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { playerId, ...fields } = args;
    await ctx.db.patch(playerId, fields);
  },
});

export const removePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.playerId);
  },
});
