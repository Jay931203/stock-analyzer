import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, color, size = "md", showLabel = false, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const autoColor =
      color ||
      (percentage >= 70
        ? "bg-success"
        : percentage >= 40
          ? "bg-primary"
          : "bg-destructive");

    const heightClass = size === "sm" ? "h-1" : "h-2";

    return (
      <div className={cn("flex items-center gap-2", className)} ref={ref} {...props}>
        <div
          className={cn(
            "flex-1 overflow-hidden rounded-full bg-muted",
            heightClass,
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              autoColor,
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-xs font-mono text-muted-foreground tabular-nums min-w-[2.5rem] text-right">
            {value.toFixed(0)}%
          </span>
        )}
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
export type { ProgressProps };
