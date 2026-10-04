# 회귀 점검 1002 · 단계 0 — probes (이용권 · 공개 파일 · 소리 · 데이터 탐침 도구)

2026-10-04 14:15~15:40 · 작업 트리 `nostalgic-blackburn-048c73`(HEAD 7bfd5d7b = origin/main). **같은 AI 계열이 만들고 점검함 — 독립 검수 아님.**
멈춤 조건(이용권 없이 열리는 유료 주소 · 유료 본문 유출 · 결제/이용권 상태 변화)은 **보이지 않음** — 아래 운영 실행 숫자 참고.
내용 파일(content/ · src/) 안 바꿈 · 커밋 · 푸시 · R2 · 배포 0 · 운영은 읽기만(/api/admin/ · /api/license/ 의 POST 0 — probe-security 는 `--no-mutating-routes` 로만 돌림) ·
이용권 브라우저는 감사 프로필 사본(`kig-audit-0918-rc1002-probes-paid` · `…-rc1002-probes-audio`)만, 포트 9700 · 9701, 한 번에 하나, 끝나면 닫음(확인) · 새 기기 등록 0.

## 한눈에 — 운영에서 ADULT 가 세어지는가 (고친 도구로 실제 실행)

| 명령서 칸 | 도구 | 운영 결과(이번) |
|---|---|---|
| ① 이용권 없이 열리는 유료 주소 | probe-entitlement-all | 1,745 주소 모두 PASS · **유료 잠김 1,713/1,713 (열림 0)** · ADULT 유료 53/53 잠김 · PASS-OFF 65/65 · exit 0 |
| ② 무료 체험 강의 열림 | probe-entitlement-all | **무료 열림 32/32**(FREE_PREVIEW_LESSON_IDS 로 셈, CNN 뺌 — ADULT a1-1 · a1-2 · PASS-OFF pg01-1 · pg01-2 포함) |
| ② 무료 소리 열림 · 유료 소리 403 | audio-inventory → audio-check --anon | 클립 17,292 · **무료 강의 클립 열림 315/315 · 유료 막힘 16,977/16,977 · 실패 0** · ADULT 44/44 · 1,383/1,383 · 옛 미디어 · 지어낸 주소 실패 0 |
| ③ 공개 파일 유출 | probe-bundle-leak-all | 쪽 1,764 · JS 조각 30 · 공개 JSON 1(/search-index.json 342KB) · **유출 0** · ADULT 유료 53강의 바늘 2,621 |
| ④ 빠진 클립 | check-completeness(R2 54,805 와 함께) · audio-check --licensed | missing-clip **0**(8과정) · 이용권으로 운영에서 전부 받기 **17,292/17,292**(ADULT 1,427 · 소리 아님 · 빈 · 못 읽음 0) |
| (이용권) 유료 강의가 열리는가 | check-paid-access | 8과정 8/8 열림(ADULT a12-3 — 2단계에서 문장 보임) |

## 고친 파일과 바뀐 것 (줄 번호는 지금 파일 기준)

| 파일 | 바뀐 것 |
|---|---|
| `docs/qa-2026-09-18/scripts/probe-entitlement-all.cjs` | 15-41 과정 목록 = validRoutes 의 과정 전부(CNN 뺌) · 모르는 과정이면 exit 2 · `--break=adult-free/adult-leak` · 60-61 adult 무료 목록을 못 읽으면 멈춤 · 89 ADULT 바늘 길 · 102-118 `adultNeedles`(영어 문장 · 한국어 줄 · 한국어 덩어리 · 낱말 뜻 — 전엔 '가장 긴 셋' 이라 영어 문장만) · 178-185 깨기 심기 · 208-209 깨기 결과 파일 따로 · 225-235 과정별 ①②숫자 · **FAIL 이면 exit 1**(전엔 늘 0) |
| `probe-bundle-leak-all.cjs` | 55-62 머리말 · 79-87 과정 목록 = validRoutes 전부 · 132-149 ADULT 바늘(한국어 줄 12글자↑ · 덩어리 쌍 · 한국어 덩어리 10글자↑ · 낱말 쌍 · 뜻 10글자↑ — 20글자 기준이면 덩어리 · 뜻이 거의 다 빠짐) · 385-400 `--break=adult-ko/adult-chunk/adult-meaning` · 455-456 과정별 숫자 줄 |
| `check-unreached-data.cjs` | 28-36 머리말 · 49-52 과정 목록 = validRoutes 전부 · 159-209 `pageViewMap`(LessonBody 에 분기가 없는 ADULT 는 page.tsx 가 실제로 그리는 부품 — 삼항 분기의 마지막 else = StudentLearningView · STUDENT 는 두 길이 같아야) · 286-298 ADULT 도 위 플레이어 조건(녹음 하나일 때만) · PASS-OFF 는 위 플레이어 없음 · 322-329 `--break=adult-field` · 338-341 STUDENT 부품 대조 · 390-395 문항 안 배열의 칸을 한 겹 더(words · chunks 안 칸) |
| `check-media-gate.cjs` | 14-43 허용 폴더를 mediaAccess.ts 소스에서 읽음(손으로 옮긴 사본 X) · 훑는 과정 = 허용 폴더 ∪ validRoutes 전부 · 63-84 무료 강의 수 기대값을 30 고정 → FREE_PREVIEW_LESSON_IDS 중 파일 있는 것(34) · 5번 검사(허용 폴더 밖 미디어) · `--break=adult-media` · 101-133 출력 |
| `audio-inventory.cjs` | 13-48 과정 목록 = spoken-texts.cjs SPOKEN_COURSES(ADULT 포함) ∩ 주소 있음 · 밖의 과정이면 exit 2 · `anonymousClipTexts`(무료 체험 강의가 **이용권 없이** 소리 내는 글 — pg01-1 의 떼어 둔 유료 8문장을 무료로 세던 것 바로잡음) · 84-119 과정별 무료 쪽 · 클립 수 · `courses` · `--break=adult-free/adult-paid-listed` · 159-165 **무료/유료 갈림이 어긋나면 exit 1**(전엔 숫자만) · 깨기는 다른 파일에 |
| `lib/inventory-inputs.cjs` | 18-33 재료 지문에 `scripts/lib/spoken-texts.cjs`(소리 내는 글의 한 정의 — ADULT 덩어리 · 낱말이 여기서 정해짐) · lessonSpeechForm · lessonAudioText · listeningUtils · passoffSupplement · content/private 더함 · `inputsFingerprint(overrides)`(깨기용) |
| `audio-check.cjs` | 26-35 머리말 · 66-74 `--break=stale-spoken` · `--clone` · 87-88 --refresh 가 inventory exit 1 에 멈추지 않게 · 112-114 **--anon 기대 = '무료 강의가 쓰는 클립인가'**(전엔 '무료 목록에 있나' — 목록이 틀려도 PASS) · 125-126 ADULT · PASS-OFF 지어낸 폴더 주소 403 · 145-174 과정별 숫자 · 다른 목록 결과는 다른 파일 · 204-211 5xx · 429 두 번 다시 · 223-271 **--licensed 가 --concurrency 를 실제로 씀**(전엔 묶음 하나씩 — 운영 약 1.1 클립/초, 17,292 개면 4시간+ → 0.023 초/클립 · 7분) · 묶음 10개 · 평가 오류 묶음은 두 번 다시 · 그래도면 클립마다 오류로 · 301-316 과정별 · **빠짐/막힘 · 소리 아님 · 빈 · 못 읽음이 있으면 exit 1**(전엔 0) |
| `check-completeness.cjs` | 20-48 과정 목록 = validRoutes 전부 · 규칙 없는 과정이면 exit 2 · exit 1 종류(missing-clip · missing-file · ADULT 의 지적) · 99-104 `--break=adult-chunk` · 149-175 ADULT 규칙(문장 ↔ 한국어 줄 수 · 덩어리 영어/한국어 · 덩어리를 이으면 문장 · 낱말 word/say/meaning/pos · 밑줄 자리 · 보기 3) · 218 `--break=adult-missing-clip` · 235-254 깨기 결과 파일 따로 · 과정 수 · exit |
| `check-changed-clips.cjs` | 29-32 · 59-60 · 110-118 `--break=adult-ko/adult-chunk/adult-word`(ADULT 는 SPOKEN_COURSES 로 10/2 부터 보고 있었음 — 깨기로 증명만) |
| `check-paid-access.cjs` | 7-20 `--port` · `--break=adult-needle` · 30-34 ADULT a12-3 줄 · 39-43 LISTENING 바늘을 1단계 내용 문제 물음으로(9/27 화면 고침 뒤 대본 영어는 2단계 확인 뒤에만 보여 d276 이 늘 '못 찾음') · 74-76 숫자 · **exit 1**(전엔 표만) |
| `check-search.cjs` | 17-19 머리말 · 32-45 `--break=adult` · 75-77 이름 검색에 'adult' · 'a12-3' |
| `probe-security.cjs` | 19-52 ADULT · PASS-OFF 학습자 API · 관리자 adult-progress · passoff-progress · `--no-mutating-routes`(관리자 · 이용권 POST 건너뜀) · 무료 목록 · `--break=adult-free-chapter` · 105-124 장 1 전체 듣기가 **무료 체험 강의만** 주는지(강의 목록까지 — 전엔 access==="free" 만) · 168-174 **exit 1** |
| `probe-privacy.cjs` | 32-33 쪽 목록에 /adult · /passoff-grammar · /grammar2 · 두 과정 무료 강의 |
| `inventory.cjs` | 23-42 ADULT 55 · PASS-OFF 67 · 모르는 과정이면 exit 2 · 122-143 ADULT 는 unit/part · PASS-OFF 는 id(pg<TOPIC>-n) · order 는 TOPIC 안에서만 |
| `check-integrity.cjs` | 34-36 과정 = validRoutes 전부 · 57 손상 있으면 exit 1 |
| `licensed-checks-0926.cjs` | 24-26 `--clone` · 32-33 ADULT · PASS-OFF 진도 쓰기도 막음 · 44-50 ADULT a12-3 · PASS-OFF pg20-2 마지막 장 INFO · 74 FAIL/BLOCKED 면 exit 1 |
| `measure-perf.cjs` | 35-41 `--with-new-courses`(ADULT · PASS-OFF 8쪽 더함 — 기본 쪽 목록은 9/24 · 9/26 값과 견주게 그대로) · 121 결과 파일 이름 `-8courses` |

## 깨기 증명 (모두 운영 · 실제 검사와 같은 방법 — 줄인 실행 없음)

| 도구 | 명령 | 깨뜨린 것 | 깨진 결과 | 되돌린 뒤(진짜 실행) |
|---|---|---|---|---|
| probe-entitlement-all | `--break=adult-free` | 유료 ADULT a2-1 을 무료 목록 사본(메모리)에 | 1,745 중 **1 FAIL**(a2-1 잠김 화면 · 무료 열림 2/3) · **exit 1** | 1,745 PASS · exit 0 |
| probe-entitlement-all | `--break=adult-leak` | a2-1 의 받은 HTML · RSC 사본에 그 강의 한국어 줄 바늘 | **1 FAIL**(유료 잠김 52/53 · 유출 1) · **exit 1** | 같음 exit 0 |
| probe-bundle-leak-all | `--cache <진짜 실행 캐시> --break=adult-ko` | 유료 ADULT 한국어 줄 '대부분의 사람들이 저를 좋아합니다.'(16글자 — 옛 20글자 기준이면 바늘 아님)를 색인 사본에 | adult inJson 1 · **유출 1 · exit 1** | 유출 0 · exit 0 |
| 〃 | `--break=adult-chunk` | 한국어 덩어리 '저는 아주 외향적인 사람이지만,'(13글자)를 색인 사본에 | **유출 1 · exit 1** | 〃 |
| 〃 | `--break=adult-meaning` | 낱말 뜻 '개인적으로, 개별적으로'(10글자)를 JS 사본에 | adult inJs 1 · **exit 1** | 〃 |
| check-unreached-data | `--break=adult-field`(알고 있음 목록은 오늘 결과를 넣은 사본 — `KIG_UNREACHED_KNOWN`) | a2-1 첫 낱말에 화면이 안 읽는 칸 | 'sentences.items.words 안 칸 breakTestUnreadField' **새로 찾음 1 · exit 1** | 같은 사본으로 새로 찾음 0 · 낡은 줄 0 · exit 0 (진짜 목록으로는 exit 1 — 아래 '찾은 것') |
| check-media-gate | `--break=adult-media` | 무료 ADULT a1-1 이 /audio/adult/a1-1.mp3 를 쓴다고(메모리) | 1번 잠김 1/39 · 5번 허용 폴더 밖 1 · **FAIL exit 1** | PASS exit 0 (훑은 과정 9 · 무료 강의 파일 34 = 8과정 32 + 미디어 문지기가 아직 아는 CNN 2 · 미디어 2,715) · `--old` 대조군 FAIL(90/102) 그대로 |
| audio-inventory | `--break=adult-free` | a2-1 을 무료 강의로(메모리) | 무료 강의 클립 중 무료 목록에 없음 **21 · exit 1** | 0 · 0 · exit 0 |
| audio-inventory | `--break=adult-paid-listed` | 유료 ADULT 만 쓰는 클립(‘I am a very outgoing person,’)을 무료 목록 사본에 | 유료만 쓰는 클립 중 무료 목록에 있음 **1 · exit 1** | 〃 |
| audio-check --anon | `--inventory <사본: 유료 ADULT 클립 하나를 무료 강의 것으로>` | a1-3 'I am a very outgoing person,' | 운영 403 → **실패 1 · exit 1**(adult 무료 열림 44/45) | 17,292 클립 실패 0 · exit 0 |
| audio-check --anon | `--inventory <사본: 무료 ADULT 클립 하나를 유료로>` | a1-1 'Nice to meet you.' | 운영 206 → '유료가 열림' **실패 1 · exit 1** | 〃 |
| audio-check | `--break=stale-spoken` | spoken-texts.cjs 를 메모리에서만 바꾼 지문 | '목록이 지금 내용과 다름' **exit 1** | 같은 목록 '지금 내용과 같음' |
| audio-check --licensed | `--licensed --concurrency 8 --clone rc1002-probes-audio --port 9700 --inventory <진짜 목록 + 없는 ADULT 클립 하나>` (17,293 전부 받음 · 398초) | adult/a2-1 에 b-0000000000000000 | 받음 17,292 · **빠짐 1(404 — 그 클립) · exit 1** · adult 1,427/1,428 | 진짜 목록: **17,292/17,292 받음 · 빠짐 0 · 소리 아님 0 · 빈 0 · 못 읽음 0 · exit 0**(399초) · ADULT 1,427/1,427 |
| check-completeness | `--break=adult-missing-clip` | a2-1 에 없는 클립 이름 | adult missing-clip **1 · exit 1** | missing-clip 0 · exit 0 |
| check-completeness | `--break=adult-chunk` | a2-1 첫 덩어리 한국어를 비움 | adult chunk-missing-ko **1 · exit 1** | 〃 |
| check-changed-clips | `--break=adult-ko` / `adult-chunk` / `adult-word` | a2-1 한국어 줄 · 첫 덩어리 영어 · 첫 낱말 say 를 메모리에서 | 각각 adult '클립 없음' **1건 · exit 1** | 본 쪽 0 · 없는 것 0 · exit 0 |
| check-paid-access | `rc1002-probes-paid --port 9701 --break=adult-needle` | a12-3 에서 찾을 글을 a2-1 문장으로 | /adult/a12-3 못 찾음 · **8 중 1 실패 · exit 1** | 8/8 열림 · exit 0 |
| check-search | `--break=adult` | 색인 사본에 a2-1 문장 항목 | 유료 본문 **3줄 · 1강 {"adult":3} · exit 1** | PASS exit 0(바늘 48,903) |
| probe-security | `--no-mutating-routes --break=adult-free-chapter` | ADULT 무료 목록 사본에서 a1-2 를 뺌 | adult chapter-audio?chapter=1 '무료 아님: a1-2' **1 FAIL · exit 1** | 21 PASS / 0 FAIL / 10 건너뜀 · exit 0 |

이용권 소리(audio-check --licensed, 감사 프로필 사본, 묶음 동시 8): 첫 깨기 실행(15:05~15:19, 17,293 클립 · 788초) — 받음 17,291 · 빠짐/막힘 2 =
없는 ADULT 클립 404(깨기 — 잡힘) + phonics hv-39 'majestic' 502 한 번 → exit 1. 502 는 묶음을 함께 돌릴 때의 일시 오류로 보고 5xx · 429 를 두 번 다시 받게 고친 뒤
진짜 실행과 깨기를 다시 돌림(15:20~15:35) → 진짜: 17,292/17,292 받음 · exit 0 / 깨기: 없는 ADULT 클립 하나만 404 · exit 1 (위 표). hv-39 'majestic' 은 다시 돌린 진짜 실행에서 받음.

## 증명 못 한 것 / 하지 않은 것과 까닭

- `probe-privacy.cjs` — 쪽 목록만 넓힘. 돌리지 않음: 법정표시 칸은 사장님 몫(명령서 — 확인 대상 아님)이고 ADULT 에 새 판정이 없음. PASS 로 세지 말 것.
- `licensed-checks-0926.cjs` — ADULT · PASS-OFF 줄은 INFO(순서 잠금은 평생 이용권으로 못 봄 — 단계 4 사장님 몫). 돌리지 않음. 이용권으로 ADULT 유료가 열리는지는 check-paid-access 가 증명함.
- `measure-perf.cjs` — PASS/FAIL 없는 재기 도구. 단계 6 은 단독 실행이라 여기서 돌리지 않음.
- `inventory.cjs` · `check-integrity.cjs` — 보고만 하는 도구(통과 판정 없음). ADULT 55 · PASS-OFF 67 이 세어지는 것만 확인(ADULT issues 0 · PASS-OFF issues 0).
- `recheck-audio.cjs` · `analyze-features.cjs` — 과정 목록이 없어(스윕 기록 · E.expected 를 따름) 고칠 곳 없음. recheck-audio 는 `H.MARKERS[과정]` 를 쓰므로 harness.cjs(adult-sweep 몫)에 adult 표시가 있어야 함.
- `probe-prod-deploy.cjs` — 9/23 배포 한 번용(고정 클립 114개 · 고친 글 7곳). 이번 점검에 쓰지 않음 · 고치지 않음.
- 과정 목록이 옛 6과정인 채 둔 것(단계 1 의 칸이 아님 — 공통 기능 · 접근성 · 휴대폰 캡처 · 옛 스윕): `drive-common.cjs`(32 · 153 · 164), `drive-common-0926.cjs`(201 · 262 · 275 — H.MARKERS 필요),
  `check-a11y.cjs`(18), `capture-mobile-0927.cjs`(42), `gap-checks-0926.cjs`(111 · 173 · 207 · 283 · 284 · 303), `check-top-player.cjs`(13), `run-all.ps1` · `run-queue*.ps1`(옛 스윕 순서).
  이 도구로 ADULT 를 볼 일이 생기면(단계 3 공통 기능 등) 그때 넣고 깨기로 증명해야 함. GRAMMAR 전용 목록(["grammar1","grammar2"] — check-speech-* · grade-offline · compare-grading · check-audio-sentences · probe-curly-quotes)은 원래 그 두 과정용이라 해당 없음.

## 운영 실행에서 찾은 것 (단계 1 표로 넘길 것 — 고치지 않음)

- **check-unreached-data(진짜 목록) exit 1**: 새로 찾음 1 — ADULT `instruction` 블록 55과 55개를 아무 화면도 안 읽음(STUDENT 의 같은 칸은 unreached-data-known.json 에 '알고 있음'). 낡은 줄 4 — `ld 대본 줄 안 칸 n` · `passoff-grammar anchors.items/drill.produce/drill.transfer 안 칸 note`(지금 데이터에 그 칸이 없음). 등록부 결정(목록 고치기)은 주 세션 몫.
- **check-completeness**: ADULT 지적 0(문장 ↔ 한국어 줄 · 덩어리 · 낱말 318 모두 갖춤) · missing-clip 0(R2 54,805 와). `missing-legacy-audio` 3,228(이 컴퓨터 public/audio 에 옛 강의 녹음 없음 — R2 에 있음, 숫자만 · 전과 같음).
- **inventory.cjs**: PASS-OFF 문자열 표시 — empty 2 · untrimmed 2 · double-space 2(null 4,150 은 데이터 형식상 null 칸). ADULT 0.
- **check-paid-access**(이용권 사본): ADULT a12-3 은 1단계(블라인드 리스닝)에 문장이 없고 2단계(단어)에서 문장이 보임 — 설계대로.
- 소리: 무료 소리 목록 315 = 무료 강의가 이용권 없이 소리 내는 클립 315(어긋남 0). ADULT 클립 1,427(무료 강의 44).

## 속도 (지난번 / 이번)

지난번(최종 관문 9/24~26)은 이 도구들의 걸린 시간을 작업기록에 적지 않아 **기록 없음**. 이번에 잰 것(운영, 다른 일꾼과 같은 때):
- probe-entitlement-all: 1,745 주소(HTML+RSC) 85초 → **0.049초/주소**(깨기 두 번도 83 · 85초)
- probe-bundle-leak-all: 1,764 쪽(HTML+RSC)+조각 30 121초 → **0.069초/쪽** · 캐시로 깨기 각 수 초
- audio-inventory 13초 · audio-check --anon 17,292 클립 + 옛 미디어 2,596 · 76초 → **0.0044초/클립**(깨기 각 74 · 85초)
- audio-check --licensed: 고치기 전 **약 0.9초/클립**(한 번에 하나 — 첫 3분 남짓 227개쯤에서 멈추고 고침) → 고친 뒤 **0.023초/클립**(17,292 · 399초, 묶음 동시 8 · 다른 일꾼 브라우저 둘과 같은 때 · 첫 실행은 0.046)
- check-completeness(R2 목록 포함) 31초 · check-changed-clips 수 초 · check-unreached-data 수 초 · check-media-gate 1초
- check-paid-access: 8쪽 113~133초 → **약 15초/쪽**(단계 버튼을 차례로 누름) · probe-security 수 초

## 단계 1 에서 그대로 칠 명령 (작업 트리 뿌리에서 · 운영 대상)

```
node docs/qa-2026-09-18/scripts/probe-entitlement-all.cjs                 # ① ② → out/entitlement-all.json · 기대: 1,745 PASS · 유료 잠김 1,713/1,713 · 무료 32/32 · exit 0
node docs/qa-2026-09-18/scripts/audio-inventory.cjs                       # 목록 새로 → out/audio-inventory.json · 기대: 클립 17,292 · 어긋남 0 · 0 · exit 0 (expectations.cjs 가 바뀌면 지문이 달라지니 audio-check 바로 앞에)
node docs/qa-2026-09-18/scripts/audio-check.cjs --anon                    # ② → out/audio-check-anon.json · 기대: 무료 315/315 · 유료 16,977/16,977 · 실패 0 · exit 0
node docs/qa-2026-09-18/scripts/probe-bundle-leak-all.cjs                 # ③ → out/bundle-leak-all.json · 기대: 유출 0 · adult 유료 53강의 · exit 0
$env:KIG_ENV_LOCAL="<본 저장소>/.env.local"; node docs/qa-2026-09-18/scripts/check-completeness.cjs   # ④ → out/completeness.json · 기대: missing-clip 0 (R2 와) · exit 0 (작업 트리엔 .env.local 이 없음 — 값은 출력 안 함)
node docs/qa-2026-09-18/scripts/audio-check.cjs --licensed --concurrency 8 --clone rc1002-<이름>-audio --port <자기 포트>   # ④(이용권) → out/audio-check-licensed.json · 기대: 17,292/17,292 · exit 0 · 약 7분 · 브라우저 하나
node docs/qa-2026-09-18/scripts/check-media-gate.cjs                      # 기대: PASS exit 0
node docs/qa-2026-09-18/scripts/check-search.cjs                          # 기대: PASS exit 0
node docs/qa-2026-09-18/scripts/probe-security.cjs --no-mutating-routes   # 기대: 21 PASS / 0 FAIL / 10 건너뜀 · exit 0
node docs/qa-2026-09-18/scripts/check-unreached-data.cjs                  # 지금 exit 1 — ADULT instruction 새 1 · 낡은 줄 4 (위 '찾은 것', 등록부 결정 전까지)
node docs/qa-2026-09-18/scripts/check-paid-access.cjs rc1002-<이름>-paid --port <자기 포트>   # 이용권 사본 · 기대: 8/8 · exit 0
```

## 남의 몫에서 찾은 것 (고치지 않음)

- `lib/expectations.cjs`(adult-sweep): `COURSES` 에 adult 가 없어(39행, 이번 시작 때) audio-inventory · check-completeness · check-integrity 가 ADULT 를 못 셌음 — 이 셋은 내 쪽에서 validRoutes/SPOKEN_COURSES 로 바꿔 그 목록에 기대지 않게 함. `itemsOf` 는 문항을 n · text 로만 줄여 덩어리 · 낱말이 빠짐(그래서 check-completeness 는 날것 문항을 씀).
- `lib/harness.cjs`(adult-sweep): `MARKERS` 에 adult(목록 표시)가 없으면 recheck-audio · check-paid-access 의 `H.load` 가 표시 확인을 못 함(지금은 marker 없이 돎).
- `docs/qa-2026-09-18/unreached-data-known.json`(주 세션): 위 'ADULT instruction' 새 줄 · 낡은 줄 4 — 결정 · 정리 필요.
- 작업 트리 맨 위(저장소 뿌리)에 추적 안 된 `build-coverage.cjs` 가 생겨 있음(누가 경로를 잘못 쓴 듯 — 내가 만든 것 아님).
- `check-lesson-questions-0928.cjs` · `drive-reading.cjs` 가 이 작업 트리에서 바뀌어 있음 — 내 목록에도 남의 목록에도 없는 파일인데 내가 고친 것 아님(다른 일꾼). 커밋할 때 누구 것인지 확인.
