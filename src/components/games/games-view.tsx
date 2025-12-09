"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Plus, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">(() => {
    const urlTab = searchParams.get("tab");
    return urlTab === "past" ? "past" : "upcoming";
  });

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const normalized = urlTab === "past" ? "past" : "upcoming";
    if (normalized !== activeTab) {
      setActiveTab(normalized);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    const nextTab = value === "past" ? "past" : "upcoming";
    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "upcoming") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

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
    <div className="bg-background text-foreground font-sans px-4 sm:px-6">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between py-3 mb-2">
        {/* Season Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 text-base font-semibold px-2 -ml-2"
            >
              {seasonName}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {seasons?.map((season) => (
              <DropdownMenuItem
                key={season._id}
                onClick={() => onSeasonChange(season._id)}
                className={selectedSeasonId === season._id ? "bg-accent" : ""}
              >
                {season.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="https://skateeverblades.com/hockey/adult-hockey/adult-intermediate-c-2-league/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                View Standings
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stats Pill + Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">
              {seasonStats?.record || "0-0-0"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {seasonStats?.points ?? 0} pts
            </span>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Game</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-3"
      >
        <TabsList className="grid w-full grid-cols-2 p-1 bg-secondary/50 rounded-xl h-10">
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
            Past
          </TabsTrigger>
        </TabsList>

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
