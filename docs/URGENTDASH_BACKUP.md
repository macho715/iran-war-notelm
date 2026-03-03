# urgentdash 실시간 정보 백업 (iran-war-notelm 스크립트 활용)

## 요약

| 백업 대상 | 사용 스크립트 | 저장 위치 |
|----------|----------------|-----------|
| **스크래퍼 실시간 수집 데이터** | `scripts/run_now.py` (notelm 파이프라인) | `storage/reports/`, `storage/db/`, `storage/reports/*.jsonl` |
| **urgentdash 대시보드 스냅샷** | `scripts/backup_urgentdash.py` | `storage/urgentdash_snapshots/YYYY-MM-DD/HH-00.json`, `*.jsonl` |

두 방식 모두 **notelm의 스토리지 레이아웃**(`STORAGE_ROOT`, `ensure_layout`)을 사용한다.

---

## 1. 스크래퍼 실시간 정보 백업 (이미 동작 중)

notelm 모니터를 한 사이클 돌리면 수집·분석 결과가 자동으로 저장된다.

```bash
# 한 번 실행 (텔레그램 발송 없이 백업만)
python scripts/run_now.py --dry-run

# JSON 아카이브까지 강제 저장
python scripts/run_now.py --dry-run --json-archive
```

- **저장 내용**: RSS/UAE 언론/SNS 스크래퍼 결과 → dedup → Phase2 분석 → `persist_run_backend()`
- **경로**: `storage/reports/YYYY-MM-DD/HH-00.json`, `storage/reports/YYYY-MM-DD.jsonl`, `storage/db/iran_monitor.sqlite`

즉, **실시간 수집 기사·요약·위협수준**은 `run_now.py` 한 번 실행으로 백업된다.

---

## 2. urgentdash 대시보드 스냅샷 백업

urgentdash(INTEL_FEED, INDICATORS, HYPOTHESES, ROUTES, CHECKLIST)는 코드에 하드코딩되어 있으므로, **JSON으로 내보낸 뒤** notelm 스토리지에 넣는다.

### 2.1 urgentdash 데이터를 JSON으로 내보내기

**방법 A — 수동 JSON 파일 작성**

`urgentdash/urgentdash_snapshot.json`을 만들고 아래 형식으로 저장한다.

```json
{
  "intel_feed": [...],
  "indicators": [...],
  "hypotheses": [...],
  "routes": [...],
  "checklist": [...]
}
```

- `intel_feed`: `urgentdash/index.html` 또는 `hyie-erc2-dashboard.jsx`의 `INTEL_FEED` 배열 (ts, priority, verified, text, src, impact 등).
- `indicators`: `INDICATORS` 배열.
- `hypotheses`: `HYPOTHESES` 배열.
- `routes`: `ROUTES` 배열 (필드명은 `cong` 또는 `congestion` 중 사용하는 쪽에 맞춤).
- `checklist`: `CHECKLIST` / `CL_INIT` 배열.
- `backup_urgentdash.py`는 위 5개 top-level 키가 모두 있어야 통과한다.

**방법 B — 대시보드에서 내보내기 (구현 시)**

대시보드에 "Export JSON" 버튼을 두고, 현재 state를 위 구조의 JSON으로 다운로드하게 하면, 그 파일을 그대로 백업 스크립트에 넘길 수 있다.

### 2.2 백업 스크립트 실행

notelm의 `storage` 모듈(`ensure_layout`, `save_json`, `append_jsonl`, `iso_now`)을 사용해 같은 레이아웃에 저장한다.

```bash
# 기본 경로: urgentdash/urgentdash_snapshot.json
python scripts/backup_urgentdash.py

# 다른 JSON 파일 지정
python scripts/backup_urgentdash.py path/to/my_snapshot.json

# 쓰기 없이 검증 + 저장 경로 확인
python scripts/backup_urgentdash.py urgentdash/urgentdash_snapshot.example.json --dry-run
```

- **저장 위치**  
  - 시점별: `storage/urgentdash_snapshots/YYYY-MM-DD/HH-00.json`  
  - 일별 append: `storage/urgentdash_snapshots/YYYY-MM-DD.jsonl`  
- **환경**: `STORAGE_ROOT`는 notelm과 동일(`.env` 또는 `config`). `run_now.py`와 같은 저장소 루트를 쓰면 된다.
- **운영 절차(Runbook)**: `docs/runbooks/URGENTDASH_BACKUP_RUNBOOK.md`
- **실시간 상태 파이프라인(Runbook)**: `docs/runbooks/HYIE_ERC2_REALTIME_RUNBOOK.md`

---

## 3. 정기 백업 (선택)

- **스크래퍼**: 기존 cron/GHA로 `run_now.py` 주기 실행 → 실시간 수집 데이터는 이미 정기 백업됨.
- **urgentdash**:  
  - 수동으로 JSON 내보내기 후 `backup_urgentdash.py` 실행하거나,  
  - JSON 내보내기를 자동화한 뒤 같은 cron에서 `backup_urgentdash.py`만 추가 실행하면 된다.

---

## 4. 요약

- **실시간 정보** = (1) 스크래퍼 결과 + (2) urgentdash 스냅샷.
- (1)은 **`scripts/run_now.py`** 한 번 실행으로 `storage/reports/`, `storage/db/`에 백업됨.
- (2)는 **urgentdash 데이터를 JSON으로 만든 뒤** **`scripts/backup_urgentdash.py`**로 `storage/urgentdash_snapshots/`에 백업한다.  
- 두 스크립트 모두 iran-war-notelm의 스토리지 레이아웃과 설정(`STORAGE_ROOT`)을 공유한다.
