# LISTENING — 내용 점검 (276회 2,218쌍 전부 읽기)

원본: `out/content/listening.tsv` (`scripts/dump-listening.cjs`). 영어는 **녹음이 실제로 말하는 문장**(이전 작업에서 99.9% 정렬) — 녹음과 맞는 영어는 음성을 바꿀 수 없으므로, 영어 쪽은 **전사 오류**(녹음과 다르게 적힌 것)와 **힌트·한국어와의 불일치**를 봄. 한국어는 번역 정확도.
화면 확인: 레슨 화면의 한국어는 `ld_english_scripts.json` 에서 나옴 (`d###-1.json` 의 옛 문단은 표시 안 됨 — 렌더링 `out/rendered/ld/d002-1.json` 로 확인).

## 처리 결과 (2026-09-17) — ✅ 로컬 수정·검증, 배포 대기 · L-74·L-84 는 소유자 결정 대기

작업자 = 점검자 = Claude (독립 검수 없음). 아래 숫자는 스크립트가 낸 값.

- **수정 스크립트** (모두 현재 문장을 명시, 하나라도 다르면 아무것도 쓰지 않음)
  - `scripts/apply-listening.cjs` — 390칸 (영어 167 · 한국어 223), 수수께끼 정답 6개를 한국어 줄에서 `answer` 칸으로, d221 중복 1칸 삭제, 한국어 외래어 95곳 · PDF 띄어쓰기 32곳 (규칙 드라이런 결과를 한 건씩 읽고 적용), 힌트 32곳 + 다른 회차 힌트 블록 1개
  - 재점검에서 나온 같은 종류: `apply-listening-followup.cjs` (힌트-정답 4곳), `apply-listening-times.cjs` (점으로 쓴 시각 12곳 `6.15`→`6:15` — Ava 가 소수로 읽음), `apply-listening-followup-ko.cjs` (`퉤인` `성냥곽` `유모어` 6곳), `apply-listening-followup-en.cjs` (`The Dr.` 2곳)
  - 화면: `src/components/LdLearningView.tsx` — `answer` 가 있는 칸은 한국어 줄 아래 **`정답 보기`** (누르기 전엔 안 보임), 딕테이션·소리 클리닉·섀도잉·전체 대조 4곳
- **검증**
  - `scripts/verify-listening-fixes.cjs` **100/100** — 276회 전부: 감사가 적은 틀린 형태 0, 고친 사실 존재, 힌트 이름 = 정답 이름 23건, 외래어·띄어쓰기 규칙 잔여 0, 정답 6칸 이동, 소유자 결정 대기 문장은 그대로
  - `scripts/verify-ld-riddle-ui.cjs` **11/11** — 격리 dev 서버·실제 브라우저, d171 에 시험 코드 등록 → Step 5 에서 정답이 누르기 전 화면에 없음·누른 후 있음, 버튼은 수수께끼 칸 1개만, Step 2 #1 없음·#8 있음. 캡처 `out/ld-riddle-answer.png`
  - 음성 244개 생성·업로드 (227+4+10+3), 버킷 45,985, **pending 0** · 무료 음성 목록 변화 없음 · speech gate 13/13 · `pnpm build` 통과
  - `check-listening-coverage.cjs` 재실행: "대본에 없는 녹음 문장" 52 — 전부 의도한 차이 (사실·전사 오류를 고쳐 녹음 STT 와 달라진 칸, d109 녹음 뒤에 이어 붙은 d110 본문 10문장, 기존 STT 오탐 d025·d086, 표현 유지 d157·d187·d189)
- **판단 기준**
  - 가상 인물 이름은 힌트(저자) 표기, 힌트가 오타면 바로잡음 (Eliss·Mcarthy·Cocoran·Willima·Everst). 실존 인물·지명은 실제 표기 (Wilbur Wright, Langhorne, Wark, Guadeloupe, Emmett Kelly, Hayward)
  - **사실 오류는 문장 자체를 고침.** 사이트는 원본 녹음을 틀지 않고 Ava 가 대본을 읽으므로 "녹음 당시 기준" 주석을 달아도 학습자는 틀린 사실을 현재형 문장으로 듣고 받아씀. 그래서 감사표의 "주석" 권장(L-28·41·49·53·66·73·79·85·87·89)은 문장 정정으로 바꿈
  - 칸 번호 유지 (받아쓰기 진도가 칸 번호로 저장). 예외 d221 #5 (녹음에 없는 중복) — 이 회차 옛 #6·#7 진도 표시가 한 칸 앞으로 당겨짐

| ID | 처리 |
|---|---|
| L-00a | 감사가 적은 이름 전부 힌트·정답·한국어 통일 (Wenger · Patralis · Guadeloupe · Gilda Lily · Marcos · William Smith · Elliott · Mt. Everest · Pontchartrain · Herby · Ellis · Pete Wendel · Corcoran · McCarthy · Sarg · Lite · Wren · Wilbur · Langhorne · Anything Left-Handed Limited · Emmett Kelly), 힌트 오타 (interpreter · matter · likable · judgment · Floyds Fork · competition), 다른 회차 힌트 혼입 삭제 (d164 의 d163 신문 단어, d018 `town suburbs?`, d092 ` l`), d132 #7 · d188 #5 는 힌트·녹음대로 (`confident`, `plantations`), d030 #6 가격표 `495`, d063 `number two`. 남은 "힌트 단어가 정답에 없음" 39회차는 활용형(fix/fixes, row/rowed) · 숫자 기호($, %) · 녹음에도 없는 교재 단어(d093 informative 등)로 정답 오류가 아님 |
| L-00b | 외래어 95곳 (폴튜갈·불란서·와싱턴·구라파·이태리·개스·쥬스·텔레비젼·쉬카고·뉴올린즈·샌프랜시스코·헐리웃·오스트렐리아·알라스카·놀웨이·펜실바니아 …) + 짓궂·때때로 |
| L-00c | 규칙 32곳 + 개별 9곳 (말하는·우리는·그는·컴퓨터들은·있다는·착륙함으로써·침대에서 …) |
| L-00d | **유지** — 한국어 줄의 영어 인명(`Dr.William N.Green은`)은 받아쓰기 정답 철자를 보여 주는 역할도 해서, 한 방식으로 몰면 오히려 손해. 원하면 바꿀 수 있음 |
| L-01~L-26 | 수정 (L-02 · L-21 끝 문장 · L-38 은 L-64 에서 영어 추가로 처리됨). L-08 d026 #3 녹음대로 `Carlos tried to turn the boat around. It was hard, but he did it.` |
| L-27 · L-28 | 시카고 "가장 큰 도시 중 하나" · 뉴올리언스 "가장 바쁜 항구 중 하나" · 슈퍼돔 "가장 큰 실내 경기장 중 하나" · 폰차트레인 "물 위 연속 교량으로 세계 최장, 38 km 이상" (대본의 47 km 도 틀림) · 위스콘신 "수천 개의 호수" · 포드 어머니 1876년·13세 · 모델 T 1908–1927 · 화성 침공 "많은 사람이 믿었다 / 일부는 집을 떠나기까지 / 신문이 며칠 보도" (200만 명·수천 명 피난·며칠 만에 정상화 삭제) |
| L-29~L-40 | 수정 |
| L-41 | 그리피스 사망 7월 23일 |
| L-42 (ISS-08) | d109 #6 첫 문장만 |
| L-43~L-48 | 수정. L-47 d122 #7 `0.9% 중 2%` 는 녹음 STT 도 같은 숫자라 원래 값을 확인할 수 없어 현재 사실로 다시 씀 (아래 L-53) |
| L-49 | 미국 원주민 "수백만 명 · 많은 사람이 보호구역에 · 보호구역 300곳 이상 미국 전역" |
| L-50~L-52 | 수정 (침전→강수, 살해→사망·죽다, 로써→로서) |
| L-53 | 마야 "뛰어난 농부" · 이주 "15,000년 이상 전" · 세계 인구 "지금 비율이면 약 80년 뒤 두 배" · 대륙별: 아프리카 연 2% 이상 · 유럽 거의 정체 · 북미 완만, 증가의 상당 부분이 이민 |
| L-54~L-63 | 수정 (+ 점으로 적은 시각 12곳) |
| L-64 | 배포·운영 확인 (c3a44d3) |
| L-65 · L-67~L-70 · L-72 | 수정 (한국어 잘린 앞 절 d166·d171·d175·d181·d183 복원) |
| L-66 | 왼손잡이 "열 명 중 한 명" |
| L-71 · L-80 d191 | 정답 6개 (d171 · d177 · d180 · d183 · d187 · d191) 를 한국어 줄에서 빼서 `정답 보기` 뒤로. `(소경)` 은 "앞을 보지 못하는 사람" |
| L-73 | 텔스타 "1962년에 발사된 통신 위성" · 존커 다이아몬드 재판매 약 70만 달러, 큰 것 1개 + 작은 것 12개 |
| **L-74** | **소유자 결정 대기** (freaks · pathetic) — 오타만 수정 |
| L-75~L-78 | 수정 (L-78 d221 #5 삭제, #6 한국어에 앞 절 합침) |
| L-79 | 프랭클린 "번개가 전기라는 것을 증명" |
| L-80 | d192–d193 `Aborigine(s)` → `Aboriginal Australians / Aboriginal tracker / people`. d215 #3 머리가죽은 L-84 와 함께 소유자 결정 대기 |
| L-81 · L-82 | 수정 |
| L-83 | 표기 수정, d219 "역사상" → "문학에서" (푸른 수염은 동화). **유지:** d211 #4·#5 (Ditmars 뱀독 연구), d222 #5 — 틀렸다는 근거를 찾지 못함 |
| **L-84** | **소유자 결정 대기** (d232 #3 · d234 · d255 #7 · d256–d257) — 오타와 d215 #1 앞의 회차 번호 `215` 만 수정 |
| L-85 | 언어 "7,000개 이상" · 바벨탑 "언어가 뒤섞여 탑을 완성하지 못함" (창세기에 붕괴 없음) · 영어 장점 두 문장(방언이 적다 · 매우 정확하다, 둘 다 사실 아님) → 대영 제국·미국 영향 / 명사에 성이 없음 |
| L-86 | 수정 (`to form miniature cities`) |
| L-87 | 요세미티 "폭포들로 유명" · 세쿼이아 "세계에서 가장 큰 나무, 일부는 가장 오래 산 생물에 속함" · 곰 "소풍객은 곰에게 점심을 나눠 주면 안 됨". 같은 회차 d231 #2 화석림 "수천 년 전 지진이 바다로 바꿈" → "수백만 년 전 쓰러진 나무가 진흙·화산재에 묻힘" (감사표에 없던 것, 수정 중 발견) |
| L-88 | 수정 |
| L-89 | d229 gypsies → modern nomads · d240 "a man's first duty"·골프 과부 문장 → 성별 중립 · d272 maiden aunt → older relative |
| L-90 · L-91 | 수정 (d252 #3 은 뜻이 반대로 번역돼 있던 것도 바로잡음) |
| L-92 | worse end · `Yum, yum, yum!` · 문장 경계 · d236 비행 "약 6시간" · "개척 시대엔 여러 달". **유지:** d261 (Sun Valley), d271 #4 (재즈·스윙을 현대 음악으로) — 시대 표현이지만 틀린 사실은 아님 |

## 과정 전체에 걸친 문제

| ID | 심각도 | 분류 | 내용 | 규모 | 고칠 방향 |
|---|---|---|---|---|---|
| L-00a | **Medium** | 힌트-정답 불일치 | 받아쓰기 전에 보여주는 **힌트의 고유명사 철자와 정답 영어 철자가 다름** — 힌트대로 쓰면 오답 (예: 힌트 `John Wenger`·정답 `John Wanger`, 힌트 `Peter Patralis`·정답 `Peter Petralus`·한국어 `패트랄리스`, 힌트 `Fernando Marcos`·정답 `Marcus`) | 기계 검사 52건 후보 (`listening-checks.json` "hint word not in English script") | 녹음 기준 철자로 힌트·정답·한국어 통일 |
| L-00b | Low | 외래어 표기 | 옛·비표준 표기: `폴튜갈` `불란서` `와싱턴` `구라파` `폴랜드어` `이태리어` `개스` `쥬스` `디스코택` `텔레비젼` | (최종 집계 예정) | 표준 외래어 표기 |
| L-00c | Low | PDF 잔재 | 줄바꿈이 띄어쓰기로 남음: `찍었 다` `할 수 있 다` `말 한다` `희망한 다` | 다수 | 붙여 쓰기 |
| L-00d | Low | 번역 일관성 | 한국어 안에 영어 이름을 번역하지 않고 남긴 행과 한글로 옮긴 행이 섞임 (`Dr.William N.Green은`, `Madison Street의`) | 다수 | 한 방식으로 |

## 회차별 발견 사항

| ID | 위치 | 심각도 | 분류 | 현재 | 문제 | 고칠 방향 |
|---|---|---|---|---|---|---|
| L-01 | d007 #1 #3 | **Medium** | 이름 불일치 | EN `John Wanger` `Mrs. Wanger` / 힌트·KO `Wenger` | L-00a | 녹음 확인 후 통일 |
| L-02 | d007 #5, d014 #7 | **Medium** | 영어 대본 누락 (**정정**: 녹음에 있음) | KO 끝 `그는 불어, 독일어, 이태리어, 영어를 한다.` / `그는 독일어를 말할 수 있지만 그것을 읽을 수는 없다.` — EN 에 없음 | 녹음 전사 대조 결과 **녹음이 실제로 말하는 문장** (`He speaks French, German, Italian, and English.` / `He can speak German, but he can't read it.`) — 영어 대본·받아쓰기에서 빠짐 (L-64) | **EN 에 추가** (KO 유지) |
| L-03 | d012 #1 EN | **Medium** | 전사 오류 | `you can't be at the beach…, but Becky's mother took a shopping Monday night` | `took us shopping` 의 오전사 (KO `우리를 쇼핑하러 데리고 갔고`), 문장 첫 글자 소문자 | `Well, you can't…took us shopping…` |
| L-04 | d012 #6 EN | **Medium** | 전사 오류 | `and I was lucky and honest person found it` | `an honest person` | `…I was lucky an honest person found it.` |
| L-05 | d016 #1 | **Medium** | 이름·번역 | EN `Peter Petralus` / 힌트 `Patralis` / KO `패트랄리스`; EN `They had a new house.` / KO `그녀는 새 집을` | L-00a + 주어 불일치 | 통일, KO `그들은` |
| L-06 | d020 #1 #12 | **Medium** | 고유명사 오류 | EN `Guadalupe` / 힌트·KO `Guadaloupe` | 카리브해 섬 이름은 **Guadeloupe** (둘 다 틀림) | `Guadeloupe` / `과들루프` |
| L-07 | d025 #10 EN | **Medium** | 전사 오류 | `Carlos rode the boat` | KO `저었고` — `rowed` 의 오전사 | `Carlos rowed the boat` |
| L-08 | d026 #3 | **Medium** | EN-KO 불일치 | EN `"I'm being dragged," she said. Carlos tried to turn the boat.` / KO `Carlos는 … 돌리려고 노력했다. 그것은 힘들었지만 그는 그것을 해냈다.` | 영어의 인용문이 한국어에 없고, 한국어의 "힘들었지만 해냈다" 가 영어에 없음 | 녹음 기준으로 한쪽 정정 |
| L-09 | d027 #3 | **Medium** | 이름 불일치 | EN `Fernando Marcus` / 힌트·KO `Marcos` | L-00a | 통일 |
| L-10 | d029 #1 KO | **Medium** | 오역 | EN `Marta Perez has taken her place in lane 2.` / KO `…2번 레인에서 그녀를 대신했습니다.` | take one's place = 자기 자리에 서다 (대신하다 아님) | `Marta Perez가 2번 레인에 자리를 잡았습니다.` |
| L-11 | d009 #3 | Low | 표기·번역 | EN `Keith's A photographer` / KO `슬라이드를 가져왔고` | 대문자 A, took slides = 슬라이드를 **찍었고** | |
| L-12 | d011 #2 | Low | 데이터 | EN `…about six months ago, Thursday.` / KO `…목요일,` | 편지 날짜 `Thursday` 가 앞 문장 끝에 붙음 | 다음 행 앞으로 |
| L-13 | d012 #8 KO, d012 #1 KO, d014 #2 KO, d021 #2 KO, d027 #2 KO, d028 #1 KO | Low | 번역·맞춤법 | `인명구조원으로써` `글세` `골프롤` `흥분한`(upset) `스포츠 작가협회` `Kevin taylor` | | `인명구조원이고` `글쎄` `골프를` `속상한` `스포츠 기자협회` `Taylor` |
| L-14 | d018 hint, d009 hint | Low | 힌트 | d018 힌트 끝에 앞 회차의 `town suburbs?` 가 붙음, d009 `interpretor` | | 삭제·`interpreter` |
| L-15 | d020 #6 `$15 A day`, d025 #2 `10 A.m.`, d023 #7 `Gilda Lilly`↔KO `Lily`, d018 `racetrack`/`race track` | Low | 표기 | | | |
| L-16 | d029 #3 KO | **Medium** | 숫자 오류 | EN `In lane 3` / KO `33번 레인` · `Lakeside Spots Club` | 레인 번호 틀림, Sports 오타 | `3번 레인`, `Sports` |
| L-17 | d032 #2 EN, 힌트 | **Medium** | 오타(정답) | EN `Willima Smith` / KO `William Smith`, 힌트 `Mt.Everst` `Eliott` `Willima`, #6 `Elliot` ↔ #3 `Elliott`, #5 KO `그의 허리에`(Kathy) | 받아쓰기 정답에 오타 → 맞게 `William` 쓰면 감점 | `William`, `Everest`, `Elliott` 통일, KO `그녀의` |
| L-18 | d034 #8 EN, #10 KO | **Medium** | 고유명사 오타 | EN `Lake Pontchartrand Causeway` (KO `Pontchartrain`), KO `Mardi Grass` | 정답 영어 오타 | `Pontchartrain`, `Mardi Gras` |
| L-19 | d036 #1 EN | **Medium** | 전사 누락 | `…about it. is true that everybody talks about the weather.` | 문장 주어 `It` 누락 | `It is true…` |
| L-20 | d038 #4 EN | **Medium** | 전사 오류 | `If Bobby feels well enough…, You will be fine when the game is finished.` / KO `그는 건강할 것입니다` | `he will be fine` 의 오전사 (대문자 You 도 비정상) | `…, he will be fine…` |
| L-21 | d045 #6 EN, #7 KO | **Medium** | 전사 오류·번역 초과 | EN `he is going to give a different examination` / KO `어려운 시험` · KO #7 끝 `그는 영어에 대하여 3학점을 받을 것이다.` (EN 없음) | `difficult` 의 오전사(GRAMMAR I gh1-108 #65 도 difficult), 번역에만 있는 문장 | `difficult examination`, KO 초과 문장 확인 후 삭제 |
| L-22 | d050 #8 EN | **Medium** | 전사 오류 | `…but her husband believes that he should stay home and take care of the children.` / KO `그녀가 집에 머물러서` | 논리상 `she should stay home` | `…that she should stay home…` |
| L-23 | d053 #6 EN | **Medium** | 전사 오류 | `You see your husband's collection is valued at close to $10,000` / KO `그녀의 남편의 수집은` | `You see, her husband's collection…` | 좌와 같이 |
| L-24 | d055 #2 EN | **Medium** | 오타(정답) | `everything insight` | `in sight` (띄어 씀) — 받아쓰기 정답이 틀린 낱말 | `everything in sight` |
| L-25 | d056 #6 #8 EN | Low | 이름 불일치 | `Tony Sark` ↔ #2 `Tony Sarg` | 같은 인물 철자 두 가지 | `Sarg` |
| L-26 | 힌트·정답·한국어 이름 불일치 (L-00a 사례): d039 `Herbie`↔`Herby`, d042 `Peter Wendell`↔`Pete Wendel`, d044 `John Kukoran`↔`Cocoran`, d045 `McCarthy`↔`Mcarthy`, d061 `Taggy Montag`↔KO `Tony Montag`, d040 힌트 `Miss Eliss`↔`Ellis` | **Medium** | 이름 불일치 | | 힌트대로 쓰면 오답 | 통일 |
| L-27 | d043 #1 | **Medium** | 낡은 사실 (녹음 내용) | `Chicago, the second largest city in the United States` | 시카고는 1990년 인구조사부터 **3위** (LA 2위). 녹음이라 음성은 못 바꾸므로 해설·주석 필요 | 화면에 "녹음 당시 기준" 주석, 또는 해당 회차 교체 |
| L-28 | d033 #1, d034 #6 #8, d052 #2, d058 #3 #7, d060 #2 | Low | 낡은·부정확한 사실 (녹음 내용) | `second busiest seaport` / `world's largest indoor arena` / `world's longest bridge` / `northern Wisconsin, the land of 1000 lakes`(위스콘신 호수는 약 15,000개, "만 개 호수의 땅" 은 미네소타) / 포드 모친 사망 1875·12세 (실제 1876·13세) / Model T 1,500만 대 1908–1925 (1927까지) / 화성침공 "200만 명이 믿었다" (현대 연구로 과장) | 녹음 내용이라 음성은 유지, 사실 주석 권장 | |
| L-29 | d058 #9 KO, d046 #3 KO `Stricklan`, d042 #4 KO `리포트틀`, d049 #2 `화내낸`, d050 #2 `돌보야야`, d051 #7 `내보내낼지`, d052 #7 `캘핑`, d053 #7 `성냥곽`, d037 #9 `오, 의사`, d040 #6 `그가`(Miss Ellis), d059 #1 `The War of the World` | Low | 번역·오타 | KO `- 유리, 가죽, 나무-` (EN 없음) 등 | | |
| L-30 | d037 #2 `The Dr. looked`, d038 #6 `the Morton's boy`, d046 #4 · d047 #6 EN 문장 경계 누락 (`in high school they used to`, `shopping district he recommended`) | Low | 표기 | | | `The doctor` `the Mortons' boy` 마침표 |
| L-31 | d062 #7 EN | **Medium** | 전사 오류 | `I don't work just to get my money away.` / KO `내 돈을 줘서 없애기 위하여` | `give my money away` | 좌와 같이 |
| L-32 | d064 #6 EN | **Medium** | 데이터 중복 | EN 끝에 `The important thing to remember about social customs is…` (다음 회차 d065 #1 첫 문장) / KO 에는 없음 | 다음 회차 문장이 이번 회차 받아쓰기 정답에 섞임 | d064 #6 에서 삭제 |
| L-33 | d066 #2 #4 #6 #7, d067 #1–#7 EN | **Medium** | 고유명사 (이야기 핵심) | `so they called it light` `light tastes soapy` `the light soap company` `Light Soap Company` / 힌트·KO `LITE` | 이야기의 요점이 상표 **Lite** 인데 정답이 일반 단어 `light` 로 적힘 — 힌트대로 `LITE`/`Lite` 쓰면 감점 | `Lite` (d067 #6 `Mrs. Ascot`→`Ascott` 도) |
| L-34 | d082 #4 #6 EN | **Medium** | 전사 오류 | `David War Griffith` (KO `Wark`) / `His father became very poor` (앞 문장에서 아버지 사망, KO `그의 가족은`) | | `David Wark Griffith` / `His family became very poor` |
| L-35 | d084 #1 EN | **Medium** | 이름 불일치 | `Ren Computer Company` / 힌트·KO `Wren` | L-00a | `Wren` |
| L-36 | d088 #3 #6 KO, #5 #9 EN·힌트·KO | **Medium** | 숫자·인명 오류 | KO `200미터`(EN 260), KO `1809년`(EN 1899), EN `Wilbert` / 힌트·KO `Wilburt` | 번역 숫자 틀림. 라이트 형제 형 이름은 **Wilbur** (둘 다 틀림) | `260미터` `1899년` `Wilbur` (근거: https://www.britannica.com/biography/Wright-brothers, 2026-09-17 확인) |
| L-37 | d077 #1 EN | Low | 이름 불일치 | `Gene and Oswald Wilson` / 힌트·KO·#5 `Jean` | | `Jean` |
| L-38 | d085 #1 KO, d091 #5 KO | Low | 번역에 없는 문장 | KO `컴퓨터는 문제들을 해결하기 위하여 숫자들을 사용한다.` / `그것은 중고교 학생을 위해서이다.` (EN 없음) | L-02 와 같음 | 삭제 |
| L-39 | d069 #3 KO `단지 너무 기쁠 것이라고`(only too pleased = 기꺼이), d078 #7 KO `고용해도 좋다`(may = ~할 수도 있다), d092 #8 KO `공학사`(Bachelor of Science = 이학사), d063 #5 KO `(직역:방향을 주었다)` | Low | 오역 | | | `기꺼이 … 가르쳐 주겠다고` `고용하기도 한다` `이학사` |
| L-40 | d064 #1 `사회적이`, d071 #1 `Jack Mill가`, d072 #4 `챠량`, d074 #3 `콘스탄티노불` `오스트렐리아`, d077 #2 · d078 #3 `로써`, d082 #1 `D.WGriffth` `Floydsfo가`, d089 #2 `KittyHawk`, d070 #3 `Huskison`↔#5 `Huskisson`, d071 #2 `made-up` | Low | 오타·표기 | | | |
| L-41 | d083 #12 (그리피스 사망 7월 23일), d074 (녹음 내용) | Low | 사실 (녹음) | `He died … on July 22nd, 1948.` | 실제 7월 23일 | 주석 |
| L-42 | d109 #6 EN | **High** | 데이터 손상 | EN #6 = `Franklin also discovered ways…` 뒤에 **다음 회차 d110 본문 전체(10문장)** 가 한 칸에 붙음 / KO 는 첫 문장만 | 받아쓰기 한 문항의 정답이 한 문단 — 풀 수 없고 음성 클립·타일도 과대 | d109 #6 은 첫 문장만 |
| L-43 | d119 #7 #9 EN | **Medium** | 전사 잔재 | `…on the long journey W. It wasn't long…` / `Thousands of Americans moved W again the Indians protested` | `West` 가 `W` 로 적혀 정답·음성·타일에 그대로 | `West`, 문장 경계 `West. Again,` |
| L-44 | d103 #4 EN | **Medium** | 고유명사 오전사 | `The Idita Rod Trail is the longest…` / 힌트·KO `Iditarod Trail Race` | | `The Iditarod Trail Race is…` |
| L-45 | d113 #10 EN, #3 KO | **Medium** | 전사·번역 오류 | EN `the area's first residence` (KO `첫 주민들`) / KO `포로는`(Pomo → 포로=prisoner) | | `first residents` / `포모족은` |
| L-46 | d114 #5 EN | **Medium** | 전사 오류 (비문) | `The first Indians were Native Americans probably came from Asia…` | 동사 두 개 — `The first Indians, or Native Americans, probably came…` | 좌와 같이 |
| L-47 | d122 #1 #7 EN | **Medium** | 전사 오류·논리 | `…support a much larger population of its resources or distribute equally.` / `North America's population has been increasing by 0.9% each year, but 2% of that rate is the result of immigration.` | #1 조건절이 깨짐 (`if its resources were distributed equally`), #7 0.9% 중 2% 는 수치상 말이 안 됨 (녹음 확인 필요 — 0.2% 추정) | 녹음 대조 후 정정 |
| L-48 | d125 #1 EN, d098 #7 EN | **Medium** | 전사 오류 | `build dams and streams and rivers` (KO `개천과 강에 댐을`) / `develop automobiles in factories that produce less pollution` (KO `자동차와 공장을`) | `dams on streams…` / `automobiles and factories` | 좌와 같이 |
| L-49 | d120 #8 #9 #10 | **Medium** | 낡은 사실 (녹음) | `about 800,000 Native Americans…` / `Over half of them live on reservations.` / `about 300 reservations … 28 states` | 2020 인구조사 아메리카 원주민·알래스카 원주민 단일 인종 약 370만 명, 보호구역 거주 비율은 소수, 보호구역 약 326곳 — **현재 사실로 가르치면 틀림** | 화면 주석 "녹음 당시(1980년대) 기준" (근거: https://www.census.gov/library/stories/2021/08/improved-race-ethnicity-measures-reveal-united-states-population-much-more-multiracial.html, 2026-09-17 확인) |
| L-50 | d123 #3 #5 KO | **Medium** | 과학 용어 오역 | precipitation → `침전` | 기상에서 precipitation 은 **강수** (침전은 가라앉음) — 과학 개념을 틀린 말로 학습 | `강수` (d123 #5 KO 끝 초과 문장도 확인) |
| L-51 | d096 #3 KO 외 | Low | 번역 | `28명이 살해되었고`(killed in the disaster) | 사고 사망을 "살해" 로 — 여러 회차 반복 | `사망했고` |
| L-52 | d102 #1 KO `기사 보도`(weather reports) #5 `예언`, d099 #3 · d107 #4 · d111 #2 `로써`, d107 #5 `자시 자신`, d110 #3 `필라델피이`, d111 #7 `뽀족함`, d115 #5 `공동주책`, d105 #4 `구체적안`, d114 #8 KO 어순, d118 #10 KO `mumps, 유행성 이하선염` 중복, d126 #2 `북극 대양`, d103 #5 `카버한다`, d117 #3 `단풍 사탕` | Low | 오타·번역 | | | `기상 보도` `예보` `로서` `공동주택` `북극해` … |
| L-53 | d115 #4, d114 #5, d121 #7, d122 #5–#7 (녹음) | Low | 부정확·낡은 사실 | 마야가 "대륙에서 처음 농업을 개발" (메소아메리카 농경은 마야 이전), 원주민 이주 "25,000년 이상 전", 세계 인구 "35년 내 두 배", 대륙별 인구증가율 | | 주석 |
| L-54 | d117 #4, d124 #6, d095 #3 #9, d104 #4 EN | Low | 표기 | `…in the spring for a few years, they lived` `is free managing it` `8.40 A.m.` `A day` | 문장 경계·대문자 | |
| L-55 | d127 #5 KO | **Medium** | 오역 (한 글자) | EN `The ocean is also becoming a major source of oil.` / KO `태양은 또 중요한 석유의 원천이 되고 있다.` | `대양`(ocean)이 `태양`(sun)으로 — "태양이 석유의 원천" 이라는 틀린 문장 | `대양은` |
| L-56 | d131 #5 EN | **Medium** | 전사 중복 | `All the guests are served in the All the guests are served in the lodge dining room.` | 구절이 두 번 들어간 정답 | `All the guests are served in the lodge dining room.` |
| L-57 | d132 #4 EN | **Medium** | 전사 누락 | `I don't know. some people who make up their minds right away.` / KO `…일부 사람들은 안다` | `I know some people who…` 누락 | 좌와 같이 |
| L-58 | d136 #5 EN, d155 #6 EN | **Medium** | 전사 오류 | `Bob tried on every sweater and his size` / `personal management` (힌트 `personnel`) | `in his size` / `personnel management` | 좌와 같이 |
| L-59 | d134 #6 `suitcase 1st`, d151 #2 `several 1000 miles long`, d108 #6 `worth 2 tomorrows`, d106 #2 `worth 2 in the bush` | **Medium** | 숫자 표기 (받아쓰기) | | 녹음은 `first` `several thousand` `two` 라고 말하는데 정답·타일이 숫자·서수 기호 — 들은 대로 쓰면 감점, `several 1000` 은 읽을 수도 없음 | 단어로 (`first` `several thousand` `two`) |
| L-60 | d148 #1 (회차 첫 문장) | **Medium** | 내용 누락 | EN·KO 모두 `Its neighbors are Canada…` 로 시작 — 힌트는 `the North American continent` | 힌트가 가리키는 첫 문장(미국의 위치)이 없어 `Its` 가 무엇인지 알 수 없음 | 녹음 첫 문장 복원 |
| L-61 | d130 #3 EN | Low | 문장 경계 | `A central lodge, 10 cabins, and a variety of recreational facilities. Tennis courts, … make up the resort.` | 한 문장이 마침표로 끊김 (주어만 남은 문장) | `…facilities—tennis courts, …—make up the resort.` |
| L-62 | d128 #4 `쫌`, d130 #6 `커다른`, d131 #8 `직원이 구성한다` #9 `Hickaman`, d132 #12 `때대로`, d134 #9 `언제가`, d135 #5 `가벼운 회색`(light gray) #3 `옷들`(suits), d140 #10 `젊었을 나는`, d147 #7 `선물로써`, d148 #7 `따리` 힌트 `185,0000,000`, d149 #6 `미국이 언어가`, d152 #2 `국민으로써` #3 `교육들`, d155 #2 `훙미` #5 `준비시켜도 좋다`(might), d127 #8 `선업` | Low | 오타·오역 | | | `연한 회색` `양복` … |
| L-63 | d142 #6 `made-up our minds`, d143 #5 #11 쉼표·문장 경계, d155 #8 `Teaching newspaper work`, d132 #5 `Doesn't matter` | Low | 표기 | | | |
| **L-64** — ✅ **수정·배포·운영 확인** (c3a44d3; `check-l64-prod.cjs` 페이지 54/54, 음성 이용권 30/30·무이용권 403 30/30) (소유자 결정 2026-09-17: `scripts/apply-l64.cjs` — 칸 번호 유지(받아쓰기 진도가 칸 번호로 저장됨): 첫 문장 17회차는 #1 앞에 EN·KO 추가, d164·d177 은 쪼개진 #1·#2 를 #2 로 합치고 #1 에 첫 문장, 중간 7회차는 같은 칸 EN 뒤에 추가, d071 #8 `It was out of order.`, d177 `Rut`/`Rud`→`Rudd`, 힌트 오타 d164 `United States`·d148 `185,000,000`, d169·d185 는 힌트 표기(`two and a half` `twelve`), d173 은 사실 오류(로스앤젤레스는 1781년 설립) 때문에 `which had been only a small town in 1848` 로 넣음. 27회차 30칸 · 음성 37개 생성·업로드 · 버킷 44,767 · pending 0 · `check-listening-coverage.cjs` 누락 34→8 (남은 8 = STT 오탐 d025·d086, 의도한 d173, 표현 유지 d132·d157·d187·d188·d189). 운영 확인 스크립트 `scripts/check-l64-prod.cjs`) | 34개 회차 (d007 d014 d025 d045 d058 d071 d085 d086 d091 d119 d123 d132 d143 d148 d157 d164 d165 d167 d169 d170 d172 d173 d174 d176 d177 d178 d179 d180 d182 d184 d185 d187 d188 d189) | **Medium** (2026-09-17 High→Medium 정정) | 원문 문장 누락 (체계적) | 예: d167 녹음 첫 문장 `In 1870, Mark Twain married Olivia Langdon.` 이 대본에 없어 `He had fallen in love with her picture…` 로 시작 / d169 `Dexter returned to Arizona and began experimenting with model machines…` 누락 / d164 녹음 `There are few homes in the United States today that do not have either a radio or television set.` 대신 대본 `They have both become an essential part of our daily lives.`(녹음에 없음) / d177 대본 #1 `…by the time Rudd gets to the train stop, his poor forgetfulness is gone.` (녹음에 없음, 실제는 `To make the trip more interesting…he kept the name of the town a secret.`) | **원본 녹음(= 교재 원문)에 있는 문장 34개가 대본에 없음**, 대본에만 있는 문장 13개. **정정:** 운영 플레이어는 CNN 외 모든 과정에서 원본 녹음을 틀지 않고 대본을 Azure 음성으로 읽음 (`src/lib/unifiedSpeech.ts:42-47`; 운영 확인 `out/player-probe.json` — `/ld/d167` 재생 시 `audio/azure-ava/…` 만 요청). 따라서 처음 적은 "들리는 문장을 쓸 칸이 없다" 는 틀린 판단이었고, 실제 영향은 **지문이 원문 일부를 잃어 앞뒤가 안 맞는 것** (예 d167 은 첫 문장이 빠져 `He had fallen in love with her picture…` 로 시작 — He·her 가 누구인지 없음). 대부분 회차 첫 문장 | `scripts/check-listening-coverage.cjs` 결과(`out/content/listening-coverage.json`)대로 각 회차에 누락 문장 추가·녹음에 없는 문장 제거, KO 번역 추가, 음성 클립 생성. 수정 후 이 스크립트가 **누락 0 / 초과 0** 이어야 함. **정정 (2026-09-17, 회차별 대본 대조):** 34건 = ① 첫 문장 누락 19 (d119 d143 d148 d164 d165 d167 d169 d170 d172 d173 d174 d176 d177 d178 d179 d180 d182 d184 d185 — EN·KO 모두 없음, d164·d177 은 #1 자리에 #2 를 잘못 줄인 문장이 대신 들어 있음) ② 중간 영어만 누락 7 (d007 #5, d014 #7, d045 #7, d085 #1, d091 #5, d123 #5, d058 #9 `glass, leather, wood` — KO 에는 이미 있음) ③ 누락 아님·녹음과 표현만 다름 6 (d071 #8, d132 #7, d157 #1, d187 #2, d188 #5, d189 #7) ④ 음성 인식 오류로 인한 오탐 2 (d086 — 대본 #2 에 있음, STT 가 use→are; d025 — STT 가 문장을 한 번 더 받아 적음). 실제 누락은 **26문장 26회차**. 수정 후 이 스크립트에서 ④ 2건은 계속 뜰 수 있음 |
| L-21·L-38 (**정정**) | d045 #7, d085 #1, d091 #5, d123 #5 | — | — | KO 에만 있던 `3학점을 받을 것이다` `숫자들을 사용한다` `중고교 학생을 위해서이다` `4만 입방 킬로미터…` | 녹음 대조 결과 **녹음에 있는 문장** (`He'll get 3 credits for English.` 등) — KO 삭제가 아니라 **EN 추가** (L-64 에 포함) | |
| L-08·L-39 (**정정 보강**) | d026 #3, d071 #8, d132 #7 | **Medium** | 녹음과 다른 대본 | `"I'm being dragged," she said.` (녹음에 없음) / `It was a breakdown.` (녹음 `It was out of order.`) / `I am amazed that they can be so sure.` (녹음 `I'm surprised that they can be so confident.`) | 받아쓰기 정답이 들리는 말과 다름 | 녹음대로 (L-64 에 포함) |
| L-65 | d166 #1 EN·힌트, KO | **Medium** | 인명 오타·번역 잘림 | EN `Samuel Langorn Clemens` / 힌트 `Langorne` / KO `더 잘 알려져 있거나 더 사랑받지 않는다.` (주어 없음) | 마크 트웨인 본명은 **Samuel Langhorne Clemens**. 한국어는 앞 절이 잘림 | `Langhorne`, KO `미국 문학에서 새뮤얼 랭혼 클레멘스보다 더 잘 알려지거나 사랑받는 작가는 없다.` |
| L-66 | d181 #4 | **Medium** | 사실 오류 (녹음 내용) | `Roughly 1/3 of the world's population is left-handed.` | 왼손잡이는 세계 인구의 약 **10%** (1/3 아님) | 음성은 녹음이라 유지 + 화면 주석 (근거: https://www.britannica.com/science/handedness, 2026-09-17 확인) |
| L-67 | d177 #1 #2 #4 EN | **Medium** | 전사 오류 | `Rut` `Rud` (같은 인물 `Rudd`) | 이름 세 가지 | `Rudd` |
| L-68 | d182 #5 EN, d173 #2 EN | **Medium** | 전사 누락·오타 | `…just like it. had to be exactly the same size…` / `Susan Haywood` (KO `헤이워드`) | `It had to be…` / `Susan Hayward` | |
| L-69 | d171 #1 KO, d183 #1 KO, d175 #1 KO, d181 #1 KO, d164 #1–#2 KO | **Medium** | 번역 잘림 | `그냥 웃으면서 그녀에게 걱정하지 말하라고 말했다.` (앞 절 없음) / `짝이 맞는 진주에 대하여 25,000불을 제의했다.` / d175·d181 첫 문장 번역 없음 | 한국어 행이 영어 행과 어긋나 앞 절이 빠짐 | 행 경계 맞춰 복원 |
| L-70 | d161 #5 KO `장기, 화투 치기`(chess, card playing), d162 #1 KO `유모어 배우`(humorist) #9 `더 작은 신문들`(fewer), d180 #5 KO `그가 자신의 길을 보는 것을`(glancing her way), d181 #12 KO `이 기계는`(This shop) | Low | 오역 | | | `체스, 카드놀이` `유머 작가` `더 적은 신문` `자기 쪽을 흘끗 보는 것을` `이 가게는` |
| L-71 | d171 #8 `(그 고양이가 식중독에 걸린 것이 아니라 차에 치었다)`, d177 #9, d180 #11, d183 #9 `(공범자)`, d187 #13 `(수수료가 백불)` | Low | 정답 노출 | 수수께끼형 회차의 답이 **한국어 번역 괄호에** 들어 있어 섀도잉·대조 화면에서 바로 보임 | | 답은 별도 "정답 보기" 로 |
| L-72 | d156 #6 `Knga` #8 `잰슨`, d157 #4 `지배인으로써`, d161 #2 `되는 것은 것을`, d165 #1 `출연`, d166 #2 `마크 퉤인`, d173 #1 `헤이워즈`, d183 #9 `않앗다`, d187 #9 `강제당 할 것입습니다`, d164 힌트 `Unties States`, d188 #6 `복사했다`(copied their ways) | Low | 오타·번역 | | | |
| L-73 | d165 #4 `the most recent advancement of significance has been Telstar` (1962), d184–d185 존커 다이아몬드 수치 (녹음) | Low | 낡은 사실 (녹음) | | | 주석 |
| L-74 | d194 #6, d196 #2 #4 | **Medium** | 부적절한 내용 (녹음) | `Lion tamers, acrobats, freaks…` / `The freaks are a group of entertainers who are interesting or unusual simply because of some physical deformity…` / `These people are all pathetic in a way, but perhaps the fat lady is most to be pitied.` / KO `기형아` | 신체 장애·체형을 "freaks" "pathetic" 으로 부르는 옛 서커스 관점 — 유료 학습 콘텐츠로 부적절 (학생 과정 이용자 포함) | 회차 교체 또는 해설 추가 (소유자 판단 필요) |
| L-75 | d192 #11 EN | **Medium** | 전사 약어 | `a set of boot prints in the dusty St. and said…` | `street` 가 약어 `St.` 로 — 받아쓰기 정답·음성 모두 어색, 문장 중간 마침표 | `in the dusty street` |
| L-76 | d204 #5 EN | **Medium** | 동음이의 오기 | `…took one of her steaming pies to a new border` | 하숙인은 `boarder` (border = 국경) | `a new boarder` |
| L-77 | d215 #1 EN | **Medium** | 데이터 잔재 | `215 In addition to the intercession of the priests…` | 회차 번호 `215` 가 정답 문장 앞에 들어감 (음성·타일 포함) | 번호 삭제 |
| L-78 | d221 #5 EN·KO | **Medium** | 전사 중복 | EN `You just want to camp along the way and spend a week or so in a cozy retreat at the end of your trip.` (녹음 #6 문장의 잘못된 반복) / KO #5 는 #6 의 앞 절 | 녹음에 없는 문장이 받아쓰기 문항 | 삭제, KO #5–#6 행 합침 |
| L-79 | d200 #5 | **Medium** | 사실 오류 (녹음) | `His curiosity led him to discover electricity` | 프랭클린은 전기를 "발견" 하지 않았음 (번개가 전기임을 보임) | 주석 |
| L-80 | d191 #12 KO `(소경)`, d192 `Aborigine`, d215 #3 머리가죽을 "행운의 부적" 으로 묘사 | Low | 표현·고정관념 | `소경` 은 낮춤말, `Aborigine` 은 현재 `Aboriginal Australians` 권장, 원주민 문화의 고정관념 | | `시각장애인`, 주석 |
| L-81 | d197 #6 `Emmett`↔KO `Emmet` 힌트 `Emmet Kely`, d197 #2 KO `모든 시대의 어린이들`(children of all ages = 남녀노소), d204 #2 KO `심장에 갖고 있었다`(had at heart), d213 #2 KO `그들 자신의 권리로`(in their own right), d206 #1 KO `실질적인 농답`(practical jokes) | Low | 오역·이름 | | | `Emmett Kelly` `남녀노소 모두` `진심으로 위했다` `그 자체로` `짓궂은 장난` |
| L-82 | d188 #7 KO `과학자`(scholar), d191 #7 `그라나` #10 `괘` #11 `끔직한`, d194 #4 `전에서는` #6 `쇼"이 시민들`, d195 #2 `미끌어지면`, d196 #2 `어던`, d199 #3 `함게`, d200 #3 `증` #6 `자극햇다`, d205 #1 `살해하는`, d209 #4, d210 #1 `통털어`, d217 #3 `부적으로써`, d225 #7 | Low | 오타 | | | |
| L-83 | d188 #11 `made-up` #13 `HIS`, d190 #4 `their horn blowing`, d203 #5 `excessive kindness become`, d216 #7 `old wives tales`, d218 #5 #6 · d223 #4 문장 경계·인칭, d211 #4 #5 · d219 #4 · d222 #5 (녹음 내용 사실성) | Low | 표기·사실 | | | |
| L-84 | d232 #3, d234 (minstrel show), d255 #7, d256–d257 (Indian medicine man) | **Medium** | 부적절한 내용 (녹음) | `comparatively uncivilized tribes, such as those found in Africa` / 흑인 분장 공연인 minstrel show 를 향수 어린 즐거움으로 묘사 / `This custom persists even today in some of the primitive tribes of Africa and among the American Indians` / 원주민 치료사를 `weird and outlandish` `primitive` 로 | 인종·문화 비하 표현을 사실처럼 제시 — L-74 와 함께 유료 콘텐츠로서 검토 필요 | 회차 교체 또는 해설 (소유자 판단) |
| L-85 | d273 #5, d273 #3, d275 #2 #3 | **Medium** | 사실 오류 (녹음) | `Today, more than 1,000 languages are spoken.` / `the tower collapsed` / `The few dialects in English give it the advantage…` `English is very exact. It has few of the ambiguities…` | 현재 언어 수는 약 **7,000개**. 창세기 바벨탑 이야기에 탑 붕괴는 없음(언어 혼잡·흩어짐). 영어 방언이 적고 모호성이 적다는 주장은 사실과 다름 | 주석 (근거: https://www.ethnologue.com/insights/how-many-languages/, 2026-09-17 확인) |
| L-86 | d229 #5 EN | **Medium** | 전사 오류 | `Their trailers park side by side for miniature cities.` (힌트 `form`, KO `작은 도시를 형성한다`) | `to form miniature cities` | 좌와 같이 |
| L-87 | d230 #2 #4, d231 #6 #7 (녹음) | Low | 사실·안전 (녹음) | `Yosemite is named for one of its breathtaking waterfalls` (실제 이름은 원주민 부족명 유래) / `The sequoia tree is the … oldest living thing` (최고령은 브리슬콘 소나무) / 옐로스톤의 `tame bears … join picnickers for lunch` (곰에게 음식 주기는 현재 금지·위험) | | 주석 |
| L-88 | d271 #6 `A 100 years from now`, d276 #4 `speaks 2 languages` | Low | 숫자 표기 (L-59 와 같음) | | | `A hundred` `two` |
| L-89 | d229 #3 `gypsies`, d240 #1 #5·d272 #6 성 고정관념 (`A man's first duty…` `maiden aunt`) | Low | 표현 | | 로마인 비하어·성 고정관념 | 주석 |
| L-90 | d239 #8 KO `불쌍한 패배자`(poor losers = 패배를 인정 못 하는 사람), d238 #3 KO `병드는 느낌`(sickening), d242 #2 KO `미국 축구`(American football = 미식축구), d243 #3 KO `이국풍의`(outlandish), d244 #8 KO `무죄하다`(innocent), d245 #4 KO `큰 횃불`(bonfires), d252 #5 KO `재산`(asset), d253 #1 KO `정확하게`(honestly), d270 #5 KO `도시의 마을들`(cities and towns) | Low | 오역 | | | `패배를 못 견디는 사람` `메스꺼운` `미식축구` `기상천외한` `악의 없다` `모닥불` `자산` `정직하게` `도시와 마을` |
| L-91 | d230 `세콰이에`, d237 `우르렁`, d241 `에술가`, d245 `All Sants`, d246 `첨럼`, d248 #6 `얼굴을`, d252 #3 `때봐다`, d253 #6 `직원 에`, d254 #1 `면접관이의` #8 `고용주로써`, d256 #4 `때가지`, d258 #7 `주이는`, d260 #5 `이린이들`, d267 #1 `규칙으로써` `쪼달렸다`, d270 #4 `애국가` #6 `자연스로운`, d244 #5 `짖꿎은`, d248 힌트 `laughing mater` | Low | 오타 | | | |
| L-92 | d236 #1 #2, d271 #4, d261 (녹음 시대 표현), d244 #4 `Yum, This is…`, d260 #4 `the worst end`(관용구 `the worse end`), d268 #6 · d242 #5 문장 경계 | Low | 표기·낡은 표현 | | | |
