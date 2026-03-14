"""Send alert notifications via Resend email API.

Uses urllib.request (no extra dependencies) — same pattern as supabase_cache.py.

Resend free tier: 100 emails/day, sufficient for early-stage alert volume.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Optional

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "alerts@kulturbridge.com")

_RESEND_URL = "https://api.resend.com/emails"


def _condition_label(condition_type: str) -> str:
    return {
        "signal_entry": "Signal Entry",
        "signal_exit": "Signal Exit",
        "price_above": "Price Above",
        "price_below": "Price Below",
    }.get(condition_type, condition_type)


def _build_html(alert: dict, context: dict) -> str:
    """Build a clean HTML email body for the triggered alert."""
    ticker = alert.get("ticker", "???")
    ctype = alert.get("condition_type", "")
    cval = alert.get("condition_value", {})
    label = _condition_label(ctype)

    # Context from signal data
    price = context.get("price", "N/A")
    win_rate = context.get("win_rate_20d", context.get("win_rate", ""))
    change_pct = context.get("change_pct", "")
    condition_desc = context.get("condition", "")

    details_rows = f'<tr><td style="padding:4px 12px;color:#666">Price</td><td style="padding:4px 12px;font-weight:600">${price}</td></tr>'

    if change_pct:
        color = "#16a34a" if float(change_pct) >= 0 else "#dc2626"
        details_rows += (
            f'<tr><td style="padding:4px 12px;color:#666">Change</td>'
            f'<td style="padding:4px 12px;font-weight:600;color:{color}">{change_pct:+.2f}%</td></tr>'
        )

    if ctype in ("signal_entry", "signal_exit") and win_rate:
        details_rows += (
            f'<tr><td style="padding:4px 12px;color:#666">Win Rate (20d)</td>'
            f'<td style="padding:4px 12px;font-weight:600">{win_rate:.1f}%</td></tr>'
        )
        if condition_desc:
            details_rows += (
                f'<tr><td style="padding:4px 12px;color:#666">Condition</td>'
                f'<td style="padding:4px 12px">{condition_desc}</td></tr>'
            )

    if ctype in ("price_above", "price_below"):
        threshold = cval.get("price", "N/A")
        details_rows += (
            f'<tr><td style="padding:4px 12px;color:#666">Threshold</td>'
            f'<td style="padding:4px 12px;font-weight:600">${threshold}</td></tr>'
        )

    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#f8fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 4px;color:#1e293b">{ticker}</h2>
        <p style="margin:0 0 16px;color:#64748b;font-size:14px">{label} Alert Triggered</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          {details_rows}
        </table>
      </div>
      <p style="margin-top:16px;font-size:12px;color:#94a3b8;text-align:center">
        Stock Analyzer &mdash; You're receiving this because you set up an alert for {ticker}.
        <br>Manage alerts in the app settings.
      </p>
    </div>
    """


def send_alert_email(to_email: str, alert: dict, context: dict) -> bool:
    """Send alert notification email via Resend API.

    Args:
        to_email: Recipient email address.
        alert: The alert row dict (ticker, condition_type, condition_value, etc.).
        context: Signal/price context dict (price, win_rate_20d, change_pct, etc.).

    Returns:
        True if email was sent successfully, False otherwise.
    """
    if not RESEND_API_KEY:
        print("[notifier] RESEND_API_KEY not configured — skipping email")
        return False

    if not to_email:
        return False

    ticker = alert.get("ticker", "???")
    label = _condition_label(alert.get("condition_type", ""))

    payload = {
        "from": RESEND_FROM,
        "to": [to_email],
        "subject": f"Signal Alert: {ticker} — {label}",
        "html": _build_html(alert, context),
    }

    try:
        body = json.dumps(payload).encode()
        req = urllib.request.Request(
            _RESEND_URL,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            print(f"[notifier] Email sent to {to_email} for {ticker}: {result.get('id', 'ok')}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"[notifier] Resend API error {e.code}: {error_body}")
        return False
    except Exception as e:
        print(f"[notifier] Email send failed: {e}")
        return False
