import type { Metadata } from "next";
import "@/app/globals.css";
import { CartProvider } from "@/app/merch/lib/cartContext";
import { MerchNavbar } from "@/app/merch/components/navbar";

export const metadata: Metadata = {
  title: "Merch Shop",
  description: "Tipsy merch storefront",
};

export default function MerchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <MerchNavbar />
      <div className="h-[4.1rem] bg-background" />
      {children}
    </CartProvider>
  );
}
