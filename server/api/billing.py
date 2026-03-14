"""Stripe billing integration for Stock Analyzer.

Routes:
  POST /api/billing/checkout   — Create Stripe Checkout session
  POST /api/billing/webhook    — Stripe webhook handler (signature-verified)
  GET  /api/billing/portal     — Stripe Customer Portal URL
  GET  /api/billing/status     — Current subscription status + usage

All subscription state lives in Supabase `subscriptions` table.
Stripe is the source of truth — Supabase is synced via webhooks.
"""

from __future__ import annotations

import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote as _url_quote

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from .auth_middleware import UserContext, get_user_context
from .usage import get_usage_summary

router = APIRouter(prefix="/api/billing", tags=["billing"])

# ── Stripe config ────────────────────────────────────────────────────────────

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID", "")
STRIPE_API_PRICE_ID = os.environ.get("STRIPE_API_PRICE_ID", "")

# App URLs for checkout redirect
APP_URL = os.environ.get("APP_URL", "http://localhost:8081")

# Supabase REST
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

PRICE_MAP = {
    "pro": STRIPE_PRO_PRICE_ID,
    "api": STRIPE_API_PRICE_ID,
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


def _find_subscription_by_stripe_customer(customer_id: str) -> Optional[dict]:
    """Look up subscription row by stripe_customer_id."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(customer_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?stripe_customer_id=eq.{safe}"
            f"&select=user_id,plan,status,stripe_subscription_id,api_key"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _find_subscription_by_stripe_sub(sub_id: str) -> Optional[dict]:
    """Look up subscription row by stripe_subscription_id."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(sub_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?stripe_subscription_id=eq.{safe}"
            f"&select=user_id,plan,status,stripe_customer_id,api_key"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _get_or_create_stripe_customer(user: UserContext) -> str:
    """Return existing Stripe customer ID or create a new one.

    Looks up by stripe_customer_id in our DB first.
    If none, creates in Stripe and saves to Supabase.
    """
    if user.stripe_customer_id:
        return user.stripe_customer_id

    # Create Stripe customer
    customer = stripe.Customer.create(
        metadata={"supabase_user_id": user.user_id},
    )
    # Save to Supabase
    _upsert_subscription(user.user_id, {"stripe_customer_id": customer.id})
    return customer.id


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    user: UserContext = Depends(get_user_context),
):
    """Create a Stripe Checkout session for upgrading to Pro or API plan."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Sign in to subscribe.")

    price_id = PRICE_MAP.get(body.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Billing is not configured.")

    customer_id = _get_or_create_stripe_customer(user)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{APP_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{APP_URL}/billing/cancel",
        metadata={
            "user_id": user.user_id,
            "plan": body.plan,
        },
        subscription_data={
            "metadata": {
                "user_id": user.user_id,
                "plan": body.plan,
            },
        },
    )

    return CheckoutResponse(checkout_url=session.url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """Handle Stripe webhook events.

    IMPORTANT: This endpoint must receive the raw request body for signature
    verification. FastAPI gives us this via request.body().
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured.")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data_obj)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_obj)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data_obj)

    return {"received": True}


@router.get("/portal", response_model=PortalResponse)
async def create_portal_session(
    user: UserContext = Depends(get_user_context),
):
    """Create a Stripe Customer Portal session for managing billing."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Sign in first.")

    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Subscribe first.")

    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Billing is not configured.")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{APP_URL}/settings",
    )
    return PortalResponse(portal_url=session.url)


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

def _handle_checkout_completed(session: dict) -> None:
    """Activate subscription after successful checkout."""
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id")
    plan = metadata.get("plan", "pro")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not user_id:
        # Fallback: look up by customer
        if customer_id:
            existing = _find_subscription_by_stripe_customer(customer_id)
            if existing:
                user_id = existing["user_id"]

    if not user_id:
        print(f"WARNING: checkout.session.completed without user_id: {session.get('id')}")
        return

    update_data: dict = {
        "plan": plan,
        "status": "active",
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
    }

    # For API tier, generate an API key
    if plan == "api":
        update_data["api_key"] = f"sa_{secrets.token_urlsafe(32)}"

    _upsert_subscription(user_id, update_data)


def _handle_subscription_updated(subscription: dict) -> None:
    """Update subscription when Stripe subscription changes (upgrade/downgrade/renewal)."""
    sub_id = subscription.get("id")
    customer_id = subscription.get("customer")
    status = subscription.get("status")  # active, past_due, canceled, trialing, etc.
    current_period_end = subscription.get("current_period_end")

    # Look up our user by stripe subscription or customer
    existing = _find_subscription_by_stripe_sub(sub_id)
    if not existing and customer_id:
        existing = _find_subscription_by_stripe_customer(customer_id)

    if not existing:
        print(f"WARNING: subscription.updated for unknown sub: {sub_id}")
        return

    user_id = existing["user_id"]

    # Determine plan from Stripe price
    plan = existing.get("plan", "pro")
    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id", "")
        if price_id == STRIPE_API_PRICE_ID:
            plan = "api"
        elif price_id == STRIPE_PRO_PRICE_ID:
            plan = "pro"

    # Map Stripe status to our status enum
    mapped_status = _map_stripe_status(status)

    update_data: dict = {
        "plan": plan,
        "status": mapped_status,
        "stripe_subscription_id": sub_id,
    }
    if current_period_end:
        update_data["current_period_end"] = datetime.fromtimestamp(
            current_period_end, tz=timezone.utc
        ).isoformat()

    _upsert_subscription(user_id, update_data)


def _handle_subscription_deleted(subscription: dict) -> None:
    """Downgrade to free when subscription is canceled/expired."""
    sub_id = subscription.get("id")
    customer_id = subscription.get("customer")

    existing = _find_subscription_by_stripe_sub(sub_id)
    if not existing and customer_id:
        existing = _find_subscription_by_stripe_customer(customer_id)

    if not existing:
        print(f"WARNING: subscription.deleted for unknown sub: {sub_id}")
        return

    user_id = existing["user_id"]
    _upsert_subscription(user_id, {
        "plan": "free",
        "status": "canceled",
        "stripe_subscription_id": None,
        "api_key": None,  # Revoke API key
        "current_period_end": None,
    })


def _handle_payment_failed(invoice: dict) -> None:
    """Set subscription to past_due on payment failure."""
    customer_id = invoice.get("customer")
    sub_id = invoice.get("subscription")

    existing = None
    if sub_id:
        existing = _find_subscription_by_stripe_sub(sub_id)
    if not existing and customer_id:
        existing = _find_subscription_by_stripe_customer(customer_id)

    if not existing:
        return

    user_id = existing["user_id"]
    _upsert_subscription(user_id, {"status": "past_due"})


def _map_stripe_status(stripe_status: str) -> str:
    """Map Stripe subscription status to our status enum."""
    mapping = {
        "active": "active",
        "trialing": "trialing",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "past_due",
        "incomplete": "past_due",
        "incomplete_expired": "canceled",
        "paused": "canceled",
    }
    return mapping.get(stripe_status, "active")
