"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconBell, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useNotificationPrompt } from "@/hooks/use-notification-prompt";
import { useEnablePush } from "@/lib/enablePush";
import { toast } from "sonner";

/**
 * Sticky bottom pill prompting users to enable notifications.
 * Only renders when running as installed PWA and notifications are not enabled.
 * Positioned above the BottomNav component.
 */
export function NotificationPromptPill() {
  const { shouldShowPill, dismiss, onEnabled } = useNotificationPrompt();
  const { enablePush } = useEnablePush();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const res = await enablePush();
      if (res.ok) {
        toast.success("Game reminders enabled!");
        onEnabled();
      } else {
        const reason = res.reason ?? "unknown";
        if (reason === "denied") {
          toast.error(
            "Permission denied. Please enable notifications in your browser settings."
          );
        } else {
          toast.error(`Failed to enable notifications: ${reason}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {shouldShowPill && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
          }}
          className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md">
            {/* Icon */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <IconBell className="size-5 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Enable Push Notifications
              </p>
              <p className="text-xs text-muted-foreground truncate">
                For game RSVPs and Messages
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground px-2"
              >
                Not now
              </Button>
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3"
              >
                {isLoading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  "Enable"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
