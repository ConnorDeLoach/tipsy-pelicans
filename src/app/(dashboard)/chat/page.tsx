"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatListPage() {
  const router = useRouter();
  const conversations = useQuery(api.chat.conversations.list);
  const getOrCreateTeamChat = useMutation(
    api.chat.conversations.getOrCreateTeamChat
  );
  const me = useQuery(api.me.get);

  // Seed team chat on first load
  useEffect(() => {
    if (me?.playerId) {
      getOrCreateTeamChat();
    }
  }, [me, getOrCreateTeamChat]);

  const handleConversationClick = (conversationId: Id<"conversations">) => {
    router.push(`/chat/${conversationId}`);
  };

  if (conversations === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 lg:px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Messages</h1>
        {/* Future: Add New Chat button here */}
        <button
          className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          title="New Chat (Coming Soon)"
        >
          <MessageSquarePlus className="size-6" />
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
          <p>No conversations yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => (
            <div
              key={conv._id}
              onClick={() => handleConversationClick(conv._id)}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98]"
            >
              {/* Avatar / Icon Placeholder */}
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-lg">
                {conv.displayName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium truncate">{conv.displayName}</h3>
                  {conv.lastMessageAt && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(conv.lastMessageAt, {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate pr-4">
                    {conv.lastMessageByName && (
                      <span className="font-medium text-foreground/80">
                        {conv.lastMessageByName}:{" "}
                      </span>
                    )}
                    {conv.lastMessagePreview || "No messages yet"}
                  </p>

                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
