"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { TrendingUp, TrendingDown, User, LogOut, ChevronDown, Menu, Globe } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { api, type LivePriceData } from "@/lib/api";

interface IndexPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketState?: string;
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMarketStateBadge(state?: string): { label: string; color: string } | null {
  if (!state) return null;
  const s = state.toLowerCase();
  if (s.includes("open") || s === "regular") return { label: "Live", color: "bg-emerald-500" };
  if (s.includes("pre")) return { label: "Pre", color: "bg-amber-500" };
  if (s.includes("after") || s.includes("post")) return { label: "AH", color: "bg-amber-500" };
  if (s.includes("closed")) return { label: "Closed", color: "bg-zinc-600" };
  return null;
}

/**
 * Compute a human-readable countdown to market open or close.
 * NYSE hours: 9:30 AM - 4:00 PM ET, Mon-Fri.
 */
function getMarketCountdown(t: (key: TranslationKey) => string): string | null {
  const now = new Date();

  // Get current time in ET
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);

  const day = et.getDay(); // 0=Sun, 6=Sat
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const openMinutes = 9 * 60 + 30; // 9:30 AM
  const closeMinutes = 16 * 60;     // 4:00 PM

  // Weekend
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2;
    const minutesUntilOpen = daysUntilMonday * 24 * 60 - totalMinutes + openMinutes;
    return formatCountdown(minutesUntilOpen, t("header.opensIn"));
  }

  // Before market open
  if (totalMinutes < openMinutes) {
    const diff = openMinutes - totalMinutes;
    return formatCountdown(diff, t("header.opensIn"));
  }

  // During market hours
  if (totalMinutes < closeMinutes) {
    const diff = closeMinutes - totalMinutes;
    return formatCountdown(diff, t("header.closesIn"));
  }

  // After market close — show time until next open
  if (day === 5) {
    // Friday after close — next open is Monday
    const minutesUntilOpen = (2 * 24 * 60) + (24 * 60 - totalMinutes) + openMinutes;
    return formatCountdown(minutesUntilOpen, t("header.opensIn"));
  }
  // Weekday after close — next open is tomorrow
  const minutesUntilOpen = (24 * 60 - totalMinutes) + openMinutes;
  return formatCountdown(minutesUntilOpen, t("header.opensIn"));
}

function formatCountdown(totalMinutes: number, prefix: string): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) {
    return `${prefix} ${h}h ${m}m`;
  }
  return `${prefix} ${m}m`;
}

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const [indices, setIndices] = useState<IndexPrice[]>([
    { symbol: "SPY", price: 0, change: 0, changePercent: 0 },
    { symbol: "QQQ", price: 0, change: 0, changePercent: 0 },
    { symbol: "DIA", price: 0, change: 0, changePercent: 0 },
  ]);
  const [marketBadge, setMarketBadge] = useState<{ label: string; color: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Market countdown updates every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => getMarketCountdown(t as (key: TranslationKey) => string), [t, indices]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices(retryCount = 0) {
      try {
        const data = await api.getLivePrices(["SPY", "QQQ", "DIA"]);
        if (cancelled) return;

        const prices = data.prices || {};
        const updated = (["SPY", "QQQ", "DIA"] as const).map((sym) => {
          const d: Partial<LivePriceData> = prices[sym] || {};
          return {
            symbol: sym,
            price: d.price ?? 0,
            change: d.change ?? 0,
            changePercent: d.change_pct ?? 0,
            marketState: d.market_state,
          };
        });
        setIndices(updated);

        const firstState = updated.find((u) => u.marketState)?.marketState;
        setMarketBadge(getMarketStateBadge(firstState));
      } catch {
        if (retryCount < 2) {
          setTimeout(() => fetchPrices(retryCount + 1), 3000);
        }
      }
    }

    fetchPrices();
    const interval = setInterval(() => fetchPrices(), 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleHamburger = () => {
    const fn = (window as unknown as Record<string, unknown>).__openMobileSidebar;
    if (typeof fn === "function") fn();
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "ko" : "en");
  };

  // SPY data for mobile compact view
  const spy = indices[0];

  return (
    <header className="flex items-center gap-2 sm:gap-4 h-14 px-3 sm:px-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shrink-0">
      {/* Hamburger menu - mobile only */}
      <button
        onClick={handleHamburger}
        className="flex md:hidden items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Search */}
      <SearchBar />

      {/* Mobile: compact SPY only */}
      <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
        {spy.price > 0 && (
          <>
            <span className="text-[10px] font-bold text-zinc-500">SPY</span>
            <span className="font-mono text-xs font-semibold text-zinc-200 tabular-nums">
              {formatPrice(spy.price)}
            </span>
            <span
              className={cn(
                "font-mono text-[10px] font-semibold tabular-nums",
                spy.change >= 0 ? "text-emerald-400" : "text-red-400",
              )}
            >
              {spy.change >= 0 ? "+" : ""}
              {spy.changePercent.toFixed(2)}%
            </span>
          </>
        )}
      </div>

      {/* Desktop: Market indices - ticker tape style */}
      <div className="hidden md:flex items-center gap-0 ml-auto">
        {/* Market state badge + countdown */}
        {marketBadge && (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700/60 rounded-full px-2.5 py-1 mr-3">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-dot", marketBadge.color)} />
            {marketBadge.label}
            {countdown && (
              <span className="text-zinc-500 ml-1 border-l border-zinc-700/60 pl-1.5">
                {countdown}
              </span>
            )}
          </span>
        )}
        {/* Show countdown standalone when no badge yet */}
        {!marketBadge && countdown && (
          <span className="text-[10px] font-semibold text-zinc-500 border border-zinc-700/60 rounded-full px-2.5 py-1 mr-3">
            {countdown}
          </span>
        )}

        {indices.map((idx, i) => {
          const positive = idx.change >= 0;
          return (
            <div key={idx.symbol} className="flex items-center">
              {i > 0 && (
                <div className="w-px h-6 bg-zinc-800/60 mx-3" />
              )}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 tracking-wide">{idx.symbol}</span>
                <span className="font-mono text-sm font-semibold text-zinc-100 tabular-nums">
                  {idx.price > 0 ? formatPrice(idx.price) : "--"}
                </span>
                {idx.price > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md tabular-nums",
                      positive
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15"
                        : "text-red-400 bg-red-500/10 border border-red-500/15",
                    )}
                  >
                    {positive ? (
                      <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3 h-3" aria-hidden="true" />
                    )}
                    {positive ? "+" : ""}
                    {idx.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Language toggle + User menu */}
      <div className="relative md:ml-0 flex items-center gap-2 sm:gap-2.5">
        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors text-[11px] font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          aria-label={`Switch language to ${locale === "en" ? "Korean" : "English"}`}
        >
          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{locale === "en" ? "KO" : "EN"}</span>
        </button>

        {/* Plan badge with gradient */}
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gradient-to-r from-zinc-800 to-zinc-800/80 text-zinc-500 border border-zinc-700/60">
          {t("common.free")}
        </span>

        {/* Modern user menu trigger */}
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          aria-label="User menu"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700/50">
            <User className="w-3 h-3" aria-hidden="true" />
          </div>
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform duration-200",
            userMenuOpen && "rotate-180",
          )} aria-hidden="true" />
        </button>

        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/20 z-50 py-1 backdrop-blur-lg" role="menu" aria-label="User menu">
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors rounded-lg mx-0 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" role="menuitem">
                <User className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                {t("header.profile")}
              </button>
              <div className="mx-2 my-1 border-t border-zinc-800/60" role="separator" />
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors rounded-lg mx-0 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none" role="menuitem">
                <LogOut className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                {t("header.signOut")}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
