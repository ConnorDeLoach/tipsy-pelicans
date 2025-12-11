import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log the start of a cron job execution
 */
export const logStart = internalMutation({
  args: {
    cronName: v.string(),
    correlationId: v.string(),
  },
  handler: async (ctx, { cronName, correlationId }) => {
    await ctx.db.insert("cronExecutions", {
      cronName,
      correlationId,
      status: "started",
      startTime: Date.now(),
    });
  },
});

/**
 * Log the completion of a cron job execution
 */
export const logComplete = internalMutation({
  args: {
    correlationId: v.string(),
    result: v.optional(v.any()),
  },
  handler: async (ctx, { correlationId, result }) => {
    const execution = await ctx.db
      .query("cronExecutions")
      .withIndex("by_correlation", (q) => q.eq("correlationId", correlationId))
      .first();

    if (!execution) {
      console.error(
        `cronLogger.logComplete: execution not found for ${correlationId}`
      );
      return;
    }

    const endTime = Date.now();
    await ctx.db.patch("cronExecutions", execution._id, {
      status: "completed",
      endTime,
      duration: endTime - execution.startTime,
      result,
    });
  },
});

/**
 * Log the failure of a cron job execution
 */
export const logFailure = internalMutation({
  args: {
    correlationId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, { correlationId, error }) => {
    const execution = await ctx.db
      .query("cronExecutions")
      .withIndex("by_correlation", (q) => q.eq("correlationId", correlationId))
      .first();

    if (!execution) {
      console.error(
        `cronLogger.logFailure: execution not found for ${correlationId}`
      );
      return;
    }

    const endTime = Date.now();
    await ctx.db.patch("cronExecutions", execution._id, {
      status: "failed",
      endTime,
      duration: endTime - execution.startTime,
      error,
    });
  },
});

/**
 * Query recent cron executions
 */
export const listRecent = query({
  args: {
    cronName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cronName, limit = 50 }) => {
    if (cronName) {
      return await ctx.db
        .query("cronExecutions")
        .withIndex("by_cron_time", (q) => q.eq("cronName", cronName))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("cronExecutions").order("desc").take(limit);
  },
});

/**
 * Query cron execution statistics
 */
export const getStats = query({
  args: {
    cronName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cronName, limit = 100 }) => {
    const executions = await ctx.db
      .query("cronExecutions")
      .withIndex("by_cron_time", (q) => q.eq("cronName", cronName))
      .order("desc")
      .take(limit);

    const completed = executions.filter((e) => e.status === "completed");
    const failed = executions.filter((e) => e.status === "failed");
    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, e) => sum + (e.duration ?? 0), 0) /
          completed.length
        : 0;

    return {
      total: executions.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration: Math.round(avgDuration),
      lastExecution: executions[0] ?? null,
    };
  },
});
