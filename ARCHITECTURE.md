# Architecture (v2.0.2)

## Pipeline

1. `scrape_uae_media` + `scrape_social_media` + `scrape_rss`
2. MD5 dedup (`_seen_hashes`)
3. NotebookLM upload + Phase2 analysis
4. Immediate alert for `HIGH|CRITICAL` (`send_telegram_alert` — 청킹 없음)
5. Report build + send (Telegram/WhatsApp)
   - Telegram: 4096자 초과 시 `_split_telegram_chunks`로 청크 분할, Markdown 파싱 실패 시 plain text 재전송
6. `persist_run(...)` for A+B storage
7. `.health_state.json` update

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

Threat levels are fixed to:
`LOW | MEDIUM | HIGH | CRITICAL`

## Canonical Paths

- App: `src/iran_monitor/app.py`
- Storage: `src/iran_monitor/storage.py`
- Adapter: `src/iran_monitor/storage_adapter.py`
- Runtime check: `scripts/check_runtime_paths.py`
