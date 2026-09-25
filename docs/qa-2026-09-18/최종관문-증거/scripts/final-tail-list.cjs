// 스윕 끝 — 강의 × 화면마다 '가장 늦은 기록'(gate-count 와 같은 파일 규칙) 가운데 문제가 적힌 것: 방문 오류 · 안 뜸 · 요청 실패(연결) · 4xx/5xx ·
// 소리 FAIL(RETEST · NA 빼고) · 없는 글자. 인터넷 끊김(09-25 14:1x~14:3x · 21:33)이 남긴 기록을 다시 돌 목록으로 — 진짜 결함이면 다시 돌아도 또 나옴.
//   node final-tail-list.cjs [--json out.json]
const fs = require("fs");
const path = require("path");
const FEAT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/docs/qa-2026-09-18/out/features";
const RE = /^(student|phonics|grammar1|grammar2|ld|reading)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
const latest = new Map();
for (const f of fs.readdirSync(FEAT).filter((x) => RE.test(x))) {
  for (const line of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    const k = `${r.course}|${r.id}|${r.viewport}`;
    const p = latest.get(k);
    if (!p || new Date(p.r.at) < new Date(r.at)) latest.set(k, { r, f });
  }
}
const list = [];
for (const [k, { r, f }] of latest) {
  const ev = r.events || {};
  const why = [];
  if (r.visitError) why.push("방문 오류");
  if (r.load && r.load.navigated === false) why.push("안 뜸");
  if ((ev.failed || []).length) why.push(`요청 실패 ${ev.failed.length}`);
  if ((ev.badResponses || []).length) why.push(`4xx/5xx ${ev.badResponses.length}`);
  const af = (r.audio || []).filter((a) => a && a.status && !/PASS|NA|RETEST/.test(a.status)).length;
  if (af) why.push(`소리 ${af}`);
  const miss = r.content && r.content.missing ? r.content.missing.length : 0;
  if (miss) why.push(`없는 글자 ${miss}`);
  if (why.length) list.push({ course: r.course, id: r.id, viewport: r.viewport, at: r.at, file: f, why: why.join(" · ") });
}
list.sort((a, b) => a.course.localeCompare(b.course) || a.viewport.localeCompare(b.viewport) || a.id.localeCompare(b.id));
console.log(`강의×화면(가장 늦은 기록) ${latest.size} · 문제 적힌 것 ${list.length}`);
for (const x of list) console.log(`  ${x.course}/${x.id} ${x.viewport} ${x.at} — ${x.why}`);
const groups = {};
for (const x of list) (groups[`${x.course}|${x.viewport}`] ||= []).push(x.id);
for (const [g, ids] of Object.entries(groups)) { const [c, vp] = g.split("|"); console.log(`→ node docs/qa-2026-09-18/scripts/drive-generic.cjs --course ${c} --viewports ${vp} --suffix -g15-${vp}-s2of2 --port <97xx> --clone g0-w<n> --ids ${[...new Set(ids)].join(",")}`); }
const J = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (J) fs.writeFileSync(J, JSON.stringify({ at: new Date().toISOString(), latest: latest.size, list, groups }, null, 1));
