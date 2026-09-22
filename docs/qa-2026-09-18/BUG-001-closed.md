# BUG-001 · 음성 클립 387개 — **제품 결함 아님** (2026-09-22 종결)

> 소유자 결정: **클립을 하나도 생성하지 않는다.** 감사 도구의 기대값을 앱 기준으로 고치고 닫는다.
> 이 문서는 그 판단의 근거입니다. 작성·확인 모두 같은 에이전트(Claude)가 했습니다 — 독립 검수가 아니므로,
> 아래 숫자는 전부 직접 다시 돌려 확인하실 수 있는 명령과 함께 적었습니다.

## 결론

| | |
|---|---|
| 404 로 확인된 클립 | 387개 |
| **실제로 재생을 요청하는 버튼이 있는 클립** | **0개** |
| **생성이 필요한 클립** | **0개** |

## 387개가 무엇이었나 — 역추적 100% (실패 0건)

클립 키(`/audio/azure-ava/v1/<key>.mp3`)를 텍스트로 되돌린 결과, 두 종류뿐이었습니다.

| 개수 | 정체 | 출처 |
|---|---|---|
| 378 | LISTENING 한글 **해석** 문장 | `content/ld_english_scripts.json` 의 `ko` (강의 190개) |
| 9 | VOCA 연어 카드의 영어 **예문** | `src/lib/vocaUtils.ts` `COLLOCATION_PRESETS[*].exampleSentence` |

387개 중 다른 과정(STUDENT·READING 등 한국어를 실제로 말하는 곳)에도 같은 문장이 있는 것은 **0개**입니다.

## 왜 아무도 요청하지 않는가

### LISTENING 한국어 378개

- `src/components/LdLearningView.tsx` 의 재생 호출 **8곳이 전부 `.en` 또는 연음 카드의 `card.original`** 입니다
  (721·728·846·858·939·977·1099·1258행). 한국어(`.ko`)가 쓰이는 네 곳(713·948·1081·1250)은
  **전부 `<p>` 안의 글자**이고 버튼이 아닙니다.
- 상단 플레이어도 `ld` 이면 영어 목록을 먼저 돌려줍니다 (`src/app/[course]/[lesson]/page.tsx:440`).
- `scripts/generate-azure-ava.mjs` 는 **일부러** `row.en` 만 수집합니다. 주석에 이유가 적혀 있습니다 —
  한국어까지 모았더니 *해석을 고칠 때마다 음성이 없어진 것처럼 보였다*.

**측정(2026-09-22)** — 로컬에서 `/ld/d002-1` STEP 5 의 문장 🔊 를 눌렀을 때 네트워크 요청은 하나:
`1l-c2699a093492cca2.mp3` → **206** (1번 문장의 **영어** 키). 같은 강의의 한국어 4·5번 키
(`1u-e1c5ec89e163d682`, `y-d75d5158508518f2`)는 404 목록에 있으나 **요청 자체가 없었습니다.**

**감사 자신의 실행 기록** — 이용권으로 276강을 전수 구동하며 실제 요청된 클립 주소를 남긴
`out/features/ld*.jsonl` · `out/recheck-audio-ld.jsonl` 안에 **378개 중 단 하나도 없습니다.**
대조군으로 쓴 위 영어 키는 그 기록에 **있습니다**(스캔이 정상 작동한다는 증거).

### VOCA 예문 9개

- 연어 카드의 재생 버튼은 하나뿐이고 `phrase` 를 말합니다 (`PhonicsLearningView.tsx:641`).
  예문은 `:661` 에서 **기울임 글씨로만** 나오고 자기 버튼이 없습니다.
- preset 10개의 `phrase` 클립은 **10개 전부 존재**합니다.
- **실행 기록** — VOCA 전수 스윕(195강, 요청된 클립 3,901개)에 `recover`·`discover` 의 **phrase 키가 있어**
  그 버튼을 실제로 눌렀음이 확인되고, 같은 기록에 **예문 키 9개는 하나도 없습니다.**

## 생성기 기준 확인

```
node scripts/generate-azure-ava.mjs --dry-run
  items   : 32,374
  pending : 1        ← "I am a boy." (grammar1/gh1-021)
```

생성기가 필요하다고 보는 것은 **1개**이고, 그 1개는 **운영에 이미 있습니다**
(probe 의 "정상 2건" 중 하나). 이 체크아웃에만 없는 것이므로 **운영 기준 0개**입니다.

## 387이라는 숫자가 나온 이유

감사 도구의 기대값 모델(`docs/qa-2026-09-18/scripts/lib/expectations.cjs`)이 앱보다 두 줄 더 요구했습니다.

| 위치 | 고치기 전 | 고친 뒤 |
|---|---|---|
| `expected()` 의 `ld` 분기 | `for (const r of rows) { addClip(r.en); addClip(r.ko); }` | `for (const r of rows) addClip(r.en);` |
| `expected()` 의 `phonics` 분기 | `if (col) { addClip(col.phrase); if (col.exampleSentence) addClip(col.exampleSentence); }` | `if (col) addClip(col.phrase);` |

`audio-inventory.cjs` 가 이 모델로 카탈로그를 만들고 → `check-completeness.cjs` 가 그 클립들을
"파일 없음"으로 적고 → `probe-missing-clips.cjs` 가 그대로 운영에 물어본 것입니다.

## 고친 뒤 검증

```
node docs/qa-2026-09-18/scripts/check-completeness.cjs
  고치기 전 : 지적 4,009건 · ld missing-clip 756 · phonics 18 · grammar1 8
  고친 뒤   : 지적 3,235건 · ld missing-clip   0 · phonics  0 · grammar1 8
```

```
node docs/qa-2026-09-18/scripts/audio-inventory.cjs
  freeLessonClipsNotInFreeKeyList : 0     ← 무료 강의 클립이 무료 목록에서 빠진 것 없음
  paidOnlyClipsInFreeKeyList      : 0     ← 유료 전용 클립이 무료로 새는 것 없음
  oneKeyManyTexts                 : 0
```

무료 목록 점검이 0건이 되면서 `findings-log.md` 의 **AUDIO-FREE-01**(무료 d002 한국어 클립 2개가
무료 목록에 없다 — CANDIDATE) 도 함께 해소됩니다. 그 2개는 애초에 재생되지 않는 클립이었습니다.

## 남은 것 — GRAMMAR I 클립 2개 (P3, 지금은 무해)

`check-completeness` 의 grammar1 8건은 **서로 다른 클립 2개**를 강의 4개에서 센 것이고,
**둘 다 운영에서는 정상 제공**됩니다(probe 의 206 응답 2건). 이 체크아웃에만 없습니다.
다만 그중 하나는 앞으로를 위해 적어 둘 만합니다.

| 키 | 문장 | 사정 |
|---|---|---|
| `b-5e89d9dbb8adad0b` | `I am a boy.` | `gh1-021` 에 번호 없이 들어 있어 생성기가 수집함 (위 `pending: 1`) |
| `b-bd8fc71b9dacaff6` | `I was poor.` | `gh1-009` 원본은 `"1. I was poor."`. 앱은 `cleanText` 로 번호를 떼고 **뗀 문장**의 클립을 요청하는데, **생성기는 번호가 붙은 원본만 수집**합니다 |

즉 번호가 붙은 문항의 클립은 생성기가 만들어 주지 않고, 지금 운영에 있는 것은 과거 생성분입니다.
**BUG-020**(원본 데이터에 문항 번호 잔존 6곳)을 고치면 원본과 화면 문장이 같아져 이 구멍도 같이 닫힙니다.
`scripts/buildFreeSpeechKeys.mjs` 는 이미 번호를 뗀 형태도 키 목록에 넣고 있습니다
(`collectValue` 의 `unnumbered`) — 생성기에는 그 처리가 없습니다.

## 참고로 남기는 사실

LISTENING 한국어 문장 2,217개 중 **1,839개는 클립이 이미 있습니다.** 생성기가 한국어까지 모으던
시절의 잔재이고, 없는 378개는 그 뒤에 **해석을 고친 문장들**입니다. 아무도 듣지 않는 무리에서
378개만 구멍이 난 것이지 기능이 깨진 것이 아닙니다. (지금 있는 1,839개는 그대로 둡니다.)
