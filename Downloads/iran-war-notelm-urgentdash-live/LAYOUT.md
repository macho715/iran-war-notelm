# Layout (Canonical)

```text
iran-war-notelm-main/
  src/
    iran_monitor/
      app.py
      config.py
      reporter.py
      phase2_ai.py
      health.py
      storage.py
      storage_adapter.py
      storage_backend.py
      schema.sql
      schema_pg.sql
      scrapers/
        __init__.py
        uae_media.py
        social_media.py
        rss_feed.py

  scripts/
    check_runtime_paths.py
    cleanup_duplicate_monitors.ps1
    run_now.py
    run_monitor.py
    run_scrape.py

  dashboard/
    app/
    public/
    src/...

  tests/
    test_phase2_ai.py
    test_reporter_phase2.py
    test_reporter_telegram_chunking.py
    test_rss_feed.py
    test_runtime_paths.py
    test_main_phase2_flow.py
    test_storage_adapter.py
    test_storage_integration.py
    test_legacy_wrapper.py

  docs/
    ARCHITECTURE.md
    CHANGELOG.md
    LAYOUT.md

  .github/workflows/
    monitor.yml
  .agent/
  reports/
  db/
  state/
  outbox/
  ledger/
  exports/
    notebooklm/

  main.py
  reporter.py
  health.py
  phase2_ai.py
  config.py
  requirements.txt
  README.md
  UPGRADE_GRAND_PLAN.md
  VERCEL.MD
```
