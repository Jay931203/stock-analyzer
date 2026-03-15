"""Pydantic response models for the API."""

from pydantic import BaseModel, Field


class PeriodStats(BaseModel):
    samples: int
    win_rate: float = Field(description="Percentage of times price went up")
    avg_return: float = Field(description="Average return in %")
    median_return: float = Field(description="Median return in %")
    best: float = Field(description="Best return in %")
    worst: float = Field(description="Worst return in %")
    std_dev: float = Field(description="Standard deviation of returns")


class CaseRecord(BaseModel):
    date: str
    entry_price: float
    returns: dict[str, float] = Field(description="Forward returns by period")


class ProbabilityData(BaseModel):
    condition: str
    occurrences: int
    periods: dict[str, PeriodStats] = Field(description="Forward period stats")
    cases: list[CaseRecord] | None = Field(default=None)
    warning: str | None = None


class RSIData(BaseModel):
    value: float | None
    window: int = 14
    probability: ProbabilityData | None = None


class MACDData(BaseModel):
    macd: float | None
    signal: float | None
    histogram: float | None
    event: str | None = None
    probability: ProbabilityData | None = None


class MAData(BaseModel):
    sma20: float | None
    sma50: float | None
    sma200: float | None
    price: float
    alignment: str
    probability: ProbabilityData | None = None


class BBData(BaseModel):
    upper: float | None
    middle: float | None
    lower: float | None
    width: float | None = None
    position: float | None = None
    price: float
    zone: str | None = None
    probability: ProbabilityData | None = None


class VolumeData(BaseModel):
    current: float
    avg20: float | None
    ratio: float | None = None
    probability: ProbabilityData | None = None


class StochasticData(BaseModel):
    k: float | None
    d: float | None
    probability: ProbabilityData | None = None


# ── NEW indicator models ──

class DrawdownData(BaseModel):
    from_20d_high: float | None = Field(description="% drop from 20-day high")
    from_60d_high: float | None = Field(description="% drop from 60-day high")
    from_252d_high: float | None = Field(description="% drop from 252-day (1yr) high")
    high_20d: float | None = None
    high_60d: float | None = None
    high_252d: float | None = None
    probability: ProbabilityData | None = None


class ADXData(BaseModel):
    adx: float | None = Field(description="ADX value (trend strength)")
    plus_di: float | None = Field(description="+DI")
    minus_di: float | None = Field(description="-DI")
    trend_strength: str | None = Field(default=None, description="no_trend, weak, strong, very_strong")
    probability: ProbabilityData | None = None


class ATRData(BaseModel):
    atr: float | None = Field(description="Average True Range (absolute)")
    atr_pct: float | None = Field(description="ATR as % of price")
    probability: ProbabilityData | None = None


class MADistanceData(BaseModel):
    from_sma20: float | None = Field(description="% distance from SMA20")
    from_sma50: float | None = Field(description="% distance from SMA50")
    from_sma200: float | None = Field(description="% distance from SMA200")
    probability: ProbabilityData | None = None


class ConsecutiveData(BaseModel):
    days: int = Field(description="Consecutive days (positive=up, negative=down)")
    streak_type: str = Field(description="up, down, or flat")
    probability: ProbabilityData | None = None


class PriceDistBin(BaseModel):
    price_low: float
    price_high: float
    days: int
    pct: float


class Week52Data(BaseModel):
    position_pct: float | None = Field(description="0=52w low, 100=52w high")
    high: float | None = None
    low: float | None = None
    probability: ProbabilityData | None = None
    price_distribution: list[PriceDistBin] | None = None


class CombinedProbability(BaseModel):
    conditions: list[str]
    probability: ProbabilityData | None = None
    tier: str | None = None
    occurrences: int | None = None


class PriceInfo(BaseModel):
    current: float
    change: float
    change_pct: float
    high_52w: float | None = None
    low_52w: float | None = None


class TickerInfo(BaseModel):
    ticker: str
    name: str
    sector: str = ""
    industry: str = ""
    currency: str = "USD"


class AnalysisResponse(BaseModel):
    ticker_info: TickerInfo
    price: PriceInfo
    indicators: dict
    combined: CombinedProbability | None = None
    analysis_date: str
    data_range: str | None = Field(default=None, description="Date range of data used")


class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str = ""
    type: str = ""


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


# ── Time Machine models ──


class ActualReturn(BaseModel):
    return_pct: float = Field(description="Actual return percentage")
    end_price: float = Field(description="Price at end of period")
    went_up: bool = Field(description="Whether price went up")


class TimeMachineSignal(BaseModel):
    direction: str = Field(description="bullish, bearish, or neutral")
    win_rate_20d: float | None = Field(default=None, description="Predicted 20-day win rate at that date")
    win_rates: dict[str, float] = Field(default_factory=dict, description="Win rates for all computed periods {5: 62.3, 20: 58.1, ...}")
    occurrences: int = Field(default=0, description="Number of historical occurrences")
    tier: str | None = Field(default=None, description="Matching tier: strict, normal, or relaxed")
    conditions: list[dict] = Field(default_factory=list, description="Indicator conditions used")
    confidence_warning: str | None = Field(default=None, description="Warning when occurrences < 10")


class TimeMachineAccuracy(BaseModel):
    predicted_direction: str = Field(description="bullish or bearish")
    actual_direction: str = Field(description="up or down")
    was_correct: bool = Field(description="Whether prediction matched reality")


class TimeMachineHighlight(BaseModel):
    text: str
    type: str = Field(description="bullish or bearish")


class TimeMachineResponse(BaseModel):
    ticker: str
    date: str
    price_at_date: float
    current_price: float
    signal: TimeMachineSignal
    actual: dict[str, ActualReturn] = Field(description="Forward returns by period (5, 10, 20, 60, 120 days)")
    accuracy: TimeMachineAccuracy | None = None
    indicators_at_date: dict = Field(default_factory=dict, description="Indicator values at the selected date")
    highlights: list[TimeMachineHighlight] = Field(default_factory=list)


class TimeMachineRangeResponse(BaseModel):
    ticker: str
    first_date: str
    last_date: str
    total_days: int
