export const meta = {
  name: 'learning-content-full-read',
  description: '학습 내용 전수 읽기 — 9/18 뒤 안 바뀌고 표본에도 안 든 글 전부(약 2만 줄)를 조각 10개 일꾼이 읽고, 조각마다 다른 일꾼이 확인',
  phases: [
    { title: 'Read', detail: '조각 10개: 묶음(강의)마다 T 글 전부 읽기 (add-full.cjs)' },
    { title: 'Verify', detail: '조각마다 다른 일꾼: 심각·높음·③ 전부 · 중간·낮음 20% · 판단 필요 · 묶음 3% 통째로 다시 읽기 (verify-full.cjs)' },
  ],
}

// args: { wt: "<이 세션의 작업 트리 절대 경로>" } — 없으면 '지금 작업 폴더'
const WT = (args && args.wt) || '(지금 작업 폴더)'
const D = 'docs/qa-2026-09-18/내용-재검토'
const F = `${D}/전수`

const STANDARDS = `■ 기준 — 시작 전에 고정한다. 기록 파일 맨 위에 그대로 적고 끝까지 바꾸지 마라
  - 기준 판 = 9d6e15d (9/18 감사가 본 운영 main — K-IG_Commercial_Release_Readiness_Report.md 3행).
    지금 판 = HEAD. 운영과 내용이 같아야 한다 — 시작할 때 git diff --name-only a6ff936 HEAD -- content src/lib 의 글 파일이 0 인지 확인해 적어라.
  - 틀림(고쳐야 함):
    ① 영어가 틀림 — 문법 · 낱말 · 철자 · 뜻을 바꾸는 문장부호
    ② 한국어 뜻이 영어와 다름 · 한국어 맞춤법이 틀림
    ③ 정답 · 대체 답이 문제와 안 맞음 — 맞는 답을 막거나 틀린 답을 받음
    ④ 사실이 틀림 — 날짜 · 이름 · 숫자
    ⑤ 소리 내는 글이 화면 글과 다름 · 발음이 화면에 보이는 뜻과 다름
    ⑥ 힌트 · 칩 · 제목 · 설명이 그 문장 · 강의와 안 맞음
    ⑦ 고치다 생긴 흔적 — 잘린 문장 · 겹친 낱말 · 남은 기호 · 두 문장이 붙음 · 한 강의 안에서 같은 글이 서로 다르게 고쳐짐
  - 틀림이 아님: 문체 취향 · 영국/미국 표기(한 강의 안에서 섞이지 않으면) · 원본과 다름 그 자체.
  - 판단 필요: 둘 다 말이 되는데 하나를 골라야 하는 것 · 교육 방침이 걸린 것 → 소유자 결정표로(추천안과 까닭).
  - 심각도(9/18 감사와 같은 넷): 심각 = 틀린 영어나 틀린 뜻을 가르침 · 높음 = 채점이 틀리거나 영어와 한국어가 서로 달라 학습자를 오도
    · 중간 = 헷갈리게 하지만 오도는 아님(오타 · 문장부호) · 낮음 = 띄어쓰기 · 한 강의 안 표기 흔들림.
  - 틀림마다 적을 것: 과정 · 강의 · 파일 · 칸(JSON 경로) · 고치기 전(9d6e15d) · 지금 · 왜 틀렸나 · 고칠 글 · 심각도 · 확신(높음/보통).
    보고 전에 그 강의의 화면 글(expectations)에서 학습자가 그 글을 실제로 보거나 듣는지 확인해라 — 안 닿는 칸이면 '화면에 안 닿음' 으로 따로.`

const NOTES = `1. 소유자가 이미 정한 것은 다시 따지지 않는다 — ${D}/소유자-결정-요약.md 를 맨 먼저 읽어라. 결정대로 들어갔는지는 판정한다. 결정이 분명히 틀렸다고 보이면 틀림으로 세지 말고 '판단 필요' 에 "결정과 다름: …" 으로 적는다.
2. 원본 교재와 다르다는 것만으로는 틀림이 아니다. 실제로 맞는지로 판정한다.
3. 읽을거리의 T 글은 모두 학습자가 보거나 듣거나 채점받는 글이다(화면 코드 자리로 가른 것). 이 전수 읽기의 글은 9/18 뒤 바뀌지 않은 글이라 '고치기 전(9d6e15d)' 은 '지금' 과 같다.
4. 한 글에 틀림이 둘이면 더 무거운 쪽 하나로, 까닭에 둘 다.
5. **③ 채점 심각도(9/18 감사의 매김)**: 틀린 답(틀린 영어 · 문제와 뜻이 다른 영어)을 만점으로 받음 → 높음. 흔한 맞는 번역이 대체 답안에 없어 0점 → 중간(9/18 은 이 종류 missing-alternative 를 대부분 중간으로 — 6단계 목록 GRAMMAR I 중간 74 · 낮음 35). 70점이면 낮음. 모범 답안과 대체 답안이 모두 한국어 문제의 뜻을 빠뜨려 가장 곧은 번역이 막히면 높음. 소유자가 70점으로 정한 꼴('그 N' 280곳 · 꼬리 질문만 틀린 답)은 틀림 아님. 0점인지 70점인지는 앱 채점 함수(src/lib/grammarGrading.ts gradeAgainstReferences — 스크래치 스크립트로 불러 씀, 저장소에는 쓰지 않음)로 재어 까닭에 적는다.
6. 문체 취향 · 더 나은 말이 있다는 것은 틀림이 아니다. 틀림은 ①~⑦ 에 들 때만. 애매하면 확신 '보통', 교육 방침이 걸리면 '판단 필요'.
7. '고칠 글' 은 그 칸에 그대로 넣을 글 전체. '고칠 곳' 은 파일과 칸(JSON 경로 또는 '문항 #n 한국어' · 'd010 대본 n3 ko' · 'voca_dictionary.json 의 <낱말>.meaning' 처럼 수정 세션이 찾을 수 있게). LISTENING 칩은 칩이 아니라 그 강의 dNNN.json 의 hints 줄 전체를 고칠 글로.
8. '새 음성 클립' 은 고칠 글이 소리 내는 글을 바꾸면 true: STUDENT 영어(빗금은 첫 꼴) · STUDENT 한국어 · VOCA 낱말 · VOCA 연어 phrase · GRAMMAR 영어 모범 문항 · LISTENING 대본 영어 · READING 문장 영어 · READING 카드 낱말(발음 표 철자는 카드 뜻이 소리를 고르므로 그 카드 뜻도). 그 밖(LISTENING · READING · GRAMMAR 한국어 · VOCA 뜻 · 대체 답안 · 제목 · 힌트)은 false.
9. 같은 틀림이 여러 T 에 되풀이되면(예: 한 강의의 '할 수 있다' 띄어쓰기) T 마다 적는다 — 수정 세션이 칸마다 고친다.`

const RULES = `- 작업 폴더(작업 트리)는 ${WT} — 모든 상대 경로는 여기 기준. 셸은 PowerShell(Windows). 한글 파일은 Read 도구가 낫다(셸이면 Get-Content -Encoding UTF8).
- content/ · src/ · scripts/ 의 파일과 음성 클립을 절대 바꾸지 마라. 옆 세션이 최종 출시 관문을 돌리며 작업 트리의 내용 파일로 '화면에 나와야 할 글' 을 계산한다.
- 네가 쓰는 곳은 ${F}/work/ 의 네 배치 초안과, 도우미 스크립트가 쓰는 네 판정 · 기록 파일뿐이다(판정 파일은 도우미로만). 스크래치 스크립트는 저장소 밖(임시 폴더)에.
- 브라우저를 열지 마라. git 을 부르지 마라. /api/ 를 부르지 마라. .env.local 값을 출력하지 마라.
- CNN · GVA · basics · middle 은 보지 않는다. 법률 문서 · 결제 · 저작권은 판정 대상이 아니고 적지도 않는다.
- 원본 교재(C:\\Users\\ghddl\\Desktop\\랩자료모음 — 읽기 전용)는 옮기다 깨진 글을 의심할 때만. 원본이 정답은 아니다.`

const GUIDE = {
  student: `STUDENT(초등 회화): 영어 문장(문법 · 낱말 · 철자 · 문장부호) · 한국어 해석(차례로 문장과 짝)이 영어와 같은 뜻인가 · 한국어 맞춤법 · 띄어쓰기 · 선생님 '그분' · 한 강의 안 '나/저' · 빗금 두 꼴이 둘 다 맞는가 · 괄호는 빈칸 자리표시자 · 번호 · 제목. 한국어도 소리 내므로 한국어를 고치면 새 음성 클립 true.`,
  voca: `VOCA(단어): 뜻이 그 낱말의 뜻으로 맞는가(주된 뜻 · 품사 · 한국어 맞춤법) · 같은 강의 안 다른 낱말과 뜻이 같은데 뜻 조각(; , / ·)이 하나도 안 겹치면 퀴즈가 맞는 답을 오답으로 낼 수 있음(③ — 강의 낱말 목록으로 확인) · 격자 낱말 철자 · 연어 카드(영어 구 · 번역 · 예문 · 예문 번역) · 어원 카드 풀이가 맞는가. 소리 꼴(IPA 꼬리)이 있으면 그 뜻의 발음인가.`,
  grammar: `GRAMMAR(영작): 한국어 문제와 영어 모범 답안이 같은 뜻인가 · 영어 문법 · 대체 답안마다 문법이 맞고 한국어 문제의 뜻을 옮겼나(뜻이 다른 영어를 만점으로 받으면 ③ 높음) · 흔한 맞는 번역이 막혀 0점이면 ③ 중간(기준 풀이 5 — 채점 함수로 재어 적음) · 번호 · 한국어 맞춤법 · 띄어쓰기 · 문제의 '(3가지로)' 같은 안내가 답 수와 맞나. 결정 2 · 3 · 4 · 5 · 19 는 따지지 않는다.`,
  ld: `LISTENING(받아쓰기): 영어 대본은 녹음을 받아 적은 것 — 녹음과 다르게 고치자는 제안에는 그 까닭(새 음성과 녹음이 달라짐)을 적는다. 영어 문법 · 철자 · 문장부호 · 한국어 해석이 영어와 같은 뜻인가 · 한국어 맞춤법 · 띄어쓰기 · 사실(날짜 · 이름 · 숫자).
힌트 칩(⑥): 묶음 머리의 '칩 도구 후보' 를 먼저 보고, 칩마다 그 문장의 이름 · 수 · 어려운 낱말을 제대로 보여 주는가 — 한 항목이 둘로 쪼개짐('Mrs' · 'Watson'), 두 항목이 하나로 붙음('Wisconsin 1937'), 철자 다름, 문장에 없는 꼴. 칩 틀림의 고칠 글은 그 강의 dNNN.json hints 줄 전체(항목 사이 경계는 ". " — 약어 'Mrs.' 뒤의 마침표가 경계로 읽히지 않게 쓰는 방법까지).`,
  reading: `READING(독해): 영어 지문 문장(문법 · 철자 · 사실) · 한국어 해석이 영어와 같은 뜻인가 · 한국어 맞춤법 · 띄어쓰기 · 카드 14장: 낱말이 지문에 그 꼴로 나오는가 · 품사 · 기본형 · 뜻이 그 지문에서의 뜻인가 · 카드 소리(IPA 꼬리)가 카드 뜻 · 품사에 맞는가.`,
}
const CHUNKS = (args && args.chunks) || [
  { chunk: 'voca-a', course: 'VOCA', desc: 'VOCA 강의 차례 앞 절반(읽을 글 수로)', guide: GUIDE.voca },
  { chunk: 'voca-b', course: 'VOCA', desc: 'VOCA 강의 차례 뒤 절반(읽을 글 수로)', guide: GUIDE.voca },
  { chunk: 'reading-b', course: 'READING', desc: 'READING pr129 ~ pr256', guide: GUIDE.reading },
  { chunk: 'reading-a', course: 'READING', desc: 'READING pr001 ~ pr128', guide: GUIDE.reading },
  { chunk: 'ld-b', course: 'LISTENING', desc: 'LISTENING d139 ~ d276', guide: GUIDE.ld },
  { chunk: 'ld-a', course: 'LISTENING', desc: 'LISTENING d001 ~ d138', guide: GUIDE.ld },
  { chunk: 'grammar1-b', course: 'GRAMMAR I', desc: 'GRAMMAR I gh1-064 ~ gh1-123', guide: GUIDE.grammar },
  { chunk: 'grammar1-a', course: 'GRAMMAR I', desc: 'GRAMMAR I gh1-006 ~ gh1-063', guide: GUIDE.grammar },
  { chunk: 'grammar2', course: 'GRAMMAR II', desc: 'GRAMMAR II 전부', guide: GUIDE.grammar },
  { chunk: 'student', course: 'STUDENT', desc: 'STUDENT 전부', guide: GUIDE.student },
]
for (const c of CHUNKS) if (!c.guide) c.guide = GUIDE[c.chunk.replace(/-[ab]$/, '').replace(/^grammar\d?$/, 'grammar').replace(/^grammar1$/, 'grammar')] || ''

const READ_SCHEMA = {
  type: 'object',
  properties: {
    chunk: { type: 'string' }, groups_done: { type: 'integer' }, groups_total: { type: 'integer' }, texts_read: { type: 'integer' },
    wrong_severe: { type: 'integer' }, wrong_high: { type: 'integer' }, wrong_mid: { type: 'integer' }, wrong_low: { type: 'integer' },
    needs_decision: { type: 'integer' }, status_exit0: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['chunk', 'groups_done', 'groups_total', 'status_exit0', 'notes'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    chunk: { type: 'string' }, targets: { type: 'integer' }, done: { type: 'integer' }, agree: { type: 'integer' }, fixed_agree: { type: 'integer' },
    overturned: { type: 'integer' }, reread_groups: { type: 'integer' }, reread_missed: { type: 'integer' }, status_exit0: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['chunk', 'targets', 'done', 'status_exit0', 'notes'],
}

function readPrompt(c) {
  const H = `node ${D}/scripts/add-full.cjs ${c.chunk}`
  return `너는 K-IG CORE(한국인 대상 영어 학습 사이트) '학습 내용 전수 읽기' 의 일꾼이다(소유자 결정 2026-09-24 "1번2번다 할거야"). 네 조각: ${c.chunk} — ${c.desc}.
9/18 감사 뒤 바뀌지 않았고 표본에도 안 든, 학습자가 보고 듣는 글을 묶음(강의)마다 T 번호로 전부 한 줄씩 읽고 기준 ①~⑦ 의 틀림을 찾는다. 읽고 판정만 한다 — 고치지 않는다.

## 지킬 것
${RULES}

## 기준 (명령서 PROMPT-내용-재검토.md 그대로 — 바꾸지 마라)
${STANDARDS}

## 기준 풀이 (전수 읽기 — 모든 일꾼이 같게)
${NOTES}

## ${c.course} 에서 볼 것
${c.guide}

## 방법
1. 먼저: ${D}/소유자-결정-요약.md · ${D}/scripts/add-full.cjs 맨 위 주석(배치 형식) · \`${H} --status\`(이미 적은 묶음이 있으면 남은 파일부터).
2. ${F}/읽을거리/${c.chunk}/01.md, 02.md … 를 차례로. 파일 하나를 Read 로 통째로(길면 나눠 끝까지) 읽고, 묶음마다 T 글을 전부 한 줄씩 읽는다.
   번호 없는 줄 — (1부에서 판정) · (표본에서 읽음) · (앞 강의 … 에서) — 은 문맥이다(그 글은 이미 다른 곳에서 봄). 〔1부 문맥에서 이미 적음〕 이 붙은 T 는 다시 적지 않는다.
3. 파일 하나를 끝내면 그 파일의 **모든 묶음**을 배치 JSON 에 넣어(틀림이 없으면 "틀림": []) ${F}/work/${c.chunk}-batch.json 에 Write 하고 \`${H} ${F}/work/${c.chunk}-batch.json\`. 형식 오류면 고쳐서 다시.
4. 틀림을 적기 전: 소유자 결정 사항이 아닌지 · 고칠 글이 새 틀림을 만들지 않는지 · (GRAMMAR ③) 채점 함수로 몇 점인지.
5. 기억이 압축되면 ${F}/기록-${c.chunk}.md 와 \`${H} --status\` 부터 다시. 이미 적은 묶음은 다시 적지 않는다.
6. 끝: \`${H} --status\` 가 exit 0 인지 확인하고, ${F}/기록-${c.chunk}.md 끝에 '- 끝: 묶음 N · 글 N · 틀림 N(심각 · 높음 · 중간 · 낮음) · 판단 필요 N' 과 판정하며 정한 규칙을 적는다(Edit 로 끝에 더함).
7. 돌려줄 것: StructuredOutput — 숫자는 --status 와 판정 파일에서 센 값. notes 에 크게 걸린 것 한두 줄.`
}
function verifyPrompt(c) {
  const V = `node ${D}/scripts/verify-full.cjs ${c.chunk}`
  return `너는 K-IG CORE '학습 내용 전수 읽기' 의 확인 일꾼이다. 조각 ${c.chunk}(${c.desc})을 읽은 일꾼과 다른 일꾼이다 — 그 판정을 믿지 말고 스스로 다시 본다. 목적: 수정 세션이 고칠 표에 정말 틀린 것만 오르게 하고, 읽은 일꾼이 놓친 비율을 재는 것.

## 지킬 것
${RULES}

## 기준 (명령서 그대로)
${STANDARDS}

## 기준 풀이
${NOTES}

## ${c.course} 에서 볼 것
${c.guide}

## 방법
1. ${D}/소유자-결정-요약.md 를 읽고 \`${V} --pick\` — 대상: 심각 · 높음 · ③ 전부(F:) · 중간 · 낮음 20%(F:) · 판단 필요 전부(D:) · 묶음 3%(최소 2) 통째로 다시 읽기(G:). 대상마다 주장 · 읽을거리 파일이 ${F}/판정-${c.chunk}-확인.json "대상" 에.
2. F: · D: — 그 묶음을 읽을거리에서 찾아(Grep '▣ <묶음>') T 글과 앞뒤를 읽고: 정말 틀렸나(①~⑦ — 문체 취향이면 아님) · 학습자에게 닿나 · 심각도가 기준 · 풀이 5 대로인가 · 고칠 글이 맞고 새 틀림을 안 만드나 · 결정 사항은 아닌가.
   결론 "동의" · "고쳐 동의"(바꾼 심각도 · 고칠 글) · "뒤집음"(까닭). "닿음": true/false. 판단 필요는 정말 골라야 하면 동의, 한쪽이 분명하면 뒤집음(까닭에 어느 쪽인지).
3. G: — 그 묶음의 T 글을 처음 보는 것처럼 **전부** 읽고 네가 찾은 틀림을 모두 적는다: {"key": "G:<묶음>", "결론": "다시 읽음", "읽은 글": <T 수>, "틀림": [{"T","종류","심각도","확신","까닭","지금","고칠 글","고칠 곳","새 음성 클립"}], "까닭": "…"}. 읽은 일꾼의 판정은 보지 마라(판정 파일의 그 묶음을 먼저 열지 않는다).
4. 결과를 ${F}/work/${c.chunk}-check.json 에 {"결과": [...], "메모": "…"} 로 Write 하고 \`${V} ${F}/work/${c.chunk}-check.json\`. 여러 번에 나눠도 됨. --status 가 exit 0 이 될 때까지. 압축되면 ${F}/기록-${c.chunk}-확인.md 와 --status 부터.
5. 돌려줄 것: StructuredOutput — 대상 · 적음 · 동의 · 고쳐 동의 · 뒤집음 · 다시 읽은 묶음 수 · 그중 읽은 일꾼이 놓친 틀림 수(네가 찾았는데 읽은 일꾼 판정에 그 T 가 없는 것 — 끝나고 나서 판정 파일과 견줘 셈).`
}

phase('Read')
const results = await pipeline(
  CHUNKS,
  (c) => agent(readPrompt(c), { label: `read:${c.chunk}`, phase: 'Read', schema: READ_SCHEMA }),
  (r, c) => {
    if (!r || !r.status_exit0) { log(`${c.chunk}: 읽기가 끝나지 않아 확인을 건너뜀 (${r ? r.groups_done + '/' + r.groups_total : '일꾼 없음'})`); return { chunk: c.chunk, read: r, verify: null, skipped: true } }
    return agent(verifyPrompt(c), { label: `verify:${c.chunk}`, phase: 'Verify', schema: VERIFY_SCHEMA }).then((v) => ({ chunk: c.chunk, read: r, verify: v }))
  },
)
return results
