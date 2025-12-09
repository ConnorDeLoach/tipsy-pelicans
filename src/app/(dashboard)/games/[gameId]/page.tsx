import { Id } from "@/convex/_generated/dataModel";
import { GameDetailsClient } from "./GameDetailsClient";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GameDetailsPage(props: PageProps) {
  const params = await props.params;
  return <GameDetailsClient gameId={params.gameId as Id<"games">} />;
}
