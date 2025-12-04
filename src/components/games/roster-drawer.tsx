"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { GameWithRsvps, Player } from "@/features/games/types";
import { Id } from "@/convex/_generated/dataModel";

// Helper for initials - exported so it can be used by parent
export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Player with RSVP info
interface PlayerRsvp {
  playerId: Id<"players">;
  status: "in" | "out";
  player: Player | undefined;
}

interface RosterDrawerProps {
  game: GameWithRsvps;
  players: Player[];
  // Pre-computed values from parent for immediate updates
  inPlayers: PlayerRsvp[];
  outPlayers: PlayerRsvp[];
  inCount: number;
}

export function RosterDrawer({
  game,
  players,
  inPlayers,
  outPlayers,
  inCount,
}: RosterDrawerProps) {
  const [open, setOpen] = useState(false);

  // Pending = players who haven't responded yet
  const respondedIds = new Set(
    [...inPlayers, ...outPlayers].map((p) => p.playerId)
  );
  const pendingPlayers = players
    .filter((p) => !respondedIds.has(p._id))
    .map((p) => ({ player: p, status: "pending" as const }));

  const gameDate = new Date(game.game.startTime);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex items-center -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setOpen(true)}
        >
          {inPlayers.slice(0, 3).map((p) => (
            <Avatar
              key={p.playerId}
              className="inline-block border-2 border-background h-6 w-6"
            >
              <AvatarFallback className="text-[10px] bg-secondary">
                {p.player ? getInitials(p.player.name) : "??"}
              </AvatarFallback>
            </Avatar>
          ))}
          <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-background bg-secondary text-[10px] font-medium text-muted-foreground z-10">
            +{Math.max(0, inCount - 3)}
          </div>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Roster
            </DrawerTitle>
            <DrawerDescription>
              {game.game.opponent} · {gameDate.toLocaleDateString()}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="h-[50vh] px-4">
            <div className="flex flex-col gap-6 pb-6">
              {/* Going */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  Going ({inPlayers.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {inPlayers.map((p) => (
                    <div
                      key={p.playerId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {p.player ? getInitials(p.player.name) : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {p.player?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending */}
              {pendingPlayers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    Pending ({pendingPlayers.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {pendingPlayers.map((p) => (
                      <div
                        key={p.player._id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-bold">
                            {getInitials(p.player.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-muted-foreground">
                          {p.player.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Out */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-lg">
                  <XCircle className="h-4 w-4" />
                  Out ({outPlayers.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {outPlayers.map((p) => (
                    <div
                      key={p.playerId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors opacity-60"
                    >
                      <Avatar className="h-8 w-8 grayscale">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-bold">
                          {p.player ? getInitials(p.player.name) : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground line-through decoration-border">
                        {p.player?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
