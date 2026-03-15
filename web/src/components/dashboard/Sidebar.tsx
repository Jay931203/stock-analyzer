"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ScanSearch,
  LineChart,
  Clock,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Navigation config                                                   */
/* ------------------------------------------------------------------ */

const MAIN_NAV = [
  { href: "/dashboard", labelKey: "nav.scanner" as TranslationKey, icon: ScanSearch, shortcut: "S" },
  { href: "/dashboard/analyze", labelKey: "nav.analyze" as TranslationKey, icon: LineChart, shortcut: "A" },
  { href: "/dashboard/time-machine", labelKey: "nav.timeMachine" as TranslationKey, icon: Clock, shortcut: "T" },
] as const;

const SECONDARY_NAV = [
  { href: "/dashboard/alerts", labelKey: "nav.alerts" as TranslationKey, icon: Bell, shortcut: null },
  { href: "/dashboard/settings", labelKey: "nav.settings" as TranslationKey, icon: Settings, shortcut: null },
] as const;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  plan?: "free" | "pro" | "api";
}

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: typeof ScanSearch;
  shortcut: string | null;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Sidebar({ plan = "free" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const openMobileSidebar = useCallback(() => setMobileOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  // Expose the open function for the Header hamburger button
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openMobileSidebar = openMobileSidebar;
    return () => {
      delete (window as unknown as Record<string, unknown>).__openMobileSidebar;
    };
  }, [openMobileSidebar]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  /* ---------------------------------------------------------------- */
  /* Nav item renderer                                                 */
  /* ---------------------------------------------------------------- */

  const renderNavItem = (item: NavItem, showLabel: boolean) => {
    const { href, labelKey, icon: Icon, shortcut } = item;
    const active = isActive(href);
    const label = t(labelKey);

    return (
      <Link
        key={href}
        href={href}
        title={!showLabel ? label : undefined}
        onClick={closeMobileSidebar}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-lg text-sm font-medium",
          "transition-all duration-200 ease-out group",
          "py-3 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
          showLabel ? "px-3" : "px-0 justify-center",
          active
            ? "bg-white/[0.04] text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]",
        )}
      >
        {/* Active indicator -- thin gradient left bar */}
        {active && (
          <span
            className={cn(
              "absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full",
              "bg-gradient-to-b from-indigo-400 to-purple-500",
              "shadow-[0_0_8px_rgba(99,102,241,0.3)]",
            )}
          />
        )}

        <Icon
          className={cn(
            "w-5 h-5 shrink-0 transition-colors duration-200",
            active
              ? "text-indigo-400"
              : "text-zinc-600 group-hover:text-zinc-400",
          )}
          strokeWidth={1.5}
          aria-hidden="true"
        />

        {showLabel && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {shortcut && (
              <kbd
                className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded",
                  "text-[10px] font-mono font-medium",
                  "text-zinc-700 bg-white/[0.03] border border-white/[0.04]",
                  "opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-200",
                )}
              >
                {shortcut}
              </kbd>
            )}
          </>
        )}
      </Link>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Gradient separator                                                */
  /* ---------------------------------------------------------------- */

  const GradientSeparator = ({ className }: { className?: string }) => (
    <div className={cn("py-3", className)}>
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Sidebar content                                                   */
  /* ---------------------------------------------------------------- */

  const sidebarContent = (showLabel: boolean, isMobileOverlay: boolean) => (
    <>
      {/* Logo area -- spacious h-16 */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          onClick={closeMobileSidebar}
        >
          {/* Logo icon with subtle glow on hover */}
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 overflow-hidden",
              "bg-zinc-900/80 border border-white/[0.06]",
              "transition-all duration-300",
              "group-hover:border-indigo-500/20 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]",
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <path
                d="M8 22L14 12L18 16L24 8"
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="24" cy="8" r="2" fill="#22C55E" />
            </svg>
          </div>
          {showLabel && (
            <span className="text-sm font-semibold text-zinc-100 tracking-tight whitespace-nowrap transition-colors duration-200 group-hover:text-white">
              Stock Scanner
            </span>
          )}
        </Link>

        {isMobileOverlay ? (
          <button
            onClick={closeMobileSidebar}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
              "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]",
              "transition-all duration-200",
            )}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : (
          /* Collapse button -- round, only visible on sidebar hover */
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden lg:flex items-center justify-center w-7 h-7 rounded-full shrink-0",
              "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]",
              "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
              sidebarHovered ? "opacity-100" : "opacity-0 focus-visible:opacity-100",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {/* Separator below logo */}
      <div className="px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 overflow-y-auto" aria-label="Main navigation">
        {/* Section label */}
        {showLabel && (
          <div className="px-3 mb-2">
            <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] select-none">
              {t("nav.analysis")}
            </span>
          </div>
        )}

        {/* Main nav */}
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => renderNavItem(item, showLabel))}
        </div>

        <GradientSeparator className={showLabel ? "mx-2" : "mx-1"} />

        {/* Section label */}
        {showLabel && (
          <div className="px-3 mb-2">
            <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] select-none">
              {t("nav.settings")}
            </span>
          </div>
        )}

        {/* Secondary nav */}
        <div className="space-y-0.5">
          {SECONDARY_NAV.map((item) => renderNavItem(item, showLabel))}
        </div>
      </nav>

      {/* Bottom area -- plan badge */}
      {showLabel && (
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent mb-4" />
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-white/[0.02] border border-white/[0.04]",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                plan === "pro"
                  ? "bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.4)]"
                  : plan === "api"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                    : "bg-zinc-600",
              )}
            />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {t("sidebar.plan").replace("{plan}", plan)}
            </span>
          </div>
        </div>
      )}
    </>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={cn(
          "hidden md:flex flex-col h-full",
          // Glass background
          "backdrop-blur-xl bg-zinc-950/80",
          // Subtle right border + floating shadow
          "border-r border-white/[0.04]",
          "shadow-[1px_0_16px_rgba(0,0,0,0.3)]",
          // Smooth width transition
          "transition-[width] duration-200 ease-in-out overflow-hidden",
          // Tablet: always collapsed (64px). Desktop: user-controlled.
          "md:w-16 lg:w-16",
          !collapsed && "lg:w-60",
        )}
      >
        {/* Tablet -- always collapsed */}
        <div className="hidden md:flex lg:hidden flex-col h-full">
          {sidebarContent(false, false)}
        </div>
        {/* Desktop -- respect collapsed state */}
        <div className="hidden lg:flex flex-col h-full">
          {sidebarContent(!collapsed, false)}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeMobileSidebar}
          />
          {/* Sidebar panel */}
          <aside
            className={cn(
              "absolute left-0 top-0 bottom-0 w-72 flex flex-col",
              "backdrop-blur-xl bg-zinc-950/90",
              "border-r border-white/[0.04]",
              "shadow-[4px_0_24px_rgba(0,0,0,0.5)]",
              "animate-in slide-in-from-left duration-300",
            )}
          >
            {sidebarContent(true, true)}
          </aside>
        </div>
      )}
    </>
  );
}
