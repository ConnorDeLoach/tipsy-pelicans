import { defineTable } from "convex/server";
import { v } from "convex/values";
import { messageEmbedValidator } from "../oembed/model";

export const messagesTable = defineTable({
  createdBy: v.id("players"),
  body: v.string(),
  displayName: v.string(),
  role: v.string(),
  // Optional array of embedded media (Instagram/Facebook/Threads)
  embeds: v.optional(v.array(messageEmbedValidator)),
});

export const chatReadStatusTable = defineTable({
  userId: v.id("users"),
  readAt: v.number(),
}).index("by_user", ["userId"]);
