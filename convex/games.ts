import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function deriveOutcomePoints(
  teamScore?: number,
  opponentScore?: number,
): { outcome?: "win" | "loss" | "tie"; points?: number } {
  if (typeof teamScore === "number" && typeof opponentScore === "number") {
    if (teamScore > opponentScore) return { outcome: "win", points: 2 };
    if (teamScore < opponentScore) return { outcome: "loss", points: 0 };
    return { outcome: "tie", points: 1 };
  }
  return { outcome: undefined, points: undefined };
}

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").withIndex("by_start_time").collect();
  },
});

export const updateGameDetails = mutation({
  args: {
    gameId: v.id("games"),
    opponentId: v.optional(v.id("opponents")),
    startTime: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    teamScore: v.optional(v.number()),
    opponentScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const patch: Record<string, any> = {};

    if (args.opponentId) {
      const opp = await ctx.db.get(args.opponentId);
      if (!opp) throw new Error("Opponent not found");
      patch.opponentId = opp._id;
      patch.opponent = opp.name; // snapshot
    }

    if (typeof args.startTime === "number") {
      patch.startTime = args.startTime;
    }

    if (args.location !== undefined) {
      const trimmed = args.location.trim();
      patch.location = trimmed.length ? trimmed : undefined;
    }

    if (args.notes !== undefined) {
      const trimmed = args.notes.trim();
      patch.notes = trimmed.length ? trimmed : undefined;
    }

    if (args.teamScore !== undefined) {
      if (args.teamScore < 0) throw new Error("Scores must be >= 0");
      patch.teamScore = Math.floor(args.teamScore);
    }
    if (args.opponentScore !== undefined) {
      if (args.opponentScore < 0) throw new Error("Scores must be >= 0");
      patch.opponentScore = Math.floor(args.opponentScore);
    }

    // Derive outcome and points based on scores
    {
      const ts = patch.teamScore ?? game.teamScore;
      const os = patch.opponentScore ?? game.opponentScore;
      const { outcome, points } = deriveOutcomePoints(ts, os);
      patch.outcome = outcome;
      patch.points = points;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(args.gameId, patch);
  },
});

export const updateGameScore = mutation({
  args: {
    gameId: v.id("games"),
    teamScore: v.number(),
    opponentScore: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    if (args.teamScore < 0 || args.opponentScore < 0)
      throw new Error("Scores must be >= 0");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const teamScore = Math.floor(args.teamScore);
    const opponentScore = Math.floor(args.opponentScore);
    const { outcome, points } = deriveOutcomePoints(teamScore, opponentScore);

    await ctx.db.patch(args.gameId, {
      teamScore,
      opponentScore,
      outcome,
      points,
    });
  },
});

export const finalizeGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    await ctx.db.patch(gameId, { status: "final" });
  },
});

export const setRsvpInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    status: v.union(v.literal("in"), v.literal("out")),
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
      if (existing.status === args.status) {
        await ctx.db.delete(existing._id);
        return existing._id;
      } else {
        await ctx.db.patch(existing._id, { status: args.status, updatedAt: now });
        return existing._id;
      }
    }

    return await ctx.db.insert("gameRsvps", {
      gameId: args.gameId,
      playerId: args.playerId,
      status: args.status,
      updatedAt: now,
    });
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
    opponent: v.optional(v.string()),
    opponentId: v.optional(v.id("opponents")),
    startTime: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let opponentId: Id<"opponents"> | undefined = args.opponentId as
      | Id<"opponents">
      | undefined;
    let name: string | undefined;

    if (opponentId) {
      const opp = await ctx.db.get(opponentId);
      if (!opp) {
        throw new Error("Opponent not found");
      }
      name = opp.name;
    } else {
      const inputName = (args.opponent ?? "").trim();
      if (!inputName) {
        throw new Error("Opponent is required");
      }
      const normalized = inputName.toLowerCase();
      const existingOpponent = await ctx.db
        .query("opponents")
        .withIndex("by_name_lowercase", (q) => q.eq("nameLowercase", normalized))
        .unique();
      if (existingOpponent) {
        opponentId = existingOpponent._id;
        name = existingOpponent.name;
      } else {
        opponentId = await ctx.db.insert("opponents", {
          name: inputName,
          nameLowercase: normalized,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        name = inputName;
      }
    }

    const location = args.location?.trim();

    const id = await ctx.db.insert("games", {
      opponent: name!,
      startTime: args.startTime,
      location: location ? location : undefined,
      notes: args.notes,
      opponentId,
      status: "scheduled",
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
    status: v.union(v.literal("in"), v.literal("out")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!callerPlayer) {
      throw new Error("Player profile not found");
    }

    const isAdmin = callerPlayer.isAdmin === true;
    if (!isAdmin && callerPlayer._id !== args.playerId) {
      throw new Error("Not authorized to modify other players' RSVPs");
    }

    const existing = await ctx.db
      .query("gameRsvps")
      .withIndex("by_game_player", (q) =>
        q.eq("gameId", args.gameId).eq("playerId", args.playerId),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      if (existing.status === args.status) {
        await ctx.db.delete(existing._id);
        return existing._id;
      } else {
        await ctx.db.patch(existing._id, { status: args.status, updatedAt: now });
        return existing._id;
      }
    }

    return await ctx.db.insert("gameRsvps", {
      gameId: args.gameId,
      playerId: args.playerId,
      status: args.status,
      updatedAt: now,
    });
  },
});
