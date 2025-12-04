"use client";

import { useMemo } from "react";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Player, Me } from "@/features/games/types";

export interface RosterPageViewModel {
  players: Player[];
  activeRoster: Player[];
  otherPlayers: Player[];
  totalPlayers: number;
  spares: number;
  spectators: number;
  me: Me | null | undefined;
  isAdmin: boolean;
}

export function useRosterPageData(
  preloadedPlayers: Preloaded<typeof api.players.getPlayers>
): RosterPageViewModel {
  const players = usePreloadedQuery(preloadedPlayers) as Player[];
  const me = useQuery(api.me.get) as Me | null | undefined;
  const isAdmin = me?.role === "admin";

  const activeRoster = useMemo(
    () => players.filter((p) => p.role === "player"),
    [players]
  );

  const otherPlayers = useMemo(
    () => players.filter((p) => p.role !== "player"),
    [players]
  );

  const totalPlayers = activeRoster.length;
  const spares = players.filter((p) => p.role === "spare").length;
  const spectators = players.filter((p) => p.role === "spectator").length;

  return {
    players,
    activeRoster,
    otherPlayers,
    totalPlayers,
    spares,
    spectators,
    me,
    isAdmin: Boolean(isAdmin),
  };
}
