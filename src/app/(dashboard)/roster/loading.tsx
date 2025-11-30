export default function Loading() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Roster</h1>
      </div>

      <section className="mt-6 space-y-4">
        <div className="rounded-xl border border-border bg-card shadow">
          <div className="p-4 border-b border-border grid grid-cols-3 gap-4">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="p-0">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-4 p-4 border-b border-border last:border-0"
              >
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-5 w-8 rounded bg-muted animate-pulse" />
                <div className="h-5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
