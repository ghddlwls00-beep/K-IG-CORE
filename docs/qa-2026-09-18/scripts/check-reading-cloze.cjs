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
 * 6단계 READING (2026-09-23) 에 여섯 가지를 더 센다:
 *   정답이 또 보임: 가린 문장에 정답이 한 번 더 남은 문항 ("all _______ has … but that all music has" — 6-1046 등)
 *   관사 단서  : 빈칸 바로 앞이 a / an 이라 맞는 보기가 드러나는 문항 ("as an _______ miracle" — 6-1059)
 *   이름 보기  : 지문이 늘 대문자로만 쓰는 낱말(Spanish · Korea · Dewey)이 소문자로 보기에 나온 문항 (6-1043 등)
 *   같은 정답  : 한 강의의 세 문항 중 정답이 같은 것 (pr020 plants ×3 · pr099 essential ×2 — 6-1063 · 6-1308)
 *   숫자      : 정답이나 보기에 숫자가 든 문항 (1800s · 175cm · 1,909 — 6-1125 · 6-1265 · 6-1287)
 *   또 맞는 보기: 정답 자리에 들어맞는 것으로 확인한 낱말이 보기로 나온 문항 (아래 ALSO_FITS — 6-1040 등 정답 24개 · 짝 32)
 *
 * 판정 기준은 생성기와 따로 둔다(같은 함수를 쓰면 서로를 봐준다). 앱과 같은 방식으로 문장을 넘긴다
 * (ReadingLearningView.tsx:199-206 — readingSentences 의 english/korean).
 *
 *   node check-reading-cloze.cjs [--runs 20] [--seed 1] [--old]
 *   --old  : 고치기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞)의 생성기로 같은 것을 센다 — 대조군. 문제가 0 이 아니어야 정상(찾으면 exit 1).
 *   --diff : 고치기 전 판과 지금 판의 빈칸 정답(보기와 달리 무작위가 아님)을 강의마다 견줘 바뀐 문항 수를 보인다.
 *   (전에는 git HEAD 였는데, 고친 생성기가 커밋된 뒤로는 HEAD 가 고친 판이라 대조군이 모두 0 이었다 — 7-1 n)
 * 지금 생성기에서 하나라도 0 이 아니면 exit 1.
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
const DIFF = process.argv.includes("--diff");

let state = SEED >>> 0;
Math.random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const PRE_FIX_REV = "f35e8be";
function load(old) {
  const src = old
    ? execSync(`git show ${PRE_FIX_REV}:src/lib/readingUtils.ts`, { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    : fs.readFileSync(path.join(REPO, "src/lib/readingUtils.ts"), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  const mod = { exports: {} };
  const req = (spec) => (spec.startsWith(".") || spec.startsWith("@/") ? {} : require(spec));
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  return mod.exports.generateClozeItems;
}
const generateClozeItems = load(OLD);

// --- the checker's own notion of each problem (independent of the generator) ---
const MODALS = new Set(["would", "could", "might", "must", "shall", "ought", "should", "can", "will", "may"]);
const SAME_SLOT = [["piece", "music"], ["conserve", "preserve"]];
// 6단계에서 reading-cloze-probe.cjs 로 하나씩 잰 것 — 정답 → 그 자리에 또 들어맞는 지문 낱말 (앱 CLOZE_ALSO_FITS 와 따로 적음)
const ALSO_FITS = {
  plant: ["fish", "river"], asking: ["saying"], children: ["students"], force: ["asset"],
  touch: ["leave", "carry", "teach", "learn"], yearbook: ["pictures"], events: ["places"], early: ["work"],
  solar: ["clean"], midnight: ["terrible"], appearance: ["expression"], checked: ["watched"],
  conception: ["conceiving"], value: ["favor", "reach", "beauty"], assembly: ["creature"],
  mandatory: ["additional"], automatic: ["necessary", "inherited"], develop: ["produce"],
  athletic: ["physical"], "ice-cream": ["delicious"],
  farming: ["poverty"], individual: ["productive", "successful"], // 6-1219 줄 나눔 전수로 새로 생긴 문항(pr147 · pr173)
  computers: ["audiences"], // 6-1245 pr214 audience → audiences 로 보기가 더 들어맞게 됨
  behavioral: ["reasonable"], // 6-1284 pr246 s2 를 고쳐 새로 생긴 빈칸 'a ___ ecologist'
};
const stem = (w) => w.toLowerCase().replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1");
const family = (a, b) => {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  return stem(x) === stem(y) || ((x.startsWith(y) || y.startsWith(x)) && Math.abs(x.length - y.length) <= 3);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const dir = path.join(REPO, "content/lessons/reading");
const lessons = fs.readdirSync(dir).filter((f) => /^pr\d+\.json$/.test(f)).map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const pairs = (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean }));
  // 지문에서 소문자로 한 번이라도 쓰인 낱말 — 여기 없는 보기는 이름(대문자로만 쓰임)
  const lower = new Set(pairs.flatMap((p) => p.en.split(/[\s–—―]+/)).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")).filter((w) => w && !/^[A-Z]/.test(w)).map((w) => w.toLowerCase()));
  return { id: f.replace(/\.json$/, ""), pairs, lower };
}).filter((l) => l.pairs.length);

if (DIFF) {
  const oldGen = load(true), newGen = load(false);
  let items = 0, changed = 0, lessonsChanged = 0;
  const ex = [];
  for (const L of lessons) {
    const a = oldGen(L.pairs).map((it) => it.missingWord), b = newGen(L.pairs).map((it) => it.missingWord);
    const n = Math.max(a.length, b.length);
    let c = 0;
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) c++;
    items += n; changed += c;
    if (c) { lessonsChanged++; ex.push(`${L.id}: ${a.join("/")} → ${b.join("/")}`); }
  }
  console.log(`빈칸 정답이 바뀐 문항 ${changed} / ${items} · 바뀐 강의 ${lessonsChanged} / ${lessons.length}`);
  for (const e of ex) console.log(`  ${e}`);
  process.exit(0);
}

const count = { items: 0, dash: 0, family: 0, modal: 0, sameSlot: 0, caps: 0, short: 0, visible: 0, article: 0, nameOpt: 0, reused: 0, digit: 0, alsoFits: 0 };
const examples = {};
const note = (k, s) => { examples[k] = examples[k] || []; if (examples[k].length < 4 && !examples[k].includes(s)) examples[k].push(s); };
for (let run = 0; run < RUNS; run++) {
  for (const L of lessons) {
    const items = generateClozeItems(L.pairs);
    const answers = items.map((it) => it.missingWord.toLowerCase());
    if (new Set(answers).size < answers.length) { count.reused++; note("reused", `${L.id} 정답 ${answers.join("/")}`); }
    for (const it of items) {
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
      if (new RegExp(`(^|[^A-Za-z0-9])${esc(target)}([^A-Za-z0-9]|$)`, "i").test(it.maskedSentence)) { count.visible++; note("visible", `${L.id} 정답 ${target} · ${it.maskedSentence.slice(0, 90)}`); }
      if (/(^|[^A-Za-z])(a|an)\s+_______/i.test(it.maskedSentence)) { count.article++; note("article", `${L.id} ${it.maskedSentence.match(/\S*\s*\S*\s+_______/)[0]}`); }
      const names = others.filter((o) => !L.lower.has(o.toLowerCase()));
      if (names.length) { count.nameOpt++; note("nameOpt", `${L.id} 정답 ${target} · 보기 ${names.join(",")}`); }
      if (/\d/.test(target) || others.some((o) => /\d/.test(o))) { count.digit++; note("digit", `${L.id} 정답 ${target} · 보기 ${others.join(",")}`); }
      const fits = others.filter((o) => (ALSO_FITS[target.toLowerCase()] || []).includes(o.toLowerCase()));
      if (fits.length) { count.alsoFits++; note("alsoFits", `${L.id} 정답 ${target} · 보기 ${fits.join(",")}`); }
    }
  }
}
console.log(`생성기: ${OLD ? `고치기 전 판 ${PRE_FIX_REV}(대조군)` : "지금 판"} · 강의 ${lessons.length} · ${RUNS}회 · 씨앗 ${SEED} · 문항 ${count.items}`);
console.log(`  대시로 붙은 정답 ${count.dash} · 같은 꼴 보기 ${count.family} · 조동사 ${count.modal} · 같은 자리 보기 ${count.sameSlot} · 정답만 대문자 ${count.caps} · 보기 4개 미만 ${count.short}`);
console.log(`  (6단계) 정답이 또 보임 ${count.visible} · 관사 단서 ${count.article} · 이름 보기 ${count.nameOpt} · 같은 정답 ${count.reused} · 숫자 ${count.digit} · 또 맞는 보기 ${count.alsoFits}`);
for (const [k, v] of Object.entries(examples)) console.log(`   예(${k}): ${v.join(" | ")}`);
const bad = Object.entries(count).filter(([k]) => k !== "items").reduce((n, [, v]) => n + v, 0);
process.exit(bad ? 1 : 0);
