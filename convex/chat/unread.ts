import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get the timestamp of the most recent message
export const getLatestMessageTime = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const latestMessage = await ctx.db.query("messages").order("desc").first();
    return latestMessage?._creationTime ?? null;
  },
});

// Mark chat as read by storing the current timestamp
export const markAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    // Store the read timestamp in the user's chatReadAt field
    // We'll use a simple approach: store in a separate table
    const existing = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { readAt: now });
    } else {
      await ctx.db.insert("chatReadStatus", { userId, readAt: now });
    }
  },
});

// Check if there are unread messages
export const hasUnread = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    // Get user's last read timestamp
    const readStatus = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const readAt = readStatus?.readAt ?? 0;

    // Check if there's any message newer than readAt
    const newerMessage = await ctx.db
      .query("messages")
      .order("desc")
      .filter((q) => q.gt(q.field("_creationTime"), readAt))
      .first();

    return newerMessage !== null;
  },
});
