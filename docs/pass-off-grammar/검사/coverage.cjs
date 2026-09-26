// Korean-translation coverage and sub-topic sizes from the seven extraction files.
// A sentence "has Korean" if (a) the item itself carries ko, or (b) some review item in the same book
// uses it as answerFromBook and has a Korean prompt, or (c) it is an exact STUDENT sentence (STUDENT has Korean).
const fs = require("fs");
const path = require("path");
const SP = process.argv[2];
const REPO = process.argv[3];
const outDir = path.join(SP, "pdf", "out");
const norm = (s) =>
  String(s || "")
    .replace(/[’‘`´]/g, "'")
    .replace(/\(\s*\d+\s*과\s*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const studentEn = new Set();
for (const f of fs.readdirSync(path.join(REPO, "content/lessons/student"))) {
  const j = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", f), "utf8"));
  for (const b of j.blocks) if (b.type === "sentences") for (const it of b.items) studentEn.add(norm(it.text));
}

const files = fs.readdirSync(outDir).filter((f) => /^g\d-p\d+-\d+\.json$/.test(f)).sort();
const sentences = new Map(); // norm -> {hasKo, topic}
const koAnswers = new Set();
const groupSizes = []; // {topic, group, n}
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  for (const t of j.topics || []) {
    for (const s of t.sections || []) {
      for (const task of s.tasks || []) {
        for (const it of task.items || []) {
          const hasKoPrompt = it.promptLang === "ko" || /[가-힣]/.test(String(it.prompt || ""));
          if (hasKoPrompt && it.answerFromBook) koAnswers.add(norm(it.answerFromBook));
          if (hasKoPrompt && it.correctedAnswer) koAnswers.add(norm(it.correctedAnswer));
        }
      }
      if (s.kind === "application" || s.kind === "passOff") {
        for (const g of s.groups || []) {
          const items = (g.items || []).filter((x) => x.en);
          if (s.kind === "application") groupSizes.push({ topic: t.title, group: g.label, n: items.length });
          for (const it of items) {
            const k = norm(it.en);
            const prev = sentences.get(k) || { hasKo: false, topic: t.title };
            if (it.ko) prev.hasKo = true;
            sentences.set(k, prev);
          }
        }
      }
    }
  }
}
let withKo = 0;
let fromStudent = 0;
const byTopic = {};
for (const [k, v] of sentences) {
  const ok = v.hasKo || koAnswers.has(k);
  const st = studentEn.has(k);
  if (ok || st) withKo += 1;
  if (!ok && st) fromStudent += 1;
  byTopic[v.topic] = byTopic[v.topic] || { total: 0, noKo: 0 };
  byTopic[v.topic].total += 1;
  if (!ok && !st) byTopic[v.topic].noKo += 1;
}
const sizes = groupSizes.map((g) => g.n).sort((a, b) => a - b);
const q = (p) => sizes[Math.floor((sizes.length - 1) * p)];
console.log(JSON.stringify({
  uniqueSentences: sentences.size,
  withKorean: withKo,
  koreanOnlyViaStudent: fromStudent,
  withoutKorean: sentences.size - withKo,
  noKoreanByTopic: Object.fromEntries(Object.entries(byTopic).filter(([, v]) => v.noKo).map(([t, v]) => [t, `${v.noKo}/${v.total}`])),
  applicationGroups: groupSizes.length,
  groupSize: { min: sizes[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: sizes[sizes.length - 1] },
  largestGroups: groupSizes.sort((a, b) => b.n - a.n).slice(0, 8),
}, null, 1));
