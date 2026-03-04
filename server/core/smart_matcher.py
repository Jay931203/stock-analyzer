"""
Adaptive similarity matching engine.

Instead of exact bin matching, progressively widen bins until
minimum sample size is reached. Returns results at multiple
strictness levels so users see the tradeoff.
"""

import numpy as np
import pandas as pd
import ta

from .backtester import _calc_forward_returns, ProbabilityResult


# Minimum samples for each tier
MIN_STRICT = 8
MIN_NORMAL = 20
MIN_RELAXED = 40


def calc_adaptive_combined(
    df: pd.DataFrame,
    selected_indicators: list[str],
    current_values: dict,
    lookback_days: int = 1200,
) -> dict:
    """
    Smart combined probability with adaptive bin widening.

    Returns results at multiple strictness levels:
    - strict: tight bins around current values
    - normal: moderately widened bins (auto-adjusted for min sample)
    - relaxed: wide bins (maximizes sample size)
    - individual: each indicator's standalone probability

    Also returns the "impact" of each indicator (how much adding/removing it changes results).
    """
    close = df["Close"].copy()
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    if len(close) > lookback_days:
        df = df.iloc[-lookback_days:]
        close = df["Close"].copy()
        high = df["High"]
        low = df["Low"]
        volume = df["Volume"]

    forward_periods = [5, 10, 20, 60, 120, 252]

    # Build masks at 3 strictness levels
    tier_configs = {
        "strict": 1.0,    # original bin width
        "normal": 2.0,    # 2x wider
        "relaxed": 3.5,   # 3.5x wider
    }

    # Pre-compute indicator series
    series_cache = _compute_series(close, high, low, volume)

    results = {}

    for tier_name, width_mult in tier_configs.items():
        masks = []
        labels = []

        for ind_key in selected_indicators:
            mask, label = _build_mask(
                ind_key, current_values, series_cache,
                close, high, low, volume, width_mult
            )
            if mask is not None:
                masks.append(mask)
                labels.append(label)

        if not masks:
            continue

        # Combine ALL masks with AND
        combined = masks[0]
        for m in masks[1:]:
            combined = combined & m
        combined = combined.fillna(False)

        condition_str = " + ".join(labels)
        prob = _calc_forward_returns(close, combined, condition_str, forward_periods)
        results[tier_name] = prob

    # Auto-select best tier based on sample size
    best_tier = _select_best_tier(results)

    # Calculate individual indicator probabilities for comparison
    individuals = {}
    for ind_key in selected_indicators:
        mask, label = _build_mask(
            ind_key, current_values, series_cache,
            close, high, low, volume, 1.5  # moderate width
        )
        if mask is not None:
            mask = mask.fillna(False)
            prob = _calc_forward_returns(close, mask, label, forward_periods)
            individuals[ind_key] = prob

    # Calculate impact: what happens if we DROP each indicator
    impact = {}
    if len(selected_indicators) >= 2:
        for drop_key in selected_indicators:
            remaining = [k for k in selected_indicators if k != drop_key]
            masks = []
            for ind_key in remaining:
                mask, _ = _build_mask(
                    ind_key, current_values, series_cache,
                    close, high, low, volume, 2.0
                )
                if mask is not None:
                    masks.append(mask)
            if masks:
                combined = masks[0]
                for m in masks[1:]:
                    combined = combined & m
                combined = combined.fillna(False)
                prob = _calc_forward_returns(close, combined, f"without {drop_key}", forward_periods)
                impact[drop_key] = prob

    return {
        "tiers": results,
        "best_tier": best_tier,
        "individuals": individuals,
        "impact": impact,
        "selected": selected_indicators,
        "data_days": len(close),
    }


def _compute_series(close, high, low, volume):
    """Pre-compute all indicator series once."""
    cache = {}
    cache["rsi"] = ta.momentum.rsi(close, window=14)
    cache["macd_hist"] = ta.trend.macd_diff(close, window_slow=26, window_fast=12, window_sign=9)
    cache["sma20"] = ta.trend.sma_indicator(close, window=20)
    cache["sma50"] = ta.trend.sma_indicator(close, window=50)
    cache["sma200"] = ta.trend.sma_indicator(close, window=200)

    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    cache["bb_upper"] = bb.bollinger_hband()
    cache["bb_lower"] = bb.bollinger_lband()

    cache["vol_sma"] = ta.trend.sma_indicator(volume.astype(float), window=20)

    cache["stoch_k"] = ta.momentum.stoch(high, low, close, window=14, smooth_window=3)

    cache["adx"] = ta.trend.adx(high, low, close, window=14)

    cache["rolling_high_60"] = close.rolling(window=60).max()
    cache["dd_60"] = (close - cache["rolling_high_60"]) / cache["rolling_high_60"] * 100

    cache["ma20_dist"] = (close - cache["sma20"]) / cache["sma20"] * 100

    # Consecutive days
    daily_ret = close.pct_change()
    sign = daily_ret.apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    consec = pd.Series(0, index=close.index, dtype=int)
    prev = 0
    for i in range(len(sign)):
        s = sign.iloc[i]
        if s == 0:
            prev = 0
        elif prev == 0:
            prev = s
        elif (prev > 0 and s > 0):
            prev += 1
        elif (prev < 0 and s < 0):
            prev -= 1
        else:
            prev = s
        consec.iloc[i] = prev
    cache["consecutive"] = consec

    # 52-week position
    h252 = close.rolling(window=252).max()
    l252 = close.rolling(window=252).min()
    r252 = h252 - l252
    cache["w52_pos"] = (close - l252) / r252.replace(0, np.nan) * 100

    return cache


def _build_mask(
    ind_key: str,
    current_values: dict,
    cache: dict,
    close, high, low, volume,
    width_mult: float,
) -> tuple:
    """
    Build a boolean mask for an indicator at given width multiplier.
    Returns (mask, label) or (None, None).
    """
    if ind_key == "rsi":
        val = current_values.get("rsi")
        if val is None:
            return None, None
        half_w = 5 * width_mult  # base ±5, expands with multiplier
        lo, hi = val - half_w, val + half_w
        mask = (cache["rsi"] >= lo) & (cache["rsi"] < hi)
        zone = "Low" if val < 30 else "Moderate" if val < 50 else "High" if val < 70 else "Very High"
        return mask, f"RSI {zone} ({val:.0f})"

    elif ind_key == "macd":
        hist = current_values.get("macd_histogram")
        event = current_values.get("macd_event")
        if hist is None:
            return None, None
        macd_hist = cache["macd_hist"]
        if event in ("golden_cross", "dead_cross"):
            if event == "golden_cross":
                mask = (macd_hist > 0) & (macd_hist.shift(1) <= 0)
                return mask, "Momentum turning up"
            else:
                mask = (macd_hist < 0) & (macd_hist.shift(1) >= 0)
                return mask, "Momentum turning down"
        else:
            if hist > 0:
                mask = macd_hist > 0
                return mask, "Positive momentum"
            else:
                mask = macd_hist < 0
                return mask, "Negative momentum"

    elif ind_key == "ma":
        alignment = current_values.get("ma_alignment")
        if alignment not in ("bullish", "bearish"):
            return None, None
        sma20, sma50, sma200 = cache["sma20"], cache["sma50"], cache["sma200"]
        if alignment == "bullish":
            mask = (sma20 > sma50) & (sma50 > sma200)
            return mask, "Uptrend"
        else:
            mask = (sma20 < sma50) & (sma50 < sma200)
            return mask, "Downtrend"

    elif ind_key == "drawdown":
        val = current_values.get("drawdown_60d")
        if val is None:
            return None, None
        half_w = 3 * width_mult  # base ±3%
        lo, hi = val - half_w, val + half_w
        hi = min(hi, 1)  # cap at +1%
        mask = (cache["dd_60"] >= lo) & (cache["dd_60"] < hi)
        zone = "Near high" if val > -2 else "Small dip" if val > -5 else "Pullback" if val > -10 else "Deep drop"
        return mask, f"{zone} ({val:.0f}%)"

    elif ind_key == "adx":
        val = current_values.get("adx")
        if val is None:
            return None, None
        half_w = 5 * width_mult
        lo, hi = max(val - half_w, 0), val + half_w
        mask = (cache["adx"] >= lo) & (cache["adx"] < hi)
        zone = "No trend" if val < 20 else "Weak trend" if val < 25 else "Strong trend" if val < 40 else "Very strong"
        return mask, f"Trend: {zone}"

    elif ind_key == "bb":
        bb_upper = cache["bb_upper"]
        bb_lower = cache["bb_lower"]
        bb_range = bb_upper - bb_lower
        bb_pos = (close - bb_lower) / bb_range.replace(0, np.nan)
        val = current_values.get("bb_position")
        if val is None:
            return None, None
        half_w = 0.15 * width_mult
        lo, hi = val - half_w, val + half_w
        mask = (bb_pos >= lo) & (bb_pos < hi)
        zone = "Below support" if val < 0 else "Near support" if val < 0.25 else "Lower range" if val < 0.5 else "Upper range" if val < 0.75 else "Near resistance" if val <= 1 else "Above resistance"
        return mask, f"Price: {zone}"

    elif ind_key == "volume":
        vol_ratio = volume / cache["vol_sma"].replace(0, np.nan)
        val = current_values.get("volume_ratio")
        if val is None:
            return None, None
        half_w = 0.3 * width_mult
        lo, hi = max(val - half_w, 0), val + half_w
        mask = (vol_ratio >= lo) & (vol_ratio < hi)
        zone = "Low volume" if val < 0.8 else "Normal volume" if val < 1.5 else "High volume" if val < 2.5 else "Very high volume"
        return mask, zone

    elif ind_key == "stoch":
        val = current_values.get("stoch_k")
        if val is None:
            return None, None
        half_w = 10 * width_mult
        lo, hi = max(val - half_w, 0), min(val + half_w, 100)
        mask = (cache["stoch_k"] >= lo) & (cache["stoch_k"] < hi)
        zone = "Oversold" if val < 20 else "Low" if val < 40 else "Neutral" if val < 60 else "High" if val < 80 else "Overbought"
        return mask, f"Stoch: {zone}"

    elif ind_key == "ma_distance":
        val = current_values.get("ma20_distance")
        if val is None:
            return None, None
        half_w = 2 * width_mult
        lo, hi = val - half_w, val + half_w
        mask = (cache["ma20_dist"] >= lo) & (cache["ma20_dist"] < hi)
        zone = "Far below avg" if val < -5 else "Below avg" if val < -2 else "Near average" if val < 2 else "Above avg" if val < 5 else "Far above avg"
        return mask, zone

    elif ind_key == "consecutive":
        val = current_values.get("consecutive_days", 0)
        consec = cache["consecutive"]
        if abs(val) < 2:
            return None, None
        if val > 0:
            lo = max(val - int(width_mult), 1)
            mask = consec >= lo
            return mask, f"{lo}+ days rising"
        else:
            hi = min(val + int(width_mult), -1)
            mask = consec <= hi
            return mask, f"{abs(hi)}+ days falling"

    elif ind_key == "week52":
        val = current_values.get("w52_position")
        if val is None:
            return None, None
        half_w = 10 * width_mult
        lo, hi = max(val - half_w, 0), min(val + half_w, 100)
        mask = (cache["w52_pos"] >= lo) & (cache["w52_pos"] < hi)
        zone = "Near 52w low" if val < 20 else "Lower range" if val < 40 else "Mid range" if val < 60 else "Upper range" if val < 80 else "Near 52w high"
        return mask, zone

    return None, None


def _select_best_tier(results: dict) -> str:
    """Pick the tier with the best balance of sample size and specificity."""
    for tier in ["strict", "normal", "relaxed"]:
        prob = results.get(tier)
        if prob and prob.occurrences >= MIN_NORMAL:
            return tier
    # Fall back to whatever has most samples
    for tier in ["relaxed", "normal", "strict"]:
        prob = results.get(tier)
        if prob and prob.occurrences > 0:
            return tier
    return "normal"
