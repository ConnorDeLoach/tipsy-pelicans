"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { GameWithRsvps, Me } from "@/app/(dashboard)/games/actions";

type RsvpStatus = "in" | "out";

const PAST_CUTOFF_MS = 12 * 60 * 60 * 1000; // 12 hours

export function useGames() {
  // Season selection
  const [selectedSeasonId, setSelectedSeasonId] =
    useState<Id<"seasons"> | null>(null);

  // Time tracking for past/upcoming split
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Queries - all with explicit args for cache key consistency
  const games = useQuery(api.games.listGamesWithRsvps, {});
  const players = useQuery(api.players.getPlayers);
  const opponents = useQuery(api.opponents.listOpponents, { activeOnly: true });
  const me = useQuery(api.me.get);
  const seasons = useQuery(api.seasons.list, {});
  const currentSeason = useQuery(api.seasons.getCurrent);
  const seasonStats = useQuery(
    api.games.getSeasonStats,
    selectedSeasonId ? { seasonId: selectedSeasonId } : "skip"
  );

  // Set initial season
  useEffect(() => {
    if (currentSeason && !selectedSeasonId) {
      setSelectedSeasonId(currentSeason._id);
    }
  }, [currentSeason, selectedSeasonId]);

  // Mutations with optimistic updates
  const setRsvpMutation = useMutation(api.games.setRsvp);
  const createGameMutation = useMutation(api.games.createGame);
  const updateGameMutation = useMutation(api.games.updateGameDetails);
  const deleteGameMutation = useMutation(api.games.removeGame);

  // Filter by season
  const seasonFilteredGames = useMemo(() => {
    if (!games || !selectedSeasonId) return [];
    return games.filter(
      (entry) => (entry.game as any).seasonId === selectedSeasonId
    );
  }, [games, selectedSeasonId]);

  // Split into upcoming and past
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

  // Filter to active players only
  const activePlayers = useMemo(() => {
    if (!players) return [];
    return players.filter((p) => (p as any).role === "player");
  }, [players]);

  // RSVP handler with error handling
  const handleRsvp = useCallback(
    async (
      gameId: Id<"games">,
      playerId: Id<"players">,
      status: RsvpStatus
    ) => {
      const isAdmin = me?.role === "admin";
      if (!isAdmin && me?.playerId !== playerId) {
        toast.error("You can only update your own attendance.");
        return;
      }
      try {
        await setRsvpMutation({ gameId, playerId, status });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update attendance.";
        toast.error(message);
      }
    },
    [me, setRsvpMutation]
  );

  return {
    // Data
    games,
    upcomingGames,
    pastGames,
    players: activePlayers,
    allPlayers: players,
    opponents,
    me,
    seasons,
    currentSeason,
    seasonStats,
    selectedSeasonId,
    now,
    isAdmin: me?.role === "admin",
    isLoading: games === undefined,

    // Actions
    setSelectedSeasonId,
    handleRsvp,
    createGame: createGameMutation,
    updateGame: updateGameMutation,
    deleteGame: deleteGameMutation,
  };
}

// Helper to get RSVP status for a player in a game
export function getPlayerRsvpStatus(
  game: GameWithRsvps,
  playerId: Id<"players"> | undefined
): RsvpStatus | undefined {
  if (!playerId) return undefined;
  const rsvp = game.rsvps.find((r) => r.playerId === playerId);
  return (rsvp as any)?.status;
}

// Helper to get RSVP counts
export function getRsvpCounts(game: GameWithRsvps) {
  const inCount = game.rsvps.filter((r) => (r as any).status === "in").length;
  const outCount = game.rsvps.filter((r) => (r as any).status === "out").length;
  return { inCount, outCount };
}
