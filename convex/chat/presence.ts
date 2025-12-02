import { mutation, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Update chat presence - call this periodically when user is viewing chat.
 * This is used to suppress push notifications for users already reading chat.
 */
export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const now = Date.now();

    // Update chatReadStatus table with presence timestamp
    const existing = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { readAt: now });
    } else {
      await ctx.db.insert("chatReadStatus", { userId, readAt: now });
    }
  },
});

/**
 * Internal query to get all players who have push subscriptions enabled,
 * along with their last chat presence timestamp.
 */
export const getPlayersWithPushEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all active players with linked user accounts (exclude soft-deleted)
    const players = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.neq(q.field("userId"), undefined),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // For each player, check if they have push subscriptions and get presence
    const results = [];

    for (const player of players) {
      if (!player.userId) continue;

      // Check if user has any push subscriptions
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("byUser", (q) => q.eq("userId", player.userId!))
        .first();

      if (!subs) continue;

      // Get their chat presence (readAt timestamp)
      const chatStatus = await ctx.db
        .query("chatReadStatus")
        .withIndex("by_user", (q) => q.eq("userId", player.userId!))
        .unique();

      results.push({
        _id: player._id,
        userId: player.userId,
        name: player.name,
        lastChatPresence: chatStatus?.readAt ?? null,
      });
    }

    return results;
  },
});
