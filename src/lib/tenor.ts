/**
 * Tenor GIF API Client
 *
 * Client-side utility for searching and fetching GIFs from Tenor.
 * API key is exposed via NEXT_PUBLIC env var (Tenor keys are designed for client use).
 */

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY;
const TENOR_CLIENT_KEY = "tipsy-pelicans";
const TENOR_BASE_URL = "https://tenor.googleapis.com/v2";

// We request only the formats we need to minimize response size (~70% reduction)
const MEDIA_FILTER = "tinygif,gif";

export interface TenorGif {
  id: string;
  title: string;
  contentDescription: string;
  /** Preview URL (tinygif - up to 220px wide) */
  previewUrl: string;
  previewDims: [number, number];
  /** Full size URL (gif - original dimensions) */
  url: string;
  dims: [number, number];
  /** Duration in seconds (0 for static) */
  duration: number;
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  duration: number;
  size: number;
}

interface TenorResponseObject {
  id: string;
  title: string;
  content_description: string;
  media_formats: {
    tinygif?: TenorMediaFormat;
    gif?: TenorMediaFormat;
  };
}

interface TenorSearchResponse {
  results: TenorResponseObject[];
  next: string;
}

interface TenorSuggestionsResponse {
  results: string[];
}

function mapTenorResult(result: TenorResponseObject): TenorGif | null {
  const tinygif = result.media_formats.tinygif;
  const gif = result.media_formats.gif;

  // Must have both formats
  if (!tinygif || !gif) return null;

  return {
    id: result.id,
    title: result.title,
    contentDescription: result.content_description,
    previewUrl: tinygif.url,
    previewDims: tinygif.dims,
    url: gif.url,
    dims: gif.dims,
    duration: gif.duration,
  };
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  if (!TENOR_API_KEY) {
    throw new Error("NEXT_PUBLIC_TENOR_API_KEY is not configured");
  }

  const url = new URL(`${TENOR_BASE_URL}/${endpoint}`);
  url.searchParams.set("key", TENOR_API_KEY);
  url.searchParams.set("client_key", TENOR_CLIENT_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export interface TenorSearchResult {
  gifs: TenorGif[];
  next: string;
}

/**
 * Search for GIFs by query string.
 */
export async function searchGifs(
  query: string,
  options: { limit?: number; pos?: string } = {}
): Promise<TenorSearchResult> {
  const { limit = 20, pos } = options;

  const url = buildUrl("search", {
    q: query,
    limit: String(limit),
    media_filter: MEDIA_FILTER,
    ...(pos && { pos }),
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tenor search failed: ${response.status}`);
  }

  const data: TenorSearchResponse = await response.json();

  return {
    gifs: data.results
      .map(mapTenorResult)
      .filter((g): g is TenorGif => g !== null),
    next: data.next,
  };
}

/**
 * Get featured/trending GIFs.
 */
export async function getFeaturedGifs(
  options: { limit?: number; pos?: string } = {}
): Promise<TenorSearchResult> {
  const { limit = 20, pos } = options;

  const url = buildUrl("featured", {
    limit: String(limit),
    media_filter: MEDIA_FILTER,
    ...(pos && { pos }),
  });

  const response = await fetch(url);
  if (!response.ok) {
    // Try to get error details from response
    let errorDetail = "";
    try {
      const errorData = await response.json();
      errorDetail = JSON.stringify(errorData);
    } catch {
      errorDetail = await response.text().catch(() => "");
    }
    console.error("Tenor featured error:", {
      status: response.status,
      detail: errorDetail,
      apiKeyPresent: !!TENOR_API_KEY,
      apiKeyLength: TENOR_API_KEY?.length,
    });
    throw new Error(
      `Tenor featured failed: ${response.status} - ${errorDetail}`
    );
  }

  const data: TenorSearchResponse = await response.json();

  return {
    gifs: data.results
      .map(mapTenorResult)
      .filter((g): g is TenorGif => g !== null),
    next: data.next,
  };
}

/**
 * Get search suggestions/autocomplete for a partial query.
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query.trim()) return [];

  const url = buildUrl("autocomplete", {
    q: query,
    limit: "5",
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tenor autocomplete failed: ${response.status}`);
  }

  const data: TenorSuggestionsResponse = await response.json();
  return data.results;
}

/**
 * Register a share event with Tenor (optional but improves search quality).
 */
export async function registerShare(
  gifId: string,
  query?: string
): Promise<void> {
  const url = buildUrl("registershare", {
    id: gifId,
    ...(query && { q: query }),
  });

  // Fire and forget - don't block on this
  fetch(url).catch(() => {
    // Silently ignore share registration failures
  });
}
