#!/usr/bin/env node
/**
 * 관문 15 — 채점 코드(src/lib/grammarGrading.ts)를 바꾼 뒤, 점수가 달라진 것이 '반대말 접두어 짝' 뿐인지 모든 GRAMMAR 문항에서 견준다
 * (결정 A 흠 ② · 소유자 결정 2026-09-24 '뜻이 반대면 0점' · 3차 점검 제안). 바탕 커밋(--base)의 grammarGrading.ts 와 지금 것을 같은 입력으로:
 *   참조 = [모범, ...다른 정답] (GrammarLearningView 가 넘기는 것 — lib/expectations 의 main 쪽 answers, grade-offline 과 같은 고르기)
 *   입력 = 모범 · 다른 정답 · grade-offline 의 변형 11 · 틀린 답(WRONG) ·
 *          반대말 탐침(모범 낱말마다 un · in · im · dis 를 붙인 꼴, 접두어(dis · non · im · in · il · ir · un)가 붙어 있으면 뗀 꼴) ·
 *          오타 탐침(5자 이상 낱말의 끝 글자 빼기 · 가운데 두 글자 바꾸기 — 이것은 바뀌면 안 됨)
 * 점수가 달라진 입력마다, 그 입력과 어떤 참조 사이에 '한쪽 낱말 = 접두어 + 다른 쪽 낱말' 짝이 있는지(흠 ②), 또는 맞지 않고 남은 낱말에
 * unless 가 있는지(결정 C 뒤 — unless 를 'if … not' 의 부정으로 셈) 본다. unless 탐침: 모범의 unless → if · if(부정문) → unless.
 * 짝 없이 달라진 것이 하나라도 있거나, 달라진 것이 0(고침이 안 들어감)이거나, 아래 이름 붙은 네 경우가 기대와 다르면 exit 1.
 *   이름 붙은 경우: "Isn't it possible?"(참조 impossible) · "Was the conviction proper?"(improper) · "This book is expensive."(inexpensive) → 0점,
 *                  "This book is inexpensiv."(오타) → 70점 그대로.
 * --break: (나)의 채점이 'the' 가 든 70점 답을 0점으로 바꿈 → 짝 없는 바뀜이 나와 exit 1 이어야.
 *   node docs/qa-2026-09-18/scripts/compare-grading.cjs --base <커밋> [--out <json>] [--break]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BASE = arg("--base", null);
const OUT = arg("--out", null);
const BREAK = argv.includes("--break");
if (!BASE) { console.error("사용: --base <커밋> [--out <json>] [--break]"); process.exit(2); }
const ts = require(path.join(REPO, "node_modules/typescript"));
const REL = "src/lib/grammarGrading.ts";
const compile = (src, name) => {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: name }).outputText;
  const m = { exports: {} };
  new Function("require", "module", "exports", out)(() => { throw new Error(`${name}: import 가 없어야 함(파일 머리말)`); }, m, m.exports);
  return m.exports;
};
const A = compile(execFileSync("git", ["show", `${BASE}:${REL}`], { cwd: REPO, encoding: "utf8" }), "바탕");
const B = compile(fs.readFileSync(path.join(REPO, REL), "utf8"), "지금");
if (BREAK) {
  const orig = B.gradeAgainstReferences;
  B.gradeAgainstReferences = (u, refs) => { const g = orig(u, refs); return g === "partial" && /\bthe\b/i.test(u) ? "incorrect" : g; };
}

// grade-offline.cjs 의 변형(그대로 옮김 — 그 파일은 불러오면 전부를 돌림)
const VARIANTS = [
  (s) => s.toLowerCase(),
  (s) => s.replace(/^(\w)/, (m) => m.toUpperCase()),
  (s) => s.replace(/ /g, "  "),
  (s) => s.replace(/[.!?]\s*$/, ""),
  (s) => `${s} `,
  (s) => s.replace(/'/g, "’"),
  (s) => { let open = true; return s.replace(/"/g, () => ((open = !open) ? "”" : "“")); },
  (s) => s.replace(/,/g, ""),
  (s) => {
    const map = { "can't": "cannot", "won't": "will not", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not", "i'm": "I am", "it's": "it is", "that's": "that is", "he's": "he is", "she's": "she is", "there's": "there is", "we're": "we are", "they're": "they are", "you're": "you are" };
    return s.replace(/\b[\w']+\b/g, (w) => map[w.toLowerCase()] || w);
  },
  (s) => s.replace(/\bI am\b/g, "I'm").replace(/\bdo not\b/g, "don't").replace(/\bis not\b/g, "isn't").replace(/\bare not\b/g, "aren't").replace(/\bcan not\b/g, "can't"),
];
const WRONG = (s) => `zzz ${s.split(/\s+/).slice(0, 2).reverse().join(" ")} qqq`;
const PREFIXES = ["dis", "non", "im", "in", "il", "ir", "un"];
const ADD = ["un", "in", "im", "dis"];
const words = (s) => String(s).toLowerCase().replace(/[’']/g, "'").split(/\s+/).map((w) => w.replace(/[^a-z']/g, "")).filter(Boolean);
const isPrefixPair = (x, y) => PREFIXES.some((p) => x === p + y || y === p + x);
function probes(model) {
  const out = [];
  const toks = model.split(/(\s+)/);
  toks.forEach((tok, i) => {
    const m = tok.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
    if (!m || m[2].length < 4) return;
    const core = m[2], low = core.toLowerCase();
    const put = (w, kind) => { const t = [...toks]; t[i] = m[1] + w + m[3]; out.push({ kind, text: t.join("") }); };
    const p = PREFIXES.find((q) => low.startsWith(q) && low.length - q.length >= 4);
    if (p) put(core.slice(p.length), "접두어 뗌");
    for (const q of ADD) if (!low.startsWith(q)) put(q + core, "접두어 붙임");
    if (low === "unless") put(core[0] === "U" ? "If" : "if", "unless → if");
    if (low === "if" && /\bnot\b|n't\b/i.test(model)) put(core[0] === "I" ? "Unless" : "unless", "if → unless");
    if (core.length >= 5) {
      put(core.slice(0, -1), "오타 끝 빼기");
      const k = Math.floor(core.length / 2);
      put(core.slice(0, k - 1) + core[k] + core[k - 1] + core.slice(k + 1), "오타 바꾸기");
    }
  });
  return out;
}

const E = require("./lib/expectations.cjs");
let items = 0, graded = 0;
const changed = [];
const byKind = {};
for (const course of ["grammar1", "grammar2"]) {
  for (const p of E.pages(course)) {
    const exp = E.expected(course, p.id);
    if (exp.variant !== "main" || !exp.answers.length) continue;
    for (const a of exp.answers) {
      if (!a.text || /[가-힣]/.test(a.text)) continue;
      items++;
      const refs = [a.text, ...(a.alternatives || [])];
      const cands = [
        { kind: "모범", text: a.text },
        ...(a.alternatives || []).map((t) => ({ kind: "다른 정답", text: t })),
        ...VARIANTS.map((f) => ({ kind: "변형", text: f(a.text) })),
        { kind: "틀린 답", text: WRONG(a.text) },
        ...probes(a.text),
      ];
      for (const c of cands) {
        graded++;
        const gb = A.gradeAgainstReferences(c.text, refs), ga = B.gradeAgainstReferences(c.text, refs);
        const k = (byKind[c.kind] ||= { tried: 0, changed: 0 });
        k.tried++;
        if (gb === ga) continue;
        k.changed++;
        // 남는 낱말은 개수까지 센다(여럿 나오는 낱말 — 'between … between' 의 한쪽에만 접두어를 붙인 탐침)
        const leftover = (xs, ys) => { const rest = [...ys]; return xs.filter((x) => { const i = rest.indexOf(x); if (i < 0) return true; rest.splice(i, 1); return false; }); };
        const cw = words(c.text);
        let why = null;
        for (const r of refs) {
          const rw = words(r); const lc = leftover(cw, rw), lr = leftover(rw, cw);
          if (lc.some((x) => lr.some((y) => isPrefixPair(x, y)))) { why = "접두어 짝"; break; }
          if (lc.includes("unless") || lr.includes("unless")) { why = "unless = if … not"; }
        }
        changed.push({ course, id: p.id, n: a.n, kind: c.kind, text: c.text, before: gb, after: ga, explained: Boolean(why), why });
      }
    }
  }
}
const named = [
  ["Isn't it possible?", ["Isn't it impossible?"], "incorrect"],
  ["Was the conviction proper?", ["Was the conviction improper?"], "incorrect"],
  ["This book is expensive.", ["This book is inexpensive."], "incorrect"],
  ["This book is inexpensiv.", ["This book is inexpensive."], "partial"],
  ["If you study hard, you will never speak English fluently.", ["If you don't study hard, you will never speak English fluently.", "Unless you study hard, you will never speak English fluently."], "incorrect"],
  ["If you don't study hard, you will never speak English fluently.", ["Unless you study hard, you will never speak English fluently."], "partial"],
].map(([u, refs, want]) => ({ u, before: A.gradeAgainstReferences(u, refs), after: B.gradeAgainstReferences(u, refs), want }));
const unexplained = changed.filter((c) => !c.explained);
const namedBad = named.filter((x) => x.after !== x.want);
console.log(`바탕 ${BASE} 의 ${REL} 과 지금 것 · GRAMMAR main 문항 ${items} · 채점한 입력 ${graded}${BREAK ? " (깨기 --break)" : ""}`);
console.log(`점수가 달라진 입력 ${changed.length} (접두어 짝으로 설명됨 ${changed.length - unexplained.length} · 설명 안 됨 ${unexplained.length})`);
for (const [k, v] of Object.entries(byKind)) console.log(`   ${k.padEnd(8)} 입력 ${String(v.tried).padStart(6)} · 달라짐 ${v.changed}`);
const dirs = {};
for (const c of changed) dirs[`${c.before}→${c.after}`] = (dirs[`${c.before}→${c.after}`] || 0) + 1;
console.log(`   방향 ${JSON.stringify(dirs)}`);
const whys = {};
for (const c of changed) whys[c.why || "설명 없음"] = (whys[c.why || "설명 없음"] || 0) + 1;
console.log(`   까닭 ${JSON.stringify(whys)}`);
for (const c of changed.filter((x) => x.kind !== "접두어 붙임" && x.kind !== "접두어 뗌").slice(0, 12)) console.log(`   [${c.explained ? "짝" : "**짝 없음**"}] ${c.course}/${c.id} #${c.n} ${c.kind} "${c.text}" ${c.before}→${c.after}`);
for (const c of unexplained.slice(0, 12)) console.log(`   **설명 안 됨** ${c.course}/${c.id} #${c.n} ${c.kind} "${c.text}" ${c.before}→${c.after}`);
for (const x of named) console.log(`   이름 붙은 경우 "${x.u}" ${x.before} → ${x.after} (기대 ${x.want})${x.after === x.want ? "" : " **다름**"}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ base: BASE, break: BREAK, items, graded, byKind, dirs, named, changed }, null, 1));
const ok = unexplained.length === 0 && changed.length > 0 && namedBad.length === 0;
console.log(ok ? "결과: 달라진 것은 모두 반대말 접두어 짝 (exit 0)" : "결과: 설명 안 되는 바뀜 · 바뀜 0 · 이름 붙은 경우 다름 중 하나 (exit 1)");
process.exit(ok ? 0 : 1);
