"""Vercel serverless entry point - wraps FastAPI app."""

import sys
from pathlib import Path

# Ensure project root is in Python path
root = str(Path(__file__).parent.parent)
if root not in sys.path:
    sys.path.insert(0, root)

from server.main import app  # noqa: E402
