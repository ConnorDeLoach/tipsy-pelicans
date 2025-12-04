"use server";

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
export type {
  GameWithRsvps,
  Player,
  Opponent,
  Me,
  Season,
  SeasonStats,
} from "@/features/games/types";

/**
 * Preloads all games page data using the bundled query.
 * Returns a preloaded query that can be used with usePreloadedQuery for zero-flash hydration.
 */
export async function preloadGamesPageData() {
  const token = await convexAuthNextjsToken();
  return preloadQuery(api.games.getGamesPageBundle, {}, { token });
}
