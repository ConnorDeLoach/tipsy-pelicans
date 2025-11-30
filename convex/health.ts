import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Health check query - returns system status and configuration validation
 */
export const check = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check database connectivity by querying a small table
    let dbHealthy = false;
    try {
      await ctx.db.query("seasons").take(1);
      dbHealthy = true;
    } catch (error) {
      dbHealthy = false;
    }

    // Check environment configuration
    const config = {
      hasResendKey: !!process.env.AUTH_RESEND_KEY,
      hasRsvpBaseUrl: !!process.env.PUBLIC_RSVP_BASE_URL,
      hasSiteUrl: !!process.env.SITE_URL,
      hasVapidKeys: !!(
        process.env.WEB_PUSH_VAPID_PUBLIC_KEY &&
        process.env.WEB_PUSH_VAPID_PRIVATE_KEY
      ),
    };

    // Get recent cron execution status
    const recentCrons = await ctx.db
      .query("cronExecutions")
      .order("desc")
      .take(5);

    const lastCronExecution = recentCrons[0] ?? null;
    const failedCronsLast24h = recentCrons.filter(
      (c) => c.status === "failed" && c.startTime > now - 24 * 60 * 60 * 1000
    ).length;

    // Count active push subscriptions
    const activePushSubs = await ctx.db.query("pushSubscriptions").take(1000);
    const pushSubCount = activePushSubs.length;

    // Count players
    const players = await ctx.db.query("players").take(1000);
    const playerCount = players.length;
    const adminCount = players.filter((p) => p.isAdmin).length;

    // Overall health status
    const isHealthy =
      dbHealthy &&
      config.hasResendKey &&
      config.hasRsvpBaseUrl &&
      config.hasSiteUrl &&
      failedCronsLast24h === 0;

    return {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: now,
      database: {
        connected: dbHealthy,
      },
      configuration: config,
      crons: {
        lastExecution: lastCronExecution
          ? {
              name: lastCronExecution.cronName,
              status: lastCronExecution.status,
              startTime: lastCronExecution.startTime,
              duration: lastCronExecution.duration,
            }
          : null,
        failedLast24h: failedCronsLast24h,
      },
      stats: {
        players: playerCount,
        admins: adminCount,
        pushSubscriptions: pushSubCount,
      },
    };
  },
});

/**
 * Detailed system diagnostics (admin only in production)
 */
export const diagnostics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get table counts
    const games = await ctx.db.query("games").take(10000);
    const gameCount = games.length;
    const upcomingGames = games.filter((g) => g.startTime > now).length;

    const players = await ctx.db.query("players").collect();
    const rsvps = await ctx.db.query("gameRsvps").take(10000);
    const messages = await ctx.db.query("messages").take(10000);
    const pushSubs = await ctx.db.query("pushSubscriptions").collect();
    const auditLogs = await ctx.db.query("auditLog").take(1000);
    const cronExecs = await ctx.db.query("cronExecutions").take(100);

    // Push subscription health
    const pushSubsByStatus = {
      ok: pushSubs.filter((s) => s.lastStatus === "ok").length,
      error: pushSubs.filter((s) => s.lastStatus === "error").length,
      gone: pushSubs.filter((s) => s.lastStatus === "gone").length,
    };

    const pushSubsByPlatform = {
      ios: pushSubs.filter((s) => s.platform === "ios").length,
      android: pushSubs.filter((s) => s.platform === "android").length,
      desktop: pushSubs.filter((s) => s.platform === "desktop").length,
      unknown: pushSubs.filter((s) => !s.platform || s.platform === "unknown")
        .length,
    };

    // Cron execution stats
    const cronStats = {
      total: cronExecs.length,
      completed: cronExecs.filter((c) => c.status === "completed").length,
      failed: cronExecs.filter((c) => c.status === "failed").length,
      running: cronExecs.filter((c) => c.status === "started").length,
    };

    return {
      timestamp: now,
      tables: {
        games: gameCount,
        upcomingGames,
        players: players.length,
        rsvps: rsvps.length,
        messages: messages.length,
        pushSubscriptions: pushSubs.length,
        auditLogs: auditLogs.length,
        cronExecutions: cronExecs.length,
      },
      pushSubscriptions: {
        byStatus: pushSubsByStatus,
        byPlatform: pushSubsByPlatform,
      },
      cronExecutions: cronStats,
    };
  },
});
