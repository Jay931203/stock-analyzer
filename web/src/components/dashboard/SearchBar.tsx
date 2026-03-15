"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TICKER_DB, api, type SearchResult, type LivePriceData } from "@/lib/api";
import { Search, Command, Clock, X, CornerDownLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const RECENT_KEY = "stock-scanner-recent";
const MAX_RECENT = 8;

// Sector mapping based on TICKER_DB groupings
const TICKER_SECTORS: Record<string, string> = {
  // Technology: Mega-cap
  AAPL: "Technology", AMZN: "Consumer", GOOGL: "Technology", META: "Technology",
  MSFT: "Technology", NVDA: "Technology", TSLA: "Consumer",
  // Semiconductors
  AMAT: "Semis", AMD: "Semis", ARM: "Semis", ASML: "Semis", AVGO: "Semis",
  INTC: "Semis", KLAC: "Semis", LRCX: "Semis", MRVL: "Semis", MU: "Semis",
  QCOM: "Semis", SMCI: "Semis", TSM: "Semis",
  // Enterprise / Cloud
  ADBE: "Software", CRM: "Software", CRWD: "Cyber", DDOG: "Cloud",
  NET: "Cloud", OKTA: "Cyber", ORCL: "Software", PANW: "Cyber",
  PLTR: "Software", SHOP: "Software", SNOW: "Cloud", ZS: "Cyber",
  // Fintech
  AXP: "Finance", COIN: "Fintech", MA: "Payments", MSTR: "Crypto",
  PYPL: "Fintech", SQ: "Fintech", V: "Payments",
  // Consumer
  ABNB: "Consumer", BKNG: "Consumer", CMG: "Consumer", COST: "Retail",
  DASH: "Consumer", HD: "Retail", LOW: "Retail", LULU: "Retail",
  MAR: "Consumer", MCD: "Consumer", NKE: "Consumer", SBUX: "Consumer",
  TGT: "Retail", UBER: "Consumer", WMT: "Retail", YUM: "Consumer",
  // Staples
  KO: "Staples", PEP: "Staples", PG: "Staples",
  // Communication
  CHTR: "Comms", CMCSA: "Comms", DIS: "Media", NFLX: "Media",
  PINS: "Social", SNAP: "Social", SPOT: "Media", TMUS: "Telecom",
  T: "Telecom", VZ: "Telecom",
  // Finance
  BAC: "Banking", BLK: "Finance", "BRK-B": "Finance", C: "Banking",
  CME: "Finance", GS: "Banking", ICE: "Finance", JPM: "Banking",
  MCO: "Finance", MS: "Banking", PNC: "Banking", SCHW: "Finance",
  SPGI: "Finance", TFC: "Banking", UNH: "Health", USB: "Banking",
  WFC: "Banking",
  // Healthcare
  ABBV: "Pharma", AMGN: "Biotech", BDX: "MedDev", BMY: "Pharma",
  DHR: "Health", DXCM: "MedDev", EW: "MedDev", GILD: "Biotech",
  IDXX: "Health", ISRG: "MedDev", JNJ: "Pharma", LLY: "Pharma",
  MDT: "MedDev", MRK: "Pharma", PFE: "Pharma", REGN: "Biotech",
  SYK: "MedDev", TMO: "Health", VRTX: "Biotech", ZTS: "Health",
  // Energy
  COP: "Energy", CVX: "Energy", EOG: "Energy", OXY: "Energy",
  PSX: "Energy", SLB: "Energy", VLO: "Energy", XOM: "Energy",
  // Industrials
  BA: "Aerospace", CAT: "Industrial", DE: "Industrial", EMR: "Industrial",
  FDX: "Logistics", GE: "Aerospace", HON: "Industrial", ITW: "Industrial",
  LMT: "Defense", MMM: "Industrial", RTX: "Defense", UNP: "Transport",
  UPS: "Logistics",
  // Utilities
  AEP: "Utility", DUK: "Utility", NEE: "Utility", SO: "Utility",
  // Real Estate
  AMT: "REIT", CCI: "REIT", EQIX: "REIT", PLD: "REIT",
  // Materials
  APD: "Materials", ECL: "Materials", FCX: "Materials", LIN: "Materials",
  NEM: "Materials", SHW: "Materials",
  // Other
  BABA: "Technology", LCID: "EV", NIO: "EV", RBLX: "Gaming",
  RIVN: "EV", SOFI: "Fintech",
  // ETFs
  ARKK: "ETF", DIA: "ETF", IWM: "ETF", QQQ: "ETF", SPY: "ETF",
};

// Sector badge color mapping
const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-500/15 text-blue-400",
  Semis: "bg-violet-500/15 text-violet-400",
  Software: "bg-indigo-500/15 text-indigo-400",
  Cloud: "bg-sky-500/15 text-sky-400",
  Cyber: "bg-purple-500/15 text-purple-400",
  Finance: "bg-emerald-500/15 text-emerald-400",
  Banking: "bg-emerald-500/15 text-emerald-400",
  Fintech: "bg-teal-500/15 text-teal-400",
  Payments: "bg-green-500/15 text-green-400",
  Crypto: "bg-orange-500/15 text-orange-400",
  Consumer: "bg-pink-500/15 text-pink-400",
  Retail: "bg-rose-500/15 text-rose-400",
  Staples: "bg-lime-500/15 text-lime-400",
  Comms: "bg-cyan-500/15 text-cyan-400",
  Media: "bg-fuchsia-500/15 text-fuchsia-400",
  Social: "bg-pink-500/15 text-pink-400",
  Telecom: "bg-cyan-500/15 text-cyan-400",
  Health: "bg-emerald-500/15 text-emerald-400",
  Pharma: "bg-teal-500/15 text-teal-400",
  Biotech: "bg-green-500/15 text-green-400",
  MedDev: "bg-emerald-500/15 text-emerald-400",
  Energy: "bg-amber-500/15 text-amber-400",
  Aerospace: "bg-slate-500/15 text-slate-400",
  Defense: "bg-slate-500/15 text-slate-400",
  Industrial: "bg-zinc-500/15 text-zinc-400",
  Logistics: "bg-zinc-500/15 text-zinc-400",
  Transport: "bg-zinc-500/15 text-zinc-400",
  Utility: "bg-yellow-500/15 text-yellow-400",
  REIT: "bg-orange-500/15 text-orange-400",
  Materials: "bg-stone-500/15 text-stone-400",
  EV: "bg-lime-500/15 text-lime-400",
  Gaming: "bg-fuchsia-500/15 text-fuchsia-400",
  ETF: "bg-zinc-500/15 text-zinc-400",
};

interface SearchResultWithSector extends SearchResult {
  sector?: string;
}

// Build a flat array once for search
const ALL_TICKERS: SearchResultWithSector[] = Object.entries(TICKER_DB).map(
  ([symbol, name]) => ({ symbol, name, sector: TICKER_SECTORS[symbol] }),
);

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getRecent(): SearchResultWithSector[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecent(item: SearchResultWithSector) {
  const list = getRecent().filter((r) => r.symbol !== item.symbol);
  list.unshift(item);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

export function SearchBar() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<SearchResultWithSector[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [prices, setPrices] = useState<Record<string, LivePriceData>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = "search-listbox";

  // Client-side filter
  const results = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toUpperCase();
    const qLower = query.toLowerCase();

    const exact: SearchResultWithSector[] = [];
    const prefix: SearchResultWithSector[] = [];
    const contains: SearchResultWithSector[] = [];

    for (const item of ALL_TICKERS) {
      if (item.symbol === q) {
        exact.push(item);
      } else if (item.symbol.startsWith(q)) {
        prefix.push(item);
      } else if (
        item.symbol.includes(q) ||
        item.name.toLowerCase().includes(qLower)
      ) {
        contains.push(item);
      }
    }

    return [...exact, ...prefix, ...contains].slice(0, 8);
  }, [query]);

  // Fetch live prices for displayed results
  const displayList = query.length > 0 ? results : recent;
  const showRecent = query.length === 0 && recent.length > 0;

  useEffect(() => {
    if (!open || displayList.length === 0) return;

    const tickers = displayList.map((item) => item.symbol);
    let cancelled = false;

    api.getLivePrices(tickers).then((data) => {
      if (!cancelled && data.prices) {
        setPrices((prev) => ({ ...prev, ...data.prices }));
      }
    }).catch(() => {
      // Silently ignore -- prices are optional enhancement
    });

    return () => { cancelled = true; };
  }, [open, displayList.map((d) => d.symbol).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIdx(0);
    }
  }, [open]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const navigate = (item: SearchResultWithSector) => {
    addRecent(item);
    setOpen(false);
    router.push(`/dashboard/analyze/${item.symbol}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, displayList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (displayList[selectedIdx]) {
        navigate(displayList[selectedIdx]);
      } else if (query.length > 0) {
        // Allow only valid ticker characters (letters, digits, hyphen, dot) and max 10 chars
        const sym = query.toUpperCase().trim().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
        if (sym) {
          const item = { symbol: sym, name: TICKER_DB[sym] || sym, sector: TICKER_SECTORS[sym] };
          addRecent(item);
          setOpen(false);
          router.push(`/dashboard/analyze/${sym}`);
        }
      }
    }
  };

  const activeDescendantId = displayList.length > 0 ? `search-option-${selectedIdx}` : undefined;

  return (
    <>
      {/* Trigger button - compact on mobile, full on desktop */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors min-w-0 sm:min-w-[220px] flex-1 sm:flex-initial max-w-[280px] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        aria-label="Search stocks (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left truncate hidden xs:inline sm:inline">{t("search.searchTicker")}</span>
        <span className="flex-1 text-left xs:hidden sm:hidden">{t("search.search")}</span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-700/60 text-[10px] text-zinc-500 font-mono shrink-0" aria-hidden="true">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search stocks"
        >
          <div
            ref={containerRef}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-reveal-up"
            style={{ animationDuration: "0.2s" }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("search.searchPlaceholder")}
                className="flex-1 py-3.5 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={displayList.length > 0}
                aria-controls={listboxId}
                aria-activedescendant={activeDescendantId}
                aria-autocomplete="list"
                aria-label="Search for a stock ticker or company name"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSelectedIdx(0);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto" id={listboxId} role="listbox" aria-label="Search results">
              {showRecent && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    {t("search.recent")}
                  </span>
                </div>
              )}

              {query.length > 0 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-sm gap-2" role="status">
                  <span>{t("search.noResults")} &quot;{query}&quot;</span>
                  <span className="text-xs text-zinc-600">
                    {t("search.pressEnter")} &quot;{query.toUpperCase()}&quot;
                  </span>
                </div>
              )}

              {displayList.map((item, idx) => {
                const priceData = prices[item.symbol];
                const sectorColor = item.sector ? (SECTOR_COLORS[item.sector] || "bg-zinc-800 text-zinc-500") : "";

                return (
                  <button
                    key={item.symbol}
                    id={`search-option-${idx}`}
                    role="option"
                    aria-selected={idx === selectedIdx}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-150 animate-fade-in-down",
                      idx === selectedIdx
                        ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                        : "hover:bg-zinc-800/60 border-l-2 border-transparent",
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {showRecent && (
                      <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-mono font-semibold text-sm text-zinc-100 w-16 shrink-0">
                      {item.symbol}
                    </span>
                    <span className="text-sm text-zinc-400 truncate flex-1 min-w-0">
                      {item.name}
                    </span>
                    {/* Live price */}
                    {priceData && priceData.price > 0 && (
                      <span className="font-mono text-xs font-medium text-zinc-300 tabular-nums shrink-0">
                        ${formatPrice(priceData.price)}
                      </span>
                    )}
                    {/* Sector badge */}
                    {item.sector && (
                      <span className={cn(
                        "text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0",
                        sectorColor,
                      )}>
                        {item.sector}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-600" aria-hidden="true">
              <span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  &uarr;&darr;
                </kbd>{" "}
                {t("search.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                </kbd>{" "}
                {t("search.select")}
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  esc
                </kbd>{" "}
                {t("search.close")}
              </span>
              {/* "Press Enter to search" hint when there are results */}
              {displayList.length > 0 && (
                <span className="ml-auto text-zinc-600 flex items-center gap-1">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  {t("search.pressEnter")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
