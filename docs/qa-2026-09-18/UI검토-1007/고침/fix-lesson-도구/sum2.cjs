// drive-generic jsonl → per visit: status counts, non-PASS grouped by note (the local media 502 apart), completion · navigation lines
const fs = require("fs");
for (const file of process.argv.slice(2)) {
  for (const r of fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))) {
    const checks = r.checks || [];
    const by = {};
    for (const c of checks) by[c.status] = (by[c.status] || 0) + 1;
    const media502 = checks.filter((c) => c.status !== "PASS" && /HTTP 502 http:\/\/localhost:\d+\/audio\//.test(String(c.note)));
    const other = checks.filter((c) => c.status !== "PASS" && !media502.includes(c));
    console.log(`== ${r.course}/${r.id} ${r.viewport} ${JSON.stringify(by)} · non-PASS from the local /audio 502: ${media502.length} · other non-PASS: ${other.length}${r.visitError ? " · visitError " + r.visitError : ""}`);
    const clips = new Set(media502.map((c) => String(c.note).match(/\/audio\/\S+/)[0]));
    if (clips.size) console.log(`  502 clips: ${[...clips].join(" ")}`);
    for (const c of other) console.log(`  ${c.status} ${c.feature} | ${c.item} | ${String(c.note || "").slice(0, 260)}`);
    for (const c of checks) if (c.status === "PASS" && /completion|navigation|graded input/.test(c.feature)) console.log(`  PASS ${c.feature} | ${c.item} | ${String(c.note || "").slice(0, 260)}`);
  }
}
