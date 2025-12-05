"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { Clock, Check, X, Pencil, MoreVertical, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RosterDrawer } from "./roster-drawer";
import type { GameWithRsvps, Player, Me } from "@/features/games/types";
import { Id } from "@/convex/_generated/dataModel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeActions } from "@/hooks/use-swipe-actions";

type RsvpStatus = "in" | "out";

interface GameCardModernProps {
  entry: GameWithRsvps;
  players: Player[];
  me: Me | null;
  isAdmin: boolean;
  onRsvp: (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => void;
  onEdit: (entry: GameWithRsvps) => void;
  isPast: boolean;
  /** Show swipe hint animation (first card only) */
  showSwipeHint?: boolean;
  /** Called when user successfully swipes */
  onSwipeUsed?: () => void;
}

const itemVariants = {
  hidden: { opacity: 0.6 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15,
    },
  },
};

function GameDateBadge({ date }: { date: Date }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-secondary/50 p-2 min-w-[60px] w-16 text-center border border-border/50">
      <span className="text-xs font-bold uppercase text-muted-foreground">
        {date.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span className="text-xl font-black text-foreground tracking-tight">
        {date.getDate()}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground uppercase">
        {date.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
    </div>
  );
}

function ResultBadge({
  result,
  score,
}: {
  result: string;
  score: { us: number; them: number };
}) {
  const isWin = result === "win";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm font-bold ${
          isWin ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {score.us} - {score.them}
      </span>
      <Badge
        variant={isWin ? "default" : "secondary"}
        className={isWin ? "bg-primary hover:bg-primary/90" : ""}
      >
        {isWin ? "W" : "L"}
      </Badge>
    </div>
  );
}

const ACTION_WIDTH = 80; // Width of action button area

export function GameCardModern({
  entry,
  players,
  me,
  isAdmin,
  onRsvp,
  onEdit,
  isPast,
  showSwipeHint,
  onSwipeUsed,
}: GameCardModernProps) {
  const isMobile = useIsMobile();
  const swipeEnabled = isMobile && isAdmin;

  const {
    state: swipeState,
    handlers: swipeHandlers,
    close: closeSwipe,
  } = useSwipeActions({
    threshold: 40,
    maxSwipe: ACTION_WIDTH,
    disabled: !swipeEnabled,
    autoCloseDelay: 4000,
    onSwipeOpen: onSwipeUsed,
  });

  // Spring animation for smooth swipe
  const springX = useSpring(0, { stiffness: 400, damping: 30 });

  // Update spring when swipe state changes
  useEffect(() => {
    springX.set(
      swipeState.isDragging
        ? swipeState.offsetX
        : swipeState.isOpen
        ? -ACTION_WIDTH
        : 0
    );
  }, [swipeState.offsetX, swipeState.isOpen, swipeState.isDragging, springX]);

  // Hint animation: nudge card left briefly to reveal action
  useEffect(() => {
    if (!showSwipeHint || !swipeEnabled) return;

    const timer = setTimeout(() => {
      // Nudge left
      springX.set(-24);
      // Return after a moment
      setTimeout(() => {
        springX.set(0);
      }, 400);
    }, 800);

    return () => clearTimeout(timer);
  }, [showSwipeHint, swipeEnabled, springX]);

  // Action button opacity based on reveal
  const actionOpacity = useTransform(
    springX,
    [-ACTION_WIDTH, -20, 0],
    [1, 0.5, 0]
  );

  const handleEditClick = () => {
    closeSwipe();
    onEdit(entry);
  };

  const game = entry.game;
  const gameDate = new Date(game.startTime);

  // Determine Result
  const ts = (game as any).teamScore;
  const os = (game as any).opponentScore;
  let result = "pending";
  if (typeof ts === "number" && typeof os === "number") {
    if (ts > os) result = "win";
    else if (ts < os) result = "loss";
    else result = "tie";
  }

  // Get server RSVP status from entry
  const serverMyRsvp = entry.rsvps.find((r) => r.playerId === me?.playerId);
  const serverRsvpStatus = (serverMyRsvp as any)?.status as
    | RsvpStatus
    | undefined;

  // Local optimistic state for immediate UI feedback
  const [optimisticStatus, setOptimisticStatus] = useState<
    RsvpStatus | undefined
  >(serverRsvpStatus);

  // Sync local state with server state when it changes
  useEffect(() => {
    setOptimisticStatus(serverRsvpStatus);
  }, [serverRsvpStatus]);

  // Use optimistic status for display
  const rsvpStatus = optimisticStatus;

  // Compute RSVPs with optimistic update applied for RosterDrawer
  const optimisticRsvps = useMemo(() => {
    if (!me?.playerId || optimisticStatus === serverRsvpStatus) {
      return entry.rsvps;
    }
    // Apply optimistic update to rsvps
    const myPlayerId = me.playerId;
    const existingIdx = entry.rsvps.findIndex((r) => r.playerId === myPlayerId);

    if (optimisticStatus === undefined) {
      // Removing RSVP
      return entry.rsvps.filter((r) => r.playerId !== myPlayerId);
    } else if (existingIdx >= 0) {
      // Updating existing RSVP
      return entry.rsvps.map((r, i) =>
        i === existingIdx ? { ...r, status: optimisticStatus } : r
      );
    } else {
      // Adding new RSVP
      return [
        ...entry.rsvps,
        {
          _id: "optimistic" as Id<"gameRsvps">,
          _creationTime: Date.now(),
          gameId: game._id,
          playerId: myPlayerId,
          status: optimisticStatus,
          updatedAt: Date.now(),
        } as any,
      ];
    }
  }, [entry.rsvps, me?.playerId, optimisticStatus, serverRsvpStatus, game._id]);

  // Create optimistic entry for RosterDrawer
  const optimisticEntry = useMemo(
    () => ({
      ...entry,
      rsvps: optimisticRsvps,
    }),
    [entry, optimisticRsvps]
  );

  // Compute inPlayers and outPlayers with player details for RosterDrawer
  const { inPlayers, outPlayers, inCount } = useMemo(() => {
    const eligiblePlayerIds = new Set(players.map((p) => p._id));

    const playerRsvps = optimisticRsvps
      .filter((rsvp) => eligiblePlayerIds.has(rsvp.playerId))
      .map((rsvp) => {
        const player = players.find((p) => p._id === rsvp.playerId);
        return {
          playerId: rsvp.playerId,
          status: (rsvp as any).status as "in" | "out",
          player,
        };
      });

    const inList = playerRsvps.filter((p) => p.status === "in");
    const outList = playerRsvps.filter((p) => p.status === "out");

    return {
      inPlayers: inList,
      outPlayers: outList,
      inCount: inList.length,
    };
  }, [optimisticRsvps, players]);

  const handleRsvpClick = (
    e: React.MouseEvent | React.TouchEvent,
    status: RsvpStatus
  ) => {
    // Prevent event from bubbling to swipe container
    e.stopPropagation();

    if (me?.playerId) {
      // Optimistic update: toggle or set status
      if (optimisticStatus === status) {
        setOptimisticStatus(undefined); // Toggle off
      } else {
        setOptimisticStatus(status);
      }
      // Call the actual mutation
      onRsvp(game._id, me.playerId, status);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      {/* Swipe container - relative positioning for action buttons */}
      <div className="relative overflow-hidden rounded-xl">
        {/* Action buttons revealed on swipe (positioned behind card) */}
        {swipeEnabled && (
          <motion.div
            className="absolute inset-y-0 right-0 flex items-stretch"
            style={{
              opacity: actionOpacity,
              width: ACTION_WIDTH,
              // Only allow clicks when swipe is open to prevent touch pass-through
              pointerEvents: swipeState.isOpen ? "auto" : "none",
            }}
          >
            <button
              onClick={handleEditClick}
              className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors"
              aria-label="Edit game"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </motion.div>
        )}

        {/* Swipeable card content */}
        <motion.div
          style={{ x: springX }}
          {...(swipeEnabled ? swipeHandlers : {})}
        >
          <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-300 group select-none">
            <CardContent className="p-0">
              <div className="flex flex-row h-full">
                {/* Time & Date Strip - Fixed Column */}
                <div className="flex flex-col justify-center items-center bg-secondary/30 p-3 w-20 sm:w-24 border-r border-border/40 gap-2 shrink-0">
                  <GameDateBadge date={gameDate} />
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center justify-center gap-1 bg-background px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-border/50 shadow-sm whitespace-nowrap w-full">
                    <Clock className="h-3 w-3 hidden sm:block" />
                    {gameDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-3 sm:p-5 flex flex-col justify-center gap-2 sm:gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-[10px] sm:text-xs font-semibold text-primary tracking-wider uppercase mb-0.5 sm:mb-1">
                        Opponent
                      </div>
                      <h3 className="font-bold text-base sm:text-xl text-foreground flex flex-wrap items-center gap-x-2 leading-tight">
                        <span className="text-muted-foreground font-normal text-sm sm:text-base">
                          vs
                        </span>
                        {game.opponent}
                      </h3>
                      {game.location && (
                        <div className="text-xs text-muted-foreground mt-1 hidden">
                          {/* Hidden location as requested, but code kept just in case */}
                          {game.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isPast && result !== "pending" && (
                        <ResultBadge
                          result={result}
                          score={{ us: ts, them: os }}
                        />
                      )}
                      {isAdmin && !isMobile && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(entry)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {/* Delete is handled in the edit dialog usually, but could add here */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  {game.notes && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 px-2.5 py-2 border border-blue-100/50 dark:border-blue-800/30">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs sm:text-sm text-foreground/80 font-medium leading-snug">
                        {game.notes}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1 sm:mt-2">
                    {/* Roster on Left */}
                    <div className="flex items-center gap-3">
                      {!isPast && (
                        <RosterDrawer
                          game={optimisticEntry}
                          players={players}
                          inPlayers={inPlayers}
                          outPlayers={outPlayers}
                          inCount={inCount}
                        />
                      )}
                    </div>

                    {/* Actions on Right */}
                    {!isPast && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={rsvpStatus === "in" ? "default" : "outline"}
                          className={`h-8 px-3 ${
                            rsvpStatus === "in"
                              ? "bg-green-600 hover:bg-green-700"
                              : "text-muted-foreground"
                          }`}
                          onClick={(e) => handleRsvpClick(e, "in")}
                        >
                          <Check className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">In</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            rsvpStatus === "out" ? "destructive" : "outline"
                          }
                          className={`h-8 px-3 ${
                            rsvpStatus === "out" ? "" : "text-muted-foreground"
                          }`}
                          onClick={(e) => handleRsvpClick(e, "out")}
                        >
                          <X className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Out</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
