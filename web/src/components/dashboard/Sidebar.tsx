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
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Scanner", icon: ScanSearch },
  { href: "/dashboard/analyze", label: "Analyze", icon: LineChart },
  { href: "/dashboard/time-machine", label: "Time Machine", icon: Clock },
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

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">
            Stock Scanner
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600/15 text-indigo-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Plan badge & collapse */}
      <div className="px-2 pb-3 space-y-2 shrink-0">
        {!collapsed && (
          <div
            className={cn(
              "flex items-center justify-center py-1.5 rounded-md border text-xs font-medium",
              planColor,
            )}
          >
            {planLabel} Plan
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
