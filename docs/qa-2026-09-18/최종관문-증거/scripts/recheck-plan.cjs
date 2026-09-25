// 관문 5 재검사 나누기 — 지금 대상(gen-recheck-targets 출력)에서 이미 한 것(out/recheck-audio-g15f*.jsonl 의 url|step|label, BLOCKED 는 다시)을 빼고
// 남은 것을 N 조각 파일로(차례대로 돌려 담기). 조각마다 새 --suffix 로 recheck-audio --from 을 돌리면 서로 겹치지 않음.
//   node recheck-plan.cjs <targets.jsonl> <N> <첫 조각 번호>   → recheck-part<k>.jsonl (k = 첫 번호 …)
//   node recheck-plan.cjs --count <targets.jsonl>              → 관문 5 셈(대상마다 가장 늦은 재검사 결과)
const fs = require("fs");
const path = require("path");
const OUT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out";
const S = __dirname;
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const done = new Map();
for (const f of fs.readdirSync(OUT).filter((x) => /^recheck-audio-g15f\d+\.jsonl$/.test(x))) {
  for (const r of readJsonl(path.join(OUT, f))) {
    const k = `${r.url}|${r.step}|${r.label}`;
    const p = done.get(k);
    if (!p || new Date(p.at) < new Date(r.at)) done.set(k, { ...r, file: f });
  }
}
const key = (t) => `${t.url}|${t.step}|${t.label}`;
if (process.argv[2] === "--count") {
  const targets = readJsonl(process.argv[3]);
  const by = {}; const notYet = []; const fails = [];
  for (const t of targets) {
    const r = done.get(key(t));
    if (!r) { notYet.push(t); continue; }
    by[r.status] = (by[r.status] || 0) + 1;
    if (r.status !== "PASS") fails.push(`${t.course}/${t.id} [${r.openedAt}] ${t.step} ▶ ${t.label} — ${r.status} ${r.note} (스윕: ${t.status} ${String(t.sweepNote).slice(0, 50)})`);
  }
  console.log(`대상 ${targets.length} · 재검사 결과 있음 ${targets.length - notYet.length} · 아직 ${notYet.length} · ${JSON.stringify(by)}`);
  for (const f of fails) console.log(`  ${f}`);
  fs.writeFileSync(path.join(S, "recheck-count.json"), JSON.stringify({ at: new Date().toISOString(), targets: targets.length, rechecked: targets.length - notYet.length, notYet: notYet.length, byStatus: by, fails }, null, 1));
  process.exit(0);
}
const [tf, nArg, firstArg] = process.argv.slice(2);
const N = Number(nArg || 3), FIRST = Number(firstArg || 1);
const targets = readJsonl(tf);
const left = targets.filter((t) => { const r = done.get(key(t)); return !r || r.status === "BLOCKED"; });
const parts = Array.from({ length: N }, () => []);
left.forEach((t, i) => parts[i % N].push(t));
for (let p = 0; p < N; p++) {
  const f = path.join(S, `recheck-part${FIRST + p}.jsonl`);
  fs.writeFileSync(f, parts[p].map((t) => JSON.stringify(t)).join("\n") + (parts[p].length ? "\n" : ""));
  console.log(`recheck-part${FIRST + p}.jsonl ${parts[p].length} → --suffix -g15f${FIRST + p}`);
}
console.log(`대상 ${targets.length} · 이미 한 것 ${targets.length - left.length} · 남은 것 ${left.length}`);
