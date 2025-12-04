"use client";

import { Preloaded, usePreloadedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

export type ConversationSummary = {
  _id: Id<"conversations">;
  type: "group" | "direct";
  name?: string;
  displayName: string;
  participantIds: Id<"players">[];
  lastMessageAt?: number;
  lastMessagePreview?: string;
  lastMessageByName?: string;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ConversationDetail = {
  _id: Id<"conversations">;
  type: "group" | "direct";
  name?: string;
  displayName: string;
  participantIds: Id<"players">[];
  participants: Array<{
    _id: Id<"players">;
    name: string;
    role: string;
  }>;
  createdAt: number;
  updatedAt: number;
};

export type ChatMe = {
  playerId: Id<"players">;
  role: string;
  name: string | null;
} | null;

// ============================================================================
// View Models
// ============================================================================

export interface ChatListViewModel {
  conversations: ConversationSummary[];
  me: ChatMe;
}

export interface ChatDetailViewModel {
  conversation: ConversationDetail | null;
  me: ChatMe;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for chat list page data.
 * Uses preloaded query for zero-flash hydration.
 * Also handles team chat seeding on first load.
 */
export function useChatListData(
  preloaded: Preloaded<typeof api.chat.bundle.getConversationsBundle>
): ChatListViewModel {
  const data = usePreloadedQuery(preloaded);
  const getOrCreateTeamChat = useMutation(
    api.chat.conversations.getOrCreateTeamChat
  );

  // Seed team chat on first load (same behavior as before)
  useEffect(() => {
    if (data.me?.playerId) {
      getOrCreateTeamChat();
    }
  }, [data.me?.playerId, getOrCreateTeamChat]);

  return {
    conversations: data.conversations,
    me: data.me,
  };
}

/**
 * Hook for chat detail page data.
 * Uses preloaded query for instant header rendering.
 */
export function useChatDetailData(
  preloaded: Preloaded<typeof api.chat.bundle.getConversationBundle>
): ChatDetailViewModel {
  const data = usePreloadedQuery(preloaded);

  return {
    conversation: data.conversation,
    me: data.me,
  };
}
