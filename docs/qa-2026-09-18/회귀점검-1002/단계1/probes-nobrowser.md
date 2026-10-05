# 회귀 점검 1002 · 단계 1 · probes-nobrowser (브라우저 안 쓰는 운영 검사)

2026-10-04 15:39~15:47 · 작업 트리 `nostalgic-blackburn-048c73` · HEAD 7bfd5d7b · 대상 https://k-ig-core.vercel.app (읽기만)
**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 도구 · 내용 파일 안 바꿈 · 커밋 · 푸시 · R2 · 배포 0 · 이용권 코드 · PIN 0 · 브라우저 안 씀.
🔴 멈춤 조건(이용권 없이 열린 유료 주소 · 유료 본문 유출 · 결제/이용권 상태 변화) 보이지 않음.

## 표

| # | 시각 | 명령 | exit | 핵심 숫자 | 기대와 | 출력 파일 |
|---|---|---|---|---|---|---|
| 1 | 15:39:07~15:40:33 | `probe-entitlement-all.cjs` | 0 | 1,745 주소 1,745 PASS · **유료 잠김 1,713/1,713 (열림 0)** · **무료 열림 32/32** · 8과정 모두 유출 0 | 같음 | docs/qa-2026-09-18/out/entitlement-all.json |
| 2a | 15:40:55~15:41:04 | `audio-inventory.cjs` | 0 | 8과정 · 클립 17,292 · 무료 강의 클립 중 무료 목록에 없음 0 · 유료만 쓰는 클립 중 무료 목록에 있음 0 | 같음 | docs/qa-2026-09-18/out/audio-inventory.json |
| 2b | 15:41:04~15:42:08 | `audio-check.cjs --anon` | 0 | **무료 클립 열림 315/315 · 유료 막힘(403) 16,977/16,977 · 실패 0** · 옛 미디어 · 지어낸 주소 실패 0 · 목록 지문 '지금 내용과 같음' | 같음 | docs/qa-2026-09-18/out/audio-check-anon.json |
| 3 | 15:42:14 | `node scripts/buildFreeSpeechKeys.mjs --check` | **1** | `freeSpeechKeys.json is stale` · `freeMediaKeys.json is current (34 free lessons, 38 media keys)` | **다름** (아래 3번 메모) | (파일 없음 — 화면 출력만) |
| 4 | 15:42:15~15:44:11 | `probe-bundle-leak-all.cjs` | 0 | 쪽 1,764 · JS 조각 30 · 공개 JSON 1(/search-index.json 342KB) = 검사한 파일 1,795 · **유출 0** · ADULT 유료 53강의 바늘 2,621(유출 0) | 같음 | docs/qa-2026-09-18/out/bundle-leak-all.json |
| 5a | 15:45:23~15:45:47 | `$env:KIG_ENV_LOCAL=…; node scripts/generate-azure-ava.mjs --dry-run` | 0 | 항목 17,292 · 글자 597,935 · R2 54,805 · **pending 0**(8과정 모두 0, ADULT 1,427) · 첫 줄에 R2 경고 없음 | 같음 | (파일 없음 — 화면 출력만) |
| 5b | 15:45:55~15:46:18 | `check-completeness.cjs` (같은 환경변수) | 0 | **missing-clip 0**(이 컴퓨터 381 + R2 54,805) · exit 1 인 지적 없음 · `missing-legacy-audio` 3,228(이 컴퓨터에 옛 강의 녹음 없음 — 전과 같은 숫자, R2 에 있음) | 같음 | docs/qa-2026-09-18/out/completeness.json |
| 6a | 15:46:23 | `node docs/adult/korean-words-on-screen.cjs` | 0 | 글 칸 85,863 · 다섯 과정 한글만 · 다른 과정 0 — PASS | 같음 | (화면 출력만) |
| 6b | 15:46:24 | 〃 `--break` | 1 | 로마자 1곳 잡음: student/s20-4 'Gyeongju' | 같음(실패해야) | 〃 |
| 6c | 15:46:25 | 〃 `--break=grammar` | 1 | 로마자 5곳 잡음: grammar2/gh2-033 'Busan'·'Pusan' | 같음(실패해야) | 〃 |
| 6d | 15:46:26 | `node scripts/korean-words-hangul.mjs --check` | 0 | STUDENT · READING OK (32쪽, 제목 8) | 같음 | 〃 |
| 6e | 15:46:27 | `node scripts/build-adult-content.mjs --check` | 0 | ADULT content OK — 55강의 · 12장 | 같음 | 〃 |
| 7a | 15:46:32 | `check-media-gate.cjs` | 0 | 훑은 과정 9 · 미디어 2,715 · 1) 무료 34강의 파일 잠김 0/38 · 2) 유료만 쓰는 파일 무료로 열림 0/2,677 · 3) 지어낸 이름 0/102 · 4) 판정 갈림 0 · 5) 허용 폴더 밖 0 · **PASS** | 같음 | (화면 출력만) |
| 7b | 15:46:33 | `check-search.cjs` | 0 | 색인 1,028 항목 · CNN 0 · 유료 본문 0줄 0강(유료 문자열 48,903) · 이름 검색 차이 0 · **PASS** | 같음 | (화면 출력만) |
| 7c | 15:46:36 | `probe-security.cjs --no-mutating-routes` | 0 | **21 PASS / 0 FAIL / 10 건너뜀** (건너뜀 = 관리자 · 이용권 POST — 일부러) | 같음 | docs/qa-2026-09-18/out/security-probe.json |
| 7d | 15:46:44 | `check-unreached-data.cjs` | **1** | 아무 화면도 안 읽는 것 44가지 · 알고 있음 43 · **새로 찾음 1** · **낡은 줄 4** (목록 아래) | 같음(probes.md 가 알려 준 exit 1 · 새 1 · 낡은 4 와 일치) | (화면 출력만) |

## 메모

**1번 — 무료 32/32 대조.** `src/lib/license.ts` 의 `FREE_PREVIEW_LESSON_IDS` 를 직접 셈(CNN 뺌): student 2 + adult 2(a1-1 · a1-2) + passoff-grammar 2(pg01-1 · pg01-2) + phonics 2 + grammar1 12 + grammar2 4 + ld 4 + reading 4 = **32**. 도구의 과정별 무료 열림 합(2+12+4+4+2+2+4+2)과 같음. 유료 합 53+182+84+548+65+193+508+80 = 1,713 = 도구의 1,713.
ADULT a2-1~a12-3 유료 53/53 잠김 · PASS-OFF 65/65 잠김(주소 67 중 2 가 무료).
참고: 도구 표의 `noNeedle`(바늘 없는 주소) grammar1 1 · phonics 23 은 잠금 판정 PASS 와 별개로 '그 쪽에 유출 바늘로 쓸 글이 없다' 는 뜻의 숫자(전과 같은 종류 — 도구가 PASS 로 셈).

**3번 — `buildFreeSpeechKeys.mjs --check` exit 1 (기대와 다름).** 두 번 돌려 두 번 모두 exit 1.
원인을 알아보려고 스크립트 사본을 **임시 폴더**에서(저장소는 안 건드림) 돌려 새로 만든 결과와 견줌:
- 키 315개 · 무료 강의 32개 · 키 목록 **완전히 같음**(차이 0). 내용은 낡지 않았음.
- 작업 트리의 `src/lib/generated/freeSpeechKeys.json` 만 **줄바꿈이 CRLF**(`git ls-files --eol` → i/lf w/crlf; 같은 폴더 `freeMediaKeys.json` 은 w/lf 라 current) — 수정 시각 오늘 14:09. 커밋된 파일(HEAD blob)은 새로 만든 결과와 줄바꿈을 맞추면 **같음**.
- 즉 `--check` 는 바이트 비교라 이 작업 트리의 줄바꿈 때문에 stale 로 판정. 운영(커밋된 LF 파일)이 낡았다는 증거는 못 찾음. 그러나 **도구 결과는 '다름'** 으로 적는다 — 이 작업 트리 파일을 LF 로 되돌리거나 `node scripts/buildFreeSpeechKeys.mjs` 로 다시 쓰면 풀리는 일이지만 나는 안 고침(주 세션 몫). 운영 무료 소리 쪽은 2b 의 315/315 열림이 직접 증명.

**4번 — 유출 0.** 과정별 바늘/유출: ld 13,632/0 · reading 18,910/0 · student 815/0 · adult 2,621/0 · passoff-grammar 15,404/0 · phonics 962/0 · grammar1 4,103/0 · grammar2 2,354/0. '앱 코드와 글자가 같아 따로 센 것 4'(passoff-grammar pg06-3 의 one, two, three… 숫자 줄 — 옛 LdLearningView 코드에 있던 글) 와 '익명 과정 목록에 이미 보이는 제목이라 뺀 것 210' 은 도구가 따로 세는 항목이고 유출이 아님(전부 유출 0 줄에 포함 안 됨).

**5번 — 첫 줄에 R2 경고 없음**(첫 줄이 `voice : en-US-AvaMultilingualNeural`). `--dry-run` 을 붙여서만 돌림(Azure 호출 0).

**7d — check-unreached-data 목록.**
- 새로 찾음 1: **ADULT `instruction` 블록 — 55강의 · 55개**(화면 StudentLearningView 가 안 읽음. STUDENT 의 같은 칸은 unreached-data-known.json 에 '알고 있음' 으로 올라 있음).
- 낡은 줄 4(지금 데이터에 그 칸이 없음): `ld 대본 줄 안 칸 n` · `passoff-grammar anchors.items 안 칸 note` · `passoff-grammar drill.produce 안 칸 note` · `passoff-grammar drill.transfer 안 칸 note`.
- 알고 있음 43(ld 4 · reading 3 · student 2 · passoff-grammar 24 · phonics 3 · grammar1 4 · grammar2 3 줄). 과정 8 · 훑은 쪽 1,541.
- 등록부(`docs/qa-2026-09-18/unreached-data-known.json`) 결정은 주 세션 몫 — 나는 안 고침.

## 한 줄 요약

기대와 다른 것 1(3번 `buildFreeSpeechKeys --check` exit 1 — 내용은 같고 작업 트리 파일 줄바꿈만 다름) · 알려진 exit 1 1(7d) · 나머지 전부 기대대로. 🔴 멈춤 없음.

## 출력 파일 위치 안내

`docs/qa-2026-09-18/out/` 는 다른 일꾼과 같이 쓰는 폴더. 내 것: entitlement-all.json · audio-inventory.json · audio-check-anon.json · bundle-leak-all.json · completeness.json · security-probe.json. (같은 폴더의 audio-check-licensed*.json · features · data-changes.jsonl · s1-probes-browser-* 는 다른 일꾼 것 — 안 건드림.)
임시로 만든 것: 스크래치 폴더의 `bfsk-copy.mjs`, `freeSpeechKeys.new.json`, `freeMediaKeys.new.json` (저장소 밖).
