"""Signal Flip Tracker - detects when stocks flip between bullish and bearish."""

from __future__ import annotations

from datetime import datetime

# Previous signals snapshot (in-memory, resets on cold start)
_previous_signals: dict[str, dict] = {}  # ticker -> {win_rate_20d, tier, condition, ts}

# Detected flips
_flips: list[dict] = []
_flips_updated: str = ""


def snapshot_and_detect(signals: list[dict]) -> None:
    """Compare current signals to previous snapshot and detect flips.
    Call this BEFORE writing to cache, passing the newly computed signals.
    """
    global _flips, _flips_updated

    if not _previous_signals:
        # First run: just store snapshot, no flips to detect
        for sig in signals:
            _previous_signals[sig["ticker"]] = {
                "win_rate_20d": sig["win_rate_20d"],
                "tier": sig.get("tier", ""),
                "condition": sig.get("condition", ""),
            }
        return

    new_flips = []
    for sig in signals:
        ticker = sig["ticker"]
        prev = _previous_signals.get(ticker)
        if not prev:
            continue

        prev_wr = prev["win_rate_20d"]
        curr_wr = sig["win_rate_20d"]

        # Detect meaningful flips (crossed 50% threshold with enough delta)
        was_bullish = prev_wr >= 50
        now_bullish = curr_wr >= 50

        if was_bullish != now_bullish and abs(curr_wr - prev_wr) >= 3:
            new_flips.append({
                "ticker": ticker,
                "name": sig.get("name", ticker),
                "price": sig["price"],
                "change_pct": sig["change_pct"],
                "sector": sig.get("sector", ""),
                "prev_win_rate": round(prev_wr, 1),
                "curr_win_rate": round(curr_wr, 1),
                "direction": "bullish" if now_bullish else "bearish",
                "delta": round(curr_wr - prev_wr, 1),
            })

    # Update snapshot
    for sig in signals:
        _previous_signals[sig["ticker"]] = {
            "win_rate_20d": sig["win_rate_20d"],
            "tier": sig.get("tier", ""),
            "condition": sig.get("condition", ""),
        }

    if new_flips:
        _flips = new_flips
        _flips_updated = datetime.now().strftime("%Y-%m-%d %H:%M")


def get_flips() -> dict:
    """Return current detected flips."""
    return {
        "flips": _flips,
        "updated": _flips_updated,
        "count": len(_flips),
    }
