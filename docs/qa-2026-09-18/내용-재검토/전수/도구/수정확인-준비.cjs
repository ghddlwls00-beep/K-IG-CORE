#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 워크플로우 일꾼의 읽을거리를 만든다(읽기만).
 *  ⓐ 줄 확인: 이 세션이 수정 세션에 넘긴 고칠 줄 372(전수 표 303 · 더한 29 · 두 번째 31 · 판단 필요 1 ~ 9)마다
 *     고칠 곳 · 고치기 전(지금) · 고칠 글과, main 3e9687f 파일에서 기계로 찾은 결과(고칠 글이 그 파일에 글자 그대로 있나 · 옛 글이 남았나)를 적는다.
 *     일꾼은 main 파일(스냅샷 — 전수/수정확인/기계.json '스냅')을 열어 제자리에 맞게 들어갔는지 · 옆 글을 망치지 않았는지 본다.
 *  ⓑ 칩 확인: 힌트 줄이 바뀐 245강(되살림 100 · 표의 힌트 고침)마다 main 힌트 줄 · 문장마다 main 칩(새 규칙)과 전 칩, 기계 표시(붙음 · 없는 꼴 · 번짐 · 기호).
 *   node 수정확인-준비.cjs   → 전수/수정확인/읽을거리/<조각>.md · 줄.json(ⓐ 전체) · ids.json
 */
const fs = require("fs");
const path = require("path");
const B = path.resolve(__dirname, "..");
const OUT = path.join(B, "수정확인");
const R = JSON.parse(fs.readFileSync(path.join(OUT, "기계.json"), "utf8"));
const SNAP = R.스냅;
const J = JSON.parse(fs.readFileSync(path.join(B, "판정.json"), "utf8"));
const J2 = JSON.parse(fs.readFileSync(path.join(B, "두번째", "판정.json"), "utf8"));
const COURSE = { student: "STUDENT", "voca-a": "VOCA", "voca-b": "VOCA", "grammar1-a": "GRAMMAR I", "grammar1-b": "GRAMMAR I", grammar2: "GRAMMAR II", "ld-a": "LISTENING", "ld-b": "LISTENING", "reading-a": "READING", "reading-b": "READING" };
const rows = [];
J.표.forEach((r, i) => rows.push({ id: `P${i + 1}`, 표: `전수 표 #${i + 1}`, c: r.c, g: r.g, x: r.x }));
// 더한 29 = 다시 읽기 놓침 26 에서 gh1-118 T24 를 뺀 25 + 뒤집힌 판단 필요 D:gh1-112 T26 문항 4 (도구/build-extra 와 같음)
let e = 0;
for (const m of J.다시읽음.놓침목록) { if (`${m.g}:${m.x.T}` === "grammar1/gh1-118:T24") continue; e++; rows.push({ id: `E${e}`, 표: `더한 틀림(다시 읽기 놓침)`, c: COURSE[m.ch], g: m.g, x: m.x }); }
const D4 = [
  ["content/lessons/grammar1/gh1-113.json · gh1-113-1.json (n=125) .alternatives", "It's beyond me."],
  ["content/lessons/grammar1/gh1-113.json · gh1-113-2.json (n=136) .alternatives", "Does it make sense?"],
  ["content/lessons/grammar1/gh1-119.json · gh1-119-1.json (n=52) .alternatives", "Is it less than President Bush estimated? · Is it smaller than President Bush estimated?"],
  ["content/lessons/grammar1/gh1-119.json · gh1-119-2.json (n=66) .alternatives", "We are going to do it another time. · We are going to do it some other time. · We will do it another time. · We will do it some other time."],
];
for (const [곳, 글] of D4) { e++; rows.push({ id: `E${e}`, 표: "더한 틀림(판단 필요 → 틀림, D:gh1-112 T26)", c: "GRAMMAR I", g: "grammar1/gh1-112", x: { T: "T26", 종류: "③", 심각도: "낮음", 지금: "(모범 that · it 꼴 70점)", "고칠 글": 글, "고칠 곳": 곳, "새 음성 클립": false } }); }
J2.표.forEach((r, i) => rows.push({ id: `S${i + 1}`, 표: `두 번째 읽기 표 둘${i + 1}`, c: r.c, g: r.g, x: r.x }));
J.판단필요.forEach((d, i) => rows.push({ id: `D${i + 1}`, 표: `판단 필요 ${i + 1}(소유자 '추천대로')`, c: d.c, g: d.g, x: { T: d.x.T, 종류: "판단 필요", 심각도: "-", 지금: "(추천안 앞)", "고칠 글": d.x.추천안, "고칠 곳": "추천안에 적힌 곳", "새 음성 클립": null } }));
// 기계로 찾기 — 고칠 곳에 나온 파일에서 고칠 글 · 옛 글
const fileText = new Map();
const readSnap = (rel) => { if (!fileText.has(rel)) { const f = path.join(SNAP, rel); fileText.set(rel, fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null); } return fileText.get(rel); };
const files = (s) => {
  const out = new Set();
  const t = String(s || "");
  for (const m of t.matchAll(/(content\/[\w\-/.]+?\.json|src\/lib\/[\w\-/.]+?\.(?:ts|json))/g)) out.add(m[1]);
  for (const m of t.matchAll(/\b(gh[12]-\d{3}(?:-\d)?)\.json/g)) out.add(`content/lessons/grammar${m[1][2]}/${m[1]}.json`);
  for (const m of t.matchAll(/\b(d\d{3})\.json/g)) out.add(`content/lessons/ld/${m[1]}.json`);
  for (const m of t.matchAll(/\b(pr\d{3}(?:-1)?)\.json/g)) out.add(`content/lessons/reading/${m[1]}.json`);
  for (const m of t.matchAll(/\b(s\d+-\d+)\.json/g)) out.add(`content/lessons/student/${m[1]}.json`);
  if (/ld_english_scripts/.test(t)) out.add("content/ld_english_scripts.json");
  if (/voca_dictionary/.test(t)) out.add("content/voca_dictionary.json");
  return [...out];
};
const jsonEsc = (s) => JSON.stringify(String(s)).slice(1, -1);
for (const r of rows) {
  const fs_ = files(r.x["고칠 곳"]);
  const want = String(r.x["고칠 글"] || "").trim();
  const old = String(r.x.지금 || "").trim();
  let arr = null; try { const a = JSON.parse(want); if (Array.isArray(a)) arr = a; } catch {}
  const found = [], oldLeft = [], missing = [];
  for (const f of fs_) {
    const t = readSnap(f);
    if (t == null) { missing.push(f); continue; }
    const has = (s) => s && (t.includes(jsonEsc(s)) || t.includes(s));
    if (arr ? arr.every(has) : has(want)) found.push(f);
    if (old && old.length > 3 && !/^\(/.test(old) && has(old)) oldLeft.push(f);
  }
  r.기계 = !fs_.length ? "고칠 곳에서 파일을 못 읽음 — 일꾼이 찾을 것" : found.length === fs_.length - missing.length && found.length ? `고칠 글이 글자 그대로 있음(${found.join(" · ")})` : found.length ? `일부 파일에만 있음(${found.join(" · ")})` : "고칠 글이 글자 그대로는 없음 — 일꾼이 볼 것";
  if (oldLeft.length) r.기계 += ` · 옛 글이 아직 있음(${oldLeft.join(" · ")})`;
  if (missing.length) r.기계 += ` · main 에 없는 파일(${missing.join(" · ")})`;
}
// 조각 나누기
const chunkOf = (r) => {
  if (r.c === "LISTENING") { const n = parseInt((/d(\d{3})/.exec(r.g) || [0, 0])[1], 10); return n <= 138 ? "줄-듣기-앞" : "줄-듣기-뒤"; }
  if (r.c === "GRAMMAR I") return "줄-문법1";
  if (r.c === "GRAMMAR II") return "줄-문법2";
  if (r.c === "STUDENT") return "줄-초등";
  return "줄-읽기단어";
};
fs.mkdirSync(path.join(OUT, "읽을거리"), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, "읽을거리"))) fs.rmSync(path.join(OUT, "읽을거리", f), { force: true });
const ids = {};
const q = (s) => JSON.stringify(s == null ? "" : String(s));
const byChunk = new Map();
for (const r of rows) { const c = chunkOf(r); if (!byChunk.has(c)) byChunk.set(c, []); byChunk.get(c).push(r); }
for (const [c, rs] of byChunk) {
  const L = [`# 관문 15 고침 다시 보기 — ${c} · 줄 ${rs.length}`, "", `main 파일은 ${SNAP.replace(/\\/g, "/")}/ 아래(content/ · src/lib/) — 이 판(main 3e9687f)의 글. 고치기 전 글은 각 줄의 '지금'.`, ""];
  for (const r of rs) L.push(`## ${r.id} · ${r.c} · ${r.g} ${r.x.T} · ${r.표} · ${r.x.종류} ${r.x.심각도}`, `- 고칠 곳: ${r.x["고칠 곳"]}`, `- 지금(고치기 전): ${q(r.x.지금)}`, `- 고칠 글: ${q(r.x["고칠 글"])}`, `- 새 음성: ${r.x["새 음성 클립"] === true ? "필요" : r.x["새 음성 클립"] === false ? "없음" : "-"}`, `- 까닭(요약): ${q(String(r.x.까닭 || "").slice(0, 300))}`, `- 기계: ${r.기계}`, "");
  fs.writeFileSync(path.join(OUT, "읽을거리", `${c}.md`), L.join("\n"));
  ids[c] = rs.map((r) => r.id);
}
// ⓑ 칩
const hc = JSON.parse(fs.readFileSync(path.join(OUT, "칩-힌트바뀐강.json"), "utf8"));
const sq = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const flagOf = (lesson) => {
  const all = lesson.문장.map((s) => sq(s.en)).join("|");
  const f = [];
  for (const s of lesson.문장) for (const ch of s.main) {
    if (/\s/.test(ch) && !all.includes(sq(ch))) f.push(`n${s.n} [${ch}] 여러 낱말 칩인데 강의 어느 문장에도 이 꼴이 없음(두 항목이 붙음 · 철자 다름?)`);
    const words = ch.split(/\s+/).map((w) => sq(w)).filter((w) => w.length >= 3 || /^\d+$/.test(w));
    if (words.length && !words.some((w) => sq(s.en).includes(w))) f.push(`n${s.n} [${ch}] 이 문장에 칩 낱말이 없음(안전장치 · 번짐?)`);
    if (/^(Mrs?|Ms|Dr|St|Mt|Jr|Sr|Prof)\.?$/.test(ch)) f.push(`n${s.n} [${ch}] 칭호만 떨어진 칩`);
    if (/^[^A-Za-z0-9$]|[^A-Za-z0-9%)'.]$/.test(ch)) f.push(`n${s.n} [${ch}] 앞뒤에 남은 기호`);
  }
  return [...new Set(f)];
};
const chipChunks = 5;
const per = Math.ceil(hc.length / chipChunks);
for (let k = 0; k < chipChunks; k++) {
  const part = hc.slice(k * per, (k + 1) * per);
  if (!part.length) continue;
  const name = `칩-${k + 1}`;
  const L = [`# 관문 15 고침 다시 보기 — ${name} · 힌트 줄이 바뀐 강 ${part.length}(${part[0].강} ~ ${part[part.length - 1].강})`, "", "문장마다 main 칩(새 규칙: 칭호 · 한 글자 머리글자 뒤 '. ' 은 안 나눔)과 전 칩(옛 규칙 · 옛 힌트 줄). '기계 표시' 는 볼 곳을 짚을 뿐 — 판정은 일꾼이.", ""];
  for (const l of part) {
    const fl = flagOf(l);
    L.push(`## ▣ ${l.강} — 달라진 문장 ${l.문장.length}${fl.length ? ` · 기계 표시 ${fl.length}` : ""}`, `- 전 힌트 줄: ${q(l.전힌트)}`, `- main 힌트 줄: ${q(l.main힌트)}`);
    for (const s of l.문장) L.push(`- n${s.n} ${q(s.en)}`, `  · 전 칩 ${s.전.map((c) => `[${c}]`).join(" ") || "(없음)"} → main 칩 ${s.main.map((c) => `[${c}]`).join(" ") || "(없음)"}`);
    if (fl.length) L.push(`- 기계 표시: ${fl.join(" · ")}`);
    L.push("");
  }
  fs.writeFileSync(path.join(OUT, "읽을거리", `${name}.md`), L.join("\n"));
  ids[name] = part.map((l) => l.강);
}
fs.writeFileSync(path.join(OUT, "줄.json"), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(OUT, "ids.json"), JSON.stringify(ids, null, 1));
const mech = rows.reduce((a, r) => { const k = r.기계.split("(")[0].split(" · ")[0]; a[k] = (a[k] || 0) + 1; return a; }, {});
console.log(JSON.stringify({ 줄: rows.length, 조각: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length])), 기계: mech, 칩강: hc.length, 기계표시강: hc.filter((l) => flagOf(l).length).length }, null, 1));
