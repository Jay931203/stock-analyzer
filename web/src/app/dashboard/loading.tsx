import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex gap-0 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector skeleton */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-10 mx-0.5 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* Signal count skeleton */}
        <Skeleton className="h-4 w-28 mb-4" />

        {/* Table skeleton */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="border-b border-border">
            <div className="grid grid-cols-6 gap-4 px-5 py-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 items-center px-5 py-3.5 border-b border-border/50"
            >
              {/* Ticker */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
              {/* Price */}
              <Skeleton className="h-4 w-16" />
              {/* Signal */}
              <Skeleton className="h-6 w-28 rounded-md" />
              {/* Win Rate */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-1.5 w-16 rounded-full" />
                <Skeleton className="h-4 w-8" />
              </div>
              {/* Avg Return */}
              <Skeleton className="h-4 w-12 ml-auto" />
              {/* Strength */}
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar skeleton */}
      <aside className="hidden xl:block w-72 border-l border-zinc-800 bg-zinc-950/50 shrink-0">
        <div className="p-4 space-y-5">
          {/* Market Regime */}
          <div>
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>

          {/* Signal Flips */}
          <div>
            <Skeleton className="h-3 w-32 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <Skeleton className="h-3 w-16 mb-3" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg col-span-2" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
