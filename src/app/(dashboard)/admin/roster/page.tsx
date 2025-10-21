"use client"

import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { FormEvent, useState } from "react"
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
import { RosterDataTable, type PlayerRow } from "@/components/roster-data-table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

type PlayerFormState = {
  name: string
  email: string
  position: string
  number: string
  notes: string
  isAdmin: boolean
}

export default function Page() {
  const players = useQuery(api.players.getPlayers)
  const addPlayer = useMutation(api.players.addPlayer)
  const updatePlayer = useMutation(api.players.updatePlayer)
  const removePlayer = useMutation(api.players.removePlayer)

  const [playerForm, setPlayerForm] = useState<PlayerFormState>({
    name: "",
    email: "",
    position: "",
    number: "",
    notes: "",
    isAdmin: false,
  })
  const [editingId, setEditingId] = useState<Id<"players"> | null>(null)

  const resetPlayerForm = () => {
    setPlayerForm({
      name: "",
      email: "",
      position: "",
      number: "",
      notes: "",
      isAdmin: false,
    })
    setEditingId(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = playerForm.name.trim()
    const trimmedEmail = playerForm.email.trim()

    if (!trimmedName) {
      toast.error("Please enter a player name.")
      return
    }

    if (!trimmedEmail) {
      toast.error("Please enter an email address.")
      return
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      position: playerForm.position.trim() || undefined,
      number: playerForm.number ? Number(playerForm.number) : undefined,
      notes: playerForm.notes.trim() || undefined,
      isAdmin: playerForm.isAdmin,
    }

    if (editingId) {
      await updatePlayer({ playerId: editingId, ...payload })
      toast.success("Player updated")
    } else {
      await addPlayer(payload)
      toast.success("Player added")
    }

    resetPlayerForm()
  }

  const onEdit = (player: NonNullable<typeof players>[number]) => {
    setEditingId(player._id)
    setPlayerForm({
      name: player.name,
      email: player.email ?? "",
      position: player.position ?? "",
      number: player.number?.toString() ?? "",
      notes: player.notes ?? "",
      isAdmin: player.isAdmin ?? false,
    })
  }

  const onDelete = async (playerId: Id<"players">) => {
    await removePlayer({ playerId })
    if (editingId === playerId) {
      resetPlayerForm()
    }
    toast.success("Player removed")
  }

  return (
    <div className="px-4 lg:px-6">
      <h1 className="text-2xl font-semibold">Roster Management</h1>
      <section className="mt-6 grid gap-8 lg:grid-cols-[2fr_3fr]">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 shadow">
          <h2 className="text-xl font-medium">{editingId ? "Edit player" : "Add a new player"}</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1 text-sm">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={playerForm.name}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-1 text-sm">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={playerForm.email}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-1 text-sm">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={playerForm.position}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    position: event.target.value,
                  }))
                }
                placeholder="Forward, defense, goalie..."
              />
            </div>
            <div className="grid gap-1 text-sm">
              <Label htmlFor="number">Jersey number</Label>
              <Input
                id="number"
                value={playerForm.number}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    number: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Checkbox
                id="isAdmin"
                checked={playerForm.isAdmin}
                onCheckedChange={(checked) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    isAdmin: checked === true,
                  }))
                }
              />
              <Label htmlFor="isAdmin" className="text-sm font-medium">
                Admin
              </Label>
            </div>
            <div className="grid gap-1 text-sm">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={playerForm.notes}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="Injuries, preferred shift, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit">
              {editingId ? "Save changes" : "Add player"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetPlayerForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">Current roster</h2>
          {!players && <p className="text-muted-foreground">Loading roster…</p>}
          {players && players.length === 0 && (
            <p className="text-muted-foreground">No players yet. Add your first player with the form.</p>
          )}
          {players && players.length > 0 && (
            <RosterDataTable
              data={players as unknown as PlayerRow[]}
              onEdit={(p) => onEdit(p as any)}
              onDelete={(id) => onDelete(id)}
            />
          )}
        </section>
      </section>
    </div>
  )
}
