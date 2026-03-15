"""FastAPI route handlers."""

import os
import re as _re
import time
import traceback
from datetime import datetime, timezone, timedelta

import pandas as pd
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, BackgroundTasks, Response
from pydantic import BaseModel, Field

from .auth_middleware import UserContext, get_optional_user
from .usage import check_and_log_usage

_IS_VERCEL = os.environ.get("VERCEL") is not None

from ..core.analyzer import compute_all_indicators, get_indicator_state
from ..core.backtester import calc_combined_probability, calc_probability
from ..core.fetcher import fetch_batch_quotes, fetch_earnings_dates, fetch_earnings_history, fetch_live_prices, fetch_price_history, get_ticker_info, search_tickers
from ..core.signal_flip import snapshot_and_detect, get_flips
from ..core.economic_calendar import get_economic_events
from ..core.presets import get_preset, list_presets, PRESETS
from ..core.smart_matcher import calc_adaptive_combined
from ..core.supabase_cache import (
    read_cached_signals,
    write_cached_signals,
    read_cached_analysis,
    write_cached_analysis,
    read_cached_earnings,
    write_cached_earnings,
    read_cached_blob,
    write_cached_blob,
    log_recent_search,
    read_recent_searches,
)
from .constants import POPULAR_TICKERS, LEVERAGED_ETFS, SECTOR_MAP, TICKER_NAMES, MARKET_CAP_B, NASDAQ_100
from .schemas import (
    ADXData,
    ATRData,
    AnalysisResponse,
    BBData,
    CaseRecord,
    CombinedProbability,
    ConsecutiveData,
    DrawdownData,
    MACDData,
    MAData,
    MADistanceData,
    PeriodStats,
    PriceInfo,
    ProbabilityData,
    RSIData,
    SearchResponse,
    SearchResult,
    StochasticData,
    TickerInfo,
    TimeMachineRangeResponse,
    TimeMachineResponse,
    VolumeData,
    Week52Data,
)

router = APIRouter(prefix="/api")

_TICKER_RE = _re.compile(r"^[A-Z0-9]{1,5}(-[A-Z])?$")


def _validate_ticker(ticker: str) -> str:
    """Validate and normalize a ticker symbol. Raises HTTPException on invalid input."""
    t = ticker.upper().strip()
    if not _TICKER_RE.match(t):
        raise HTTPException(status_code=400, detail=f"Invalid ticker format: {ticker}")
    return t


@router.get("/analyze/{ticker}", response_model=AnalysisResponse)
async def analyze_ticker(
    ticker: str,
    background_tasks: BackgroundTasks,
    period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$"),
    user: UserContext = Depends(get_optional_user),
):
    """Full analysis: all indicators + historical probabilities.
    Always returns cached data instantly if available. Recomputes in background if stale.
    All features open during launch phase.
    """
    ticker = _validate_ticker(ticker)
    # ── Check cache ──
    cached = read_cached_analysis(ticker)
    if cached and cached.get("data"):
        updated_at = cached.get("updated_at", "")
        is_fresh = _is_analysis_cache_fresh(updated_at)

        # Log search in background
        background_tasks.add_task(log_recent_search, ticker)

        if is_fresh:
            return cached["data"]
        # Stale cache on Vercel: recompute immediately (background tasks unreliable)
        # This is slower but ensures users always see fresh data

    # ── No cache at all: must compute (first ever visit) ──
    response = _recompute_analysis(ticker, period)
    background_tasks.add_task(log_recent_search, ticker)
    return response


def _recompute_analysis(ticker: str, period: str = "10y") -> AnalysisResponse:
    """Heavy computation for a ticker. Called synchronously only on first visit, or in background."""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_df = pool.submit(lambda: fetch_price_history(ticker, period=period))
        future_info = pool.submit(get_ticker_info, ticker)

        try:
            df = future_df.result(timeout=30)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

        try:
            info = future_info.result(timeout=10)
            ticker_info = TickerInfo(**info)
        except Exception:
            ticker_info = TickerInfo(ticker=ticker.upper(), name=ticker.upper())

    close = df["Close"]
    current = float(close.iloc[-1])
    prev = float(close.iloc[-2]) if len(close) > 1 else current
    price = PriceInfo(
        current=round(current, 2),
        change=round(current - prev, 2),
        change_pct=round((current - prev) / prev * 100, 2) if prev else 0,
        high_52w=round(float(close.tail(252).max()), 2) if len(close) >= 252 else None,
        low_52w=round(float(close.tail(252).min()), 2) if len(close) >= 252 else None,
    )

    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    _indicator_mem_cache[f"{ticker.upper()}:{period}"] = {
        "indicators": indicators, "states": states,
        "current_values": _build_current_values(indicators, states),
        "ts": time.time(),
    }
    _evict_cache(_indicator_mem_cache, _INDICATOR_MEM_MAX)

    indicator_results = {}

    # RSI
    rsi_val = indicators["rsi"]["value"]
    rsi_prob = None
    if rsi_val is not None:
        rsi_prob = _to_prob_data(calc_probability(df, "rsi", rsi_val))
    indicator_results["rsi"] = RSIData(value=rsi_val, probability=rsi_prob)

    # MACD
    macd = indicators["macd"]
    macd_event = states.get("macd_event")
    macd_prob = None
    if macd_event in ("golden_cross", "dead_cross"):
        macd_prob = _to_prob_data(calc_probability(df, f"macd_{macd_event}", ""))
    indicator_results["macd"] = MACDData(
        macd=macd["macd"], signal=macd["signal"], histogram=macd["histogram"],
        event=macd_event, probability=macd_prob,
    )

    # Moving Averages
    ma = indicators["ma"]
    ma_prob = None
    if ma["alignment"] in ("bullish", "bearish"):
        ma_prob = _to_prob_data(calc_probability(df, f"ma_{ma['alignment']}", ""))
    indicator_results["ma"] = MAData(
        sma20=ma["sma20"], sma50=ma["sma50"], sma200=ma["sma200"],
        price=ma["price"], alignment=ma["alignment"], probability=ma_prob,
    )

    # Bollinger Bands
    bb = indicators["bb"]
    bb_zone = states.get("bb_zone")
    bb_prob = None
    if bb_zone:
        bb_prob = _to_prob_data(calc_probability(df, "bb_zone", bb_zone))
    indicator_results["bb"] = BBData(
        upper=bb["upper"], middle=bb["middle"], lower=bb["lower"],
        width=bb["width"], position=bb["position"], price=bb["price"],
        zone=bb_zone, probability=bb_prob,
    )

    # Volume
    vol = indicators["volume"]
    vol_prob = None
    if vol["ratio"] is not None and vol["ratio"] >= 2.0:
        vol_prob = _to_prob_data(calc_probability(df, "volume_spike", ""))
    indicator_results["volume"] = VolumeData(
        current=vol["current"], avg20=vol["avg20"], ratio=vol["ratio"], probability=vol_prob,
    )

    # Stochastic
    stoch = indicators["stochastic"]
    stoch_prob = None
    if stoch["k"] is not None:
        stoch_prob = _to_prob_data(calc_probability(df, "stoch", stoch["k"]))
    indicator_results["stochastic"] = StochasticData(
        k=stoch["k"], d=stoch["d"], probability=stoch_prob,
    )

    # Drawdown
    dd = indicators["drawdown"]
    dd_prob = None
    dd_60 = dd.get("from_60d_high")
    if dd_60 is not None:
        dd_prob = _to_prob_data(calc_probability(df, "drawdown", dd_60))
    indicator_results["drawdown"] = DrawdownData(
        from_20d_high=dd.get("from_20d_high"),
        from_60d_high=dd.get("from_60d_high"),
        from_252d_high=dd.get("from_252d_high"),
        high_20d=dd.get("high_20d"),
        high_60d=dd.get("high_60d"),
        high_252d=dd.get("high_252d"),
        probability=dd_prob,
    )

    # ADX
    adx = indicators["adx"]
    adx_val = adx.get("adx")
    adx_prob = None
    if adx_val is not None:
        adx_prob = _to_prob_data(calc_probability(df, "adx", adx_val))
    trend_str = states.get("adx_trend")
    indicator_results["adx"] = ADXData(
        adx=adx_val, plus_di=adx.get("plus_di"), minus_di=adx.get("minus_di"),
        trend_strength=trend_str, probability=adx_prob,
    )

    # ATR
    atr = indicators["atr"]
    indicator_results["atr"] = ATRData(
        atr=atr.get("atr"), atr_pct=atr.get("atr_pct"),
    )

    # MA Distance
    ma_dist = indicators["ma_distance"]
    ma_dist_prob = None
    d20 = ma_dist.get("from_sma20")
    if d20 is not None:
        ma_dist_prob = _to_prob_data(calc_probability(df, "ma_distance", d20))
    indicator_results["ma_distance"] = MADistanceData(
        from_sma20=ma_dist.get("from_sma20"),
        from_sma50=ma_dist.get("from_sma50"),
        from_sma200=ma_dist.get("from_sma200"),
        probability=ma_dist_prob,
    )

    # Consecutive days
    consec = indicators["consecutive"]
    consec_days = consec.get("days", 0)
    consec_prob = None
    if abs(consec_days) >= 3:
        consec_prob = _to_prob_data(calc_probability(df, "consecutive", consec_days))
    indicator_results["consecutive"] = ConsecutiveData(
        days=consec_days, streak_type=consec.get("streak_type", "flat"),
        probability=consec_prob,
    )

    # 52-week position
    w52 = indicators["week52_position"]
    w52_prob = None
    w52_pos = w52.get("position_pct")
    if w52_pos is not None:
        w52_prob = _to_prob_data(calc_probability(df, "week52_position", w52_pos))
    price_distribution = w52.get("price_distribution")
    indicator_results["week52"] = Week52Data(
        position_pct=w52_pos, high=w52.get("high"), low=w52.get("low"),
        probability=w52_prob,
        price_distribution=price_distribution,
    )

    try:
        combined = _calc_combined(df, states, indicators)
    except Exception as exc:
        # Include error in response for debugging
        combined = CombinedProbability(
            conditions=[f"error:{type(exc).__name__}:{str(exc)[:150]}"],
            probability=None, tier="error", occurrences=0,
        )
    data_range = f"{df.index[0].strftime('%Y-%m-%d')} ~ {df.index[-1].strftime('%Y-%m-%d')} ({len(df)} days)"

    response = AnalysisResponse(
        ticker_info=ticker_info,
        price=price,
        indicators=indicator_results,
        combined=combined,
        analysis_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        data_range=data_range,
    )

    # Save to Supabase cache
    try:
        rd = response.model_dump()
        _strip_cases(rd)
        write_cached_analysis(ticker, rd)
    except Exception:
        pass

    return response


@router.get("/probability/{ticker}")
async def get_probability(
    ticker: str,
    conditions: str = Query(..., description="Comma-separated conditions"),
    period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$"),
):
    """Calculate probability for custom condition combinations."""
    ticker = _validate_ticker(ticker)
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    parsed = _parse_conditions(conditions)
    if not parsed:
        raise HTTPException(status_code=400, detail="No valid conditions provided")

    result = calc_combined_probability(df, parsed)
    return _to_prob_data(result)


@router.get("/presets")
async def get_presets():
    return list_presets()


@router.get("/presets/{preset_id}/{ticker}")
async def run_preset(preset_id: str, ticker: str, period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$")):
    ticker = _validate_ticker(ticker)
    preset = get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = calc_combined_probability(df, preset["conditions"])
    return {
        "preset": preset["name"],
        "description": preset["description"],
        "probability": _to_prob_data(result),
    }


class ConditionItem(BaseModel):
    indicator: str = Field(..., max_length=50)
    state: str = Field(..., max_length=100)


class CustomConditionRequest(BaseModel):
    conditions: list[ConditionItem] = Field(..., max_length=10)


@router.post("/probability/{ticker}/custom")
async def custom_probability(ticker: str, req: CustomConditionRequest, period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$")):
    ticker = _validate_ticker(ticker)
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = calc_combined_probability(df, [c.model_dump() for c in req.conditions])
    return _to_prob_data(result)


class SmartProbabilityRequest(BaseModel):
    selected_indicators: list[str]


@router.post("/smart-probability/{ticker}")
async def smart_probability(
    ticker: str,
    req: SmartProbabilityRequest,
    period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$"),
    user: UserContext = Depends(get_optional_user),
):
    """
    Adaptive combined probability with progressive bin widening.
    Open to all users during launch phase.
    """
    ticker = _validate_ticker(ticker)
    key_map = {
        "RSI": "rsi", "MACD": "macd", "MA": "ma", "Drawdown": "drawdown",
        "ADX": "adx", "BB": "bb", "Vol": "volume", "Stoch": "stoch",
        "MADist": "ma_distance", "Consec": "consecutive", "W52": "week52",
    }
    selected = [key_map[k] for k in req.selected_indicators if k in key_map]
    if len(selected) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 indicators")

    # ── Check smart-prob result cache (instant if same indicators) ──
    now = time.time()
    sp_key = f"{ticker.upper()}:{period}:{','.join(sorted(selected))}"
    sp_cached = _smart_prob_cache.get(sp_key)
    if sp_cached and now - sp_cached["ts"] < _SMART_PROB_TTL:
        return sp_cached["result"]

    # ── Fetch df (SQLite cached) ──
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # ── Reuse indicator cache if available (set by analyze_ticker) ──
    ind_key = f"{ticker.upper()}:{period}"
    ind_cached = _indicator_mem_cache.get(ind_key)
    if ind_cached and now - ind_cached["ts"] < _INDICATOR_MEM_TTL:
        current_values = ind_cached["current_values"]
    else:
        indicators = compute_all_indicators(df)
        states = get_indicator_state(indicators)
        current_values = _build_current_values(indicators, states)
        _indicator_mem_cache[ind_key] = {
            "indicators": indicators, "states": states,
            "current_values": current_values, "ts": now,
        }
        _evict_cache(_indicator_mem_cache, _INDICATOR_MEM_MAX)

    result = calc_adaptive_combined(df, selected, current_values)

    # Convert ProbabilityResult objects to dicts
    tiers = {}
    for tier_name, prob_result in result["tiers"].items():
        tiers[tier_name] = _to_prob_data(prob_result).model_dump()

    individuals = {}
    for ind_key_name, prob_result in result["individuals"].items():
        individuals[ind_key_name] = _to_prob_data(prob_result).model_dump()

    impact = {}
    for ind_key_name, prob_result in result["impact"].items():
        impact[ind_key_name] = _to_prob_data(prob_result).model_dump()

    response = {
        "tiers": tiers,
        "best_tier": result["best_tier"],
        "individuals": individuals,
        "impact": impact,
        "selected": result["selected"],
        "data_days": result["data_days"],
        "current_values": {k: round(v, 4) if isinstance(v, float) else v
                          for k, v in current_values.items()},
    }

    # Cache the result
    _smart_prob_cache[sp_key] = {"result": response, "ts": now}
    _evict_cache(_smart_prob_cache, _SMART_PROB_MAX)
    return response


AVAILABLE_SECTORS = ["All"] + sorted(SECTOR_MAP.keys())

# Server-side cache for trending data (5 min TTL)
_trending_cache: dict = {"data": None, "ts": 0}
_TRENDING_TTL = 300  # 5 minutes

# Signal scanning cache (10 min TTL)
_signals_cache: dict = {"data": None, "ts": 0}
_signals_period_cache: dict = {}  # keyed by "signals_{period}", max 4 entries (1y/3y/5y/10y)
_SIGNALS_TTL = 600  # 10 minutes
_EDGE_CACHE_SHORT = "public, s-maxage=300, stale-while-revalidate=3600"
_EDGE_CACHE_MEDIUM = "public, s-maxage=900, stale-while-revalidate=21600"
_EARNINGS_CALENDAR_CACHE_KEY = "CACHE:EARNINGS_CALENDAR"

# In-memory cache for computed indicators (survives within Vercel warm instance)
_indicator_mem_cache: dict = {}  # {ticker:period -> {indicators, states, current_values, ts}}
_INDICATOR_MEM_TTL = 600  # 10 minutes
_INDICATOR_MEM_MAX = 200  # max entries before eviction

# In-memory cache for smart probability results
_smart_prob_cache: dict = {}  # {ticker:period:indicators -> {result, ts}}
_SMART_PROB_TTL = 3600  # 1 hour (indicator values barely change intraday)
_SMART_PROB_MAX = 300  # max entries before eviction

# In-memory cache for time machine results
_time_machine_cache: dict = {}  # {ticker:date:period -> {result, ts}}
_TIME_MACHINE_TTL = 3600  # 1 hour
_TIME_MACHINE_MAX = 200  # max entries before eviction


def _evict_cache(cache: dict, max_size: int) -> None:
    """Evict oldest entries when cache exceeds max_size."""
    if len(cache) <= max_size:
        return
    # Sort by timestamp, remove oldest half
    sorted_keys = sorted(cache.keys(), key=lambda k: cache[k].get("ts", 0))
    to_remove = sorted_keys[: len(sorted_keys) - max_size // 2]
    for k in to_remove:
        cache.pop(k, None)


def _set_cache_control(response: Response | None, value: str) -> None:
    if response is not None:
        response.headers["Cache-Control"] = value


@router.get("/similar/{ticker}")
async def get_similar(ticker: str, limit: int = Query(6, ge=1, le=12)):
    """Get similar tickers from the same sector."""
    ticker = _validate_ticker(ticker)
    upper = ticker
    # Find which sector this ticker belongs to
    for sector, tickers in SECTOR_MAP.items():
        if upper in tickers:
            similar = [t for t in tickers if t != upper][:limit]
            return {"ticker": upper, "sector": sector, "similar": similar}
    # Not in our map - try to find sector from yfinance
    try:
        info = get_ticker_info(upper)
        sector = info.get("sector", "")
        if sector:
            for sec_name, sec_tickers in SECTOR_MAP.items():
                if sec_name.lower() in sector.lower():
                    similar = sec_tickers[:limit]
                    return {"ticker": upper, "sector": sec_name, "similar": similar}
    except Exception:
        pass
    return {"ticker": upper, "sector": "", "similar": []}


@router.get("/signals/refresh")
async def refresh_signals(authorization: str = Header(None), response: Response = None):
    """
    Force recompute signals and update Supabase cache.
    Called by Vercel Cron every 15 minutes.
    """
    _set_cache_control(response, "no-store")
    cron_secret = os.environ.get("CRON_SECRET", "")
    if not cron_secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    if authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = _compute_signals("3y")
    snapshot_and_detect(result["signals"])

    # Update all caches
    cache_key = "signals_3y"
    if cache_key not in _signals_period_cache:
        _signals_period_cache[cache_key] = {"data": None, "ts": 0}
    _signals_period_cache[cache_key]["data"] = result
    _signals_period_cache[cache_key]["ts"] = time.time()
    _signals_cache["data"] = result
    _signals_cache["ts"] = time.time()
    write_cached_signals(result["signals"])
    earnings_snapshot = _build_earnings_calendar_snapshot(result)

    # Check alerts against fresh signals
    alerts_triggered = 0
    try:
        from ..core.alert_checker import check_alerts_against_signals
        triggered = await check_alerts_against_signals(result["signals"])
        alerts_triggered = len(triggered)
    except Exception as e:
        print(f"[refresh] Alert check error: {e}")

    return {
        "status": "ok",
        "signals_count": len(result["signals"]),
        "scanned": len(POPULAR_TICKERS),
        "updated": result["updated"],
        "earnings_count": len(earnings_snapshot.get("earnings", [])),
        "alerts_triggered": alerts_triggered,
    }


@router.get("/signals/flips")
async def signal_flips(response: Response = None):
    """Get stocks that recently flipped between bullish and bearish."""
    _set_cache_control(response, _EDGE_CACHE_SHORT)
    return get_flips()


@router.get("/signals")
async def get_signals(
    limit: int = Query(101, ge=1, le=150),
    data_period: str = Query("3y", pattern="^(1y|2y|3y|5y|10y)$"),
    include_calendar: bool = Query(False),
    include_flips: bool = Query(False),
    background_tasks: BackgroundTasks = None,
    response: Response = None,
    user: UserContext = Depends(get_optional_user),
):
    """
    Combined probability for popular stocks.
    Returns all signals for all users (gating disabled during launch phase).
    Always returns cached data instantly. Refreshes in background if stale.
    """
    _set_cache_control(response, _EDGE_CACHE_SHORT)
    is_default = data_period == "3y"
    now = time.time()
    signals_data = None

    # Per-period in-memory cache
    cache_key = f"signals_{data_period}"
    if cache_key not in _signals_period_cache:
        _signals_period_cache[cache_key] = {"data": None, "ts": 0}
    pcache = _signals_period_cache[cache_key]

    # 1. In-memory cache (any age — always use if available)
    if pcache["data"]:
        signals_data = pcache["data"]

    # 2. Supabase cache fallback (only for default 3y)
    if not signals_data and is_default:
        supabase_data = read_cached_signals()
        if supabase_data:
            pcache["data"] = supabase_data
            pcache["ts"] = now
            signals_data = supabase_data

    # 3. No cache at all: return empty immediately. NEVER compute synchronously.
    # The cron job (/api/signals/refresh) is the ONLY place that computes signals.
    # This prevents 60-second blocking requests on cold start.
    if not signals_data:
        signals_data = {
            "signals": [],
            "scanned": 0,
            "updated": "No data yet. Signals refresh every 15 minutes.",
        }

    # No background refresh here — the cron job (/api/signals/refresh) handles
    # all signal computation every 15 minutes. User requests only read cache.

    # Show all signals to everyone (gating disabled during launch phase)
    all_signals = signals_data["signals"][:limit]
    visible_signals = all_signals
    total_available = len(all_signals)

    payload = {
        "signals": visible_signals,
        "scanned": signals_data["scanned"],
        "updated": signals_data["updated"],
        "market_state": _get_market_state(),
        "total_signals": total_available,
        "is_truncated": not user.is_premium and total_available > 5,
    }

    if include_calendar:
        calendar_events = get_economic_events(days_ahead=30)
        earnings_snapshot = _build_earnings_calendar_snapshot(signals_data)
        for e in earnings_snapshot.get("earnings", []):
            if 0 <= e["days_until"] <= 30:
                calendar_events.append({
                    "date": e["earnings_date"],
                    "type": "EARNINGS",
                    "label": f"{e['ticker']} Earnings",
                    "ticker": e["ticker"],
                    "name": e.get("name", e["ticker"]),
                    "time_of_day": e.get("time_of_day", ""),
                    "impact": "medium",
                    "days_until": e["days_until"],
                })
        try:
            calendar_events.extend(_fetch_past_earnings_for_calendar())
        except Exception:
            pass
        calendar_events.sort(key=lambda x: x["date"])
        payload["calendar"] = calendar_events

    if include_flips:
        payload["flips"] = get_flips()

    return payload


def _compute_signals(data_period: str) -> dict:
    """Synchronous signal computation (heavy). Called only when no cache exists."""
    from concurrent.futures import ThreadPoolExecutor

    # Pass period as part of the argument tuple to avoid race conditions
    args_list = [(ticker, data_period) for ticker in POPULAR_TICKERS]

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(_scan_ticker_combo, args_list))
    valid = [r for r in results if r is not None]
    valid.sort(key=lambda x: x["strength"], reverse=True)

    return {
        "signals": valid,
        "scanned": len(POPULAR_TICKERS),
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


@router.get("/live-prices")
async def live_prices(
    tickers: str = Query(..., description="Comma-separated tickers"),
    response: Response = None,
):
    """Fetch current prices including pre/post market via Yahoo v7 quote API."""
    _set_cache_control(response, "public, s-maxage=30, stale-while-revalidate=60")
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"prices": {}}
    prices = fetch_live_prices(ticker_list[:30])
    return {"prices": prices, "market_state": _get_market_state()}


@router.get("/recent-searches")
async def recent_searches(limit: int = Query(15, ge=1, le=30), response: Response = None):
    """Get recently searched tickers (global across all visitors)."""
    _set_cache_control(response, _EDGE_CACHE_SHORT)
    tickers = read_recent_searches(limit=limit)
    return {"tickers": tickers}


_earnings_cache: dict = {"data": None, "ts": 0}
_EARNINGS_TTL = 21600  # 6 hours


def _build_earnings_calendar_snapshot(
    signals_data: dict | None = None,
    *,
    force_refresh: bool = False,
) -> dict:
    """Build upcoming earnings data, preferring warm memory or persisted cache."""
    now = time.time()

    if not force_refresh and _earnings_cache["data"] and now - _earnings_cache["ts"] < _EARNINGS_TTL:
        return _earnings_cache["data"]

    if not force_refresh:
        cached = read_cached_blob(_EARNINGS_CALENDAR_CACHE_KEY, max_age_seconds=_EARNINGS_TTL)
        if cached and cached.get("data"):
            _earnings_cache["data"] = cached["data"]
            _earnings_cache["ts"] = now
            return cached["data"]

    earnings = fetch_earnings_dates(POPULAR_TICKERS)
    upcoming = [e for e in earnings if 0 <= e["days_until"] <= 14]
    upcoming.sort(key=lambda x: x["days_until"])

    active_signals = signals_data or _signals_cache["data"]
    if active_signals:
        sig_map = {s["ticker"]: s for s in active_signals.get("signals", [])}
        for e in upcoming:
            sig = sig_map.get(e["ticker"])
            if sig:
                e["price"] = sig["price"]
                e["change_pct"] = sig["change_pct"]

    result = {
        "earnings": upcoming,
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    _earnings_cache["data"] = result
    _earnings_cache["ts"] = now
    write_cached_blob(_EARNINGS_CALENDAR_CACHE_KEY, result)
    return result


@router.get("/earnings-calendar")
async def earnings_calendar(response: Response = None):
    """Get stocks with earnings within the next 14 days."""
    _set_cache_control(response, _EDGE_CACHE_MEDIUM)
    return _build_earnings_calendar_snapshot()


@router.get("/earnings-history/{ticker}")
async def earnings_history(ticker: str, limit: int = Query(8, ge=1, le=20)):
    """Get past earnings history with post-earnings price performance."""
    ticker = _validate_ticker(ticker)
    try:
        # Try live fetch first, fall back to Supabase cache
        history = fetch_earnings_history(ticker, limit=limit)

        if history:
            # Cache successful result to Supabase
            _build_and_cache_earnings(ticker, history)
        else:
            # Try reading from Supabase cache
            cached = read_cached_earnings(ticker)
            if cached:
                return cached

        # Calculate aggregate stats
        beats = sum(1 for e in history if e.get("surprise_pct") and e["surprise_pct"] > 0)
        total_with_data = sum(1 for e in history if e.get("surprise_pct") is not None)

        avg_return_1w = None
        avg_return_1m = None
        returns_1w = [e["return_1w"] for e in history if e["return_1w"] is not None]
        returns_1m = [e["return_1m"] for e in history if e["return_1m"] is not None]
        if returns_1w:
            avg_return_1w = round(sum(returns_1w) / len(returns_1w), 2)
        if returns_1m:
            avg_return_1m = round(sum(returns_1m) / len(returns_1m), 2)

        positive_1w = sum(1 for r in returns_1w if r > 0) if returns_1w else 0

        return {
            "ticker": ticker,
            "earnings": history,
            "stats": {
                "beat_rate": round(beats / total_with_data * 100) if total_with_data > 0 else None,
                "total_reports": len(history),
                "avg_return_1w": avg_return_1w,
                "avg_return_1m": avg_return_1m,
                "positive_after_1w_pct": round(positive_1w / len(returns_1w) * 100) if returns_1w else None,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_and_cache_earnings(ticker: str, history: list[dict]):
    """Build earnings response and cache to Supabase in background."""
    beats = sum(1 for e in history if e.get("surprise_pct") and e["surprise_pct"] > 0)
    total_with_data = sum(1 for e in history if e.get("surprise_pct") is not None)
    returns_1w = [e["return_1w"] for e in history if e["return_1w"] is not None]
    returns_1m = [e["return_1m"] for e in history if e["return_1m"] is not None]
    resp = {
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
    try:
        write_cached_earnings(ticker, resp)
    except Exception:
        pass


_past_earnings_cache: dict = {"data": None, "ts": 0}
_PAST_EARNINGS_TTL = 43200  # 12 hours

# Top tickers for past earnings calendar (subset to avoid excessive API calls)
_CALENDAR_EARNINGS_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
    "AVGO", "AMD", "NFLX", "CRM", "COST", "ADBE", "INTC",
    "QCOM", "MU", "PYPL", "SBUX", "COIN", "PLTR",
]


def _fetch_past_earnings_for_calendar() -> list[dict]:
    """Fetch recent past earnings (last 60 days) from top tickers for calendar display.

    Reads from Supabase earnings cache (populated by populate_earnings.py script).
    Uses in-memory cache to avoid repeated Supabase calls (12h TTL).
    """
    now_ts = time.time()
    if _past_earnings_cache["data"] is not None and now_ts - _past_earnings_cache["ts"] < _PAST_EARNINGS_TTL:
        return _past_earnings_cache["data"]

    now = datetime.now()
    cutoff = now - timedelta(days=60)
    events = []

    for ticker in _CALENDAR_EARNINGS_TICKERS:
        try:
            # Read from Supabase cache (fast, no Yahoo API calls)
            cached = read_cached_earnings(ticker)
            if not cached:
                continue
            history = cached.get("earnings", [])
            for e in history:
                earn_date = datetime.strptime(e["date"], "%Y-%m-%d")
                if earn_date >= cutoff:
                    desc_parts = []
                    if e.get("reported_eps") is not None:
                        desc_parts.append(f"EPS: {e['reported_eps']}")
                    if e.get("surprise_pct") is not None:
                        desc_parts.append(f"Surprise: {e['surprise_pct']}%")
                    events.append({
                        "date": e["date"],
                        "type": "EARNINGS",
                        "label": f"{ticker} Earnings",
                        "impact": "medium",
                        "ticker": ticker,
                        "desc": ", ".join(desc_parts) if desc_parts else "",
                    })
        except Exception:
            continue

    _past_earnings_cache["data"] = events
    _past_earnings_cache["ts"] = time.time()
    return events


@router.get("/calendar")
async def market_calendar(days: int = Query(30, ge=7, le=60), response: Response = None):
    """Combined calendar: economic events + upcoming earnings + recent past earnings."""
    _set_cache_control(response, _EDGE_CACHE_MEDIUM)
    now = time.time()

    # Upcoming earnings: only use if already cached (never block on fetch_earnings_dates here)
    earning_events = []
    earnings_snapshot = _build_earnings_calendar_snapshot()
    for e in earnings_snapshot.get("earnings", []):
        if 0 <= e["days_until"] <= days:
            earning_events.append({
                "date": e["earnings_date"],
                "type": "EARNINGS",
                "label": f"{e['ticker']} Earnings",
                "ticker": e["ticker"],
                "name": e.get("name", e["ticker"]),
                "time_of_day": e.get("time_of_day", ""),
                "impact": "medium",
                "days_until": e["days_until"],
            })

    # Past earnings (last 60 days) - uses in-memory cache inside _fetch_past_earnings_for_calendar
    past_earning_events = []
    try:
        past_earning_events = _fetch_past_earnings_for_calendar()
    except Exception:
            pass

    # Economic events (hardcoded, instant)
    econ_events = get_economic_events(days_ahead=days)

    all_events = earning_events + past_earning_events + econ_events
    all_events.sort(key=lambda x: x["date"])

    return {
        "events": all_events,
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


@router.get("/sectors")
async def get_sectors():
    """List available sector filters."""
    return {"sectors": AVAILABLE_SECTORS}


@router.get("/trending")
async def trending_stocks(
    sort: str = Query("change_pct", description="Sort by: change_pct, volume, market_cap, week_return, month_return"),
    limit: int = Query(10, ge=1, le=50),
    sector: str = Query("All", description="Filter by sector"),
    order: str = Query("desc", description="Sort order: asc or desc"),
):
    """Get popular stocks with price, volume, returns data. Cached for 5 minutes."""
    now = time.time()

    # Use cached data if fresh
    if _trending_cache["data"] and now - _trending_cache["ts"] < _TRENDING_TTL:
        all_quotes = _trending_cache["data"]
    else:
        all_quotes = fetch_batch_quotes(POPULAR_TICKERS)

        # Enrich with sector info from our map
        sector_lookup = {}
        for sec, sec_tickers in SECTOR_MAP.items():
            for t in sec_tickers:
                sector_lookup[t] = sec
        for q in all_quotes:
            if not q.get("sector"):
                q["sector"] = sector_lookup.get(q["ticker"], "")

        _trending_cache["data"] = all_quotes
        _trending_cache["ts"] = now

    # Filter by sector
    quotes = all_quotes
    if sector != "All" and sector in SECTOR_MAP:
        sector_tickers = set(SECTOR_MAP[sector])
        quotes = [q for q in all_quotes if q["ticker"] in sector_tickers]

    # Sort
    reverse = order != "asc"
    if sort == "volume":
        quotes.sort(key=lambda x: x.get("volume", 0), reverse=reverse)
    elif sort == "market_cap":
        quotes.sort(key=lambda x: x.get("market_cap", 0), reverse=reverse)
    elif sort == "week_return":
        quotes.sort(key=lambda x: x.get("week_return", 0), reverse=reverse)
    elif sort == "month_return":
        quotes.sort(key=lambda x: x.get("month_return", 0), reverse=reverse)
    else:  # change_pct
        quotes.sort(key=lambda x: x.get("change_pct", 0), reverse=reverse)

    cache_age = int(now - _trending_cache["ts"])
    return {
        "stocks": quotes[:limit],
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "cache_age_sec": cache_age,
    }


@router.get("/search/{query}", response_model=SearchResponse)
async def search(query: str = Path(..., max_length=30), limit: int = Query(10, ge=1, le=50)):
    results = search_tickers(query, limit=limit)
    return SearchResponse(
        query=query,
        results=[SearchResult(**r) for r in results],
    )


@router.get("/conditions")
async def available_conditions():
    """List all available condition types for custom combinations."""
    return {
        "rsi": {
            "label": "RSI",
            "states": ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"],
        },
        "macd_event": {
            "label": "MACD",
            "states": ["golden_cross", "dead_cross", "positive", "negative"],
        },
        "ma_alignment": {
            "label": "Moving Average",
            "states": ["bullish", "bearish"],
        },
        "bb_zone": {
            "label": "Bollinger Band",
            "states": ["below_lower", "lower_quarter", "mid_lower", "mid_upper", "upper_quarter", "above_upper"],
        },
        "volume_level": {
            "label": "Volume",
            "states": ["very_low", "low", "normal", "high", "very_high"],
        },
        "drawdown_60d": {
            "label": "Drawdown (from 60d high)",
            "states": ["near_high", "dip_2_5", "pullback_5_10", "correction_10_20", "crash_20pct_plus"],
        },
        "adx_trend": {
            "label": "ADX (Trend Strength)",
            "states": ["no_trend", "weak_trend", "strong_trend", "very_strong_trend"],
        },
        "consecutive": {
            "label": "Consecutive Days",
            "states": ["up_3_4", "up_5plus", "down_3_4", "down_5plus"],
        },
        "ma20_distance": {
            "label": "Distance from SMA20",
            "states": ["far_below_5pct", "below_2_5pct", "near_ma20", "above_2_5pct", "far_above_5pct"],
        },
    }


# ── Time Machine ──


@router.get("/time-machine/{ticker}/range", response_model=TimeMachineRangeResponse)
async def time_machine_range(ticker: str):
    """Return the available date range for the time machine feature."""
    ticker = _validate_ticker(ticker)
    try:
        df = fetch_price_history(ticker, period="10y")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

    if len(df) < 205:
        raise HTTPException(
            status_code=400,
            detail=f"{ticker.upper()} 데이터가 부족합니다. 최소 205거래일 필요 (현재 {len(df)}일).",
        )

    # First usable date: need 200 data points before it for meaningful indicators
    first_date = str(df.index[200].date())
    # Last usable date: need at least 5 trading days after it for forward returns
    last_date = str(df.index[-6].date()) if len(df) >= 6 else str(df.index[0].date())

    return TimeMachineRangeResponse(
        ticker=ticker.upper(),
        first_date=first_date,
        last_date=last_date,
        total_days=len(df),
    )


@router.get("/time-machine/{ticker}", response_model=TimeMachineResponse)
async def time_machine(
    ticker: str,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    period: str = Query("3y", pattern="^(1y|2y|3y|5y|10y)$"),
):
    """
    Signal Time Machine: shows what signals would have been generated on a past date,
    then compares with what ACTUALLY happened afterward.

    - Fetches full price history (always 10y for maximum forward return data)
    - Truncates to the given date to simulate "what the app would have seen"
    - Computes indicators and combined probability on the truncated data
    - Calculates actual forward returns using the full (future) data
    - Returns accuracy comparison
    """
    ticker = _validate_ticker(ticker)

    # ── Cache check ──
    now = time.time()
    cache_key = f"{ticker}:{date}:{period}"
    cached = _time_machine_cache.get(cache_key)
    if cached and now - cached["ts"] < _TIME_MACHINE_TTL:
        return cached["result"]

    # ── Validate date ──
    try:
        as_of = pd.Timestamp(date)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date}")

    # Auto-adjust weekends to next Monday
    if as_of.weekday() == 5:  # Saturday -> Monday
        as_of += pd.Timedelta(days=2)
    elif as_of.weekday() == 6:  # Sunday -> Monday
        as_of += pd.Timedelta(days=1)
    date = as_of.strftime("%Y-%m-%d")

    # Must be at least 5 trading days ago
    five_days_ago = pd.Timestamp.now().normalize() - pd.Timedelta(days=7)  # ~5 trading days
    if as_of > five_days_ago:
        raise HTTPException(
            status_code=400,
            detail=f"너무 최근 날짜입니다. 최소 5거래일 이전 날짜를 선택하세요.",
        )

    # ── Fetch full price history (always 10y for maximum forward data) ──
    try:
        df_full = fetch_price_history(ticker, period="10y")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

    # ── Truncate data to the given date ──
    df_past = df_full[df_full.index <= as_of].copy()

    # If exact date not found, snap to nearest earlier trading day
    if len(df_past) == 0 or df_past.index[-1].date() != as_of.date():
        if len(df_past) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No trading data available on or before {date} for {ticker}.",
            )
        # Use the last available date before as_of
        actual_date = df_past.index[-1]
        as_of = actual_date

    actual_date_str = str(as_of.date())

    # Need at least 200 data points before the date for meaningful indicators
    if len(df_past) < 200:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient historical data before {actual_date_str}. "
                   f"Need at least 200 trading days, got {len(df_past)}. "
                   f"Try a later date.",
        )

    # ── Apply period trimming to past data (for backtest consistency) ──
    period_days = {"1y": 252, "3y": 756, "5y": 1260, "10y": 2520}
    max_days = period_days.get(period, 756)
    if len(df_past) > max_days:
        df_past = df_past.iloc[-max_days:]

    # ── Compute indicators on truncated data ──
    indicators = compute_all_indicators(df_past)
    states = get_indicator_state(indicators)

    price_at_date = float(df_past["Close"].iloc[-1])
    current_price = float(df_full["Close"].iloc[-1])

    # ── Compute combined probability using adaptive matching ──
    current_values = _build_current_values(indicators, states)

    selected_indicators = []
    if "rsi_bin" in states:
        selected_indicators.append("rsi")
    if states.get("macd_event"):
        selected_indicators.append("macd")
    if states.get("ma_alignment") and states["ma_alignment"] != "none":
        selected_indicators.append("ma")
    if states.get("bb_zone"):
        selected_indicators.append("bb")
    if states.get("volume_level") and states["volume_level"] != "normal":
        selected_indicators.append("volume")
    if states.get("drawdown_60d"):
        selected_indicators.append("drawdown")
    if states.get("adx_trend"):
        selected_indicators.append("adx")

    # Determine signal direction and win rate from adaptive combined probability
    signal_direction = "neutral"
    win_rate_20d = None
    occurrences = 0
    used_tier = None
    best_tier_data = None

    if len(selected_indicators) >= 2:
        smart_result = calc_adaptive_combined(
            df_past,
            selected_indicators,
            current_values,
            lookback_days=len(df_past),
            compute_impact=False,
        )

        # Pick the best tier (strict > normal > relaxed) with enough samples
        for tier_name in ["strict", "normal", "relaxed"]:
            tier_prob = smart_result.get("tiers", {}).get(tier_name)
            if tier_prob and tier_prob.occurrences >= 5:
                best_tier_data = tier_prob
                used_tier = tier_name
                break

        if not best_tier_data:
            # Fall back to relaxed even if < 5 occurrences
            for tier_name in ["relaxed", "normal", "strict"]:
                tier_prob = smart_result.get("tiers", {}).get(tier_name)
                if tier_prob and tier_prob.occurrences > 0:
                    best_tier_data = tier_prob
                    used_tier = tier_name
                    break

        if best_tier_data:
            occurrences = best_tier_data.occurrences
            periods_data = best_tier_data.periods

            # Extract 20-day win rate for direction
            p20 = periods_data.get(20, {})
            if isinstance(p20, dict):
                win_rate_20d = p20.get("win_rate")

            if win_rate_20d is not None and occurrences >= 10:
                if win_rate_20d >= 60:
                    signal_direction = "bullish"
                elif win_rate_20d <= 40:
                    signal_direction = "bearish"
                else:
                    signal_direction = "neutral"

    win_rates = {}
    if best_tier_data is not None:
        for p_key in [5, 20, 60, 120]:
            p_data = best_tier_data.periods.get(p_key, {})
            if isinstance(p_data, dict):
                wr = p_data.get("win_rate")
                if wr is not None:
                    win_rates[str(p_key)] = round(wr, 1)

    # Low confidence warning when insufficient historical matches
    confidence_warning = None
    if occurrences < 10:
        confidence_warning = (
            f"Low confidence: only {occurrences} historical matches found. "
            f"Need at least 10 for a reliable directional call."
        )

    signal = {
        "direction": signal_direction,
        "win_rate_20d": round(win_rate_20d, 1) if win_rate_20d is not None else None,
        "win_rates": win_rates,
        "occurrences": occurrences,
        "tier": used_tier,
        "conditions": [{"indicator": ind} for ind in selected_indicators],
        "confidence_warning": confidence_warning,
    }

    # ── Compute ACTUAL forward returns ──
    df_future = df_full[df_full.index > as_of]
    actual_returns = {}
    for days in [5, 10, 20, 60, 120]:
        if len(df_future) >= days:
            future_price = float(df_future["Close"].iloc[days - 1])
            actual_returns[str(days)] = {
                "return_pct": round(((future_price - price_at_date) / price_at_date) * 100, 2),
                "end_price": round(future_price, 2),
                "went_up": future_price > price_at_date,
            }

    # ── Compute accuracy ──
    # Only judge accuracy when we had a clear signal with sufficient historical data
    accuracy = None
    if signal_direction in ("bullish", "bearish") and occurrences >= 10 and "20" in actual_returns:
        actual_went_up = actual_returns["20"]["went_up"]
        actual_dir = "up" if actual_went_up else "down"
        was_correct = (
            (signal_direction == "bullish" and actual_went_up)
            or (signal_direction == "bearish" and not actual_went_up)
        )
        accuracy = {
            "predicted_direction": signal_direction,
            "actual_direction": actual_dir,
            "was_correct": was_correct,
        }

    # ── Build indicators at date ──
    indicators_at_date = {
        "rsi": indicators["rsi"]["value"],
        "macd_histogram": indicators["macd"]["histogram"],
        "macd_event": states.get("macd_event"),
        "ma_alignment": states.get("ma_alignment"),
        "bb_zone": states.get("bb_zone"),
        "bb_position": indicators["bb"]["position"],
        "volume_ratio": indicators["volume"]["ratio"],
        "volume_level": states.get("volume_level"),
        "sma20": indicators["ma"]["sma20"],
        "sma50": indicators["ma"]["sma50"],
        "sma200": indicators["ma"]["sma200"],
        "adx": indicators.get("adx", {}).get("adx"),
        "adx_trend": states.get("adx_trend"),
        "atr_pct": indicators.get("atr", {}).get("atr_pct"),
        "drawdown_60d": indicators.get("drawdown", {}).get("from_60d_high"),
        "drawdown_state": states.get("drawdown_60d"),
        "consecutive_days": indicators.get("consecutive", {}).get("days", 0),
        "ma20_distance": indicators.get("ma_distance", {}).get("from_sma20"),
        "week52_position": indicators.get("week52_position", {}).get("position_pct"),
    }

    # ── Build highlights ──
    highlights = _build_time_machine_highlights(indicators, states, actual_returns)

    # ── Build response ──
    response = TimeMachineResponse(
        ticker=ticker,
        date=actual_date_str,
        price_at_date=round(price_at_date, 2),
        current_price=round(current_price, 2),
        signal=signal,
        actual=actual_returns,
        accuracy=accuracy,
        indicators_at_date=indicators_at_date,
        highlights=highlights,
    )

    # ── Cache the result ──
    _time_machine_cache[cache_key] = {"result": response, "ts": now}
    _evict_cache(_time_machine_cache, _TIME_MACHINE_MAX)

    return response


def _build_time_machine_highlights(
    indicators: dict, states: dict, actual_returns: dict
) -> list[dict]:
    """Build human-readable highlight bullets from indicators and actual outcomes."""
    highlights = []

    # RSI extremes
    rsi = indicators["rsi"]["value"]
    if rsi is not None:
        if rsi < 30:
            highlights.append({"text": f"RSI 과매도 구간 ({rsi:.1f})", "type": "bullish"})
        elif rsi > 70:
            highlights.append({"text": f"RSI 과매수 구간 ({rsi:.1f})", "type": "bearish"})

    # MACD cross events
    macd_event = states.get("macd_event")
    if macd_event == "golden_cross":
        highlights.append({"text": "MACD 골든크로스 발생", "type": "bullish"})
    elif macd_event == "dead_cross":
        highlights.append({"text": "MACD 데드크로스 발생", "type": "bearish"})

    # MA alignment
    alignment = states.get("ma_alignment")
    if alignment == "bullish":
        highlights.append({"text": "이동평균 정배열 (20 > 50 > 200)", "type": "bullish"})
    elif alignment == "bearish":
        highlights.append({"text": "이동평균 역배열 (20 < 50 < 200)", "type": "bearish"})

    # Bollinger Band extremes
    bb_zone = states.get("bb_zone")
    if bb_zone == "below_lower":
        highlights.append({"text": "볼린저밴드 하단 이탈", "type": "bullish"})
    elif bb_zone == "above_upper":
        highlights.append({"text": "볼린저밴드 상단 이탈", "type": "bearish"})

    # Volume spike
    vol_ratio = indicators["volume"]["ratio"]
    if vol_ratio is not None and vol_ratio >= 2.0:
        highlights.append({"text": f"거래량 평균 대비 {vol_ratio:.1f}배 급증", "type": "bearish"})

    # Drawdown
    dd_state = states.get("drawdown_60d")
    dd_60 = indicators.get("drawdown", {}).get("from_60d_high")
    if dd_state == "crash_20pct_plus" and dd_60 is not None:
        highlights.append({"text": f"60일 고점 대비 {abs(dd_60):.1f}% 하락 (폭락 구간)", "type": "bullish"})
    elif dd_state == "correction_10_20" and dd_60 is not None:
        highlights.append({"text": f"60일 고점 대비 {abs(dd_60):.1f}% 조정 중", "type": "bullish"})

    # ADX trend strength
    adx_trend = states.get("adx_trend")
    adx_val = indicators.get("adx", {}).get("adx")
    if adx_trend == "very_strong_trend" and adx_val is not None:
        highlights.append({"text": f"ADX {adx_val:.1f} (매우 강한 추세)", "type": "bullish"})

    # Consecutive days
    consec_days = indicators.get("consecutive", {}).get("days", 0)
    if consec_days >= 5:
        highlights.append({"text": f"{consec_days}일 연속 상승", "type": "bearish"})
    elif consec_days <= -5:
        highlights.append({"text": f"{abs(consec_days)}일 연속 하락", "type": "bullish"})

    # Actual outcome highlights
    if "20" in actual_returns:
        ret = actual_returns["20"]["return_pct"]
        if ret > 10:
            highlights.append({"text": f"이후 20거래일간 {ret:.1f}% 상승", "type": "bullish"})
        elif ret < -10:
            highlights.append({"text": f"이후 20거래일간 {abs(ret):.1f}% 하락", "type": "bearish"})

    if "60" in actual_returns:
        ret = actual_returns["60"]["return_pct"]
        if ret > 20:
            highlights.append({"text": f"이후 60거래일간 {ret:.1f}% 급등", "type": "bullish"})
        elif ret < -20:
            highlights.append({"text": f"이후 60거래일간 {abs(ret):.1f}% 급락", "type": "bearish"})

    return highlights


# ── Helpers ──


def _get_et_now() -> datetime:
    """Get current time in US Eastern Time, accounting for DST.
    Uses a simple DST rule: 2nd Sunday of March to 1st Sunday of November.
    """
    now_utc = datetime.now(timezone.utc)
    year = now_utc.year

    # Find 2nd Sunday of March (DST starts)
    march1 = datetime(year, 3, 1, tzinfo=timezone.utc)
    # days until first Sunday: (6 - weekday) % 7
    first_sun_mar = 1 + (6 - march1.weekday()) % 7
    dst_start = datetime(year, 3, first_sun_mar + 7, 2, 0, tzinfo=timezone.utc)  # 2nd Sunday 2AM UTC(approx)

    # Find 1st Sunday of November (DST ends)
    nov1 = datetime(year, 11, 1, tzinfo=timezone.utc)
    first_sun_nov = 1 + (6 - nov1.weekday()) % 7
    dst_end = datetime(year, 11, first_sun_nov, 2, 0, tzinfo=timezone.utc)

    if dst_start <= now_utc < dst_end:
        offset = timedelta(hours=-4)  # EDT
    else:
        offset = timedelta(hours=-5)  # EST

    return now_utc.astimezone(timezone(offset))


def _is_analysis_cache_fresh(updated_at_str: str) -> bool:
    """Check if cached analysis is still fresh.
    - During market hours (Mon-Fri 9:30-16:00 ET): 15 minutes TTL
    - Outside market hours: 60 minutes TTL
    """
    if not updated_at_str:
        return False

    try:
        updated = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        now_utc = datetime.now(timezone.utc)
        age_seconds = (now_utc - updated).total_seconds()

        # Determine if market is currently open
        et = _get_et_now()
        is_weekday = et.weekday() < 5
        t = et.hour * 60 + et.minute
        is_market_hours = is_weekday and 570 <= t < 960  # 9:30 AM - 4:00 PM ET

        if is_market_hours:
            return age_seconds < 900   # 15 minutes
        else:
            return age_seconds < 3600  # 60 minutes
    except Exception:
        return False


def _get_market_state() -> str:
    """Get current US market state based on ET time."""
    et = _get_et_now()
    # Weekend
    if et.weekday() >= 5:
        return "CLOSED"
    hour, minute = et.hour, et.minute
    t = hour * 60 + minute
    if t < 240:       # before 4:00 AM
        return "CLOSED"
    elif t < 570:     # 4:00 AM - 9:30 AM
        return "PRE"
    elif t < 960:     # 9:30 AM - 4:00 PM
        return "OPEN"
    elif t < 1200:    # 4:00 PM - 8:00 PM
        return "AFTER"
    else:
        return "CLOSED"


def _build_current_values(indicators: dict, states: dict) -> dict:
    """Build current_values dict from computed indicators (shared by analyze + smart-prob)."""
    cv = {}
    rsi_val = indicators["rsi"]["value"]
    if rsi_val is not None:
        cv["rsi"] = rsi_val
    macd = indicators["macd"]
    if macd["histogram"] is not None:
        cv["macd_histogram"] = macd["histogram"]
    cv["macd_event"] = states.get("macd_event")
    cv["ma_alignment"] = indicators["ma"]["alignment"]
    dd = indicators.get("drawdown", {})
    if dd.get("from_60d_high") is not None:
        cv["drawdown_60d"] = dd["from_60d_high"]
    adx = indicators.get("adx", {})
    if adx.get("adx") is not None:
        cv["adx"] = adx["adx"]
    bb = indicators.get("bb", {})
    if bb.get("position") is not None:
        cv["bb_position"] = bb["position"]
    vol = indicators.get("volume", {})
    if vol.get("ratio") is not None:
        cv["volume_ratio"] = vol["ratio"]
    stoch = indicators.get("stochastic", {})
    if stoch.get("k") is not None:
        cv["stoch_k"] = stoch["k"]
    ma_dist = indicators.get("ma_distance", {})
    if ma_dist.get("from_sma20") is not None:
        cv["ma20_distance"] = ma_dist["from_sma20"]
    consec = indicators.get("consecutive", {})
    cv["consecutive_days"] = consec.get("days", 0)
    w52 = indicators.get("week52_position", {})
    if w52.get("position_pct") is not None:
        cv["w52_position"] = w52["position_pct"]
    return cv


def _strip_cases(d: dict) -> None:
    """Remove 'cases' arrays from nested probability data to reduce cache size."""
    if isinstance(d, dict):
        d.pop("cases", None)
        for v in d.values():
            if isinstance(v, dict):
                _strip_cases(v)
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        _strip_cases(item)


def _to_prob_data(result) -> ProbabilityData:
    periods = {}
    for k, v in result.periods.items():
        if isinstance(v, dict):
            # Only pass fields that PeriodStats accepts
            periods[str(k)] = PeriodStats(
                win_rate=round(v.get("win_rate", 0), 1),
                avg_return=round(v.get("avg_return", 0), 2),
                median_return=round(v.get("median_return", 0), 2),
                best=round(v.get("best", 0), 2),
                worst=round(v.get("worst", 0), 2),
                samples=v.get("samples", 0),
                std_dev=round(v.get("std_dev", 0), 2),
            )

    cases = None
    if result.cases:
        cases = [
            CaseRecord(
                date=c.date,
                entry_price=c.entry_price,
                returns={str(k): v for k, v in c.returns.items()},
            )
            for c in result.cases
        ]

    return ProbabilityData(
        condition=result.condition,
        occurrences=result.occurrences,
        periods=periods,
        cases=cases,
        warning=result.warning,
    )


def _calc_combined(df, states: dict, indicators: dict = None) -> CombinedProbability | None:
    """Compute combined probability using adaptive matching.

    Uses calc_adaptive_combined (smart matcher) instead of exact matching.
    Automatically widens bins to find historical matches instead of
    returning "insufficient data" for strict conditions.
    """
    # Build selected indicators list
    selected = []
    if "rsi_bin" in states:
        selected.append("rsi")
    if states.get("macd_event"):
        selected.append("macd")
    if states.get("ma_alignment") and states["ma_alignment"] != "none":
        selected.append("ma")
    if states.get("bb_zone"):
        selected.append("bb")
    if states.get("volume_level") and states["volume_level"] != "normal":
        selected.append("volume")
    if states.get("drawdown_60d"):
        selected.append("drawdown")
    if states.get("adx_trend"):
        selected.append("adx")

    if len(selected) < 2:
        return None

    # Build current_values for adaptive matching
    current_values = _build_current_values(indicators, states) if indicators else {}

    # Build conditions for exact matching
    conditions = []
    state_keys = {
        "rsi": "rsi_bin", "macd": "macd_event", "ma": "ma_alignment",
        "bb": "bb_zone", "volume": "volume_level", "drawdown": "drawdown_60d",
        "adx": "adx_trend",
    }
    for ind in selected:
        sk = state_keys.get(ind, ind)
        if sk in states:
            conditions.append({"indicator": sk, "state": states[sk]})

    # Try exact match with all conditions first.
    # If occurrences < 5, progressively drop conditions until we get enough matches.
    best_result = None
    best_tier_name = "exact"
    used_conditions = list(conditions)

    while len(used_conditions) >= 2:
        try:
            result = calc_combined_probability(df, used_conditions)
            if result.occurrences >= 5:
                best_result = result
                break
            elif result.occurrences > 0 and (best_result is None or result.occurrences > best_result.occurrences):
                best_result = result
        except Exception as e:
            import sys
            print(f"[combined] calc_combined_probability failed with {len(used_conditions)} conditions: {e}", file=sys.stderr)
        # Drop the last condition and retry
        used_conditions = used_conditions[:-1]
        best_tier_name = f"relaxed_{len(used_conditions)}"

    if not best_result or best_result.occurrences == 0:
        # Return debug info instead of None
        return CombinedProbability(
            conditions=[f"DEBUG: selected={selected}, conditions_built={len(conditions)}, states_keys={list(states.keys())[:5]}"],
            probability=None,
            tier="no_data",
            occurrences=0,
        )

    prob_data = _to_prob_data(best_result)

    # Build condition strings
    condition_strs = []
    for ind in selected:
        state_key = {
            "rsi": "rsi_bin", "macd": "macd_event", "ma": "ma_alignment",
            "bb": "bb_zone", "volume": "volume_level", "drawdown": "drawdown_60d",
            "adx": "adx_trend",
        }.get(ind, ind)
        state_val = states.get(state_key, "?")
        condition_strs.append(f"{ind}:{state_val}")

    return CombinedProbability(
        conditions=condition_strs,
        probability=prob_data,
        tier=best_tier_name,
        occurrences=best_result.occurrences,
    )


def _to_prob_data_from_dict(periods: dict, occurrences: int) -> ProbabilityData | None:
    """Convert adaptive matcher periods dict to ProbabilityData."""
    if not periods:
        return None

    period_stats = {}
    for p_key, p_val in periods.items():
        if isinstance(p_val, dict) and p_val.get("samples", 0) > 0:
            period_stats[int(p_key)] = PeriodStats(
                win_rate=round(p_val.get("win_rate", 0), 1),
                avg_return=round(p_val.get("avg_return", 0), 2),
                median_return=round(p_val.get("median_return", 0), 2),
                best=round(p_val.get("best", 0), 2),
                worst=round(p_val.get("worst", 0), 2),
                samples=p_val.get("samples", 0),
                std_dev=round(p_val.get("std_dev", 0), 2),
            )

    if not period_stats:
        return None

    return ProbabilityData(
        condition=f"Combined ({occurrences} matches)",
        occurrences=occurrences,
        periods=period_stats,
    )


_ALWAYS_INCLUDE = {"QQQ", "SPY"}  # Never skip these tickers

def _scan_ticker_combo(args: tuple) -> dict | None:
    """Get combined probability for a ticker across all available indicators.
    Accepts (ticker, data_period) tuple to avoid race conditions on global state.
    """
    ticker, data_period = args
    try:
        df = fetch_price_history(ticker, period=data_period)
        min_rows = 60 if ticker in _ALWAYS_INCLUDE else 200
        if len(df) < min_rows:
            return None
    except Exception as e:
        print(f"[signals] {ticker}: fetch failed - {e}")
        return None

    try:
        return _scan_ticker_combo_inner(ticker, data_period, df)
    except Exception as e:
        print(f"[signals] {ticker}: computation failed - {e}")
        return None


def _scan_ticker_combo_inner(ticker: str, data_period: str, df) -> dict | None:
    """Inner logic for _scan_ticker_combo, separated for cleaner error handling."""
    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    close = df["Close"]
    current_price = float(close.iloc[-1])
    prev_price = float(close.iloc[-2]) if len(close) > 1 else current_price
    change_pct = round((current_price - prev_price) / prev_price * 100, 2) if prev_price else 0

    sector = ""
    for sec, sec_tickers in SECTOR_MAP.items():
        if ticker in sec_tickers:
            sector = sec
            break

    # Build current_values for smart_matcher (reuse shared helper)
    current_values = _build_current_values(indicators, states)

    # Select all indicators that have valid values
    selected = []
    checks = {
        "rsi": current_values.get("rsi") is not None,
        "macd": current_values.get("macd_histogram") is not None,
        "ma": current_values.get("ma_alignment") in ("bullish", "bearish"),
        "drawdown": current_values.get("drawdown_60d") is not None,
        "adx": current_values.get("adx") is not None,
        "bb": current_values.get("bb_position") is not None,
        "volume": current_values.get("volume_ratio") is not None,
        "stoch": current_values.get("stoch_k") is not None,
        "ma_distance": current_values.get("ma20_distance") is not None,
        "consecutive": abs(current_values.get("consecutive_days", 0)) >= 2,
        "week52": current_values.get("w52_position") is not None,
    }
    selected = [k for k, v in checks.items() if v]

    # Extract volume info (already computed, just expose it)
    _volume_ratio = round(current_values.get("volume_ratio", 1.0) or 1.0, 2)
    _volume_level = states.get("volume_level", "normal")

    if len(selected) < 2:
        # Not enough indicators - return stock with neutral win rates
        return {
            "ticker": ticker,
            "name": TICKER_NAMES.get(ticker, ticker),
            "price": round(current_price, 2),
            "change_pct": change_pct,
            "sector": sector,
            "market_cap_b": MARKET_CAP_B.get(ticker, 0),
            "win_rate_5d": 50.0,
            "win_rate_20d": 50.0,
            "win_rate_60d": 50.0,
            "win_rate_120d": 50.0,
            "win_rate_252d": 50.0,
            "avg_return_5d": 0.0,
            "avg_return_20d": 0.0,
            "avg_return_60d": 0.0,
            "avg_return_120d": 0.0,
            "avg_return_252d": 0.0,
            "occurrences": 0,
            "condition": "",
            "indicators_used": len(selected),
            "strength": 0.0,
            "tier": "",
            "volume_ratio": _volume_ratio,
            "volume_level": _volume_level,
        }

    result = calc_adaptive_combined(df, selected, current_values)
    best_tier = result["best_tier"]
    best = result["tiers"].get(best_tier)

    if not best:
        # No best tier found - return stock with neutral win rates
        return {
            "ticker": ticker,
            "name": TICKER_NAMES.get(ticker, ticker),
            "price": round(current_price, 2),
            "change_pct": change_pct,
            "sector": sector,
            "market_cap_b": MARKET_CAP_B.get(ticker, 0),
            "win_rate_5d": 50.0,
            "win_rate_20d": 50.0,
            "win_rate_60d": 50.0,
            "win_rate_120d": 50.0,
            "win_rate_252d": 50.0,
            "avg_return_5d": 0.0,
            "avg_return_20d": 0.0,
            "avg_return_60d": 0.0,
            "avg_return_120d": 0.0,
            "avg_return_252d": 0.0,
            "occurrences": 0,
            "condition": "",
            "indicators_used": len(selected),
            "strength": 0.0,
            "tier": best_tier,
            "volume_ratio": _volume_ratio,
            "volume_level": _volume_level,
        }

    _empty = {"win_rate": 50, "avg_return": 0, "samples": 0}
    p5 = best.periods.get(5, _empty)
    p20 = best.periods.get(20, _empty)
    p60 = best.periods.get(60, _empty)
    p120 = best.periods.get(120, _empty)
    p252 = best.periods.get(252, _empty)

    MIN_CASES = 10  # Minimum cases for statistically meaningful win rate
    occ = best.occurrences
    if occ < MIN_CASES:
        # Insufficient data: blend toward 50% based on how few cases we have
        # 0 cases → 50%, 1 case → mostly 50%, 4 cases → mostly real value
        blend = occ / MIN_CASES  # 0.0 to 0.8
        raw_wr5 = p5.get("win_rate", 50)
        raw_wr20 = p20.get("win_rate", 50)
        raw_wr60 = p60.get("win_rate", 50)
        wr5 = round(50 + (raw_wr5 - 50) * blend, 1)
        wr20 = round(50 + (raw_wr20 - 50) * blend, 1)
        wr60 = round(50 + (raw_wr60 - 50) * blend, 1)
        avg_ret5 = round(p5.get("avg_return", 0) * blend, 2)
        avg_ret = round(p20.get("avg_return", 0) * blend, 2)
        avg_ret60 = round(p60.get("avg_return", 0) * blend, 2)
        raw_wr120 = p120.get("win_rate", 50)
        raw_wr252 = p252.get("win_rate", 50)
        wr120 = round(50 + (raw_wr120 - 50) * blend, 1)
        wr252 = round(50 + (raw_wr252 - 50) * blend, 1)
        avg_ret120 = round(p120.get("avg_return", 0) * blend, 2)
        avg_ret252 = round(p252.get("avg_return", 0) * blend, 2)
    else:
        wr5 = round(p5.get("win_rate", 50), 1)
        wr20 = round(p20.get("win_rate", 50), 1)
        wr60 = round(p60.get("win_rate", 50), 1)
        avg_ret5 = round(p5.get("avg_return", 0), 2)
        avg_ret = round(p20.get("avg_return", 0), 2)
        avg_ret60 = round(p60.get("avg_return", 0), 2)
        wr120 = round(p120.get("win_rate", 50), 1)
        wr252 = round(p252.get("win_rate", 50), 1)
        avg_ret120 = round(p120.get("avg_return", 0), 2)
        avg_ret252 = round(p252.get("avg_return", 0), 2)

    return {
        "ticker": ticker,
        "name": TICKER_NAMES.get(ticker, ticker),
        "price": round(current_price, 2),
        "change_pct": change_pct,
        "sector": sector,
        "market_cap_b": MARKET_CAP_B.get(ticker, 0),
        "win_rate_5d": wr5,
        "win_rate_20d": wr20,
        "win_rate_60d": wr60,
        "avg_return_5d": avg_ret5,
        "avg_return_20d": avg_ret,
        "avg_return_60d": avg_ret60,
        "win_rate_120d": wr120,
        "win_rate_252d": wr252,
        "avg_return_120d": avg_ret120,
        "avg_return_252d": avg_ret252,
        "occurrences": occ,
        "condition": best.condition,
        "indicators_used": len(selected),
        "strength": round(abs(wr20 - 50) + abs(wr5 - 50), 1),
        "tier": best_tier,
        "volume_ratio": _volume_ratio,
        "volume_level": _volume_level,
    }


def _parse_conditions(conditions_str: str) -> list[dict]:
    parsed = []
    for cond in conditions_str.split(","):
        cond = cond.strip()
        if cond.startswith("rsi_"):
            parsed.append({"indicator": "rsi", "state": cond[4:]})
        elif cond.startswith("macd_"):
            parsed.append({"indicator": "macd_event", "state": cond[5:]})
        elif cond.startswith("ma_"):
            parsed.append({"indicator": "ma_alignment", "state": cond[3:]})
        elif cond.startswith("bb_"):
            parsed.append({"indicator": "bb_zone", "state": cond[3:]})
        elif cond.startswith("vol_"):
            parsed.append({"indicator": "volume_level", "state": cond[4:]})
        elif cond.startswith("dd_"):
            parsed.append({"indicator": "drawdown_60d", "state": cond[3:]})
        elif cond.startswith("adx_"):
            parsed.append({"indicator": "adx_trend", "state": cond[4:]})
        elif cond.startswith("consec_"):
            parsed.append({"indicator": "consecutive", "state": cond[7:]})
        elif cond.startswith("madist_"):
            parsed.append({"indicator": "ma20_distance", "state": cond[7:]})
    return parsed


# ── Chart Data ──────────────────────────────────────────────────────────────


@router.get("/chart/{ticker}")
async def get_chart_data(
    ticker: str,
    period: str = Query("1y", pattern="^(1m|3m|6m|1y|2y|5y)$"),
    response: Response = None,
):
    """Return OHLCV data for charting. Lightweight endpoint."""
    ticker = _validate_ticker(ticker)
    _set_cache_control(response, _EDGE_CACHE_MEDIUM)

    period_map = {"1m": "1y", "3m": "1y", "6m": "1y", "1y": "2y", "2y": "3y", "5y": "5y"}
    fetch_period = period_map.get(period, "2y")

    df = fetch_price_history(ticker, period=fetch_period)

    # Trim to requested display period
    trim_days = {"1m": 22, "3m": 66, "6m": 132, "1y": 252, "2y": 504, "5y": 1260}
    days = trim_days.get(period, 252)
    df = df.iloc[-days:]

    candles = []
    for date, row in df.iterrows():
        candles.append({
            "time": date.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": int(row["Volume"]) if "Volume" in row.index else 0,
        })

    return {"ticker": ticker, "period": period, "candles": candles}


@router.get("/debug/combined/{ticker}")
async def debug_combined(ticker: str, period: str = Query("10y", pattern="^(1y|2y|3y|5y|10y)$")):
    """Debug endpoint to check why combined is None."""
    ticker = _validate_ticker(ticker)
    try:
        df = fetch_price_history(ticker, period=period)
    except Exception as e:
        return {"error": f"fetch failed: {e}"}

    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    selected = []
    if "rsi_bin" in states: selected.append("rsi")
    if states.get("macd_event"): selected.append("macd")
    if states.get("ma_alignment") and states["ma_alignment"] != "none": selected.append("ma")
    if states.get("bb_zone"): selected.append("bb")
    if states.get("volume_level") and states["volume_level"] != "normal": selected.append("volume")
    if states.get("drawdown_60d"): selected.append("drawdown")
    if states.get("adx_trend"): selected.append("adx")

    state_keys = {
        "rsi": "rsi_bin", "macd": "macd_event", "ma": "ma_alignment",
        "bb": "bb_zone", "volume": "volume_level", "drawdown": "drawdown_60d",
        "adx": "adx_trend",
    }
    conditions = []
    for ind in selected:
        sk = state_keys.get(ind, ind)
        if sk in states:
            conditions.append({"indicator": sk, "state": states[sk]})

    # Try calc
    results = []
    used = list(conditions)
    while len(used) >= 2:
        try:
            r = calc_combined_probability(df, used)
            results.append({"n_conditions": len(used), "occurrences": r.occurrences, "error": None})
            if r.occurrences >= 5:
                break
        except Exception as e:
            results.append({"n_conditions": len(used), "occurrences": 0, "error": str(e)})
        used = used[:-1]

    return {
        "ticker": ticker,
        "states": {k: str(v) for k, v in states.items()},
        "selected": selected,
        "conditions_built": len(conditions),
        "conditions": conditions,
        "results": results,
    }
