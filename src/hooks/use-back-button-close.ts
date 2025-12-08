import { useEffect, useRef, useCallback } from "react";

interface UseBackButtonCloseOptions {
  open: boolean;
  onClose: () => void;
  enabled?: boolean;
  stateKey?: string;
}

export function useBackButtonClose({
  open,
  onClose,
  enabled = true,
  stateKey,
}: UseBackButtonCloseOptions) {
  const hasPushedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      hasPushedRef.current = false;
      return;
    }

    if (!open) {
      hasPushedRef.current = false;
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof window.history === "undefined"
    ) {
      return;
    }

    if (!hasPushedRef.current) {
      const currentState = window.history.state || {};
      const nextState =
        stateKey != null ? { ...currentState, [stateKey]: true } : currentState;

      window.history.pushState(nextState, "", window.location.href);
      hasPushedRef.current = true;
    }

    const handlePopState = () => {
      if (hasPushedRef.current) {
        hasPushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, open, onClose, stateKey]);

  const closeWithHistory = useCallback(() => {
    if (!enabled) {
      onClose();
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof window.history === "undefined"
    ) {
      onClose();
      return;
    }

    if (open && hasPushedRef.current) {
      window.history.back();
    } else {
      onClose();
    }
  }, [enabled, open, onClose]);

  return { closeWithHistory };
}
