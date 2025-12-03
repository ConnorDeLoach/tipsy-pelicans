import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Validate that a user (identified by session token) has access to a conversation.
 * This is used by the image HTTP endpoint to verify access before serving images.
 */
export const validateAccess = internalQuery({
  args: {
    token: v.string(),
    conversationId: v.id("conversations"),
  },
  returns: v.object({
    allowed: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { token, conversationId }) => {
    // Lookup the session by token
    // The token is the session ID stored in the authSessions table
    const session = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("_id"), token as any))
      .first();

    if (!session) {
      return { allowed: false, error: "Invalid session" };
    }

    // Check if session is expired
    if (session.expirationTime && session.expirationTime < Date.now()) {
      return { allowed: false, error: "Session expired" };
    }

    const userId = session.userId;
    if (!userId) {
      return { allowed: false, error: "No user in session" };
    }

    // Find the player linked to this user
    let player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!player) {
      // Try to find by email
      const user = await ctx.db.get(userId);
      const userEmail = user?.email;
      if (userEmail) {
        player = await ctx.db
          .query("players")
          .withIndex("by_email", (q) =>
            q.eq("emailLowercase", userEmail.toLowerCase())
          )
          .unique();
      }
    }

    if (!player) {
      return { allowed: false, error: "Player not found" };
    }

    // Check if player is a participant in the conversation
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      return { allowed: false, error: "Conversation not found" };
    }

    if (!conversation.participantIds.includes(player._id)) {
      return { allowed: false, error: "Not a participant" };
    }

    return { allowed: true };
  },
});
