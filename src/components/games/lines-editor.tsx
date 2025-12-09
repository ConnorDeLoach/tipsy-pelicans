"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Users, Swords, Shield, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "./roster-drawer";
import type {
  Player,
  Slot as SlotType,
  GameLines,
} from "@/features/games/types";

// Extended Player type with status
export type PlayerWithStatus = Player & {
  status: "in" | "out" | "pending";
};

interface LinesEditorProps {
  gameId: Id<"games">;
  lines: GameLines;
  players: PlayerWithStatus[];
  isAdmin: boolean;
}

export function LinesEditor({
  gameId,
  lines,
  players,
  isAdmin,
}: LinesEditorProps) {
  const updateSlot = useMutation(api.gameLines.updateLineSlot);
  const swapSlots = useMutation(api.gameLines.swapLineSlots);
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"players"> | null>(null);
  const [showExtraLine, setShowExtraLine] = useState(false);

  const slots = lines.slots;

  // Filter only eligible players (in or pending/maybe)
  // Out players are not available for lines
  const eligiblePlayers = players.filter(
    (p) => p.status !== "out" && p.role === "player"
  );

  // Computed: Unassigned players (Bench)
  // Players who are eligible but not currently assigned to any slot
  const assignedPlayerIds = new Set(
    slots.map((s) => s.playerId).filter(Boolean)
  );
  const unassignedPlayers = eligiblePlayers.filter(
    (p) => !assignedPlayerIds.has(p._id)
  );

  const handlePlayerClick = async (
    e: React.MouseEvent,
    playerId: Id<"players">
  ) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(playerId);
    }
  };

  const handleSlotClick = async (e: React.MouseEvent, slotId: string) => {
    e.stopPropagation();
    if (!isAdmin) return;

    // CASE 1: No player selected yet
    if (!selectedPlayerId) {
      // If slot has a player, select them (to move/swap)
      const slot = slots.find((s) => s.id === slotId);
      if (slot?.playerId) {
        setSelectedPlayerId(slot.playerId);
      }
      return;
    }

    // CASE 2: Player is already selected
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot) return;

    // 2a. Tapping the same player/slot again -> Cancel selection
    if (targetSlot.playerId === selectedPlayerId) {
      setSelectedPlayerId(null);
      return;
    }

    // 2b. Move or Swap
    const sourceSlot = slots.find((s) => s.playerId === selectedPlayerId);

    if (sourceSlot && targetSlot.playerId) {
      // SWAP: Both slots occupied
      await swapSlots({
        gameId,
        sourceSlotId: sourceSlot.id,
        targetSlotId: slotId,
      });
    } else {
      // ASSIGN / MOVE: Target empty OR source was bench
      await updateSlot({
        gameId,
        slotId,
        playerId: selectedPlayerId,
      });
    }

    setSelectedPlayerId(null);
  };

  const handleBackgroundClick = async () => {
    if (!isAdmin) return;

    if (selectedPlayerId) {
      // If player was on the ice, remove them (send to bench)
      const sourceSlot = slots.find((s) => s.playerId === selectedPlayerId);
      if (sourceSlot) {
        await updateSlot({
          gameId,
          slotId: sourceSlot.id,
          playerId: undefined,
        });
      }
      setSelectedPlayerId(null);
    }
  };

  // Helper to group slots
  const getSlotsByGroupAndRole = (
    groupStr: string,
    roles: string[],
    lineNum?: number
  ) => {
    return slots.filter(
      (s) =>
        s.group === groupStr &&
        roles.includes(s.role) &&
        (lineNum === undefined || s.lineNumber === lineNum)
    );
  };

  // Determine number of lines dynamically based on slots present
  const forwardLines = [
    ...new Set(
      slots
        .filter((s) => ["LW", "C", "RW"].includes(s.role))
        .map((s) => s.lineNumber)
    ),
  ].sort((a, b) => a - b);

  const defensePairs = [
    ...new Set(
      slots
        .filter((s) => ["LD", "RD"].includes(s.role))
        .map((s) => s.lineNumber)
    ),
  ].sort((a, b) => a - b);

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 min-h-[60vh]"
      onClick={handleBackgroundClick}
    >
      {/* Bench / Unassigned */}
      <Card
        className={cn(
          "bg-muted/30 border-dashed border-2 overflow-hidden transition-colors",
          isAdmin && "hover:bg-muted/40"
        )}
      >
        <div className="px-4 py-2 border-b bg-muted/20 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-3 h-3" />
            Bench ({unassignedPlayers.length})
          </h3>
        </div>
        <CardContent className="p-3">
          {unassignedPlayers.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground italic">
              All players assigned!
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((player) => (
                <button
                  key={player._id}
                  onClick={(e) => handlePlayerClick(e, player._id)}
                  disabled={!isAdmin}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-full border transition-all text-sm font-medium shadow-sm",
                    selectedPlayerId === player._id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 scale-105"
                      : isAdmin
                      ? "bg-background hover:border-primary/50 hover:scale-105"
                      : "bg-background opacity-80 cursor-default",
                    player.status === "pending" &&
                      selectedPlayerId !== player._id &&
                      "opacity-60 grayscale bg-muted"
                  )}
                >
                  <span className="text-xs opacity-70 w-4 text-center">
                    {player.number}
                  </span>
                  {player.name.split(" ")[0]}
                  {/* Position Dot */}
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full ml-1",
                      player.position === "D" ||
                        player.position === "LD" ||
                        player.position === "RD"
                        ? "bg-blue-400"
                        : player.position === "G"
                        ? "bg-yellow-400"
                        : "bg-red-400"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lines Grid */}
      <div className="space-y-6">
        {/* Forwards */}
        {forwardLines.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-500" />
              Forwards
            </h3>
            <div className="space-y-3">
              {forwardLines
                .filter((lineNum) => showExtraLine || lineNum <= 3)
                .map((lineNum) => (
                  <div
                    key={`F${lineNum}`}
                    className="grid grid-cols-[auto_1fr] gap-3"
                  >
                    <div className="flex items-center justify-center w-6">
                      <span className="text-[10px] font-black text-muted-foreground/40 -rotate-90 whitespace-nowrap tracking-widest">
                        LINE {lineNum}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["LW", "C", "RW"].map((pos) => {
                        const slotId = `L${lineNum}-${pos}`;
                        const slot = slots.find((s) => s.id === slotId);
                        return (
                          <SlotComponent
                            key={slotId}
                            id={slotId}
                            label={pos}
                            playerId={slot?.playerId}
                            allPlayers={players}
                            isSelected={slot?.playerId === selectedPlayerId}
                            isTarget={
                              !!selectedPlayerId &&
                              slot?.playerId !== selectedPlayerId
                            }
                            isAdmin={isAdmin}
                            onClick={(e) => handleSlotClick(e, slotId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
            {forwardLines.length > 3 && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExtraLine((v) => !v);
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {showExtraLine ? "Hide 4th line" : "Show 4th line"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Defense */}
        {defensePairs.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Defense
            </h3>
            <div className="space-y-3">
              {defensePairs
                .filter((pairNum) => showExtraLine || pairNum <= 3)
                .map((pairNum) => (
                  <div
                    key={`D${pairNum}`}
                    className="grid grid-cols-[auto_1fr] gap-3"
                  >
                    <div className="flex items-center justify-center w-6">
                      <span className="text-[10px] font-black text-muted-foreground/40 -rotate-90 whitespace-nowrap tracking-widest">
                        PAIR {pairNum}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {["LD", "RD"].map((pos) => {
                        const slotId = `D${pairNum}-${pos}`;
                        const slot = slots.find((s) => s.id === slotId);
                        return (
                          <SlotComponent
                            key={slotId}
                            id={slotId}
                            label={pos}
                            playerId={slot?.playerId}
                            allPlayers={players}
                            isSelected={slot?.playerId === selectedPlayerId}
                            isTarget={
                              !!selectedPlayerId &&
                              slot?.playerId !== selectedPlayerId
                            }
                            isAdmin={isAdmin}
                            onClick={(e) => handleSlotClick(e, slotId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Goalies */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            Goalies
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="w-6" /> {/* Spacer */}
            <div className="grid grid-cols-1 gap-2">
              {slots
                .filter((s) => s.role === "G")
                .map((slot) => (
                  <SlotComponent
                    key={slot.id}
                    id={slot.id}
                    label={`GOALIE ${slot.lineNumber}`}
                    playerId={slot.playerId}
                    allPlayers={players}
                    isSelected={slot.playerId === selectedPlayerId}
                    isTarget={
                      !!selectedPlayerId && slot.playerId !== selectedPlayerId
                    }
                    isAdmin={isAdmin}
                    onClick={(e) => handleSlotClick(e, slot.id)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotComponent({
  id,
  label,
  playerId,
  allPlayers,
  isSelected,
  isTarget,
  isAdmin,
  onClick,
}: {
  id: string;
  label: string;
  playerId?: Id<"players">;
  allPlayers: PlayerWithStatus[];
  isSelected: boolean;
  isTarget: boolean;
  isAdmin: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const assignedPlayer = playerId
    ? allPlayers.find((p) => p._id === playerId)
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[3/2] sm:aspect-[4/2] rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all",
        // Interactive state
        isAdmin
          ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          : "cursor-default",
        // Empty state styles
        !assignedPlayer && "border-dashed bg-muted/10 border-border/50",
        isAdmin && !assignedPlayer && "hover:bg-muted/20",
        // Target state (when holding a player)
        isAdmin &&
          !assignedPlayer &&
          isTarget &&
          "border-primary/50 bg-primary/5 ring-2 ring-primary/20 animate-pulse",
        // Filled state
        assignedPlayer && "bg-card border-border shadow-sm",
        // Selected state
        isSelected && "ring-2 ring-primary ring-offset-2 border-primary"
      )}
    >
      <div className="absolute top-1.5 left-2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest pointer-events-none">
        {label}
      </div>

      {assignedPlayer ? (
        <div
          className={cn(
            "flex flex-col items-center gap-1 w-full animate-in zoom-in-50 duration-200",
            assignedPlayer.status === "pending" && "opacity-50 grayscale"
          )}
        >
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-background shadow-sm">
            <AvatarFallback
              className={cn(
                "text-white text-[10px] font-bold bg-primary"
                // Fallback color logic could be enhanced if flair/color existed on Player
              )}
            >
              {assignedPlayer.number || getInitials(assignedPlayer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs sm:text-sm font-bold truncate max-w-full px-1">
            {assignedPlayer.name.split(" ")[1] || assignedPlayer.name}
          </div>
        </div>
      ) : (
        <Plus
          className={cn(
            "w-5 h-5 text-muted-foreground/20",
            isAdmin && isTarget && "text-primary/40"
          )}
        />
      )}
    </div>
  );
}
