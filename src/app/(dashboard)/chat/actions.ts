"use server";

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Preloads chat list page data using the bundled query.
 * Returns a preloaded query that can be used with usePreloadedQuery for zero-flash hydration.
 */
export async function preloadConversationsList() {
  const token = await convexAuthNextjsToken();
  return preloadQuery(api.chat.bundle.getConversationsBundle, {}, { token });
}

/**
 * Preloads chat detail page data for a specific conversation.
 * Returns conversation metadata + user context for instant header rendering.
 * Messages are loaded client-side via paginated query for real-time updates.
 */
export async function preloadConversation(conversationId: Id<"conversations">) {
  const token = await convexAuthNextjsToken();
  return preloadQuery(
    api.chat.bundle.getConversationBundle,
    { conversationId },
    { token }
  );
}
