"""Supabase-backed signal cache for fast home screen loading."""
from __future__ import annotations

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Optional

# Try to import supabase, gracefully handle if not available
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    Client = None

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

_client: Optional[Client] = None

# Cache TTL in minutes
CACHE_TTL_MINUTES = 30


def _get_client() -> Client | None:
    global _client
    if not HAS_SUPABASE or not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _client is None:
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception:
            return None
    return _client


def read_cached_signals() -> dict | None:
    """Read signals from Supabase cache. Returns None only if no data exists."""
    client = _get_client()
    if not client:
        return None

    try:
        result = client.table("signal_cache").select("*").order("strength", desc=True).execute()
        if not result.data:
            return None

        # Get the update timestamp for display
        latest = result.data[0].get("updated_at", "")

        signals = []
        for row in result.data:
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
    """Write computed signals to Supabase cache."""
    client = _get_client()
    if not client or not signals:
        return False

    try:
        now = datetime.now(timezone.utc).isoformat()

        # Delete old data
        client.table("signal_cache").delete().neq("ticker", "").execute()

        # Insert new data
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
        client.table("signal_cache").insert(rows).execute()
        return True
    except Exception as e:
        print(f"Supabase write error: {e}")
        return False
