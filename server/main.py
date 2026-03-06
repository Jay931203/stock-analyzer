"""FastAPI server entry point."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .api.og import og_image_router, share_router

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
