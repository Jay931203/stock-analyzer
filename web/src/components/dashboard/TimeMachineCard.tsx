"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

interface ForwardReturn {
  period: string;
  expected: number;
  actual: number;
}

interface TimeMachineCardProps {
  ticker: string;
  date: string;
  signal: string;
  direction: "bullish" | "bearish" | "neutral";
  verdict: "correct" | "incorrect" | "partial";
  strength: number;
  forwardReturns: ForwardReturn[];
}

function getVerdictStyles(verdict: TimeMachineCardProps["verdict"]) {
  switch (verdict) {
    case "correct":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20",
        text: "text-emerald-400",
        icon: CheckCircle2,
        label: "Correct",
      };
    case "incorrect":
      return {
        bg: "bg-red-500/10 border-red-500/20",
        text: "text-red-400",
        icon: XCircle,
        label: "Incorrect",
      };
    default:
      return {
        bg: "bg-amber-500/10 border-amber-500/20",
        text: "text-amber-400",
        icon: Minus,
        label: "Partial",
      };
  }
}

export function TimeMachineCard({
  ticker,
  date,
  signal,
  direction,
  verdict,
  strength,
  forwardReturns,
}: TimeMachineCardProps) {
  const v = getVerdictStyles(verdict);
  const VerdictIcon = v.icon;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Verdict header */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 border-b",
          v.bg,
        )}
      >
        <div className="flex items-center gap-3">
          <VerdictIcon className={cn("w-6 h-6", v.text)} />
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {ticker}{" "}
              <span className="text-zinc-500 font-normal text-sm">
                on {date}
              </span>
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-md border",
                  direction === "bullish"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : direction === "bearish"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-zinc-700/30 text-zinc-400 border-zinc-700",
                )}
              >
                {signal}
              </span>
              <span className="text-xs text-zinc-500">
                Strength: {strength.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "text-sm font-semibold px-3 py-1.5 rounded-lg border",
            v.bg,
            v.text,
          )}
        >
          {v.label}
        </div>
      </div>

      {/* Forward returns table */}
      <div className="px-5 py-4">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Forward Returns
        </h4>
        <div className="grid grid-cols-5 gap-3">
          {forwardReturns.map((fr) => {
            const outperformed =
              direction === "bullish"
                ? fr.actual > 0
                : direction === "bearish"
                  ? fr.actual < 0
                  : true;

            return (
              <div
                key={fr.period}
                className="text-center bg-zinc-800/40 rounded-lg p-3"
              >
                <div className="text-[11px] text-zinc-500 font-medium mb-2">
                  {fr.period}
                </div>
                <div
                  className={cn(
                    "text-lg font-mono font-semibold",
                    fr.actual >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {fr.actual >= 0 ? "+" : ""}
                  {fr.actual.toFixed(1)}%
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  exp: {fr.expected >= 0 ? "+" : ""}
                  {fr.expected.toFixed(1)}%
                </div>
                <div className="mt-1.5">
                  {outperformed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 mx-auto" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
