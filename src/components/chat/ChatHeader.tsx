"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export type ChatHeaderConversation =
  | {
      displayName: string;
    }
  | null
  | undefined;

export type ChatHeaderProps = {
  conversation: ChatHeaderConversation;
  onBack: () => void;
};

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2" onClick={onBack}>
          <ArrowLeft className="size-6" />
          <span className="sr-only">Back to messages</span>
        </Button>
        <div className="min-w-0 flex-1">
          {conversation ? (
            <h1 className="text-xl font-semibold truncate">
              {conversation.displayName}
            </h1>
          ) : (
            <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
          )}
        </div>
      </div>
    </>
  );
}
