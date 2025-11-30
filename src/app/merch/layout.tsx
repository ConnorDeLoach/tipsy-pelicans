import type { Metadata } from "next";
import "@/app/globals.css";
import { CartProvider } from "@/app/merch/lib/cartContext";
import { MerchNavbar } from "@/app/merch/components/navbar";
import { MerchTransitionProvider } from "@/app/merch/components/merch-transition-provider";

export const metadata: Metadata = {
  title: "Merch Shop",
  description: "Tipsy merch storefront",
};

export default function MerchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MerchTransitionProvider>
      <CartProvider>
        <MerchNavbar />
        <div className="h-[4.1rem] bg-background" />
        {children}
        <Footer />
      </CartProvider>
    </MerchTransitionProvider>
  );
}
