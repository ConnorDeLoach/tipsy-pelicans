"use client";

import { useMemo } from "react";
import {
  parseMessageContent,
  type MessageSegment,
} from "@/lib/parseMessageContent";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  body: string;
  /** Whether this is the current user's message (affects link styling) */
  isMe?: boolean;
  className?: string;
}

/**
 * Renders message content with parsed segments (links, text, etc.).
 * Memoizes parsing to avoid re-parsing on every render.
 */
export function MessageContent({
  body,
  isMe = false,
  className,
}: MessageContentProps) {
  const segments = useMemo(() => parseMessageContent(body), [body]);

  if (segments.length === 0) return null;

  return (
    <p className={cn("whitespace-pre-wrap break-words text-sm", className)}>
      {segments.map((segment, index) => (
        <MessageSegmentRenderer key={index} segment={segment} isMe={isMe} />
      ))}
    </p>
  );
}

interface SegmentRendererProps {
  segment: MessageSegment;
  isMe: boolean;
}

/**
 * Renders a single segment based on its type.
 * Extensible - add cases for new segment types as needed.
 */
function MessageSegmentRenderer({ segment, isMe }: SegmentRendererProps) {
  switch (segment.type) {
    case "text":
      return <>{segment.content}</>;

    case "link":
      return (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline underline-offset-2 transition-colors",
            isMe
              ? "text-primary-foreground/90 hover:text-primary-foreground"
              : "text-primary hover:text-primary/80"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {segment.text}
        </a>
      );

    default:
      // Type guard for future segment types
      const _exhaustiveCheck: never = segment;
      return null;
  }
}
