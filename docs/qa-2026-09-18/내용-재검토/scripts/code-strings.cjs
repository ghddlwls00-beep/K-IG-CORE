#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 명령서 범위 밖 '코드 글' (3차 점검 요청 2026-09-24 15:5x: 9d6e15d..HEAD 에서 바뀐 src 코드 파일 가운데
 * 이용권 · 관리자 · /api/ 를 뺀 것의, 학습자 화면에 나오는 글 문자열 — 안내 · 채점 피드백 · 설명 · 제목, 영어 포함).
 * 주석은 AST 에 없으므로 빠진다. 문자열 · 템플릿 조각 · JSX 글(JsxText)을 두 판에서 뽑아 최장 공통 부분열로 맞춘 뒤
 * 바뀜 · 새로 생김 · 없어짐을 내고, 글처럼 보이는 것만(한글 · JSX 글 · 화면 속성(aria-label · title · placeholder · alt) · 낱말 둘 이상의 영어) 남긴다.
 * 범위 안 글 파일(curriculumPresentation.ts · vocaSpeech.ts · reading*.json)과 generated 키 파일은 뺀다.
 *   node code-strings.cjs      → 코드글-목록.jsonl (K001…) · 표준 출력에 파일별 수
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const ts = require(require.resolve("typescript", { paths: [L.WT] }));

const files = L.git(["diff", "--name-only", L.BASE, L.HEAD, "--", "src"]).toString().split("\n").map((s) => s.trim()).filter(Boolean)
  .filter((f) => !/license|admin|\/api\//i.test(f))
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .filter((f) => !/curriculumPresentation\.ts$|vocaSpeech\.ts$/.test(f));

const ATTRS = new Set(["aria-label", "title", "placeholder", "alt", "label"]);
function frags(src, file) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const nameOf = (n) => {
    if ((ts.isPropertyAssignment(n) || ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText(sf);
    if (ts.isJsxAttribute(n)) return `@${n.name.getText(sf)}`;
    return null;
  };
  const ctxOf = (node) => { const a = []; for (let n = node.parent; n; n = n.parent) { const nm = nameOf(n); if (nm) a.unshift(nm); } return a.join(" > "); };
  const attrOf = (node) => { for (let n = node.parent; n && !ts.isSourceFile(n); n = n.parent) { if (ts.isJsxAttribute(n)) return n.name.getText(sf); if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) return null; } return null; };
  const visit = (node) => {
    let kind = null, text = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { kind = "str"; text = node.text; }
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) { kind = "tpl"; text = node.text; }
    else if (node.kind === ts.SyntaxKind.JsxText) { kind = "jsx"; text = node.getText(sf).replace(/\s+/g, " ").trim(); }
    if (kind && text) {
      const par = node.parent;
      const isImport = par && (ts.isImportDeclaration(par) || ts.isExportDeclaration(par) || (ts.isCallExpression(par) && par.expression.kind === ts.SyntaxKind.ImportKeyword));
      if (!isImport) out.push({ ctx: ctxOf(node), v: text, lit: kind, attr: attrOf(node), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
function lcs(a, b) {
  const ka = a.map((x) => `${x.lit}|${x.v}`), kb = b.map((x) => `${x.lit}|${x.v}`);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) { if (ka[i] === kb[j]) { pairs.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return pairs;
}
const looksClass = (s) => /(^|\s)(text|bg|px|py|pt|pb|pl|pr|mt|mb|ml|mr|mx|my|w|h|min|max|flex|grid|gap|rounded|border|shadow|font|leading|tracking|items|justify|hover|focus|dark|sm|md|lg|z|inset|top|left|right|bottom|absolute|relative|overflow|opacity|transition|duration|ease|ring|outline|cursor|select|space|col|row|order|self|place|animate|translate|scale|rotate|whitespace|break|truncate|line|list|object|aspect|fill|stroke|sr|block|inline|hidden|static|fixed|sticky)[-:[]/.test(s) || /^[a-z0-9-]+$/.test(s);
function textLike(f) {
  const s = String(f.v).trim();
  if (!s) return false;
  if (/[가-힣]/.test(s)) return !looksClass(s) || /[가-힣]{2}/.test(s);
  if (f.lit === "jsx") return /[A-Za-z]/.test(s);
  if (f.attr && ATTRS.has(f.attr)) return true;
  if (/^(https?:|\/|\.|#|@|data:)/.test(s) || looksClass(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false;
  return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(s) && !/[{};=<>]/.test(s);
}

const ALL = process.argv.includes("--all"); // 거르기 전 전부(확인용) — 파일에 쓰지 않고 출력만
const out = [];
const specs = files.flatMap((f) => [`${L.BASE}:${f}`, `${L.HEAD}:${f}`]);
const texts = L.catFiles(specs);
files.forEach((f, idx) => {
  const a = texts[idx * 2] ? frags(texts[idx * 2], f) : [];
  const b = texts[idx * 2 + 1] ? frags(texts[idx * 2 + 1], f) : [];
  const anchors = [...lcs(a, b), [a.length, b.length]];
  let pi = 0, pj = 0;
  for (const [ai, bj] of anchors) {
    const used = new Set();
    let cursor = pj;
    for (let i = pi; i < ai; i++) {
      let found = -1;
      for (let j = cursor; j < bj; j++) if (!used.has(j) && b[j].ctx === a[i].ctx && b[j].lit === a[i].lit) { found = j; break; }
      if (found >= 0) { used.add(found); cursor = found + 1; if (a[i].v !== b[found].v && (ALL || textLike(a[i]) || textLike(b[found]))) out.push({ file: f, kind: "changed", ctx: b[found].ctx, attr: b[found].attr, lit: b[found].lit, line: b[found].line, before: a[i].v, after: b[found].v }); }
      else if (ALL || textLike(a[i])) out.push({ file: f, kind: "removed", ctx: a[i].ctx, attr: a[i].attr, lit: a[i].lit, line: a[i].line, before: a[i].v, after: null });
    }
    for (let j = pj; j < bj; j++) if (!used.has(j) && (ALL || textLike(b[j]))) out.push({ file: f, kind: "added", ctx: b[j].ctx, attr: b[j].attr, lit: b[j].lit, line: b[j].line, before: null, after: b[j].v });
    pi = ai + 1; pj = bj + 1;
  }
});
if (ALL) {
  for (const r of out) if (/[가-힣]/.test(`${r.before || ""}${r.after || ""}`) || r.lit === "jsx" || r.attr) console.log(`${r.file.replace(/^src\//, "")}:${r.line} ${r.kind} [${r.lit}${r.attr ? ` @${r.attr}` : ""}] ${r.ctx} | 전 ${JSON.stringify(r.before)} | 뒤 ${JSON.stringify(r.after)}`);
  console.log(`(--all: 바뀐 조각 ${out.length} 중 한글 · JSX 글 · 화면 속성만 위에 보임)`);
  process.exit(0);
}
out.forEach((r, i) => (r.id = `K${String(i + 1).padStart(3, "0")}`));
fs.writeFileSync(path.join(L.DIR, "코드글-목록.jsonl"), out.map((r) => JSON.stringify({ id: r.id, file: r.file, line: r.line, kind: r.kind, lit: r.lit, attr: r.attr, ctx: r.ctx, before: r.before, after: r.after })).join("\n") + "\n");
const per = {};
for (const r of out) per[r.file] = (per[r.file] || 0) + 1;
console.log(`코드 파일 ${files.length} · 글처럼 보이는 바뀐 조각 ${out.length}`);
for (const [f, n] of Object.entries(per)) console.log(`  ${f} ${n}`);
