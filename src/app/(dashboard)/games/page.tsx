"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EnablePushButton } from "@/components/EnablePushButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RsvpStatus = "in" | "out";

function ScorePill({ game }: { game: any }) {
  const ts = (game as any).teamScore;
  const os = (game as any).opponentScore;
  const hasScores = typeof ts === "number" && typeof os === "number";
  if (!hasScores) return null;
  const outcome = (game as any).outcome as "win" | "loss" | "tie" | undefined;
  // Map to available Badge variants: default | secondary | destructive | outline
  let variant: "default" | "secondary" | "outline" = "secondary";
  if (outcome === "win") variant = "default";
  else if (outcome === "loss") variant = "outline";
  const baseClass = "px-3 py-1 text-sm font-semibold";
  const lossAccentClass = outcome === "loss" ? " bg-accent text-accent-foreground border-transparent" : "";
  return (
    <Badge variant={variant} className={baseClass + lossAccentClass}>
      {ts}-{os}
    </Badge>
  );
}

export default function Page() {
  const players = useQuery(api.players.getPlayers);
  const games = useQuery(api.games.listGamesWithRsvps);
  const opponents = useQuery(api.opponents.listOpponents, { activeOnly: true });
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
            nextRsvps = entry.rsvps.slice(0, idx).concat(entry.rsvps.slice(idx + 1));
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
  const me = useQuery(api.me.get);

  const orderedPlayers = useMemo(() => {
    if (!players) return undefined;
    const meId = me?.playerId;
    if (!meId) return players;
    const arr = [...players];
    arr.sort((a, b) => {
      if (a._id === meId) return -1;
      if (b._id === meId) return 1;
      return 0;
    });
    return arr;
  }, [players, me?.playerId]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const PAST_CUTOFF_MS = 12 * 60 * 60 * 1000;

  const isAdmin = me?.role === "admin";
  const [selectedOpponentId, setSelectedOpponentId] = useState<Id<"opponents"> | "">("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<Id<"games"> | null>(null);
  const [editOpponentId, setEditOpponentId] = useState<Id<"opponents"> | "">("");
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTeamScore, setEditTeamScore] = useState<string>("");
  const [editOpponentScore, setEditOpponentScore] = useState<string>("");

  const openEdit = (entry: GameWithRsvps) => {
    setEditingGameId(entry.game._id);
    setEditOpponentId((entry.game as any).opponentId ?? "");
    const dt = new Date(entry.game.startTime);
    setEditDate(dt);
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    setEditTime(`${hh}:${mm}`);
    setEditLocation(entry.game.location ?? "");
    setEditNotes(entry.game.notes ?? "");
    setEditTeamScore(
      typeof (entry.game as any).teamScore === "number"
        ? String((entry.game as any).teamScore)
        : ""
    );
    setEditOpponentScore(
      typeof (entry.game as any).opponentScore === "number"
        ? String((entry.game as any).opponentScore)
        : ""
    );
    setIsEditOpen(true);
  };

  const resetEdit = () => {
    setIsEditOpen(false);
    setEditingGameId(null);
    setEditOpponentId("");
    setEditDate(undefined);
    setEditTime("");
    setEditLocation("");
    setEditNotes("");
    setEditTeamScore("");
    setEditOpponentScore("");
  };

  const onSaveEdit = async () => {
    if (!editingGameId) return;
    if (!editDate) {
      toast.error("Please pick a date.");
      return;
    }
    if (!editTime) {
      toast.error("Please choose a time.");
      return;
    }
    const [hh, mm] = editTime.split(":");
    const when = new Date(editDate);
    when.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    const startTime = when.getTime();

    const teamScoreNum = editTeamScore === "" ? undefined : Math.max(0, Math.floor(Number(editTeamScore)));
    const opponentScoreNum =
      editOpponentScore === "" ? undefined : Math.max(0, Math.floor(Number(editOpponentScore)));

    try {
      await updateGameDetails({
        gameId: editingGameId,
        opponentId: editOpponentId ? (editOpponentId as Id<"opponents">) : undefined,
        startTime,
        location: editLocation.trim(),
        notes: editNotes.trim(),
        teamScore: teamScoreNum,
        opponentScore: opponentScoreNum,
      });
      toast.success("Game updated");
      resetEdit();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update game.";
      toast.error(message);
    }
  };

  const resetForm = () => {
    setSelectedOpponentId("");
    setSelectedDate(undefined);
    setTime("");
    setLocation("");
    setNotes("");
  };

  const onCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpponentId) {
      toast.error("Please select an opponent.");
      return;
    }
    if (!selectedDate) {
      toast.error("Please pick a date.");
      return;
    }
    if (!time) {
      toast.error("Please choose a time.");
      return;
    }
    const [hh, mm] = time.split(":");
    const dt = new Date(selectedDate);
    dt.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    const startTime = dt.getTime();
    await createGame({
      opponentId: selectedOpponentId as Id<"opponents">,
      startTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    toast.success("Game scheduled");
    resetForm();
    setIsDialogOpen(false);
  };

  type GameWithRsvps = NonNullable<typeof games>[number];

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

  const hasLoadedGames = games !== undefined;

  const firstUpcomingGame = upcomingGames[0];
  const otherUpcomingGames = upcomingGames.slice(1);

  const getRsvpStatus = (
    game: GameWithRsvps,
    playerId: Id<"players">
  ): RsvpStatus | undefined => {
    return game.rsvps.find((rsvp) => rsvp.playerId === playerId)?.status as RsvpStatus | undefined;
  };

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

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Games view"
          className="inline-flex items-center self-start rounded-lg border border-border bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "upcoming"}
            onClick={() => setTab("upcoming")}
            className={`px-3 py-1 text-sm rounded-md ${tab === "upcoming" ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Upcoming
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "past"}
            onClick={() => setTab("past")}
            className={`px-3 py-1 text-sm rounded-md ${tab === "past" ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Past
          </button>
        </div>
        <div className="flex items-center gap-2">
          <EnablePushButton />
          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              Add game
            </Button>
          )}
        </div>
      </div>

      {isAdmin && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a game</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreateGame} className="grid gap-4">
              <div className="grid gap-1 text-sm">
                <Label htmlFor="opponent">Opponent</Label>
                <Select
                  value={selectedOpponentId || undefined}
                  onValueChange={(v) =>
                    setSelectedOpponentId(v as Id<"opponents">)
                  }
                  disabled={!opponents}
                >
                  <SelectTrigger id="opponent" className="w-full">
                    <SelectValue
                      placeholder={
                        opponents ? "Select an opponent" : "Loading opponents…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {opponents?.map((o) => (
                      <SelectItem key={o._id} value={o._id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 text-sm">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start font-normal"
                    >
                      {selectedDate
                        ? dateFormatter.format(selectedDate)
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="p-0 border border-border bg-card"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="min-h-[80px] rounded border border-border bg-muted px-3 py-2 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Parking, special jerseys, etc."
                />
              </div>
              <DialogFooter>
                <Button type="submit">Add game</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Clear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="mt-4 space-y-4">
        {tab === "upcoming" ? (
          <>
            {hasLoadedGames && upcomingGames.length === 0 && (
              <p className="text-muted-foreground">No upcoming games scheduled.</p>
            )}

            {hasLoadedGames && firstUpcomingGame && (
              <ul className="space-y-4">
                {(() => {
                  const entry = firstUpcomingGame;
                  const inCount = entry.rsvps.filter(
                    (rsvp) => rsvp.status === "in"
                  ).length;
                  const outCount = entry.rsvps.filter(
                    (rsvp) => rsvp.status === "out"
                  ).length;
                  return (
                    <li
                      key={entry.game._id}
                      className="rounded-xl border border-border bg-tint-blue p-6 shadow"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEdit(entry)}
                                aria-label="Edit game"
                              >
                                <Pencil className="size-4" />
                              </Button>
                            )}
                            <ScorePill game={entry.game} />
                            <h3 className="text-lg font-semibold">vs. {entry.game.opponent}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {dateFormatter.format(new Date(entry.game.startTime))}
                          </p>
                          {entry.game.location && (
                            <p className="text-sm text-muted-foreground">
                              {entry.game.location}
                            </p>
                          )}
                          {entry.game.notes && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {entry.game.notes}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-primary/40 px-3 py-1">
                              In: {inCount}
                            </span>
                            <span className="rounded-full border border-warning/40 px-3 py-1">
                              Out: {outCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Player availability
                        </h4>
                        {!players && (
                          <p className="text-sm text-muted-foreground">
                            Loading players…
                          </p>
                        )}
                        {players && players.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Add players to start collecting RSVPs.
                          </p>
                        )}
                        <ul className="space-y-2">
                          {orderedPlayers?.map((player) => {
                            const canEdit = isAdmin || me?.playerId === player._id;
                            const status = getRsvpStatus(entry, player._id);
                            const inActive = status === "in";
                            const outActive = status === "out";
                            const disabledClass = canEdit
                              ? ""
                              : " opacity-50 cursor-not-allowed";
                            return (
                              <li
                                key={player._id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-1">
                                    <p className="text-sm font-medium text-foreground">
                                      {player.name}
                                    </p>
                                    {typeof player.number === "number" ? (
                                      <Badge variant="secondary">#{player.number}</Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {player.position ?? "Position TBD"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={inActive ? "default" : "outline"}
                                    className={disabledClass}
                                    onClick={() =>
                                      handleRsvp(entry.game._id, player._id, "in")
                                    }
                                  >
                                    In
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={outActive ? "accent" : "outline"}
                                    className={disabledClass}
                                    onClick={() =>
                                      handleRsvp(entry.game._id, player._id, "out")
                                    }
                                  >
                                    Out
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </li>
                  );
                })()}
              </ul>
            )}

            {hasLoadedGames && otherUpcomingGames.length > 0 && (
              <div className="space-y-2">
                {otherUpcomingGames.map((entry) => {
                  const inCount = entry.rsvps.filter(
                    (rsvp) => rsvp.status === "in"
                  ).length;
                  const outCount = entry.rsvps.filter(
                    (rsvp) => rsvp.status === "out"
                  ).length;
                  return (
                    <details
                      key={entry.game._id}
                      className="rounded-xl border border-border bg-tint-blue shadow"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4">
                        <span className="flex items-center gap-2">
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(entry);
                              }}
                              aria-label="Edit game"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          <ScorePill game={entry.game} />
                          <span className="text-lg font-semibold">vs. {entry.game.opponent}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {dateFormatter.format(new Date(entry.game.startTime))}
                        </span>
                      </summary>
                      <div className="px-6 pb-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            {entry.game.location && (
                              <p className="text-sm text-muted-foreground">
                                {entry.game.location}
                              </p>
                            )}
                            {entry.game.notes && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {entry.game.notes}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full border border-primary/40 px-3 py-1">
                                In: {inCount}
                              </span>
                              <span className="rounded-full border border-warning/40 px-3 py-1">
                                Out: {outCount}
                              </span>
                            </div>
                          </div>

                          {false}
                        </div>

                        <div className="mt-5 space-y-3">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Player availability
                          </h4>
                          {!players && (
                            <p className="text-sm text-muted-foreground">
                              Loading players…
                            </p>
                          )}
                          {players && players.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Add players to start collecting RSVPs.
                            </p>
                          )}
                          <ul className="space-y-2">
                            {orderedPlayers?.map((player) => {
                              const canEdit =
                                isAdmin || me?.playerId === player._id;
                              const status = getRsvpStatus(entry, player._id);
                              const inActive = status === "in";
                              const outActive = status === "out";
                              const disabledClass = canEdit
                                ? ""
                                : " opacity-50 cursor-not-allowed";
                              return (
                                <li
                                  key={player._id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <p className="text-sm font-medium text-foreground">
                                        {player.name}
                                      </p>
                                      {typeof player.number === "number" ? (
                                        <Badge variant="secondary">#{player.number}</Badge>
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {player.position ?? "Position TBD"}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={inActive ? "default" : "outline"}
                                      className={disabledClass}
                                      onClick={() =>
                                        handleRsvp(
                                          entry.game._id,
                                          player._id,
                                          "in"
                                        )
                                      }
                                    >
                                      In
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={outActive ? "accent" : "outline"}
                                      className={disabledClass}
                                      onClick={() =>
                                        handleRsvp(entry.game._id, player._id, "out")
                                      }
                                    >
                                      Out
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {hasLoadedGames && pastGames.length === 0 && (
              <p className="text-muted-foreground">No past games yet.</p>
            )}

            {hasLoadedGames && pastGames.length > 0 && (
              <ul className="space-y-2">
                {pastGames.map((entry) => (
                  <li
                    key={entry.game._id}
                    className="rounded-xl border border-border bg-tint-blue p-6 shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(entry)}
                              aria-label="Edit game"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          <ScorePill game={entry.game} />
                          <h3 className="text-lg font-semibold">vs. {entry.game.opponent}</h3>
                        </div>
                        {entry.game.location && (
                          <p className="text-sm text-muted-foreground">{entry.game.location}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {dateFormatter.format(new Date(entry.game.startTime))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {isAdmin && (
        <Dialog open={isEditOpen} onOpenChange={(o) => (o ? setIsEditOpen(true) : resetEdit())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit game</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1 text-sm">
                <Label htmlFor="edit-opponent">Opponent</Label>
                <Select
                  value={editOpponentId || undefined}
                  onValueChange={(v) => setEditOpponentId(v as Id<"opponents">)}
                  disabled={!opponents}
                >
                  <SelectTrigger id="edit-opponent" className="w-full">
                    <SelectValue
                      placeholder={opponents ? "Select an opponent" : "Loading opponents…"}
                    />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {opponents?.map((o) => (
                      <SelectItem key={o._id} value={o._id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 text-sm">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="justify-start font-normal">
                      {editDate ? dateFormatter.format(editDate) : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 border border-border bg-card">
                    <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="edit-time">Time</Label>
                <Input id="edit-time" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} required />
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
              <div className="grid gap-1 text-sm">
                <Label htmlFor="edit-notes">Notes</Label>
                <textarea
                  id="edit-notes"
                  className="min-h-[80px] rounded border border-border bg-muted px-3 py-2 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="grid gap-1">
                  <Label htmlFor="edit-team-score">Our score</Label>
                  <Input id="edit-team-score" type="number" min={0} value={editTeamScore} onChange={(e) => setEditTeamScore(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="edit-opp-score">Opponent score</Label>
                  <Input id="edit-opp-score" type="number" min={0} value={editOpponentScore} onChange={(e) => setEditOpponentScore(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">Remove game</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this game?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the game and all RSVPs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!editingGameId) return;
                        await deleteGame({ gameId: editingGameId });
                        toast.success("Game removed");
                        resetEdit();
                      }}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="ml-auto flex gap-2">
                <Button type="button" onClick={onSaveEdit}>Save</Button>
                <Button type="button" variant="outline" onClick={resetEdit}>Cancel</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
