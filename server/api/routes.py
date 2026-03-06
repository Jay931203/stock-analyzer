"""FastAPI route handlers."""

import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel

from ..core.analyzer import compute_all_indicators, get_indicator_state
from ..core.backtester import calc_combined_probability, calc_probability
from ..core.fetcher import fetch_batch_quotes, fetch_earnings_dates, fetch_live_prices, fetch_price_history, get_ticker_info, search_tickers
from ..core.signal_flip import snapshot_and_detect, get_flips
from ..core.economic_calendar import get_economic_events
from ..core.presets import get_preset, list_presets, PRESETS
from ..core.smart_matcher import calc_adaptive_combined
from ..core.supabase_cache import read_cached_signals, write_cached_signals, read_cached_analysis, write_cached_analysis, log_recent_search, read_recent_searches
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
async def analyze_ticker(ticker: str, background_tasks: BackgroundTasks, period: str = "10y"):
    """Full analysis: all indicators + historical probabilities.
    Always returns cached data instantly if available. Recomputes in background if stale.
    """
    # ── Always return cache if available (even if stale) ──
    cached = read_cached_analysis(ticker)
    if cached and cached.get("data"):
        updated_at = cached.get("updated_at", "")
        is_fresh = _is_analysis_cache_fresh(updated_at)

        # Log search in background
        background_tasks.add_task(log_recent_search, ticker)

        if not is_fresh:
            # Stale cache: return it instantly, refresh in background
            def _bg_recompute():
                try:
                    _recompute_analysis(ticker, period)
                except Exception:
                    pass
            background_tasks.add_task(_bg_recompute)

        return cached["data"]

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

    combined = _calc_combined(df, states)
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
    Uses in-memory caches to avoid recomputation on back-to-back requests.
    """
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
    return response


# NASDAQ 100 constituents (100 largest non-financial NASDAQ-listed companies)
NASDAQ_100 = [
    "AAPL", "ABNB", "ADBE", "ADI", "ADP", "ADSK", "AEP", "AMAT",
    "AMGN", "AMZN", "AMD", "ANSS", "APP", "ARM", "ASML", "AVGO",
    "AZN", "BIIB", "BKNG", "BKR", "CCEP", "CDNS", "CDW", "CEG",
    "CHTR", "CMCSA", "COIN", "COST", "CPRT", "CRWD", "CSCO", "CSGP",
    "CSX", "CTAS", "CTSH", "DASH", "DDOG", "DLTR", "DXCM", "EA",
    "EXC", "FANG", "FAST", "FTNT", "GEHC", "GILD", "GFS", "GOOGL",
    "HON", "IDXX", "ILMN", "INTC", "INTU", "ISRG", "KDP", "KHC",
    "KLAC", "LIN", "LRCX", "LULU", "MAR", "MCHP", "MDB", "MDLZ",
    "MELI", "META", "MNST", "MRNA", "MRVL", "MSFT", "MU", "NFLX",
    "NVDA", "NXPI", "ODFL", "ON", "ORLY", "PANW", "PAYX", "PCAR",
    "PDD", "PEP", "PLTR", "PYPL", "QCOM", "QQQ", "REGN", "ROP",
    "ROST", "SBUX", "SMCI", "SNPS", "SPY", "TEAM", "TMUS", "TSLA",
    "TTD", "TTWO", "TXN", "VRSK", "VRTX", "WDAY", "ZS",
]

LEVERAGED_ETFS = [
    "TQQQ", "SOXL", "UPRO", "TECL", "SQQQ", "LABU", "TNA", "FNGU",
]

POPULAR_TICKERS = NASDAQ_100 + LEVERAGED_ETFS

SECTOR_MAP = {
    "Technology": [
        "AAPL", "ADBE", "ADI", "ADSK", "AMAT", "AMD", "AMZN", "ANSS",
        "APP", "ARM", "ASML", "AVGO", "CDNS", "CDW", "CRM", "CRWD",
        "CSCO", "CSGP", "CTSH", "DDOG", "FTNT", "GFS", "GOOGL", "INTC",
        "INTU", "KLAC", "LRCX", "MDB", "META", "MRVL", "MSFT", "MU",
        "NXPI", "NVDA", "ON", "ORCL", "PANW", "PLTR", "QCOM", "SHOP",
        "SMCI", "SNPS", "TEAM", "TXN", "TSLA", "TTD", "WDAY", "ZS",
    ],
    "Consumer": [
        "ABNB", "BKNG", "CCEP", "CMG", "COST", "CPRT", "DASH", "DLTR",
        "EA", "FAST", "HD", "KDP", "KHC", "KO", "LOW", "LULU", "MAR",
        "MCD", "MDLZ", "MELI", "MNST", "NKE", "ODFL", "ORLY", "PCAR",
        "PDD", "PEP", "PG", "ROST", "SBUX", "TGT", "TTWO", "UBER",
        "WMT", "YUM",
    ],
    "Financial": [
        "ADP", "AXP", "BAC", "BKR", "BLK", "BRK-B", "C", "CME",
        "COIN", "CTAS", "GS", "ICE", "JPM", "MA", "MCO", "MS",
        "PAYX", "PYPL", "ROP", "SCHW", "SPGI", "SQ", "TFC",
        "UNH", "USB", "V", "VRSK", "WFC",
    ],
    "Healthcare": [
        "ABBV", "AMGN", "AZN", "BDX", "BIIB", "BMY", "DHR", "DXCM",
        "EW", "GEHC", "GILD", "IDXX", "ILMN", "ISRG", "JNJ", "LLY",
        "MCHP", "MDT", "MRK", "MRNA", "PFE", "REGN", "SYK", "TMO",
        "VRTX", "ZTS",
    ],
    "Media": [
        "CHTR", "CMCSA", "DIS", "EA", "NFLX", "PINS", "SNAP", "SPOT",
        "T", "TMUS", "TTWO", "VZ",
    ],
    "Energy": [
        "BKR", "COP", "CVX", "EOG", "FANG", "OXY", "PSX", "SLB",
        "VLO", "XOM",
    ],
    "Industrial": [
        "BA", "CAT", "CSX", "DE", "EMR", "FDX", "GE", "HON", "ITW",
        "LMT", "MMM", "RTX", "UNP", "UPS",
    ],
    "Utilities": [
        "AEP", "CEG", "DUK", "EXC", "NEE", "SO",
    ],
    "Real Estate": [
        "AMT", "CCI", "EQIX", "PLD",
    ],
    "Materials": [
        "APD", "ECL", "FCX", "LIN", "NEM", "SHW",
    ],
    "ETF": [
        "QQQ", "SPY",
    ],
    "Leveraged": [
        "TQQQ", "SOXL", "UPRO", "TECL", "SQQQ", "LABU", "TNA", "FNGU",
    ],
}

TICKER_NAMES = {
    "AAPL": "Apple", "ABNB": "Airbnb", "ADBE": "Adobe", "ADI": "Analog Devices",
    "ADP": "ADP", "ADSK": "Autodesk", "AEP": "AE Power", "AMAT": "Applied Materials",
    "AMGN": "Amgen", "AMZN": "Amazon", "AMD": "AMD", "ANSS": "Ansys",
    "APP": "AppLovin", "ARM": "Arm Holdings", "ASML": "ASML", "AVGO": "Broadcom",
    "AZN": "AstraZeneca", "BIIB": "Biogen", "BKNG": "Booking", "BKR": "Baker Hughes",
    "CCEP": "Coca-Cola EP", "CDNS": "Cadence", "CDW": "CDW", "CEG": "Constellation",
    "CHTR": "Charter", "CMCSA": "Comcast", "COIN": "Coinbase", "COST": "Costco",
    "CPRT": "Copart", "CRWD": "CrowdStrike", "CSCO": "Cisco", "CSGP": "CoStar",
    "CSX": "CSX Corp", "CTAS": "Cintas", "CTSH": "Cognizant", "DASH": "DoorDash",
    "DDOG": "Datadog", "DLTR": "Dollar Tree", "DXCM": "DexCom", "EA": "EA Games",
    "EXC": "Exelon", "FANG": "Diamondback", "FAST": "Fastenal", "FTNT": "Fortinet",
    "GEHC": "GE Healthcare", "GILD": "Gilead", "GFS": "GlobalFoundries", "GOOGL": "Google",
    "HON": "Honeywell", "IDXX": "IDEXX", "ILMN": "Illumina", "INTC": "Intel",
    "INTU": "Intuit", "ISRG": "Intuitive Surg", "KDP": "Keurig Dr P", "KHC": "Kraft Heinz",
    "KLAC": "KLA Corp", "LIN": "Linde", "LRCX": "Lam Research", "LULU": "Lululemon",
    "MAR": "Marriott", "MCHP": "Microchip", "MDB": "MongoDB", "MDLZ": "Mondelez",
    "MELI": "MercadoLibre", "META": "Meta", "MNST": "Monster", "MRNA": "Moderna",
    "MRVL": "Marvell", "MSFT": "Microsoft", "MU": "Micron", "NFLX": "Netflix",
    "NVDA": "NVIDIA", "NXPI": "NXP Semi", "ODFL": "Old Dominion", "ON": "ON Semi",
    "ORLY": "O'Reilly", "PANW": "Palo Alto", "PAYX": "Paychex", "PCAR": "PACCAR",
    "PDD": "PDD Holdings", "PEP": "PepsiCo", "PLTR": "Palantir", "PYPL": "PayPal",
    "QCOM": "Qualcomm", "QQQ": "Invesco QQQ", "REGN": "Regeneron", "ROP": "Roper Tech",
    "ROST": "Ross Stores", "SBUX": "Starbucks", "SMCI": "Super Micro", "SNPS": "Synopsys",
    "SPY": "S&P 500 ETF", "TEAM": "Atlassian", "TMUS": "T-Mobile", "TSLA": "Tesla",
    "TTD": "Trade Desk", "TTWO": "Take-Two", "TXN": "Texas Instr", "VRSK": "Verisk",
    "VRTX": "Vertex Pharma", "WDAY": "Workday", "ZS": "Zscaler",
    # Leveraged ETFs
    "TQQQ": "3x NASDAQ", "SOXL": "3x Semis", "UPRO": "3x S&P 500",
    "TECL": "3x Tech", "SQQQ": "-3x NASDAQ", "LABU": "3x Biotech",
    "TNA": "3x Small Cap", "FNGU": "3x FANG+",
}

# Approximate market caps in billions (updated periodically, good enough for display)
MARKET_CAP_B = {
    "AAPL": 3400, "MSFT": 3100, "NVDA": 2800, "AMZN": 2100, "GOOGL": 2000,
    "META": 1500, "AVGO": 800, "TSLA": 750, "LLY": 700, "COST": 400,
    "NFLX": 380, "AMD": 220, "QCOM": 190, "ADBE": 200, "ISRG": 190,
    "INTU": 180, "AMGN": 165, "AMAT": 150, "BKNG": 160, "TXN": 185,
    "PANW": 120, "LRCX": 95, "MU": 100, "KLAC": 90, "SNPS": 80,
    "CDNS": 78, "CRWD": 85, "INTC": 100, "MRVL": 65, "ASML": 260,
    "ARM": 150, "PLTR": 200, "COIN": 50, "APP": 90, "SMCI": 20,
    "PEP": 210, "MDLZ": 85, "KDP": 45, "KHC": 40, "MNST": 55,
    "CMCSA": 170, "CHTR": 50, "TMUS": 260, "NXPI": 55, "ON": 25,
    "ADI": 105, "MCHP": 30, "FTNT": 75, "DDOG": 40, "MDB": 25,
    "ZS": 30, "WDAY": 65, "TEAM": 55, "CSCO": 230, "ADP": 110,
    "ADSK": 55, "CTSH": 40, "ANSS": 28, "CSGP": 35, "CDW": 25,
    "PYPL": 75, "MRNA": 15, "BIIB": 25, "GILD": 110, "REGN": 90,
    "VRTX": 120, "ILMN": 18, "DXCM": 30, "IDXX": 40, "GEHC": 40,
    "AZN": 220, "PCAR": 55, "ODFL": 40, "CSX": 60, "FAST": 45,
    "CPRT": 55, "ORLY": 70, "ROST": 45, "SBUX": 100, "MAR": 75,
    "LULU": 35, "DLTR": 15, "CTAS": 85, "PAYX": 50, "MELI": 85,
    "PDD": 130, "DASH": 65, "ABNB": 80, "TTWO": 30, "EA": 40,
    "CEG": 80, "AEP": 50, "EXC": 40, "HON": 145, "ROP": 55,
    "VRSK": 40, "TTD": 45, "FANG": 30, "BKR": 40, "GFS": 25,
    "LIN": 210, "CCEP": 40,
    "QQQ": 280, "SPY": 550,
    # Leveraged ETFs (AUM not market cap, but close enough for display)
    "TQQQ": 22, "SOXL": 10, "UPRO": 4, "TECL": 2,
    "SQQQ": 5, "LABU": 1, "TNA": 3, "FNGU": 5,
}

AVAILABLE_SECTORS = ["All"] + sorted(SECTOR_MAP.keys())

# Server-side cache for trending data (5 min TTL)
_trending_cache: dict = {"data": None, "ts": 0}
_TRENDING_TTL = 300  # 5 minutes

# Signal scanning cache (10 min TTL)
_signals_cache: dict = {"data": None, "ts": 0}
_signals_period_cache: dict = {}  # keyed by "signals_{period}", e.g. "signals_3y"
_SIGNALS_TTL = 600  # 10 minutes

# In-memory cache for computed indicators (survives within Vercel warm instance)
_indicator_mem_cache: dict = {}  # {ticker:period -> {indicators, states, current_values, ts}}
_INDICATOR_MEM_TTL = 600  # 10 minutes

# In-memory cache for smart probability results
_smart_prob_cache: dict = {}  # {ticker:period:indicators -> {result, ts}}
_SMART_PROB_TTL = 3600  # 1 hour (indicator values barely change intraday)


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


@router.get("/signals/refresh")
async def refresh_signals():
    """
    Force recompute signals and update Supabase cache.
    Called by Vercel Cron every 15 minutes.
    """
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

    return {
        "status": "ok",
        "signals_count": len(valid),
        "scanned": len(POPULAR_TICKERS),
        "updated": result["updated"],
    }


@router.get("/signals/flips")
async def signal_flips():
    """Get stocks that recently flipped between bullish and bearish."""
    return get_flips()


@router.get("/signals")
async def get_signals(
    limit: int = Query(101, ge=1, le=150),
    data_period: str = Query("3y", pattern="^(1y|3y|5y|10y)$"),
    background_tasks: BackgroundTasks = None,
):
    """
    Combined probability for popular stocks.
    Always returns cached data instantly. Refreshes in background if stale.
    """
    global _scan_data_period
    _scan_data_period = data_period
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

    # 3. No cache: compute synchronously (first ever load)
    if not signals_data:
        try:
            signals_data = _compute_signals(data_period)
            pcache["data"] = signals_data
            pcache["ts"] = now
            if is_default:
                write_cached_signals(signals_data["signals"])
        except Exception:
            # Computation failed (e.g. timeout) — fall back to default 3y cache
            default_cache = _signals_period_cache.get("signals_3y", {})
            if default_cache.get("data"):
                signals_data = default_cache["data"]
            else:
                fallback = read_cached_signals()
                if fallback:
                    signals_data = fallback
            if not signals_data:
                signals_data = {"signals": [], "scanned": 0, "updated": ""}

    # Background refresh if stale (user never waits)
    is_stale = now - pcache["ts"] > _SIGNALS_TTL
    if is_stale and background_tasks:
        def _bg_refresh():
            try:
                fresh = _compute_signals(data_period)
                pcache["data"] = fresh
                pcache["ts"] = time.time()
                if is_default:
                    snapshot_and_detect(fresh["signals"])
                    write_cached_signals(fresh["signals"])
            except Exception:
                pass
        background_tasks.add_task(_bg_refresh)

    # Bundle calendar + flips
    calendar_events = get_economic_events(days_ahead=30)
    if _earnings_cache["data"] and now - _earnings_cache["ts"] < _EARNINGS_TTL:
        for e in _earnings_cache["data"].get("earnings", []):
            if 0 <= e["days_until"] <= 30:
                calendar_events.append({
                    "date": e["earnings_date"], "type": "EARNINGS",
                    "label": f"{e['ticker']} Earnings", "ticker": e["ticker"],
                    "name": e.get("name", e["ticker"]),
                    "time_of_day": e.get("time_of_day", ""),
                    "impact": "medium", "days_until": e["days_until"],
                })
    calendar_events.sort(key=lambda x: x["date"])

    flips_data = get_flips()

    return {
        "signals": signals_data["signals"][:limit],
        "scanned": signals_data["scanned"],
        "updated": signals_data["updated"],
        "market_state": _get_market_state(),
        "calendar": calendar_events,
        "flips": flips_data,
    }


def _compute_signals(data_period: str) -> dict:
    """Synchronous signal computation (heavy). Called only when no cache exists."""
    global _scan_data_period
    _scan_data_period = data_period
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(_scan_ticker_combo, POPULAR_TICKERS))
    valid = [r for r in results if r is not None]
    valid.sort(key=lambda x: x["strength"], reverse=True)

    return {
        "signals": valid,
        "scanned": len(POPULAR_TICKERS),
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


@router.get("/live-prices")
async def live_prices(tickers: str = Query(..., description="Comma-separated tickers")):
    """Fetch current prices including pre/post market via Yahoo v7 quote API."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"prices": {}}
    prices = fetch_live_prices(ticker_list[:30])
    return {"prices": prices, "market_state": _get_market_state()}


@router.get("/recent-searches")
async def recent_searches(limit: int = Query(15, ge=1, le=30)):
    """Get recently searched tickers (global across all visitors)."""
    tickers = read_recent_searches(limit=limit)
    return {"tickers": tickers}


_earnings_cache: dict = {"data": None, "ts": 0}
_EARNINGS_TTL = 21600  # 6 hours


@router.get("/earnings-calendar")
async def earnings_calendar():
    """Get stocks with earnings within the next 14 days."""
    now = time.time()

    if _earnings_cache["data"] and now - _earnings_cache["ts"] < _EARNINGS_TTL:
        return _earnings_cache["data"]

    earnings = fetch_earnings_dates(POPULAR_TICKERS)
    # Filter to 14 days ahead only
    upcoming = [e for e in earnings if 0 <= e["days_until"] <= 14]
    upcoming.sort(key=lambda x: x["days_until"])

    # Enrich with price/change from signals cache if available
    if _signals_cache["data"]:
        sig_map = {s["ticker"]: s for s in _signals_cache["data"].get("signals", [])}
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

    return result


@router.get("/calendar")
async def market_calendar(days: int = Query(30, ge=7, le=60)):
    """Combined calendar: economic events + earnings (from cache only, no blocking fetch)."""
    now = time.time()

    # Earnings: only use if already cached (never block on fetch_earnings_dates here)
    earning_events = []
    if _earnings_cache["data"] and now - _earnings_cache["ts"] < _EARNINGS_TTL:
        for e in _earnings_cache["data"].get("earnings", []):
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

    # Economic events (hardcoded, instant)
    econ_events = get_economic_events(days_ahead=days)

    all_events = earning_events + econ_events
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
        et = now_utc.astimezone(timezone(timedelta(hours=-5)))
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
    et = datetime.now(timezone(timedelta(hours=-5)))
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


_scan_data_period = "3y"  # module-level, set by signals endpoint

_ALWAYS_INCLUDE = {"QQQ", "SPY"}  # Never skip these tickers

def _scan_ticker_combo(ticker: str) -> dict | None:
    """Get combined probability for a ticker across all available indicators."""
    try:
        df = fetch_price_history(ticker, period=_scan_data_period)
        min_rows = 60 if ticker in _ALWAYS_INCLUDE else 200
        if len(df) < min_rows:
            return None
    except Exception:
        return None

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

    # Build current_values for smart_matcher
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

    adx_data = indicators.get("adx", {})
    if adx_data.get("adx") is not None:
        current_values["adx"] = adx_data["adx"]

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

    p5 = best.periods.get(5, {})
    p20 = best.periods.get(20, {})
    p60 = best.periods.get(60, {})
    p120 = best.periods.get(120, {})
    p252 = best.periods.get(252, {})

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
