import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { RosterClient } from "./RosterClient";

export default async function RosterServer() {
  const players = await fetchQuery(api.players.getPlayers, {});

  return <RosterClient initialPlayers={players} />;
}
