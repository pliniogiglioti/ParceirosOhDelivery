export function CatalogSkeleton() {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 sm:p-4">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-ink-100 bg-white"
          >
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-4 lg:px-5">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-ink-100" />
                <div className="h-5 w-36 rounded-lg bg-ink-100" />
                <div className="h-5 w-14 rounded-full bg-ink-100" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-11 w-28 rounded-2xl bg-ink-100" />
                <div className="h-11 w-24 rounded-2xl bg-ink-100" />
                <div className="h-11 w-11 rounded-2xl bg-ink-100" />
                <div className="h-11 w-11 rounded-2xl bg-ink-100" />
              </div>
            </div>

            {/* Product rows */}
            <div className="border-t border-ink-100 px-4 py-4 lg:px-5">
              <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
                <div className="divide-y divide-ink-100">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="flex items-center gap-4 px-4 py-4"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-ink-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 rounded bg-ink-100" />
                        <div className="h-3 w-64 rounded bg-ink-100" />
                      </div>
                      <div className="h-4 w-16 rounded bg-ink-100" />
                      <div className="h-9 w-9 rounded-2xl bg-ink-100" />
                      <div className="h-9 w-9 rounded-2xl bg-ink-100" />
                      <div className="h-8 w-8 rounded-xl bg-ink-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
