"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  ChevronLeft,
  Shield,
  Swords,
  MoreVertical,
  User,
  GripVertical,
  ArrowRightLeft,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// --- Types ---

type Player = {
  id: string;
  name: string;
  number: string;
  position: "F" | "D" | "G";
  status: "in" | "out" | "maybe";
  avatarColor: string;
};

type SlotId = string; // e.g., "L1-LW", "D1-LD"

// --- Mock Data ---

const MOCK_GAME = {
  opponent: "Puck Hogs",
  date: "Fri, Dec 12",
  time: "9:45 PM",
  location: "Hertz Arena",
  status: "upcoming",
};

const MOCK_PLAYERS: Player[] = [
  {
    id: "1",
    name: "Connor DeLoach",
    number: "88",
    position: "F",
    status: "in",
    avatarColor: "bg-blue-500",
  },
  {
    id: "2",
    name: "Wayne Gretzky",
    number: "99",
    position: "F",
    status: "in",
    avatarColor: "bg-orange-500",
  },
  {
    id: "3",
    name: "Mario Lemieux",
    number: "66",
    position: "F",
    status: "in",
    avatarColor: "bg-emerald-500",
  },
  {
    id: "4",
    name: "Patrick Roy",
    number: "33",
    position: "G",
    status: "in",
    avatarColor: "bg-indigo-500",
  },
  {
    id: "5",
    name: "Bobby Orr",
    number: "4",
    position: "D",
    status: "in",
    avatarColor: "bg-rose-500",
  },
  {
    id: "6",
    name: "Ray Bourque",
    number: "77",
    position: "D",
    status: "in",
    avatarColor: "bg-cyan-500",
  },
  {
    id: "7",
    name: "Steve Yzerman",
    number: "19",
    position: "F",
    status: "in",
    avatarColor: "bg-violet-500",
  },
  {
    id: "8",
    name: "Joe Sakic",
    number: "19",
    position: "F",
    status: "in",
    avatarColor: "bg-fuchsia-500",
  },
  {
    id: "9",
    name: "Nick Lidstrom",
    number: "5",
    position: "D",
    status: "in",
    avatarColor: "bg-yellow-500",
  },
  {
    id: "10",
    name: "Dominik Hasek",
    number: "39",
    position: "G",
    status: "maybe",
    avatarColor: "bg-red-500",
  },
  {
    id: "11",
    name: "Jaromir Jagr",
    number: "68",
    position: "F",
    status: "in",
    avatarColor: "bg-lime-500",
  },
  {
    id: "12",
    name: "Teemu Selanne",
    number: "8",
    position: "F",
    status: "in",
    avatarColor: "bg-sky-500",
  },
  {
    id: "13",
    name: "Paul Kariya",
    number: "9",
    position: "F",
    status: "in",
    avatarColor: "bg-teal-500",
  },
  {
    id: "14",
    name: "Chris Pronger",
    number: "44",
    position: "D",
    status: "in",
    avatarColor: "bg-stone-500",
  },
];

// --- Components ---

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

function AttendanceList({ players }: { players: Player[] }) {
  const going = players.filter((p) => p.status === "in");
  const maybe = players.filter((p) => p.status === "maybe");
  const out = players.filter((p) => p.status === "out");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
          Going ({going.length})
        </h3>
        {going.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 bg-card border rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback
                  className={cn("text-white font-bold", p.avatarColor)}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  #{p.number} • {p.position}
                </div>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              In
            </Badge>
          </div>
        ))}
      </div>

      {maybe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">
            Maybe ({maybe.length})
          </h3>
          {maybe.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 bg-card/50 border border-dashed rounded-xl"
            >
              <div className="flex items-center gap-3 opacity-70">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {p.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    #{p.number}
                  </div>
                </div>
              </div>
              <Badge variant="outline">Maybe</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Lines Logic & Components ---

type LineAssignment = Record<SlotId, string>; // slotId -> playerId

function LinesView({ players }: { players: Player[] }) {
  const [assignments, setAssignments] = useState<LineAssignment>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Filter only 'in' players for lines
  const availablePlayers = players.filter((p) => p.status === "in");

  // Computed
  const unassignedPlayers = availablePlayers.filter(
    (p) => !Object.values(assignments).includes(p.id)
  );

  const handlePlayerClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(playerId);
    }
  };

  const handleSlotClick = (e: React.MouseEvent, slotId: string) => {
    e.stopPropagation();

    // CASE 1: No player selected yet
    if (!selectedPlayerId) {
      // If slot has a player, select them (to move/swap)
      if (assignments[slotId]) {
        setSelectedPlayerId(assignments[slotId]);
      }
      return;
    }

    // CASE 2: Player is already selected

    // 2a. Tapping the same player/slot again -> Cancel selection
    if (assignments[slotId] === selectedPlayerId) {
      setSelectedPlayerId(null);
      return;
    }

    // 2b. Move or Swap
    setAssignments((prev) => {
      const next = { ...prev };

      // Find source slot of the currently selected player (if they are on the ice)
      const sourceSlotId = Object.keys(next).find(
        (key) => next[key] === selectedPlayerId
      );
      const targetPlayerId = next[slotId]; // Player currently in the target slot (if any)

      // 1. Remove selected player from source slot (if applicable)
      if (sourceSlotId) {
        delete next[sourceSlotId];
      }

      // 2. Place selected player in target slot
      next[slotId] = selectedPlayerId;

      // 3. If target was occupied AND source existed, swap target player to source
      // If source didn't exist (came from bench), target player just goes to bench (implicitly removed from map)
      if (targetPlayerId && sourceSlotId) {
        next[sourceSlotId] = targetPlayerId;
      }

      return next;
    });

    setSelectedPlayerId(null);
  };

  const handleBackgroundClick = () => {
    if (selectedPlayerId) {
      // If player was on the ice, remove them (send to bench)
      setAssignments((prev) => {
        const next = { ...prev };
        const sourceSlotId = Object.keys(next).find(
          (key) => next[key] === selectedPlayerId
        );

        if (sourceSlotId) {
          delete next[sourceSlotId];
        }
        return next;
      });

      // Always clear selection
      setSelectedPlayerId(null);
    }
  };

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 min-h-[60vh]"
      onClick={handleBackgroundClick}
    >
      {/* Bench / Unassigned */}
      <Card className="bg-muted/30 border-dashed border-2 overflow-hidden transition-colors hover:bg-muted/40">
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
                  key={player.id}
                  onClick={(e) => handlePlayerClick(e, player.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-full border transition-all text-sm font-medium shadow-sm",
                    selectedPlayerId === player.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 scale-105"
                      : "bg-background hover:border-primary/50 hover:scale-105"
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
                      player.position === "D"
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
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-rose-500" />
            Forwards
          </h3>
          <div className="space-y-3">
            {[1, 2, 3].map((lineNum) => (
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
                  {["LW", "C", "RW"].map((pos) => (
                    <Slot
                      key={`L${lineNum}-${pos}`}
                      id={`L${lineNum}-${pos}`}
                      label={pos}
                      assignment={assignments[`L${lineNum}-${pos}`]}
                      allPlayers={players}
                      isSelected={
                        assignments[`L${lineNum}-${pos}`] === selectedPlayerId
                      }
                      isTarget={
                        !!selectedPlayerId &&
                        assignments[`L${lineNum}-${pos}`] !== selectedPlayerId
                      }
                      onClick={(e) => handleSlotClick(e, `L${lineNum}-${pos}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Defense */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            Defense
          </h3>
          <div className="space-y-3">
            {[1, 2].map((pairNum) => (
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
                  {["LD", "RD"].map((pos) => (
                    <Slot
                      key={`D${pairNum}-${pos}`}
                      id={`D${pairNum}-${pos}`}
                      label={pos}
                      assignment={assignments[`D${pairNum}-${pos}`]}
                      allPlayers={players}
                      isSelected={
                        assignments[`D${pairNum}-${pos}`] === selectedPlayerId
                      }
                      isTarget={
                        !!selectedPlayerId &&
                        assignments[`D${pairNum}-${pos}`] !== selectedPlayerId
                      }
                      onClick={(e) => handleSlotClick(e, `D${pairNum}-${pos}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goalies */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            Goalies
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="w-6" /> {/* Spacer */}
            <div className="grid grid-cols-1 gap-2">
              <Slot
                id="G-1"
                label="STARTER"
                assignment={assignments["G-1"]}
                allPlayers={players}
                isSelected={assignments["G-1"] === selectedPlayerId}
                isTarget={
                  !!selectedPlayerId && assignments["G-1"] !== selectedPlayerId
                }
                onClick={(e) => handleSlotClick(e, "G-1")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slot({
  id,
  label,
  assignment,
  allPlayers,
  isSelected,
  isTarget,
  onClick,
}: {
  id: string;
  label: string;
  assignment?: string;
  allPlayers: Player[];
  isSelected: boolean;
  isTarget: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const assignedPlayer = assignment
    ? allPlayers.find((p) => p.id === assignment)
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[3/2] sm:aspect-[4/2] rounded-xl border-2 flex flex-col items-center justify-center p-2 cursor-pointer transition-all",
        // Empty state styles
        !assignedPlayer &&
          "border-dashed bg-muted/10 hover:bg-muted/20 border-border/50",
        // Target state (when holding a player)
        !assignedPlayer &&
          isTarget &&
          "border-primary/50 bg-primary/5 ring-2 ring-primary/20 animate-pulse",
        // Filled state
        assignedPlayer && "bg-card border-border shadow-sm",
        // Interactive hover
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      <div className="absolute top-1.5 left-2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest pointer-events-none">
        {label}
      </div>

      {assignedPlayer ? (
        <div className="flex flex-col items-center gap-1 w-full animate-in zoom-in-50 duration-200">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-background shadow-sm">
            <AvatarFallback
              className={cn(
                "text-white text-[10px] font-bold",
                assignedPlayer.avatarColor
              )}
            >
              {assignedPlayer.number}
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
            isTarget && "text-primary/40"
          )}
        />
      )}
    </div>
  );
}

// --- Main Page ---

export default function GameDetailsMockup() {
  const [view, setView] = useState<"attendance" | "lines">("lines");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">
      {/* Navbar Mock */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="-ml-2">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="font-bold text-lg">Game Details</div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Game Header Card */}
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="w-3 h-3" />
            {MOCK_GAME.status}
          </div>

          <h1 className="text-4xl font-black tracking-tighter leading-none">
            <span className="text-muted-foreground text-2xl font-bold block mb-1">
              VS
            </span>
            {MOCK_GAME.opponent}
          </h1>

          <div className="flex justify-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {MOCK_GAME.time}
            </div>
            <div className="w-px bg-border h-4 self-center" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {MOCK_GAME.location}
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
              <AttendanceList players={MOCK_PLAYERS} />
            </motion.div>
          ) : (
            <motion.div
              key="lines"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <LinesView players={MOCK_PLAYERS} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
