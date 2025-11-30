import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { productsTable } from "./merch/model";
import { messagesTable, chatReadStatusTable } from "./chat/model";

export default defineSchema({
  ...authTables,
  products: productsTable,
  opponents: defineTable({
    name: v.string(),
    nameLowercase: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name_lowercase", ["nameLowercase"])
    .index("by_active", ["isActive"]),
  seasons: defineTable({
    name: v.string(), // e.g., "Fall 2025"
    type: v.union(v.literal("Winter"), v.literal("Summer"), v.literal("Fall")),
    year: v.number(), // e.g., 2025
    startDate: v.number(), // Unix timestamp for season start
    endDate: v.number(), // Unix timestamp for season end
    isActive: v.boolean(), // Current season flag (only one active at a time)
    createdAt: v.number(),
  })
    .index("by_year_type", ["year", "type"])
    .index("by_active", ["isActive"])
    .index("by_start_date", ["startDate"]),
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
    role: v.union(
      v.literal("player"),
      v.literal("spare"),
      v.literal("spectator")
    ),
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
    opponentId: v.optional(v.id("opponents")),
    seasonId: v.optional(v.any()), // TEMPORARY - change to v.id("seasons") after running migrations
    status: v.union(v.literal("scheduled"), v.literal("final")),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    teamScore: v.optional(v.number()),
    opponentScore: v.optional(v.number()),
    outcome: v.optional(
      v.union(v.literal("win"), v.literal("loss"), v.literal("tie"))
    ),
    points: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_start_time", ["startTime"])
    .index("by_opponent", ["opponentId"])
    .index("by_visibility_start_time", ["visibility", "startTime"])
    .index("by_status_start_time", ["status", "startTime"])
    .index("by_season", ["seasonId"]),
  gameRsvps: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    status: v.union(v.literal("in"), v.literal("out")),
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
  messages: messagesTable,
  chatReadStatus: chatReadStatusTable,
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
