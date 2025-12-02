"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  useMutation,
  useQuery,
  usePreloadedQuery,
  Preloaded,
} from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Player, Opponent, Me, Season } from "./actions";
import { GamesView } from "@/components/games/games-view";
import { GameFormData } from "@/components/games/create-game-dialog";

type RsvpStatus = "in" | "out";

interface GamesClientProps {
  preloadedData: Preloaded<typeof api.games.getGamesPageBundle>;
}

export function GamesClient({ preloadedData }: GamesClientProps) {
  // Use preloaded query for zero-flash hydration - seamlessly transitions to live updates
  const bundleData = usePreloadedQuery(preloadedData);

  // Season selection state - default to current/active season
  const [selectedSeasonId, setSelectedSeasonId] =
    useState<Id<"seasons"> | null>(null);

  // Get stats for selected season (separate query since it depends on selection)
  const seasonStats = useQuery(
    api.games.getSeasonStats,
    selectedSeasonId ? { seasonId: selectedSeasonId } : "skip"
  );

  // Set initial selected season to current season when it loads
  useEffect(() => {
    if (bundleData.currentSeason && !selectedSeasonId) {
      setSelectedSeasonId(bundleData.currentSeason._id);
    }
  }, [bundleData.currentSeason, selectedSeasonId]);

  // Extract data from bundle
  const games = bundleData.games;
  const players = bundleData.players;
  const opponents = bundleData.opponents;
  const seasons = bundleData.seasons;
  const currentSeason = bundleData.currentSeason;

  // me.get is still needed for auth context - use separate query
  const me = useQuery(api.me.get);

  const updateGameDetails = useMutation(api.games.updateGameDetails);

  const setRsvp = useMutation(api.games.setRsvp).withOptimisticUpdate(
    (localStore, { gameId, playerId, status }) => {
      // Update the bundled query cache
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      const updatedGames = bundle.games.map((entry) => {
        if (entry.game._id !== gameId) return entry;
        const idx = entry.rsvps.findIndex((r) => r.playerId === playerId);
        let nextRsvps;
        if (idx >= 0) {
          const current = entry.rsvps[idx];
          if ((current as any).status === status) {
            // Toggle off - remove the RSVP
            nextRsvps = entry.rsvps
              .slice(0, idx)
              .concat(entry.rsvps.slice(idx + 1));
          } else {
            // Change status
            nextRsvps = entry.rsvps.slice();
            nextRsvps[idx] = {
              ...nextRsvps[idx],
              status,
              updatedAt: Date.now(),
            } as any;
          }
        } else {
          // New RSVP
          nextRsvps = [
            ...entry.rsvps,
            {
              _id: "optimistic:rsvp" as Id<"gameRsvps">,
              _creationTime: Date.now(),
              gameId,
              playerId,
              status,
              updatedAt: Date.now(),
            },
          ];
        }
        return { ...entry, rsvps: nextRsvps };
      });
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        { ...bundle, games: updatedGames }
      );
    }
  );

  const deleteGame = useMutation(api.games.removeGame).withOptimisticUpdate(
    (localStore, { gameId }) => {
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        {
          ...bundle,
          games: bundle.games.filter((entry) => entry.game._id !== gameId),
        }
      );
    }
  );

  const createGame = useMutation(api.games.createGame).withOptimisticUpdate(
    (localStore, args: any) => {
      const { opponent, opponentId, startTime, location, notes } = args as {
        opponent?: string;
        opponentId?: Id<"opponents">;
        startTime: number;
        location?: string;
        notes?: string;
      };
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      const opponentName =
        opponent ??
        bundle.opponents?.find((o) => o._id === opponentId)?.name ??
        "Opponent";
      const optimistic = {
        game: {
          _id: "optimistic:new-game" as Id<"games">,
          _creationTime: Date.now(),
          opponent: opponentName,
          startTime,
          location,
          notes,
          opponentId,
          createdAt: Date.now(),
        },
        rsvps: [],
      } as any;
      const updatedGames = [...bundle.games, optimistic].sort(
        (a, b) => a.game.startTime - b.game.startTime
      );
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        { ...bundle, games: updatedGames }
      );
    }
  );

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

  const [now, setNow] = useState(() => bundleData.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const PAST_CUTOFF_MS = 12 * 60 * 60 * 1000;

  const isAdmin = me?.role === "admin";

  // Filter games by selected season
  // When no season is selected, return empty array to avoid showing all games
  const seasonFilteredGames = useMemo(() => {
    if (!games) return [];
    if (!selectedSeasonId) return []; // Don't show games until a season is selected
    return games.filter(
      (entry) => (entry.game as any).seasonId === selectedSeasonId
    );
  }, [games, selectedSeasonId]);

  // Split games into upcoming and past based on current time
  const upcomingGames = useMemo(() => {
    return seasonFilteredGames
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS > now)
      .sort((a, b) => a.game.startTime - b.game.startTime);
  }, [seasonFilteredGames, now, PAST_CUTOFF_MS]);

  const pastGames = useMemo(() => {
    return seasonFilteredGames
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS <= now)
      .sort((a, b) => b.game.startTime - a.game.startTime);
  }, [seasonFilteredGames, now, PAST_CUTOFF_MS]);

  const handleRsvp = async (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => {
    if (!isAdmin && me?.playerId !== playerId) {
      toast.error("You can only update your own attendance.");
      return;
    }
    try {
      await setRsvp({ gameId, playerId, status });
    } catch (err: unknown) {
      const message =
        err instanceof Error && typeof err.message === "string"
          ? err.message
          : "Failed to update attendance.";
      toast.error(message);
    }
  };

  const handleCreateGame = async (data: GameFormData) => {
    if (!data.opponentId) {
      // Should be handled by dialog validation, but just in case
      return;
    }

    await createGame({
      opponentId: data.opponentId,
      startTime: data.startTime,
      location: data.location,
      notes: data.notes,
      visibility: data.visibility,
    });
    toast.success("Game scheduled");
  };

  const handleUpdateGame = async (gameId: Id<"games">, data: GameFormData) => {
    try {
      await updateGameDetails({
        gameId,
        opponentId: data.opponentId,
        startTime: data.startTime,
        location: data.location,
        notes: data.notes,
        visibility: data.visibility,
        teamScore: data.teamScore,
        opponentScore: data.opponentScore,
      });
      toast.success("Game updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update game.";
      toast.error(message);
    }
  };

  const handleDeleteGame = async (gameId: Id<"games">) => {
    try {
      await deleteGame({ gameId });
      toast.success("Game removed");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to remove game.";
      toast.error(message);
    }
  };

  return (
    <GamesView
      upcomingGames={upcomingGames}
      pastGames={pastGames}
      players={players}
      opponents={opponents}
      me={me ?? null}
      isAdmin={isAdmin}
      filteredPlayers={filteredPlayers}
      orderedPlayers={orderedPlayers}
      onRsvp={handleRsvp}
      onCreateGame={handleCreateGame}
      onUpdateGame={handleUpdateGame}
      onDeleteGame={handleDeleteGame}
      seasons={seasons as Season[] | undefined}
      selectedSeasonId={selectedSeasonId}
      onSeasonChange={setSelectedSeasonId}
      seasonStats={seasonStats}
    />
  );
}
