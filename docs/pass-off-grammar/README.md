# docs/pass-off-grammar — 자료 지도

PASS-OFF GRAMMAR(교재 Pass-Off English Grammar 1·2·3 → STUDENT 옆 새 학습 섹션) 작업 자료입니다.

| 먼저 읽을 것 | 내용 |
|---|---|
| [`설계.md`](설계.md) | **기준 문서** — 사장님 결정, 레슨 67개 대응표, 5단계, 순서 잠금, 이용권, 채점, 음성, 단계·관문 |
| [`작업기록.md`](작업기록.md) | 결정 기록 — 사장님 말씀 원문, 사장님이 돌아오시면 하실 일, 진행 기록 |
| [`보고서/links-plan.html`](보고서/links-plan.html) | 사장님용 보고서 원본(게시본: https://claude.ai/artifact/2nVtT4BhKq7fj31jiMzEnn) |

## ⚠️ 통째로 읽지 말 것 (큰 파일)

| 파일 | 크기 | 대신 |
|---|---|---|
| `교재-추출/g*-p*.json` (7개) | 각 19만~34만 바이트(6만~10만 토큰) | `node -e` 로 필요한 topic · page 만 조회 |
| `검사/결과-문장대조.json` | 약 100만 바이트 | `node -e "const d=require('./docs/pass-off-grammar/검사/결과-문장대조.json'); console.log(d.summary)"` |
| `조사/*.json`, `설계-비교/*.json` | 각 2만~8만 바이트 | 필드 하나씩 |

## 폴더

- `교재-추출/` — 3권 191쪽 전 내용. 파일 하나가 쪽 범위 하나(`g1-p1-29.json` = 1권 1~29쪽).
  - 구조: `topics[].sections[]`. passOff · application 은 `groups[].items[]{page,en,ko,bold,tag,lessonRef,raw}`. review 는 `tasks[].items[]{prompt,answerFromBook,answerSource,proposedAnswer,extraSlot,extraSlotAnswer}`. 그 밖에 `issues[]{page,where,text,type,problem,fix,confidence}`.
  - 추출자가 더한 필드(파일마다 조금 다름): `studentMatch/studentSource`, `correctedAnswer/answerFix/promptFix`, `reviewRef/appRef`, `inferredSubPoint/impliedGroup/focusInferred`, `severity`, `accept/acceptAlso/altAnswersFromBook`.
  - `추출자-요약/book0~6.json` — 추출자 7명의 요약(범위 · 과제 유형 · 관찰 · 자체 점검).
  - `만든-스크립트/` — 추출에 쓴 스크립트. 원래 scratchpad 경로 기준이라 그대로는 안 돌아감. 기록용.
- `조사/` — `사이트-구조.json`(코드 지도, file:line), `학습과학.json`(근거 33개 + 출처), `제품-기술.json`(제품 18 · 기술 18).
- `설계-비교/` — 브리프, 설계 A(학습 효과) · B(학습자·시장) · C(만들기·운영), 심사 J1(학습) · J2(실현).
- `검사/` — 기계 검사 스크립트와 결과.
  - `post.cjs`: 추출 ↔ PDF 글자 대조 · STUDENT 대조 · 음성 존재. `--selftest-break` 로 일부러 깨기.
  - `coverage.cjs`: 한국어 번역 유무, 소주제 크기.
  - `issues.cjs`: 오류 후보를 종류별로 셈.
  - `inventory.cjs`: 주제별 목록.
  - `topic-table.cjs`: 부록 표.
  - `compare-pub.py`: 편집 원본(.pub) ↔ PDF 대조.
  - 스크립트는 `<scratchpad>/pdf/out/*.json` · `<scratchpad>/pdf/g1.txt` 배치를 가정합니다. 다시 돌리려면 `교재-추출/*.json` 을 `pdf/out/` 으로 복사하고, `교재-추출/만든-스크립트/extract.py` 로 PDF 글자층을 뽑으세요.

## 숫자 (2026-09-27, 스크립트로 잼)

- 레슨 67(1권 29 · 2권 23 · 3권 15) · 예문 줄 1,334(중복 제외 912) · 복습 문항 1,067(교재 안에서 정답 복원 954 = 89%)
- 한국어 번역 없는 문장 188 · 이미 음성 있는 문장 66 / 912
- 오류 후보 548(중복 제외 541): 뜻 불일치 146 · 영어 문법 109 · 어색한 영어 92 · 한국어 오타 78 · 문법 설명 49 · 정답 모호 30 · 조판 37 · 정답 없음 6 · 시대 사실 1
- "(N과)" 239줄: STUDENT 해당 장과 글자까지 같음 144 · 옛 middle 47 · 바꾼 문장 38 · 장 번호 오류 6 · 기타 4
