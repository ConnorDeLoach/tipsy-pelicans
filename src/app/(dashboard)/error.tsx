"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catch-all error boundary for the dashboard routes.
 * Displays a friendly error message and retry option.
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        We encountered an unexpected error. Please try again, or contact support
        if the problem persists.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button
          onClick={() => (window.location.href = "/games")}
          variant="outline"
        >
          Go to Games
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="mt-4 text-xs text-muted-foreground font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
