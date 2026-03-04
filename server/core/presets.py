"""
Predefined condition combinations for common trading scenarios.
Each preset is a named set of conditions for combined probability.
"""

PRESETS: dict[str, dict] = {
    "oversold_bounce": {
        "name": "Oversold Bounce Signal",
        "description": "RSI oversold + Stochastic oversold + Price near lower BB",
        "conditions": [
            {"indicator": "rsi", "state": "20-30"},
            {"indicator": "bb_zone", "state": "lower_quarter"},
        ],
    },
    "overbought_warning": {
        "name": "Overbought Warning",
        "description": "RSI overbought + Price near upper BB",
        "conditions": [
            {"indicator": "rsi", "state": "70-80"},
            {"indicator": "bb_zone", "state": "upper_quarter"},
        ],
    },
    "bullish_momentum": {
        "name": "Bullish Momentum",
        "description": "MACD golden cross + Bullish MA alignment + High volume",
        "conditions": [
            {"indicator": "macd_event", "state": "golden_cross"},
            {"indicator": "ma_alignment", "state": "bullish"},
        ],
    },
    "bearish_momentum": {
        "name": "Bearish Momentum",
        "description": "MACD dead cross + Bearish MA alignment",
        "conditions": [
            {"indicator": "macd_event", "state": "dead_cross"},
            {"indicator": "ma_alignment", "state": "bearish"},
        ],
    },
    "trend_following": {
        "name": "Trend Following Entry",
        "description": "Bullish alignment + RSI mid-range (not overbought) + MACD positive",
        "conditions": [
            {"indicator": "ma_alignment", "state": "bullish"},
            {"indicator": "rsi", "state": "50-60"},
            {"indicator": "macd_event", "state": "positive"},
        ],
    },
    "reversal_bottom": {
        "name": "Bottom Reversal",
        "description": "RSI oversold + MACD golden cross",
        "conditions": [
            {"indicator": "rsi", "state": "20-30"},
            {"indicator": "macd_event", "state": "golden_cross"},
        ],
    },
    "reversal_top": {
        "name": "Top Reversal",
        "description": "RSI overbought + MACD dead cross",
        "conditions": [
            {"indicator": "rsi", "state": "70-80"},
            {"indicator": "macd_event", "state": "dead_cross"},
        ],
    },
    "volume_breakout": {
        "name": "Volume Breakout",
        "description": "High volume + Price above upper BB + Bullish MA alignment",
        "conditions": [
            {"indicator": "volume_level", "state": "very_high"},
            {"indicator": "bb_zone", "state": "above_upper"},
            {"indicator": "ma_alignment", "state": "bullish"},
        ],
    },
}


def get_preset(name: str) -> dict | None:
    return PRESETS.get(name)


def list_presets() -> list[dict]:
    return [
        {"id": k, "name": v["name"], "description": v["description"], "condition_count": len(v["conditions"])}
        for k, v in PRESETS.items()
    ]
