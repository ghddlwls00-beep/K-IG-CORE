// Shared helpers for the new-question rework (2026-10-01). Questions live in content/questions/{ld,reading}/<id>.json (served) and
// the same files in docs/qa-2026-09-18/학습법-화면-0927/새-문제/{ld,reading}/ (record) — keep the two identical.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../../..");
const SERVED = path.join(REPO, "content/questions");
const RECORD = path.join(REPO, "docs/qa-2026-09-18/학습법-화면-0927/새-문제");
// LISTENING Step 1 chips, split exactly as LdLearningView hintChunks
function chipsOf(id) {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
  const h = (d.blocks || []).find((b) => b.type === "hints");
  if (!h || !h.text) return [];
  return h.text
    .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
    .map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
    .filter((c, i, all) => c && all.indexOf(c) === i);
}
function allQuestions() {
  const out = [];
  for (const course of ["ld", "reading"])
    for (const f of fs.readdirSync(path.join(SERVED, course)).filter((x) => x.endsWith(".json")).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(SERVED, course, f), "utf8"));
      for (const q of d.questions) out.push({ course, lesson: d.lesson, q });
    }
  return out;
}
// absolute / limiting words — the cue "cross out options with 만 · 모든 · 전혀 …"
const ABS = /(^|[^가-힣])(모든|모두|항상|언제나|절대|절대로|전혀|반드시|오직|결코|아무|아무도|아무것도)(?=[^가-힣]|$)|[가-힣]만(?=[ ,]|$|을|이|은|으로|의|에)|뿐/;
module.exports = { REPO, SERVED, RECORD, chipsOf, allQuestions, ABS };
