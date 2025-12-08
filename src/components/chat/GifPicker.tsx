"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import {
  searchGifs,
  getFeaturedGifs,
  getSearchSuggestions,
  registerShare,
  type TenorGif,
} from "@/lib/tenor";
import { useIsMobile } from "@/hooks/use-mobile";

// Custom GIF icon component
function GifIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        GIF
      </text>
    </svg>
  );
}

export interface GifPickerProps {
  disabled?: boolean;
  onSelect: (gif: TenorGif) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function GifPicker({
  disabled,
  onSelect,
  open,
  onOpenChange,
}: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Debounce query for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!open || !query.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    getSearchSuggestions(query)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results);
        }
      })
      .catch(() => {
        // Silently ignore suggestion errors
      });

    return () => {
      cancelled = true;
    };
  }, [query, open]);

  // Fetch GIFs (featured on initial load, search results when query changes)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchGifs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = debouncedQuery.trim()
          ? await searchGifs(debouncedQuery, { limit: PAGE_SIZE })
          : await getFeaturedGifs({ limit: PAGE_SIZE });

        if (!cancelled) {
          setGifs(result.gifs);
          setNextCursor(result.next);
          setLastSearchQuery(debouncedQuery);
        }
      } catch (err) {
        console.error("Failed to fetch GIFs:", err);
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load GIFs";
          if (message.includes("NEXT_PUBLIC_TENOR_API_KEY")) {
            setError("Tenor API key not configured");
          } else if (message.includes("400")) {
            setError("Invalid API key or request");
          } else {
            setError("Failed to load GIFs");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchGifs();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  // Load more GIFs
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    try {
      const result = lastSearchQuery.trim()
        ? await searchGifs(lastSearchQuery, {
            limit: PAGE_SIZE,
            pos: nextCursor,
          })
        : await getFeaturedGifs({ limit: PAGE_SIZE, pos: nextCursor });

      // Deduplicate by ID to prevent React key warnings
      setGifs((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newGifs = result.gifs.filter((g) => !existingIds.has(g.id));
        return [...prev, ...newGifs];
      });
      setNextCursor(result.next);
    } catch (error) {
      console.error("Failed to load more GIFs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor, lastSearchQuery]);

  // Infinite scroll
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = grid;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    };

    grid.addEventListener("scroll", handleScroll);
    return () => grid.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // Focus input when opening (desktop-only to avoid opening mobile keyboard)
  useEffect(() => {
    if (open && !isMobile) {
      // Small delay to let the panel render
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }

    if (!open) {
      // Reset state when closing
      setQuery("");
      setDebouncedQuery("");
      setSuggestions([]);
    }
  }, [open, isMobile]);

  const handleSelectGif = (gif: TenorGif) => {
    // Register share with Tenor (fire and forget)
    registerShare(gif.id, lastSearchQuery || undefined);
    onSelect(gif);
    onOpenChange(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setDebouncedQuery(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
        className="shrink-0"
        title="Add GIF"
      >
        <GifIcon className="size-5" />
      </Button>

      {/* Inline panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[320px] sm:w-[400px] bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header with search */}
          <div className="p-2 border-b space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Tenor"
                  className="pl-9 pr-8 h-9"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="shrink-0 size-9"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GIF grid */}
          <div ref={gridRef} className="h-[300px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                <span className="text-destructive">{error}</span>
                <span className="text-xs">Check console for details</span>
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {debouncedQuery ? "No GIFs found" : "Loading..."}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSelectGif(gif)}
                      className="relative overflow-hidden rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring hover:opacity-90 transition-opacity"
                      style={{
                        aspectRatio: `${gif.previewDims[0]}/${gif.previewDims[1]}`,
                      }}
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.contentDescription || gif.title}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>

                {/* Load more indicator */}
                {isLoadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tenor attribution (required) */}
          <div className="px-2 py-1.5 border-t bg-muted/30 flex items-center justify-end">
            <a
              href="https://tenor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Powered by</span>
              <img
                src="https://tenor.com/assets/img/tenor-logo-white.svg"
                alt="Tenor"
                className="h-3 dark:invert-0 invert"
              />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
