import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";
import { getReactionsForMessages } from "./reactions";
import { extractUrls } from "../linkPreview/model";

// Debounce window for chat push notifications (5 seconds)
const PUSH_DEBOUNCE_MS = 5_000;

const MAX_BODY_LENGTH = 2000;
const RATE_LIMIT_MS = 1000; // 1 message per second
const SELF_DELETE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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
 * List messages for a specific conversation with pagination.
 * Messages are ordered oldest first for chat UX.
 */
export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("messages"),
        _creationTime: v.number(),
        conversationId: v.id("conversations"),
        createdBy: v.id("players"),
        body: v.string(),
        displayName: v.string(),
        role: v.string(),
        images: v.optional(
          v.array(
            v.object({
              fullUrl: v.union(v.string(), v.null()),
              thumbUrl: v.union(v.string(), v.null()),
              width: v.number(),
              height: v.number(),
            })
          )
        ),
        gif: v.optional(
          v.object({
            tenorId: v.string(),
            url: v.string(),
            previewUrl: v.string(),
            width: v.number(),
            height: v.number(),
            previewWidth: v.number(),
            previewHeight: v.number(),
          })
        ),
        reactions: v.array(
          v.object({
            emoji: v.string(),
            count: v.number(),
            reactedByMe: v.boolean(),
          })
        ),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { conversationId, paginationOpts }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Verify player has access to this conversation
    const conversation = await ctx.db.get("conversations", conversationId);
    if (!conversation || !conversation.participantIds.includes(player._id)) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("asc")
      .paginate(paginationOpts);

    // Get reactions for all messages in this page
    const messageIds = result.page.map((m) => m._id);
    const reactionsMap = await getReactionsForMessages(
      ctx,
      messageIds,
      player._id
    );

    // Process messages with image URLs and reactions
    const pageWithUrls = await Promise.all(
      result.page.map(async (m) => {
        let images = undefined;
        if (m.images && m.images.length > 0) {
          images = await Promise.all(
            m.images.map(async (img) => ({
              fullUrl: await ctx.storage.getUrl(img.fullId),
              thumbUrl: await ctx.storage.getUrl(img.thumbId),
              width: img.width,
              height: img.height,
            }))
          );
        }
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          conversationId: m.conversationId,
          createdBy: m.createdBy,
          body: m.body,
          displayName: m.displayName,
          role: m.role,
          images,
          gif: m.gif,
          reactions: reactionsMap.get(m._id) ?? [],
        };
      })
    );

    return {
      page: pageWithUrls,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Send a new message to a conversation.
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, body }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to send messages.");
    }

    // Verify player has access to this conversation
    const conversation = await ctx.db.get("conversations", conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participantIds.includes(player._id)) {
      throw new Error("You are not a participant in this conversation.");
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new Error("Message cannot be empty.");
    }
    if (trimmedBody.length > MAX_BODY_LENGTH) {
      throw new Error(`Message cannot exceed ${MAX_BODY_LENGTH} characters.`);
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
      body: trimmedBody,
      displayName: player.name,
      role: player.role,
    });

    // Update conversation's last message metadata
    await ctx.runMutation(internal.chat.conversations.updateLastMessage, {
      conversationId,
      preview: trimmedBody,
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
        messagePreview: trimmedBody,
      }
    );

    // Extract URLs and schedule link preview processing
    const urls = extractUrls(trimmedBody);
    if (urls.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.linkPreview.fetch.processMessageUrls,
        { urls }
      );
    }

    return messageId;
  },
});

/**
 * Delete a message (own within 10 min, or admin anytime).
 */
export const remove = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to delete messages.");
    }

    const message = await ctx.db.get("messages", messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    // Verify player has access to this conversation
    const conversation = await ctx.db.get("conversations", message.conversationId);
    if (!conversation || !conversation.participantIds.includes(player._id)) {
      throw new Error("You do not have access to this message.");
    }

    const isOwner = message.createdBy === player._id;
    const isAdmin = player.isAdmin === true;
    const withinWindow =
      Date.now() - message._creationTime < SELF_DELETE_WINDOW_MS;

    // Helper to delete storage blobs for message images
    const deleteMessageImages = async () => {
      if (message.images && message.images.length > 0) {
        for (const img of message.images) {
          await ctx.storage.delete(img.fullId);
          await ctx.storage.delete(img.thumbId);
        }
      }
    };

    if (isAdmin) {
      await deleteMessageImages();
      await ctx.db.delete("messages", messageId);
      return null;
    }

    if (isOwner && withinWindow) {
      await deleteMessageImages();
      await ctx.db.delete("messages", messageId);
      return null;
    }

    if (isOwner && !withinWindow) {
      throw new Error(
        "You can only delete your own messages within 10 minutes."
      );
    }

    throw new Error("You do not have permission to delete this message.");
  },
});
