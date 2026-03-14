"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./SearchBar";
import { TrendingUp, TrendingDown, User, LogOut } from "lucide-react";

interface IndexPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export function Header() {
  const [indices, setIndices] = useState<IndexPrice[]>([
    { symbol: "SPY", price: 0, change: 0, changePercent: 0 },
    { symbol: "QQQ", price: 0, change: 0, changePercent: 0 },
    { symbol: "DIA", price: 0, change: 0, changePercent: 0 },
  ]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      try {
        const res = await fetch("/api/live-prices?tickers=SPY,QQQ,DIA");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        // Actual response: { prices: { SPY: { price, change, change_pct, market_state }, ... } }
        const prices = data.prices || {};
        const updated = ["SPY", "QQQ", "DIA"].map((sym) => {
          const d = prices[sym] || {};
          return {
            symbol: sym,
            price: d.price ?? 0,
            change: d.change ?? 0,
            changePercent: d.change_pct ?? 0,
          };
        });
        setIndices(updated);
      } catch {
        // silently fail
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex items-center gap-4 h-14 px-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm shrink-0">
      {/* Search */}
      <SearchBar />

      {/* Market indices */}
      <div className="hidden md:flex items-center gap-4 ml-auto">
        {indices.map((idx) => {
          const positive = idx.change >= 0;
          return (
            <div key={idx.symbol} className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500 font-medium">{idx.symbol}</span>
              <span className="font-mono text-zinc-200">
                {idx.price > 0 ? idx.price.toFixed(2) : "--"}
              </span>
              {idx.price > 0 && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-mono",
                    positive ? "text-emerald-400" : "text-red-400",
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
          );
        })}
      </div>

      {/* User menu */}
      <div className="relative ml-auto md:ml-0">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          aria-label="User menu"
        >
          <User className="w-4 h-4" />
        </button>
        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                <User className="w-3.5 h-3.5" />
                Profile
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
