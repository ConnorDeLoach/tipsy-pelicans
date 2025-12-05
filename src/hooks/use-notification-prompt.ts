import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePWAStandalone } from "./use-pwa-standalone";

const STORAGE_KEY = "notification-prompt-dismissed";
const COOLDOWN_DAYS = 7;

export type NotificationState =
  | "loading"
  | "off"
  | "on"
  | "denied"
  | "unsupported";

/**
 * Manages the notification prompt pill visibility.
 *
 * The pill should show when:
 * 1. App is running as installed PWA (standalone mode)
 * 2. Push notifications are supported
 * 3. User hasn't enabled notifications yet
 * 4. User hasn't dismissed the pill within cooldown period
 * 5. Browser permission isn't permanently denied
 */
export function useNotificationPrompt() {
  const { isPWA, isHydrated: isPWAHydrated } = usePWAStandalone();
  const subscriptionStatus = useQuery(api.push.getMySubscriptionStatus);

  const [browserPermission, setBrowserPermission] =
    React.useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = React.useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = React.useState<boolean>(true); // Default true to avoid flash
  const [isLocalHydrated, setIsLocalHydrated] = React.useState(false);

  // Check browser support and permission on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setBrowserPermission(Notification.permission);
    }

    // Check localStorage for dismiss cooldown
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const isStillInCooldown = Date.now() - dismissedTime < cooldownMs;
      setIsDismissed(isStillInCooldown);
    } else {
      setIsDismissed(false);
    }

    setIsLocalHydrated(true);
  }, []);

  // Derive notification state
  const notificationState = React.useMemo((): NotificationState => {
    if (isSupported === null || subscriptionStatus === undefined) {
      return "loading";
    }
    if (!isSupported) {
      return "unsupported";
    }
    if (browserPermission === "denied") {
      return "denied";
    }
    if (subscriptionStatus?.subscribed) {
      return "on";
    }
    return "off";
  }, [isSupported, browserPermission, subscriptionStatus]);

  // Determine if we should show the pill
  const shouldShowPill = React.useMemo(() => {
    // Wait for hydration
    if (!isPWAHydrated || !isLocalHydrated) return false;

    // Only show in PWA mode
    if (!isPWA) return false;

    // Don't show if dismissed recently
    if (isDismissed) return false;

    // Only show when notifications are off and could be enabled
    return notificationState === "off";
  }, [isPWAHydrated, isLocalHydrated, isPWA, isDismissed, notificationState]);

  // Dismiss handler - sets cooldown
  const dismiss = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  // Called when notifications are successfully enabled
  const onEnabled = React.useCallback(() => {
    // Clear any dismiss cooldown since they've enabled
    localStorage.removeItem(STORAGE_KEY);
    setIsDismissed(false);
  }, []);

  return {
    shouldShowPill,
    dismiss,
    onEnabled,
    notificationState,
    isPWA,
  };
}
