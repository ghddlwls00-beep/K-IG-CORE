export const meta = {
  name: 'gate15-fix-recheck',
  description: '관문 15 고침 다시 보기 — 수정 세션이 고친 main(3e9687f)이 이 세션의 고칠 줄 372 · 힌트 줄이 바뀐 245강 칩대로 되었는지 일꾼이 읽고, 조각마다 다른 일꾼이 확인',
  phases: [
    { title: 'Read', detail: '줄 조각 6(전수 303 · 더한 29 · 두 번째 31 · 판단 필요 9) · 칩 조각 5(245강)' },
    { title: 'Verify', detail: '조각마다 다른 일꾼: 제대로 · 괜찮음이 아닌 것 전부 + 10%' },
  ],
}

// args: { wt, snap } — 작업 트리 · main 스냅샷(전수/수정확인/기계.json '스냅')
const WT = (args && args.wt) || '(작업 폴더)'
const SNAP = (args && args.snap) || '(스냅샷)'
const F = 'docs/qa-2026-09-18/내용-재검토/전수'
const T = `${F}/도구`
const CHUNKS = [
  { c: '줄-듣기-앞', n: 108 }, { c: '줄-듣기-뒤', n: 83 }, { c: '줄-문법1', n: 68 },
  { c: '칩-5', n: 49 }, { c: '칩-1', n: 49 }, { c: '칩-2', n: 49 }, { c: '칩-3', n: 49 }, { c: '칩-4', n: 49 },
  { c: '줄-읽기단어', n: 44 }, { c: '줄-문법2', n: 42 }, { c: '줄-초등', n: 27 },
]
const RULES = `- 작업 폴더(작업 트리)는 ${WT} — 상대 경로는 여기 기준. 셸은 PowerShell. 한글 파일은 Read 도구가 낫다.
- **main 의 글은 ${SNAP}/ 아래**(content/ · src/lib/ — main 3e9687f 를 풀어 둔 것, 읽기만). 작업 트리의 content/ · src/ 는 이 세션의 옛 판이라 main 이 아니다 — 판정에 쓰지 마라.
- 네가 쓰는 곳: ${F}/work/ 의 네 초안 파일과 도구가 쓰는 판정 · 기록뿐. content/ · src/ · scripts/ · 스냅샷을 바꾸지 마라. git · 브라우저 · /api/ 금지. .env.local 값 출력 금지.
- CNN · GVA · basics · middle · 법률 · 결제 · 저작권은 보지 않는다.`
const ROWS = `## 줄마다 볼 것 (판정: 제대로 | 다르게 들어감 | 안 들어감 | 옆 글을 망침 | 모름)
1. '고칠 곳' 의 main 파일에서 그 칸을 찾는다(Grep · Read — JSON 경로 · 번호 · 글). '기계' 줄은 고칠 글이 그 파일에 글자 그대로 있는지만 본 것 — 자리 · 옆 글은 네가 본다.
2. **제대로** = 고칠 글이 그 칸에 들어갔고 같은 칸 · 짝 칸(한국어 ↔ 영어 · 본 쪽 ↔ 나눈 쪽)이 멀쩡. **다르게 들어감** = 뜻은 맞게 고쳤으나 글이 다름 — 괜찮은지를 까닭에(새 흠이면 '옆 글을 망침'). **안 들어감** = 옛 글 그대로.
   **옆 글을 망침** = 고치며 새 흠(잘림 · 겹친 낱말 · 짝 어긋남 · 다른 뜻 · 남은 기호). **모름** = 칸을 못 찾음(까닭).
3. GRAMMAR 다른 정답 줄: 그 문항의 본 쪽 · 나눈 쪽 파일 모두의 alternatives 에 들어갔는지. **빗금 든 다른 정답('his/her')은 앱이 빗금을 빈칸으로 바꿔 화면에 'his her' 로 보이고 그 꼴을 만점으로 받음 — 이미 수정 세션에 빼라고 알림(6개). 이 종류가 또 보이면 '옆 글을 망침'.**
   LISTENING 힌트 줄: main 힌트 줄이 고칠 글의 항목을 담았는지 — 되살린 원본 첫 줄이 앞에 붙었거나 새 칩 규칙(칭호 · 한 글자 머리글자 뒤 '. ' 안 나눔)에 맞춰 마침표 · 쉼표가 바뀐 것은 '제대로'(까닭에 적음). 칩은 칩 조각 일꾼이 따로 봄.
   판단 필요 줄(D1 ~ D9): 추천안대로 들어갔는지(추천안에 적힌 파일 · 칸 · 글).
   새 음성 '필요' 인 줄: 글이 바뀐 것만 본다(클립은 수정 세션 몫 — 판정에 넣지 않음).
4. 20 ~ 40줄씩 결과를 ${F}/work/<조각>-rows.json 에 {"결과": [{"id", "판정", "main 글", "까닭", "고칠 것"}], "메모": "…"} 로 Write 하고 \`node ${T}/수정확인-적기.cjs <조각> ${F}/work/<조각>-rows.json\`(같은 파일을 덮어써도 됨 — 이미 적은 id 는 빼고). 형식 오류면 고쳐서 다시.`
const CHIPS = `## 강마다 볼 것 (판정: 괜찮음 | 문제)
- 문장마다 **main 칩**이 그 문장의 이름 · 수 · 어려운 낱말을 제대로 보여 주나: 한 항목이 둘로 쪼개짐 · 두 항목이 한 칩으로 붙음 · 문장에 없는 꼴(철자 · 활용) · 다른 문장으로 번짐(그 문장에 없는 칩) · 칭호만 떨어진 칩 · 남은 기호.
  앱 안전장치(수 · 이름이 든 문장에서 칩이 하나도 안 맞으면 강의 칩 전체를 띄움)는 설계라 문제로 세지 않되 까닭에 적음. 낱말 하나가 같아 다른 문장에 뜨는 칩(예: 'office' 로 [dental office])은 그 칩이 그 문장에 오도를 주면 문제.
- **전 칩보다 나빠진 곳**(되살린 첫 줄 · 표의 고침 · 새 규칙 탓)은 꼭 적는다. '기계 표시' 는 볼 곳을 짚을 뿐 — 기계 표시가 없는 강도 다 본다.
- 문제면 문제 목록: {"n", "칩", "무엇", "고칠 글"(그 강 힌트 줄 전체 — 새 규칙으로 나뉘는 모양까지)}. 고칠 글은 적기 전에 \`node ${T}/chips-main.cjs dNNN <고칠 힌트 줄.txt>\`(txt 는 ${F}/work/ 에 Write)로 재어 새 흠이 없을 때만.
- 10 ~ 20강씩 결과를 ${F}/work/<조각>-chips.json 에 {"결과": [{"id": "dNNN", "판정", "문제": [...], "까닭"}], "메모": "…"} 로 Write 하고 \`node ${T}/수정확인-적기.cjs <조각> ${F}/work/<조각>-chips.json\`.`
function readPrompt(x) {
  const chip = x.c.startsWith('칩-')
  return `너는 K-IG CORE(한국인 대상 영어 학습 사이트) '관문 15 고침 다시 보기' 의 일꾼이다(소유자 2026-09-25 "수정은 잘 된거겠지?" · "워크플로우로 돌려 이것도").
수정 세션이 이 세션의 고칠 표대로 고친 main(3e9687f — 아직 푸시 전)이 정말 제대로 되었는지 본다. 읽고 판정만 — 고치지 않는다. 네 몫: ${F}/수정확인/읽을거리/${x.c}.md 의 ${chip ? '강' : '줄'} 전부(${x.n}).
${chip ? '힌트 줄이 바뀐 강(되살린 원본 첫 줄 — 소유자 "되살린다" · 표의 힌트 고침)의 칩이 문장마다 맞는지 본다.' : ''}

## 지킬 것
${RULES}

${chip ? CHIPS : ROWS}

## 방법
1. \`node ${T}/수정확인-적기.cjs ${x.c} --status\`(이미 적은 것이 있으면 남은 것부터) · 읽을거리를 Read 로 끝까지.
2. 위대로 보고 도구로 적는다. 기억이 압축되면 이 명령과 --status 부터.
3. 끝: --status exit 0. 돌려줄 것: StructuredOutput — 적은 수 · 제대로/괜찮음이 아닌 수 · notes 에 크게 걸린 것 한두 줄.`
}
function verifyPrompt(x) {
  const chip = x.c.startsWith('칩-')
  return `너는 K-IG CORE '관문 15 고침 다시 보기' 의 확인 일꾼이다. 조각 ${x.c} 를 본 일꾼과 다른 일꾼이다 — 그 판정을 믿지 말고 main 파일로 스스로 다시 본다.

## 지킬 것
${RULES}

${chip ? CHIPS : ROWS}

## 방법
0. \`node ${T}/수정확인-적기.cjs ${x.c} --status\` 가 exit 0 인지. 아니면 아무것도 적지 말고 status_exit0 = false 로 돌려라.
1. \`node ${T}/수정확인-확인.cjs ${x.c} --pick\` — 대상: 제대로 · 괜찮음이 아닌 것 전부 + 제대로 · 괜찮음 10%(최소 2). 주장은 ${F}/수정확인/확인-${x.c}.json "대상".
2. 대상마다 main 파일(${SNAP})과 읽을거리로 다시 보고 결론 "동의" | "뒤집음"(바른 판정 · 까닭). 문제 주장의 '고칠 것 · 고칠 글' 이 맞는지도(칩이면 chips-main.cjs 로 재어).
3. 결과를 ${F}/work/${x.c}-check.json 에 {"결과": [{"key", "결론", "까닭", "바른 판정"}], "메모": "…"} 로 Write 하고 \`node ${T}/수정확인-확인.cjs ${x.c} ${F}/work/${x.c}-check.json\`. --status exit 0 까지.
4. 돌려줄 것: StructuredOutput.`
}
const RS = { type: 'object', properties: { chunk: { type: 'string' }, done: { type: 'integer' }, total: { type: 'integer' }, not_ok: { type: 'integer' }, status_exit0: { type: 'boolean' }, notes: { type: 'string' } }, required: ['chunk', 'done', 'total', 'status_exit0', 'notes'] }
const VS = { type: 'object', properties: { chunk: { type: 'string' }, targets: { type: 'integer' }, done: { type: 'integer' }, agree: { type: 'integer' }, overturned: { type: 'integer' }, status_exit0: { type: 'boolean' }, notes: { type: 'string' } }, required: ['chunk', 'targets', 'done', 'status_exit0', 'notes'] }

phase('Read')
log(`조각 ${CHUNKS.length}(줄 372 · 칩 245강) → 조각마다 확인 · 동시 6`)
const results = await pipeline(
  CHUNKS,
  (x) => agent(readPrompt(x), { label: `read:${x.c}`, phase: 'Read', schema: RS }),
  (r, x) => {
    if (!r || !r.status_exit0) { log(`${x.c}: 적기가 끝나지 않아 확인을 건너뜀`); return { chunk: x.c, read: r, verify: null, skipped: true } }
    return agent(verifyPrompt(x), { label: `verify:${x.c}`, phase: 'Verify', schema: VS }).then((v) => ({ chunk: x.c, read: r, verify: v }))
  },
)
return results
