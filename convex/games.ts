import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").withIndex("by_start_time").collect();
  },
});

export const listGamesWithRsvps = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").withIndex("by_start_time").collect();

    return await Promise.all(
      games.map(async (game) => {
        const rsvps = await ctx.db
          .query("gameRsvps")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect();
        return {
          game,
          rsvps,
        };
      }),
    );
  },
});

export const createGame = mutation({
  args: {
    opponent: v.string(),
    startTime: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("games", {
      ...args,
      createdAt: now,
    });
    return id;
  },
});

export const removeGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const toDelete = await ctx.db
      .query("gameRsvps")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    await Promise.all(toDelete.map((rsvp) => ctx.db.delete(rsvp._id)));
    await ctx.db.delete(args.gameId);
  },
});

export const setRsvp = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    status: v.union(v.literal("yes"), v.literal("no"), v.literal("maybe")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("gameRsvps")
      .withIndex("by_game_player", (q) =>
        q.eq("gameId", args.gameId).eq("playerId", args.playerId),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("gameRsvps", {
      gameId: args.gameId,
      playerId: args.playerId,
      status: args.status,
      updatedAt: now,
    });
  },
});
