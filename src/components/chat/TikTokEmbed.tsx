"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TikTokEmbedProps {
  videoId: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  isMe?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
}

/**
 * TikTok video embed with lightbox playback.
 * Shows thumbnail in chat, opens fullscreen dialog on click.
 */
export function TikTokEmbed({
  videoId,
  thumbnailUrl,
  title,
  description,
  isMe = false,
  onLightboxOpenChange,
}: TikTokEmbedProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    onLightboxOpenChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onLightboxOpenChange?.(false);
  };

  return (
    <>
      {/* Thumbnail button */}
      <button
        onClick={handleOpen}
        className={cn(
          "relative w-full overflow-hidden rounded-lg group cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        style={{ aspectRatio: "9/16", maxHeight: "280px" }}
        aria-label={`Play TikTok video: ${title || "TikTok video"}`}
      >
        {/* Thumbnail */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title || "TikTok video thumbnail"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 w-full h-full",
              isMe ? "bg-primary-foreground/20" : "bg-muted"
            )}
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-black/50 backdrop-blur-sm",
              "group-hover:bg-black/70 group-hover:scale-110 transition-all duration-200"
            )}
          >
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>

        {/* TikTok branding */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm">
            <TikTokIcon className="w-4 h-4" />
            <span className="text-xs font-medium text-white">TikTok</span>
          </div>
        </div>

        {/* Title/description at bottom */}
        {(title || description) && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {title && (
              <p className="text-sm font-medium text-white line-clamp-2 text-left">
                {title}
              </p>
            )}
            {description && (
              <p className="text-xs text-white/80 mt-0.5 text-left">
                {description}
              </p>
            )}
          </div>
        )}
      </button>

      {/* Lightbox dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-[400px] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {title || "TikTok video"}
          </DialogTitle>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {/* TikTok iframe */}
          <div
            className="relative w-full"
            style={{ aspectRatio: "9/16", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              allow="encrypted-media"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * TikTok logo icon
 */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}
