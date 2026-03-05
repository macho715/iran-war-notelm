# Iran–UAE Crisis Monitor — Storage Layer Template (SSOT=A/B)

이 템플릿은 **A(JSON/JSONL)** + **B(SQLite)** 저장을 즉시 적용하기 위한 최소 골격입니다.

## 1) 설치
- Python 3.9+ 권장(ZoneInfo 사용)

## 2) 초기화
```bash
python scripts/init_storage.py
```

## 3) 데모 실행(샘플 Run 저장)
```bash
python scripts/demo_hourly_job.py
python scripts/query_db.py
```

## 4) 실제 hourly_job에 붙일 때
- 분석 단계(run dict 생성) 이후 아래 1줄로 끝내세요:
```python
persist_run(ROOT, DB_PATH, SCHEMA_PATH, run=run, articles=articles, outbox_msgs=outbox_msgs)
```

> 전송(텔레그램/왓츠앱)은 **Outbox만 저장**하고, 별도 승인형 sender가 읽어서 처리하세요.

## 5) 권장 계약 (canonical 정렬)

- threat level은 `LOW|MEDIUM|HIGH|CRITICAL`로 통일 (`MED` 사용 지양)
- `storage_adapter.py`를 통해 `run/articles/outbox`를 생성하면 재사용성이 좋아집니다.

```python
from iran_monitor.storage import persist_run
from iran_monitor.storage_adapter import (
    build_run_payload,
    build_article_rows,
    build_outbox_rows,
)

run = build_run_payload(analysis=analysis, notebook_url=notebook_url, articles=raw_articles)
articles = build_article_rows(articles=raw_articles, run_ts=run["run_ts"])
outbox_msgs = build_outbox_rows(report_text=report_text, created_ts=run["run_ts"])

persist_run(ROOT, DB_PATH, SCHEMA_PATH, run=run, articles=articles, outbox_msgs=outbox_msgs)
```
