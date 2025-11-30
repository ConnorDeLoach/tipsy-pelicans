import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EnablePushButton } from "@/components/EnablePushButton";
import { GameList } from "./game-list";
import { CreateGameDialog, GameFormData } from "./create-game-dialog";
import {
  GameWithRsvps,
  Player,
  Me,
  Opponent,
} from "@/app/(dashboard)/games/actions";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

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
}

export function GamesView({
  upcomingGames,
  pastGames,
  players,
  opponents,
  me,
  isAdmin,
  filteredPlayers,
  orderedPlayers,
  onRsvp,
  onCreateGame,
  onUpdateGame,
  onDeleteGame,
}: GamesViewProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithRsvps | null>(null);

  const handleEdit = (game: GameWithRsvps) => {
    setEditingGame(game);
  };

  const closeEdit = () => {
    setEditingGame(null);
  };

  return (
    <div className="px-4 lg:px-6">
      <Tabs defaultValue="upcoming" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <EnablePushButton />
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Add game
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          <GameList
            games={upcomingGames}
            isAdmin={isAdmin}
            me={me}
            onEdit={handleEdit}
            onRsvp={onRsvp}
            filteredPlayers={filteredPlayers}
            orderedPlayers={orderedPlayers}
            emptyMessage="No upcoming games scheduled."
            expanded={true}
          />
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <GameList
            games={pastGames}
            isAdmin={isAdmin}
            me={me}
            onEdit={handleEdit}
            onRsvp={onRsvp}
            filteredPlayers={filteredPlayers}
            orderedPlayers={orderedPlayers}
            emptyMessage="No past games."
            expanded={false}
          />
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
