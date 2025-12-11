import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Max active subscriptions per user (per requirements)
const MAX_SUBS_PER_USER = 10;

// Common payload validator for Web Push notifications
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

// Mutation: Upsert a subscription for the authenticated user.
export const upsertSubscription = mutation({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      keys: v.object({ p256dh: v.string(), auth: v.string() }),
    }),
    ua: v.optional(v.string()),
    platform: v.optional(
      v.union(
        v.literal("ios"),
        v.literal("android"),
        v.literal("desktop"),
        v.literal("unknown")
      )
    ),
    authVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const endpoint = args.subscription.endpoint.trim();
    if (!endpoint) throw new Error("Invalid endpoint");

    const now = Date.now();

    // Deduplicate by endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byEndpoint", (q) => q.eq("endpoint", endpoint))
      .unique();

    if (existing) {
      // Update ownership and keys; reset errorCount on successful upsert
      await ctx.db.patch("pushSubscriptions", existing._id, {
        userId,
        keys: args.subscription.keys,
        ua: args.ua,
        platform: args.platform,
        authVersion: args.authVersion,
        updatedAt: now,
        lastStatus: "ok",
        errorCount: 0,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        userId,
        endpoint,
        keys: args.subscription.keys,
        ua: args.ua,
        platform: args.platform,
        authVersion: args.authVersion,
        createdAt: now,
        updatedAt: now,
        lastSendAt: undefined,
        errorCount: 0,
        lastStatus: "ok",
      });
    }

    // Enforce per-user cap: keep the most recently updated
    const allForUser = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();

    if (allForUser.length > MAX_SUBS_PER_USER) {
      const sorted = allForUser.sort(
        (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      );
      const toDelete = sorted.slice(MAX_SUBS_PER_USER);
      for (const sub of toDelete) {
        await ctx.db.delete("pushSubscriptions", sub._id);
      }
    }

    return { ok: true } as const;
  },
});

// Mutation: Remove a subscription by endpoint (auth not required to allow cleanup when logged-out)
export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byEndpoint", (q) => q.eq("endpoint", endpoint.trim()))
      .unique();

    if (existing) {
      await ctx.db.delete("pushSubscriptions", existing._id);
    }

    return { ok: true } as const;
  },
});

// Node actions moved to convex/pushActions.ts

// Public query: get subscription status for the current user
export const getMySubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { subscribed: false, count: 0 };

    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();

    return { subscribed: subs.length > 0, count: subs.length };
  },
});

// Helper query (internal): list all subscriptions for a user
export const listUserSubs = internalQuery({
  // Using mutation to allow future filtering/cleanup; not exposed publicly
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return subs;
  },
});

// Helper mutation (internal): mark send result and cleanup gone
export const markSendResult = internalMutation({
  args: {
    id: v.id("pushSubscriptions"),
    ok: v.boolean(),
    gone: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ok, gone }) => {
    if (gone) {
      await ctx.db.delete("pushSubscriptions", id);
      return;
    }
    if (ok) {
      await ctx.db.patch("pushSubscriptions", id, {
        lastSendAt: Date.now(),
        lastStatus: "ok",
        errorCount: 0,
      });
    } else {
      const doc = await ctx.db.get("pushSubscriptions", id);
      if (!doc) return;
      await ctx.db.patch("pushSubscriptions", id, {
        lastStatus: "error",
        errorCount: (doc.errorCount ?? 0) + 1,
      });
    }
  },
});
