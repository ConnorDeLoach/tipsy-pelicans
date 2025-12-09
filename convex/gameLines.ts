import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============ Types ============

export type Slot = {
  id: string; // "L1-LW", "D2-RD", "G-1"
  group: string; // "EVEN" (future: "PP1", "PK1")
  lineNumber: number; // 1, 2, 3...
  role: string; // "LW"|"C"|"RW"|"LD"|"RD"|"G"
  playerId?: Id<"players">; // undefined = empty slot
};

// ============ Helper Functions ============

/**
 * Build default slots structure based on eligible player count.
 * Returns empty slots (no players assigned).
 */
export function buildDefaultSlots(
  eligiblePlayers: { _id: Id<"players">; position?: string }[]
): Slot[] {
  // Count by position category
  const forwards = eligiblePlayers.filter(
    (p) => ["LW", "C", "RW"].includes(p.position ?? "") || !p.position
  );
  const defense = eligiblePlayers.filter((p) =>
    ["LD", "RD"].includes(p.position ?? "")
  );
  const goalies = eligiblePlayers.filter((p) => p.position === "G");

  // Compute line counts (min 1, max based on player count)
  const numForwardLines = 4;
  const numDefensePairs = 4;
  const numGoalies = Math.min(2, Math.max(1, goalies.length || 1));

  // Explicitly reference forwards/defense to avoid unused variable errors
  void forwards.length;
  void defense.length;

  const slots: Slot[] = [];

  // Forward lines
  for (let line = 1; line <= numForwardLines; line++) {
    for (const role of ["LW", "C", "RW"]) {
      slots.push({
        id: `L${line}-${role}`,
        group: "EVEN",
        lineNumber: line,
        role,
        playerId: undefined,
      });
    }
  }

  // Defense pairs
  for (let pair = 1; pair <= numDefensePairs; pair++) {
    for (const role of ["LD", "RD"]) {
      slots.push({
        id: `D${pair}-${role}`,
        group: "EVEN",
        lineNumber: pair,
        role,
        playerId: undefined,
      });
    }
  }

  // Goalies
  for (let g = 1; g <= numGoalies; g++) {
    slots.push({
      id: `G-${g}`,
      group: "EVEN",
      lineNumber: g,
      role: "G",
      playerId: undefined,
    });
  }

  return slots;
}

/**
 * Copy slots from a previous game's lines, keeping player assignments.
 * If a player is no longer eligible (e.g., deleted), their slot becomes empty.
 */
export function copySlots(
  previousSlots: Slot[],
  eligiblePlayerIds: Set<string>
): Slot[] {
  return previousSlots.map((slot) => ({
    ...slot,
    // Keep player only if they're still eligible
    playerId:
      slot.playerId && eligiblePlayerIds.has(slot.playerId)
        ? slot.playerId
        : undefined,
  }));
}

// ============ Queries ============

export const getGameLines = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("gameLines")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .unique();
  },
});

// ============ Mutations ============

/**
 * Assign a player to a slot, or clear a slot.
 * If the player is already in another slot, they're removed from it first.
 */
export const updateLineSlot = mutation({
  args: {
    gameId: v.id("games"),
    slotId: v.string(),
    playerId: v.optional(v.id("players")), // undefined = clear slot
  },
  handler: async (ctx, args) => {
    // Auth check (admin only)
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const caller = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!caller?.isAdmin) throw new Error("Not authorized");

    const gameLines = await ctx.db
      .query("gameLines")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .unique();
    if (!gameLines) throw new Error("Lines not found for game");

    let slots = [...gameLines.slots];

    // If assigning a player, remove them from any other slot first
    if (args.playerId) {
      slots = slots.map((s) =>
        s.playerId === args.playerId ? { ...s, playerId: undefined } : s
      );
    }

    // Update target slot
    slots = slots.map((s) =>
      s.id === args.slotId ? { ...s, playerId: args.playerId } : s
    );

    await ctx.db.patch(gameLines._id, {
      slots,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Swap two players between slots.
 * Both slots can be empty, occupied, or one of each.
 */
export const swapLineSlots = mutation({
  args: {
    gameId: v.id("games"),
    sourceSlotId: v.string(),
    targetSlotId: v.string(),
  },
  handler: async (ctx, args) => {
    // Auth check (admin only)
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const caller = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!caller?.isAdmin) throw new Error("Not authorized");

    const gameLines = await ctx.db
      .query("gameLines")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .unique();
    if (!gameLines) throw new Error("Lines not found");

    const sourceSlot = gameLines.slots.find((s) => s.id === args.sourceSlotId);
    const targetSlot = gameLines.slots.find((s) => s.id === args.targetSlotId);
    if (!sourceSlot || !targetSlot) throw new Error("Slot not found");

    const sourcePlayer = sourceSlot.playerId;
    const targetPlayer = targetSlot.playerId;

    const slots = gameLines.slots.map((s) => {
      if (s.id === args.sourceSlotId) return { ...s, playerId: targetPlayer };
      if (s.id === args.targetSlotId) return { ...s, playerId: sourcePlayer };
      return s;
    });

    await ctx.db.patch(gameLines._id, { slots, updatedAt: Date.now() });
  },
});

/**
 * Internal mutation to initialize lines for a new game.
 * Called from createGame mutation.
 */
export const initializeGameLines = internalMutation({
  args: {
    gameId: v.id("games"),
    slots: v.array(
      v.object({
        id: v.string(),
        group: v.string(),
        lineNumber: v.number(),
        role: v.string(),
        playerId: v.optional(v.id("players")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("gameLines", {
      gameId: args.gameId,
      slots: args.slots,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to remove a player from all slots in a game's lines.
 * Called when a player RSVPs "out".
 */
export const removePlayerFromLines = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const gameLines = await ctx.db
      .query("gameLines")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameLines) return;

    const updatedSlots = gameLines.slots.map((slot) =>
      slot.playerId === args.playerId ? { ...slot, playerId: undefined } : slot
    );

    // Only patch if something changed
    const hasChange = gameLines.slots.some((s) => s.playerId === args.playerId);
    if (hasChange) {
      await ctx.db.patch(gameLines._id, {
        slots: updatedSlots,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Internal mutation to delete game lines when a game is deleted.
 */
export const deleteGameLines = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const gameLines = await ctx.db
      .query("gameLines")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .unique();

    if (gameLines) {
      await ctx.db.delete(gameLines._id);
    }
  },
});
