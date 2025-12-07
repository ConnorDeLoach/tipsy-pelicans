"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationPromptPill } from "@/components/NotificationPromptPill";
import { InstallPromptPill } from "@/components/InstallPromptPill";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Client-side shell for the dashboard layout.
 * Handles pathname-dependent styling and sidebar state.
 * Note: Route prefetching is handled automatically by Next.js <Link> components.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();

  // Check if we are in a chat conversation (e.g. /chat/123) but not the main chat list
  const isChatConversation =
    pathname.startsWith("/chat/") && pathname !== "/chat";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-background">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div
              className={cn(
                "flex flex-1 flex-col gap-4 pt-4 md:py-6 md:gap-6",
                // Only add bottom padding if NOT in a chat conversation
                !isChatConversation && "pb-20"
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
      <NotificationPromptPill />
      <InstallPromptPill />
      <BottomNav />
    </SidebarProvider>
  );
}
