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
import { Loader2, Send, ChevronDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImagePicker, useImagePicker } from "@/components/chat/ImagePicker";
import { MessageImages } from "@/components/chat/MessageImages";
import { MessageContent } from "@/components/chat/MessageContent";
import { ReactionChips, type Reaction } from "@/components/chat/ReactionChips";
import { MessageActions } from "@/components/chat/MessageActions";
import { LinkPreviewCards } from "@/components/chat/LinkPreviewCard";

const PAGE_SIZE = 50;

// Image type from API
type MessageImage = {
  fullUrl: string | null;
  thumbUrl: string | null;
  width: number;
  height: number;
};

// Optimistic message type
type OptimisticMessageStatus = "pending" | "failed";

type OptimisticMessage = {
  _id: string;
  _creationTime: number;
  createdBy: Id<"players">;
  body: string;
  displayName: string;
  role: string;
  images?: MessageImage[];
  reactions: Reaction[];
  isOptimistic: true;
  status: OptimisticMessageStatus;
};

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  createdBy: Id<"players">;
  body: string;
  displayName: string;
  role: string;
  images?: MessageImage[];
  reactions: Reaction[];
  isOptimistic?: false;
};

type AnyMessage = Message | OptimisticMessage;

// Optimistic reaction update - keyed by "messageId:emoji"
type OptimisticReaction = {
  messageId: string;
  emoji: string;
  action: "add" | "remove";
};

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
  const sendWithImages = useMutation(api.chat.images.sendWithImages);
  const generateUploadUrl = useMutation(api.chat.images.generateUploadUrl);
  const deleteMessage = useMutation(api.chat.messages.remove);
  const markAsRead = useMutation(api.chat.unread.markAsRead);
  const heartbeat = useMutation(api.chat.presence.heartbeat);
  const toggleReaction = useMutation(api.chat.reactions.toggle);

  const {
    images: pendingImages,
    setImages: setPendingImages,
    clearImages,
    hasImages,
    allReady,
  } = useImagePicker();

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
  const [optimisticReactions, setOptimisticReactions] = useState<
    OptimisticReaction[]
  >([]);
  const [suppressNextActionsOpen, setSuppressNextActionsOpen] = useState(false);

  // Helper to apply optimistic reactions to a message
  const applyOptimisticReactions = (
    reactions: Reaction[],
    messageId: string
  ): Reaction[] => {
    const pendingForMessage = optimisticReactions.filter(
      (r) => r.messageId === messageId
    );
    if (pendingForMessage.length === 0) return reactions;

    // Clone reactions array
    const updated = reactions.map((r) => ({ ...r }));

    for (const pending of pendingForMessage) {
      const existing = updated.find((r) => r.emoji === pending.emoji);
      const current = updated.find((r) => r.reactedByMe);

      if (pending.action === "add") {
        // Ensure only one reaction by this user: remove current if different
        if (current && current.emoji !== pending.emoji) {
          current.count--;
          current.reactedByMe = false;
          if (current.count <= 0) {
            const idx = updated.indexOf(current);
            if (idx !== -1) updated.splice(idx, 1);
          }
        }

        if (existing) {
          if (!existing.reactedByMe) {
            existing.count++;
            existing.reactedByMe = true;
          }
        } else {
          updated.push({ emoji: pending.emoji, count: 1, reactedByMe: true });
        }
      } else {
        // remove
        const target =
          existing && existing.reactedByMe ? existing : current ?? null;
        if (target && target.reactedByMe) {
          target.count--;
          target.reactedByMe = false;
          // Remove if count is 0
          if (target.count <= 0) {
            const idx = updated.indexOf(target);
            if (idx !== -1) updated.splice(idx, 1);
          }
        }
      }
    }
    return updated;
  };

  // Combine real messages with optimistic ones and apply optimistic reactions
  const allMessages: AnyMessage[] = [
    ...messages.map((m) => ({
      ...m,
      reactions: applyOptimisticReactions(m.reactions, m._id),
    })),
    ...optimisticMessages,
  ];

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
    const hasText = trimmed.length > 0;
    const hasImagesReady = hasImages && allReady;

    // Must have text or images
    if ((!hasText && !hasImagesReady) || isSending || !me?.playerId) return;

    const optimisticId = `optimistic-${Date.now()}`;

    // Create optimistic images from pending images (use preview URLs as placeholders)
    const optimisticImages: MessageImage[] | undefined = hasImagesReady
      ? pendingImages.map((img) => ({
          fullUrl: img.previewUrl,
          thumbUrl: img.previewUrl,
          width: img.compressed?.width ?? 100,
          height: img.compressed?.height ?? 100,
        }))
      : undefined;

    const optimisticMsg: OptimisticMessage = {
      _id: optimisticId,
      _creationTime: Date.now(),
      createdBy: me.playerId,
      body: trimmed,
      displayName: me.name ?? "You",
      role: me.role ?? "player",
      images: optimisticImages,
      reactions: [],
      isOptimistic: true,
      status: "pending",
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setBody("");
    const imagesToUpload = [...pendingImages];
    clearImages();
    setShouldAutoScroll(true);
    setIsSending(true);

    try {
      if (hasImagesReady) {
        // Upload all images first
        const uploadedImages = await Promise.all(
          imagesToUpload.map(async (img) => {
            if (!img.compressed) throw new Error("Image not compressed");

            // Upload full image
            const fullUploadUrl = await generateUploadUrl();
            const fullResponse = await fetch(fullUploadUrl, {
              method: "POST",
              headers: { "Content-Type": "image/webp" },
              body: img.compressed.full,
            });
            if (!fullResponse.ok)
              throw new Error("Failed to upload full image");
            const { storageId: fullId } = await fullResponse.json();

            // Upload thumbnail
            const thumbUploadUrl = await generateUploadUrl();
            const thumbResponse = await fetch(thumbUploadUrl, {
              method: "POST",
              headers: { "Content-Type": "image/webp" },
              body: img.compressed.thumb,
            });
            if (!thumbResponse.ok)
              throw new Error("Failed to upload thumbnail");
            const { storageId: thumbId } = await thumbResponse.json();

            return {
              fullId,
              thumbId,
              width: img.compressed.width,
              height: img.compressed.height,
            };
          })
        );

        // Send message with images
        await sendWithImages({
          conversationId,
          body: hasText ? trimmed : undefined,
          images: uploadedImages,
        });
      } else {
        // Text-only message
        await sendMessage({ conversationId, body: trimmed });
      }

      // Remove optimistic message after server confirms
      setOptimisticMessages((prev) =>
        prev.filter((m) => m._id !== optimisticId)
      );
    } catch (err) {
      if (hasImagesReady) {
        // For image messages, fall back to previous behavior: remove optimistic
        // bubble and restore body so the user can retry after re-selecting
        // images.
        setOptimisticMessages((prev) =>
          prev.filter((m) => m._id !== optimisticId)
        );
        setBody(trimmed);
      } else {
        // For text-only messages, keep the optimistic bubble and mark it as
        // failed so the user sees a clear error state and can retry.
        setOptimisticMessages((prev) =>
          prev.map((m) =>
            m._id === optimisticId ? { ...m, status: "failed" } : m
          )
        );
      }
      // Note: images are cleared and lost on error (could be improved)
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

  const handleRetryOptimistic = async (optimisticId: string) => {
    if (!me?.playerId) return;

    const msg = optimisticMessages.find((m) => m._id === optimisticId);
    if (!msg || msg.status !== "failed") return;

    const trimmed = msg.body.trim();
    if (!trimmed) return;

    setIsSending(true);

    // Mark as pending again while we retry
    setOptimisticMessages((prev) =>
      prev.map((m) =>
        m._id === optimisticId ? { ...m, status: "pending" } : m
      )
    );

    try {
      await sendMessage({ conversationId, body: trimmed });

      // On success, remove the optimistic bubble
      setOptimisticMessages((prev) =>
        prev.filter((m) => m._id !== optimisticId)
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message.";
      toast.error(message);

      // Restore failed state
      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m._id === optimisticId ? { ...m, status: "failed" } : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId: Id<"messages">, emoji: string) => {
    if (!me?.playerId) return;

    // Find the current message to determine if we're adding or removing
    const message = messages.find((m) => m._id === messageId);
    if (!message) return;

    const currentReaction = message.reactions.find((r) => r.emoji === emoji);
    const isRemoving = currentReaction?.reactedByMe ?? false;
    const action = isRemoving ? "remove" : "add";

    // Optimistic update
    const optimisticKey = `${messageId}:${emoji}`;
    setOptimisticReactions((prev) => {
      // Remove any existing pending reaction for this message+emoji
      const filtered = prev.filter(
        (r) => !(r.messageId === messageId && r.emoji === emoji)
      );
      return [...filtered, { messageId, emoji, action }];
    });

    try {
      await toggleReaction({ messageId, emoji });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to react.";
      toast.error(errorMessage);
    } finally {
      // Remove optimistic update (real data will come from subscription)
      setOptimisticReactions((prev) =>
        prev.filter((r) => !(r.messageId === messageId && r.emoji === emoji))
      );
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
            const optimisticStatus =
              isOptimistic && "status" in msg ? msg.status : undefined;
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
                  <MessageActions
                    open={selectedMessageId === msg._id && !isOptimistic}
                    onOpenChange={(open) => {
                      if (open) {
                        if (suppressNextActionsOpen) {
                          setSuppressNextActionsOpen(false);
                          return;
                        }
                        setSelectedMessageId(msg._id);
                      } else {
                        setSelectedMessageId((current) =>
                          current === msg._id ? null : current
                        );
                      }
                    }}
                    onReact={(emoji) =>
                      handleReaction(msg._id as Id<"messages">, emoji)
                    }
                    onDelete={
                      canDelete(msg)
                        ? () => setDeleteConfirmId(msg._id as Id<"messages">)
                        : undefined
                    }
                    isMe={isMe}
                  >
                    <div
                      className={`group relative max-w-[85%] rounded-lg px-3 py-2 cursor-pointer ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      } ${
                        isOptimistic && optimisticStatus !== "failed"
                          ? "opacity-70 cursor-default"
                          : ""
                      } ${
                        isOptimistic && optimisticStatus === "failed"
                          ? isMe
                            ? "ring-1 ring-destructive/40"
                            : "ring-1 ring-destructive/50"
                          : ""
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
                      {msg.body && (
                        <MessageContent body={msg.body} isMe={isMe} />
                      )}
                      {msg.images && msg.images.length > 0 && (
                        <MessageImages
                          images={msg.images}
                          isMe={isMe}
                          onLightboxOpenChange={(open) => {
                            if (!open) {
                              setSuppressNextActionsOpen(true);
                            }
                          }}
                        />
                      )}
                      {msg.body && !isOptimistic && (
                        <LinkPreviewCards body={msg.body} isMe={isMe} />
                      )}
                      {/* Reaction chips */}
                      {!isOptimistic && (
                        <ReactionChips
                          reactions={msg.reactions}
                          onToggle={(emoji) =>
                            handleReaction(msg._id as Id<"messages">, emoji)
                          }
                          isMe={isMe}
                          disabled={!me}
                        />
                      )}
                      <div className="mt-1 flex items-center justify-end gap-2">
                        {isOptimistic && optimisticStatus === "failed" && (
                          <>
                            <span className="text-xs text-destructive/80">
                              Failed to send.
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleRetryOptimistic(msg._id as string)
                              }
                              className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
                            >
                              Retry
                            </button>
                          </>
                        )}
                        <span
                          className={`text-xs ${
                            isMe ? "opacity-70" : "text-muted-foreground"
                          }`}
                        >
                          {isOptimistic
                            ? optimisticStatus === "failed"
                              ? ""
                              : "Sending..."
                            : formatTime(msg._creationTime)}
                        </span>
                      </div>
                    </div>
                  </MessageActions>
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
      <form onSubmit={handleSend} className="mt-4 space-y-2">
        <div className="flex gap-2 items-end">
          <ImagePicker
            images={pendingImages}
            onImagesChange={setPendingImages}
            disabled={isSending || !me}
          />
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
            disabled={
              isSending ||
              (!body.trim() && !hasImages) ||
              (hasImages && !allReady) ||
              !me
            }
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
      {body.length >= 1500 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length}/2000 characters
        </p>
      )}

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
