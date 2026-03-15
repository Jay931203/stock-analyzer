"use client";

import { useState } from "react";
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
} from "lucide-react";

const MAIN_NAV = [
  { href: "/dashboard", label: "Scanner", icon: ScanSearch },
  { href: "/dashboard/analyze", label: "Analyze", icon: LineChart },
  { href: "/dashboard/time-machine", label: "Time Machine", icon: Clock },
] as const;

const SECONDARY_NAV = [
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

interface SidebarProps {
  plan?: "free" | "pro" | "api";
}

export function Sidebar({ plan = "free" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const planLabel = plan === "api" ? "API" : plan === "pro" ? "Pro" : "Free";
  const planColor =
    plan === "api"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : plan === "pro"
        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
        : "bg-zinc-700/50 text-zinc-400 border-zinc-700";

  const renderNavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof ScanSearch }) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          active
            ? "bg-indigo-600/15 text-indigo-400"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
          collapsed && "justify-center px-0",
        )}
      >
        {/* Active indicator - left border */}
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-indigo-500" />
        )}
        <Icon className={cn("w-[18px] h-[18px] shrink-0", collapsed ? "ml-0" : "ml-0.5")} />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo + Collapse toggle */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden">
            {/* Inline SVG matching favicon.svg */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <path d="M8 22L14 12L18 16L24 8" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="24" cy="8" r="2" fill="#22C55E"/>
            </svg>
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">
              Stock Scanner
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {/* Main nav group */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              Analysis
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {MAIN_NAV.map(renderNavItem)}
        </div>

        {/* Separator */}
        <div className={cn("my-3", collapsed ? "mx-2" : "mx-3")}>
          <div className="border-t border-zinc-800/80" />
        </div>

        {/* Secondary nav group */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              Settings
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {SECONDARY_NAV.map(renderNavItem)}
        </div>
      </nav>

      {/* Plan badge */}
      {!collapsed && (
        <div className="px-2 pb-3 shrink-0 border-t border-zinc-800/80 pt-3">
          <div
            className={cn(
              "flex items-center justify-center py-1.5 rounded-md border text-xs font-medium",
              planColor,
            )}
          >
            {planLabel} Plan
          </div>
        </div>
      )}
    </aside>
  );
}
