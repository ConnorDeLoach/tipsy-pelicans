"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useMemo, useState } from "react";

type PlayerFormState = {
  name: string;
  position: string;
  number: string;
  notes: string;
};

type GameFormState = {
  opponent: string;
  startTime: string;
  location: string;
  notes: string;
};

type RsvpStatus = "yes" | "no" | "maybe";

export default function Home() {
  const players = useQuery(api.players.getPlayers);
  const games = useQuery(api.games.listGamesWithRsvps);
  const addPlayer = useMutation(api.players.addPlayer);
  const updatePlayer = useMutation(api.players.updatePlayer);
  const removePlayer = useMutation(api.players.removePlayer);
  const createGame = useMutation(api.games.createGame);
  const deleteGame = useMutation(api.games.removeGame);
  const setRsvp = useMutation(api.games.setRsvp);

  const [playerForm, setPlayerForm] = useState<PlayerFormState>({
    name: "",
    position: "",
    number: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<Id<"players"> | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>({
    opponent: "",
    startTime: "",
    location: "",
    notes: "",
  });

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }),
    [],
  );

  const resetPlayerForm = () => {
    setPlayerForm({ name: "", position: "", number: "", notes: "" });
    setEditingId(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!playerForm.name.trim()) {
      alert("Please enter a player name.");
      return;
    }

    const payload = {
      name: playerForm.name.trim(),
      position: playerForm.position.trim() || undefined,
      number: playerForm.number ? Number(playerForm.number) : undefined,
      notes: playerForm.notes.trim() || undefined,
    };

    if (editingId) {
      await updatePlayer({ playerId: editingId, ...payload });
    } else {
      await addPlayer(payload);
    }

    resetPlayerForm();
  };

  const onEdit = (player: NonNullable<typeof players>[number]) => {
    setEditingId(player._id);
    setPlayerForm({
      name: player.name,
      position: player.position ?? "",
      number: player.number?.toString() ?? "",
      notes: player.notes ?? "",
    });
  };

  const onDelete = async (playerId: Id<"players">) => {
    if (confirm("Remove this player?")) {
      await removePlayer({ playerId });
      if (editingId === playerId) {
        resetPlayerForm();
      }
    }
  };

  const resetGameForm = () => {
    setGameForm({ opponent: "", startTime: "", location: "", notes: "" });
  };

  const onCreateGame = async (event: FormEvent) => {
    event.preventDefault();

    if (!gameForm.opponent.trim()) {
      alert("Please enter an opponent.");
      return;
    }

    const startTimeMs = Date.parse(gameForm.startTime);

    if (Number.isNaN(startTimeMs)) {
      alert("Please choose a start time.");
      return;
    }

    await createGame({
      opponent: gameForm.opponent.trim(),
      startTime: startTimeMs,
      location: gameForm.location.trim() || undefined,
      notes: gameForm.notes.trim() || undefined,
    });

    resetGameForm();
  };

  const onRemoveGame = async (gameId: Id<"games">) => {
    if (confirm("Remove this game? All RSVPs will be deleted.")) {
      await deleteGame({ gameId });
    }
  };

  const handleRsvp = async (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus,
  ) => {
    await setRsvp({ gameId, playerId, status });
  };

  type GameWithRsvps = NonNullable<typeof games>[number];

  const getRsvpStatus = (game: GameWithRsvps, playerId: Id<"players">): RsvpStatus | undefined => {
    return game.rsvps.find((rsvp) => rsvp.playerId === playerId)?.status;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Hockey Roster</h1>
          <p className="text-slate-300">
            Manage your team&apos;s players and availability using Convex-backed data.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[2fr_3fr]">
          <form onSubmit={onSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow">
            <h2 className="text-xl font-medium">
              {editingId ? "Edit player" : "Add a new player"}
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span>Name</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={playerForm.name}
                  onChange={(event) =>
                    setPlayerForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Position</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={playerForm.position}
                  onChange={(event) =>
                    setPlayerForm((prev) => ({ ...prev, position: event.target.value }))
                  }
                  placeholder="Forward, defense, goalie..."
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Jersey number</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={playerForm.number}
                  onChange={(event) =>
                    setPlayerForm((prev) => ({ ...prev, number: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Notes</span>
                <textarea
                  className="min-h-[100px] rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={playerForm.notes}
                  onChange={(event) =>
                    setPlayerForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Injuries, preferred shift, etc."
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
              >
                {editingId ? "Save changes" : "Add player"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetPlayerForm}
                  className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section className="space-y-4">
            <h2 className="text-xl font-medium">Current roster</h2>
            {!players && <p className="text-slate-400">Loading roster…</p>}
            {players && players.length === 0 && (
              <p className="text-slate-400">No players yet. Add your first player with the form.</p>
            )}
            <ul className="space-y-3">
              {players?.map((player) => (
                <li
                  key={player._id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">
                        {player.name}
                        {player.number !== undefined && (
                          <span className="ml-2 text-sm text-slate-400">#{player.number}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {player.position ? player.position : "No position set"}
                      </div>
                      {player.notes && (
                        <p className="mt-2 text-sm text-slate-300">{player.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(player)}
                        className="rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(player._id)}
                        className="rounded border border-rose-500 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <section className="grid gap-8 lg:grid-cols-[2fr_3fr]">
          <form onSubmit={onCreateGame} className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow">
            <h2 className="text-xl font-medium">Schedule a game</h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span>Opponent</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={gameForm.opponent}
                  onChange={(event) =>
                    setGameForm((prev) => ({ ...prev, opponent: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Start time</span>
                <input
                  type="datetime-local"
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={gameForm.startTime}
                  onChange={(event) =>
                    setGameForm((prev) => ({ ...prev, startTime: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Location</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={gameForm.location}
                  onChange={(event) =>
                    setGameForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Notes</span>
                <textarea
                  className="min-h-[100px] rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  value={gameForm.notes}
                  onChange={(event) =>
                    setGameForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Parking, special jerseys, etc."
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Add game
              </button>
              <button
                type="button"
                onClick={resetGameForm}
                className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </form>

          <section className="space-y-4">
            <h2 className="text-xl font-medium">Upcoming games</h2>
            {!games && <p className="text-slate-400">Loading games…</p>}
            {games && games.length === 0 && (
              <p className="text-slate-400">No games scheduled. Add your first matchup.</p>
            )}
            <ul className="space-y-4">
              {games?.map((entry) => {
                const yesCount = entry.rsvps.filter((rsvp) => rsvp.status === "yes").length;
                const noCount = entry.rsvps.filter((rsvp) => rsvp.status === "no").length;
                const maybeCount = entry.rsvps.filter((rsvp) => rsvp.status === "maybe").length;
                return (
                  <li
                    key={entry.game._id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">vs. {entry.game.opponent}</h3>
                        <p className="text-sm text-slate-300">
                          {dateFormatter.format(new Date(entry.game.startTime))}
                        </p>
                        {entry.game.location && (
                          <p className="text-sm text-slate-400">{entry.game.location}</p>
                        )}
                        {entry.game.notes && (
                          <p className="mt-2 text-sm text-slate-300">{entry.game.notes}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-emerald-400/40 px-3 py-1">
                            Yes: {yesCount}
                          </span>
                          <span className="rounded-full border border-amber-400/40 px-3 py-1">
                            Maybe: {maybeCount}
                          </span>
                          <span className="rounded-full border border-rose-400/40 px-3 py-1">
                            No: {noCount}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveGame(entry.game._id)}
                        className="self-end rounded border border-rose-500 px-3 py-1 text-sm font-medium text-rose-400 hover:bg-rose-500/20"
                      >
                        Remove game
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Player availability
                      </h4>
                      {!players && (
                        <p className="text-sm text-slate-400">Loading players…</p>
                      )}
                      {players && players.length === 0 && (
                        <p className="text-sm text-slate-400">
                          Add players to start collecting RSVPs.
                        </p>
                      )}
                      <ul className="space-y-2">
                        {players?.map((player) => {
                          const status = getRsvpStatus(entry, player._id);
                          const buildButtonClasses = (target: RsvpStatus) =>
                            `rounded border px-3 py-1 text-xs font-medium transition ${
                              status === target
                                ? target === "yes"
                                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-200"
                                  : target === "maybe"
                                    ? "border-amber-400 bg-amber-400/20 text-amber-200"
                                    : "border-rose-400 bg-rose-400/20 text-rose-200"
                                : "border-slate-700 text-slate-200 hover:bg-slate-800"
                            }`;
                          return (
                            <li
                              key={player._id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-100">{player.name}</p>
                                <p className="text-xs text-slate-400">
                                  {player.position ?? "Position TBD"}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className={buildButtonClasses("yes")}
                                  onClick={() => handleRsvp(entry.game._id, player._id, "yes")}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  className={buildButtonClasses("maybe")}
                                  onClick={() => handleRsvp(entry.game._id, player._id, "maybe")}
                                >
                                  Maybe
                                </button>
                                <button
                                  type="button"
                                  className={buildButtonClasses("no")}
                                  onClick={() => handleRsvp(entry.game._id, player._id, "no")}
                                >
                                  No
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}
