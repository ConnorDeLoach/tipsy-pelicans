import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Player, Me, GameWithRsvps } from "@/app/(dashboard)/games/actions";

type RsvpStatus = "in" | "out";

interface RsvpListProps {
  gameId: Id<"games">;
  rsvps: GameWithRsvps["rsvps"];
  isAdmin: boolean;
  me: Me | null;
  onRsvp: (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => void;
  filteredPlayers?: Player[];
  orderedPlayers?: Player[];
}

export function RsvpList({
  gameId,
  rsvps,
  isAdmin,
  me,
  onRsvp,
  filteredPlayers,
  orderedPlayers,
}: RsvpListProps) {
  if (!orderedPlayers) {
    return <p className="text-sm text-muted-foreground">Loading players…</p>;
  }

  if (filteredPlayers && filteredPlayers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No eligible players with the Player role.
      </p>
    );
  }

  const getRsvpStatus = (playerId: Id<"players">): RsvpStatus | undefined => {
    return rsvps.find((rsvp) => rsvp.playerId === playerId)?.status as
      | RsvpStatus
      | undefined;
  };

  return (
    <ul className="space-y-2">
      {orderedPlayers.map((player) => {
        const canEdit = isAdmin || me?.playerId === player._id;
        const status = getRsvpStatus(player._id);
        const inActive = status === "in";
        const outActive = status === "out";
        const disabledClass = canEdit ? "" : " opacity-50 cursor-not-allowed";

        return (
          <li
            key={player._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
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
                onClick={() => canEdit && onRsvp(gameId, player._id, "in")}
                disabled={!canEdit}
              >
                In
              </Button>
              <Button
                type="button"
                size="sm"
                variant={outActive ? "accent" : "outline"}
                className={disabledClass}
                onClick={() => canEdit && onRsvp(gameId, player._id, "out")}
                disabled={!canEdit}
              >
                Out
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
