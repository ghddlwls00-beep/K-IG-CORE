// Attribute the READING clip gap: is it caused by KIG-002 replacing the
// passages, or was the coverage already missing before?
// Compares clip hit-rate for texts in KIG-002-changed lessons vs untouched ones.
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const W = "C:/Users/ghddl/WorkBuddy AI/2026-09-15-14-00-42/.tmp-kig";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const us = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const inv = require(path.join(REPO, "docs/qa-2026-09-15/scripts/out/speech-inventory.json"));
const BASE = process.argv[2] || "https://k-ig-core.vercel.app";
const CONC = 4;

const changed = new Set(
  fs.readFileSync(path.join(W, "kig002-lessons.txt"), "utf8").split("\n").filter(Boolean).map((x) => x.replace(/-1$/, "")),
);

const reading = inv.filter((e) => e.section === "READING");
const groups = {
  "KIG-002 lessons": reading.filter((e) => changed.has(e.lesson)),
  "untouched lessons": reading.filter((e) => !changed.has(e.lesson)),
};

async function hit(entry) {
  try {
    const r = await fetch(`${BASE}${us.unifiedSpeechPath(entry.text)}`, { method: "HEAD" });
    return r.status === 200;
  } catch {
    return false;
  }
}

async function run(list) {
  let cursor = 0;
  const out = new Array(list.length);
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (cursor < list.length) {
        const i = cursor++;
        out[i] = await hit(list[i]);
      }
    }),
  );
  return out;
}

(async () => {
  for (const [name, list] of Object.entries(groups)) {
    const res = await run(list);
    const ok = res.filter(Boolean).length;
    console.log(
      `${name.padEnd(18)} ${String(ok).padStart(4)}/${String(list.length).padEnd(5)} present  ` +
        `${String(list.length - ok).padStart(4)} missing  (${((ok / list.length) * 100).toFixed(1)}% coverage)`,
    );
  }
})();
