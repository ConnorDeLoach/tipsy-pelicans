import { preloadGamesPageData } from "./actions";
import { GamesClient } from "./GamesClient";

export default async function GamesPage() {
  const preloadedData = await preloadGamesPageData();

  return <GamesClient preloadedData={preloadedData} />;
}
