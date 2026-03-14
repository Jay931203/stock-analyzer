"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-full px-4 py-16">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h1>

        {/* Error message */}
        <div className="mt-4 rounded-lg bg-muted/50 border border-border px-4 py-3">
          <p className="text-sm text-muted-foreground break-words">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground/60 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2"
          >
            <Search className="h-4 w-4" />
            Go to Scanner
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/50">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
