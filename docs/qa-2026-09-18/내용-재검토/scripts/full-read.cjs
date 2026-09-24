#!/usr/bin/env node
/**
 * 학습 내용 전수 읽기(소유자 결정 2026-09-24 17:1x "1번2번다 할거야") — 9/18 뒤 안 바뀌고 표본 86쪽에도 안 든 글
 * (coverage.cjs '둘 다 아님' 20,134 — 6과정 전부)을 강의 묶음마다 읽을거리로 만든다.
 *  - 글 단위는 표본 · coverage 와 같음(sample.cjs unitsOf). 같은 강의 묶음의 같은 글은 한 번(본문 · 대본 쪽 · 분할본 · VOCA 는 앞 강의에서 본 낱말).
 *  - 읽을 글에만 T 번호. 1부에서 판정한 바뀐 글 · 표본에서 읽은 글은 문맥으로만(번호 없음).
 *  - 1부 판정 일꾼이 '옆 글(문맥)' 로 이미 틀림을 적은 글에는 〔1부 문맥에서 이미 적음〕 표시 — 다시 적지 않게.
 *  - LISTENING 은 칩 도구가 짚은 후보(약어가 쪼개진 칩 · 강의 어느 문장에도 그 꼴이 없는 여러 낱말 칩 · 앞뒤 문장부호)를 묶음마다 보여 줌 — 판정은 사람이.
 *   node full-read.cjs      → 전수/읽을거리/<조각>/NN.md · ids.json
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const S = require("./sample.cjs");
const Rn = require("./render.cjs");
const E = Rn.E;

const OUTDIR = path.join(L.DIR, "전수");
const OUT = path.join(OUTDIR, "읽을거리");
const MAX = 32000;
const q = Rn.q;
const num = (s) => { const m = String(s).match(/^(?:gh[12]-|d|pr|hv-|mv\d-)?(\d+)/); return m ? parseInt(m[1], 10) : 0; };
function chunkOf(c, id) {
  if (c === "student") return "student";
  if (c === "phonics") return /^(hv|mv1)/.test(id) ? "voca-a" : "voca-b"; // 전수는 VOCA 가 6,704줄이라 둘로
  if (c === "grammar1") { const n = num(id); const b = n % 2 === 1 ? n - 1 : n; return b <= 62 ? "grammar1-a" : "grammar1-b"; }
  if (c === "grammar2") return "grammar2";
  if (c === "ld") return num(id) <= 138 ? "ld-a" : "ld-b";
  return num(id) <= 128 ? "reading-a" : "reading-b";
}

// 1부 문맥 틀림(옆 글) — 과정별 지금 글 모음
const CHUNK_COURSE = { student: "student", voca: "phonics", "grammar1-a": "grammar1", "grammar1-b": "grammar1", grammar2: "grammar2", "ld-a": "ld", "ld-b": "ld", "reading-a": "reading", "reading-b": "reading" };
const ctxSeen = {};
for (const [ch, c] of Object.entries(CHUNK_COURSE)) {
  const f = path.join(L.DIR, `판정-${ch}.json`);
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  j.문맥.forEach((x, i) => { const t = L.clean(x.지금); if (!t) return; (ctxSeen[c] = ctxSeen[c] || new Map()).set(t, `${ch} 문맥 #${i}`); });
}

// LISTENING 칩 후보
const ABBR = /^(Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr|Prof|Rev|Gen|Capt|Lt|Col|Sgt|Ft|No|Vol|Inc|Ltd|Co|Corp|Bros|Ave|Blvd|Rd|Gov|Sen|Rep|Pres|U\.S|a\.m|p\.m)$/;
const squash = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
function chipFlags(base) {
  const now = Rn.ldLesson(L.HEAD, base);
  const allEn = now.rows.map((r) => squash(r.en)).join("|");
  const flags = [];
  const seen = new Set();
  for (const r of now.rows) for (const ch of r.chips) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    if (ABBR.test(ch)) flags.push(`[${ch}] 약어만 떨어진 칩(뒤 이름과 쪼개짐?)`);
    else if (/\s/.test(ch) && !allEn.includes(squash(ch))) flags.push(`[${ch}] 여러 낱말 칩인데 강의 어느 문장에도 이 꼴이 없음(두 항목이 붙었거나 철자 다름?)`);
    if (/^[^A-Za-z0-9$]|[^A-Za-z0-9%)'.]$/.test(ch)) flags.push(`[${ch}] 앞뒤에 남은 기호`);
  }
  return flags;
}

// 과정 → 묶음 → 글
const plan = [["student"], ["phonics"], ["grammar1"], ["grammar2"], ["ld"], ["reading"]];
const chunks = new Map();
const stats = {};
for (const [c] of plan) {
  const sampled = new Set(S.picked[c]);
  const seenKey = new Map(); // VOCA: 앞 강의에서 본 낱말 · 뜻
  // VOCA 는 같은 낱말 · 뜻이 여러 강의에 — 어느 한 강의에서라도 1부 판정(바뀜)이거나 표본 쪽이면 그 글은 읽은 것(coverage.cjs 와 같은 셈)
  const vocaAny = new Map();
  if (c === "phonics") for (const id of S.pages(c)) for (const u of S.unitsOf(c, id)) {
    const key = `${u.kind}|${L.clean(u.text)}`;
    const cur = vocaAny.get(key) || { changed: false, sampled: false };
    if (/9\/18 뒤 바뀜/.test(u.line)) cur.changed = true;
    if (sampled.has(id)) cur.sampled = true;
    vocaAny.set(key, cur);
  }
  const groups = new Map();
  for (const id of S.pages(c)) {
    const g = S.groupOf(c, id) || `phonics/${id}`;
    const ch = chunkOf(c, id);
    if (!groups.has(g)) groups.set(g, { chunk: ch, pages: [], units: new Map() });
    const G = groups.get(g);
    G.pages.push(id);
    for (const u of S.unitsOf(c, id)) {
      const text = L.clean(u.text);
      const key = c === "phonics" ? `${u.kind}|${text}` : text;
      const any = c === "phonics" ? vocaAny.get(key) : null;
      const changed = any ? any.changed : /9\/18 뒤 바뀜/.test(u.line);
      const inSample = any ? any.sampled : sampled.has(id);
      if (c === "phonics" && !changed && !inSample && seenKey.has(key) && seenKey.get(key) !== g) { if (!G.units.has(key)) G.units.set(key, { u, id, role: `앞 강의 ${seenKey.get(key).split("/")[1]} 에서` }); continue; }
      if (c === "phonics" && !seenKey.has(key)) seenKey.set(key, g);
      const cur = G.units.get(key);
      const role = changed ? "1부에서 판정(바뀐 글)" : inSample ? "표본에서 읽음" : null;
      if (!cur) G.units.set(key, { u, id, role });
      else if (cur.role === null && role) cur.role = role; // 한 쪽이라도 표본 · 바뀜이면 그쪽
    }
  }
  const st = (stats[c] = { 묶음: 0, 읽을글: 0 });
  // VOCA 두 조각은 읽을 글 수로 반씩(강의 차례대로 앞 절반 voca-a · 뒤 voca-b)
  if (c === "phonics") {
    const counts = [...groups].map(([g, G]) => [g, [...G.units.values()].filter((x) => !x.role).length]);
    const total = counts.reduce((s, [, n]) => s + n, 0);
    let acc = 0;
    for (const [g, n] of counts) { groups.get(g).chunk = acc < total / 2 ? "voca-a" : "voca-b"; acc += n; }
  }
  for (const [g, G] of groups) {
    const lines = [];
    let t = 0;
    for (const [, x] of G.units) {
      if (x.role) { lines.push(`  · (${x.role}) [${x.u.kind}] ${x.u.line.replace(/〔9\/18 뒤 바뀜[^〕]*〕/g, "")}`); continue; }
      t++;
      const already = ctxSeen[c] && ctxSeen[c].get(L.clean(x.u.text));
      lines.push(`- T${String(t).padStart(2, "0")} [${x.u.kind}] ${x.u.line}${already ? `  〔1부 문맥에서 이미 적음: ${already} — 다시 적지 말 것〕` : ""}`);
    }
    if (!t) continue;
    st.묶음++; st.읽을글 += t;
    const head = [`## ▣ ${g} — 읽을 글 ${t} · 쪽 ${G.pages.map((p) => `/${c}/${p}`).join(" · ")}`];
    if (c === "ld") { const fl = chipFlags(g.split("/")[1]); if (fl.length) head.push(`- 칩 도구 후보(판정은 읽는 사람이 — 힌트 줄은 ${g.split("/")[1]}.json hints 블록): ${fl.join(" · ")}`); }
    if (c === "grammar1" || c === "grammar2") head.push(`- (문항은 KO · EN 짝 차례대로. 채점 영향은 앱 채점 함수로 재어 적을 것 — src/lib/grammarGrading.ts gradeAgainstReferences)`);
    if (!chunks.has(G.chunk)) chunks.set(G.chunk, []);
    chunks.get(G.chunk).push({ g, t, text: [...head, ...lines].join("\n") + "\n" });
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const d of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
const summary = {};
for (const [ch, secs] of chunks) {
  const dir = path.join(OUT, ch);
  fs.mkdirSync(dir, { recursive: true });
  const batches = [];
  let cur = [], len = 0;
  for (const s of secs) { if (cur.length && len + s.text.length > MAX) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += s.text.length; }
  if (cur.length) batches.push(cur);
  const ids = { groups: {}, batches: {} };
  batches.forEach((b, i) => {
    const name = `${String(i + 1).padStart(2, "0")}.md`;
    fs.writeFileSync(path.join(dir, name), `# 전수 읽을거리 ${ch} ${name} — 묶음 ${b.length} · 읽을 글 ${b.reduce((s, x) => s + x.t, 0)}\n\n${b.map((s) => s.text).join("\n")}`);
    ids.batches[name] = b.map((s) => s.g);
    for (const s of b) ids.groups[s.g] = s.t;
  });
  fs.writeFileSync(path.join(dir, "ids.json"), JSON.stringify(ids, null, 1));
  summary[ch] = { 묶음: secs.length, 읽을글: secs.reduce((s, x) => s + x.t, 0), 파일: batches.length };
}
fs.writeFileSync(path.join(OUTDIR, ".gitignore"), "읽을거리/\nwork/\n");
fs.mkdirSync(path.join(OUTDIR, "work"), { recursive: true });
console.log(JSON.stringify({ 과정별: stats, 조각별: summary }, null, 1));
