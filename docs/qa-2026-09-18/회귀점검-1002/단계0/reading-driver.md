# 단계 0 보충 — READING 드라이버(drive-reading.cjs) 3화면 · 깨기 · 셈 · 스윕 (2026-10-04)

같은 AI 계열이 만들고 점검함 — 독립 검수 아님. 대상은 운영(https://k-ig-core.vercel.app)이고, 이용권 사본 `rc1002-reading-probe`(포트 9761)
브라우저를 한 번에 하나만 썼다. 멈춤 조건(이용권 없이 열린 유료 주소 · 유료 본문 유출)은 보지 못했다. 이 일은 이용권 사본으로만 돌았으므로
'이용권 없이' 쪽은 이 일의 대상이 아니다. 내용 파일 · 커밋 · 푸시 0, 이용권 코드 · PIN 타이핑 0, /api/license/ · /api/admin/ 호출 0.

## 고친 파일 — `docs/qa-2026-09-18/scripts/drive-reading.cjs` 하나 (lib/reading-page.cjs 는 그대로)

| 무엇 | 왜 |
|---|---|
| `--clone NAME` · `--port N` | 사본 이름 · 포트가 `drv-rd-<i>` · `9470+i` 로 박혀 있었음 → 'rc1002-reading-…' · 9760~9769 로 돌릴 수 있게(기본값은 그대로) |
| 이해 문제를 **실제로 풂** (`questionChecks`) | 전에는 문제 글과 보기 수만 봤음. 이제: 보기 4개가 파일 순서대로인지 · 데스크톱은 1번 틀리게 + 나머지 맞게 → 판정(`data-verdict`) · '맞았어요.' / '정답은 ②번이에요.' · 'n문제 중 m개 맞힘' → '다시 풀기' 로 비워지는지 → 모두 맞게. 휴대폰은 탭으로 모두 맞게. 학습 엔진에 고를 때마다 시도가 남는지(item = 문제 id), 고른 답이 저장되는지 |
| 새 깨기 `--break text` | 기대 글 하나(지문 마지막 문장의 끝 낱말)를 틀리게 바꿈 → '화면에 있어야 할 글 — 없음' 이 나와야 함 |
| 새 깨기 `--break answer` | '맞게' 고를 자리에서 틀린 보기를 누름 → '정답 보기가 맞음으로 채점' 검사가 FAIL 이어야 함 |
| 기록에 `driverRev: "rd-0928-q1004"` · `base` | build-coverage 가 어느 드라이버 기록인지 알 수 있게 |
| 이해 문제 기록 키(`kig-questions:reading/<id>`)도 쪽마다 지움 | 앞 방문의 답이 남아 '처음에 0개 답함' 이 틀어지지 않게 |
| G01('읽기 시작 뒤 첫 줄이 위로') 의 NA 에 `absent` + `absentEvidence` | 쪽이 짧아 더 못 올리는 경우의 NA 를 build-coverage 가 '대신 본 기록 없음' BLOCKED 로 셌음(아래 증명) — 이제 '그 자리에 없음(같은 기록에 wpm PASS 있음)' 으로 셈 |

## 1) 3화면 표본 (운영 · 이용권 사본)

명령: `node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001,pr001-1,pr069,pr256,pr128-1 --viewports desktop,mobile,small --suffix -rc1002probe --clone rc1002-reading-probe --port 9761` → **exit 0** (724.7초).
끝 쪽 확인으로 pr127(1문장 · 가장 짧음) · pr080(20문장 · 가장 긺)을 같은 파일에 더 돌림 → exit 0. 기록: `docs/qa-2026-09-18/out/features/reading-rc1002probe.jsonl` (21개).

| 쪽 | 화면 | 초 | PASS | FAIL | BLOCKED | NA | 소리(재생/누름) | 화면 글(있음/기대) | 이해 문제 검사 | 4xx·5xx |
|---|---|---|---|---|---|---|---|---|---|---|
| pr001 (무료) | desktop · mobile · small | 74.5 · 24.4 · 24.4 | 356 · 81 · 81 | 0 | 1 · 0 · 0 | 2 · 0 · 0 | 29/29 · 2/2 · 2/2 | 38/38 | 16 · 10 · 10 PASS | 0 |
| pr001-1 (무료) | 〃 | 61.6 · 23.8 · 24.1 | 357 · 81 · 81 | 0 | 1 · 0 · 0 | 2 · 0 · 0 | 29/29 · 2/2 · 2/2 | 38/38 | 16 · 10 · 10 | 0 |
| pr069 (유료 · '흥덕 Temple') | 〃 | 78.2 · 26.9 · 27.2 | 371 · 81 · 81 | 0 | 1 · 0 · 0 | 2 · 0 · 0 | 31/31 · 2/2 · 2/2 | 40/40 | 16 · 10 · 10 | 0 |
| pr256 (유료) | 〃 | 81.0 · 26.5 · 26.5 | 412 · 81 · 81 | 0 | 1 · 0 · 0 | 2 · 0 · 0 | 37/37 · 2/2 · 2/2 | 46/46 | 16 · 10 · 10 | 0 |
| pr128-1 (유료) | 〃 | 72.7 · 24.7 · 24.4 | 357 · 81 · 81 | 0 | 1 · 0 · 0 | 2 · 0 · 0 | 29/29 · 2/2 · 2/2 | 38/38 | 16 · 10 · 10 | 0 |
| pr127 (1문장) | 〃 | 51.6 · 17.1 · 17.8 | 284 · 72 · 72 | 0 | 1 · 0 · 0 | 2 · 1 · 1 | 19/19 · 2/2 · 2/2 | 30/30 | 16 · 10 · 10 | 0 |
| pr080 (20문장) | 〃 | 113.1 · 49.8 · 50.0 | 569 · 81 · 81 | 0 | 1 · 0 · 0 | 0 | 59/59 · 2/2 · 2/2 | 68/68 | 16 · 10 · 10 | 0 |
| **합 21기록** | | | **3,822** | **0** | **7** | **14** | **261/261** | **894/894** | **252/252** | **0** |

- **새 이해 문제 채점**: 정답 보기를 고르면 '맞음' 49/49 (데스크톱 7쪽 × 3번 + 휴대폰 14기록 × 2번), 틀린 보기는 '틀림' 7/7. 모든 쪽에 문제 파일이 있음(512/512, 문제 2개씩).
- **BLOCKED 7** = 데스크톱마다 1개, '실제 마이크 인식'(headless 에 마이크 없음 — 실기기 몫). 화면 배선은 가짜 인식기로 '100점' PASS.
- **NA 14** = G01 '읽기 시작 뒤 첫 줄 y ≤ 120' — 데스크톱(900px 높이)은 모든 표본 쪽이 너무 짧아 그만큼 못 올림(그래서 데스크톱에서는 이 항목이 사실상 안 재짐 — 휴대폰에서만 잼), pr127 은 휴대폰도.
- 작은 휴대폰(small 360×780)은 휴대폰과 같은 '터치' 경로로 돌고 결과도 같음(한국어 줄은 640px 미만이라 문장 아래 줄 `[data-ko-line]`).

**쪽당 초(화면마다)**: 표본 평균 desktop 76.1 · mobile 27.6 · small 27.8 (min 51.6/17.1/17.8 · max 113.1/49.8/50.0).
문장 수로 맞춘 직선(1문장 pr127 ↔ 20문장 pr080): desktop ≈ 48.4 + 3.24×문장, 휴대폰 ≈ 15.4 + 1.72×문장(시간의 대부분은 '읽기 재기'의 실제 기다림 = 낱말×0.12초+1초).
READING 512쪽 평균 5.77문장 → **desktop ≈ 67초 · mobile ≈ 25초 · small ≈ 25초, 쪽당 3화면 ≈ 117초**(표본 평균으로는 132초).
프로세스 하나 시작(사본 복사 · 브라우저) ≈ 1~2분.

## 2) 깨기 증명 (pr001 · 3화면 · 실제 실행 그대로 — 위 명령 + `--break <모드>`, 기록 `reading-rc1002probe-break-<모드>.jsonl`)

| 명령(`--break`) | 깨진 결과 (desktop · mobile · small FAIL 수 / exit) | 되돌린 결과 (깨기 없이 같은 명령) |
|---|---|---|
| `gate` 재기 없이 완료 누름 | 7 · 5 · 5 (complete · engine · bookmark) / **exit 1** | 0 · 0 · 0 / exit 0 |
| `cloze` round 1 빈칸으로 판정 | 15 · 9 · 9 (blanks · engine) / **exit 1** | 0 · 0 · 0 / exit 0 |
| `hover` 마우스 올림에 변화 기대 | 1 · 0 · 0 (step1 hover) / **exit 1** — 휴대폰에는 마우스 올림이 없어 원래 데스크톱만 봄 | 0 · 0 · 0 / exit 0 |
| `stop` 두 번째 누름 대신 마우스만 올림 | 41 · 4 · 4 (step1 · step2 · step3 · player) / **exit 1** | 0 · 0 · 0 / exit 0 |
| `untimed` 1단계 '다 읽었어요' 뒤 몰래 재기 | 5 · 5 · 5 (step1 · complete · step4 · wpm) / **exit 1** | 0 · 0 · 0 / exit 0 |
| `text` (새) 기대 글 하나 틀리게 | 1 · 1 · 1 — '화면 글 기대 38 / 있음 37 / **없음 1**' / **exit 1** | 38/38 · 0 FAIL / exit 0 |
| `answer` (새) 정답 자리에 틀린 보기 | 6 · 4 · 4 (questions · engine — '정답 보기가 맞음' 검사가 wrong 을 봄) / **exit 1** | 이해 문제 252/252 PASS / exit 0 |

되돌린 결과 = 1)의 표본 실행(같은 명령, 깨기 없음) — pr001 세 화면 FAIL 0, exit 0.

## 3) build-coverage.cjs 가 drive-reading 기록을 셀 수 있나 (읽기만 · 결과는 스크래치에 `--out-dir`)

| 대조 | 결과 |
|---|---|
| `course` | 'reading' — COURSE_TABLE 에 있음 ✔ |
| 강의 id | `url` 끝 조각 = `https://…/reading/<id>` ✔ |
| 화면 이름 `small` | `--screens desktop,mobile,small` 로 셈 ✔ — small 기록을 뺀 사본 → 7강 모두 '화면 3종 중 일부만 기록됨' BLOCKED (`--screens` 없이도 같음) |
| 판정 칸 | `checks[].status` PASS/FAIL/BLOCKED/NA · `problems` 는 FAIL 로 셈 ✔ — 깨기 text 기록을 넣은 셈: pr001 FAIL |
| NA | G01 NA 를 `absent` 로 적게 고친 뒤 '그 자리에 없음(다른 자리 PASS) 14' ✔. 고치기 전 꼴(맨 NA)로 지운 사본 → '안 덮임 14', 6강 BLOCKED 'wpm · NA 인데 대신 본 기록 없음' (그래서 드라이버를 고침) |
| `driverRev` | 이제 적힘(rd-0928-q1004). build-coverage 는 driverRev 를 LISTENING · STUDENT 타일 규칙 · GRAMMAR 옛 이름에만 씀 — READING 판정에는 영향 없음 ✔ |
| 소리 | drive-reading 의 `audio[]` 에는 `status` 칸이 없어 build-coverage.cjs:250 `if (a.status !== "FAIL") continue;` 은 하나도 세지 않음 — 다만 소리 실패는 모두 같은 기록의 check FAIL(playProbe)로도 남아 강의 FAIL 이 됨 → 고칠 것 없음 |

**지금 그대로 세면**(실제 기록 21개): READING 7강 전부 **BLOCKED** — 'step3 · BLOCKED (real microphone)'. 마이크 줄만 지운 사본으로 세면 **7 PASS**.
→ 전 쪽 스윕을 그대로 세면 512강이 모두 BLOCKED 로 나와 PASS 가 0 이 된다(FAIL 은 먼저 잡히므로 FAIL 은 보임).

### build-coverage 에 필요한 고침 (다른 일꾼 몫 — 줄은 2026-10-04 15:4x 현재 파일 기준 — 다른 일꾼이 고치는 중이라 줄이 움직이면 따옴표 안 글로 찾을 것)

1. **마이크 BLOCKED 를 강의 BLOCKED 에서 빼고 따로 셈** — `build-coverage.cjs:115` (`const TOOL_ARTIFACTS = [` :106 의 끝 `];`) 뒤에
   `const DEVICE_ONLY = [{ courses: ["reading"], feature: "step3", item: /^mic$/, note: /real microphone/, why: "실제 마이크 인식 — headless 불가, 단계 3 · 실제 휴대폰 몫" }];`
   를 두고, `build-coverage.cjs:242` `} else if (c.status === "BLOCKED") {` 안 첫 줄에
   `const dev = DEVICE_ONLY.find((d) => d.courses.includes(course) && d.feature === c.feature && d.item.test(String(c.item || "")) && d.note.test(String(c.note || ""))); if (dev) { deviceOnly[dev.why] = (deviceOnly[dev.why] || 0) + 1; continue; }`
   그리고 표 아래(md · coverage.json)에 '실기기 몫: … N기록' 한 줄. 증명용 `--break=device-only-blocks`(옛 동작) 를 BREAK 목록(:41)에 더하면 prove-coverage-rules 와 같은 방식으로 깨기 가능.
   (이 줄을 지운 사본으로 7 BLOCKED → 7 PASS 확인함.)
2. **깨기 기록을 세지 않음** — `build-coverage.cjs:189` `let r; try { r = JSON.parse(line); } catch { continue; }` 다음에
   `if (r.break) { counted.breakRecords = (counted.breakRecords || 0) + 1; continue; }` (+ :181 `const counted = {` 에 breakRecords: 0).
   drive-reading 깨기 기록은 같은 out/features 에 `reading<suffix>-break-<모드>.jsonl` 로, `course: "reading"` · `break: "<모드>"` 를 달고 남는다.
   `--since` 로 세면 들어가고, 강의 × 화면마다 가장 늦은 기록이 이기므로 스윕 뒤에 누가 깨기를 다시 돌리면 그 강의가 FAIL 로 덮인다
   (실제 기록 + 깨기 text 기록을 함께 셈 → pr001 FAIL 확인). 고치기 전에는 **반드시 `--files` 로만** 셀 것.
3. 그 밖에는 고칠 것 없음(위 표).

같이 볼 것(build-coverage 아님): `회귀점검-1002/rc-sweep.cjs:48` READING 쪽당 초 어림 60 · 30 · 30 → 실측 ≈ 67~76 · 25~28 · 25~28 (out/rc1002/pace.json 으로 덮어도 됨),
`rc-sweep.cjs:92` 는 사본 `drv-rd-<i>` · 포트 9470+i 기본값으로 부름 — 이제 `--clone rc1002-reading-<i>of<n> --port <빈 포트>` 를 줄 수 있음(안 줘도 돎 · 지금 `%TEMP%` 에 drv-rd 사본 없음 → 새로 복사됨).

## 4) 전 쪽 스윕 (READING 512쪽 × 3화면 = 1,536기록)

`--shard i/n` 은 쪽 목록을 번갈아 나눔(idx % n) — 조각마다 쪽 수 · 문장 수가 고르게 섞인다. 조각마다 사본 · 포트 · 파일이 따로다.

```powershell
# 작업 폴더(워크트리 뿌리)에서. n 은 아래 표에서 고름 — 이 기계 브라우저 동시 6 은 다른 과정 스윕과 나눠 씀
$n = 6
New-Item -ItemType Directory -Force docs/qa-2026-09-18/out/rc1002 | Out-Null
foreach ($i in 1..$n) {
  Start-Process -WindowStyle Hidden node -ArgumentList "docs/qa-2026-09-18/scripts/drive-reading.cjs","--shard","$i/$n","--viewports","desktop,mobile,small","--suffix","-rc1002-$($i)of$n","--clone","rc1002-reading-$i","--port","$(9760+$i)" `
    -RedirectStandardOutput "docs/qa-2026-09-18/out/rc1002/reading-$($i)of$n.log" -RedirectStandardError "docs/qa-2026-09-18/out/rc1002/reading-$($i)of$n.err"
}
```

- **이어 하기**: 끊긴 조각은 같은 줄(같은 `--shard i/n` · 같은 `--suffix`)을 다시 부르면 됨 — 기본 `--resume` 이 그 파일에서 끝난 쪽×화면(`id|viewport`, visitError 없는 것)을 건너뜀.
  끊긴 순간의 쪽×화면은 기록이 안 남아 다시 돎. **n 은 도중에 바꾸지 말 것**(조각 구성이 n 에 따라 바뀜). exit 1 은 FAIL 이 있다는 뜻(멈춘 것 아님) — 다시 불러도 끝난 기록은 다시 안 돎.
- **FAIL 쪽 다시 몰기**: `--ids <id,…> --suffix -rc1002-redo` (새 파일) — 셀 때 `--files` 에 넣으면 강의×화면마다 늦은 기록이 이김.
- **셈**: `node docs/qa-2026-09-18/scripts/build-coverage.cjs --files reading-rc1002-1of6.jsonl,…,reading-rc1002-6of6.jsonl[,reading-rc1002-redo.jsonl] --screens desktop,mobile,small --out-dir <폴더>`
  (위 고침 2 가 들어가기 전에는 `--since` 쓰지 말 것 · 고침 1 이 들어가기 전에는 READING 이 전부 BLOCKED 로 나옴).
- 진행 보기: `(Get-Content docs/qa-2026-09-18/out/features/reading-rc1002-$i`+`of$n.jsonl | Measure-Object -Line).Lines` / 조각당 기록 수(= 쪽 수 × 3).

| n (동시 브라우저) | 조각당 쪽 | 걸릴 시간(쪽당 117초 ~ 132초, + 시작 2분) |
|---|---|---|
| 1 | 512 | 16.6 ~ 18.8 시간 |
| 4 | 128 | 4.2 ~ 4.7 시간 |
| 6 | 85~86 | 2.8 ~ 3.2 시간 |
| 8 | 64 | 2.1 ~ 2.4 시간 (다른 스윕과 겹치면 6 을 넘음 — 권하지 않음) |

어림은 브라우저 하나일 때 잰 값 — 여러 개가 동시에 돌면 느려질 수 있다(특히 '두 번째 누름이 소리를 멈춤' 검사는 1.4초 안을 봄).
지금(15:2x) rc-sweep 가 다른 과정을 2개씩 돌리고 있으므로 같이 돌리면 READING 은 n = 4 가 이 기계의 동시 6 에 맞다.
