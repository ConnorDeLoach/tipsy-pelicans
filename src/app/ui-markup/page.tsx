"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  Shield,
  Swords,
  Goal,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Mock Data
const MOCK_PLAYERS = [
  {
    _id: "1",
    name: "Connor DeLoach",
    number: "88",
    position: "C",
    role: "player",
    flair: "Captain",
    email: "connor@example.com",
    isAdmin: true,
  },
  {
    _id: "2",
    name: "Wayne Gretzky",
    number: "99",
    position: "C",
    role: "player",
    flair: "The Great One",
    email: "wayne@example.com",
    isAdmin: false,
  },
  {
    _id: "3",
    name: "Mario Lemieux",
    number: "66",
    position: "C",
    role: "player",
    flair: "Super Mario",
    email: "mario@example.com",
    isAdmin: false,
  },
  {
    _id: "4",
    name: "Patrick Roy",
    number: "33",
    position: "G",
    role: "player",
    flair: "Wall",
    email: "patrick@example.com",
    isAdmin: false,
  },
  {
    _id: "5",
    name: "Bobby Orr",
    number: "4",
    position: "LD",
    role: "player",
    flair: "Legend",
    email: "bobby@example.com",
    isAdmin: false,
  },
  {
    _id: "6",
    name: "Doug Glatt",
    number: "69",
    position: "LW",
    role: "spare",
    flair: "Enforcer",
    email: "doug@example.com",
    isAdmin: false,
  },
  {
    _id: "7",
    name: "Happy Gilmore",
    number: "18",
    position: "RD",
    role: "spectator",
    flair: "Shooter",
    email: "happy@example.com",
    isAdmin: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

function PlayerCard({ player, isAdmin }: { player: any; isAdmin: boolean }) {
  // Get initials for avatar
  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determine role icon/color
  let RoleIcon = Users;
  let roleColor =
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

  if (player.position === "G") {
    RoleIcon = Shield;
    roleColor =
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  } else if (["LD", "RD"].includes(player.position)) {
    RoleIcon = Shield;
    roleColor =
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  } else if (["LW", "RW", "C"].includes(player.position)) {
    RoleIcon = Swords;
    roleColor =
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  }

  const isSpare = player.role === "spare";
  const isSpectator = player.role === "spectator";

  return (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-300 group relative">
        <CardContent className="p-0">
          <div className="flex flex-row h-full">
            {/* Number Strip - Fixed Column */}
            <div className="flex flex-col justify-center items-center bg-secondary/30 p-3 w-16 sm:w-20 border-r border-border/40 gap-2 shrink-0">
              <div className="text-2xl font-black text-foreground/20 group-hover:text-primary/20 transition-colors">
                {player.number || "—"}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center gap-1">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarFallback className={`font-bold ${roleColor}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-foreground leading-none">
                      {player.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 font-medium uppercase tracking-wide"
                      >
                        {player.position || "N/A"}
                      </Badge>
                      {player.flair && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {player.flair}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Status indicators for non-regular players */}
          {(isSpare || isSpectator) && (
            <div className="absolute top-0 right-0 px-2 py-1 bg-muted/80 text-[10px] font-bold uppercase text-muted-foreground rounded-bl-lg backdrop-blur-sm">
              {player.role}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function RosterMockPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const isAdmin = true; // Toggle to test admin view

  // Stats
  const totalPlayers = MOCK_PLAYERS.filter((p) => p.role === "player").length;
  const spares = MOCK_PLAYERS.filter((p) => p.role === "spare").length;
  const goalies = MOCK_PLAYERS.filter((p) => p.position === "G").length;

  // Filter
  const filteredPlayers = MOCK_PLAYERS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.number.includes(searchTerm) ||
      (p.flair && p.flair.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeRoster = filteredPlayers.filter((p) => p.role === "player");
  const otherPlayers = filteredPlayers.filter((p) => p.role !== "player");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient text-primary-foreground pb-20 pt-8 px-4 sm:px-6 lg:px-8 rounded-b-[3rem] shadow-xl mb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-100 tracking-wide uppercase">
                  Team Roster
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                Tipsy Pelicans
              </h1>
              <p className="text-blue-100 text-lg max-w-md">
                2024-2025 Season · Intermediate C
              </p>
            </div>

            {/* Stats Summary Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-6 shadow-lg min-w-[280px] justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {totalPlayers}
                </div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Active
                </div>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{goalies}</div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Goalies
                </div>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{spares}</div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Spares
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-4 sm:p-6 mb-10">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-9 bg-secondary/50 border-border/50 focus:bg-background transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isAdmin && (
              <Button className="w-full sm:w-auto shadow-md shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" /> Add Player
              </Button>
            )}
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-secondary/50 rounded-xl">
              <TabsTrigger
                value="active"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              >
                Active Roster
              </TabsTrigger>
              <TabsTrigger
                value="other"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Subs & Spares
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {activeRoster.length > 0 ? (
                  activeRoster.map((player) => (
                    <PlayerCard
                      key={player._id}
                      player={player}
                      isAdmin={isAdmin}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No active players found matching your search.
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="other" className="mt-0">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {otherPlayers.length > 0 ? (
                  otherPlayers.map((player) => (
                    <PlayerCard
                      key={player._id}
                      player={player}
                      isAdmin={isAdmin}
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
        </div>
      </div>
    </div>
  );
}
