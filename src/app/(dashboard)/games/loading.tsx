import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";

export default function Loading() {
  return (
    <div className="bg-background text-foreground font-sans">
      {/* Hero Section - matches GamesView exactly */}
      <div className="relative overflow-hidden bg-hero-gradient text-primary-foreground pb-16 pt-8 px-4 sm:px-6 lg:px-8 rounded-3xl shadow-xl mb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-100 tracking-wide uppercase">
                  Official Schedule
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                Tipsy Pelicans
              </h1>
              <Skeleton className="h-6 w-48 bg-white/20" />
            </div>

            {/* Stats Summary Card skeleton */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-6 shadow-lg">
              <div className="text-center">
                <Skeleton className="h-7 w-16 bg-white/20 mb-1" />
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Record
                </div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <Skeleton className="h-7 w-10 bg-white/20 mb-1" />
                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">
                  Points
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - matches GamesView exactly */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 -mt-8 relative z-10">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-4 sm:p-6 mb-10">
          {/* Season Selector skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className={`h-9 rounded-full ${
                    i === 0 ? "w-28 bg-primary/30" : "w-24"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 hidden sm:block" />
              <Skeleton className="h-9 w-28 hidden sm:block" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="grid w-full max-w-md grid-cols-2 p-1 bg-secondary/50 rounded-xl">
                <div className="px-4 py-2 rounded-lg bg-background shadow-sm text-center text-sm font-medium">
                  Upcoming
                </div>
                <div className="px-4 py-2 rounded-lg text-center text-sm font-medium text-muted-foreground">
                  Past Games
                </div>
              </div>
              <Skeleton className="h-9 w-32 hidden sm:block" />
            </div>

            {/* Game cards skeleton */}
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground font-medium px-1">
                Next up
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Date badge skeleton */}
                      <div className="flex flex-col items-center justify-center min-w-[52px] rounded-xl bg-primary/10 p-2">
                        <Skeleton className="h-3 w-8 mb-1" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                      {/* Game info skeleton */}
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    {/* RSVP buttons skeleton */}
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-14 rounded-lg" />
                      <Skeleton className="h-9 w-14 rounded-lg" />
                    </div>
                  </div>
                  {/* RSVP summary skeleton */}
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <div className="flex -space-x-2">
                        {[0, 1, 2].map((j) => (
                          <Skeleton key={j} className="h-7 w-7 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
