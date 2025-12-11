import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_name")
      .collect();
    // Filter out soft-deleted players
    return players.filter((p) => !p.deletedAt);
  },
});

// Include deleted players (for admin/historical views)
export const getAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("players").withIndex("by_name").collect();
  },
});

export const isEmailAllowed = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const player = await ctx.db
      .query("players")
      .withIndex("by_email", (q) => q.eq("emailLowercase", normalized))
      .unique();
    // Only allow login for active (non-deleted) players
    return player !== null && !player.deletedAt;
  },
});

export const addPlayer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    position: v.optional(
      v.union(
        v.literal("RW"),
        v.literal("C"),
        v.literal("LW"),
        v.literal("LD"),
        v.literal("RD"),
        v.literal("G")
      )
    ),
    number: v.optional(v.number()),
    flair: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("player"), v.literal("spare"), v.literal("spectator"))
    ),
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
      role: args.role ?? "player",
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
    position: v.optional(
      v.union(
        v.literal("RW"),
        v.literal("C"),
        v.literal("LW"),
        v.literal("LD"),
        v.literal("RD"),
        v.literal("G")
      )
    ),
    number: v.optional(v.number()),
    flair: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("player"), v.literal("spare"), v.literal("spectator"))
    ),
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
    for (const key of Object.keys(patch)) {
      if (patch[key] === undefined) {
        delete patch[key];
      }
    }
    await ctx.db.patch("players", playerId, patch);
  },
});

export const removePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Soft-delete: set deletedAt timestamp instead of hard delete
    await ctx.db.patch("players", args.playerId, { deletedAt: Date.now() });
  },
});

// Hard delete for admin cleanup (use with caution)
export const permanentlyDeletePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete("players", args.playerId);
  },
});

// Restore a soft-deleted player
export const restorePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("players", args.playerId, { deletedAt: undefined });
  },
});
