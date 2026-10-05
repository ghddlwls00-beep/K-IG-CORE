# 단계 1 가르기 — LISTENING(ld) · READING (triage-ld-reading · opus) — 2026-10-05

**같은 AI 계열이 만들고 점검함 — 독립 검수 아님.** 내용 · 도구 · 앱 파일은 바꾸지 않았다. 커밋 · 푸시 · R2 · 배포 0. 이용권 코드 · PIN 타이핑 0, `/api/license/` · `/api/admin/` 변경 호출 0. CNN · GVA 0.
운영 다시 열기: 감사 이용권 **사본** `rc1002-fin-triage-ld-reading`(lib/harness.cjs startBrowser · 포트 9997 · 브라우저 1개 · 띄울 때 남은 메모리 2.05GB · 2.32GB).
누른 것은 소리 단추, 문제 보기, '그래도 보기', 해석 열기뿐이다. 문제 답과 가림 풀기는 그 사본의 브라우저 저장소에만 남는다(LessonQuestions.tsx 57 · 73 — 서버 호출 없음). 완료는 누르지 않았다.
운영 다시 열기 기록: `단계1/triage-ld-reading/triage-ld-out.jsonl` · `triage-ld2-out.jsonl`(+ 쓴 스크립트 `.cjs` 둘).

**멈춤 조건 없음.** 유료 주소가 이용권 없이 열리지 않았고, 유료 본문 유출도, 결제 · 이용권 상태 변경도 없었다.

## 맡은 몫 — 빠짐없이 센 것

| 출처 | LISTENING | READING |
|---|---|---|
| 강의 판정 FAIL(build-coverage) | 1강(d172 데스크톱) | 9강(모두 데스크톱) |
| 강의 판정 BLOCKED | 0 | 0 |
| fails.json `lines` | 9줄 = 소리 FAIL 3 + 요청 실패 6 | 18줄 = 9강 × (check 1 + problems 1) |
| fails.json `recheckLines`(소리 다시 누르기) | 7줄 = BLOCKED 3 + FAIL 4 | 0 |
| 화면 글 '없음' | 0 | 0 |
| 4xx · 5xx | 0 · 0 | 0 · 0 |
| 스윕 소리 FAIL · RETEST | FAIL 3 · RETEST 65 | FAIL 0 · RETEST 0(상태 칸 없음 — recheck-audio 셈 17,650 모두 PASS) |
| 실기기 몫 | — | 데스크톱 실제 마이크 512칸 |

RETEST 65 는 fails.json 에 줄로 들어가지 않았다. 그래도 '소리 실패를 하나도 빼지 말라' 는 지시에 따라 모두 아래 표에 넣었다. 다시 누르기 대상은 이 중 4개뿐이었고, 61개는 recheck-audio 가 '재생 버튼이 아닌 요소' 로 뺐다.

## 가르기 표

| # | 과정 | 강의 | 화면 | 무엇 | 판정 | 근거 | 고칠 안 | 소리 바뀜 | 심각도 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | LISTENING | d172 · d134-1 · d185-1 (3쪽) | 데스크톱 | d172 Step 3 소리클리닉 'dreamed of · not in · but in' 소리 FAIL 3(`clip error 4` · NotSupportedError · 브라우저 음성으로 대신 읽음). 같은 원인으로 요청 실패 6(`net::ERR_INTERNET_DISCONNECTED` — d172 3 · d185-1 2 · d134-1 1). d172 의 이 FAIL 때문에 LISTENING 강의 판정 FAIL 1이 됨 | **도구 탓 — 점검 기계의 인터넷이 잠깐 끊김**(앱은 맞음) | ① 같은 기록에서 요청 실패 3이 그 클립 3과 같은 쪽 · 같은 시각(10-04 12:03:31Z)이다. 같은 30분 안에 다른 조각의 d134-1(11:30Z)과 d185-1(12:05Z)도 같은 오류. 4xx · 5xx 는 0 — 서버가 아니라 기계 쪽 연결 끊김이다. ② d134-1 · d185-1 은 같은 기록의 소리 · 확인 줄이 모두 PASS이고, 휴대폰 · 작은 휴대폰 기록도 요청 실패 0. ③ **운영 다시 열기(10-05 · 데스크톱)**: d172 Step 3 에서 'dreamed of'(1번째 줄) · 'not in' · 'but in'('This time, they dreamed of making their fortunes not in gold, but in the movies.' 줄)을 차례로 누름 → 기대 클립 a-38543f0a… · 6-712c2961… · 6-0febccbb… **3/3 재생**(오류 0 · 브라우저 음성 0). d172 1번째 줄 카드 2/2도 재생. 세 쪽 모두 요청 실패 0 · 4xx/5xx 0 | 앱: 없음. 도구(drive-generic): 같은 방문에 `ERR_INTERNET_DISCONNECTED` 가 있으면 그 소리 줄을 FAIL 이 아니라 '환경 — 다시 누름(RETEST)' 으로 적기. recheck-audio 는 이미 오프라인이면 기다림(464–466) | 없음 | — |
| 2 | LISTENING | d172 | 데스크톱 | 소리 다시 누르기 BLOCKED 3 — 같은 세 카드가 `control not found (not found)` | **도구 탓 — recheck-audio.cjs** | LD 3단계 카드는 지금 보고 있는 줄(lineIdx)의 카드만 그려진다(LdLearningView.tsx 1460 · 1500–1517). 받아쓰기 전 줄은 '그래도 보기' 전까지 가려진다(1479–1480). recheck-audio 는 단계만 열고(415–416) 줄을 넘기지도, '그래도 보기' 를 누르지도 않는다. 'not in · but in' 은 1번째 줄이 아니라서 못 찾았다. 앞 칸 ③처럼 줄을 넘기면 3/3 재생됨 | 도구: recheck-audio 의 LISTENING 3단계 대상은 가림이면 '그래도 보기' 를 누르고, 그 카드가 나올 때까지 '다음 문장' 을 누른 뒤 누르기 | 없음 | — |
| 3 | LISTENING | d226 · d246 · d105 · d273 · d275 (5강 · 7칸) | 데스크톱 2 (d226 · d246) · 작은 휴대폰 5 (d226 · d246 · d105 · d273 · d275) | 스윕 소리 RETEST 7 — Step 1 블라인드 '① 마더 구스 동요는 … 발음과 리듬을…' · '① 자기 편 기사의 말조차 알아듣기 어려웠다' · '① 사람들에게 익숙한 문장' · '② 어휘 일부는 … 발음은 독일어와…' · '④ 어려운 발음' (`no playing event` · `no audio request within 10 s`). 이 중 4개(d226 · d246 데스크톱 · d273 · d275 작은 휴대폰)는 다시 누르기에서 **FAIL** `no audio request in 12 s`. 미해결 소리 FAIL 7 가운데 4가 이것 | **도구 탓 — 소리 단추가 아니라 새 문제의 답 보기**(앱은 맞음) | 이 단추들은 '들은 내용 확인' 문제(LessonQuestions)의 보기 단추다(`[data-question] [data-option]`). 소리를 내지 않는 것이 맞다. 보기 글에 든 '발음' · '알아**듣기**' · '익숙**한 문장**' 을 drive-generic.cjs 98 의 `PLAY_RE`(/…듣기\|발음\|…\|한 문장/i)가 소리 단추로 잘못 잡았다. recheck-audio.cjs 111 `PLAY_LABEL`(/…듣기\|발음…/)도 같은 이유로 걸러 내지 못해 4개를 눌렀다. d105 '익숙한 문장' 은 PLAY_LABEL 에 안 맞아 이미 빠졌다. **운영 다시 열기(7/7)**: 모두 `data-option` 이고 문제 안에 있다(d226-q1 · d246-q2 · d273-q3 · d275-q2 · d105-q3). 누르면 소리 요청 0 — 브라우저 음성 ' '(소리 0 · 첫 터치 때 음성 기능을 깨우는 것 — speech.ts 202–207)뿐이다. 맞음/틀림 표시가 나옴. 그 문제의 근거 단추 '문장 n' 을 누르면 그 줄 클립이 **7/7 재생**. 같은 문항의 채점은 check-ld-questions-1004 로 3화면 모두 756/756(단계1/count.md 5) | 도구: drive-generic `PLAY_RE` 에서 `[data-option]` · `[data-question]` 안 단추를 빼기(또는 소리 단추의 aria-label · 아이콘만 보기). recheck-audio `worthRechecking` 에서 ①~⑤ 로 시작하는 보기 줄을 빼기 | 없음 | — |
| 4 | LISTENING | d005 · d005-1 · d014 · d014-1 · d056 · d056-1 · d059 · d059-1 · d060 · d060-1 · d073 · d073-1 · d082 · d090 · d106 · d139 · d139-1 · d140 · d140-1 · d161 · d161-1 · d207 · d208 · d208-1 · d214 · d232 · d232-1 · d233 · d233-1 · d239 · d239-1 · d240 · d240-1 · d244 · d244-1 · d252 · d254 · d254-1 · d270 · d270-1 (40강) | 데스크톱 | 스윕 소리 RETEST 53 — Step 5 다시 듣기의 대본 줄('They play basketball …' · 'The play started …' 등) `no playing event` | **도구 탓 — 대본 줄(해석 여는 단추)을 소리 단추로 잡음**(앱은 맞음) | 53줄 모두 문장 전체에 'play · plays · played · playing · display' 가 들어 있다(ld_english_scripts.json 으로 확인 — 화면에 잘린 16줄도 뒤쪽에 있음). drive-generic `PLAY_RE` 의 `play` 는 낱말 경계가 없어 걸렸다. 이 단추는 해석을 여닫는 단추(LdLearningView.tsx 1721–1731 `aria-expanded` · 화면 안내 '문장을 누르면 해석이 보여요')다. 소리는 줄 옆 'N번 문장 듣기'(1744–1752)가 낸다. **운영 다시 열기(d005 · d059 · d106)**: 대본 줄 누름 → 요청 0 · 해석 열림(3/3). 옆 'N번 문장 듣기' → 그 문장 클립(2r-c55a… · 2b-2e7a… · 28-9d65… — 앱 열쇠 함수로 계산한 값과 같음) **3/3 재생**. recheck-audio 도 이미 이 61줄(4번 · 5번)을 '재생 버튼이 아닌 요소를 음성 컨트롤로 잘못 집었음' 으로 뺐다(recheck-audio.cjs 123–127 · count.md 3 끝 줄) | 도구: drive-generic `PLAY_RE` 의 `play` 를 낱말 경계 · 소리 단추 표시(aria-label '… 듣기' · 아이콘)로 좁히고, `[data-script] button[data-en]` 은 빼기 | 없음 | — |
| 5 | LISTENING | d106-1 · d106 (2강 · 3칸) | 데스크톱(d106-1 · 3줄) · 휴대폰 · 작은 휴대폰(d106 · 각 1줄) | 스윕 소리 RETEST 5 — Step 2 딕테이션 'play' · 'played' · 'plays' (`no playing event` · `no audio request within 10 s`) | **도구 탓 — 받아쓰기 낱말 조각을 소리 단추로 잡음**(앱은 맞음) | 받아쓰기 조각은 `button[data-tile]` 이고, 이름이 그 낱말 자체다(LdLearningView.tsx 1222–1233 — 누르면 답 칸에 놓임 · 소리 없음이 맞음). 이름 'play…' 가 `PLAY_RE` 에 걸렸다. recheck-audio 도 같은 사유로 뺐다. 운영에서는 이번에 조각 화면까지 안 열었다(기본 보기 방식에 조각이 없어 0개 찾음). 판정 근거는 코드 · 기록 | 4번과 같음(`[data-tile]` 빼기) | 없음 | — |
| 6 | READING | pr127-1 · pr051 · pr031 · pr206 · pr171-1 · pr068 · pr180-1 · pr063 · pr063-1 (9강) | 데스크톱 | 'wpm · again — WPM = words ÷ the timed minutes' 기대 N / 실제 N±1 (313/312 · 412/411 · 349/350 · 420/421 · 331/332 · 425/426 · 424/425 · 367/368 · 367/368). fails.json 18줄. READING 강의 FAIL 9 전부 | **도구 탓 — drive-reading.cjs 925–926 의 반올림**(앱은 맞음) | 앱은 반올림하지 않은 시간으로 WPM 을 내고(ReadingLearningView.tsx 801 `wordsPerMinute(wordCount, ms)`), 기록에는 시간만 ms 단위로 반올림해 적는다(806 `ms: Math.round(ms)`). 도구는 반올림된 ms 로 다시 셈한다. 9강 모두 '낱말 수 × 60000 ÷ 적힌 ms' 가 **x.5 경계**다: 312.5000 · 411.5058 · 349.4946 · 420.4970 · 331.4917 · 425.4960 · 424.4912 · 367.4782 · 367.4782. 그래서 1ms 미만의 반올림이 결과를 한 칸 넘겼다. 낱말 수 확인(Step 4 meta)은 9/9 PASS. 화면에 나온 수 = 기록의 wpm(같은 기록의 '결과에 수가 보임' PASS). 9칸 다 데스크톱인 것은 휴대폰 · 작은 휴대폰에서는 이 '실제로 재기' 를 안 하기 때문이다(drive-reading 915–919 touch 는 너무 빠름 시험만) | 도구: drive-reading 926 — 적힌 ms ± 0.5 범위에서 나올 수 있는 WPM 이면 PASS(또는 차이 ≤ 1). 앱은 고칠 것 없음(1 WPM 은 재는 정밀도보다 작음) | 없음 | — |
| 7 | READING | 512강 모두 | 데스크톱 | 3단계 '실제 마이크 인식' BLOCKED 512줄(실기기 몫 — 강의 판정에는 안 셈) | **알려진 것 — 실기기 몫** | 작업기록 15:36(drive-reading 확인: 'BLOCKED 7(데스크톱 실제 마이크 — 실기기 몫)'). 작업기록 18:35 · 단계0/fixes-0d.md(build-coverage 가 READING 마이크 BLOCKED 를 '실기기 몫' 한 줄로). count.md 1-1(헤드리스 브라우저로 볼 수 없음 · 가짜 인식기로 본 화면 배선은 같은 기록의 다른 칸이 PASS). 명령서 '사장님 몫 ② 실제 휴대폰 30분' | 사장님 실제 기기 확인(휴대폰 · 데스크톱 마이크로 READING 3단계 한 번) | 없음 | — |

### 숫자로 다시 정리

- **앱 틀림 0 · 모름 0.** 도구 탓 6줄(위 1~6) · 알려진 것 1줄(위 7).
- LISTENING 강의 FAIL 1(d172) → 환경(인터넷 끊김). 운영에서 3/3 재생됨 → 앱 기준으로는 PASS.
- LISTENING '최종 미해결 소리 FAIL 7'(count.md 3-2) → 0. 3은 환경이고 운영에서 3/3 재생. 4는 답 보기를 잘못 누른 것이고, 맞는 동작(소리 없음 · 채점 · 근거 줄 재생)을 7/7 확인.
- LISTENING 스윕 RETEST 65 → 모두 도구가 소리 단추가 아닌 것을 잡은 것이다. 답 보기 7 · 대본 줄 53 · 낱말 조각 5.
- READING 강의 FAIL 9 → 도구 반올림. 9/9 가 x.5 경계로 설명됨.
- 화면 글 '없음' · 4xx · 5xx: 두 과정 모두 0. 가를 것 없음.

### 범위 밖 참고 (판정 안 함 — 셈에서 FAIL · BLOCKED 가 아닌 줄)

- READING 'wpm — the passage's first line comes up under the header'(계획 G01 'y ≤ 120')가 **NA** 996줄이다(데스크톱 964 · 휴대폰 28 · 작은 휴대폰 4). 드라이버가 적은 까닭은 '쪽 끝까지 내려가 더 못 올림 — 짧은 쪽' 이다. 데스크톱은 '실제로 재기' 를 두 번 하는 쪽 대부분(964/1,024)이 이 NA 다. 데스크톱 화면이 높아 거의 모든 글이 '짧은 쪽' 이 되기 때문으로 보인다. 학습자가 첫 줄을 화면 안에서 보는지는 이번에 따로 안 봤다. 걱정되면 데스크톱 READING 한 쪽에서 '읽기 시작' 을 누른 뒤 위치를 보면 된다.
- LISTENING 'NA graded input' 1,104 · 'NA bookmark/completion' 488 은 모두 다른 기록이 대신 본 NA(덮임)다. BLOCKED 0.

## 도구 결함 (적기만 함 — 고치지 않음)

1. **drive-generic.cjs 98 `PLAY_RE`**: 낱말 경계 없는 `play` 와 한국어 '발음 · 듣기 · 한 문장' 이 대본 줄 · 받아쓰기 조각 · 새 문제 보기에 걸린다. LISTENING 에서만 스윕 RETEST 65(위 3 · 4 · 5). 다른 과정 RETEST(VOCA 1,976 등)에도 같은 원인이 있을 수 있다 — 그 과정 가르기 몫.
2. **drive-generic**: 방문 중 `ERR_INTERNET_DISCONNECTED` 가 있어도 소리 줄을 FAIL 로 적는다(위 1).
3. **recheck-audio.cjs 111 `PLAY_LABEL`**: '발음 · 듣기' 가 든 문제 보기를 다시 누를 대상으로 남긴다(위 3 · FAIL 4).
4. **recheck-audio.cjs 415–416 (genericControl)**: LISTENING 3단계 카드를 찾을 때 줄 넘기기 · '그래도 보기' 가 없다(위 2 · BLOCKED 3).
5. **drive-reading.cjs 925–926**: WPM 을 반올림된 ms 로 다시 셈한다(위 6 · FAIL 9).

## 앞 단계와 같은 원인

- 위 3 의 '맞는 동작' 은 단계0/ld-questions.md 와 단계1/count.md 5(check-ld-questions-1004 — 3화면 756/756)와 같은 문항이다. 이 일은 소리 쪽만 더 확인했다(근거 단추 '문장 n' 재생 7/7 — ld-questions.md 79 의 '근거 버튼의 소리 — 안 본 것' 일부를 채움).
- 위 4 · 5 는 recheck-audio 에 이미 있는 거름 규칙(123–127 '재생 버튼이 아닌 요소를 음성 컨트롤로 잘못 집었음')이 다루는 종류다. count.md 3 의 '재생 버튼이 아닌 요소 96' 에 이 61줄이 들어 있다.
- 위 7 은 작업기록 15:36 · 18:35 · 단계0/fixes-0d.md 에 이미 결정 · 기록된 '실기기 몫' 이다.
- 위 1 · 2 · 6 과 같은 원인은 작업기록 · 단계3/*.md · 단계1/probes-*.md · 단계0/wrongspot-hangul.md 에 없다(새로 가름).
