# Stock Analyzer - Roadmap

## Current (v1.0)
- 12 technical indicators with historical probability backtesting
- Adaptive similarity matching (smart combined analysis)
- 10-year data, 6 forward periods (5D ~ 1Y)
- React Native mobile app + Vercel web deployment

## Phase 2: Macro & Qualitative Indicators

### 2-1. Interest Rate / Fed (FRED API - free)
- Fed Funds Rate level & direction
- FOMC meeting dates → probability shift before/after meetings
- "When Fed raised rates AND RSI < 30, what happened?"
- Data source: `fredapi` (St. Louis Fed, free API key)

### 2-2. Market Sentiment
- **VIX** (Fear Index) - available via yfinance (`^VIX`)
- **Fear & Greed Index** - CNN Money API
- **Put/Call Ratio** - CBOE data
- Combine: "When VIX > 30 AND stock RSI < 30 → recovery probability?"

### 2-3. Economic Data (FRED API)
- CPI (inflation) month-over-month
- Unemployment rate
- GDP growth
- 10Y-2Y Treasury spread (yield curve inversion → recession signal)
- "During yield curve inversion, how did AAPL perform?"

### 2-4. Earnings & Events
- Earnings date proximity (yfinance has `earnings_dates`)
- Pre/post earnings drift analysis
- "RSI > 70 within 5 days of earnings → probability?"

### 2-5. Geopolitical / News Sentiment (harder)
- News sentiment via API (NewsAPI, Alpha Vantage news)
- NLP scoring of headlines (positive/negative/neutral)
- War/crisis detection would need curated event database
- **Complexity: HIGH** - requires LLM or pre-built sentiment model

### 2-6. Sector & Market Regime
- S&P 500 regime (bull/bear/sideways) via SMA200 on `^GSPC`
- Sector rotation detection
- Correlation with sector ETFs (XLK, XLF, XLE...)
- "In bear market regime, how does this stock's RSI signal perform?"

## Priority Order
1. VIX + S&P regime (easy, yfinance only)
2. Fed rate + yield curve (FRED API, free)
3. Earnings proximity (yfinance)
4. CPI/GDP macro data (FRED API)
5. News sentiment (requires API subscription + NLP)
6. Geopolitical events (requires curated database)

## Phase 3: Social & Alternative Data
- Reddit/Twitter sentiment
- Options flow (unusual activity)
- Insider trading signals (SEC filings)
- Short interest data
