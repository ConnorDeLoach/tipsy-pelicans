"use server";

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Preloads game details data using a single bundled query.
 * Returns a preloaded query that can be used with usePreloadedQuery for zero-flash hydration.
 */
export async function preloadGameDetailsData(gameId: Id<"games">) {
  const token = await convexAuthNextjsToken();
  return preloadQuery(api.games.getGameDetailsBundle, { gameId }, { token });
}
