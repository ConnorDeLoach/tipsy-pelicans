"use client";

import { useState } from "react";
import { IconLogout, IconBell } from "@tabler/icons-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationSettingsModal } from "@/components/NotificationSettingsModal";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileProfileButton() {
  const isMobile = useIsMobile();
  const { signOut } = useAuthActions();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const me = useQuery(api.me.get);

  // Only render on mobile
  if (!isMobile) return null;

  const userName = me?.name ?? "Tipsy Pelican";
  const userEmail = me?.email ?? "";

  // Generate initials from user name
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <NotificationSettingsModal
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 rounded-lg cursor-pointer">
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <div className="p-2 text-sm">
            <div className="font-medium">{userName}</div>
            <div className="text-muted-foreground text-xs truncate">
              {userEmail}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
            <IconBell className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()}>
            <IconLogout className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
