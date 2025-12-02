import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Find orphaned records where the referenced player no longer exists.
 * Run this query first to see what would be cleaned up.
 */
export const findOrphanedRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orphans = {
      gameRsvps: [] as string[],
      rsvpTokens: [] as string[],
      messages: [] as string[],
    };

    // Check gameRsvps
    const rsvps = await ctx.db.query("gameRsvps").collect();
    for (const rsvp of rsvps) {
      const player = await ctx.db.get(rsvp.playerId);
      if (!player) {
        orphans.gameRsvps.push(rsvp._id);
      }
    }

    // Check rsvpTokens
    const tokens = await ctx.db.query("rsvpTokens").collect();
    for (const token of tokens) {
      const player = await ctx.db.get(token.playerId);
      const game = await ctx.db.get(token.gameId);
      if (!player || !game) {
        orphans.rsvpTokens.push(token._id);
      }
    }

    // Check messages
    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      const player = await ctx.db.get(msg.createdBy);
      if (!player) {
        orphans.messages.push(msg._id);
      }
    }

    return {
      summary: {
        gameRsvps: orphans.gameRsvps.length,
        rsvpTokens: orphans.rsvpTokens.length,
        messages: orphans.messages.length,
      },
      orphans,
    };
  },
});

/**
 * Delete orphaned gameRsvps where the player no longer exists.
 * Call with dry_run=true first to see what would be deleted.
 */
export const cleanupOrphanedRsvps = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun = true }) => {
    const rsvps = await ctx.db.query("gameRsvps").collect();
    let deleted = 0;

    for (const rsvp of rsvps) {
      const player = await ctx.db.get(rsvp.playerId);
      if (!player) {
        if (!dryRun) {
          await ctx.db.delete(rsvp._id);
        }
        deleted++;
      }
    }

    return { deleted, dryRun };
  },
});

/**
 * Delete orphaned rsvpTokens where the player or game no longer exists.
 */
export const cleanupOrphanedTokens = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun = true }) => {
    const tokens = await ctx.db.query("rsvpTokens").collect();
    let deleted = 0;

    for (const token of tokens) {
      const player = await ctx.db.get(token.playerId);
      const game = await ctx.db.get(token.gameId);
      if (!player || !game) {
        if (!dryRun) {
          await ctx.db.delete(token._id);
        }
        deleted++;
      }
    }

    return { deleted, dryRun };
  },
});

/**
 * For messages, we have a choice:
 * 1. Delete orphaned messages (loses history)
 * 2. Keep messages but mark them as from "[Deleted User]"
 *
 * This mutation keeps messages but updates displayName for orphaned ones.
 */
export const cleanupOrphanedMessages = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    deletedUserName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { dryRun = true, deletedUserName = "[Deleted User]" }
  ) => {
    const messages = await ctx.db.query("messages").collect();
    let updated = 0;

    for (const msg of messages) {
      const player = await ctx.db.get(msg.createdBy);
      if (!player) {
        if (!dryRun) {
          await ctx.db.patch(msg._id, { displayName: deletedUserName });
        }
        updated++;
      }
    }

    return { updated, dryRun };
  },
});

/**
 * Run all cleanup operations at once.
 * ALWAYS run with dryRun=true first to review changes.
 */
export const cleanupAllOrphans = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun = true }) => {
    // Note: We can't call other mutations from a mutation,
    // so we inline the logic here.

    const results = {
      gameRsvps: { deleted: 0 },
      rsvpTokens: { deleted: 0 },
      messages: { updated: 0 },
      dryRun,
    };

    // Cleanup gameRsvps
    const rsvps = await ctx.db.query("gameRsvps").collect();
    for (const rsvp of rsvps) {
      const player = await ctx.db.get(rsvp.playerId);
      if (!player) {
        if (!dryRun) {
          await ctx.db.delete(rsvp._id);
        }
        results.gameRsvps.deleted++;
      }
    }

    // Cleanup rsvpTokens
    const tokens = await ctx.db.query("rsvpTokens").collect();
    for (const token of tokens) {
      const player = await ctx.db.get(token.playerId);
      const game = await ctx.db.get(token.gameId);
      if (!player || !game) {
        if (!dryRun) {
          await ctx.db.delete(token._id);
        }
        results.rsvpTokens.deleted++;
      }
    }

    // Update orphaned messages
    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      const player = await ctx.db.get(msg.createdBy);
      if (!player) {
        if (!dryRun) {
          await ctx.db.patch(msg._id, { displayName: "[Deleted User]" });
        }
        results.messages.updated++;
      }
    }

    return results;
  },
});
