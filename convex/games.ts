import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getOrCreateSeasonForGame } from "./seasons";
import { logAuditEvent } from "./auditLog";
import { buildDefaultSlots, type Slot } from "./gameLines";

function deriveOutcomePoints(
  teamScore?: number,
  opponentScore?: number
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

export const upcomingGames = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();

    // Use by_status_start_time index and filter visibility in memory
    // This fetches scheduled games ordered by start time, then filters for public
    const results = await ctx.db
      .query("games")
      .withIndex("by_status_start_time", (q) =>
        q.eq("status", "scheduled").gte("startTime", now)
      )
      .filter((q) => q.eq(q.field("visibility"), "public"))
      .take(limit ?? 100);

    return results; // Return full documents for hybrid pattern
  },
});

export const updateGameDetails = mutation({
  args: {
    gameId: v.id("games"),
    opponentId: v.optional(v.id("opponents")),
    startTime: v.optional(v.number()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
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

    const game = await ctx.db.get("games", args.gameId);
    if (!game) throw new Error("Game not found");

    const patch: Record<string, any> = {};

    if (args.opponentId) {
      const opp = await ctx.db.get("opponents", args.opponentId);
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

    if (args.visibility !== undefined) {
      patch.visibility = args.visibility;
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

    await logAuditEvent(ctx, {
      userId,
      playerId: callerPlayer._id,
      action: "game.update",
      targetType: "games",
      targetId: args.gameId,
      before: game,
      after: { ...game, ...patch },
      metadata: { fields: Object.keys(patch) },
    });

    await ctx.db.patch("games", args.gameId, patch);
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

    const game = await ctx.db.get("games", args.gameId);
    if (!game) throw new Error("Game not found");

    const teamScore = Math.floor(args.teamScore);
    const opponentScore = Math.floor(args.opponentScore);
    const { outcome, points } = deriveOutcomePoints(teamScore, opponentScore);

    await logAuditEvent(ctx, {
      userId,
      playerId: callerPlayer._id,
      action: "game.updateScore",
      targetType: "games",
      targetId: args.gameId,
      before: game,
      after: { ...game, teamScore, opponentScore, outcome, points },
    });

    await ctx.db.patch("games", args.gameId, {
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

    const game = await ctx.db.get("games", gameId);
    if (!game) throw new Error("Game not found");

    await logAuditEvent(ctx, {
      userId,
      playerId: callerPlayer._id,
      action: "game.finalize",
      targetType: "games",
      targetId: gameId,
      before: game,
      after: { ...game, status: "final" },
    });

    await ctx.db.patch("games", gameId, { status: "final" });
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
        q.eq("gameId", args.gameId).eq("playerId", args.playerId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      if (existing.status === args.status) {
        await ctx.db.delete("gameRsvps", existing._id);
        return existing._id;
      } else {
        await ctx.db.patch("gameRsvps", existing._id, {
          status: args.status,
          updatedAt: now,
        });
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
    const games = await ctx.db
      .query("games")
      .withIndex("by_start_time")
      .collect();

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
      })
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
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
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

    const now = Date.now();
    let opponentId: Id<"opponents"> | undefined = args.opponentId as
      | Id<"opponents">
      | undefined;
    let name: string | undefined;

    if (opponentId) {
      const opp = await ctx.db.get("opponents", opponentId);
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
        .withIndex("by_name_lowercase", (q) =>
          q.eq("nameLowercase", normalized)
        )
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

    const locationInput = (args.location ?? "").trim();
    const finalLocation = locationInput.length ? locationInput : "Hertz Arena";

    // Auto-assign season based on game start time
    const seasonId = await getOrCreateSeasonForGame(ctx, args.startTime);

    const gameData = {
      opponent: name!,
      startTime: args.startTime,
      location: finalLocation,
      notes: args.notes,
      opponentId,
      seasonId,
      visibility: args.visibility ?? "public",
      status: "scheduled" as const,
      createdAt: now,
    };

    const id = await ctx.db.insert("games", gameData);

    await logAuditEvent(ctx, {
      userId,
      playerId: callerPlayer._id,
      action: "game.create",
      targetType: "games",
      targetId: id,
      after: gameData,
    });

    // ============ Initialize RSVPs + Lines ============

    // 1. Get all active roster players (not spares/spectators, not deleted)
    const activePlayers = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("role"), "player")
        )
      )
      .collect();

    // 2. Create pending RSVPs for all active players
    await Promise.all(
      activePlayers.map((player) =>
        ctx.db.insert("gameRsvps", {
          gameId: id,
          playerId: player._id,
          status: "pending",
          updatedAt: now,
        })
      )
    );

    // 3. Find previous game's lines (most recent game before this one)
    const prevGame = await ctx.db
      .query("games")
      .withIndex("by_start_time")
      .filter((q) => q.lt(q.field("startTime"), args.startTime))
      .order("desc")
      .first();

    // Always start from default slots for this roster (4F/4D, etc.)
    let slots: Slot[] = buildDefaultSlots(activePlayers);

    if (prevGame) {
      const prevLines = await ctx.db
        .query("gameLines")
        .withIndex("by_game", (q) => q.eq("gameId", prevGame._id))
        .unique();

      if (prevLines) {
        // Overlay previous assignments onto the default structure,
        // keeping only players who are still active and matching by slot id.
        const eligiblePlayerIds = new Set(activePlayers.map((p) => p._id));
        const prevById = new Map(
          prevLines.slots.map((slot) => [slot.id, slot])
        );

        slots = slots.map((slot) => {
          const prev = prevById.get(slot.id);
          const playerId = prev?.playerId;
          if (playerId && eligiblePlayerIds.has(playerId)) {
            return { ...slot, playerId };
          }
          return slot;
        });
      }
    }

    // 4. Insert gameLines
    await ctx.db.insert("gameLines", {
      gameId: id,
      slots,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const removeGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    const game = await ctx.db.get("games", args.gameId);
    if (!game) throw new Error("Game not found");

    const toDelete = await ctx.db
      .query("gameRsvps")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    await logAuditEvent(ctx, {
      userId,
      playerId: callerPlayer._id,
      action: "game.delete",
      targetType: "games",
      targetId: args.gameId,
      before: game,
      metadata: { rsvpsDeleted: toDelete.length },
    });

    await Promise.all(
      toDelete.map((rsvp) => ctx.db.delete("gameRsvps", rsvp._id))
    );

    // Delete associated gameLines
    await ctx.runMutation(internal.gameLines.deleteGameLines, {
      gameId: args.gameId,
    });

    await ctx.db.delete("games", args.gameId);
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
        q.eq("gameId", args.gameId).eq("playerId", args.playerId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      if (existing.status === args.status) {
        await ctx.db.delete("gameRsvps", existing._id);
        return existing._id;
      } else {
        await ctx.db.patch("gameRsvps", existing._id, {
          status: args.status,
          updatedAt: now,
        });

        // If changing to "out", remove player from lines
        if (args.status === "out") {
          await ctx.runMutation(internal.gameLines.removePlayerFromLines, {
            gameId: args.gameId,
            playerId: args.playerId,
          });
        }

        return existing._id;
      }
    }

    const rsvpId = await ctx.db.insert("gameRsvps", {
      gameId: args.gameId,
      playerId: args.playerId,
      status: args.status,
      updatedAt: now,
    });

    // If status is "out", remove player from lines
    if (args.status === "out") {
      await ctx.runMutation(internal.gameLines.removePlayerFromLines, {
        gameId: args.gameId,
        playerId: args.playerId,
      });
    }

    return rsvpId;
  },
});

// ============ Season-based queries ============

export const listBySeason = query({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, { seasonId }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
      .collect();
  },
});

export const listBySeasonWithRsvps = query({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, { seasonId }) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
      .collect();

    return await Promise.all(
      games.map(async (game) => {
        const rsvps = await ctx.db
          .query("gameRsvps")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect();
        return { game, rsvps };
      })
    );
  },
});

export const getGameDetailsBundle = query({
  args: { gameId: v.id("games") },
  returns: v.any(),
  handler: async (ctx, { gameId }) => {
    const [game, players] = await Promise.all([
      ctx.db.get("games", gameId),
      (async () => {
        const rows = await ctx.db
          .query("players")
          .withIndex("by_name")
          .collect();
        return rows.filter((p) => !p.deletedAt);
      })(),
    ]);

    if (!game) {
      return {
        game: null,
        rsvps: [],
        lines: null,
        players,
      };
    }

    const [rsvps, lines] = await Promise.all([
      ctx.db
        .query("gameRsvps")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect(),
      ctx.db
        .query("gameLines")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .unique(),
    ]);

    return {
      game,
      rsvps,
      lines,
      players,
    };
  },
});

// ============ Bundled query for games page ============

/**
 * Fetches all data needed for the games page in a single query.
 * This reduces network round-trips and provides atomic data consistency.
 */
export const getGamesPageBundle = query({
  args: {},
  handler: async (ctx) => {
    // Parallel fetch all required data
    const [gamesWithRsvpsAndLines, allPlayers, allOpponents, allSeasons] =
      await Promise.all([
        // Games with RSVPs and Lines
        (async () => {
          const games = await ctx.db
            .query("games")
            .withIndex("by_start_time")
            .collect();

          return await Promise.all(
            games.map(async (game) => {
              const [rsvps, lines] = await Promise.all([
                ctx.db
                  .query("gameRsvps")
                  .withIndex("by_game", (q) => q.eq("gameId", game._id))
                  .collect(),
                ctx.db
                  .query("gameLines")
                  .withIndex("by_game", (q) => q.eq("gameId", game._id))
                  .unique(),
              ]);
              return { game, rsvps, lines };
            })
          );
        })(),

        // Active players only
        (async () => {
          const players = await ctx.db
            .query("players")
            .withIndex("by_name")
            .collect();
          return players.filter((p) => !p.deletedAt);
        })(),

        // Active opponents only
        (async () => {
          const rows = await ctx.db
            .query("opponents")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();
          return rows.sort((a, b) =>
            a.nameLowercase.localeCompare(b.nameLowercase)
          );
        })(),

        // All seasons
        ctx.db
          .query("seasons")
          .withIndex("by_start_date")
          .order("desc")
          .collect(),
      ]);

    // Get current season
    const currentSeason =
      allSeasons.find((s) => s.isActive) ??
      allSeasons.find((s) => {
        const now = Date.now();
        return now >= s.startDate && now <= s.endDate;
      }) ??
      null;

    return {
      games: gamesWithRsvpsAndLines,
      players: allPlayers,
      opponents: allOpponents,
      seasons: allSeasons,
      currentSeason,
      now: Date.now(),
    };
  },
});

export const getSeasonStats = query({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, { seasonId }) => {
    // Use the by_season index for efficient filtering
    const games = await ctx.db
      .query("games")
      .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
      .collect();

    // Count all games with outcomes (regardless of status)
    const gamesWithOutcomes = games.filter((g) => g.outcome);

    const wins = gamesWithOutcomes.filter((g) => g.outcome === "win").length;
    const losses = gamesWithOutcomes.filter((g) => g.outcome === "loss").length;
    const ties = gamesWithOutcomes.filter((g) => g.outcome === "tie").length;
    const totalPoints = gamesWithOutcomes.reduce(
      (sum, g) => sum + (g.points ?? 0),
      0
    );

    return {
      gamesPlayed: gamesWithOutcomes.length,
      totalGames: games.length,
      wins,
      losses,
      ties,
      points: totalPoints,
      record: `${wins}-${losses}-${ties}`,
    };
  },
});
