"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Preloaded } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import type { Player } from "@/features/games/types";
import { PlayerCard } from "@/components/roster/player-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRosterPageData } from "@/features/roster/queries";
import { useRosterMutations } from "@/features/roster/mutations";
import { useSwipeHint } from "@/hooks/use-swipe-hint";

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
  preloadedPlayers: Preloaded<typeof api.players.getPlayers>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function RosterClient({ preloadedPlayers }: RosterClientProps) {
  const {
    players,
    activeRoster,
    otherPlayers,
    totalPlayers,
    spares,
    spectators,
    me,
    isAdmin,
  } = useRosterPageData(preloadedPlayers);
  const { addPlayer, updatePlayer, removePlayer } = useRosterMutations();

  // Swipe hint for first-time admin users on mobile
  const { shouldShowHint, markAsSwiped } = useSwipeHint(isAdmin);

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

    if (!isAdmin) return;

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
      flair: playerForm.flair.trim(),
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

  const onEdit = (player: Player) => {
    if (!isAdmin) return;

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
    if (!isAdmin) return;

    await removePlayer({ playerId });
    if (editingId === playerId) {
      resetPlayerForm();
      setIsDialogOpen(false);
    }
    toast.success("Player removed");
  };

  return (
    <div className="bg-background text-foreground font-sans px-4 sm:px-6">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between py-3 mb-2">
        {/* Page Title */}
        <h1 className="text-base font-semibold">Team Roster</h1>

        {/* Stats Pill + Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{totalPlayers}</span>
            <span className="text-muted-foreground">active</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{spares} spares</span>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                resetPlayerForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Player</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-secondary/50 rounded-xl h-10">
          <TabsTrigger
            value="active"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            Active
          </TabsTrigger>
          <TabsTrigger
            value="other"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            Spares
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {activeRoster.length > 0 ? (
              activeRoster.map((player, index) => (
                <PlayerCard
                  key={player._id}
                  player={player}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showSwipeHint={index === 0 && shouldShowHint}
                  onSwipeUsed={markAsSwiped}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No active players found.
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="other" className="mt-0">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {otherPlayers.length > 0 ? (
              otherPlayers.map((player, index) => (
                <PlayerCard
                  key={player._id}
                  player={player}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showSwipeHint={index === 0 && shouldShowHint}
                  onSwipeUsed={markAsSwiped}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No spare players found.
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Admin Dialog */}
      {isAdmin && (
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
              <DialogFooter className="sm:justify-between">
                {editingId ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">
                        Remove player
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove player?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the player and their associations.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(editingId)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <div /> /* Spacer */
                )}
                <div className="flex gap-2">
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
                  <Button type="submit">
                    {editingId ? "Save changes" : "Add player"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
