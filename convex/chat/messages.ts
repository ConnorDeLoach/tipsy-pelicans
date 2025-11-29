import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";

// Debounce window for chat push notifications (5 seconds)
const PUSH_DEBOUNCE_MS = 5_000;

const MAX_BODY_LENGTH = 2000;
const RATE_LIMIT_MS = 1000; // 1 message per second
const SELF_DELETE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Helper to get current player from auth
async function getCurrentPlayer(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  // Try by userId first
  let player = await ctx.db
    .query("players")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!player) {
    // Fallback to email lookup
    const user = await ctx.db.get(userId);
    if (user?.email) {
      player = await ctx.db
        .query("players")
        .withIndex("by_email", (q: any) =>
          q.eq("emailLowercase", user.email.toLowerCase())
        )
        .unique();
    }
  }

  return player;
}

// List messages with pagination (oldest first for chat UX)
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db.query("messages").order("asc").paginate(paginationOpts);
  },
});

// Send a new message
export const send = mutation({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to send messages.");
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new Error("Message cannot be empty.");
    }
    if (trimmedBody.length > MAX_BODY_LENGTH) {
      throw new Error(`Message cannot exceed ${MAX_BODY_LENGTH} characters.`);
    }

    // Rate limiting: check last message from this player
    const lastMessage = await ctx.db
      .query("messages")
      .order("desc")
      .filter((q: any) => q.eq(q.field("createdBy"), player._id))
      .first();

    if (lastMessage && Date.now() - lastMessage._creationTime < RATE_LIMIT_MS) {
      throw new Error("Please wait a moment before sending another message.");
    }

    const messageId = await ctx.db.insert("messages", {
      createdBy: player._id,
      body: trimmedBody,
      displayName: player.name,
      role: player.role,
    });

    // Schedule push notification after debounce window
    await ctx.scheduler.runAfter(
      PUSH_DEBOUNCE_MS,
      internal.chat.push.sendChatNotifications,
      {
        messageId,
        senderId: player._id,
        senderName: player.name,
        messagePreview: trimmedBody,
      }
    );

    return messageId;
  },
});

// Delete a message (own within 10 min, or admin anytime)
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to delete messages.");
    }

    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    const isOwner = message.createdBy === player._id;
    const isAdmin = player.isAdmin === true;
    const withinWindow =
      Date.now() - message._creationTime < SELF_DELETE_WINDOW_MS;

    if (isAdmin) {
      // Admins can delete any message
      await ctx.db.delete(messageId);
      return;
    }

    if (isOwner && withinWindow) {
      await ctx.db.delete(messageId);
      return;
    }

    if (isOwner && !withinWindow) {
      throw new Error(
        "You can only delete your own messages within 10 minutes."
      );
    }

    throw new Error("You do not have permission to delete this message.");
  },
});
