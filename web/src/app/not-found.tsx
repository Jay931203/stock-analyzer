"use client";

import Link from "next/link";
import { BarChart3, Home, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <div className="relative mb-8">
          <p className="text-[120px] sm:text-[160px] font-bold leading-none text-muted/60 select-none font-mono">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("notFound.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {t("notFound.description")}
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Search className="h-4 w-4" />
            {t("notFound.goToScanner")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground h-10 px-4 py-2"
          >
            <Home className="h-4 w-4" />
            {t("notFound.backToHome")}
          </Link>
        </div>

        {/* Decorative bottom text */}
        <p className="mt-12 text-xs text-muted-foreground/50">
          {t("notFound.tagline")}
        </p>
      </div>
    </div>
  );
}
