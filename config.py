"""Canonical settings proxy.

Runtime settings are centralized in ``src/iran_monitor/config.py``.
This file keeps backward compatibility for legacy imports at repository root.
"""

from src.iran_monitor.config import settings

__all__ = ["settings"]
