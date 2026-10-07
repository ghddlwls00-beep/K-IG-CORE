// tools-c (2026-10-08 고침3): one line per drive-generic / drive-passoff visit — checks PASS/FAIL/BLOCKED, audio FAIL, and the rows this
// worker's fixes touch (completion · 59 · navigation · adult words/chunks · folds). node sum-generic.cjs <jsonl>…
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  if (!fs.existsSync(f)) { console.log(`(none) ${f}`); continue; }
  for (const line of fs.readFileSync(f, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    const c = r.checks || [];
    const n = (s) => c.filter((x) => x.status === s).length;
    const aFail = (r.audio || []).filter((a) => a.status === "FAIL").length;
    console.log(`${f.split(/[\\/]/).pop()} · ${r.id} ${r.viewport} — checks PASS ${n("PASS")} FAIL ${n("FAIL")} BLOCKED ${n("BLOCKED")} · audio ${(r.audio || []).length} (FAIL ${aFail}) · verdict ${r.verdict || "-"}`);
    for (const x of c) {
      const key = `${x.feature} ${x.item}`;
      if (x.status !== "PASS" || /completion|59|navigation|adult words · .*빈칸|adult chunks · .*뜻 보기/.test(key)) console.log(`    ${x.status.padEnd(7)} ${key.slice(0, 70)} — ${String(x.note || "").slice(0, 170)}`);
    }
    for (const a of (r.audio || []).filter((a) => a.status === "FAIL")) console.log(`    audio FAIL ${String(a.control).slice(0, 60)} — ${String(a.note || "").slice(0, 100)}`);
  }
}
