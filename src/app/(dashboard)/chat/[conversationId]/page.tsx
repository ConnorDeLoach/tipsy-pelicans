"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useRef, useState, use } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Send, ChevronDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 50;

// Optimistic message type
type OptimisticMessage = {
  _id: string;
  _creationTime: number;
  createdBy: Id<"players">;
  body: string;
  displayName: string;
  role: string;
  isOptimistic: true;
};

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  createdBy: Id<"players">;
  body: string;
  displayName: string;
  role: string;
  isOptimistic?: false;
};

type AnyMessage = Message | OptimisticMessage;

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const me = useQuery(api.me.get);
  const conversation = useQuery(api.chat.conversations.get, { conversationId });

  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.messages.listByConversation,
    { conversationId },
    { initialNumItems: PAGE_SIZE }
  );

  const sendMessage = useMutation(api.chat.messages.send);
  const deleteMessage = useMutation(api.chat.messages.remove);
  const markAsRead = useMutation(api.chat.unread.markAsRead);
  const heartbeat = useMutation(api.chat.presence.heartbeat);

  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessageCountRef = useRef(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"messages"> | null>(
    null
  );

  // Combine real messages with optimistic ones
  const allMessages: AnyMessage[] = [...messages, ...optimisticMessages];

  // Mark chat as read when page loads and when new messages arrive while viewing
  useEffect(() => {
    if (me && messages.length > 0) {
      markAsRead({ conversationId });
    }
  }, [me, messages.length, markAsRead, conversationId]);

  // Send presence heartbeat every 15 seconds while viewing chat
  // This is used to suppress push notifications for active users
  useEffect(() => {
    if (!me) return;

    // Send initial heartbeat
    heartbeat({ conversationId });

    // Set up interval for ongoing heartbeats
    const interval = setInterval(() => {
      // Only send heartbeat if document is visible
      if (document.visibilityState === "visible") {
        heartbeat({ conversationId });
      }
    }, 15_000); // Every 15 seconds

    // Also send heartbeat when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heartbeat({ conversationId });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [me, heartbeat, conversationId]);

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, shouldAutoScroll]);

  // Track new messages when scrolled up
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevMessageCountRef.current && !shouldAutoScroll) {
      setUnreadCount(
        (prev) => prev + (currentCount - prevMessageCountRef.current)
      );
    }
    if (shouldAutoScroll) {
      setUnreadCount(0);
    }
    prevMessageCountRef.current = currentCount;
  }, [messages.length, shouldAutoScroll]);

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
    if (!trimmed || isSending || !me?.playerId) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      _id: optimisticId,
      _creationTime: Date.now(),
      createdBy: me.playerId,
      body: trimmed,
      displayName: me.name ?? "You",
      role: me.role ?? "player",
      isOptimistic: true,
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setBody("");
    setShouldAutoScroll(true);
    setIsSending(true);

    try {
      await sendMessage({ conversationId, body: trimmed });
      // Remove optimistic message after server confirms (real one will appear via subscription)
      setOptimisticMessages((prev) =>
        prev.filter((m) => m._id !== optimisticId)
      );
    } catch (err) {
      // Remove optimistic message and restore body on error
      setOptimisticMessages((prev) =>
        prev.filter((m) => m._id !== optimisticId)
      );
      setBody(trimmed);
      const message =
        err instanceof Error ? err.message : "Failed to send message.";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
    setUnreadCount(0);
  };

  const handleDelete = async (messageId: Id<"messages">) => {
    try {
      await deleteMessage({ messageId });
      toast.success("Message deleted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete message.";
      toast.error(message);
    } finally {
      setDeleteConfirmId(null);
      setSelectedMessageId(null);
    }
  };

  const handleMessageTap = (msgId: string, canDeleteMsg: boolean) => {
    if (!canDeleteMsg) return;
    // Toggle selection on tap
    setSelectedMessageId((prev) => (prev === msgId ? null : msgId));
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
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const getDateKey = (timestamp: number) => {
    return new Date(timestamp).toDateString();
  };

  const isLoading = status === "LoadingFirstPage";

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--header-height)-2rem)] px-4 lg:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={() => router.push("/chat")}
        >
          <ArrowLeft className="size-6" />
          <span className="sr-only">Back to messages</span>
        </Button>
        <div className="min-w-0 flex-1">
          {conversation ? (
            <h1 className="text-xl font-semibold truncate">
              {conversation.displayName}
            </h1>
          ) : (
            <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
          )}
        </div>
      </div>

      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto rounded-xl p-4"
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

        {/* Message list with date separators */}
        <ul className="space-y-3">
          {allMessages.map((msg, index) => {
            const isMe = me?.playerId === msg.createdBy;
            const isOptimistic = "isOptimistic" in msg && msg.isOptimistic;
            const prevMsg = index > 0 ? allMessages[index - 1] : null;
            const showDateSeparator =
              !prevMsg ||
              getDateKey(msg._creationTime) !==
                getDateKey(prevMsg._creationTime);

            return (
              <li key={msg._id}>
                {showDateSeparator && (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDateSeparator(msg._creationTime)}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    onClick={() =>
                      handleMessageTap(msg._id, !isOptimistic && canDelete(msg))
                    }
                    className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    } ${isOptimistic ? "opacity-70" : ""}`}
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
                        {isOptimistic
                          ? "Sending..."
                          : formatTime(msg._creationTime)}
                      </span>
                      {!isOptimistic && canDelete(msg) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(msg._id as Id<"messages">);
                          }}
                          className={`transition-opacity md:opacity-0 md:group-hover:opacity-100 ${
                            selectedMessageId === msg._id
                              ? "opacity-100"
                              : "opacity-0"
                          } ${
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
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={messagesEndRef} />

        {/* New message indicator */}
        {!shouldAutoScroll && unreadCount > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            <ChevronDown className="size-4" />
            {unreadCount} new {unreadCount === 1 ? "message" : "messages"}
          </button>
        )}
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

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmId(null);
            setSelectedMessageId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
