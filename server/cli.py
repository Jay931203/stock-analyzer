"""CLI tool for quick analysis testing.

Usage:
    python -m server.cli AAPL
    python -m server.cli AAPL --period 5y
"""

import argparse
import io
import sys

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from core.fetcher import fetch_price_history, get_ticker_info
from core.analyzer import compute_all_indicators, get_indicator_state
from core.backtester import calc_probability, calc_combined_probability


def main():
    parser = argparse.ArgumentParser(description="Stock technical analysis CLI")
    parser.add_argument("ticker", help="Stock ticker symbol (e.g. AAPL)")
    parser.add_argument("--period", default="2y", help="Data period: 1y, 2y, 5y")
    args = parser.parse_args()

    ticker = args.ticker.upper()
    print(f"\n{'='*60}")
    print(f"  Stock Analyzer - {ticker}")
    print(f"{'='*60}")

    # Fetch data
    print(f"\n[1/4] Fetching price data ({args.period})...")
    try:
        df = fetch_price_history(ticker, period=args.period)
    except ValueError as e:
        print(f"  ERROR: {e}")
        sys.exit(1)

    print(f"  Got {len(df)} days of data")
    print(f"  Range: {df.index[0].strftime('%Y-%m-%d')} ~ {df.index[-1].strftime('%Y-%m-%d')}")

    current_price = float(df['Close'].iloc[-1])
    prev_price = float(df['Close'].iloc[-2])
    change = current_price - prev_price
    change_pct = change / prev_price * 100
    print(f"  Price: ${current_price:.2f} ({change:+.2f}, {change_pct:+.2f}%)")

    # Compute indicators
    print(f"\n[2/4] Computing indicators...")
    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    # Display indicators
    print(f"\n{'-'*60}")
    print("  INDICATORS")
    print(f"{'-'*60}")

    rsi = indicators["rsi"]["value"]
    print(f"\n  RSI(14): {rsi:.1f}" if rsi else "\n  RSI(14): N/A")

    macd = indicators["macd"]
    print(f"  MACD: {macd['macd']:.4f} | Signal: {macd['signal']:.4f} | Hist: {macd['histogram']:.4f}")
    if states.get("macd_event"):
        print(f"  MACD Event: {states['macd_event']}")

    ma = indicators["ma"]
    print(f"  SMA20: {ma['sma20']:.2f} | SMA50: {ma['sma50']:.2f} | SMA200: {ma['sma200']:.2f}")
    print(f"  MA Alignment: {ma['alignment']}")

    bb = indicators["bb"]
    if bb["upper"]:
        print(f"  BB: [{bb['lower']:.2f} --- {bb['middle']:.2f} --- {bb['upper']:.2f}]")
        print(f"  BB Position: {bb['position']:.2f} (0=lower, 1=upper)" if bb["position"] else "")
        print(f"  BB Zone: {states.get('bb_zone', 'N/A')}")

    vol = indicators["volume"]
    print(f"  Volume: {vol['current']:,.0f} | Avg20: {vol['avg20']:,.0f} | Ratio: {vol['ratio']:.2f}x")

    stoch = indicators["stochastic"]
    if stoch["k"]:
        print(f"  Stochastic: %K={stoch['k']:.1f} | %D={stoch['d']:.1f}")

    # Backtest probabilities
    print(f"\n[3/4] Calculating historical probabilities...")
    print(f"\n{'-'*60}")
    print("  HISTORICAL PROBABILITIES")
    print(f"{'-'*60}")

    probs = []

    if rsi:
        prob = calc_probability(df, "rsi", rsi)
        probs.append(prob)
        _print_probability(prob)

    if states.get("macd_event") in ("golden_cross", "dead_cross"):
        prob = calc_probability(df, f"macd_{states['macd_event']}", "")
        probs.append(prob)
        _print_probability(prob)

    if ma["alignment"] in ("bullish", "bearish"):
        prob = calc_probability(df, f"ma_{ma['alignment']}", "")
        probs.append(prob)
        _print_probability(prob)

    if states.get("bb_zone"):
        prob = calc_probability(df, "bb_zone", states["bb_zone"])
        probs.append(prob)
        _print_probability(prob)

    if vol["ratio"] and vol["ratio"] >= 2.0:
        prob = calc_probability(df, "volume_spike", "")
        probs.append(prob)
        _print_probability(prob)

    if stoch["k"]:
        prob = calc_probability(df, "stoch", stoch["k"])
        probs.append(prob)
        _print_probability(prob)

    # Combined probability
    print(f"\n[4/4] Combined probability...")
    print(f"\n{'-'*60}")
    print("  COMBINED CONDITIONS")
    print(f"{'-'*60}")

    conditions = []
    if "rsi_bin" in states:
        conditions.append({"indicator": "rsi", "state": states["rsi_bin"]})
    if states.get("macd_event"):
        conditions.append({"indicator": "macd_event", "state": states["macd_event"]})
    if states.get("ma_alignment") and states["ma_alignment"] != "none":
        conditions.append({"indicator": "ma_alignment", "state": states["ma_alignment"]})

    if len(conditions) >= 2:
        combined = calc_combined_probability(df, conditions)
        _print_probability(combined)
    else:
        print("\n  Not enough active conditions for combined analysis.")

    print(f"\n{'='*60}")
    print(f"  Analysis complete.")
    print(f"{'='*60}\n")


def _print_probability(prob):
    print(f"\n  {prob.condition}")
    print(f"  Occurrences: {prob.occurrences}")
    if prob.warning:
        print(f"  [!] {prob.warning}")

    if prob.occurrences > 0:
        for days, stats in sorted(prob.periods.items(), key=lambda x: int(x[0])):
            arrow = "UP" if stats["avg_return"] > 0 else "DN" if stats["avg_return"] < 0 else "--"
            print(
                f"    {days:>2}d later: win {stats['win_rate']:>5.1f}% | "
                f"avg {stats['avg_return']:>+6.2f}% {arrow} | "
                f"med {stats['median_return']:>+6.2f}% | "
                f"N={stats['samples']}"
            )


if __name__ == "__main__":
    main()
