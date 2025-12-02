"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Configuration
const PRESENCE_THRESHOLD_MS = 30_000; // User is "active" if seen in last 30 seconds
const DEBOUNCE_WINDOW_MS = 5_000; // Wait 5 seconds before sending notification

/**
 * Send chat push notifications to all eligible users in a conversation.
 * Called after a debounce window from the message send mutation.
 *
 * Suppression logic:
 * 1. Exclude the sender
 * 2. Exclude users who have been active in this conversation recently (presence)
 * 3. Collapse notifications using conversation-specific tag
 */
export const sendChatNotifications = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    senderId: v.id("players"),
    senderName: v.string(),
    messagePreview: v.string(),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (
    ctx,
    { conversationId, messageId, senderId, senderName, messagePreview }
  ) => {
    const i = internal as any;

    // Get conversation details
    const conversation = await ctx.runQuery(i.chat.conversations.getInternal, {
      conversationId,
    });

    if (!conversation) {
      console.log("chat.push: conversation not found");
      return { sent: 0 };
    }

    // Get all players with push subscriptions and their presence for this conversation
    const playersWithPush = await ctx.runQuery(
      i.chat.presence.getPlayersWithPushEnabled,
      { conversationId }
    );

    const now = Date.now();
    const eligibleUserIds: string[] = [];

    for (const player of playersWithPush) {
      // 1. Exclude sender
      if (player._id === senderId) continue;

      // 2. Exclude users who don't have a linked user account
      if (!player.userId) continue;

      // 3. Only notify participants of this conversation
      if (!conversation.participantIds.includes(player._id)) continue;

      // 4. Exclude users who are currently active in this conversation (presence check)
      if (
        player.lastChatPresence &&
        now - player.lastChatPresence < PRESENCE_THRESHOLD_MS
      ) {
        continue;
      }

      eligibleUserIds.push(player.userId);
    }

    if (eligibleUserIds.length === 0) {
      console.log("chat.push: no eligible recipients for notification");
      return { sent: 0 };
    }

    // Truncate message preview for notification body
    const truncatedBody =
      messagePreview.length > 100
        ? messagePreview.slice(0, 97) + "..."
        : messagePreview;

    // Use conversation name for group chats, sender name for DMs
    const title =
      conversation.type === "group" && conversation.name
        ? `${conversation.name}: ${senderName}`
        : senderName;

    const payload = {
      title,
      body: truncatedBody,
      icon: "/pwa/manifest-icon-192.maskable.png",
      tag: `chat-${conversationId}`, // Collapse per-conversation
      data: {
        type: "chat",
        url: `/chat/${conversationId}`,
        conversationId,
        messageId,
      },
    };

    // Send to all eligible users
    const result = await ctx.runAction(i.pushActions.sendMany, {
      userIds: eligibleUserIds,
      payload,
      options: { urgency: "normal" },
    });

    console.log("chat.push: sent notifications", {
      conversationId,
      eligible: eligibleUserIds.length,
      ...result,
    });

    return { sent: result.success };
  },
});

export { DEBOUNCE_WINDOW_MS };
