"""FastAPI server entry point."""

import os
import time
from collections import defaultdict
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .api.og import og_image_router, share_router

# Simple in-memory rate limiter (per IP, resets every minute)
_rate_counts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 60  # requests per minute per IP
RATE_WINDOW = 60  # seconds

app = FastAPI(
    title="Stock Analyzer API",
    description="Technical analysis with historical probability backtesting",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Lightweight per-IP rate limiting for API endpoints."""
    path = request.url.path
    # Only rate-limit /api/ endpoints (not static, health, share pages)
    if path.startswith("/api/"):
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
        now = time.time()
        hits = _rate_counts[ip]
        # Prune old entries
        cutoff = now - RATE_WINDOW
        _rate_counts[ip] = [t for t in hits if t > cutoff]
        if len(_rate_counts[ip]) >= RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(RATE_WINDOW)},
            )
        _rate_counts[ip].append(now)
    return await call_next(request)


app.include_router(router)
app.include_router(og_image_router, prefix="/api")
app.include_router(share_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve web app static files if built (skip on Vercel - it serves public/ directly)
if not os.environ.get("VERCEL"):
    web_dist = Path(__file__).parent.parent / "mobile" / "dist"
    if web_dist.exists():
        app.mount("/", StaticFiles(directory=str(web_dist), html=True), name="webapp")
