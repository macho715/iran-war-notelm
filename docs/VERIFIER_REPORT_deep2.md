# Deep2 Gate Review — upgrade-verifier (2026-03-02)

입력: Current State Snapshot + DEEP_REPORT_upgrade-deep-synth.md (Deep Synth Output).

---

## 1) PASS/FAIL Table (Best3 focus)


| Idea                                   | Tier  | Verdict   | Why                                                                                                             | Required checks                                  | Minimal tests                       |
| -------------------------------------- | ----- | --------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| APScheduler 이벤트 모니터링                   | Best3 | **PASS**  | Evidence≥2, 날짜 충족(Cronradar 2025-06-01, PyPI 2025-01-01). PR≥3, Tests·Rollout·KPIs 정의됨. 스택(APScheduler 3.x) 호환. | 리스너 등록 시 기존 job 동작 유지, 플래그 기본 false              | EVENT_JOB_ERROR/MISSED 콜백 호출, 로그 출력 |
| Playwright async + timeout/networkidle | Best3 | **AMBER** | Evidence 2건이지만 1건 published_date 없음(공식 docs). Deep Dive 완전성 충족. 적용 시 스크래퍼 회귀 없을 것 확인 필요.                        | uae_media·social_media 기존 테스트 통과, timeout 시 빈 결과 | 스크래퍼 테스트, 타임아웃 mock                 |
| Observability 헬스/메트릭 + 실패 알림           | Best3 | **AMBER** | Evidence 2건, repo+공식 docs로 published_date 없음. PR·Tests·Rollout 정의됨. 기존 .health_state.json 소비처 호환 확인 필요.         | health 응답 스키마 하위 호환, 알림 플래그 기본 false             | health 테스트, 실패 시 알림 mock 1회         |


---

## 2) Apply Gates (Mandatory)


| Gate                              | 내용                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Gate 0: Dry-run**               | 설정/스키마만 변경(docs, config 플래그 추가). 코드 적용 없이 PR1 범위만 문서·설정으로 검토.                                                                    |
| **Gate 1: Change list**           | 예상 변경: main.py(리스너), config.py(플래그), health.py(스키마), reporter.py(알림), scrapers/uae_media.py·social_media.py(timeout). tests/ 확장. |
| **Gate 2: Explicit approval**     | APPROVE_SEND 또는 동일한 명시적 승인 없이 알림/전송 경로 활성화 금지. 배포 전 승인 체크리스트 서명.                                                                 |
| **Gate 3: Canary / Feature flag** | SCHEDULER_ALERT_ENABLED, HEALTH_ALERT_ENABLED, (선택) PLAYWRIGHT_STRICT_TIMEOUT. 기본 false, 단계적 true.                               |
| **Gate 4: Rollback plan**         | 플래그 false로 즉시 알림 비활성화. 리스너 제거 또는 PR revert. health 스키마는 하위 호환 유지해 롤백 시 기존 클라이언트 동작.                                              |


---

## 3) Rollout & Rollback Triggers

**Rollout triggers**

- Gate 0~2 통과, 테스트 그린, 승인 완료.
- 스테이징(또는 GHA 1회 run)에서 리스너·헬스·스크래퍼 동작 확인 후 프로덕션.

**Rollback triggers**

- 알림 스팸 또는 false positive 급증.
- 스크래퍼 성공률 일시 하락(예: <90%).
- 헬스 엔드포인트 오류율 상승 또는 기존 소비처 오동작.
- GHA run 실패가 Best3 변경으로 인한 경우.

---

## 4) Minimal Test Matrix


| Test Type   | Scope                                | Must/Should | Tooling hint                           |
| ----------- | ------------------------------------ | ----------- | -------------------------------------- |
| Unit        | 리스너 콜백, health 스키마, 알림 호출 1회         | Must        | pytest, mock scheduler / mock reporter |
| Integration | 스크래퍼 timeout 시 빈 결과, health.py 응답 형식 | Must        | pytest, httpx mock or local            |
| E2E         | GHA 1회 run_now 후 로그에 리스너/헬스 항목       | Should      | .github/workflows                      |
| Regression  | 기존 스크래퍼 수집 건수·reporter 전송            | Must        | 기존 테스트 스위트                             |


---

## 5) PR Plan Sanity Check


| Best#             | PR 순서                                     | 타당성                  | 의존성                    | 대체 경로 / 브레이킹                         |
| ----------------- | ----------------------------------------- | -------------------- | ---------------------- | ------------------------------------ |
| 1 (APScheduler)   | PR1 리스너 → PR2 알림 → PR3 GHA                | OK. 로그 먼저, 알림은 플래그로. | PR2는 PR1에 의존. PR3는 선택. | 리스너만 두고 알림 영구 끄기 가능.                 |
| 2 (Playwright)    | PR1 uae_media → PR2 social_media → PR3 상수 | OK. 스크래퍼별 격리.        | PR3는 PR1·PR2 후 추출.     | domcontentloaded만 쓰면 networkidle 제거. |
| 3 (Observability) | PR1 스키마 → PR2 알림 → PR3 GHA                | OK. 스키마 고정 후 알림.     | PR2는 PR1·reporter 의존.  | 알림 없이 스키마만 배포 가능.                    |


- PR1~3 간 크로스 의존성 없음. Best3 간 적용 순서: APScheduler → Observability → Playwright 권장(Implementation Notes와 일치).
- 브레이킹: 기존 `.health_state.json` 필드 제거 시 소비처 영향; 스키마는 추가 필드만 권장.

---

## 6) AMBER / Open Questions (≤3)

1. **Playwright·Observability AMBER:** 공식 docs/repo evidence에 published_date 없음. 적용은 진행 가능하나, 추후 출처 날짜 확보 시 Evidence 갱신 권장.
2. **APScheduler 4.0 alpha:** 3.x 리스너로 충분한지, 4.0 `reap_abandoned_jobs` 도입 시점(안정화 후) 검토.
3. **GHA 헬스 단계:** Best3 PR3들이 선택 사항인데, GHA에서 헬스 검사 단계를 넣을지(실패 시 빌드 실패 vs 경고만) 정책 확정 필요.

---

## 7) Final Go/No-Go

**GO if**

- Best3 모두 PASS 또는 AMBER(날짜만 미충족). FAIL 없음.
- Apply Gates 0~4 정의됨, 롤백 트리거·테스트 매트릭스 명시됨.
- 추정 출처/추정 날짜 0건(미추정).

**NO-GO if**

- Best3 중 Evidence 부정확·날짜 위조·스택 비호환으로 FAIL 발생 시.
- Apply Gate 2(명시적 승인) 미완료 시.
- 롤백 경로 없이 알림/전송 활성화 시.

**결론:** **GO.**  

- APScheduler PASS, Playwright·Observability AMBER(날짜 불완전만).  
- Apply Gates 0~4, Rollback Triggers, Test Matrix, PR Sanity Check 충족.  
- AMBER 3건은 오픈 질문으로 남기고, 적용은 단계적 플래그·테스트로 진행 권장.

