"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  MapPin,
  Trophy,
  Clock,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Share2,
  Check,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// --- Mock Data ---

const MOCK_SEASONS = [
  { id: "s1", name: "Winter 2025", current: true },
  { id: "s2", name: "Fall 2024", current: false },
  { id: "s3", name: "Summer 2024", current: false },
];

const MOCK_STATS = {
  record: "8-2-1",
  points: 17,
  streak: "W3",
  goalsFor: 42,
  goalsAgainst: 28,
};

const MOCK_GAMES = [
  {
    id: "g1",
    date: new Date(2025, 11, 5, 20, 30),
    opponent: "Puck Hogs",
    location: "Hertz Arena - Rec Rink",
    status: "upcoming",
    rsvp: "in", // in, out, pending
    attending: 12,
  },
  {
    id: "g2",
    date: new Date(2025, 11, 12, 21, 45),
    opponent: "Zamboni Drivers",
    location: "Hertz Arena - USA Rink",
    status: "upcoming",
    rsvp: "pending",
    attending: 8,
  },
  {
    id: "g3",
    date: new Date(2025, 11, 19, 19, 15),
    opponent: "Ice Breakers",
    location: "Hertz Arena - Rec Rink",
    status: "upcoming",
    rsvp: "out",
    attending: 14,
  },
  {
    id: "g4",
    date: new Date(2025, 10, 28, 20, 0),
    opponent: "Net Rippers",
    location: "Hertz Arena - USA Rink",
    status: "past",
    score: { us: 5, them: 2 },
    result: "win",
  },
  {
    id: "g5",
    date: new Date(2025, 10, 21, 21, 15),
    opponent: "Blade Runners",
    location: "Hertz Arena - Rec Rink",
    status: "past",
    score: { us: 3, them: 4 },
    result: "loss",
  },
];

const MOCK_PLAYERS = [
  { id: "p1", name: "Connor DeLoach", status: "in", avatar: "CD" },
  { id: "p2", name: "Wayne Gretzky", status: "in", avatar: "WG" },
  { id: "p3", name: "Bobby Orr", status: "in", avatar: "BO" },
  { id: "p4", name: "Mario Lemieux", status: "out", avatar: "ML" },
  { id: "p5", name: "Gordie Howe", status: "pending", avatar: "GH" },
  { id: "p6", name: "Sidney Crosby", status: "in", avatar: "SC" },
  { id: "p7", name: "Alex Ovechkin", status: "in", avatar: "AO" },
  { id: "p8", name: "Connor McDavid", status: "in", avatar: "CM" },
  { id: "p9", name: "Auston Matthews", status: "out", avatar: "AM" },
  { id: "p10", name: "Nathan MacKinnon", status: "in", avatar: "NM" },
  { id: "p11", name: "Cale Makar", status: "in", avatar: "CM" },
  { id: "p12", name: "Leon Draisaitl", status: "pending", avatar: "LD" },
];

// --- Components ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
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

function RosterDrawer({ game }: { game: (typeof MOCK_GAMES)[0] }) {
  const inPlayers = MOCK_PLAYERS.filter((p) => p.status === "in");
  const outPlayers = MOCK_PLAYERS.filter((p) => p.status === "out");
  const pendingPlayers = MOCK_PLAYERS.filter((p) => p.status === "pending");

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="flex items-center -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
          {inPlayers.slice(0, 3).map((p, i) => (
            <Avatar
              key={i}
              className="inline-block border-2 border-background h-6 w-6"
            >
              <AvatarFallback className="text-[10px] bg-secondary">
                {p.avatar}
              </AvatarFallback>
            </Avatar>
          ))}
          <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-background bg-secondary text-[10px] font-medium text-muted-foreground z-10">
            +{inPlayers.length - 3}
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Roster
            </DrawerTitle>
            <DrawerDescription>
              {game.opponent} · {game.date.toLocaleDateString()}
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
                  {inPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {player.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  Pending ({pendingPlayers.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {pendingPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-bold">
                          {player.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground">
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Out */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-lg">
                  <XCircle className="h-4 w-4" />
                  Out ({outPlayers.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {outPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors opacity-60"
                    >
                      <Avatar className="h-8 w-8 grayscale">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-bold">
                          {player.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground line-through decoration-border">
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter>
            <Button variant="outline">Manage Roster</Button>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function GameCard({ game }: { game: (typeof MOCK_GAMES)[0] }) {
  return (
    <motion.div variants={itemVariants} layout>
      <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-300 group">
        <CardContent className="p-0">
          <div className="flex flex-row h-full">
            {/* Time & Date Strip - Fixed Column */}
            <div className="flex flex-col justify-center items-center bg-secondary/30 p-3 w-20 sm:w-24 border-r border-border/40 gap-2 shrink-0">
              <GameDateBadge date={game.date} />
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center justify-center gap-1 bg-background px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-border/50 shadow-sm whitespace-nowrap w-full">
                <Clock className="h-3 w-3 hidden sm:block" />
                {game.date.toLocaleTimeString("en-US", {
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
                </div>
                <div className="shrink-0">
                  {game.status === "past" && (
                    <ResultBadge result={game.result!} score={game.score!} />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 sm:mt-2">
                {/* Roster on Left */}
                <div className="flex items-center gap-3">
                  {game.status === "upcoming" && <RosterDrawer game={game} />}
                </div>

                {/* Actions on Right (Desktop) or Bottom Right (Mobile) */}
                {game.status === "upcoming" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={game.rsvp === "in" ? "default" : "outline"}
                      className={`h-8 px-3 ${
                        game.rsvp === "in"
                          ? "bg-green-600 hover:bg-green-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Check className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">In</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={game.rsvp === "out" ? "destructive" : "outline"}
                      className={`h-8 px-3 ${
                        game.rsvp === "out" ? "" : "text-muted-foreground"
                      }`}
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
  );
}

export default function MockupGamesView() {
  const [activeSeason, setActiveSeason] = React.useState(MOCK_SEASONS[0]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient text-primary-foreground pb-16 pt-12 px-4 sm:px-6 lg:px-8 rounded-b-[2.5rem] shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
                  {/* Icon placeholder */}
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-100 tracking-wide uppercase">
                  Official Schedule
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                Tipsy Pelicans
              </h1>
              <p className="text-blue-100 text-lg max-w-md">
                Winter 2025 Season · Hertz Arena
              </p>
            </div>

            {/* Stats Summary Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-6 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {MOCK_STATS.record}
                </div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Record
                </div>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {MOCK_STATS.points}
                </div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Points
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-6 mb-10">
          {/* Season Selector */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {MOCK_SEASONS.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setActiveSeason(season)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${
                      activeSeason.id === season.id
                        ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20 scale-105"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}
                >
                  {season.name}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hidden sm:flex"
              asChild
            >
              <a
                href="https://skateeverblades.com/hockey/adult-hockey/adult-intermediate-c-2-league/"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Standings <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-secondary/50 rounded-xl">
              <TabsTrigger
                value="upcoming"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Past Games
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
              >
                <div className="text-sm text-muted-foreground font-medium px-1">
                  Next up
                </div>
                {MOCK_GAMES.filter((g) => g.status === "upcoming").map(
                  (game) => (
                    <GameCard key={game.id} game={game} />
                  )
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
              >
                <div className="text-sm text-muted-foreground font-medium px-1">
                  Season History
                </div>
                {MOCK_GAMES.filter((g) => g.status === "past").map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center text-sm text-muted-foreground pb-10">
          <p>© 2025 Tipsy Pelicans Hockey Club</p>
        </div>
      </div>
    </div>
  );
}
