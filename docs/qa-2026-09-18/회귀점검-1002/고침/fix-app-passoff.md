# 고침 — fix-app-passoff (PASS-OFF 앱 틀림 A3 · A4 · A5 · A7) · 2026-10-05

- 근거: `결과.md` 2장 A3 · A4 · A5 · A7 · `단계3/s3-student-adult-passoff.md` · `단계3/s3b-passoff-review.md` · `단계3/s3d-passoff-review-answer.md` · `단계0/wrongspot-hangul.md`
- 사장님 결정(작업기록 10:1x ~ 11:0x)대로: 판단 필요 A6(=P1) · P2 · P3 · P5 는 **안 고침**. 커밋 · 푸시 · R2 · 음성 생성 안 함.
- **같은 AI 계열이 고치고 점검함 — 독립 검수 아님.**

## 고친 것

| # | 무엇 | 파일 | 전 → 뒤 | 소리 바뀜 |
|---|---|---|---|---|
| A3 | ④⑤ 도움 '낱말 카드'의 방해 낱말에 영어에 없는 꼴(hows · whens · buts · saids · alway · quicklies …) | `src/lib/passoffLesson.ts`(partnersOf · 새 partnerFormsOf · contrastPool) · 새 `src/lib/passoffPartnerForms.ts`(서버 전용) · `src/lib/passoffContent.ts`(붙이기) · `src/lib/passoffWordForms.ts`(새 isIrregularOtherForm) · `src/lib/passoffTypes.ts`(partnerForms 칸) | 전: 휴대폰에서 철자만으로 -s/-es/-ies 를 붙이거나 뗌 → 1,290문항 중 **211문항**에 가짜 낱말(낱말 150개). 뒤: '짝 꼴'(likes ↔ like 등)은 **서버가** 진짜 낱말만 골라 문항에 `partnerForms` 로 붙여 보냄 — 진짜 낱말 = VOCA 사전(content/voca_dictionary.json) 표제어 또는 그 강의의 맞는 영어(모범 답 · 허용 답 · 영어 제시문 · 목표 낱말, 유료 보충 포함 · 오답 패턴 · 보기 · 타일은 뺌). 접속사 · 의문사 · 전치사 · 부사 · 감탄사 · 조동사 · -s 로 끝나는 비복수(news 등) · 일부 형용사(good 등)는 짝 없음, 과거형 · -ing · -ly 꼴과 불규칙 표의 과거 · 분사 · 복수(said · been · men)는 짝 없음, 'go - went - gone' 같은 동사 세 꼴 문항은 철자 짝 없음. 표(is ↔ are · a ↔ an · I ↔ me 등)는 그대로 → **가짜 0** | 없음(타일은 소리 없음) |
| A4 | 완료한 PASS-OFF 강의를 다른 기기 · 저장소 비운 쪽에서 열면 끝 칸이 꺼진 '이 강의 학습 완료' + '5단계를 모두 마치면…' | `src/components/LessonEndBar.tsx` · `src/components/PassoffLearningView.tsx` | 전: 끝 칸이 이 기기 기록(isCompleted)만 봄. 뒤: PASS-OFF 는 서버 완료(PassoffProgressProvider `countedIds` — 목록이 보는 것과 같음)도 완료로 봄 → '학습 완료함'(취소 없음 — 서버는 완료만 받음). 그 기기에서 5단계를 다시 다 하면 '처음부터 다시 하기' 때처럼 완료를 한 번 더 보냄(복습 기록이 그 기기에도 들어감 — PassoffLearningView 의 같은 길에 countedIds 를 더함) | 없음 |
| A5 | 화면대로 한글로 쓴 맞는 답('He is 대한.' · 'I live in 서울.')에 '한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.' | `src/components/passoff/ComposeCard.tsx` · `src/components/passoff/FormStep.tsx` | 전: `hasHangul(값)`. 뒤: `hasHangul(asWritten(값))`(채점이 읽는 대로 — 표의 한국어 낱말은 로마자로 되돌린 뒤) — 마이크로 받은 글도 같음. 한글을 조합하는 중(ㅅ → 서 → 서울)에는 경고를 켜지 않고 조합이 끝날 때 판단(끄는 것은 바로) — 깜빡임 막음 | 없음 |
| A7 | pg13-1 p16 틀린 자리 줄 '… Admiral 이 순신.' · 정답 보기 '→ 이'(한 글자) | `src/lib/passoffLesson.ts`(새 joinNameTokens) · `src/components/passoff/ui.tsx`(새 namesFor) · `src/components/passoff/ComposeCard.tsx`(DiffLine 두 곳) | 전: 채점기가 낱말 하나씩 표시해 이름이 '이' · '순신' 으로 갈려 그려짐, 가장 가까운 허용 답이 성만 있는 'Admiral Yi' 일 때 '→ 이'. 뒤: 같은 종류의 낱말이 그 쪽 표의 여러 낱말 이름('Yi Sun-sin')을 이루면 한 낱말로 이어 그림 → 'Admiral 이순신.'; 틀린 · 빠진 낱말의 답이 이름 첫 낱말 하나뿐이고 모범 답에 이름 전체가 있으면(다음 낱말이 이름을 잇지 않을 때) 이름 전체로 → '→ 이순신'(모범 답 철자 — 이것도 정답). 학습자가 쓴 낱말은 잇기만 하고 바꾸지 않음. 채점은 그대로 | 없음 |

**바꾼 소리 글: 없음.** 강의 글 · 화면 문구(소리 내는 글)를 하나도 바꾸지 않았습니다(`content/` 바뀜 0 — 이 일꾼 몫). 새 클립 0.

## 안 고친 것과 까닭

| # | 까닭 |
|---|---|
| A6 (= P1) 복습 끝 화면 '내일 올 문항' | 사장님 판단 필요 — 고치지 말라는 지시 |
| P2 오답노트 영구 누적 · P3 구성도 대표 문장 · P5 첫 글자 힌트 | 사장님 판단 필요 — 고치지 말라는 지시 |
| A3 에서 짝을 잃은 진짜 낱말 | 강의 안 영어에 없고 사전에도 없는 꼴은 서버가 모름 → 짝을 안 줌(가짜보다 안전한 쪽). 고치기 전 진짜 짝 꼴 중 이번에 빠진 것: cats · days · books · calls · takes · speaks · studies · loves · falls · woods · firefighters · pianists 등(앞 둘 중 짝 꼴 타일 397장 → 169장, 가짜 214장이 빠진 몫이 대부분). 그 자리는 generateWordBank 자기 방해 낱말이 채움(고치기 전과 같은 길). 과정 전체 영어를 쓰면 몇 장(169 → 177) 더 살지만 쪽을 열 때마다 67강의(3.6MB)를 읽어야 해서 그 강의 영어만 씀 |
| A4 화면 확인 | 로컬에는 이용권 · 서버 진도가 없어 countedIds 가 생기지 않음 → 로컬 브라우저로는 못 봄. **배포 뒤 운영 확인 필요**: 감사 이용권(pg01-1 · 01-2 · 01-3 서버 완료)으로 저장소 비운 사본에서 /passoff-grammar/pg01-1 을 열어 끝 칸이 '학습 완료함'(꺼진 '이 강의 학습 완료' · '5단계를 모두 마치면…' 없음)인지 |
| A7 화면 확인 | pg13-1 은 유료 — 로컬(이용권 없음)에서 못 엶. 앱 함수(채점기 → joinNameTokens → koreanOnScreen)로 확인. 배포 뒤 운영에서 pg13-1 p16 에 'Admiral Tokyo.' 를 두 번 틀려 정답 보기가 '→ 이순신' 인지 보면 됨 |

## 돌린 검사

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 (마지막 실행 — 다른 일꾼 바뀜 포함 작업 트리) |
| `node docs/pass-off-grammar/검사/check-grading.cjs` | PASS |
| `node docs/pass-off-grammar/검사/check-lessons.cjs` | problems 0 · warnings 0 |
| `node docs/qa-2026-09-18/회귀점검-1002/단계0/already-fixed-hangul-forms.cjs` | 523/523 PASS(GRAMMAR II 72 · PASS-OFF 451) |
| `check-screen-fixes.cjs` · `check-leak-fix.cjs` · `check-lesson-state.cjs` · `check-learning-api.cjs`(25/25) · `check-learning-e2.cjs`(12/12) · `check-unlock.cjs`(372/372) | 모두 PASS (contrastPool · passoffContent · passoffReview 를 쓰는 검사) |
| `node scripts/checkPassoffFreeLeak.mjs` | PASS — 무료 글 속 유료 문장 0 |
| **A3 다시 셈** `고침/fix-app-passoff/po-distractors-after.cjs`(단계3 po-distractors.cjs 를 따르되 화면이 받는 길 그대로 — 레슨 → 유료 보충 → viewBlocks → 서버 attachPartnerForms → contrastPool 앞 둘) | **1,290문항 · 가짜 낱말 든 문항 0**(단계 3 가짜 목록 150개 다시 나옴 0) · 짝 꼴 타일 169장(낱말 45개 — 목록 `po-distractors-after.txt`, 모두 사람이 읽음: is/are · a/an · I/me · its · like · come · tells · wants · family · student 등) · 이용권 없는 쪽 1,282문항도 0(`po-distractors-after-free.txt`) |
| A3 깨기 ① `--break=old <HEAD 판 passoffLesson.ts>`(`git show HEAD:src/lib/passoffLesson.ts`) | **211문항 · exit 1** — 단계 3 셈과 같은 수(`po-distractors-break-old.txt`) |
| A3 깨기 ② `--break=any-word`(서버 낱말 판단을 '모두 낱말'로) | **16문항 · exit 1**(talls · bigs · afraids · augusts …) — 사전 · 강의 영어 판단이 실제로 막고 있음(`po-distractors-break-any-word.txt`) |
| **A5 · A7 앱 함수** `고침/fix-app-passoff/check-a5-a7.cjs` | 표기 표 16쪽 ④⑤ 한글 꼴 451 · 경고 0 · 채점 정답 451 · 음성 대조(표에 없는 한글을 붙임) 451 모두 경고 · 틀린 자리 줄 1,778줄 이름 쪼개짐 0 · pg13-1 p16 '→ 이순신' · 'Admiral 이순신.' PASS |
| A5 깨기 `--break=old`(고치기 전 판단) | 경고 451/451 · exit 1 |
| A7 깨기 `--break=no-join` | pg13-1 p16 '→ 이' · 'Admiral 이 순신.' FAIL · 쪼개짐 다수 · exit 1 |
| **로컬 개발 서버(포트 3322) drive-passoff** `BASE=http://localhost:3322 node docs/qa-2026-09-18/scripts/drive-passoff.cjs --ids pg01-1,pg01-2 --licence no --no-audio --port 9905 --clone fix-app-passoff --fresh-profile --suffix -fix-app-passoff --out-root <이 폴더>/fix-app-passoff/drive` | **PASS 6 · FAIL 0 · BLOCKED 0**(2강의 × 데스크톱 · 휴대폰 · 작은 휴대폰 · 글 81/81 · 97/97 · ③ · ④⑤ 채점 · 한글꼴 1/1) · 기록 `fix-app-passoff/drive/features/passoff-grammar-fix-app-passoff.jsonl` |
| **A5 화면** `고침/fix-app-passoff/drive-a5-warning.cjs`(로컬 pg01-1 휴대폰 ④ 칸에 직접 침 · 한글 조합은 CDP imeSetComposition) | 고친 판 8/8 PASS(서울 → 경고 없음 · 가나다 → 경고 · 조합 중 ㅅ · 서우 → 경고 없음 · 조합 끝 서울 → 없음 · 가나 → 경고 · 한글 꼴 '확인' → 채점됨) — `drive-a5-warning-after.json` |
| A5 화면 깨기(ComposeCard.tsx 를 HEAD 판으로 잠깐 바꿔 같은 개발 서버) | **FAIL 4 · exit 1**(서울 붙여 넣기 · 조합 중 둘 · 조합 끝 서울에 경고) — `drive-a5-warning-before.json`. 끝나고 고친 판으로 되돌림(파일 해시 같음 확인) |

- 개발 서버 · 브라우저: 포트 3322 하나 · 디버깅 9905(drive-passoff) · 9906(A5 고친 판) · 9907(A5 깨기). 끝나고 모두 끔. `npx next dev`(predev 안 돌림 — 생성 파일 안 바뀜).
- `next build` 는 돌리지 않음(통합 일꾼 몫 — 같은 폴더의 개발 서버와 겹치지 않게).

## 남의 몫에서 찾은 것

- 없음(고치지 않은 남의 파일 0). 참고: `docs/qa-2026-09-18/회귀점검-1002/단계3/s3-student-adult-passoff-기록/po-distractors.cjs` 는 문항을 `contrastPool({en, errorPatterns, targets})` 로 부르므로, 이제는 서버가 붙이는 `partnerForms` 없이 표 짝만 보고 언제나 0 이 나옴(거짓 0). 다시 셀 때는 `고침/fix-app-passoff/po-distractors-after.cjs` 를 쓸 것. 도구 T11(drive-passoff 가 낱말 카드 낱말을 안 봄)은 fix-tools 몫으로 그대로.
- 운영 확인 목록(배포 뒤 주 세션 · 옆 세션): A4 위 '안 고친 것' 줄 · A7 pg13-1 p16 · A3 pg20-2 t1/t2 같은 곳 도움 ③ 타일에 'whens' 등 없음 · A5 pg01-3 p1 에 'He is 대한.' 을 칠 때 경고 없음.

## 바꾼 파일

`src/lib/passoffLesson.ts` · `src/lib/passoffPartnerForms.ts`(새) · `src/lib/passoffContent.ts` · `src/lib/passoffWordForms.ts` · `src/lib/passoffTypes.ts` · `src/components/LessonEndBar.tsx` · `src/components/PassoffLearningView.tsx` · `src/components/passoff/ComposeCard.tsx` · `src/components/passoff/FormStep.tsx` · `src/components/passoff/ui.tsx` · 기록 `docs/qa-2026-09-18/회귀점검-1002/고침/fix-app-passoff.md` · `고침/fix-app-passoff/`(검사 3개 · 결과 txt/json · drive 기록)
