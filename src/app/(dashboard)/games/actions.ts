"use server";

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export type GameWithRsvps = {
  game: {
    _id: Id<"games">;
    _creationTime: number;
    opponent: string;
    startTime: number;
    location?: string;
    notes?: string;
    opponentId?: Id<"opponents">;
    createdAt: number;
    teamScore?: number;
    opponentScore?: number;
    outcome?: "win" | "loss" | "tie";
    visibility?: "public" | "private";
  };
  rsvps: {
    _id: Id<"gameRsvps">;
    _creationTime: number;
    gameId: Id<"games">;
    playerId: Id<"players">;
    status: "in" | "out";
    updatedAt: number;
  }[];
};

export type Player = {
  _id: Id<"players">;
  _creationTime: number;
  name: string;
  email: string;
  emailLowercase?: string;
  role: "player" | "spare" | "spectator";
  isAdmin: boolean;
  number?: number;
  position?: string;
  flair?: string;
  userId?: Id<"users">;
};

export type Opponent = {
  _id: Id<"opponents">;
  _creationTime: number;
  name: string;
  nameLowercase: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Me = {
  userId: Id<"users">;
  playerId?: Id<"players">;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "player";
};

export type Season = {
  _id: Id<"seasons">;
  _creationTime: number;
  name: string;
  type: "Winter" | "Summer" | "Fall";
  year: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
  createdAt: number;
};

export type SeasonStats = {
  gamesPlayed: number;
  totalGames: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  record: string;
};

/**
 * Preloads all games page data using the bundled query.
 * Returns a preloaded query that can be used with usePreloadedQuery for zero-flash hydration.
 */
export async function preloadGamesPageData() {
  const token = await convexAuthNextjsToken();
  return preloadQuery(api.games.getGamesPageBundle, {}, { token });
}
