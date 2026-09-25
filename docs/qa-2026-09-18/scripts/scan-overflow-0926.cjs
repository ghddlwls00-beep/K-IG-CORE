#!/usr/bin/env node
/**
 * 2026-09-26 — 스윕 기록의 가로 넘침을 화면 폭으로 다시 셈.
 * 까닭: SNAPSHOT(lib/harness.cjs)의 overflowX 는 scrollWidth 를 innerWidth 에 댐. 태블릿 · 휴대폰 흉내에서 페이지가 넓으면 브라우저가 줄여 맞추고
 * innerWidth 도 같이 커져 넘침을 못 봄(깨기 F: 태블릿 1,601px 인데 넘침 false). 관문 스윕도 같은 SNAPSHOT 을 씀 → 기록에 남은 scrollWidth 를
 * 설정한 화면 폭(컴퓨터 1,366 · 태블릿 768 · 휴대폰 390)에 대어 넘친 쪽이 있었는지 셈. 강의 × 화면마다 가장 늦은 기록(관문 0 세는 법).
 *   node scan-overflow-0926.cjs [--since 2026-09-24T00:00:00Z]
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "../out/features");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SINCE = arg("--since", "2026-09-24T00:00:00Z");
const WIDTH = { desktop: 1366, tablet: 768, mobile: 390 };
// --extra <파일>: 깨기용 — 기록 한 줄의 scrollWidth 를 넓힌 사본 파일을 더해 넘침 1 이 잡히는지
const EXTRA = arg("--extra", "");
const latest = new Map();
let files = 0, records = 0;
const sources = fs.readdirSync(DIR).filter((x) => x.endsWith(".jsonl") && !/^common-/.test(x)).map((x) => path.join(DIR, x));
if (EXTRA) sources.push(EXTRA);
for (const full of sources) {
  const f = path.basename(full);
  files++;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    if (!line.includes('"viewport"') || !line.includes('"scrollWidth"')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (!r.viewport || !WIDTH[r.viewport] || !r.at || r.at < SINCE || !r.base || !/k-ig-core\.vercel\.app/.test(r.base)) continue;
    records++;
    const widths = [...line.matchAll(/"scrollWidth":(\d+)/g)].map((m) => Number(m[1]));
    const key = `${r.course}/${r.id}@${r.viewport}`;
    const prev = latest.get(key);
    if (!prev || prev.at < r.at) latest.set(key, { at: r.at, file: f, max: Math.max(...widths), viewport: r.viewport, course: r.course, id: r.id });
  }
}
const over = [...latest.values()].filter((x) => x.max > WIDTH[x.viewport] + 1);
const byVp = {};
for (const x of latest.values()) { byVp[x.viewport] ||= { lessons: 0, over: 0, maxSeen: 0 }; byVp[x.viewport].lessons++; byVp[x.viewport].maxSeen = Math.max(byVp[x.viewport].maxSeen, x.max); }
for (const x of over) byVp[x.viewport].over++;
console.log(`기록 파일 ${files} · ${SINCE} 뒤 운영 기록 ${records} · 강의 × 화면 ${latest.size}`);
for (const [vp, s] of Object.entries(byVp)) console.log(`  ${vp}: 강의 ${s.lessons} · 화면 폭(${WIDTH[vp]}px)보다 넓은 쪽 ${s.over} · 가장 넓은 scrollWidth ${s.maxSeen}`);
for (const x of over.slice(0, 20)) console.log(`  넘침: ${x.course}/${x.id} ${x.viewport} ${x.max}px (${x.file} · ${x.at})`);
process.exitCode = over.length ? 1 : 0;
