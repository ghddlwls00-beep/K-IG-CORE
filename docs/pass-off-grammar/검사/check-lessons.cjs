// PASS-OFF GRAMMAR lesson data check (data format v1.1, docs/pass-off-grammar/데이터-형식.md).
// Checks every content/lessons/passoff-grammar/*.json (with the server-only paid supplement put back) for:
//   format (blocks, ids, required fields), answer keys (select/choice/short in range),
//   targets present in every model answer and accepted answer, error patterns that would fire on a correct answer,
//   grammar tags (known tag, "challenge" consistent with later lessons' tags), STUDENT "exact" sentences equal to STUDENT,
//   forbidden UI wording, Hangul inside English, coverage of the book's sentences per topic,
//   and a decision for every book issue.
// usage: node docs/pass-off-grammar/검사/check-lessons.cjs [--topics 1,2,3] [--selftest]
// exit 1 when a problem is found. --selftest breaks copies of the data in memory and every break must be reported.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const LESSON_DIR = path.join(ROOT, "content", "lessons", "passoff-grammar");
const PRIVATE_DIR = path.join(ROOT, "content", "private", "passoff-grammar");
const STUDENT_DIR = path.join(ROOT, "content", "lessons", "student");
const DOC = path.join(ROOT, "docs", "pass-off-grammar");
const EXTRACT_DIR = path.join(DOC, "교재-추출");
const DECISION_DIR = path.join(DOC, "내용", "판정");
const TAG_FILE = path.join(DOC, "내용", "태그.json");

const argv = process.argv.slice(2);
const SELFTEST = argv.includes("--selftest");
const topicArg = argv.find((a, i) => argv[i - 1] === "--topics");
const ONLY_TOPICS = topicArg ? new Set(topicArg.split(",").map(Number)) : null;

// ---------- helpers ----------
const norm = (s) =>
  String(s ?? "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\(\s*\d+\s*과\s*\)/g, " ")
    .replace(/\((단수|복수)\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9'가-힣 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const words = (s) => ` ${norm(s)} `;
const hasHangul = (s) => /[가-힣]/.test(String(s ?? ""));
const FORBIDDEN_UI = [/원어민\s*음성/, /AI\s*음성/i];
// 데이터-형식 v1.3 — every field an item may carry (the internal ones — source · koSource · note · challengeNote — are never shown)
const COMMON_FIELDS = ["id", "bookRef", "fix", "source", "koSource", "note", "paidStudent", "speakAs", "clauseLabel"];
const ANCHOR_FIELDS = new Set([...COMMON_FIELDS, "en", "ko", "focus", "studentRef", "promptEn"]);
const SELECT_FIELDS = new Set([...COMMON_FIELDS, "kind", "instruction", "why", "reserve", "tokens", "answer", "optional", "labels", "labelAnswer", "sentence", "underline", "options"]);
const PRODUCE_FIELDS = new Set([...COMMON_FIELDS, "ko", "condition", "promptEn", "en", "accept", "targets", "errorPatterns", "tags", "challenge", "challengeTags", "challengeNote", "studentRef"]);
const FIX_FIELDS = new Set(["from", "fromKo", "field", "kind", "why"]);
const PATTERN_FIELDS = new Set(["match", "hint", "literal"]);
const expand = (s) =>
  ` ${norm(s)
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/n't\b/g, " not")
    .replace(/'m\b/g, " am")
    .replace(/'re\b/g, " are")
    .replace(/'ve\b/g, " have")
    .replace(/'ll\b/g, " will")
    .replace(/'d\b/g, " would")
    .replace(/\b(he|she|it|that|what|there|who|where|here)'s\b/g, "$1 is")} `;
const containsTarget = (text, group) =>
  group.some((alt) => {
    const a = norm(alt);
    if (!a) return false;
    return words(text).includes(` ${a} `) || expand(text).includes(` ${a} `) || expand(text).includes(expand(alt));
  });
const clone = (x) => JSON.parse(JSON.stringify(x));
// like grammarGrading.ts normalizeForComparison: contractions expanded ("it's" → "it is", so it's ≠ its), then
// punctuation and the remaining apostrophes removed
const gradeNorm = (s) => expand(s).replace(/'/g, "").replace(/\s+/g, " ").trim();
const gradeWords = (s) => ` ${gradeNorm(s)} `;
// the typed text: case, curly quotes, spacing and the final punctuation normalised; contractions and inner punctuation kept
const literalNorm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/, "")
    .trim();
// words as written: punctuation other than the apostrophe removed, contractions not expanded
const puncNorm = (s) => literalNorm(s).replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const puncWords = (s) => ` ${puncNorm(s)} `;

// ---------- load ----------
// The build script moves free-lesson paid STUDENT items to content/private/…/<id>.paid.json; put them back so
// the checks see the lesson a paying student sees (coverage would otherwise report those book sentences missing).
function restorePaid(data) {
  const f = path.join(PRIVATE_DIR, `${data.id}.paid.json`);
  if (!fs.existsSync(f)) return 0;
  const sup = JSON.parse(fs.readFileSync(f, "utf8"));
  const items = (sup.items || []).slice().sort((a, b) => a.at - b.at);
  let n = 0;
  for (const s of items) {
    const blk = (data.blocks || []).filter((b) => b.type === s.block)[s.nth || 0];
    if (!blk) throw new Error(`${data.id}: 보충 문항 ${s.item?.id} 의 블록 ${s.block}#${s.nth} 없음`);
    if (!Array.isArray(blk[s.list])) blk[s.list] = [];
    if (blk[s.list].some((x) => x.id === s.item.id)) continue; // already present in the lesson file
    blk[s.list].splice(Math.min(s.at, blk[s.list].length), 0, { ...s.item, _paidSupplement: true });
    n += 1;
  }
  return n;
}
function loadLessons() {
  if (!fs.existsSync(LESSON_DIR)) return [];
  return fs
    .readdirSync(LESSON_DIR)
    .filter((f) => /^pg\d{2}-\d+\.json$/.test(f))
    .sort()
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, f), "utf8"));
      const restored = restorePaid(data);
      return { file: f, data, restored };
    });
}
let EXTRACTION = null;
function loadExtraction() {
  if (EXTRACTION) return EXTRACTION;
  const topics = [];
  for (const f of fs.readdirSync(EXTRACT_DIR).filter((x) => /^g\d-p\d+-\d+\.json$/.test(x)).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(EXTRACT_DIR, f), "utf8"));
    for (const t of j.topics || []) {
      const num = Number(String(t.printedLabel || "").replace(/\D+/g, "")) || null;
      const sentences = [];
      const reviews = [];
      for (const s of t.sections || []) {
        for (const g of s.groups || []) for (const it of g.items || []) if (it.en) sentences.push({ page: it.page, en: it.en, kind: s.kind });
        for (const task of s.tasks || []) for (const it of task.items || []) reviews.push({ page: it.page || task.page, prompt: it.prompt, answer: it.answerFromBook });
      }
      const [p0, p1] = t.pages || [0, 0];
      const issues = (j.issues || []).filter((x) => x.page >= p0 && x.page <= p1);
      topics.push({ num, title: t.title, book: j.book, pages: [p0, p1], sentences, reviews, issues });
    }
  }
  EXTRACTION = topics;
  return topics;
}
function loadDecisions() {
  const out = [];
  if (!fs.existsSync(DECISION_DIR)) return out;
  for (const f of fs.readdirSync(DECISION_DIR).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(path.join(DECISION_DIR, f), "utf8"));
    const arr = Array.isArray(j) ? j : j.decisions || j.items || [];
    for (const d of arr) out.push({ ...d, _file: f });
  }
  return out;
}
function loadTags() {
  const j = JSON.parse(fs.readFileSync(TAG_FILE, "utf8"));
  const order = new Map(); // tag -> lesson index
  j.lessons.forEach((l, i) => l.tags.forEach((t) => order.set(t, i)));
  const lessonIndex = new Map(j.lessons.map((l, i) => [l.id, i]));
  return { base: new Set(j.base), order, lessonIndex };
}
let STUDENT = null;
function studentLesson(id) {
  STUDENT = STUDENT || new Map();
  if (STUDENT.has(id)) return STUDENT.get(id);
  const f = path.join(STUDENT_DIR, `${id}.json`);
  let v = null;
  if (fs.existsSync(f)) {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const en = [];
    const ko = [];
    for (const b of j.blocks || []) {
      if (b.type === "sentences") for (const it of b.items || []) en.push(String(it.text ?? ""));
      if (b.type === "paragraph" && b.lang === "ko") ko.push(String(b.text ?? ""));
    }
    v = { en, ko: ko.length === en.length ? ko : null };
  }
  STUDENT.set(id, v);
  return v;
}

// ---------- checks ----------
function checkLesson(lesson, problems, tags) {
  const L = lesson.data;
  const P = (msg) => problems.push(`${lesson.file}: ${msg}`);
  for (const k of ["id", "course", "title", "label", "menuLabel", "unit", "part", "order", "blocks"]) if (L[k] === undefined) P(`필수 필드 없음 ${k}`);
  if (L.course !== "passoff-grammar") P(`course 가 passoff-grammar 가 아님`);
  if (`${L.id}.json` !== lesson.file) P(`파일 이름과 id 불일치 ${L.id}`);
  const types = (L.blocks || []).map((b) => b.type);
  for (const t of ["anchors", "rule", "drill", "frame"]) if (types.filter((x) => x === t).length !== 1) P(`블록 ${t} 가 정확히 1개가 아님 (${types.join(",")})`);
  const ids = new Set();
  const addId = (id, letter) => {
    if (!new RegExp(`^${L.id}:${letter}\\d+$`).test(String(id))) P(`id 규칙 위반 ${id}`);
    if (ids.has(id)) P(`id 중복 ${id}`);
    ids.add(id);
  };
  const block = (t) => (L.blocks || []).find((b) => b.type === t) || {};
  const checkStudentRef = (it) => {
    const ref = it.studentRef;
    if (!ref || ref.kind !== "exact") return;
    const s = studentLesson(ref.lesson);
    if (!s) return P(`${it.id} studentRef ${ref.lesson} 파일 없음`);
    const i = s.en.indexOf(String(it.en));
    if (i < 0) return P(`${it.id} exact 인데 STUDENT ${ref.lesson} 에 같은 영어 문장 없음: ${it.en}`);
    if (s.ko && it.ko !== undefined && s.ko[i] !== it.ko) P(`${it.id} exact 인데 한국어가 STUDENT 판과 다름: "${it.ko}" ≠ "${s.ko[i]}"`);
  };
  const lessonIdx = tags.lessonIndex.get(L.id);
  if (lessonIdx === undefined) P(`태그.json 에 레슨 ${L.id} 없음`);
  const checkTags = (p) => {
    for (const t of p.tags || []) if (!tags.base.has(t) && !tags.order.has(t)) P(`${p.id} 모르는 태그 ${t}`);
    const later = (p.tags || []).filter((t) => !tags.base.has(t) && tags.order.has(t) && tags.order.get(t) > lessonIdx);
    const ct = p.challengeTags || [];
    if (later.length && !p.challenge) P(`${p.id} 뒤 레슨 태그 [${later.join(",")}] 가 있는데 challenge 아님`);
    if (p.challenge) {
      if (!ct.length) P(`${p.id} challenge 인데 challengeTags 없음`);
      for (const t of ct) if (tags.base.has(t) || !tags.order.has(t) || !(tags.order.get(t) > lessonIdx)) P(`${p.id} challengeTags ${t} 가 뒤 레슨 태그가 아님`);
    } else if (ct.length) P(`${p.id} challenge 아닌데 challengeTags 있음`);
  };

  const anchors = block("anchors").items || [];
  if (anchors.length < 1 || anchors.length > 8) P(`anchors ${anchors.length}개(1~8)`);
  for (const a of anchors) {
    addId(a.id, "a");
    if (!a.en || !a.ko) P(`${a.id} en/ko 없음`);
    if (hasHangul(a.en)) P(`${a.id} 영어에 한글`);
    checkStudentRef(a);
  }
  const rule = block("rule");
  if (!rule.discovery || !Array.isArray(rule.discovery.options) || rule.discovery.options.length < 2) P(`rule.discovery 불완전`);
  else if (!(rule.discovery.answer >= 0 && rule.discovery.answer < rule.discovery.options.length)) P(`rule.discovery.answer 범위 밖`);
  if (!Array.isArray(rule.points) || rule.points.length < 3 || rule.points.length > 5) P(`rule.points ${rule.points?.length}줄(3~5)`);
  if (!rule.koDiff) P(`rule.koDiff 없음`);
  if (!Array.isArray(rule.mistakes) || rule.mistakes.length < 1) P(`rule.mistakes 없음`);
  if (!rule.check || !Array.isArray(rule.check.options) || !(rule.check.answer >= 0 && rule.check.answer < rule.check.options.length)) P(`rule.check 불완전`);
  const drill = block("drill");
  const sel = drill.select || [];
  if (sel.filter((s) => !s.reserve).length < 4) P(`형태 찾기 ${sel.filter((s) => !s.reserve).length}개(4개 이상)`);
  for (const s of sel) {
    addId(s.id, "s");
    if (!s.instruction) P(`${s.id} instruction 없음`);
    if (s.kind === "select") {
      if (!Array.isArray(s.tokens) || !Array.isArray(s.answer) || s.answer.length < 1) P(`${s.id} select 불완전`);
      else {
        if (s.answer.some((i) => !(Number.isInteger(i) && i >= 0 && i < s.tokens.length))) P(`${s.id} 정답 토큰 번호 범위 밖`);
        if ((s.optional || []).some((i) => !(Number.isInteger(i) && i >= 0 && i < s.tokens.length))) P(`${s.id} optional 토큰 번호 범위 밖`);
        if ((s.optional || []).some((i) => s.answer.includes(i))) P(`${s.id} 같은 토큰이 정답이면서 optional`);
        if (hasHangul(s.tokens.join(" "))) P(`${s.id} 영어 토큰에 한글`);
        // src/lib/passoffTypes.ts: labelAnswer is the label text (string | string[]), one per answer token
        if (Array.isArray(s.labels)) {
          const la = Array.isArray(s.labelAnswer) ? s.labelAnswer : [s.labelAnswer];
          if (la.some((x) => typeof x !== "string" || !s.labels.includes(x))) P(`${s.id} labelAnswer 가 labels 안의 글자가 아님 ${JSON.stringify(s.labelAnswer)}`);
          if (Array.isArray(s.labelAnswer) && s.labelAnswer.length !== s.answer.length) P(`${s.id} labelAnswer 수(${s.labelAnswer.length})와 정답 토큰 수(${s.answer.length})가 다름`);
        } else if (s.labelAnswer != null) P(`${s.id} labels 없이 labelAnswer 있음`);
      }
    } else if (s.kind === "choice") {
      if (!Array.isArray(s.options) || !(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.options.length)) P(`${s.id} choice 정답 범위 밖`);
      if (new Set((s.options || []).map(norm)).size !== (s.options || []).length) P(`${s.id} choice 보기가 겹침`);
      for (const u of s.underline || []) if (!words(s.sentence).includes(` ${norm(u)} `)) P(`${s.id} 밑줄 "${u}" 이 문장에 없음`);
    } else if (s.kind === "short") {
      if (!Array.isArray(s.answer) || s.answer.length < 1 || s.answer.some((x) => !String(x).trim())) P(`${s.id} short 정답 없음`);
    } else P(`${s.id} kind 알 수 없음 ${s.kind}`);
  }
  const prods = drill.produce || [];
  if (prods.length < 1) P(`produce 0개`);
  const trans = drill.transfer || [];
  if (trans.length !== 2) P(`transfer ${trans.length}개(2개)`);
  for (const [arr, letter] of [[prods, "p"], [trans, "t"]]) {
    for (const p of arr) {
      addId(p.id, letter);
      if (!p.en) P(`${p.id} 모범 답 없음`);
      if (!p.ko && !p.promptEn) P(`${p.id} 문제(ko/promptEn) 없음`);
      if (hasHangul(p.en)) P(`${p.id} 영어에 한글`);
      for (const a of p.accept || []) if (hasHangul(a)) P(`${p.id} 허용 답에 한글 "${a}"`);
      if (!Array.isArray(p.accept)) P(`${p.id} accept 배열 아님`);
      if (!Array.isArray(p.targets)) P(`${p.id} targets 배열 아님`);
      if (!Array.isArray(p.tags) || p.tags.length < 1) P(`${p.id} tags 없음`);
      for (const g of p.targets || []) {
        if (!Array.isArray(g) || g.length < 1) { P(`${p.id} targets 묶음이 비었음`); continue; }
        if (!containsTarget(p.en, g)) P(`${p.id} 모범 답에 목표형 없음 [${g.join("|")}]`);
        for (const a of p.accept || []) if (!containsTarget(a, g)) P(`${p.id} 허용 답 "${a}" 에 목표형 없음 [${g.join("|")}]`);
      }
      // An error pattern that also matches a correct answer fires on every wrong answer sharing that correct part,
      // so its hint points at the wrong thing. Compared the way GRAMMAR I·II grade (grammarGrading.ts
      // normalizeLiteral: punctuation and apostrophes removed) until src/lib/passoffGrading.ts exists.
      // A `literal: true` pattern is a WHOLE wrong answer compared as typed (데이터-형식 v1.2): case and punctuation
      // ignored, contractions NOT expanded, checked before the accepted answers. It is for contraction-only errors
      // ("Yes, it's." · "Is not this a hat?") that the two-way contraction expansion would make equal to a right answer.
      // Punctuation never decides (the other sections ignore it, and a mic transcript's commas are the recogniser's).
      for (const e of p.errorPatterns || []) {
        if (!e || !String(e.match || "").trim() || !String(e.hint || "").trim()) { P(`${p.id} errorPatterns 항목 불완전`); continue; }
        for (const ok of [p.en, ...(p.accept || [])]) {
          if (e.literal) {
            if (puncNorm(ok) === puncNorm(e.match)) P(`${p.id} 오답 패턴(literal) "${e.match}" 이 정답 "${ok}" 와 같음(문장부호만 다르면 틀린 답이 아님)`);
          } else if (gradeWords(ok).includes(` ${gradeNorm(e.match)} `)) {
            const hint = puncWords(ok).includes(` ${puncNorm(e.match)} `)
              ? " (문장부호를 무시하면 정답의 일부와 같음 — 틀린 곳이 드러나게 더 길게 쓰거나 뺌)"
              : " (축약형만 다름 — 틀린 답 전체를 literal: true 로)";
            P(`${p.id} 오답 패턴 "${e.match}" 이 정답 "${ok}" 에도 걸림${hint}`);
          }
        }
      }
      checkTags(p);
      checkStudentRef(p);
      if (letter === "t" && !p.source) P(`${p.id} source 없음`);
    }
  }
  // v1.3: fields outside the data format are not allowed (the screen would ignore them, or a typo hides data)
  const allowed = (it, list, what) => {
    for (const k of Object.keys(it || {})) if (!list.has(k) && !k.startsWith("_")) P(`${it.id || what} 형식에 없는 필드 ${k}`);
  };
  for (const a of anchors) allowed(a, ANCHOR_FIELDS);
  for (const s of sel) allowed(s, SELECT_FIELDS);
  for (const p of [...prods, ...trans]) {
    allowed(p, PRODUCE_FIELDS);
    if (p.fix) allowed(p.fix, FIX_FIELDS, `${p.id}.fix`);
    for (const e of p.errorPatterns || []) allowed(e, PATTERN_FIELDS, `${p.id}.errorPatterns`);
    // a hint that ends with the whole model answer gives the answer away (규칙: 스스로 고치게)
    for (const e of p.errorPatterns || []) if (p.en && gradeNorm(p.en).split(" ").length >= 2 && gradeWords(e.hint).includes(` ${gradeNorm(p.en)} `)) P(`${p.id} 오답 힌트가 모범 답을 그대로 말함`);
  }
  for (const a of anchors) if (a.fix) allowed(a.fix, FIX_FIELDS, `${a.id}.fix`);
  for (const s of sel) if (s.fix) allowed(s.fix, FIX_FIELDS, `${s.id}.fix`);
  // v1.3: ③ and ② come before ④ — they must not show the English of a ④ sentence that is not a ① anchor,
  // and ⑤'s "처음 보는 문장" must not appear anywhere earlier in the lesson.
  const anchorSet = new Set(anchors.map((a) => gradeNorm(a.en)));
  const hidden = new Map(prods.filter((p) => !anchorSet.has(gradeNorm(p.en))).map((p) => [gradeNorm(p.en), p.id]));
  const shows = (text) => hidden.get(gradeNorm(text));
  for (const s of sel) {
    const shown = shows(s.sentence) || shows((s.tokens || []).join(" "));
    if (shown && !s.reserve) P(`${s.id} ③ 문장이 ④ ${shown} 의 정답을 먼저 보여 줌`);
  }
  for (const w of [...(rule.worked || []), ...(rule.mistakes || []).map((m) => m.right)]) {
    const shown = shows(w);
    if (shown) P(`② 설명 카드가 ④ ${shown} 의 정답을 먼저 보여 줌`);
  }
  const earlier = new Set([...anchors.map((a) => a.en), ...prods.map((p) => p.en), ...sel.map((s) => s.sentence || (s.tokens || []).join(" ")), ...(rule.worked || []), ...(rule.mistakes || []).map((m) => m.right)].filter(Boolean).map(gradeNorm));
  for (const t of trans) if (earlier.has(gradeNorm(t.en))) P(`${t.id} ⑤ 처음 보는 문장이 레슨 앞에 이미 나옴`);
  const frame = block("frame");
  addId(frame.id, "f");
  if (!/_{2,}/.test(String(frame.template || ""))) P(`frame.template 에 빈칸 없음`);
  const allText = JSON.stringify(L);
  for (const re of FORBIDDEN_UI) if (re.test(allText)) P(`금지 문구 ${re}`);
  return { anchors: anchors.length, select: sel.length, produce: prods.length, transfer: trans.length, paidRestored: lesson.restored || 0 };
}

function unitTexts(lessonsOfUnit) {
  const have = new Set();
  for (const L of lessonsOfUnit) {
    for (const b of L.blocks || []) {
      const push = (x) => x && have.add(norm(x));
      if (b.type === "anchors") for (const a of b.items || []) { push(a.en); push(a.fix?.from); }
      if (b.type === "drill") {
        for (const p of [...(b.produce || []), ...(b.transfer || [])]) { push(p.en); push(p.promptEn); push(p.fix?.from); for (const a of p.accept || []) push(a); }
        for (const s of b.select || []) { push(s.sentence); push((s.tokens || []).join(" ")); push(s.fix?.from); }
      }
    }
  }
  return have;
}

function coverage(lessons, topics, decisions, problems, only) {
  const byUnit = new Map();
  for (const l of lessons) {
    const u = l.data.unit;
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(l.data);
  }
  const report = [];
  const excluded = new Set(decisions.filter((d) => d.coverage === "excluded").map((d) => norm(d.text)));
  for (const t of topics) {
    if (!t.num || !byUnit.has(t.num)) continue;
    if (only && !only.has(t.num)) continue;
    const have = unitTexts(byUnit.get(t.num));
    let missing = 0;
    for (const s of t.sentences) {
      const n = norm(s.en);
      if (n.length < 6) continue;
      if (have.has(n) || excluded.has(n)) continue;
      // a printed sentence that the builders fixed shows up as fix.from; also accept containment (split/merged lines)
      if ([...have].some((h) => h.includes(n) || (n.length > 20 && n.includes(h) && h.length > 20))) continue;
      missing += 1;
      problems.push(`TOPIC ${t.num} 교재 문장 빠짐 p${s.page}: ${s.en}`);
    }
    let undecided = 0;
    for (const is of t.issues) {
      const key = norm(is.text);
      const hit = decisions.some((d) => d.page === is.page && (norm(d.text) === key || norm(d.text).includes(key.slice(0, 40)) || key.includes(norm(d.text).slice(0, 40))));
      if (!hit) { undecided += 1; problems.push(`TOPIC ${t.num} 오류 후보 판정 없음 p${is.page}: ${String(is.text).slice(0, 80)}`); }
    }
    report.push({ topic: t.num, title: t.title, bookSentences: t.sentences.length, missing, issues: t.issues.length, undecided });
  }
  return report;
}

function run(lessons, decisions, only) {
  const problems = [];
  const tags = loadTags();
  const counts = lessons.map((l) => ({ id: l.data.id, ...checkLesson(l, problems, tags) }));
  const cov = coverage(lessons, loadExtraction(), decisions || loadDecisions(), problems, only === undefined ? ONLY_TOPICS : only);
  return { problems, counts, cov };
}

// ---------- selftest: every deliberate break must be reported ----------
function selftest(lessons) {
  const decisions = loadDecisions();
  const topics = loadExtraction();
  const base = run(lessons, decisions, null);
  const baseSet = new Set(base.problems);
  const fresh = (r) => r.problems.filter((p) => !baseSet.has(p));
  const result = {};
  const firstWith = (pred) => {
    for (let li = 0; li < lessons.length; li += 1) {
      const drill = lessons[li].data.blocks.find((b) => b.type === "drill");
      for (const list of ["produce", "transfer"]) for (let i = 0; i < (drill[list] || []).length; i += 1) if (pred(drill[list][i])) return { li, list, i };
    }
    return null;
  };
  const breakOne = (name, where, mutate, expect) => {
    if (!where) { result[name] = "대상 없음(시험 못 함)"; return; }
    const copy = clone(lessons);
    const drill = copy[where.li].data.blocks.find((b) => b.type === "drill");
    const item = drill[where.list][where.i];
    mutate(item, copy[where.li].data);
    const r = run(copy, decisions, null);
    result[name] = fresh(r).some((p) => expect(p, item)) ? "잡음" : "놓침";
  };

  // 1) removing a book sentence from every place in its unit must be reported missing — tried for every such item
  let required = 0;
  let detected = 0;
  const missed = [];
  for (const t of topics) {
    const unitLessons = lessons.filter((l) => l.data.unit === t.num);
    if (!t.num || !unitLessons.length) continue;
    const bookNorm = new Map(t.sentences.map((s) => [norm(s.en), s]));
    for (const l of unitLessons) {
      const drill = l.data.blocks.find((b) => b.type === "drill");
      for (const list of ["produce", "transfer"]) {
        for (let i = 0; i < (drill[list] || []).length; i += 1) {
          const n = norm(drill[list][i].en);
          if (!bookNorm.has(n) || n.length < 6) continue;
          const copy = clone(lessons);
          const cl = copy.find((x) => x.file === l.file);
          cl.data.blocks.find((b) => b.type === "drill")[list].splice(i, 1);
          // independent expectation: the sentence text no longer appears anywhere in the unit's lesson JSON
          const unitJson = norm(copy.filter((x) => x.data.unit === t.num).map((x) => JSON.stringify(x.data.blocks)).join(" \n "));
          if (unitJson.includes(n)) continue;
          if (decisions.some((d) => d.coverage === "excluded" && norm(d.text) === n)) continue;
          required += 1;
          const r = run(copy, decisions, new Set([t.num]));
          if (r.problems.some((p) => p.includes("빠짐") && norm(p).includes(n))) detected += 1;
          else missed.push(`${drill[list][i].id}: ${drill[list][i].en}`);
        }
      }
    }
  }
  result.droppedBookSentence = required === 0 ? "대상 없음(시험 못 함)" : detected === required ? `잡음 ${detected}/${required}` : `놓침 ${required - detected}/${required}: ${missed.slice(0, 3).join(" | ")}`;

  // 2) an issue whose decision is removed must be reported undecided
  let issueCase = null;
  for (const t of topics) {
    if (!t.num || !lessons.some((l) => l.data.unit === t.num)) continue;
    for (const is of t.issues) {
      const key = norm(is.text);
      const match = (d) => d.page === is.page && (norm(d.text) === key || norm(d.text).includes(key.slice(0, 40)) || key.includes(norm(d.text).slice(0, 40)));
      if (decisions.some(match)) { issueCase = { is, rest: decisions.filter((d) => !match(d)) }; break; }
    }
    if (issueCase) break;
  }
  if (!issueCase) result.removedDecision = "대상 없음(시험 못 함)";
  else {
    const r = run(lessons, issueCase.rest, null);
    result.removedDecision = fresh(r).some((p) => p.includes("판정 없음") && p.includes(`p${issueCase.is.page}`)) ? "잡음" : "놓침";
  }

  // 3) single-item breaks
  breakOne("acceptWithoutTarget", firstWith((p) => (p.targets || []).length), (p) => p.accept.push("zzz qqq"), (msg) => msg.includes('"zzz qqq"'));
  breakOne("modelWithoutTarget", firstWith((p) => (p.targets || []).length), (p) => { p.targets = [["zzzq"]]; }, (msg, p) => msg.includes(p.id) && msg.includes("모범 답에 목표형 없음"));
  breakOne("errorPatternHitsCorrect", firstWith((p) => p.en && norm(p.en).split(" ").length >= 2), (p) => { p.errorPatterns = [...(p.errorPatterns || []), { match: norm(p.en).split(" ").slice(0, 2).join(" "), hint: "x" }]; }, (msg, p) => msg.includes(p.id) && msg.includes("오답 패턴"));
  breakOne("literalEqualsCorrect", firstWith((p) => p.en && puncNorm(p.en).split(" ").length >= 2), (p) => { const w = puncNorm(p.en).split(" "); p.errorPatterns = [...(p.errorPatterns || []), { match: `${w[0]}, ${w.slice(1).join(" ")}!`, hint: "x", literal: true }]; }, (msg, p) => msg.includes(p.id) && msg.includes("(literal)"));
  breakOne("laterTagWithoutChallenge", firstWith((p) => !p.challenge && p.id.startsWith("pg01-")), (p) => { p.tags = [...p.tags, "subordinating-conjunction"]; }, (msg, p) => msg.includes(p.id) && msg.includes("challenge 아님"));
  breakOne("unknownTag", firstWith(() => true), (p) => { p.tags = [...p.tags, "no-such-tag"]; }, (msg) => msg.includes("no-such-tag"));
  breakOne("hangulInEnglish", firstWith(() => true), (p) => { p.en = p.en + " 가"; }, (msg, p) => msg.includes(p.id) && msg.includes("영어에 한글"));
  breakOne("forbiddenWording", firstWith(() => true), (p) => { p.ko = (p.ko || "") + " 원어민 음성"; }, (msg) => msg.includes("금지 문구"));
  {
    const copy = clone(lessons);
    const L = copy[0].data;
    const drill = L.blocks.find((b) => b.type === "drill");
    const s = drill.select.find((x) => x.kind === "select" || x.kind === "choice");
    if (!s) result.badAnswerIndex = "대상 없음(시험 못 함)";
    else {
      if (s.kind === "choice") s.answer = 99; else s.answer = [999];
      result.badAnswerIndex = fresh(run(copy, decisions, null)).some((p) => p.includes(s.id) && p.includes("범위 밖")) ? "잡음" : "놓침";
    }
  }
  const breakSelect = (name, pred, mutate, expectWord) => {
    const copy = clone(lessons);
    for (const l of copy) {
      const s = (l.data.blocks.find((b) => b.type === "drill").select || []).find(pred);
      if (!s) continue;
      mutate(s);
      result[name] = fresh(run(copy, decisions, null)).some((p) => p.includes(s.id) && p.includes(expectWord)) ? "잡음" : "놓침";
      return;
    }
    result[name] = "대상 없음(시험 못 함)";
  };
  breakOne("unknownField", firstWith(() => true), (p) => { p.reject = ["x"]; }, (msg, p) => msg.includes(p.id) && msg.includes("형식에 없는 필드 reject"));
  breakOne("hintGivesAnswer", firstWith((p) => gradeNorm(p.en).split(" ").length >= 2), (p) => { p.errorPatterns = [...(p.errorPatterns || []), { match: "zzqq", hint: `이렇게 써요: ${p.en}` }]; }, (msg, p) => msg.includes(p.id) && msg.includes("힌트가 모범 답"));
  {
    // ③ showing a ④ answer, and ⑤ appearing earlier — on the first lesson that has a non-anchor produce item
    let target = null;
    lessons.forEach((l, li) => {
      if (target) return;
      const blocks = l.data.blocks;
      const anchorsN = new Set((blocks.find((b) => b.type === "anchors").items || []).map((a) => gradeNorm(a.en)));
      const drill = blocks.find((b) => b.type === "drill");
      const pi = (drill.produce || []).findIndex((p) => !anchorsN.has(gradeNorm(p.en)));
      const si = (drill.select || []).findIndex((s) => s.kind === "choice" && !s.reserve);
      if (pi >= 0 && si >= 0 && (drill.transfer || []).length) target = { li, pi, si };
    });
    if (!target) { result.selectShowsProduce = "대상 없음(시험 못 함)"; result.transferSeenBefore = "대상 없음(시험 못 함)"; }
    else {
      const copy = clone(lessons);
      const drill = copy[target.li].data.blocks.find((b) => b.type === "drill");
      const s = drill.select[target.si];
      s.sentence = drill.produce[target.pi].en;
      result.selectShowsProduce = fresh(run(copy, decisions, null)).some((p) => p.includes(s.id) && p.includes("정답을 먼저")) ? "잡음" : "놓침";
      const copy2 = clone(lessons);
      const drill2 = copy2[target.li].data.blocks.find((b) => b.type === "drill");
      drill2.transfer[0].en = drill2.produce[target.pi].en;
      result.transferSeenBefore = fresh(run(copy2, decisions, null)).some((p) => p.includes(drill2.transfer[0].id) && p.includes("처음 보는 문장")) ? "잡음" : "놓침";
    }
  }
  breakSelect("labelAnswerAsIndex", (s) => Array.isArray(s.labels) && s.answer?.length === 1 && [].concat(s.labelAnswer).every((x) => typeof x === "string"), (s) => { s.labelAnswer = [0]; }, "labelAnswer");
  breakSelect("underlineNotInSentence", (s) => s.kind === "choice" && s.sentence, (s) => { s.underline = ["zzzq"]; }, "밑줄");
  {
    let hit = null;
    lessons.forEach((l, li) => {
      if (hit) return;
      const a = (l.data.blocks.find((b) => b.type === "anchors").items || []).findIndex((x) => x.studentRef?.kind === "exact");
      if (a >= 0) hit = { li, a };
    });
    if (!hit) result.studentExactMismatch = "대상 없음(시험 못 함)";
    else {
      const copy = clone(lessons);
      const it = copy[hit.li].data.blocks.find((b) => b.type === "anchors").items[hit.a];
      it.en = it.en.replace(/\.$/, "") + " today.";
      result.studentExactMismatch = fresh(run(copy, decisions, null)).some((p) => p.includes(it.id) && p.includes("STUDENT")) ? "잡음" : "놓침";
    }
  }
  const ok = Object.values(result).every((v) => String(v).startsWith("잡음"));
  console.log(JSON.stringify({ selftest: result, pass: ok }, null, 1));
  return ok;
}

const lessons = loadLessons();
if (SELFTEST) {
  if (!lessons.length) { console.log("SELFTEST: 레슨 파일이 없어 시험 불가"); process.exit(1); }
  process.exit(selftest(lessons) ? 0 : 1);
}
const r = run(lessons);
console.log(JSON.stringify({ lessons: r.counts.length, paidRestored: r.counts.reduce((a, c) => a + c.paidRestored, 0), coverage: r.cov, problems: r.problems.length }, null, 1));
for (const p of r.problems.slice(0, 300)) console.log(" - " + p);
if (r.problems.length > 300) console.log(` … 외 ${r.problems.length - 300}건`);
process.exit(r.problems.length ? 1 : 0);
