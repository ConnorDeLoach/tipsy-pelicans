"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { ImagePicker, type PendingImage } from "@/components/chat/ImagePicker";
import { type Me } from "@/hooks/use-chat";
import {
  useLayoutEffect,
  type MutableRefObject,
  type FormEvent,
  type KeyboardEvent,
} from "react";

export type ChatComposerProps = {
  me: Me;
  body: string;
  isSending: boolean;
  hasImages: boolean;
  allReady: boolean;
  pendingImages: PendingImage[];
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  onBodyChange: (value: string) => void;
  onImagesChange: (images: PendingImage[]) => void;
  onSend: (
    e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>
  ) => void;
};

export function ChatComposer({
  me,
  body,
  isSending,
  hasImages,
  allReady,
  pendingImages,
  textareaRef,
  onBodyChange,
  onImagesChange,
  onSend,
}: ChatComposerProps) {
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight || "0") || 0;
    const maxLines = 8;
    const maxHeight = lineHeight > 0 ? lineHeight * maxLines : 0;

    const fullHeight = el.scrollHeight;
    const nextHeight =
      maxHeight > 0 ? Math.min(fullHeight, maxHeight) : fullHeight;

    el.style.height = `${nextHeight}px`;
    if (maxHeight > 0 && fullHeight > maxHeight) {
      el.style.overflowY = "auto";
    } else {
      el.style.overflowY = "hidden";
    }
  }, [body, textareaRef]);

  return (
    <>
      {/* Composer */}
      <form onSubmit={onSend} className="mt-4 space-y-2">
        <div className="flex gap-2 items-end">
          <ImagePicker
            images={pendingImages}
            onImagesChange={onImagesChange}
            disabled={isSending || !me}
          />
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(e);
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            disabled={!me}
            maxLength={2000}
          />
          <Button
            type="submit"
            disabled={
              isSending ||
              (!body.trim() && !hasImages) ||
              (hasImages && !allReady) ||
              !me
            }
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
      {body.length >= 1500 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length}/2000 characters
        </p>
      )}
    </>
  );
}
