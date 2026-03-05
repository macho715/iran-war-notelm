# Deep2 Runbook (2-step deep pipeline)

## Step 1) Deep Report Only (upgrade-deep-synth)
### Prompt (copy-paste)
upgrade-deep-synth로 deep report만 작성.
입력은 아래 3개 블록만 사용하고, 외부 리서치/문서 스캔은 하지 마.
Best3는 evidence>=2 + (published_date 또는 updated_date 필수) 조건 통과한 것만 선정해.
출력은 deep report only(템플릿 그대로)로.

[CURRENT_STATE_SNAPSHOT]
(여기에 표/요약 붙여넣기)

[TOP10_IDEAS]
(여기에 Top10 표/리스트 붙여넣기: Impact/Effort/Risk/Conf/PriorityScore 포함)

[EVIDENCE_TABLE]
(여기에 Evidence Table 붙여넣기: platform/title/url/published_date/updated_date/accessed_date/popularity_metric 포함)

## Step 2) Gate + PASS/FAIL + Apply Plan (upgrade-verifier)
### Prompt (copy-paste)
upgrade-verifier로 "Deep2 Gate Review" 수행.
아래 deep-synth 결과를 입력으로 받아 Best3를 PASS/AMBER/FAIL로 판정하고,
적용 게이트(dry-run -> change list -> explicit approval)와 rollout/rollback 트리거,
필수 테스트 매트릭스까지 최종 Go/No-Go 결론을 내줘.
증거(출처/날짜) 누락은 절대 추정하지 말고 AMBER/FAIL로 처리.

[CURRENT_STATE_SNAPSHOT]
(동일 블록 재사용)

[DEEP_SYNTH_OUTPUT]
(여기에 upgrade-deep-synth 출력 전체 붙여넣기: Gate Summary + Deep Dive + JSON Envelope)
