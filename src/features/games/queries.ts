"use client";

import { useEffect, useMemo, useState } from "react";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type {
  GameWithRsvps,
  Player,
  Opponent,
  Me,
  Season,
  SeasonStats,
} from "./types";
import { useNow } from "@/hooks/use-now";

const PAST_CUTOFF_MS = 12 * 60 * 60 * 1000;

export interface GamesPageViewModel {
  games: GameWithRsvps[] | undefined;
  players: Player[] | undefined;
  opponents: Opponent[] | undefined;
  seasons: Season[] | undefined;
  currentSeason: Season | null;
  me: Me | null | undefined;
  isAdmin: boolean;
  filteredPlayers?: Player[];
  orderedPlayers?: Player[];
  selectedSeasonId: Id<"seasons"> | null;
  setSelectedSeasonId: (id: Id<"seasons"> | null) => void;
  seasonStats?: SeasonStats;
  now: number;
  upcomingGames: GameWithRsvps[];
  pastGames: GameWithRsvps[];
}

export function useSeasonSelection(params: {
  games: GameWithRsvps[] | undefined;
  currentSeason: Season | null;
  initialNow: number;
}): {
  selectedSeasonId: Id<"seasons"> | null;
  setSelectedSeasonId: (id: Id<"seasons"> | null) => void;
  seasonStats?: SeasonStats;
  now: number;
  upcomingGames: GameWithRsvps[];
  pastGames: GameWithRsvps[];
} {
  const { games, currentSeason, initialNow } = params;

  const [selectedSeasonId, setSelectedSeasonId] =
    useState<Id<"seasons"> | null>(null);

  useEffect(() => {
    if (currentSeason && !selectedSeasonId) {
      setSelectedSeasonId(currentSeason._id);
    }
  }, [currentSeason, selectedSeasonId]);

  const now = useNow({ initial: initialNow, intervalMs: 60_000 });

  const seasonFilteredGames = useMemo(() => {
    if (!games) return [];
    if (!selectedSeasonId) return [];
    return games.filter(
      (entry) => (entry.game as any).seasonId === selectedSeasonId
    );
  }, [games, selectedSeasonId]);

  const upcomingGames = useMemo(() => {
    return seasonFilteredGames
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS > now)
      .sort((a, b) => a.game.startTime - b.game.startTime);
  }, [seasonFilteredGames, now]);

  const pastGames = useMemo(() => {
    return seasonFilteredGames
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS <= now)
      .sort((a, b) => b.game.startTime - a.game.startTime);
  }, [seasonFilteredGames, now]);

  const seasonStats = useQuery(
    api.games.getSeasonStats,
    selectedSeasonId ? { seasonId: selectedSeasonId } : "skip"
  );

  return {
    selectedSeasonId,
    setSelectedSeasonId,
    seasonStats: seasonStats ?? undefined,
    now,
    upcomingGames,
    pastGames,
  };
}

export function useGamesPageData(
  preloaded: Preloaded<typeof api.games.getGamesPageBundle>
): GamesPageViewModel {
  const bundleData = usePreloadedQuery(preloaded);

  const games = bundleData.games as GameWithRsvps[] | undefined;
  const players = bundleData.players as Player[] | undefined;
  const opponents = bundleData.opponents as Opponent[] | undefined;
  const seasons = bundleData.seasons as Season[] | undefined;
  const currentSeason = (bundleData.currentSeason ?? null) as Season | null;

  const me = useQuery(api.me.get) as Me | null | undefined;
  const isAdmin = me?.role === "admin";

  const filteredPlayers = useMemo(() => {
    if (!players) return undefined;
    return players.filter((p) => (p as any).role === "player");
  }, [players]);

  const orderedPlayers = useMemo(() => {
    if (!filteredPlayers) return undefined;
    const meId = me?.playerId;
    if (!meId) return filteredPlayers;
    const arr = [...filteredPlayers];
    arr.sort((a, b) => {
      if (a._id === meId) return -1;
      if (b._id === meId) return 1;
      return 0;
    });
    return arr;
  }, [filteredPlayers, me?.playerId]);

  const {
    selectedSeasonId,
    setSelectedSeasonId,
    seasonStats,
    now,
    upcomingGames,
    pastGames,
  } = useSeasonSelection({
    games,
    currentSeason,
    initialNow: bundleData.now as number,
  });

  return {
    games,
    players,
    opponents,
    seasons,
    currentSeason,
    me,
    isAdmin: Boolean(isAdmin),
    filteredPlayers,
    orderedPlayers,
    selectedSeasonId,
    setSelectedSeasonId,
    seasonStats,
    now,
    upcomingGames,
    pastGames,
  };
}
