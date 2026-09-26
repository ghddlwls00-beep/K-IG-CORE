// Per-topic table for the report appendix: pages, sub-topics, sentences, review items, sentences without Korean,
// STUDENT-linked sentences (exact / clause / similar), existing audio clips, issue counts (all / learner-impact high).
const fs = require("fs");
const path = require("path");
const SP = process.argv[2];
const REPO = process.argv[3];
const CLIPS = process.argv[4];
const detail = JSON.parse(fs.readFileSync(path.join(SP, "pdf", "post-detail-normal.json"), "utf8"));
const outDir = path.join(SP, "pdf", "out");
const files = fs.readdirSync(outDir).filter((f) => /^g\d-p\d+-\d+\.json$/.test(f)).sort();

function normalizeUnifiedSpeechText(text) {
  return text.replace(/\s*\/\s*/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/:{2,}/g, " ").replace(/-{2,}/g, " ")
    .replace(/[…]+/g, " ").replace(/\s*\|\s*/g, ", ").replace(/\(\s*\)/g, " ").replace(/\s+/g, " ").trim();
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
const clips = new Set(fs.readdirSync(CLIPS));
const norm = (s) => String(s || "").replace(/[’‘`´]/g, "'").replace(/\(\s*\d+\s*과\s*\)/g, " ").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

const rows = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  const issuesByPage = {};
  for (const x of j.issues || []) {
    issuesByPage[x.page] = issuesByPage[x.page] || { all: 0, high: 0 };
    issuesByPage[x.page].all += 1;
    if (x.severity === "high" || (!x.severity && x.confidence === "high" && /english_grammar|translation_mismatch|grammar_explanation_wrong/.test(x.type))) issuesByPage[x.page].high += 1;
  }
  for (const t of j.topics || []) {
    const [p0, p1] = t.pages;
    let issues = 0;
    let high = 0;
    for (let p = p0; p <= p1; p += 1) {
      if (issuesByPage[p]) {
        issues += issuesByPage[p].all;
        high += issuesByPage[p].high;
      }
    }
    const its = detail.items.filter((x) => x.book === j.book && x.topic === t.title);
    const uniq = new Map();
    for (const x of its) if (!uniq.has(norm(x.en))) uniq.set(norm(x.en), x);
    const u = [...uniq.values()];
    const linked = u.filter((x) => x.status === "exactStudent" || x.status === "partOfStudent" || x.status === "similarStudent").length;
    const refs = its.filter((x) => x.lessonRef != null).length;
    const audio = u.filter((x) => clips.has(`${unifiedSpeechKey(x.en)}.mp3`)).length;
    const rv = detail.reviewItems.filter((x) => x.book === j.book && x.topic === t.title).length;
    const subs = new Set();
    for (const s of t.sections || []) if (s.kind === "passOff") for (const g of s.groups || []) if (g.label) subs.add(g.label);
    rows.push({ book: j.book, topic: t.title, label: t.printedLabel, pages: `${p0}-${p1}`, subs: subs.size, sentences: u.length, review: rv, studentLinked: linked, lessonRefs: refs, audioReady: audio, issues, high });
  }
}
// merge topics split across ranges (none expected, but keep safe)
const merged = [];
for (const r of rows) {
  const m = merged.find((x) => x.book === r.book && x.topic === r.topic);
  if (!m) merged.push({ ...r });
  else for (const k of ["subs", "sentences", "review", "studentLinked", "lessonRefs", "audioReady", "issues", "high"]) m[k] += r[k];
}
console.log(JSON.stringify(merged));
const tot = merged.reduce((a, r) => { for (const k of ["sentences", "review", "studentLinked", "lessonRefs", "audioReady", "issues", "high"]) a[k] = (a[k] || 0) + r[k]; return a; }, {});
console.log(JSON.stringify(tot));
fs.writeFileSync(path.join(SP, "pdf", "topic-table.json"), JSON.stringify(merged, null, 1));
