"""Lemon Squeezy billing integration for Stock Analyzer.

Routes:
  POST /api/billing/checkout   — Create Lemon Squeezy Checkout session
  POST /api/billing/webhook    — Lemon Squeezy webhook handler (HMAC-verified)
  GET  /api/billing/portal     — Lemon Squeezy Customer Portal URL
  GET  /api/billing/status     — Current subscription status + usage

All subscription state lives in Supabase `subscriptions` table.
Lemon Squeezy is the source of truth — Supabase is synced via webhooks.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote as _url_quote

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from .auth_middleware import UserContext, get_user_context
from .usage import get_usage_summary

router = APIRouter(prefix="/api/billing", tags=["billing"])

# ── Lemon Squeezy config ────────────────────────────────────────────────────

LEMONSQUEEZY_API_KEY = os.environ.get("LEMONSQUEEZY_API_KEY", "")
LEMONSQUEEZY_WEBHOOK_SECRET = os.environ.get("LEMONSQUEEZY_WEBHOOK_SECRET", "")
LEMONSQUEEZY_STORE_ID = os.environ.get("LEMONSQUEEZY_STORE_ID", "")
LS_PRO_VARIANT_ID = os.environ.get("LS_PRO_VARIANT_ID", "")
LS_API_VARIANT_ID = os.environ.get("LS_API_VARIANT_ID", "")

LS_API_BASE = "https://api.lemonsqueezy.com/v1"

# App URLs for checkout redirect
APP_URL = os.environ.get("APP_URL", "http://localhost:8081")

# Supabase REST
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

VARIANT_MAP = {
    "pro": LS_PRO_VARIANT_ID,
    "api": LS_API_VARIANT_ID,
}


# ── Pydantic models ─────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "api"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class StatusResponse(BaseModel):
    plan: str
    status: str
    is_premium: bool
    current_period_end: Optional[str] = None
    usage: dict


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


def _upsert_subscription(user_id: str, data: dict) -> bool:
    """Upsert subscription row via Supabase REST."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    try:
        row = {"user_id": user_id, **data, "updated_at": datetime.now(timezone.utc).isoformat()}
        body = json.dumps(row).encode()
        url = _sb_rest_url("subscriptions")
        req = urllib.request.Request(
            url, data=body, method="POST",
            headers=_sb_headers(prefer="resolution=merge-duplicates,return=minimal"),
        )
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception as e:
        print(f"Subscription upsert error: {e}")
        return False


def _find_subscription_by_ls_customer(customer_id: str) -> Optional[dict]:
    """Look up subscription row by ls_customer_id."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(customer_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?ls_customer_id=eq.{safe}"
            f"&select=user_id,plan,status,ls_subscription_id,api_key"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _find_subscription_by_ls_sub(sub_id: str) -> Optional[dict]:
    """Look up subscription row by ls_subscription_id."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(sub_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?ls_subscription_id=eq.{safe}"
            f"&select=user_id,plan,status,ls_customer_id,api_key"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _find_subscription_by_user(user_id: str) -> Optional[dict]:
    """Look up subscription row by user_id."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(user_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?user_id=eq.{safe}"
            f"&select=user_id,plan,status,ls_customer_id,ls_subscription_id,api_key"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


# ── Lemon Squeezy API helpers ────────────────────────────────────────────────

def _ls_api_headers() -> dict[str, str]:
    """Return headers for Lemon Squeezy API requests."""
    return {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": f"Bearer {LEMONSQUEEZY_API_KEY}",
    }


def _ls_api_request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Make a request to the Lemon Squeezy API using urllib.request."""
    url = f"{LS_API_BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=_ls_api_headers())
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def _verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify Lemon Squeezy webhook HMAC SHA256 signature."""
    if not LEMONSQUEEZY_WEBHOOK_SECRET:
        return False
    expected = hmac.new(
        LEMONSQUEEZY_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    user: UserContext = Depends(get_user_context),
):
    """Create a Lemon Squeezy Checkout session for upgrading to Pro or API plan."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Sign in to subscribe.")

    variant_id = VARIANT_MAP.get(body.plan)
    if not variant_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    if not LEMONSQUEEZY_API_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured.")

    if not LEMONSQUEEZY_STORE_ID:
        raise HTTPException(status_code=503, detail="Billing store is not configured.")

    # Create Lemon Squeezy checkout via API
    checkout_body = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "custom": {
                        "user_id": user.user_id,
                        "plan": body.plan,
                    },
                },
                "product_options": {
                    "redirect_url": f"{APP_URL}/billing/success",
                },
            },
            "relationships": {
                "store": {
                    "data": {
                        "type": "stores",
                        "id": LEMONSQUEEZY_STORE_ID,
                    },
                },
                "variant": {
                    "data": {
                        "type": "variants",
                        "id": variant_id,
                    },
                },
            },
        },
    }

    try:
        result = _ls_api_request("POST", "/checkouts", checkout_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"Lemon Squeezy checkout error: {e.code} {error_body}")
        raise HTTPException(status_code=502, detail="Failed to create checkout session.")
    except Exception as e:
        print(f"Lemon Squeezy checkout error: {e}")
        raise HTTPException(status_code=502, detail="Failed to create checkout session.")

    checkout_url = result.get("data", {}).get("attributes", {}).get("url", "")
    if not checkout_url:
        raise HTTPException(status_code=502, detail="Checkout URL not returned by payment provider.")

    return CheckoutResponse(checkout_url=checkout_url)


@router.post("/webhook")
async def ls_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
):
    """Handle Lemon Squeezy webhook events.

    IMPORTANT: This endpoint must receive the raw request body for signature
    verification. FastAPI gives us this via request.body().
    """
    if not LEMONSQUEEZY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured.")

    payload = await request.body()

    if not x_signature or not _verify_webhook_signature(payload, x_signature):
        raise HTTPException(status_code=400, detail="Invalid signature.")

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_name = event.get("meta", {}).get("event_name", "")
    data = event.get("data", {})
    meta = event.get("meta", {})

    if event_name == "subscription_created":
        _handle_subscription_created(data, meta)
    elif event_name == "subscription_updated":
        _handle_subscription_updated(data, meta)
    elif event_name == "subscription_cancelled":
        _handle_subscription_cancelled(data, meta)
    elif event_name == "subscription_payment_failed":
        _handle_payment_failed(data, meta)
    elif event_name == "subscription_expired":
        _handle_subscription_expired(data, meta)

    return {"received": True}


@router.get("/portal", response_model=PortalResponse)
async def create_portal_session(
    user: UserContext = Depends(get_user_context),
):
    """Return Lemon Squeezy customer portal URL for managing billing."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Sign in first.")

    if not user.ls_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe first.")

    # Try to get the customer portal URL from the subscription
    sub = _find_subscription_by_user(user.user_id)
    ls_sub_id = sub.get("ls_subscription_id") if sub else None

    if ls_sub_id and LEMONSQUEEZY_API_KEY:
        try:
            result = _ls_api_request("GET", f"/subscriptions/{ls_sub_id}")
            portal_url = (
                result.get("data", {})
                .get("attributes", {})
                .get("urls", {})
                .get("customer_portal", "")
            )
            if portal_url:
                return PortalResponse(portal_url=portal_url)
        except Exception as e:
            print(f"Failed to fetch LS subscription portal URL: {e}")

    # Fallback: generic Lemon Squeezy orders page
    return PortalResponse(portal_url="https://app.lemonsqueezy.com/my-orders")


@router.get("/status", response_model=StatusResponse)
async def billing_status(
    user: UserContext = Depends(get_user_context),
):
    """Return current subscription status and daily usage."""
    usage = await get_usage_summary(user)

    return StatusResponse(
        plan=user.plan,
        status=user.status,
        is_premium=user.is_premium,
        current_period_end=user.current_period_end,
        usage=usage.get("usage", {}),
    )


# ── Webhook handlers ────────────────────────────────────────────────────────

def _extract_custom_data(meta: dict) -> dict:
    """Extract custom data (user_id, plan) from webhook meta."""
    custom = meta.get("custom_data", {})
    if not custom:
        # Fallback: some events put it under meta directly
        custom = {}
    return custom


def _get_variant_plan(variant_id: str) -> str:
    """Map a Lemon Squeezy variant ID to our plan name."""
    if variant_id == LS_API_VARIANT_ID:
        return "api"
    if variant_id == LS_PRO_VARIANT_ID:
        return "pro"
    return "pro"  # default


def _handle_subscription_created(data: dict, meta: dict) -> None:
    """Activate subscription after successful checkout."""
    attrs = data.get("attributes", {})
    custom = _extract_custom_data(meta)
    user_id = custom.get("user_id")
    plan = custom.get("plan", "pro")

    ls_sub_id = str(data.get("id", ""))
    ls_customer_id = str(attrs.get("customer_id", ""))
    variant_id = str(attrs.get("variant_id", ""))

    # Determine plan from variant if not in custom data
    if not plan or plan == "pro":
        plan = _get_variant_plan(variant_id)

    # Try to find user by customer ID if user_id not in custom data
    if not user_id and ls_customer_id:
        existing = _find_subscription_by_ls_customer(ls_customer_id)
        if existing:
            user_id = existing["user_id"]

    if not user_id:
        print(f"WARNING: subscription_created without user_id: sub={ls_sub_id}")
        return

    renews_at = attrs.get("renews_at")

    update_data: dict = {
        "plan": plan,
        "status": "active",
        "ls_customer_id": ls_customer_id,
        "ls_subscription_id": ls_sub_id,
    }

    if renews_at:
        update_data["current_period_end"] = renews_at

    # For API tier, generate an API key
    if plan == "api":
        update_data["api_key"] = f"sa_{secrets.token_urlsafe(32)}"

    _upsert_subscription(user_id, update_data)


def _handle_subscription_updated(data: dict, meta: dict) -> None:
    """Update subscription when plan changes, renewal, etc."""
    attrs = data.get("attributes", {})
    ls_sub_id = str(data.get("id", ""))
    ls_customer_id = str(attrs.get("customer_id", ""))
    status = attrs.get("status", "")  # active, on_trial, paused, past_due, unpaid, cancelled, expired
    variant_id = str(attrs.get("variant_id", ""))

    # Look up our user by LS subscription or customer
    existing = _find_subscription_by_ls_sub(ls_sub_id)
    if not existing and ls_customer_id:
        existing = _find_subscription_by_ls_customer(ls_customer_id)

    if not existing:
        # Try from custom data
        custom = _extract_custom_data(meta)
        user_id = custom.get("user_id")
        if not user_id:
            print(f"WARNING: subscription_updated for unknown sub: {ls_sub_id}")
            return
        existing = {"user_id": user_id, "plan": custom.get("plan", "pro")}

    user_id = existing["user_id"]

    # Determine plan from variant
    plan = _get_variant_plan(variant_id) if variant_id else existing.get("plan", "pro")

    # Map LS status to our status enum
    mapped_status = _map_ls_status(status)

    renews_at = attrs.get("renews_at")

    update_data: dict = {
        "plan": plan,
        "status": mapped_status,
        "ls_subscription_id": ls_sub_id,
    }
    if renews_at:
        update_data["current_period_end"] = renews_at

    _upsert_subscription(user_id, update_data)


def _handle_subscription_cancelled(data: dict, meta: dict) -> None:
    """Mark subscription as canceled when user cancels."""
    attrs = data.get("attributes", {})
    ls_sub_id = str(data.get("id", ""))
    ls_customer_id = str(attrs.get("customer_id", ""))

    existing = _find_subscription_by_ls_sub(ls_sub_id)
    if not existing and ls_customer_id:
        existing = _find_subscription_by_ls_customer(ls_customer_id)

    if not existing:
        print(f"WARNING: subscription_cancelled for unknown sub: {ls_sub_id}")
        return

    user_id = existing["user_id"]

    # Lemon Squeezy cancelled means user cancelled but may still have access
    # until end of billing period. The ends_at field tells when access expires.
    ends_at = attrs.get("ends_at")

    update_data: dict = {
        "status": "canceled",
    }
    if ends_at:
        update_data["current_period_end"] = ends_at

    _upsert_subscription(user_id, update_data)


def _handle_payment_failed(data: dict, meta: dict) -> None:
    """Set subscription to past_due on payment failure."""
    attrs = data.get("attributes", {})
    ls_sub_id = str(data.get("id", ""))
    ls_customer_id = str(attrs.get("customer_id", ""))

    existing = _find_subscription_by_ls_sub(ls_sub_id)
    if not existing and ls_customer_id:
        existing = _find_subscription_by_ls_customer(ls_customer_id)

    if not existing:
        return

    user_id = existing["user_id"]
    _upsert_subscription(user_id, {"status": "past_due"})


def _handle_subscription_expired(data: dict, meta: dict) -> None:
    """Downgrade to free when subscription fully expires."""
    attrs = data.get("attributes", {})
    ls_sub_id = str(data.get("id", ""))
    ls_customer_id = str(attrs.get("customer_id", ""))

    existing = _find_subscription_by_ls_sub(ls_sub_id)
    if not existing and ls_customer_id:
        existing = _find_subscription_by_ls_customer(ls_customer_id)

    if not existing:
        print(f"WARNING: subscription_expired for unknown sub: {ls_sub_id}")
        return

    user_id = existing["user_id"]
    _upsert_subscription(user_id, {
        "plan": "free",
        "status": "canceled",
        "ls_subscription_id": None,
        "api_key": None,  # Revoke API key
        "current_period_end": None,
    })


def _map_ls_status(ls_status: str) -> str:
    """Map Lemon Squeezy subscription status to our status enum."""
    mapping = {
        "active": "active",
        "on_trial": "trialing",
        "past_due": "past_due",
        "paused": "canceled",
        "unpaid": "past_due",
        "cancelled": "canceled",
        "expired": "canceled",
    }
    return mapping.get(ls_status, "active")
