import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyzeLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Ticker header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-40 mt-1.5" />
          </div>
          <div className="ml-4">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-5 w-24 mt-1" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector skeleton */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-10 mx-0.5 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="h-[400px] flex flex-col justify-between">
          {/* Y-axis labels + chart area */}
          <div className="flex items-start gap-3 flex-1">
            <div className="flex flex-col justify-between h-full py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-10" />
              ))}
            </div>
            <div className="flex-1 h-full relative">
              {/* Simulated chart lines */}
              <Skeleton className="absolute inset-0 rounded-lg" />
            </div>
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between pt-3 pl-14">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-12" />
            ))}
          </div>
        </div>
      </div>

      {/* Indicators section label */}
      <Skeleton className="h-4 w-40" />

      {/* Indicator card grid — 3x4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
          >
            {/* Indicator name */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            {/* Value */}
            <Skeleton className="h-7 w-24" />
            {/* Stats row */}
            <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
              <div>
                <Skeleton className="h-3 w-14 mb-1" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Combined probability skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56 mt-1.5" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <Skeleton className="h-8 w-16 ml-auto" />
              <Skeleton className="h-3 w-24 mt-1 ml-auto" />
            </div>
            <div className="text-right">
              <Skeleton className="h-8 w-12 ml-auto" />
              <Skeleton className="h-3 w-14 mt-1 ml-auto" />
            </div>
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}
