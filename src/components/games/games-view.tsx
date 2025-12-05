"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Trophy, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateGameDialog, GameFormData } from "./create-game-dialog";
import { GameCardModern } from "./game-card-modern";
import type {
  GameWithRsvps,
  Player,
  Me,
  Opponent,
  SeasonStats,
  Season,
} from "@/features/games/types";
import { Id } from "@/convex/_generated/dataModel";
import { EnablePushButton } from "@/components/EnablePushButton";
import { useSwipeHint } from "@/hooks/use-swipe-hint";

type RsvpStatus = "in" | "out";

interface GamesViewProps {
  upcomingGames: GameWithRsvps[];
  pastGames: GameWithRsvps[];
  players: Player[] | undefined;
  opponents: Opponent[] | undefined;
  me: Me | null;
  isAdmin: boolean;
  filteredPlayers?: Player[];
  orderedPlayers?: Player[];
  onRsvp: (
    gameId: Id<"games">,
    playerId: Id<"players">,
    status: RsvpStatus
  ) => void;
  onCreateGame: (data: GameFormData) => Promise<void>;
  onUpdateGame: (gameId: Id<"games">, data: GameFormData) => Promise<void>;
  onDeleteGame: (gameId: Id<"games">) => Promise<void>;
  // Season props
  seasons?: Season[];
  selectedSeasonId: Id<"seasons"> | null;
  onSeasonChange: (seasonId: Id<"seasons"> | null) => void;
  seasonStats?: SeasonStats;
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function GamesView({
  upcomingGames,
  pastGames,
  players,
  opponents,
  me,
  isAdmin,
  filteredPlayers,
  onRsvp,
  onCreateGame,
  onUpdateGame,
  onDeleteGame,
  seasons,
  selectedSeasonId,
  onSeasonChange,
  seasonStats,
}: GamesViewProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithRsvps | null>(null);

  // Swipe hint for first-time admin users on mobile
  const { shouldShowHint, markAsSwiped } = useSwipeHint(isAdmin);

  const handleEdit = (game: GameWithRsvps) => {
    setEditingGame(game);
  };

  const closeEdit = () => {
    setEditingGame(null);
  };

  // Get active season name
  const currentSeason = seasons?.find((s) => s._id === selectedSeasonId);
  const seasonName = currentSeason ? currentSeason.name : "All Seasons";

  return (
    <div className="bg-background text-foreground font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient text-primary-foreground pb-16 pt-8 px-4 sm:px-6 lg:px-8 rounded-3xl shadow-xl mb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
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
                {seasonName} · Hertz Arena
              </p>
            </div>

            {/* Stats Summary Card - always render to prevent CLS */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-6 shadow-lg min-h-[72px]">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {seasonStats?.record || "0-0-0"}
                </div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Record
                </div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {seasonStats?.points ?? 0}
                </div>
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Points
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-start">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-blue-50 hover:bg-white/20 hover:text-white"
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
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 -mt-8 relative z-10">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-4 sm:p-6 mb-10">
          {/* Season Selector */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {seasons?.map((season) => (
                <button
                  key={season._id}
                  onClick={() => onSeasonChange(season._id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${
                      selectedSeasonId === season._id
                        ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20 scale-105"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}
                >
                  {season.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Game
                </Button>
              )}
              <EnablePushButton />
            </div>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <div className="flex justify-between items-center">
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
            </div>

            <TabsContent value="upcoming" className="mt-0 min-h-[200px]">
              <motion.div
                key={`upcoming-${selectedSeasonId}`}
                variants={containerVariants}
                initial={false}
                animate="visible"
                className="flex flex-col gap-4"
              >
                {upcomingGames.length > 0 ? (
                  upcomingGames.map((entry, index) => (
                    <GameCardModern
                      key={entry.game._id}
                      entry={entry}
                      players={filteredPlayers || players || []}
                      me={me}
                      isAdmin={isAdmin}
                      onRsvp={onRsvp}
                      onEdit={handleEdit}
                      isPast={false}
                      showSwipeHint={index === 0 && shouldShowHint}
                      onSwipeUsed={markAsSwiped}
                    />
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No upcoming games scheduled.
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="past" className="mt-0 min-h-[200px]">
              <motion.div
                key={`past-${selectedSeasonId}`}
                variants={containerVariants}
                initial={false}
                animate="visible"
                className="flex flex-col gap-4"
              >
                {pastGames.length > 0 ? (
                  pastGames.map((entry) => (
                    <GameCardModern
                      key={entry.game._id}
                      entry={entry}
                      players={filteredPlayers || players || []}
                      me={me}
                      isAdmin={isAdmin}
                      onRsvp={onRsvp}
                      onEdit={handleEdit}
                      isPast={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No past games recorded.
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateGameDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={onCreateGame}
        opponents={opponents}
        mode="create"
      />

      <CreateGameDialog
        open={!!editingGame}
        onOpenChange={(open) => !open && closeEdit()}
        onSubmit={async (data) => {
          if (editingGame) {
            await onUpdateGame(editingGame.game._id, data);
            closeEdit();
          }
        }}
        onDelete={
          editingGame
            ? async () => {
                await onDeleteGame(editingGame.game._id);
                closeEdit();
              }
            : undefined
        }
        opponents={opponents}
        initialData={
          editingGame
            ? {
                opponentId: (editingGame.game as any).opponentId,
                startTime: editingGame.game.startTime,
                location: editingGame.game.location,
                notes: editingGame.game.notes,
                visibility: (editingGame.game as any).visibility ?? "public",
                teamScore: (editingGame.game as any).teamScore,
                opponentScore: (editingGame.game as any).opponentScore,
              }
            : undefined
        }
        mode="edit"
      />
    </div>
  );
}
