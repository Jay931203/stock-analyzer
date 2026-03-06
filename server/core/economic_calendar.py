"""US economic calendar - hardcoded key events (FOMC, CPI, PPI, PMI).
Updated annually. Last update: 2025/2026 schedules.
"""

from datetime import date, datetime

# Source: federalreserve.gov/monetarypolicy/fomccalendars.htm
# FOMC meeting end dates (rate decision announced on these dates)
FOMC_2025 = [
    date(2025, 1, 29), date(2025, 3, 19), date(2025, 5, 7),
    date(2025, 6, 18), date(2025, 7, 30), date(2025, 9, 17),
    date(2025, 10, 29), date(2025, 12, 17),
]

FOMC_2026 = [
    date(2026, 1, 28), date(2026, 3, 18), date(2026, 4, 29),
    date(2026, 6, 17), date(2026, 7, 29), date(2026, 9, 16),
    date(2026, 10, 28), date(2026, 12, 16),
]

# Source: bls.gov/schedule/news_release
# CPI release dates (usually 2nd or 3rd week of the month, 8:30 AM ET)
CPI_2025 = [
    date(2025, 1, 15), date(2025, 2, 12), date(2025, 3, 12),
    date(2025, 4, 10), date(2025, 5, 13), date(2025, 6, 11),
    date(2025, 7, 15), date(2025, 8, 12), date(2025, 9, 10),
    date(2025, 10, 14), date(2025, 11, 12), date(2025, 12, 10),
]

CPI_2026 = [
    date(2026, 1, 14), date(2026, 2, 11), date(2026, 3, 11),
    date(2026, 4, 14), date(2026, 5, 12), date(2026, 6, 10),
    date(2026, 7, 14), date(2026, 8, 12), date(2026, 9, 16),
    date(2026, 10, 13), date(2026, 11, 12), date(2026, 12, 10),
]

# PPI release dates (usually day after or same week as CPI)
PPI_2025 = [
    date(2025, 1, 14), date(2025, 2, 13), date(2025, 3, 13),
    date(2025, 4, 11), date(2025, 5, 15), date(2025, 6, 12),
    date(2025, 7, 15), date(2025, 8, 14), date(2025, 9, 11),
    date(2025, 10, 15), date(2025, 11, 13), date(2025, 12, 11),
]

PPI_2026 = [
    date(2026, 1, 15), date(2026, 2, 12), date(2026, 3, 12),
    date(2026, 4, 15), date(2026, 5, 14), date(2026, 6, 11),
    date(2026, 7, 16), date(2026, 8, 13), date(2026, 9, 15),
    date(2026, 10, 15), date(2026, 11, 13), date(2026, 12, 11),
]

# ISM Manufacturing PMI (usually 1st business day of the month)
PMI_2025 = [
    date(2025, 1, 3), date(2025, 2, 3), date(2025, 3, 3),
    date(2025, 4, 1), date(2025, 5, 1), date(2025, 6, 2),
    date(2025, 7, 1), date(2025, 8, 1), date(2025, 9, 2),
    date(2025, 10, 1), date(2025, 11, 3), date(2025, 12, 1),
]

PMI_2026 = [
    date(2026, 1, 5), date(2026, 2, 2), date(2026, 3, 2),
    date(2026, 4, 1), date(2026, 5, 1), date(2026, 6, 1),
    date(2026, 7, 1), date(2026, 8, 3), date(2026, 9, 1),
    date(2026, 10, 1), date(2026, 11, 2), date(2026, 12, 1),
]

# Jobs Report / Non-Farm Payrolls (1st Friday of the month)
NFP_2025 = [
    date(2025, 1, 10), date(2025, 2, 7), date(2025, 3, 7),
    date(2025, 4, 4), date(2025, 5, 2), date(2025, 6, 6),
    date(2025, 7, 3), date(2025, 8, 1), date(2025, 9, 5),
    date(2025, 10, 3), date(2025, 11, 7), date(2025, 12, 5),
]

NFP_2026 = [
    date(2026, 1, 9), date(2026, 2, 6), date(2026, 3, 6),
    date(2026, 4, 3), date(2026, 5, 1), date(2026, 6, 5),
    date(2026, 7, 2), date(2026, 8, 7), date(2026, 9, 4),
    date(2026, 10, 2), date(2026, 11, 6), date(2026, 12, 4),
]


# Historical market impact data (average S&P500 move on event day, based on 2020-2024 data)
EVENT_STATS = {
    "FOMC": {"avg_move": 1.2, "bullish_pct": 55, "desc": "Fed rate decision. Current rate: 4.25-4.50%. Next expected action: Hold. Dot plot signals 2 cuts in 2026."},
    "CPI": {"avg_move": 0.9, "bullish_pct": 48, "desc": "Consumer Price Index. Last: 2.8% YoY. Core CPI: 3.1%. Below consensus = bullish (rate cut hope)."},
    "PPI": {"avg_move": 0.5, "bullish_pct": 50, "desc": "Producer Price Index. Last: 3.2% YoY. Leading indicator for CPI. Rising PPI = inflation pressure."},
    "PMI": {"avg_move": 0.4, "bullish_pct": 52, "desc": "ISM Manufacturing PMI. Last: 50.3. Above 50 = expansion. Key sub-indices: New Orders, Employment."},
    "NFP": {"avg_move": 0.8, "bullish_pct": 54, "desc": "Non-Farm Payrolls. Last: +256K. Unemployment: 4.1%. Goldilocks (moderate growth) = most bullish."},
}


def _build_events(dates: list[date], event_type: str, base_label: str, impact: str) -> list[dict]:
    stats = EVENT_STATS.get(event_type, {})
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    events = []
    for d in dates:
        label = base_label
        # CPI/PPI: data is for the prior month
        if event_type in ("CPI", "PPI"):
            prev_month = d.month - 1 if d.month > 1 else 12
            label = f"{base_label} ({month_names[prev_month - 1]})"
        events.append({
            "date": d.isoformat(),
            "type": event_type,
            "label": label,
            "impact": impact,
            "avg_move": stats.get("avg_move", 0),
            "bullish_pct": stats.get("bullish_pct", 50),
            "desc": stats.get("desc", ""),
        })
    return events


def get_economic_events(days_ahead: int = 30) -> list[dict]:
    """Get upcoming economic events within the next N days."""
    today = date.today()
    all_events = []

    # FOMC
    all_events += _build_events(FOMC_2025 + FOMC_2026, "FOMC", "FOMC Rate Decision", "high")
    # CPI
    all_events += _build_events(CPI_2025 + CPI_2026, "CPI", "CPI Report", "high")
    # PPI
    all_events += _build_events(PPI_2025 + PPI_2026, "PPI", "PPI Report", "medium")
    # PMI
    all_events += _build_events(PMI_2025 + PMI_2026, "PMI", "ISM Manufacturing PMI", "medium")
    # NFP
    all_events += _build_events(NFP_2025 + NFP_2026, "NFP", "Jobs Report (NFP)", "high")

    # Filter to upcoming only
    upcoming = []
    for ev in all_events:
        ev_date = date.fromisoformat(ev["date"])
        delta = (ev_date - today).days
        if -1 <= delta <= days_ahead:  # include yesterday for "just happened"
            ev["days_until"] = delta
            upcoming.append(ev)

    upcoming.sort(key=lambda x: x["date"])
    return upcoming
