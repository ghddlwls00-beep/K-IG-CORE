#!/usr/bin/env node
// Writes out/map-summaries.md from the understand-workflow journal (counts, blocked-by-nature, risks per map).
const fs = require("fs");
const path = require("path");
const journal = process.argv[2];
const lines = fs.readFileSync(journal, "utf8").split("\n").filter(Boolean);
const out = [];
for (const line of lines) {
  let j;
  try { j = JSON.parse(line); } catch { continue; }
  if (j.type !== "result") continue;
  const r = j.result || j.value || j.output;
  if (!r || !r.mapFile) continue;
  out.push(`## ${path.basename(r.mapFile)}\n\n**Counts:** ${r.counts}\n\n**Blocked by nature:**\n${r.blockedByNature.map((x) => `- ${x}`).join("\n")}\n\n**Risks (unverified):**\n${r.risks.map((x, i) => `- R${i}: ${x}`).join("\n")}\n`);
}
const dest = path.join(__dirname, "../out/map-summaries.md");
fs.writeFileSync(dest, out.join("\n"));
console.log(`${out.length} maps → ${dest}`);
