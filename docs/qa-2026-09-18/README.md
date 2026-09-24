# 상업 출시 전체 감사 (2026-09-18) — 진행 체크포인트

> **재개하는 세션은 여기부터 읽으세요.** 명령 전문: 소유자 바탕화면
> `k-ig core lab 실 전체 검수 명령어 수정본 2026-09-18.txt` (24절 + §0 프로젝트 사실).
> 대상: 운영 `https://k-ig-core.vercel.app` — `main` = `9d6e15d` (마지막 코드 커밋 `cf18537`), 응답 리전 `icn1`.
> 최종 보고서: `K-IG_Commercial_Release_Readiness_Report.md` (이 폴더).

## 9/21 21:3x — 소유자 요청으로 정지 (인터넷 차단). 전체 약 68%

**멈춘 상태 — 저장된 것은 온전합니다.** 정지 직후 `check-integrity.cjs` 결과 손상 0, 못 읽는 줄 0.
모든 작업은 기록된 지점부터 다시 이어집니다. 재개하려면:

```
powershell -NoProfile -ExecutionPolicy Bypass -File docs\qa-2026-09-18\scripts\run-grammar.ps1
```

**멈출 때 지점**

- GRAMMAR I 재점검 125칸 / 582 · GRAMMAR II 30칸 / 264 (합계 155 / 846)
- 교차검증 워크플로 `wf_95268e63-ea8` 중단. 끝난 회의론자 107명분을
  `scripts/recover-verdicts.cjs` 로 건져 **36건 판정을 원본에 반영 완료** (살아남음 34, 기각 2).
  미검증은 577 → **541건** (심각 3 · 높음 86 · 중간 169 · 낮음 283).
- **주의: 다시 검증을 걸 때는 `out/content-findings-unverified.json` 이 새로 쓰였으므로
  인덱스 목록을 반드시 다시 만들 것.** 옛 인덱스를 쓰면 엉뚱한 지적에 판정이 붙습니다.

## 9/22 12:5x — 현재 상태

**끝난 것**

| 항목 | 결과 |
|---|---|
| 유료 잠금 전수 | 1,623 / 1,623 잠김 |
| 기능 전수 스윕 6개 과정 | **NOT TESTED 0** · PASS 1,256 · FAIL 126 · BLOCKED 241 |
| GRAMMAR 자동채점 282강 전수 | 모범답안·대체답안 오채점 **0** |
| 유료 음성 클립 19,770개 전수 | 404 **378** · 오디오 아님 0 · 빈 파일 0 · 길이 이상 2 |
| 교육 내용 교차검증 | **미검증 0** — 통과 1,865 · 기각 210 (심각 3 · 높음 85) |
| 누락 · 무결성 · 위생 · STUDENT 해금 | 지적 최소, 치명적 0 |
| 보안 · 개인정보 · 상업 · 접근성 · SEO | 완료 (법정 표시 8종 전부 부재가 P1) |
| 공통기능 A~F | 완료 |
| 보고서 A~I 구조 + `verify-report.cjs` | 통과 38 · 문제 0 |

**돌고 있는 것** — 램 7.9GB 라 **동시에 2개까지만** 됩니다 (3개를 띄웠더니 세 번째가
`headless Edge did not open its debugging port` 로 죽었습니다)

- 음성 재검사 LISTENING 1,371건 (`--suffix -ld`, 포트 9631)
- 음성 재검사 READING·VOCA·STUDENT 1,305건 (`--suffix -rest`, 포트 9633)

**대기 중**

1. STUDENT 딕테이션 재점검 — 일시 중단, 기록 보존.
   `node scripts\drive-generic.cjs --course student --viewports desktop --suffix -tiles3 --redo --port 9623`
   (중복 낱말이 있는 문장은 감사 도구가 못 풀어 BLOCKED 로 남습니다 — 아래 한계 참조)
2. 조용해진 뒤 속도 재측정 (`run-queue-rest.ps1` 이 대기 중)
3. 최종 집계 → 보고서 숫자 갱신 → `verify-report.cjs` → 보고서 반박 검증

**소유자에게 전달한 명령서 3종**

| 언제 | 파일 |
|---|---|
| 문제를 고칠 때 | `PROMPT-수정작업.md` |
| 한 묶음 고친 뒤 | `PROMPT-수정후-재점검.md` |
| 전부 고친 뒤 최종 판정 | `PROMPT-최종-출시관문.md` |

**감사 도구의 한계로 남는 것**

STUDENT 탭-딕테이션에서 **같은 낱말이 두 번 나오는 문장**을 도구가 조립하지 못합니다
(세 가지 방법으로 시도했으나 실패). 제품의 채점 자체는 ① 앱 로직으로 문장 2,217개 전수 통과,
② LISTENING 화면에서 255강 통과, ③ STUDENT `s1-1` 화면 통과로 확인돼 있습니다.
해당 강의는 **사유와 함께 BLOCKED** 로 남깁니다.

**기계 작업은 이제 자동으로 이어집니다**

```
powershell -NoProfile -ExecutionPolicy Bypass -File docs\qa-2026-09-18\scripts\run-queue.ps1
```

`run-queue.ps1` 이 아래 대기열을 **순서대로 알아서** 돌립니다. 한 번에 3칸을 넘기지 않고,
앞 작업이 끝나기를 기다렸다가 다음을 겁니다. 진행 상황은 `out\run-queue.log`.
컴퓨터를 껐다 켜도 같은 명령을 다시 넣으면 기록된 지점부터 이어집니다.

**대기열** (램 7.9GB라 한 번에 3칸까지)

1. GRAMMAR I·II 재점검 마저 — `scripts/run-grammar.ps1` (칸당 몇 분, 846칸이라 밤새 걸림)
2. LISTENING·STUDENT 탭-딕테이션 재점검 — `drive-generic.cjs --course ld --viewports desktop --suffix -tiles2 --redo`
   (도구를 고쳤으므로 기존 딕테이션 판정은 못 씁니다. STUDENT 도 같이.)
3. `audio-check.cjs --licensed` — 유료 클립 19,770개 전수
4. `recheck-audio.cjs` — RETEST 로 미뤄둔 음성 건
5. `drive-common.cjs --only E,F` · 조용한 상태에서 `measure-perf.cjs` 다시
6. `analyze-features.cjs` 로 최종 집계

**교육내용 검토 범위 — 전 강의 확인 완료**

`scripts/check-review-coverage.cjs` → 1,623강 중 1,605강이 이름으로 언급. 나머지 18강 확인 결과:
GRAMMAR I 9강은 본강의·짝강의와 문장이 완전히 같고(고유 문장 0), LISTENING 9강은 검토 기록에
본강의 이름으로 "EN+KO script rows" 로 남아 있습니다. **빠진 강의 없음.**

**오늘 새로 확정된 것** (자세한 건 `findings-log.md`)

- `AUDIO-404-01` **P1** — 음성 클립 378개가 운영에서 404, 강의 190개. 이용권 세션으로 확인했으므로 유료 차단이 아님.
- `LD-DUP-01` **P2** — LISTENING 한글 대본이 두 벌이고 화면은 한 벌만 씀. 문단 306개가 서로 다름 (강의 162개).
- `LD-GUIDE-01` · `MENU-LABEL-01` · `VOCA-CLIP-01` — P3.
- 누락 점검 통과: 목차↔주소, 강의번호, 데이터 파일, 제목, 문장·해석·단어뜻 누락 **0**.

**오탐으로 철회한 것 — 보고서에 올리면 안 됨**

- GRAMMAR "멈춤" 2,568건 → `window.confirm` 에 도구가 답하지 않은 것 (harness 수정).
- GRAMMAR 채점 실패 → 도구가 짝 강의를 낡은 `pairId` 로 잡아 **영어 답란에 한국어**를 넣었음 (expectations `pairOf` 로 수정).
- LISTENING 딕테이션 오답 164건 → 도구가 이미 놓은 단어 블록을 다시 눌러 뺐음 (solveTiles 수정). 앱 로직은 문장 2,217개 전부 정상.
- VOCA "Step 2 버튼 안 눌림" 585건 → 단계 탭이 아니라 Step 1 안의 링크 (STEP_BUTTONS 수정).
- LISTENING 한글 대본 누락 557건 → 도구가 죽은 사본과 비교했음 (expectations 수정). 안내문 1줄만 실제 누락.
- 옛 음성 파일 3,224개 누락 → 내 체크아웃에만 없고 운영은 정상 제공.

> 교훈: 수백~수천 건씩 한꺼번에 나오는 지적은 **먼저 도구를 의심할 것**. 위 6건 모두 그랬습니다.

## 규칙 (명령 §0 요약)

- **읽기 전용 감사.** 코드·콘텐츠·배포·운영 설정 변경 금지. CNN · GVA 제외.
- 범위: STUDENT 82 · VOCA 195 · GRAMMAR I 53 (+ 한국어 스크립트 페이지 141) · GRAMMAR II 44 (+44) · LISTENING 276 (+276) · READING 256 (+256). 레슨 906, 스크립트 페이지는 따로 셈.
- 유료 레슨은 **학습자로** 감사: 감사 프로필 `%TEMP%\kig-audit-licensed-profile` (LIFE, 소유자 등록). 이용권 코드·비밀번호·관리자 PIN 입력 금지.
  - 병렬 실행용으로 프로필을 **복사**해서 씀 (`%TEMP%\kig-audit-0918-<이름>`). 같은 기기 ID·같은 이용권, 새 기기 등록 없음. 서버에 동시 사용 감지 없음 (`deviceStorage.ts` 는 `lastSeenAt` 갱신만).
- `/admin/license` 는 읽기만. 버튼 누르지 않음. (앱 내 브라우저 창에 소유자가 PIN 입력함)
- 진도·완료·북마크 시험은 감사 이용권 데이터만 바꿈 → **바꾼 것 전부 기록** (`out/data-changes.md`).
- 이전 감사(`docs/qa-2026-09-17/`) 는 도구로만 씀. "고쳤다고 적혀 있음" 은 근거가 아님.
- 소유자·변호사 대기 항목은 출시 차단으로만 나열: 법률 문서, 구매 링크/결제(COM-04), 관리자 2FA, Vercel Hobby(COM-05), L-74/L-84, R-30, R-32, R-29/R-43/R-75.
- Vercel 사용량 제약 없음 (소유자, 2026-09-18).
- 작업자 = 점검자 = Claude. 독립 검수 없음 → 숫자·스크립트·운영 측정으로 증거.

## 접근 수단 (2026-09-18 03:1x 확인)

| 수단 | 상태 | 확인 |
|---|---|---|
| 감사 프로필 복사본 `%TEMP%\kig-audit-0918-<이름>` | LIFE | `scripts/check-paid-access.cjs` — 6개 과정 마지막 유료 강 잠금 없음 + 본문 문장 표시 6/6 |
| 앱 내 브라우저 창 탭 `tab-2` | 관리자 로그인 (소유자 PIN, 03:1x, 24시간 유지) | `/api/admin/check` authenticated:true. **읽기만.** |
| 주의 | 02:39 에 창이 로컬 `kig-prod-local`(localhost:3210) 로 바뀌며 창의 이용권·관리자 로그인이 지워졌음. 누가 켰는지 불명 (내 워크플로 기록엔 없음). 창에서 로컬 미리보기 누르지 말 것 | |

## 도구

- `scripts/lib/harness.cjs` — 복사본 프로필 실행, 음성/TTS 훅(재생 클립 경로·재생 성공·오류·브라우저 TTS 대체 감지), 3폭, 신뢰 클릭(줄 단위 좌표), 입력, JSONL 재개. `scripts/test-harness.cjs` 로 검증: READING pr100 문장 4개 클릭 → 기대 클립 4/4 재생.
- `scripts/probe-entitlement-all.cjs` — 무이용권 HTML+RSC 잠금 (리다이렉트 추적)
- `scripts/probe-bundle-leak-all.cjs` — 전 경로 공개 JS 23개 + 공개 JSON 에서 유료 문자열 전수
- `scripts/inventory.cjs` — 원천 인벤토리·구조 무결성

## 자동 재개 예약 없음 (9/19 00:4x 소유자가 취소)

- 월요일 자동 재개 예약은 소유자 요청으로 삭제. 예약된 작업·세션 예약 모두 0개.
- 재개는 소유자가 이 세션에서 "계속"이라고 할 때. 새 세션이 이어받을 경우를 위한 도구는 남겨 둠: `scripts/remaining-review-units.cjs` (남은 단위 계산), `scripts/workflows/content-review*.js` (`args.only` 지원).
- 오늘 밤 이 세션의 워크플로 결과는 `out/content-review-pass1.json`, `out/content-review-deep.json` 으로 저장해 둘 것.

## 9/19 00:3x 소유자 결정 — 이번 5시간 창만 쓰고 나머지는 월요일(9/22)

- 이번 창에서: 1차 검토 나머지 (LISTENING 2 + READING 지문 12, `args.skip = [vocaDict, vocaLessons]`) → 끝나면 심화 READING 카드 15 → 창이 남으면 VOCA 사전.
  - 1차의 구형 VOCA 단어표 3단위는 심화 20단위가 대체 → 생략. VOCA 사전은 심화 단어표 패스가 화면 뜻을 단어마다 봤으므로 우선순위 최하.
- 한도에 닿으면 멈춤. **금·토·일 예약은 모두 삭제** (자동 재개 없음).
- 월요일 "계속": ① `out/run-all.log` ALL DONE 아니면 `run-all.ps1` 재실행 ② 내용 검토 남은 단위 resume (같은 args, 필요 시 skip 조정) ③ 누락 점검 패스 ④ 분석 ⑤ 보고서.

## 20:11 — 스케줄러 하나로 교체 (`scripts/run-all.ps1`, 기록 `out/run-all.log`, 작업별 `out/job-*.log`)

- 인터넷은 약 12시간(~9/19 08:10)만 쓸 수 있고, 소유자는 9/19 아침 컴퓨터를 끄고 **월요일(9/22) 오전 "계속"** 예정.
- VOCA 점검이 메모리 부족(Edge 시작 시 `timeout Page.enable`)으로 시작하자마자 죽었었음 → 동시 브라우저 3개 상한, 시작 20초 간격, 탭 열기 재시도.
- LISTENING 을 3조각(`ld-s1..s3`)으로 나눠 가장 긴 작업부터. 이미 끝난 방문은 모든 `ld*.jsonl` 을 합쳐 건너뜀.
- **오프라인 가드**: 인터넷이 끊기면 기록하지 않고 기다림 (drive-generic, audio-check, recheck-audio).
- 순서: ① 과정 점검 8작업 → ② 다시 한 번 재개 패스 → ③ 음성 단독 재확인·이용권 클립 전수·공통 E/F → ④ 조용한 시간 성능 → ⑤ 요약.
- **월요일 "계속" 시**: `out/run-all.log` 가 ALL DONE 인지 확인 → 아니면 `powershell -File docs/qa-2026-09-18/scripts/run-all.ps1` 다시 실행(재개됨). 동시에 내용 검토 워크플로 2개 resume → 누락 점검 → 분석 → 보고서.

## 소유자 결정 (2026-09-18 20:1x) — 주간 사용량 초기화까지 대기

- 주간 사용량 88% (초기화 **2026-09-21 05:00 KST**). 소유자: **추가 비용 없이 초기화를 기다린다.**
- 그때까지 **내용 검토 워크플로는 재개하지 않음** (1차 58/98, 심화 29/44 에서 정지 — 캐시로 이어짐).
- 토큰이 들지 않는 로컬 작업은 계속: 기능 점검 대기열 `queue-sweeps.ps1` (A: VOCA→STUDENT, B: GRAMMAR I→II), 그 뒤 `post-sweeps.ps1` (음성 재확인 → 이용권 클립 전수 → 공통 E·F → 접근성 → 조용한 시간 성능 → 요약). 진행 기록 `out/post-sweeps.log`.
- 예약: 9/19 12:13·9/20 12:13 가벼운 점검(죽은 기능 점검만 재기동), **9/21 05:17 내용 검토 재개 → 누락 점검 → 분석 → 최종 보고서.** (세션 전용 예약 — 앱을 닫으면 사라짐)
- 측정한 비용 근거: 1차 검토 단위당 약 $2.4, 심화 약 $1.8 (서브에이전트 기록 합산, Opus 5 단가).

## 재개 (2026-09-18 19:2x) — 돌고 있는 것

- 기능 점검 READING·LISTENING (탭 3개씩). 대기열 `scripts/queue-sweeps.ps1`: 접근성 끝나면 VOCA→STUDENT, READING 끝나면 GRAMMAR I→II.
- 드라이버 보정 (19:4x): 여러 탭 중 가려진 탭은 사이트가 소리를 멈춤 → 모든 탭을 보이는 탭으로 취급, 배경 탭 스로틀 해제 플래그. 이전 클립의 늦은 이벤트로 대기가 끊기던 문제 수정. 재클릭 제거. 애매한 음성은 RETEST → `scripts/recheck-audio.cjs` 로 단독 재확인 (시험 12/12 PASS).
- 내용 1차 검토 `wf_47718ff2-021`, 심화 `wf_09d9ffc2-30f` 재개.
- 접근성 `check-a11y.cjs` — 테마를 localStorage 로 강제 (사이트가 OS 설정보다 저장값을 먼저 따름).

## 중단 지점 2 (2026-09-18 오후, 인터넷 차단으로 정지) — 전체 39%

끝난 것: 구조·데이터 무결성 / 무이용권 잠금 1,623주소 / 공개 JS 유출 / 음성 클립 19,770개 무이용권 잠금 / 채점 전수 시험 / 보안 24항목 / 상업·법률·SEO / 성능 2회 / 관리자 읽기 / 공통기능 A~D.
진행 중이던 것과 재개 명령:

| 남은 일 | 재개 명령 |
|---|---|
| 기능 전수 점검 READING 317/1,536 · LISTENING 138/1,656 (JSONL 이어쓰기로 재개 — 2026-09-24 부터는 `--resume` 을 붙여야 이어 함, 7단계 7-1 l) | `node docs/qa-2026-09-18/scripts/drive-generic.cjs --course reading --viewports desktop,mobile,tablet --tabs 3 --port 9510 --resume` / 같은 명령의 `--course ld --port 9520` |
| 기능 전수 점검 미착수 4개 과정 | 위 명령에서 `--course phonics|grammar1|grammar2|student` (포트 다르게) |
| 내용 1차 검토 40/98 | `Workflow({scriptPath: <kig-content-review-wf_9c0b6ff0-b2a.js>, resumeFromRunId: "wf_47718ff2-021", args: <out/review-args.json>})` |
| 내용 심화(VOCA 단어표 20단위 + READING 카드 24단위) | `Workflow({scriptPath: <kig-content-review-deep-wf_09d9ffc2-30f.js>, resumeFromRunId: "wf_09d9ffc2-30f", args: {phonics:[...195개], readingCardRows:3585}})` |
| 누락 점검(completeness) 패스 | 1차 검토가 끝난 뒤 |
| 음성 클립 이용권 내려받기·길이 검사 | `node docs/qa-2026-09-18/scripts/audio-check.cjs --licensed` |
| 접근성 (대비·키보드·포커스) | `node docs/qa-2026-09-18/scripts/check-a11y.cjs` |
| 공통기능 E·F | `node docs/qa-2026-09-18/scripts/drive-common.cjs --only E,F` |
| 최종 보고서 | `K-IG_Commercial_Release_Readiness_Report.md` |

## 중단 지점 1 (2026-09-18 08:0x, 인터넷 차단 예정으로 정지)

- 진행률 대략 **15%**. 아래 표의 상태 칸이 기준.
- 돌던 작업은 모두 정지했습니다 (드라이버 스모크, 브라우저). 인터넷이 없으면 운영 점검·에이전트 모두 불가.
- **재개 방법**: 인터넷 복구 후 이 파일을 읽고 ① 전수 드라이버 `scripts/drive-generic.cjs` 를 과정별로 실행 (`--course <slug> --tabs 3 --viewports desktop,mobile,tablet --resume`, JSONL 이어쓰기로 재개 — 2026-09-24 부터 `--resume` 이 있어야 이어 함, 없으면 기록이 있는 파일에서 멈춤) ② 내용 검토 워크플로 재개 (§7 행의 명령) ③ 음성 전수·관리자·접근성 순.
- 주의: **인터넷이 끊긴 상태로 드라이버를 돌리지 마세요.** 모든 페이지가 "로드 실패"로 기록되고 그 기록이 "검사 완료"로 남습니다.

## 단계

| # | 단계 | 상태 | 산출물 |
|---|---|---|---|
| 0 | 준비 — 배포 확인, 도구 파악 | 완료 | 이 파일 |
| 1 | 과정별 화면·기능 지도 (소스 읽기) | 완료 (wf_b52a23d9-d50, 8개) — 위험 요약 `out/map-summaries.md` (미검증) | `maps/*.md` |
| 1b | 전수 드라이버 제작·스모크 (과정 6 + 공통 + 음성) | 진행 중 — 워크플로 `wf_2848dc33-c98` | `scripts/drive-*.cjs`, `audio-*.cjs` |
| 2 | 원천 데이터 인벤토리 · 데이터 무결성 | 1차 완료 (`inventory.cjs`) — 과정별 심화 검사 남음 | `out/inventory.json`, `phase2-inventory.md` |
| 3 | 접근 제어 (무이용권 전 레슨·음원·공개 JS) | 레슨 1,623/1,623 잠금 PASS (24개는 문구만), 공개 JS 유료 문자열 0, 검색 색인은 제목만 · **음원 게이트 남음** | `phase3-access.md` |
| 4 | 이용권 전 레슨 렌더링 × 3폭 + 원천 1:1 대조 | 대기 | `phase4-render.md` |
| 5 | 과정별 기능 실행 (정답/오답·재생·받아쓰기·북마크·완료·검색·이동) | 대기 | `phase5-features-*.md` |
| 6 | 음성 전수 (클립 존재·길이·매핑·실제 재생) | 대기 | `phase6-audio.md` |
| 7b | 교육 내용 보강 패스 (소유자 요청, 2026-09-18) | 대기 — ① VOCA 단어표 3단위→20단위(단위당 ~290단어) ② READING 어휘 카드 3,584장 전용 패스(단위당 150장) ③ 과정별 누락 점검(completeness) 패스 | `content-review/` |
| 7 | 교육 내용 전수 검토 | 진행 중 — 워크플로 `wf_47718ff2-021` (검토 98단위 → 발견마다 반박 검증: Critical/High 3명, Medium/Low 1명). 재개: `Workflow({scriptPath: <kig-content-review-wf_9c0b6ff0-b2a.js>, resumeFromRunId: "wf_47718ff2-021", args: <out/review-args.json 내용>})`. 입력 덤프 `out/content/*` (`dump-*.cjs`) | `content-review/*.md` |
| 8 | UX·접근성·반응형·성능 | 성능 1차 측정 중 (`measure-perf.cjs` anon+licensed, 03:40~). ⚠ 드라이버 스모크와 겹쳐 CPU 경합 가능 → 조용한 시간에 재측정해 비교 | `phase8-ux-perf.md` |
| 9 | 보안·개인정보·상업·관리자 | 대기 | `phase9-security-admin.md` |
| 10 | 0 커버리지 확인 · 최종 보고 | 대기 | 보고서 |
