"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScanSearch, LineChart, Clock, Bell, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/dashboard", icon: ScanSearch, labelKey: "nav.scanner" as TranslationKey },
  { href: "/dashboard/analyze", icon: LineChart, labelKey: "nav.analyze" as TranslationKey },
  { href: "/dashboard/time-machine", icon: Clock, labelKey: "nav.timeMachine" as TranslationKey },
  { href: "/dashboard/alerts", icon: Bell, labelKey: "nav.alerts" as TranslationKey },
  { href: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" as TranslationKey },
] as const;

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof ScanSearch;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors relative",
        active ? "text-indigo-400" : "text-zinc-500 active:text-zinc-300",
      )}
      aria-label={label}
    >
      <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]")} />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
      {active && (
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={t(item.labelKey)}
            active={isActive(item.href)}
          />
        ))}
      </div>
      {/* Safe area padding for iPhone notch */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
