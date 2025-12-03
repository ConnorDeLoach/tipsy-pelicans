"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  compressImage,
  getPreviewUrl,
  revokePreviewUrl,
  validateImageCount,
  type CompressedImage,
  type CompressionError,
} from "@/lib/imageCompression";

const MAX_IMAGES = 4;

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  compressed?: CompressedImage;
  status: "pending" | "compressing" | "ready" | "error";
  error?: string;
}

interface ImagePickerProps {
  images: PendingImage[];
  onImagesChange: (images: PendingImage[]) => void;
  disabled?: boolean;
}

export function ImagePicker({
  images,
  onImagesChange,
  disabled = false,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Clear the input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      // Validate total count
      const totalCount = images.length + files.length;
      const validation = validateImageCount(
        Array(totalCount).fill(null) as File[],
        MAX_IMAGES
      );
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      setIsProcessing(true);

      // Create pending image entries
      const newImages: PendingImage[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: getPreviewUrl(file),
        status: "pending" as const,
      }));

      // Add new images in pending state
      onImagesChange([...images, ...newImages]);

      // Process each image
      const processedImages = await Promise.all(
        newImages.map(async (img) => {
          try {
            // Update status to compressing
            img.status = "compressing";

            const compressed = await compressImage(img.file);

            return {
              ...img,
              compressed,
              status: "ready" as const,
            };
          } catch (err) {
            const error = err as CompressionError;

            // Show toast for GIF error
            if (error.type === "gif") {
              toast.error(error.message);
            } else if (error.type === "format") {
              toast.error(error.message);
            } else if (error.type === "size") {
              toast.error(error.message);
            } else {
              toast.error(error.message || "Failed to process image");
            }

            return {
              ...img,
              status: "error" as const,
              error: error.message,
            };
          }
        })
      );

      // Update with processed images (filter out errors)
      const successfulImages = processedImages.filter(
        (img) => img.status === "ready"
      );
      const existingImages = images.filter(
        (img) => !newImages.some((n) => n.id === img.id)
      );

      // Clean up preview URLs for failed images
      processedImages
        .filter((img) => img.status === "error")
        .forEach((img) => revokePreviewUrl(img.previewUrl));

      onImagesChange([...existingImages, ...successfulImages]);
      setIsProcessing(false);
    },
    [images, onImagesChange]
  );

  const removeImage = useCallback(
    (id: string) => {
      const img = images.find((i) => i.id === id);
      if (img) {
        revokePreviewUrl(img.previewUrl);
      }
      onImagesChange(images.filter((i) => i.id !== id));
    },
    [images, onImagesChange]
  );

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="flex items-center gap-2">
      {/* Selected images preview */}
      {images.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative size-12 rounded-md overflow-hidden bg-muted border"
            >
              <img
                src={img.previewUrl}
                alt="Preview"
                className="size-full object-cover"
              />
              {img.status === "compressing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                disabled={disabled || isProcessing}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add image button */}
      {canAddMore && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isProcessing}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="shrink-0"
            title={`Add image (${images.length}/${MAX_IMAGES})`}
          >
            {isProcessing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Hook for managing image picker state
 */
export function useImagePicker() {
  const [images, setImages] = useState<PendingImage[]>([]);

  const clearImages = useCallback(() => {
    images.forEach((img) => revokePreviewUrl(img.previewUrl));
    setImages([]);
  }, [images]);

  const allReady = images.every((img) => img.status === "ready");

  return {
    images,
    setImages,
    clearImages,
    allReady,
    hasImages: images.length > 0,
  };
}
