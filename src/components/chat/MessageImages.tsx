"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface MessageImage {
  fullUrl: string | null;
  thumbUrl: string | null;
  width: number;
  height: number;
}

interface MessageImagesProps {
  images: MessageImage[];
  isMe?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
}

/**
 * Renders images in a chat message with thumbnail grid and full-size lightbox.
 */
export function MessageImages({
  images,
  isMe = false,
  onLightboxOpenChange,
}: MessageImagesProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    onLightboxOpenChange?.(true);
    // Push history state so the browser back button can close the lightbox
    window.history.pushState({ imageLightbox: true }, "");
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    onLightboxOpenChange?.(false);
  }, [onLightboxOpenChange]);

  // When closing via overlay or close button, go back in history
  const handleCloseWithHistory = useCallback(() => {
    if (lightboxIndex !== null) {
      window.history.back();
    }
  }, [lightboxIndex]);

  // Handle browser back button to close the lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handlePopState = () => {
      closeLightbox();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [lightboxIndex, closeLightbox]);

  const goToPrevious = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  // Calculate grid layout based on image count
  const getGridClass = () => {
    switch (images.length) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2"; // 2 on top, 1 on bottom
      case 4:
        return "grid-cols-2";
      default:
        return "grid-cols-2";
    }
  };

  return (
    <>
      {/* Thumbnail grid */}
      <div className={cn("grid gap-1 mt-2", getGridClass())}>
        {images.map((img, index) => {
          // Calculate aspect ratio for proper sizing
          const aspectRatio = img.width / img.height;
          const isWide = aspectRatio > 1.2;
          const isTall = aspectRatio < 0.8;

          // For 3 images, make the last one span full width
          const spanFull = images.length === 3 && index === 2;

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(index);
              }}
              className={cn(
                "relative overflow-hidden rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
                spanFull && "col-span-2",
                // Size constraints
                images.length === 1 ? "max-w-[280px]" : "max-w-[140px]"
              )}
              style={{
                aspectRatio:
                  images.length === 1
                    ? `${img.width}/${img.height}`
                    : spanFull
                    ? "2/1"
                    : "1/1",
              }}
            >
              {img.thumbUrl ? (
                <img
                  src={img.thumbUrl}
                  alt={`Image ${index + 1}`}
                  className="size-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="size-full animate-pulse bg-muted" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox dialog */}
      <Dialog
        open={lightboxIndex !== null}
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
          <DialogTitle className="sr-only">
            Image {lightboxIndex !== null ? lightboxIndex + 1 : 1} of{" "}
            {images.length}
          </DialogTitle>

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

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-4 z-50 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
              {lightboxIndex !== null ? lightboxIndex + 1 : 1} / {images.length}
            </div>
          )}

          {/* Main image */}
          {lightboxIndex !== null && images[lightboxIndex] && (
            <div
              className="flex items-center justify-center min-h-[50vh] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {images[lightboxIndex].fullUrl ? (
                <img
                  src={images[lightboxIndex].fullUrl}
                  alt={`Image ${lightboxIndex + 1}`}
                  className="max-w-full max-h-[85vh] object-contain"
                />
              ) : (
                <div className="size-64 animate-pulse bg-muted rounded-lg" />
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {images.length > 1 && lightboxIndex !== null && (
            <>
              {lightboxIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <svg
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              {lightboxIndex < images.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <svg
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
