"use server";

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export async function preloadRosterPageData() {
  const token = await convexAuthNextjsToken();
  return preloadQuery(api.players.getPlayers, {}, { token });
}
