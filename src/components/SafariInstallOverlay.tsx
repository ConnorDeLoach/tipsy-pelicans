"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconShare, IconSquarePlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SafariInstallOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Tooltip-style overlay showing Safari "Add to Home Screen" instructions.
 * Anchored near the bottom of the screen where Safari's share icon is located.
 */
export function SafariInstallOverlay({
  open,
  onClose,
}: SafariInstallOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Tooltip card anchored at bottom */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
          >
            <div className="relative rounded-2xl border border-border/50 bg-card p-4 shadow-xl">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-2 top-2 size-8"
              >
                <IconX className="size-4" />
              </Button>

              {/* Title */}
              <h3 className="mb-4 pr-8 text-base font-semibold text-foreground">
                Install Tipsy
              </h3>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    1
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm text-foreground">
                      Tap the Share button
                    </span>
                    <IconShare className="size-5 text-primary" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    2
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm text-foreground">
                      Tap &quot;Add to Home Screen&quot;
                    </span>
                    <IconSquarePlus className="size-5 text-primary" />
                  </div>
                </div>
              </div>

              {/* Arrow pointing down to Safari toolbar */}
              <div className="mt-4 flex justify-center">
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-primary"
                  >
                    <path
                      d="M12 4L12 20M12 20L6 14M12 20L18 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
