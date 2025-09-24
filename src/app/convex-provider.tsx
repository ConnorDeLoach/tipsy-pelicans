'use client';

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

function useConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` and ensure the environment variable is configured."
    );
  }
  return useMemo(() => new ConvexReactClient(url), [url]);
}

export function ConvexProviderWrapper({ children }: { children: ReactNode }) {
  const convex = useConvexClient();
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
