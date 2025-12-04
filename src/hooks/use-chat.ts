"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { useImagePicker } from "@/components/chat/ImagePicker";

export const CHAT_MESSAGES_PAGE_SIZE = 50;

// Image type from API
export type MessageImage = {
  fullUrl: string | null;
  thumbUrl: string | null;
  width: number;
  height: number;
};

// Optimistic message type
export type OptimisticMessageStatus = "pending" | "failed";

type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type OptimisticMessage = {
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

export type Message = {
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

export type AnyMessage = Message | OptimisticMessage;

// Optimistic reaction update - keyed by "messageId:emoji"
type OptimisticReaction = {
  messageId: string;
  emoji: string;
  action: "add" | "remove";
};

export type Me =
  | {
      playerId?: Id<"players">;
      role?: string;
      name?: string | null;
    }
  | null
  | undefined;

type UseChatMessagesArgs = {
  conversationId: Id<"conversations">;
  me: Me;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  onForceAutoScroll?: () => void;
};

export function useChatMessages({
  conversationId,
  me,
  textareaRef,
  onForceAutoScroll,
}: UseChatMessagesArgs) {
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chat.messages.listByConversation,
    { conversationId },
    { initialNumItems: CHAT_MESSAGES_PAGE_SIZE }
  );

  const sendMessage = useMutation(api.chat.messages.send);
  const sendWithImages = useMutation(api.chat.images.sendWithImages);
  const generateUploadUrl = useMutation(api.chat.images.generateUploadUrl);
  const deleteMessage = useMutation(api.chat.messages.remove);
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
  const [optimisticReactions, setOptimisticReactions] = useState<
    OptimisticReaction[]
  >([]);

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

  const handleSend = async (
    e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => {
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
      createdBy: me.playerId as Id<"players">,
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
    if (onForceAutoScroll) {
      onForceAutoScroll();
    }
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
      textareaRef.current?.focus();
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

  return {
    messages,
    status,
    loadMore,
    allMessages,
    body,
    setBody,
    isSending,
    pendingImages,
    setPendingImages,
    hasImages,
    allReady,
    handleSend,
    handleRetryOptimistic,
    handleReaction,
    handleDelete,
  };
}

type UseChatReadStateArgs = {
  me: Me;
  messagesLength: number;
  conversationId: Id<"conversations">;
  markAsRead: (input: { conversationId: Id<"conversations"> }) => unknown;
};

export function useChatReadState({
  me,
  messagesLength,
  conversationId,
  markAsRead,
}: UseChatReadStateArgs) {
  // Mark chat as read when page loads and when new messages arrive while viewing
  useEffect(() => {
    if (me && messagesLength > 0) {
      markAsRead({ conversationId });
    }
  }, [me, messagesLength, markAsRead, conversationId]);
}

type UseChatPresenceArgs = {
  me: Me;
  conversationId: Id<"conversations">;
  heartbeat: (input: { conversationId: Id<"conversations"> }) => unknown;
};

export function useChatPresence({
  me,
  conversationId,
  heartbeat,
}: UseChatPresenceArgs) {
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
}

type UseChatScrollArgs = {
  messagesLength: number;
  allMessagesLength: number;
};

export function useChatScroll({
  messagesLength,
  allMessagesLength,
}: UseChatScrollArgs) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessagesLength, shouldAutoScroll]);

  // Track new messages when scrolled up
  useEffect(() => {
    const currentCount = messagesLength;
    if (currentCount > prevMessageCountRef.current && !shouldAutoScroll) {
      setUnreadCount(
        (prev) => prev + (currentCount - prevMessageCountRef.current)
      );
    }
    if (shouldAutoScroll) {
      setUnreadCount(0);
    }
    prevMessageCountRef.current = currentCount;
  }, [messagesLength, shouldAutoScroll]);

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
    setUnreadCount(0);
  };

  const forceAutoScroll = () => {
    setShouldAutoScroll(true);
  };

  return {
    messagesEndRef,
    containerRef,
    shouldAutoScroll,
    unreadCount,
    handleScroll,
    scrollToBottom,
    forceAutoScroll,
  };
}
