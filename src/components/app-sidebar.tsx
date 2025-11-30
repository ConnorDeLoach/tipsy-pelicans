"use client";

import * as React from "react";
import { IconUsers, IconMessageCircle } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { HockeyStickIcon } from "@/components/icons/HockeyStickIcon";
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
  const hasUnreadChat = useQuery(api.chat.unread.hasUnread);
  // Track if we're mounted to avoid hydration mismatch with dynamic badge
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  const navMain = React.useMemo(() => {
    // Only show badge after mount to avoid SSR/client mismatch
    const showBadge = isMounted && hasUnreadChat === true;
    const items = [
      { title: "Games", url: "/games", icon: HockeyStickIcon },
      { title: "Roster", url: "/roster", icon: IconUsers },
      {
        title: "Chat",
        url: "/chat",
        icon: IconMessageCircle,
        badge: showBadge,
      },
    ];
    return items;
  }, [hasUnreadChat, isMounted]);
  const userInfo = React.useMemo(
    () => ({
      name: me?.name ?? "Tipsy Pelican",
      email: me?.email ?? "",
      avatar: "/tipsy-bird.png",
    }),
    [me]
  );
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  React.useEffect(() => {
    router.prefetch("/games");
    router.prefetch("/chat");
    router.prefetch("/roster");
  }, [router]);
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
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  );
}
