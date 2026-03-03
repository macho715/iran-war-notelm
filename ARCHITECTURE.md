# Architecture (v2.0.6)

## Pipeline

1. `scrape_uae_media` + `scrape_social_media` + `scrape_rss`
2. In-process + persistent dedup
   - run-local: `canonical_url`/`hash` 기준 `_seen_hashes`
   - persistent: Postgres/SQLite `canonical_url` 존재 여부 기반
3. NotebookLM upload + Phase2 analysis
4. Immediate alert for `HIGH|CRITICAL` (`send_telegram_alert`)
5. Report build + send (Telegram/WhatsApp)
   - Telegram: 4096자 초과 시 `_split_telegram_chunks`로 청크 분할, Markdown 파싱 실패 시 plain text 재전송
6. `persist_run(...)` for A+B storage
7. `.health_state.json` update
8. Scheduler observability:
   - APScheduler event listener on `EVENT_JOB_ERROR` and `EVENT_JOB_MISSED`
   - optional alerts via `SCHEDULER_ALERT_ENABLED` / `HEALTH_ALERT_ENABLED`
9. Health schema extension:
   - stores `last_run_ts` and `counts` (`new_count`, `total_count`, `unique_count`)
   - `/health` API preserves legacy fields while adding alias-compatible values

## Runtime Guard

- Single instance lock file: `state/monitor.lock`
- Entry path `scripts/run_monitor.py` -> `iran_monitor.app.run()` acquires lock before scheduler start
- Existing lock with live PID: startup exits immediately (no duplicate scheduler)
- Stale lock with dead PID: lock file auto-removed then startup continues
- Duplicate cleanup helper: `scripts/cleanup_duplicate_monitors.ps1`

## Storage Contracts

- `run`: built by `storage_adapter.build_run_payload(...)`
- `articles`: built by `storage_adapter.build_article_rows(...)`
- `outbox_msgs`: built by `storage_adapter.build_outbox_rows(...)`

## Config Defaults (Deep-Synth Observability)

- `SCHEDULER_ALERT_ENABLED: false`
- `HEALTH_ALERT_ENABLED: false`
- `SCRAPER_TIMEOUT_MS: 30000`
- `SCRAPER_WAIT_UNTIL: "domcontentloaded"`

Threat levels are fixed to:
`LOW | MEDIUM | HIGH | CRITICAL`

## Canonical Paths

- App: `src/iran_monitor/app.py`
- Storage: `src/iran_monitor/storage.py`
- Adapter: `src/iran_monitor/storage_adapter.py`
- Runtime check: `scripts/check_runtime_paths.py`
- Dashboard: `dashboard/` (read-only 조회, `DATABASE_URL` 기반)
