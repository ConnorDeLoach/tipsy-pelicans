import * as React from "react";

/**
 * Detects if the app is running in PWA standalone mode (installed to home screen).
 *
 * Checks:
 * - `display-mode: standalone` media query (Chrome/Android/Edge)
 * - `navigator.standalone` (Safari iOS)
 *
 * @returns `isPWA` boolean and `isHydrated` to avoid flash on SSR
 */
export function usePWAStandalone() {
  const [isPWA, setIsPWA] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Check Safari iOS standalone mode
    const isIOSStandalone =
      "standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    // Check display-mode: standalone (Chrome, Edge, Android, etc.)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const isStandaloneMedia = mediaQuery.matches;

    setIsPWA(isIOSStandalone || isStandaloneMedia);

    // Listen for changes (e.g., if user switches modes somehow)
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPWA(isIOSStandalone || e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return {
    isPWA: isPWA ?? false,
    isHydrated: isPWA !== undefined,
  };
}
