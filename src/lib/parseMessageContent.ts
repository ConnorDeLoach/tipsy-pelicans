import LinkifyIt from "linkify-it";

// Initialize linkify-it instance with default settings
const linkify = new LinkifyIt();

// Enable fuzzy matching for links without protocol (e.g., "example.com")
linkify.set({ fuzzyLink: true, fuzzyEmail: false, fuzzyIP: false });

/**
 * Segment types for parsed message content.
 * Extensible for future features like mentions, emoji, code blocks.
 */
export type TextSegment = {
  type: "text";
  content: string;
};

export type LinkSegment = {
  type: "link";
  url: string;
  text: string;
};

// Union type for all segment types - extend as needed
export type MessageSegment = TextSegment | LinkSegment;

/**
 * Validates and sanitizes a URL to prevent XSS attacks.
 * Blocks javascript:, data:, and other dangerous protocols.
 */
function sanitizeUrl(url: string): string | null {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.match(/^https?:\/\//i) ? url : `https://${url}`;

    const parsed = new URL(urlWithProtocol);

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Parses a message body into typed segments for rendering.
 * Currently handles plain text and links.
 *
 * @param body - The raw message text
 * @returns Array of segments to render
 *
 * @example
 * parseMessageContent("Check out https://example.com for more")
 * // Returns:
 * // [
 * //   { type: "text", content: "Check out " },
 * //   { type: "link", url: "https://example.com", text: "https://example.com" },
 * //   { type: "text", content: " for more" }
 * // ]
 */
export function parseMessageContent(body: string): MessageSegment[] {
  if (!body) return [];

  const matches = linkify.match(body);

  // No links found - return as single text segment
  if (!matches || matches.length === 0) {
    return [{ type: "text", content: body }];
  }

  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before this link
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: body.slice(lastIndex, match.index),
      });
    }

    // Sanitize and add the link
    const sanitizedUrl = sanitizeUrl(match.url);
    if (sanitizedUrl) {
      segments.push({
        type: "link",
        url: sanitizedUrl,
        text: match.text,
      });
    } else {
      // If URL is invalid/unsafe, render as plain text
      segments.push({
        type: "text",
        content: match.text,
      });
    }

    lastIndex = match.lastIndex;
  }

  // Add remaining text after last link
  if (lastIndex < body.length) {
    segments.push({
      type: "text",
      content: body.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Extracts all valid URLs from a message body.
 * Useful for pre-fetching link metadata.
 */
export function extractUrls(body: string): string[] {
  if (!body) return [];

  const matches = linkify.match(body);
  if (!matches) return [];

  return matches
    .map((m) => sanitizeUrl(m.url))
    .filter((url): url is string => url !== null);
}
