"use client";

import { useState } from "react";
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
    <th className={cn("px-4 py-2.5 font-medium", align)}>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <SortHeader label="Ticker" field="ticker" />
            <th className="px-4 py-2.5 font-medium text-right">Price</th>
            <th className="px-4 py-2.5 font-medium">Signal</th>
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
                "border-b border-border/50 transition-all duration-200",
                hoveredRow === i ? "bg-primary/5" : "hover:bg-muted/30",
              )}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <DirectionIcon direction={s.direction} />
                  <span className="font-semibold font-mono">{s.ticker}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                ${s.price.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    s.direction === "bullish" ? "success" : s.direction === "bearish" ? "danger" : "secondary"
                  }
                >
                  {s.signal}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${s.winRate}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums">{s.winRate}%</span>
                </div>
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right font-mono tabular-nums",
                  s.avgReturn >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(1)}%
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      s.strength >= 80 ? "bg-success" : s.strength >= 60 ? "bg-warning" : "bg-muted-foreground",
                    )}
                  />
                  <span className="font-mono text-xs tabular-nums">{s.strength}</span>
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
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold font-mono">NVDA</span>
          <Badge variant="success">Bullish</Badge>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold tabular-nums">$875.28</div>
          <div className="text-xs font-mono text-success tabular-nums">+2.34%</div>
        </div>
      </div>

      {/* Indicator grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {INDICATORS.map((ind, i) => (
          <div
            key={ind.name}
            className={cn(
              "rounded-lg border p-3 transition-all duration-300 cursor-default",
              hoveredCard === i
                ? "bg-primary/5 border-primary/30 scale-[1.02]"
                : "bg-muted/20 border-border hover:border-border/80",
            )}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">{ind.name}</span>
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
        ))}
      </div>

      {/* Combined score */}
      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground">Combined Signal Probability</span>
          <div className="text-sm font-medium text-foreground mt-0.5">
            7 of 9 indicators bullish
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-primary tabular-nums">78.4%</div>
          <div className="text-[10px] text-muted-foreground">Win Rate (20d)</div>
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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold">March 23, 2020</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">AAPL</Badge>
      </div>

      {/* Signal card */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Signal Fired</p>
            <p className="mt-0.5 font-semibold">Oversold Bounce</p>
          </div>
          <Badge variant="success" className="font-mono text-sm">92% win rate</Badge>
        </div>
      </div>

      {/* Reveal button */}
      <button
        onClick={() => setRevealed(true)}
        className={cn(
          "w-full py-3 rounded-lg text-sm font-medium transition-all duration-300",
          revealed
            ? "bg-success/10 text-success border border-success/20 cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        disabled={revealed}
      >
        {revealed ? "Signal was CORRECT" : "Reveal What Actually Happened"}
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
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Price at Signal</p>
            <p className="mt-1 font-mono font-semibold tabular-nums">$57.31</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">6 Months Later</p>
            <p className="mt-1 font-mono font-semibold text-success tabular-nums">$119.05</p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Return</p>
            <p className="mt-1 font-mono font-bold text-success text-lg tabular-nums">+108%</p>
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
                height: `${v}%`,
                transitionDelay: `${i * 20}ms`,
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>Mar 2020</span>
          <span className="text-success font-medium">Signal</span>
          <span>Sep 2020</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FeatureDemo (main export)                                           */
/* ------------------------------------------------------------------ */

export function FeatureDemo() {
  const [activeTab, setActiveTab] = useState<TabId>("scanner");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-muted/20">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
              aria-selected={isActive}
              role="tab"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="px-4 text-xs text-muted-foreground hidden sm:block">
          Interactive Demo
        </span>
      </div>

      {/* Tab content */}
      <div className="min-h-[380px]">
        {activeTab === "scanner" && <ScannerTab />}
        {activeTab === "analysis" && <AnalysisTab />}
        {activeTab === "timemachine" && <TimeMachineTab />}
      </div>
    </div>
  );
}
