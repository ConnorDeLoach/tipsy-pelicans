import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-full px-4 lg:px-6 py-4">
      {/* Header skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Conversation list skeleton */}
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-sm"
          >
            {/* Avatar skeleton */}
            <Skeleton className="size-12 rounded-full shrink-0" />

            <div className="flex-1 min-w-0 space-y-2">
              {/* Name and time */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>

              {/* Message preview */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
