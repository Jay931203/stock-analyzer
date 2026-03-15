"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { TrendingUp, TrendingDown, User, LogOut, ChevronDown, Menu, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
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
  if (s.includes("pre")) return { label: "Pre-Market", color: "bg-amber-500" };
  if (s.includes("after") || s.includes("post")) return { label: "After Hours", color: "bg-amber-500" };
  if (s.includes("closed")) return { label: "Closed", color: "bg-zinc-600" };
  return null;
}

/**
 * Compute a clean, compact market status with context.
 * NYSE hours: 9:30 AM - 4:00 PM ET, Mon-Fri.
 *
 * Returns:
 * - status: "closed" | "open" | "pre" | "after"
 * - label: short label (e.g. "Closed", "Live", "Pre-Market")
 * - detail: context string (e.g. "Opens 9:30 AM ET", "45m left")
 * - dotColor: tailwind bg class for the status dot
 */
interface MarketStatus {
  status: "closed" | "open" | "pre" | "after";
  label: string;
  mobileLabel: string;
  detail: string;
  dotColor: string;
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etString);

  const day = et.getDay(); // 0=Sun, 6=Sat
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const openMinutes = 9 * 60 + 30;  // 9:30 AM
  const closeMinutes = 16 * 60;      // 4:00 PM
  const preMinutes = 4 * 60;         // 4:00 AM pre-market
  const afterEndMinutes = 20 * 60;   // 8:00 PM after-hours end

  // Weekend
  if (day === 0 || day === 6) {
    return {
      status: "closed",
      label: "Closed",
      mobileLabel: "Closed",
      detail: "Opens Mon 9:30 AM ET",
      dotColor: "bg-zinc-500",
    };
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (totalMinutes >= preMinutes && totalMinutes < openMinutes) {
    return {
      status: "pre",
      label: "Pre-Market",
      mobileLabel: "Pre",
      detail: "Opens 9:30 AM ET",
      dotColor: "bg-amber-500",
    };
  }

  // Market open: 9:30 AM - 4:00 PM ET
  if (totalMinutes >= openMinutes && totalMinutes < closeMinutes) {
    const remaining = closeMinutes - totalMinutes;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const timeLeft = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    return {
      status: "open",
      label: "Live",
      mobileLabel: "Live",
      detail: timeLeft,
      dotColor: "bg-emerald-500",
    };
  }

  // After hours: 4:00 PM - 8:00 PM ET
  if (totalMinutes >= closeMinutes && totalMinutes < afterEndMinutes) {
    return {
      status: "after",
      label: "After Hours",
      mobileLabel: "AH",
      detail: "Opens 9:30 AM ET",
      dotColor: "bg-amber-500",
    };
  }

  // Before pre-market (midnight - 4 AM) or after post-market (8 PM+)
  if (day === 5 && totalMinutes >= afterEndMinutes) {
    // Friday night — next open is Monday
    return {
      status: "closed",
      label: "Closed",
      mobileLabel: "Closed",
      detail: "Opens Mon 9:30 AM ET",
      dotColor: "bg-zinc-500",
    };
  }

  return {
    status: "closed",
    label: "Closed",
    mobileLabel: "Closed",
    detail: "Opens 9:30 AM ET",
    dotColor: "bg-zinc-500",
  };
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

  // Compute local market status (updates every minute)
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(() => getMarketStatus());
  useEffect(() => {
    const timer = setInterval(() => setMarketStatus(getMarketStatus()), 60_000);
    return () => clearInterval(timer);
  }, []);

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

      {/* Mobile: compact SPY + market dot */}
      <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
        {/* Market status dot + label (mobile) */}
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-semibold",
            marketStatus.status === "open"
              ? "text-emerald-400"
              : marketStatus.status === "pre" || marketStatus.status === "after"
                ? "text-amber-400"
                : "text-zinc-500",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              marketStatus.dotColor,
              marketStatus.status === "open" && "animate-pulse-dot",
            )}
          />
          {locale === "ko" ? (marketStatus.status === "open" ? "실시간" : marketStatus.status === "pre" ? "프리" : marketStatus.status === "after" ? "시간외" : "마감") : marketStatus.mobileLabel}
        </span>
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
        {/* Market status pill */}
        <span
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-semibold border rounded-full px-2.5 py-1 mr-3",
            marketStatus.status === "open"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : marketStatus.status === "pre" || marketStatus.status === "after"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-zinc-700/60 bg-zinc-800/40 text-zinc-400",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              marketStatus.dotColor,
              marketStatus.status === "open" && "animate-pulse-dot",
            )}
          />
          {locale === "ko" ? (marketStatus.status === "open" ? "실시간" : marketStatus.status === "pre" ? "프리마켓" : marketStatus.status === "after" ? "시간 외 거래" : "장 마감") : ((marketBadge?.label) || marketStatus.label)}
          <span className="text-zinc-500 ml-0.5 border-l border-zinc-700/40 pl-1.5">
            {locale === "ko" ? marketStatus.detail.replace("Opens", "개장").replace("left", "남음") : marketStatus.detail}
          </span>
        </span>

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
