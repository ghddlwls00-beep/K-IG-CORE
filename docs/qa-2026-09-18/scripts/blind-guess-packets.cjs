// Blind-guess packets: every question WITHOUT its answer and WITHOUT the lesson text — LISTENING with the chips the learner sees
// before listening, READING with nothing but the prompt and options. A fair question should be hard to answer from this alone.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const B = path.join(REPO, "docs/qa-2026-09-18/학습법-화면-0927/새-문제");
const OUT = path.join(B, "_staging", "_blind");
fs.mkdirSync(OUT, { recursive: true });
const chipsOf = (id) => {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
  const h = (d.blocks || []).find((b) => b.type === "hints");
  return h && h.text
    ? h.text
        .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
        .map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
        .filter((c, i, all) => c && all.indexOf(c) === i)
    : [];
};
const key = {};
const parts = [];
for (const course of ["ld", "reading"]) {
  const items = [];
  for (const f of fs.readdirSync(path.join(B, course)).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(B, course, f), "utf8"));
    const chips = course === "ld" ? chipsOf(d.lesson) : undefined;
    for (const q of d.questions) {
      items.push({ id: q.id, ...(chips ? { chips } : {}), prompt: q.prompt, options: q.options });
      key[q.id] = q.answer;
    }
  }
  for (let i = 0; i < items.length; i += 60) parts.push({ course, items: items.slice(i, i + 60) });
}
parts.forEach((p, i) => fs.writeFileSync(path.join(OUT, `part-${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(p, null, 1)));
fs.writeFileSync(path.join(require("os").tmpdir(), "kig-blind-key.json"), JSON.stringify(key));
console.log(`${parts.length} parts · ${Object.keys(key).length} questions → ${OUT} (answers kept outside the repo)`);
