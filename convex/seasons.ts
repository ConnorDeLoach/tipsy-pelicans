import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Season date ranges:
// Winter: January 1 – April 30
// Summer: May 1 – August 31
// Fall: September 1 – December 31

export type SeasonType = "Winter" | "Summer" | "Fall";

/**
 * Determines which season type a given timestamp falls into.
 */
export function getSeasonTypeForDate(timestamp: number): SeasonType {
  const date = new Date(timestamp);
  const month = date.getMonth(); // 0-indexed (0 = January)

  if (month >= 0 && month <= 3) {
    // January (0) to April (3)
    return "Winter";
  } else if (month >= 4 && month <= 7) {
    // May (4) to August (7)
    return "Summer";
  } else {
    // September (8) to December (11)
    return "Fall";
  }
}

/**
 * Gets the year for a season based on a timestamp.
 * The year is based on when the season starts.
 */
export function getSeasonYear(timestamp: number): number {
  return new Date(timestamp).getFullYear();
}

/**
 * Generates the season name from type and year.
 */
export function getSeasonName(type: SeasonType, year: number): string {
  return `${type} ${year}`;
}

/**
 * Gets the start and end dates for a season.
 */
export function getSeasonDateRange(
  type: SeasonType,
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

// ============ Queries ============

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    if (activeOnly) {
      return await ctx.db
        .query("seasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }
    // Return all seasons ordered by start date (most recent first)
    return await ctx.db
      .query("seasons")
      .withIndex("by_start_date")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("seasons") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (active) return active;

    // If no active season, find the one containing current date
    const now = Date.now();
    const seasons = await ctx.db.query("seasons").collect();

    return seasons.find((s) => now >= s.startDate && now <= s.endDate) ?? null;
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const seasons = await ctx.db.query("seasons").collect();
    return seasons.find((s) => s.name === name) ?? null;
  },
});

// ============ Mutations ============

export const create = mutation({
  args: {
    type: v.union(v.literal("Winter"), v.literal("Summer"), v.literal("Fall")),
    year: v.number(),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { type, year, setActive }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    // Check if season already exists
    const existing = await ctx.db
      .query("seasons")
      .withIndex("by_year_type", (q) => q.eq("year", year).eq("type", type))
      .unique();

    if (existing) {
      throw new Error(`${type} ${year} season already exists`);
    }

    const name = getSeasonName(type, year);
    const { startDate, endDate } = getSeasonDateRange(type, year);

    // If setting as active, deactivate all other seasons first
    if (setActive) {
      const activeSeasons = await ctx.db
        .query("seasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      for (const season of activeSeasons) {
        await ctx.db.patch(season._id, { isActive: false });
      }
    }

    return await ctx.db.insert("seasons", {
      name,
      type,
      year,
      startDate,
      endDate,
      isActive: setActive ?? false,
      createdAt: Date.now(),
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("seasons") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const callerPlayer = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!callerPlayer || callerPlayer.isAdmin !== true)
      throw new Error("Not authorized");

    const season = await ctx.db.get(id);
    if (!season) throw new Error("Season not found");

    // Deactivate all other seasons
    const activeSeasons = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const s of activeSeasons) {
      if (s._id !== id) {
        await ctx.db.patch(s._id, { isActive: false });
      }
    }

    // Activate this season
    await ctx.db.patch(id, { isActive: true });
  },
});

// ============ Internal Mutations ============

/**
 * Ensures a season exists for the given timestamp.
 * If the season doesn't exist, creates it.
 * Returns the season ID.
 */
export const ensureSeasonForDate = internalMutation({
  args: { timestamp: v.number() },
  handler: async (ctx, { timestamp }): Promise<Id<"seasons">> => {
    const type = getSeasonTypeForDate(timestamp);
    const year = getSeasonYear(timestamp);

    // Check if season already exists
    const existing = await ctx.db
      .query("seasons")
      .withIndex("by_year_type", (q) => q.eq("year", year).eq("type", type))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create the season
    const name = getSeasonName(type, year);
    const { startDate, endDate } = getSeasonDateRange(type, year);

    return await ctx.db.insert("seasons", {
      name,
      type,
      year,
      startDate,
      endDate,
      isActive: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Finds or creates a season by name (e.g., "Fall 2025").
 * Used for migration from legacy string seasonId.
 */
export const findOrCreateByName = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }): Promise<Id<"seasons"> | null> => {
    // Parse the name (expected format: "Type Year" e.g., "Fall 2025")
    const match = name.match(/^(Winter|Summer|Fall)\s+(\d{4})$/);
    if (!match) {
      console.warn(`Invalid season name format: ${name}`);
      return null;
    }

    const type = match[1] as SeasonType;
    const year = parseInt(match[2], 10);

    // Check if season already exists
    const existing = await ctx.db
      .query("seasons")
      .withIndex("by_year_type", (q) => q.eq("year", year).eq("type", type))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create the season
    const { startDate, endDate } = getSeasonDateRange(type, year);

    return await ctx.db.insert("seasons", {
      name,
      type,
      year,
      startDate,
      endDate,
      isActive: false,
      createdAt: Date.now(),
    });
  },
});

// ============ Helper for mutations ============

/**
 * Helper function to get or create season for a game's start time.
 * Use this in createGame mutation.
 */
export async function getOrCreateSeasonForGame(
  ctx: MutationCtx,
  gameStartTime: number
): Promise<Id<"seasons">> {
  const type = getSeasonTypeForDate(gameStartTime);
  const year = getSeasonYear(gameStartTime);

  // Check if season already exists
  const existing = await ctx.db
    .query("seasons")
    .withIndex("by_year_type", (q) => q.eq("year", year).eq("type", type))
    .unique();

  if (existing) {
    return existing._id;
  }

  // Create the season
  const name = getSeasonName(type, year);
  const { startDate, endDate } = getSeasonDateRange(type, year);

  return await ctx.db.insert("seasons", {
    name,
    type,
    year,
    startDate,
    endDate,
    isActive: false,
    createdAt: Date.now(),
  });
}
