"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send, ImagePlus } from "lucide-react";
import { ImagePicker, type PendingImage } from "@/components/chat/ImagePicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { type Me, type MessageGif } from "@/hooks/use-chat";
import { type TenorGif } from "@/lib/tenor";
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
  onSendGif: (gif: MessageGif) => void;
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
  onSendGif,
}: ChatComposerProps) {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
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

  // Convert TenorGif to MessageGif and send
  const handleGifSelect = (gif: TenorGif) => {
    onSendGif({
      tenorId: gif.id,
      url: gif.url,
      previewUrl: gif.previewUrl,
      width: gif.dims[0],
      height: gif.dims[1],
      previewWidth: gif.previewDims[0],
      previewHeight: gif.previewDims[1],
    });
    setGifPickerOpen(false);
  };

  // Show image picker only when not typing and no images selected
  const showImagePicker = !body.trim() && !hasImages;
  // Show send button when typing or has images
  const showSendButton = body.trim() || hasImages;

  return (
    <>
      {/* Composer */}
      <form onSubmit={onSend} className="mt-4 space-y-2">
        {/* Image previews row (if any) */}
        {hasImages && (
          <ImagePicker
            images={pendingImages}
            onImagesChange={onImagesChange}
            disabled={isSending || !me}
            showButton={false}
          />
        )}

        <div className="flex gap-2 items-end">
          {/* GIF picker on left */}
          <GifPicker
            disabled={isSending || !me}
            onSelect={handleGifSelect}
            open={gifPickerOpen}
            onOpenChange={setGifPickerOpen}
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

          {/* Right side: Image picker OR Send button */}
          {showImagePicker && (
            <ImagePicker
              images={pendingImages}
              onImagesChange={onImagesChange}
              disabled={isSending || !me}
              showButton={true}
              showPreviews={false}
            />
          )}

          {showSendButton && (
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
          )}
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
