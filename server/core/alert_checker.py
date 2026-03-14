"""Alert evaluation engine.

Checks all active alerts against the latest signal scan results and triggers
notifications for matching conditions. Uses Supabase REST API directly
(same urllib.request pattern as usage.py / auth_middleware.py).

Key design decisions:
  - Fetch all active alerts in one batch query (not per-user).
  - 24-hour cooldown: skip alerts triggered within the last 24 hours.
  - Fetch user emails from Supabase Auth admin API for notifications.
  - Update last_triggered_at after successful notification.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import quote as _url_quote

from .notifier import send_alert_email

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()  # service_role key

_COOLDOWN_HOURS = 24


# ── Supabase REST helpers ────────────────────────────────────────────────────

def _sb_headers(*, prefer: str = "") -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _sb_rest_url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


# ── Data fetching ────────────────────────────────────────────────────────────

def _fetch_all_active_alerts() -> list[dict]:
    """Fetch all active alerts from Supabase in one query."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    try:
        url = _sb_rest_url(
            "alerts?is_active=eq.true"
            "&select=id,user_id,ticker,condition_type,condition_value,last_triggered_at"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"[alert_checker] Failed to fetch alerts: {e}")
        return []


def _fetch_user_email(user_id: str) -> Optional[str]:
    """Fetch user email from Supabase Auth admin API (requires service_role key)."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL}/auth/v1/admin/users/{_url_quote(user_id, safe='')}"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            user_data = json.loads(resp.read().decode())
        return user_data.get("email")
    except Exception as e:
        print(f"[alert_checker] Failed to fetch email for {user_id}: {e}")
        return None


def _update_last_triggered(alert_id: str) -> bool:
    """Set last_triggered_at to now for a triggered alert."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        safe_id = _url_quote(alert_id, safe="")
        url = _sb_rest_url(f"alerts?id=eq.{safe_id}")
        body = json.dumps({"last_triggered_at": now}).encode()
        req = urllib.request.Request(
            url, data=body, method="PATCH",
            headers=_sb_headers(prefer="return=minimal"),
        )
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception as e:
        print(f"[alert_checker] Failed to update last_triggered_at for {alert_id}: {e}")
        return False


# ── Cooldown check ───────────────────────────────────────────────────────────

def _is_within_cooldown(last_triggered_at: Optional[str]) -> bool:
    """Return True if the alert was triggered within the cooldown window."""
    if not last_triggered_at:
        return False
    try:
        ts = datetime.fromisoformat(last_triggered_at.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - ts) < timedelta(hours=_COOLDOWN_HOURS)
    except Exception:
        return False


# ── Condition evaluation ─────────────────────────────────────────────────────

def _evaluate_signal_entry(
    alert: dict,
    signal_map: dict[str, dict],
) -> Optional[dict]:
    """Check if ticker appears in current signals matching the alert criteria.

    Returns context dict if triggered, None otherwise.
    """
    ticker = alert["ticker"].upper()
    signal = signal_map.get(ticker)
    if not signal:
        return None

    cval = alert.get("condition_value", {})
    threshold = cval.get("threshold", 50.0)

    # Check win_rate against threshold (use 20d as primary)
    win_rate = signal.get("win_rate_20d", 0)
    if win_rate < threshold:
        return None

    # Optional preset filter
    preset = cval.get("preset")
    if preset and signal.get("condition", ""):
        # Loose match: preset name should appear in the condition string
        if preset.lower() not in signal.get("condition", "").lower():
            return None

    return {
        "price": signal.get("price", 0),
        "change_pct": signal.get("change_pct", 0),
        "win_rate_20d": win_rate,
        "win_rate_5d": signal.get("win_rate_5d", 0),
        "condition": signal.get("condition", ""),
        "strength": signal.get("strength", 0),
    }


def _evaluate_signal_exit(
    alert: dict,
    signal_map: dict[str, dict],
    previous_signal_tickers: set[str],
) -> Optional[dict]:
    """Check if ticker was in previous scan but disappeared from current signals.

    Returns context dict if triggered, None otherwise.
    """
    ticker = alert["ticker"].upper()

    # Ticker must have been in previous signals but not in current
    if ticker not in previous_signal_tickers:
        return None
    if ticker in signal_map:
        return None

    return {
        "price": 0,  # no current signal data available
        "change_pct": 0,
        "reason": "Ticker no longer appears in signal scan",
    }


def _evaluate_price_above(
    alert: dict,
    signal_map: dict[str, dict],
) -> Optional[dict]:
    """Check if current price >= threshold."""
    ticker = alert["ticker"].upper()
    signal = signal_map.get(ticker)
    if not signal:
        return None

    cval = alert.get("condition_value", {})
    threshold = cval.get("price", 0)
    if not threshold:
        return None

    current_price = signal.get("price", 0)
    if current_price >= threshold:
        return {
            "price": current_price,
            "change_pct": signal.get("change_pct", 0),
            "threshold": threshold,
        }
    return None


def _evaluate_price_below(
    alert: dict,
    signal_map: dict[str, dict],
) -> Optional[dict]:
    """Check if current price <= threshold."""
    ticker = alert["ticker"].upper()
    signal = signal_map.get(ticker)
    if not signal:
        return None

    cval = alert.get("condition_value", {})
    threshold = cval.get("price", 0)
    if not threshold:
        return None

    current_price = signal.get("price", 0)
    if current_price <= threshold:
        return {
            "price": current_price,
            "change_pct": signal.get("change_pct", 0),
            "threshold": threshold,
        }
    return None


_EVALUATORS = {
    "signal_entry": lambda alert, sig_map, prev: _evaluate_signal_entry(alert, sig_map),
    "signal_exit": lambda alert, sig_map, prev: _evaluate_signal_exit(alert, sig_map, prev),
    "price_above": lambda alert, sig_map, prev: _evaluate_price_above(alert, sig_map),
    "price_below": lambda alert, sig_map, prev: _evaluate_price_below(alert, sig_map),
}


# ── Previous signal state (in-memory, persists across cron invocations) ──────

_previous_signal_tickers: set[str] = set()


# ── Main entry point ────────────────────────────────────────────────────────

async def check_alerts_against_signals(signals: list[dict]) -> list[dict]:
    """Check all active alerts against latest signal scan results.

    This is the main entry point, called after each signal refresh.

    Args:
        signals: List of signal dicts from _compute_signals().

    Returns:
        List of triggered alert dicts with context (for logging/monitoring).
    """
    global _previous_signal_tickers

    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    # Build lookup map: ticker -> signal data
    signal_map: dict[str, dict] = {}
    for sig in signals:
        ticker = sig.get("ticker", "").upper()
        if ticker:
            signal_map[ticker] = sig

    current_tickers = set(signal_map.keys())

    # Fetch all active alerts in one batch
    all_alerts = _fetch_all_active_alerts()
    if not all_alerts:
        _previous_signal_tickers = current_tickers
        return []

    triggered: list[dict] = []

    # Cache user emails to avoid duplicate lookups for users with multiple alerts
    email_cache: dict[str, Optional[str]] = {}

    for alert in all_alerts:
        alert_id = alert.get("id", "")
        condition_type = alert.get("condition_type", "")

        # Skip if within cooldown
        if _is_within_cooldown(alert.get("last_triggered_at")):
            continue

        # Evaluate condition
        evaluator = _EVALUATORS.get(condition_type)
        if not evaluator:
            continue

        context = evaluator(alert, signal_map, _previous_signal_tickers)
        if context is None:
            continue

        # Alert triggered — send notification
        user_id = alert.get("user_id", "")
        if user_id not in email_cache:
            email_cache[user_id] = _fetch_user_email(user_id)
        email = email_cache[user_id]

        if email:
            send_alert_email(email, alert, context)

        # Update last_triggered_at regardless of email success
        _update_last_triggered(alert_id)

        triggered.append({
            "alert_id": alert_id,
            "user_id": user_id,
            "ticker": alert.get("ticker", ""),
            "condition_type": condition_type,
            "context": context,
            "email_sent": bool(email),
        })

    # Update previous state for signal_exit detection
    _previous_signal_tickers = current_tickers

    if triggered:
        print(f"[alert_checker] {len(triggered)} alerts triggered out of {len(all_alerts)} active")

    return triggered
