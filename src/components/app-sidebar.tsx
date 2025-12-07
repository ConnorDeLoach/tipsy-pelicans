"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { navItems } from "@/lib/nav-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const me = useQuery(api.me.get);
  // TODO: Re-implement unread badge using api.chat.unread.hasAnyUnread

  const userInfo = React.useMemo(
    () => ({
      name: me?.name ?? "Tipsy Pelican",
      email: me?.email ?? "",
      avatar: "/tipsy-bird.png",
    }),
    [me]
  );
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link
                href="/"
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <Image
                  src="/favicon.png"
                  alt="Tipsy Pelicans logo"
                  width={20}
                  height={20}
                  className="size-5 rounded"
                  priority
                />
                <span className="text-base font-semibold">Tipsy Pelicans</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  );
}
