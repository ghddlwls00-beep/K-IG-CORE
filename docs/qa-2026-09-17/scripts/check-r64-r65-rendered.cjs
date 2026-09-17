#!/usr/bin/env node
/**
 * After deploy 886b08c: do the replaced/rewritten READING passages (R-64 pr151,
 * R-65 pr170) show the NEW text on production with a LIFE licence, and none of the
 * old text? Reads the licensed sweep output (sweep-licensed.cjs --suffix -v3):
 *   out/sweep-licensed-v3.jsonl       — per visit errors, paywall, status
 *   out/rendered-v3/reading/<id>.json — the desktop text a learner sees per step
 * Fails (exit 1) on any missing new sentence, any old phrase, or any visit problem.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out");
const flat = (s) => (s || "").replace(/[^A-Za-z0-9가-힣]+/g, "");
// Phrases of the old passages (audit reading.md R-64/R-65) that must be gone.
const OLD = {
  pr151: ["Chavez", "Roh", "impeachment", "차베스", "노무현"],
  pr170: ["prestige", "cleverness", "정결함"],
};
let bad = 0;
const lines = fs.readFileSync(path.join(OUT, "sweep-licensed-v3.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
for (const id of ["pr151", "pr151-1", "pr170", "pr170-1"]) {
  const base = id.replace(/-1$/, "");
  const data = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
  const visits = lines.filter((r) => r.course === "reading" && r.id === id);
  const renderedFile = path.join(OUT, "rendered-v3/reading", `${id}.json`);
  const rendered = fs.existsSync(renderedFile) ? fs.readFileSync(renderedFile, "utf8") : "";
  const text = flat(JSON.stringify(JSON.parse(rendered || "{}")));
  const expect = id.endsWith("-1") ? data.readingSentences.map((s) => s.korean) : data.readingSentences.map((s) => s.english);
  const missing = expect.filter((s) => !text.includes(flat(s)));
  const oldFound = OLD[base].filter((w) => text.includes(flat(w)));
  // Cards show the word; the meaning is behind "뜻 확인하기" (same on unchanged lessons,
  // e.g. rendered-v2/reading/pr150.json), so check the 14 words in order.
  const cardRun = flat(data.readingVocabulary.map((v) => v.word).join(""));
  const cardText = flat(JSON.parse(rendered || "[]").filter((s) => /Step 2/.test(s.step)).map((s) => s.text.replace(/뜻 확인하기|#\d+|adj\.|adv\.|conj\.|n\.|v\.|🔊|💡/g, "")).join(""));
  const cardsShown = id.endsWith("-1") ? "n/a" : cardText.includes(cardRun) ? "14/14 in order" : "MISSING";
  const problems = visits.flatMap((v) => [
    ...(v.loaded && v.loaded.rendered ? [] : [`${v.viewport}:not loaded`]),
    ...v.rows.flatMap((r) => (r.problems || []).map((p) => `${v.viewport}:${r.step}:${typeof p === "string" ? p : JSON.stringify(p)}`)),
    ...v.rows.filter((r) => r.snap && (r.snap.paywall || r.snap.errorScreen || r.snap.overflowX)).map((r) => `${v.viewport}:${r.step}:paywall/error/overflow`),
    ...((v.audio && v.audio.bad) || []).map((b) => `${v.viewport}:audio ${JSON.stringify(b)}`),
  ]);
  const ok = visits.length === 2 && rendered && missing.length === 0 && oldFound.length === 0 && problems.length === 0 && cardsShown !== "MISSING";
  if (!ok) bad++;
  console.log(JSON.stringify({ id, visits: visits.length, renderedSaved: !!rendered, sentencesShown: `${expect.length - missing.length}/${expect.length}`, cardsShown, oldPhrasesFound: oldFound, visitProblems: problems, ok }));
}
console.log(bad ? `FAIL ${bad}` : "PASS 4/4");
process.exit(bad ? 1 : 0);
