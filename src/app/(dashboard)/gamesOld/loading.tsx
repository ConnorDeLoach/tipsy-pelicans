export default function Loading() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Upcoming Games</h1>
        <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-border bg-tint-blue p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-64 rounded bg-muted/80 animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
            </div>
            <div className="h-8 w-28 rounded bg-muted animate-pulse" />
          </div>

          <div className="mt-5 space-y-3">
            <div className="h-4 w-40 rounded bg-muted/70 animate-pulse" />
            <ul className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"
                >
                  <div className="space-y-1">
                    <div className="h-4 w-40 rounded bg-background/70 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-background/50 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-14 rounded bg-background/70 animate-pulse" />
                    <div className="h-8 w-16 rounded bg-background/70 animate-pulse" />
                    <div className="h-8 w-12 rounded bg-background/70 animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-tint-blue p-6 shadow"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-56 rounded bg-muted animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted/80 animate-pulse" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-48 rounded bg-muted/70 animate-pulse" />
              <div className="h-4 w-80 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
