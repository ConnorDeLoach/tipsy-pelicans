import { mutation, query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { MAX_IMAGES_PER_MESSAGE, messageImageValidator } from "./model";
import { Id } from "../_generated/dataModel";

// Debounce window for chat push notifications (5 seconds)
const PUSH_DEBOUNCE_MS = 5_000;

const MAX_BODY_LENGTH = 2000;
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
 * Generate a signed upload URL for uploading an image to Convex storage.
 * The client will use this URL to upload the compressed WebP blob.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to upload images.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Send a message with optional text and/or images.
 * At least one of body or images must be provided.
 * Max 4 images per message.
 */
export const sendWithImages = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.optional(v.string()),
    images: v.optional(
      v.array(
        v.object({
          fullId: v.id("_storage"),
          thumbId: v.id("_storage"),
          width: v.number(),
          height: v.number(),
        })
      )
    ),
  },
  returns: v.id("messages"),
  handler: async (ctx, { conversationId, body, images }) => {
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

    const trimmedBody = body?.trim() || "";
    const hasImages = images && images.length > 0;

    // Must have either text or images
    if (!trimmedBody && !hasImages) {
      throw new Error("Message must contain text or images.");
    }

    // Validate body length if present
    if (trimmedBody && trimmedBody.length > MAX_BODY_LENGTH) {
      throw new Error(`Message cannot exceed ${MAX_BODY_LENGTH} characters.`);
    }

    // Validate image count
    if (images && images.length > MAX_IMAGES_PER_MESSAGE) {
      throw new Error(`Maximum ${MAX_IMAGES_PER_MESSAGE} images per message.`);
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
      images: hasImages ? images : undefined,
    });

    // Build preview for conversation list
    let preview: string;
    if (trimmedBody) {
      preview = trimmedBody;
    } else if (images) {
      preview = images.length === 1 ? "📷 Photo" : `📷 ${images.length} Photos`;
    } else {
      preview = "";
    }

    // Update conversation's last message metadata
    await ctx.runMutation(internal.chat.conversations.updateLastMessage, {
      conversationId,
      preview,
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
        messagePreview: preview,
      }
    );

    return messageId;
  },
});

/**
 * Internal query to get a message by ID (for image access validation).
 */
export const getMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.object({
      _id: v.id("messages"),
      conversationId: v.id("conversations"),
      images: v.optional(v.array(messageImageValidator)),
    }),
    v.null()
  ),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get("messages", messageId);
    if (!message) return null;
    return {
      _id: message._id,
      conversationId: message.conversationId,
      images: message.images,
    };
  },
});

/**
 * Internal query to find which message a storage file belongs to.
 * Used for validating image access.
 */
export const findMessageByStorageId = internalQuery({
  args: { storageId: v.id("_storage") },
  returns: v.union(
    v.object({
      _id: v.id("messages"),
      conversationId: v.id("conversations"),
    }),
    v.null()
  ),
  handler: async (ctx, { storageId }) => {
    // We need to scan messages to find one containing this storage ID
    // This is a bit expensive but necessary for access control
    // In production, you might want an index or separate lookup table
    const messages = await ctx.db.query("messages").collect();

    for (const message of messages) {
      if (message.images) {
        for (const img of message.images) {
          if (img.fullId === storageId || img.thumbId === storageId) {
            return {
              _id: message._id,
              conversationId: message.conversationId,
            };
          }
        }
      }
    }

    return null;
  },
});

/**
 * Get signed URLs for images in a message.
 * Only returns URLs if the user has access to the conversation.
 */
export const getImageUrls = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.array(
      v.object({
        fullUrl: v.union(v.string(), v.null()),
        thumbUrl: v.union(v.string(), v.null()),
        width: v.number(),
        height: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx, { messageId }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) return null;

    const message = await ctx.db.get("messages", messageId);
    if (!message || !message.images) return null;

    // Verify player has access to this conversation
    const conversation = await ctx.db.get("conversations", message.conversationId);
    if (!conversation || !conversation.participantIds.includes(player._id)) {
      return null;
    }

    // Get URLs for all images
    const imageUrls = await Promise.all(
      message.images.map(async (img) => ({
        fullUrl: await ctx.storage.getUrl(img.fullId),
        thumbUrl: await ctx.storage.getUrl(img.thumbId),
        width: img.width,
        height: img.height,
      }))
    );

    return imageUrls;
  },
});
