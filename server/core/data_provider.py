"""Abstract data provider interface and concrete implementations.

Abstracts market data sourcing so the app can switch between yfinance
(development / free tier) and commercial APIs like Twelve Data without
changing any calling code.
"""

from __future__ import annotations

import logging
import os
import time
from abc import ABC, abstractmethod
from typing import Any

import pandas as pd
import requests
import yfinance as yf

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class DataProvider(ABC):
    """Abstract base for market data providers."""

    @abstractmethod
    def fetch_daily_history(
        self, ticker: str, years: int = 10
    ) -> pd.DataFrame:
        """Return daily OHLCV DataFrame.

        Returns:
            DataFrame with columns ``Open, High, Low, Close, Volume``
            and a tz-naive ``DatetimeIndex`` named ``Date``.
        """

    @abstractmethod
    def fetch_quote(self, ticker: str) -> dict[str, Any] | None:
        """Return a single quote dict.

        Keys: ``ticker, name, price, change, change_pct, volume,
        market_cap, week_return, month_return, sector, market_state``.
        Returns ``None`` when the ticker cannot be resolved.
        """

    @abstractmethod
    def fetch_batch_quotes(self, tickers: list[str]) -> list[dict[str, Any]]:
        """Return quotes for multiple tickers."""

    @abstractmethod
    def fetch_live_prices(
        self, tickers: list[str]
    ) -> dict[str, dict[str, Any]]:
        """Return a lightweight price dict keyed by ticker symbol.

        Each value: ``{price, change, change_pct, market_state}``.
        """

    @abstractmethod
    def search_tickers(
        self, query: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Search for tickers matching *query*."""


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

_IS_VERCEL = os.environ.get("VERCEL") is not None


def _make_session() -> requests.Session:
    """Create a ``requests`` session with browser-like headers."""
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": _UA,
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;"
                "q=0.9,*/*;q=0.8"
            ),
            "Accept-Language": "en-US,en;q=0.5",
        }
    )
    return s


# Yahoo crumb cache (shared across YFinanceProvider instances)
_crumb_cache: dict[str, Any] = {"crumb": None, "cookies": None, "ts": 0}


def _get_yahoo_crumb(session: requests.Session) -> tuple[str, dict]:
    """Get Yahoo Finance crumb + cookies for authenticated API calls."""
    now = time.time()
    if _crumb_cache["crumb"] and now - _crumb_cache["ts"] < 3600:
        return _crumb_cache["crumb"], _crumb_cache["cookies"]

    session.get("https://fc.yahoo.com", timeout=10)
    resp = session.get(
        "https://query2.finance.yahoo.com/v1/test/getcrumb",
        timeout=10,
    )
    crumb = resp.text.strip()
    cookies = dict(session.cookies)

    _crumb_cache.update({"crumb": crumb, "cookies": cookies, "ts": now})
    return crumb, cookies


# ---------------------------------------------------------------------------
# YFinance provider
# ---------------------------------------------------------------------------


class YFinanceProvider(DataProvider):
    """Data provider backed by *yfinance* and direct Yahoo Finance APIs.

    Suitable for development and personal use.  Yahoo Finance TOS prohibit
    commercial redistribution so this provider must be swapped out before
    monetisation.
    """

    def __init__(self) -> None:
        self._session = _make_session() if _IS_VERCEL else None

    # -- helpers ------------------------------------------------------------

    def _yf_kwargs(self) -> dict:
        return {"session": self._session} if self._session else {}

    def _yahoo_direct_history(
        self, ticker: str, period: str = "10y"
    ) -> pd.DataFrame:
        """Fetch price history via Yahoo v8 chart API (fallback)."""
        session = _make_session()
        try:
            crumb, cookies = _get_yahoo_crumb(session)
        except Exception:
            crumb, cookies = "", {}

        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {
            "range": period,
            "interval": "1d",
            "includePrePost": "false",
            "events": "",
        }
        if crumb:
            params["crumb"] = crumb

        resp = session.get(url, params=params, cookies=cookies, timeout=30)
        data = resp.json()

        result = data.get("chart", {}).get("result")
        if not result:
            return pd.DataFrame()

        chart = result[0]
        timestamps = chart.get("timestamp", [])
        quote = chart.get("indicators", {}).get("quote", [{}])[0]

        if not timestamps:
            return pd.DataFrame()

        df = pd.DataFrame(
            {
                "Open": quote.get("open", []),
                "High": quote.get("high", []),
                "Low": quote.get("low", []),
                "Close": quote.get("close", []),
                "Volume": quote.get("volume", []),
            },
            index=pd.to_datetime(timestamps, unit="s"),
        )
        df.index.name = "Date"
        df = df.dropna(subset=["Close"])
        return df

    def _yahoo_direct_quote(self, ticker: str) -> dict[str, Any] | None:
        """Fetch quote info via Yahoo v8 chart API."""
        session = _make_session()
        try:
            crumb, cookies = _get_yahoo_crumb(session)
        except Exception:
            crumb, cookies = "", {}

        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {"range": "1mo", "interval": "1d"}
        if crumb:
            params["crumb"] = crumb

        resp = session.get(url, params=params, cookies=cookies, timeout=15)
        data = resp.json()

        result = data.get("chart", {}).get("result")
        if not result:
            return None

        chart = result[0]
        meta = chart.get("meta", {})
        quote = chart.get("indicators", {}).get("quote", [{}])[0]
        closes = [c for c in (quote.get("close") or []) if c is not None]
        volumes = [v for v in (quote.get("volume") or []) if v is not None]

        if not closes:
            return None

        reg_close = closes[-1]
        prev_close = closes[-2] if len(closes) > 1 else reg_close

        market_state = meta.get("marketState", "REGULAR")
        if market_state == "PRE" and meta.get("preMarketPrice"):
            close = meta["preMarketPrice"]
        elif market_state in ("POST", "POSTPOST") and meta.get(
            "postMarketPrice"
        ):
            close = meta["postMarketPrice"]
        else:
            close = meta.get("regularMarketPrice") or reg_close

        change = close - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0

        week_start = closes[-5] if len(closes) >= 5 else closes[0]
        week_return = (
            ((close - week_start) / week_start * 100) if week_start else 0
        )

        month_start = closes[0]
        month_return = (
            ((close - month_start) / month_start * 100) if month_start else 0
        )

        vol = volumes[-1] if volumes else 0

        return {
            "ticker": ticker.upper(),
            "name": (
                meta.get("longName") or meta.get("shortName") or ticker.upper()
            ),
            "price": round(close, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(vol),
            "market_cap": meta.get("marketCap", 0),
            "week_return": round(week_return, 2),
            "month_return": round(month_return, 2),
            "sector": "",
            "market_state": market_state,
        }

    # -- public interface ---------------------------------------------------

    def fetch_daily_history(
        self, ticker: str, years: int = 10
    ) -> pd.DataFrame:
        period_map = {1: "1y", 2: "2y", 3: "3y", 5: "5y", 10: "10y"}
        period = period_map.get(years, "10y")

        df = pd.DataFrame()
        try:
            stock = yf.Ticker(ticker, **self._yf_kwargs())
            df = stock.history(period=period, interval="1d")
            if df.empty:
                for fb in ["5y", "2y", "1y"]:
                    df = stock.history(period=fb, interval="1d")
                    if not df.empty:
                        break
        except Exception:
            pass

        if df.empty:
            df = self._yahoo_direct_history(ticker, period)
            if df.empty:
                for fb in ["5y", "2y", "1y"]:
                    df = self._yahoo_direct_history(ticker, fb)
                    if not df.empty:
                        break

        if df.empty:
            raise ValueError(f"No data found for ticker '{ticker}'")

        cols = [
            c
            for c in ["Open", "High", "Low", "Close", "Volume"]
            if c in df.columns
        ]
        df = df[cols].copy()

        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)

        df.index.name = "Date"
        return df

    def fetch_quote(self, ticker: str) -> dict[str, Any] | None:
        try:
            stock = yf.Ticker(ticker.upper(), **self._yf_kwargs())
            info = stock.info
            hist = stock.history(period="1mo", interval="1d")

            if not hist.empty:
                reg_close = float(hist["Close"].iloc[-1])
                prev_close = (
                    float(hist["Close"].iloc[-2])
                    if len(hist) > 1
                    else reg_close
                )

                market_state = info.get("marketState", "REGULAR")
                if market_state == "PRE" and info.get("preMarketPrice"):
                    close = float(info["preMarketPrice"])
                elif market_state in ("POST", "POSTPOST") and info.get(
                    "postMarketPrice"
                ):
                    close = float(info["postMarketPrice"])
                else:
                    close = float(
                        info.get("regularMarketPrice") or reg_close
                    )

                change = close - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0

                week_start = (
                    float(hist["Close"].iloc[-5])
                    if len(hist) >= 5
                    else float(hist["Close"].iloc[0])
                )
                week_return = (
                    ((close - week_start) / week_start * 100)
                    if week_start
                    else 0
                )

                month_start = float(hist["Close"].iloc[0])
                month_return = (
                    ((close - month_start) / month_start * 100)
                    if month_start
                    else 0
                )

                vol = (
                    float(hist["Volume"].iloc[-1])
                    if "Volume" in hist.columns
                    else 0
                )

                return {
                    "ticker": ticker.upper(),
                    "name": info.get("longName")
                    or info.get("shortName", ticker.upper()),
                    "price": round(close, 2),
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                    "volume": int(vol),
                    "market_cap": info.get("marketCap", 0),
                    "week_return": round(week_return, 2),
                    "month_return": round(month_return, 2),
                    "sector": info.get("sector", ""),
                    "market_state": market_state,
                }
        except Exception:
            pass

        return self._yahoo_direct_quote(ticker)

    def fetch_batch_quotes(
        self, tickers: list[str]
    ) -> list[dict[str, Any]]:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        results: list[dict[str, Any]] = []
        with ThreadPoolExecutor(
            max_workers=min(len(tickers), 8)
        ) as executor:
            futures = {
                executor.submit(self.fetch_quote, t): t for t in tickers
            }
            for future in as_completed(futures):
                try:
                    q = future.result()
                    if q:
                        results.append(q)
                except Exception:
                    pass
        return results

    def fetch_live_prices(
        self, tickers: list[str]
    ) -> dict[str, dict[str, Any]]:
        if not tickers:
            return {}

        session = _make_session()
        try:
            crumb, cookies = _get_yahoo_crumb(session)
        except Exception:
            crumb, cookies = "", {}

        symbols = ",".join(t.upper() for t in tickers)
        url = "https://query2.finance.yahoo.com/v7/finance/quote"
        params: dict[str, str] = {"symbols": symbols}
        if crumb:
            params["crumb"] = crumb

        try:
            resp = session.get(
                url, params=params, cookies=cookies, timeout=15
            )
            data = resp.json()
        except Exception:
            return {}

        results: dict[str, dict[str, Any]] = {}
        for q in data.get("quoteResponse", {}).get("result", []):
            sym = q.get("symbol", "")
            market_state = q.get("marketState", "REGULAR")
            reg_price = q.get("regularMarketPrice", 0)
            reg_change = q.get("regularMarketChange", 0)
            reg_change_pct = q.get("regularMarketChangePercent", 0)

            if market_state == "PRE" and q.get("preMarketPrice"):
                price = q["preMarketPrice"]
                change = q.get("preMarketChange", 0)
                change_pct = q.get("preMarketChangePercent", 0)
            elif market_state in ("POST", "POSTPOST") and q.get(
                "postMarketPrice"
            ):
                price = q["postMarketPrice"]
                change = q.get("postMarketChange", 0)
                change_pct = q.get("postMarketChangePercent", 0)
            else:
                price = reg_price
                change = reg_change
                change_pct = reg_change_pct

            results[sym] = {
                "price": round(price, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "market_state": market_state,
            }

        return results

    def search_tickers(
        self, query: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Search via yfinance (used only when local TICKER_DB misses)."""
        try:
            results = yf.search(query, max_results=limit)
            if not results or "quotes" not in results:
                return []
            return [
                {
                    "ticker": q_item.get("symbol", ""),
                    "name": q_item.get("longname")
                    or q_item.get("shortname", ""),
                    "exchange": q_item.get("exchange", ""),
                    "type": q_item.get("quoteType", ""),
                }
                for q_item in results["quotes"]
                if q_item.get("symbol")
            ][:limit]
        except Exception:
            return []


# ---------------------------------------------------------------------------
# Twelve Data provider
# ---------------------------------------------------------------------------

# Rate limiter for Twelve Data free tier (8 req/min, 800 req/day)
_td_rate: dict[str, Any] = {
    "minute_hits": [],      # timestamps within current minute window
    "daily_count": 0,       # calls today
    "daily_reset": 0.0,     # epoch when daily counter was last reset
}

_TD_MAX_PER_MINUTE = 8
_TD_MAX_PER_DAY = 800
_TD_MINUTE_WINDOW = 60.0


def _td_rate_wait() -> None:
    """Block until the next Twelve Data call is allowed."""
    import time as _time

    now = _time.time()

    # Reset daily counter at midnight UTC
    today_start = now - (now % 86400)
    if _td_rate["daily_reset"] < today_start:
        _td_rate["daily_count"] = 0
        _td_rate["daily_reset"] = today_start

    if _td_rate["daily_count"] >= _TD_MAX_PER_DAY:
        raise RuntimeError(
            "Twelve Data daily rate limit (800 calls) exhausted"
        )

    # Prune minute window
    cutoff = now - _TD_MINUTE_WINDOW
    _td_rate["minute_hits"] = [
        t for t in _td_rate["minute_hits"] if t > cutoff
    ]

    if len(_td_rate["minute_hits"]) >= _TD_MAX_PER_MINUTE:
        sleep_for = _td_rate["minute_hits"][0] + _TD_MINUTE_WINDOW - now + 0.1
        if sleep_for > 0:
            logger.info(
                "Twelve Data rate limit: sleeping %.1fs", sleep_for
            )
            _time.sleep(sleep_for)
        # Re-prune after sleep
        now = _time.time()
        cutoff = now - _TD_MINUTE_WINDOW
        _td_rate["minute_hits"] = [
            t for t in _td_rate["minute_hits"] if t > cutoff
        ]

    _td_rate["minute_hits"].append(now)
    _td_rate["daily_count"] += 1


class TwelveDataProvider(DataProvider):
    """Data provider backed by the Twelve Data REST API.

    Requires the ``TWELVE_DATA_API_KEY`` environment variable.
    Free tier: 800 calls/day, 8 calls/minute.  The provider enforces
    rate limits internally via ``_td_rate_wait()``.

    API docs: https://twelvedata.com/docs
    """

    _BASE = "https://api.twelvedata.com"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("Twelve Data API key must not be empty")
        self._api_key = api_key
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": _UA})

    def _get(
        self, path: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Issue a rate-limited GET to the Twelve Data API."""
        _td_rate_wait()
        params = params or {}
        params["apikey"] = self._api_key
        resp = self._session.get(
            f"{self._BASE}{path}", params=params, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "error":
            code = data.get("code", 0)
            msg = data.get("message", "Unknown Twelve Data error")
            # code 429 = rate limit hit on server side
            if code == 429:
                logger.warning("Twelve Data server-side rate limit: %s", msg)
                time.sleep(10)
                return self._get(path, params)  # single retry
            raise RuntimeError(f"Twelve Data error ({code}): {msg}")
        return data

    # -- public interface ---------------------------------------------------

    def fetch_daily_history(
        self, ticker: str, years: int = 10
    ) -> pd.DataFrame:
        # Twelve Data max outputsize is 5000 (~20 years of trading days)
        outputsize = min(years * 252, 5000)

        data = self._get(
            "/time_series",
            {
                "symbol": ticker.upper(),
                "interval": "1day",
                "outputsize": str(outputsize),
                "format": "JSON",
            },
        )

        values = data.get("values")
        if not values:
            raise ValueError(
                f"No Twelve Data history for ticker '{ticker}'"
            )

        rows = []
        for v in values:
            rows.append(
                {
                    "Date": v["datetime"],
                    "Open": float(v["open"]),
                    "High": float(v["high"]),
                    "Low": float(v["low"]),
                    "Close": float(v["close"]),
                    "Volume": int(v["volume"]),
                }
            )

        df = pd.DataFrame(rows)
        df["Date"] = pd.to_datetime(df["Date"])
        df.set_index("Date", inplace=True)
        df.sort_index(inplace=True)  # Twelve Data returns newest first
        return df

    def fetch_quote(self, ticker: str) -> dict[str, Any] | None:
        try:
            data = self._get("/quote", {"symbol": ticker.upper()})
        except Exception:
            logger.exception("Twelve Data quote failed for %s", ticker)
            return None

        if not data.get("symbol"):
            return None

        price = float(data.get("close", 0))
        prev = float(data.get("previous_close", 0))
        change = float(data.get("change", price - prev))
        change_pct = float(data.get("percent_change", 0))

        # Twelve Data quote does not include week/month returns or
        # market_cap in the basic endpoint, so we set defaults.
        return {
            "ticker": data["symbol"].upper(),
            "name": data.get("name", data["symbol"].upper()),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(data.get("volume", 0)),
            "market_cap": 0,
            "week_return": 0.0,
            "month_return": 0.0,
            "sector": "",
            "market_state": (
                "REGULAR"
                if data.get("is_market_open")
                else "CLOSED"
            ),
        }

    def fetch_batch_quotes(
        self, tickers: list[str]
    ) -> list[dict[str, Any]]:
        # Twelve Data supports comma-separated symbols in /quote
        if not tickers:
            return []

        # Batch up to 12 symbols per call (free tier limit)
        results: list[dict[str, Any]] = []
        for i in range(0, len(tickers), 12):
            batch = tickers[i : i + 12]
            symbols = ",".join(t.upper() for t in batch)
            try:
                data = self._get("/quote", {"symbol": symbols})
            except Exception:
                logger.exception("Twelve Data batch quote failed")
                continue

            # Single symbol returns a dict; multiple returns a list
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not item.get("symbol"):
                    continue
                price = float(item.get("close", 0))
                prev = float(item.get("previous_close", 0))
                change = float(item.get("change", price - prev))
                change_pct = float(item.get("percent_change", 0))
                results.append(
                    {
                        "ticker": item["symbol"].upper(),
                        "name": item.get("name", item["symbol"].upper()),
                        "price": round(price, 2),
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                        "volume": int(item.get("volume", 0)),
                        "market_cap": 0,
                        "week_return": 0.0,
                        "month_return": 0.0,
                        "sector": "",
                        "market_state": (
                            "REGULAR"
                            if item.get("is_market_open")
                            else "CLOSED"
                        ),
                    }
                )
        return results

    def fetch_live_prices(
        self, tickers: list[str]
    ) -> dict[str, dict[str, Any]]:
        if not tickers:
            return {}

        results: dict[str, dict[str, Any]] = {}
        # Use /price endpoint for lightweight price-only fetch
        for i in range(0, len(tickers), 12):
            batch = tickers[i : i + 12]
            symbols = ",".join(t.upper() for t in batch)
            try:
                data = self._get("/price", {"symbol": symbols})
            except Exception:
                logger.exception("Twelve Data live price failed")
                continue

            # Single → dict with "price"; multiple → dict of dicts
            if len(batch) == 1:
                sym = batch[0].upper()
                price = float(data.get("price", 0))
                results[sym] = {
                    "price": round(price, 2),
                    "change": 0.0,
                    "change_pct": 0.0,
                    "market_state": "REGULAR",
                }
            else:
                for sym, val in data.items():
                    if isinstance(val, dict) and "price" in val:
                        price = float(val["price"])
                        results[sym.upper()] = {
                            "price": round(price, 2),
                            "change": 0.0,
                            "change_pct": 0.0,
                            "market_state": "REGULAR",
                        }

        return results

    def search_tickers(
        self, query: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        try:
            data = self._get(
                "/symbol_search",
                {"symbol": query, "outputsize": str(limit)},
            )
        except Exception:
            logger.exception("Twelve Data search failed for %s", query)
            return []

        items = data.get("data", [])
        return [
            {
                "ticker": item.get("symbol", ""),
                "name": item.get("instrument_name", ""),
                "exchange": item.get("exchange", ""),
                "type": item.get("instrument_type", ""),
            }
            for item in items
            if item.get("symbol")
        ][:limit]
