# Iran-UAE Monitor (Canonical v2.0.4)

Canonical runtime path:
`C:\Users\jichu\Downloads\iran-war-notelm-main\iran-war-uae-monitor`

## What This Includes

- Phase 1 + Phase 2 integrated pipeline (`src/iran_monitor/app.py`)
- A(JSON/JSONL) + B(SQLite) persistence via `persist_run(...)`
- Immediate alert + periodic report send
- Telegram report chunking (4096 chars) + Markdown parse fallback
- Outbox mirror for sent payloads
- Runtime path diagnostics and deprecated wrapper compatibility

## Run

```powershell
cd C:\Users\jichu\Downloads\iran-war-notelm-main\iran-war-uae-monitor
python scripts/check_runtime_paths.py
powershell -ExecutionPolicy Bypass -File scripts/cleanup_duplicate_monitors.ps1 -DryRun
python scripts/run_monitor.py
```

One-shot run:

```powershell
python scripts/run_now.py
```

## Single Instance Guard

- Default enabled via lock file: `state/monitor.lock`
- Config keys:
  - `SINGLE_INSTANCE_GUARD_ENABLED=true`
  - `SINGLE_INSTANCE_LOCK_FILE=state/monitor.lock`
- If another live instance holds the lock, new process exits without starting scheduler.

Duplicate cleanup (keep newest process only):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/cleanup_duplicate_monitors.ps1
```

## Storage Layout

After first successful cycle:

```text
reports/YYYY-MM-DD/HH-00.json
reports/YYYY-MM-DD.jsonl
db/iran_monitor.sqlite
outbox/YYYY-MM-DD/
ledger/run_YYYY-MM-DD.jsonl
state/seen_articles.json
state/nblm_rotation.json
state/monitor.lock          # runtime: single-instance lock (created on run, removed on exit)
exports/notebooklm/
```

## Tests

```powershell
python -m pytest -q
```

## Deprecated Root Entry

`C:\Users\jichu\Downloads\iran-war-notelm-main\main.py` is now a compatibility wrapper only.
It forwards execution to `iran-war-uae-monitor/scripts/run_monitor.py`.
