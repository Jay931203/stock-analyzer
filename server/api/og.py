"""OG Image generation and social sharing endpoints."""

import html
import re

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, Response

from ..core.analyzer import compute_all_indicators, get_indicator_state
from ..core.backtester import calc_combined_probability
from ..core.fetcher import fetch_price_history
from .constants import POPULAR_TICKERS, TICKER_NAMES

# Router for /api/og/{ticker} (included with /api prefix in main.py)
og_image_router = APIRouter()
# Router for /share/{ticker} (included without prefix in main.py)
share_router = APIRouter()

# Friendly labels for indicator states
_FRIENDLY_LABELS = {
    "golden_cross": "Golden Cross",
    "dead_cross": "Dead Cross",
    "positive": "Positive",
    "negative": "Negative",
    "bullish": "Bullish",
    "bearish": "Bearish",
    "neutral": "Neutral",
    "none": "",
    "above_upper": "Above Upper Band",
    "upper_quarter": "Upper Band",
    "mid_upper": "Mid-Upper",
    "mid_lower": "Mid-Lower",
    "lower_quarter": "Lower Band",
    "below_lower": "Below Lower Band",
    "very_high": "Very High Vol",
    "high": "High Vol",
    "normal": "Normal Vol",
    "low": "Low Vol",
    "very_low": "Very Low Vol",
}


def _escape_svg(text: str) -> str:
    """Escape text for safe SVG XML embedding."""
    return html.escape(str(text), quote=True)


def _build_conditions(states: dict) -> list[dict]:
    """Build conditions list from indicator states for combined probability."""
    conditions = []
    if "rsi_bin" in states:
        conditions.append({"indicator": "rsi", "state": states["rsi_bin"]})
    if states.get("macd_event"):
        conditions.append({"indicator": "macd_event", "state": states["macd_event"]})
    if states.get("ma_alignment") and states["ma_alignment"] != "none":
        conditions.append({"indicator": "ma_alignment", "state": states["ma_alignment"]})
    if states.get("bb_zone"):
        conditions.append({"indicator": "bb_zone", "state": states["bb_zone"]})
    if states.get("volume_level") and states["volume_level"] != "normal":
        conditions.append({"indicator": "volume_level", "state": states["volume_level"]})
    if states.get("drawdown_60d"):
        conditions.append({"indicator": "drawdown_60d", "state": states["drawdown_60d"]})
    if states.get("adx_trend"):
        conditions.append({"indicator": "adx_trend", "state": states["adx_trend"]})
    return conditions


def _generate_og_svg(
    ticker: str,
    name: str,
    current_price: float,
    change_pct: float,
    win_rate: float,
    occurrences: int,
    direction: str,
    highlights: list[str],
) -> str:
    """Generate an SVG image card for OG sharing."""
    ticker_esc = _escape_svg(ticker)
    name_esc = _escape_svg(name[:40])
    highlight_text = _escape_svg(" \u00b7 ".join(highlights[:3])) if highlights else "Neutral"

    # Direction-based colors
    if direction == "bullish":
        accent = "#22C55E"
    elif direction == "bearish":
        accent = "#EF4444"
    else:
        accent = "#6366F1"

    price_color = "#22C55E" if change_pct >= 0 else "#EF4444"
    change_sign = "+" if change_pct >= 0 else ""

    # Bar width for win rate (0-100% mapped to 0-480px)
    bar_width = max(0, min(100, win_rate)) * 4.8

    # Price text -- compute a rough x offset for change text
    price_text = f"${current_price:,.2f}"
    price_text_esc = _escape_svg(price_text)
    change_text = f" {change_sign}{change_pct:.1f}%"
    change_text_esc = _escape_svg(change_text)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315">
  <defs>
    <style>
      text {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    </style>
  </defs>

  <!-- Background -->
  <rect width="600" height="315" fill="#0a0a0f"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="600" height="3" fill="{accent}"/>

  <!-- Ticker -->
  <text x="32" y="52" font-size="28" font-weight="800" fill="{accent}">{ticker_esc}</text>
  <!-- Company name -->
  <text x="32" y="78" font-size="14" fill="#9CA3AF">{name_esc}</text>

  <!-- Price + Change -->
  <text x="32" y="118" font-size="32" font-weight="700" fill="#F9FAFB">{price_text_esc}</text>
  <text x="568" y="118" font-size="18" font-weight="600" fill="{price_color}" text-anchor="end">{change_text_esc}</text>

  <!-- Divider -->
  <rect x="32" y="135" width="536" height="1" fill="#1F2937"/>

  <!-- Win Rate Label -->
  <text x="32" y="170" font-size="13" font-weight="600" fill="#9CA3AF">COMBINED WIN RATE (1M)</text>

  <!-- Win rate bar background -->
  <rect x="32" y="182" width="480" height="24" rx="6" fill="#1F2937"/>
  <!-- Win rate bar fill -->
  <rect x="32" y="182" width="{bar_width:.0f}" height="24" rx="6" fill="{accent}" opacity="0.85"/>
  <!-- 50% center marker -->
  <rect x="272" y="182" width="1" height="24" fill="#4B5563" opacity="0.5"/>
  <!-- Win rate percentage -->
  <text x="520" y="200" font-size="18" font-weight="800" fill="{accent}" text-anchor="end">{win_rate:.0f}%</text>

  <!-- Occurrences -->
  <text x="32" y="232" font-size="13" fill="#6B7280">Based on {occurrences} similar historical patterns</text>

  <!-- Indicators label -->
  <text x="32" y="262" font-size="13" font-weight="600" fill="#9CA3AF">ACTIVE SIGNALS</text>
  <text x="32" y="284" font-size="15" fill="#D1D5DB">{highlight_text}</text>

  <!-- Footer -->
  <rect x="0" y="300" width="600" height="15" fill="#111118"/>
  <text x="300" y="311" font-size="9" fill="#4B5563" text-anchor="middle">Stock Scanner - Data-driven probability analysis</text>
</svg>'''
    return svg


def _generate_fallback_svg(ticker: str) -> str:
    """Generate a simple fallback SVG when data fetching fails."""
    ticker_esc = _escape_svg(ticker)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315">
  <defs>
    <style>
      text {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    </style>
  </defs>
  <rect width="600" height="315" fill="#0a0a0f"/>
  <rect x="0" y="0" width="600" height="3" fill="#6366F1"/>
  <text x="300" y="130" font-size="42" font-weight="800" fill="#6366F1" text-anchor="middle">{ticker_esc}</text>
  <text x="300" y="170" font-size="16" fill="#9CA3AF" text-anchor="middle">Stock Scanner</text>
  <text x="300" y="195" font-size="14" fill="#6B7280" text-anchor="middle">Data-driven probability analysis</text>
</svg>'''


@og_image_router.get("/og/{ticker}")
async def og_image(ticker: str):
    """Generate an SVG OG image card for a stock ticker."""
    ticker = ticker.upper().strip()

    # Validate ticker format (letters only, 1-5 chars, allow dash for BRK-B)
    if not re.match(r"^[A-Z]{1,5}(-[A-Z])?$", ticker):
        return Response(
            content=_generate_fallback_svg(ticker[:6]),
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=60"},
        )

    name = TICKER_NAMES.get(ticker, ticker)

    try:
        df = fetch_price_history(ticker, period="3y")
        indicators = compute_all_indicators(df)
        states = get_indicator_state(indicators)

        # Current price and daily change
        current_price = float(df["Close"].iloc[-1])
        prev_price = float(df["Close"].iloc[-2]) if len(df) > 1 else current_price
        change_pct = ((current_price - prev_price) / prev_price) * 100

        # Compute combined probability
        conditions = _build_conditions(states)
        win_rate = 50.0
        occurrences = 0
        direction = "neutral"

        try:
            if len(conditions) >= 2:
                prob_result = calc_combined_probability(df, conditions)
                if prob_result and prob_result.periods:
                    # Prefer 20-day (1 month) period, fallback to others
                    for period_key in [20, 10, 5]:
                        p = prob_result.periods.get(period_key)
                        if p and p.get("samples", 0) > 0:
                            win_rate = p.get("win_rate", 50)
                            break
                    occurrences = prob_result.occurrences
                    direction = (
                        "bullish" if win_rate >= 55
                        else "bearish" if win_rate < 45
                        else "neutral"
                    )
        except Exception:
            pass

        # Build highlight text from key indicators
        highlights = []

        rsi_val = indicators.get("rsi", {}).get("value")
        if rsi_val is not None:
            highlights.append(f"RSI {rsi_val:.0f}")

        macd_event = states.get("macd_event", "")
        if macd_event and macd_event not in ("none", ""):
            label = _FRIENDLY_LABELS.get(macd_event, macd_event)
            if label:
                highlights.append(f"MACD {label}")

        ma_align = states.get("ma_alignment", "")
        if ma_align and ma_align not in ("neutral", "none", ""):
            label = _FRIENDLY_LABELS.get(ma_align, ma_align)
            if label:
                highlights.append(f"MA {label}")

        bb_zone = states.get("bb_zone", "")
        if bb_zone and bb_zone not in ("mid_upper", "mid_lower", ""):
            label = _FRIENDLY_LABELS.get(bb_zone, bb_zone)
            if label:
                highlights.append(f"BB {label}")

        svg = _generate_og_svg(
            ticker=ticker,
            name=name,
            current_price=current_price,
            change_pct=change_pct,
            win_rate=win_rate,
            occurrences=occurrences,
            direction=direction,
            highlights=highlights,
        )

        return Response(
            content=svg,
            media_type="image/svg+xml",
            headers={
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
        )

    except Exception:
        return Response(
            content=_generate_fallback_svg(ticker),
            media_type="image/svg+xml",
            headers={
                "Cache-Control": "public, max-age=300",
            },
        )


@share_router.get("/share/{ticker}", response_class=HTMLResponse)
async def share_page(ticker: str, request: Request):
    """
    Serve OG meta tags for social media crawlers.
    Real users get redirected to the analyze page.

    Note: This endpoint serves both bots and real users.
    Social bots get the full HTML with meta tags (they don't follow redirects
    for meta scraping). Real users see a brief loading page that redirects
    via JS. This avoids the need for user-agent detection which can be fragile.
    """
    ticker = ticker.upper().strip()
    if not re.match(r"^[A-Z]{1,5}(-[A-Z])?$", ticker):
        ticker = "STOCK"

    # Build absolute base URL for OG tags (social crawlers need absolute URLs)
    host = request.headers.get("host", "")
    scheme = request.headers.get("x-forwarded-proto", "https")
    base_url = f"{scheme}://{host}" if host else ""

    ticker_esc = _escape_svg(ticker)
    name = TICKER_NAMES.get(ticker, ticker)
    name_esc = _escape_svg(name)

    og_image_url = f"{base_url}/api/og/{ticker_esc}"
    share_url = f"{base_url}/share/{ticker_esc}"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{ticker_esc} Analysis - Stock Scanner</title>

<!-- Open Graph -->
<meta property="og:title" content="{ticker_esc} - Stock Probability Analysis">
<meta property="og:description" content="See the historical win rate and probability analysis for {ticker_esc} ({name_esc}) based on 10+ technical indicators.">
<meta property="og:image" content="{og_image_url}">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="315">
<meta property="og:url" content="{share_url}">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ticker_esc} - Stock Probability Analysis">
<meta name="twitter:description" content="Data-driven probability analysis for {ticker_esc} ({name_esc})">
<meta name="twitter:image" content="{og_image_url}">

<!-- Redirect real users to the app -->
<meta http-equiv="refresh" content="0;url=/analyze/{ticker_esc}">
<script>window.location.replace("/analyze/{ticker_esc}");</script>

<style>
  body {{
    margin: 0;
    background: #0a0a0f;
    color: #9CA3AF;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }}
  .loading {{ text-align: center; }}
  .loading h1 {{ color: #6366F1; font-size: 2rem; margin-bottom: 0.5rem; }}
  .loading p {{ font-size: 1rem; }}
</style>
</head>
<body>
  <div class="loading">
    <h1>{ticker_esc}</h1>
    <p>Loading analysis...</p>
  </div>
</body>
</html>"""

    return HTMLResponse(
        content=html_content,
        headers={
            "Cache-Control": "public, max-age=3600",
        },
    )


@share_router.get("/s/{ticker}", response_class=HTMLResponse)
async def share_page_short(ticker: str, request: Request):
    """Short URL redirect for sharing — serves the same OG page as /share/{ticker}."""
    return await share_page(ticker, request)


@share_router.get("/sitemap.xml")
async def sitemap(request: Request):
    """Generate a basic sitemap.xml for SEO."""
    host = request.headers.get("host", "")
    scheme = request.headers.get("x-forwarded-proto", "https")
    base_url = f"{scheme}://{host}" if host else ""

    urls = []
    # Home page
    urls.append(f"  <url><loc>{base_url}/</loc><priority>1.0</priority></url>")
    # Share pages for all tracked tickers
    for ticker in POPULAR_TICKERS:
        urls.append(
            f"  <url><loc>{base_url}/share/{ticker}</loc>"
            f"<changefreq>daily</changefreq><priority>0.7</priority></url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )

    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )
