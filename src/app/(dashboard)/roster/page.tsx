import { preloadRosterPageData } from "./actions";
import { RosterClient } from "./RosterClient";

export default async function RosterPage() {
  const preloadedPlayers = await preloadRosterPageData();
  return <RosterClient preloadedPlayers={preloadedPlayers} />;
}
