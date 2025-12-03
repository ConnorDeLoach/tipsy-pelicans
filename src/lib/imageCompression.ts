/**
 * Client-side image compression utility for chat images.
 *
 * Converts images to WebP format with two variants:
 * - Full: max 1280px longest side, ~400-600KB target, 1MB hard limit
 * - Thumbnail: max 320px longest side, <100KB
 */

export interface CompressedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

export interface CompressionError {
  type: "gif" | "size" | "format" | "unknown";
  message: string;
}

// Size limits in bytes
const FULL_MAX_SIZE = 1024 * 1024; // 1MB
const THUMB_MAX_SIZE = 100 * 1024; // 100KB

// Dimension limits
const FULL_MAX_DIMENSION = 1280;
const THUMB_MAX_DIMENSION = 320;

// Quality settings
const FULL_QUALITY = 0.7;
const THUMB_QUALITY = 0.65;

// Quality steps for recompression if too large
const QUALITY_STEPS = [0.6, 0.5, 0.4, 0.3];

/**
 * Check if a file is a GIF (animated or not).
 */
function isGif(file: File): boolean {
  return file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
}

/**
 * Check if a file is a supported image format.
 */
function isSupportedFormat(file: File): boolean {
  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Load an image file into an HTMLImageElement.
 */
async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));

    const url = URL.createObjectURL(file);
    img.src = url;

    // Clean up object URL after load
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
  });
}

/**
 * Calculate dimensions to fit within max size while preserving aspect ratio.
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Encode a canvas to WebP blob at specified quality.
 */
async function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode image as WebP"));
        }
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Resize and encode an image to WebP.
 */
async function resizeAndEncode(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, 0, 0, width, height);

  return canvasToWebP(canvas, quality);
}

/**
 * Compress an image with progressive quality reduction until it fits size limit.
 */
async function compressWithSizeLimit(
  img: HTMLImageElement,
  maxDimension: number,
  initialQuality: number,
  maxSize: number
): Promise<Blob> {
  // Try initial quality
  let blob = await resizeAndEncode(img, maxDimension, initialQuality);

  if (blob.size <= maxSize) {
    return blob;
  }

  // Try progressively lower quality settings
  for (const quality of QUALITY_STEPS) {
    blob = await resizeAndEncode(img, maxDimension, quality);
    if (blob.size <= maxSize) {
      return blob;
    }
  }

  // If still too large, throw error
  throw new Error(
    `Image too large. Could not compress below ${Math.round(maxSize / 1024)}KB.`
  );
}

/**
 * Compress an image file to WebP format with full and thumbnail variants.
 *
 * @throws CompressionError if the image cannot be processed
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  // Check for GIF
  if (isGif(file)) {
    const error: CompressionError = {
      type: "gif",
      message:
        "GIF images are not supported. Please select a JPEG, PNG, or WebP image.",
    };
    throw error;
  }

  // Check for supported format
  if (!isSupportedFormat(file)) {
    const error: CompressionError = {
      type: "format",
      message: `Unsupported image format: ${
        file.type || "unknown"
      }. Please use JPEG, PNG, or WebP.`,
    };
    throw error;
  }

  try {
    // Load the image
    const img = await loadImage(file);

    // Generate full-size variant
    const full = await compressWithSizeLimit(
      img,
      FULL_MAX_DIMENSION,
      FULL_QUALITY,
      FULL_MAX_SIZE
    );

    // Generate thumbnail variant
    const thumb = await compressWithSizeLimit(
      img,
      THUMB_MAX_DIMENSION,
      THUMB_QUALITY,
      THUMB_MAX_SIZE
    );

    return {
      full,
      thumb,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch (err) {
    if ((err as CompressionError).type) {
      throw err;
    }

    const error: CompressionError = {
      type: "unknown",
      message: err instanceof Error ? err.message : "Failed to process image",
    };
    throw error;
  }
}

/**
 * Validate that a file array doesn't exceed the max images limit.
 */
export function validateImageCount(
  files: File[],
  maxImages: number = 4
): { valid: boolean; error?: string } {
  if (files.length > maxImages) {
    return {
      valid: false,
      error: `Maximum ${maxImages} images allowed per message.`,
    };
  }
  return { valid: true };
}

/**
 * Get a preview URL for a file (for display before upload).
 */
export function getPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory.
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
