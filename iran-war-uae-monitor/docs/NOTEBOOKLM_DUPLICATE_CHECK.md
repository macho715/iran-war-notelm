# NotebookLM 자료 중복 체크

## 실행 방법

1. NotebookLM 로그인 (인증 만료 시):
   ```bash
   nlm login
   ```

2. 중복 체크 스크립트 실행:
   ```bash
   cd iran-war-uae-monitor
   python scripts/check_notebooklm_duplicates.py
   ```

## 스크립트 동작

- `.notebooklm_id`에서 노트북 ID 로드
- `get_notebook_sources_with_types()`로 소스 목록 조회
- 각 소스 `get_source_fulltext()`로 본문 추출
- `링크: https://...` 패턴으로 기사 URL 추출
- 동일 URL이 여러 소스에 있으면 중복으로 보고

## 코드 레벨 중복 위험

### 1. `_seen_hashes` vs `state/seen_articles.json` 분리

| 구분 | `_filter_new` (app.py) | `mark_seen_articles` (storage) |
|------|------------------------|--------------------------------|
| 저장 | 메모리만 (`_seen_hashes`) | `state/seen_articles.json` |
| 해시 | MD5(title+link) | SHA1(canonical_url) |
| 로드 | **시작 시 로드 없음** | persist_run 시 갱신 |

**영향**: 프로세스 재시작 후 `_seen_hashes`가 비어 있어, 이미 업로드된 기사가 다시 NotebookLM에 새 소스로 추가될 수 있음.

### 2. 소스 누적

- 매 실행마다 `add_text_source()`로 새 소스 추가
- 기존 소스 삭제/로테이션 없음
- 노트북 내 소스 수가 계속 증가

### 3. ledger 기준 현황 (2026-03-01)

- Run 1 (21:34): NotebookLM 업로드 성공, 56건
- Run 2 (22:26): `NOTEBOOK_UPLOAD_FAILED` — 업로드 미실행
- Run 3 (22:35): `NOTEBOOK_UPLOAD_FAILED` — 업로드 미실행

현재 NotebookLM에는 Run 1 소스 1개만 존재할 가능성이 높음.

## 재발 방지 제안

1. **`_filter_new`와 `seen_articles.json` 연동**
   - 앱 시작 시 `state/seen_articles.json`의 SHA1 목록 로드
   - `_filter_new`에서 URL 기준으로 중복 제거 (link → SHA1 변환 후 비교)

2. **소스 로테이션 (선택)**
   - `STORAGE_NOTEBOOK_ROTATION_CAP`(48) 초과 시
   - `delete_source()`로 가장 오래된 소스 삭제
