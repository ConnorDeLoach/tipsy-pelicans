"use client"

import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { FormEvent, useState } from "react"
import { toast } from "sonner"
import { RosterDataTable, type PlayerRow } from "@/components/roster-data-table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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

    setIsDialogOpen(false)
    resetPlayerForm()
  }

  const onEdit = (player: PlayerRow) => {
    setEditingId(player._id)
    setPlayerForm({
      name: player.name,
      email: player.email ?? "",
      position: player.position ?? "",
      number: player.number?.toString() ?? "",
      notes: player.notes ?? "",
      isAdmin: player.isAdmin ?? false,
    })
    setIsDialogOpen(true)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Roster Management</h1>
        <Button
          type="button"
          onClick={() => {
            resetPlayerForm()
            setIsDialogOpen(true)
          }}
        >
          Add player
        </Button>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            resetPlayerForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit player" : "Add a new player"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
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
            <DialogFooter>
              <Button type="submit">{editingId ? "Save changes" : "Add player"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetPlayerForm()
                  setIsDialogOpen(false)
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-medium">Current roster</h2>
        {!players && <p className="text-muted-foreground">Loading roster…</p>}
        {players && players.length === 0 && (
          <p className="text-muted-foreground">No players yet. Use the Add player button to get started.</p>
        )}
        {players && players.length > 0 && (
          <RosterDataTable
            data={players as unknown as PlayerRow[]}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </section>
    </div>
  )
}
