"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { TrendingUp, TrendingDown, User, LogOut, ChevronDown, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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

export function Header() {
  const { t } = useI18n();
  const [indices, setIndices] = useState<IndexPrice[]>([
    { symbol: "SPY", price: 0, change: 0, changePercent: 0 },
    { symbol: "QQQ", price: 0, change: 0, changePercent: 0 },
    { symbol: "DIA", price: 0, change: 0, changePercent: 0 },
  ]);
  const [marketBadge, setMarketBadge] = useState<{ label: string; color: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices(retryCount = 0) {
      try {
        const res = await fetch("/api/live-prices?tickers=SPY,QQQ,DIA");
        if (!res.ok) {
          if (retryCount < 2) {
            setTimeout(() => fetchPrices(retryCount + 1), 3000);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        const prices = data.prices || {};
        const updated = ["SPY", "QQQ", "DIA"].map((sym) => {
          const d = prices[sym] || {};
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

  return (
    <header className="flex items-center gap-2 sm:gap-4 h-14 px-3 sm:px-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shrink-0">
      {/* Hamburger menu - mobile only */}
      <button
        onClick={handleHamburger}
        className="flex md:hidden items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <SearchBar />

      {/* Market indices - ticker tape style - hidden on mobile */}
      <div className="hidden md:flex items-center gap-0 ml-auto">
        {/* Market state badge */}
        {marketBadge && (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700/60 rounded-full px-2.5 py-1 mr-3">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-dot", marketBadge.color)} />
            {marketBadge.label}
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
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
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

      {/* User menu */}
      <div className="relative ml-auto md:ml-0 flex items-center gap-2 sm:gap-2.5">
        {/* Plan badge with gradient */}
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gradient-to-r from-zinc-800 to-zinc-800/80 text-zinc-500 border border-zinc-700/60">
          {t("common.free")}
        </span>

        {/* Modern user menu trigger */}
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all duration-200"
          aria-label="User menu"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700/50">
            <User className="w-3 h-3" />
          </div>
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform duration-200",
            userMenuOpen && "rotate-180",
          )} />
        </button>

        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/20 z-50 py-1 backdrop-blur-lg">
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors rounded-lg mx-0">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                {t("header.profile")}
              </button>
              <div className="mx-2 my-1 border-t border-zinc-800/60" />
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors rounded-lg mx-0">
                <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                {t("header.signOut")}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
