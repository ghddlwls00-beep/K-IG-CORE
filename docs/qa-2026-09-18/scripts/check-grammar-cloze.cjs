#!/usr/bin/env node
/**
 * GRAMMAR 빈칸(Step 2 — GrammarLearningView.tsx buildCloze) — 6-1357.
 * 앱 파일에서 GRAMMAR_KEYWORDS · NEGATIVE_CONTRACTION · buildCloze 를 그대로 떼어 와(TS 를 JS 로) 모든 GRAMMAR 모범 답안에 돌린다.
 *   ① 반쪽 빈칸: 빈칸 정답이 줄임말의 앞쪽 조각(Isn · Aren · don · doesn …)이고 바로 뒤가 ' + t 인 문항 — 온전한 "isn't" 를 치면 틀림
 *   ② 빈칸이 부정 줄임말(n't)이 아닌데 문장에 n't 가 있어 과가 가르치는 꼴이 화면에 그대로 보이는 문항(셈만 — 정보)
 *   ③ 빈칸 정답에 온전한 꼴을 쳤을 때(앱 채점기 gradeAnswer)가 exact 가 아닌 빈칸
 *   ④ 고치기 전 판(f35e8be)과 빈칸이 달라진 문항 수 · 그 가운데 n't 가 없는 문항(있으면 안 됨 — 바꾼 범위 확인)
 *
 *   node check-grammar-cloze.cjs [--old] [--list]
 *   --old : 고치기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞)의 GrammarLearningView.tsx 로 ①②③ 을 셈(대조군 — ① 이 0 이 아니어야 정상, exit 1)
 *   (전에는 git HEAD 였는데, 고친 것이 커밋된 뒤로는 HEAD 가 고친 판이라 대조군 · ④ 가 모두 0 이었다 — 7-1 n)
 * ① 이나 ③ 이 있으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const E = require("./lib/expectations.cjs");
const OLD = process.argv.includes("--old");

function pull(src) {
  const grab = (start, endRe) => { const i = src.indexOf(start); if (i < 0) return ""; const rest = src.slice(i); const m = rest.match(endRe); return rest.slice(0, m.index + m[0].length); };
  const kw = grab("const GRAMMAR_KEYWORDS", /\]\);/);
  const neg = grab("const NEGATIVE_CONTRACTION", /;\r?\n/);
  const fn = grab("function buildCloze", /\r?\n}\r?\n/);
  const js = ts.transpileModule(`${kw}\n${neg}\n${fn}\nmodule.exports = { buildCloze };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", "require", js)(m, m.exports, require);
  return m.exports.buildCloze;
}
const nowSrc = fs.readFileSync(path.join(REPO, "src/components/GrammarLearningView.tsx"), "utf8");
const PRE_FIX_REV = "f35e8be"; // 6단계 고침 앞 — 대조군과 ④ 의 '고치기 전'
const headSrc = execSync(`git show ${PRE_FIX_REV}:src/components/GrammarLearningView.tsx`, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });
const build = pull(OLD ? headSrc : nowSrc);
const buildHead = pull(headSrc);
const clean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();

const seen = new Set();
let n = 0, half = 0, visible = 0, notExact = 0, changed = 0, changedNoNeg = 0;
const ex = { half: [], notExact: [], changedNoNeg: [] };
for (const course of ["grammar1", "grammar2"]) {
  const dir = path.join(REPO, "content/lessons", course);
  for (const f of fs.readdirSync(dir).filter((x) => /^gh\d-\d{3}(-\d)?\.json$/.test(x))) {
    let exp;
    try { exp = E.expected(course, f.replace(".json", "")); } catch { continue; }
    for (const a of (exp && exp.answers) || []) {
      const t = clean(a.text);
      if (!t || /[가-힣]/.test(t) || seen.has(t)) continue;
      seen.add(t);
      n++;
      const { parts } = build(t);
      const blanks = parts.map((p, i) => ({ p, i })).filter((x) => x.p.isBlank);
      const hasNeg = /[A-Za-z]n['’]t\b/.test(t);
      if (blanks.some(({ p, i }) => /^'+$/.test((parts[i + 1] || {}).text || "") && /^t$/i.test((parts[i + 2] || {}).text || ""))) { half++; if (ex.half.length < 5) ex.half.push(t); }
      if (hasNeg && !blanks.some(({ p }) => /n['’]t$/i.test(p.answer || ""))) visible++;
      const full = (w) => { const l = w.toLowerCase().replace(/’/g, "'"); if (l === "can't") return "cannot"; if (l === "won't") return "will not"; if (l === "shan't") return "shall not"; return l.replace(/n't$/, " not"); };
      for (const { p } of blanks) if (grading.gradeAnswer(p.answer, p.answer) !== "exact" || (/n['’]t$/i.test(p.answer) && grading.gradeAnswer(full(p.answer), p.answer) !== "exact")) { notExact++; if (ex.notExact.length < 5) ex.notExact.push(`${p.answer} | ${t}`); }
      if (!OLD) {
        const a1 = buildHead(t).parts.filter((p) => p.isBlank).map((p) => p.answer).join("|");
        const a2 = parts.filter((p) => p.isBlank).map((p) => p.answer).join("|");
        if (a1 !== a2) { changed++; if (!hasNeg) { changedNoNeg++; if (ex.changedNoNeg.length < 5) ex.changedNoNeg.push(`${a1} → ${a2} | ${t}`); } }
      }
    }
  }
}
console.log(`${OLD ? `[고치기 전 ${PRE_FIX_REV}] ` : ""}GRAMMAR 모범 답안(서로 다른) ${n} · ① 반쪽 빈칸 ${half} · ② n't 가 있는데 빈칸은 딴 곳 ${visible} · ③ 온전한 꼴이 exact 아닌 빈칸 ${notExact}${OLD ? "" : ` · ④ 고치기 전(${PRE_FIX_REV})과 빈칸이 달라진 문항 ${changed} (n't 없는 문항 ${changedNoNeg})`}`);
if (process.argv.includes("--list")) for (const [k, v] of Object.entries(ex)) if (v.length) console.log(`  ${k}: ${v.join(" / ")}`);
process.exit(half || notExact || changedNoNeg ? 1 : 0);
