import { preloadConversationsList } from "./actions";
import { ChatListClient } from "./ChatListClient";

export default async function ChatListPage() {
  const preloadedData = await preloadConversationsList();

  return <ChatListClient preloadedData={preloadedData} />;
}
