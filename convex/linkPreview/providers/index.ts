import type { LinkPreviewProvider } from "./types";
import { ogProvider } from "./og";
import { youtubeProvider } from "./youtube";
import { vimeoProvider } from "./vimeo";
import { spotifyProvider } from "./spotify";
import { tiktokProvider } from "./tiktok";
import { redditProvider } from "./reddit";
import { soundcloudProvider } from "./soundcloud";
import { giphyProvider } from "./giphy";

/**
 * Registry of link preview providers.
 * Providers are sorted by priority (highest first).
 * Add domain-specific providers here with higher priority.
 */
const providers: LinkPreviewProvider[] = [
  // Domain-specific providers (higher priority)
  youtubeProvider,
  vimeoProvider,
  spotifyProvider,
  tiktokProvider,
  redditProvider,
  soundcloudProvider,
  giphyProvider,

  // Catch-all OG provider (priority 0)
  ogProvider,
].sort((a, b) => b.priority - a.priority);

/**
 * Get the appropriate provider for a URL.
 * Returns the first matching provider (highest priority first).
 */
export function getProviderForUrl(url: URL): LinkPreviewProvider {
  for (const provider of providers) {
    if (provider.matches(url)) {
      return provider;
    }
  }
  // Should never happen since ogProvider matches all
  return ogProvider;
}

/**
 * Register a new provider.
 * Use this to add domain-specific providers at runtime.
 */
export function registerProvider(provider: LinkPreviewProvider): void {
  providers.push(provider);
  providers.sort((a, b) => b.priority - a.priority);
}

export type { LinkPreviewProvider, ParsedPreview } from "./types";
