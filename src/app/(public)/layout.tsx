import { Footer } from "@/components/footer";
import { PublicNav } from "@/components/public-nav";
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
