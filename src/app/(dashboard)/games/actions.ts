"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

export async function getGamesPageData() {
  const [games, players, opponents, me] = await Promise.all([
    convex.query(api.games.listGamesWithRsvps) as Promise<GameWithRsvps[]>,
    convex.query(api.players.getPlayers) as Promise<Player[]>,
    convex.query(api.opponents.listOpponents, { activeOnly: true }) as Promise<
      Opponent[]
    >,
    convex.query(api.me.get) as Promise<Me | null>,
  ]);

  return {
    games,
    players,
    opponents,
    me,
    now: Date.now(),
  };
}
