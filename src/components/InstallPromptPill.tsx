"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { SafariInstallOverlay } from "@/components/SafariInstallOverlay";

/**
 * Sticky bottom pill prompting users to install the PWA.
 * Only renders on mobile browsers when not already installed.
 * Positioned above the BottomNav component.
 *
 * Triggers:
 * - First login (once per device)
 * - After every RSVP
 */
export function InstallPromptPill() {
  const {
    shouldShowPill,
    showSafariOverlay,
    handleInstall,
    dismiss,
    closeSafariOverlay,
  } = useInstallPrompt();

  return (
    <>
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
                <IconDownload className="size-5 text-primary" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Install Tipsy
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Add to home screen for the best experience
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground px-2"
                >
                  Not now
                </Button>
                <Button size="sm" onClick={handleInstall} className="px-3">
                  Install
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safari instructions overlay */}
      <SafariInstallOverlay
        open={showSafariOverlay}
        onClose={closeSafariOverlay}
      />
    </>
  );
}
