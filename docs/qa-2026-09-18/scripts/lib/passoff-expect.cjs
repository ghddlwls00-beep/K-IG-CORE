/**
 * PASS-OFF GRAMMAR — what a lesson page must show, say and accept, from the DATA through the app's own functions
 * (회귀 점검 1002 단계 0 · passoff-sweep — drive-passoff.cjs 가 씀).
 *
 * lib/expectations.cjs 의 expected() 에는 passoff-grammar 갈래가 없다(texts 0 · answers 0 — drive-generic 이 이 과정을 돌아도
 * '기대 0 / 있음 0' 이 되는 까닭). 여기서 따로 만든다 — 페이지가 화면에 넘기는 것과 같은 길로:
 *   레슨 파일 → (이용권이면) 서버 전용 보충의 유료 STUDENT 문항을 제자리에(src/lib/passoffSupplement.ts attachPaidItems)
 *   → 화면이 받는 블록만(src/lib/passoffView.ts viewBlocks — reserve 문항 · 기록용 칸 뺌) — src/lib/passoffContent.ts 와 같은 차례.
 * 화면 글은 쪽마다 한글 표기(src/lib/koreanGloss.ts koreanOnScreen — 'Busan' → '부산', 2026-10-02 밤부터 한글만)를 거친 꼴.
 * 채점에 넣는 답: 모범 답(en · 짧은 답 answer[0]) 그대로 · 또는 화면대로 한글로 쓴 꼴(koreanOnScreen 을 거친 같은 답 — 앱은
 * romanForGrading 으로 되돌려 채점). 소리: 문항의 speakAs 또는 en → lessonSpeechForm → (speech.ts cleanText 의) vocaSpeechForm →
 * unifiedSpeechPath — scripts/lib/spoken-texts.cjs 와 expectations.cjs addClip 과 같은 길.
 *
 * 깨기(기대 쪽 — 다시 판정에서만): opts.break
 *   "expect-text" : 첫 예문의 한국어 기대 글 끝에 ' (깨기)' 를 붙임 → 그 글은 화면에 없으니 '없음' 1 이 나와야
 *   "gloss-off"   : 한글 표기를 거치지 않은 기대(영어 철자 그대로) → 표기 표에 든 강의(pg01-1 …)는 '없음' 이 나와야
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");

const COURSE = "passoff-grammar";
const supplementMod = loadTs(path.join(REPO, "src/lib/passoffSupplement.ts"));
const viewMod = loadTs(path.join(REPO, "src/lib/passoffView.ts"));
const glossMod = loadTs(path.join(REPO, "src/lib/koreanGloss.ts"));
const speechFormMod = loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts"));
const vocaSpeech = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const unified = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const grading = loadTs(path.join(REPO, "src/lib/passoffGrading.ts"));
const lessonMod = loadTs(path.join(REPO, "src/lib/passoffLesson.ts"));
for (const [name, mod, fn] of [["passoffSupplement", supplementMod, "attachPaidItems"], ["passoffView", viewMod, "viewBlocks"], ["koreanGloss", glossMod, "koreanOnScreen"], ["lessonSpeechForm", speechFormMod, "lessonSpeechForm"], ["vocaSpeech", vocaSpeech, "vocaSpeechForm"], ["unifiedSpeech", unified, "unifiedSpeechPath"], ["passoffGrading", grading, "expectedLabel"], ["passoffLesson", lessonMod, "cutSets"]]) {
  if (typeof mod[fn] !== "function") throw new Error(`passoff-expect: ${name}.${fn} 를 불러오지 못함 — 빈 기대로 통과하지 않게 멈춤`);
}

const validRoutes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const courseIndex = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", `${COURSE}.json`), "utf8"));

const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const lessonFile = (id) => path.join(REPO, "content/lessons", COURSE, `${id}.json`);
const privateFile = (id) => path.join(REPO, "content/private", COURSE, `${id}.paid.json`);

function pages() {
  return (validRoutes.lessons[COURSE] || []).map((id) => ({ course: COURSE, id, url: `/${COURSE}/${id}` }));
}

/** prev/next as the end bar draws them (expectations.cjs neighbours — main lessons in course order) */
function neighbours() {
  const mains = (courseIndex.lessons || []).filter((l) => l.variant === "main");
  const map = {};
  mains.forEach((l, i) => { map[l.id] = { prev: i > 0 ? mains[i - 1].id : null, next: i < mains.length - 1 ? mains[i + 1].id : null }; });
  return map;
}

/** every romanised spelling the gloss table knows (all pages) — for the 'Busan(부산)' form anywhere */
const ALL_SPELLINGS = [...new Set(Object.values(glossMod.KOREAN_GLOSS_PAGES || {}).flat().map(([w]) => w))];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Romanised Korean words left on screen: on this lesson, any spelling of its gloss table (whole word, exact case — the app
 * replaces every one it draws); anywhere, a spelling of the table followed by its Hangul in brackets ('Busan(부산)' — the
 * form before 2026-10-02 night, now wrong).
 */
function romanOnScreen(lessonKey, text) {
  const hits = [];
  const t = String(text || "");
  const own = (glossMod.KOREAN_GLOSS_PAGES[lessonKey] || []).map(([w]) => w).sort((a, b) => b.length - a.length);
  if (own.length) {
    const re = new RegExp(`(^|[^A-Za-z0-9])(${own.map(esc).join("|")})(?![A-Za-z0-9])`, "g");
    let m;
    while ((m = re.exec(t))) hits.push({ kind: "romanized", text: t.slice(Math.max(0, m.index - 15), m.index + m[0].length + 15).replace(/\s+/g, " ") });
  }
  const reB = new RegExp(`(^|[^A-Za-z0-9])(${ALL_SPELLINGS.sort((a, b) => b.length - a.length).map(esc).join("|")})\\s?\\([가-힣]+\\)`, "g");
  let m;
  while ((m = reB.exec(t))) hits.push({ kind: "spelling(한글)", text: m[0].trim() });
  return hits;
}

/**
 * The lesson as a page hands it to PassoffLearningView, and everything the driver needs.
 *   licensed: true  — a licence that opens the course (paid STUDENT items of a free preview put back, as passoffContent.ts)
 *             false — no licence (a free preview page shows '이용권이 있으면 N문장 더' instead)
 */
function expectedPassoff(id, { licensed = true, brk = null } = {}) {
  const file = lessonFile(id);
  if (!fs.existsSync(file)) return { missingFile: true, texts: [] };
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  const supplement = fs.existsSync(privateFile(id)) ? JSON.parse(fs.readFileSync(privateFile(id), "utf8")) : null;
  const paid = supplement && Array.isArray(supplement.items) ? supplement.items : [];
  const raw = licensed && paid.length ? supplementMod.attachPaidItems(lesson.blocks, paid) : lesson.blocks;
  const blocks = viewMod.viewBlocks(raw);
  const key = `${COURSE}/${id}`;
  const gloss = brk === "gloss-off" ? (t) => String(t == null ? "" : t) : (t) => glossMod.koreanOnScreen(key, String(t == null ? "" : t));
  const graded = (t) => glossMod.romanForGrading(key, t);

  const anchors = blocks.flatMap((b) => (b.type === "anchors" ? b.items : []));
  const rule = blocks.find((b) => b.type === "rule") || null;
  const drills = blocks.filter((b) => b.type === "drill");
  const forms = drills.flatMap((d) => d.select || []).filter((s) => !s.reserve);
  const produce = drills.flatMap((d) => d.produce || []);
  const transfers = drills.flatMap((d) => d.transfer || []);
  const frame = blocks.find((b) => b.type === "frame") || null;
  const sets = lessonMod.cutSets(produce);

  const texts = [];
  const add = (step, kind, t) => { const c = clean(t); if (c.length >= 2) texts.push({ step, kind, text: c }); };
  for (const a of anchors) {
    add(1, "anchor-ko", a.ko);
    if (a.promptEn) add(1, "anchor-prompt", gloss(a.promptEn));
    add(1, "anchor-en", gloss(a.en));
  }
  if (rule) {
    const d = rule.discovery;
    if (d) {
      add(2, "discovery-q", gloss(d.question));
      for (const o of d.options || []) add(2, "discovery-option", gloss(o));
      if (d.why) add(2, "discovery-why", gloss(d.why));
    }
    add(2, "rule-title", gloss(rule.title));
    for (const p of rule.points || []) add(2, "rule-point", gloss(p));
    if (rule.table && rule.table.columns && rule.table.columns.length) {
      for (const c of rule.table.columns) add(2, "rule-table", gloss(c));
      for (const r of rule.table.rows || []) for (const cell of r) add(2, "rule-table", gloss(cell));
    }
    if (rule.koDiff) add(2, "rule-kodiff", gloss(rule.koDiff));
    for (const m of rule.mistakes || []) { add(2, "rule-wrong", gloss(m.wrong)); add(2, "rule-right", gloss(m.right)); if (m.why) add(2, "rule-mistake-why", gloss(m.why)); }
    for (const w of rule.worked || []) add(2, "rule-worked", gloss(w));
    if (rule.terms && rule.terms.length) add(2, "rule-terms", `용어: ${rule.terms.map((t) => `${t.now}(교재: ${t.book})`).join(" · ")}`);
    if (rule.check) {
      add(2, "check-q", gloss(rule.check.question));
      for (const o of rule.check.options || []) add(2, "check-option", gloss(o));
      if (rule.check.why) add(2, "check-why", gloss(rule.check.why));
    }
  }
  for (const f of forms) {
    add(3, "form-instruction", gloss(f.instruction));
    if (f.kind === "select") for (const t of f.tokens) { if (/[A-Za-z0-9]/.test(t)) add(3, "form-token", gloss(t)); }
    if (f.kind === "choice") { if (f.sentence) add(3, "form-sentence", gloss(f.sentence)); for (const o of f.options) add(3, "form-option", gloss(o)); }
    if (f.kind === "short" && f.sentence) add(3, "form-sentence", gloss(f.sentence));
    if (f.why) add(3, "form-why", gloss(f.why));
  }
  for (const [step, list] of [[4, produce], [5, transfers]]) {
    for (const p of list) {
      add(step, "compose-ko", p.ko);
      if (p.promptEn) add(step, "compose-prompt", gloss(p.promptEn));
      if (p.condition) add(step, "compose-condition", gloss(p.condition));
      add(step, "compose-en", gloss(p.en));
    }
  }
  if (frame) {
    if (frame.ko) add(5, "frame-ko", frame.ko);
    for (const part of lessonMod.frameParts(frame.template)) if (part && part.trim()) add(5, "frame-part", gloss(part));
  }
  if (brk === "expect-text" && texts.length) texts[0] = { ...texts[0], text: `${texts[0].text} (깨기)` };

  /** the clip a speak button of this item must ask for (spoken-texts.cjs passoff 갈래 → expectations.cjs addClip) */
  const clipOf = (it) => {
    const spoken = typeof it.speakAs === "string" && it.speakAs.trim() ? it.speakAs : it.en;
    const said = clean(vocaSpeech.vocaSpeechForm(speechFormMod.lessonSpeechForm(key, spoken)));
    return unified.unifiedSpeechPath(said);
  };
  /** the answers to type: as the lesson spells them, or as the screen draws them (a Korean word in Hangul) — null when the same */
  const answerForms = (text) => { const shown = glossMod.koreanOnScreen(key, text); return { written: text, hangul: shown !== text ? shown : null }; };

  return {
    id, key, lesson, licensed, paidCount: paid.length,
    lockedExtraSentences: new Set(paid.map((e) => e.item && e.item.en).filter((en) => typeof en === "string" && en.trim())).size,
    anchors, rule, forms, produce, transfers, frame, sets, texts,
    gloss, graded, clipOf, answerForms,
    expectedLabel: (item, i) => grading.expectedLabel(item, i),
    glossTable: (glossMod.KOREAN_GLOSS_PAGES[key] || []).map(([w, h]) => `${w}→${h}`),
    stepNames: ["예문", "문법 설명", "찾기", "영작", "마무리"],
  };
}

/**
 * Content judged against the texts the driver saw (each snapshot of <main>'s text as the steps were walked).
 * Returns { expected, found, present, missing:[{kind,step,text}], roman:[…] }.
 */
function judgeContent(exp, seenTexts) {
  const hay = seenTexts.map((t) => clean(typeof t === "string" ? t : t.text)).join("\n");
  const missing = exp.texts.filter((t) => !hay.includes(t.text));
  const roman = [];
  for (const t of seenTexts) for (const h of romanOnScreen(exp.key, typeof t === "string" ? t : t.text)) roman.push({ step: typeof t === "string" ? null : t.step, ...h });
  const uniq = [...new Map(roman.map((r) => [`${r.kind}|${r.text}`, r])).values()];
  return { expected: exp.texts.length, found: exp.texts.length - missing.length, present: exp.texts.length - missing.length, missing, roman: uniq };
}

module.exports = { COURSE, pages, neighbours, expectedPassoff, judgeContent, romanOnScreen, clean, ALL_SPELLINGS, unified };
