#!/usr/bin/env node
/**
 * 6단계 사전 점검 — 목록 1,759건 + 이월 6E 마다 "지적한 글(original)이 지금 파일에 아직 있나" 를 기계로 잰다.
 * 판정이 아니다: 글이 그대로면 반드시 처리해야 하는 항목이고, 글이 없어졌으면 "이미 해결" **후보** 일 뿐이다
 * (글이 바뀌었어도 지적한 문제가 남았을 수 있으므로 사람이 읽고 정한다). 명령서 "표시는 힌트일 뿐" 에 따라
 * "감사 뒤 바뀜" 표시가 없는 항목도 같이 잰다.
 *
 *   node docs/qa-2026-09-18/scripts/stage6-precheck.cjs            → out/stage6-precheck.json + 과정·상태별 개수
 *   node docs/qa-2026-09-18/scripts/stage6-precheck.cjs --ids 6-0030,6-0062   → 그 번호만 자세히
 *
 * 상태: 그대로(뽑은 조각 전부 있음) · 일부 바뀜 · 없음(조각 하나도 없음) · 파일 없음 · 못 뽑음(조각을 못 뽑음 — 사람이 봄)
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const LIST = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-목록.json"), "utf8")).items;
const CARRY = fs.existsSync(path.join(REPO, "docs/qa-2026-09-18/6단계-이월.json"))
  ? JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-이월.json"), "utf8")).items : [];
const strip = (s) => String(s).replace(/^\uFEFF/, "");
const norm = (s) => String(s).replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

// 파일 → 그 안의 모든 글(JSON 이면 문자열 값만, 아니면 원문)
const textCache = new Map();
function fileText(rel) {
  if (textCache.has(rel)) return textCache.get(rel);
  const abs = path.join(REPO, rel);
  let t = null;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    const raw = strip(fs.readFileSync(abs, "utf8"));
    if (rel.endsWith(".json")) {
      const out = [];
      const walk = (v) => { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); walk(x); } };
      try { walk(JSON.parse(raw)); t = norm(out.join("\n")); } catch { t = norm(raw); }
    } else t = norm(raw);
  }
  textCache.set(rel, t);
  return t;
}
const DICT = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8")));
const look = (w) => { const k = String(w).trim(); return DICT[k] ?? DICT[k.toLowerCase()] ?? null; };

/** 항목의 file 칸에서 저장소 안 경로들을 뽑는다 */
function filesOf(x) {
  const raw = String(x.file || "").replace(/C:\/Users\/[^ ]*?K-IG-CORE\//g, "");
  const out = new Set();
  for (const m of raw.matchAll(/((?:content|src|scripts|public)\/[\w./-]+\.(?:json|ts|tsx|mjs|cjs))/g)) out.add(m[1]);
  return [...out];
}

const KEY_WORDS = new Set(["meaning", "searchWord", "title", "ko", "en", "text", "label", "menuLabel", "n", "type", "word", "korean", "english", "lemma", "partOfSpeech"]);
/** original 칸에서 찾을 조각을 뽑는다 */
function fragmentsOf(x) {
  const o = String(x.original || "");
  const frags = [];
  // VOCA: "word": { "meaning": "…" } · word = "…" · word | 뜻 · word<TAB>뜻
  if (x.course === "VOCA") {
    const pairs = [];
    // voca-dictionary.tsv 한 줄: 낱말<TAB>검색어<TAB>뜻<TAB>강의들
    for (const line of o.split(/\n|\s{2,}(?=[A-Za-z][^\t]*\t)/)) { const c = line.split("\t"); if (c.length >= 3 && /[A-Za-z]/.test(c[0]) && /[가-힣]/.test(c[2])) pairs.push([c[0].trim(), c[2].trim()]); }
    if (pairs.length) return pairs.map(([w, m]) => ({ kind: "dict", word: w, meaning: m }));
    for (const m of o.matchAll(/"([^"]+)":\s*\{\s*"meaning":\s*"([^"]*)"/g)) pairs.push([m[1], m[2]]);
    for (const m of o.matchAll(/(?:^|[;\/]\s*)([A-Za-z][A-Za-z() =.'-]*?)\s*=\s*"([^"]*)"/g)) pairs.push([m[1].trim(), m[2]]);
    for (const m of o.matchAll(/(?:^|\/\s*|;\s*)([A-Za-z][A-Za-z() .'-]*?)\s*(?:\t|\s\|\s)\s*([^\t|/;]*[가-힣][^\t|/;]*)/g)) pairs.push([m[1].trim(), m[2].replace(/\(m[vh]\d.*$/, "").trim()]);
    if (pairs.length) return pairs.map(([w, m]) => ({ kind: "dict", word: w, meaning: m }));
  }
  // LISTENING 대본: EN: "…"  KO: "…"
  for (const m of o.matchAll(/\b(EN|KO):\s*"((?:[^"\\]|\\.)*)"/g)) frags.push({ kind: "text", field: m[1], text: m[2] });
  if (frags.length) return frags;
  // 따옴표 안 글 (JSON 키 이름은 뺌)
  for (const m of o.matchAll(/"((?:[^"\\]|\\.){2,})"/g)) if (!KEY_WORDS.has(m[1])) frags.push({ kind: "text", text: m[1] });
  if (frags.length) return frags;
  // 따옴표가 없으면 통째로 (" / " 로 나눔), 너무 길면 앞 160자
  const plain = o.split(/\s+\/\s+|\s+;\s+/).map((s) => s.trim()).filter((s) => s.length >= 4);
  return plain.map((s) => ({ kind: "text", text: s.slice(0, 160) }));
}

function check(x) {
  const files = filesOf(x);
  const frags = fragmentsOf(x);
  if (!frags.length) return { status: "못 뽑음", files, frags: [] };
  const res = frags.map((f) => {
    if (f.kind === "dict") {
      const e = look(f.word);
      return { ...f, found: !!e && norm(e.meaning) === norm(f.meaning), now: e ? e.meaning : null };
    }
    const t = norm(f.text.replace(/\\"/g, '"'));
    const hits = files.filter((rel) => { const ft = fileText(rel); return ft && ft.includes(t); });
    return { ...f, found: hits.length > 0, hits };
  });
  const existing = files.filter((rel) => fileText(rel) !== null);
  if (files.length && !existing.length && !frags.every((f) => f.kind === "dict")) return { status: "파일 없음", files, frags: res };
  const k = res.filter((r) => r.found).length;
  return { status: k === res.length ? "그대로" : k === 0 ? "없음" : "일부 바뀜", files, frags: res };
}

const idsArg = process.argv.includes("--ids") ? process.argv[process.argv.indexOf("--ids") + 1].split(",") : null;
const all = [...LIST, ...CARRY.map((c) => ({ ...c, original: c.original || "" }))];
const out = [];
for (const x of all) {
  if (idsArg && !idsArg.includes(x.id)) continue;
  const c = check(x);
  out.push({ id: x.id, course: x.course, category: x.category || "(이월)", marked: Array.isArray(x.changedSinceAudit) && x.changedSinceAudit.length > 0, ...c });
}
if (idsArg) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
fs.mkdirSync(path.join(REPO, "docs/qa-2026-09-18/out"), { recursive: true });
fs.writeFileSync(path.join(REPO, "docs/qa-2026-09-18/out/stage6-precheck.json"), JSON.stringify(out, null, 1));
const by = {};
for (const r of out) { const k = r.course; (by[k] ||= {}); by[k][r.status] = (by[k][r.status] || 0) + 1; }
for (const [k, v] of Object.entries(by)) console.log(`${k.padEnd(10)} ${Object.entries(v).map(([s, n]) => `${s} ${n}`).join(" · ")}`);
const marked = out.filter((r) => r.marked);
const mby = {}; for (const r of marked) mby[r.status] = (mby[r.status] || 0) + 1;
console.log(`"감사 뒤 바뀜" 표시 ${marked.length}: ${Object.entries(mby).map(([s, n]) => `${s} ${n}`).join(" · ")}`);
const oby = {}; for (const r of out.filter((r) => !r.marked)) oby[r.status] = (oby[r.status] || 0) + 1;
console.log(`표시 없음 ${out.length - marked.length}: ${Object.entries(oby).map(([s, n]) => `${s} ${n}`).join(" · ")}`);
console.log(`→ out/stage6-precheck.json (${out.length}건)`);
