"""Smart data fetcher with yfinance + SQLite caching."""

from typing import Optional

import pandas as pd
import yfinance as yf

from .cache import get_cached_prices, save_prices


def fetch_price_history(ticker: str, period: str = "10y") -> pd.DataFrame:
    """
    Fetch daily OHLCV data. Uses cache if fresh, otherwise fetches from yfinance.

    Args:
        ticker: Stock ticker symbol (e.g. 'AAPL')
        period: Data period - '2y', '5y', '10y', 'max'

    Returns:
        DataFrame with columns: Open, High, Low, Close, Volume
    """
    ticker = ticker.upper()

    # Try cache first
    cached = get_cached_prices(ticker)
    if cached is not None and len(cached) > 500:
        return cached

    # Fetch from yfinance
    stock = yf.Ticker(ticker)
    df = stock.history(period=period, interval="1d")

    if df.empty:
        raise ValueError(f"No data found for ticker '{ticker}'")

    # Keep only needed columns
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.index = df.index.tz_localize(None)  # Remove timezone for SQLite

    # Save to cache
    save_prices(ticker, df)

    return df


def get_ticker_info(ticker: str) -> dict:
    """Get basic info about a ticker."""
    stock = yf.Ticker(ticker.upper())
    info = stock.info
    return {
        "ticker": ticker.upper(),
        "name": info.get("longName") or info.get("shortName", ticker.upper()),
        "sector": info.get("sector", ""),
        "industry": info.get("industry", ""),
        "market_cap": info.get("marketCap", 0),
        "currency": info.get("currency", "USD"),
    }


def search_tickers(query: str, limit: int = 10) -> list[dict]:
    """Search for tickers matching a query."""
    try:
        results = yf.search(query, max_results=limit)
        if not results or "quotes" not in results:
            return []
        return [
            {
                "ticker": q.get("symbol", ""),
                "name": q.get("longname") or q.get("shortname", ""),
                "exchange": q.get("exchange", ""),
                "type": q.get("quoteType", ""),
            }
            for q in results["quotes"]
            if q.get("symbol")
        ]
    except Exception:
        return []
