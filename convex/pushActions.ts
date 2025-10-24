"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const NotificationAction = v.object({
  action: v.string(),
  title: v.string(),
  icon: v.optional(v.string()),
});

const NotificationPayload = v.object({
  title: v.string(),
  body: v.optional(v.string()),
  icon: v.optional(v.string()),
  tag: v.optional(v.string()),
  data: v.optional(v.any()),
  actions: v.optional(v.array(NotificationAction)),
});

const SendOptions = v.object({
  ttl: v.optional(v.number()),
  urgency: v.optional(
    v.union(
      v.literal("very-low"),
      v.literal("low"),
      v.literal("normal"),
      v.literal("high")
    )
  ),
});

// Send to all subscriptions for a single user
export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    payload: NotificationPayload,
    options: v.optional(SendOptions),
  },
  handler: async (ctx, { userId, payload, options }) => {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      console.warn(
        "WEB_PUSH_VAPID_PUBLIC_KEY/PRIVATE_KEY not set; skipping send"
      );
      return { attempted: 0, success: 0, gone: 0, failed: 0 };
    }

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      "mailto:no-reply@tipsypelicans.com",
      publicKey,
      privateKey
    );

    // Use a loose cast to avoid transient type errors before codegen updates
    const i = internal as any;
    const subs = await ctx.runQuery(i.push.listUserSubs, { userId });

    let attempted = 0;
    let success = 0;
    let gone = 0;
    let failed = 0;

    for (const sub of subs) {
      attempted++;
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      };
      try {
        await webpush.sendNotification(
          pushSub as any,
          JSON.stringify(payload),
          options ? { TTL: options.ttl, urgency: options.urgency } : undefined
        );
        // Mark success
        await ctx.runMutation(i.push.markSendResult, {
          id: sub._id,
          ok: true,
        });
        success++;
      } catch (err: any) {
        const statusCode: number | undefined =
          err?.statusCode ?? err?.statusCode_;
        const isGone = statusCode === 404 || statusCode === 410;
        await ctx.runMutation(i.push.markSendResult, {
          id: sub._id,
          ok: false,
          gone: isGone,
        });
        if (isGone) gone++;
        else failed++;
      }
    }

    return { attempted, success, gone, failed };
  },
});

// Send to many users (simple orchestrator)
export const sendMany = internalAction({
  args: {
    userIds: v.array(v.id("users")),
    payload: NotificationPayload,
    options: v.optional(SendOptions),
  },
  handler: async (ctx, { userIds, payload, options }) => {
    const results = [] as Array<{
      attempted: number;
      success: number;
      gone: number;
      failed: number;
    }>;

    const i = internal as any;
    for (const userId of userIds) {
      const res = await ctx.runAction(i.pushActions.sendToUser, {
        userId,
        payload,
        options,
      });
      results.push(res);
    }

    const summary = results.reduce(
      (acc, r) => ({
        attempted: acc.attempted + r.attempted,
        success: acc.success + r.success,
        gone: acc.gone + r.gone,
        failed: acc.failed + r.failed,
      }),
      { attempted: 0, success: 0, gone: 0, failed: 0 }
    );
    return summary;
  },
});
