"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type RsvpStatus = "in" | "out";

type CreateGameArgs = {
  opponent?: string;
  opponentId?: Id<"opponents">;
  startTime: number;
  location?: string;
  notes?: string;
  visibility?: "public" | "private";
};

export function useGamesMutations() {
  const updateGameDetails = useMutation(api.games.updateGameDetails);

  const setRsvp = useMutation(api.games.setRsvp).withOptimisticUpdate(
    (
      localStore,
      {
        gameId,
        playerId,
        status,
      }: {
        gameId: Id<"games">;
        playerId: Id<"players">;
        status: RsvpStatus;
      }
    ) => {
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      const updatedGames = bundle.games.map((entry: any) => {
        if (entry.game._id !== gameId) return entry;
        const idx = entry.rsvps.findIndex((r: any) => r.playerId === playerId);
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
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        { ...bundle, games: updatedGames }
      );
    }
  );

  const deleteGame = useMutation(api.games.removeGame).withOptimisticUpdate(
    (localStore, { gameId }: { gameId: Id<"games"> }) => {
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        {
          ...bundle,
          games: bundle.games.filter((entry: any) => entry.game._id !== gameId),
        }
      );
    }
  );

  const createGame = useMutation(api.games.createGame).withOptimisticUpdate(
    (localStore, args: CreateGameArgs) => {
      const { opponent, opponentId, startTime, location, notes } = args;
      const bundle = localStore.getQuery(api.games.getGamesPageBundle, {});
      if (!bundle) return;
      const opponentName =
        opponent ??
        bundle.opponents?.find((o: any) => o._id === opponentId)?.name ??
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
        (a: any, b: any) => a.game.startTime - b.game.startTime
      );
      localStore.setQuery(
        api.games.getGamesPageBundle,
        {},
        { ...bundle, games: updatedGames }
      );
    }
  );

  return {
    updateGameDetails,
    setRsvp,
    deleteGame,
    createGame,
  };
}
