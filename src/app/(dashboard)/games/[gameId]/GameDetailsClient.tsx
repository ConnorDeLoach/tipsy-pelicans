"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
  MoreVertical,
  Users,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceList } from "@/components/games/attendance-list";
import { LinesEditor, PlayerWithStatus } from "@/components/games/lines-editor";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";

interface GameDetailsClientProps {
  gameId: Id<"games">;
}

function SegmentedControl({
  active,
  onChange,
}: {
  active: "attendance" | "lines";
  onChange: (v: "attendance" | "lines") => void;
}) {
  return (
    <div className="bg-muted/50 p-1 rounded-xl flex gap-1 relative mb-6">
      {/* Active Indicator Background */}
      <motion.div
        className="absolute bg-background shadow-sm rounded-lg inset-y-1"
        layoutId="segment-indicator"
        initial={false}
        animate={{
          left: active === "attendance" ? "4px" : "50%",
          width: "calc(50% - 4px)",
          x: active === "lines" ? "0%" : "0%",
        }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />

      <button
        onClick={() => onChange("attendance")}
        className={cn(
          "flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors relative flex items-center justify-center gap-2",
          active === "attendance"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        )}
      >
        <Users className="w-4 h-4" />
        Attendance
      </button>
      <button
        onClick={() => onChange("lines")}
        className={cn(
          "flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors relative flex items-center justify-center gap-2",
          active === "lines"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        )}
      >
        <Swords className="w-4 h-4" />
        Lines
      </button>
    </div>
  );
}

export function GameDetailsClient({ gameId }: GameDetailsClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"attendance" | "lines">("lines");

  const bundle = useQuery(api.games.getGamesPageBundle);
  const me = useQuery(api.me.get);
  const isAdmin = me?.role === "admin";

  // Find game in bundle
  // Note: getGamesPageBundle returns { games: { game, rsvps, lines? }[], ... }
  // We need to verify if lines are included in the return type now.
  const gameData = useMemo(() => {
    if (!bundle) return null;
    return bundle.games.find((g) => g.game._id === gameId);
  }, [bundle, gameId]);

  const players = useMemo(() => {
    if (!bundle) return [];
    return bundle.players.filter((p) => !p.deletedAt); // Active players
  }, [bundle]);

  const playersWithStatus = useMemo(() => {
    if (!gameData || !players.length) return [];

    // Create a map of RSVP status
    const rsvpMap = new Map<string, "in" | "out" | "pending">();
    gameData.rsvps.forEach((r) => {
      rsvpMap.set(r.playerId, r.status as "in" | "out" | "pending");
    });

    return players.map((p) => ({
      ...p,
      status: rsvpMap.get(p._id) || "pending", // Default to pending if no RSVP
    })) as PlayerWithStatus[];
  }, [gameData, players]);

  const attendancePlayers = useMemo(() => {
    return playersWithStatus.filter((p) => p.role === "player");
  }, [playersWithStatus]);

  if (!bundle || me === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl font-bold">Game not found</h1>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const { game, lines } = gameData;
  const gameDate = new Date(game.startTime);
  const timeStr = gameDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">
      {/* Navbar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="font-bold text-lg">Game Details</div>
        <div className="ml-auto flex gap-2">{/* Actions could go here */}</div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Game Header Card */}
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="w-3 h-3" />
            {game.status}
          </div>

          <h1 className="text-4xl font-black tracking-tighter leading-none">
            <span className="text-muted-foreground text-2xl font-bold block mb-1">
              VS
            </span>
            {game.opponent}
          </h1>

          <div className="flex justify-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {timeStr}
            </div>
            <div className="w-px bg-border h-4 self-center" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {game.location || "Hertz Arena"}
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <SegmentedControl active={view} onChange={setView} />

        {/* Dynamic View Content */}
        <AnimatePresence mode="wait">
          {view === "attendance" ? (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <AttendanceList players={attendancePlayers} />
            </motion.div>
          ) : (
            <motion.div
              key="lines"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {lines ? (
                <LinesEditor
                  gameId={gameId}
                  lines={lines}
                  players={playersWithStatus}
                  isAdmin={Boolean(isAdmin)}
                />
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                  <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Lines have not been set for this game.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
