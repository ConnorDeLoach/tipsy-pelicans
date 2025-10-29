import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const weeklyGameReminder = internalAction({
  args: {},
  handler: async (ctx) => {
    "use node";

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.warn(
        "AUTH_RESEND_KEY is not configured; skipping weekly reminder email"
      );
      return;
    }
    const rsvpBase = process.env.PUBLIC_RSVP_BASE_URL;
    if (!rsvpBase) {
      console.warn(
        "PUBLIC_RSVP_BASE_URL is not configured; skipping weekly reminder email"
      );
      return;
    }

    const now = Date.now();
    const windowEnd = now + ONE_DAY_MS * 7;

    const games = await ctx.runQuery(api.games.listGamesWithRsvps, {});
    const upcomingGame = games
      .filter((entry) => entry.game.startTime >= now)
      .find((entry) => entry.game.startTime <= windowEnd);

    if (!upcomingGame) {
      return;
    }

    const allPlayers = await ctx.runQuery(api.players.getPlayers, {});
    const players = allPlayers.filter((p: any) => (p as any).role === "player");
    const pendingPlayers = players.filter(
      (player) =>
        !upcomingGame.rsvps.some((rsvp) => rsvp.playerId === player._id)
    );

    if (pendingPlayers.length === 0) {
      return;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    const formattedStart = formatter.format(upcomingGame.game.startTime);

    const subject = `RSVP needed: vs ${upcomingGame.game.opponent} on ${formattedStart}`;
    const locationLine = upcomingGame.game.location
      ? `Location: ${upcomingGame.game.location}\n`
      : "";
    const notesLine = upcomingGame.game.notes
      ? `Notes: ${upcomingGame.game.notes}\n`
      : "";

    for (const player of pendingPlayers) {
      const inToken = crypto.randomUUID();
      const outToken = crypto.randomUUID();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 72; // 72h

      await ctx.runMutation(api.rsvpTokens.issuePair, {
        playerId: player._id,
        gameId: upcomingGame.game._id,
        inToken,
        outToken,
        expiresAt,
      });

      const base = rsvpBase.replace(/\/$/, "");
      const inUrl = `${base}/rsvp?token=${inToken}`;
      const outUrl = `${base}/rsvp?token=${outToken}`;
      const imageUrl = `${process.env.SITE_URL}/tipsy-rsvp-recruit.webp`;
      const locationHtml = upcomingGame.game.location
        ? `<p style="margin:0 0 12px;"><strong>Location:</strong> ${upcomingGame.game.location}</p>`
        : "";
      const notesHtml = upcomingGame.game.notes
        ? `<p style="margin:0 0 12px;"><strong>Notes:</strong> ${upcomingGame.game.notes}</p>`
        : "";

      if (player.userId) {
        const payload = {
          title: `${formattedStart}`,
          body: `vs ${upcomingGame.game.opponent}`,
          tag: `rsvp-${upcomingGame.game._id}-${player._id}`,
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
      }

      const personalizedText = `Hey ${player.name || "Pelican"},

We have a game vs ${upcomingGame.game.opponent} on ${formattedStart}.
${locationLine}${notesLine}Please respond with your RSVP below.

I'm in: ${inUrl}
I'm out: ${outUrl}

Thanks!
Tipsy`;

      const html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;color:#0f172a;max-width:540px;margin:0 auto;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">Weekly Game Reminder</h1>
          <p style="margin:0 0 12px;">Hey ${player.name || "Pelican"},</p>
          <p style="margin:0 0 12px;">We have a game vs ${
            upcomingGame.game.opponent
          } on ${formattedStart}.</p>
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
        console.error(
          `Failed to send email to ${player.email}: ${response.status} ${errorText}`
        );
      }
    }

    console.log(`Sent ${pendingPlayers.length} reminder emails.`);
  },
});
