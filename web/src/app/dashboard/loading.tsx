import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex gap-0 h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Market closed banner skeleton */}
        <div className="mb-4">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>

        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-10 mx-0.5 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          {/* Count bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* Table header */}
          <div className="border-b border-zinc-800">
            <div className="flex items-center gap-4 px-4 py-2.5">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14 hidden lg:block" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10 hidden lg:block" />
              <Skeleton className="h-3 w-14 hidden lg:block" />
              <Skeleton className="flex-1 h-2 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>

          {/* Table rows */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50"
            >
              <Skeleton className="w-6 h-4" />
              <div className="space-y-1">
                <Skeleton className="w-14 h-4" />
                <Skeleton className="w-20 h-2.5" />
              </div>
              <Skeleton className="w-14 h-5 rounded-md hidden lg:block" />
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-14 h-5 rounded" />
              <Skeleton className="w-10 h-4" />
              <Skeleton className="w-10 h-4" />
              <Skeleton className="w-10 h-4 hidden lg:block" />
              <Skeleton className="w-14 h-4 hidden lg:block" />
              <Skeleton className="flex-1 h-2 rounded-full" />
              <Skeleton className="w-10 h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar skeleton */}
      <aside className="hidden lg:block w-72 border-l border-zinc-800 bg-zinc-950/50 shrink-0">
        <div className="p-4 space-y-5">
          {/* Market State */}
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

          {/* Separator */}
          <div className="border-t border-zinc-800" />

          {/* Summary */}
          <div>
            <Skeleton className="h-3 w-16 mb-3" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-[72px] rounded-lg" />
              <Skeleton className="h-[72px] rounded-lg" />
              <Skeleton className="h-[72px] rounded-lg" />
              <Skeleton className="h-[72px] rounded-lg" />
              <Skeleton className="h-14 rounded-lg col-span-2" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
