"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Send } from "lucide-react";

const PAGE_SIZE = 50;

export default function ChatPage() {
  const me = useQuery(api.me.get);
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.messages.list,
    {},
    { initialNumItems: PAGE_SIZE }
  );

  const sendMessage = useMutation(api.chat.messages.send);
  const deleteMessage = useMutation(api.chat.messages.remove);

  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({ body: trimmed });
      setBody("");
      setShouldAutoScroll(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message.";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: Id<"messages">) => {
    try {
      await deleteMessage({ messageId });
      toast.success("Message deleted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete message.";
      toast.error(message);
    }
  };

  const canDelete = (msg: {
    createdBy: Id<"players">;
    _creationTime: number;
  }) => {
    if (!me?.playerId) return false;
    const isOwner = msg.createdBy === me.playerId;
    const isAdmin = me.role === "admin";
    const withinWindow = Date.now() - msg._creationTime < 10 * 60 * 1000;
    return isAdmin || (isOwner && withinWindow);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isLoading = status === "LoadingFirstPage";

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-4rem)] flex-col px-4 lg:px-6">
      <h1 className="mb-4 text-xl font-semibold">Team Chat</h1>

      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-tint-blue p-4"
      >
        {/* Load more button */}
        {status === "CanLoadMore" && (
          <div className="mb-4 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadMore(PAGE_SIZE)}
            >
              Load older messages
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No messages yet—be the first to say hi!
          </p>
        )}

        {/* Message list */}
        <ul className="space-y-3">
          {messages.map((msg) => {
            const isMe = me?.playerId === msg.createdBy;
            return (
              <li
                key={msg._id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!isMe && (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {msg.displayName}
                      </span>
                      <span className="text-xs capitalize opacity-60">
                        {msg.role}
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {msg.body}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        isMe ? "opacity-70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg._creationTime)}
                    </span>
                    {canDelete(msg) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(msg._id)}
                        className={`opacity-0 transition-opacity group-hover:opacity-100 ${
                          isMe
                            ? "text-primary-foreground/70 hover:text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label="Delete message"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          disabled={isSending || !me}
          maxLength={2000}
        />
        <Button
          type="submit"
          disabled={isSending || !body.trim() || !me}
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <p className="mt-1 text-xs text-muted-foreground">
        {body.length}/2000 characters
      </p>
    </div>
  );
}
