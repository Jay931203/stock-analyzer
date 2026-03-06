"""Supabase-backed signal cache using direct REST API (no heavy SDK)."""
from __future__ import annotations

import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from urllib.parse import quote as _url_quote

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

_SIGNAL_FIELDS = [
    "ticker", "price", "change_pct", "sector",
    "win_rate_5d", "win_rate_20d", "win_rate_60d",
    "win_rate_120d", "win_rate_252d",
    "avg_return_20d", "avg_return_120d", "avg_return_252d",
    "occurrences", "condition", "indicators_used", "strength", "tier",
    "volume_ratio", "volume_level",
    "updated_at",
]


def _headers(*, prefer: str = "") -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _rest_url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


def read_cached_signals() -> dict | None:
    """Read signals from Supabase cache via REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        url = _rest_url("signal_cache?select=*&order=strength.desc")
        req = urllib.request.Request(url, headers=_headers())
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        if not data:
            return None

        latest = data[0].get("updated_at", "")
        # Import enrichment dicts lazily to avoid circular import
        from ..api.routes import TICKER_NAMES, MARKET_CAP_B

        signals = []
        for row in data:
            t = row["ticker"]
            signals.append({
                "ticker": t,
                "name": TICKER_NAMES.get(t, t),
                "price": row["price"],
                "change_pct": row["change_pct"],
                "sector": row.get("sector", ""),
                "market_cap_b": MARKET_CAP_B.get(t, 0),
                "win_rate_5d": row["win_rate_5d"],
                "win_rate_20d": row["win_rate_20d"],
                "win_rate_60d": row["win_rate_60d"],
                "win_rate_120d": row.get("win_rate_120d", 50.0),
                "win_rate_252d": row.get("win_rate_252d", 50.0),
                "avg_return_5d": row.get("avg_return_5d", 0),
                "avg_return_20d": row.get("avg_return_20d", 0),
                "avg_return_60d": row.get("avg_return_60d", 0),
                "avg_return_120d": row.get("avg_return_120d", 0),
                "avg_return_252d": row.get("avg_return_252d", 0),
                "occurrences": row["occurrences"],
                "condition": row.get("condition", ""),
                "indicators_used": row.get("indicators_used", 0),
                "strength": row["strength"],
                "tier": row.get("tier", "normal"),
                "volume_ratio": row.get("volume_ratio", 1.0),
                "volume_level": row.get("volume_level", "normal"),
            })

        updated_str = ""
        if latest:
            try:
                updated = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                updated_str = updated.strftime("%Y-%m-%d %H:%M")
            except Exception:
                updated_str = latest[:16].replace("T", " ")

        return {
            "signals": signals,
            "scanned": len(signals),
            "updated": updated_str,
        }
    except Exception as e:
        print(f"Supabase read error: {e}")
        return None


def write_cached_signals(signals: list[dict]) -> bool:
    """Write computed signals to Supabase cache via REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY or not signals:
        return False

    try:
        now = datetime.now(timezone.utc).isoformat()

        # Delete old data
        del_url = _rest_url("signal_cache?ticker=neq.")
        del_req = urllib.request.Request(del_url, method="DELETE", headers=_headers())
        urllib.request.urlopen(del_req, timeout=10)

        # Build rows
        rows = []
        for sig in signals:
            rows.append({
                "ticker": sig["ticker"],
                "price": sig["price"],
                "change_pct": sig["change_pct"],
                "sector": sig.get("sector", ""),
                "win_rate_5d": sig["win_rate_5d"],
                "win_rate_20d": sig["win_rate_20d"],
                "win_rate_60d": sig["win_rate_60d"],
                "win_rate_120d": sig.get("win_rate_120d", 50.0),
                "win_rate_252d": sig.get("win_rate_252d", 50.0),
                "avg_return_20d": sig.get("avg_return_20d", 0),
                "avg_return_120d": sig.get("avg_return_120d", 0),
                "avg_return_252d": sig.get("avg_return_252d", 0),
                "occurrences": sig["occurrences"],
                "condition": sig.get("condition", ""),
                "indicators_used": sig.get("indicators_used", 0),
                "strength": sig["strength"],
                "tier": sig.get("tier", "normal"),
                "volume_ratio": sig.get("volume_ratio", 1.0),
                "volume_level": sig.get("volume_level", "normal"),
                "updated_at": now,
            })

        # Batch insert
        ins_url = _rest_url("signal_cache")
        body = json.dumps(rows).encode()
        ins_req = urllib.request.Request(
            ins_url, data=body, method="POST",
            headers=_headers(prefer="return=minimal"),
        )
        urllib.request.urlopen(ins_req, timeout=10)
        return True
    except Exception as e:
        print(f"Supabase write error: {e}")
        return False


def read_cached_analysis(ticker: str) -> dict | None:
    """Read cached analysis for a single ticker from Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        safe_ticker = _url_quote(ticker.upper(), safe='')
        url = _rest_url(f"analysis_cache?ticker=eq.{safe_ticker}&select=data,updated_at")
        req = urllib.request.Request(url, headers=_headers())
        with urllib.request.urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read().decode())

        if not rows:
            return None

        row = rows[0]
        updated_at = row.get("updated_at", "")
        data = row.get("data")

        if not data:
            return None

        return {
            "data": data,
            "updated_at": updated_at,
        }
    except Exception as e:
        print(f"Supabase analysis read error: {e}")
        return None


def log_recent_search(ticker: str) -> bool:
    """Log a ticker search to Supabase for global recent-searches display."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        safe_ticker = ticker.upper()
        row = {"ticker": safe_ticker, "searched_at": now}
        url = _rest_url("recent_searches")
        body = json.dumps(row).encode()
        req = urllib.request.Request(
            url, data=body, method="POST",
            headers=_headers(prefer="return=minimal"),
        )
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception:
        return False


def read_recent_searches(limit: int = 20) -> list[str]:
    """Read latest unique searched tickers from Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    try:
        url = _rest_url(
            f"recent_searches?select=ticker,searched_at&order=searched_at.desc&limit={limit * 3}"
        )
        req = urllib.request.Request(url, headers=_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        # Deduplicate keeping order
        seen = set()
        result = []
        for row in data:
            t = row["ticker"]
            if t not in seen:
                seen.add(t)
                result.append(t)
                if len(result) >= limit:
                    break
        return result
    except Exception:
        return []


def write_cached_analysis(ticker: str, data: dict) -> bool:
    """Write (upsert) cached analysis for a single ticker to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False

    try:
        now = datetime.now(timezone.utc).isoformat()
        safe_ticker = ticker.upper()

        row = {
            "ticker": safe_ticker,
            "data": data,
            "updated_at": now,
        }

        url = _rest_url("analysis_cache")
        body = json.dumps(row).encode()
        req = urllib.request.Request(
            url, data=body, method="POST",
            headers=_headers(prefer="resolution=merge-duplicates,return=minimal"),
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"Supabase analysis write error: {e}")
        return False
