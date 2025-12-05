import * as React from "react";
import { usePWAStandalone } from "./use-pwa-standalone";

const STORAGE_KEY_PROMPTED = "pwa-install-prompted";
const STORAGE_KEY_DISMISSED = "pwa-install-dismissed";
const INSTALL_TRIGGER_EVENT = "pwa-install-trigger";

type Platform = "ios" | "android" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Manages the PWA install prompt pill visibility.
 *
 * Shows when:
 * 1. Running in mobile browser (not standalone/installed)
 * 2. First login trigger OR RSVP trigger
 * 3. Not currently dismissed
 *
 * Triggers:
 * - First login: shows once per device (localStorage flag)
 * - RSVP: shows after every RSVP (clears dismiss state)
 */
export function useInstallPrompt() {
  const { isPWA, isHydrated: isPWAHydrated } = usePWAStandalone();

  // Platform detection
  const [platform, setPlatform] = React.useState<Platform>("other");
  const [isMobile, setIsMobile] = React.useState(false);

  // State
  const [shouldShow, setShouldShow] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [showSafariOverlay, setShowSafariOverlay] = React.useState(false);

  // Chrome's beforeinstallprompt event
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [hasInstallPrompt, setHasInstallPrompt] = React.useState(false);

  // Detect platform and mobile on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    // Detect Android
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
    } else {
      setPlatform("other");
    }

    // Detect mobile (rough check)
    const mobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua);
    setIsMobile(mobile);

    setIsHydrated(true);
  }, []);

  // Capture beforeinstallprompt for Chrome/Android
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setHasInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Listen for install trigger events (from RSVP)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      // Clear dismiss state so pill shows again
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
      setShouldShow(true);
    };

    window.addEventListener(INSTALL_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(INSTALL_TRIGGER_EVENT, handler);
  }, []);

  // Check first login trigger on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHydrated || !isPWAHydrated) return;

    // Don't show if already installed
    if (isPWA) return;

    // Check if already prompted for first login
    const alreadyPrompted = localStorage.getItem(STORAGE_KEY_PROMPTED);
    if (alreadyPrompted) return;

    // Check if dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissed) return;

    // This is first login - show the prompt
    localStorage.setItem(STORAGE_KEY_PROMPTED, "true");
    setShouldShow(true);
  }, [isHydrated, isPWAHydrated, isPWA]);

  // Determine if pill should render
  const shouldShowPill = React.useMemo(() => {
    if (!isHydrated || !isPWAHydrated) return false;

    // Never show if already installed as PWA
    if (isPWA) return false;

    // Only show on mobile
    if (!isMobile) return false;

    // On iOS, we can always show (instructions overlay)
    // On Android/Chrome, only show if we have a valid install prompt
    if (platform !== "ios" && !hasInstallPrompt) return false;

    return shouldShow;
  }, [
    isHydrated,
    isPWAHydrated,
    isPWA,
    isMobile,
    platform,
    hasInstallPrompt,
    shouldShow,
  ]);

  // Install handler - Chrome triggers native prompt, Safari shows overlay
  const handleInstall = React.useCallback(() => {
    if (platform === "ios") {
      setShowSafariOverlay(true);
    } else if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      deferredPromptRef.current.userChoice.then((choice) => {
        // Chrome won't fire beforeinstallprompt again until next page load
        // So we mark the prompt as consumed regardless of outcome
        deferredPromptRef.current = null;
        setHasInstallPrompt(false);

        if (choice.outcome === "accepted") {
          setShouldShow(false);
        }
        // If dismissed, pill will auto-hide due to hasInstallPrompt = false
        // It will re-appear on next page load when Chrome fires beforeinstallprompt again
      });
    }
    // No fallback needed - pill shouldn't show if hasInstallPrompt is false
  }, [platform]);

  // Dismiss handler
  const dismiss = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
    setShouldShow(false);
  }, []);

  // Close Safari overlay
  const closeSafariOverlay = React.useCallback(() => {
    setShowSafariOverlay(false);
    setShouldShow(false);
    localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
  }, []);

  return {
    shouldShowPill,
    platform,
    showSafariOverlay,
    handleInstall,
    dismiss,
    closeSafariOverlay,
  };
}

/**
 * Trigger the install prompt to show.
 * Call this after RSVP success.
 */
export function triggerInstallPrompt() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INSTALL_TRIGGER_EVENT));
}
