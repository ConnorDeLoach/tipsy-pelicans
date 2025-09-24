import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    name: v.string(),
    position: v.optional(v.string()),
    number: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),
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
});
