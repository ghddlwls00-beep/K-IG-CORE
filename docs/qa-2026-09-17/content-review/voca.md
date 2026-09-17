# VOCA — 내용 점검 (195개 레슨, 단어 칸 5,831개, 사전 표제어 3,877개)

원본: `content/lessons/phonics/*.json` 의 `wordgrid`, `content/voca_dictionary.json`, 화면 `src/components/PhonicsLearningView.tsx`, 퀴즈·드릴 `src/lib/vocaUtils.ts`.
덤프·검사: `scripts/dump-voca.cjs` → `out/content/voca-lessons.tsv` `voca-dictionary.tsv` `voca-checks.json`.
읽은 범위: 사전 3,877개 표제어를 **전부** 한 줄씩 읽음 (뜻·철자). 단어 칸 5,831개는 모두 사전 표제어에서 오므로 표제어를 읽은 것으로 뜻은 다 봄. 레슨별 단어 구성은 스크립트 검사 + 이상 레슨 직접 확인.
작업자 = 점검자 = Claude (독립 검수 없음).

화면 구성 (운영 렌더링 텍스트 `out/rendered/phonics/mv2-12.json` 로 확인): 카드에 **단어 + 한국어 뜻**, STEP 2 4지선다(영→한, 한→영 번갈아), STEP 3 발음 테스트·라이트너 상자, STEP 4 60초 일치/불일치 드릴. 레슨 파일의 `title`(모두 "영어듣기훈련프로그램 | 기초1 | 제 001 회 강의")은 화면 제목으로 쓰이지 않음 — 화면 제목은 `중등 단어 2단계 · 12회` 형식 (V-13 참고).

## 처리 결과 (2026-09-17) — ✅ V-03~V-11 전부 로컬 수정·검증, 배포 `fa6c273` (V-12·V-13 은 확인 결과 수정 불필요)

작업자 = 점검자 = Claude (독립 검수 없음). 아래 숫자는 스크립트가 낸 값.

- **수정**
  - 데이터 `scripts/apply-voca.cjs` (고치기 전 값을 전부 적어 두고 하나라도 다르면 아무것도 안 씀) + `apply-voca-followup.cjs` (검증이 찾은 1건) — 사전 뜻 113개 + 1, 레슨 파일 10개
  - 코드 `src/lib/vocaUtils.ts` (V-04 드릴, V-11 어원), `src/components/PhonicsLearningView.tsx` (**감사 표에 없던 것, 수정 중 발견:** Step 3 라이트너 오답노트가 브라우저에 저장된 카드를 그대로 되살려서, 한 번 열어 본 학습자에게는 고친 뜻·바뀐 단어가 **영원히 안 보였음**. 이제 레슨의 현재 단어·뜻으로 다시 만들고 상자·연속 정답 기록만 이어받음. 같은 자리에서 `March` 를 소문자로 먼저 찾아 `행진하다` 로 저장하던 것도 카드와 같은 조회로)
- **검증**
  - `scripts/verify-voca-fixes.cjs` **19/19** — 195레슨 5,831칸 전부, 실제 `content.ts`·`vocaUtils.ts` 실행: 모든 칸에 사전 뜻, 쓰이지 않는 표제어 0, 한 레슨 안 같은 단어 0 (전 21), **같은 뜻 짝 0 (전 37)**, 드릴 233,240문항에서 "불일치인데 정답 뜻 표시" 0 + 모든 단어가 같은 뜻인 가상 레슨 200회에서도 0, 오타 6개 없음·고친 단어 있음, V-06~V-09 값, recover·foremost 어원 카드 없음, 기존 `verify-voca-quiz-meanings.cjs` 통과
  - `scripts/verify-voca-ui.cjs` **13/13** — 격리 dev 서버·실제 브라우저. **옛 방식으로 저장된 진도를 먼저 넣고** (mv2-12 `November` Box 3·4회 연속, `March 행진하다`; hv-48 `apparently 분명히`) 열었을 때: mv2-12 Step 3 = 새 30단어·오늘 뜻·순서 그대로, November 는 Box 3·4회 기록 유지, March 없음 / hv-48 `보아하니, 겉보기에는`·Box 2 유지 / hv-66 `technological 과학 기술의`. 캡처 `out/voca-leitner-mv2-12.png`
  - 음성 166개 생성·업로드, 버킷 50,065, pending 0 · `freeSpeechKeys.json` 1줄 바뀜 (532키) · speech gate 13/13 · `tsc --noEmit` · `pnpm build` 통과

| ID | 처리 |
|---|---|
| V-01 · V-02 | 철회 (감사 오류, 아래 표) |
| V-03 | 원본 아카이브는 이 PC 에 없고 정답지도 아님(소유자 기준) → 상식으로 완성: mv2-11 이 3월~10월·계절을 가르치므로 mv2-12 = `November` `December` + 요일 7개 + 다른 레슨에 없는 시간·달력 단어 21개 (`weekday` `minute` `hourly` `daily` `weekly` `monthly` `yearly` `daytime` `midday` `overnight` `bedtime` `lunchtime` `sunset` `period` `delay` `deadline` `nowadays` `someday` `timetable` `upcoming`, `weekend`). 새 표제어 26개 |
| V-04 | 37쌍 모두 구별되는 뜻으로 (`interrupt` (말·일을) 가로막다 / `interfere` 간섭하다, `classic` 전형적인; 명작의 / `classical` 고전의, 클래식의, `electric` 전기로 움직이는 / `electrical` 전기에 관한, `confusing` 헷갈리게 하는 / `confused` (사람이) 혼란스러워하는, `valuable` / `invaluable` 매우 귀중한, `jaw` 턱, 턱뼈 / `chin` 턱 끝 …). 드릴도 같은 뜻 단어를 "불일치" 보기로 쓰지 않음 |
| V-05 | `ancestor` `calendar` `scissors` `living room` `technological` `insistence` — 칸·표제어, 틀린 표제어 삭제 |
| V-06 | `apparently` 보아하니, 겉보기에는 |
| V-07 | 24개 기본 뜻 앞에 (`number` 수, 숫자; 번호 · `call` 부르다; 전화하다 · `right` 옳은; 오른쪽; 권리 · `atmosphere` 대기; 분위기 …) + `peer` 또래, 동료; 자세히 들여다보다 |
| V-08 | 17개 (`emigrant` (다른 나라로 떠나는) 이민자 / `immigrant` (다른 나라에서 온) 이민자 / `migrant` 이주자; 철새, `presently` 곧; 현재, `incidentally` 그런데, `pretty` 예쁜; 꽤 …) |
| V-09 | 띄어쓰기·기본형 7개, `tactful` 재치 → 요령 있는, `pebbles` 조약돌(들) |
| V-10 | 같은 어근 묶음 안에서 교체: hv-44 둘째 `motive` → `momentum`, hv-48 둘째 `peer` → `impartial`, hv-58 둘째 `reside` → `residue` |
| V-11 | `recover` · `foremost` 어원 카드 삭제 (틀린 풀이는 맞는 풀이처럼 외워지므로 없는 편이 나음), 나머지 46개 유지 |
| V-12 | 수정 불필요 (모든 레슨 30칸, 가짜 보기 실제 발생 0 — 드릴의 `다른 뜻` 가짜 보기는 V-04 수정으로 코드에서도 없어짐) |
| V-13 | 수정 불필요 — 확인: 화면 제목·`<title>`·설명·공유 미리보기는 `formatLessonPresentation` (`중등 단어 2단계 · 12회`), 검색 색인 `public/search-index.json` 에 `영어듣기훈련프로그램` 0건. 레슨 파일 `title` 은 어디에도 안 쓰임 |

## 발견 사항

| ID | 위치 | 심각도 | 분류 | 실제 | 문제 | 고칠 방향 | 확인 방법 |
|---|---|---|---|---|---|---|---|
| **V-01** | mv1-02 `Miss`, mv2-11·mv2-12 `March` `May` | **철회** (원래 높음, 2026-09-17) — 감사 오류: 퀴즈·드릴은 `vocaUtils` 가 사전을 직접 찾는 게 아니라 `PhonicsLearningView.tsx:211-218` 이 카드와 같은 조회(`getMeaning`)로 만든 표를 받음. 실제 코드로 195레슨 5,831단어 카드≠퀴즈 **0** (`scripts/verify-voca-quiz-meanings.cjs`), 감사 운영 캡처 mv2-12 `QUESTION #1 / 30`·`November` 보기에 `11월` | 퀴즈 뜻 오류 (코드) | 카드는 `3월` `5월` `~양` 인데 STEP 2 퀴즈·STEP 4 드릴은 `행진하다; 행진` `~해도 된다; ~일지도 모른다` `그리워하다; 놓치다` 를 정답으로 씀 | 카드는 `dict[word]` 로, 퀴즈·드릴은 `dict[word.toLowerCase()]` 로 찾음 (`vocaUtils.ts:265,274,417`). 대문자 표제어와 소문자 표제어가 둘 다 있으면 퀴즈가 **다른 단어의 뜻**을 정답으로 냄 → `March = 3월` 을 아는 학습자는 보기에서 답을 못 찾거나 틀린 뜻을 외움 | 퀴즈·드릴도 카드와 같은 조회(`getMeaning`)를 쓰게 통일 | 스크립트로 7건 전부 나열 (card ≠ quiz). 브라우저 재현은 무작위 출제라 미실시 |
| **V-02** | 대문자 표제어 50칸 (mv1-02 `Mr.` `English` `Korean` `German` `Japanese`, mv1-06 `Sunday`, mv1-11 `Christmas`, mv1-13 `England`, mv1-15 `American`, mv1-25 `China`, mv1-39 `Europe`, mv1-40 `Pacific`, mv2-11·mv2-12 달 이름, mv3-25 `Mars`, mv3-32 `God`, mv3-40 `British`, hv-41·hv-68 `Mediterranean`) | **철회** (원래 중간, 2026-09-17) — V-01 과 같은 감사 오류. 실제 코드로 퀴즈에서 빠지는 단어 **0** | 퀴즈에서 조용히 빠짐 (코드) | 카드에는 뜻이 보이는데 STEP 2·STEP 4 문제로는 한 번도 나오지 않음 | 같은 원인(소문자 조회). **mv2-12 는 30칸 중 26칸이 빠지고 남는 문제가 `March` `May`(V-01, 틀린 뜻)뿐** | V-01 과 같은 수정 | `voca-checks.json` |
| **V-03** | mv2-12 | **Medium** | 단어 목록 손상 | 30칸이 `November … October` 12개월을 두 번 반 되풀이 (고유 단어 12개) | 같은 단어가 2~3번씩 카드·청취·퀴즈에 나옴. mv2-11 도 달 이름 레슨이라 두 레슨이 거의 같음 | 원본 교재 확인 후 목록 복원 (**원본 대조 필요**) | 스크립트 `word repeated in lesson` |
| **V-04** | 35개 레슨 37쌍 (예 hv-06 `interrupt`/`interfere`=방해하다, hv-15 `lucky`/`fortunate`, hv-16 `classic`/`classical`, hv-33 `confusing`/`confused`, hv-28 `electric`/`electrical`, hv-71 `valuable`/`invaluable`, mv1-03 `house`/`home`, mv3-08 `almost`/`nearly` 등) | **Medium** | 드릴 채점 오류 (코드) + 학습 설계 | 60초 드릴의 "불일치" 문제는 다른 단어의 뜻을 보여 주는데, 그 뜻이 정답 뜻과 **글자까지 같으면** 화면상 일치인데 "불일치"가 정답이 됨 (`vocaUtils.ts:422-427`, 같은 뜻 제외 검사 없음 — 한→영 퀴즈에만 KIG-019 로 막혀 있음) | 뜻이 같으니 학습자가 구별할 수단도 없음. 특히 `classic/classical` `confusing/confused` `electric/electrical` 은 **차이를 가르쳐야 하는 짝**인데 같은 뜻으로 적혀 있음 | 드릴에서 같은 뜻 제외 + 짝 단어 뜻을 구별되게 작성 | 코드 읽기로 확인, 무작위라 화면 재현 미실시 |
| **V-05** | hv-01 `ancesto`, mv1-38 `calender`, hv-23 `scissor`, mv1-19 `livingroom`, hv-66 `technologic`, hv-62 `"insistence,-cy"` | **Medium** | 단어 철자 오류 | 카드·발음·퀴즈에 오타 그대로 | `ancestor` `calendar` `scissors` `living room` `technological` `insistence (insistency)`. hv-62 는 따옴표·쉼표·하이픈이 카드와 음성에 그대로 (`vocaSpeech.ts` 표에도 없음) | 표제어·단어칸 수정, 음성 클립 재생성 | 사전 표제어 읽기 |
| **V-06** | hv-48 `apparently` | **Medium** | 뜻 오류 | `분명히` | apparently 는 "보아하니, 겉보기에" — 흔한 오해를 그대로 가르침 | `보아하니, 겉보기에는` | 사전 읽기 |
| **V-07** | 사전 전체 | Medium | 한 가지 뜻만 적힌 다의어 → 다른 과정으로 번짐 | `number` 번호 · `call` 전화 · `train` 기차 · `poor` 가난한 · `since` 이후 · `day` 일 · `old` 늙은 · `western` 서부의 · `break` 휴식 · `rest` 휴식 · `still` 아직도 · `study` 공부하다 · `right` 옳은; 오른쪽 · `left` 왼쪽 · `foot` 발 · `sentence` 문장 · `source` 출처 · `quality` 품질 · `essential` 본질적인 · `demand` 수요 · `care` 배려 · `consideration` 배려 · `contact` 연락 · `atmosphere` 분위기 · `train/training` 등 | VOCA 카드 한 장으로는 틀렸다고까지 하기 어렵지만 기본 뜻이 빠진 경우가 많음. **READING 어휘 카드가 이 사전의 뜻을 그대로 가져가 문맥 오류 213장(RV)의 원인이 됨** | 기본 뜻을 앞에, 자주 쓰는 둘째 뜻 추가 (`number` 수, 숫자; 번호) | READING RV 집계와 대조 |
| V-08 | 사전 | Low | 구별 안 되는 뜻 | `emigrant`·`immigrant`·`migrant` 모두 `이민자` / `execute` 실행하다 ↔ `execution` 처형 / `invention` 발명품 / `movement` 운동 / `presently` 현재(곧) / `incidentally` 우연히(그런데) / `inclined` 기울어진(~하는 경향이 있는) / `refer` 참조하다(언급하다) / `resolve` 해결하다(결심하다) / `senior` 선배 / `upset` 속상한 / `pretty` 예쁜(꽤) / `prominent` 눈에 띄는(저명한) / `instrument` 악기(도구) / `pastime` 오락(취미) / `utensil` 기구(주방 기구) | | 뜻 보강 | |
| V-09 | 사전 | Low | 한국어 표기 | `풍성하게하다` `재치있는` `존경할만한` `주목할만한` `믿을만한` (띄어쓰기) · `동의하지 않는다` (사전형 `동의하지 않다`) · `pebbles` 표제어가 복수형, 뜻 `자갈` (조약돌이 더 쉬움) | | | |
| V-10 | hv-44 `motive`, hv-48 `peer`, hv-58 `reside` | Low | 한 레슨 안 단어 중복 | 같은 단어가 두 칸 | | 중복 칸 교체 | 스크립트 |
| V-11 | `src/lib/vocaUtils.ts` `PREFIX_RULES` (48개 어원 풀이) | Low | 어원 풀이 오류 | `recover`: `re(다시) + cover(얻다)` / `foremost`: `fore + most(가장)` | recover 는 라틴어 recuperare 에서 온 말로 `cover` 와 무관, foremost 의 `-most` 는 최상급 어미가 바뀐 것(민간어원). 나머지 46개는 맞음 | 두 항목 수정 또는 삭제 | 48개 전부 읽음 |
| V-12 | `vocaUtils.ts` 한→영 퀴즈 | Low | 보기 채우기 | 레슨 단어가 4개 미만이면 보기에 `vocab1` `vocab2`, 영→한 보기에 `단어 의미 1` 같은 가짜 보기 | 현재 레슨은 모두 30칸이라 실제 발생 안 함 (V-02 철회 — mv2-12 도 30문항 모두 출제되므로 **실제 발생 없음**) | 수정 불필요 | 코드 읽기 |
| V-13 | 195개 레슨 파일 `title` | Low | 데이터 잔재 | 모든 VOCA 레슨의 `title` 이 `::: K-IG 교육 영어듣기훈련프로그램 | 기초1 | 제 001 회 강의 :::` | 화면 제목으로는 안 쓰이는 것 확인(렌더링 텍스트). 문서 제목(`<title>`)·검색·공유 미리보기에 쓰이는지는 Phase 4·8 에서 확인 | 정리 | |

## 레슨별 상태

`scripts/status-voca.cjs` 가 `content-review/voca-status.md` 로 생성 (V 항목 + 스크립트 검사 기준).
