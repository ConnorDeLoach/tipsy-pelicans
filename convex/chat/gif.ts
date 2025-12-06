import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

// Debounce window for chat push notifications (5 seconds)
const PUSH_DEBOUNCE_MS = 5_000;
const RATE_LIMIT_MS = 1000; // 1 message per second

// Helper to get current player from auth
async function getCurrentPlayer(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  let player = await ctx.db
    .query("players")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!player) {
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

/**
 * Send a GIF message to a conversation.
 * GIFs are stored as URL metadata (not uploaded to Convex storage).
 */
export const sendGif = mutation({
  args: {
    conversationId: v.id("conversations"),
    gif: v.object({
      tenorId: v.string(),
      url: v.string(),
      previewUrl: v.string(),
      width: v.number(),
      height: v.number(),
      previewWidth: v.number(),
      previewHeight: v.number(),
    }),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, gif }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to send messages.");
    }

    // Verify player has access to this conversation
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participantIds.includes(player._id)) {
      throw new Error("You are not a participant in this conversation.");
    }

    // Rate limiting: check last message from this player in this conversation
    const lastMessage = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("desc")
      .first();

    if (
      lastMessage &&
      lastMessage.createdBy === player._id &&
      Date.now() - lastMessage._creationTime < RATE_LIMIT_MS
    ) {
      throw new Error("Please wait a moment before sending another message.");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      createdBy: player._id,
      body: "", // GIF messages have empty body
      displayName: player.name,
      role: player.role,
      gif,
    });

    // Update conversation's last message metadata
    await ctx.runMutation(internal.chat.conversations.updateLastMessage, {
      conversationId,
      preview: "GIF",
      senderId: player._id,
    });

    // Schedule push notification after debounce window
    await ctx.scheduler.runAfter(
      PUSH_DEBOUNCE_MS,
      internal.chat.push.sendChatNotifications,
      {
        conversationId,
        messageId,
        senderId: player._id,
        senderName: player.name,
        messagePreview: "sent a GIF",
      }
    );

    return messageId;
  },
});
