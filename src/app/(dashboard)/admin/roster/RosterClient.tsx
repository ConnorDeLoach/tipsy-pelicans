"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  RosterDataTable,
  type PlayerRow,
} from "@/components/roster-data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PositionOption = "RW" | "C" | "LW" | "LD" | "RD" | "G";
type RoleOption = "player" | "spare" | "spectator";

type PlayerFormState = {
  name: string;
  email: string;
  position: PositionOption | "";
  number: string;
  flair: string;
  role: RoleOption;
  isAdmin: boolean;
};

interface RosterClientProps {
  initialPlayers: PlayerRow[];
}

export function RosterClient({ initialPlayers }: RosterClientProps) {
  // Use server-fetched data as initial value, then subscribe to real-time updates
  const players = useQuery(api.players.getPlayers, {});
  const displayPlayers = players ?? initialPlayers;

  const addPlayer = useMutation(api.players.addPlayer).withOptimisticUpdate(
    (localStore, { name, email, position, number, flair, isAdmin, role }) => {
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
  ).withOptimisticUpdate((localStore, { playerId, email, ...fields }) => {
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
  });

  const removePlayer = useMutation(
    api.players.removePlayer
  ).withOptimisticUpdate((localStore, { playerId }) => {
    const list = localStore.getQuery(api.players.getPlayers);
    if (!list) return;
    localStore.setQuery(
      api.players.getPlayers,
      {},
      list.filter((p) => p._id !== playerId)
    );
  });

  const [playerForm, setPlayerForm] = useState<PlayerFormState>({
    name: "",
    email: "",
    position: "",
    number: "",
    flair: "",
    role: "player",
    isAdmin: false,
  });
  const [editingId, setEditingId] = useState<Id<"players"> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const resetPlayerForm = () => {
    setPlayerForm({
      name: "",
      email: "",
      position: "",
      number: "",
      flair: "",
      role: "player",
      isAdmin: false,
    });
    setEditingId(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = playerForm.name.trim();
    const trimmedEmail = playerForm.email.trim();

    if (!trimmedName) {
      toast.error("Please enter a player name.");
      return;
    }

    if (!trimmedEmail) {
      toast.error("Please enter an email address.");
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      position: playerForm.position
        ? (playerForm.position as PositionOption)
        : undefined,
      number: playerForm.number ? Number(playerForm.number) : undefined,
      flair: playerForm.flair.trim() || undefined,
      role: playerForm.role,
      isAdmin: playerForm.isAdmin,
    };

    if (editingId) {
      await updatePlayer({ playerId: editingId, ...payload });
      toast.success("Player updated");
    } else {
      await addPlayer(payload);
      toast.success("Player added");
    }

    setIsDialogOpen(false);
    resetPlayerForm();
  };

  const onEdit = (player: PlayerRow) => {
    setEditingId(player._id);
    setPlayerForm({
      name: player.name,
      email: player.email ?? "",
      position: (player.position as PositionOption | undefined) ?? "",
      number: player.number?.toString() ?? "",
      flair: player.flair ?? "",
      role: (player as any).role ?? "player",
      isAdmin: player.isAdmin ?? false,
    });
    setIsDialogOpen(true);
  };

  const onDelete = async (playerId: Id<"players">) => {
    await removePlayer({ playerId });
    if (editingId === playerId) {
      resetPlayerForm();
    }
    toast.success("Player removed");
  };

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roster Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage players and roles
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetPlayerForm();
            setIsDialogOpen(true);
          }}
        >
          Add player
        </Button>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetPlayerForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit player" : "Add a new player"}
            </DialogTitle>
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
              <Label htmlFor="role">Role</Label>
              <Select
                value={playerForm.role}
                onValueChange={(value) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    role: value as RoleOption,
                  }))
                }
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="spare">Spare</SelectItem>
                  <SelectItem value="spectator">Spectator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 text-sm">
              <Label htmlFor="position">Position</Label>
              <Select
                value={playerForm.position || undefined}
                onValueChange={(value) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    position: value as PositionOption,
                  }))
                }
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Pick a position (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RW">RW</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="LW">LW</SelectItem>
                  <SelectItem value="LD">LD</SelectItem>
                  <SelectItem value="RD">RD</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="flair">Flair</Label>
              <Textarea
                id="flair"
                value={playerForm.flair}
                onChange={(event) =>
                  setPlayerForm((prev) => ({
                    ...prev,
                    flair: event.target.value,
                  }))
                }
                placeholder="Fun tags or comma-separated chips (e.g., Sniper, Enforcer)"
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingId ? "Save changes" : "Add player"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetPlayerForm();
                  setIsDialogOpen(false);
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
        {displayPlayers && displayPlayers.length === 0 && (
          <p className="text-muted-foreground">
            No players yet. Use the Add player button to get started.
          </p>
        )}
        {displayPlayers && displayPlayers.length > 0 && (
          <RosterDataTable
            data={displayPlayers as unknown as PlayerRow[]}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </section>
    </div>
  );
}
