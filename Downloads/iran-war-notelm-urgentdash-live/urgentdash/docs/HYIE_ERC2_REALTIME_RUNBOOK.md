# HyIE-ERC² Real-Time Runbook

## 목적
- 15분 주기로 공개 소스(TIER0~2)를 수집하고 `I01~I07`, `routes`, `ERC²` 상태를 계산한다.
- 계산 결과를 `STORAGE_ROOT/state/hyie_state.json` 및 `urgentdash_snapshots/*.jsonl`에 저장한다.
- 대시보드는 `/api/state`를 우선 조회하고 실패 시 snapshot JSONL을 fallback으로 사용한다.

## 데이터 소스 우선순위 (고정 정책)
- 결정 문서: `dashboard_bundle/docs/ADR_STATE_SOURCE_PRIORITY.md`
- UI candidate 우선순위:
  1. `/api/state`
  2. `raw.githubusercontent.com/.../urgentdash-live/live/hyie_state.json`
  3. 상대 경로 fallback (`../api/state`, `api/state`, snapshot/json)
- 운영 관찰성 기준:
  - `/api/state`가 primary 경로여야 `/metrics` 지표가 실제 사용자 트래픽을 반영한다.

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
- 전황 수치 수동 오버라이드: `state/hyie_conflict_stats.json`
- 대시보드 fallback: `urgentdash_snapshots/YYYY-MM-DD.jsonl`
- 시간 버킷 스냅샷: `urgentdash_snapshots/YYYY-MM-DD/HH-00.json`
- 보고 요약 append: `reports/YYYY-MM-DD.jsonl` (`kind=hyie_state`)

## 운영 명령
```bash
# 1회 수집/계산 실행
python dashboard_bundle/scripts/run_now.py --dry-run

# 상태 API 확인
uvicorn src.iran_monitor.health:app --host 0.0.0.0 --port 8000
curl http://localhost:8000/api/state
curl http://localhost:8000/metrics

# conflict_stats 조회
curl http://localhost:8000/api/state/conflict-stats

# conflict_stats 수동 갱신 (partial update 가능)
curl -X POST http://localhost:8000/api/state/conflict-stats ^
  -H "Content-Type: application/json" ^
  -d "{\"missiles_total\": 170, \"casualties_kia\": 4, \"conflict_start_date\": \"2026-02-28\"}"
```

## `/api/state` conflict_stats 필드
- `missiles_total`, `missiles_intercepted`
- `drones_total`, `drones_destroyed`
- `casualties_kia`, `casualties_wia`
- `conflict_start_date`, `conflict_day`, `source`, `updated_at`

우선순위는 `manual file > auto extraction > fallback`이며, `source=fallback`이면 대시보드에서 경고 상태로 취급한다.

## Observability 점검
- API 기본 헤더:
  - `/api/state` 응답에 `X-State-Source`가 포함된다 (`state_file`, `warming_up` 등).
- `/metrics` 기본 확인 포인트:
  - `http_requests_total`
  - `http_request_duration_seconds` 또는 `http_request_duration_highr_seconds`
  - handler 라벨에 `/api/state`가 집계되는지 확인
- 목표:
  - `/api/state` 경로가 raw fallback보다 높은 비율로 사용되어야 함.

## degraded 해석
- `degraded=true`: 소스 실패 비율이 높거나(`>=40%`) 통신 장애 트리거 발생.
- 판정 로직 (`src/iran_monitor/state_engine.py`):
  - `fail_ratio = len(failed_sources) / health_count`
  - `comms_degraded = (failed_tier0 >= 3) OR (failed_critical >= 5)`
  - `degraded = (fail_ratio >= 0.40) OR comms_degraded`
- `flags` 확인:
  - `SOURCE_DEGRADED`
  - `SOURCE_FAILURES:*` — 실패한 소스 ID 목록(최대 6개)
  - `EGRESS_ETA_MISSING`

## 소스 실패 유형 및 대응
| 유형 | 원인 | 예시 소스 | 대응 |
|------|------|-----------|------|
| 404 | URL 변경/삭제 | tier0_kr_mofa_0404 | 공식 사이트 URL 재확인 후 소스 정의 수정 |
| DNS | 호스트/네트워크 이슈 | tier1_azure_status | status.azure.com 도메인·네트워크 확인 |
| 403 | 차단/봇 방지 | tier1_downdetector_uae, tier1_manila_times, tier1_timeout_abudhabi | 대체 URL 또는 헤더 조정 검토 |
| SSL | 인증서 검증 실패 | tier1_ncema_alerts | CA/인증서 상태 확인 |
| 401 | 인증 필요 | tier1_reuters_world | 유료/구독 소스인 경우 제외 또는 API 전환 검토 |

- 소스 수집은 동작 중이지만 일부 공개 소스가 차단/인증/SSL/DNS로 실패하면 전체 상태가 degraded로 전환됨.
- 산출 파일(`hyie_state.json`, `hyie_source_cursor.json`, `reports/*.jsonl`, `reports/*/04-00.json`)은 계속 업데이트됨.

## 장애 대응
1. `state/hyie_state.json`이 없으면 `warming_up` 상태가 정상.
2. 소스 다수 실패 시 네트워크/접근 차단 여부를 먼저 확인. `SOURCE_FAILURES:*` 플래그로 실패 소스 ID 확인.
3. `/api/state` 실패 시 대시보드는 `urgentdash_snapshots/*.jsonl` fallback으로 계속 동작.
4. 강제 재실행: `python dashboard_bundle/scripts/run_now.py --dry-run`.
5. degraded 완화(선택): 실패 소스 URL/도메인 교체, `state_engine.py`의 `comms_degraded` 임계값(기본 3) 또는 `fail_ratio`(기본 0.40) 조정.
6. 전황 수치가 `n/a`로 보이면 `GET /api/state/conflict-stats`로 `source`를 확인하고, 필요 시 `POST /api/state/conflict-stats`로 수동 보정한다.

## CI 캐시 정책
- 현재 워크플로(`monitor.yml`, `urgentdash-live-publish.yml`, `backup-urgentdash.yml`)는 `actions/setup-python@v5` + `cache: pip`를 사용한다.
- 저장소 기준 의존성 파일은 루트 `requirements.txt` 단일 경로를 사용한다.
- 향후 requirements 파일이 서브디렉토리로 분리될 때만 `cache-dependency-path`를 활성화한다.

