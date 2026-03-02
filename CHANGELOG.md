# CHANGELOG

## [2.0.5] - 2026-03-03

### Updated

- 문서 기준을 운영 현황과 완전 정합:
  - `README.md`에 Phase 4(러너→Postgres→Vercel), canonical 경로 고정, 2회 연속 실행 중복 억제 동작을 운영 체크리스트에 반영.
  - `docs/ARCHITECTURE.md`와 `LAYOUT.md`에서 현재 `src/iran_monitor` 단일 런타임/저장 구조를 기준으로 정리.
- 연속 실행 검증 결과 반영:
  - 신규 기사 유입(run1 `new_count=2`) 후 즉시 동일 사이클(run2)에서 `new_count=0`으로 DB 기반 dedup+in-process dedup가 정상 동작.
  - `outbox`는 1회차 2건(telegram/whatsapp)만 적재되고 2회차 추가 적재 없음 확인.
- 현재 운영 상태 반영:
  - `main.py`는 canonical 런타임 위임 + 경로 진단 체크를 유지.
  - 단일 인스턴스 락 정책은 계속 유지되며, `SINGLE_INSTANCE_GUARD_ENABLED` 기본값은 true.

## [2.0.4] - 2026-03-02

### Updated

- Documented Phase 4 control-plane state:
  - `README.md` now includes Phase 4 runner → Postgres → Vercel verification workflow.
  - `VERCEL.MD` rewritten to reflect deployed architecture and 운영 체크리스트.
  - `UPGRADE_GRAND_PLAN.md` V2 기준으로 경로/배포/Phase4 체크 상태를 동기화.
  - `ARCHITECTURE.md` and `docs/ARCHITECTURE.md` updated with DB dedup + dashboard read-path notes.
- `main.py`/monitor entry docs now explicitly include execution path guard and monitor runner command for consistency.

## [2.0.3] - 2026-03-02

### Changed

- Canonical repository operation is fixed to `macho715/iran-war-notelm`.
- README quick-start commands and canonical path examples now reference `iran-war-notelm`.
- Legacy repository references to `iran-war-uae-monitor` are retained only as historical context.

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
