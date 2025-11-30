import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ReminderContext = {
  upcomingGame: any;
  pendingPlayers: any[];
  formattedStart: string;
  rsvpBase: string;
  correlationId: string;
};

/**
 * Structured logging helper with correlation ID
 */
function log(
  level: "info" | "warn" | "error",
  correlationId: string,
  event: string,
  data?: any
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    event,
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

const getReminderContext = async (
  ctx: ActionCtx,
  correlationId: string
): Promise<ReminderContext | null> => {
  const now = Date.now();
  const windowEnd = now + ONE_DAY_MS * 7;

  const games = await ctx.runQuery(api.games.listGamesWithRsvps, {});
  const upcomingGame = games
    .filter((entry: any) => entry.game.startTime >= now)
    .find((entry: any) => entry.game.startTime <= windowEnd);

  if (!upcomingGame) {
    log("info", correlationId, "reminder.no_upcoming_game", {
      reason: "No games found within 7 day window",
    });
    return null;
  }

  const allPlayers = await ctx.runQuery(api.players.getPlayers, {});
  const players = allPlayers.filter((p: any) => (p as any).role === "player");
  const pendingPlayers = players.filter(
    (player: any) =>
      !upcomingGame.rsvps.some((rsvp: any) => rsvp.playerId === player._id)
  );

  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  const formattedStart = formatter.format(upcomingGame.game.startTime);

  const rsvpBaseEnv = process.env.PUBLIC_RSVP_BASE_URL || "";
  const rsvpBase = rsvpBaseEnv.replace(/\/$/, "");

  log("info", correlationId, "reminder.context_built", {
    gameId: upcomingGame.game._id,
    opponent: upcomingGame.game.opponent,
    startTime: upcomingGame.game.startTime,
    totalPlayers: players.length,
    pendingCount: pendingPlayers.length,
  });

  return {
    upcomingGame,
    pendingPlayers,
    formattedStart,
    rsvpBase,
    correlationId,
  };
};

const issueTokensForPending = async (
  ctx: ActionCtx,
  context: ReminderContext
) => {
  const tokensByPlayer: Record<string, { inUrl: string; outUrl: string }> = {};

  log("info", context.correlationId, "reminder.issuing_tokens", {
    playerCount: context.pendingPlayers.length,
  });

  for (const player of context.pendingPlayers) {
    const inToken = crypto.randomUUID();
    const outToken = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 72; // 72h

    await ctx.runMutation(api.rsvpTokens.issuePair, {
      playerId: player._id,
      gameId: context.upcomingGame.game._id,
      inToken,
      outToken,
      expiresAt,
    });

    const inUrl = `${context.rsvpBase}/rsvp?token=${inToken}`;
    const outUrl = `${context.rsvpBase}/rsvp?token=${outToken}`;
    tokensByPlayer[player._id] = { inUrl, outUrl };
  }

  log("info", context.correlationId, "reminder.tokens_issued", {
    count: Object.keys(tokensByPlayer).length,
  });

  return tokensByPlayer;
};

const sendPushForPending = async (
  ctx: ActionCtx,
  context: ReminderContext,
  tokensByPlayer: Record<string, { inUrl: string; outUrl: string }>
) => {
  let sent = 0;
  let skipped = 0;

  for (const player of context.pendingPlayers) {
    if (player.userId) {
      const { inUrl, outUrl } = tokensByPlayer[player._id];
      const payload = {
        title: `${context.formattedStart}`,
        body: `vs ${context.upcomingGame.game.opponent}`,
        tag: `rsvp-${context.upcomingGame.game._id}-${player._id}`,
        data: {
          url: `${process.env.SITE_URL}/games`,
          rsvp: { inUrl, outUrl },
        },
        actions: [
          { action: "rsvp-in", title: "I’m in" },
          { action: "rsvp-out", title: "I’m out" },
        ],
      };

      await ctx.runAction(internal.pushActions.sendToUser, {
        userId: player.userId,
        payload,
        options: { urgency: "high" },
      });
      sent++;
    } else {
      skipped++;
    }
  }

  log("info", context.correlationId, "reminder.push_sent", {
    sent,
    skipped,
  });
};

const sendEmailForPending = async (
  context: ReminderContext,
  tokensByPlayer: Record<string, { inUrl: string; outUrl: string }>
) => {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    log("warn", context.correlationId, "reminder.email_skipped", {
      reason: "AUTH_RESEND_KEY not configured",
    });
    return;
  }

  let sent = 0;
  let failed = 0;

  const subject = `RSVP needed: vs ${context.upcomingGame.game.opponent} on ${context.formattedStart}`;
  const locationLine = context.upcomingGame.game.location
    ? `Location: ${context.upcomingGame.game.location}\n`
    : "";
  const notesLine = context.upcomingGame.game.notes
    ? `Notes: ${context.upcomingGame.game.notes}\n`
    : "";

  for (const player of context.pendingPlayers) {
    const { inUrl, outUrl } = tokensByPlayer[player._id];

    const imageUrl = `${process.env.SITE_URL}/tipsy-rsvp-recruit.webp`;
    const locationHtml = context.upcomingGame.game.location
      ? `<p style="margin:0 0 12px;"><strong>Location:</strong> ${context.upcomingGame.game.location}</p>`
      : "";
    const notesHtml = context.upcomingGame.game.notes
      ? `<p style=\"margin:0 0 12px;\"><strong>Notes:</strong> ${context.upcomingGame.game.notes}</p>`
      : "";

    const personalizedText = `Hey ${
      player.name || "Pelican"
    },\n\nWe have a game vs ${context.upcomingGame.game.opponent} on ${
      context.formattedStart
    }.\n${locationLine}${notesLine}Please respond with your RSVP below.\n\nI'm in: ${inUrl}\nI'm out: ${outUrl}\n\nThanks!\nTipsy`;

    const html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;color:#0f172a;max-width:540px;margin:0 auto;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">Weekly Game Reminder</h1>
          <p style="margin:0 0 12px;">Hey ${player.name || "Pelican"},</p>
          <p style="margin:0 0 12px;">We have a game vs ${
            context.upcomingGame.game.opponent
          } on ${context.formattedStart}.</p>
          ${locationHtml}
          ${notesHtml}
          <div style="margin:20px 0 16px;text-align:center;">
            <img src="${imageUrl}" alt="Tipsy Pelicans RSVP" style="max-width:100%;height:auto;border-radius:12px;" />
          </div>
          <p style="margin:0 0 16px;font-weight:600;color:#1d4ed8;">Please choose your RSVP below:</p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${inUrl}" style="display:inline-block;background-color:#1d4ed8;color:#ffffff;font-weight:600;padding:12px 24px;border-radius:999px;text-decoration:none;margin-right:12px;">✅ I’m in</a>
            <a href="${outUrl}" style="display:inline-block;background-color:#fb923c;color:#ffffff;font-weight:600;padding:12px 24px;border-radius:999px;text-decoration:none;">❌ I’m out</a>
          </div>
          <p style="margin:0;font-size:14px;color:#475569;">Thanks!<br/>Tipsy</p>
        </div>
      `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "no-reply@tipsypelicans.com",
        to: player.email,
        subject,
        text: personalizedText,
        html,
        headers: {
          "List-Unsubscribe": "<mailto:unsubscribe@tipsypelicans.com>",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("error", context.correlationId, "reminder.email_failed", {
        email: player.email,
        status: response.status,
        error: errorText,
      });
      failed++;
    } else {
      sent++;
    }

    await delay(500);
  }

  log("info", context.correlationId, "reminder.emails_sent", {
    sent,
    failed,
  });
};

export const weeklyGameReminder = internalAction({
  args: {},
  handler: async (ctx) => {
    "use node";
    const correlationId = crypto.randomUUID();
    const cronName = "weeklyGameReminder";

    await ctx.runMutation(internal.cronLogger.logStart, {
      cronName,
      correlationId,
    });

    log("info", correlationId, "reminder.started", {
      type: cronName,
    });

    try {
      const apiKey = process.env.AUTH_RESEND_KEY;
      if (!apiKey) {
        log("warn", correlationId, "reminder.aborted", {
          reason: "AUTH_RESEND_KEY not configured",
        });
        await ctx.runMutation(internal.cronLogger.logComplete, {
          correlationId,
          result: { skipped: true, reason: "AUTH_RESEND_KEY not configured" },
        });
        return;
      }
      const rsvpBaseEnv = process.env.PUBLIC_RSVP_BASE_URL;
      if (!rsvpBaseEnv) {
        log("warn", correlationId, "reminder.aborted", {
          reason: "PUBLIC_RSVP_BASE_URL not configured",
        });
        await ctx.runMutation(internal.cronLogger.logComplete, {
          correlationId,
          result: {
            skipped: true,
            reason: "PUBLIC_RSVP_BASE_URL not configured",
          },
        });
        return;
      }

      const context = await getReminderContext(ctx, correlationId);
      if (!context) {
        await ctx.runMutation(internal.cronLogger.logComplete, {
          correlationId,
          result: { skipped: true, reason: "No upcoming game" },
        });
        return;
      }
      if (context.pendingPlayers.length === 0) {
        log("info", correlationId, "reminder.no_pending_players", {});
        await ctx.runMutation(internal.cronLogger.logComplete, {
          correlationId,
          result: { skipped: true, reason: "No pending players" },
        });
        return;
      }

      const tokensByPlayer = await issueTokensForPending(ctx, context);

      await sendPushForPending(ctx, context, tokensByPlayer);
      await sendEmailForPending(context, tokensByPlayer);

      log("info", correlationId, "reminder.completed", {
        playerCount: context.pendingPlayers.length,
      });

      await ctx.runMutation(internal.cronLogger.logComplete, {
        correlationId,
        result: { playerCount: context.pendingPlayers.length },
      });
    } catch (error: any) {
      log("error", correlationId, "reminder.failed", {
        error: error.message,
      });
      await ctx.runMutation(internal.cronLogger.logFailure, {
        correlationId,
        error: error.message || String(error),
      });
      throw error;
    }
  },
});

export const sendWeeklyPushReminders = internalAction({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    "use node";
    const correlationId = crypto.randomUUID();

    log("info", correlationId, "reminder.push_started", {
      playerId,
    });

    const rsvpBaseEnv = process.env.PUBLIC_RSVP_BASE_URL;
    if (!rsvpBaseEnv) {
      log("warn", correlationId, "reminder.push_aborted", {
        reason: "PUBLIC_RSVP_BASE_URL not configured",
      });
      return;
    }

    const context = await getReminderContext(ctx, correlationId);
    if (!context) {
      return;
    }
    if (context.pendingPlayers.length === 0) {
      return;
    }

    const target = context.pendingPlayers.find((p: any) => p._id === playerId);
    if (!target) {
      log("info", correlationId, "reminder.player_not_pending", {
        playerId,
      });
      return;
    }

    const singleContext: ReminderContext = {
      ...context,
      pendingPlayers: [target],
    };

    const tokensByPlayer = await issueTokensForPending(ctx, singleContext);
    await sendPushForPending(ctx, singleContext, tokensByPlayer);

    log("info", correlationId, "reminder.push_completed", {
      playerId,
    });
  },
});

export const sendWeeklyEmailReminders = internalAction({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    "use node";
    const correlationId = crypto.randomUUID();

    log("info", correlationId, "reminder.email_started", {
      playerId,
    });

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      log("warn", correlationId, "reminder.email_aborted", {
        reason: "AUTH_RESEND_KEY not configured",
      });
      return;
    }
    const rsvpBaseEnv = process.env.PUBLIC_RSVP_BASE_URL;
    if (!rsvpBaseEnv) {
      log("warn", correlationId, "reminder.email_aborted", {
        reason: "PUBLIC_RSVP_BASE_URL not configured",
      });
      return;
    }

    const context = await getReminderContext(ctx, correlationId);
    if (!context) {
      return;
    }
    if (context.pendingPlayers.length === 0) {
      return;
    }

    const target = context.pendingPlayers.find((p: any) => p._id === playerId);
    if (!target) {
      log("info", correlationId, "reminder.player_not_pending", {
        playerId,
      });
      return;
    }

    const singleContext: ReminderContext = {
      ...context,
      pendingPlayers: [target],
    };

    const tokensByPlayer = await issueTokensForPending(ctx, singleContext);
    await sendEmailForPending(singleContext, tokensByPlayer);

    log("info", correlationId, "reminder.email_completed", {
      playerId,
    });
  },
});
