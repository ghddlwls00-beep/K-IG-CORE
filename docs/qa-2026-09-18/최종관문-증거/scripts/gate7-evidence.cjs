// 관문 7 — content-fix-list.md [Critical] 3건(d024 n9 · d058 n1 · d192 n2)이 운영 화면 · 소리에서 고친 글인가. 관문 0 기록(g0 · g15, 강의 × 화면마다 가장 늦은 것)으로:
//   소리: 새 영어 글의 클립(앱의 unifiedSpeech 키)을 누른 기록이 재생됐나(playing · resolved) · 옛 글의 클립 요청 0
//   화면: 받아쓰기 타일(새 글 머리로 찾음) PASS · 짝 쪽(-1)의 한국어 글자 검사가 새 한국어를 기대하고 '없음' 0
//   node gate7-evidence.cjs [--json out.json]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const E = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
const FILE_RE = /^ld-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
const T = [
  { id: "d024", n: 9, en: "The crowd waiting for them in France was very surprised when the balloon landed.", old: "The crowd waiting for them in England was very surprised when the balloon landed.", ko: "프랑스에서 그들을 기다리던 군중은 그 기구가 착륙했을 때 매우 놀랐다." },
  { id: "d058", n: 1, en: "One day in 1896, the citizens of Detroit, Michigan were amazed to see a motor vehicle coming down the street.", old: "One day in 1893, the citizens of Detroit, Michigan were amazed to see a motor vehicle coming down the street.", ko: "1896년 어느 날 미시간주 디트로이트의 시민들은 발동기 차량이 길을 내려오는 것을 보고 감탄했다." },
  { id: "d192", n: 2, en: "Traditionally, many of them lived in the desert areas of Australia.", old: "Most of them live in the desert areas of Australia.", ko: "전통적으로 그들 중 다수는 오스트레일리아의 사막 지역에서 살았다." },
];
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const latest = new Map();
for (const f of fs.readdirSync(FEAT).filter((x) => FILE_RE.test(x))) for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
  if (!l.trim()) continue; let r; try { r = JSON.parse(l); } catch { continue; }
  if (!/^d(024|058|192)(-1)?$/.test(r.id)) continue;
  const k = `${r.id}|${r.viewport}`; const p = latest.get(k); if (!p || new Date(p.at) < new Date(r.at)) latest.set(k, r);
}
const out = []; let bad = 0;
for (const t of T) {
  const row = (scripts[t.id] || []).find((x) => String(x.n) === String(t.n));
  const dataOk = row && row.en === t.en && row.ko === t.ko;
  const key = H.expectedClip(t.en), oldKey = H.expectedClip(t.old);
  const head = t.en.slice(0, 30);
  const r = { id: t.id, n: t.n, dataOk, key, byViewport: {} };
  for (const vp of ["desktop", "tablet", "mobile"]) {
    const main = latest.get(`${t.id}|${vp}`), pair = latest.get(`${t.id}-1|${vp}`);
    const clips = main ? (main.audio || []).flatMap((a) => (a.clips || []).map((c) => ({ ...c, status: a.status, control: a.control }))) : [];
    const played = clips.filter((c) => c.path === key && (c.playing > 0 || c.resolved > 0)).length;
    const oldReq = clips.filter((c) => c.path === oldKey).length;
    const tiles = main ? (main.checks || []).filter((c) => /dictation/.test(c.feature) && String(c.item).includes(head.slice(0, 25))) : [];
    const pairExp = E.expected("ld", `${t.id}-1`);
    const koExpected = JSON.stringify(pairExp.texts).includes(t.ko);
    // 태블릿은 드라이버 깊이 light(7단계 7-1 e 설계) — 소리 버튼을 누르지 않고 화면 글만 봄. 그 화면에서는 소리를 요구하지 않고(적어 둠), 옛 글 클립 요청 0 · 화면 글만 셈.
    const light = !!main && main.depth === "light";
    r.byViewport[vp] = { main: !!main, at: main && main.at, depth: main && main.depth, played, oldRequested: oldReq, tilePass: tiles.filter((c) => c.status === "PASS").length, tileOther: tiles.filter((c) => c.status !== "PASS").map((c) => c.status), pair: !!pair, koExpected, koMissing: pair && pair.content ? pair.content.missingCount : null, mainMissing: main && main.content ? main.content.missingCount : null };
    const v = r.byViewport[vp];
    if (!main || !pair || (!v.played && !light) || v.oldRequested || v.tileOther.length || !koExpected || v.koMissing || v.mainMissing) bad++;
  }
  if (!dataOk) bad++;
  out.push(r);
}
for (const r of out) {
  console.log(`${r.id} n${r.n} — 데이터 새 글 ${r.dataOk ? "예" : "아니오"} · 클립 ${r.key}`);
  for (const [vp, v] of Object.entries(r.byViewport)) console.log(`   ${vp.padEnd(7)} 기록 ${v.main ? "있음" : "없음"} ${v.at || ""}${v.depth === "light" ? " (깊이 light — 소리 안 누름)" : ""} · 새 글 클립 재생 ${v.played} · 옛 글 클립 요청 ${v.oldRequested} · 받아쓰기 타일 PASS ${v.tilePass}${v.tileOther.length ? " · 다른 것 " + v.tileOther.join(",") : ""} · 본 쪽 없는 글자 ${v.mainMissing} · -1쪽 기록 ${v.pair ? "있음" : "없음"} · 새 한국어 기대 ${v.koExpected ? "예" : "아니오"} · 없음 ${v.koMissing}`);
}
console.log(`기대와 다름 ${bad}`);
const J = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (J) fs.writeFileSync(J, JSON.stringify({ at: new Date().toISOString(), out, bad }, null, 1));
process.exit(bad ? 1 : 0);
