"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEnablePush } from "@/lib/enablePush";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconBell, IconBellOff, IconLoader2 } from "@tabler/icons-react";

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsModal({
  open,
  onOpenChange,
}: NotificationSettingsModalProps) {
  const { enablePush, disablePush } = useEnablePush();
  const subscriptionStatus = useQuery(api.push.getMySubscriptionStatus);

  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // Check browser permission and support on mount and when modal opens
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSupported("serviceWorker" in navigator && "PushManager" in window);
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
    }
  }, [open]);

  const isSubscribed = subscriptionStatus?.subscribed ?? false;

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await enablePush();
      if (res.ok) {
        toast.success("Notifications enabled");
        setBrowserPermission("granted");
      } else {
        const reason = res.reason ?? "unknown";
        if (reason === "denied") {
          toast.error(
            "Permission denied. Please enable notifications in your browser settings."
          );
        } else {
          toast.error(`Failed to enable: ${reason}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const res = await disablePush();
      if (res.ok) {
        toast.success("Notifications disabled");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBell className="size-5" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Manage push notifications for game reminders and chat messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isSupported === null ? (
            <div className="flex items-center justify-center py-4">
              <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !isSupported ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
              <p className="font-medium">Not Supported</p>
              <p className="mt-1 text-xs">
                Push notifications are not supported on this device or browser.
              </p>
            </div>
          ) : browserPermission === "denied" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">Permission Blocked</p>
              <p className="mt-1 text-xs">
                Notifications are blocked. Please enable them in your browser
                settings for this site.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <IconBell className="size-5 text-green-600" />
                  ) : (
                    <IconBellOff className="size-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isSubscribed ? "Notifications On" : "Notifications Off"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isSubscribed
                        ? `Active on ${
                            subscriptionStatus?.count ?? 1
                          } device(s)`
                        : "Enable to receive game reminders"}
                    </p>
                  </div>
                </div>
                {isSubscribed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisable}
                    disabled={loading}
                  >
                    {loading ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      "Disable"
                    )}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleEnable} disabled={loading}>
                    {loading ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      "Enable"
                    )}
                  </Button>
                )}
              </div>

              {!isSubscribed && browserPermission === "granted" && (
                <p className="text-xs text-muted-foreground">
                  Your browser has granted permission, but this account is not
                  subscribed on this device. Click Enable to subscribe.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
