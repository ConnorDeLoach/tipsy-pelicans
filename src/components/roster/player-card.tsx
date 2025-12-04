"use client";

import { motion } from "motion/react";
import {
  Users,
  Shield,
  Swords,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Player } from "@/features/games/types";
import { Id } from "@/convex/_generated/dataModel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLongPress } from "@/hooks/use-long-press";

interface PlayerCardProps {
  player: Player;
  isAdmin: boolean;
  onEdit: (player: Player) => void;
  onDelete: (playerId: Id<"players">) => void;
}

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

export function PlayerCard({
  player,
  isAdmin,
  onEdit,
  onDelete,
}: PlayerCardProps) {
  // Get initials for avatar
  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determine role icon/color
  let roleColor =
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

  if (player.position === "G") {
    roleColor =
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  } else if (player.position && ["LD", "RD"].includes(player.position)) {
    roleColor =
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  } else if (player.position && ["LW", "RW", "C"].includes(player.position)) {
    roleColor =
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  }

  const isSpare = player.role === "spare";
  const isSpectator = player.role === "spectator";

  const isMobile = useIsMobile();

  const { isPressing, handlers: longPressHandlers } = useLongPress({
    onLongPress: () => {
      if (isAdmin && isMobile) {
        onEdit(player);
      }
    },
    threshold: 600,
    disabled: !isMobile || !isAdmin,
  });

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
              <div
                className={`flex justify-between items-start gap-2 transition-transform duration-150 ${
                  isMobile && isAdmin && isPressing ? "scale-[0.97]" : ""
                }`}
                {...(isMobile && isAdmin ? longPressHandlers : {})}
              >
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

                {isAdmin && !isMobile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2 -mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(player)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(player._id)}
                      >
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
