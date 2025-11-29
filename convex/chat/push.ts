"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Configuration
const PRESENCE_THRESHOLD_MS = 30_000; // User is "active" if seen in last 30 seconds
const DEBOUNCE_WINDOW_MS = 5_000; // Wait 5 seconds before sending notification

/**
 * Send chat push notifications to all eligible users.
 * Called after a debounce window from the message send mutation.
 *
 * Suppression logic:
 * 1. Exclude the sender
 * 2. Exclude users who have been active in chat recently (presence)
 * 3. Collapse notifications using tag
 */
export const sendChatNotifications = internalAction({
  args: {
    messageId: v.id("messages"),
    senderId: v.id("players"),
    senderName: v.string(),
    messagePreview: v.string(),
  },
  handler: async (ctx, { messageId, senderId, senderName, messagePreview }) => {
    const i = internal as any;

    // Get all players with push subscriptions
    const playersWithPush = await ctx.runQuery(
      i.chat.presence.getPlayersWithPushEnabled
    );

    const now = Date.now();
    const eligibleUserIds: string[] = [];

    for (const player of playersWithPush) {
      // 1. Exclude sender
      if (player._id === senderId) continue;

      // 2. Exclude users who don't have a linked user account
      if (!player.userId) continue;

      // 3. Exclude users who are currently active in chat (presence check)
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

    const payload = {
      title: `${senderName}`,
      body: truncatedBody,
      icon: "/pwa/manifest-icon-192.maskable.png",
      tag: "chat", // Collapse all chat notifications into one
      data: {
        type: "chat",
        url: "/chat",
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
      eligible: eligibleUserIds.length,
      ...result,
    });

    return { sent: result.success };
  },
});

export { DEBOUNCE_WINDOW_MS };
