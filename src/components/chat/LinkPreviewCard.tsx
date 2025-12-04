"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState, useEffect } from "react";
import { extractUrls } from "@/lib/parseMessageContent";
import { ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { TikTokEmbed } from "./TikTokEmbed";

interface LinkPreviewCardProps {
  body: string;
  isMe?: boolean;
}

interface PreviewData {
  urlHash: string;
  status: "pending" | "success" | "error" | "no_preview";
  title?: string;
  description?: string;
  siteName?: string;
  faviconUrl?: string;
  imageFullUrl?: string | null;
  imageThumbUrl?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  videoId?: string;
  embedProvider?: string;
}

/**
 * Generates SHA-256 hash of a URL (client-side version).
 */
async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalize URL (mirrors backend logic).
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
    ];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    parsed.hash = "";
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Displays link preview cards for URLs in a message.
 */
export function LinkPreviewCards({ body, isMe = false }: LinkPreviewCardProps) {
  const urls = useMemo(() => extractUrls(body), [body]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {urls.slice(0, 3).map((url) => (
        <LinkPreviewCardInner key={url} url={url} isMe={isMe} />
      ))}
    </div>
  );
}

/**
 * Individual link preview card that fetches and displays preview data.
 */
function LinkPreviewCardInner({ url, isMe }: { url: string; isMe: boolean }) {
  const normalizedUrl = useMemo(() => normalizeUrl(url), [url]);

  // Extract domain for display
  const domain = useMemo(() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }, [url]);

  // Fetch preview data to check for embeddable content
  const preview = useLinkPreview(normalizedUrl);

  // Render TikTok embed if applicable
  if (
    preview?.status === "success" &&
    preview.embedProvider === "tiktok" &&
    preview.videoId
  ) {
    return (
      <div
        className={cn(
          "rounded-lg border overflow-hidden",
          isMe
            ? "border-primary-foreground/20 bg-primary-foreground/10"
            : "border-border bg-background/50"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <TikTokEmbed
          videoId={preview.videoId}
          thumbnailUrl={
            preview.imageThumbUrl || preview.imageFullUrl || undefined
          }
          title={preview.title}
          description={preview.description}
          isMe={isMe}
        />
      </div>
    );
  }

  // Standard link preview card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "block rounded-lg border overflow-hidden transition-colors",
        isMe
          ? "border-primary-foreground/20 hover:border-primary-foreground/40 bg-primary-foreground/10"
          : "border-border hover:border-border/80 bg-background/50"
      )}
    >
      <LinkPreviewContent
        url={normalizedUrl}
        domain={domain}
        isMe={isMe}
        preview={preview}
      />
    </a>
  );
}

/**
 * Content of the preview card with async data fetching.
 */
function LinkPreviewContent({
  url,
  domain,
  isMe,
  preview,
}: {
  url: string;
  domain: string;
  isMe: boolean;
  preview: PreviewData | null;
}) {
  if (preview === null) {
    // Loading state
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className={cn(
            "size-4 rounded animate-pulse",
            isMe ? "bg-primary-foreground/20" : "bg-muted"
          )}
        />
        <span
          className={cn(
            "text-xs truncate",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {domain}
        </span>
      </div>
    );
  }

  if (preview.status === "no_preview" || preview.status === "error") {
    // Minimal fallback - just show domain
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Globe
          className={cn(
            "size-4 shrink-0",
            isMe ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        />
        <span
          className={cn(
            "text-xs truncate flex-1",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {domain}
        </span>
        <ExternalLink
          className={cn(
            "size-3 shrink-0",
            isMe ? "text-primary-foreground/50" : "text-muted-foreground/50"
          )}
        />
      </div>
    );
  }

  if (preview.status === "pending") {
    // Still fetching
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className={cn(
            "size-4 rounded animate-pulse",
            isMe ? "bg-primary-foreground/20" : "bg-muted"
          )}
        />
        <span
          className={cn(
            "text-xs truncate",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          Loading preview...
        </span>
      </div>
    );
  }

  // Success - show full preview
  const hasImage = preview.imageThumbUrl || preview.imageFullUrl;

  return (
    <div className="flex">
      {/* Image thumbnail */}
      {hasImage && (
        <div className="shrink-0 w-20 h-20 bg-muted">
          <img
            src={preview.imageThumbUrl || preview.imageFullUrl || ""}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0 px-3 py-2">
        {/* Site name */}
        {preview.siteName && (
          <p
            className={cn(
              "text-xs truncate mb-0.5",
              isMe ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {preview.siteName}
          </p>
        )}

        {/* Title */}
        {preview.title && (
          <p
            className={cn(
              "text-sm font-medium line-clamp-2 leading-tight",
              isMe ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {preview.title}
          </p>
        )}

        {/* Description */}
        {preview.description && (
          <p
            className={cn(
              "text-xs line-clamp-2 mt-0.5 leading-relaxed",
              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {preview.description}
          </p>
        )}

        {/* Domain fallback if no title */}
        {!preview.title && !preview.siteName && (
          <p
            className={cn(
              "text-xs truncate",
              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {domain}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Custom hook to fetch link preview data for a URL.
 */
function useLinkPreview(url: string): PreviewData | null {
  // Compute hash and fetch preview
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeUrl(url);
    hashUrl(normalized).then(setHash);
  }, [url]);

  // Query previews when hash is ready
  const previews = useQuery(
    api.linkPreview.queries.getPreviewsForUrls,
    hash ? { urlHashes: [hash] } : "skip"
  );

  if (!hash || previews === undefined) {
    return null;
  }

  if (previews.length === 0) {
    // No preview found - might still be processing
    return { urlHash: hash, status: "pending" };
  }

  return previews[0];
}
