"use client"

import * as React from "react"
import { IconDashboard, IconUsers } from "@tabler/icons-react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const me = useQuery(api.me.get)
  const navMain = React.useMemo(
    () => {
      const items = [
        { title: "Games", url: "/games", icon: IconDashboard },
      ]
      if (me?.role === "admin") {
        items.unshift({ title: "Roster", url: "/admin/roster", icon: IconUsers })
      }
      return items
    },
    [me]
  )
  const userInfo = React.useMemo(
    () => ({
      name: me?.name ?? "Tipsy Pelican",
      email: me?.email ?? "",
      avatar: "/tipsy-bird.png",
    }),
    [me]
  )
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <Image
                  src="/favicon.png"
                  alt="Tipsy Pelicans logo"
                  width={20}
                  height={20}
                  className="size-5 rounded"
                  priority
                />
                <span className="text-base font-semibold">Tipsy Pelicans</span>
              </a>
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
  )
}
