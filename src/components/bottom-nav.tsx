"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Hide bottom nav in specific chat conversations (e.g., /chat/123)
  // But keep it visible on the main chat list (/chat)
  const isChatConversation =
    pathname.startsWith("/chat/") && pathname !== "/chat";
  if (!isMobile || isChatConversation) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block border-t bg-background md:hidden">
      <nav className="flex h-16 items-center justify-around pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("size-6", isActive && "stroke-2")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
