export default function Loading() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Roster Management</h1>
        <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
      </div>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-medium">Current roster</h2>
        <div className="rounded-xl border border-border bg-tint-blue p-4 shadow">
          <div className="mb-3 grid grid-cols-6 gap-3">
            <div className="h-4 w-28 rounded bg-muted/70 animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/70 animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted/50 animate-pulse justify-self-end" />
          </div>
          <ul className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="grid grid-cols-6 items-center gap-3 rounded-lg border border-border bg-muted p-3"
              >
                <div className="h-4 w-40 rounded bg-background/70 animate-pulse" />
                <div className="h-4 w-56 rounded bg-background/60 animate-pulse" />
                <div className="h-4 w-12 rounded bg-background/50 animate-pulse" />
                <div className="h-4 w-16 rounded bg-background/50 animate-pulse" />
                <div className="h-4 w-10 rounded bg-background/40 animate-pulse" />
                <div className="ml-auto flex justify-end gap-2">
                  <div className="h-8 w-20 rounded bg-background/70 animate-pulse" />
                  <div className="h-8 w-20 rounded bg-background/70 animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
