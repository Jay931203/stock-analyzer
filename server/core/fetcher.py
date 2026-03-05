"""Smart data fetcher with yfinance + SQLite caching + Yahoo direct fallback."""

import os
import time
from typing import Optional

import pandas as pd
import requests
import yfinance as yf

from .cache import get_cached_prices, save_prices


_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

_IS_VERCEL = os.environ.get("VERCEL") is not None

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


def _make_session() -> requests.Session:
    """Create a requests session with browser-like headers."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": _UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })
    return s


# On Vercel, use requests session for yfinance
_session = _make_session() if _IS_VERCEL else None

# Cache crumb for direct Yahoo API
_crumb_cache: dict = {"crumb": None, "cookies": None, "ts": 0}


def _get_yahoo_crumb(session: requests.Session) -> tuple[str, dict]:
    """Get Yahoo Finance crumb + cookies for authenticated API calls."""
    now = time.time()
    if _crumb_cache["crumb"] and now - _crumb_cache["ts"] < 3600:
        return _crumb_cache["crumb"], _crumb_cache["cookies"]

    # Step 1: Get consent cookies from fc.yahoo.com
    session.get("https://fc.yahoo.com", timeout=10)

    # Step 2: Get crumb
    resp = session.get(
        "https://query2.finance.yahoo.com/v1/test/getcrumb",
        timeout=10,
    )
    crumb = resp.text.strip()
    cookies = dict(session.cookies)

    _crumb_cache.update({"crumb": crumb, "cookies": cookies, "ts": now})
    return crumb, cookies


def _yahoo_direct_history(ticker: str, period: str = "10y") -> pd.DataFrame:
    """Fetch price history directly from Yahoo Finance v8 chart API (fallback)."""
    session = _make_session()

    try:
        crumb, cookies = _get_yahoo_crumb(session)
    except Exception:
        crumb, cookies = "", {}

    # Map period string to Yahoo range
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

    df = pd.DataFrame({
        "Open": quote.get("open", []),
        "High": quote.get("high", []),
        "Low": quote.get("low", []),
        "Close": quote.get("close", []),
        "Volume": quote.get("volume", []),
    }, index=pd.to_datetime(timestamps, unit="s"))

    df.index.name = "Date"
    df = df.dropna(subset=["Close"])
    return df


def _yahoo_direct_quote(ticker: str) -> dict | None:
    """Fetch quote info directly from Yahoo Finance v8 API."""
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

    # Use pre/post market price when available
    market_state = meta.get("marketState", "REGULAR")
    if market_state == "PRE" and meta.get("preMarketPrice"):
        close = meta["preMarketPrice"]
    elif market_state in ("POST", "POSTPOST") and meta.get("postMarketPrice"):
        close = meta["postMarketPrice"]
    else:
        close = meta.get("regularMarketPrice") or reg_close

    change = close - prev_close
    change_pct = (change / prev_close * 100) if prev_close else 0

    week_start = closes[-5] if len(closes) >= 5 else closes[0]
    week_return = ((close - week_start) / week_start * 100) if week_start else 0

    month_start = closes[0]
    month_return = ((close - month_start) / month_start * 100) if month_start else 0

    vol = volumes[-1] if volumes else 0

    return {
        "ticker": ticker.upper(),
        "name": meta.get("longName") or meta.get("shortName") or ticker.upper(),
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


def fetch_price_history(ticker: str, period: str = "10y") -> pd.DataFrame:
    """
    Fetch daily OHLCV data. Uses cache if fresh, otherwise fetches from yfinance.
    Falls back to direct Yahoo API on cloud environments.
    """
    ticker = ticker.upper()

    # Try cache first
    cached = get_cached_prices(ticker)
    if cached is not None and len(cached) > 500:
        return cached

    # Try yfinance first
    df = pd.DataFrame()
    try:
        kwargs = {"session": _session} if _session else {}
        stock = yf.Ticker(ticker, **kwargs)
        df = stock.history(period=period, interval="1d")

        # Retry with shorter period if 10y fails
        if df.empty and period == "10y":
            for fallback in ["5y", "2y", "1y"]:
                df = stock.history(period=fallback, interval="1d")
                if not df.empty:
                    break
    except Exception:
        pass

    # Fallback: direct Yahoo API (useful on Vercel/cloud)
    if df.empty:
        df = _yahoo_direct_history(ticker, period)
        if df.empty and period == "10y":
            for fallback in ["5y", "2y", "1y"]:
                df = _yahoo_direct_history(ticker, fallback)
                if not df.empty:
                    break

    if df.empty:
        raise ValueError(f"No data found for ticker '{ticker}'")

    # Keep only needed columns
    cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in df.columns]
    df = df[cols].copy()

    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    # Save to cache
    save_prices(ticker, df)

    return df


def get_ticker_info(ticker: str) -> dict:
    """Get basic info about a ticker."""
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

    # Fallback: basic info from direct API
    return {
        "ticker": ticker.upper(),
        "name": ticker.upper(),
        "sector": "",
        "industry": "",
        "market_cap": 0,
        "currency": "USD",
    }


def fetch_quick_quote(ticker: str) -> dict | None:
    """Fetch quick quote data for a ticker (price, change, volume, market cap)."""
    try:
        kwargs = {"session": _session} if _session else {}
        stock = yf.Ticker(ticker.upper(), **kwargs)
        info = stock.info
        hist = stock.history(period="1mo", interval="1d")

        if not hist.empty:
            reg_close = float(hist["Close"].iloc[-1])
            prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else reg_close

            # Use pre/post market price when available
            market_state = info.get("marketState", "REGULAR")
            if market_state == "PRE" and info.get("preMarketPrice"):
                close = float(info["preMarketPrice"])
            elif market_state in ("POST", "POSTPOST") and info.get("postMarketPrice"):
                close = float(info["postMarketPrice"])
            else:
                close = float(info.get("regularMarketPrice") or reg_close)

            change = close - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0

            week_start = float(hist["Close"].iloc[-5]) if len(hist) >= 5 else float(hist["Close"].iloc[0])
            week_return = ((close - week_start) / week_start * 100) if week_start else 0

            month_start = float(hist["Close"].iloc[0])
            month_return = ((close - month_start) / month_start * 100) if month_start else 0

            vol = float(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0

            return {
                "ticker": ticker.upper(),
                "name": info.get("longName") or info.get("shortName", ticker.upper()),
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

    # Fallback: direct Yahoo API
    return _yahoo_direct_quote(ticker)


def fetch_batch_quotes(tickers: list[str]) -> list[dict]:
    """Fetch quick quotes for multiple tickers concurrently."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = []
    with ThreadPoolExecutor(max_workers=min(len(tickers), 8)) as executor:
        futures = {executor.submit(fetch_quick_quote, t): t for t in tickers}
        for future in as_completed(futures):
            try:
                q = future.result()
                if q:
                    results.append(q)
            except Exception:
                pass
    return results


def fetch_live_prices(tickers: list[str]) -> dict[str, dict]:
    """Fetch current prices for multiple tickers via Yahoo v7 quote API.
    Returns pre-market or post-market prices when available.
    Single HTTP call for all tickers - very efficient.
    """
    if not tickers:
        return {}

    session = _make_session()
    try:
        crumb, cookies = _get_yahoo_crumb(session)
    except Exception:
        crumb, cookies = "", {}

    symbols = ",".join(t.upper() for t in tickers)
    url = "https://query2.finance.yahoo.com/v7/finance/quote"
    params = {"symbols": symbols}
    if crumb:
        params["crumb"] = crumb

    try:
        resp = session.get(url, params=params, cookies=cookies, timeout=15)
        data = resp.json()
    except Exception:
        return {}

    results = {}
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
        elif market_state in ("POST", "POSTPOST") and q.get("postMarketPrice"):
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

            # calendar can be a dict or DataFrame depending on yfinance version
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

            # Parse earnings date
            if isinstance(raw_date, str):
                earnings_dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None)
            elif hasattr(raw_date, 'to_pydatetime'):
                earnings_dt = raw_date.to_pydatetime().replace(tzinfo=None)
            else:
                earnings_dt = datetime(raw_date.year, raw_date.month, raw_date.day)

            now = datetime.now()
            days_until = (earnings_dt.date() - now.date()).days

            # Determine time of day (BMO = before market open, AMC = after market close)
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
                "earnings_date": earnings_dt.strftime("%m/%d"),
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


def search_tickers(query: str, limit: int = 10) -> list[dict]:
    """Search for tickers matching a query. Uses local DB first, yfinance as fallback."""
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

    # Fallback to yfinance for tickers not in local DB
    try:
        results = yf.search(query, max_results=limit)
        if not results or "quotes" not in results:
            return []
        return [
            {
                "ticker": q_item.get("symbol", ""),
                "name": q_item.get("longname") or q_item.get("shortname", ""),
                "exchange": q_item.get("exchange", ""),
                "type": q_item.get("quoteType", ""),
            }
            for q_item in results["quotes"]
            if q_item.get("symbol")
        ][:limit]
    except Exception:
        return []
