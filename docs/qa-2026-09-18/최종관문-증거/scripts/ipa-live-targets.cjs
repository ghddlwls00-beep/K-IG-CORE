// 소리 꼴 둘째 판(dd12758) 배포 뒤 운영 확인 대상 — 운영 스윕 기록(강의×화면 가장 늦은 것)에서 한국어 낱말 문장의 한글판 클립(397f1e8)을 부른 버튼 전부를
// recheck-audio --from 꼴로. 다시 누르면 발음 기호판 클립을 불러야 하고(기대 클립) 한글판은 0 이어야 한다.
//   node ipa-live-targets.cjs <ipa-clips.json> <out.jsonl>
//   node ipa-live-targets.cjs --verify <ipa-clips.json> <recheck-audio-ipa*.jsonl ...>
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
const clipsFile = process.argv[2] === "--verify" ? process.argv[3] : process.argv[2];
const list = JSON.parse(fs.readFileSync(clipsFile, "utf8")).filter((x) => /\s/.test(x.text.replace(/\s*⟨[^⟩]*⟩\s*$/, "")));
const hangul = new Map(list.map((x) => [`/audio/azure-ava/v1/${x.hangulKey}.mp3`, x]));
const ipa = new Map(list.map((x) => [`/audio/azure-ava/v1/${x.key}.mp3`, x]));
if (process.argv[2] === "--verify") {
  const rows = [];
  for (const f of process.argv.slice(4)) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { if (l.trim()) rows.push(JSON.parse(l)); }
  const latest = new Map();
  for (const r of rows) { const k = `${r.url}|${r.step}|${r.label}`; const p = latest.get(k); if (!p || new Date(p.at) < new Date(r.at)) latest.set(k, r); }
  let pass = 0, ipaPlayed = 0, hangulReq = 0, other = 0, mic = 0;
  const bad = [];
  // 마이크 버튼은 학습자 발음을 녹음 — 소리를 내지 않는 것이 정상(recheck-audio NOT_PLAYBACK 과 같은 규칙). 처음 판은 대상에서 안 빼 FAIL 50 으로 셌음.
  const MIC = /🎙️|발음 테스트|발음 채점|녹음|따라 말하기|섀도잉 검증|말하기 연습|내 발음/;
  for (const r of latest.values()) {
    if (MIC.test(String(r.label || ""))) { mic++; if ((r.clips || []).some((c) => hangul.has(c.path))) { hangulReq++; bad.push(`마이크인데 한글판 요청 ${r.url} ${r.label}`); } continue; }
    const paths = (r.clips || []).map((c) => c.path);
    const gotIpa = (r.clips || []).some((c) => ipa.has(c.path) && (c.playing > 0 || c.resolved > 0));
    const gotHangul = paths.some((p) => hangul.has(p));
    if (r.status === "PASS") pass++;
    if (gotIpa) ipaPlayed++;
    if (gotHangul) hangulReq++;
    if (!gotIpa) other++;
    if (r.status !== "PASS" || gotHangul) bad.push(`${r.status} ${r.url} [${r.openedAt}] ${r.step} ▶ ${r.label} — ${r.note} · 클립 ${paths.join(" ")}`);
  }
  console.log(`다시 누른 버튼 ${latest.size} = 재생 버튼 ${latest.size - mic} + 마이크(녹음 — 소리 안 냄이 정상) ${mic} · 재생 버튼 PASS ${pass} · 발음 기호판 클립 재생 ${ipaPlayed} · 한글판 요청 ${hangulReq} · 첫 클립이 다른 문장(전체 듣기 등) ${other}`);
  for (const b of bad) console.log(`  ✘ ${b}`);
  process.exit(bad.length ? 1 : 0);
}
const RE = /^(student|grammar2|reading)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
const latest = new Map();
for (const f of fs.readdirSync(FEAT).filter((x) => RE.test(x))) for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
  if (!l.trim()) continue; let r; try { r = JSON.parse(l); } catch { continue; }
  const k = `${r.course}|${r.id}|${r.viewport}`; const p = latest.get(k); if (!p || new Date(p.at) < new Date(r.at)) latest.set(k, r);
}
const targets = new Map();
for (const r of latest.values()) for (const a of r.audio || []) {
  if (!(a.clips || []).some((c) => hangul.has(c.path))) continue;
  const [step, label] = String(a.control).split(" ▶ ");
  const key = `${r.url}|${step}|${label}`;
  if (!targets.has(key)) targets.set(key, { course: r.course, id: r.id, url: r.url, step, label, sweepNote: a.note || "", sweepViewports: [], status: a.status });
  const t = targets.get(key); if (!t.sweepViewports.includes(r.viewport)) t.sweepViewports.push(r.viewport);
}
fs.writeFileSync(process.argv[3], [...targets.values()].map((t) => JSON.stringify(t)).join("\n") + "\n");
const by = {}; for (const t of targets.values()) by[t.course] = (by[t.course] || 0) + 1;
console.log(`대상 버튼 ${targets.size} ${JSON.stringify(by)} · 쪽 ${new Set([...targets.values()].map((t) => t.url)).size} → ${process.argv[3]}`);
