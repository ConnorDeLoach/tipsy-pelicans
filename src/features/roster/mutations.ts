"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useRosterMutations() {
  const addPlayer = useMutation(api.players.addPlayer).withOptimisticUpdate(
    (
      localStore,
      {
        name,
        email,
        position,
        number,
        flair,
        isAdmin,
        role,
      }: {
        name: string;
        email: string;
        position?: string;
        number?: number;
        flair?: string;
        isAdmin?: boolean;
        role?: string;
      }
    ) => {
      const list = localStore.getQuery(api.players.getPlayers);
      if (!list) return;
      const trimmedEmail = email.trim();
      const optimistic = {
        _id: "optimistic:new-player" as Id<"players">,
        _creationTime: Date.now(),
        name,
        email: trimmedEmail,
        emailLowercase: trimmedEmail.toLowerCase(),
        position,
        number,
        flair,
        role: role ?? "player",
        isAdmin: isAdmin ?? false,
        createdAt: Date.now(),
      } as any;
      const updated = [...list, optimistic].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      localStore.setQuery(api.players.getPlayers, {}, updated);
    }
  );

  const updatePlayer = useMutation(
    api.players.updatePlayer
  ).withOptimisticUpdate(
    (
      localStore,
      {
        playerId,
        email,
        ...fields
      }: { playerId: Id<"players">; email?: string }
    ) => {
      const list = localStore.getQuery(api.players.getPlayers);
      if (!list) return;
      const updated = list.map((p) => {
        if (p._id !== playerId) return p;
        const patch: any = { ...fields };
        if (email !== undefined) {
          const trimmed = email.trim();
          patch.email = trimmed;
          patch.emailLowercase = trimmed.toLowerCase();
        }
        return { ...p, ...patch };
      });
      updated.sort((a, b) => a.name.localeCompare(b.name));
      localStore.setQuery(api.players.getPlayers, {}, updated);
    }
  );

  const removePlayer = useMutation(
    api.players.removePlayer
  ).withOptimisticUpdate(
    (localStore, { playerId }: { playerId: Id<"players"> }) => {
      const list = localStore.getQuery(api.players.getPlayers);
      if (!list) return;
      localStore.setQuery(
        api.players.getPlayers,
        {},
        list.filter((p) => p._id !== playerId)
      );
    }
  );

  return {
    addPlayer,
    updatePlayer,
    removePlayer,
  };
}
