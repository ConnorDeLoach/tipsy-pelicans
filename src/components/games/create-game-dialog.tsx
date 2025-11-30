import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Opponent } from "@/app/(dashboard)/games/actions";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface CreateGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GameFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  opponents: Opponent[] | undefined;
  initialData?: GameFormData;
  mode?: "create" | "edit";
}

export interface GameFormData {
  opponentId?: Id<"opponents">;
  startTime: number;
  location?: string;
  notes?: string;
  visibility: "public" | "private";
  teamScore?: number;
  opponentScore?: number;
}

export function CreateGameDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  opponents,
  initialData,
  mode = "create",
}: CreateGameDialogProps) {
  const [selectedOpponentId, setSelectedOpponentId] = useState<
    Id<"opponents"> | ""
  >("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [teamScore, setTeamScore] = useState<string>("");
  const [opponentScore, setOpponentScore] = useState<string>("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Reset or populate form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      setSelectedOpponentId(initialData.opponentId ?? "");
      const dt = new Date(initialData.startTime);
      setSelectedDate(dt);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      setTime(`${hh}:${mm}`);
      setLocation(initialData.location ?? "");
      setNotes(initialData.notes ?? "");
      setVisibility(initialData.visibility);
      setTeamScore(
        initialData.teamScore !== undefined ? String(initialData.teamScore) : ""
      );
      setOpponentScore(
        initialData.opponentScore !== undefined
          ? String(initialData.opponentScore)
          : ""
      );
    } else if (!open) {
      // Small delay to avoid flickering while closing
      const timer = setTimeout(() => {
        setSelectedOpponentId("");
        setSelectedDate(undefined);
        setTime("");
        setLocation("");
        setNotes("");
        setVisibility("public");
        setTeamScore("");
        setOpponentScore("");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error("Please pick a date.");
      return;
    }
    if (!time) {
      toast.error("Please choose a time.");
      return;
    }

    // Only require opponent for creation, not editing (though usually needed)
    // But actually, let's keep it flexible. The parent handles validation if needed.
    // For creation, usually opponent is required. For edit, we might just be updating details.
    if (mode === "create" && !selectedOpponentId) {
      toast.error("Please select an opponent.");
      return;
    }

    const [hh, mm] = time.split(":");
    const dt = new Date(selectedDate);
    dt.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    const startTime = dt.getTime();

    const teamScoreNum =
      teamScore === "" ? undefined : Math.max(0, Math.floor(Number(teamScore)));
    const opponentScoreNum =
      opponentScore === ""
        ? undefined
        : Math.max(0, Math.floor(Number(opponentScore)));

    await onSubmit({
      opponentId: selectedOpponentId
        ? (selectedOpponentId as Id<"opponents">)
        : undefined,
      startTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      visibility,
      teamScore: teamScoreNum,
      opponentScore: opponentScoreNum,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      setShowDeleteAlert(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Schedule a game" : "Edit game details"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
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

            <div className="grid gap-1 text-sm">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as "public" | "private")}
              >
                <SelectTrigger id="visibility" className="w-full">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "edit" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1 text-sm">
                  <Label htmlFor="teamScore">Team Score</Label>
                  <Input
                    id="teamScore"
                    type="number"
                    min="0"
                    value={teamScore}
                    onChange={(e) => setTeamScore(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-1 text-sm">
                  <Label htmlFor="opponentScore">Opponent Score</Label>
                  <Input
                    id="opponentScore"
                    type="number"
                    min="0"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {mode === "edit" && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {mode === "create" ? "Add game" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              game and all RSVPs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
