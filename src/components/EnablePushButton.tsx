"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEnablePush } from "@/lib/enablePush";

export function EnablePushButton() {
  const { enablePush } = useEnablePush();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission(null);
    }
  }, []);

  if (permission === "granted") return null;
  if (permission === null) return null;

  return (
    <div className="mt-3">
      <Button
        type="button"
        onClick={async () => {
          const res = await enablePush();
          if (res.ok) {
            toast.success("Game reminders enabled");
            setPermission("granted");
          } else {
            const reason = res.reason ?? "unknown";
            toast.error(`Enable failed: ${reason}`);
          }
        }}
      >
        Enable game reminders
      </Button>
    </div>
  );
}
