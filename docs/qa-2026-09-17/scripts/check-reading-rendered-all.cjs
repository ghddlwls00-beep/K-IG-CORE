#!/usr/bin/env node
/**
 * After ISS-00 (886b08c) removed the client fallback to the all-lessons READING data:
 * does EVERY READING page still show its own passage? Reads the licensed sweep output
 * (sweep-licensed.cjs --course reading --suffix -v3), desktop step texts.
 *
 *   main page  /reading/prNNN    — every readingSentences English + the 14 card words in order (Step 2)
 *   script page /reading/prNNN-1 — every readingSentences Korean
 * Exit 1 if any page misses anything.
 *
 *   node check-reading-rendered-all.cjs [--suffix -v3]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SUFFIX = arg("--suffix", "-v3");
const flat = (s) => (s || "").replace(/[^A-Za-z0-9가-힣]+/g, "");
const ids = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons.reading;

let pagesOk = 0, sentencesChecked = 0, sentencesShown = 0, cardPages = 0, cardPagesOk = 0;
const fails = [];
for (const id of ids) {
  const data = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
  const file = path.join(OUT, `rendered${SUFFIX}`, "reading", `${id}.json`);
  if (!fs.existsSync(file)) { fails.push({ id, why: "no rendered file" }); continue; }
  const steps = JSON.parse(fs.readFileSync(file, "utf8"));
  const all = flat(steps.map((s) => s.text).join(" "));
  const isScript = id.endsWith("-1");
  const want = (data.readingSentences || []).map((s) => (isScript ? s.korean : s.english));
  const missing = want.filter((t) => !all.includes(flat(t)));
  sentencesChecked += want.length;
  sentencesShown += want.length - missing.length;
  let cardsOk = true;
  if (!isScript) {
    cardPages++;
    const run = flat((data.readingVocabulary || []).map((v) => v.word).join(""));
    const step2 = flat(steps.filter((s) => /Step 2/.test(s.step)).map((s) => s.text.replace(/뜻 확인하기|#\d+|\b(?:adj|adv|conj|prep|pron|interj|n|v)\.|🔊|💡/g, "")).join(""));
    cardsOk = run.length > 0 && step2.includes(run);
    if (cardsOk) cardPagesOk++;
  }
  if (want.length && !missing.length && cardsOk) pagesOk++;
  else fails.push({ id, sentences: want.length, missing: missing.map((m) => m.slice(0, 50)), cardsOk });
}
const summary = { suffix: SUFFIX, pages: `${pagesOk}/${ids.length}`, sentencesShown: `${sentencesShown}/${sentencesChecked}`, cardRunsInOrder: `${cardPagesOk}/${cardPages}` };
console.log(summary);
for (const f of fails.slice(0, 30)) console.log("  FAIL", JSON.stringify(f));
fs.writeFileSync(path.join(OUT, `reading-rendered-all${SUFFIX}.json`), JSON.stringify({ summary, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
