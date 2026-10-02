// PASS-OFF GRAMMAR lesson data check (data format v1.7, docs/pass-off-grammar/데이터-형식.md).
// Checks every content/lessons/passoff-grammar/*.json (with the server-only paid supplement put back) for:
//   format (blocks, ids, required fields, fields outside the format), answer keys (select/choice/short in range),
//   targets present in every model answer and accepted answer — judged by the real grader, typed and spoken —,
//   error patterns that would fire on a correct answer or can never fire (hidden by an earlier one), hints that give
//   the answer, duplicate options (as shown), grammar tags ("challenge" consistent with later lessons' tags), STUDENT
//   "exact" sentences equal to STUDENT, ③/② showing a ④ answer, ⑤ seen before (in the lesson or an earlier lesson),
//   corrected English shown again elsewhere, forbidden UI wording, Hangul inside English, coverage of the book's
//   sentences per topic, and a decision for every book issue (by page range and by the topics its `where` names).
//   Warnings (not failures): a card or ③ that shows a hidden ④ answer's key chunk.
// usage: node docs/pass-off-grammar/검사/check-lessons.cjs [--topics 1,2,3] [--warnings] [--selftest]
// exit 1 when a problem is found. --selftest breaks copies of the data in memory and every break must be reported
// (and every "no false alarm" case must stay quiet).
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
// words that carry grammar, not content (passoffGrading.ts FUNCTION_WORDS, copied) — for the chunk warning only
const FUNCTION_WORDS = new Set(("a an the am is are was were be been being have has had do does did can could will would shall should may might must " +
  "not never no nor and or but so yet if unless since though although because while after before until as that whether than then this these those " +
  "i me my mine you your yours he him his she her hers it its we us our ours they them their theirs who whom whose which what where when why how " +
  "in on at for to from with by of into out up down off over under about through onto some any much many more most all each every both " +
  "there here very too also just only").split(" "));
// Chunk warnings the lead session looked at and kept (2026-09-28): the card or ③ shows the pattern it teaches, not this
// item's own words. A change to the item or to the card text brings the warning back (the key holds the chunk).
const CHUNK_OK = new Set([
  "pg03-3:p8 to take care of", // 구동사 표의 take care of
  "pg04-2:p5 my brother likes", // 규칙 확인의 다른 문장(I like soccer, ___ my brother likes baseball.)
  "pg06-1:p11 give me a glass of", // 단위 명사 풀이 예(Please give me a glass of milk.)
  "pg07-4:p13 no one knows", // no one + 단수 동사 — 카드가 가르치는 틀
  "pg09-4:p8 play the guitar", // 악기 이름 앞 the — 카드가 가르치는 규칙
  "pg15-2:p15 cried with delight that", // 감탄문 → 간접화법으로 바꾸는 틀(다른 문장 She … she had won.)
  "pg17-3:p13 used to eating", // be used to -ing 틀
  "pg17-3:p15 to get used to", // get used to 틀
]);
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
// Target forms are judged by the real grader (src/lib/passoffGrading.ts — import-free, loaded the way check-grading.cjs
// loads it), so this check cannot disagree with the screen. The old word-level search here did: it missed a noun's 's
// ("Tom's been" · "Mom's in the garage" — the grader finds "'s" at a word's end), and the builders added detours for it.
const ts = require(path.join(ROOT, "node_modules", "typescript"));
function loadTsAlone(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", js)(mod, mod.exports);
  return mod.exports;
}
const GRADER = loadTsAlone(path.join("src", "lib", "passoffGrading.ts"));
const SPEECH_FORM = loadTsAlone(path.join("src", "lib", "lessonSpeechForm.ts"));
for (const name of ["missingTargets", "spokenNumbersAsWords", "normalizeForComparison"]) {
  if (typeof GRADER[name] !== "function") throw new Error(`${name} 를 passoffGrading.ts 에서 못 찾음 — 목표형 검사가 아무것도 안 봄`);
}
// typed as written, and as a microphone gives it (numbers as words, apostrophes not heard) — the grader's two paths.
// Remembered per text and group: --selftest runs the whole check hundreds of times on nearly the same data.
const TARGET_MEMO = new Map();
const remembered = (tag, fn) => (text, group) => {
  const key = `${tag}\u0000${text}\u0000${JSON.stringify(group)}`;
  if (!TARGET_MEMO.has(key)) TARGET_MEMO.set(key, fn(String(text ?? ""), group));
  return TARGET_MEMO.get(key);
};
const containsTarget = remembered("typed", (text, group) => GRADER.missingTargets(text, [group]).length === 0);
const containsTargetSpoken = remembered("spoken", (text, group) => GRADER.missingTargets(GRADER.spokenNumbersAsWords(text), [group], { spoken: true }).length === 0);
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
// options as the learner sees them — only spacing and curly quotes unified. Two options that differ in capitals or
// punctuation alone are two different options: a question about capitals or commas is made of exactly those.
const shownOption = (o) => String(o ?? "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const dupOptions = (options) => new Set((options || []).map(shownOption)).size !== (options || []).length;

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
// An issue belongs to the topic whose pages hold it AND to every topic its `where` names ("… / TOPIC 12 passOff (2)
// item 3 (p44)"): the same printed sentence often comes back in a later topic, and that topic's lessons need the same
// decision (G10 2026-09-28: a p28 issue that named TOPIC 12 was decided for pg11-1 only).
const namedTopics = (issue) => [...String(issue.where || "").matchAll(/TOPIC\s*(\d+)/gi)].map((m) => Number(m[1]));
function loadExtraction() {
  if (EXTRACTION) return EXTRACTION;
  const topics = [];
  const allIssues = [];
  for (const f of fs.readdirSync(EXTRACT_DIR).filter((x) => /^g\d-p\d+-\d+\.json$/.test(x)).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(EXTRACT_DIR, f), "utf8"));
    for (const x of j.issues || []) allIssues.push({ ...x, book: j.book });
    for (const t of j.topics || []) {
      const num = Number(String(t.printedLabel || "").replace(/\D+/g, "")) || null;
      const sentences = [];
      const reviews = [];
      for (const s of t.sections || []) {
        for (const g of s.groups || []) for (const it of g.items || []) if (it.en) sentences.push({ page: it.page, en: it.en, kind: s.kind });
        for (const task of s.tasks || []) for (const it of task.items || []) reviews.push({ page: it.page || task.page, prompt: it.prompt, answer: it.answerFromBook });
      }
      const [p0, p1] = t.pages || [0, 0];
      topics.push({ num, title: t.title, book: j.book, pages: [p0, p1], sentences, reviews, issues: [] });
    }
  }
  for (const t of topics) {
    t.issues = allIssues.filter((x) => (x.book === t.book && x.page >= t.pages[0] && x.page <= t.pages[1]) || (t.num && namedTopics(x).includes(t.num)));
  }
  EXTRACTION = topics;
  return topics;
}
// A decision answers an issue when the page, the book (of the decision file's topics) and the text agree. A text that
// normalises to little or nothing ("]" · "lie" · "(be동사)") must equal the issue's text: as a prefix it matched every
// issue on that page number in every book (G15 2026-09-28: TOPIC-04's "]" answered both p34 issues of book 3).
const PREFIX_MIN = 12;
function decisionMatcher(topics) {
  const bookOf = new Map(topics.filter((t) => t.num).map((t) => [t.num, t.book]));
  const booksOfFile = (file) => new Set((String(file || "").match(/\d+/g) || []).map(Number).map((n) => bookOf.get(n)).filter(Boolean));
  const sameText = (dText, iText) => {
    const a = norm(dText);
    const b = norm(iText);
    if (!a || !b) return String(dText ?? "").trim() === String(iText ?? "").trim() && String(dText ?? "").trim() !== "";
    if (a === b) return true;
    if (a.length < PREFIX_MIN || b.length < PREFIX_MIN) return false;
    return a.includes(b.slice(0, 40)) || b.includes(a.slice(0, 40));
  };
  return (d, issue) => d.page === issue.page && (!d._file || booksOfFile(d._file).has(issue.book)) && sameText(d.text, issue.text);
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
      // (2026-10-02) STUDENT writes its Korean words in Hangul ("named him 단군") and says them in romanization — compare
      // the romanized form, which is what PASS-OFF's item keeps (with "Dangun(단군)" drawn) and what both clips speak
      if (b.type === "sentences") for (const it of b.items || []) en.push(SPEECH_FORM.romanizedForm(`student/${id}`, String(it.text ?? "")));
      if (b.type === "paragraph" && b.lang === "ko") ko.push(String(b.text ?? ""));
    }
    v = { en, ko: ko.length === en.length ? ko : null };
  }
  STUDENT.set(id, v);
  return v;
}

// ---------- checks ----------
function checkLesson(lesson, problems, tags, warnings = null) {
  const L = lesson.data;
  const P = (msg) => problems.push(`${lesson.file}: ${msg}`);
  const W = (msg) => warnings.push(`${lesson.file}: ${msg}`);
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
  if (rule.check && dupOptions(rule.check.options)) P(`rule.check 보기가 겹침`);
  if (rule.discovery && dupOptions(rule.discovery.options)) P(`rule.discovery 보기가 겹침`);
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
      if (dupOptions(s.options)) P(`${s.id} choice 보기가 겹침`);
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
        for (const ok of [p.en, ...(p.accept || [])]) if (containsTarget(ok, g) && !containsTargetSpoken(ok, g)) P(`${p.id} 마이크로 "${ok}" 를 말하면 목표형 [${g.join("|")}] 을 못 찾음`);
      }
      // v1.7: the grader reads a REFERENCE's noun 's as written, so a noun 's that can only be "has" ('s been · 's got ·
      // 's gotten · 's had — never a possessive) needs its spelled-out sibling among the references, or a learner's
      // "The door has been painted." is wrong. ("Jim's sick" could be a possessive to a machine, so it is not checked.)
      const refs = [p.en, ...(p.accept || [])].filter(Boolean);
      for (const ok of refs) {
        for (const m of String(ok).matchAll(/\b([A-Za-z]+)['’]s\s+(been|got|gotten|had)\b/gi)) {
          if (/^(he|she|it|that|this|there|what|who|where|here|how|when|let)$/i.test(m[1])) continue;
          const spelled = ` ${m[1]} has ${m[2]} `.toLowerCase();
          if (!refs.some((r) => gradeWords(r).includes(spelled))) P(`${p.id} "${ok}" 의 명사 's(${m[1]}'s ${m[2]})에 풀어 쓴 판(${m[1]} has ${m[2]})이 허용 답에 없음`);
        }
      }
      // The screen shows the first pattern that fires, so the number of patterns is not the limit — a pattern that can
      // never be first is: its words hold an earlier pattern's words (every answer it catches, the earlier one caught).
      const pieces = (p.errorPatterns || []).map((e) => (e && !e.literal ? GRADER.normalizeForComparison(String(e.match || "")) : ""));
      pieces.forEach((pj, j) => {
        if (!pj) return;
        const i = pieces.findIndex((pi, k) => k < j && pi && ` ${pj} `.includes(` ${pi} `));
        if (i >= 0) P(`${p.id} 오답 패턴 "${p.errorPatterns[j].match}" 은 앞 패턴 "${p.errorPatterns[i].match}" 에 가려 뜨지 않음`);
      });
      const literals = (p.errorPatterns || []).filter((e) => e && e.literal).map((e) => puncNorm(e.match));
      if (new Set(literals).size !== literals.length) P(`${p.id} literal 오답 패턴이 겹침`);
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
  // and ⑤'s "처음 보는 문장" must not appear anywhere earlier in the lesson. A ④ answer of four words or fewer
  // ("Yes, it is.") is the pattern the card teaches and is not protected. Checked as containment, so a ③ blank
  // filled with its answer, a choice option or a table cell that carries the whole sentence is caught too.
  const anchorSet = new Set(anchors.map((a) => gradeNorm(a.en)));
  const hidden = prods.filter((p) => !anchorSet.has(gradeNorm(p.en)) && gradeNorm(p.en).split(" ").length >= 5).map((p) => [gradeNorm(p.en), p.id]);
  const shows = (text) => {
    const w = gradeWords(text);
    const hit = hidden.find(([n]) => w.includes(` ${n} `));
    return hit ? hit[1] : null;
  };
  const fillBlank = (sentence, word) => String(sentence || "").replace(/_{2,}/, String(word ?? ""));
  const selectTexts = (s) => {
    const out = [];
    if (s.kind === "select") out.push((s.tokens || []).join(" "));
    if (s.kind === "choice") {
      if (/_{2,}/.test(s.sentence || "")) for (const o of s.options || []) out.push(fillBlank(s.sentence, o));
      else if (s.sentence) out.push(s.sentence);
      out.push(...(s.options || []));
    }
    if (s.kind === "short") {
      if (/_{2,}/.test(s.sentence || "")) for (const a of s.answer || []) out.push(fillBlank(s.sentence, a));
      else if (s.sentence) out.push(s.sentence);
    }
    return out.filter(Boolean);
  };
  for (const s of sel) {
    if (s.reserve) continue;
    const shown = selectTexts(s).map(shows).find(Boolean);
    if (shown) P(`${s.id} ③ 문장이 ④ ${shown} 의 정답을 먼저 보여 줌`);
  }
  const ruleTexts = [
    ...(rule.points || []),
    ...((rule.table && rule.table.rows) || []).flat(),
    rule.koDiff,
    ...(rule.mistakes || []).flatMap((m) => [m.wrong, m.right, m.why]),
    ...(rule.worked || []),
    ...(rule.check ? [rule.check.question, ...(rule.check.options || []), rule.check.why] : []),
    ...(rule.check && /_{2,}/.test(rule.check.question || "") ? [fillBlank(rule.check.question, (rule.check.options || [])[rule.check.answer])] : []),
    ...(rule.discovery ? [rule.discovery.question, ...(rule.discovery.options || []), rule.discovery.why] : []),
  ].filter(Boolean);
  const cardShown = [...new Set(ruleTexts.map(shows).filter(Boolean))];
  for (const id of cardShown) P(`② 설명 카드가 ④ ${id} 의 정답을 먼저 보여 줌`);
  const earlier = [...anchors.map((a) => a.en), ...prods.map((p) => p.en), ...sel.flatMap(selectTexts), ...ruleTexts].map(gradeWords);
  for (const t of trans) if (earlier.some((e) => e.includes(` ${gradeNorm(t.en)} `))) P(`${t.id} ⑤ 처음 보는 문장이 레슨 앞에 이미 나옴`);
  // warning only (G14 2026-09-28): a card or a ③ item that shows a hidden ④ answer's key chunk ("the early bird") but not
  // the whole sentence. A chunk counts when it is three words or more with two content words, and no ① anchor has it.
  const anchorWords = anchors.map((a) => gradeWords(a.en));
  const shownEarly = [...sel.filter((s) => !s.reserve).flatMap(selectTexts), ...ruleTexts].map(gradeWords);
  for (const p of warnings ? prods : []) {
    const n = gradeNorm(p.en);
    if (anchorSet.has(n) || n.split(" ").length < 5) continue;
    const w = n.split(" ");
    let best = "";
    for (let len = w.length - 1; len >= 3 && !best; len -= 1) {
      for (let i = 0; i + len <= w.length && !best; i += 1) {
        const chunk = w.slice(i, i + len);
        if (chunk.filter((x) => !FUNCTION_WORDS.has(x)).length < 2) continue;
        const c = ` ${chunk.join(" ")} `;
        if (anchorWords.some((a) => a.includes(c))) continue;
        if (shownEarly.some((e) => e.includes(c))) best = chunk.join(" ");
      }
    }
    if (best && !CHUNK_OK.has(`${p.id} ${best}`)) W(`${p.id} ④ 정답의 덩어리 "${best}" 가 ② 카드나 ③ 에 먼저 보임`);
  }
  // challenge items sit at the end of ④, and every later-lesson tag of a challenge item is named
  let seenChallenge = false;
  for (const p of prods) {
    if (p.challenge) seenChallenge = true;
    else if (seenChallenge) P(`${p.id} 도전 문항 뒤에 도전 아닌 문항(도전은 세트 끝)`);
  }
  for (const p of [...prods, ...trans]) {
    if (!p.challenge) continue;
    const later = (p.tags || []).filter((t) => !tags.base.has(t) && tags.order.has(t) && tags.order.get(t) > lessonIdx);
    const missing = later.filter((t) => !(p.challengeTags || []).includes(t));
    if (missing.length) P(`${p.id} 뒤 레슨 태그 [${missing.join(",")}] 가 challengeTags 에 없음`);
  }
  const frame = block("frame");
  addId(frame.id, "f");
  if (!/_{2,}/.test(String(frame.template || ""))) P(`frame.template 에 빈칸 없음`);
  const allText = JSON.stringify(L);
  for (const re of FORBIDDEN_UI) if (re.test(allText)) P(`금지 문구 ${re}`);
  // what a learner has seen once this lesson is done — for the next lessons' ⑤ (crossLesson)
  const seen = [...earlier, ...trans.map((t) => gradeWords(t.en))];
  return { anchors: anchors.length, select: sel.length, produce: prods.length, transfer: trans.length, paidRestored: lesson.restored || 0, seen, transfer_: trans.map((t) => ({ id: t.id, n: gradeNorm(t.en) })) };
}

// ⑤ "처음 보는 문장" must be new to a learner who has done the lessons before it (the topic lock keeps that order).
// G8 2026-09-28 found pg10-2:t1 = pg04-1:t2 by hand; this is that comparison for every lesson.
function crossLesson(lessons, counts, tags, problems) {
  const idx = (id) => tags.lessonIndex.get(id) ?? Infinity;
  for (let i = 0; i < lessons.length; i += 1) {
    const me = idx(lessons[i].data.id);
    for (const t of counts[i].transfer_) {
      if (!t.n) continue;
      const before = lessons
        .map((l, j) => ({ id: l.data.id, j }))
        .filter(({ id, j }) => j !== i && idx(id) < me && counts[j].seen.some((s) => s.includes(` ${t.n} `)))
        .map(({ id }) => id);
      if (before.length) problems.push(`${lessons[i].file}: ${t.id} ⑤ 처음 보는 문장이 앞 레슨에 이미 나옴 (${before.join(", ")})`);
    }
  }
}

// English a lesson corrected (an item's fix.from) must not still be what another item shows as English: a ① sentence,
// a ④/⑤ model answer or a promptEn (G10 2026-09-28: the same p28 sentence was corrected in pg11-1 and left as printed
// in pg12-2). Most "fix" decisions keep the English and change the Korean, the card or the question — so the decision
// files cannot tell; fix.from can. Compared as printed (only the "(N과)" notes and spacing dropped), so a correction
// of a comma, a capital, a full stop or a quote mark (you‘re → you're) is not the same text.
const printed = (s) => String(s ?? "").replace(/\s*\(\s*\d+\s*과\s*\)\s*/g, " ").replace(/\s+/g, " ").trim();
// the fix kinds that mean "the printed English was wrong". A sentence moved to the lesson it belongs to
// (grammar_explanation_wrong — "I saw him running away." went from the gerund lesson to the participle lesson) or a
// question reworded (answer_ambiguous) leaves correct English behind, which other lessons may show.
const ENGLISH_ERROR_KINDS = new Set(["english_grammar", "english_unnatural", "fact", "student_version", "layout_or_extraction", "translation_mismatch"]);
function fixedStillShown(lessons, problems) {
  const shownItems = (l) => {
    const blocks = l.data.blocks || [];
    const drill = blocks.find((b) => b.type === "drill") || {};
    return [...((blocks.find((b) => b.type === "anchors") || {}).items || []), ...(drill.produce || []), ...(drill.transfer || [])];
  };
  const corrected = new Map(); // printed original → the item that corrected it
  for (const l of lessons) {
    for (const it of shownItems(l)) {
      const from = it.fix && it.fix.from;
      if (typeof from !== "string" || hasHangul(from) || norm(from).split(" ").length < 4) continue;
      if (!ENGLISH_ERROR_KINDS.has(it.fix.kind)) continue;
      if (printed(from) === printed(it.en)) continue; // not an English correction
      if (!corrected.has(printed(from))) corrected.set(printed(from), it.id);
    }
  }
  for (const l of lessons) {
    for (const it of shownItems(l)) {
      for (const text of [it.en, it.promptEn]) {
        const by = corrected.get(printed(text));
        if (by) problems.push(`${l.file}: ${it.id} 다른 문항(${by})이 고친 교재 영어를 그대로 보임: ${text}`);
      }
    }
  }
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
  const answers = decisionMatcher(topics);
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
      const hit = decisions.some((d) => answers(d, is));
      if (!hit) { undecided += 1; problems.push(`TOPIC ${t.num} 오류 후보 판정 없음 ${is.book} p${is.page}: ${String(is.text).slice(0, 80)}`); }
    }
    report.push({ topic: t.num, title: t.title, bookSentences: t.sentences.length, missing, issues: t.issues.length, undecided });
  }
  return report;
}

// opts.warnings === false skips the chunk warnings (slow; --selftest needs them only where it tests them)
function run(lessons, decisions, only, opts = {}) {
  const problems = [];
  const warnings = [];
  const tags = loadTags();
  const ds = decisions || loadDecisions();
  const counts = lessons.map((l) => ({ id: l.data.id, ...checkLesson(l, problems, tags, opts.warnings === false ? null : warnings) }));
  crossLesson(lessons, counts, tags, problems);
  fixedStillShown(lessons, problems);
  const cov = coverage(lessons, loadExtraction(), ds, problems, only === undefined ? ONLY_TOPICS : only);
  for (const c of counts) { delete c.seen; delete c.transfer_; }
  return { problems, warnings, counts, cov };
}

// ---------- selftest: every deliberate break must be reported ----------
function selftest(lessons) {
  const decisions = loadDecisions();
  const topics = loadExtraction();
  const base = run(lessons, decisions, null);
  const QUIET = { warnings: false }; // every break below except the chunk warning's looks at problems only
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
    const r = run(copy, decisions, null, QUIET);
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
          const r = run(copy, decisions, new Set([t.num]), QUIET);
          if (r.problems.some((p) => p.includes("빠짐") && norm(p).includes(n))) detected += 1;
          else missed.push(`${drill[list][i].id}: ${drill[list][i].en}`);
        }
      }
    }
  }
  result.droppedBookSentence = required === 0 ? "대상 없음(시험 못 함)" : detected === required ? `잡음 ${detected}/${required}` : `놓침 ${required - detected}/${required}: ${missed.slice(0, 3).join(" | ")}`;

  // 2) an issue whose decision is removed must be reported undecided
  let issueCase = null;
  const answers = decisionMatcher(topics);
  for (const t of topics) {
    if (!t.num || !lessons.some((l) => l.data.unit === t.num)) continue;
    for (const is of t.issues) {
      const match = (d) => answers(d, is);
      if (decisions.some(match)) { issueCase = { is, rest: decisions.filter((d) => !match(d)) }; break; }
    }
    if (issueCase) break;
  }
  if (!issueCase) result.removedDecision = "대상 없음(시험 못 함)";
  else {
    const r = run(lessons, issueCase.rest, null, QUIET);
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
      result.badAnswerIndex = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(s.id) && p.includes("범위 밖")) ? "잡음" : "놓침";
    }
  }
  const breakSelect = (name, pred, mutate, expectWord) => {
    const copy = clone(lessons);
    for (const l of copy) {
      const s = (l.data.blocks.find((b) => b.type === "drill").select || []).find(pred);
      if (!s) continue;
      mutate(s);
      result[name] = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(s.id) && p.includes(expectWord)) ? "잡음" : "놓침";
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
      const pi = (drill.produce || []).findIndex((p) => !anchorsN.has(gradeNorm(p.en)) && gradeNorm(p.en).split(" ").length >= 5);
      const si = (drill.select || []).findIndex((s) => s.kind === "choice" && !s.reserve);
      if (pi >= 0 && si >= 0 && (drill.transfer || []).length) target = { li, pi, si };
    });
    const names = ["selectShowsProduce", "choiceOptionIsProduce", "cardTableShowsProduce", "transferSeenBefore"];
    if (!target) for (const n of names) result[n] = "대상 없음(시험 못 함)";
    else {
      const attempt = (name, mutate, expect) => {
        const copy = clone(lessons);
        const L = copy[target.li].data;
        const drill = L.blocks.find((b) => b.type === "drill");
        const id = mutate(drill, L.blocks.find((b) => b.type === "rule"));
        result[name] = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(id) && p.includes(expect)) ? "잡음" : "놓침";
      };
      attempt("selectShowsProduce", (d) => { d.select[target.si].sentence = d.produce[target.pi].en; return d.select[target.si].id; }, "정답을 먼저");
      attempt("choiceOptionIsProduce", (d) => { const s = d.select[target.si]; s.options = [...s.options.slice(0, -1), d.produce[target.pi].en]; return s.id; }, "정답을 먼저");
      attempt("cardTableShowsProduce", (d, rule) => { rule.table = { columns: ["예"], rows: [[d.produce[target.pi].en]] }; return d.produce[target.pi].id; }, "설명 카드");
      attempt("transferSeenBefore", (d) => { d.transfer[0].en = d.produce[target.pi].en; return d.transfer[0].id; }, "처음 보는 문장");
    }
  }
  {
    // challenge order and challengeTags: move a challenge item to the front / drop its challengeTags
    let hit = null;
    lessons.forEach((l, li) => {
      if (hit) return;
      const d = l.data.blocks.find((b) => b.type === "drill");
      const ci = (d.produce || []).findIndex((p) => p.challenge && (p.challengeTags || []).length);
      if (ci > 0 && !(d.produce[0].challenge)) hit = { li, ci };
    });
    if (!hit) { result.challengeNotAtEnd = "대상 없음(시험 못 함)"; result.challengeTagsMissing = "대상 없음(시험 못 함)"; }
    else {
      const copy = clone(lessons);
      const d = copy[hit.li].data.blocks.find((b) => b.type === "drill");
      const [c] = d.produce.splice(hit.ci, 1);
      d.produce.unshift(c);
      result.challengeNotAtEnd = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes("세트 끝")) ? "잡음" : "놓침";
      const copy2 = clone(lessons);
      const d2 = copy2[hit.li].data.blocks.find((b) => b.type === "drill");
      const item = d2.produce[hit.ci];
      item.challengeTags = item.challengeTags.slice(1);
      item.tags = [...new Set([...(item.tags || []), ...lessons[hit.li].data.blocks.find((b) => b.type === "drill").produce[hit.ci].challengeTags])];
      result.challengeTagsMissing = fresh(run(copy2, decisions, null, QUIET)).some((p) => p.includes(item.id) && p.includes("challengeTags 에 없음")) ? "잡음" : "놓침";
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
      result.studentExactMismatch = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(it.id) && p.includes("STUDENT")) ? "잡음" : "놓침";
    }
  }
  // ---- 2026-09-28 checks (이끄는 세션): each break must be caught, each "no false alarm" case must stay quiet ----
  breakSelect("choiceDuplicateOption", (s) => s.kind === "choice" && (s.options || []).length >= 2, (s) => { s.options[1] = s.options[0]; }, "보기가 겹침");
  {
    // options that differ only in capitals are two options (a capitals / punctuation question needs them)
    const copy = clone(lessons);
    let s = null;
    for (const l of copy) {
      s = (l.data.blocks.find((b) => b.type === "drill").select || []).find((x) => x.kind === "choice" && (x.options || []).length >= 2 && /[a-z]/.test(x.options[0]));
      if (s) break;
    }
    if (!s) result.capitalsOnlyOptionsNoFalseAlarm = "대상 없음(시험 못 함)";
    else {
      s.options[1] = s.options[0].toUpperCase();
      result.capitalsOnlyOptionsNoFalseAlarm = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(s.id) && p.includes("보기가 겹침")) ? "놓침(거짓 경보)" : "잡음(거짓 경보 없음)";
    }
  }
  breakOne("patternShadowed", firstWith((p) => (p.errorPatterns || []).some((e) => e && !e.literal && String(e.match || "").trim())), (p) => {
    const e = p.errorPatterns.find((x) => x && !x.literal);
    p.errorPatterns = [...p.errorPatterns, { match: `${e.match} zzq`, hint: "x" }];
  }, (msg, p) => msg.includes(p.id) && msg.includes("가려 뜨지 않음"));
  {
    // a noun's 's fills a "'s" target, as the grader reads it (the old word-level search here said it did not)
    const where = firstWith((p) => (p.targets || []).length > 0);
    if (!where) result.nounApostropheSNoFalseAlarm = "대상 없음(시험 못 함)";
    else {
      const copy = clone(lessons);
      const it = copy[where.li].data.blocks.find((b) => b.type === "drill")[where.list][where.i];
      Object.assign(it, { targets: [["'s"]], en: "Tom's been here before.", accept: ["The door's been painted."], errorPatterns: [] });
      result.nounApostropheSNoFalseAlarm = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(it.id) && p.includes("목표형 없음")) ? "놓침(거짓 경보)" : "잡음(거짓 경보 없음)";
    }
  }
  // a noun 's that can only be "has", with no spelled-out sibling
  breakOne("nounHasWithoutSibling", firstWith(() => true), (p) => { Object.assign(p, { en: "The door's been painted.", accept: [], targets: [], errorPatterns: [] }); }, (msg, p) => msg.includes(p.id) && msg.includes("풀어 쓴 판"));
  // typed "at 7:00" holds the target; a microphone gives "at seven o'clock", which does not
  breakOne("spokenTargetMissing", firstWith((p) => (p.targets || []).length > 0), (p) => { Object.assign(p, { targets: [["at 7:00"]], en: "I get up at 7:00.", accept: [], errorPatterns: [] }); }, (msg, p) => msg.includes(p.id) && msg.includes("마이크로"));
  {
    // ⑤ of the last lesson = a ① sentence of the first lesson
    const copy = clone(lessons);
    const first = copy[0].data.blocks.find((b) => b.type === "anchors").items[0];
    const lastDrill = copy[copy.length - 1].data.blocks.find((b) => b.type === "drill");
    const t = (lastDrill.transfer || [])[0];
    if (!first || !t) result.transferSeenInEarlierLesson = "대상 없음(시험 못 함)";
    else {
      t.en = first.en;
      result.transferSeenInEarlierLesson = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(t.id) && p.includes("앞 레슨에 이미 나옴")) ? "잡음" : "놓침";
    }
  }
  {
    // English a lesson corrected, shown again as another lesson's ④ answer
    let src = null;
    lessons.forEach((l, li) => {
      if (src) return;
      const d = l.data.blocks.find((b) => b.type === "drill");
      const it = [...(d.produce || []), ...(d.transfer || [])].find((p) => p.fix && p.fix.kind === "english_grammar" && typeof p.fix.from === "string" && !hasHangul(p.fix.from) && norm(p.fix.from).split(" ").length >= 4 && printed(p.fix.from) !== printed(p.en));
      if (it) src = { li, from: it.fix.from };
    });
    if (!src) result.correctedEnglishShownElsewhere = "대상 없음(시험 못 함)";
    else {
      const copy = clone(lessons);
      const other = copy[(src.li + 1) % copy.length].data.blocks.find((b) => b.type === "drill").produce[0];
      other.en = src.from;
      result.correctedEnglishShownElsewhere = fresh(run(copy, decisions, null, QUIET)).some((p) => p.includes(other.id) && p.includes("고친 교재 영어")) ? "잡음" : "놓침";
    }
  }
  {
    // an issue that only its `where` gives to topic N: with its decision gone, topic N alone must report it
    let hit = null;
    for (const t of topics) {
      if (!t.num || !lessons.some((l) => l.data.unit === t.num)) continue;
      for (const is of t.issues) {
        const inPages = is.book === t.book && is.page >= t.pages[0] && is.page <= t.pages[1];
        if (inPages) continue;
        const match = (d) => answers(d, is);
        if (decisions.some(match)) { hit = { t, is, rest: decisions.filter((d) => !match(d)) }; break; }
      }
      if (hit) break;
    }
    if (!hit) result.issueNamedByWhere = "대상 없음(시험 못 함)";
    else {
      const r = run(lessons, hit.rest, new Set([hit.t.num]), QUIET);
      result.issueNamedByWhere = r.problems.some((p) => p.startsWith(`TOPIC ${hit.t.num} 오류 후보 판정 없음`) && p.includes(`p${hit.is.page}`)) ? "잡음" : "놓침";
    }
  }
  {
    // a decision "]" (normalises to nothing) or one from another book must not answer an issue
    let hit = null;
    for (const t of topics) {
      if (!t.num || !lessons.some((l) => l.data.unit === t.num)) continue;
      for (const is of t.issues) {
        if (norm(is.text).length < PREFIX_MIN) continue;
        const match = (d) => answers(d, is);
        if (decisions.some(match)) { hit = { is, rest: decisions.filter((d) => !match(d)) }; break; }
      }
      if (hit) break;
    }
    if (!hit) { result.emptyDecisionDoesNotMask = "대상 없음(시험 못 함)"; result.otherBookDecisionDoesNotMatch = "대상 없음(시험 못 함)"; }
    else {
      const bookFile = (book) => { const t = topics.find((x) => x.book !== book && x.num); return `TOPIC-${String(t.num).padStart(2, "0")}.json`; };
      const sameBookFile = (book) => { const t = topics.find((x) => x.book === book && x.num); return `TOPIC-${String(t.num).padStart(2, "0")}.json`; };
      const undecided = (ds) => run(lessons, ds, null, QUIET).problems.some((p) => p.includes("판정 없음") && p.includes(`p${hit.is.page}`) && p.includes(String(hit.is.text).slice(0, 30)));
      result.emptyDecisionDoesNotMask = undecided([...hit.rest, { page: hit.is.page, text: "]", _file: sameBookFile(hit.is.book) }]) ? "잡음" : "놓침";
      result.otherBookDecisionDoesNotMatch = undecided([...hit.rest, { page: hit.is.page, text: hit.is.text, _file: bookFile(hit.is.book) }]) ? "잡음" : "놓침";
    }
  }
  {
    // a card that shows all but the last word of a hidden ④ answer → a chunk warning (not a problem)
    const baseWarn = new Set(base.warnings);
    let hit = null;
    lessons.forEach((l, li) => {
      if (hit) return;
      const anchorsN = new Set((l.data.blocks.find((b) => b.type === "anchors").items || []).map((a) => gradeNorm(a.en)));
      const p = (l.data.blocks.find((b) => b.type === "drill").produce || []).find((x) => {
        const w = gradeNorm(x.en).split(" ");
        return !anchorsN.has(gradeNorm(x.en)) && w.length >= 6 && w.slice(0, -1).filter((y) => !FUNCTION_WORDS.has(y)).length >= 2;
      });
      if (p) hit = { li, id: p.id, chunk: gradeNorm(p.en).split(" ").slice(0, -1).join(" ") };
    });
    if (!hit) result.chunkShownWarns = "대상 없음(시험 못 함)";
    else {
      const copy = clone(lessons);
      copy[hit.li].data.blocks.find((b) => b.type === "rule").points.push(`예: ${hit.chunk}`);
      const r = run(copy, decisions, null);
      result.chunkShownWarns = r.warnings.some((w) => !baseWarn.has(w) && w.includes(hit.id) && w.includes("덩어리")) ? "잡음" : "놓침";
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
console.log(JSON.stringify({ lessons: r.counts.length, paidRestored: r.counts.reduce((a, c) => a + c.paidRestored, 0), coverage: r.cov, problems: r.problems.length, warnings: r.warnings.length }, null, 1));
for (const p of r.problems.slice(0, 300)) console.log(" - " + p);
if (r.problems.length > 300) console.log(` … 외 ${r.problems.length - 300}건`);
if (argv.includes("--warnings")) for (const w of r.warnings) console.log(" ? " + w);
else if (r.warnings.length) console.log(` (경고 ${r.warnings.length}건은 실패가 아님 — --warnings 로 봄)`);
process.exit(r.problems.length ? 1 : 0);
