import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { RosterClient } from "./RosterClient";

export default async function RosterServer() {
  const token = await convexAuthNextjsToken();
  const preloadedPlayers = await preloadQuery(
    api.players.getPlayers,
    {},
    { token }
  );

  return <RosterClient preloadedPlayers={preloadedPlayers} />;
}
