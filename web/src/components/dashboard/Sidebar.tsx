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

const MAIN_NAV = [
  { href: "/dashboard", labelKey: "nav.scanner" as TranslationKey, icon: ScanSearch, shortcut: "S" },
  { href: "/dashboard/analyze", labelKey: "nav.analyze" as TranslationKey, icon: LineChart, shortcut: "A" },
  { href: "/dashboard/time-machine", labelKey: "nav.timeMachine" as TranslationKey, icon: Clock, shortcut: "T" },
] as const;

const SECONDARY_NAV = [
  { href: "/dashboard/alerts", labelKey: "nav.alerts" as TranslationKey, icon: Bell, shortcut: null },
  { href: "/dashboard/settings", labelKey: "nav.settings" as TranslationKey, icon: Settings, shortcut: null },
] as const;

interface SidebarProps {
  plan?: "free" | "pro" | "api";
}

export function Sidebar({ plan = "free" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    // Prevent body scroll when mobile sidebar is open
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

  const renderNavItem = ({
    href,
    labelKey,
    icon: Icon,
    shortcut,
  }: {
    href: string;
    labelKey: TranslationKey;
    icon: typeof ScanSearch;
    shortcut: string | null;
  }, showLabel: boolean) => {
    const active = isActive(href);
    const label = t(labelKey);
    return (
      <Link
        key={href}
        href={href}
        onClick={closeMobileSidebar}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
          active
            ? "bg-indigo-500/10 text-indigo-300"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
          !showLabel && "justify-center px-0",
        )}
      >
        {/* Active indicator - left bar with glow */}
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
        )}

        <Icon
          className={cn(
            "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
            active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300",
            showLabel ? "ml-0.5" : "ml-0",
          )}
        />

        {showLabel && (
          <>
            <span className="flex-1">{label}</span>
            {shortcut && (
              <kbd className="hidden lg:inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-medium text-zinc-600 bg-zinc-800/80 border border-zinc-700/50 group-hover:text-zinc-500 group-hover:border-zinc-600/50 transition-colors">
                {shortcut}
              </kbd>
            )}
          </>
        )}
      </Link>
    );
  };

  const sidebarContent = (showLabel: boolean, isMobileOverlay: boolean) => (
    <>
      {/* Logo + toggle/close */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800/80 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={closeMobileSidebar}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden group-hover:border-zinc-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <path d="M8 22L14 12L18 16L24 8" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="24" cy="8" r="2" fill="#22C55E"/>
            </svg>
          </div>
          {showLabel && (
            <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap group-hover:text-gradient transition-colors">
              Stock Scanner
            </span>
          )}
        </Link>
        {isMobileOverlay ? (
          <button
            onClick={closeMobileSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all duration-200 shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all duration-200 shrink-0 hidden lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {/* Main nav group */}
        {showLabel && (
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              {t("nav.analysis")}
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => renderNavItem(item, showLabel))}
        </div>

        {/* Separator */}
        <div className={cn("my-3", showLabel ? "mx-3" : "mx-2")}>
          <div className="border-t border-zinc-800/60" />
        </div>

        {/* Secondary nav group */}
        {showLabel && (
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              {t("nav.settings")}
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {SECONDARY_NAV.map((item) => renderNavItem(item, showLabel))}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (hidden on mobile) */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 transition-all duration-300 ease-in-out",
          // Tablet: always collapsed (icons only). Desktop: user-controlled.
          "md:w-16 lg:w-16",
          // On lg screens, respect collapsed state
          !collapsed && "lg:w-60",
        )}
      >
        {/* On md (tablet), always show collapsed. On lg (desktop), respect state. */}
        <div className="hidden md:flex lg:hidden flex-col h-full">
          {sidebarContent(false, false)}
        </div>
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col animate-in slide-in-from-left duration-300">
            {sidebarContent(true, true)}
          </aside>
        </div>
      )}
    </>
  );
}
