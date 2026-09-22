# 버그 등록부 — 명령서 §16 형식

> 명령서 §16 은 버그마다 다음을 요구합니다: ID · 심각도 · 영역 · 챕터 · 강의 번호 · 정확한 주소 ·
> 해당 기능 · 재현 절차 · 기대 결과 · 실제 결과 · 콘솔/네트워크 오류 · 증거 · 재현성 · 추정 원인 ·
> 권장 수정 · 수정 후 검증 방법. 아래는 **확인된(CONFIRMED) 문제만** 그 형식으로 정리한 것입니다.
> 오탐으로 철회한 것과 통과 근거는 `findings-log.md` 에 있습니다.
>
> **심각도** P0 출시 불가 · P1 출시 전 반드시 수정 · P2 학습 경험·신뢰 훼손 · P3 사소함

---

## P0 — 출시 불가

없음. 주요 과정이 통째로 안 열리거나, 데이터가 대량 유실되거나, 핵심 기능이 완전히 못 쓰게 되거나,
접근 통제가 뚫린 사례는 발견되지 않았습니다.

---

## P1 — 출시 전 반드시 수정

### ~~BUG-001 · 음성 클립 387개가 운영에 없음~~ → **종결: 제품 결함 아님** (2026-09-22)

> **재생을 요청하는 버튼이 있는 클립 0개 · 생성이 필요한 클립 0개.** 387개를 전부 역추적한 결과
> 378개는 LISTENING 한글 **해석**(`ld_english_scripts.json` 의 `ko`), 9개는 VOCA 연어 카드의
> **예문**(`COLLOCATION_PRESETS[*].exampleSentence`)이었고, 둘 다 앱에 재생 버튼이 없습니다.
> 감사 도구의 기대값(`scripts/lib/expectations.cjs`)이 앱보다 두 줄 더 요구한 것이 원인이며,
> 그 두 줄을 앱 기준으로 고쳤습니다. 근거·측정·검증은 **[`BUG-001-closed.md`](BUG-001-closed.md)**.
> 소유자 결정(2026-09-22): 클립을 생성하지 않는다.
>
> 아래는 종결 전 원문입니다.

| | |
|---|---|
| **심각도** | ~~P1~~ → 해당 없음 (오탐) |
| **영역** | 음성 — LISTENING 대부분, GRAMMAR I 8건, VOCA 4건 |
| **강의** | 194개 (예: `ld/d002`, `ld/d007`, `phonics/hv-01`, `grammar1/gh1-008`) |
| **주소** | 예 `https://k-ig-core.vercel.app/ld/d002` → 클립 `/audio/azure-ava/v1/1u-e1c5ec89e163d682.mp3` |
| **기능** | 문장·낱말 스피커 버튼 |
| **재현 절차** | ① 이용권으로 로그인 ② `/ld/d002` 접속 ③ 본문 문장의 🔊 버튼을 누름 |
| **기대 결과** | 해당 문장의 음성이 재생된다 |
| **실제 결과** | 아무 소리도 나지 않는다. 클립 주소가 **HTTP 404** 를 반환 |
| **콘솔/네트워크** | `GET /audio/azure-ava/v1/<key>.mp3 → 404` |
| **증거** | `out/missing-clips-licensed.json` — 이용권 세션으로 389개 질의, **404 387건 / 정상 2건**. 같은 요청에서 정상 클립은 206 으로 내려오므로 유료 차단이 아님 |
| **재현성** | 항상 (100%) |
| **추정 원인** | 해당 문장들의 음성이 생성 단계에서 누락됨. 저장소의 클립 50,382개 중에도 없음 |
| **권장 수정** | `node scripts/generate-azure-ava.mjs` 로 누락 문장의 클립을 생성해 배포. 목록은 `out/missing-clips-licensed.json` 의 `byLesson` |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/probe-missing-clips.cjs` 재실행 → 404 **0건** 이어야 함 |

### BUG-001C · 교육 내용의 사실 오류 3건 — 틀린 사실을 가르침

명령서 §15 는 "잘못된 학습 내용(incorrect learning content)"을 P1 로 규정합니다. 아래 3건은
각각 **독립적인 검토자 3명이 반박을 시도했으나 모두 실패**한 것으로, 유료 학습자가 틀린 사실을
배우게 됩니다.

| | |
|---|---|
| **심각도** | P1 |
| **영역** | LISTENING 교육 내용 |
| **재현성** | 항상 — 데이터에 그대로 있음 |
| **콘솔/네트워크** | 해당 없음 (내용 오류) |
| **공통 주의** | 영어 문장을 고치면 **그 문장의 음성 클립이 사라집니다.** 같은 작업 안에서 `node scripts/generate-azure-ava.mjs` 로 다시 만들어야 합니다 |

**① `ld/d024` — 영불해협 기구 횡단의 방향이 거꾸로**

- **주소** `https://k-ig-core.vercel.app/ld/d024` · **위치** `content/ld_english_scripts.json` 의 `d024` n=9 (영어·한국어 모두), 같은 문장이 `content/lessons/ld/d024-1.json` 마지막 한글 블록에도 있음
- **실제** "The crowd waiting for them **in England** was very surprised when the balloon landed."
- **기대** 1785년 1월 7일 최초의 기구 해협 횡단은 **영국(도버) → 프랑스(칼레 인근 기네 숲)** 입니다 (Blanchard·Jeffries). 그들을 맞은 군중은 **프랑스** 해안에 있었습니다
- **왜 심각한가** 이야기 전체의 방향이 뒤집힙니다. 앞 행(n=3)의 설정과도 모순되어, 출발한 나라에 다시 착륙한 셈이 됩니다
- **권장 수정** `in England` → `in France`. 한국어도 "프랑스에서 …". n=3 을 "…from England to France…" 로 명시하면 더 분명해집니다

**② `ld/d058` — 헨리 포드의 연도가 3년 틀림**

- **주소** `https://k-ig-core.vercel.app/ld/d058` · **위치** `content/ld_english_scripts.json` 의 `d058` n=1, **같은 연도가 `content/lessons/ld/d058.json` 힌트 블록에도 반복**
- **실제** "One day in **1893**, the citizens of Detroit, Michigan were amazed to see a motor vehicle coming down the street."
- **기대** 포드가 디트로이트 거리에서 처음 차(Quadricycle)를 몬 것은 **1896년 6월 4일 새벽**입니다. 1893년에는 집에서 소형 고정식 가솔린 엔진을 만들었을 뿐입니다
- **왜 심각한가** 학습자가 **본문과 힌트에서 두 번** 틀린 연도를 만납니다
- **권장 수정** 두 곳 모두 `1893` → `1896` (한국어·`d058-1` 대응 블록 포함)

**③ `ld/d192` — 호주 원주민에 대한 사실과 다른 서술**

- **주소** `https://k-ig-core.vercel.app/ld/d192` · **위치** `content/ld_english_scripts.json` 의 `d192` n=2 (영어·한국어)
- **실제** "Most of them live in the desert areas of Australia." / "그들의 대부분은 오스트레일리아의 사막지역에서 산다."
- **기대** 호주 통계청(ABS) 2021 기준 원주민의 **84.6%가 비(非)원격지에 거주**합니다 (대도시 40.8%, 내륙근교 24.8%, 외곽지역 19.0%). 원격·초원격지는 약 15%이고 '사막 지역'은 그보다 훨씬 작습니다
- **왜 심각한가** 현재형 단정으로 **현존하는 민족에 대한 잘못된 고정관념**을 가르칩니다
- **권장 수정** "Traditionally, many of them lived in the desert areas of Australia." (과거·한정 표현) 또는 "Today most Aboriginal Australians live in cities and towns."

**증거** `out/content-review-*.json` — 각 건 회의론자 3명의 판정 전문과 출처가 기록돼 있음
**수정 후 검증** 해당 문장을 읽고 위 사실과 대조 + `node docs/qa-2026-09-18/scripts/check-completeness.cjs` 로 새 클립이 생성됐는지 확인

### BUG-002 · 이용권 코드에 공백을 넣으면 기기 제한·환불 차단을 우회

| | |
|---|---|
| **심각도** | P1 (보안·매출) |
| **영역** | 이용권 |
| **주소** | 이용권 등록 화면 (사이트 전역 모달) |
| **기능** | 이용권 등록·검증 |
| **재현 절차** | ① 이용권 코드 **중간에 공백을 넣어** 등록 ② 다른 기기에서 공백 위치를 바꿔 다시 등록 ③ 기기 한도(2대)를 넘겨 등록되는지 확인 ④ 환불 차단(revoke) 된 코드도 공백을 넣어 재등록해 봄 |
| **기대 결과** | 같은 코드로 인식되어 한도를 넘길 수 없고, 차단된 코드는 어떤 형태로도 쓸 수 없다 |
| **실제 결과** | 검증은 공백을 지우고 통과시키지만 **기록은 공백이 포함된 문자열로 따로 남음** → 3·4번째 기기 등록, 환불 차단 회피, 이용 기간 재시작이 가능 |
| **콘솔/네트워크** | 해당 없음 (서버 정상 응답) |
| **증거** | `out/key-whitespace-local.json` — 앱의 실제 모듈을 임시 폴더에서 돌려 재현. 운영 데이터는 건드리지 않음 |
| **재현성** | 항상 (로컬 재현 3건) |
| **추정 원인** | 검증은 `serverLicense.ts:53` 에서 공백을 제거하지만, 기기 기록은 `deviceStorage.ts:184-190` · `LicenseProvider.tsx:325` 에서 입력 문자열 그대로 저장 |
| **권장 수정** | 저장·조회·비교에 쓰는 모든 경로에서 같은 정규화(공백 제거 + 대문자)를 적용. 기존 기록도 한 번 정규화해 병합 |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/verify-key-whitespace-local.cjs` → 우회 0건 |

### BUG-003 · 법정 표시가 어느 페이지에도 없음 — 소유자·변호사

| | |
|---|---|
| **심각도** | P1 |
| **영역** | 상업·법률 |
| **주소** | 사이트 전체 (홈·과정 목록 5개·무료 강의 등 7개 페이지 전수 검색) |
| **기능** | 해당 없음 (문서 부재) |
| **재현 절차** | 아무 페이지나 열고 맨 아래까지 내려본다 |
| **기대 결과** | 이용약관·개인정보처리방침·환불(청약철회) 규정·사업자 정보·고객 문의처 링크가 있다 |
| **실제 결과** | 위 5가지에 더해 **쿠키 안내·동의**, **계정/데이터 삭제(탈퇴) 안내**, **데이터 보관 기간 안내** 까지 **8가지 전부 없음** |
| **증거** | `out/commercial.json`, `out/privacy-probe.json` (법정표시 8개 항목 전부 FAIL) |
| **재현성** | 항상 |
| **추정 원인** | 문서가 작성되지 않음 |
| **권장 수정** | 변호사 검토를 거친 문서를 작성하고 전역 푸터에 링크 |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/probe-privacy.cjs` → 법정표시 8개 항목 PASS |

### BUG-004 · 구매(결제) 링크가 없어 판매 자체가 불가 — 소유자

| | |
|---|---|
| **심각도** | P1 |
| **영역** | 상업 |
| **주소** | 유료 안내 화면 |
| **재현 절차** | 이용권 없이 유료 강의에 접속해 안내 화면을 본다 |
| **기대 결과** | 결제 페이지로 가는 링크가 있다 |
| **실제 결과** | `purchaseLinkPresent: false` — 사려는 사람이 살 방법이 없음 |
| **증거** | `out/commercial.json` |
| **재현성** | 항상 |
| **권장 수정** | 결제 수단 연결 후 안내 화면에 링크 추가 |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/probe-commercial.cjs` → `purchaseLinkPresent: true` |

---

## P2 — 학습 경험·신뢰를 해침

### BUG-005 · LISTENING 한글 대본이 두 벌이고, 화면에 안 나오는 사본이 옛 판

| | |
|---|---|
| **심각도** | P2 |
| **영역** | LISTENING 데이터 |
| **강의** | 162개 (문단 306개) |
| **주소** | 예 `https://k-ig-core.vercel.app/ld/d006-1` |
| **재현 절차** | ① `content/ld_english_scripts.json` 의 `d006` 한글과 ② `content/lessons/ld/d006-1.json` 의 `instruction` 블록을 비교 |
| **기대 결과** | 두 곳의 한글이 같다 (또는 한 곳만 존재한다) |
| **실제 결과** | 306개 문단이 다름. 화면은 ①만 사용 — "와싱턴/워싱턴", "펜실바니아/펜실베이니아", "개스/가스", "이태리어/이탈리아어" |
| **증거** | `out/ld-duplicate-script.json` — 사본 보유 강의 272개·문단 2,487개 대조 |
| **재현성** | 항상 |
| **추정 원인** | 과거에 화면용(①)만 수정하고 사본(②)을 남겨 둠. 화면은 `src/lib/content.ts:235 getLdEnglishScript` 로 ①만 읽음 |
| **권장 수정** | ②를 삭제하거나 ①에서 생성하도록 일원화. **앞으로 내용을 고칠 때 ②를 고치면 화면은 그대로이므로, 수정 작업 전에 먼저 정리할 것** |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/check-ld-duplicate-script.cjs` → 다른 문단 0 |

### BUG-006 · 과정 목록의 학습 진도율이 실제보다 크게 표시

| | |
|---|---|
| **심각도** | P2 |
| **영역** | 진도 표시 |
| **주소** | 과정 목록 화면 (예 `/grammar1`) |
| **기능** | 진도율·미완료 수 |
| **재현 절차** | ① 본강의 3개와 스크립트 페이지 5개를 완료 표시 ② 과정 목록의 진도율을 본다 |
| **기대 결과** | "3 / 53개 완료" |
| **실제 결과** | "8 / 53개 완료 (15%)". 스크립트 페이지를 본강의로 셈. 스크립트가 본강의만큼 있어 **이론상 최대 200%** |
| **증거** | `out/features/common.jsonl` — 상태를 심어 재현한 통제 실험 |
| **재현성** | 항상 |
| **추정 원인** | `src/components/CourseDashboard.tsx:213-221` 이 완료 집합을 `variant` 구분 없이 셈 |
| **권장 수정** | 본강의(`variant === "main"`)만 분모·분자에 넣기 |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/drive-common.cjs --only A` → 진도 항목 PASS |

### BUG-007 · GRAMMAR II 채점이 둥근 따옴표를 오답 처리

| | |
|---|---|
| **심각도** | P2 |
| **영역** | 채점 |
| **강의** | 12문항 (예 `grammar2/gh2-027` 12번) |
| **재현 절차** | 아이폰·맥 기본 키보드로 큰따옴표를 포함한 정답을 입력 (자동으로 `“ ”` 가 됨) |
| **기대 결과** | 정답 처리 |
| **실제 결과** | 부분 정답 또는 오답 |
| **증거** | `out/grade-offline.json` — 실제 채점기로 시험: curly-quotes 12시도 → exact 0 · partial 11 · incorrect 1 |
| **재현성** | 항상 |
| **추정 원인** | `src/lib/grammarGrading.ts:43-45` 가 곧은 `"` 만 정규화 |
| **권장 수정** | `“ ” „` 를 `"` 로 정규화 (작은따옴표는 이미 처리됨) |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/grade-offline.cjs` → curly-quotes 전부 exact |

### BUG-008 · LISTENING 받아쓰기 힌트가 화면에 나오지 않음

| | |
|---|---|
| **심각도** | P2 |
| **영역** | LISTENING |
| **강의** | 276개 |
| **주소** | 예 `https://k-ig-core.vercel.app/ld/d001` |
| **재현 절차** | ① `/ld/d001` 접속 ② 받아쓰기 지시문을 읽음 ③ 지시문이 가리키는 힌트를 화면에서 찾음 |
| **기대 결과** | 지시문이 "다음에 나오는 고유 명사·숫자를 참조하라"고 하므로 힌트 블록이 보인다 |
| **실제 결과** | 힌트 블록이 렌더링되지 않음 (`d001` 화면 텍스트에 `Mrs.Watson`, `Barbara` 없음). 고유명사 받아쓰기가 사실상 불가능 |
| **증거** | `out/rendered/ld/d001.desktop.json` 전 단계 렌더 텍스트 · 강의 데이터의 `hints` 블록 |
| **재현성** | 항상 |
| **추정 원인** | `src/components/LdLearningView.tsx:59-67` 이 `hints` 블록을 표시 대상에서 제외 |
| **권장 수정** | 받아쓰기 단계에 힌트 블록을 표시 (또는 지시문에서 해당 문구 삭제) |
| **수정 후 검증** | `/ld/d001` 재점검 후 `content.missing` 의 `hints` 0건 |

### BUG-009 · 검색에서 `s19-3` 강의를 찾을 수 없음

| | |
|---|---|
| **심각도** | P2 |
| **영역** | 검색 |
| **강의** | `student/s19-3` |
| **재현 절차** | 검색창에 `s19-3` 입력 |
| **기대 결과** | 해당 강의가 결과에 나온다 |
| **실제 결과** | "검색 결과가 없습니다". 색인에 STUDENT 81건만 있고 실제는 82개 |
| **증거** | `/search-index.json` 직접 조회 + `out/features/common.jsonl` 의 실제 검색 실행 |
| **재현성** | 항상 |
| **추정 원인** | `scripts/buildSearchIndex.ts` 가 `prebuild` 에 연결되어 있지 않아 색인이 낡음 |
| **권장 수정** | 색인 생성을 빌드 단계에 연결하고 재배포 |
| **수정 후 검증** | `node docs/qa-2026-09-18/scripts/drive-common.cjs --only B` → 검색 항목 PASS |

---

## P3 — 사소함

| ID | 내용 | 위치 | 증거 | 권장 수정 |
|---|---|---|---|---|
| BUG-010 | `'d` 축약을 풀어 쓰면 부분점수 (`I'd like` → `I would like`) — 4문항 | `grammarGrading.ts:43-45` | `out/grade-offline.json` | 축약형 확장을 동등하게 인정 |
| BUG-011 | **영어 단어로 강의를 찾을 수 없음** (`hospital` → 0건). VOCA 낱말이 색인에 없음 | `scripts/buildSearchIndex.ts` | `out/features/common.jsonl` | 색인에 VOCA 낱말 포함 |
| BUG-012 | VOCA 뜻풀이 글자가 잘려 끝까지 안 보임 — 16건 | `PhonicsLearningView.tsx` STEP 1 | `out/features/phonics.jsonl` | 카드 높이·줄바꿈 조정 |
| BUG-013 | 한글 대본 페이지 안내문이 화면에 안 나옴 — 276강 | `content/lessons/ld/dNNN-1.json` 첫 `instruction` | `out/features/ld*.jsonl` | 안내문을 표시하거나 데이터에서 제거 |
| BUG-014 | 목차 표시 이름이 비어 있음 — 3건 (`gh1-016-1`, `d159` 2건) | 해당 강의 JSON | `out/completeness.json` | `menuLabel` 채우기 |
| ~~BUG-015~~ **종결 (2026-09-22)** | **한글 마침표 앞 공백 2건 → 수정 완료.** `content/ld_english_scripts.json` 의 `d253` n=3 `"…대답할 수 없었다 ."` → `"…대답할 수 없었다."`, `d262` n=4 `"…보낸다 ."` → `"…보낸다."`. 한국어만 바꿨으므로 `generate-azure-ava.mjs --dry-run` → **pending 0** (클립 영향 없음), `check-data-hygiene` 의 `space-before-punct` **2 → 0**, 전체 위생 지적 31 → 29. · **저장소 전수 재검사** (JSON 3,050개·문자열 218,972개): 운영 6개 과정과 화면용 정본에 남은 것 **0건**. 다만 검사 중 **감사 도구가 보지 않는 곳에서 2건을 새로 발견** — `content/lessons/student/s2-6.json` `chunkDrills[3].ko` `"그녀는 개를 가지고 있습니다 ."` 와 `s3-3.json` `chunkDrills[4].ko` `"피아노, 축구 , 컴퓨터게임하는 것을"`. **화면 노출 없음**: STUDENT 는 `LessonBody.tsx:193-200` 에서 `StudentLearningView` 로 분기하는데 `chunkDrills` 를 넘기지 않아, 일반 렌더러의 청크 블록(`:549`)에 도달하지 않습니다. 고치지 않고 기록만 합니다. **감사 세션 확인 (2026-09-22): 오타 2건보다 그 데이터가 놓인 상황이 중요합니다 — `chunkDrills` 는 STUDENT 82강 **전부**에 들어 있고(`content/lessons/student/*.json` 82개 중 82개), `StudentLearningView.tsx` 에는 청크 관련 화면이 한 줄도 없습니다. 유료 82강에 저작된 청크 드릴 콘텐츠가 학습자에게 한 번도 보이지 않는다는 뜻입니다. 이것이 의도된 폐기인지 빠진 기능인지 판단이 필요하므로 BUG-024 로 별도 등록합니다.** 폐지된 `basics` 189건·`cnn` 2건은 작업 대상 아님 · ~~LISTENING 힌트가 쉼표로 끝남(29)~~ → **수정 안 함: 화면 노출 없음, 253강 검사 0건** (2026-09-22). 힌트를 표시하는 `LdLearningView.tsx:86` 이 쉼표를 **구분자로** 쓰고 `:87` 이 조각 끝의 `.` `,` 를 지웁니다. 힌트를 가진 **253강 전수**에 같은 규칙을 돌린 결과: 저장된 원문이 구두점으로 끝나는 강의 **114개**(감사가 센 29보다 많음), 그런데 **화면에 나오는 조각 779개 중 구두점으로 끝나는 것 0개.** 학습자에게 보이지 않으므로 고치지 않습니다 — 고치면 영어 텍스트가 바뀌어 클립 29개를 새로 만들어야 하는데 얻는 것이 없습니다. | `content/ld_english_scripts.json` · `src/components/LdLearningView.tsx:86-87` | `out/data-hygiene.json` + 253강 전수 재검사 | 힌트 쉼표: 수정 불필요 · 한글 공백 2건: 수정 완료 (커밋 `8114912`) |
| BUG-016 | 홈 설명문·사이트맵에 **폐지된 CNN 뉴스**가 남아 있음 | `<meta name=description>`, `sitemap.xml` | `out/commercial.json` | 문구·사이트맵에서 제거 |
| BUG-017 | 공개 검색 색인에 CNN 강의 제목 120건이 남아 있음 | `/search-index.json` | 같은 조회 | 색인에서 제외 |
| BUG-018 | 이용권 **코드 원문이 브라우저에 평문 저장** (검증 토큰이 이미 있어 불필요) | `LicenseProvider.tsx:343` | `scratchpad/license-storage.cjs` (필드 이름·길이만 확인) | 토큰만 저장하고 코드 원문은 저장하지 않기 |
| BUG-019 | 무료 강의 id 로 시작하고 뒤에 숫자를 붙이면 통명 통과 — **실제로 열리는 유료 자료 0건** | `mediaAccess.ts:103` | `out/audio-check-anon.json` | 접두 일치 대신 정확 일치 |
| BUG-020 | 원본 데이터의 영어 문장 앞에 문항 번호가 남아 있음 — 6곳. **앱이 떼고 쓰므로 현재는 무해** | `grammar1` 해당 JSON | `out/data-hygiene.json` | 원본 정리 (정리 규칙이 바뀌면 곧바로 오채점이 됨) |
| BUG-021 | VOCA 연어(콜로케이션) 카드가 낱말 5,831개 중 **18개**에만 존재 (0.3%) | `vocaUtils.ts` `COLLOCATION_PRESETS` | `out/data-integrity.json` | 의도한 범위인지 확인 — 광고된 기능이 거의 비어 있음 |
| BUG-024 | **STUDENT 유료 82강 전부에 청크 드릴(`chunkDrills`) 데이터가 있으나 학습자에게 한 번도 표시되지 않음.** `LessonBody.tsx:193-200` 이 STUDENT 를 `StudentLearningView` 로 분기하면서 `chunkDrills` 를 넘기지 않고, 그 화면에는 청크 관련 UI 가 한 줄도 없음. `chunkDrills` 를 실제로 그리는 코드는 일반 렌더러(`LessonBody.tsx:549`)뿐인데 STUDENT 는 그 앞에서 반환됨. 감사 도구가 보지 않던 영역이라 최초 감사에서 누락 — BUG-015 정리 중 발견 (2026-09-22) | `src/components/LessonBody.tsx:193-200` · `StudentLearningView.tsx` · `content/lessons/student/*.json` 82개 | `chunkDrills` 포함 파일 82개 = STUDENT 전체 강의 수 · `StudentLearningView.tsx` 내 `chunk`/`청크` 검색 0건 | **의도된 폐기인지 빠진 기능인지 소유자 판단 필요.** 빠진 기능이면 유료 82강에서 학습 단계 하나가 통째로 빠진 것이고, 폐기라면 데이터를 지워야 함 (LD 죽은 사본과 같은 처리) |

---

## 소유자·변호사에게 넘긴 항목 (명령 §0 에 따라 재조사하지 않음)

- 법률 문서 (BUG-003 에 포함)
- 결제 연결 (BUG-004)
- 관리자 2단계 인증
- Vercel Hobby 요금제의 상업 이용 조건·사용량 한도 (COM-05)
- LISTENING L-74 / L-84, READING pr054 (R-30) · pr078 (R-32)
- 현대 저작물 인용 (R-29 · R-43 · R-75)
