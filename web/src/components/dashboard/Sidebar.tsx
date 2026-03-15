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
  { href: "/dashboard", label: "Scanner", icon: ScanSearch, shortcut: "S" },
  { href: "/dashboard/analyze", label: "Analyze", icon: LineChart, shortcut: "A" },
  { href: "/dashboard/time-machine", label: "Time Machine", icon: Clock, shortcut: "T" },
] as const;

const SECONDARY_NAV = [
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, shortcut: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, shortcut: null },
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

  const renderNavItem = ({
    href,
    label,
    icon: Icon,
    shortcut,
  }: {
    href: string;
    label: string;
    icon: typeof ScanSearch;
    shortcut: string | null;
  }) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
          active
            ? "bg-indigo-500/10 text-indigo-300"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
          collapsed && "justify-center px-0",
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
            collapsed ? "ml-0" : "ml-0.5",
          )}
        />

        {!collapsed && (
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

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo + Collapse toggle */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800/80 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden group-hover:border-zinc-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
              <path d="M8 22L14 12L18 16L24 8" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="24" cy="8" r="2" fill="#22C55E"/>
            </svg>
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap group-hover:text-gradient transition-colors">
              Stock Scanner
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all duration-200 shrink-0"
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
          {MAIN_NAV.map((item) => renderNavItem(item))}
        </div>

        {/* Separator */}
        <div className={cn("my-3", collapsed ? "mx-2" : "mx-3")}>
          <div className="border-t border-zinc-800/60" />
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
          {SECONDARY_NAV.map((item) => renderNavItem(item))}
        </div>
      </nav>
    </aside>
  );
}
