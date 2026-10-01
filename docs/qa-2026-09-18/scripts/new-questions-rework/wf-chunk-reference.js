export const meta = {
  name: 'new-questions-chunk',
  description: 'Write and cross-check new LISTENING/READING questions for a lesson range under all rules (chip rule for LISTENING), a few batches at a time',
  phases: [
    { title: 'Write', detail: 'writers per 7-8 lessons (Sonnet)' },
    { title: 'Check', detail: 'independent checker fixes, saves staging files, runs check-new-questions until PASS' },
  ],
}

// args: { ldFrom, ldTo, rdFrom, rdTo, lanes, chips: { d141: [...], ... } }
const A = args || {}
const REPO = 'C:\\Users\\ghddl\\.gemini\\antigravity\\scratch\\K-IG-CORE'
const DESIGN = 'docs/qa-2026-09-18/학습법-화면-0927/새-문제-설계.md'
const STAGE = 'docs/qa-2026-09-18/학습법-화면-0927/새-문제/_staging'
const CHECK = 'node docs/qa-2026-09-18/scripts/check-new-questions.cjs'
const pad = (n) => String(n).padStart(3, '0')
const range = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${p}${pad(a + i)}`)
const chips = A.chips || {}

const Q_SCHEMA = {
  type: 'object',
  properties: {
    lessons: { type: 'array', items: { type: 'object', properties: {
      lesson: { type: 'string' }, lineCount: { type: 'number' },
      questions: { type: 'array', items: { type: 'object', properties: {
        id: { type: 'string' }, type: { type: 'string' }, prompt: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } }, answer: { type: 'number' },
        evidence: { type: 'array', items: { type: 'number' } }, note: { type: 'string' },
      }, required: ['id', 'type', 'prompt', 'options', 'answer', 'evidence', 'note'] } },
    }, required: ['lesson', 'lineCount', 'questions'] } },
  },
  required: ['lessons'],
}
const R_SCHEMA = {
  type: 'object',
  properties: {
    batch: { type: 'string' }, lessons: { type: 'number' }, questions: { type: 'number' },
    fixed: { type: 'number' }, dropped: { type: 'number' }, checkPass: { type: 'boolean' },
    breaksFail: { type: 'boolean' }, finalLine: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['batch', 'lessons', 'questions', 'fixed', 'dropped', 'checkPass', 'breaksFail', 'finalLine', 'notes'],
}

const RULES = `
SCOPE: you are one worker in an orchestrated job — do only the task below. Do not check usage limits or other sessions, do not read planning or handoff documents (README.md, 계획.md, 지금-할-일.md, NEXT-SESSION.md), and never stop early or return nothing for budget reasons — the orchestrator manages budgets and has already approved this work. Read only ${DESIGN} §1-§3-1, the lesson files named here, and (checker) the check script's output.
RULES (the owner decided to add these questions; lesson text, translations and audio never change):
- Read ${DESIGN} first (repo root ${REPO}) — §1-§3-1.
- Natural Korean for Korean middle/high-school learners. Prompts end like '…것은?' / '…무엇인가?' (never '…요?'). Options are short Korean phrases with NO final period. Names are written in Korean (한글 표기) and spelled the same way in every question of a lesson; numbers as digits.
- Exactly 4 distinct options, exactly one correct; "answer" = 0-based index. Spread correct positions evenly over A-D.
- NO GUESSING SHORTCUTS. check-new-questions.cjs measures these on every batch; each must stay within 15-35% (a fair set is about 25%):
  * length rank: across the batch the correct option is the longest option in about 1/4 of the questions, the 2nd-longest in about 1/4, the 3rd-longest in about 1/4 and the shortest in about 1/4 (ties are shared). Never pad one wrong option so it stands out: one option 5 or more characters longer than all the others is allowed in at most 1 question in 10. Keep the four options similar in form.
  * overlap: do not build every wrong option by changing one part of the correct option — then the correct option is the one sharing the most words with the others ('pick the center' wins). Change different parts in different wrong options, or let two wrong options share a part with each other, so the correct option is not the center and no option is the lone odd one out.
  * the correct option must not echo the prompt's words more than the other options do.
- WRONG OPTIONS are traps built from the same text — a swapped person, number, time or place, the opposite, a detail said about someone else, an unstated next step — so a learner who did not follow the text can pick them; never an off-topic option that can be crossed out without reading. Each wrong option is contradicted by the text or plainly absent from it; never one the text implies or a careful reader could defend.
- "evidence": 1-based numbers of ALL the lines/sentences needed to prove the answer; the answer follows from those lines alone (no outside knowledge).
- Questions of one lesson must not give each other away: no prompt or option may reveal another question's answer.
- Never cite a line or sentence number in a prompt (learners can hide the numbers) — quote the English phrase instead.
- "note": one Korean line quoting only the evidence lines' key English words.
- id "<lesson>-q1", "<lesson>-q2", …`
const CHIP_RULE = `
- LISTENING CHIPS (a giveaway found on screen): before listening, Step 1 shows the lesson's chips ('미리 알아 둘 이름 · 숫자' — names, places, numbers and hard words of the lesson, listed below exactly as the screen shows them). A learner sees them without listening, so no question may be answerable by matching a chip:
  * if the correct option contains a chip item (a name, place, number, date, job, food, thing …), every other option must contain a different chip item of the same kind, or all four options must contain the same chip item and differ only in what they say about it;
  * otherwise ask about something the chips do not show (a reason, a feeling, what happened, what someone will do next).
  * check-new-questions.cjs fails a question whose correct option's numbers are all chip numbers while another option's are not ('칩 숫자로 좁혀짐'); names and words are yours to check, one question at a time.`
const LD_HOW = `LISTENING: lines are in content/ld_english_scripts.json under the lesson id (rows n, en, ko; number them 1-based in array order). Types (mix): 중심 내용 · 세부 사실(number, time, name, place) · 말한 사람의 목적/태도 · 다음에 할 일. 2 questions if the lesson has 6 lines or fewer, else 3. The learner answers after listening to the whole lesson once.${CHIP_RULE}`
const RD_HOW = `READING: content/lessons/reading/<id>.json → readingSentences (english, korean; number 1-based in order). Types (mix): 중심 생각 · 세부 사실 · 낱말 뜻/가리키는 것 · 한 단계 추론. 2 questions per passage.`
const chipList = (lessons) => `\nCHIPS on screen before listening:\n${lessons.map((id) => `${id}: ${(chips[id] || []).join(' | ') || '(none)'}`).join('\n')}`
const howOf = (b) => (b.course === 'ld' ? LD_HOW + chipList(b.lessons) : RD_HOW)
// 2026-09-28 (사장님 "최대한 빠르면서 완벽하게"): no break runs per batch — the orchestrator proves every break on the merged set
// (as for chunk 1: 7 breaks, all FAIL); --detail shows per question where the answer sits, so balancing takes one or two passes
const BREAKS = () => `Do NOT run --break modes (the orchestrator proves them on the merged set). Report breaksFail as true.`
const DETAIL_HINT = `To balance, run the check with --detail: one line per question shows the answer position, the answer's length rank (1 = longest; a range = tied) and which overlap trick points at the answer — re-word only the questions that fix the counts.`

let batches = []
if (A.ldFrom) for (let a = A.ldFrom; a <= A.ldTo; a += 7) batches.push({ key: `ld-${pad(a)}`, course: 'ld', lessons: range('d', a, Math.min(a + 6, A.ldTo)) })
if (A.rdFrom) for (let a = A.rdFrom; a <= A.rdTo; a += 8) batches.push({ key: `rd-${pad(a)}`, course: 'reading', lessons: range('pr', a, Math.min(a + 7, A.rdTo)) })
// args.only: keep these batch keys · args.writtenKeys + args.writtenFile: batches already written (a stopped run) — the checker
// reads the writer's questions from that file (repo path) instead of a new writer
if (Array.isArray(A.only)) batches = batches.filter((b) => A.only.includes(b.key))
const WRITTEN = new Set(Array.isArray(A.writtenKeys) ? A.writtenKeys : [])
if (WRITTEN.size && !A.writtenFile) throw new Error('writtenKeys without writtenFile')
const LANES = Math.max(1, Math.min(6, A.lanes || 3))
// every LISTENING lesson has chips on screen (276/276, 2026-09-28) — a missing list means the args are wrong: stop before any agent
const noChips = batches.filter((b) => b.course === 'ld').flatMap((b) => b.lessons).filter((id) => !Array.isArray(chips[id]) || chips[id].length === 0)
if (noChips.length) throw new Error(`chips missing for ${noChips.length} LISTENING lessons (e.g. ${noChips.slice(0, 3).join(', ')}) — pass args.chips as an object`)
log(`${batches.length} batches · ${batches.reduce((n, b) => n + b.lessons.length, 0)} lessons · ${LANES} at a time · chips for ${Object.keys(chips).length} lessons`)

const writePrompt = (b) => `Write comprehension questions for the K-IG CORE course ${b.course === 'ld' ? 'LISTENING' : 'READING'} (owner-approved new questions).
${howOf(b)}
Lessons: ${b.lessons.join(', ')} (skip an id that has no lines and say so).
${RULES}
Read ALL lines of a lesson before writing its questions.${b.course === 'ld' ? ' Before writing a LISTENING question\'s options, glance at that lesson\'s chips.' : ''} Write naturally and keep moving: do NOT count characters or plan length ranks in detail — an independent checker balances option lengths and answer positions afterwards; your job is correct, well-made questions. Never return an empty list — write your best questions for every lesson that has lines. Do not write any file; return data only.`

const checkPrompt = (b, written) => `You are the independent checker for a batch of new K-IG CORE ${b.course === 'ld' ? 'LISTENING' : 'READING'} questions (you did not write them).
${howOf(b)}
${RULES}

1. Verify EVERY question against the lesson text: the evidence proves the answer; no other option is defensible; each wrong option is wrong by the text and is a trap from the text (not off-topic); natural Korean; no outside knowledge; no question gives another away; names spelled consistently.${b.course === 'ld' ? ' And against the lesson\'s chips: could a learner who did not listen pick the answer by matching a chip? Then fix it as the chip rule says.' : ''} Fix any question that fails (rewrite options/prompt/answer/evidence) — keep the id. Drop a question only if it cannot be fixed, and write a replacement of the same type instead.
2. Save one file per lesson: ${STAGE}/${b.key}/${b.course}/<lesson>.json = {"v":1,"lesson":"<id>","course":"${b.course}","questions":[{id,type,prompt,options,answer,evidence,note}]} (UTF-8 without BOM, 2-space JSON with a trailing newline). Write nothing else anywhere (never under content/).
3. Run: ${CHECK} --dir "${STAGE}/${b.key}" — fix and re-run until it prints PASS. When it reports a guessing shortcut (length rank, a padded option, overlap, chip numbers), fix it by re-wording options as the RULES say — never by padding. ${DETAIL_HINT}
4. ${BREAKS()}
5. No git add/commit.
Return the summary: how many questions you changed and the most serious defects (one short line each), the final printed line of the check, and the break results.

${written === 'FILE' ? `Questions to check: read the file ${A.writtenFile} (JSON object keyed by batch) — the entry "${b.key}" is the writer's {lessons:[{lesson, lineCount, questions:[…]}]}. The writer worked under an older instruction and did not see the chips or balance lengths — check everything.` : `Questions to check (JSON): ${JSON.stringify(written)}`}`

const lanes = Array.from({ length: LANES }, () => [])
batches.forEach((b, i) => lanes[i % LANES].push(b))
const laneResults = await parallel(lanes.map((lane) => async () => {
  const out = []
  for (const b of lane) {
    let w = null
    if (WRITTEN.has(b.key)) w = 'FILE'
    else {
      // 2026-09-28: 'medium' — at the session's effort, 2 of 3 chunk-3 writers ran past the 64k output limit (and one returned nothing)
      try { w = await agent(writePrompt(b), { label: `write:${b.key}`, phase: 'Write', schema: Q_SCHEMA, model: 'sonnet', effort: 'medium' }) } catch (e) { w = null }
      if (w && !(w.lessons || []).some((l) => (l.questions || []).length)) w = null // an empty answer is a failed writer
    }
    if (!w) { out.push({ batch: b.key, lessons: b.lessons.length, questions: 0, fixed: 0, dropped: 0, checkPass: false, breaksFail: false, finalLine: '', notes: 'writer failed' }); continue }
    let c = null
    try { c = await agent(checkPrompt(b, w), { label: `check:${b.key}`, phase: 'Check', schema: R_SCHEMA }) } catch (e) { c = null }
    out.push(c || { batch: b.key, lessons: b.lessons.length, questions: 0, fixed: 0, dropped: 0, checkPass: false, breaksFail: false, finalLine: '', notes: 'checker failed' })
  }
  return out
}))
const done = laneResults.filter(Boolean).flat()
return {
  batches: done.length,
  missing: batches.length - done.length,
  questions: done.reduce((n, r) => n + (r.questions || 0), 0),
  changed: done.reduce((n, r) => n + (r.fixed || 0), 0),
  dropped: done.reduce((n, r) => n + (r.dropped || 0), 0),
  notPass: done.filter((r) => !r.checkPass).map((r) => r.batch),
  breaksNotFail: done.filter((r) => !r.breaksFail).map((r) => r.batch),
  lines: done.map((r) => `${r.batch}: ${r.finalLine}`.slice(0, 260)),
  notes: done.map((r) => `${r.batch}: ${r.notes}`.slice(0, 300)),
}
