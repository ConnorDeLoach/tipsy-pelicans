"use client";

import Image from "next/image";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileProfileButton } from "@/components/mobile-profile-button";

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        {/* Desktop: Sidebar trigger */}
        <SidebarTrigger className="-ml-1 hidden md:flex" />

        {/* Mobile: Team logo */}
        <div className="md:hidden flex items-center gap-2">
          <Image
            src="/tipsy-bird.png"
            alt="Tipsy Pelicans"
            width={24}
            height={24}
            className="rounded"
            priority
          />
          <span className="font-semibold text-sm">Tipsy Pelicans</span>
        </div>

        {/* Right side: Profile button on mobile */}
        <div className="ml-auto md:hidden">
          <MobileProfileButton />
        </div>
      </div>
    </header>
  );
}
