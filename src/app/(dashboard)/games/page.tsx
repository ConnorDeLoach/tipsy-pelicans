import { getGamesPageData } from "./actions";
import { GamesClient } from "./GamesClient";

export default async function GamesPage() {
  const initialData = await getGamesPageData();

  return <GamesClient initialData={initialData} />;
}
