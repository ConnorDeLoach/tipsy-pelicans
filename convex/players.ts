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
    email: v.string(),
    position: v.optional(v.string()),
    number: v.optional(v.number()),
    notes: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const trimmedEmail = args.email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const id = await ctx.db.insert("players", {
      ...args,
      email: trimmedEmail,
      emailLowercase: normalizedEmail,
      isAdmin: args.isAdmin ?? false,
      createdAt: now,
    });
    return id;
  },
});

export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    position: v.optional(v.string()),
    number: v.optional(v.number()),
    notes: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { playerId, email, ...fields } = args;
    const patch: Record<string, unknown> = { ...fields };
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      patch.email = trimmedEmail;
      patch.emailLowercase = trimmedEmail.toLowerCase();
    }
    await ctx.db.patch(playerId, patch);
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
