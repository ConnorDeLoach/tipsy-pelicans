"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Preloaded } from "convex/react";
import { toast } from "sonner";
import { GamesView } from "@/components/games/games-view";
import { GameFormData } from "@/components/games/create-game-dialog";
import { useGamesPageData } from "@/features/games/queries";
import { useGamesMutations } from "@/features/games/mutations";

type RsvpStatus = "in" | "out";

interface GamesClientProps {
  preloadedData: Preloaded<typeof api.games.getGamesPageBundle>;
}

export function GamesClient({ preloadedData }: GamesClientProps) {
  const {
    players,
    opponents,
    me,
    isAdmin,
    filteredPlayers,
    orderedPlayers,
    upcomingGames,
    pastGames,
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    seasonStats,
  } = useGamesPageData(preloadedData);
  const { updateGameDetails, setRsvp, deleteGame, createGame } =
    useGamesMutations();

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
      seasons={seasons}
      selectedSeasonId={selectedSeasonId}
      onSeasonChange={setSelectedSeasonId}
      seasonStats={seasonStats}
    />
  );
}
