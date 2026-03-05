# URGENTDASH Backup Runbook

> 대상: `scripts/backup_urgentdash.py`로 urgentdash 스냅샷을 백업/복구 점검하는 운영 절차

---

## 1) Preconditions

- 저장소 루트에서 실행한다.
- Python 환경과 의존성 설치가 완료되어 있다.
- 스냅샷 JSON 파일이 준비되어 있다.
- `STORAGE_ROOT`(기본 `.`)를 운영 경로에 맞게 설정했다.

예시:

```bash
# 기본값(.) 대신 별도 스토리지 루트를 쓰는 경우
export STORAGE_ROOT=/path/to/storage
```

---

## 2) Snapshot Schema Checklist

스냅샷 JSON은 반드시 아래 top-level 키를 모두 포함해야 한다.

- `intel_feed`
- `indicators`
- `hypotheses`
- `routes`
- `checklist`

참고 예제: `urgentdash/urgentdash_snapshot.example.json`

---

## 3) Dry-run (쓰기 없이 검증)

```bash
python scripts/backup_urgentdash.py urgentdash/urgentdash_snapshot.example.json --dry-run
```

기대 결과:

- `Dry-run OK:` 출력
- `Would save:` 출력 (시점별 JSON 예상 경로)
- `Would append:` 출력 (일별 JSONL 예상 경로)
- 실제 파일 생성/수정 없음

---

## 4) Real Backup (실제 저장)

```bash
# 기본 경로 사용 (urgentdash/urgentdash_snapshot.json)
python scripts/backup_urgentdash.py

# 명시적 파일 경로 사용
python scripts/backup_urgentdash.py urgentdash/urgentdash_snapshot.example.json
```

기대 결과:

- `Saved: .../urgentdash_snapshots/YYYY-MM-DD/HH-00.json`
- `Appended: .../urgentdash_snapshots/YYYY-MM-DD.jsonl`

---

## 5) Restore / Audit Check

1. 특정 시점 스냅샷 열기:
   - `STORAGE_ROOT/urgentdash_snapshots/YYYY-MM-DD/HH-00.json`
2. 당일 누적 로그 확인:
   - `STORAGE_ROOT/urgentdash_snapshots/YYYY-MM-DD.jsonl`
3. 감사 점검:
   - `snapshot_ts` 존재 여부
   - top-level 키 5개 존재 여부

---

## 6) Failure Handling

- 파일 없음:
  - 증상: `Error: snapshot file not found`
  - 조치: 스냅샷 경로 확인 후 재실행
- JSON 파싱 실패:
  - 증상: `Error: invalid JSON in snapshot file ...`
  - 조치: JSON 문법 수정 후 재실행
- 필수 키 누락:
  - 증상: `Error: snapshot JSON missing required top-level key(s): ...`
  - 조치: 누락 키 추가 후 재실행
- `STORAGE_ROOT` 오설정:
  - 증상: 예상 경로가 아닌 곳에 저장되거나 권한 오류 발생
  - 조치: `STORAGE_ROOT` 값과 쓰기 권한 확인 후 재실행
