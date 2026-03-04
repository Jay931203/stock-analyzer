"""FastAPI route handlers."""

import time
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..core.analyzer import compute_all_indicators, get_indicator_state
from ..core.backtester import calc_combined_probability, calc_probability
from ..core.fetcher import fetch_batch_quotes, fetch_price_history, get_ticker_info, search_tickers
from ..core.presets import get_preset, list_presets, PRESETS
from ..core.smart_matcher import calc_adaptive_combined
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
    VolumeData,
    Week52Data,
)

router = APIRouter(prefix="/api")


@router.get("/analyze/{ticker}", response_model=AnalysisResponse)
async def analyze_ticker(ticker: str, period: str = "10y"):
    """Full analysis: all indicators + historical probabilities."""
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

    # Ticker info
    try:
        info = get_ticker_info(ticker)
        ticker_info = TickerInfo(**info)
    except Exception:
        ticker_info = TickerInfo(ticker=ticker.upper(), name=ticker.upper())

    # Price info
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

    # Compute all indicators
    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

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

    # ── NEW INDICATORS ──

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
    indicator_results["week52"] = Week52Data(
        position_pct=w52_pos, high=w52.get("high"), low=w52.get("low"),
        probability=w52_prob,
    )

    # Combined probability
    combined = _calc_combined(df, states)

    # Data range info
    data_range = f"{df.index[0].strftime('%Y-%m-%d')} ~ {df.index[-1].strftime('%Y-%m-%d')} ({len(df)} days)"

    return AnalysisResponse(
        ticker_info=ticker_info,
        price=price,
        indicators=indicator_results,
        combined=combined,
        analysis_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        data_range=data_range,
    )


@router.get("/probability/{ticker}")
async def get_probability(
    ticker: str,
    conditions: str = Query(..., description="Comma-separated conditions"),
    period: str = "10y",
):
    """Calculate probability for custom condition combinations."""
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
async def run_preset(preset_id: str, ticker: str, period: str = "10y"):
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


class CustomConditionRequest(BaseModel):
    conditions: list[dict]


@router.post("/probability/{ticker}/custom")
async def custom_probability(ticker: str, req: CustomConditionRequest, period: str = "10y"):
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = calc_combined_probability(df, req.conditions)
    return _to_prob_data(result)


class SmartProbabilityRequest(BaseModel):
    selected_indicators: list[str]


@router.post("/smart-probability/{ticker}")
async def smart_probability(ticker: str, req: SmartProbabilityRequest, period: str = "10y"):
    """
    Adaptive combined probability with progressive bin widening.
    Returns results at multiple strictness tiers + impact analysis.
    """
    try:
        df = fetch_price_history(ticker, period=period)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    # Map frontend indicator keys to smart_matcher keys + current values
    key_map = {
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

    selected = []
    for frontend_key in req.selected_indicators:
        matcher_key = key_map.get(frontend_key)
        if matcher_key:
            selected.append(matcher_key)

    if len(selected) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 indicators")

    # Build current_values dict from computed indicators
    current_values = {}
    rsi_val = indicators["rsi"]["value"]
    if rsi_val is not None:
        current_values["rsi"] = rsi_val

    macd = indicators["macd"]
    if macd["histogram"] is not None:
        current_values["macd_histogram"] = macd["histogram"]
    current_values["macd_event"] = states.get("macd_event")

    current_values["ma_alignment"] = indicators["ma"]["alignment"]

    dd = indicators.get("drawdown", {})
    if dd.get("from_60d_high") is not None:
        current_values["drawdown_60d"] = dd["from_60d_high"]

    adx = indicators.get("adx", {})
    if adx.get("adx") is not None:
        current_values["adx"] = adx["adx"]

    bb = indicators.get("bb", {})
    if bb.get("position") is not None:
        current_values["bb_position"] = bb["position"]

    vol = indicators.get("volume", {})
    if vol.get("ratio") is not None:
        current_values["volume_ratio"] = vol["ratio"]

    stoch = indicators.get("stochastic", {})
    if stoch.get("k") is not None:
        current_values["stoch_k"] = stoch["k"]

    ma_dist = indicators.get("ma_distance", {})
    if ma_dist.get("from_sma20") is not None:
        current_values["ma20_distance"] = ma_dist["from_sma20"]

    consec = indicators.get("consecutive", {})
    current_values["consecutive_days"] = consec.get("days", 0)

    w52 = indicators.get("week52_position", {})
    if w52.get("position_pct") is not None:
        current_values["w52_position"] = w52["position_pct"]

    result = calc_adaptive_combined(df, selected, current_values)

    # Convert ProbabilityResult objects to dicts
    tiers = {}
    for tier_name, prob_result in result["tiers"].items():
        tiers[tier_name] = _to_prob_data(prob_result).model_dump()

    individuals = {}
    for ind_key, prob_result in result["individuals"].items():
        individuals[ind_key] = _to_prob_data(prob_result).model_dump()

    impact = {}
    for ind_key, prob_result in result["impact"].items():
        impact[ind_key] = _to_prob_data(prob_result).model_dump()

    return {
        "tiers": tiers,
        "best_tier": result["best_tier"],
        "individuals": individuals,
        "impact": impact,
        "selected": result["selected"],
        "data_days": result["data_days"],
        "current_values": {k: round(v, 4) if isinstance(v, float) else v
                          for k, v in current_values.items()},
    }


# Selection criteria:
# - US-listed equities with market cap > $50B
# - Top representatives from each GICS sector
# - High trading volume and retail investor interest
POPULAR_TICKERS = [
    # Technology (mega-cap + key semis + enterprise)
    "AAPL", "MSFT", "GOOGL", "NVDA", "META", "AVGO", "AMD",
    "CRM", "ORCL", "ADBE", "PLTR", "INTC", "QCOM", "AMAT",
    # Consumer (e-commerce + EV + retail)
    "AMZN", "TSLA", "COST", "WMT", "HD", "NKE", "SBUX", "MCD",
    # Financial Services (banks + payments + insurance)
    "BRK-B", "JPM", "V", "MA", "GS", "BAC", "MS",
    # Healthcare (pharma + biotech + devices)
    "LLY", "UNH", "JNJ", "ABBV", "PFE", "MRK", "TMO",
    # Communication / Media
    "NFLX", "DIS", "CMCSA",
    # Energy
    "XOM", "CVX", "COP",
    # Industrials / Defense
    "CAT", "BA", "LMT", "UNP", "GE",
]

SECTOR_MAP = {
    "Technology": [
        "AAPL", "MSFT", "GOOGL", "NVDA", "META", "AVGO", "AMD",
        "CRM", "ORCL", "ADBE", "PLTR", "INTC", "QCOM", "AMAT",
    ],
    "Consumer": [
        "AMZN", "TSLA", "COST", "WMT", "HD", "NKE", "SBUX", "MCD",
    ],
    "Financial": [
        "BRK-B", "JPM", "V", "MA", "GS", "BAC", "MS",
    ],
    "Healthcare": [
        "LLY", "UNH", "JNJ", "ABBV", "PFE", "MRK", "TMO",
    ],
    "Media": [
        "NFLX", "DIS", "CMCSA",
    ],
    "Energy": [
        "XOM", "CVX", "COP",
    ],
    "Industrial": [
        "CAT", "BA", "LMT", "UNP", "GE",
    ],
}

AVAILABLE_SECTORS = ["All"] + sorted(SECTOR_MAP.keys())

# Server-side cache for trending data (5 min TTL)
_trending_cache: dict = {"data": None, "ts": 0}
_TRENDING_TTL = 300  # 5 minutes

# Signal scanning cache (10 min TTL)
_signals_cache: dict = {"data": None, "ts": 0}
_SIGNALS_TTL = 600  # 10 minutes


@router.get("/similar/{ticker}")
async def get_similar(ticker: str, limit: int = Query(6, ge=1, le=12)):
    """Get similar tickers from the same sector."""
    upper = ticker.upper()
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


@router.get("/signals")
async def get_signals(limit: int = Query(8, ge=1, le=20)):
    """
    Scan popular stocks for strongest technical signals.
    Returns bullish (high win rate) and bearish (low win rate) signals.
    Cached for 10 minutes.
    """
    now = time.time()

    if _signals_cache["data"] and now - _signals_cache["ts"] < _SIGNALS_TTL:
        cached = _signals_cache["data"]
        return {
            "bullish": cached["bullish"][:limit],
            "bearish": cached["bearish"][:limit],
            "scanned": cached["scanned"],
            "updated": cached["updated"],
        }

    from concurrent.futures import ThreadPoolExecutor, as_completed

    all_signals = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(_scan_ticker_signals, t): t for t in POPULAR_TICKERS}
        for future in as_completed(futures):
            try:
                signals = future.result()
                all_signals.extend(signals)
            except Exception:
                pass

    # Split into bullish / bearish based on actual win rate
    bullish = [s for s in all_signals if s["win_rate_20d"] > 55 and s["samples"] >= 8]
    bearish = [s for s in all_signals if s["win_rate_20d"] < 45 and s["samples"] >= 8]

    # Sort by strength (deviation from 50%)
    bullish.sort(key=lambda x: x["strength"], reverse=True)
    bearish.sort(key=lambda x: x["strength"], reverse=True)

    result = {
        "bullish": bullish,
        "bearish": bearish,
        "scanned": len(POPULAR_TICKERS),
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    _signals_cache["data"] = result
    _signals_cache["ts"] = now

    return {
        "bullish": bullish[:limit],
        "bearish": bearish[:limit],
        "scanned": len(POPULAR_TICKERS),
        "updated": result["updated"],
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
async def search(query: str, limit: int = 10):
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


# ── Helpers ──


def _to_prob_data(result) -> ProbabilityData:
    periods = {}
    for k, v in result.periods.items():
        periods[str(k)] = PeriodStats(**v)

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


def _calc_combined(df, states: dict) -> CombinedProbability | None:
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

    if len(conditions) < 2:
        return None

    result = calc_combined_probability(df, conditions)
    prob_data = _to_prob_data(result)

    return CombinedProbability(
        conditions=[c["indicator"] + ":" + c["state"] for c in conditions],
        probability=prob_data,
    )


def _scan_ticker_signals(ticker: str) -> list[dict]:
    """Scan a single ticker for notable technical signals."""
    try:
        df = fetch_price_history(ticker, period="10y")
        if len(df) < 200:
            return []
    except Exception:
        return []

    indicators = compute_all_indicators(df)
    states = get_indicator_state(indicators)

    signals = []
    close = df["Close"]
    current_price = float(close.iloc[-1])
    prev_price = float(close.iloc[-2]) if len(close) > 1 else current_price
    change_pct = round((current_price - prev_price) / prev_price * 100, 2) if prev_price else 0

    # Sector lookup
    sector = ""
    for sec, sec_tickers in SECTOR_MAP.items():
        if ticker in sec_tickers:
            sector = sec
            break

    base = {"ticker": ticker, "price": current_price, "change_pct": change_pct, "sector": sector}

    # RSI extremes
    rsi_val = indicators["rsi"]["value"]
    if rsi_val is not None and (rsi_val <= 30 or rsi_val >= 70):
        prob = calc_probability(df, "rsi", rsi_val)
        tag = "Oversold" if rsi_val <= 30 else "Overbought"
        signals.append(_build_signal(
            base, f"RSI {tag}", f"RSI {rsi_val:.1f}", prob,
        ))

    # MACD cross
    macd_event = states.get("macd_event")
    if macd_event in ("golden_cross", "dead_cross"):
        prob = calc_probability(df, f"macd_{macd_event}", "")
        label = "Golden Cross" if macd_event == "golden_cross" else "Dead Cross"
        signals.append(_build_signal(base, f"MACD {label}", "Histogram crossed zero", prob))

    # BB extremes
    bb_zone = states.get("bb_zone")
    if bb_zone in ("below_lower", "above_upper"):
        prob = calc_probability(df, "bb_zone", bb_zone)
        label = "Below Lower Band" if bb_zone == "below_lower" else "Above Upper Band"
        signals.append(_build_signal(base, f"BB {label}", f"BB zone: {bb_zone}", prob))

    # Volume spike
    vol = indicators["volume"]
    if vol["ratio"] is not None and vol["ratio"] >= 2.0:
        prob = calc_probability(df, "volume_spike", "")
        signals.append(_build_signal(
            base, "Volume Spike", f"{vol['ratio']:.1f}x avg volume", prob,
        ))

    # Deep drawdown (potential bounce)
    dd = indicators.get("drawdown", {})
    dd_60 = dd.get("from_60d_high")
    if dd_60 is not None and dd_60 <= -10:
        prob = calc_probability(df, "drawdown", dd_60)
        signals.append(_build_signal(
            base, "Deep Pullback", f"{dd_60:.1f}% from 60d high", prob,
        ))

    # Consecutive streak (3+ days)
    consec = indicators.get("consecutive", {})
    consec_days = consec.get("days", 0)
    if abs(consec_days) >= 3:
        prob = calc_probability(df, "consecutive", consec_days)
        d = "up" if consec_days > 0 else "down"
        signals.append(_build_signal(
            base, f"Streak: {abs(consec_days)}d {d}", f"{abs(consec_days)} consecutive {d} days", prob,
        ))

    return signals


def _build_signal(base: dict, signal_type: str, description: str, prob_result) -> dict:
    """Build a signal dict from probability result."""
    p5 = prob_result.periods.get(5, {})
    p20 = prob_result.periods.get(20, {})
    wr5 = p5.get("win_rate", 50)
    wr20 = p20.get("win_rate", 50)
    # Strength = how far the win rates deviate from 50%
    strength = round(abs(wr20 - 50) + abs(wr5 - 50), 1)

    return {
        **base,
        "signal_type": signal_type,
        "description": description,
        "win_rate_5d": wr5,
        "win_rate_20d": wr20,
        "avg_return_5d": p5.get("avg_return", 0),
        "avg_return_20d": p20.get("avg_return", 0),
        "samples": prob_result.occurrences,
        "strength": strength,
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
