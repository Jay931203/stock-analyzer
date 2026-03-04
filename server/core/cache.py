"""SQLite cache manager for price history and analysis results."""

import json
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import os

import pandas as pd

# Vercel serverless: use /tmp (ephemeral but writable)
if os.environ.get("VERCEL"):
    DB_PATH = Path("/tmp/cache.db")
else:
    DB_PATH = Path(__file__).parent.parent / "data" / "cache.db"


def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS price_history (
            ticker TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            PRIMARY KEY (ticker, date)
        );
        CREATE INDEX IF NOT EXISTS idx_price_ticker_date
            ON price_history(ticker, date);

        CREATE TABLE IF NOT EXISTS analysis_cache (
            ticker TEXT NOT NULL,
            cache_key TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at REAL NOT NULL,
            ttl_seconds INTEGER NOT NULL DEFAULT 300,
            PRIMARY KEY (ticker, cache_key)
        );
    """)
    conn.commit()
    conn.close()


def _is_market_hours() -> bool:
    """Check if US market is currently open (rough EST check)."""
    from datetime import timezone

    now_utc = datetime.now(timezone.utc)
    est_hour = (now_utc.hour - 5) % 24  # rough EST offset
    weekday = now_utc.weekday()
    return weekday < 5 and 9 <= est_hour < 16


def get_cached_prices(ticker: str) -> Optional[pd.DataFrame]:
    """Return cached price data if fresh enough."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT date, open, high, low, close, volume FROM price_history "
        "WHERE ticker = ? ORDER BY date",
        (ticker.upper(),),
    ).fetchall()
    conn.close()

    if not rows:
        return None

    df = pd.DataFrame(rows, columns=["Date", "Open", "High", "Low", "Close", "Volume"])
    df["Date"] = pd.to_datetime(df["Date"])
    df.set_index("Date", inplace=True)

    last_date = df.index.max().date()
    today = datetime.now().date()

    # If data includes today (or yesterday if market closed), it's fresh
    if last_date >= today - timedelta(days=1):
        return df
    return None


def save_prices(ticker: str, df: pd.DataFrame) -> None:
    """Save price data to cache."""
    conn = _get_conn()
    ticker = ticker.upper()

    # Delete old data for this ticker and reinsert
    conn.execute("DELETE FROM price_history WHERE ticker = ?", (ticker,))

    records = []
    for date_idx, row in df.iterrows():
        date_str = date_idx.strftime("%Y-%m-%d") if hasattr(date_idx, "strftime") else str(date_idx)
        records.append((
            ticker, date_str,
            float(row["Open"]), float(row["High"]),
            float(row["Low"]), float(row["Close"]),
            int(row["Volume"]),
        ))

    conn.executemany(
        "INSERT OR REPLACE INTO price_history (ticker, date, open, high, low, close, volume) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        records,
    )
    conn.commit()
    conn.close()


def get_cached_analysis(ticker: str, cache_key: str) -> Optional[dict]:
    """Return cached analysis result if not expired."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT result_json, created_at, ttl_seconds FROM analysis_cache "
        "WHERE ticker = ? AND cache_key = ?",
        (ticker.upper(), cache_key),
    ).fetchone()
    conn.close()

    if not row:
        return None

    result_json, created_at, ttl = row
    if time.time() - created_at > ttl:
        return None

    return json.loads(result_json)


def save_analysis(ticker: str, cache_key: str, result: dict, ttl: int = 300) -> None:
    """Save analysis result with TTL."""
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO analysis_cache (ticker, cache_key, result_json, created_at, ttl_seconds) "
        "VALUES (?, ?, ?, ?, ?)",
        (ticker.upper(), cache_key, json.dumps(result), time.time(), ttl),
    )
    conn.commit()
    conn.close()


# Initialize DB on import
init_db()
