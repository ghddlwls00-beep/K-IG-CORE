#!/usr/bin/env node
/**
 * READING Step 3 빈칸 문제 생성기(src/lib/readingUtils.ts generateClozeItems) 검사.
 *
 * 4단계 #72·#73·#74·#76·#77 이 지적한 네 가지를 512강 전부에서 센다:
 *   대시     : 빈칸 정답이 "eyes—people" 처럼 대시로 붙은 두 낱말인 문항 (#74)
 *   같은 꼴  : 정답의 굴절형(relationship ↔ relationships)이 오답 보기로 나온 문항 (#73)
 *   조동사   : would/could 같은 조동사가 정답이나 보기인 문항 (#76)
 *   같은 자리: 정답 자리에 똑같이 들어맞는 낱말(piece ↔ music, conserve ↔ preserve)이 보기인 문항 (#72·#77)
 *   정답만 대문자: 보기는 소문자인데 정답만 대문자라 티가 나는 문항 (감사 목록 밖 — 이 수정 중에 찾음)
 * 그리고 보기가 4개가 안 되는 문항(오답 후보가 모자람)을 센다 — 규칙을 조이다 보기가 줄면 안 되므로.
 *
 * 판정 기준은 생성기와 따로 둔다(같은 함수를 쓰면 서로를 봐준다). 앱과 같은 방식으로 문장을 넘긴다
 * (ReadingLearningView.tsx:199-206 — readingSentences 의 english/korean).
 *
 *   node check-reading-cloze.cjs [--runs 20] [--seed 1] [--old]
 *   --old : 커밋된 판(git HEAD)의 생성기로 같은 것을 센다 — 대조군. 문제가 0 이 아니어야 정상.
 * 새 생성기에서 네 가지 중 하나라도 0 이 아니면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const RUNS = Number(arg("--runs", 20));
const SEED = Number(arg("--seed", 1));
const OLD = process.argv.includes("--old");

let state = SEED >>> 0;
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
const req = (spec) => (spec.startsWith(".") || spec.startsWith("@/") ? {} : require(spec));
new Function("require", "module", "exports", js)(req, mod, mod.exports);
const { generateClozeItems } = mod.exports;

// --- the checker's own notion of each problem (independent of the generator) ---
const MODALS = new Set(["would", "could", "might", "must", "shall", "ought", "should", "can", "will", "may"]);
const SAME_SLOT = [["piece", "music"], ["conserve", "preserve"]];
const stem = (w) => w.toLowerCase().replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1");
const family = (a, b) => {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  return stem(x) === stem(y) || ((x.startsWith(y) || y.startsWith(x)) && Math.abs(x.length - y.length) <= 3);
};

const dir = path.join(REPO, "content/lessons/reading");
const lessons = fs.readdirSync(dir).filter((f) => /^pr\d+\.json$/.test(f)).map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  return { id: f.replace(/\.json$/, ""), pairs: (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean })) };
}).filter((l) => l.pairs.length);

const count = { items: 0, dash: 0, family: 0, modal: 0, sameSlot: 0, caps: 0, short: 0 };
const examples = {};
const note = (k, s) => { examples[k] = examples[k] || []; if (examples[k].length < 4 && !examples[k].includes(s)) examples[k].push(s); };
for (let run = 0; run < RUNS; run++) {
  for (const L of lessons) {
    for (const it of generateClozeItems(L.pairs)) {
      count.items++;
      const target = it.missingWord;
      const others = it.options.filter((o) => o !== target);
      if (/[–—―]/.test(target)) { count.dash++; note("dash", `${L.id} 정답 "${target}"`); }
      const fam = others.filter((o) => family(o, target));
      if (fam.length) { count.family++; note("family", `${L.id} 정답 ${target} · 보기 ${fam.join(",")}`); }
      if (MODALS.has(target.toLowerCase()) || others.some((o) => MODALS.has(o.toLowerCase()))) { count.modal++; note("modal", `${L.id} 정답 ${target} · 보기 ${others.join(",")}`); }
      const slot = others.filter((o) => SAME_SLOT.some((g) => g.includes(o.toLowerCase()) && g.includes(target.toLowerCase())));
      if (slot.length) { count.sameSlot++; note("sameSlot", `${L.id} 정답 ${target} · 보기 ${slot.join(",")}`); }
      if (/^[A-Z]/.test(target) && others.every((o) => !/^[A-Z]/.test(o))) { count.caps++; note("caps", `${L.id} 정답 ${target}`); }
      if (it.options.length < 4) { count.short++; note("short", `${L.id} 정답 ${target} · 보기 ${it.options.length}개`); }
    }
  }
}
console.log(`생성기: ${OLD ? "커밋된 판(대조군)" : "지금 판"} · 강의 ${lessons.length} · ${RUNS}회 · 씨앗 ${SEED} · 문항 ${count.items}`);
console.log(`  대시로 붙은 정답 ${count.dash} · 같은 꼴 보기 ${count.family} · 조동사 ${count.modal} · 같은 자리 보기 ${count.sameSlot} · 정답만 대문자 ${count.caps} · 보기 4개 미만 ${count.short}`);
for (const [k, v] of Object.entries(examples)) console.log(`   예(${k}): ${v.join(" | ")}`);
const bad = count.dash + count.family + count.modal + count.sameSlot + count.caps + count.short;
process.exit(!OLD && bad ? 1 : 0);
