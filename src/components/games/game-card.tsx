import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { GameWithRsvps, Player, Me } from "@/app/(dashboard)/games/actions";

type RsvpStatus = "in" | "out";

interface GameCardProps {
  entry: GameWithRsvps;
  isAdmin: boolean;
  me: Me | null;
  onEdit: (entry: GameWithRsvps) => void;
  onRsvp: (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => void;
  filteredPlayers?: Player[];
  orderedPlayers?: Player[];
}

function ScorePill({ game }: { game: any }) {
  const ts = (game as any).teamScore;
  const os = (game as any).opponentScore;
  const hasScores = typeof ts === "number" && typeof os === "number";
  if (!hasScores) return null;
  const outcome = (game as any).outcome as "win" | "loss" | "tie" | undefined;
  let variant: "default" | "secondary" | "outline" = "secondary";
  if (outcome === "win") variant = "default";
  else if (outcome === "loss") variant = "outline";
  const baseClass = "px-3 py-1 text-sm font-semibold";
  const lossAccentClass =
    outcome === "loss"
      ? " bg-accent text-accent-foreground border-transparent"
      : "";
  return (
    <Badge variant={variant} className={baseClass + lossAccentClass}>
      {ts}-{os}
    </Badge>
  );
}

import { RsvpList } from "./rsvp-list";

// ... (imports remain the same, remove unused ones if any)

// ... (ScorePill remains the same)

export function GameCard({
  entry,
  isAdmin,
  me,
  onEdit,
  onRsvp,
  filteredPlayers,
  orderedPlayers,
}: GameCardProps) {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const eligible = new Set((filteredPlayers ?? []).map((p) => p._id));
  const inCount = entry.rsvps.filter(
    (rsvp) => rsvp.status === "in" && eligible.has(rsvp.playerId)
  ).length;
  const outCount = entry.rsvps.filter(
    (rsvp) => rsvp.status === "out" && eligible.has(rsvp.playerId)
  ).length;

  return (
    <li className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(entry)}
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
            <span className="rounded-full border border-primary/40 px-3 py-1 text-primary">
              In: {inCount}
            </span>
            <span className="rounded-full border border-warning/40 px-3 py-1 text-warning">
              Out: {outCount}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Player availability
        </h4>
        <RsvpList
          gameId={entry.game._id}
          rsvps={entry.rsvps}
          isAdmin={isAdmin}
          me={me}
          onRsvp={onRsvp}
          filteredPlayers={filteredPlayers}
          orderedPlayers={orderedPlayers}
        />
      </div>
    </li>
  );
}
