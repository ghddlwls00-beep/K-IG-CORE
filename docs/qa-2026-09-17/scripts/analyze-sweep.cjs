#!/usr/bin/env node
/**
 * Phase 3/4/6 — summarise the licensed v2 sweep (out/sweep-licensed-v2.jsonl).
 *
 * Coverage: every validRoutes lesson × desktop/mobile must have exactly one record
 * that LOADED (URL reached + course back-link rendered). Missing or unloaded
 * visits are listed by URL — they are "not inspected", not "passed".
 *
 * Problems are normalised (numbers/URLs collapsed) and counted with examples, per
 * course × viewport. A visit PASSES when it loaded and none of its rows has a
 * problem other than the known, separately reported ones passed in --ignore.
 *
 *   node analyze-sweep.cjs [--suffix -v2]
 * Output: out/sweep-summary.json, content-review/../phase4-sweep.md table body printed.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SUFFIX = arg("--suffix", "-v2");
const JSONL = path.join(__dirname, `../out/sweep-licensed${SUFFIX}.jsonl`);
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;

const records = fs.readFileSync(JSONL, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const byKey = new Map();
for (const r of records) byKey.set(`${r.url}|${r.viewport}`, r); // last record wins

const norm = (p) => p
  .replace(/https?:\/\/[^\s)]+/g, (u) => u.replace(/\/(audio|media)\/[^\s)]+/, "/$1/…").replace(/\/(student|phonics|grammar1|grammar2|ld|reading|cnn)\/[a-z0-9-]+/, "/$1/…"))
  .replace(/\d+(\.\d+)?(px| chars|\))/g, "N$2")
  .replace(/\(h1: [^)]*\)/, "(h1: …)")
  .slice(0, 160);

const summary = { at: new Date().toISOString(), records: records.length, expected: 0, missing: [], notLoaded: [], byCourse: {}, problems: {}, audio: { pressed: 0, requested: 0, bad: [] }, steps: {}, smallTargets: {}, reloads: 0 };
for (const [course, ids] of Object.entries(routes)) {
  for (const id of ids) {
    for (const viewport of ["desktop", "mobile"]) {
      summary.expected++;
      const key = `/${course}/${id}|${viewport}`;
      const cv = `${course} ${viewport}`;
      const bucket = (summary.byCourse[cv] ||= { visits: 0, loaded: 0, pass: 0, withProblems: 0, stepsClicked: 0, rows: 0 });
      const r = byKey.get(key);
      if (!r) { summary.missing.push(key); continue; }
      bucket.visits++;
      const loaded = r.loaded && r.loaded.navigated && r.loaded.rendered;
      // GRAMMAR I odd (answer) pages redirect to their even pair on purpose
      // (src/app/[course]/[lesson]/page.tsx:131-139); the pair's own visit covers the screen.
      const odd = course === "grammar1" && /^gh1-(\d+)/.test(id) && Number(id.match(/^gh1-(\d+)/)[1]) % 2 === 1;
      if (!loaded && odd && r.loaded && r.loaded.href) {
        const even = id.replace(/^gh1-(\d+)/, (_, n) => `gh1-${String(Number(n) - 1).padStart(3, "0")}`);
        if (r.loaded.href.endsWith(`/grammar1/${even}`)) {
          bucket.redirectByDesign = (bucket.redirectByDesign || 0) + 1;
          continue;
        }
      }
      if (!loaded) { summary.notLoaded.push(`${key} ${r.visitError || JSON.stringify(r.loaded)}`); continue; }
      bucket.loaded++;
      if (r.loaded.reloads) summary.reloads++;
      bucket.stepsClicked += (r.steps || []).length;
      bucket.rows += r.rows.length;
      (summary.steps[course] ||= {})[(r.steps || []).length] = ((summary.steps[course] || {})[(r.steps || []).length] || 0) + 1;
      let has = false;
      for (const row of r.rows) {
        for (const p of row.problems) {
          has = true;
          const k = norm(p);
          const e = (summary.problems[k] ||= { count: 0, visits: new Set(), examples: [] });
          e.count++;
          e.visits.add(key);
          if (e.examples.length < 4) e.examples.push(`${key} [${row.step}]`);
        }
        if (row.snap && row.snap.smallTargets) {
          const s = (summary.smallTargets[cv] ||= { rows: 0, max: 0 });
          s.rows++;
          s.max = Math.max(s.max, row.snap.smallTargets);
        }
      }
      if (r.audio && r.audio.played) {
        summary.audio.pressed++;
        if (r.audio.requests && r.audio.requests.length) summary.audio.requested++;
        if (r.audio.bad && r.audio.bad.length) summary.audio.bad.push(`${key} ${JSON.stringify(r.audio.bad)}`);
      }
      if (has) bucket.withProblems++; else bucket.pass++;
    }
  }
}
for (const e of Object.values(summary.problems)) e.visits = e.visits.size;
fs.writeFileSync(path.join(__dirname, "../out/sweep-summary.json"), JSON.stringify(summary, null, 1));

console.log(`records ${summary.records}, expected visits ${summary.expected}, missing ${summary.missing.length}, not loaded ${summary.notLoaded.length}, pages that reloaded themselves ${summary.reloads}`);
console.log("\n| course · viewport | visits | loaded | redirect by design | no problem | with problem | step clicks |\n|---|---|---|---|---|---|---|");
for (const [k, b] of Object.entries(summary.byCourse)) console.log(`| ${k} | ${b.visits} | ${b.loaded} | ${b.redirectByDesign || 0} | ${b.pass} | ${b.withProblems} | ${b.stepsClicked} |`);
console.log("\nproblems (normalised), by visits:");
for (const [k, e] of Object.entries(summary.problems).sort((a, b) => b[1].visits - a[1].visits)) console.log(`${String(e.visits).padStart(5)} visits / ${String(e.count).padStart(5)} rows  ${k}\n        e.g. ${e.examples.join(" | ")}`);
console.log(`\naudio: play pressed ${summary.audio.pressed}, clip requested ${summary.audio.requested}, bad ${summary.audio.bad.length}`);
for (const b of summary.audio.bad.slice(0, 10)) console.log("  " + b);
console.log("\nsmall touch targets (<24px) rows per course·viewport:", JSON.stringify(summary.smallTargets));
console.log("step counts per course:", JSON.stringify(summary.steps));
if (summary.missing.length) console.log("\nmissing:", summary.missing.slice(0, 20).join(", "));
if (summary.notLoaded.length) console.log("\nnot loaded:", summary.notLoaded.slice(0, 20).join("\n"));
