import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  players: defineTable({
    name: v.string(),
    email: v.string(),
    emailLowercase: v.string(),
    userId: v.optional(v.id("users")),
    position: v.optional(
      v.union(
        v.literal("RW"),
        v.literal("C"),
        v.literal("LW"),
        v.literal("LD"),
        v.literal("RD"),
        v.literal("G")
      )
    ),
    number: v.optional(v.number()),
    flair: v.optional(v.string()),
    isAdmin: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_email", ["emailLowercase"])
    .index("by_user", ["userId"]),
  games: defineTable({
    opponent: v.string(),
    startTime: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_start_time", ["startTime"]),
  gameRsvps: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    status: v.union(v.literal("yes"), v.literal("no"), v.literal("maybe")),
    updatedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_game_player", ["gameId", "playerId"]),
  rsvpTokens: defineTable({
    token: v.string(),
    playerId: v.id("players"),
    gameId: v.id("games"),
    choice: v.union(v.literal("in"), v.literal("out")),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  }).index("by_token", ["token"]),
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
    ua: v.optional(v.string()),
    platform: v.optional(
      v.union(
        v.literal("ios"),
        v.literal("android"),
        v.literal("desktop"),
        v.literal("unknown")
      )
    ),
    authVersion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSendAt: v.optional(v.number()),
    errorCount: v.number(),
    lastStatus: v.optional(
      v.union(v.literal("ok"), v.literal("gone"), v.literal("error"))
    ),
  })
    .index("byUser", ["userId"])
    .index("byEndpoint", ["endpoint"])
    .index("byStatus", ["lastStatus"]),
});
