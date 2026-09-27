#!/usr/bin/env node
/**
 * docs/디자인-규칙.md 의 기계 검사 (2026-09-27). 화면 파일(.tsx)을 TypeScript 로 읽어 JSX 요소마다 센다 — 글자 검색이 아니라 요소 단위:
 *   monoKorean   className 에 font-mono 가 있는데 그 요소의 바로 밑 글에 한글이 있음(자간 · 대문자 붙은 것 포함)       — 규칙 §2
 *   trackedKorean className 에 tracking-* 또는 uppercase 가 있는데 바로 밑 글에 한글이 있음                                   — 규칙 §2
 *   tinyText     text-[Npx] 에서 N < 12, 또는 text-[0.xrem] 이 12px 미만                                                — 규칙 §3
 *   smallInput   input · textarea · select 의 글자가 16px 미만(text-[<16px] · text-xs · text-sm)                        — 규칙 §1-4
 *   directColor  amber · blue · emerald · green · rose · red · teal · orange · pink · purple · indigo · sky · cyan · lime · yellow · violet · fuchsia 색 클래스 — 규칙 §4
 *   motion       animate-pulse · animate-bounce                                                                       — 규칙 §5
 *   emoji        JSX 글에 든 그림 문자(이모지)                                                                          — 규칙 §5 (학습 내용 속 뜻 있는 이모지는 사람이 판단 — 숫자만 보고)
 *
 *   node check-design-rules.cjs <파일 · 폴더 …> [--zero monoKorean,trackedKorean,tinyText,smallInput,directColor,motion] [--json out.json]
 *   --zero 로 준 칸이 하나라도 0 이 아니면 exit 1(고친 파일에 댐). 없으면 세기만.
 *   --selftest-break : 규칙을 어긴 가짜 파일을 임시로 만들어 각 칸이 1 이상 나오고 --zero 가 exit 1 을 내는지(검사가 실패할 수 있음을 증명)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const COLOR = /\b(?:bg|text|border|from|to|via|ring|fill|stroke|shadow|outline|decoration|accent|divide|placeholder)-(?:amber|blue|emerald|green|rose|red|teal|orange|pink|purple|indigo|sky|cyan|lime|yellow|violet|fuchsia)-\d{2,3}\b/;
const KINDS = ["monoKorean", "trackedKorean", "tinyText", "smallInput", "directColor", "motion", "emoji"];

function pxOf(cls) {
  const m = cls.match(/^text-\[(\d+(?:\.\d+)?)(px|rem)\]$/);
  if (!m) return null;
  return m[2] === "rem" ? +m[1] * 16 : +m[1];
}

/** every static piece of a className value: string literal, template head/spans, strings inside expressions */
function classText(expr) {
  const out = [];
  const visit = (n) => {
    if (!n) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text); n.templateSpans.forEach((s) => { visit(s.expression); out.push(s.literal.text); }); }
    else ts.forEachChild(n, visit);
  };
  visit(expr);
  return out.join(" ");
}

function directText(el) {
  // the element's own JSX text children (not grand-children), plus string literals in {…} children
  const kids = ts.isJsxElement(el) ? el.children : [];
  const parts = [];
  for (const k of kids) {
    if (ts.isJsxText(k)) parts.push(k.text);
    else if (ts.isJsxExpression(k) && k.expression) {
      const walk = (n) => { if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text); else if (ts.isTemplateExpression(n)) { parts.push(n.head.text); n.templateSpans.forEach((s) => parts.push(s.literal.text)); } else if (!ts.isJsxElement(n) && !ts.isJsxSelfClosingElement(n)) ts.forEachChild(n, walk); };
      walk(k.expression);
    }
  }
  return parts.join(" ");
}

function checkFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = Object.fromEntries(KINDS.map((k) => [k, []]));
  const at = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const visit = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = open.tagName.getText(sf);
      const attr = open.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === "className");
      const cls = attr && attr.initializer ? (ts.isStringLiteral(attr.initializer) ? attr.initializer.text : classText(attr.initializer.expression || attr.initializer)) : "";
      const tokens = cls.split(/\s+/).filter(Boolean);
      const text = directText(n);
      const line = at(n);
      const sample = (text || cls).replace(/\s+/g, " ").trim().slice(0, 50);
      if (tokens.includes("font-mono") && HANGUL.test(text)) found.monoKorean.push({ line, sample });
      if (tokens.some((t) => /^(?:[a-z]+:)*(?:tracking-|uppercase$)/.test(t) && !/tracking-(?:normal|tight|tighter)$/.test(t)) && HANGUL.test(text)) found.trackedKorean.push({ line, sample });
      for (const t of tokens) {
        const px = pxOf(t.replace(/^(?:[a-z0-9-]+:)+/, ""));
        if (px !== null && px < 12) found.tinyText.push({ line, sample: `${t} ${sample}` });
      }
      if (/^(input|textarea|select)$/.test(tag)) {
        const small = tokens.some((t) => { const b = t.replace(/^(?:[a-z0-9-]+:)+/, ""); const px = pxOf(b); return (px !== null && px < 16) || b === "text-xs" || b === "text-sm" || b === "text-caption" || b === "text-label"; });
        if (small) found.smallInput.push({ line, sample: `<${tag}> ${cls.slice(0, 60)}` });
      }
      for (const t of tokens) if (COLOR.test(t.replace(/^(?:[a-z0-9-]+:)+/, ""))) found.directColor.push({ line, sample: t });
      for (const t of tokens) if (/(^|:)animate-(pulse|bounce)$/.test(t)) found.motion.push({ line, sample: t });
      if (EMOJI.test(text)) found.emoji.push({ line, sample });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

function collect(targets) {
  const files = [];
  for (const t of targets) {
    const p = path.resolve(REPO, t);
    if (!fs.existsSync(p)) { console.error(`없음: ${t}`); process.exitCode = 2; continue; }
    if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p, { recursive: true })) if (/\.tsx$/.test(f)) files.push(path.join(p, f)); }
    else files.push(p);
  }
  return files;
}

function run(targets, zero) {
  const rows = [];
  for (const f of collect(targets)) {
    const found = checkFile(f);
    rows.push({ file: path.relative(REPO, f).replace(/\\/g, "/"), counts: Object.fromEntries(KINDS.map((k) => [k, found[k].length])), found });
  }
  const total = Object.fromEntries(KINDS.map((k) => [k, rows.reduce((s, r) => s + r.counts[k], 0)]));
  console.log(["파일".padEnd(48), ...KINDS.map((k) => k.slice(0, 11).padStart(12))].join(""));
  for (const r of rows) console.log([r.file.slice(-48).padEnd(48), ...KINDS.map((k) => String(r.counts[k]).padStart(12))].join(""));
  console.log(["합".padEnd(48), ...KINDS.map((k) => String(total[k]).padStart(12))].join(""));
  const bad = zero.filter((k) => total[k] > 0);
  for (const k of bad) for (const r of rows) for (const x of r.found[k].slice(0, 5)) console.log(`  ${k} ${r.file}:${x.line} ${x.sample}`);
  return { rows, total, bad };
}

const args = process.argv.slice(2);
const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const zero = (flag("--zero") || "").split(",").filter(Boolean);
if (args.includes("--selftest-break")) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kig-design-break-"));
  const f = path.join(dir, "Broken.tsx");
  fs.writeFileSync(f, `export function B(){return (<div>
  <span className="font-mono text-[11px] tracking-widest uppercase">자 막 없 이</span>
  <p className="text-emerald-700 animate-pulse">🔊 들어 보세요</p>
  <input className="text-[14px]" />
</div>);}\n`);
  const r = run([f], KINDS.filter((k) => k !== "emoji"));
  const each = KINDS.map((k) => `${k} ${r.total[k]}`).join(" · ");
  const ok = KINDS.every((k) => r.total[k] >= 1) && r.bad.length > 0;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n깨기: ${each} → ${ok ? "모두 잡음(FAIL 이 나야 맞음)" : "놓친 칸 있음"}`);
  process.exitCode = ok ? 1 : 3; // 1 = 검사가 실패를 냄(기대) · 3 = 검사가 못 잡음
} else {
  const targets = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
  const r = run(targets.length ? targets : ["src/components", "src/app"], zero);
  const out = flag("--json");
  if (out) fs.writeFileSync(path.resolve(REPO, out), JSON.stringify({ at: new Date().toISOString(), total: r.total, rows: r.rows.map((x) => ({ file: x.file, counts: x.counts })) }, null, 1));
  if (zero.length) { console.log(r.bad.length ? `\n0 이어야 할 칸 중 어긋남: ${r.bad.join(", ")}` : "\n0 이어야 할 칸 모두 0"); process.exitCode = r.bad.length ? 1 : 0; }
}
