#!/usr/bin/env node
// prod-b (2026-10-08): 운영 dc68238e 뒤(out/ui-1007/after-prod-b)를 같은 코드의 로컬 값(after-local-b) · 1차 고침 뒤(after-local) · 고치기 전(out/ui-1007)과 견줌.
//   전 1: out/ui-1007/after-local(1차 고침 뒤 로컬 · 같은 빈 프로필 · 390 · 1366) — 있으면 이것과
//   전 2: out/ui-1007/metrics.jsonl(고치기 전 운영 970fa371 · 360 은 여기에만) — 1 이 없을 때
//   잰 값: 옆 밀림 · 44px 미만(inline 뺌) · 12px 미만 · 16px 미만 입력 · 글자 대비 미달 + (뒤에만) 단계 탭 넘침 · 스크롤 막대 자리 · 검색 창
//   node compare-b.cjs [--break]   (--break: 뒤 값 하나를 일부러 나쁘게 — 'worse' 가 잡혀야 맞음)
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const OUT = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007");
const BREAK = process.argv.includes("--break");
const readAll = (f) => fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const withM = (rows) => rows.filter((r) => r.metrics && !r.metrics.error);
const afterAll = readAll(path.join(OUT, "after-prod-b/metrics.jsonl"));
const after = withM(afterAll);
const prev1 = withM(readAll(path.join(OUT, "after-local-b/metrics.jsonl"))); // 전 1 = 같은 코드를 로컬 빌드로 본 값(통합 · 빈 프로필)
const prev1b = withM(readAll(path.join(OUT, "after-local/metrics.jsonl"))); // 1차 고침 뒤 로컬
const prev2 = withM(readAll(path.join(OUT, "metrics.jsonl")));
const key = (r) => `${r.theme}|${r.vp}|${r.slug}|${r.state}`;
const P1 = new Map(); for (const r of prev1b) P1.set(key(r), r); for (const r of prev1) P1.set(key(r), r);
const P2 = new Map(); for (const r of prev2) { const k = key(r); if (!P2.has(k) || r.mode === "free") P2.set(k, r); }
const A = new Map(); for (const r of after) A.set(key(r), r);
if (BREAK) { const first = [...A.values()].find((r) => r.slug !== "free_home"); if (first) first.metrics = { ...first.metrics, overflowX: true }; }
const f = (m) => m ? { ox: m.overflowX ? 1 : 0, s44: m.small44 ? m.small44.count - (m.small44.inline || 0) : null, u12: m.text ? m.text.under12 : null, zoom: m.zoomFields, low: m.contrast ? m.contrast.low : null } : null;
const rows = [];
for (const [k, a] of A) {
  const p = P1.get(k) || P2.get(k) || null;
  rows.push({ k, prevFrom: P1.has(k) ? "after-local(-b)" : P2.has(k) ? `운영 전(${P2.get(k).mode})` : null, prev: p ? f(p.metrics) : null, now: f(a.metrics), tabOut: a.metrics.tabOut, tabClipped: a.metrics.tabClipped, gutter: a.metrics.gutter, files: a.files, prevFiles: p ? p.files : null, s44: a.metrics.small44 && a.metrics.small44.samples.slice(0, 4), tiny: a.metrics.text && a.metrics.text.tinySamples.slice(0, 4), low: a.metrics.contrast && a.metrics.contrast.samples.slice(0, 3), switches: a.metrics.switches });
}
const sum = (list, pick) => list.reduce((t, r) => { const v = pick(r) || {}; for (const c of ["ox", "s44", "u12", "zoom", "low"]) t[c] += v[c] || 0; return t; }, { ox: 0, s44: 0, u12: 0, zoom: 0, low: 0 });
const matched = rows.filter((r) => r.prev);
const worse = matched.filter((r) => ["ox", "s44", "u12", "zoom", "low"].some((c) => (r.now[c] || 0) > (r.prev[c] || 0)));
const better = matched.filter((r) => ["ox", "s44", "u12", "zoom", "low"].some((c) => (r.now[c] || 0) < (r.prev[c] || 0)));
const nonHomeBad = rows.filter((r) => !/home/.test(r.k) && ["ox", "s44", "u12", "zoom", "low"].some((c) => (r.now[c] || 0) > 0));
// 단계 탭(34 · 35)
const tabOut = rows.filter((r) => (r.tabOut || 0) > 0).map((r) => ({ k: r.k, tabOut: r.tabOut }));
//   'Step' 은 화면 읽기용(sr-only · 1px) 글이라 뺌 — 남는 것이 실제로 '…' 로 줄어든 탭 이름
const tabClipped = rows.map((r) => ({ k: r.k, clipped: (r.tabClipped || []).filter((t) => t && t !== "Step") })).filter((r) => r.clipped.length);
// 11 — 데스크톱에서 한 강의의 단계마다 스크롤 막대 자리가 같은가
//   clientWidth 는 막대가 없을 때 gutter 를 0 으로 돌려줘(브라우저 셈) 믿지 않음 — 제목 · 단계 탭 막대의 x 가 단계마다 같은지로 봄
const xs = (rows) => { const m = new Map(); for (const r of rows) if (r.vp === "desktop" && /^step\d|^open$|^end$/.test(r.state) && r.metrics.h1) { const g = `${r.theme}|${r.slug}`; if (!m.has(g)) m.set(g, new Set()); m.get(g).add(r.metrics.h1.x); } return [...m].filter(([, s]) => s.size > 1).map(([g, s]) => ({ g, h1x: [...s] })); };
const gutterJumps = xs(after);
const gutterJumpsPrev = xs(prev1);
// 검색 창(12 · 24 · 52 · 53)
const search = afterAll.filter((r) => r.state === "search-open" || r.state === "search-keys").map((r) => ({ k: `${r.theme}|${r.vp}|${r.state}`, dialog: r.dialog, tabOutside: r.tabOutside, shiftTabOutside: r.shiftTabOutside, afterEsc: r.afterEsc }));
const errors = afterAll.filter((r) => r.metrics && r.metrics.error).map((r) => key(r));
const out = {
  after: A.size, matched: matched.length, unmatched: rows.filter((r) => !r.prev).map((r) => r.k),
  totals: { now: sum(rows, (r) => r.now), nowMatched: sum(matched, (r) => r.now), prevMatched: sum(matched, (r) => r.prev) },
  worse: worse.map((r) => ({ k: r.k, from: r.prevFrom, prev: r.prev, now: r.now, s44: r.s44, tiny: r.tiny, low: r.low })),
  better: better.length, nonHomeBad: nonHomeBad.map((r) => ({ k: r.k, now: r.now, s44: r.s44, tiny: r.tiny, low: r.low })),
  tabOut, tabClipped, gutterJumps, gutterJumpsPrev, search, errors,
};
if (!BREAK) fs.writeFileSync(path.join(OUT, "after-prod-b/compare.json"), JSON.stringify({ ...out, rows }, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exitCode = worse.length ? 1 : 0;
