"use client"

import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type RsvpStatus = "yes" | "no" | "maybe"

export default function Page() {
  const players = useQuery(api.players.getPlayers)
  const games = useQuery(api.games.listGamesWithRsvps)
  const setRsvp = useMutation(api.games.setRsvp)
  const deleteGame = useMutation(api.games.removeGame)
  const createGame = useMutation(api.games.createGame)
  const me = useQuery(api.me.get)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }),
    []
  )

  const isAdmin = me?.role === "admin"
  const [opponent, setOpponent] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  const resetForm = () => {
    setOpponent("")
    setSelectedDate(undefined)
    setTime("")
    setLocation("")
    setNotes("")
  }

  const onCreateGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponent.trim()) {
      toast.error("Please enter an opponent.")
      return
    }
    if (!selectedDate) {
      toast.error("Please pick a date.")
      return
    }
    if (!time) {
      toast.error("Please choose a time.")
      return
    }
    const [hh, mm] = time.split(":")
    const dt = new Date(selectedDate)
    dt.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0)
    const startTime = dt.getTime()
    await createGame({
      opponent: opponent.trim(),
      startTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    toast.success("Game scheduled")
    resetForm()
  }

  type GameWithRsvps = NonNullable<typeof games>[number]

  const getRsvpStatus = (
    game: GameWithRsvps,
    playerId: Id<"players">
  ): RsvpStatus | undefined => {
    return game.rsvps.find((rsvp) => rsvp.playerId === playerId)?.status
  }

  const handleRsvp = async (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => {
    await setRsvp({ gameId, playerId, status })
  }

  return (
    <div className="px-4 lg:px-6">
      <h1 className="text-2xl font-semibold">Upcoming Games</h1>
      {isAdmin && (
        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow">
          <h2 className="text-xl font-medium">Schedule a game</h2>
          <form onSubmit={onCreateGame} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <Label htmlFor="opponent">Opponent</Label>
              <Input id="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} required />
            </div>

            <div className="grid gap-1 text-sm">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-start font-normal">
                    {selectedDate ? dateFormatter.format(selectedDate) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-1 text-sm">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>

            <div className="grid gap-1 text-sm">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </div>

            <div className="md:col-span-2 grid gap-1 text-sm">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parking, special jerseys, etc." />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">Add game</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Clear</Button>
            </div>
          </form>
        </section>
      )}
      <div className="mt-4 space-y-4">
        {!games && <p className="text-slate-400">Loading games…</p>}
        {games && games.length === 0 && (
          <p className="text-slate-400">No games scheduled.</p>
        )}
        <ul className="space-y-4">
          {games?.map((entry) => {
            const yesCount = entry.rsvps.filter((rsvp) => rsvp.status === "yes").length
            const noCount = entry.rsvps.filter((rsvp) => rsvp.status === "no").length
            const maybeCount = entry.rsvps.filter((rsvp) => rsvp.status === "maybe").length

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

                  {me?.role === "admin" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="self-end rounded border border-rose-500 px-3 py-1 text-sm font-medium text-rose-400 hover:bg-rose-500/20">
                          Remove game
                        </button>
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
                              await deleteGame({ gameId: entry.game._id })
                              toast.success("Game removed")
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
                      const status = getRsvpStatus(entry, player._id)
                      const buildButtonClasses = (target: RsvpStatus) =>
                        `rounded border px-3 py-1 text-xs font-medium transition ${
                          status === target
                            ? "bg-sky-500 text-slate-950"
                            : "border-sky-500 text-sky-500 hover:bg-sky-500/20"
                        }`
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
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
