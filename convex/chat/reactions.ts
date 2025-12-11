import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

// Allowed emojis for reactions (MVP set)
export const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

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

export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  returns: v.object({
    action: v.union(v.literal("added"), v.literal("removed")),
  }),
  handler: async (ctx, { messageId, emoji }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to react to messages.");
    }

    // Validate emoji is in allowed set
    if (!ALLOWED_EMOJIS.includes(emoji as AllowedEmoji)) {
      throw new Error("Invalid emoji.");
    }

    // Get the message to verify it exists and player has access
    const message = await ctx.db.get("messages", messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    // Verify player has access to the conversation
    const conversation = await ctx.db.get("conversations", message.conversationId);
    if (!conversation || !conversation.participantIds.includes(player._id)) {
      throw new Error("You are not a participant in this conversation.");
    }

    // Find any existing reaction from this player on this message
    const reactionsForMessage = await ctx.db
      .query("messageReactions")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .collect();

    const existingForPlayer = reactionsForMessage.find(
      (r: any) => r.playerId === player._id
    );

    // If they already reacted with this emoji, remove it (toggle off)
    if (existingForPlayer && existingForPlayer.emoji === emoji) {
      await ctx.db.delete("messageReactions", existingForPlayer._id);
      return { action: "removed" as const };
    }

    // If they reacted with a different emoji, switch to the new one
    if (existingForPlayer && existingForPlayer.emoji !== emoji) {
      await ctx.db.patch("messageReactions", existingForPlayer._id, {
        emoji,
        createdAt: Date.now(),
      });
      return { action: "added" as const };
    }

    // No existing reaction from this player on this message: add new
    await ctx.db.insert("messageReactions", {
      messageId,
      playerId: player._id,
      emoji,
      createdAt: Date.now(),
    });
    return { action: "added" as const };
  },
});

/**
 * Get aggregated reactions for a single message.
 * Returns array of { emoji, count, reactedByMe }.
 */
export const getForMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(
    v.object({
      emoji: v.string(),
      count: v.number(),
      reactedByMe: v.boolean(),
    })
  ),
  handler: async (ctx, { messageId }) => {
    const player = await getCurrentPlayer(ctx);

    const reactions = await ctx.db
      .query("messageReactions")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .collect();

    // Aggregate by emoji
    const emojiMap = new Map<string, { count: number; reactedByMe: boolean }>();

    for (const r of reactions) {
      const existing = emojiMap.get(r.emoji);
      if (existing) {
        existing.count++;
        if (player && r.playerId === player._id) {
          existing.reactedByMe = true;
        }
      } else {
        emojiMap.set(r.emoji, {
          count: 1,
          reactedByMe: player ? r.playerId === player._id : false,
        });
      }
    }

    // Convert to array and sort by count descending
    return Array.from(emojiMap.entries())
      .map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reactedByMe: data.reactedByMe,
      }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Helper function to get aggregated reactions for multiple messages.
 * Used internally by listByConversation.
 */
export async function getReactionsForMessages(
  ctx: { db: any },
  messageIds: Id<"messages">[],
  currentPlayerId: Id<"players"> | null
): Promise<
  Map<
    Id<"messages">,
    Array<{ emoji: string; count: number; reactedByMe: boolean }>
  >
> {
  const result = new Map<
    Id<"messages">,
    Array<{ emoji: string; count: number; reactedByMe: boolean }>
  >();

  // Initialize empty arrays for all messages
  for (const id of messageIds) {
    result.set(id, []);
  }

  if (messageIds.length === 0) return result;

  // Fetch all reactions for these messages
  // Note: In production with many messages, you might want to batch this
  const allReactions = await Promise.all(
    messageIds.map((messageId) =>
      ctx.db
        .query("messageReactions")
        .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
        .collect()
    )
  );

  // Process reactions for each message
  for (let i = 0; i < messageIds.length; i++) {
    const messageId = messageIds[i];
    const reactions = allReactions[i];

    const emojiMap = new Map<string, { count: number; reactedByMe: boolean }>();

    for (const r of reactions) {
      const existing = emojiMap.get(r.emoji);
      if (existing) {
        existing.count++;
        if (currentPlayerId && r.playerId === currentPlayerId) {
          existing.reactedByMe = true;
        }
      } else {
        emojiMap.set(r.emoji, {
          count: 1,
          reactedByMe: currentPlayerId ? r.playerId === currentPlayerId : false,
        });
      }
    }

    const aggregated = Array.from(emojiMap.entries())
      .map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reactedByMe: data.reactedByMe,
      }))
      .sort((a, b) => b.count - a.count);

    result.set(messageId, aggregated);
  }

  return result;
}
