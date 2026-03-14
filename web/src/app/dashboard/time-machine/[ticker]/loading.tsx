import { Skeleton } from "@/components/ui/skeleton";

export default function TimeMachineLoading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-3 w-72 mt-1.5" />
        </div>
      </div>

      {/* Date picker skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Preset dates skeleton */}
        <div className="mt-4">
          <Skeleton className="h-3 w-28 mb-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Result card skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        {/* Verdict row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20 mt-1" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>

        {/* Forward returns skeleton */}
        <div className="grid grid-cols-5 gap-3 pt-4 border-t border-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-5 w-12 mx-auto" />
              <Skeleton className="h-4 w-10 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Indicator states skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <Skeleton className="h-3 w-44 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-800/40 rounded-lg p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
