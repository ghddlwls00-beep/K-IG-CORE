#!/usr/bin/env node
/**
 * 학습 내용 재검토 1 — 9/18 감사가 본 판(9d6e15d) 뒤로 바뀐 글을 "글 조각" 단위로 전부 뽑는다.
 * 글 조각 = JSON 문자열 값 하나(.ts 는 문자열 · 정규식 리터럴 하나). 바뀜 · 새로 생김 · 없어짐 모두.
 *
 * 범위(PROMPT-내용-재검토.md ■ 1): content/ 전부 + src/lib 의 글 파일 넷
 *   (readingSentences.json · readingVocabulary.json · curriculumPresentation.ts · vocaSpeech.ts).
 * 두 판의 파일은 git cat-file --batch 로 한 번에 읽는다. 작업 트리는 읽지 않는다(--head-dir 를 줄 때만).
 *
 *   node list-changes.cjs                       # 기준 9d6e15d ↔ 지금 HEAD, 목록.jsonl 에 씀
 *   node list-changes.cjs --head 2a80bba        # 지금 판을 고정 판으로
 *   node list-changes.cjs --check 목록.jsonl     # 새로 뽑은 목록이 저장한 목록과 한 줄이라도 다르면 exit 1
 *   node list-changes.cjs --export-head <dir>   # 지금 판 파일을 <dir> 에 풀어 둠(일부러 깨기용 사본)
 *   node list-changes.cjs --head-dir <dir>      # 지금 판을 git 대신 <dir> 의 파일로
 *
 * 숫자 · 참거짓 같은 글이 아닌 값의 바뀜은 목록에 넣지 않고 따로 센다(파일 수 대조에 씀).
 * 배열은 id · n · word 처럼 겹치지 않는 열쇠가 있으면 그것으로, 없으면 같은 원소를 최장 공통 부분열로 맞춘 뒤
 * 그 사이 틈에서 같은 종류끼리 차례로 짝지어 비교한다 — 블록 하나가 빠져도 뒤 블록이 전부 "바뀜" 으로 나오지 않게.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const WT = path.resolve(__dirname, "../../../..");
const SCOPE = [
  "content",
  "src/lib/readingSentences.json",
  "src/lib/readingVocabulary.json",
  "src/lib/curriculumPresentation.ts",
  "src/lib/vocaSpeech.ts",
];
const ts = require(require.resolve("typescript", { paths: [WT] }));

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const BASE = opt("--base", "9d6e15d");
const HEAD = opt("--head", "HEAD");
const HEAD_DIR = opt("--head-dir", null);
const OUT = opt("--out", path.join(__dirname, "..", "목록.jsonl"));
const CHECK = opt("--check", null);
const EXPORT = opt("--export-head", null);

function git(argv, input) {
  const r = spawnSync("git", argv, { cwd: WT, input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`git ${argv.join(" ")} 실패: ${r.stderr}`);
  return r.stdout;
}
const revParse = (rev) => git(["rev-parse", rev]).toString().trim();

/** ls-tree: path → blob sha */
function tree(rev) {
  const out = git(["ls-tree", "-r", rev, "--", ...SCOPE]).toString();
  const m = new Map();
  for (const line of out.split("\n")) {
    const t = line.indexOf("\t");
    if (t < 0) continue;
    const [, type, sha] = line.slice(0, t).split(" ");
    if (type === "blob") m.set(line.slice(t + 1), sha);
  }
  return m;
}

/** git cat-file --batch 로 여러 blob 을 한 번에 */
function catBlobs(shas) {
  if (!shas.length) return [];
  const buf = git(["cat-file", "--batch"], shas.join("\n") + "\n");
  const res = [];
  let pos = 0;
  for (const sha of shas) {
    const nl = buf.indexOf(10, pos);
    const header = buf.slice(pos, nl).toString();
    const [gotSha, type, sizeStr] = header.split(" ");
    if (type !== "blob" || !gotSha.startsWith(sha.slice(0, 7))) throw new Error(`cat-file 머리 이상: ${header}`);
    const size = Number(sizeStr);
    res.push(buf.slice(nl + 1, nl + 1 + size));
    pos = nl + 1 + size + 1;
  }
  return res;
}

// ── JSON 글 조각 비교 ─────────────────────────────────────────────
const kindOf = (v) => (v === undefined ? "undef" : v === null ? "null" : Array.isArray(v) ? "arr" : typeof v === "object" ? "obj" : typeof v === "string" ? "str" : typeof v);
function leaves(v, p, fn) {
  const k = kindOf(v);
  if (k === "arr") v.forEach((x, i) => leaves(x, `${p}[${i}]`, fn));
  else if (k === "obj") for (const key of Object.keys(v)) leaves(v[key], `${p}.${key}`, fn);
  else if (k !== "undef") fn(p, v);
}
function emitSide(v, p, side, out) {
  leaves(v, p, (lp, x) => {
    if (typeof x === "string") out.text.push(side === "before" ? { path: lp, kind: "removed", before: x, after: null } : { path: lp, kind: "added", before: null, after: x });
    else out.nontext.push({ path: lp, kind: side === "before" ? "removed" : "added", value: x });
  });
}
const STABLE_KEYS = ["id", "n", "word"];
function stableKey(a, b) {
  for (const k of STABLE_KEYS) {
    const ok = (arr) => arr.length > 0 && arr.every((x) => x && typeof x === "object" && !Array.isArray(x) && (typeof x[k] === "string" || typeof x[k] === "number")) && new Set(arr.map((x) => String(x[k]))).size === arr.length;
    if (ok(a) && ok(b)) return k;
  }
  return null;
}
function lcsPairs(a, b) {
  const sa = a.map((x) => JSON.stringify(x));
  const sb = b.map((x) => JSON.stringify(x));
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = sa[i] === sb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (sa[i] === sb[j]) { pairs.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}
const compatible = (x, y) => {
  const kx = kindOf(x), ky = kindOf(y);
  if (kx !== ky) return false;
  if (kx === "obj" && (x.type !== undefined || y.type !== undefined)) return x.type === y.type;
  return true;
};
function diffArray(a, b, p, out) {
  const key = stableKey(a, b);
  if (key) {
    const am = new Map(a.map((x) => [String(x[key]), x]));
    const bm = new Map(b.map((x) => [String(x[key]), x]));
    const order = [...b.map((x) => String(x[key])), ...a.map((x) => String(x[key])).filter((k) => !bm.has(k))];
    for (const k of order) diffValue(am.get(k), bm.get(k), `${p}[${key}=${k}]`, out);
    return;
  }
  const anchors = [...lcsPairs(a, b), [a.length, b.length]];
  let pi = 0, pj = 0;
  for (const [ai, bj] of anchors) {
    // 틈 a[pi..ai) · b[pj..bj): 같은 종류끼리 차례로 짝
    const used = new Set();
    let cursor = pj;
    for (let i = pi; i < ai; i++) {
      let found = -1;
      for (let j = cursor; j < bj; j++) if (!used.has(j) && compatible(a[i], b[j])) { found = j; break; }
      if (found >= 0) { used.add(found); cursor = found + 1; diffValue(a[i], b[found], `${p}[${found}]`, out); }
      else emitSide(a[i], `${p}[was ${i}]`, "before", out);
    }
    for (let j = pj; j < bj; j++) if (!used.has(j)) emitSide(b[j], `${p}[${j}]`, "after", out);
    pi = ai + 1; pj = bj + 1;
  }
}
function diffValue(a, b, p, out) {
  const ka = kindOf(a), kb = kindOf(b);
  if (ka === "str" && kb === "str") { if (a !== b) out.text.push({ path: p, kind: "changed", before: a, after: b }); return; }
  if (ka === "arr" && kb === "arr") return diffArray(a, b, p, out);
  if (ka === "obj" && kb === "obj") {
    const keys = [...Object.keys(b), ...Object.keys(a).filter((k) => !(k in b))];
    for (const k of keys) diffValue(a[k], b[k], `${p}.${k}`, out);
    return;
  }
  if (ka === kb && ka !== "undef") { if (a !== b) out.nontext.push({ path: p, kind: "changed", before: a, after: b }); return; }
  if (ka !== "undef") emitSide(a, p, "before", out);
  if (kb !== "undef") emitSide(b, p, "after", out);
}

// ── .ts 글 조각: 문자열 · 템플릿 조각 · 정규식 리터럴, 둘러싼 이름(속성 · 변수 · 함수)과 함께 ─────
function tsFragments(src, file) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out = [];
  const nameOf = (n) => {
    if ((ts.isPropertyAssignment(n) || ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText(sf);
    return null;
  };
  const ctxOf = (node) => {
    const names = [];
    for (let n = node.parent; n; n = n.parent) { const nm = nameOf(n); if (nm) names.unshift(nm); }
    return names.join(" > ");
  };
  const visit = (node) => {
    let kind = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) kind = "str";
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) kind = "tpl";
    else if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) kind = "regex";
    if (kind) {
      // import 경로 · 속성 이름 자리의 문자열은 글이 아님
      const par = node.parent;
      const isImport = par && (ts.isImportDeclaration(par) || ts.isExportDeclaration(par));
      const isKeyName = par && ts.isPropertyAssignment(par) && par.name === node;
      if (!isImport) out.push({ ctx: ctxOf(node) + (isKeyName ? " (열쇠)" : ""), v: kind === "regex" ? node.getText(sf) : node.text, lit: kind });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
function diffTs(aSrc, bSrc, file, out) {
  const a = tsFragments(aSrc, file), b = tsFragments(bSrc, file);
  const anchors = [...lcsPairs(a, b), [a.length, b.length]];
  let pi = 0, pj = 0;
  const pathOf = (x, idx) => `${x.ctx || "(파일)"} #${idx} (${x.lit})`;
  for (const [ai, bj] of anchors) {
    const used = new Set();
    let cursor = pj;
    for (let i = pi; i < ai; i++) {
      let found = -1;
      for (let j = cursor; j < bj; j++) if (!used.has(j) && b[j].ctx === a[i].ctx && b[j].lit === a[i].lit) { found = j; break; }
      if (found >= 0) { used.add(found); cursor = found + 1; if (a[i].v !== b[found].v) out.text.push({ path: pathOf(b[found], found), kind: "changed", before: a[i].v, after: b[found].v }); }
      else out.text.push({ path: pathOf(a[i], i), kind: "removed", before: a[i].v, after: null });
    }
    for (let j = pj; j < bj; j++) if (!used.has(j)) out.text.push({ path: pathOf(b[j], j), kind: "added", before: null, after: b[j].v });
    pi = ai + 1; pj = bj + 1;
  }
}

// ── 파일 → 과정 · 강의 ───────────────────────────────────────────
function courseOf(file) {
  const m = file.match(/^content\/lessons\/([^/]+)\//);
  if (m) return m[1];
  if (file === "content/ld_english_scripts.json") return "ld";
  if (file === "content/voca_dictionary.json") return "phonics";
  const c = file.match(/^content\/courses\/([^/.]+)\.json$/);
  if (c) return c[1];
  if (/src\/lib\/reading/.test(file)) return "reading";
  if (/vocaSpeech\.ts$/.test(file)) return "phonics+reading";
  if (/curriculumPresentation\.ts$/.test(file)) return "grammar1";
  return "other";
}
function lessonOf(file, p) {
  const m = file.match(/^content\/lessons\/[^/]+\/([^/]+)\.json$/);
  if (m) return m[1];
  const top = p.match(/^\.?([^.[\]]+)/);
  if (file === "content/ld_english_scripts.json" || /src\/lib\/reading/.test(file)) return top ? top[1] : "";
  if (file === "content/voca_dictionary.json") return top ? `word:${top[1]}` : "";
  const l = p.match(/lessons\[id=([^\]]+)\]/);
  if (l) return l[1];
  return "";
}

// ── 실행 ────────────────────────────────────────────────────────
const baseSha = revParse(BASE);
const headSha = HEAD_DIR ? null : revParse(HEAD);
const baseTree = tree(baseSha);
const headTree = HEAD_DIR ? null : tree(headSha);

if (EXPORT) {
  const paths = [...headTree.keys()];
  const blobs = catBlobs(paths.map((p) => headTree.get(p)));
  paths.forEach((p, i) => { const f = path.join(EXPORT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, blobs[i]); });
  console.log(`지금 판 ${headSha.slice(0, 7)} 의 범위 파일 ${paths.length} 개를 ${EXPORT} 에 풀었음`);
  process.exit(0);
}

function listDir(dir) {
  const res = new Map();
  for (const s of SCOPE) {
    const abs = path.join(dir, s);
    if (!fs.existsSync(abs)) continue;
    const walk = (a, rel) => {
      if (fs.statSync(a).isDirectory()) for (const e of fs.readdirSync(a)) walk(path.join(a, e), `${rel}/${e}`);
      else res.set(rel, a);
    };
    walk(abs, s);
  }
  return res;
}

const headFiles = HEAD_DIR ? listDir(path.resolve(HEAD_DIR)) : null;
const allPaths = [...new Set([...baseTree.keys(), ...(HEAD_DIR ? headFiles.keys() : headTree.keys())])].sort();
// 두 판에서 blob 이 같으면(--head-dir 는 바이트가 같으면) 조각이 바뀔 수 없음 — 다른 것만 읽어 비교
const baseCandidates = allPaths.filter((p) => baseTree.has(p));
const baseBlobs = new Map();
{
  const need = HEAD_DIR ? baseCandidates : baseCandidates.filter((p) => baseTree.get(p) !== headTree.get(p));
  catBlobs(need.map((p) => baseTree.get(p))).forEach((b, i) => baseBlobs.set(need[i], b));
}
const headBlobs = new Map();
if (HEAD_DIR) for (const p of allPaths) { if (headFiles.has(p)) headBlobs.set(p, fs.readFileSync(headFiles.get(p))); }
else {
  const need = allPaths.filter((p) => headTree.has(p) && baseTree.get(p) !== headTree.get(p));
  catBlobs(need.map((p) => headTree.get(p))).forEach((b, i) => headBlobs.set(need[i], b));
}

const records = [];
const nontext = [];
const filesByteChanged = [];
for (const p of allPaths) {
  const inBase = baseTree.has(p);
  const inHead = HEAD_DIR ? headFiles.has(p) : headTree.has(p);
  if (!HEAD_DIR && inBase && inHead && baseTree.get(p) === headTree.get(p)) continue;
  const A = inBase ? baseBlobs.get(p) : null;
  const B = inHead ? headBlobs.get(p) : null;
  if (A && B && A.equals(B)) continue;
  filesByteChanged.push(p);
  const out = { text: [], nontext: [] };
  const str = (buf) => (buf ? buf.toString("utf8").replace(/^﻿/, "") : null);
  if (p.endsWith(".json")) {
    const a = A ? JSON.parse(str(A)) : undefined;
    const b = B ? JSON.parse(str(B)) : undefined;
    diffValue(a, b, "", out);
  } else if (p.endsWith(".ts")) {
    diffTs(str(A) || "", str(B) || "", p, out);
  } else {
    // 범위 안 다른 종류 파일 — 줄 하나를 조각으로
    const la = (str(A) || "").split(/\r?\n/), lb = (str(B) || "").split(/\r?\n/);
    diffValue(la, lb, "", out);
  }
  for (const r of out.text) records.push({ file: p, course: courseOf(p), lesson: lessonOf(p, r.path), ...r });
  for (const r of out.nontext) nontext.push({ file: p, ...r });
}

const COURSE_ORDER = ["student", "phonics", "grammar1", "grammar2", "ld", "reading", "phonics+reading"];
const corder = (c) => { const i = COURSE_ORDER.indexOf(c); return i < 0 ? 99 : i; };
// 차례: 과정 → 파일 → 조각이 나온 차례(파일 안 차례는 뽑은 순서 그대로)
records.forEach((r, i) => (r._i = i));
records.sort((x, y) => corder(x.course) - corder(y.course) || (x.file < y.file ? -1 : x.file > y.file ? 1 : 0) || x._i - y._i);
records.forEach((r, i) => { r.id = `C${String(i + 1).padStart(5, "0")}`; delete r._i; });
const lines = records.map((r) => JSON.stringify({ id: r.id, course: r.course, lesson: r.lesson, file: r.file, path: r.path, kind: r.kind, before: r.before, after: r.after }));

const filesWithText = new Set(records.map((r) => r.file));
const filesWithNontext = new Set(nontext.map((r) => r.file));
const filesAny = new Set([...filesWithText, ...filesWithNontext]);
const byKind = {}, byCourse = {};
for (const r of records) { byKind[r.kind] = (byKind[r.kind] || 0) + 1; byCourse[r.course] = (byCourse[r.course] || 0) + 1; }
const summary = {
  base: baseSha, head: headSha || `dir:${path.resolve(HEAD_DIR)}`,
  filesByteChanged: filesByteChanged.length,
  filesWithTextChange: filesWithText.size,
  filesWithOnlyNontextChange: [...filesWithNontext].filter((f) => !filesWithText.has(f)).length,
  filesWithNoValueChange: filesByteChanged.filter((f) => !filesAny.has(f)),
  fragments: records.length, byKind, byCourse,
  nontextChanges: nontext.length,
};

if (CHECK) {
  const saved = fs.readFileSync(CHECK, "utf8").split("\n").filter(Boolean);
  const strip = (l) => { const o = JSON.parse(l); delete o.id; return JSON.stringify(o); };
  const a = new Map(); for (const l of saved) { const k = strip(l); a.set(k, (a.get(k) || 0) + 1); }
  const b = new Map(); for (const l of lines) { const k = strip(l); b.set(k, (b.get(k) || 0) + 1); }
  const onlyNew = [], onlySaved = [];
  for (const [k, n] of b) for (let i = 0; i < n - (a.get(k) || 0); i++) onlyNew.push(k);
  for (const [k, n] of a) for (let i = 0; i < n - (b.get(k) || 0); i++) onlySaved.push(k);
  console.log(JSON.stringify(summary, null, 1));
  console.log(`저장한 목록 ${saved.length} 줄 · 새로 뽑은 목록 ${lines.length} 줄 · 새 목록에만 ${onlyNew.length} · 저장한 목록에만 ${onlySaved.length}`);
  for (const k of onlyNew.slice(0, 20)) console.log("  + " + k);
  for (const k of onlySaved.slice(0, 20)) console.log("  - " + k);
  process.exit(onlyNew.length || onlySaved.length ? 1 : 0);
}

fs.writeFileSync(OUT, lines.join("\n") + "\n");
fs.writeFileSync(OUT.replace(/\.jsonl$/, "-글아닌값.json"), JSON.stringify({ summary, nontext }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(`목록 ${lines.length} 줄 → ${path.relative(WT, OUT)}`);
