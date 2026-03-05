# HyIE-ERC² Real-Time Runbook

## 목적
- 15분 주기로 공개 소스(TIER0~2)를 수집하고 `I01~I07`, `routes`, `ERC²` 상태를 계산한다.
- 계산 결과를 `STORAGE_ROOT/state/hyie_state.json` 및 `urgentdash_snapshots/*.jsonl`에 저장한다.
- 대시보드는 `/api/state`를 우선 조회하고 실패 시 snapshot JSONL을 fallback으로 사용한다.

## 수집 소스 매핑

### TIER0 (15~30분)
- `ae.usembassy.gov`, `0404.go.kr`, `gov.uk/.../uae`: `I01`, `I07`
- `etihad.com`, `emirates.com`, `gcaa.gov.ae`: `I02`
- `mod.gov.ae`: `I03`

### TIER1 (15~30분)
- Reuters/BBC/CNN/Al Jazeera: `I03`
- Canada advisory: `I04`
- Downdetector/AWS/Azure status: `I05`
- Nation Thailand/NDTV: `I07`

### TIER2 (30~60분)
- The National/Khaleej Times/Gulf News: `I06`
- Waze/Oman border/Fujairah port: `I04` + route congestion hints

## 상태 파일
- 실시간 상태: `state/hyie_state.json`
- 대시보드 fallback: `urgentdash_snapshots/YYYY-MM-DD.jsonl`
- 시간 버킷 스냅샷: `urgentdash_snapshots/YYYY-MM-DD/HH-00.json`
- 보고 요약 append: `reports/YYYY-MM-DD.jsonl` (`kind=hyie_state`)

## 운영 명령
```bash
# 1회 수집/계산 실행
python scripts/run_now.py --dry-run

# 상태 API 확인
uvicorn src.iran_monitor.health:app --host 0.0.0.0 --port 8000
curl http://localhost:8000/api/state
```

## degraded 해석
- `degraded=true`: 소스 실패 비율이 높거나(`>=40%`) 통신 장애 트리거 발생.
- `flags` 확인:
  - `SOURCE_DEGRADED`
  - `SOURCE_FAILURES:*`
  - `EGRESS_ETA_MISSING`

## 장애 대응
1. `state/hyie_state.json`이 없으면 `warming_up` 상태가 정상.
2. 소스 다수 실패 시 네트워크/접근 차단 여부를 먼저 확인.
3. `/api/state` 실패 시 대시보드는 `urgentdash_snapshots/*.jsonl` fallback으로 계속 동작.
4. 강제 재실행: `python scripts/run_now.py --dry-run`.
