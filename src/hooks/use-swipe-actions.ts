import * as React from "react";

interface UseSwipeActionsOptions {
  /** Called when swipe threshold is reached and released */
  onSwipeOpen?: () => void;
  /** Called when card returns to closed position */
  onSwipeClose?: () => void;
  /** Distance in px to trigger open state */
  threshold?: number;
  /** Maximum swipe distance */
  maxSwipe?: number;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** Auto-close delay in ms (0 to disable) */
  autoCloseDelay?: number;
}

interface SwipeState {
  /** Current x offset (negative = swiped left) */
  offsetX: number;
  /** Whether actions are revealed */
  isOpen: boolean;
  /** Whether user is actively dragging */
  isDragging: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
}

export interface UseSwipeActionsResult {
  state: SwipeState;
  handlers: SwipeHandlers;
  close: () => void;
  open: () => void;
}

export function useSwipeActions(
  options: UseSwipeActionsOptions = {}
): UseSwipeActionsResult {
  const {
    onSwipeOpen,
    onSwipeClose,
    threshold = 60,
    maxSwipe = 120,
    disabled = false,
    autoCloseDelay = 3000,
  } = options;

  const [state, setState] = React.useState<SwipeState>({
    offsetX: 0,
    isOpen: false,
    isDragging: false,
  });

  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const directionLockedRef = React.useRef<"horizontal" | "vertical" | null>(
    null
  );
  const autoCloseTimerRef = React.useRef<number | null>(null);

  const clearAutoCloseTimer = React.useCallback(() => {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const startAutoCloseTimer = React.useCallback(() => {
    clearAutoCloseTimer();
    if (autoCloseDelay > 0) {
      autoCloseTimerRef.current = window.setTimeout(() => {
        setState((s) => ({ ...s, offsetX: 0, isOpen: false }));
        onSwipeClose?.();
      }, autoCloseDelay);
    }
  }, [autoCloseDelay, clearAutoCloseTimer, onSwipeClose]);

  const close = React.useCallback(() => {
    clearAutoCloseTimer();
    setState({ offsetX: 0, isOpen: false, isDragging: false });
    onSwipeClose?.();
  }, [clearAutoCloseTimer, onSwipeClose]);

  const open = React.useCallback(() => {
    setState({ offsetX: -maxSwipe, isOpen: true, isDragging: false });
    onSwipeOpen?.();
    startAutoCloseTimer();
  }, [maxSwipe, onSwipeOpen, startAutoCloseTimer]);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled) return;
      const touch = e.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      directionLockedRef.current = null;
      clearAutoCloseTimer();
      setState((s) => ({ ...s, isDragging: true }));
    },
    [disabled, clearAutoCloseTimer]
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || !startRef.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;

      // Lock direction after 10px of movement
      if (directionLockedRef.current === null) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx > 10 || absDy > 10) {
          directionLockedRef.current =
            absDx > absDy ? "horizontal" : "vertical";
        }
      }

      // Only handle horizontal swipes
      if (directionLockedRef.current !== "horizontal") return;

      // Prevent vertical scroll while swiping horizontally
      e.preventDefault();

      // Calculate offset based on current state
      const baseOffset = state.isOpen ? -maxSwipe : 0;
      let newOffset = baseOffset + dx;

      // Clamp: no right swipe past 0, limit left swipe
      newOffset = Math.min(0, Math.max(-maxSwipe, newOffset));

      setState((s) => ({ ...s, offsetX: newOffset }));
    },
    [disabled, maxSwipe, state.isOpen]
  );

  const onTouchEnd = React.useCallback(() => {
    if (disabled) return;

    startRef.current = null;
    directionLockedRef.current = null;

    // Calculate new state outside of setState to avoid calling callbacks during render
    const currentState = state;
    const shouldOpen = Math.abs(currentState.offsetX) >= threshold;

    let newState: SwipeState;
    let shouldCallOpen = false;
    let shouldCallClose = false;

    if (shouldOpen && !currentState.isOpen) {
      shouldCallOpen = true;
      newState = { offsetX: -maxSwipe, isOpen: true, isDragging: false };
    } else if (!shouldOpen && currentState.isOpen) {
      shouldCallClose = true;
      newState = { offsetX: 0, isOpen: false, isDragging: false };
    } else if (shouldOpen && currentState.isOpen) {
      // Stay open, restart timer
      newState = { offsetX: -maxSwipe, isOpen: true, isDragging: false };
    } else {
      newState = { offsetX: 0, isOpen: false, isDragging: false };
    }

    setState(newState);

    // Call callbacks after setState, not during
    if (shouldCallOpen) {
      onSwipeOpen?.();
      startAutoCloseTimer();
    } else if (shouldCallClose) {
      onSwipeClose?.();
    } else if (shouldOpen && currentState.isOpen) {
      startAutoCloseTimer();
    }
  }, [
    disabled,
    threshold,
    maxSwipe,
    state,
    onSwipeOpen,
    onSwipeClose,
    startAutoCloseTimer,
  ]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => clearAutoCloseTimer();
  }, [clearAutoCloseTimer]);

  return {
    state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    close,
    open,
  };
}
