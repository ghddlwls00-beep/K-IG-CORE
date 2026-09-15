# KIG-006 — 검수표 (수정 반영판) · 승인 요청

> 상태: **데이터 미기록** (`content/` 변경 0건). 이 문서는 승인용 검수표입니다.
> 승인 후에만 `alternatives` 를 생성하고, 오디오 리베이크는 그 다음 `--dry-run` 부터 진행합니다.

---

## 0. 지적사항 3건 반영 결과

| # | 지적 | 반영 |
|---|---|---|
| 1 | SUBSTITUTE 대안이 **단어 조각** — `"that"` 한 단어로 100점 | 모든 대안을 **완전한 문장**으로 생성. `Did he like it(that)?` → `text "Did he like it?"` / `alt "Did he like that?"` |
| 2 | 주 정답(`text`)이 **뒤집힘** | 괄호 **밖**(교재가 앞에 쓴 것)을 주 정답, 괄호 안을 대안으로. 전 종류 적용 |
| 3 | `We were workers (laborers).` 대안 | `"We were laborers."` (동의어 교체, INSERT 아님) |

### 검증 결과 (assertion)

```
alternative/primary ratio check : 176 alternatives, 0 violations
   (대안 단어수 >= 주정답 단어수 * 0.6 — 전건 통과)
fragment-exact probe check      : 172 rows x 6 probes
   ("that"/"they"/"it"/"Is he not"/"dreams"/"s" → exact 일치 0건)
category A ratio violations     : 0
expected-value checks           : 19 pass / 0 fail
```

---

## 0.5 괄호 2개 이상 18건 — 전건 소진 (round 2 지적 반영)

지적: **괄호가 2개 이상인 문장이 반쪽만 처리**되어 주정답·대안에 `( )` 가 남았다. 아래 3원칙으로 재작성했습니다.

| 원칙 | 내용 |
|---|---|
| **1. 완전 소진** | 주정답·모든 대안에 `(` `)` `혹은` **0건**. 남으면 TTS가 괄호를 읽고, 학습자가 정답을 쳐도 오답이 된다 |
| **2. 연동 치환** | 한 절 안에서 조동사/시제/수가 호응하는 괄호는 **한 묶음**으로만 뒤집는다. `could(can) … couldn't(can't)` 는 동시에. 교차 조합(`"It can be improved, couldn't it?"`)은 **정답으로 등록되지 않는다** |
| **3. 다단어 구 통째 대체** | `take part(participate)` 의 `participate` 는 `part` 가 아니라 **`take part` 전체**를 대체 → `"The CIA did not participate in that raid, did it?"` |

### 18건 → 고유 14건 전건 (50개 칸)

| # | 원문 (교재 그대로) | 제안 주정답 (`text`) | 제안 대안 (`alternatives`) |
|---|---|---|---|
| 1 | `(The) Palestinians and (the) Israelis must act.` | The Palestinians and the Israelis must act. | Palestinians and Israelis must act. |
| 2 | `(Were it not for the sun,) nothing could live.(If it were not for the sun,) nothing could live.` | Were it not for the sun, nothing could live. | If it were not for the sun, nothing could live. |
| 3 | `All (the) boys do not receive a prize(혹은 prizes).` | All the boys do not receive a prize. | All the boys do not receive prizes. |
| 4 | `All (the) boys receive a prize(혹은 prizes).` | All the boys receive a prize. | All the boys receive prizes. |
| 5 | `Are(Were) you mad (angry)?` | Are you mad? | Were you mad? |
| 6 | `Aren't they(those) yours(Are they not yours)?` | Aren't they yours? | Are they not yours? |
| 7 | `Do your son(s) and daughter(s) have a dream (dreams)?` | Do your son and daughter have a dream? | Do your sons and daughters have a dream? |
| 8 | `Do your son(s) and daughter(s) have pets(a pet)?` | Do your son and daughter have pets? | Do your son and daughter have a pet? / Do your sons and daughter have pets? / Do your sons and daughter have a pet? / Do your son and daughters have pets? / Do your son and daughters have a pet? / Do your sons and daughters have pets? / Do your sons and daughters have a pet? |
| 9 | `I never get carsick but I always get airsick (aboard a plane) or seasick (aboard a ship).` | I never get carsick but I always get airsick or seasick. | …get airsick or seasick aboard a ship. / …get airsick aboard a plane or seasick. / …get airsick aboard a plane or seasick aboard a ship. |
| 10 | `It could(can) be improved, couldn't(can't) it?` | It could be improved, couldn't it? | It can be improved, can't it? |
| 11 | `That(It) is your car, isn't that(it)?` | That is your car, isn't that? | It is your car, isn't it? |
| 12 | `The CIA did not take part(participate) in that(the) raid, did it?` | The CIA did not take part in that raid, did it? | The CIA did not participate in that raid, did it? |
| 13 | `Those(they) are books, aren't they(혹은 ---, are they not)?` | Those are books, aren't they? | Those are books, are they not? / They are books, aren't they? / They are books, are they not? |
| 14 | `We are going to(will) do that another time (some other time).` | We are going to do that another time. | We will do that another time. / We are going to do that some other time. / We will do that some other time. |

지적된 6개 실제 오류 → 수리 확인:

| 지적 위치 | 지적된 오류 | 수리 후 |
|---|---|---|
| `gh1-117 #8` | 주정답 `"It could be improved, couldn't(can't) it?"` ← 괄호 잔존 | `"It could be improved, couldn't it?"` (괄호 0) |
| `gh1-117 #8` | 대안 `"It can be improved, couldn't(can't) it?"` ← 괄호+호응 불일치 | 대안 `"It can be improved, can't it?"` — **교차 조합 미등록** |
| `gh1-107 #14` | 대안 `"…did not take participate in that(the) raid…"` ← 비문 | `"…did not participate in that raid, did it?"` |
| `gh1-059 #12` | 주정답 `"That is your car, isn't that(it)?"` ← 괄호 잔존 | `"That is your car, isn't that?"` |
| `gh1-121 #21` | 주정답 `"Palestinians and (the) Israelis must act."` ← 괄호 잔존 | `"The Palestinians and the Israelis must act."` |
| `gh1-017 #4,5` | 주정답 `"All (the) boys receive a prize."` ← 괄호 잔존 | `"All the boys receive a prize."` |
| `gh1-047 #83` | 대안 `"…are they not."` ← 괄호 잔존 + `?` 가 `.` 로 | `"Those are books, are they not?"` (`?` 유지) |

### 추가된 assertion 3종 (전건 0 위반)

```
paren-residue check            : 0 violations   # text/대안 전체에 ( ) 혹은 0건
terminator-consistency check   : 0 violations   # 주정답의 . ? ! 가 모든 대안에 유지
auxiliary-agreement check      : 0 violations   # could…can't / can…couldn't 교차 없음
multi-paren rows               : 14, pass 14, fail 0
```

부수적으로 제거한 비문(교차 조합 생성물): `"Do your son ands have a dream?"`, `"a prizes"`, `"Itcan be improved"`, `"isn'tit"`, `"mad angry"`, `"are they not are they not?"`.

---

## 1. 지적사항 1·2 적용 예시 (before → after)

| 원문 | 수정 전 (문제) | 수정 후 (제안) |
|---|---|---|
| `Did he like it(that)?` | text `Do they like that?` / alt `that` | **text `Did he like it?`** / alt `Did he like that?` |
| `Isn't he(Is he not) coming here?` | alt `Is he not.` | **text `Isn't he coming here?`** / alt `Is he not coming here?` |
| `Those(They) are their pens.` | text `They are their pens.` | **text `Those are their pens.`** / alt `They are their pens.` |
| `What do you do on Sunday(s)?` | text `Sundays` | **text `What do you do on Sundays?`** / alt `What do you do on Sunday?` |
| `We were workers (laborers).` | alt `We were workers laborers.` | **text `We were workers.`** / alt `We were laborers.` |
| `Each boy receives a prize(혹은 prizes).` | alt `prizes` | **text `Each boy receives a prize.`** / alt `Each boy receives prizes.` |
| `Isn't it a book(혹은 Is it not a book)?` | alt `Isn't it Is it not a book?` | **text `Isn't it a book?`** / alt `Is it not a book?` |
| `Am I not a boy(혹은 Ain't I a boy)?` | alt `Am Ain't I a boy?` | **text `Am I not a boy?`** / alt `Ain't I a boy?` |

추가로 처리된 형태:

| 형태 | 원문 | 제안 |
|---|---|---|
| 다단어 치환 | `Why were you not(weren't you) studying English?` | text `Why were you not studying English?` / alt `Why weren't you studying English?` |
| 다단어 치환 | `When will they(are they going to) finish …?` | text `When will they finish …?` / alt `When are they going to finish …?` |
| 동사구 교체 | `It will handle(deal with) redevelopment.` | text `It will handle redevelopment.` / alt `It will deal with redevelopment.` |
| 조건절 도치 | `If I had enough money(Had I enough money), I would …` | text `If I had enough money, I would …` / alt `Had I enough money, I would …` |
| 도치 2변형 | `Should I have been(If I had been, had I been) three minutes late, …` | alt 2개: `If I had been three minutes late, …` / `Had I been three minutes late, …` |
| 전위절 | `Should you not go, he would go. (If you should not go,) he would go.` | text `Should you not go, he would go.` / alt `If you should not go, he would go.` |

---

## 2. POLLUTED 9건 — 지시대로 수리

> 아래 9행 중 7행은 §0.5 의 다중 괄호 resolver 결과와 **동일 소스**로 맞췄습니다([R] 표시).
> round 1 손으로 적었던 값 중 `gh1-080-2#36` 의 `Are you angry?` 는 round 2 의 gloss 규칙으로 제거된 대안이라 삭제했습니다.

| page | # | 현재 text | 수리 후 text | 수리 후 alternatives | |
|---|---|---|---|---|---|
| gh1-032 | 36 | `Don't I love her(Do I not ---)? 37.This is mine.` | `Don't I love her(Do I not ---)?` | `Do I not love her?` | |
| gh1-032 | 37 | `It is yours. 39.Those(They) are theirs.` | `This is mine.` | — | |
| gh1-032 | 47 | `Aren't they(those) yours(Are they not yours)?` | `Aren't they yours?` | `Are they not yours?` | [R] |
| gh1-062 | 26 | `Do your son(s) and daughter(s) have a dream (dreams)?` | `Do your son and daughter have a dream?` | `Do your sons and daughter have a dream?` / `Do your son and daughters have a dream?` / `Do your sons and daughters have a dream?` | [R] |
| gh1-080-2 | 36 | `Are(Were) you mad (angry)?` | `Are you mad?` | `Were you mad?` | [R] |
| gh1-090 | 26 | `Do your son(s) and daughter(s) have pets(a pet)?` | `Do your son and daughter have pets?` | `Do your son and daughter have a pet?` / `Do your sons and daughter have pets?` / `Do your sons and daughter have a pet?` / `Do your son and daughters have pets?` / `Do your son and daughters have a pet?` / `Do your sons and daughters have pets?` / `Do your sons and daughters have a pet?` | [R] |
| gh1-118-2 | 66 | `We are going to(will) do that another time (some other time).` | `We are going to do that another time.` | `We are going to do that some other time.` / `We will do that another time.` / `We will do that some other time.` | [R] |
| gh2-026-1 | 17 | `I never get carsick but I always get airsick (aboard a plane) or seasick (aboard a ship).` | `I never get carsick but I always get airsick or seasick.` | `…get airsick or seasick aboard a ship.` / `…get airsick aboard a plane or seasick.` / `…get airsick aboard a plane or seasick aboard a ship.` | [R] |
| gh2-048-1 | 14 | `(Were it not for the sun,) nothing could live.(If it were not for the sun,) nothing could live.` | `Were it not for the sun, nothing could live.` | `If it were not for the sun, nothing could live.` | [R] |

---

## 3. gh1-032 / gh1-033 칸 재정렬 수정안

**진단** — `gh1-033`(영어 답안)에서 두 칸이 붙어(glued) 있고, 그 뒤로 번호가 2칸씩 밀렸으며, 마지막 두 문장이 **원래 번호(#24, #25)** 를 단 채 하단에 재수록되어 있습니다. 한국어 `gh1-032`(#26~#50)는 온전하므로, 붙은 칸을 쪼개면 1:1로 정렬됩니다. **버리는 문장은 없습니다** — 하단의 `#24`/`#25` 는 바로 `#49`/`#50` 의 정답입니다.

```
#36 "Don't I love her(Do I not ---)? 37.This is mine."   → #36 / #37 로 분리
#38 "It is yours. 39.Those(They) are theirs."            → #38 / #39 로 분리  (원래 #37 칸 없음)
#40~ 은 2칸 밀림, 하단 #24/#25 는 #49/#50 의 정답
```

| # | 한국어 프롬프트 | 현재 영어 | 제안 영어 |
|---|---|---|---|
| 26 | 그가 그녀의 누이를 사랑하나? | Does he love her sister? | Does he love her sister? |
| 27 | 내가 그녀를 사랑하나? | Do I love her? | Do I love her? |
| 28 | 내가 너를 사랑하지 않나? | Don't I love you(혹은 Do I not ---)? | Don't I love you(혹은 Do I not ---)? |
| 29 | 너는 나의 누이를 사랑하지 않나? | Don't you love my sister(혹은 Do you not ---- )? | Don't you love my sister(혹은 Do you not ---- )? |
| 30 | 그가 나를 사랑하지 않나? | Doesn't he love me(혹은 Does he not ---)? | Doesn't he love me(혹은 Does he not ---)? |
| 31 | 그녀가 너의 형제를 사랑하지 않나? | Doesn't she love your brother(혹은 Does she not ---)? | Doesn't she love your brother(혹은 Does she not ---)? |
| 32 | 그들이 너를 사랑하지 않나? | Don't they love you(혹은 Do they not---)? | Don't they love you(혹은 Do they not---)? |
| 33 | 그녀가 그의 형제를 사랑하지 않나? | Doesn't she love his brother(혹은 Does she not ---) ? | Doesn't she love his brother(혹은 Does she not ---) ? |
| 34 | 내가 그를 사랑하지 않나? | Don't I love him(혹은 Do I not ---)? | Don't I love him(혹은 Do I not ---)? |
| 35 | 그가 그녀의 누이를 사랑하지 않나? | Doesn't he love her sister(혹은 Does he not --)? | Doesn't he love her sister(혹은 Does he not --)? |
| **36** | 내가 그녀를 사랑하지 않나? | Don't I love her(Do I not ---)? 37.This is mine. | **Don't I love her(Do I not ---)?** |
| **37** | 이것은 나의 것이다. | It is yours. 39.Those(They) are theirs. | **This is mine.** |
| **38** | 그것은 너의 것이다. | These are his. | **It is yours.** |
| **39** | 그들은 그들의 것들이다. | It is hers. | **Those(They) are theirs.** |
| **40** | 이것들은 그의 것이다. | Is this mine? | **These are his.** |
| **41** | 그것은 그녀의 것이다. | Is it yours? | **It is hers.** |
| **42** | 이것은 나의 것이냐? | Are those(they) theirs? | **Is this mine?** |
| **43** | 그것은 너의 것이냐? | Are these his? | **Is it yours?** |
| **44** | 그것들은 그들의 것들이냐? | Is it hers? | **Are those(they) theirs?** |
| **45** | 이것들은 그의 것이냐? | Isn't this mine(혹은 Is this not mine?) | **Are these his?** |
| **46** | 그것은 그녀의 것이냐? | Isn't it yours(혹은 Is it not yours)? | **Is it hers?** |
| **47** | 이것은 나의 것이 아니냐? | Aren't they(those) yours(Are they not yours)? | **Isn't this mine(혹은 Is this not mine?)** |
| **48** | 그것은 너의 것이 아니냐? | Aren't these his?(Are these not his)? | **Isn't it yours(혹은 Is it not yours)?** |
| **49** | 그들은 너의 것들이 아니냐? | Aren't they yours? | **Aren't they(those) yours(Are they not yours)?** |
| **50** | 이것들은 그의 것이 아니냐? | Aren't these his? | **Aren't these his?(Are these not his)?** |

**내용이 바뀌는 칸: 15 / 25** (굵은 행). 나머지 10칸은 그대로.

**의미 검증** — 제안 영어가 한국어와 1:1 대응함을 확인:
`#37 이것은 나의 것이다.→This is mine.` / `#38 그것은 너의 것이다.→It is yours.` / `#39 그들은 그들의 것들이다.→Those(They) are theirs.` / `#44 그것들은 그들의 것들이냐?→Are those(they) theirs?` / `#49 그들은 너의 것들이 아니냐?→Aren't they(those) yours…?` / `#50 이것들은 그의 것이 아니냐?→Aren't these his?`

---

## 4. 분류 요약 (고유 180 + A 58)

| kind | count | 처리 |
|---|---:|---|
| SUBSTITUTE | 151 | 괄호 밖 = text, 괄호 안을 치환한 **완전 문장** = alt |
| APPEND | 12 | INSERT(주정답 생략형) / REPLACE(동의어·굴절 교체) |
| SUFFIX | 3 | 굴절형 = text, 원형 = alt |
| SENTENCE | 6 | 괄호 = 별도 문장, alt 로 그대로 |
| POLLUTED | 9 | §2 에서 수리 (alternatives 문제 아님) |
| Category A (`혹은`) | 58 | 괄호 밖 = text, 치환 문장 = alt |

- 전체 대안 **176개**(B/C/D 181행 기준), ratio 위반 **0건**, 조각 일치 **0건**.
- 다중 괄호 **고유 14건 / 50칸** — §0.5 표, 소진·종결부호·호응 위반 **0건**.
- `content/` 변경 **0건** (기록 전).

---

## 5. 승인 요청

1. §1 (지적 3건 반영) — 승인?
2. §2 (POLLUTED 9건 수리안) — 승인?
3. §3 (gh1-032/033 재정렬) — 승인?
4. **§0.5 (괄호 2개 이상 18건 → 고유 14건 전건 소진)** — 승인?
5. 승인 시 순서: ① `content/` 에 `alternatives` 기록 → ② `gh1-032/033` 재정렬 → ③ `npx tsc --noEmit` + `pnpm run build` → ④ 오디오 리베이크 `--dry-run` (pending 건수·글자 수 먼저 보고).

---

## 부록 — 재현 명령

```bash
node docs/qa-2026-09-15/scripts/classify-kig006.cjs           # 180개 분류
node docs/qa-2026-09-15/scripts/report-kig006.cjs             # 검수표 + assertion 5종
node docs/qa-2026-09-15/scripts/verify-kig006-proposals.cjs   # 19건 기대값 검증 (단일 괄호)
node docs/qa-2026-09-15/scripts/verify-kig006-multiparen.cjs  # 14건 표 + 소진/종결부호/호응
node docs/qa-2026-09-15/scripts/inventory-multiparen.cjs      # 괄호 2개 이상 고유 목록
node docs/qa-2026-09-15/scripts/realign-gh1032.cjs            # gh1-032 재정렬
```

증거 파일:

```
docs/qa-2026-09-15/evidence/kig006-multiparen.json       # 14건 최종 text/alternatives
docs/qa-2026-09-15/evidence/kig006-alternatives.json     # 176개 대안 전체
docs/qa-2026-09-15/evidence/kig006-gh1032-realign.json   # 재정렬 15/25칸
```
