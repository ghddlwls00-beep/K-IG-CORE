# docs/qa-2026-09-15/scripts — 색인

> QA 작업용 스크립트 모음입니다. **실행 전에 `PROGRESS.md` §4 "환경 함정"을 읽으세요.**
> (Turbopack dev 서버 문제, 샌드박스 링크 제약, 하드코딩된 출력 경로 등이 정리되어 있습니다.)

## 폴더 역할

| 위치 | 역할 |
|---|---|
| `scripts/` | 감사·계측 스크립트 + **KIG-006 엔진과 그 검증기** |
| `scripts/verify/` | 2차 세션 이후 **회귀 검증 프로브**. `<base>` 인자를 받아 운영에도 돌릴 수 있게 만든 것들이 있습니다 |
| `scripts/out/` | 프로브 출력 JSON. **gitignore** 대상 (`.gitignore:71`) |

## 임시 파일 정책

**엔진을 슬라이스해 쓰는 스크립트는 임시 파일을 만들지 않습니다.** `report-kig006.cjs` 는 모듈이 아니라 스크립트라서, 필요한 부분만 잘라 `new Function(...)` 으로 **메모리에서** 평가합니다(`__dirname` 을 넘겨주어 `evidence/` 상대경로가 맞게 풀립니다).

과거에는 `_eng-tmp.cjs` / `_engine-slice.cjs` / `.apply-kig006-engine.cjs` 를 `scripts/` 안에 쓰고 지웠는데, 프로세스가 강제 종료되면 파일이 남아 `git add -A` 에 딸려 들어갔습니다. 지금은 **디스크에 아무것도 쓰지 않습니다.** 새 스크립트를 추가할 때도 이 방식을 따르세요.

주의: `new Function` 은 `require` 와 달리 **셔뱅(`#!`)을 제거해 주지 않습니다.** 슬라이스 앞에서 `.replace(/^#!.*\n/, "")` 를 해야 `SyntaxError` 가 나지 않습니다.

## KIG-006 (괄호 대안 정답 엔진) — 핵심

| 스크립트 | 역할 | 실행 / 기대 출력 |
|---|---|---|
| `report-kig006.cjs` | **엔진 본체.** 검증 (1)~(8) 일괄 실행 + evidence 산출 | `node report-kig006.cjs` → 전 항목 `0 violations`, `primary=out-of-paren check : 8 rows, 0` |
| `apply-kig006.cjs` | **유일한 쓰기 경로.** 재실행 가능 이식기 (기본 dry-run) | `node apply-kig006.cjs` (확인) / `--write` (적용) / `--course grammar1` |
| `classify-kig006.cjs` | 셀 분류 산출 | `evidence/kig006-classification.json` 생성 |
| `measure-kig006.cjs` | 계측 | — |
| `inventory-multiparen.cjs` | 괄호 2개 이상 셀 목록 | — |
| `verify-kig006-multiparen.cjs` | 괄호 2개+ 경로 기대값 | `14 / 14` |
| `verify-kig006-determiners.cjs` | 말뭉치 한정사 행 | `rows: 47   failing: 0` |
| `verify-kig006-proposals.cjs` | 제안 기대값 + 프래그먼트 가드 | `0 fragment(s) wrongly accepted` |
| `verify-kig006-insert-semantics.cjs` | 선택 삽입 의미론 (한정사 전용 행에만 단어 수 규칙 적용) | `rows with problems: 0 / 17` |

`report-kig006.cjs` 는 `content/` 에 **쓰지 않습니다**(읽기 + evidence 산출). `content/` 를 바꾸는 경로는 `apply-kig006.cjs --write` 뿐입니다.

### 이식 순서

```bash
node docs/qa-2026-09-15/scripts/apply-kig006.cjs            # dry-run — 건수와 DRIFT 0 확인
node docs/qa-2026-09-15/scripts/apply-kig006.cjs --write    # 적용
node docs/qa-2026-09-15/scripts/verify/verify-kig006-terminator.cjs   # 종결부호 회귀
node docs/qa-2026-09-15/scripts/verify-kig006-multiparen.cjs
node docs/qa-2026-09-15/scripts/verify-kig006-determiners.cjs
node docs/qa-2026-09-15/scripts/verify-kig006-proposals.cjs
node docs/qa-2026-09-15/scripts/verify-kig006-insert-semantics.cjs
```

`apply-kig006.cjs` 는 **멱등**합니다(2회차 0건, 바이트 동일). 중간에 죽어도 다시 돌리면 됩니다.
`text` 가 바뀌면 **음성 클립 재생성이 필수**입니다 — 클립 키가 `text` 의 해시입니다. 자세한 절차는 `PROGRESS.md` §3.

## `scripts/verify/` 프로브 색인

KIG-006 관련:

| 스크립트 | 대상 |
|---|---|
| `verify-kig006-terminator.cjs` | 원문 종결부호가 `text`·모든 대안에 보존되는지 (3031파일 전수, dry-run). `clean()`·`terminate()` 수정 시 필수 |

2차 세션 (전부 `<base>` 인자를 받아 운영에도 실행 가능):

| 스크립트 | 대상 |
|---|---|
| `probe-kig019.cjs` / `verify-kig019.cjs` | VOCA 퀴즈 복수정답 |
| `verify-kig033.cjs` | Leitner 상태기계 (git에서 수정 전 구현을 로드해 양쪽 비교) |
| `verify-kig034-035.cjs` | WPM 상한 + 어휘 카드 번호 |
| `verify-kig036.cjs` / `measure-kig036.cjs` / `sweep-kig036.cjs` | 상단 내비·단계 탭 잘림 |
| `verify-count.cjs` | 8개 섹션 레슨 수 |
| `verify-grammar-reveal.cjs` | GRAMMAR Step1/Step2 정답 노출 격리 |
| `verify-ld-quiz-lock.cjs` | LISTENING Step1 정답 공개 후 선택 잠금 |
| `make-favicon.cjs` | `src/app/icon.svg` + `favicon.ico` 재생성 |

5차 세션 이후:

| 스크립트 | 대상 |
|---|---|
| `verify-metadata.cjs` | 라우트별 canonical 1개·경로 일치 + `og:*` 존재 (`<base>` 인자) |
| `verify-kig005.cjs` / `verify-kig005-browser.cjs` | GRAMMAR 채점 LCS — **`isEnglish()`를 컴포넌트에서 그대로 복사**하므로 컴포넌트 수정 시 같이 갱신할 것 |
| `measure-tts-coverage.cjs` / `attribute-reading-gap.cjs` | 음성 클립 커버리지 측정 / 결측 귀속 |

## 그 밖의 감사·계측 스크립트

| 스크립트 | 역할 |
|---|---|
| `audit-data.cjs` | 리포 데이터 전수 감사 → `evidence/data-audit-raw.json` |
| `crawl-prod.cjs` | 운영 크롤 (결과는 `scripts/out/` — mkdir 하지 않으므로 미리 만들 것) |
| `probe3.cjs` / `probe5.cjs` / `probe7.cjs` | 본문 유출·불일치 프로브 |
| `ui-harness.cjs` | CDP 브라우저 하네스 (headless Edge) |
| `make-fixture.cjs` | 로컬 유료 레슨 검증용 fixture (작업 후 삭제 필수) |
| `media-check.cjs` | 음원 존재 확인 |
| `aggregate.cjs` / `expected.cjs` / `voca-flags.cjs` | 집계·기대값·VOCA 플래그 |
| `analyze-gh1032.cjs` / `realign-gh1032.cjs` | gh1-032/033 재정렬 (아카이브 확정 전 **보류 중**) |
| `tsload.cjs` | TS 모듈 로더 (엔진을 transpile 해서 로드) |
| `play-verify.cjs` | 재생 검증 |
| `archive-probe.cjs` / `compare-archive.cjs` | 원본 아카이브 대조용. **2026-09-16 시점 미커밋** (작성자 미상) — 아카이브 도착 후 `ARCHIVE-PLAN.md` 와 함께 정리할 것 |
