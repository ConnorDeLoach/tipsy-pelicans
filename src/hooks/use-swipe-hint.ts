import * as React from "react";
import { useIsMobile } from "./use-mobile";

const STORAGE_KEY = "tipsy_swipe_used";

interface UseSwipeHintResult {
  /** Whether to show the swipe hint animation */
  shouldShowHint: boolean;
  /** Call this when user successfully swipes a card */
  markAsSwiped: () => void;
}

/**
 * Hook to manage swipe hint visibility.
 * Shows hint only for admins on mobile who haven't swiped before.
 */
export function useSwipeHint(isAdmin: boolean): UseSwipeHintResult {
  const isMobile = useIsMobile();
  const [hasUsedSwipe, setHasUsedSwipe] = React.useState(true); // Default true to avoid flash
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Read from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setHasUsedSwipe(stored === "1");
    setIsHydrated(true);
  }, []);

  const markAsSwiped = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setHasUsedSwipe(true);
  }, []);

  // Only show hint if:
  // - Hydrated (to avoid SSR mismatch)
  // - Is admin
  // - Is mobile
  // - Hasn't used swipe before
  const shouldShowHint = isHydrated && isAdmin && isMobile && !hasUsedSwipe;

  return {
    shouldShowHint,
    markAsSwiped,
  };
}
