"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const POPULAR_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "AMD"];

export default function TimeMachinePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [ticker, setTicker] = useState("");

  const go = (tk: string) => router.push(`/dashboard/time-machine/${tk}`);

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-3 py-4 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-400" />
          {t("tm.signalTimeMachine")}
        </h1>
        <p className="text-zinc-500 mt-1">
          {t("tm.timeMachineDesc")}
        </p>
      </div>

      {/* Ticker input */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <label className="text-sm font-medium text-zinc-300">{t("tm.enterTicker")}</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && ticker && go(ticker)}
            placeholder="e.g. AAPL"
            className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
          />
          <button
            onClick={() => ticker && go(ticker)}
            disabled={!ticker}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {t("tm.explore")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick picks */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-400">{t("tm.orPickPopular")}</p>
        <div className="grid grid-cols-4 gap-3">
          {POPULAR_TICKERS.map((tk) => (
            <button
              key={tk}
              onClick={() => go(tk)}
              className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 font-mono text-sm font-medium transition-colors"
            >
              {tk}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
