export const meta = {
  name: 'kig-content-review',
  description: 'Exhaustive educational-content review of every K-IG lesson item (6 courses) with independent adversarial verification of each finding',
  phases: [
    { title: 'Review', detail: 'one reviewer per lesson chunk / dictionary slice, every item' },
    { title: 'Verify', detail: 'Critical/High: 3 independent skeptics each; Medium/Low: 1 skeptic per chunk' },
  ],
}

const R = 'C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE'
const C = `${R}/docs/qa-2026-09-18/out/content`
const COMMON = `
You are a content-integrity reviewer in a pre-commercial-release audit of K-IG CORE, a paid English-learning site for Korean learners (repo ${R}). Date checked: 2026-09-18.
RULES:
- READ-ONLY. Do not modify any file. Do not run builds, servers, git, or any browser/preview tool. Use Read/Grep/Glob and node one-liners only.
- Never read these huge files whole: docs/qa-2026-09-15/evidence/*, docs/qa-2026-09-15/scripts/out/*, docs/qa-2026-09-17/out/*. For content/ld_english_scripts.json, src/lib/readingSentences.json, src/lib/readingVocabulary.json, content/voca_dictionary.json use Grep or node one-liners that print only what you need.
- The original 2009/2012 textbook is NOT the answer key; judge every item on its merits (what is actually correct and natural).
- Review EVERY item in your scope one by one. No sampling. Count what you reviewed.
- Report real problems only: factual errors, wrong/ungrammatical English, wrong or unfaithful Korean translation (numbers, names, negation, tense, meaning), wrong model answers or answers that do not match the prompt, missing widely-accepted alternative answers where learners are graded, misaligned rows, corrupted text/characters, test-item remnants, duplicates, misleading explanations, offensive/biased content, outdated facts presented as current, copyright concerns, pedagogically confusing items. Pure style preferences where the current text is already correct and natural are NOT findings.
- For factual claims you dispute, verify with reliable sources using WebSearch/WebFetch (load them with ToolSearch query "select:WebSearch,WebFetch") and give the URL. If no source can settle it, say "expert review required" and why.
- Already known and waiting for the owner/lawyer — do NOT re-investigate, just note once if you meet them: LISTENING L-74 / L-84 (offensive-expression rounds), READING pr054 advertisement text (R-30), pr078 nun joke (R-32), modern copyrighted excerpts R-29 / R-43 / R-75. CNN and GVA are out of scope.
- Severity: Critical = could seriously teach incorrect information; High = distorts understanding of a core concept or makes a graded item impossible/unfair; Medium = reduces learning efficiency or causes confusion; Low = minor wording/spelling/presentation.
- Each finding must quote the EXACT original text from the data file and give file path + item locator.
`
const FINDING = {
  type: 'object',
  properties: {
    lesson: { type: 'string' },
    locator: { type: 'string', description: 'item number / field / row, precise enough to find it' },
    file: { type: 'string' },
    severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    category: { type: 'string', enum: ['factual', 'english-grammar-spelling', 'translation', 'model-answer', 'missing-alternative', 'misalignment', 'corruption', 'duplicate', 'explanation', 'pedagogy', 'offensive-bias', 'outdated', 'copyright', 'data-structure', 'other'] },
    original: { type: 'string', description: 'exact original text' },
    problem: { type: 'string' },
    correction: { type: 'string' },
    source: { type: 'string', description: 'URL(s) or "expert review required: reason" or "self-evident (grammar/spelling)"' },
    learnerImpact: { type: 'string' },
  },
  required: ['lesson', 'locator', 'file', 'severity', 'category', 'original', 'problem', 'correction', 'source', 'learnerImpact'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    coverage: { type: 'array', items: { type: 'object', properties: { unit: { type: 'string' }, itemsReviewed: { type: 'number' }, status: { type: 'string', enum: ['PASS', 'FAIL'] }, note: { type: 'string' } }, required: ['unit', 'itemsReviewed', 'status'] } },
    findings: { type: 'array', items: FINDING },
    knownDeferredSeen: { type: 'array', items: { type: 'string' } },
  },
  required: ['coverage', 'findings'],
}
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'adjusted'] },
    severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    reason: { type: 'string' },
    correction: { type: 'string' },
    source: { type: 'string' },
  },
  required: ['verdict', 'severity', 'reason'],
}
const BATCH_VERDICT = {
  type: 'object',
  properties: { verdicts: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, ...VERDICT.properties }, required: ['index', 'verdict', 'severity', 'reason'] } } },
  required: ['verdicts'],
}

const COURSE = {
  grammar1: `COURSE GRAMMAR I (slug grammar1). Each main lesson gh1-NNN (even number) holds Korean prompts; its pair (pairId, odd number, e.g. gh1-007 for gh1-006) holds the English model answers (items[].text, items[].alternatives). Learners translate Korean→English and are GRADED against the model answer + alternatives. Script pages gh1-NNN-1 / gh1-NNN-2 (and odd-number -1/-2) show parts of the same material. A tab-separated dump of every pair is ${C}/grammar1.tsv (columns lesson, n, KO, EN, alternatives). For each lesson in your scope READ the lesson JSON files content/lessons/grammar1/<id>.json, its pair and its -1/-2 script pages (instructions, headings, notes) and review every item: Korean prompt natural and unambiguous; English answer grammatical, natural and a correct translation; prompt↔answer alignment (no off-by-one); alternatives correct; common correct translations missing from alternatives (learner would be marked wrong); explanations/instructions correct; duplicates; script pages consistent with the main lesson. What the learner sees is described in ${R}/docs/qa-2026-09-18/maps/grammar1.md (Grep it for details, it is large).`,
  grammar2: `COURSE GRAMMAR II (slug grammar2). Lesson gh2-NNN (NNN = 007..050) holds English sentences (items[].text + alternatives); gh2-NNN-1 holds the Korean translations. Learners write English from the Korean and are graded. Dump: ${C}/grammar2.tsv. READ content/lessons/grammar2/<id>.json and <id>-1.json for each lesson in scope and review every item as for a graded translation course: Korean faithful and natural; English grammatical/natural; alignment; alternatives; missing common alternatives; and whether the sentences actually practise the grammar point of that lesson number (heading/label/topic). Learner view: ${R}/docs/qa-2026-09-18/maps/grammar2.md (Grep it).`,
  student: `COURSE STUDENT (slug student): 82 lessons in 20 chapters, speaking-presentation course (self-introduction, family, school, Korean history/holidays/culture/places, role models). Each lesson file content/lessons/student/<id>.json has blocks with EN/KO sentences, instructions, and chunkDrills (Korean chunk → English chunk pairs used for chunk practice). Dump: ${C}/student.txt (sections "=== <id> |"). IMPORTANT: parentheses in STUDENT sentences such as "(school name)" or "(10)" are fill-in BLANKS for the learner's own details — not errors; never suggest turning them into alternative answers. Review every sentence and every chunk drill: English natural and grammatical for a young Korean learner; Korean faithful; facts (Korean history, holidays, culture, places, people) verified with sources; outdated "current" facts; chunk drills correctly map Korean↔English and actually reproduce the lesson's sentences; corrupted characters (e.g. broken apostrophes); duplicates. Learner view: ${R}/docs/qa-2026-09-18/maps/student.md (Grep it).`,
  ld: `COURSE LISTENING (slug ld): 276 rounds d001..d276. English script lines + Korean translation live in content/ld_english_scripts.json (key dNNN → [{n, en, ko}]); dump ${C}/listening.tsv (columns round, n, EN, KO; a "hint" row holds the hints block). Lesson file content/lessons/ld/dNNN.json has instruction/hints blocks; the script page content/lessons/ld/dNNN-1.json shows a Korean script in its blocks. The site plays synthesized speech of the English script and learners do dictation of those English lines. Review every line of every round in scope: English grammatical/natural and internally consistent; factual claims; Korean translation faithful (numbers, names, negation, tense) and row-aligned with English; hint words actually in the script and spelled the same; instruction referring to hints when no hints block exists; the -1 page Korean consistent with the scripts-file Korean (report real content differences, not whitespace); lines unsuitable for dictation (non-spoken text, speaker labels, garbage). Learner view: ${R}/docs/qa-2026-09-18/maps/listening.md (Grep it).`,
  reading: `COURSE READING (slug reading): 256 passages pr001..pr256. Lesson file content/lessons/reading/prNNN.json has readingSentences [{english, korean,...}], readingVocabulary cards [{word, lemma, pos, korean, ...}] and passage blocks; prNNN-1.json is the Korean script page. Dumps: ${C}/reading-sentences.tsv and ${C}/reading-vocab-context.tsv (card + the passage sentence it comes from). Review every sentence and every card in scope: English passage intact (no truncation, no test-item remnants like ①②, underline marks, answer choices, vocabulary footnotes inside the text, corrupted numbers/characters); facts verified with sources; Korean translation faithful and aligned; card word present in passage; lemma correct; part of speech matches how the word is used in THAT sentence; Korean meaning correct in THAT context; the -1 page Korean consistent with the sentence translations; passage duplicated elsewhere; offensive/biased or outdated content. Learner view: ${R}/docs/qa-2026-09-18/maps/reading.md (Grep it).`,
  vocaDict: `COURSE VOCA (slug phonics) — DICTIONARY. content/voca_dictionary.json feeds the Korean meanings shown on VOCA cards, quizzes and drills. Dump ${C}/voca-dictionary.tsv: columns key, searchWord, meaning, lessons. Review EVERY entry in your line range: meaning correct; it gives the primary/most useful sense(s) for a Korean middle/high-school learner; part-of-speech consistent (verb glossed as a verb etc.); no typos, no wrong-language text, no placeholder like 단어; variant spellings (colo(u)r, gray(grey), autumn(=fall)) handled sensibly; homographs with a missing essential sense. Learner view: ${R}/docs/qa-2026-09-18/maps/voca.md (Grep it).`,
  vocaLessons: `COURSE VOCA (slug phonics) — LESSON GRIDS. Dump ${C}/voca-lessons.tsv: columns lesson, title, row, col, word, meaning (meaning as resolved for display). 195 lessons: mv1-01..40, mv2-01..40, mv3-01..40 (middle school levels 1-3) and hv-01..75 (advanced high school). Review every row of every lesson in your scope: misspelled or malformed words; duplicate words inside a lesson; words repeated across lessons of the same level (report as one finding per level with the list); words clearly misplaced by level; blank/fallback meanings; meaning that is wrong for the word; lesson title shown to learners (check ${R}/docs/qa-2026-09-18/maps/voca.md whether the legacy title "::: K-IG 교육 영어듣기훈련프로그램 | 기초1 | 제 001 회 강의 :::" is displayed). Coverage units = lessons.`,
}

function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }
const A = args
const units = []
for (const ids of chunk(A.grammar1, 6)) units.push({ course: 'grammar1', label: `grammar1 ${ids[0]}..${ids[ids.length - 1]}`, scope: `Lessons (main ids; include each one's answer pair and script pages): ${ids.join(', ')}` })
for (const ids of chunk(A.grammar2, 9)) units.push({ course: 'grammar2', label: `grammar2 ${ids[0]}..${ids[ids.length - 1]}`, scope: `Lessons: ${ids.join(', ')} (and each -1 page)` })
for (const ids of chunk(A.student, 12)) units.push({ course: 'student', label: `student ${ids[0]}..${ids[ids.length - 1]}`, scope: `Lessons: ${ids.join(', ')}` })
for (const ids of chunk(A.ld, 12)) units.push({ course: 'ld', label: `ld ${ids[0]}..${ids[ids.length - 1]}`, scope: `Rounds: ${ids.join(', ')} (and each -1 page)` })
for (const ids of chunk(A.reading, 10)) units.push({ course: 'reading', label: `reading ${ids[0]}..${ids[ids.length - 1]}`, scope: `Passages: ${ids.join(', ')} (and each -1 page)` })
{
  const total = A.vocaDictLines - 1
  for (let start = 2; start <= A.vocaDictLines; start += 160) {
    const end = Math.min(A.vocaDictLines, start + 159)
    units.push({ course: 'vocaDict', label: `voca-dict lines ${start}-${end}`, scope: `Lines ${start} to ${end} of voca-dictionary.tsv (line 1 is the header; use Read with offset=${start} limit=${end - start + 1}). That is ${end - start + 1} entries; coverage unit = each dictionary key (report coverage as one unit "lines ${start}-${end}" with itemsReviewed = number of entries).` })
  }
  log(`VOCA dictionary entries: ${total}`)
}
for (const ids of chunk(A.phonics, 65)) units.push({ course: 'vocaLessons', label: `voca-lessons ${ids[0]}..${ids[ids.length - 1]}`, scope: `Lessons: ${ids.join(', ')} (Grep voca-lessons.tsv for lines starting with each id followed by a tab)` })
// args.skip: course keys left out of this run (e.g. vocaLessons, superseded by the 20-unit deep
// pass; vocaDict, deferred to after the weekly quota reset). Other units keep their prompts, so
// their cached results are reused.
if (A.skip && A.skip.length) {
  const skip = new Set(A.skip)
  for (let i = units.length - 1; i >= 0; i--) if (skip.has(units[i].course)) units.splice(i, 1)
  log(`skipping ${A.skip.join(', ')}`)
}
// args.only: run just these unit labels (as printed by scripts/remaining-review-units.cjs) —
// used when a NEW session continues the review and cannot reuse the old run's cache.
if (A.only && A.only.length) {
  const only = new Set(A.only)
  for (let i = units.length - 1; i >= 0; i--) if (!only.has(units[i].label)) units.splice(i, 1)
  log(`only ${units.length} listed units`)
}
log(`review units: ${units.length}`)

const results = await pipeline(
  units,
  (u) => agent(`${COMMON}\n${COURSE[u.course]}\n\nYOUR SCOPE: ${u.scope}\n\nReturn coverage for every unit in scope (itemsReviewed = number of sentences/items/entries you actually checked) and all findings.`, { label: `review:${u.label}`, phase: 'Review', schema: REVIEW_SCHEMA }),
  async (rev, u) => {
    if (!rev) return { unit: u, review: null, findings: [] }
    const findings = rev.findings || []
    const heavy = findings.map((f, i) => ({ f, i })).filter((x) => x.f.severity === 'Critical' || x.f.severity === 'High')
    const light = findings.map((f, i) => ({ f, i })).filter((x) => x.f.severity === 'Medium' || x.f.severity === 'Low')
    const verdicts = new Array(findings.length).fill(null)
    const heavyJobs = heavy.map(({ f, i }) => async () => {
      const votes = await parallel([0, 1, 2].map((k) => () => agent(`${COMMON}\nYou are INDEPENDENT SKEPTIC #${k + 1}. Another reviewer reported the finding below. Try hard to REFUTE it: open the data file and quote what is really there, check the grammar/translation yourself, and for factual claims find a reliable source. Verdict "refuted" if the original is actually correct/acceptable, the finding misreads the data, or it is only a style preference; "adjusted" if real but the severity or correction should change (give them); "confirmed" if it stands as reported. If uncertain, prefer "refuted".\n\nFINDING (course ${u.course}):\n${JSON.stringify(f, null, 1)}`, { label: `verify#${k + 1}:${u.label}:${f.lesson}`, phase: 'Verify', schema: VERDICT })))
      const ok = votes.filter(Boolean)
      const real = ok.filter((v) => v.verdict !== 'refuted')
      const sev = real.map((v) => v.severity)
      verdicts[i] = { method: '3 skeptics', votes: ok, survives: real.length >= 2, severity: real.length >= 2 ? (sev.filter((s) => s === 'Critical').length >= 2 ? 'Critical' : sev.filter((s) => s === 'Critical' || s === 'High').length >= 2 ? 'High' : sev.filter((s) => s !== 'Low').length >= 2 ? 'Medium' : 'Low') : null }
    })
    const lightJob = async () => {
      if (!light.length) return
      const list = light.map(({ f }, k) => ({ index: k, ...f }))
      const b = await agent(`${COMMON}\nYou are an INDEPENDENT SKEPTIC. Another reviewer reported the Medium/Low findings below (course ${u.course}). For EACH one, open the data file, quote what is really there and try to REFUTE it. Verdict "refuted" if the original is actually correct/acceptable, misread, or only a style preference; "adjusted" if real but severity/correction should change; "confirmed" otherwise. Return one verdict per index.\n\nFINDINGS:\n${JSON.stringify(list, null, 1)}`, { label: `verify-batch:${u.label}`, phase: 'Verify', schema: BATCH_VERDICT })
      for (const v of (b && b.verdicts) || []) {
        const target = light[v.index]
        if (!target) continue
        verdicts[target.i] = { method: '1 skeptic', votes: [v], survives: v.verdict !== 'refuted', severity: v.verdict === 'refuted' ? null : v.severity }
      }
    }
    await parallel([...heavyJobs, lightJob])
    return { unit: u, review: { coverage: rev.coverage, knownDeferredSeen: rev.knownDeferredSeen || [] }, findings: findings.map((f, i) => ({ ...f, verification: verdicts[i] })) }
  },
)
const all = results.filter(Boolean)
const flat = all.flatMap((r) => r.findings)
log(`findings reported ${flat.length}, surviving ${flat.filter((f) => f.verification && f.verification.survives).length}, unverified ${flat.filter((f) => !f.verification).length}`)
return { units: all.map((r) => ({ course: r.unit.course, label: r.unit.label, reviewOk: !!r.review, coverage: r.review ? r.review.coverage : null, knownDeferredSeen: r.review ? r.review.knownDeferredSeen : null })), findings: flat.map((f) => ({ ...f })) }
