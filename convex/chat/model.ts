import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messagesTable = defineTable({
  createdBy: v.id("players"),
  body: v.string(),
  displayName: v.string(),
  role: v.string(),
});

export const chatReadStatusTable = defineTable({
  userId: v.id("users"),
  readAt: v.number(),
}).index("by_user", ["userId"]);
