"""Technical indicator calculator using ta library. Pure numbers, no subjective judgment."""

import numpy as np
import pandas as pd
import ta


def compute_all_indicators(df: pd.DataFrame) -> dict:
    """
    Compute all technical indicators on price data.

    Returns dict with each indicator's current value and historical series.
    """
    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    result = {}

    # RSI(14)
    rsi_series = ta.momentum.rsi(close, window=14)
    result["rsi"] = {
        "value": _last_valid(rsi_series),
        "series": rsi_series,
        "params": {"window": 14},
    }

    # MACD(12, 26, 9)
    macd_line = ta.trend.macd(close, window_slow=26, window_fast=12)
    macd_signal = ta.trend.macd_signal(close, window_slow=26, window_fast=12, window_sign=9)
    macd_hist = ta.trend.macd_diff(close, window_slow=26, window_fast=12, window_sign=9)
    result["macd"] = {
        "macd": _last_valid(macd_line),
        "signal": _last_valid(macd_signal),
        "histogram": _last_valid(macd_hist),
        "series_macd": macd_line,
        "series_signal": macd_signal,
        "series_hist": macd_hist,
        "params": {"fast": 12, "slow": 26, "signal": 9},
    }

    # SMA(20, 50, 200)
    sma20 = ta.trend.sma_indicator(close, window=20)
    sma50 = ta.trend.sma_indicator(close, window=50)
    sma200 = ta.trend.sma_indicator(close, window=200)
    current_price = float(close.iloc[-1])
    sma20_val = _last_valid(sma20)
    sma50_val = _last_valid(sma50)
    sma200_val = _last_valid(sma200)

    alignment = "none"
    if sma20_val and sma50_val and sma200_val:
        if sma20_val > sma50_val > sma200_val:
            alignment = "bullish"
        elif sma20_val < sma50_val < sma200_val:
            alignment = "bearish"

    result["ma"] = {
        "sma20": sma20_val,
        "sma50": sma50_val,
        "sma200": sma200_val,
        "price": current_price,
        "alignment": alignment,
        "series_sma20": sma20,
        "series_sma50": sma50,
        "series_sma200": sma200,
    }

    # Bollinger Bands(20, 2)
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    bb_upper = _last_valid(bb.bollinger_hband())
    bb_lower = _last_valid(bb.bollinger_lband())
    bb_mid = _last_valid(bb.bollinger_mavg())
    bb_width = None
    if bb_upper and bb_lower and bb_mid and bb_mid != 0:
        bb_width = (bb_upper - bb_lower) / bb_mid
    bb_position = None
    if bb_upper and bb_lower and bb_upper != bb_lower:
        bb_position = (current_price - bb_lower) / (bb_upper - bb_lower)

    result["bb"] = {
        "upper": bb_upper,
        "middle": bb_mid,
        "lower": bb_lower,
        "width": bb_width,
        "position": bb_position,
        "price": current_price,
        "params": {"window": 20, "std": 2},
    }

    # Volume Ratio
    vol_sma20 = ta.trend.sma_indicator(volume.astype(float), window=20)
    current_vol = float(volume.iloc[-1])
    avg_vol = _last_valid(vol_sma20)
    vol_ratio = current_vol / avg_vol if avg_vol and avg_vol > 0 else None

    result["volume"] = {
        "current": current_vol,
        "avg20": avg_vol,
        "ratio": vol_ratio,
    }

    # Stochastic Oscillator(14, 3)
    stoch_k = ta.momentum.stoch(high, low, close, window=14, smooth_window=3)
    stoch_d = ta.momentum.stoch_signal(high, low, close, window=14, smooth_window=3)
    result["stochastic"] = {
        "k": _last_valid(stoch_k),
        "d": _last_valid(stoch_d),
        "series_k": stoch_k,
        "series_d": stoch_d,
        "params": {"window": 14, "smooth": 3},
    }

    # ── NEW INDICATORS ──

    # Drawdown from recent high (고점대비 하락률)
    rolling_high_20 = close.rolling(window=20).max()
    rolling_high_60 = close.rolling(window=60).max()
    rolling_high_252 = close.rolling(window=252).max()
    dd_20 = _last_valid_calc(close, rolling_high_20)
    dd_60 = _last_valid_calc(close, rolling_high_60)
    dd_252 = _last_valid_calc(close, rolling_high_252)

    result["drawdown"] = {
        "from_20d_high": round(dd_20, 2) if dd_20 is not None else None,
        "from_60d_high": round(dd_60, 2) if dd_60 is not None else None,
        "from_252d_high": round(dd_252, 2) if dd_252 is not None else None,
        "high_20d": _last_valid(rolling_high_20),
        "high_60d": _last_valid(rolling_high_60),
        "high_252d": _last_valid(rolling_high_252),
        "series_dd20": ((close - rolling_high_20) / rolling_high_20 * 100),
        "series_dd60": ((close - rolling_high_60) / rolling_high_60 * 100),
    }

    # ADX (Average Directional Index) - trend strength
    adx_series = ta.trend.adx(high, low, close, window=14)
    adx_pos = ta.trend.adx_pos(high, low, close, window=14)
    adx_neg = ta.trend.adx_neg(high, low, close, window=14)
    result["adx"] = {
        "adx": _last_valid(adx_series),
        "plus_di": _last_valid(adx_pos),
        "minus_di": _last_valid(adx_neg),
        "series": adx_series,
    }

    # ATR (Average True Range) - volatility
    atr_series = ta.volatility.average_true_range(high, low, close, window=14)
    atr_val = _last_valid(atr_series)
    atr_pct = round(atr_val / current_price * 100, 2) if atr_val and current_price else None
    result["atr"] = {
        "atr": atr_val,
        "atr_pct": atr_pct,  # ATR as % of price
        "series": atr_series,
    }

    # Price distance from MAs (이격도)
    dist_20 = round((current_price - sma20_val) / sma20_val * 100, 2) if sma20_val else None
    dist_50 = round((current_price - sma50_val) / sma50_val * 100, 2) if sma50_val else None
    dist_200 = round((current_price - sma200_val) / sma200_val * 100, 2) if sma200_val else None
    result["ma_distance"] = {
        "from_sma20": dist_20,
        "from_sma50": dist_50,
        "from_sma200": dist_200,
    }

    # Consecutive up/down days (연속 상승/하락일)
    daily_returns = close.pct_change()
    consecutive = _calc_consecutive(daily_returns)
    result["consecutive"] = {
        "days": consecutive,  # positive = up days, negative = down days
        "streak_type": "up" if consecutive > 0 else "down" if consecutive < 0 else "flat",
    }

    # 52-week position
    high_52w = close.rolling(window=252).max()
    low_52w = close.rolling(window=252).min()
    h = _last_valid(high_52w)
    l = _last_valid(low_52w)
    pos_52w = None
    if h and l and h != l:
        pos_52w = round((current_price - l) / (h - l) * 100, 1)
    result["week52_position"] = {
        "position_pct": pos_52w,  # 0 = at 52w low, 100 = at 52w high
        "high": h,
        "low": l,
    }

    return result


def get_indicator_state(indicators: dict) -> dict:
    """
    Classify each indicator into a discrete state (bin) for backtesting.
    """
    states = {}

    # RSI bins
    rsi = indicators["rsi"]["value"]
    if rsi is not None:
        rsi_bin = int(rsi // 10) * 10
        rsi_bin = max(0, min(rsi_bin, 90))
        states["rsi_bin"] = f"{rsi_bin}-{rsi_bin + 10}"
        states["rsi_value"] = round(rsi, 1)

    # MACD state
    macd = indicators["macd"]
    if macd["histogram"] is not None:
        hist = macd["histogram"]
        prev_hist_series = macd["series_hist"]
        prev_hist = _nth_last_valid(prev_hist_series, 2)

        if prev_hist is not None:
            if prev_hist <= 0 < hist:
                states["macd_event"] = "golden_cross"
            elif prev_hist >= 0 > hist:
                states["macd_event"] = "dead_cross"
            elif hist > 0:
                states["macd_event"] = "positive"
            else:
                states["macd_event"] = "negative"
        states["macd_histogram"] = round(hist, 4)

    # MA alignment
    ma = indicators["ma"]
    states["ma_alignment"] = ma["alignment"]

    # BB position bins
    bb = indicators["bb"]
    if bb["position"] is not None:
        pos = bb["position"]
        if pos < 0:
            states["bb_zone"] = "below_lower"
        elif pos < 0.25:
            states["bb_zone"] = "lower_quarter"
        elif pos < 0.5:
            states["bb_zone"] = "mid_lower"
        elif pos < 0.75:
            states["bb_zone"] = "mid_upper"
        elif pos <= 1.0:
            states["bb_zone"] = "upper_quarter"
        else:
            states["bb_zone"] = "above_upper"

    # Volume ratio bins
    vol = indicators["volume"]
    if vol["ratio"] is not None:
        ratio = vol["ratio"]
        if ratio < 0.5:
            states["volume_level"] = "very_low"
        elif ratio < 0.8:
            states["volume_level"] = "low"
        elif ratio < 1.2:
            states["volume_level"] = "normal"
        elif ratio < 2.0:
            states["volume_level"] = "high"
        else:
            states["volume_level"] = "very_high"

    # ── NEW STATES ──

    # Drawdown bins
    dd = indicators.get("drawdown", {})
    dd60 = dd.get("from_60d_high")
    if dd60 is not None:
        if dd60 <= -20:
            states["drawdown_60d"] = "crash_20pct_plus"
        elif dd60 <= -10:
            states["drawdown_60d"] = "correction_10_20"
        elif dd60 <= -5:
            states["drawdown_60d"] = "pullback_5_10"
        elif dd60 <= -2:
            states["drawdown_60d"] = "dip_2_5"
        else:
            states["drawdown_60d"] = "near_high"

    # ADX bins (trend strength)
    adx = indicators.get("adx", {})
    adx_val = adx.get("adx")
    if adx_val is not None:
        if adx_val < 20:
            states["adx_trend"] = "no_trend"
        elif adx_val < 25:
            states["adx_trend"] = "weak_trend"
        elif adx_val < 40:
            states["adx_trend"] = "strong_trend"
        else:
            states["adx_trend"] = "very_strong_trend"

    # Consecutive days bins
    consec = indicators.get("consecutive", {})
    days = consec.get("days", 0)
    if days >= 5:
        states["consecutive"] = "up_5plus"
    elif days >= 3:
        states["consecutive"] = "up_3_4"
    elif days <= -5:
        states["consecutive"] = "down_5plus"
    elif days <= -3:
        states["consecutive"] = "down_3_4"

    # MA distance bins (이격도)
    ma_dist = indicators.get("ma_distance", {})
    d20 = ma_dist.get("from_sma20")
    if d20 is not None:
        if d20 > 5:
            states["ma20_distance"] = "far_above_5pct"
        elif d20 > 2:
            states["ma20_distance"] = "above_2_5pct"
        elif d20 < -5:
            states["ma20_distance"] = "far_below_5pct"
        elif d20 < -2:
            states["ma20_distance"] = "below_2_5pct"
        else:
            states["ma20_distance"] = "near_ma20"

    return states


def _last_valid(series: pd.Series) -> float | None:
    """Get last non-NaN value from series."""
    valid = series.dropna()
    if valid.empty:
        return None
    return round(float(valid.iloc[-1]), 4)


def _nth_last_valid(series: pd.Series, n: int = 2) -> float | None:
    """Get nth-from-last non-NaN value."""
    valid = series.dropna()
    if len(valid) < n:
        return None
    return round(float(valid.iloc[-n]), 4)


def _last_valid_calc(close: pd.Series, rolling_high: pd.Series) -> float | None:
    """Calculate drawdown percentage from rolling high."""
    c = close.dropna()
    h = rolling_high.dropna()
    if c.empty or h.empty:
        return None
    cv = float(c.iloc[-1])
    hv = float(h.iloc[-1])
    if hv == 0:
        return None
    return (cv - hv) / hv * 100


def _calc_consecutive(returns: pd.Series) -> int:
    """Count consecutive up or down days from most recent."""
    clean = returns.dropna()
    if clean.empty:
        return 0

    count = 0
    direction = None

    for val in reversed(clean.values):
        if direction is None:
            if val > 0:
                direction = 1
                count = 1
            elif val < 0:
                direction = -1
                count = -1
            else:
                return 0
        else:
            if (direction > 0 and val > 0) or (direction < 0 and val < 0):
                count += direction
            else:
                break

    return count
