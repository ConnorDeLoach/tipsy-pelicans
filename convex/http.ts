import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { registerHttpRoutes as registerMerch } from "./merch/http";

const http = httpRouter();

auth.addHttpRoutes(http);

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const health = await ctx.runQuery(api.health.check, {});
    const statusCode = health.status === "healthy" ? 200 : 503;

    return new Response(JSON.stringify(health, null, 2), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }),
});

// Merch domain routes
registerMerch(http);

http.route({
  path: "/rsvp",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    if (!token) return new Response("Missing token.", { status: 400 });

    const record = await ctx.runQuery(api.rsvpTokens.getByToken, { token });
    if (!record) return new Response("Invalid token.", { status: 400 });

    const now = Date.now();
    if (record.usedAt)
      return new Response("Token already used.", { status: 410 });
    if (record.expiresAt < now)
      return new Response("Token expired.", { status: 410 });

    const status = record.choice;
    await ctx.runMutation(internal.games.setRsvpInternal, {
      gameId: record.gameId,
      playerId: record.playerId,
      status,
    });

    await ctx.runMutation(api.rsvpTokens.markUsed, { token });

    const base = process.env.SITE_URL || "/";
    const redirectTo = `${base.replace(
      /\/$/,
      ""
    )}/rsvp?status=${encodeURIComponent(record.choice)}`;
    return Response.redirect(redirectTo, 302);
  }),
});

export default http;
