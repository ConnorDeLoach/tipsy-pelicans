"use client";

import { cn } from "@/lib/utils";

export type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

interface ReactionChipsProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  /** Whether this message belongs to the current user (affects chip styling) */
  isMe?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Displays reaction chips below a message bubble.
 * Clicking a chip toggles the current user's reaction.
 */
export function ReactionChips({
  reactions,
  onToggle,
  isMe = false,
  disabled = false,
  className,
}: ReactionChipsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1.5", className)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(r.emoji);
          }}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors",
            r.reactedByMe
              ? isMe
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary ring-1 ring-primary/30"
              : isMe
              ? "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20"
              : "bg-muted-foreground/10 text-foreground/80 hover:bg-muted-foreground/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`${r.reactedByMe ? "Remove" : "Add"} ${r.emoji} reaction`}
          aria-pressed={r.reactedByMe}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="font-medium tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  );
}
