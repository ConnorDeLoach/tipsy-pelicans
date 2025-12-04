import * as React from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  threshold?: number;
  disabled?: boolean;
}

interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
}

export function useLongPress(options: UseLongPressOptions): LongPressHandlers {
  const { onLongPress, threshold = 700, disabled } = options;
  const timerRef = React.useRef<number | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);

  const clear = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const start = React.useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      clear();
      startPosRef.current = { x: clientX, y: clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onLongPress();
      }, threshold) as unknown as number;
    },
    [clear, disabled, onLongPress, threshold]
  );

  const move = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!startPosRef.current || timerRef.current === null) {
        return;
      }
      const dx = clientX - startPosRef.current.x;
      const dy = clientY - startPosRef.current.y;
      const distanceSq = dx * dx + dy * dy;
      const moveThreshold = 15;
      if (distanceSq > moveThreshold * moveThreshold) {
        clear();
      }
    },
    [clear]
  );

  const cancel = React.useCallback(() => {
    clear();
  }, [clear]);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      start(event.clientX, event.clientY);
    },
    [start]
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      move(event.clientX, event.clientY);
    },
    [move]
  );

  const onPointerUp = React.useCallback(() => {
    cancel();
  }, [cancel]);

  const onPointerLeave = React.useCallback(() => {
    cancel();
  }, [cancel]);

  React.useEffect(() => cancel, [cancel]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
}
