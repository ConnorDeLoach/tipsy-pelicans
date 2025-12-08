"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useBackButtonClose } from "@/hooks/use-back-button-close";

export interface MessageGifData {
  tenorId: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
}

interface MessageGifProps {
  gif: MessageGifData;
  isMe?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
}

/**
 * Renders a GIF in a chat message with thumbnail and full-size lightbox.
 */
export function MessageGif({
  gif,
  isMe = false,
  onLightboxOpenChange,
}: MessageGifProps) {
  const [showLightbox, setShowLightbox] = useState(false);

  const openLightbox = () => {
    setShowLightbox(true);
    onLightboxOpenChange?.(true);
    // Push history state so the browser back button can close the lightbox
  };

  const closeLightbox = useCallback(() => {
    setShowLightbox(false);
    onLightboxOpenChange?.(false);
  }, [onLightboxOpenChange]);

  // Handle browser back button to close the lightbox
  const { closeWithHistory } = useBackButtonClose({
    open: showLightbox,
    onClose: closeLightbox,
    stateKey: "gifLightbox",
  });

  // When closing via overlay or close button, go back in history
  const handleCloseWithHistory = useCallback(() => {
    closeWithHistory();
  }, [closeWithHistory]);

  return (
    <>
      {/* GIF thumbnail */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openLightbox();
        }}
        className="relative inline-block overflow-hidden rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring hover:opacity-90 transition-opacity max-w-full mt-2"
      >
        <img
          src={gif.url}
          alt="GIF"
          className="block max-w-full h-auto"
          loading="lazy"
        />
        {/* GIF badge */}
        <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[10px] font-bold bg-black/60 text-white rounded">
          GIF
        </span>
      </button>

      {/* Lightbox dialog */}
      <Dialog
        open={showLightbox}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseWithHistory();
          }
        }}
      >
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">GIF</DialogTitle>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCloseWithHistory();
            }}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {/* Full-size GIF */}
          <div
            className="flex items-center justify-center min-h-[50vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={gif.url}
              alt="GIF"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
