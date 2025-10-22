import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

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

    const players = await ctx.runQuery(api.players.getPlayers, {});
    const pendingPlayers = players.filter(
      (player) =>
        !upcomingGame.rsvps.some((rsvp) => rsvp.playerId === player._id)
    );

    if (pendingPlayers.length === 0) {
      return;
    }

    const startTime = new Date(upcomingGame.game.startTime);
    const formatter = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const formattedStart = formatter.format(startTime);

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

      const personalizedText = `Hey ${player.name || "Pelican"},

We have a game vs ${upcomingGame.game.opponent} on ${formattedStart}.
${locationLine}${notesLine}Are you in or out?

IN: ${inUrl}
OUT: ${outUrl}

Thanks!`;

      const html = `
        <p>Hey ${player.name || "Pelican"},</p>
        <p>We have a game vs ${
          upcomingGame.game.opponent
        } on ${formattedStart}.</p>
        ${locationLine ? `<p>${locationLine.replace(/\n$/, "")}</p>` : ""}
        ${notesLine ? `<p>${notesLine.replace(/\n$/, "")}</p>` : ""}
        <p><strong>Are you in or out?</strong></p>
        <p>
          <a href="${inUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none;border:1px solid #ddd;margin-right:8px;">✅ I’m in</a>
          <a href="${outUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none;border:1px solid #ddd;">❌ I’m out</a>
        </p>
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
