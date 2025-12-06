"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Preloaded, useMutation } from "convex/react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  useChatMessages,
  useChatPresence,
  useChatReadState,
  useChatScroll,
  CHAT_MESSAGES_PAGE_SIZE,
} from "@/hooks/use-chat";
import { useChatDetailData } from "@/features/chat/queries";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessagesSection } from "@/components/chat/ChatMessagesSection";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { DeleteMessageDialog } from "@/components/chat/DeleteMessageDialog";

interface ChatDetailClientProps {
  preloadedData: Preloaded<typeof api.chat.bundle.getConversationBundle>;
  conversationId: Id<"conversations">;
}

export function ChatDetailClient({
  preloadedData,
  conversationId,
}: ChatDetailClientProps) {
  const router = useRouter();
  const { conversation, me } = useChatDetailData(preloadedData);

  // Convert preloaded me to the format expected by hooks
  const meForHooks = me
    ? { playerId: me.playerId, role: me.role, name: me.name }
    : null;

  const markAsRead = useMutation(api.chat.unread.markAsRead);
  const heartbeat = useMutation(api.chat.presence.heartbeat);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"messages"> | null>(
    null
  );
  const [suppressNextActionsOpen, setSuppressNextActionsOpen] = useState(false);

  const {
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
    handleSendGif,
    handleRetryOptimistic,
    handleReaction,
    handleDelete,
  } = useChatMessages({
    conversationId,
    me: meForHooks,
    textareaRef,
    onForceAutoScroll: undefined,
  });

  // Mark chat as read when page loads and when new messages arrive while viewing
  useChatReadState({
    me: meForHooks,
    messagesLength: messages.length,
    conversationId,
    markAsRead,
  });

  // Send presence heartbeat every 15 seconds while viewing chat
  // This is used to suppress push notifications for active users
  useChatPresence({ me: meForHooks, conversationId, heartbeat });

  const {
    messagesEndRef,
    containerRef,
    shouldAutoScroll,
    unreadCount,
    handleScroll,
    scrollToBottom,
    forceAutoScroll,
  } = useChatScroll({
    messagesLength: messages.length,
    allMessagesLength: allMessages.length,
  });

  // Ensure sending a message re-enables auto-scroll behavior
  const handleSendWithScroll = (
    e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => {
    forceAutoScroll();
    handleSend(e);
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

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";

  const handleBack = () => {
    router.push("/chat");
  };

  const handleLoadMore = () => {
    loadMore(CHAT_MESSAGES_PAGE_SIZE);
  };

  const handleMessageActionsOpenChange = (
    messageId: string,
    isOptimistic: boolean | undefined,
    open: boolean
  ) => {
    if (isOptimistic) return;

    if (open) {
      if (suppressNextActionsOpen) {
        setSuppressNextActionsOpen(false);
        return;
      }
      setSelectedMessageId(messageId);
    } else {
      setSelectedMessageId((current) =>
        current === messageId ? null : current
      );
    }
  };

  const handleMessageLightboxClose = () => {
    setSuppressNextActionsOpen(true);
  };

  const handleRequestDelete = (
    messageId: Id<"messages">,
    _msg: { createdBy: Id<"players">; _creationTime: number }
  ) => {
    setDeleteConfirmId(messageId);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteConfirmId(null);
      setSelectedMessageId(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      handleDelete(deleteConfirmId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--header-height)-2rem)] px-4 lg:px-6">
      <ChatHeader conversation={conversation} onBack={handleBack} />
      <ChatMessagesSection
        me={meForHooks}
        allMessages={allMessages}
        messagesLength={messages.length}
        isLoading={isLoading}
        canLoadMore={canLoadMore}
        unreadCount={unreadCount}
        shouldAutoScroll={shouldAutoScroll}
        selectedMessageId={selectedMessageId}
        containerRef={containerRef}
        messagesEndRef={messagesEndRef}
        onLoadMore={handleLoadMore}
        onScroll={handleScroll}
        onScrollToBottom={scrollToBottom}
        onReaction={handleReaction}
        onRetryOptimistic={handleRetryOptimistic}
        onRequestDelete={handleRequestDelete}
        onMessageActionsOpenChange={handleMessageActionsOpenChange}
        onMessageLightboxClose={handleMessageLightboxClose}
        canDelete={canDelete}
      />
      <ChatComposer
        me={meForHooks}
        body={body}
        isSending={isSending}
        hasImages={hasImages}
        allReady={allReady}
        pendingImages={pendingImages}
        textareaRef={textareaRef}
        onBodyChange={setBody}
        onImagesChange={setPendingImages}
        onSend={handleSendWithScroll}
        onSendGif={handleSendGif}
      />
      <DeleteMessageDialog
        deleteConfirmId={deleteConfirmId}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
