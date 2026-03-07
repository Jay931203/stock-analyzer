"""Populate earnings cache in Supabase for all major tickers.

Run locally: python -m scripts.populate_earnings
This seeds the Supabase cache so Vercel can serve earnings data
even when Yahoo's quoteSummary API rate-limits cloud IPs.
"""
import sys
import os
import json
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.core.fetcher import fetch_earnings_history
from server.core.supabase_cache import write_cached_earnings
from server.api.constants import POPULAR_TICKERS


def build_response(ticker: str, history: list[dict]) -> dict:
    beats = sum(1 for e in history if e.get("surprise_pct") and e["surprise_pct"] > 0)
    total_with_data = sum(1 for e in history if e.get("surprise_pct") is not None)
    returns_1w = [e["return_1w"] for e in history if e["return_1w"] is not None]
    returns_1m = [e["return_1m"] for e in history if e["return_1m"] is not None]
    return {
        "ticker": ticker,
        "earnings": history,
        "stats": {
            "beat_rate": round(beats / total_with_data * 100) if total_with_data > 0 else None,
            "total_reports": len(history),
            "avg_return_1w": round(sum(returns_1w) / len(returns_1w), 2) if returns_1w else None,
            "avg_return_1m": round(sum(returns_1m) / len(returns_1m), 2) if returns_1m else None,
            "positive_after_1w_pct": round(sum(1 for r in returns_1w if r > 0) / len(returns_1w) * 100) if returns_1w else None,
        }
    }


def main():
    tickers = list(POPULAR_TICKERS)
    print(f"Populating earnings cache for {len(tickers)} tickers...")

    success = 0
    failed = 0

    for i, ticker in enumerate(tickers):
        try:
            history = fetch_earnings_history(ticker, limit=8)
            if history:
                resp = build_response(ticker, history)
                if write_cached_earnings(ticker, resp):
                    success += 1
                    print(f"  [{i+1}/{len(tickers)}] {ticker}: {len(history)} earnings cached")
                else:
                    failed += 1
                    print(f"  [{i+1}/{len(tickers)}] {ticker}: cache write failed")
            else:
                print(f"  [{i+1}/{len(tickers)}] {ticker}: no earnings data")

            # Rate limit protection
            if (i + 1) % 5 == 0:
                time.sleep(2)
        except Exception as e:
            failed += 1
            print(f"  [{i+1}/{len(tickers)}] {ticker}: error - {e}")

    print(f"\nDone: {success} cached, {failed} failed, {len(tickers) - success - failed} no data")


if __name__ == "__main__":
    main()
