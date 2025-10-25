"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
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

type RsvpStatus = "yes" | "no" | "maybe";

export default function Page() {
  const players = useQuery(api.players.getPlayers);
  const games = useQuery(api.games.listGamesWithRsvps);
  const setRsvp = useMutation(api.games.setRsvp).withOptimisticUpdate(
    (localStore, { gameId, playerId, status }) => {
      const list = localStore.getQuery(api.games.listGamesWithRsvps);
      if (!list) return;
      const updated = list.map((entry) => {
        if (entry.game._id !== gameId) return entry;
        const idx = entry.rsvps.findIndex((r) => r.playerId === playerId);
        let nextRsvps;
        if (idx >= 0) {
          nextRsvps = entry.rsvps.slice();
          nextRsvps[idx] = {
            ...nextRsvps[idx],
            status,
            updatedAt: Date.now(),
          } as any;
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
    (localStore, { opponent, startTime, location, notes }) => {
      const list = localStore.getQuery(api.games.listGamesWithRsvps);
      if (!list) return;
      const optimistic = {
        game: {
          _id: "optimistic:new-game" as Id<"games">,
          _creationTime: Date.now(),
          opponent,
          startTime,
          location,
          notes,
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
        dateStyle: "full",
        timeStyle: "short",
      }),
    []
  );

  const isAdmin = me?.role === "admin";
  const [opponent, setOpponent] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resetForm = () => {
    setOpponent("");
    setSelectedDate(undefined);
    setTime("");
    setLocation("");
    setNotes("");
  };

  const onCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim()) {
      toast.error("Please enter an opponent.");
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
      opponent: opponent.trim(),
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
    if (!games) {
      return [];
    }
    const now = Date.now();
    return games.filter((entry) => entry.game.startTime >= now);
  }, [games]);

  const hasLoadedGames = games !== undefined;

  const firstUpcomingGame = upcomingGames[0];
  const otherUpcomingGames = upcomingGames.slice(1);

  const getRsvpStatus = (
    game: GameWithRsvps,
    playerId: Id<"players">
  ): RsvpStatus | undefined => {
    return game.rsvps.find((rsvp) => rsvp.playerId === playerId)?.status;
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
        <h1 className="text-2xl font-semibold">Upcoming Games</h1>
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
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  required
                />
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
        {!hasLoadedGames && (
          <p className="text-muted-foreground">Loading games…</p>
        )}
        {hasLoadedGames && upcomingGames.length === 0 && (
          <p className="text-muted-foreground">No upcoming games scheduled.</p>
        )}

        {hasLoadedGames && firstUpcomingGame && (
          <ul className="space-y-4">
            {(() => {
              const entry = firstUpcomingGame;
              const yesCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "yes"
              ).length;
              const noCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "no"
              ).length;
              const maybeCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "maybe"
              ).length;
              return (
                <li
                  key={entry.game._id}
                  className="rounded-xl border border-border bg-tint-blue p-6 shadow"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        vs. {entry.game.opponent}
                      </h3>
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
                          Yes: {yesCount}
                        </span>
                        <span className="rounded-full border border-chart-4/40 px-3 py-1">
                          Maybe: {maybeCount}
                        </span>
                        <span className="rounded-full border border-destructive/40 px-3 py-1">
                          No: {noCount}
                        </span>
                      </div>
                    </div>

                    {me?.role === "admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="self-end rounded border border-destructive px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/15">
                            Remove game
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove this game?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the game and all RSVPs. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deleteGame({ gameId: entry.game._id });
                                toast.success("Game removed");
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
                        const yesActive = status === "yes";
                        const maybeActive = status === "maybe";
                        const noActive = status === "no";
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
                                {(() => {
                                  const flair = player.flair;
                                  if (!flair) return null;
                                  return flair
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .slice(0, 6)
                                    .map((label, idx) => (
                                      <Badge key={idx} variant="secondary">
                                        {label}
                                      </Badge>
                                    ));
                                })()}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {player.position ?? "Position TBD"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={yesActive ? "default" : "outline"}
                                className={disabledClass}
                                onClick={() =>
                                  handleRsvp(entry.game._id, player._id, "yes")
                                }
                              >
                                Yes
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={maybeActive ? "secondary" : "outline"}
                                className={disabledClass}
                                onClick={() =>
                                  handleRsvp(
                                    entry.game._id,
                                    player._id,
                                    "maybe"
                                  )
                                }
                              >
                                Maybe
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={noActive ? "destructive" : "outline"}
                                className={disabledClass}
                                onClick={() =>
                                  handleRsvp(entry.game._id, player._id, "no")
                                }
                              >
                                No
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
              const yesCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "yes"
              ).length;
              const noCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "no"
              ).length;
              const maybeCount = entry.rsvps.filter(
                (rsvp) => rsvp.status === "maybe"
              ).length;
              return (
                <details
                  key={entry.game._id}
                  className="rounded-xl border border-border bg-tint-blue shadow"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4">
                    <span className="text-lg font-semibold">
                      vs. {entry.game.opponent}
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
                            Yes: {yesCount}
                          </span>
                          <span className="rounded-full border border-chart-4/40 px-3 py-1">
                            Maybe: {maybeCount}
                          </span>
                          <span className="rounded-full border border-destructive/40 px-3 py-1">
                            No: {noCount}
                          </span>
                        </div>
                      </div>

                      {me?.role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="self-end rounded border border-destructive px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/15">
                              Remove game
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove this game?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the game and all RSVPs. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  await deleteGame({ gameId: entry.game._id });
                                  toast.success("Game removed");
                                }}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
                          const yesActive = status === "yes";
                          const maybeActive = status === "maybe";
                          const noActive = status === "no";
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
                                  {(() => {
                                    const flair = player.flair;
                                    if (!flair) return null;
                                    return flair
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                      .slice(0, 6)
                                      .map((label, idx) => (
                                        <Badge key={idx} variant="secondary">
                                          {label}
                                        </Badge>
                                      ));
                                  })()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {player.position ?? "Position TBD"}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={yesActive ? "default" : "outline"}
                                  className={disabledClass}
                                  onClick={() =>
                                    handleRsvp(
                                      entry.game._id,
                                      player._id,
                                      "yes"
                                    )
                                  }
                                >
                                  Yes
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    maybeActive ? "secondary" : "outline"
                                  }
                                  className={disabledClass}
                                  onClick={() =>
                                    handleRsvp(
                                      entry.game._id,
                                      player._id,
                                      "maybe"
                                    )
                                  }
                                >
                                  Maybe
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={noActive ? "destructive" : "outline"}
                                  className={disabledClass}
                                  onClick={() =>
                                    handleRsvp(entry.game._id, player._id, "no")
                                  }
                                >
                                  No
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
      </div>
    </div>
  );
}
