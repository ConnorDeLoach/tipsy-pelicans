import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "../_generated/dataModel";

// Default team chat conversation name
const TEAM_CHAT_NAME = "Team Chat";

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
 * List all conversations for the current user.
 * Returns conversations sorted by most recent activity.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      type: v.union(v.literal("group"), v.literal("direct")),
      name: v.optional(v.string()),
      displayName: v.string(),
      participantIds: v.array(v.id("players")),
      lastMessageAt: v.optional(v.number()),
      lastMessagePreview: v.optional(v.string()),
      lastMessageByName: v.optional(v.string()),
      unreadCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, _args) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return [];
    }

    const userId = await getAuthUserId(ctx);

    // Get all conversations - for now, all rostered players see the team chat
    // In the future, filter by participantIds for DMs
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_updated")
      .order("desc")
      .collect();

    // Filter to conversations the player is part of
    const playerConversations = conversations.filter(
      (c: Doc<"conversations">) => c.participantIds.includes(player._id)
    );

    // Enrich with unread counts and display names
    const result = await Promise.all(
      playerConversations.map(async (conv: Doc<"conversations">) => {
        // Get unread count for this conversation
        let unreadCount = 0;
        if (userId) {
          const readStatus = await ctx.db
            .query("chatReadStatus")
            .withIndex("by_user_and_conversation", (q: any) =>
              q.eq("userId", userId).eq("conversationId", conv._id)
            )
            .unique();

          const readAt = readStatus?.readAt ?? 0;

          // Count messages after readAt
          const unreadMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q: any) =>
              q.eq("conversationId", conv._id)
            )
            .filter((q: any) => q.gt(q.field("_creationTime"), readAt))
            .collect();

          unreadCount = unreadMessages.length;
        }

        // Get display name for last message sender
        let lastMessageByName: string | undefined;
        if (conv.lastMessageBy) {
          const sender = await ctx.db.get(conv.lastMessageBy);
          lastMessageByName = sender?.name;
        }

        // Derive display name
        let displayName = conv.name || "Conversation";
        if (conv.type === "direct" && !conv.name) {
          // For DMs, show the other participant's name
          const otherParticipantId = conv.participantIds.find(
            (id: Id<"players">) => id !== player._id
          );
          if (otherParticipantId) {
            const otherPlayer = await ctx.db.get(otherParticipantId);
            displayName = otherPlayer?.name || "Unknown";
          }
        }

        return {
          _id: conv._id,
          type: conv.type,
          name: conv.name,
          displayName,
          participantIds: conv.participantIds,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          lastMessageByName,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    return result;
  },
});

/**
 * Get a single conversation by ID.
 */
export const get = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      type: v.union(v.literal("group"), v.literal("direct")),
      name: v.optional(v.string()),
      displayName: v.string(),
      participantIds: v.array(v.id("players")),
      participants: v.array(
        v.object({
          _id: v.id("players"),
          name: v.string(),
          role: v.string(),
        })
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { conversationId }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return null;
    }

    const conv = await ctx.db.get(conversationId);
    if (!conv) {
      return null;
    }

    // Check if player is a participant
    if (!conv.participantIds.includes(player._id)) {
      return null;
    }

    // Get participant details
    const participants = await Promise.all(
      conv.participantIds.map(async (id: Id<"players">) => {
        const p = await ctx.db.get(id);
        return p
          ? { _id: p._id, name: p.name, role: p.role }
          : { _id: id, name: "Unknown", role: "player" as const };
      })
    );

    // Derive display name
    let displayName = conv.name || "Conversation";
    if (conv.type === "direct" && !conv.name) {
      const otherParticipantId = conv.participantIds.find(
        (id: Id<"players">) => id !== player._id
      );
      if (otherParticipantId) {
        const otherPlayer = await ctx.db.get(otherParticipantId);
        displayName = otherPlayer?.name || "Unknown";
      }
    }

    return {
      _id: conv._id,
      type: conv.type,
      name: conv.name,
      displayName,
      participantIds: conv.participantIds,
      participants,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  },
});

/**
 * Get or create the team chat conversation.
 * This ensures a single team chat exists for all rostered players.
 */
export const getOrCreateTeamChat = mutation({
  args: {},
  returns: v.id("conversations"),
  handler: async (ctx) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      throw new Error("You must be a rostered player to access chat.");
    }

    // Look for existing team chat
    const existingTeamChat = await ctx.db
      .query("conversations")
      .withIndex("by_type", (q) => q.eq("type", "group"))
      .first();

    if (existingTeamChat) {
      // Ensure current player is in participants
      if (!existingTeamChat.participantIds.includes(player._id)) {
        await ctx.db.patch(existingTeamChat._id, {
          participantIds: [...existingTeamChat.participantIds, player._id],
          updatedAt: Date.now(),
        });
      }
      return existingTeamChat._id;
    }

    // Create new team chat with all active players
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const participantIds = allPlayers.map((p: Doc<"players">) => p._id);

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      name: TEAM_CHAT_NAME,
      participantIds,
      createdAt: now,
      updatedAt: now,
    });

    return conversationId;
  },
});

/**
 * Internal mutation to update conversation metadata after a message is sent.
 */
export const updateLastMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    preview: v.string(),
    senderId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, preview, senderId }) => {
    const now = Date.now();
    const truncatedPreview =
      preview.length > 100 ? preview.slice(0, 97) + "..." : preview;

    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: truncatedPreview,
      lastMessageBy: senderId,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Internal query to get conversation for push notifications.
 */
export const getInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      type: v.union(v.literal("group"), v.literal("direct")),
      name: v.optional(v.string()),
      participantIds: v.array(v.id("players")),
    }),
    v.null()
  ),
  handler: async (ctx, { conversationId }) => {
    const conv = await ctx.db.get(conversationId);
    if (!conv) return null;

    return {
      _id: conv._id,
      type: conv.type,
      name: conv.name,
      participantIds: conv.participantIds,
    };
  },
});

/**
 * Add a player to the team chat when they are created or linked.
 */
export const addPlayerToTeamChat = internalMutation({
  args: { playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, { playerId }) => {
    const teamChat = await ctx.db
      .query("conversations")
      .withIndex("by_type", (q) => q.eq("type", "group"))
      .first();

    if (teamChat && !teamChat.participantIds.includes(playerId)) {
      await ctx.db.patch(teamChat._id, {
        participantIds: [...teamChat.participantIds, playerId],
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
