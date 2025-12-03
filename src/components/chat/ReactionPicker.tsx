"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Must match ALLOWED_EMOJIS in convex/chat/reactions.ts
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  /** Whether this message belongs to the current user (affects button styling) */
  isMe?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A small popover with preset emoji reactions.
 * Shows a + button that opens a horizontal row of emojis.
 */
export function ReactionPicker({
  onSelect,
  isMe = false,
  disabled = false,
  className,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-center rounded-full p-1 transition-colors",
            isMe
              ? "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          aria-label="Add reaction"
        >
          <Plus className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-1.5 flex gap-0.5"
        sideOffset={8}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSelect(emoji)}
            className="p-1.5 text-lg hover:bg-muted rounded transition-colors"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
