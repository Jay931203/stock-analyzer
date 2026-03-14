"""Smart data fetcher with pluggable provider + SQLite caching.

All public functions maintain their original signatures so that existing
callers (routes.py, og.py, cli.py, etc.) continue to work unchanged.

The actual data source is determined by the ``DATA_PROVIDER`` environment
variable (default: ``yfinance``).  See :mod:`provider_factory` for details.

Earnings-related helpers remain on yfinance directly because earnings data
is supplementary and not available from all providers.
"""

import os
import time
from typing import Optional

import pandas as pd
import requests
import yfinance as yf

from .cache import get_cached_prices, save_prices
from .provider_factory import get_provider


# ---------------------------------------------------------------------------
# Ticker databases (kept here -- used by routes, earnings helpers, etc.)
# ---------------------------------------------------------------------------

TICKER_DB = {
    # ── Technology: Mega-cap ──
    "AAPL": "Apple Inc.", "AMZN": "Amazon.com Inc.", "GOOGL": "Alphabet Inc.",
    "META": "Meta Platforms Inc.", "MSFT": "Microsoft Corporation",
    "NVDA": "NVIDIA Corporation", "TSLA": "Tesla Inc.",
    # ── Technology: Semiconductors ──
    "AMAT": "Applied Materials Inc.", "AMD": "Advanced Micro Devices Inc.",
    "ARM": "Arm Holdings plc", "ASML": "ASML Holding NV",
    "AVGO": "Broadcom Inc.", "INTC": "Intel Corporation",
    "KLAC": "KLA Corporation", "LRCX": "Lam Research Corp.",
    "MRVL": "Marvell Technology Inc.", "MU": "Micron Technology Inc.",
    "QCOM": "Qualcomm Inc.", "SMCI": "Super Micro Computer Inc.",
    "TSM": "Taiwan Semiconductor",
    # ── Technology: Enterprise / Cloud / Cyber ──
    "ADBE": "Adobe Inc.", "CRM": "Salesforce Inc.",
    "CRWD": "CrowdStrike Holdings Inc.", "DDOG": "Datadog Inc.",
    "NET": "Cloudflare Inc.", "OKTA": "Okta Inc.",
    "ORCL": "Oracle Corporation", "PANW": "Palo Alto Networks Inc.",
    "PLTR": "Palantir Technologies Inc.", "SHOP": "Shopify Inc.",
    "SNOW": "Snowflake Inc.", "ZS": "Zscaler Inc.",
    # ── Technology: Fintech / Payments ──
    "AXP": "American Express Company", "COIN": "Coinbase Global Inc.",
    "MA": "Mastercard Inc.", "MSTR": "MicroStrategy Inc.",
    "PYPL": "PayPal Holdings Inc.", "SQ": "Block Inc.", "V": "Visa Inc.",
    # ── Consumer Discretionary ──
    "ABNB": "Airbnb Inc.", "BKNG": "Booking Holdings Inc.",
    "CMG": "Chipotle Mexican Grill Inc.", "COST": "Costco Wholesale Corp.",
    "DASH": "DoorDash Inc.", "HD": "The Home Depot Inc.",
    "LOW": "Lowe's Companies Inc.", "LULU": "Lululemon Athletica Inc.",
    "MAR": "Marriott International Inc.", "MCD": "McDonald's Corporation",
    "NKE": "Nike Inc.", "SBUX": "Starbucks Corp.",
    "TGT": "Target Corporation", "UBER": "Uber Technologies Inc.",
    "WMT": "Walmart Inc.", "YUM": "Yum! Brands Inc.",
    # ── Consumer Staples ──
    "KO": "The Coca-Cola Company", "PEP": "PepsiCo Inc.",
    "PG": "Procter & Gamble Co.",
    # ── Communication / Media ──
    "CHTR": "Charter Communications Inc.", "CMCSA": "Comcast Corporation",
    "DIS": "The Walt Disney Company", "NFLX": "Netflix Inc.",
    "PINS": "Pinterest Inc.", "SNAP": "Snap Inc.",
    "SPOT": "Spotify Technology SA", "TMUS": "T-Mobile US Inc.",
    # ── Telecom ──
    "T": "AT&T Inc.", "VZ": "Verizon Communications Inc.",
    # ── Financial Services ──
    "BAC": "Bank of America Corp.", "BLK": "BlackRock Inc.",
    "BRK-B": "Berkshire Hathaway Inc.", "C": "Citigroup Inc.",
    "CME": "CME Group Inc.", "GS": "Goldman Sachs Group Inc.",
    "ICE": "Intercontinental Exchange Inc.", "JPM": "JPMorgan Chase & Co.",
    "MCO": "Moody's Corporation", "MS": "Morgan Stanley",
    "PNC": "PNC Financial Services Group Inc.", "SCHW": "Charles Schwab Corp.",
    "SPGI": "S&P Global Inc.", "TFC": "Truist Financial Corp.",
    "UNH": "UnitedHealth Group Inc.", "USB": "U.S. Bancorp",
    "WFC": "Wells Fargo & Company",
    # ── Healthcare ──
    "ABBV": "AbbVie Inc.", "AMGN": "Amgen Inc.",
    "BDX": "Becton Dickinson and Co.", "BMY": "Bristol-Myers Squibb Co.",
    "DHR": "Danaher Corporation", "DXCM": "DexCom Inc.",
    "EW": "Edwards Lifesciences Corp.", "GILD": "Gilead Sciences Inc.",
    "IDXX": "IDEXX Laboratories Inc.", "ISRG": "Intuitive Surgical Inc.",
    "JNJ": "Johnson & Johnson", "LLY": "Eli Lilly and Company",
    "MDT": "Medtronic plc", "MRK": "Merck & Co. Inc.",
    "PFE": "Pfizer Inc.", "REGN": "Regeneron Pharmaceuticals Inc.",
    "SYK": "Stryker Corporation", "TMO": "Thermo Fisher Scientific Inc.",
    "VRTX": "Vertex Pharmaceuticals Inc.", "ZTS": "Zoetis Inc.",
    # ── Energy ──
    "COP": "ConocoPhillips", "CVX": "Chevron Corporation",
    "EOG": "EOG Resources Inc.", "OXY": "Occidental Petroleum Corp.",
    "PSX": "Phillips 66", "SLB": "Schlumberger Ltd.",
    "VLO": "Valero Energy Corporation", "XOM": "Exxon Mobil Corporation",
    # ── Industrials / Defense ──
    "BA": "The Boeing Company", "CAT": "Caterpillar Inc.",
    "DE": "Deere & Company", "EMR": "Emerson Electric Co.",
    "FDX": "FedEx Corporation", "GE": "GE Aerospace",
    "HON": "Honeywell International Inc.", "ITW": "Illinois Tool Works Inc.",
    "LMT": "Lockheed Martin Corp.", "MMM": "3M Company",
    "RTX": "RTX Corporation", "UNP": "Union Pacific Corp.",
    "UPS": "United Parcel Service Inc.",
    # ── Utilities ──
    "AEP": "American Electric Power Co.", "DUK": "Duke Energy Corporation",
    "NEE": "NextEra Energy Inc.", "SO": "The Southern Company",
    # ── Real Estate ──
    "AMT": "American Tower Corp.", "CCI": "Crown Castle Inc.",
    "EQIX": "Equinix Inc.", "PLD": "Prologis Inc.",
    # ── Materials ──
    "APD": "Air Products and Chemicals Inc.", "ECL": "Ecolab Inc.",
    "FCX": "Freeport-McMoRan Inc.", "LIN": "Linde plc",
    "NEM": "Newmont Corporation", "SHW": "Sherwin-Williams Co.",
    # ── Other / Growth ──
    "BABA": "Alibaba Group", "LCID": "Lucid Group Inc.",
    "NIO": "NIO Inc.", "RBLX": "Roblox Corporation",
    "RIVN": "Rivian Automotive Inc.", "SOFI": "SoFi Technologies Inc.",
    # ── ETFs ──
    "ARKK": "ARK Innovation ETF", "DIA": "SPDR Dow Jones ETF",
    "IWM": "iShares Russell 2000 ETF", "QQQ": "Invesco QQQ Trust",
    "SPY": "SPDR S&P 500 ETF",
}

_NASDAQ_TICKERS = {
    "AAPL", "ABNB", "ADBE", "AMGN", "AMZN", "AMD", "AMAT", "ARM", "ASML",
    "AVGO", "BABA", "BKNG", "CHTR", "CMCSA", "CMG", "COIN", "COST", "CRWD",
    "DASH", "DDOG", "DXCM", "EQIX", "GILD", "GOOGL", "IDXX", "INTC", "ISRG",
    "KLAC", "LCID", "LRCX", "LULU", "MAR", "META", "MRVL", "MSFT", "MSTR",
    "MU", "NET", "NFLX", "NIO", "NVDA", "OKTA", "ORCL", "PANW", "PEP",
    "PINS", "PLTR", "PYPL", "QCOM", "RBLX", "REGN", "RIVN", "SBUX", "SHOP",
    "SMCI", "SNAP", "SNOW", "SOFI", "SPOT", "SQ", "TMUS", "TSLA", "TSM",
    "UBER", "VRTX", "ZS",
}


# ---------------------------------------------------------------------------
# Helpers still needed for earnings functions (stay on yfinance directly)
# ---------------------------------------------------------------------------

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

_IS_VERCEL = os.environ.get("VERCEL") is not None


def _make_session() -> requests.Session:
    """Create a requests session with browser-like headers."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": _UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })
    return s


# On Vercel, use requests session for yfinance (earnings helpers)
_session = _make_session() if _IS_VERCEL else None


# ---------------------------------------------------------------------------
# Period mapping
# ---------------------------------------------------------------------------

_PERIOD_TRADING_DAYS = {"1y": 252, "2y": 504, "3y": 756, "5y": 1260, "10y": 2520}

_PERIOD_TO_YEARS = {"1y": 1, "2y": 2, "3y": 3, "5y": 5, "10y": 10}


# ===================================================================
# CRITICAL PATH — delegated to the configured DataProvider
# ===================================================================


def fetch_price_history(ticker: str, period: str = "10y") -> pd.DataFrame:
    """Fetch daily OHLCV data with cache-first strategy.

    1. Check SQLite cache (existing logic).
    2. On cache miss, call the configured provider.
    3. Save full result to cache.
    4. Trim to the requested period.
    """
    ticker = ticker.upper()
    max_days = _PERIOD_TRADING_DAYS.get(period, 2520)

    # Try cache first -- always trim to requested period
    cached = get_cached_prices(ticker)
    if cached is not None and len(cached) > 100:
        trimmed = cached.iloc[-max_days:] if len(cached) > max_days else cached
        if len(trimmed) >= 60:
            return trimmed

    # Fetch from provider (always request max for cache efficiency)
    provider = get_provider()
    years = _PERIOD_TO_YEARS.get(period, 10)

    # Try full range first, then progressively shorter
    df = pd.DataFrame()
    for attempt_years in [10, 5, 2, 1]:
        if attempt_years > years and years < 10:
            # Still fetch max when possible for caching
            pass
        try:
            df = provider.fetch_daily_history(ticker, years=attempt_years)
            if not df.empty:
                break
        except Exception:
            continue

    if df.empty:
        raise ValueError(f"No data found for ticker '{ticker}'")

    # Normalise columns
    cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in df.columns]
    df = df[cols].copy()

    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    # Save full data to cache
    save_prices(ticker, df)

    # Trim to requested period
    if len(df) > max_days:
        df = df.iloc[-max_days:]

    return df


def get_ticker_info(ticker: str) -> dict:
    """Get basic info about a ticker.

    Uses yfinance directly (supplementary data, not on the critical commercial
    path). A future iteration may move this to the provider as well.
    """
    try:
        kwargs = {"session": _session} if _session else {}
        stock = yf.Ticker(ticker.upper(), **kwargs)
        info = stock.info
        if info and info.get("longName") or info.get("shortName"):
            return {
                "ticker": ticker.upper(),
                "name": info.get("longName") or info.get("shortName", ticker.upper()),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "market_cap": info.get("marketCap", 0),
                "currency": info.get("currency", "USD"),
            }
    except Exception:
        pass

    return {
        "ticker": ticker.upper(),
        "name": ticker.upper(),
        "sector": "",
        "industry": "",
        "market_cap": 0,
        "currency": "USD",
    }


def fetch_quick_quote(ticker: str) -> dict | None:
    """Fetch quick quote data for a ticker -- delegated to provider."""
    provider = get_provider()
    return provider.fetch_quote(ticker)


def fetch_batch_quotes(tickers: list[str]) -> list[dict]:
    """Fetch quotes for multiple tickers -- delegated to provider."""
    provider = get_provider()
    return provider.fetch_batch_quotes(tickers)


def fetch_live_prices(tickers: list[str]) -> dict[str, dict]:
    """Fetch current prices for multiple tickers -- delegated to provider."""
    provider = get_provider()
    return provider.fetch_live_prices(tickers)


def search_tickers(query: str, limit: int = 10) -> list[dict]:
    """Search for tickers. Local DB first, then provider fallback."""
    q = query.upper().strip()
    if not q:
        return []

    # Local search: match ticker prefix OR company name substring
    local_results = []
    for ticker, name in TICKER_DB.items():
        if ticker.startswith(q) or q.lower() in name.lower():
            local_results.append({
                "ticker": ticker,
                "name": name,
                "exchange": "NASDAQ" if ticker in _NASDAQ_TICKERS else "NYSE",
                "type": "EQUITY",
            })

    # Sort: exact ticker prefix first, then alphabetical
    local_results.sort(key=lambda x: (0 if x["ticker"].startswith(q) else 1, x["ticker"]))

    if local_results:
        return local_results[:limit]

    # Fallback to provider search
    provider = get_provider()
    return provider.search_tickers(query, limit=limit)


# ===================================================================
# EARNINGS — stay on yfinance (supplementary, not commercially critical)
# ===================================================================


def fetch_earnings_dates(tickers: list[str]) -> list[dict]:
    """Fetch upcoming earnings dates for a list of tickers using yfinance calendar."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from datetime import datetime, timedelta

    def _get_earnings(ticker: str) -> dict | None:
        try:
            kwargs = {"session": _session} if _session else {}
            stock = yf.Ticker(ticker.upper(), **kwargs)
            cal = stock.calendar
            if cal is None or (isinstance(cal, pd.DataFrame) and cal.empty):
                return None

            if isinstance(cal, pd.DataFrame):
                if "Earnings Date" in cal.index:
                    raw_date = cal.loc["Earnings Date"].iloc[0]
                else:
                    return None
            elif isinstance(cal, dict):
                ed = cal.get("Earnings Date")
                if not ed:
                    return None
                raw_date = ed[0] if isinstance(ed, list) else ed
            else:
                return None

            if isinstance(raw_date, str):
                earnings_dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None)
            elif hasattr(raw_date, 'to_pydatetime'):
                earnings_dt = raw_date.to_pydatetime().replace(tzinfo=None)
            else:
                earnings_dt = datetime(raw_date.year, raw_date.month, raw_date.day)

            now = datetime.now()
            days_until = (earnings_dt.date() - now.date()).days

            hour = earnings_dt.hour if hasattr(earnings_dt, 'hour') else 0
            if hour < 12:
                time_of_day = "BMO"
            elif hour >= 16:
                time_of_day = "AMC"
            else:
                time_of_day = "TBD"

            return {
                "ticker": ticker.upper(),
                "name": TICKER_DB.get(ticker.upper(), ticker.upper()),
                "earnings_date": earnings_dt.strftime("%Y-%m-%d"),
                "days_until": days_until,
                "time_of_day": time_of_day,
            }
        except Exception:
            return None

    results = []
    with ThreadPoolExecutor(max_workers=min(len(tickers), 12)) as executor:
        futures = {executor.submit(_get_earnings, t): t for t in tickers}
        for future in as_completed(futures):
            try:
                r = future.result()
                if r:
                    results.append(r)
            except Exception:
                pass

    return results


def fetch_earnings_history(ticker: str, limit: int = 8) -> list[dict]:
    """Fetch past earnings with post-earnings price moves.

    Uses Yahoo Finance quoteSummary JSON API (via yfinance's authenticated
    session) for EPS data. Estimates actual announcement dates from quarter-end
    dates by finding the largest single-day price move in a ~20-65 day window.
    """
    from datetime import datetime, timedelta
    try:
        t = ticker.upper()
        stock = yf.Ticker(t)

        try:
            eh_df = stock.earnings_history
            if eh_df is not None and not eh_df.empty:
                entries = []
                for quarter_end in eh_df.index:
                    row = eh_df.loc[quarter_end]
                    entries.append({
                        "quarter_ts": quarter_end,
                        "epsEstimate": float(row["epsEstimate"]) if pd.notna(row["epsEstimate"]) else None,
                        "epsActual": float(row["epsActual"]) if pd.notna(row["epsActual"]) else None,
                        "surprisePercent": float(row["surprisePercent"]) if pd.notna(row["surprisePercent"]) else None,
                    })
            else:
                entries = []
        except Exception:
            try:
                qs_url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{t}"
                params = {"modules": "earningsHistory", "corsDomain": "finance.yahoo.com", "formatted": "false", "symbol": t}
                raw = stock._data.get_raw_json(qs_url, user_agent_headers=stock._data.user_agent_headers, params=params)
                if not raw:
                    return []
                history = raw.get("quoteSummary", {}).get("result", [{}])[0].get("earningsHistory", {}).get("history", [])
                entries = []
                for item in history:
                    q_epoch = item.get("quarter", {}).get("raw")
                    entries.append({
                        "quarter_ts": pd.Timestamp.utcfromtimestamp(q_epoch) if q_epoch else None,
                        "epsEstimate": item.get("epsEstimate", {}).get("raw"),
                        "epsActual": item.get("epsActual", {}).get("raw"),
                        "surprisePercent": item.get("surprisePercent", {}).get("raw"),
                    })
            except Exception:
                return []
        if not entries:
            return []

        df = fetch_price_history(ticker, period="3y")
        if df.empty:
            return []

        df_ret = df["Close"].pct_change().abs()
        results = []
        now = datetime.now()

        for entry in entries:
            try:
                qts = entry.get("quarter_ts")
                if qts is None:
                    continue
                qe = qts.to_pydatetime().replace(tzinfo=None) if hasattr(qts, "to_pydatetime") else qts

                search_start = pd.Timestamp(qe + timedelta(days=20))
                search_end = pd.Timestamp(qe + timedelta(days=65))
                if search_start > pd.Timestamp(now):
                    continue

                window_mask = (df.index >= search_start) & (df.index <= search_end)
                if window_mask.sum() < 2:
                    continue

                announce_idx = df_ret[window_mask].idxmax()
                announce_date_str = announce_idx.strftime("%Y-%m-%d")

                eps_est = entry.get("epsEstimate")
                eps_act = entry.get("epsActual")
                surp = entry.get("surprisePercent")

                eps_estimate = round(float(eps_est), 2) if eps_est is not None else None
                reported_eps = round(float(eps_act), 2) if eps_act is not None else None
                surprise_pct = round(float(surp) * 100, 2) if surp is not None else None

                post_df = df.loc[df.index >= announce_idx]
                if len(post_df) < 2:
                    continue
                close_at = post_df.iloc[0]["Close"]

                return_1w = None
                return_1m = None
                if len(post_df) > 5:
                    return_1w = round((post_df.iloc[5]["Close"] / close_at - 1) * 100, 2)
                if len(post_df) > 20:
                    return_1m = round((post_df.iloc[20]["Close"] / close_at - 1) * 100, 2)

                results.append({
                    "date": announce_date_str,
                    "eps_estimate": eps_estimate,
                    "reported_eps": reported_eps,
                    "surprise_pct": surprise_pct,
                    "return_1w": return_1w,
                    "return_1m": return_1m,
                    "time_of_day": "TBD",
                })

                if len(results) >= limit:
                    break
            except Exception:
                continue

        return results
    except Exception:
        return []
