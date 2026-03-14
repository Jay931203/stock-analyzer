"""Authentication middleware for FastAPI.

Provides two FastAPI dependencies:
  - get_user_context: extracts user identity + subscription from JWT or API key.
  - require_premium: like get_user_context but raises 403 for non-premium users.

Design decisions:
  - Stateless JWT verification using Supabase JWT secret (HS256).
  - Falls back to anonymous UserContext when no auth header is present,
    so existing unauthenticated endpoints keep working.
  - API-key auth path for programmatic "api" tier users.
  - Every call fetches subscription from Supabase REST (no in-lambda cache)
    because Vercel lambdas are ephemeral — keeps state consistent.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote as _url_quote

from fastapi import Depends, Header, HTTPException, Request

try:
    from jose import JWTError, jwt
except ImportError:
    # python-jose not installed — fall back to PyJWT
    import jwt as _pyjwt  # type: ignore

    class JWTError(Exception):  # type: ignore
        pass

    class jwt:  # type: ignore
        @staticmethod
        def decode(token, key, algorithms, options=None):
            try:
                return _pyjwt.decode(
                    token, key, algorithms=algorithms,
                    options=options or {},
                )
            except _pyjwt.PyJWTError as exc:
                raise JWTError(str(exc)) from exc


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()  # service_role key
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "").strip()


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class UserContext:
    """Injected into route handlers via Depends(get_user_context)."""
    user_id: Optional[str] = None
    plan: str = "anonymous"
    status: str = "active"
    is_premium: bool = False
    api_key: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    current_period_end: Optional[str] = None

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None


# ── Supabase REST helpers (same pattern as supabase_cache.py) ────────────────

def _sb_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _sb_rest_url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


def _fetch_subscription_by_user(user_id: str) -> Optional[dict]:
    """Fetch subscription row for a user via Supabase REST."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(user_id, safe="")
        url = _sb_rest_url(
            f"subscriptions?user_id=eq.{safe}"
            f"&select=plan,status,api_key,stripe_customer_id,current_period_end"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


def _fetch_subscription_by_api_key(api_key: str) -> Optional[dict]:
    """Fetch subscription row by API key."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        safe = _url_quote(api_key, safe="")
        url = _sb_rest_url(
            f"subscriptions?api_key=eq.{safe}"
            f"&select=user_id,plan,status,stripe_customer_id,current_period_end"
        )
        req = urllib.request.Request(url, headers=_sb_headers())
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode())
        return rows[0] if rows else None
    except Exception:
        return None


# ── JWT verification ─────────────────────────────────────────────────────────

def _verify_supabase_jwt(token: str) -> Optional[str]:
    """Verify a Supabase-issued JWT and return the user_id (sub claim).

    Returns None if verification fails or secret is not configured.
    """
    if not SUPABASE_JWT_SECRET:
        return None
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload.get("sub")
    except JWTError:
        return None


# ── FastAPI dependencies ─────────────────────────────────────────────────────

async def get_user_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> UserContext:
    """Extract user context from request headers.

    Supports three auth modes:
      1. Bearer JWT (Supabase auth) → resolves user_id + subscription
      2. X-API-Key header → resolves API-tier subscription
      3. No auth → anonymous context (backward compat)
    """

    # ── Path 1: API key ──────────────────────────────────────────────────────
    if x_api_key:
        sub = _fetch_subscription_by_api_key(x_api_key)
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid API key")
        if sub.get("status") not in ("active", "trialing"):
            raise HTTPException(status_code=403, detail="API key subscription is not active")
        return UserContext(
            user_id=sub.get("user_id"),
            plan=sub.get("plan", "api"),
            status=sub.get("status", "active"),
            is_premium=sub.get("plan") in ("pro", "api"),
            api_key=x_api_key,
            stripe_customer_id=sub.get("stripe_customer_id"),
            current_period_end=sub.get("current_period_end"),
        )

    # ── Path 2: Bearer JWT ───────────────────────────────────────────────────
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        user_id = _verify_supabase_jwt(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        sub = _fetch_subscription_by_user(user_id)
        plan = sub.get("plan", "free") if sub else "free"
        status = sub.get("status", "active") if sub else "active"

        return UserContext(
            user_id=user_id,
            plan=plan,
            status=status,
            is_premium=plan in ("pro", "api"),
            api_key=sub.get("api_key") if sub else None,
            stripe_customer_id=sub.get("stripe_customer_id") if sub else None,
            current_period_end=sub.get("current_period_end") if sub else None,
        )

    # ── Path 3: Anonymous (no auth header) ───────────────────────────────────
    return UserContext()


async def get_optional_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> UserContext:
    """Same as get_user_context, but never raises on missing/invalid auth.

    Use this on existing endpoints that must remain accessible to unauthenticated
    users while still supporting premium features for authenticated users.
    """
    try:
        return await get_user_context(request, authorization, x_api_key)
    except HTTPException:
        return UserContext()


async def require_premium(
    user: UserContext = Depends(get_user_context),
) -> UserContext:
    """Dependency that requires the user to have an active premium subscription."""
    if not user.is_premium:
        raise HTTPException(
            status_code=403,
            detail="This feature requires a Pro or API subscription.",
        )
    if user.status not in ("active", "trialing"):
        raise HTTPException(
            status_code=403,
            detail="Your subscription is not active. Please update your billing.",
        )
    return user
