import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Image dimension limits (matches chat thumbnail pattern)
const THUMB_MAX = 320;
const FULL_MAX = 640;
const QUALITY = 70;

// Fetch constraints
const FETCH_TIMEOUT_MS = 5000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/link-preview/process-image
 *
 * Fetches an image from a URL, resizes it, and returns WebP versions.
 * Used by Convex actions to process OG images.
 *
 * Request body: { url: string }
 * Response: { full: base64, thumb: base64, width: number, height: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid url parameter" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Only allow http(s)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP(S) URLs are allowed" },
        { status: 400 }
      );
    }

    // Fetch image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; TipsyBot/1.0; +https://tipsypelicans.com)",
          Accept: "image/*",
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout" }, { status: 504 });
      }
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 502 }
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: 502 }
      );
    }

    // Validate content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Response is not an image" },
        { status: 400 }
      );
    }

    // Check content length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 413 }
      );
    }

    // Read response as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 413 }
      );
    }

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Empty image response" },
        { status: 400 }
      );
    }

    // Get original dimensions
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width === 0 || height === 0) {
      return NextResponse.json(
        { error: "Could not determine image dimensions" },
        { status: 400 }
      );
    }

    // Generate full-size preview (max 640px)
    const full = await sharp(buffer)
      .resize(FULL_MAX, FULL_MAX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Generate thumbnail (max 320px)
    const thumb = await sharp(buffer)
      .resize(THUMB_MAX, THUMB_MAX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();

    return NextResponse.json({
      full: full.toString("base64"),
      thumb: thumb.toString("base64"),
      width,
      height,
    });
  } catch (err) {
    console.error("[process-image] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
