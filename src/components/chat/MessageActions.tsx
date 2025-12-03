"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { REACTION_EMOJIS } from "./ReactionPicker";

interface MessageActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReact: (emoji: string) => void;
  onDelete?: () => void;
  /** Whether this message belongs to the current user (affects styling) */
  isMe?: boolean;
  children: React.ReactNode;
}

/**
 * A popover action menu for messages (mobile-first).
 * Shows emoji reactions and optionally a delete button.
 */
export function MessageActions({
  open,
  onOpenChange,
  onReact,
  onDelete,
  isMe = false,
  children,
}: MessageActionsProps) {
  const handleReact = (emoji: string) => {
    onReact(emoji);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.();
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align={isMe ? "end" : "start"}
        className="w-auto p-1.5"
        sideOffset={8}
      >
        <div className="flex items-center gap-0.5">
          {/* Emoji reactions */}
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReact(emoji)}
              className="p-1.5 text-lg hover:bg-muted rounded transition-colors"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          {/* Delete button */}
          {onDelete && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                aria-label="Delete message"
              >
                <Trash2 className="size-5" />
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
