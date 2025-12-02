import { IconUsers, IconMessageCircle } from "@tabler/icons-react";
import { HockeyStickIcon } from "@/components/icons/HockeyStickIcon";
import type { Icon } from "@tabler/icons-react";

export type NavItem = {
  title: string;
  url: string;
  icon: Icon;
};

/**
 * Main navigation items for the app.
 * Used by both desktop sidebar (NavMain) and mobile bottom nav.
 */
export const navItems: NavItem[] = [
  { title: "Games", url: "/games", icon: HockeyStickIcon },
  { title: "Roster", url: "/roster", icon: IconUsers },
  { title: "Chat", url: "/chat", icon: IconMessageCircle },
];
