import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the timestamp of the most recent message in a conversation.
 */
export const getLatestMessageTime = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const latestMessage = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("desc")
      .first();

    return latestMessage?._creationTime ?? null;
  },
});

/**
 * Mark a conversation as read by storing the current timestamp.
 */
export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user_and_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch("chatReadStatus", existing._id, { readAt: now });
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
 * Check if there are unread messages in a specific conversation.
 */
export const hasUnreadInConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.boolean(),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const readStatus = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user_and_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    const readAt = readStatus?.readAt ?? 0;

    // Check if there's any message newer than readAt in this conversation
    // Note: by_conversation index automatically includes _creationTime
    const newerMessage = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .filter((q) => q.gt(q.field("_creationTime"), readAt))
      .first();

    return newerMessage !== null;
  },
});

/**
 * Check if user has any unread messages across all their conversations.
 * Used for the bottom nav badge.
 */
export const hasAnyUnread = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    // Get all conversations user is part of
    // For now, get all conversations (in future, filter by participantIds)
    const conversations = await ctx.db.query("conversations").collect();

    for (const conv of conversations) {
      const readStatus = await ctx.db
        .query("chatReadStatus")
        .withIndex("by_user_and_conversation", (q) =>
          q.eq("userId", userId).eq("conversationId", conv._id)
        )
        .unique();

      const readAt = readStatus?.readAt ?? 0;

      const newerMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) => q.gt(q.field("_creationTime"), readAt))
        .first();

      if (newerMessage) return true;
    }

    return false;
  },
});
