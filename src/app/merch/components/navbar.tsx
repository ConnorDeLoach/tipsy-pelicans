"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/app/merch/lib/cartContext";

export function MerchNavbar() {
  const { itemCount } = useCart();

  return (
    <nav className="fixed w-screen top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/merch" className="flex items-center font-bold text-xl">
            <span className="text-foreground/90"> </span>
            <span className="bg-linear-to-br from-30% from-foreground/90 to-primary bg-clip-text text-transparent">
              Tipsy Pelicans Merch
            </span>
          </Link>

          <Link href="/merch/cart">
            <Button variant="outline" className="relative" data-cart-icon>
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-[.38rem] py-1 text-xs font-bold leading-none text-background transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
