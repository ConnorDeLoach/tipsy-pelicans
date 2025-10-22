import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const issuePair = mutation({
  args: {
    playerId: v.id("players"),
    gameId: v.id("games"),
    inToken: v.string(),
    outToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { playerId, gameId, inToken, outToken, expiresAt }) => {
    await ctx.db.insert("rsvpTokens", {
      token: inToken,
      playerId,
      gameId,
      choice: "in",
      expiresAt,
    });
    await ctx.db.insert("rsvpTokens", {
      token: outToken,
      playerId,
      gameId,
      choice: "out",
      expiresAt,
    });
    return { inToken, outToken } as const;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const rec = await ctx.db
      .query("rsvpTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return rec ?? null;
  },
});

export const markUsed = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const rec = await ctx.db
      .query("rsvpTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!rec) return;
    await ctx.db.patch(rec._id, { usedAt: Date.now() });
  },
});
