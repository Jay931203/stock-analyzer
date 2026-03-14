"""Factory for selecting the active market data provider.

The provider is determined by the ``DATA_PROVIDER`` environment variable:

* ``yfinance`` (default) -- free, development-only (Yahoo Finance TOS
  prohibit commercial use).
* ``twelvedata`` -- requires ``TWELVE_DATA_API_KEY``.

Usage::

    from server.core.provider_factory import get_provider
    provider = get_provider()
    df = provider.fetch_daily_history("AAPL", years=5)
"""

from __future__ import annotations

import os
from functools import lru_cache

from .data_provider import DataProvider, TwelveDataProvider, YFinanceProvider


@lru_cache(maxsize=1)
def get_provider() -> DataProvider:
    """Return the configured :class:`DataProvider` singleton.

    The result is cached so that repeated calls return the same instance
    (and therefore reuse any internal sessions / rate-limit state).
    """
    provider_name = os.environ.get("DATA_PROVIDER", "yfinance").lower()

    if provider_name == "twelvedata":
        api_key = os.environ.get("TWELVE_DATA_API_KEY", "")
        if not api_key:
            raise ValueError(
                "TWELVE_DATA_API_KEY environment variable is required "
                "when DATA_PROVIDER=twelvedata"
            )
        return TwelveDataProvider(api_key)

    if provider_name != "yfinance":
        raise ValueError(
            f"Unknown DATA_PROVIDER '{provider_name}'. "
            "Supported: yfinance, twelvedata"
        )

    return YFinanceProvider()
