export const meta = {
  name: 'kig-content-review-deep',
  description: 'Deeper content review: VOCA lesson grids in 20 units, READING vocabulary cards on their own, each finding adversarially verified',
  phases: [
    { title: 'Review', detail: 'VOCA grids (10 lessons each) and READING cards (150 each)' },
    { title: 'Verify', detail: 'Critical/High: 3 skeptics each; Medium/Low: 1 skeptic per unit' },
  ],
}

const R = 'C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE'
const C = `${R}/docs/qa-2026-09-18/out/content`
const COMMON = `
You are a content-integrity reviewer in a pre-commercial-release audit of K-IG CORE, a paid English-learning site for Korean learners (repo ${R}). Date checked: 2026-09-18.
RULES:
- READ-ONLY. Do not modify any file. Do not run builds, servers, git or any browser/preview tool. Read/Grep/Glob and small node one-liners only.
- Never read these whole: docs/qa-2026-09-15/evidence/*, docs/qa-2026-09-15/scripts/out/*, docs/qa-2026-09-17/out/*. For big JSON (content/voca_dictionary.json, src/lib/readingVocabulary.json) use Grep or node one-liners.
- The original textbook is NOT the answer key; judge every item on its merits.
- Review EVERY item in your scope one by one. No sampling. Count what you reviewed.
- Verify disputed facts/meanings with WebSearch/WebFetch (load them with ToolSearch query "select:WebSearch,WebFetch") and give the URL; otherwise say "expert review required" and why.
- Report real problems only; style preferences where the text is already correct are NOT findings.
- Severity: Critical = teaches something plainly wrong; High = distorts a core concept or makes a graded item unfair; Medium = reduces learning efficiency or confuses; Low = minor wording/presentation.
- Quote the EXACT original text and give file + locator for every finding.
`
const FINDING = {
  type: 'object',
  properties: {
    lesson: { type: 'string' }, locator: { type: 'string' }, file: { type: 'string' },
    severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    category: { type: 'string', enum: ['wrong-meaning', 'missing-sense', 'part-of-speech', 'spelling', 'duplicate', 'level-mismatch', 'context-mismatch', 'lemma', 'placeholder', 'other'] },
    original: { type: 'string' }, problem: { type: 'string' }, correction: { type: 'string' }, source: { type: 'string' }, learnerImpact: { type: 'string' },
  },
  required: ['lesson', 'locator', 'file', 'severity', 'category', 'original', 'problem', 'correction', 'source', 'learnerImpact'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    coverage: { type: 'array', items: { type: 'object', properties: { unit: { type: 'string' }, itemsReviewed: { type: 'number' }, status: { type: 'string', enum: ['PASS', 'FAIL'] }, note: { type: 'string' } }, required: ['unit', 'itemsReviewed', 'status'] } },
    findings: { type: 'array', items: FINDING },
  },
  required: ['coverage', 'findings'],
}
const VERDICT = { type: 'object', properties: { verdict: { type: 'string', enum: ['confirmed', 'refuted', 'adjusted'] }, severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] }, reason: { type: 'string' }, correction: { type: 'string' }, source: { type: 'string' } }, required: ['verdict', 'severity', 'reason'] }
const BATCH_VERDICT = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, ...VERDICT.properties }, required: ['index', 'verdict', 'severity', 'reason'] } } }, required: ['verdicts'] }

const A = args
const units = []
for (let i = 0; i < A.phonics.length; i += 10) {
  const ids = A.phonics.slice(i, i + 10)
  units.push({
    key: `voca-grid ${ids[0]}..${ids[ids.length - 1]}`,
    prompt: `VOCA LESSON GRIDS (slug phonics). Dump ${C}/voca-lessons.tsv has columns lesson, title, row, col, word, meaning — the meaning is the one the learner actually sees on the card. YOUR SCOPE: lessons ${ids.join(', ')} (Grep the dump for lines starting with each id + a tab; each lesson has 30 words, hv-75 has 11). Review EVERY word of every lesson in scope: is the English word spelled correctly and a real headword; is the Korean meaning correct and the most useful primary sense for this level (mv1/mv2/mv3 = Korean middle school levels 1-3, hv = advanced high school); is the part of speech implied by the gloss consistent with the word; is the word duplicated inside the lesson; is a word obviously out of level for its series; is the meaning a placeholder ("단어") or blank; do bracket headwords (e.g. colo(u)r, autumn(=fall)) make sense as shown. Cross-check the dictionary entry in content/voca_dictionary.json when the shown meaning looks wrong. Coverage unit = each lesson with itemsReviewed = words checked.`,
  })
}
{
  const total = A.readingCardRows - 1
  for (let start = 2; start <= A.readingCardRows; start += 150) {
    const end = Math.min(A.readingCardRows, start + 149)
    units.push({
      key: `reading-cards ${start}-${end}`,
      prompt: `READING VOCABULARY CARDS. Dump ${C}/reading-vocab-context.tsv has columns lesson, word, pos, korean, context — context is the passage sentence the card was made from, with the word in [brackets]. YOUR SCOPE: lines ${start}..${end} (header is line 1; Read with offset=${start} limit=${end - start + 1}). For EVERY card: is the Korean meaning right FOR THAT SENTENCE (not just a dictionary sense); does the part-of-speech tag match how the word is used there; is the headword/lemma form right (e.g. a card for "fathers" glossed as a verb, or an inflected form treated as a lemma); is the card's word actually in the sentence; is the gloss a placeholder or a duplicate of another card in the same lesson; would the gloss mislead a Korean high-school learner. Open content/lessons/reading/<lesson>.json when you need the full passage. Coverage unit = the line range with itemsReviewed = cards checked.`,
    })
  }
  log(`READING cards: ${total}, VOCA lessons: ${A.phonics.length}`)
}
// args.only: run just these unit keys (from scripts/remaining-review-units.cjs) — for a NEW session
if (A.only && A.only.length) {
  const only = new Set(A.only)
  for (let i = units.length - 1; i >= 0; i--) if (!only.has(units[i].key)) units.splice(i, 1)
  log(`only ${units.length} listed units`)
}
log(`deep review units: ${units.length}`)

const results = await pipeline(
  units,
  (u) => agent(`${COMMON}\n${u.prompt}\n\nReturn coverage for every unit in scope and all findings.`, { label: `deep:${u.key}`, phase: 'Review', schema: REVIEW_SCHEMA }),
  async (rev, u) => {
    if (!rev) return { unit: u.key, review: null, findings: [] }
    const findings = rev.findings || []
    const heavy = findings.map((f, i) => ({ f, i })).filter((x) => x.f.severity === 'Critical' || x.f.severity === 'High')
    const light = findings.map((f, i) => ({ f, i })).filter((x) => x.f.severity === 'Medium' || x.f.severity === 'Low')
    const verdicts = new Array(findings.length).fill(null)
    const heavyJobs = heavy.map(({ f, i }) => async () => {
      const votes = await parallel([0, 1, 2].map((k) => () => agent(`${COMMON}\nYou are INDEPENDENT SKEPTIC #${k + 1}. Try hard to REFUTE the finding below: open the data, quote what is really there, and check the meaning/POS yourself (WebSearch a dictionary if needed). "refuted" if the original is acceptable or the finding misreads the data; "adjusted" if real but severity/correction should change; "confirmed" if it stands. Prefer "refuted" when uncertain.\n\nFINDING:\n${JSON.stringify(f, null, 1)}`, { label: `verify#${k + 1}:${u.key}:${f.lesson}`, phase: 'Verify', schema: VERDICT })))
      const ok = votes.filter(Boolean)
      const real = ok.filter((v) => v.verdict !== 'refuted')
      verdicts[i] = { method: '3 skeptics', votes: ok, survives: real.length >= 2, severity: real.length >= 2 ? real[0].severity : null }
    })
    const lightJob = async () => {
      if (!light.length) return
      const list = light.map(({ f }, k) => ({ index: k, ...f }))
      const b = await agent(`${COMMON}\nYou are an INDEPENDENT SKEPTIC. For EACH Medium/Low finding below, open the data, quote what is really there and try to REFUTE it. Return one verdict per index.\n\nFINDINGS:\n${JSON.stringify(list, null, 1)}`, { label: `verify-batch:${u.key}`, phase: 'Verify', schema: BATCH_VERDICT })
      for (const v of (b && b.verdicts) || []) {
        const t = light[v.index]
        if (!t) continue
        verdicts[t.i] = { method: '1 skeptic', votes: [v], survives: v.verdict !== 'refuted', severity: v.verdict === 'refuted' ? null : v.severity }
      }
    }
    await parallel([...heavyJobs, lightJob])
    return { unit: u.key, review: { coverage: rev.coverage }, findings: findings.map((f, i) => ({ ...f, verification: verdicts[i] })) }
  },
)
const all = results.filter(Boolean)
const flat = all.flatMap((r) => r.findings)
log(`deep findings ${flat.length}, surviving ${flat.filter((f) => f.verification && f.verification.survives).length}`)
return { units: all.map((r) => ({ unit: r.unit, coverage: r.review ? r.review.coverage : null })), findings: flat }
