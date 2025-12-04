import { preloadConversation } from "../actions";
import { ChatDetailClient } from "./ChatDetailClient";
import { Id } from "@/convex/_generated/dataModel";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const preloadedData = await preloadConversation(
    conversationId as Id<"conversations">
  );

  return (
    <ChatDetailClient
      preloadedData={preloadedData}
      conversationId={conversationId as Id<"conversations">}
    />
  );
}
