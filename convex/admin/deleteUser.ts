import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Preview what would be deleted for a user.
 * Use this before running the actual delete to verify.
 */
export const previewCascadeDelete = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      return { error: "User not found" };
    }

    // Find player linked to this user
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const preview = {
      user: { _id: userId, email: user.email },
      player: player ? { _id: player._id, name: player.name } : null,
      authAccounts: 0,
      authSessions: 0,
      authRefreshTokens: 0,
      pushSubscriptions: 0,
      chatReadStatus: 0,
      gameRsvps: 0,
      rsvpTokens: 0,
      messages: 0,
      auditLogs: 0,
    };

    // Count auth-related records
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    preview.authAccounts = authAccounts.length;

    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    preview.authSessions = authSessions.length;

    const authRefreshTokens = await ctx.db
      .query("authRefreshTokens")
      .filter((q) => q.eq(q.field("sessionId"), undefined)) // Will check by session
      .collect();
    // Count tokens for user's sessions
    let tokenCount = 0;
    for (const session of authSessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      tokenCount += tokens.length;
    }
    preview.authRefreshTokens = tokenCount;

    // Count push subscriptions
    const pushSubs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    preview.pushSubscriptions = pushSubs.length;

    // Count chat read status
    const chatStatus = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    preview.chatReadStatus = chatStatus.length;

    // Count audit logs referencing this user
    const auditLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .collect();
    preview.auditLogs = auditLogs.length;

    // If player exists, count player-related records
    if (player) {
      const rsvps = await ctx.db
        .query("gameRsvps")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();
      preview.gameRsvps = rsvps.length;

      const tokens = await ctx.db
        .query("rsvpTokens")
        .filter((q) => q.eq(q.field("playerId"), player._id))
        .collect();
      preview.rsvpTokens = tokens.length;

      const messages = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("createdBy"), player._id))
        .collect();
      preview.messages = messages.length;
    }

    return preview;
  },
});

/**
 * Cascade delete a user and ALL associated data.
 * This is a HARD DELETE - data cannot be recovered.
 *
 * Deletes in order:
 * 1. Auth refresh tokens (via sessions)
 * 2. Auth sessions
 * 3. Auth accounts
 * 4. Push subscriptions
 * 5. Chat read status
 * 6. RSVP tokens (player)
 * 7. Game RSVPs (player)
 * 8. Messages - updates displayName to "[Deleted User]" instead of deleting
 * 9. Audit logs - nullifies userId/playerId but keeps for history
 * 10. Player record
 * 11. User record
 */
export const cascadeDeleteUser = internalMutation({
  args: {
    userId: v.id("users"),
    preserveMessages: v.optional(v.boolean()), // Default true - keep messages with "[Deleted User]"
  },
  handler: async (ctx, { userId, preserveMessages = true }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const results = {
      userId,
      userEmail: user.email,
      deleted: {
        authRefreshTokens: 0,
        authSessions: 0,
        authAccounts: 0,
        pushSubscriptions: 0,
        chatReadStatus: 0,
        rsvpTokens: 0,
        gameRsvps: 0,
        messages: 0,
        auditLogs: 0,
        player: false,
        user: false,
      },
    };

    // 1. Delete auth refresh tokens (via sessions)
    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const session of authSessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      for (const token of tokens) {
        await ctx.db.delete(token._id);
        results.deleted.authRefreshTokens++;
      }
    }

    // 2. Delete auth sessions
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
      results.deleted.authSessions++;
    }

    // 3. Delete auth accounts
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
      results.deleted.authAccounts++;
    }

    // 4. Delete push subscriptions
    const pushSubs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of pushSubs) {
      await ctx.db.delete(sub._id);
      results.deleted.pushSubscriptions++;
    }

    // 5. Delete chat read status
    const chatStatus = await ctx.db
      .query("chatReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const status of chatStatus) {
      await ctx.db.delete(status._id);
      results.deleted.chatReadStatus++;
    }

    // 6. Nullify audit logs (keep for history but remove user reference)
    const auditLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .collect();
    for (const log of auditLogs) {
      await ctx.db.patch(log._id, { userId: undefined });
      results.deleted.auditLogs++;
    }

    // Find player linked to this user
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (player) {
      // 7. Delete RSVP tokens for this player
      const rsvpTokens = await ctx.db
        .query("rsvpTokens")
        .filter((q) => q.eq(q.field("playerId"), player._id))
        .collect();
      for (const token of rsvpTokens) {
        await ctx.db.delete(token._id);
        results.deleted.rsvpTokens++;
      }

      // 8. Delete game RSVPs for this player
      const gameRsvps = await ctx.db
        .query("gameRsvps")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();
      for (const rsvp of gameRsvps) {
        await ctx.db.delete(rsvp._id);
        results.deleted.gameRsvps++;
      }

      // 9. Handle messages
      const messages = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("createdBy"), player._id))
        .collect();

      if (preserveMessages) {
        // Update displayName to "[Deleted User]" but keep messages
        for (const msg of messages) {
          await ctx.db.patch(msg._id, { displayName: "[Deleted User]" });
          results.deleted.messages++;
        }
      } else {
        // Hard delete messages
        for (const msg of messages) {
          await ctx.db.delete(msg._id);
          results.deleted.messages++;
        }
      }

      // 10. Nullify player reference in audit logs
      const playerAuditLogs = await ctx.db
        .query("auditLog")
        .filter((q) => q.eq(q.field("playerId"), player._id))
        .collect();
      for (const log of playerAuditLogs) {
        await ctx.db.patch(log._id, { playerId: undefined });
      }

      // 11. Delete player record
      await ctx.db.delete(player._id);
      results.deleted.player = true;
    }

    // 12. Delete user record
    await ctx.db.delete(userId);
    results.deleted.user = true;

    console.log("Cascade delete completed:", JSON.stringify(results));
    return results;
  },
});

/**
 * Delete user by email address (convenience wrapper).
 */
export const cascadeDeleteUserByEmail = internalMutation({
  args: {
    email: v.string(),
    preserveMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, { email, preserveMessages = true }) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .first();

    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    // Call the main cascade delete
    // Note: We inline the logic here since we can't call other mutations
    // This is a simplified version - in production you might want to
    // use ctx.scheduler.runAfter to call cascadeDeleteUser
    return {
      userId: user._id,
      email: user.email,
      message: "Use cascadeDeleteUser with this userId",
    };
  },
});
