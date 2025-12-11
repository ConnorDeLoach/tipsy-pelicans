import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Temporary: Clear legacy string seasonId values so schema can be pushed.
 * Run this BEFORE pushing the new schema.
 *
 * Usage: npx convex run migrations:clearLegacySeasonIds
 */
export const clearLegacySeasonIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").collect();
    let cleared = 0;

    for (const game of games) {
      // Check if seasonId is a string (legacy) rather than an ID
      if (game.seasonId && typeof game.seasonId === "string") {
        await ctx.db.patch("games", game._id, { seasonId: undefined });
        cleared++;
      }
    }

    return { total: games.length, cleared };
  },
});

/**
 * Migration: Assign seasonId to games that don't have one.
 *
 * This migration:
 * 1. Creates "Fall 2025" season if it doesn't exist (and sets it active)
 * 2. Assigns all games without a seasonId to that season
 *
 * Run this once after deploying the schema changes.
 * Safe to run multiple times - it's idempotent.
 *
 * Usage: npx convex run migrations:migrateGameSeasons
 */
export const migrateGameSeasons = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find or create "Fall 2025" season
    let season = await ctx.db
      .query("seasons")
      .withIndex("by_year_type", (q) => q.eq("year", 2025).eq("type", "Fall"))
      .unique();

    if (!season) {
      const { startDate, endDate } = getSeasonDateRange("Fall", 2025);
      const seasonId = await ctx.db.insert("seasons", {
        name: "Fall 2025",
        type: "Fall",
        year: 2025,
        startDate,
        endDate,
        isActive: true,
        createdAt: Date.now(),
      });
      season = await ctx.db.get("seasons", seasonId);
    }

    if (!season) {
      throw new Error("Failed to create season");
    }

    // Assign all games without seasonId to Fall 2025
    const games = await ctx.db.query("games").collect();
    let migrated = 0;
    let skipped = 0;

    for (const game of games) {
      if (game.seasonId) {
        skipped++;
        continue;
      }

      await ctx.db.patch("games", game._id, { seasonId: season._id });
      migrated++;
    }

    return {
      total: games.length,
      migrated,
      skipped,
      seasonCreated: season.name,
    };
  },
});

/**
 * Helper to get season date ranges - duplicated from seasons.ts to avoid
 * circular dependency issues with internal functions.
 */
function getSeasonDateRange(
  type: "Winter" | "Summer" | "Fall",
  year: number
): { startDate: number; endDate: number } {
  let startMonth: number;
  let endMonth: number;
  let endDay: number;

  switch (type) {
    case "Winter":
      startMonth = 0; // January
      endMonth = 3; // April
      endDay = 30;
      break;
    case "Summer":
      startMonth = 4; // May
      endMonth = 7; // August
      endDay = 31;
      break;
    case "Fall":
      startMonth = 8; // September
      endMonth = 11; // December
      endDay = 31;
      break;
  }

  const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0).getTime();
  const endDate = new Date(year, endMonth, endDay, 23, 59, 59, 999).getTime();

  return { startDate, endDate };
}

/**
 * Sets a specific season as active.
 * Use after migration to set the current season (e.g., Fall 2025) as active.
 */
export const setSeasonActive = mutation({
  args: { seasonName: v.string() },
  handler: async (ctx, { seasonName }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized - admin only");

    // Find the season by name
    const seasons = await ctx.db.query("seasons").collect();
    const season = seasons.find((s) => s.name === seasonName);

    if (!season) {
      throw new Error(`Season "${seasonName}" not found`);
    }

    // Deactivate all other seasons
    const activeSeasons = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const s of activeSeasons) {
      if (s._id !== season._id) {
        await ctx.db.patch("seasons", s._id, { isActive: false });
      }
    }

    // Activate this season
    await ctx.db.patch("seasons", season._id, { isActive: true });

    return { success: true, season: season.name };
  },
});
