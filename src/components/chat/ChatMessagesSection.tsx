"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageImages } from "@/components/chat/MessageImages";
import { MessageGif } from "@/components/chat/MessageGif";
import { ReactionChips } from "@/components/chat/ReactionChips";
import { LinkPreviewCards } from "@/components/chat/LinkPreviewCard";
import { type AnyMessage, type Me } from "@/hooks/use-chat";
import { type MutableRefObject } from "react";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

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

export type ChatMessagesSectionProps = {
  me: Me;
  allMessages: AnyMessage[];
  messagesLength: number;
  isLoading: boolean;
  canLoadMore: boolean;
  unreadCount: number;
  shouldAutoScroll: boolean;
  selectedMessageId: string | null;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onReaction: (messageId: Id<"messages">, emoji: string) => void;
  onRetryOptimistic: (optimisticId: string) => void;
  onRequestDelete: (
    messageId: Id<"messages">,
    msg: { createdBy: Id<"players">; _creationTime: number }
  ) => void;
  onMessageActionsOpenChange: (
    messageId: string,
    isOptimistic: boolean | undefined,
    open: boolean
  ) => void;
  onMessageLightboxClose: () => void;
  canDelete: (msg: {
    createdBy: Id<"players">;
    _creationTime: number;
  }) => boolean;
};

export function ChatMessagesSection({
  me,
  allMessages,
  messagesLength,
  isLoading,
  canLoadMore,
  unreadCount,
  shouldAutoScroll,
  selectedMessageId,
  containerRef,
  messagesEndRef,
  onLoadMore,
  onScroll,
  onScrollToBottom,
  onReaction,
  onRetryOptimistic,
  onRequestDelete,
  onMessageActionsOpenChange,
  onMessageLightboxClose,
  canDelete,
}: ChatMessagesSectionProps) {
  return (
    <>
      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="relative flex-1 min-h-0 overflow-y-auto rounded-xl p-4"
      >
        {/* Load more button */}
        {canLoadMore && (
          <div className="mb-4 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
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

        {!isLoading && messagesLength === 0 && (
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
            const nextMsg =
              index < allMessages.length - 1 ? allMessages[index + 1] : null;

            const showDateSeparator =
              !prevMsg ||
              getDateKey(msg._creationTime) !==
                getDateKey(prevMsg._creationTime);

            const isSameSenderAsPrev =
              !!prevMsg && prevMsg.createdBy === msg.createdBy;
            const isSameSenderAsNext =
              !!nextMsg && nextMsg.createdBy === msg.createdBy;

            const withinPrevWindow =
              !!prevMsg &&
              msg._creationTime - prevMsg._creationTime <= GROUP_WINDOW_MS;
            const withinNextWindow =
              !!nextMsg &&
              nextMsg._creationTime - msg._creationTime <= GROUP_WINDOW_MS;

            const sameDayAsPrev = !!prevMsg && !showDateSeparator;
            const sameDayAsNext =
              !!nextMsg &&
              getDateKey(nextMsg._creationTime) ===
                getDateKey(msg._creationTime);

            const isGroupedWithPrev =
              isSameSenderAsPrev && withinPrevWindow && sameDayAsPrev;
            const isGroupedWithNext =
              isSameSenderAsNext && withinNextWindow && sameDayAsNext;

            const isGroupStart = !isGroupedWithPrev;
            const isGroupEnd = !isGroupedWithNext;
            const showSenderHeader = !isMe && isGroupStart;
            const showTimestamp = !isOptimistic && isGroupEnd;

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
                    onOpenChange={(open) =>
                      onMessageActionsOpenChange(
                        msg._id as string,
                        isOptimistic,
                        open
                      )
                    }
                    onReact={(emoji) =>
                      onReaction(msg._id as Id<"messages">, emoji)
                    }
                    onDelete={
                      canDelete(msg)
                        ? () => onRequestDelete(msg._id as Id<"messages">, msg)
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
                      {showSenderHeader && (
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
                              onMessageLightboxClose();
                            }
                          }}
                        />
                      )}
                      {msg.gif && (
                        <MessageGif
                          gif={msg.gif}
                          isMe={isMe}
                          onLightboxOpenChange={(open) => {
                            if (!open) {
                              onMessageLightboxClose();
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
                            onReaction(msg._id as Id<"messages">, emoji)
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
                                onRetryOptimistic(msg._id as string)
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
                            : showTimestamp
                            ? formatTime(msg._creationTime)
                            : ""}
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
            onClick={onScrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            <ChevronDown className="size-4" />
            {unreadCount} new {unreadCount === 1 ? "message" : "messages"}
          </button>
        )}
      </div>
    </>
  );
}
