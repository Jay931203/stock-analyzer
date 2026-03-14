"""FastAPI server entry point."""

import os
import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .api.og import og_image_router, share_router
from .api.billing import router as billing_router
from .api.alerts import router as alerts_router
from .api.api_v1 import router as api_v1_router

# Simple in-memory rate limiter (per IP, resets every minute)
_rate_counts: dict[str, list[float]] = {}
_rate_last_cleanup = time.time()
RATE_LIMIT = 60  # requests per minute per IP
RATE_WINDOW = 60  # seconds
_RATE_MAX_IPS = 10000  # max tracked IPs before forced cleanup

# CORS: restrict to known origins in production
_ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://localhost:8000",
]
# On Vercel, allow the deployment URL
if os.environ.get("VERCEL_URL"):
    _ALLOWED_ORIGINS.append(f"https://{os.environ['VERCEL_URL']}")
if os.environ.get("VERCEL_PROJECT_PRODUCTION_URL"):
    _ALLOWED_ORIGINS.append(f"https://{os.environ['VERCEL_PROJECT_PRODUCTION_URL']}")
# Allow APP_URL for Stripe checkout redirects
if os.environ.get("APP_URL"):
    _app_url = os.environ["APP_URL"].rstrip("/")
    if _app_url not in _ALLOWED_ORIGINS:
        _ALLOWED_ORIGINS.append(_app_url)
# Allow all origins in development mode
_IS_DEV = not (os.environ.get("VERCEL") or os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PRODUCTION"))

app = FastAPI(
    title="Stock Analyzer API",
    description=(
        "Technical analysis with historical probability backtesting.\n\n"
        "## Internal Endpoints\n"
        "Used by the Stock Analyzer web/mobile app.\n\n"
        "## Developer API v1\n"
        "Programmatic access for developers. All `/api/v1/` endpoints require "
        "an API-tier subscription and `X-API-Key` header authentication.\n\n"
        "Rate limit: 10,000 requests/day. Responses use a consistent envelope "
        "with `data` + `meta` keys."
    ),
    version="1.0.0",
    openapi_tags=[
        {
            "name": "Developer API v1",
            "description": "Public developer API — requires X-API-Key header (API-tier subscription, $49/mo). "
                           "10,000 requests/day. All responses wrapped in {data, meta} envelope.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _IS_DEV else _ALLOWED_ORIGINS,
    allow_credentials=not _IS_DEV,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Lightweight per-IP rate limiting for API endpoints."""
    global _rate_last_cleanup
    path = request.url.path
    if path.startswith("/api/"):
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
        now = time.time()
        cutoff = now - RATE_WINDOW

        # Prune this IP's old timestamps
        hits = _rate_counts.get(ip, [])
        hits = [t for t in hits if t > cutoff]

        if len(hits) >= RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(RATE_WINDOW)},
            )
        hits.append(now)
        _rate_counts[ip] = hits

        # Periodic cleanup: evict stale IPs every 5 minutes or if too many tracked
        if now - _rate_last_cleanup > 300 or len(_rate_counts) > _RATE_MAX_IPS:
            stale_ips = [k for k, v in _rate_counts.items() if not v or v[-1] < cutoff]
            for k in stale_ips:
                del _rate_counts[k]
            _rate_last_cleanup = now

    return await call_next(request)


app.include_router(router)
app.include_router(og_image_router, prefix="/api")
app.include_router(share_router)
app.include_router(billing_router)
app.include_router(alerts_router)
app.include_router(api_v1_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve web app static files if built (skip on Vercel - it serves public/ directly)
if not os.environ.get("VERCEL"):
    web_dist = Path(__file__).parent.parent / "mobile" / "dist"
    if web_dist.exists():
        app.mount("/", StaticFiles(directory=str(web_dist), html=True), name="webapp")
