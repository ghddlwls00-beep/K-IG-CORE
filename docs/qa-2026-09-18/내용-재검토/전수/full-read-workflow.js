export const meta = {
  name: 'learning-content-full-read',
  description: '학습 내용 전수 읽기 — 9/18 뒤 안 바뀌고 표본에도 안 든 글 전부(약 2만 줄)를 조각 10개 · 읽기 일꾼 30(파일 단위로 나눔)이 읽고, 조각마다 다른 일꾼이 확인',
  phases: [
    { title: 'Read', detail: '읽기 일꾼 30: 조각 10의 읽을거리 파일을 약 35분 몫씩 나눠 묶음(강의)마다 T 글 전부 읽기 (add-lock.cjs → add-full.cjs)' },
    { title: 'Verify', detail: '조각마다 다른 일꾼: 심각·높음·③ 전부 · 중간·낮음 20% · 판단 필요 · 묶음 3% 통째로 다시 읽기 (verify-full.cjs)' },
  ],
}

// args: { wt: "<이 세션의 작업 트리 절대 경로>", sp: "<저장소 밖 스크래치패드 — grade.cjs · chips.cjs 가 있는 곳>" } — 없으면 '지금 작업 폴더'
const WT = (args && args.wt) || '(지금 작업 폴더)'
const SP = (args && args.sp) || '(스크래치패드)'
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
9. 같은 틀림이 여러 T 에 되풀이되면(예: 한 강의의 '할 수 있다' 띄어쓰기) T 마다 적는다 — 수정 세션이 칸마다 고친다.
10. **원본 그대로(소유자 기준 — 2026-09-24 s11-1 '변경하지 말고' · s9-1 '그대로해' · 결정표 6)**: 되살린 원본의 글이 그 책의 시대 · 배경에서는 맞는 사실이면(학교 시간표 · 토요일 수업 · 그때의 값 같은 것) 틀림이 아니다. 배치의 그 묶음 "원본 그대로": [{"T": "T05", "까닭": "…"}] 에 따로 적는다(고치지 않음). 영어 · 정답 · 번역 · 맞춤법 잘못, 그때도 틀린 사실(역사 날짜 · 이름 · 숫자 오류)은 그대로 틀림.
11. 내용 재검토 결과의 '소유자 답'(${D}/결과-머리.md '소유자 답' 표 1 ~ 5 — 2026-09-24 18:1x · 18:2x)도 다시 따지지 않는다. 특히 4 — 결정 3('그것' → that 도 만점)을 **문법 II 전체**에 수정 세션이 목록을 만들어 넣는다: 문법 II 에서 한국어 '그것' · 영어 it 문항에 that 꼴이 없어 막히는 것은 틀림으로 적지 않는다(그 밖의 막힌 답은 적는다).`

const RULES = `- 작업 폴더(작업 트리)는 ${WT} — 모든 상대 경로는 여기 기준. 셸은 PowerShell(Windows). 한글 파일은 Read 도구가 낫다(셸이면 Get-Content -Encoding UTF8).
- content/ · src/ · scripts/ 의 파일과 음성 클립을 절대 바꾸지 마라. 옆 세션이 최종 출시 관문을 돌리며 작업 트리의 내용 파일로 '화면에 나와야 할 글' 을 계산한다.
- 네가 쓰는 곳은 ${F}/work/ 의 네 배치 초안과, 도우미 스크립트가 쓰는 네 판정 · 기록 파일뿐이다(판정 파일은 도우미로만). 스크래치 스크립트 · 도구 입력 파일은 저장소 밖 ${SP}/cases/<네 조각>/ 에.
- 브라우저를 열지 마라. git 을 부르지 마라. /api/ 를 부르지 마라. .env.local 값을 출력하지 마라.
- CNN · GVA · basics · middle 은 보지 않는다. 법률 문서 · 결제 · 저작권은 판정 대상이 아니고 적지도 않는다.
- 원본 교재(C:\\Users\\ghddl\\Desktop\\랩자료모음 — 읽기 전용)는 옮기다 깨진 글을 의심할 때만. 원본이 정답은 아니다.`

const GUIDE = {
  student: `STUDENT(초등 회화): 영어 문장(문법 · 낱말 · 철자 · 문장부호) · 한국어 해석(차례로 문장과 짝)이 영어와 같은 뜻인가 · 한국어 맞춤법 · 띄어쓰기 · 선생님 '그분' · 한 강의 안 '나/저' · 빗금 두 꼴이 둘 다 맞는가 · 괄호는 빈칸 자리표시자 · 번호 · 제목. 한국어도 소리 내므로 한국어를 고치면 새 음성 클립 true.`,
  voca: `VOCA(단어): 뜻이 그 낱말의 뜻으로 맞는가(주된 뜻 · 품사 · 한국어 맞춤법) · 같은 강의 안 다른 낱말과 뜻이 같은데 뜻 조각(; , / ·)이 하나도 안 겹치면 퀴즈가 맞는 답을 오답으로 낼 수 있음(③ — 강의 낱말 목록으로 확인) · 격자 낱말 철자 · 연어 카드(영어 구 · 번역 · 예문 · 예문 번역) · 어원 카드 풀이가 맞는가. 소리 꼴(IPA 꼬리)이 있으면 그 뜻의 발음인가.`,
  grammar: `GRAMMAR(영작): 한국어 문제와 영어 모범 답안이 같은 뜻인가 · 영어 문법 · 대체 답안마다 문법이 맞고 한국어 문제의 뜻을 옮겼나(뜻이 다른 영어를 만점으로 받으면 ③ 높음) · 흔한 맞는 번역이 막혀 0점이면 ③ 중간(기준 풀이 5 — 채점 함수로 재어 적음) · 번호 · 한국어 맞춤법 · 띄어쓰기 · 문제의 '(3가지로)' 같은 안내가 답 수와 맞나. 결정 2 · 3 · 4 · 5 · 19 는 따지지 않는다.
채점 재기는 모든 GRAMMAR 일꾼이 한 도구로(풀이 5): ${SP}/cases/<네 조각>/g-NN.json 에 [{"묶음": "grammar1/gh1-064", "번호": "<읽을거리의 [번호 N] 그대로>", "답": ["재 볼 영어", "…"]}] 를 Write 하고 \`node ${SP}/grade.cjs <그 파일>\`.
앱과 같은 참조(정답 + 다른 정답, 앱의 cleanText 뒤)로 만점 · 70점 · 0점을 찍는다. 첫 줄 '도구 확인 ✔' 과 문항마다 '찾기 확인: 정답 자체 → 만점 ✔' 이 나온 결과만 까닭에 적는다(예: "grade.cjs: 'X' → 0점").
번호가 두 쪽에 있으면 둘 다 찍히니 KO 가 그 문항인 줄을 본다. 참조를 직접 줄 때는 {"참조": ["정답", "다른 정답", …], "답": [...]}.`,
  ld: `LISTENING(받아쓰기): 영어 대본은 녹음을 받아 적은 것 — 녹음과 다르게 고치자는 제안에는 그 까닭(새 음성과 녹음이 달라짐)을 적는다. 영어 문법 · 철자 · 문장부호 · 한국어 해석이 영어와 같은 뜻인가 · 한국어 맞춤법 · 띄어쓰기 · 사실(날짜 · 이름 · 숫자).
힌트 칩(⑥): 묶음 머리의 '칩 도구 후보' 를 먼저 보고, 칩마다 그 문장의 이름 · 수 · 어려운 낱말을 제대로 보여 주는가 — 한 항목이 둘로 쪼개짐('Mrs' · 'Watson'), 두 항목이 하나로 붙음('Wisconsin 1937'), 철자 다름, 문장에 없는 꼴. 칩 틀림의 고칠 글은 그 강의 dNNN.json hints 줄 전체(항목 사이 경계는 ". " — 약어 'Mrs.' 뒤의 마침표가 경계로 읽히지 않게 쓰는 방법까지).
고칠 힌트 줄은 적기 전에 재어 본다: 그 줄 하나를 ${SP}/cases/<네 조각>/dNNN.txt 에 Write 하고 \`node ${SP}/chips.cjs dNNN <그 파일>\` — 앱과 같은 규칙으로 문장마다 '지금 칩 → 고친 뒤 칩'(달라진 문장 ◆).
고친 뒤 칩에 새 틀림(쪼개짐 · 붙음 · 없는 꼴 · 다른 문장에 번진 칩)이 없을 때만 적는다. \`node ${SP}/chips.cjs dNNN\` 만 치면 지금 힌트 줄 · 청크 · 문장마다 칩.
칩 틀림 적는 법 — 내용 재검토 결과 표와 같게(두 표를 수정 세션이 한 번에 고친다):
㉠ 칭호 약어(Mr. · Mrs. · Ms. · Dr. · St. 따위)나 한 글자 머리글자(N. · D.C.) 뒤의 '. ' 에서 칩이 쪼개지는 것은 내용 재검토 표 #15 의 **코드 고침 한 곳**(src/components/LdLearningView.tsx hintChunks — 그 뒤에서는 안 나눔)이 과정 전체를 같이 고친다. 그 쪼개짐만 있으면 '고칠 곳' = "src/components/LdLearningView.tsx hintChunks 코드 고침(내용 재검토 표 #15) — 힌트 글 그대로", '고칠 글' = "(힌트 줄 그대로 — 코드 고침 뒤 [Mrs. Watson] 한 칩)" 처럼. 힌트 줄을 'Mrs Watson' 처럼 고쳐 피하지 마라.
㉡ 붙음 · 철자 · 대본에 없는 꼴 같은 다른 칩 틀림이 있으면 그 줄 전체를 고칠 글로(칭호 · 머리글자 뒤 '. ' 는 그대로 둔다 — 코드 고침 몫. chips.cjs 는 지금 규칙으로 나누므로 그 쪼개짐은 거기서 계속 보이지만 새 틀림으로 보지 않는다). ㉠ 도 함께 있으면 까닭에 같이 적는다.
㉢ 힌트 줄은 강의마다 한 칸이므로 한 강의의 칩 틀림은 **줄 하나에 한 번**(풀이 9 의 '칸마다' = 이 한 칸): 그 줄의 틀림이 처음 보이는 칩 T 에 적고, 까닭에 같은 틀림이 보이는 다른 칩 T(nN)를 모두 적는다.`,
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
// 읽기 일꾼 나누기 — 파일(읽을거리 NN.md) 단위(2026-09-24 18:1x, 소유자 "더 빠르게"). 조각(판정 · 기록 · 확인 · 합치기)은 10 그대로.
// 조각 열 개를 일꾼 열로 읽으면 듣기(1부 실측 8.4줄/분 — 칩 · 띄어쓰기 틀림이 많아 가장 느림) 두 조각이 4시간 가까이 혼자 돌고 나머지 자리는 논다.
// 그래서 한 일꾼 몫을 약 35분 이하로. [파일들, 어림 분] — 어림 = 그 파일들의 읽을 글 ÷ 1부 실측 속도(줄/분: 듣기 8.4 · 단어 35 · 문법 43 · 초등 29 · 읽기 52 = 1부 105 의 반).
const SPLIT = {
  'ld-a': [[['01'], 34], [['02'], 33], [['03'], 28], [['04'], 26], [['05'], 27], [['06'], 24], [['07'], 33], [['08'], 26], [['09'], 28]],
  'ld-b': [[['01'], 31], [['02'], 25], [['03'], 29], [['04'], 31], [['05'], 28], [['06'], 25], [['07', '08'], 35]],
  'voca-a': [[['01'], 33], [['02'], 34], [['03'], 30]],
  'voca-b': [[['01'], 36], [['02'], 24], [['03', '04', '05', '06', '07'], 34]],
  'reading-a': [[['01', '02', '03'], 25], [['04', '05', '06', '07'], 30]],
  'reading-b': [[['01', '02', '03'], 24], [['04', '05', '06', '07'], 29]],
  'grammar1-a': [[['01', '02', '03', '04'], 29]],
  'grammar1-b': [[['01', '02', '03', '04'], 23]],
  'grammar2': [[['01', '02', '03', '04'], 26]],
  'student': [[['01', '02', '03'], 20]],
}
const SUBS = []
for (const c of CHUNKS) {
  const parts = SPLIT[c.chunk]
  const all = parts.flatMap(([files]) => files.map((f) => `${f}.md`))
  parts.forEach(([files, est], i) => SUBS.push({ ...c, id: parts.length > 1 ? `${c.chunk}#${i + 1}` : c.chunk, sid: parts.length > 1 ? `${c.chunk}-${i + 1}` : c.chunk, files: files.map((f) => `${f}.md`), all, est }))
}

const READ_SCHEMA = {
  type: 'object',
  properties: {
    sub: { type: 'string' }, chunk: { type: 'string' }, files: { type: 'string' }, groups_done: { type: 'integer' }, groups_total: { type: 'integer' }, texts_read: { type: 'integer' },
    wrong_severe: { type: 'integer' }, wrong_high: { type: 'integer' }, wrong_mid: { type: 'integer' }, wrong_low: { type: 'integer' },
    needs_decision: { type: 'integer' }, kept_original: { type: 'integer' }, my_files_done: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['sub', 'groups_done', 'groups_total', 'my_files_done', 'notes'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    chunk: { type: 'string' }, targets: { type: 'integer' }, done: { type: 'integer' }, agree: { type: 'integer' }, fixed_agree: { type: 'integer' },
    overturned: { type: 'integer' }, reread_groups: { type: 'integer' }, reread_missed: { type: 'integer' }, kept_checked: { type: 'integer' }, kept_disagree: { type: 'integer' },
    status_exit0: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['chunk', 'targets', 'done', 'status_exit0', 'notes'],
}

function readPrompt(s) {
  const H = `node ${D}/scripts/add-full.cjs ${s.chunk}`
  const A = `node ${SP}/add-lock.cjs ${s.chunk}`
  const solo = s.files.length === s.all.length
  const others = s.all.filter((f) => !s.files.includes(f))
  return `너는 K-IG CORE(한국인 대상 영어 학습 사이트) '학습 내용 전수 읽기' 의 일꾼이다(소유자 결정 2026-09-24 "1번2번다 할거야"). 네 몫: 조각 ${s.chunk}(${s.desc})의 읽을거리 파일 **${s.files.join(' · ')}**${solo ? ' — 이 조각 전부.' : ` — 이 조각의 다른 파일(${others.join(' · ')})은 다른 일꾼이 같은 때 읽는다. **네 파일만** 읽고 적어라.`}
9/18 감사 뒤 바뀌지 않았고 표본에도 안 든, 학습자가 보고 듣는 글을 묶음(강의)마다 T 번호로 전부 한 줄씩 읽고 기준 ①~⑦ 의 틀림을 찾는다. 읽고 판정만 한다 — 고치지 않는다.

## 지킬 것
${RULES}

## 기준 (명령서 PROMPT-내용-재검토.md 그대로 — 바꾸지 마라)
${STANDARDS}

## 기준 풀이 (전수 읽기 — 모든 일꾼이 같게)
${NOTES}

## ${s.course} 에서 볼 것
${s.guide}

## 방법
1. 먼저: ${D}/소유자-결정-요약.md · ${D}/결과-머리.md 의 '소유자 답' 표 · ${D}/scripts/add-full.cjs 맨 위 주석(배치 형식 — "원본 그대로" 칸까지) · \`${H} --status\`(**네 파일 줄만** 본다 — 이미 적은 묶음이 있으면 남은 것부터).
2. ${F}/읽을거리/${s.chunk}/ 의 네 파일을 차례로. 파일 하나를 Read 로 통째로(길면 나눠 끝까지) 읽고, 묶음마다 T 글을 전부 한 줄씩 읽는다.
   번호 없는 줄 — (1부에서 판정) · (표본에서 읽음) · (앞 강의 … 에서) — 은 문맥이다(그 글은 이미 다른 곳에서 봄). 〔1부 문맥에서 이미 적음〕 이 붙은 T 는 다시 적지 않는다.
3. 파일 하나를 끝내면 그 파일의 **모든 묶음**을 배치 JSON 에 넣어(틀림이 없으면 "틀림": []) ${F}/work/${s.sid}-batch.json 에 Write 하고 \`${A} ${F}/work/${s.sid}-batch.json\`.
   add-lock.cjs 는 add-full.cjs 를 잠금 안에서 그대로 부른다(같은 조각의 일꾼끼리 판정 파일을 덮어쓰지 않게 — add-full.cjs 로 바로 적지 마라). 형식 오류면 고쳐서 다시.
4. 틀림을 적기 전: 소유자 결정 · 소유자 답 · 원본 그대로(풀이 10)가 아닌지 · 고칠 글이 새 틀림을 만들지 않는지 · (GRAMMAR ③) 채점 도구로 몇 점인지.
5. 기억이 압축되면 이 명령의 '네 몫' 과 \`${H} --status\` 의 네 파일 줄부터 다시. 이미 적은 묶음은 다시 적지 않는다.
6. 끝: \`${H} --status\` 에서 **네 파일이 모두 ✔** 인지 확인${solo ? '(exit 0)' : '(다른 일꾼 몫이 남아 exit 1 일 수 있음 — 네 파일 줄만 본다)'}.
   끝 줄 하나를 ${SP}/cases/${s.chunk}/end-${s.sid}.md 에 Write 하고 \`${A} --note-file ${SP}/cases/${s.chunk}/end-${s.sid}.md\`:
   '- 끝(${s.id} · 파일 ${s.files.join(' ')}): 묶음 N · 글 N · 틀림 N(심각 · 높음 · 중간 · 낮음) · 판단 필요 N · 원본 그대로 N · 판정하며 정한 규칙 …'. 기록 파일을 Edit 로 고치지 마라(다른 일꾼과 겹침).
7. 돌려줄 것: StructuredOutput — sub = '${s.id}', 숫자는 네 파일 몫(--status 와 판정 파일에서 센 값). my_files_done = 네 파일이 모두 ✔. notes 에 크게 걸린 것 한두 줄.`
}
function verifyPrompt(c) {
  const V = `node ${D}/scripts/verify-full.cjs ${c.chunk}`
  const n = SPLIT[c.chunk].length
  return `너는 K-IG CORE '학습 내용 전수 읽기' 의 확인 일꾼이다. 조각 ${c.chunk}(${c.desc})을 읽은 일꾼${n > 1 ? ` ${n}(파일을 나눠 읽음)` : ''}과 다른 일꾼이다 — 그 판정을 믿지 말고 스스로 다시 본다. 목적: 수정 세션이 고칠 표에 정말 틀린 것만 오르게 하고, 읽은 일꾼이 놓친 비율을 재는 것.
**먼저** \`node ${D}/scripts/add-full.cjs ${c.chunk} --status\` 가 exit 0(모든 파일 ✔)인지 본다. 아니면 아무것도 적지 말고 남은 묶음을 notes 에 적어 status_exit0 = false 로 돌려라.

## 지킬 것
${RULES}

## 기준 (명령서 그대로)
${STANDARDS}

## 기준 풀이
${NOTES}

## ${c.course} 에서 볼 것
${c.guide}

## 방법 — G:(판정을 가린 채 통째로 다시 읽기)를 맨 먼저 한다
1. ${D}/소유자-결정-요약.md 를 읽고 \`${V} --pick | Select-String "^G:|^확인 대상"\` — 대상을 뽑고(심각 · 높음 · ③ 전부(F:) · 중간 · 낮음 20%(F:) · 판단 필요 전부(D:) · 묶음 3%(최소 2) 통째로 다시 읽기(G:)) **G: 줄만** 본다.
   G: 결과를 다 적어 넣기 전에는 ${F}/판정-${c.chunk}.json · ${F}/판정-${c.chunk}-확인.json · ${F}/기록-${c.chunk}.md 를 열지 말고 --pick 전체 출력도 보지 마라(명령: "판정을 가린 채 통째로 다시 읽기").
2. G: — 그 묶음을 읽을거리에서 찾아(Grep '▣ <묶음>') T 글을 처음 보는 것처럼 **전부** 읽고 네가 찾은 틀림을 모두 적는다: {"key": "G:<묶음>", "결론": "다시 읽음", "읽은 글": <T 수>, "틀림": [{"T","종류","심각도","확신","까닭","지금","고칠 글","고칠 곳","새 음성 클립"}], "까닭": "…"}.
   G: 결과를 모두 ${F}/work/${c.chunk}-check.json 에 {"결과": [...], "메모": "…"} 로 Write 하고 \`${V} ${F}/work/${c.chunk}-check.json\` 로 **먼저** 적어 넣는다.
3. 그다음 \`${V} --pick\`(전체)과 ${F}/판정-${c.chunk}-확인.json "대상"(대상마다 주장 · 읽을거리 파일)을 본다. F: · D: — 그 묶음의 T 글과 앞뒤를 읽고: 정말 틀렸나(①~⑦ — 문체 취향이면 아님) · 학습자에게 닿나 · 심각도가 기준 · 풀이 5 대로인가 · 고칠 글이 맞고 새 틀림을 안 만드나 · 결정 사항은 아닌가.
   결론 "동의" · "고쳐 동의"(바꾼 심각도 · 고칠 글) · "뒤집음"(까닭). "닿음": true/false. 판단 필요는 정말 골라야 하면 동의, 한쪽이 분명하면 뒤집음(까닭에 어느 쪽인지).
4. F: · D: 결과도 ${F}/work/${c.chunk}-check.json 에 {"결과": [...], "메모": "…"} 로 Write(앞 파일을 덮어써도 됨 — 이미 적은 key 는 넣지 않는다)하고 \`${V} ${F}/work/${c.chunk}-check.json\`. 여러 번에 나눠도 됨. --status 가 exit 0 이 될 때까지. 압축되면 ${F}/기록-${c.chunk}-확인.md 와 --status 부터.
5. '원본 그대로'(풀이 10 — 확인 도구가 뽑지 않는 칸): ${F}/판정-${c.chunk}.json 의 묶음마다 "원본 그대로" 를 모두 읽을거리와 견줘 본다 — 되살린 원본의 그 시대 · 배경에서 맞는 사실인가, 영어 · 정답 · 번역 · 맞춤법 잘못이나 그때도 틀린 사실을 여기에 넣지 않았나.
   ${F}/work/${c.chunk}-kept-check.json 에 [{"묶음": "…", "T": "T05", "결론": "동의|틀림으로", "까닭": "…"}] 로 Write(틀림으로면 "종류" · "심각도" · "확신" · "지금" · "고칠 글" · "고칠 곳" · "새 음성 클립" 도). 없으면 [] — 이 세션이 합칠 때 본다.
6. 돌려줄 것: StructuredOutput — 대상 · 적음 · 동의 · 고쳐 동의 · 뒤집음 · 다시 읽은 묶음 수 · 그중 읽은 일꾼이 놓친 틀림 수(네가 찾았는데 읽은 일꾼 판정에 그 T 가 없는 것 — 끝나고 나서 판정 파일과 견줘 셈) · 원본 그대로 본 수 · 그중 틀림으로 본 수.`
}

// 자리 나누기 — 동시에 도는 일꾼은 이 컴퓨터 상한(CPU 8 − 2 = 6)과 같게. 빈자리는 우선순위 높은 일부터:
// 확인(조각의 읽기가 다 끝난 것)이 남은 읽기보다 먼저 · 읽기끼리는 긴 몫부터(끝에 긴 일 하나만 남지 않게).
const SLOTS = (args && args.slots) || 6
let running = 0
let hold = true // 읽기 30을 모두 줄 세운 뒤에 시작(먼저 넣은 여섯이 차례를 건너뛰지 않게)
const ready = []
function pump() {
  if (hold) return
  while (running < SLOTS && ready.length) {
    ready.sort((a, b) => b.prio - a.prio)
    const t = ready.shift()
    running++
    Promise.resolve().then(t.fn).then((r) => r, () => null).then((r) => { running--; t.done(r); pump() })
  }
}
const schedule = (prio, fn) => new Promise((done) => { ready.push({ prio, fn, done }); pump() })

phase('Read')
log(`읽기 일꾼 ${SUBS.length}(조각 10) · 동시 ${SLOTS} · 어림 합 ${SUBS.reduce((s, x) => s + x.est, 0)}분(일꾼-분)`)
const readP = SUBS.map((s) => schedule(s.est, () => agent(readPrompt(s), { label: `read:${s.id}`, phase: 'Read', schema: READ_SCHEMA })))
hold = false
pump()
const results = await parallel(CHUNKS.map((c) => async () => {
  const mine = SUBS.map((s, i) => i).filter((i) => SUBS[i].chunk === c.chunk)
  const rs = await Promise.all(mine.map((i) => readP[i]))
  const bad = mine.filter((i, k) => !rs[k] || !rs[k].my_files_done)
  if (bad.length) { log(`${c.chunk}: 읽기가 다 끝나지 않아 확인을 건너뜀 — ${bad.map((i) => SUBS[i].id).join(' · ')}`); return { chunk: c.chunk, reads: rs, verify: null, skipped: true } }
  log(`${c.chunk}: 읽기 끝(일꾼 ${mine.length}) → 확인`)
  const v = await schedule(1000 + (c.chunk.startsWith('ld') ? 40 : 25), () => agent(verifyPrompt(c), { label: `verify:${c.chunk}`, phase: 'Verify', schema: VERIFY_SCHEMA }))
  return { chunk: c.chunk, reads: rs, verify: v }
}))
return results
