"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type ProductSnapshot = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate: number;
    count: number;
  };
};

interface MerchTransitionContextValue {
  startViewTransition: (callback: () => void) => void;
  pendingProduct: ProductSnapshot | null;
  setPendingProduct: (product: ProductSnapshot | null) => void;
  clearPendingProduct: () => void;
  setListScrollTop: (value: number) => void;
  consumeListScrollTop: () => number | null;
}

const MerchTransitionContext = createContext<MerchTransitionContextValue | null>(
  null,
);

function isReducedMotionPreferred() {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MerchTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pendingProduct, setPendingProductState] = useState<ProductSnapshot | null>(
    null,
  );
  const listScrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.dataset.merchTransition = "enabled";
    return () => {
      delete html.dataset.merchTransition;
    };
  }, []);

  const startViewTransition = useCallback((callback: () => void) => {
    if (typeof document === "undefined") {
      callback();
      return;
    }

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => ViewTransition;
    };

    if (isReducedMotionPreferred() || !doc.startViewTransition) {
      callback();
      return;
    }

    try {
      const transition = doc.startViewTransition(callback);
      transition.finished.catch(() => {
        /* no-op */
      });
    } catch (error) {
      callback();
    }
  }, []);

  const setPendingProduct = useCallback((product: ProductSnapshot | null) => {
    setPendingProductState(product);
  }, []);

  const clearPendingProduct = useCallback(() => {
    setPendingProductState(null);
  }, []);

  const setListScrollTop = useCallback((value: number) => {
    listScrollRef.current = value;
  }, []);

  const consumeListScrollTop = useCallback(() => {
    const value = listScrollRef.current;
    listScrollRef.current = null;
    return value;
  }, []);

  const value = useMemo(
    () => ({
      startViewTransition,
      pendingProduct,
      setPendingProduct,
      clearPendingProduct,
      setListScrollTop,
      consumeListScrollTop,
    }),
    [
      startViewTransition,
      pendingProduct,
      setPendingProduct,
      clearPendingProduct,
      setListScrollTop,
      consumeListScrollTop,
    ],
  );

  return (
    <MerchTransitionContext.Provider value={value}>
      {children}
    </MerchTransitionContext.Provider>
  );
}

export function useMerchTransition() {
  const context = useContext(MerchTransitionContext);
  if (!context) {
    throw new Error(
      "useMerchTransition must be used within a MerchTransitionProvider",
    );
  }
  return context;
}

export function useMerchNavigateWithTransition() {
  const router = useRouter();
  const { startViewTransition } = useMerchTransition();

  return useCallback(
    (href: string) => {
      startViewTransition(() => {
        router.push(href);
      });
    },
    [router, startViewTransition],
  );
}

export type { ProductSnapshot };
