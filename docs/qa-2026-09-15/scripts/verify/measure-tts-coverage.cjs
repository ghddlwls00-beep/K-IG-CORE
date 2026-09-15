// How often would "prefer the first-party clip" hit, instead of falling back to
// the third-party TTS endpoint? Samples the real spoken inventory and asks
// production for each clip.
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const us = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const inv = require(path.join(REPO, "docs/qa-2026-09-15/scripts/out/speech-inventory.json"));

const BASE = process.argv[2] || "https://k-ig-core.vercel.app";
const ONLY = process.env.ONLY_SECTION || null;
const N = Number(process.argv[3] || 200);
const CONCURRENCY = 4; // R2 rate-limits; the audit kept this at 4 or below.

// Deterministic stride sample so re-runs are comparable.
const stride = Math.floor(inv.length / N);
const sample = [];
const pool = ONLY ? inv.filter((e) => e.section === ONLY) : inv;
const st2 = Math.max(1, Math.floor(pool.length / N));
for (let i = 0; i < pool.length && sample.length < N; i += st2) sample.push(pool[i]);

async function check(entry) {
  const url = `${BASE}${us.unifiedSpeechPath(entry.text)}`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    return { ok: r.status === 200, status: r.status, entry };
  } catch (e) {
    return { ok: false, status: `err:${e.message}`, entry };
  }
}

(async () => {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < sample.length) {
      const i = cursor++;
      results[i] = await check(sample[i]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const hits = results.filter((r) => r.ok);
  const miss = results.filter((r) => !r.ok);
  const bySection = {};
  for (const r of results) {
    const s = r.entry.section;
    bySection[s] = bySection[s] || { total: 0, hit: 0 };
    bySection[s].total++;
    if (r.ok) bySection[s].hit++;
  }

  console.log(`base            : ${BASE}`);
  console.log(`inventory size  : ${inv.length}`);
  console.log(`sampled         : ${results.length} (stride ${stride})`);
  console.log(`first-party hit : ${hits.length}/${results.length}  (${((hits.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`would fall back : ${miss.length}`);
  console.log("by section      :");
  for (const s of Object.keys(bySection)) {
    const b = bySection[s];
    console.log(`   ${s.padEnd(11)} ${String(b.hit).padStart(3)}/${String(b.total).padEnd(3)}  ${((b.hit / b.total) * 100).toFixed(0)}%`);
  }
  if (miss.length) {
    console.log("misses (up to 20):");
    for (const m of miss.slice(0, 20)) console.log(`   [${m.status}] ${m.entry.section}/${m.entry.lesson} :: ${m.entry.text.slice(0, 60)}`);
  }
})();
