"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "scanner", label: "Signal Scanner", icon: Activity },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "timemachine", label: "Time Machine", icon: Clock },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SCANNER_SIGNALS = [
  { ticker: "NVDA", price: 875.28, signal: "RSI Oversold Bounce", direction: "bullish" as const, winRate: 78, avgReturn: 4.2, strength: 92 },
  { ticker: "AAPL", price: 213.07, signal: "MACD Cross Up", direction: "bullish" as const, winRate: 72, avgReturn: 2.8, strength: 85 },
  { ticker: "TSLA", price: 178.54, signal: "BB Squeeze Break", direction: "bullish" as const, winRate: 68, avgReturn: 6.1, strength: 88 },
  { ticker: "MSFT", price: 428.73, signal: "Golden Cross", direction: "bullish" as const, winRate: 74, avgReturn: 3.5, strength: 81 },
  { ticker: "META", price: 502.30, signal: "Volume Breakout", direction: "bullish" as const, winRate: 71, avgReturn: 3.9, strength: 79 },
  { ticker: "AMZN", price: 186.49, signal: "RSI Divergence", direction: "bearish" as const, winRate: 65, avgReturn: -2.1, strength: 73 },
  { ticker: "AMD", price: 162.88, signal: "Stochastic Cross", direction: "bullish" as const, winRate: 69, avgReturn: 5.3, strength: 84 },
];

type SortKey = "ticker" | "winRate" | "avgReturn" | "strength";

const INDICATORS = [
  { name: "RSI (14)", value: "28.4", state: "Oversold", color: "success" as const, description: "Below 30 — historically bounces 72% of the time" },
  { name: "MACD", value: "Golden Cross", state: "Bullish Cross", color: "success" as const, description: "MACD line crossed above signal line" },
  { name: "Bollinger Bands", value: "Squeeze", state: "Compression", color: "warning" as const, description: "Bandwidth at 6-month low — breakout imminent" },
  { name: "Volume", value: "2.8x avg", state: "High Volume", color: "success" as const, description: "Volume 180% above 20-day average" },
  { name: "Stochastic", value: "18.2", state: "Oversold", color: "success" as const, description: "Both %K and %D below 20" },
  { name: "ADX", value: "34.7", state: "Trending", color: "warning" as const, description: "Strong trend in progress (above 25)" },
  { name: "OBV", value: "Rising", state: "Accumulation", color: "success" as const, description: "On-balance volume trend confirms price action" },
  { name: "EMA Cross", value: "9/21", state: "Bullish", color: "success" as const, description: "Short-term EMA above long-term EMA" },
  { name: "ATR", value: "$4.82", state: "Elevated", color: "danger" as const, description: "Average true range is high — volatile conditions" },
];

const MINI_CHART = [40, 35, 28, 22, 18, 15, 12, 10, 8, 10, 14, 20, 28, 35, 42, 50, 55, 60, 65, 70, 74, 78, 82, 85, 88, 90, 93, 96, 98, 100];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function DirectionIcon({ direction }: { direction: "bullish" | "bearish" | "neutral" }) {
  if (direction === "bullish") return <TrendingUp className="h-4 w-4 text-success" />;
  if (direction === "bearish") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

/* ------------------------------------------------------------------ */
/* Scanner Tab                                                         */
/* ------------------------------------------------------------------ */

function ScannerTab() {
  const [sortKey, setSortKey] = useState<SortKey>("winRate");
  const [sortAsc, setSortAsc] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...SCANNER_SIGNALS].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortKey === "ticker") return mul * a.ticker.localeCompare(b.ticker);
    return mul * (b[sortKey] - a[sortKey]);
  });

  const SortHeader = ({ label, field, align }: { label: string; field: SortKey; align?: string }) => (
    <th className={cn("px-4 py-3 font-medium", align)}>
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3 transition-colors", sortKey === field ? "text-primary" : "text-muted-foreground/40")} />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      {/* Live indicator bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-success/[0.03]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">Live Signals</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          7 signals active
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
            <SortHeader label="Ticker" field="ticker" />
            <th className="px-4 py-3 font-medium text-right">Price</th>
            <th className="px-4 py-3 font-medium">Signal</th>
            <SortHeader label="Win Rate" field="winRate" />
            <SortHeader label="Avg Return" field="avgReturn" align="text-right" />
            <SortHeader label="Strength" field="strength" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.ticker}
              className={cn(
                "border-b border-border/30 transition-all duration-200 group/row",
                hoveredRow === i ? "bg-primary/[0.06]" : "hover:bg-muted/30",
              )}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    s.direction === "bullish" ? "bg-success/10" : "bg-destructive/10",
                  )}>
                    <DirectionIcon direction={s.direction} />
                  </div>
                  <span className="font-semibold font-mono tracking-wide">{s.ticker}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                ${s.price.toFixed(2)}
              </td>
              <td className="px-4 py-3.5">
                <Badge
                  variant={
                    s.direction === "bullish" ? "success" : s.direction === "bearish" ? "danger" : "secondary"
                  }
                  className="font-medium"
                >
                  {s.signal}
                </Badge>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        s.winRate >= 75 ? "bg-success" : s.winRate >= 70 ? "bg-primary" : "bg-warning",
                      )}
                      style={{ width: `${s.winRate}%` }}
                    />
                  </div>
                  <span className={cn(
                    "font-mono text-xs tabular-nums font-medium",
                    s.winRate >= 75 ? "text-success" : s.winRate >= 70 ? "text-primary" : "text-warning",
                  )}>{s.winRate}%</span>
                </div>
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-right font-mono tabular-nums font-medium",
                  s.avgReturn >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(1)}%
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={cn(
                          "h-3 w-1 rounded-full transition-colors",
                          n <= Math.round(s.strength / 20)
                            ? s.strength >= 80 ? "bg-success" : s.strength >= 60 ? "bg-warning" : "bg-muted-foreground"
                            : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{s.strength}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analysis Tab                                                        */
/* ------------------------------------------------------------------ */

function AnalysisTab() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono tracking-wide">NVDA</span>
              <Badge variant="success" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Bullish
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">NVIDIA Corporation</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold tabular-nums">$875.28</div>
          <div className="text-xs font-mono text-success tabular-nums font-medium">+$20.14 (+2.34%)</div>
        </div>
      </div>

      {/* Indicator grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {INDICATORS.map((ind, i) => {
          const isGood = ind.color === "success";
          const isBad = ind.color === "danger";
          return (
            <div
              key={ind.name}
              className={cn(
                "rounded-lg border p-3 transition-all duration-300 cursor-default relative overflow-hidden",
                hoveredCard === i
                  ? isGood
                    ? "bg-success/[0.06] border-success/30 scale-[1.02]"
                    : isBad
                    ? "bg-destructive/[0.06] border-destructive/30 scale-[1.02]"
                    : "bg-warning/[0.06] border-warning/30 scale-[1.02]"
                  : "bg-muted/20 border-border hover:border-border/80",
              )}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">{ind.name}</span>
                <Badge variant={ind.color} className="text-[10px] px-1.5 py-0">
                  {ind.state}
                </Badge>
              </div>
              <div className="text-sm font-mono font-semibold tabular-nums">{ind.value}</div>
              <p
                className={cn(
                  "text-[10px] text-muted-foreground/70 leading-relaxed mt-1 overflow-hidden transition-all duration-300",
                  hoveredCard === i ? "max-h-20 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                {ind.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Combined score */}
      <div className="mt-5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Combined Signal Probability</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-success font-medium">7 bullish</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-warning font-medium">1 neutral</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs text-destructive font-medium">1 caution</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-primary tabular-nums">78.4%</div>
          <div className="text-[10px] text-muted-foreground font-medium">Historical Win Rate (20d)</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time Machine Tab                                                    */
/* ------------------------------------------------------------------ */

function TimeMachineTab() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div>
            <span className="text-sm font-semibold">March 23, 2020</span>
            <p className="text-[11px] text-muted-foreground">COVID-19 market crash bottom</p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs gap-1.5 px-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          AAPL
        </Badge>
      </div>

      {/* Signal card */}
      <div className="rounded-xl border border-border bg-background p-4 relative overflow-hidden">
        {/* Subtle scan line effect */}
        <div className="absolute inset-0 pointer-events-none opacity-50 scan-line" />

        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Signal Fired</p>
            <p className="mt-1 font-semibold text-base">Oversold Bounce</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">RSI hit 22.3 with volume spike</p>
          </div>
          <div className="text-right">
            <Badge variant="success" className="font-mono text-sm px-3 py-1">
              92% win rate
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1">Based on 847 historical matches</p>
          </div>
        </div>
      </div>

      {/* Reveal button */}
      <button
        onClick={() => setRevealed(true)}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-500 relative overflow-hidden",
          revealed
            ? "bg-success/10 text-success border border-success/20 cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        disabled={revealed}
      >
        {revealed ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Signal was CORRECT
          </span>
        ) : (
          <span className="relative z-10">Reveal What Actually Happened</span>
        )}
        {/* Animated shimmer on CTA */}
        {!revealed && (
          <span className="absolute inset-0 -translate-x-full animate-[shimmer-btn_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
      </button>

      {/* Results — animated reveal */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-700 ease-out",
          revealed ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {/* Return stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={cn(
            "rounded-xl border border-border bg-muted/20 p-3 text-center",
            revealed && "animate-reveal-up",
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Price at Signal</p>
            <p className="mt-1.5 font-mono font-semibold tabular-nums text-lg">$57.31</p>
          </div>
          <div className={cn(
            "rounded-xl border border-border bg-muted/20 p-3 text-center",
            revealed && "animate-reveal-up delay-100",
          )} style={{ animationDelay: revealed ? "100ms" : undefined }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">6 Months Later</p>
            <p className="mt-1.5 font-mono font-semibold text-success tabular-nums text-lg">$119.05</p>
          </div>
          <div className={cn(
            "rounded-xl border border-success/30 bg-success/[0.06] p-3 text-center",
            revealed && "animate-scale-in",
          )} style={{ animationDelay: revealed ? "200ms" : undefined }}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Return</p>
            <p className="mt-1.5 font-mono font-bold text-success text-2xl tabular-nums">+108%</p>
          </div>
        </div>

        {/* Mini chart */}
        <div className="flex items-end gap-0.5 h-16 px-1">
          {MINI_CHART.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-all duration-500",
                i < 9 ? "bg-destructive/60" : "bg-success/60",
              )}
              style={{
                height: revealed ? `${v}%` : "0%",
                transitionDelay: revealed ? `${300 + i * 25}ms` : "0ms",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>Mar 2020</span>
          <span className="text-success font-medium flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-success" />
            Signal Fired Here
          </span>
          <span>Sep 2020</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FeatureDemo (main export)                                           */
/* ------------------------------------------------------------------ */

const AUTO_CYCLE_INTERVAL = 5000;

export function FeatureDemo() {
  const [activeTab, setActiveTab] = useState<TabId>("scanner");
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycleToNext = useCallback(() => {
    setActiveTab((prev) => {
      const idx = TABS.findIndex((t) => t.id === prev);
      return TABS[(idx + 1) % TABS.length].id;
    });
  }, []);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(cycleToNext, AUTO_CYCLE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, cycleToNext]);

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    // Reset the timer when user manually selects a tab
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(cycleToNext, AUTO_CYCLE_INTERVAL);
  };

  return (
    <div className="relative group/demo">
      {/* Outer glow */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent opacity-0 group-hover/demo:opacity-100 transition-opacity duration-500 blur-sm" />
      <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/20 via-transparent to-transparent animate-border-glow" />

      <div
        className="relative rounded-xl border border-border bg-card overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Tab bar */}
        <div className="flex items-center border-b border-border bg-muted/30">
          {/* Window controls */}
          <div className="flex items-center gap-1.5 pl-4 pr-2">
            <div className="h-3 w-3 rounded-full bg-destructive/40" />
            <div className="h-3 w-3 rounded-full bg-warning/40" />
            <div className="h-3 w-3 rounded-full bg-success/40" />
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-all duration-200 relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70",
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Active indicator with auto-cycle progress */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full overflow-hidden bg-primary/20">
                    <span
                      className={cn(
                        "block h-full bg-primary rounded-full",
                        isPaused ? "animate-none" : "animate-tab-progress",
                      )}
                      key={`${tab.id}-${activeTab}`}
                    />
                  </span>
                )}
              </button>
            );
          })}
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Interactive Demo
            </span>
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-[420px]">
          {activeTab === "scanner" && <ScannerTab />}
          {activeTab === "analysis" && <AnalysisTab />}
          {activeTab === "timemachine" && <TimeMachineTab />}
        </div>
      </div>
    </div>
  );
}
