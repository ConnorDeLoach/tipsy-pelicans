import { mutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Update chat presence for a specific conversation.
 * Call this periodically when user is viewing a conversation.
 * Used to suppress push notifications for users already reading chat.
 */
export const heartbeat = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();

    // Update chatReadStatus table with presence timestamp for this conversation
    const existing = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user_and_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { readAt: now });
    } else {
      await ctx.db.insert("chatReadStatus", {
        userId,
        conversationId,
        readAt: now,
      });
    }

    return null;
  },
});

/**
 * Internal query to get all players who have push subscriptions enabled,
 * along with their last chat presence timestamp for a specific conversation.
 */
export const getPlayersWithPushEnabled = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      _id: v.id("players"),
      userId: v.id("users"),
      name: v.string(),
      lastChatPresence: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, { conversationId }) => {
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
    const results: Array<{
      _id: (typeof players)[0]["_id"];
      userId: NonNullable<(typeof players)[0]["userId"]>;
      name: string;
      lastChatPresence: number | null;
    }> = [];

    for (const player of players) {
      if (!player.userId) continue;

      // Check if user has any push subscriptions
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("byUser", (q) => q.eq("userId", player.userId!))
        .first();

      if (!subs) continue;

      // Get their chat presence for this specific conversation
      const chatStatus = await ctx.db
        .query("chatReadStatus")
        .withIndex("by_user_and_conversation", (q) =>
          q.eq("userId", player.userId!).eq("conversationId", conversationId)
        )
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
