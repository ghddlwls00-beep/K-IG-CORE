// 한 강의 × 화면의 기록(모든 파일 · 시각 순)에서 문제 칸만 — 방문 오류 · 안 뜸 · 요청 실패 · 4xx/5xx · 예외 · 콘솔 · PASS/NA/RETEST 아닌 소리 · 없는 글자 · FAIL 확인.
//   node show-record.cjs ld d078 mobile
const fs = require("fs");
const path = require("path");
const FEAT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out/features";
const [course, id, vp] = process.argv.slice(2);
const RE = new RegExp(`^${course}-g(0|15)-.*\\.jsonl$`);
const rows = [];
for (const f of fs.readdirSync(FEAT).filter((x) => RE.test(x))) {
  for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
    if (!l.trim()) continue; let r; try { r = JSON.parse(l); } catch { continue; }
    if (r.id === id && (!vp || r.viewport === vp)) rows.push({ f, r });
  }
}
rows.sort((a, b) => new Date(a.r.at) - new Date(b.r.at));
for (const { f, r } of rows) {
  const ev = r.events || {};
  console.log(`== ${r.at} ${r.viewport} ${f}`);
  if (r.visitError) console.log(`  방문 오류: ${String(r.visitError).slice(0, 300)}`);
  if (r.load && r.load.navigated === false) console.log(`  안 뜸: ${JSON.stringify(r.load).slice(0, 300)}`);
  for (const x of ev.failed || []) console.log(`  요청 실패: ${JSON.stringify(x).slice(0, 300)}`);
  for (const x of ev.badResponses || []) console.log(`  4xx/5xx: ${JSON.stringify(x).slice(0, 300)}`);
  for (const x of ev.exceptions || []) console.log(`  예외: ${JSON.stringify(x).slice(0, 300)}`);
  for (const x of ev.console || []) console.log(`  콘솔: ${JSON.stringify(x).slice(0, 300)}`);
  for (const a of r.audio || []) if (a && a.status && !/PASS|NA|RETEST/.test(a.status)) console.log(`  소리 ${a.status}: ${a.control} — ${String(a.note || "").slice(0, 240)}`);
  for (const m of (r.content && r.content.missing) || []) console.log(`  없는 글자: ${JSON.stringify(m).slice(0, 240)}`);
  for (const c of r.checks || []) if (c && c.status && !/PASS|NA/.test(c.status)) console.log(`  확인 ${c.status}: ${String(c.name || c.check || "").slice(0, 120)} — ${String(c.note || c.detail || "").slice(0, 200)}`);
  for (const p of r.problems || []) console.log(`  problem: ${JSON.stringify(p).slice(0, 300)}`);
}
