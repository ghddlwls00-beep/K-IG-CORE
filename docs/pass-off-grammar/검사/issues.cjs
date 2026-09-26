// Count the readers' issues by type, confidence and learner-impact severity; list severity-high samples.
const fs = require("fs");
const path = require("path");
const outDir = path.join(process.argv[2], "pdf", "out");
const files = fs.readdirSync(outDir).filter((f) => /^g\d-p\d+-\d+\.json$/.test(f)).sort();
const byType = {};
const byConf = {};
const bySev = {};
const perFile = {};
const all = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  perFile[f] = { total: 0, sevHigh: 0 };
  for (const x of j.issues || []) {
    all.push({ file: f, ...x });
    byType[x.type] = (byType[x.type] || 0) + 1;
    byConf[x.confidence] = (byConf[x.confidence] || 0) + 1;
    const sev = x.severity || "(none)";
    bySev[sev] = (bySev[sev] || 0) + 1;
    perFile[f].total += 1;
    if (x.severity === "high") perFile[f].sevHigh += 1;
  }
}
// dedupe by normalized text+fix
const key = (x) => String(x.text || "").toLowerCase().replace(/[^a-z가-힣0-9]+/g, " ").trim();
const uniq = new Map();
for (const x of all) if (!uniq.has(key(x))) uniq.set(key(x), x);
console.log(JSON.stringify({ total: all.length, uniqueByText: uniq.size, byType, byConf, bySev, perFile }, null, 1));
if (process.argv[3] === "high") {
  for (const x of all.filter((x) => x.severity === "high")) console.log(`${x.file} p${x.page} [${x.type}] ${x.text} => ${x.fix}`);
}
