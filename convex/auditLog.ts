import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Helper to log audit events for admin actions
 */
export async function logAuditEvent(
  ctx: MutationCtx,
  params: {
    userId?: Id<"users">;
    playerId?: Id<"players">;
    action: string;
    targetType: string;
    targetId?: string;
    before?: any;
    after?: any;
    metadata?: any;
  }
) {
  await ctx.db.insert("auditLog", {
    userId: params.userId,
    playerId: params.playerId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    before: params.before,
    after: params.after,
    metadata: params.metadata,
    timestamp: Date.now(),
  });
}

/**
 * Query recent audit logs
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    targetType: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 100, action, targetType }) => {
    if (action) {
      const results = await ctx.db
        .query("auditLog")
        .withIndex("by_action_time", (q) => q.eq("action", action))
        .order("desc")
        .take(limit);

      if (targetType) {
        return results.filter((log) => log.targetType === targetType);
      }

      return results;
    }

    // No action filter, use full table scan
    const results = await ctx.db.query("auditLog").order("desc").take(limit);

    if (targetType) {
      return results.filter((log) => log.targetType === targetType);
    }

    return results;
  },
});

/**
 * Query audit logs for a specific user
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 100 }) => {
    return await ctx.db
      .query("auditLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Query audit logs for a specific target
 */
export const listByTarget = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { targetType, targetId, limit = 100 }) => {
    return await ctx.db
      .query("auditLog")
      .withIndex("by_target", (q) =>
        q.eq("targetType", targetType).eq("targetId", targetId)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Internal mutation to manually insert audit log (for use in actions)
 */
export const insert = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    playerId: v.optional(v.id("players")),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
