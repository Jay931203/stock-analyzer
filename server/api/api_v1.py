"""Developer API v1 — programmatic access to Stock Analyzer.

All endpoints live under ``/api/v1/`` and require an API-tier subscription
authenticated via the ``X-API-Key`` header.  Responses use a consistent
envelope with ``data`` + ``meta`` (or ``error``) top-level keys.

Rate limit: 10,000 requests / day per API key.
"""

from __future__ import annotations

import re as _re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth_middleware import UserContext, get_user_context
from .usage import (
    PLAN_LIMITS,
    _get_daily_usage,
)

# ── Reuse existing computation functions from internal routes ────────────────

from ..core.analyzer import compute_all_indicators, get_indicator_state
from ..core.backtester import calc_combined_probability
from ..core.fetcher import fetch_price_history
from ..core.smart_matcher import calc_adaptive_combined
from ..core.supabase_cache import read_cached_signals

# Internal route helpers (imported to avoid duplicating logic)
from .routes import (
    _build_current_values,
    _compute_signals,
    _recompute_analysis,
    _to_prob_data,
    _validate_ticker,
)
from .constants import TICKER_NAMES


# ── Constants ────────────────────────────────────────────────────────────────

API_DAILY_LIMIT = 10_000

_VALID_ANALYSIS_PERIODS = {"1y", "2y", "3y", "5y", "10y"}
_VALID_CHART_PERIODS = {"1m", "3m", "6m", "1y", "2y", "5y"}
_PERIOD_TO_YFINANCE = {
    "1m": "1mo",
    "3m": "3mo",
    "6m": "6mo",
    "1y": "1y",
    "2y": "2y",
    "5y": "5y",
}
_INDICATOR_KEY_MAP = {
    "RSI": "rsi",
    "MACD": "macd",
    "MA": "ma",
    "Drawdown": "drawdown",
    "ADX": "adx",
    "BB": "bb",
    "Vol": "volume",
    "Stoch": "stoch",
    "MADist": "ma_distance",
    "Consec": "consecutive",
    "W52": "week52",
}

# ── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/v1",
    tags=["Developer API v1"],
)


# ── Auth dependency ──────────────────────────────────────────────────────────

async def require_api_key(
    user: UserContext = Depends(get_user_context),
) -> UserContext:
    """Require an active API-tier subscription.

    Checks the ``X-API-Key`` header (handled by ``get_user_context``), then
    verifies the user is on the ``api`` plan.
    """
    if not user.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail=_error_body(
                "AUTHENTICATION_REQUIRED",
                "Provide a valid API key via the X-API-Key header.",
            ),
        )
    if user.plan != "api":
        raise HTTPException(
            status_code=403,
            detail=_error_body(
                "API_PLAN_REQUIRED",
                "API access requires an API subscription ($49/mo). "
                "Your current plan: " + user.plan,
            ),
        )
    return user


# ── Rate-limit helper ────────────────────────────────────────────────────────

def _check_api_rate_limit(user: UserContext) -> int:
    """Check and return remaining daily credits.  Raises 429 if exhausted."""
    if not user.user_id:
        return API_DAILY_LIMIT

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = _get_daily_usage(user.user_id, today)
    total_used = 0
    if usage:
        total_used = (
            usage.get("analysis_count", 0)
            + usage.get("smart_prob_count", 0)
            + usage.get("signal_count", 0)
        )

    if total_used >= API_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=_error_body(
                "RATE_LIMIT_EXCEEDED",
                f"Daily API limit exceeded ({API_DAILY_LIMIT}/day). "
                "Resets at midnight UTC.",
                details={"used": total_used, "limit": API_DAILY_LIMIT},
            ),
        )
    return API_DAILY_LIMIT - total_used


# ── Response envelope helpers ────────────────────────────────────────────────

def _envelope(data: Any, credits_remaining: int) -> dict:
    """Wrap ``data`` in the standard response envelope."""
    return {
        "data": data,
        "meta": {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "credits_remaining": credits_remaining,
        },
    }


def _error_body(
    code: str,
    message: str,
    details: dict | None = None,
) -> dict:
    """Build a structured error dict (used as HTTPException ``detail``)."""
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details:
        body["error"]["details"] = details
    return body


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/signals")
async def api_signals(
    user: UserContext = Depends(require_api_key),
):
    """Return the latest signal scanner results for ~150 popular stocks.

    Each signal includes multi-period win rates from adaptive backtesting,
    signal strength, directional tier, and the active indicator conditions.
    """
    remaining = _check_api_rate_limit(user)

    # Try cached signals first (same data the webapp uses)
    signals_data = read_cached_signals()
    if not signals_data or not signals_data.get("signals"):
        # Fall back to live computation
        signals_data = _compute_signals("3y")

    raw_signals = signals_data.get("signals", [])

    clean_signals = []
    for s in raw_signals:
        # Derive active conditions from the condition string
        active_conditions: list[str] = []
        cond = s.get("condition", "")
        if cond:
            active_conditions = [c.strip() for c in cond.split(" & ") if c.strip()]

        # Classify tier
        wr20 = s.get("win_rate_20d", 50)
        tier = _classify_tier(wr20)

        clean_signals.append({
            "ticker": s["ticker"],
            "name": s.get("name", s["ticker"]),
            "price": s.get("price"),
            "change_pct": s.get("change_pct"),
            "signal_strength": s.get("strength", 0),
            "win_rate_5d": s.get("win_rate_5d"),
            "win_rate_20d": s.get("win_rate_20d"),
            "win_rate_60d": s.get("win_rate_60d"),
            "avg_return_20d": s.get("avg_return_20d"),
            "tier": tier,
            "active_conditions": active_conditions,
        })

    data = {
        "signals": clean_signals,
        "scanned": signals_data.get("scanned", 0),
        "updated_at": signals_data.get("updated", ""),
    }
    return _envelope(data, remaining)


@router.get("/analyze/{ticker}")
async def api_analyze(
    ticker: str,
    period: str = Query("10y", description="Backtest period: 1y, 2y, 3y, 5y, or 10y"),
    user: UserContext = Depends(require_api_key),
):
    """Full technical analysis for a single ticker.

    Computes all indicators (RSI, MACD, Bollinger Bands, ADX, etc.) with
    historical probability backtesting.  Returns indicator values, states,
    and forward-looking win rates.
    """
    remaining = _check_api_rate_limit(user)
    ticker = _validate_ticker(ticker)

    if period not in _VALID_ANALYSIS_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_PERIOD",
                f"Period must be one of: {', '.join(sorted(_VALID_ANALYSIS_PERIODS))}",
            ),
        )

    try:
        response = _recompute_analysis(ticker, period)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=_error_body("ANALYSIS_FAILED", f"Analysis computation failed: {e}"),
        )

    data = response.model_dump() if hasattr(response, "model_dump") else response
    return _envelope(data, remaining)


@router.get("/smart-probability/{ticker}")
async def api_smart_probability(
    ticker: str,
    indicators: str = Query(
        ...,
        description="Comma-separated indicator keys: RSI, MACD, MA, BB, Vol, "
                    "Drawdown, ADX, Stoch, MADist, Consec, W52",
    ),
    period: str = Query("10y", description="Backtest period: 1y, 2y, 3y, 5y, or 10y"),
    user: UserContext = Depends(require_api_key),
):
    """Adaptive combined probability using selected indicators.

    Combines multiple technical indicators to compute a historically-backed
    probability of future price movement.  Uses progressive bin widening to
    find statistically significant sample sizes.

    Requires at least 2 indicators.
    """
    remaining = _check_api_rate_limit(user)
    ticker = _validate_ticker(ticker)

    if period not in _VALID_ANALYSIS_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_PERIOD",
                f"Period must be one of: {', '.join(sorted(_VALID_ANALYSIS_PERIODS))}",
            ),
        )

    # Parse indicator list
    raw_keys = [k.strip() for k in indicators.split(",") if k.strip()]
    selected = [_INDICATOR_KEY_MAP[k] for k in raw_keys if k in _INDICATOR_KEY_MAP]

    unknown = [k for k in raw_keys if k not in _INDICATOR_KEY_MAP]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_INDICATORS",
                f"Unknown indicator(s): {', '.join(unknown)}. "
                f"Valid keys: {', '.join(sorted(_INDICATOR_KEY_MAP.keys()))}",
            ),
        )

    if len(selected) < 2:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INSUFFICIENT_INDICATORS",
                "At least 2 indicators are required for combined probability.",
            ),
        )

    # Fetch data and compute
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=_error_body("TICKER_NOT_FOUND", str(e)),
        )

    ind = compute_all_indicators(df)
    states = get_indicator_state(ind)
    current_values = _build_current_values(ind, states)

    result = calc_adaptive_combined(df, selected, current_values)

    # Serialize probability result objects
    tiers = {}
    for tier_name, prob_result in result["tiers"].items():
        tiers[tier_name] = _to_prob_data(prob_result).model_dump()

    individuals = {}
    for ind_key, prob_result in result["individuals"].items():
        individuals[ind_key] = _to_prob_data(prob_result).model_dump()

    impact = {}
    for ind_key, prob_result in result["impact"].items():
        impact[ind_key] = _to_prob_data(prob_result).model_dump()

    data = {
        "tiers": tiers,
        "best_tier": result["best_tier"],
        "individuals": individuals,
        "impact": impact,
        "selected": result["selected"],
        "data_days": result["data_days"],
        "current_values": {
            k: round(v, 4) if isinstance(v, float) else v
            for k, v in current_values.items()
        },
    }
    return _envelope(data, remaining)


@router.get("/time-machine/{ticker}")
async def api_time_machine(
    ticker: str,
    date: str = Query(
        ...,
        description="Historical date in YYYY-MM-DD format (must be >= 5 trading days ago)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    period: str = Query("3y", description="Backtest period: 1y, 2y, 3y, 5y, or 10y"),
    user: UserContext = Depends(require_api_key),
):
    """Signal Time Machine: reconstruct what signals existed on a past date.

    Shows what the system would have predicted on the given date, then
    compares with actual subsequent price movement.  Useful for validating
    the model's historical accuracy.
    """
    remaining = _check_api_rate_limit(user)
    ticker = _validate_ticker(ticker)

    if period not in _VALID_ANALYSIS_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_PERIOD",
                f"Period must be one of: {', '.join(sorted(_VALID_ANALYSIS_PERIODS))}",
            ),
        )

    # Delegate to the existing time machine logic
    import pandas as pd

    try:
        as_of = pd.Timestamp(date)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=_error_body("INVALID_DATE", f"Cannot parse date: {date}"),
        )

    # Auto-adjust weekends
    if as_of.weekday() == 5:
        as_of += pd.Timedelta(days=2)
    elif as_of.weekday() == 6:
        as_of += pd.Timedelta(days=1)
    date = as_of.strftime("%Y-%m-%d")

    five_days_ago = pd.Timestamp.now().normalize() - pd.Timedelta(days=7)
    if as_of > five_days_ago:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "DATE_TOO_RECENT",
                "Date must be at least 5 trading days in the past.",
            ),
        )

    try:
        df_full = fetch_price_history(ticker, period="10y")
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=_error_body("TICKER_NOT_FOUND", str(e)),
        )

    df_past = df_full[df_full.index <= as_of].copy()
    if len(df_past) == 0:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "NO_DATA",
                f"No trading data available on or before {date} for {ticker}.",
            ),
        )

    actual_date_str = str(df_past.index[-1].date())

    if len(df_past) < 200:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INSUFFICIENT_DATA",
                f"Need >= 200 trading days before {actual_date_str}, got {len(df_past)}.",
            ),
        )

    period_days = {"1y": 252, "3y": 756, "5y": 1260, "10y": 2520}
    max_days = period_days.get(period, 756)
    if len(df_past) > max_days:
        df_past = df_past.iloc[-max_days:]

    ind = compute_all_indicators(df_past)
    states = get_indicator_state(ind)
    price_at_date = float(df_past["Close"].iloc[-1])
    current_price = float(df_full["Close"].iloc[-1])

    # Build conditions
    conditions = []
    if "rsi_bin" in states:
        conditions.append({"indicator": "rsi", "state": states["rsi_bin"]})
    if states.get("macd_event"):
        conditions.append({"indicator": "macd_event", "state": states["macd_event"]})
    if states.get("ma_alignment") and states["ma_alignment"] != "none":
        conditions.append({"indicator": "ma_alignment", "state": states["ma_alignment"]})
    if states.get("bb_zone"):
        conditions.append({"indicator": "bb_zone", "state": states["bb_zone"]})
    if states.get("volume_level") and states["volume_level"] != "normal":
        conditions.append({"indicator": "volume_level", "state": states["volume_level"]})
    if states.get("drawdown_60d"):
        conditions.append({"indicator": "drawdown_60d", "state": states["drawdown_60d"]})
    if states.get("adx_trend"):
        conditions.append({"indicator": "adx_trend", "state": states["adx_trend"]})

    signal_direction = "neutral"
    win_rate_20d = None
    occurrences = 0
    win_rates: dict[str, float] = {}

    if len(conditions) >= 2:
        combo_result = calc_combined_probability(df_past, conditions)
        occurrences = combo_result.occurrences
        p20 = combo_result.periods.get(20, {})
        if isinstance(p20, dict):
            win_rate_20d = p20.get("win_rate")
        if win_rate_20d is not None:
            if win_rate_20d >= 55:
                signal_direction = "bullish"
            elif win_rate_20d <= 45:
                signal_direction = "bearish"

        for p_key in [5, 20, 60, 120]:
            p_data = combo_result.periods.get(p_key, {})
            if isinstance(p_data, dict):
                wr = p_data.get("win_rate")
                if wr is not None:
                    win_rates[str(p_key)] = round(wr, 1)

    # Actual forward returns
    df_future = df_full[df_full.index > df_past.index[-1]]
    actual_returns: dict[str, dict] = {}
    for days in [5, 10, 20, 60, 120]:
        if len(df_future) >= days:
            future_price = float(df_future["Close"].iloc[days - 1])
            actual_returns[str(days)] = {
                "return_pct": round(((future_price - price_at_date) / price_at_date) * 100, 2),
                "end_price": round(future_price, 2),
                "went_up": future_price > price_at_date,
            }

    # Accuracy
    accuracy = None
    if signal_direction in ("bullish", "bearish") and "20" in actual_returns:
        actual_went_up = actual_returns["20"]["went_up"]
        was_correct = (
            (signal_direction == "bullish" and actual_went_up)
            or (signal_direction == "bearish" and not actual_went_up)
        )
        accuracy = {
            "predicted_direction": signal_direction,
            "actual_direction": "up" if actual_went_up else "down",
            "was_correct": was_correct,
        }

    # Key indicators at the date
    indicators_at_date = {
        "rsi": ind["rsi"]["value"],
        "macd_histogram": ind["macd"]["histogram"],
        "macd_event": states.get("macd_event"),
        "ma_alignment": states.get("ma_alignment"),
        "bb_zone": states.get("bb_zone"),
        "volume_ratio": ind["volume"]["ratio"],
        "adx": ind.get("adx", {}).get("adx"),
        "drawdown_60d": ind.get("drawdown", {}).get("from_60d_high"),
        "week52_position": ind.get("week52_position", {}).get("position_pct"),
    }

    data = {
        "ticker": ticker.upper(),
        "date": actual_date_str,
        "price_at_date": round(price_at_date, 2),
        "current_price": round(current_price, 2),
        "signal": {
            "direction": signal_direction,
            "win_rate_20d": round(win_rate_20d, 1) if win_rate_20d is not None else None,
            "win_rates": win_rates,
            "occurrences": occurrences,
            "conditions": [
                {"indicator": c["indicator"], "state": c["state"]}
                for c in conditions
            ],
        },
        "actual_returns": actual_returns,
        "accuracy": accuracy,
        "indicators_at_date": indicators_at_date,
    }
    return _envelope(data, remaining)


@router.get("/chart/{ticker}")
async def api_chart(
    ticker: str,
    period: str = Query("1y", description="Chart period: 1m, 3m, 6m, 1y, 2y, or 5y"),
    user: UserContext = Depends(require_api_key),
):
    """Return OHLCV (Open/High/Low/Close/Volume) price data for charting.

    Data is returned as an array of daily bars sorted by date ascending.
    """
    remaining = _check_api_rate_limit(user)
    ticker = _validate_ticker(ticker)

    if period not in _VALID_CHART_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_PERIOD",
                f"Period must be one of: {', '.join(sorted(_VALID_CHART_PERIODS))}",
            ),
        )

    # Map chart periods to fetch_price_history compatible periods
    # fetch_price_history uses 1y/2y/3y/5y/10y — for shorter periods we
    # fetch 1y and trim.
    fetch_period = "1y"
    if period in ("2y", "5y"):
        fetch_period = period
    elif period in ("1m", "3m", "6m"):
        fetch_period = "1y"

    try:
        df = fetch_price_history(ticker, period=fetch_period)
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=_error_body("TICKER_NOT_FOUND", str(e)),
        )

    # Trim to requested period
    import pandas as pd

    period_mapping = {
        "1m": 21,
        "3m": 63,
        "6m": 126,
        "1y": 252,
        "2y": 504,
        "5y": 1260,
    }
    max_bars = period_mapping.get(period, 252)
    if len(df) > max_bars:
        df = df.iloc[-max_bars:]

    bars = []
    for idx, row in df.iterrows():
        bars.append({
            "date": str(idx.date()),
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
        })

    data = {
        "ticker": ticker.upper(),
        "period": period,
        "bars": bars,
        "count": len(bars),
    }
    return _envelope(data, remaining)


@router.get("/alerts")
async def api_list_alerts(
    user: UserContext = Depends(require_api_key),
):
    """List all active alerts for the authenticated API user.

    Returns price alerts and signal-based alerts with their current status.
    """
    remaining = _check_api_rate_limit(user)

    import json
    import os
    import urllib.request
    from urllib.parse import quote as _url_quote

    SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

    if not SUPABASE_URL or not SUPABASE_KEY:
        return _envelope({"alerts": []}, remaining)

    try:
        safe = _url_quote(user.user_id, safe="")
        url = (
            f"{SUPABASE_URL}/rest/v1/alerts"
            f"?user_id=eq.{safe}"
            f"&select=id,ticker,condition_type,condition_value,is_active,"
            f"last_triggered_at,created_at"
            f"&order=created_at.desc"
        )
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            alerts = json.loads(resp.read().decode())
    except Exception:
        alerts = []

    return _envelope({"alerts": alerts}, remaining)


class AlertCreateRequest(BaseModel):
    """Request body for creating a new alert."""

    ticker: str = Field(..., min_length=1, max_length=6, description="Stock ticker symbol")
    condition_type: str = Field(
        ...,
        description="Alert type: signal_entry, signal_exit, price_above, price_below",
    )
    condition_value: dict = Field(
        default_factory=dict,
        description="Condition parameters (e.g., {\"price\": 150.0} for price alerts)",
    )


@router.post("/alerts")
async def api_create_alert(
    body: AlertCreateRequest,
    user: UserContext = Depends(require_api_key),
):
    """Create a new alert (price or signal-based).

    API-tier users have unlimited alerts.  Alerts trigger via the periodic
    signal refresh cron job.
    """
    remaining = _check_api_rate_limit(user)

    import json
    import os
    import urllib.error
    import urllib.request

    SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=503,
            detail=_error_body("SERVICE_UNAVAILABLE", "Database not configured"),
        )

    _VALID_TYPES = {"signal_entry", "signal_exit", "price_above", "price_below"}
    if body.condition_type not in _VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=_error_body(
                "INVALID_CONDITION_TYPE",
                f"Must be one of: {', '.join(sorted(_VALID_TYPES))}",
            ),
        )

    ticker = body.ticker.strip().upper()
    _validate_ticker(ticker)

    # Validate condition_value for price alerts
    if body.condition_type in ("price_above", "price_below"):
        price = body.condition_value.get("price")
        if price is None or not isinstance(price, (int, float)) or price <= 0:
            raise HTTPException(
                status_code=400,
                detail=_error_body(
                    "INVALID_CONDITION_VALUE",
                    "Price alerts require a positive 'price' in condition_value.",
                ),
            )

    row = {
        "user_id": user.user_id,
        "ticker": ticker,
        "condition_type": body.condition_type,
        "condition_value": body.condition_value,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        url = f"{SUPABASE_URL}/rest/v1/alerts"
        req_body = json.dumps(row).encode()
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        req = urllib.request.Request(url, data=req_body, method="POST", headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            created = json.loads(resp.read().decode())
        alert = created[0] if isinstance(created, list) and created else created
    except urllib.error.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=_error_body("ALERT_CREATE_FAILED", "Failed to create alert"),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=_error_body("ALERT_CREATE_FAILED", "Failed to create alert"),
        )

    return _envelope({"alert": alert}, remaining)


@router.get("/usage")
async def api_usage(
    user: UserContext = Depends(require_api_key),
):
    """Return current API usage statistics for the billing period.

    Shows today's request counts, daily limit, and remaining credits.
    """
    remaining = _check_api_rate_limit(user)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage_row = _get_daily_usage(user.user_id, today) if user.user_id else None

    analysis_count = usage_row.get("analysis_count", 0) if usage_row else 0
    smart_prob_count = usage_row.get("smart_prob_count", 0) if usage_row else 0
    signal_count = usage_row.get("signal_count", 0) if usage_row else 0
    total_used = analysis_count + smart_prob_count + signal_count

    data = {
        "plan": user.plan,
        "date": today,
        "daily_limit": API_DAILY_LIMIT,
        "total_used": total_used,
        "credits_remaining": max(0, API_DAILY_LIMIT - total_used),
        "breakdown": {
            "analysis": analysis_count,
            "smart_probability": smart_prob_count,
            "signals": signal_count,
        },
        "subscription": {
            "status": user.status,
            "current_period_end": user.current_period_end,
        },
    }
    return _envelope(data, remaining)


# ── Internal helpers ─────────────────────────────────────────────────────────

def _classify_tier(win_rate_20d: float) -> str:
    """Classify a win rate into a directional tier label."""
    if win_rate_20d >= 65:
        return "strong_bullish"
    elif win_rate_20d >= 55:
        return "bullish"
    elif win_rate_20d <= 35:
        return "strong_bearish"
    elif win_rate_20d <= 45:
        return "bearish"
    return "neutral"
