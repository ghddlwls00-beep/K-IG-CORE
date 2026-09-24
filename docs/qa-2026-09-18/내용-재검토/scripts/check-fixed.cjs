#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 틀림 표(판정.json '표에 올림')가 어떤 판에서 고쳐졌는지 이 세션의 판정표로 따로 센다
 * (수정 세션의 verify-gate15-rows.cjs 와 따로 만든 것 — 같은 계열 모델이지만 다른 도구 · 다른 셈법).
 *   node check-fixed.cjs [--rev main] [--list 그대로]
 * 줄마다 셈법:
 *   - 코드 고침(고칠 곳에 src/…) → 그 코드 파일이 2a80bba 와 rev 에서 다른가
 *   - 더하는 고침(대체 답안 · 고칠 글이 JSON 배열 · '(그리고 …)') → 고칠 글의 새 글이 rev 의 그 파일 글 값에 모두 있는가
 *   - 바꾸는 고침 → 틀린 '지금' 글이 rev 의 그 파일 글 값에 **없어졌고**, 고칠 글이 **있는가**(고칠 글이 설명문이면 없어졌는지만)
 * 결과: 고쳐짐 · 더해짐 · 코드 바뀜 · 없어짐만 확인 · 그대로(아직 안 고침) · 셀 수 없음(파일 · 글을 못 찾음)
 */
const path = require("path");
const L = require("./lib.cjs");
const argv = process.argv.slice(2);
const REV = argv.includes("--rev") ? argv[argv.indexOf("--rev") + 1] : "main";
const LISTK = argv.includes("--list") ? argv[argv.indexOf("--list") + 1] : null;
const J = JSON.parse(require("fs").readFileSync(path.join(L.DIR, "판정.json"), "utf8"));
const recs = new Map(L.readJsonl(path.join(L.DIR, "목록.jsonl")).map((r) => [r.id, r]));
const rows = J.찾은것.filter((f) => f.상태 === "표에 올림");

const strCache = new Map();
function strings(rev, file) {
  const k = `${rev}:${file}`;
  if (strCache.has(k)) return strCache.get(k);
  const [txt] = L.catFiles([k]);
  const set = new Set();
  if (txt != null) {
    if (file.endsWith(".json")) { const walk = (v) => { if (typeof v === "string") set.add(L.clean(v)); else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x); }; walk(JSON.parse(txt)); }
    else set.add(txt);
  }
  const out = txt == null ? null : set;
  strCache.set(k, out);
  return out;
}
const filesIn = (s) => [...new Set((String(s || "").match(/(?:content|src)\/[^\s,·)'"]+\.(?:json|tsx?)/g) || []))];
const quoted = (s) => { const t = String(s || ""); try { const a = JSON.parse(t); if (Array.isArray(a)) return a.map(String); } catch {} const m = t.match(/"([^"]{3,})"|'([^']{3,})'/g) || []; return m.map((x) => x.slice(1, -1)); };

const out = { 고쳐짐: [], 더해짐: [], "코드 바뀜": [], "없어짐만 확인": [], 그대로: [], "셀 수 없음": [] };
for (const f of rows) {
  const w = f.최종;
  const idFiles = f.ids.map((id) => recs.get(id)).filter(Boolean).map((r) => r.file);
  const where = String(w["고칠 곳"] || "");
  let files = [...new Set([...filesIn(where), ...(idFiles.length ? idFiles : filesIn(w.파일 || ""))])].filter((x) => x.endsWith(".json") || /src\//.test(x));
  const fix = String(w["고칠 글"] || "");
  const now = w.지금 != null ? String(w.지금) : f.ids.length ? String(recs.get(f.ids[0]).after ?? "") : "";
  const tag = `${f.key} ${f.조각}`;
  if (/src\/\S+\.tsx?/.test(where)) {
    const code = filesIn(where).filter((x) => /\.tsx?$/.test(x));
    const changed = code.some((c) => { const a = L.catFiles([`${L.HEAD}:${c}`])[0], b = L.catFiles([`${REV}:${c}`])[0]; return a != null && b != null && a !== b; });
    (changed ? out["코드 바뀜"] : out.그대로).push(tag);
    continue;
  }
  files = files.filter((x) => x.endsWith(".json"));
  if (!files.length) { out["셀 수 없음"].push(`${tag} (파일 없음)`); continue; }
  const sets = files.map((x) => strings(REV, x)).filter(Boolean);
  if (!sets.length) { out["셀 수 없음"].push(`${tag} (${REV} 에 파일 없음)`); continue; }
  const has = (t) => sets.some((s) => s.has(L.clean(t)));
  const adds = /alternatives|대체 답안|다른 정답|새 항목|더함|\(그리고/.test(where + fix) && !/뺌|빼기|\[\]\s*로/.test(where + fix);
  // 더할 글: 고칠 글(글 하나 · JSON 배열 · 따옴표) + 고칠 곳에 따옴표로 적은 새 항목('① … ②' 꼴)
  const plain = fix && !/^\s*\[/.test(fix) && !/[①②③④⑤⑥(（]|—|→|:|\//.test(fix) ? [fix] : [];
  // '첫 글 (그리고 둘째 · 셋째)' 꼴(조정.json)
  const andList = /\(그리고 /.test(fix) ? [fix.split("(그리고")[0].trim(), ...fix.split("(그리고")[1].replace(/\)\s*$/, "").split(" · ").map((x) => x.trim())] : [];
  const parts = [...new Set([...plain, ...andList, ...quoted(fix), ...(adds ? quoted(where) : [])])].filter((x) => /[A-Za-z가-힣]/.test(x) && x.length > 3 && !/^\s*\[/.test(x));
  const nowGone = now && !has(now);
  if (adds && parts.length) { (parts.every(has) ? out.더해짐 : out.그대로).push(`${tag}${parts.every(has) ? "" : ` · 안 들어간 새 글: ${parts.filter((x) => !has(x)).slice(0, 2).join(" | ")}`}`); continue; }
  // 바꾸는 고침: 고칠 글이 그 파일에 있으면 고쳐짐(고칠 곳이 줄과 다른 칸이면 '지금' 글은 남아 있을 수 있음 — 예: 동의어 쌍의 다른 낱말 뜻을 고침)
  if (plain.length && has(plain[0])) { out.고쳐짐.push(tag); continue; }
  if (fix && has(fix)) { out.고쳐짐.push(tag); continue; }
  if (nowGone) { out["없어짐만 확인"].push(tag); continue; }
  if (now && has(now)) { out.그대로.push(`${tag} · 지금 글이 ${REV} 에 그대로: ${now.slice(0, 60)}`); continue; }
  out["셀 수 없음"].push(`${tag} (지금 글 없음)`);
}
const n = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
console.log(`판 ${REV} · 표에 오른 것 ${rows.length}: ${Object.entries(n).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
if (LISTK) for (const x of out[LISTK] || []) console.log(`  ${x}`);
