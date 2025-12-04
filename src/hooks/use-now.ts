"use client";

import { useEffect, useState } from "react";

interface UseNowOptions {
  initial?: number;
  intervalMs?: number;
}

export function useNow(options: UseNowOptions = {}) {
  const { initial, intervalMs = 60_000 } = options;

  const [now, setNow] = useState(() =>
    typeof initial === "number" ? initial : Date.now()
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
