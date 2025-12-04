import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-var(--header-height)-2rem)] px-4 lg:px-6">
      {/* Header skeleton */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-7 w-40" />
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden py-4">
        {/* Incoming message skeleton */}
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-64 rounded-2xl" />
          </div>
        </div>

        {/* Outgoing message skeleton */}
        <div className="flex gap-2 max-w-[80%] self-end flex-row-reverse">
          <div className="space-y-1.5 items-end flex flex-col">
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        </div>

        {/* Incoming message skeleton */}
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-72 rounded-2xl" />
          </div>
        </div>

        {/* Outgoing message skeleton */}
        <div className="flex gap-2 max-w-[80%] self-end flex-row-reverse">
          <div className="space-y-1.5 items-end flex flex-col">
            <Skeleton className="h-10 w-56 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Composer skeleton */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-2 items-end">
          <Skeleton className="size-10 rounded-lg shrink-0" />
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="size-10 rounded-lg shrink-0" />
        </div>
      </div>
    </div>
  );
}
