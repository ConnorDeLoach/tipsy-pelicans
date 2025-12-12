import { Id } from "@/convex/_generated/dataModel";
import { GameDetailsClient } from "./GameDetailsClient";
import { preloadGameDetailsData } from "./actions";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GameDetailsPage(props: PageProps) {
  const params = await props.params;
  const gameId = params.gameId as Id<"games">;
  const preloadedData = await preloadGameDetailsData(gameId);

  return <GameDetailsClient gameId={gameId} preloadedData={preloadedData} />;
}
