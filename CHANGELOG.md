# CHANGELOG

## [2.0.2] - 2026-03-01

### Added

- Single instance guard in `app.py` using lock file (`state/monitor.lock`)
- Stale lock recovery (invalid/dead PID lock auto-cleanup)
- Duplicate process cleanup script:
  - `scripts/cleanup_duplicate_monitors.ps1` (keeps newest process, terminates older duplicates)
- Lock behavior tests:
  - second acquire blocked while lock is held
  - stale lock file recovery

### Changed

- `scripts/run_monitor.py` now calls `iran_monitor.app.run()` so startup always goes through lock guard
- Canonical config includes:
  - `SINGLE_INSTANCE_GUARD_ENABLED`
  - `SINGLE_INSTANCE_LOCK_FILE`

## [2.0.1] - 2026-03-01

### Added

- Telegram report chunking in `reporter.py` with `TELEGRAM_MAX_MESSAGE_LEN = 4096`
- Line-boundary-first chunk splitter with hard slicing fallback for oversized single lines
- Markdown parse fallback: retry failed Telegram chunk as plain text (`parse_mode=None`)
- `tests/test_reporter_telegram_chunking.py` (4 cases):
  - short message single send
  - long message multi-chunk and `<=4096` guarantee
  - oversized single-line hard split
  - markdown parse error fallback resend

### Changed

- Telegram send path switched from single send to chunked send loop with chunk-level logging
- Root `reporter.py` and canonical `src/iran_monitor/reporter.py` kept in sync for same behavior

## [2.0.0] - 2026-03-01

### Added

- Canonical runtime package structure under `src/iran_monitor/`
- `app.py` integrated pipeline with Phase1+2 and A/B storage
- `storage_adapter.py` for `run/articles/outbox` mapping into `persist_run`
- `reporter.build_report_text(...)` for reusable payload generation
- `scripts/run_monitor.py`, `scripts/run_now.py`, `scripts/check_runtime_paths.py`
- Test suite for pipeline, storage adapter, storage integration, runtime paths

### Changed

- Threat level convention standardized to `LOW|MEDIUM|HIGH|CRITICAL`
- SQLite schema comment updated to reflect `MEDIUM` (not `MED`)
- Root project `main.py` switched to deprecated compatibility wrapper
