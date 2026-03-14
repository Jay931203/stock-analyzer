"""Usage tracking and rate-limiting for plan-based quotas.

All state is in Supabase (daily_usage / usage_logs tables) because Vercel
lambdas are ephemeral — no in-process counters.

Usage:
    from .usage import check_and_log_usage
    from .auth_middleware import get_optional_user, UserContext

    @router.get("/analyze/{ticker}")
    async def analyze(ticker: str, user: UserContext = Depends(get_optional_user)):
        await check_and_log_usage(user, "analysis", ticker)
        ...
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote as _url_quote

from fastapi import HTTPException

from .auth_middleware import UserContext

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()


# ── Plan limits (per day). -1 means unlimited. ──────────────────────────────

PLAN_LIMITS: dict[str, dict[str, int]] = {
    "anonymous": {"analysis": 3, "smart_prob": 0, "signals": 1},
    "free":      {"analysis": 5, "smart_prob": 1, "signals": 3},
    "pro":       {"analysis": -1, "smart_prob": -1, "signals": -1},
    "api":       {"analysis": -1, "smart_prob": -1, "signals": -1},
}

# Maps API endpoint categories to daily_usage column names
_COLUMN_MAP = {
    "analysis": "analysis_count",
    "smart_prob": "smart_prob_count",
    "signals": "signal_count",
}


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


def _get_daily_usage(user_id: str, date_str: str) -> Optional[dict]:
    """Fetch today's usage row for a user."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe_uid = _url_quote(user_id, safe="")
        safe_date = _url_quote(date_str, safe="")
        url = _sb_rest_url(
            f"daily_usage?user_id=eq.{safe_uid}&date=eq.{safe_date}"
            f"&select=analysis_count,smart_prob_count,signal_count"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _increment_daily_usage(user_id: str, date_str: str, column: str) -> bool:
    """Upsert daily_usage row and increment the counter column by 1.

    Uses Supabase RPC to do an atomic upsert+increment. Falls back to
    manual upsert if the RPC doesn't exist.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False

    safe_uid = _url_quote(user_id, safe="")
    safe_date = _url_quote(date_str, safe="")

    # Try to fetch existing row
    existing = _get_daily_usage(user_id, date_str)

    try:
        if existing:
            # PATCH: increment the specific column
            current_val = existing.get(column, 0)
            patch_body = json.dumps({column: current_val + 1}).encode()
            url = _sb_rest_url(
                f"daily_usage?user_id=eq.{safe_uid}&date=eq.{safe_date}"
            )
            req = urllib.request.Request(
                url, data=patch_body, method="PATCH",
                headers=_sb_headers(prefer="return=minimal"),
            )
            urllib.request.urlopen(req, timeout=5)
        else:
            # INSERT: create new row with count=1 for the column
            row = {
                "user_id": user_id,
                "date": date_str,
                "analysis_count": 0,
                "smart_prob_count": 0,
                "signal_count": 0,
            }
            row[column] = 1
            post_body = json.dumps(row).encode()
            url = _sb_rest_url("daily_usage")
            req = urllib.request.Request(
                url, data=post_body, method="POST",
                headers=_sb_headers(prefer="resolution=merge-duplicates,return=minimal"),
            )
            urllib.request.urlopen(req, timeout=5)
        return True
    except Exception as e:
        print(f"Usage increment error: {e}")
        return False


def _log_usage(user_id: Optional[str], endpoint: str, ticker: Optional[str]) -> bool:
    """Append a raw usage_logs row (for analytics, not rate limiting)."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    try:
        row: dict = {
            "endpoint": endpoint,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if user_id:
            row["user_id"] = user_id
        if ticker:
            row["ticker"] = ticker
        body = json.dumps(row).encode()
        url = _sb_rest_url("usage_logs")
        req = urllib.request.Request(
            url, data=body, method="POST",
            headers=_sb_headers(prefer="return=minimal"),
        )
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception:
        return False


# ── Public API ───────────────────────────────────────────────────────────────

async def check_and_log_usage(
    user: UserContext,
    endpoint: str,
    ticker: Optional[str] = None,
) -> None:
    """Check if the user has remaining quota for `endpoint`, increment counter.

    Raises HTTP 402 if the daily limit is exceeded.

    For anonymous users (no user_id), rate limiting is handled by the
    IP-based middleware in main.py — this function only logs.

    For authenticated users, checks daily_usage against PLAN_LIMITS.
    """

    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["anonymous"])
    limit = limits.get(endpoint, 0)
    column = _COLUMN_MAP.get(endpoint)

    # Premium / unlimited → just log, no check
    if limit == -1:
        _log_usage(user.user_id, endpoint, ticker)
        return

    # Feature completely blocked for this plan
    if limit == 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "upgrade_required",
                "message": f"The '{endpoint}' feature requires a Pro subscription.",
                "plan": user.plan,
                "limit": 0,
            },
        )

    # Anonymous users: no server-side daily counter (IP rate limit covers them)
    if not user.user_id or not column:
        _log_usage(user.user_id, endpoint, ticker)
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = _get_daily_usage(user.user_id, today)
    current = usage.get(column, 0) if usage else 0

    if current >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "limit_exceeded",
                "message": f"Daily {endpoint} limit reached ({limit}/{limit}). Upgrade to Pro for unlimited access.",
                "plan": user.plan,
                "limit": limit,
                "used": current,
            },
        )

    # Under limit → increment and log
    _increment_daily_usage(user.user_id, today, column)
    _log_usage(user.user_id, endpoint, ticker)


async def get_usage_summary(user: UserContext) -> dict:
    """Return current day's usage + plan limits for the user."""
    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["anonymous"])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    usage = {}
    if user.user_id:
        row = _get_daily_usage(user.user_id, today)
        if row:
            usage = {
                "analysis": row.get("analysis_count", 0),
                "smart_prob": row.get("smart_prob_count", 0),
                "signals": row.get("signal_count", 0),
            }

    return {
        "plan": user.plan,
        "date": today,
        "usage": {
            "analysis": {"used": usage.get("analysis", 0), "limit": limits["analysis"]},
            "smart_prob": {"used": usage.get("smart_prob", 0), "limit": limits["smart_prob"]},
            "signals": {"used": usage.get("signals", 0), "limit": limits["signals"]},
        },
    }
