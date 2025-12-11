import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "../_generated/dataModel";

// Helper to get current player from auth (shared pattern)
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
 * Bundle query for chat list page SSR.
 * Returns conversations list + current user context in one call.
 */
export const getConversationsBundle = query({
  args: {},
  returns: v.object({
    conversations: v.array(
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
    me: v.union(
      v.object({
        playerId: v.id("players"),
        role: v.string(),
        name: v.union(v.string(), v.null()),
      }),
      v.null()
    ),
    now: v.number(),
  }),
  handler: async (ctx) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return { conversations: [], me: null, now: Date.now() };
    }

    const userId = await getAuthUserId(ctx);

    // Get all conversations ordered by most recent activity
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
    const enrichedConversations = await Promise.all(
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
          const sender = await ctx.db.get("players", conv.lastMessageBy);
          lastMessageByName = sender?.name;
        }

        // Derive display name
        let displayName = conv.name || "Conversation";
        if (conv.type === "direct" && !conv.name) {
          const otherParticipantId = conv.participantIds.find(
            (id: Id<"players">) => id !== player._id
          );
          if (otherParticipantId) {
            const otherPlayer = await ctx.db.get("players", otherParticipantId);
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

    return {
      conversations: enrichedConversations,
      me: {
        playerId: player._id,
        role: player.role,
        name: player.name ?? null,
      },
      now: Date.now(),
    };
  },
});

/**
 * Bundle query for chat detail page SSR.
 * Returns conversation metadata + current user context.
 * Messages are loaded separately via paginated query for real-time updates.
 */
export const getConversationBundle = query({
  args: { conversationId: v.id("conversations") },
  returns: v.object({
    conversation: v.union(
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
    me: v.union(
      v.object({
        playerId: v.id("players"),
        role: v.string(),
        name: v.union(v.string(), v.null()),
      }),
      v.null()
    ),
    now: v.number(),
  }),
  handler: async (ctx, { conversationId }) => {
    const player = await getCurrentPlayer(ctx);
    if (!player) {
      return { conversation: null, me: null, now: Date.now() };
    }

    const conv = await ctx.db.get("conversations", conversationId);
    if (!conv) {
      return {
        conversation: null,
        me: {
          playerId: player._id,
          role: player.role,
          name: player.name ?? null,
        },
        now: Date.now(),
      };
    }

    // Check if player is a participant
    if (!conv.participantIds.includes(player._id)) {
      return {
        conversation: null,
        me: {
          playerId: player._id,
          role: player.role,
          name: player.name ?? null,
        },
        now: Date.now(),
      };
    }

    // Get participant details
    const participants = await Promise.all(
      conv.participantIds.map(async (id: Id<"players">) => {
        const p = await ctx.db.get("players", id);
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
        const otherPlayer = await ctx.db.get("players", otherParticipantId);
        displayName = otherPlayer?.name || "Unknown";
      }
    }

    return {
      conversation: {
        _id: conv._id,
        type: conv.type,
        name: conv.name,
        displayName,
        participantIds: conv.participantIds,
        participants,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      me: {
        playerId: player._id,
        role: player.role,
        name: player.name ?? null,
      },
      now: Date.now(),
    };
  },
});
