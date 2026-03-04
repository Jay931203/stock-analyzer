"""
Backtesting engine: calculates historical probabilities for indicator conditions.

Core idea: When indicator X was in state Y in the past, what happened N days later?
No predictions, just historical statistics.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd
import ta


@dataclass
class CaseRecord:
    """A single historical occurrence with forward return results."""
    date: str
    entry_price: float
    returns: dict  # {5: pct, 10: pct, 20: pct}


@dataclass
class ProbabilityResult:
    """Result of a historical probability calculation."""
    condition: str
    occurrences: int
    periods: dict  # {5: {...}, 10: {...}, 20: {...}}
    cases: list[CaseRecord] | None = None
    warning: str | None = None

    def to_dict(self) -> dict:
        result = {
            "condition": self.condition,
            "occurrences": self.occurrences,
            "periods": self.periods,
            "warning": self.warning,
        }
        if self.cases:
            result["cases"] = [
                {"date": c.date, "entry_price": c.entry_price, "returns": c.returns}
                for c in self.cases
            ]
        return result


def calc_probability(
    df: pd.DataFrame,
    indicator: str,
    current_value: float | str,
    lookback_days: int = 1200,
) -> ProbabilityResult:
    """
    Find past occurrences where the indicator was in a similar state,
    then calculate forward returns distribution.
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

    if indicator == "rsi":
        return _rsi_probability(close, float(current_value), forward_periods)
    elif indicator == "macd_golden_cross":
        return _macd_cross_probability(close, "golden", forward_periods)
    elif indicator == "macd_dead_cross":
        return _macd_cross_probability(close, "dead", forward_periods)
    elif indicator == "ma_bullish":
        return _ma_alignment_probability(close, "bullish", forward_periods)
    elif indicator == "ma_bearish":
        return _ma_alignment_probability(close, "bearish", forward_periods)
    elif indicator == "bb_zone":
        return _bb_zone_probability(close, str(current_value), forward_periods)
    elif indicator == "volume_spike":
        return _volume_spike_probability(close, volume, forward_periods)
    elif indicator == "stoch":
        return _stochastic_probability(high, low, close, float(current_value), forward_periods)
    elif indicator == "drawdown":
        return _drawdown_probability(close, float(current_value), forward_periods)
    elif indicator == "adx":
        return _adx_probability(high, low, close, float(current_value), forward_periods)
    elif indicator == "consecutive":
        return _consecutive_probability(close, int(current_value), forward_periods)
    elif indicator == "ma_distance":
        return _ma_distance_probability(close, float(current_value), forward_periods)
    elif indicator == "week52_position":
        return _week52_probability(close, float(current_value), forward_periods)
    else:
        return ProbabilityResult(
            condition=f"unknown:{indicator}",
            occurrences=0,
            periods={},
            warning=f"Unknown indicator: {indicator}",
        )


def calc_combined_probability(
    df: pd.DataFrame,
    conditions: list[dict],
    lookback_days: int = 1200,
) -> ProbabilityResult:
    """
    Calculate probability when MULTIPLE conditions are met simultaneously.
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

    masks = []
    condition_labels = []

    for cond in conditions:
        ind = cond["indicator"]
        state = cond["state"]

        if ind == "rsi":
            rsi = ta.momentum.rsi(close, window=14)
            lo, hi = _parse_range(state)
            mask = (rsi >= lo) & (rsi < hi)
            condition_labels.append(f"RSI {state}")

        elif ind == "macd_event":
            macd_hist = ta.trend.macd_diff(close)
            if state == "golden_cross":
                mask = (macd_hist > 0) & (macd_hist.shift(1) <= 0)
                condition_labels.append("MACD Golden Cross")
            elif state == "dead_cross":
                mask = (macd_hist < 0) & (macd_hist.shift(1) >= 0)
                condition_labels.append("MACD Dead Cross")
            elif state == "positive":
                mask = macd_hist > 0
                condition_labels.append("MACD Positive")
            else:
                mask = macd_hist < 0
                condition_labels.append("MACD Negative")

        elif ind == "ma_alignment":
            sma20 = ta.trend.sma_indicator(close, window=20)
            sma50 = ta.trend.sma_indicator(close, window=50)
            sma200 = ta.trend.sma_indicator(close, window=200)
            if state == "bullish":
                mask = (sma20 > sma50) & (sma50 > sma200)
                condition_labels.append("MA Bullish Alignment")
            else:
                mask = (sma20 < sma50) & (sma50 < sma200)
                condition_labels.append("MA Bearish Alignment")

        elif ind == "bb_zone":
            bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
            bb_upper = bb.bollinger_hband()
            bb_lower = bb.bollinger_lband()
            bb_range = bb_upper - bb_lower
            bb_pos = (close - bb_lower) / bb_range.replace(0, np.nan)
            zone_ranges = {
                "below_lower": (-np.inf, 0),
                "lower_quarter": (0, 0.25),
                "mid_lower": (0.25, 0.5),
                "mid_upper": (0.5, 0.75),
                "upper_quarter": (0.75, 1.0),
                "above_upper": (1.0, np.inf),
            }
            lo, hi = zone_ranges.get(state, (0, 1))
            mask = (bb_pos >= lo) & (bb_pos < hi)
            condition_labels.append(f"BB {state}")

        elif ind == "volume_level":
            vol_sma = ta.trend.sma_indicator(volume.astype(float), window=20)
            vol_ratio = volume / vol_sma.replace(0, np.nan)
            level_ranges = {
                "very_low": (0, 0.5),
                "low": (0.5, 0.8),
                "normal": (0.8, 1.2),
                "high": (1.2, 2.0),
                "very_high": (2.0, np.inf),
            }
            lo, hi = level_ranges.get(state, (0.8, 1.2))
            mask = (vol_ratio >= lo) & (vol_ratio < hi)
            condition_labels.append(f"Volume {state}")

        elif ind == "drawdown_60d":
            rolling_high = close.rolling(window=60).max()
            dd = (close - rolling_high) / rolling_high * 100
            dd_ranges = {
                "crash_20pct_plus": (-100, -20),
                "correction_10_20": (-20, -10),
                "pullback_5_10": (-10, -5),
                "dip_2_5": (-5, -2),
                "near_high": (-2, 0.1),
            }
            lo, hi = dd_ranges.get(state, (-100, 0))
            mask = (dd >= lo) & (dd < hi)
            condition_labels.append(f"Drawdown {state}")

        elif ind == "adx_trend":
            adx = ta.trend.adx(high, low, close, window=14)
            adx_ranges = {
                "no_trend": (0, 20),
                "weak_trend": (20, 25),
                "strong_trend": (25, 40),
                "very_strong_trend": (40, 100),
            }
            lo, hi = adx_ranges.get(state, (0, 100))
            mask = (adx >= lo) & (adx < hi)
            condition_labels.append(f"ADX {state}")

        elif ind == "consecutive":
            daily_ret = close.pct_change()
            consec = _calc_consecutive_series(daily_ret)
            consec_ranges = {
                "up_5plus": (5, 100),
                "up_3_4": (3, 5),
                "down_3_4": (-5, -3),
                "down_5plus": (-100, -5),
            }
            lo, hi = consec_ranges.get(state, (0, 0))
            if lo >= 0:
                mask = (consec >= lo) & (consec < hi)
            else:
                mask = (consec > lo) & (consec <= hi)
            condition_labels.append(f"Consecutive {state}")

        elif ind == "ma20_distance":
            sma20 = ta.trend.sma_indicator(close, window=20)
            dist = (close - sma20) / sma20 * 100
            dist_ranges = {
                "far_above_5pct": (5, 100),
                "above_2_5pct": (2, 5),
                "near_ma20": (-2, 2),
                "below_2_5pct": (-5, -2),
                "far_below_5pct": (-100, -5),
            }
            lo, hi = dist_ranges.get(state, (-2, 2))
            mask = (dist >= lo) & (dist < hi)
            condition_labels.append(f"MA20 dist {state}")

        else:
            continue

        masks.append(mask)

    if not masks:
        return ProbabilityResult(
            condition="no valid conditions",
            occurrences=0,
            periods={},
            warning="No valid conditions provided",
        )

    combined = masks[0]
    for m in masks[1:]:
        combined = combined & m

    combined = combined.fillna(False)
    condition_str = " AND ".join(condition_labels)

    return _calc_forward_returns(close, combined, condition_str, forward_periods)


# ── Individual indicator probability functions ──────────────────────────


def _rsi_probability(
    close: pd.Series, current_rsi: float, periods: list[int]
) -> ProbabilityResult:
    rsi = ta.momentum.rsi(close, window=14)
    bin_low = int(current_rsi // 5) * 5
    bin_high = bin_low + 5
    mask = (rsi >= bin_low) & (rsi < bin_high)
    return _calc_forward_returns(close, mask, f"RSI {bin_low}-{bin_high}", periods)


def _macd_cross_probability(
    close: pd.Series, cross_type: str, periods: list[int]
) -> ProbabilityResult:
    macd_hist = ta.trend.macd_diff(close, window_slow=26, window_fast=12, window_sign=9)
    if cross_type == "golden":
        mask = (macd_hist > 0) & (macd_hist.shift(1) <= 0)
        label = "MACD Golden Cross"
    else:
        mask = (macd_hist < 0) & (macd_hist.shift(1) >= 0)
        label = "MACD Dead Cross"
    return _calc_forward_returns(close, mask, label, periods)


def _ma_alignment_probability(
    close: pd.Series, alignment: str, periods: list[int]
) -> ProbabilityResult:
    sma20 = ta.trend.sma_indicator(close, window=20)
    sma50 = ta.trend.sma_indicator(close, window=50)
    sma200 = ta.trend.sma_indicator(close, window=200)

    if alignment == "bullish":
        is_aligned = (sma20 > sma50) & (sma50 > sma200)
        mask = is_aligned & (~is_aligned.shift(1).infer_objects(copy=False).fillna(False))
        label = "MA Bullish Alignment Entry"
    else:
        is_aligned = (sma20 < sma50) & (sma50 < sma200)
        mask = is_aligned & (~is_aligned.shift(1).infer_objects(copy=False).fillna(False))
        label = "MA Bearish Alignment Entry"

    return _calc_forward_returns(close, mask, label, periods)


def _bb_zone_probability(
    close: pd.Series, zone: str, periods: list[int]
) -> ProbabilityResult:
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    bb_upper = bb.bollinger_hband()
    bb_lower = bb.bollinger_lband()
    bb_range = bb_upper - bb_lower
    bb_pos = (close - bb_lower) / bb_range.replace(0, np.nan)

    zone_ranges = {
        "below_lower": (-np.inf, 0),
        "lower_quarter": (0, 0.25),
        "mid_lower": (0.25, 0.5),
        "mid_upper": (0.5, 0.75),
        "upper_quarter": (0.75, 1.0),
        "above_upper": (1.0, np.inf),
    }
    lo, hi = zone_ranges.get(zone, (0, 1))
    mask = (bb_pos >= lo) & (bb_pos < hi)

    return _calc_forward_returns(close, mask, f"BB Zone: {zone}", periods)


def _volume_spike_probability(
    close: pd.Series, volume: pd.Series, periods: list[int]
) -> ProbabilityResult:
    vol_sma = ta.trend.sma_indicator(volume.astype(float), window=20)
    vol_ratio = volume / vol_sma.replace(0, np.nan)
    mask = vol_ratio >= 2.0
    return _calc_forward_returns(close, mask, "Volume Spike (>2x avg)", periods)


def _stochastic_probability(
    high: pd.Series, low: pd.Series, close: pd.Series,
    current_k: float, periods: list[int],
) -> ProbabilityResult:
    stoch_k = ta.momentum.stoch(high, low, close, window=14, smooth_window=3)
    bin_low = int(current_k // 10) * 10
    bin_high = bin_low + 10
    mask = (stoch_k >= bin_low) & (stoch_k < bin_high)
    return _calc_forward_returns(close, mask, f"Stochastic %K {bin_low}-{bin_high}", periods)


def _drawdown_probability(
    close: pd.Series, current_dd: float, periods: list[int]
) -> ProbabilityResult:
    """Probability when price drops X% from 60-day high."""
    rolling_high = close.rolling(window=60).max()
    dd = (close - rolling_high) / rolling_high * 100

    # Bin into 5% ranges
    if current_dd <= -20:
        bin_low, bin_high = -100, -20
        label = "Drawdown >20% from 60d high"
    elif current_dd <= -10:
        bin_low, bin_high = -20, -10
        label = "Drawdown 10-20% from 60d high"
    elif current_dd <= -5:
        bin_low, bin_high = -10, -5
        label = "Drawdown 5-10% from 60d high"
    elif current_dd <= -2:
        bin_low, bin_high = -5, -2
        label = "Drawdown 2-5% from 60d high"
    else:
        bin_low, bin_high = -2, 0.1
        label = "Near 60d high (within 2%)"

    mask = (dd >= bin_low) & (dd < bin_high)
    return _calc_forward_returns(close, mask, label, periods)


def _adx_probability(
    high: pd.Series, low: pd.Series, close: pd.Series,
    current_adx: float, periods: list[int],
) -> ProbabilityResult:
    """Probability based on ADX trend strength."""
    adx = ta.trend.adx(high, low, close, window=14)

    if current_adx < 20:
        mask = adx < 20
        label = "ADX <20 (No Trend)"
    elif current_adx < 25:
        mask = (adx >= 20) & (adx < 25)
        label = "ADX 20-25 (Weak Trend)"
    elif current_adx < 40:
        mask = (adx >= 25) & (adx < 40)
        label = "ADX 25-40 (Strong Trend)"
    else:
        mask = adx >= 40
        label = "ADX >40 (Very Strong Trend)"

    return _calc_forward_returns(close, mask, label, periods)


def _consecutive_probability(
    close: pd.Series, current_days: int, periods: list[int]
) -> ProbabilityResult:
    """Probability after N consecutive up/down days."""
    daily_ret = close.pct_change()
    consec = _calc_consecutive_series(daily_ret)

    abs_days = abs(current_days)
    direction = "Up" if current_days > 0 else "Down"

    if abs_days >= 5:
        if current_days > 0:
            mask = consec >= 5
        else:
            mask = consec <= -5
        label = f"{abs_days}+ Consecutive {direction} Days"
    elif abs_days >= 3:
        if current_days > 0:
            mask = (consec >= 3) & (consec < 5)
        else:
            mask = (consec <= -3) & (consec > -5)
        label = f"3-4 Consecutive {direction} Days"
    else:
        mask = pd.Series(False, index=close.index)
        label = f"Short streak ({current_days}d)"

    return _calc_forward_returns(close, mask, label, periods)


def _ma_distance_probability(
    close: pd.Series, current_dist: float, periods: list[int]
) -> ProbabilityResult:
    """Probability based on distance from SMA20."""
    sma20 = ta.trend.sma_indicator(close, window=20)
    dist = (close - sma20) / sma20 * 100

    if current_dist > 5:
        mask = dist > 5
        label = "Price >5% above SMA20"
    elif current_dist > 2:
        mask = (dist > 2) & (dist <= 5)
        label = "Price 2-5% above SMA20"
    elif current_dist >= -2:
        mask = (dist >= -2) & (dist <= 2)
        label = "Price near SMA20 (within 2%)"
    elif current_dist >= -5:
        mask = (dist >= -5) & (dist < -2)
        label = "Price 2-5% below SMA20"
    else:
        mask = dist < -5
        label = "Price >5% below SMA20"

    return _calc_forward_returns(close, mask, label, periods)


def _week52_probability(
    close: pd.Series, current_pos: float, periods: list[int]
) -> ProbabilityResult:
    """Probability based on 52-week position."""
    high_52w = close.rolling(window=252).max()
    low_52w = close.rolling(window=252).min()
    range_52w = high_52w - low_52w
    pos = (close - low_52w) / range_52w.replace(0, np.nan) * 100

    if current_pos >= 90:
        mask = pos >= 90
        label = "Near 52-week high (top 10%)"
    elif current_pos >= 70:
        mask = (pos >= 70) & (pos < 90)
        label = "52-week position 70-90%"
    elif current_pos >= 30:
        mask = (pos >= 30) & (pos < 70)
        label = "52-week position 30-70% (middle)"
    elif current_pos >= 10:
        mask = (pos >= 10) & (pos < 30)
        label = "52-week position 10-30%"
    else:
        mask = pos < 10
        label = "Near 52-week low (bottom 10%)"

    return _calc_forward_returns(close, mask, label, periods)


# ── Helper: consecutive series ──────────────────────────────────────────


def _calc_consecutive_series(returns: pd.Series) -> pd.Series:
    """Build a series of consecutive up/down day counts."""
    sign = returns.apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    result = pd.Series(0, index=returns.index, dtype=int)

    prev = 0
    for i in range(len(sign)):
        s = sign.iloc[i]
        if s == 0:
            prev = 0
        elif prev == 0:
            prev = s
        elif (prev > 0 and s > 0):
            prev = prev + 1
        elif (prev < 0 and s < 0):
            prev = prev - 1
        else:
            prev = s
        result.iloc[i] = prev

    return result


# ── Core forward returns calculator ─────────────────────────────────────


def _calc_forward_returns(
    close: pd.Series,
    mask: pd.Series,
    condition_label: str,
    forward_periods: list[int],
) -> ProbabilityResult:
    mask = mask.fillna(False)
    signal_dates = mask[mask].index

    max_fwd = max(forward_periods)
    valid_signals = signal_dates[signal_dates <= close.index[-max_fwd - 1]] if len(close) > max_fwd else pd.DatetimeIndex([])

    occurrences = len(valid_signals)
    warning = None

    if occurrences == 0:
        return ProbabilityResult(
            condition=condition_label,
            occurrences=0,
            periods={p: _empty_stats() for p in forward_periods},
            warning="No historical occurrences found",
        )

    if occurrences < 10:
        warning = f"Low sample size ({occurrences}). Results may not be statistically significant."

    case_returns = {}
    for sig_date in valid_signals:
        idx = close.index.get_loc(sig_date)
        case_returns[sig_date] = {}
        for n_days in forward_periods:
            if idx + n_days < len(close):
                entry_price = close.iloc[idx]
                exit_price = close.iloc[idx + n_days]
                ret = (exit_price - entry_price) / entry_price * 100
                case_returns[sig_date][n_days] = round(float(ret), 2)

    periods_result = {}
    for n_days in forward_periods:
        returns = [cr[n_days] for cr in case_returns.values() if n_days in cr]
        if returns:
            returns_arr = np.array(returns)
            periods_result[n_days] = {
                "samples": len(returns),
                "win_rate": round(float(np.mean(returns_arr > 0) * 100), 1),
                "avg_return": round(float(np.mean(returns_arr)), 2),
                "median_return": round(float(np.median(returns_arr)), 2),
                "best": round(float(np.max(returns_arr)), 2),
                "worst": round(float(np.min(returns_arr)), 2),
                "std_dev": round(float(np.std(returns_arr)), 2),
            }
        else:
            periods_result[n_days] = _empty_stats()

    cases = []
    for sig_date, rets in case_returns.items():
        date_str = sig_date.strftime("%Y-%m-%d") if hasattr(sig_date, "strftime") else str(sig_date)
        entry_price = round(float(close.loc[sig_date]), 2)
        cases.append(CaseRecord(date=date_str, entry_price=entry_price, returns=rets))

    return ProbabilityResult(
        condition=condition_label,
        occurrences=occurrences,
        periods=periods_result,
        cases=cases,
        warning=warning,
    )


def _empty_stats() -> dict:
    return {
        "samples": 0,
        "win_rate": 0,
        "avg_return": 0,
        "median_return": 0,
        "best": 0,
        "worst": 0,
        "std_dev": 0,
    }


def _parse_range(range_str: str) -> tuple[float, float]:
    parts = range_str.split("-")
    if len(parts) == 2:
        return float(parts[0]), float(parts[1])
    val = float(parts[0])
    return val, val + 10
