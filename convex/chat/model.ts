import { defineTable } from "convex/server";
import { v } from "convex/values";
import { messageEmbedValidator } from "../oembed/model";

// Image attachment validator for chat messages
export const messageImageValidator = v.object({
  fullId: v.id("_storage"), // Full-size WebP (max 1280px, ~400-600KB)
  thumbId: v.id("_storage"), // Thumbnail WebP (max 320px, <100KB)
  width: v.number(), // Original width for aspect ratio
  height: v.number(), // Original height for aspect ratio
});

// Max images per message
export const MAX_IMAGES_PER_MESSAGE = 4;

// Conversation types: "group" for team chat, "direct" for future DMs
export const conversationTypeValidator = v.union(
  v.literal("group"),
  v.literal("direct")
);

export const conversationsTable = defineTable({
  type: conversationTypeValidator,
  // For group chats: custom name. For DMs: null (derive from participants)
  name: v.optional(v.string()),
  // All participant player IDs
  participantIds: v.array(v.id("players")),
  // Denormalized fields for efficient list queries
  lastMessageAt: v.optional(v.number()),
  lastMessagePreview: v.optional(v.string()),
  lastMessageBy: v.optional(v.id("players")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_updated", ["updatedAt"])
  .index("by_type", ["type"]);

export const messagesTable = defineTable({
  conversationId: v.id("conversations"),
  createdBy: v.id("players"),
  body: v.string(),
  displayName: v.string(),
  role: v.string(),
  // Optional array of embedded media (Instagram/Facebook/Threads)
  embeds: v.optional(v.array(messageEmbedValidator)),
  // Optional array of image attachments (max 4 per message)
  images: v.optional(v.array(messageImageValidator)),
}).index("by_conversation", ["conversationId"]);

export const chatReadStatusTable = defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"),
  readAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_conversation", ["userId", "conversationId"]);
