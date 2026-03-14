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
import { TICKER_DB, type SearchResult } from "@/lib/api";
import { Search, Command, Clock, X } from "lucide-react";

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

interface SearchResultWithSector extends SearchResult {
  sector?: string;
}

// Build a flat array once for search
const ALL_TICKERS: SearchResultWithSector[] = Object.entries(TICKER_DB).map(
  ([symbol, name]) => ({ symbol, name, sector: TICKER_SECTORS[symbol] }),
);

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<SearchResultWithSector[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const displayList = query.length > 0 ? results : recent;
  const showRecent = query.length === 0 && recent.length > 0;

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

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors min-w-[220px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search ticker...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-700/60 text-[10px] text-zinc-500 font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
          <div
            ref={containerRef}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search by ticker or company name..."
                className="flex-1 py-3.5 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSelectedIdx(0);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto">
              {showRecent && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    Recent
                  </span>
                </div>
              )}

              {query.length > 0 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-sm gap-2">
                  <span>No results for &quot;{query}&quot;</span>
                  <span className="text-xs text-zinc-600">
                    Press Enter to search &quot;{query.toUpperCase()}&quot;
                    directly
                  </span>
                </div>
              )}

              {displayList.map((item, idx) => (
                <button
                  key={item.symbol}
                  onClick={() => navigate(item)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-100",
                    idx === selectedIdx
                      ? "bg-indigo-600/15"
                      : "hover:bg-zinc-800/60",
                  )}
                >
                  {showRecent && (
                    <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  )}
                  <span className="font-mono font-semibold text-sm text-zinc-100 w-16 shrink-0">
                    {item.symbol}
                  </span>
                  <span className="text-sm text-zinc-400 truncate flex-1">
                    {item.name}
                  </span>
                  {item.sector && (
                    <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5 shrink-0">
                      {item.sector}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-600">
              <span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  &uarr;&darr;
                </kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  &crarr;
                </kbd>{" "}
                select
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 font-mono">
                  esc
                </kbd>{" "}
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
