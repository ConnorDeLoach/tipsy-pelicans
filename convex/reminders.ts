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
      const personalizedText = `Hey ${player.name || "Pelican"},

We have a game vs ${upcomingGame.game.opponent} on ${formattedStart}.
${locationLine}${notesLine}Please RSVP in the Tipsy Pelicans dashboard so the captains can plan the lineup.

Thanks!`;

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
