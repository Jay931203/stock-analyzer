"""Supabase-backed signal cache using direct REST API (no heavy SDK)."""
from __future__ import annotations

import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

_SIGNAL_FIELDS = [
    "ticker", "price", "change_pct", "sector",
    "win_rate_5d", "win_rate_20d", "win_rate_60d", "avg_return_20d",
    "occurrences", "condition", "indicators_used", "strength", "tier",
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
        signals = []
        for row in data:
            signals.append({
                "ticker": row["ticker"],
                "price": row["price"],
                "change_pct": row["change_pct"],
                "sector": row.get("sector", ""),
                "win_rate_5d": row["win_rate_5d"],
                "win_rate_20d": row["win_rate_20d"],
                "win_rate_60d": row["win_rate_60d"],
                "avg_return_20d": row.get("avg_return_20d", 0),
                "occurrences": row["occurrences"],
                "condition": row.get("condition", ""),
                "indicators_used": row.get("indicators_used", 0),
                "strength": row["strength"],
                "tier": row.get("tier", "normal"),
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
                "avg_return_20d": sig.get("avg_return_20d", 0),
                "occurrences": sig["occurrences"],
                "condition": sig.get("condition", ""),
                "indicators_used": sig.get("indicators_used", 0),
                "strength": sig["strength"],
                "tier": sig.get("tier", "normal"),
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
