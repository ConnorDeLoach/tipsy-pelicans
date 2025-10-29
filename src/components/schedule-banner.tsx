"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  limit?: number;
  className?: string;
};

export function ScheduleBanner({ limit = 10, className }: Props) {
  const games = useQuery(api.games.upcomingGames, { limit });

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    []
  );

  const isLoading = games === undefined;
  const isEmpty = !isLoading && games && games.length === 0;

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div className="flex w-max snap-x snap-mandatory gap-3 pb-3 pt-0">
        {isLoading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={`skeleton-${i}`}
                className="shrink-0 snap-start min-w-[12rem] sm:min-w-[13rem] md:min-w-[14rem] border-t-2 border-t-orange-500 border border-blue-200/40 bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60"
              >
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {!isLoading && isEmpty && (
          <Card className="shrink-0 snap-start min-w-[12rem] sm:min-w-[13rem] md:min-w-[14rem] border-t-2 border-t-orange-500 border border-blue-200/40 bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">No upcoming games</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && games && games.length > 0 && (
          <>
            {games.map((g) => {
              const dt = new Date(g.startTime);
              return (
                <Card
                  key={g._id}
                  className="shrink-0 snap-start min-w-[12rem] sm:min-w-[13rem] md:min-w-[14rem] border-t-2 border-t-orange-500 border border-blue-200/40 bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60"
                >
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground tracking-wide">
                      {dateFormatter.format(dt)}
                    </p>
                    <p className="text-sm text-foreground">{timeFormatter.format(dt)}</p>
                    <p className="text-sm font-medium text-blue-800">{g.opponent}</p>
                    {g.location ? (
                      <p className="text-[11px] text-muted-foreground">{g.location}</p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
