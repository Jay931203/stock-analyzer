"""Alert CRUD router for Stock Analyzer.

Routes:
  POST   /api/alerts              — Create a new alert
  GET    /api/alerts              — List user's alerts
  DELETE /api/alerts/{alert_id}   — Delete an alert
  PATCH  /api/alerts/{alert_id}   — Toggle active/inactive

Plan limits: Free=0, Pro=5, API=unlimited.
All state lives in Supabase `alerts` table (see 001_subscriptions.sql).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote as _url_quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from .auth_middleware import UserContext, get_user_context

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

# ── Plan limits for alerts ───────────────────────────────────────────────────

ALERT_LIMITS: dict[str, int] = {
    "anonymous": 0,
    "free": 0,
    "pro": 5,
    "api": -1,  # unlimited
}

_VALID_CONDITION_TYPES = {"signal_entry", "signal_exit", "price_above", "price_below"}


# ── Supabase REST helpers ────────────────────────────────────────────────────

def _sb_headers(*, prefer: str = "") -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _sb_rest_url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


def _count_user_alerts(user_id: str) -> int:
    """Count active alerts for a user."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return 0
    try:
        safe = _url_quote(user_id, safe="")
        url = _sb_rest_url(f"alerts?user_id=eq.{safe}&is_active=eq.true&select=id")
        headers = _sb_headers()
        headers["Prefer"] = "count=exact"
        # Use HEAD-like approach: request with count header
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
            return len(rows)
    except Exception:
        return 0


# ── Request/Response schemas ─────────────────────────────────────────────────

class AlertCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=6)
    condition_type: str
    condition_value: dict = Field(default_factory=dict)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("condition_type")
    @classmethod
    def validate_condition_type(cls, v: str) -> str:
        if v not in _VALID_CONDITION_TYPES:
            raise ValueError(
                f"Invalid condition_type '{v}'. Must be one of: {', '.join(sorted(_VALID_CONDITION_TYPES))}"
            )
        return v

    @field_validator("condition_value")
    @classmethod
    def validate_condition_value(cls, v: dict, info) -> dict:
        # Validate that condition_value has the required fields for the type
        ctype = info.data.get("condition_type", "")
        if ctype in ("price_above", "price_below"):
            price = v.get("price")
            if price is None or not isinstance(price, (int, float)) or price <= 0:
                raise ValueError("condition_value must include a positive 'price' for price alerts")
        if ctype in ("signal_entry",):
            # threshold is optional, defaults to 50
            threshold = v.get("threshold", 50)
            if not isinstance(threshold, (int, float)) or threshold < 0 or threshold > 100:
                raise ValueError("threshold must be between 0 and 100")
        return v


class AlertToggle(BaseModel):
    is_active: bool


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("")
async def create_alert(
    body: AlertCreate,
    user: UserContext = Depends(get_user_context),
):
    """Create a new alert. Requires authentication and appropriate plan."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check plan limits
    limit = ALERT_LIMITS.get(user.plan, 0)
    if limit == 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "upgrade_required",
                "message": "Alerts require a Pro or API subscription.",
                "plan": user.plan,
                "limit": 0,
            },
        )

    if limit > 0:  # -1 means unlimited
        current_count = _count_user_alerts(user.user_id)
        if current_count >= limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "limit_exceeded",
                    "message": f"Alert limit reached ({current_count}/{limit}). Upgrade to API tier for unlimited alerts.",
                    "plan": user.plan,
                    "limit": limit,
                    "used": current_count,
                },
            )

    # Insert into Supabase
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=503, detail="Database not configured")

    row = {
        "user_id": user.user_id,
        "ticker": body.ticker,
        "condition_type": body.condition_type,
        "condition_value": body.condition_value,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        url = _sb_rest_url("alerts")
        req_body = json.dumps(row).encode()
        req = urllib.request.Request(
            url, data=req_body, method="POST",
            headers=_sb_headers(prefer="return=representation"),
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            created = json.loads(resp.read().decode())
        return created[0] if isinstance(created, list) and created else created
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"[alerts] Create failed: {e.code} {error_body}")
        raise HTTPException(status_code=500, detail="Failed to create alert")
    except Exception as e:
        print(f"[alerts] Create error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create alert")


@router.get("")
async def list_alerts(
    user: UserContext = Depends(get_user_context),
):
    """List all alerts for the authenticated user."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"alerts": []}

    try:
        safe = _url_quote(user.user_id, safe="")
        url = _sb_rest_url(
            f"alerts?user_id=eq.{safe}"
            f"&select=id,ticker,condition_type,condition_value,is_active,last_triggered_at,created_at"
            f"&order=created_at.desc"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            alerts = json.loads(resp.read().decode())
        return {"alerts": alerts}
    except Exception as e:
        print(f"[alerts] List error: {e}")
        return {"alerts": []}


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    user: UserContext = Depends(get_user_context),
):
    """Delete an alert. Users can only delete their own alerts."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        safe_id = _url_quote(alert_id, safe="")
        safe_uid = _url_quote(user.user_id, safe="")
        url = _sb_rest_url(f"alerts?id=eq.{safe_id}&user_id=eq.{safe_uid}")
        req = urllib.request.Request(
            url, method="DELETE",
            headers=_sb_headers(prefer="return=representation"),
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            deleted = json.loads(resp.read().decode())
        if not deleted:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "deleted", "id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[alerts] Delete error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete alert")


@router.patch("/{alert_id}")
async def toggle_alert(
    alert_id: str,
    body: AlertToggle,
    user: UserContext = Depends(get_user_context),
):
    """Toggle an alert active/inactive. Users can only update their own alerts."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=503, detail="Database not configured")

    # If re-activating, check plan limits
    if body.is_active:
        limit = ALERT_LIMITS.get(user.plan, 0)
        if limit == 0:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "upgrade_required",
                    "message": "Alerts require a Pro or API subscription.",
                    "plan": user.plan,
                },
            )
        if limit > 0:
            current_count = _count_user_alerts(user.user_id)
            if current_count >= limit:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "limit_exceeded",
                        "message": f"Active alert limit reached ({current_count}/{limit}).",
                        "plan": user.plan,
                        "limit": limit,
                        "used": current_count,
                    },
                )

    try:
        safe_id = _url_quote(alert_id, safe="")
        safe_uid = _url_quote(user.user_id, safe="")
        url = _sb_rest_url(f"alerts?id=eq.{safe_id}&user_id=eq.{safe_uid}")
        patch_body = json.dumps({"is_active": body.is_active}).encode()
        req = urllib.request.Request(
            url, data=patch_body, method="PATCH",
            headers=_sb_headers(prefer="return=representation"),
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            updated = json.loads(resp.read().decode())
        if not updated:
            raise HTTPException(status_code=404, detail="Alert not found")
        return updated[0] if isinstance(updated, list) and updated else updated
    except HTTPException:
        raise
    except Exception as e:
        print(f"[alerts] Toggle error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update alert")
