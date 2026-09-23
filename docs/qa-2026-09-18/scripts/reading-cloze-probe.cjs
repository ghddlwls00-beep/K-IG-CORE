#!/usr/bin/env node
/**
 * READING Step 3 빈칸 — 강의 몇 개를 앱의 생성기(src/lib/readingUtils.ts generateClozeItems)로 여러 번 돌려
 * 문항마다 정답 · 가린 문장 · 오답 보기가 몇 %로 나오는지 보인다(6단계 READING 빈칸 지적 확인용).
 * 앱과 같은 문장을 넘긴다(readingSentences 의 english/korean — check-reading-cloze.cjs 와 같음).
 *
 *   node reading-cloze-probe.cjs pr003 pr004 [--runs 400] [--old]
 *   --old : git HEAD 의 생성기 (고치기 전과 견줄 때)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const RUNS = Number(arg("--runs", 400));
const OLD = argv.includes("--old");
const ids = argv.filter((a, i) => /^pr\d+/.test(a) && argv[i - 1] !== "--runs");

let state = 12345;
Math.random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const src = OLD
  ? execSync("git show HEAD:src/lib/readingUtils.ts", { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
  : fs.readFileSync(path.join(REPO, "src/lib/readingUtils.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)((spec) => (spec.startsWith(".") || spec.startsWith("@/") ? {} : require(spec)), mod, mod.exports);
const { generateClozeItems } = mod.exports;

for (const id of ids) {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
  const pairs = (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean }));
  const stats = new Map(); // key = item index → { target, masked, opts: Map }
  for (let r = 0; r < RUNS; r++) {
    generateClozeItems(pairs).forEach((it, i) => {
      const k = `${i + 1}`;
      if (!stats.has(k)) stats.set(k, { targets: new Map(), masked: it.maskedSentence, opts: new Map() });
      const st = stats.get(k);
      st.targets.set(it.missingWord, (st.targets.get(it.missingWord) || 0) + 1);
      for (const o of it.options) if (o !== it.missingWord) st.opts.set(o, (st.opts.get(o) || 0) + 1);
    });
  }
  console.log(`\n== ${id}${OLD ? " (HEAD 생성기)" : ""} · ${RUNS}회`);
  for (const [k, st] of stats) {
    const t = [...st.targets.keys()].join("/");
    const opts = [...st.opts.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${((n / RUNS) * 100).toFixed(0)}%`).join(" · ");
    console.log(` #${k} 정답 ${t}\n    ${st.masked}\n    보기: ${opts}`);
  }
}
