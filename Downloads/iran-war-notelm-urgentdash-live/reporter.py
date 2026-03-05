from src.iran_monitor import reporter as _reporter

# Public APIs
from src.iran_monitor.reporter import *  # noqa: F401,F403

# Compatibility exports used by legacy tests/modules
from src.iran_monitor.reporter import _build_report, _split_telegram_chunks, _send_telegram_chunk, _send_telegram  # noqa: F401

__all__ = list(getattr(_reporter, "__all__", []))
for _name in ["_build_report", "_split_telegram_chunks", "_send_telegram_chunk", "_send_telegram"]:
    if _name not in __all__:
        __all__.append(_name)
