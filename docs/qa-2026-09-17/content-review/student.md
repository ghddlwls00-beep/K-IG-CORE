# STUDENT — 내용 점검 (87개 파일 전부 읽기)

원본: `out/content/student.txt` (`scripts/dump-student.cjs`). 괄호 `( )` 는 학습자가 자기 정보로 바꾸는 **빈칸 자리표시자**라 오류로 보지 않음 (AGENTS.md).
청크 연습 일치율: 청크 영어가 그 레슨 문장 안에 실제로 있는 비율 (`scratchpad drill-match`).

## 발견 사항

| ID | 위치 | 심각도 | 분류 | 현재 | 문제 | 고칠 방향 |
|---|---|---|---|---|---|---|
| S-01 | s17-3 #4 (+청크) | **High** | 사실 오류 | `In 1948, Korea was librated from Japan.` / KO `1948년, 한국은 일본으로부터 독립했습니다.` | 광복은 **1945년 8월 15일**. 1948년은 정부 수립. `librated` 철자도 틀림 | `In 1945, Korea was liberated from Japan.` / `1945년, 한국은 일본으로부터 해방되었습니다.` (근거: https://www.britannica.com/place/South-Korea/The-Korean-War — 1945 liberation, 1948 governments; 2026-09-17 확인) |
| S-02 | s17-3 #6 | **High** | 사실 오류 | `As a result, the Korean peninsula became divided into North and South Korea.` | 분단은 전쟁의 **결과가 아니라 원인 이전**(1945년 38선, 1948년 두 정부). 전쟁은 분단을 굳혔을 뿐 | `After the war ended in 1953, the Korean peninsula remained divided into North and South Korea.` |
| S-03 | s19-4 #6 | **High** | 사실 오류 | `in 1420, … Se-jong, asked his royal scholars to create a unique Korean alphabet.` / KO `1420년` | 한글 창제는 **1443년**, 반포 1446년. 1420년은 집현전 확대 개편. 세종이 학자들에게 "만들라고 요청" 했다는 서술도 실록(세종 친제)과 다름 | `In 1443, King Sejong created a unique Korean alphabet, and it was proclaimed in 1446.` (근거: https://www.britannica.com/topic/Hangul, 2026-09-17 확인) |
| S-04 | s19-4 #3 (+청크) | **High** | 문법 오류 | `Instead, they Chinese characters were used in order to write.` | `they` 가 끼어든 비문 | `Instead, Chinese characters were used for writing.` |
| S-05 | s19-3 전체 | **High** | 데이터 손상 | 영어 문장 0개(∅), 영어 문단 순서 뒤섞임, `PASS-OFF FOR STUDENT` 자리표시자, 제목 잔재 `Chapter 1`…`Chapter 5` `Culture :` `Food` | **받아쓰기 문항이 하나도 없는 레슨**. 이전 감사에서 "소유자 결정" 으로 보류했으나 교재 원본이 정답이 아니라는 지시에 따라 결함으로 판정 | KO 4문장 순서에 맞춘 EN 4문장을 `sentences` 로 복원 (`Another unique aspect of Korean culture is its food.` / `Traditional Korean meals usually include…` / `My favorite food is bulgogi.` / `Bulgogi is the most popular Korean meat dish, while…`), 잔재 삭제, 음성 생성 |
| S-06 | 청크 연습 14개 레슨: s1-4 s1-5 s1-6 s4-2 s4-6 s5-5 s7-3 s8-2 s9-1 s9-2 s11-1 s11-3 s11-4 s12-3 | **High** | 데이터 어긋남 | 예: s1-4 "내성적인 성격" 레슨의 청크 = `My hobbies include…` (s1-5 내용), s1-5 청크 = 좋아하는 과목(s1-6 내용), s1-6 청크 = 봉사활동(어느 레슨에도 없음), s9-1 청크 = 강아지와 조깅… | 청크 연습이 **그 레슨 문장과 0~31%만 일치** — 다른 레슨·다른 판의 문장을 연습시킴. 화면에 "N개 청크" 로 그대로 노출 | 각 레슨 문장에서 청크를 다시 생성 (문장→의미 단위 분할). 생성 후 일치율 100% 검사 |
| S-07 | 청크 s8-4 (8개), s9-3 (5개), s16-1 (3개), s11-3 (1개) | **High** | 데이터 손상 | `저녁식사 후에 나의 가족은 함께 → TV를 봅니다.` / `나의 가족은 → TV를 본다. our family watches T.V` / `빌 게이츠, 아인슈타인, 과 같은 … → T.V에서 보아왔고…` | `TV` 에서 한/영이 잘못 갈라져 **영어 칸에 한국어**, 같은 청크 중복 | S-06 과 함께 재생성 |
| S-08 | s13-2 #2 #4, s13-3 #5 (+청크) | **Medium** | 사실 오류 | `General Lee lived 500 years ago` / `He created the turtle ship … and conquered them many times.` / `General Soon-Shin Lee (이순신)` | 이순신(1545–1598)은 약 **430~480년 전**. 거북선은 조선 초(1413년 기록)부터 있었고 이순신은 **개량·건조**. 일본을 "정복(conquer)" 하지 않고 "물리침(defeat)". 해군 **제독(Admiral)**, 표준 로마자 **Yi Sun-sin** (레슨 제목은 이미 Admiral Yi Sun-sin) | `Admiral Yi Sun-sin lived more than 400 years ago…` / `He built improved turtle ships … and defeated them many times.` (근거: https://www.britannica.com/biography/Yi-Sun-sin, 2026-09-17 확인) |
| S-09 | s17-2 #2, s17-3 #1 | **Medium** | 사실 왜곡 | `these three kingdoms united as a single nation` / `After Shilla fell, many other countries tried to gain power over Korea.` | 신라는 백제·고구려를 **전쟁으로 통합**(자발적 연합 아님). 신라 멸망 뒤 고려·조선 약 1,000년을 건너뛰고 곧바로 일제강점으로 이어져 오해 유발 | `Later, Silla conquered the other two kingdoms and unified most of the peninsula.` / `After Silla, the Goryeo and Joseon dynasties ruled Korea for about 1,000 years.` |
| S-10 | s18-1 #3 | **Medium** | 사실 오류 | `We celebrate Lunar New Year's, Independence Day, Arbor Day, …` / KO `독립기념일, 식목일` | 한국에 "독립기념일" 공휴일은 없음 (광복절 Liberation Day·삼일절). 식목일은 2006년부터 공휴일 아님 | `Seollal, Liberation Day, Children's Day, Buddha's Birthday, Chuseok…` |
| S-11 | s11-1 #1 (+청크), s11-2 | **Medium** | 낡은 정보 | `After school on Saturday, I go home…` | 한국 초중고 토요 수업은 **2012년 전면 폐지**(주5일 수업) — 현재 학생에게 사실과 다른 일상 | `On Saturday morning, I do chores around the house.` |
| S-12 | s15-1 #1 #2 #3, s16-1 #3 | **Medium** | 낡은 정보·사실 | `A few years ago our country hosted the 2002 World Cup.` / `Before the World Cup, soccer was not famous in our country.` / `A few years ago, Queen Elizabeth II came to Korea.` | 2002년은 **24년 전**(한일 공동 개최). 한국은 1986년부터 월드컵 연속 진출, K리그 1983년 출범 — "축구가 유명하지 않았다" 는 사실과 다름. 엘리자베스 2세 방한은 1999년(2022년 서거) | `In 2002, Korea and Japan co-hosted the World Cup.` / `Before 2002, Korea had never won a World Cup match.` / `In 1999, Queen Elizabeth II visited Korea.` |
| S-13 | s20-3 #1 KO | **Medium** | 사실 오류 | `한국민속촌은 … 경기도 수원시에 위치해 있습니다.` | 한국민속촌은 **용인시** 기흥구 (수원 인근). 영어 `near the city of Suwon` 은 맞음 | KO `수원시 근처 경기도 용인시에`; EN `in Yongin, near Suwon, in Gyeonggi Province` |
| S-14 | s20-2 #2 | **Medium** | 고유명사 | `the Bulguk-Temple, Soungni-San National Park, and Independence-Hall` | 표기 오류 — `Bulguksa Temple`, `Songnisan National Park`, `the Independence Hall of Korea` | 좌와 같이 |
| S-15 | s2-4 #1 | **High** | 문법 오류 | `My parents always make my sister and I feel important and special.` | 목적격 자리 — `my sister and **me**` (과잉 교정 오류를 모범으로 가르침) | `…make my sister and me feel…` |
| S-16 | s3-3 #3 #4 #5 | **High** | 문법 오류·성별 | `…and she is good at speaking English.` / `He/She a very talented artist, too.` / `Her drawings are…` | #4 동사 `is` 누락(비문), #3·#5 는 He/She 문장인데 `she`/`Her` 고정 → "He" 로 고르면 성별이 섞임 | `…and he/she is good at…` / `He/She is a very talented artist, too.` / `His/Her drawings are…` |
| S-17 | s4-1 #2 | **Medium** | 문법 오류 | `Let/Allow me tell you about my relatives.` | `Allow me tell` 은 비문(`Allow me to tell`) — 슬래시 풀이로 비문이 정답 처리 | `Let me tell you about my relatives.` |
| S-18 | s12-2 #1 #6 | **Medium** | 문법 오류 | `I spend my summer vacation a bit different from the winter one.` / `…anyways.` | 부사 `differently`, `anyways` 는 비표준 | `a bit differently from…` / `anyway` |
| S-19 | s16-1 #5 | **Medium** | 어휘 오류 | `…had a great affect on me.` | 명사는 `effect` (affect/effect 혼동을 모범으로) | `had a great effect on me` |
| S-20 | s5-2 #6 (+청크) | **Medium** | 어휘 오류 | `I stop by the stationary store` | `stationary`(정지한) ≠ `stationery`(문구) | `stationery store` |
| S-21 | s1-6 #2, s7-2 #2 (+청크), s16-3 #2 | **Medium** | 어휘 오류 | `I study English everyday.` `Everyday I go and learn…` `I will study English everyday` | 부사는 두 단어 `every day` (everyday 는 형용사) | `every day` |
| S-22 | s2-3 #5 | **Medium** | 시제 | `She had worked at a department store for several years.` | 기준 과거 시점 없는 과거완료 | `She worked at a department store for several years.` |
| S-23 | s5-1 #2 (+청크) | **Medium** | 어휘 | `because I sleep-in late` | 동사는 `sleep in` (하이픈 형은 명사) | `because I sleep in` |
| S-24 | s5-4 #4, s8-1 #4, s20-4 #5, s18-3 #2 | **Medium** | 오타 (받아쓰기 타일에 그대로) | `dislikethe` `sometimesplay` `theShilla` `ancestrial` `People`(문장 중간 대문자) | 붙은 단어가 **단어 타일 하나로** 나와 학습자가 틀린 낱말을 배열하게 됨 | `dislike the` `sometimes play` `the Silla` `ancestral` `people` |
| S-25 | s4-4 #2 KO | **Medium** | 논리 오류 | #1 `My mother is the youngest child` / #2 KO `여동생이 2명 있습니다` | 막내에게 여동생이 있을 수 없음 | KO `언니가 2명 있습니다` |
| S-26 | s8-3 #1 #2 | **Medium** | 논리 모순 | `Dinnertime is the only time that our family can get together` / `my father comes home late, so we can't be together at suppertime` | 저녁이 유일하게 모이는 시간이라면서 저녁에 모일 수 없다고 함 | #2 `…so sometimes we can't all be together at suppertime.` |
| S-27 | s3-1 #1 | **Medium** | 데이터 | EN `I would like to introduce my friend to you. Allow me to introduce my friend to you.` / KO 한 문장 | 두 문장이 한 문항 (#2 와 첫 문장 중복) | `Allow me to introduce my friend to you.` |
| S-28 | s6-4 #1 KO (+청크) | **Medium** | 오역 | `realize my dreams` → `나의 꿈을 깨닫는 것을` | realize a dream 은 "꿈을 **이루다**" | `내가 꿈을 이루도록 도와주십니다` |
| S-29 | s1-2 #2 #3, s13-2 #1 (EN 안 한글) | **Medium** | 표기 | `I live at 한국Apartment.` `at 한국 Elementary School` `General Soon-Shin Lee (이순신)` | 영어 문장 안에 한글 — 음성이 한글을 읽고 받아쓰기 타일에 한글. `live at … Apartment` 도 부자연(`live in … Apartments`). 4학년이 11살(만 나이로 9~10살)도 어긋남 | `I live in (apartment name) Apartments.` `I am a 4th grade student at (school name) Elementary School.` `I am (10) years old.` |
| S-30 | STUDENT 개요 페이지 `s1`~`s5` | **Medium** | 데이터 어긋남 | 제목 `Chapter 2 개요 · Family Introduction` 인데 목록은 등교·학원·방과후 주제, `Chapter 4 개요 · Relative Introduction` 인데 장래희망 주제, `Chapter 5 개요 · Getting Ready for School` 인데 역사·명절·명소 주제. `Sitster` 오타, 번호 순서 뒤섞임 | 과정 목록에는 없고 주소로만 열림 — 열면 제목과 내용이 다름 | 색인에 넣지 않을 거면 404/리다이렉트, 쓸 거면 제목·목록 정정 |
| S-31 | s12-1 #5 청크, s10-5 #2 KO, s18-3 #1 KO, s20-1 #2 KO, s20-5 #6 KO | Low | 번역 | `국립학교`(public school), `정상적인 계획`, `국경일`(추석), `지질학적 경치`, `이천 미터`(1,947m) | | `공립학교`·`정규 일정`·`명절`·`지리적 경관`·`약 1,950미터` |
| S-32 | 여러 곳 | Low | 표기·자연스러움 | `very strong athlete`(s3-3), `story teller`(s4-6), `Because grandfather`(s4-4), `Mr./Ms (Surname)`(s6-2), `Sometimes, He/She`(s6-3), `T.V together`/`T.V`(s8-4), `1970's`(s17-4), `Lunar New Year's also known as seol-lal`(s18-2), `song-pyeun` `han-bok` `Dan-goon` `Gojoson` `Shilla` `Gyoung-gi`, `Western style`, `English speaking country`, `not like any other countries`(s19-1), `similar to the other students`(s10-3), `In order to become a teacher, my parents tell me`(s14-3), `the first day of my new week has started on this note`(s10-2) | | `a very strong athlete` `storyteller` `my grandfather` `Ms.` `he/she` `TV` `1970s` `Seollal` `songpyeon` `hanbok` `Dangun` `Gojoseon` `Silla` `Gyeonggi` `Western-style` `English-speaking` `any other country's` `similar to those of` … |
| S-33 | 한국어 맞춤법 여러 곳 | Low | 맞춤법 | `11살 입니다` `가정주부 이십니다` `그들은매우` `시간이 아주 작습니다` `매일 월요일 아침` `어쨌던` `힘이 쌨습니다` `원할히` `이루어 질것이라` `할아버지할머니` | | `11살입니다` … `적습니다` `매주 월요일` `어쨌든` `강했습니다` `원활히` |

## 레슨별 상태 (87개 파일)

| 레슨 | 상태 | 이슈 |
|---|---|---|
| s1 s2 s3 s4 s5 (개요, 색인 밖) | FAIL | S-30 |
| s1-1 | PASS | |
| s1-2 | FAIL | S-29 S-33 |
| s1-3 | PASS | |
| s1-4 s1-5 | FAIL | S-06 |
| s1-6 | FAIL | S-06 S-21 |
| s2-1 s2-2 | PASS | |
| s2-3 | FAIL | S-22 S-33 |
| s2-4 | FAIL | S-15 |
| s2-5 s2-6 | PASS | |
| s3-1 | FAIL | S-27 |
| s3-2 | PASS | |
| s3-3 | FAIL | S-16 S-32 |
| s3-4 | FAIL | S-33 (청크 63%) |
| s4-1 | FAIL | S-17 |
| s4-2 | FAIL | S-06 |
| s4-3 | FAIL | S-33 |
| s4-4 | FAIL | S-25 S-32 |
| s4-5 | PASS | |
| s4-6 | FAIL | S-06 S-32 |
| s5-1 | FAIL | S-23 |
| s5-2 | FAIL | S-20 |
| s5-3 | PASS | |
| s5-4 | FAIL | S-24 |
| s5-5 | FAIL | S-06 |
| s6-1 s6-2 s6-3 | FAIL | S-32 (청크 일부만 존재) |
| s6-4 | FAIL | S-28 |
| s7-1 | FAIL | S-33 |
| s7-2 | FAIL | S-21 |
| s7-3 | FAIL | S-06 |
| s8-1 | FAIL | S-24 |
| s8-2 | FAIL | S-06 |
| s8-3 | FAIL | S-26 |
| s8-4 | FAIL | S-07 S-32 |
| s9-1 s9-2 | FAIL | S-06 |
| s9-3 | FAIL | S-07 |
| s10-1 | PASS | |
| s10-2 | FAIL | S-32 S-33 |
| s10-3 | FAIL | S-32 |
| s10-4 | PASS | |
| s10-5 | FAIL | S-31 |
| s11-1 | FAIL | S-06 S-11 |
| s11-2 | FAIL | S-11 |
| s11-3 s11-4 | FAIL | S-06 (s11-3 은 S-07 도) |
| s12-1 | FAIL | S-31 |
| s12-2 | FAIL | S-18 S-33 |
| s12-3 | FAIL | S-06 |
| s12-4 | FAIL | S-32 |
| s13-1 | PASS | |
| s13-2 s13-3 | FAIL | S-08 S-29 |
| s14-1 s14-2 | PASS | |
| s14-3 | FAIL | S-32 |
| s15-1 | FAIL | S-12 |
| s15-2 s15-3 | PASS | |
| s16-1 | FAIL | S-07 S-12 S-19 |
| s16-2 | FAIL | S-33 |
| s16-3 | FAIL | S-21 |
| s17-1 | FAIL | S-32 |
| s17-2 | FAIL | S-09 S-33 |
| s17-3 | FAIL | S-01 S-02 S-09 |
| s17-4 | FAIL | S-32 |
| s18-1 | FAIL | S-10 |
| s18-2 | FAIL | S-32 |
| s18-3 | FAIL | S-24 S-31 |
| s19-1 s19-2 | FAIL | S-32 |
| s19-3 | FAIL | S-05 |
| s19-4 | FAIL | S-03 S-04 |
| s20-1 | FAIL | S-31 |
| s20-2 | FAIL | S-14 |
| s20-3 | FAIL | S-13 S-32 |
| s20-4 | FAIL | S-24 S-32 |
| s20-5 | FAIL | S-31 S-32 |
