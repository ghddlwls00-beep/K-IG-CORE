// Post-processing for the Pass-Off Grammar extraction.
// 1) completeness: every English / Korean line in the PDF text layer must appear in the extracted JSON
// 2) cross-reference: each book sentence vs STUDENT (and other courses) sentences, lessonRef check
// 3) audio: does a clip already exist for the exact sentence text (unifiedSpeechKey)?
// usage: node post.cjs <scratchpad> <repo> <clipDir> [--selftest-break]
const fs = require("fs");
const path = require("path");

const [SP, REPO, CLIPS] = process.argv.slice(2);
const BREAK = process.argv.includes("--selftest-break");
const outDir = path.join(SP, "pdf", "out");

// ---- unifiedSpeechKey (copied from src/lib/unifiedSpeech.ts) ----
function normalizeUnifiedSpeechText(text) {
  return text
    .replace(/\s*\/\s*/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/:{2,}/g, " ")
    .replace(/-{2,}/g, " ")
    .replace(/[…]+/g, " ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function unifiedSpeechKey(text) {
  const clean = normalizeUnifiedSpeechText(text);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  const hex = (v) => (v >>> 0).toString(16).padStart(8, "0");
  return `${clean.length.toString(36)}-${hex(first)}${hex(second)}`;
}

// ---- helpers ----
const norm = (s) =>
  String(s || "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\(\s*\d+\s*과\s*\)/g, " ")
    .replace(/\((단수|복수)\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9'가-힣 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const words = (s) => norm(s).split(" ").filter(Boolean);
const jaccard = (a, b) => {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
};

// ---- load extraction ----
const files = fs.readdirSync(outDir).filter((f) => /^g\d-p\d+-\d+\.json$/.test(f)).sort();
const items = []; // {book, page, topic, kind, group, en, ko, lessonRef}
const reviewItems = [];
const allTextByPage = {}; // book:page -> big normalized string of everything extracted on that page
const addPageText = (book, page, s) => {
  if (!page || s == null) return;
  const k = `${book}:${page}`;
  allTextByPage[k] = (allTextByPage[k] || "") + " " + norm(s);
};
const walkStrings = (obj, cb) => {
  if (obj == null) return;
  if (typeof obj === "string") return cb(obj);
  if (Array.isArray(obj)) return obj.forEach((x) => walkStrings(x, cb));
  if (typeof obj === "object") for (const v of Object.values(obj)) walkStrings(v, cb);
};
const perFile = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  const book = j.book;
  let nItems = 0;
  let nReview = 0;
  for (const t of j.topics || []) {
    for (const s of t.sections || []) {
      const secPage = s.page;
      // everything on the section page counts as "extracted text" for the completeness check
      walkStrings({ h: s.heading, table: s.table }, (x) => addPageText(book, secPage, x));
      for (const g of s.groups || []) {
        walkStrings(g.label, (x) => addPageText(book, (g.items && g.items[0] && g.items[0].page) || secPage, x));
        walkStrings(g.explanation, (x) => addPageText(book, secPage, x));
        for (const it of g.items || []) {
          walkStrings(it, (x) => addPageText(book, it.page || secPage, x));
          if (it.en) {
            items.push({ book, page: it.page || secPage, topic: t.title, kind: s.kind, group: g.label, en: it.en, ko: it.ko, lessonRef: it.lessonRef });
            nItems += 1;
          }
        }
        if (g.table) walkStrings(g.table, (x) => addPageText(book, secPage, x));
      }
      for (const task of s.tasks || []) {
        walkStrings(task.instruction, (x) => addPageText(book, task.page || secPage, x));
        for (const it of task.items || []) {
          walkStrings(it, (x) => addPageText(book, it.page || task.page || secPage, x));
          reviewItems.push({ book, page: it.page || task.page || secPage, topic: t.title, taskTypes: task.taskTypes, ...it });
          nReview += 1;
        }
      }
    }
  }
  walkStrings(j.frontMatter, (x) => {
    for (let p = j.pageRange[0]; p <= Math.min(j.pageRange[0] + 3, j.pageRange[1]); p += 1) addPageText(book, p, x);
  });
  perFile.push({ file: f, topics: (j.topics || []).length, sentences: nItems, reviewItems: nReview, issues: (j.issues || []).length });
}

if (BREAK) {
  // deliberate-break test: drop one sentence from the extracted text so the completeness check must report it
  // pick sentences of 7+ words on content pages, remove them from ALL extracted text of that page and its
  // neighbours (review answers repeat sentences), and expect the check to report each one
  const victims = items.filter((x) => words(x.en).length >= 7 && x.page > 4).filter((_, i) => i % 97 === 0).slice(0, 5);
  for (const victim of victims) {
    for (const p of [victim.page - 1, victim.page, victim.page + 1]) {
      const k = `${victim.book}:${p}`;
      if (allTextByPage[k]) allTextByPage[k] = allTextByPage[k].split(norm(victim.en)).join(" ");
    }
    console.log("SELFTEST removed:", victim.book, victim.page, victim.en);
  }
}

// ---- 1) completeness vs text layer ----
const missing = [];
let checkedLines = 0;
for (const book of ["g1", "g2", "g3"]) {
  const txtPath = path.join(SP, "pdf", `${book}.txt`);
  if (!fs.existsSync(txtPath)) continue;
  const pages = fs.readFileSync(txtPath, "utf8").split(/\r?\n===== g\d PAGE (\d+) =====\r?\n/);
  if (pages.length < 3) throw new Error(`text layer split failed for ${book}`);
  // pages = ["", "1", text1, "2", text2, ...]
  for (let i = 1; i < pages.length; i += 2) {
    const page = Number(pages[i]);
    if (page <= 4) continue; // cover, intro, map, toc are checked by eye
    const covered = files.some((f) => {
      const m = f.match(/^(g\d)-p(\d+)-(\d+)\.json$/);
      return m[1] === book && page >= Number(m[2]) && page <= Number(m[3]);
    });
    if (!covered) continue;
    const hay = " " + [page - 1, page, page + 1].map((p) => allTextByPage[`${book}:${p}`] || "").join(" ").replace(/\s+/g, " ") + " ";
    for (const raw of pages[i + 1].split(/\r?\n/)) {
      const line = raw.trim();
      if (/The Revolution of English Education|Pass-Off English|패스오프|^\d+$/.test(line)) continue;
      const latinWords = (line.match(/[A-Za-z]{2,}/g) || []).length;
      const hangulWords = (line.match(/[가-힣]{2,}/g) || []).length;
      if (latinWords < 3 && hangulWords < 3) continue;
      const n = norm(line);
      if (n.length < 8) continue;
      checkedLines += 1;
      if (!hay.includes(" " + n + " ")) {
        // tolerate layout splits (a printed line broken or merged differently): accept when 80% of the
        // line's word pairs appear in the extracted text of this page or its neighbours
        const ws = n.split(" ");
        if (ws.length < 2) continue;
        const pairs = ws.slice(1).map((w, k) => ws[k] + " " + w);
        const hit = pairs.filter((p) => hay.includes(" " + p + " ")).length / pairs.length;
        if (hit < 0.8) missing.push({ book, page, line, pairHit: Math.round(hit * 100) });
      }
    }
  }
}

// ---- 2) cross-reference with course content ----
const courseDirs = ["student", "middle", "grammar1", "grammar2", "reading", "ld", "basics", "man", "woman", "adults"];
const index = []; // {course, lesson, chapter, en, ko}
for (const c of courseDirs) {
  const dir = path.join(REPO, "content", "lessons", c);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const kos = (j.blocks || []).filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text);
    let si = 0;
    walkStrings(j.blocks, () => {});
    for (const b of j.blocks || []) {
      if (b.type === "sentences") {
        b.items.forEach((it, idx) => {
          index.push({ course: c, lesson: j.id, chapter: j.unit, en: it.text, ko: c === "student" ? kos[idx] || null : null });
          si += 1;
        });
      } else if (typeof b.text === "string" && /[A-Za-z]{3,}/.test(b.text) && b.lang !== "ko") {
        index.push({ course: c, lesson: j.id, chapter: j.unit, en: b.text, ko: null });
      }
    }
  }
}
const byNorm = new Map();
for (const e of index) {
  const k = norm(e.en);
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(e);
}
const student = index.filter((e) => e.course === "student");
const studentNorm = student.map((e) => ({ e, n: norm(e.en) }));

const cats = { exactStudent: 0, exactOther: 0, partOfStudent: 0, similarStudent: 0, new: 0 };
const refCheck = { withRef: 0, refMatches: 0, refMismatch: [] };
const altered = [];
const clipExists = { yes: 0, no: 0 };
const clipDir = CLIPS && fs.existsSync(CLIPS) ? new Set(fs.readdirSync(CLIPS)) : null;
const seen = new Set();
let unique = 0;
for (const it of items) {
  const n = norm(it.en);
  const first = !seen.has(n);
  if (first) {
    seen.add(n);
    unique += 1;
  }
  let status = "new";
  let match = null;
  const exact = (byNorm.get(n) || []);
  const exactS = exact.find((e) => e.course === "student");
  if (exactS) {
    status = "exactStudent";
    match = exactS;
  } else if (exact.length) {
    status = "exactOther";
    match = exact[0];
  } else {
    const part = studentNorm.find((x) => n.length >= 10 && x.n.includes(n));
    if (part) {
      status = "partOfStudent";
      match = part.e;
    } else {
      let best = null;
      for (const x of studentNorm) {
        const s = jaccard(it.en, x.e.en);
        if (!best || s > best.s) best = { s, e: x.e };
      }
      if (best && best.s >= 0.6) {
        status = "similarStudent";
        match = best.e;
        altered.push({ book: it.book, page: it.page, en: it.en, student: best.e.en, lesson: best.e.lesson, score: Math.round(best.s * 100) });
      }
    }
  }
  if (first) cats[status] += 1;
  it.status = status;
  it.match = match && { course: match.course, lesson: match.lesson, chapter: match.chapter };
  if (it.lessonRef != null) {
    refCheck.withRef += 1;
    if (match && match.course === "student" && Number(match.chapter) === Number(it.lessonRef)) refCheck.refMatches += 1;
    else refCheck.refMismatch.push({ book: it.book, page: it.page, en: it.en, lessonRef: it.lessonRef, found: it.match });
  }
  if (clipDir && first) {
    if (clipDir.has(`${unifiedSpeechKey(it.en)}.mp3`)) clipExists.yes += 1;
    else clipExists.no += 1;
  }
}

// review answers
const rv = { total: reviewItems.length, fromBook: 0, proposed: 0, none: 0, promptKo: 0 };
for (const r of reviewItems) {
  if (r.answerFromBook) rv.fromBook += 1;
  else if (r.proposedAnswer) rv.proposed += 1;
  else rv.none += 1;
  if (r.promptLang === "ko") rv.promptKo += 1;
}

const summary = {
  files: perFile,
  sentences: { total: items.length, unique, ...cats },
  lessonRef: { withRef: refCheck.withRef, matchesStudentChapter: refCheck.refMatches, mismatches: refCheck.refMismatch.length },
  audio: clipDir ? { uniqueSentences: unique, clipAlreadyExists: clipExists.yes, needsNewClip: clipExists.no } : "clip dir not found",
  review: rv,
  completeness: { checkedLines, missing: missing.length },
};
console.log(JSON.stringify(summary, null, 1));
fs.writeFileSync(
  path.join(SP, "pdf", "post-detail.json"),
  JSON.stringify({ summary, missing, refMismatch: refCheck.refMismatch, altered, items, reviewItems }, null, 1),
);
