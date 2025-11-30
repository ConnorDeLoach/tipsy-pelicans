"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GameWithRsvps, Player, Opponent, Me } from "./actions";
import { GamesView } from "@/components/games/games-view";
import { GameFormData } from "@/components/games/create-game-dialog";

type RsvpStatus = "in" | "out";

interface GamesClientProps {
  initialData: {
    games: GameWithRsvps[];
    players: Player[];
    opponents: Opponent[];
    me: Me | null;
    now: number;
  };
}

export function GamesClient({ initialData }: GamesClientProps) {
  // Live queries for real-time updates
  const liveGames = useQuery(api.games.listGamesWithRsvps);
  const livePlayers = useQuery(api.players.getPlayers);
  const liveOpponents = useQuery(api.opponents.listOpponents, {
    activeOnly: true,
  });
  const liveMe = useQuery(api.me.get);

  // Use live data if available, otherwise fall back to server data
  const games = liveGames ?? initialData.games;
  const players = livePlayers ?? initialData.players;
  const opponents = liveOpponents ?? initialData.opponents;
  const me = liveMe ?? initialData.me;

  const updateGameDetails = useMutation(api.games.updateGameDetails);

  const setRsvp = useMutation(api.games.setRsvp).withOptimisticUpdate(
    (localStore, { gameId, playerId, status }) => {
      const list = localStore.getQuery(api.games.listGamesWithRsvps);
      if (!list) return;
      const updated = list.map((entry) => {
        if (entry.game._id !== gameId) return entry;
        const idx = entry.rsvps.findIndex((r) => r.playerId === playerId);
        let nextRsvps;
        if (idx >= 0) {
          const current = entry.rsvps[idx];
          if ((current as any).status === status) {
            nextRsvps = entry.rsvps
              .slice(0, idx)
              .concat(entry.rsvps.slice(idx + 1));
          } else {
            nextRsvps = entry.rsvps.slice();
            nextRsvps[idx] = {
              ...nextRsvps[idx],
              status,
              updatedAt: Date.now(),
            } as any;
          }
        } else {
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
      localStore.setQuery(api.games.listGamesWithRsvps, {}, updated);
    }
  );

  const deleteGame = useMutation(api.games.removeGame).withOptimisticUpdate(
    (localStore, { gameId }) => {
      const list = localStore.getQuery(api.games.listGamesWithRsvps);
      if (!list) return;
      localStore.setQuery(
        api.games.listGamesWithRsvps,
        {},
        list.filter((entry) => entry.game._id !== gameId)
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
      const list = localStore.getQuery(api.games.listGamesWithRsvps);
      if (!list) return;
      const opponentName =
        opponent ??
        opponents?.find((o) => o._id === opponentId)?.name ??
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
      const updated = [...list, optimistic].sort(
        (a, b) => a.game.startTime - b.game.startTime
      );
      localStore.setQuery(api.games.listGamesWithRsvps, {}, updated);
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

  const [now, setNow] = useState(() => initialData.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const PAST_CUTOFF_MS = 12 * 60 * 60 * 1000;

  const isAdmin = me?.role === "admin";

  const upcomingGames = useMemo(() => {
    if (!games) return [];
    return games
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS > now)
      .sort((a, b) => a.game.startTime - b.game.startTime);
  }, [games, now]);

  const pastGames = useMemo(() => {
    if (!games) return [];
    return games
      .filter((entry) => entry.game.startTime + PAST_CUTOFF_MS <= now)
      .sort((a, b) => b.game.startTime - a.game.startTime);
  }, [games, now]);

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
      me={me}
      isAdmin={isAdmin}
      filteredPlayers={filteredPlayers}
      orderedPlayers={orderedPlayers}
      onRsvp={handleRsvp}
      onCreateGame={handleCreateGame}
      onUpdateGame={handleUpdateGame}
      onDeleteGame={handleDeleteGame}
    />
  );
}
