#!/usr/bin/env node
/**
 * READING Step 3 빈칸 문제 생성기(src/lib/readingUtils.ts generateClozeItems · clozeCandidates) 검사.
 *
 * 4단계 #72·#73·#74·#76·#77 이 지적한 네 가지를 256강 전부에서 센다:
 *   대시     : 빈칸 정답이 "eyes—people" 처럼 대시로 붙은 두 낱말인 문항 (#74)
 *   같은 꼴  : 정답의 굴절형(relationship ↔ relationships)이 오답 보기로 나온 문항 (#73)
 *   조동사   : would/could 같은 조동사가 정답이나 보기인 문항 (#76)
 *   같은 자리: 정답 자리에 똑같이 들어맞는 낱말(piece ↔ music, conserve ↔ preserve)이 보기인 문항 (#72·#77)
 *   정답만 대문자: 보기는 소문자인데 정답만 대문자라 티가 나는 문항
 * 그리고 보기가 4개가 안 되는 문항을 센다.
 * 6단계 READING (2026-09-23) 의 여섯 가지: 정답이 또 보임 · 관사 단서 · 이름 보기 · 같은 정답 · 숫자 · 또 맞는 보기.
 *
 * 2026-09-27 (READING 학습법 · 화면 — 계획 G02 · D33 나 · RD-L06 · RD-L13): 빈칸이 그 강의의 핵심어에서 글 앞 · 중간 · 끝으로
 * 나오고 모두 강의 씨앗으로 정해지게 바뀌어서 여섯 가지를 더 센다:
 *   무작위     : 생성기가 Math.random 을 부른 횟수, 그리고 Math.random 을 바꿔 두 번 만든 결과가 다른 강의 — 0 이어야 검수한 문항 = 학습자가 보는 문항
 *   로마자 한국어: 정답이나 보기가 로마자 한국어(lessonSpeechForm 의 KOREAN_WORD_SOUNDS 낱말 + RD-L13 목록)인 문항 — pr154 hanji/paper
 *   핵심어 밖  : 정답이 그 강의의 핵심어(readingVocabulary)가 아닌 문항
 *   순서 · 문장: 한 세트의 문항이 글 순서가 아니거나 두 문항이 한 문장인 세트, 앞 문항 문장에 뒤 문항 정답이 보이는 세트(한 문제씩 내므로)
 *   판정 없음  : 강의가 낼 수 있는 빈칸 전부(핵심어마다 하나 — clozeCandidates)의 보기 가운데 '둘 다 맞나' 판정이 reading-cloze-review.json 에 없는 짝
 *   맞다고 판정 : 판정이 '맞음(fits)'인데 보기로 나오는 짝
 * 앞의 넷과 판정 둘은 회차 0~(--rounds - 1) · 몰라요 없음/있음(씨앗으로 고른 핵심어 셋) 세트 전부에서, 판정은 빈칸 전부에서 센다.
 *
 * 판정 기준은 생성기와 따로 둔다(같은 함수를 쓰면 서로를 봐준다). 앱과 같은 것을 넘긴다: readingSentences 의 english ·
 * 핵심어 readingVocabulary(word · partOfSpeech) · 씨앗 'reading/<본 강의 id>' (ReadingLearningView — "-1" 쪽도 본 강의 씨앗).
 *
 *   node check-reading-cloze.cjs [--rounds 5]
 *   node check-reading-cloze.cjs --old [--runs 20] [--seed 1]  고치기 전 판(f35e8be)의 생성기로 예전 열두 가지를 센다 — 대조군(0 이 아니어야 정상)
 *   node check-reading-cloze.cjs --diff                          고치기 전 판과 지금 판(회차 0)의 빈칸 정답을 강의마다 견줌
 *   node check-reading-cloze.cjs --break romanized|random|fits|unjudged|order   깨기: 검사가 실패를 잡는지(판정만 바꿈, 파일은 그대로) — exit 1 이어야 맞음
 * 지금 생성기에서 하나라도 0 이 아니면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const OLD = process.argv.includes("--old");
const DIFF = process.argv.includes("--diff");
const RUNS = Number(arg("--runs", 20));
const SEED = Number(arg("--seed", 1));
const ROUNDS = Number(arg("--rounds", 5));
const BREAK = arg("--break", "");
const REVIEW_FILE = path.join(__dirname, "reading-cloze-review.json");

let state = SEED >>> 0;
let randomCalls = 0;
const seededRandom = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = () => {
  randomCalls++;
  return seededRandom();
};

const PRE_FIX_REV = "f35e8be";
function loadOld() {
  const src = execSync(`git show ${PRE_FIX_REV}:src/lib/readingUtils.ts`, { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  const mod = { exports: {} };
  const req = (spec) => (spec.startsWith(".") || spec.startsWith("@/") ? {} : require(spec));
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  return mod.exports.generateClozeItems;
}
// 지금 판은 앱과 같은 모듈 그래프로(@/lib/lessonSpeechForm 을 따라감 — 빈 모듈로 바꾸면 로마자 한국어를 못 거름)
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const current = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
// 2026-09-27 (유출 규칙): the app hands the generator only its lesson's reviewed pairs (the page works them out on the server —
// src/lib/readingClozeFitsForLesson.ts; the course-wide table never reaches the browser). This check does the same, and
// '강의 짝 = 전체 표' below proves the lesson's pairs give exactly the blanks the whole table gives.
const fitsForLesson = loadTs(path.join(REPO, "src/lib/readingClozeFitsForLesson.ts")).clozeAlsoFitsFor;
const FULL_FITS = loadTs(path.join(REPO, "src/lib/readingClozeFits.ts")).CLOZE_ALSO_FITS_REVIEWED;
const speechForm = loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts"));

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
// RD-L13 이 짚은 로마자 한국어 + 앱이 한국어로 읽는 표(lessonSpeechForm KOREAN_WORD_SOUNDS)의 낱말 — 표를 비우면 목록만 남아도 잡힘
const ROMANIZED = new Set([
  "hanji", "jikji", "heungdeok", "cheongju", "hanseong", "sunbo", "jubo",
  ...Object.keys(speechForm.KOREAN_WORD_SOUNDS || {}).flatMap((w) => w.split(" ")).map((w) => w.toLowerCase()),
]);
const stem = (w) => w.toLowerCase().replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1");
const family = (a, b) => {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  return stem(x) === stem(y) || ((x.startsWith(y) || y.startsWith(x)) && Math.abs(x.length - y.length) <= 3);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const visibleIn = (text, word) => new RegExp(`(^|[^A-Za-z0-9-])${esc(word)}([^A-Za-z0-9-]|$)`, "i").test(text);

const dir = path.join(REPO, "content/lessons/reading");
const lessons = fs.readdirSync(dir).filter((f) => /^pr\d+\.json$/.test(f)).sort().map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const pairs = (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean }));
  const keywords = (d.readingVocabulary || []).map((v) => ({ word: v.word, pos: v.partOfSpeech }));
  // 지문에서 소문자로 한 번이라도 쓰인 낱말 — 여기 없는 보기는 이름(대문자로만 쓰임)
  const lower = new Set(pairs.flatMap((p) => p.en.split(/[\s–—―]+/)).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")).filter((w) => w && !/^[A-Z]/.test(w)).map((w) => w.toLowerCase()));
  const alsoFits = fitsForLesson(pairs.map((p) => p.en), keywords.map((k) => k.word));
  return { id: f.replace(/\.json$/, ""), key: `reading/${f.replace(/\.json$/, "")}`, pairs, keywords, lower, alsoFits };
}).filter((l) => l.pairs.length);

if (DIFF) {
  const oldGen = loadOld();
  let items = 0, changed = 0, lessonsChanged = 0;
  const ex = [];
  for (const L of lessons) {
    const a = oldGen(L.pairs).map((it) => it.missingWord);
    const b = current.generateClozeItems(L.pairs, { lessonKey: L.key, keywords: L.keywords, alsoFits: L.alsoFits }).map((it) => it.missingWord);
    const n = Math.max(a.length, b.length);
    let c = 0;
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) c++;
    items += n; changed += c;
    if (c) { lessonsChanged++; ex.push(`${L.id}: ${a.join("/")} → ${b.join("/")}`); }
  }
  console.log(`빈칸 정답이 바뀐 문항 ${changed} / ${items} · 바뀐 강의 ${lessonsChanged} / ${lessons.length}`);
  for (const e of ex.slice(0, 40)) console.log(`  ${e}`);
  process.exit(0);
}

const count = { items: 0, dash: 0, family: 0, modal: 0, sameSlot: 0, caps: 0, short: 0, visible: 0, article: 0, nameOpt: 0, reused: 0, digit: 0, alsoFits: 0 };
const examples = {};
const note = (k, s) => { examples[k] = examples[k] || []; if (examples[k].length < 4 && !examples[k].includes(s)) examples[k].push(s); };

function countItems(L, items) {
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

if (OLD) {
  const oldGen = loadOld();
  for (let run = 0; run < RUNS; run++) for (const L of lessons) countItems(L, oldGen(L.pairs));
  console.log(`생성기: 고치기 전 판 ${PRE_FIX_REV}(대조군) · 강의 ${lessons.length} · ${RUNS}회 · 씨앗 ${SEED} · 문항 ${count.items}`);
  console.log(`  대시로 붙은 정답 ${count.dash} · 같은 꼴 보기 ${count.family} · 조동사 ${count.modal} · 같은 자리 보기 ${count.sameSlot} · 정답만 대문자 ${count.caps} · 보기 4개 미만 ${count.short}`);
  console.log(`  (6단계) 정답이 또 보임 ${count.visible} · 관사 단서 ${count.article} · 이름 보기 ${count.nameOpt} · 같은 정답 ${count.reused} · 숫자 ${count.digit} · 또 맞는 보기 ${count.alsoFits}`);
  for (const [k, v] of Object.entries(examples)) console.log(`   예(${k}): ${v.join(" | ")}`);
  const bad = Object.entries(count).filter(([k]) => k !== "items").reduce((n, [, v]) => n + v, 0);
  process.exit(bad ? 1 : 0);
}

// --- the current generator ---
const review = fs.existsSync(REVIEW_FILE) ? JSON.parse(fs.readFileSync(REVIEW_FILE, "utf8")) : { judged: {} };
const verdictOf = (id, answer, option) => ((review.judged || {})[id] || {})[answer.toLowerCase()]?.[option.toLowerCase()] ?? null;
const extra = { random: 0, nondeterministic: 0, romanized: 0, notKeyword: 0, order: 0, laterAnswerShown: 0, unjudged: 0, judgedFits: 0, subsetDiffers: 0 };
let sets = 0, candidates = 0, pairs = 0, lessonsUnder3 = 0;
const regionSpread = { three: 0, eligible: 0 };

// 몰라요 세 낱말 — 씨앗으로(강의마다 같게) 핵심어 순번에서 고름
const pickUnknown = (L) => {
  let h = 0;
  for (const c of L.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const orders = L.keywords.map((_, i) => i + 1);
  const out = [];
  while (out.length < Math.min(3, orders.length)) { h = (h * 1103515245 + 12345) >>> 0; const o = orders[h % orders.length]; if (!out.includes(o)) out.push(o); }
  return out;
};

for (const L of lessons) {
  // 1. 빈칸 전부(핵심어마다 하나 — 학습자가 어느 회차 · 어느 몰라요로든 만날 수 있는 것) — 보기 짝마다 판정이 있어야 함
  randomCalls = 0;
  const { candidates: cands } = current.clozeCandidates(L.pairs, L.keywords, L.key, L.alsoFits);
  candidates += cands.length;
  for (const c of cands) {
    for (const o of c.options.filter((x) => x !== c.word)) {
      pairs++;
      let v = verdictOf(L.id, c.word, o);
      if (BREAK === "unjudged" && L.id === "pr001" && c.order === cands[0].order) v = null;
      if (BREAK === "fits" && L.id === "pr001" && c.order === cands[0].order) v = "fits";
      if (v === null) { extra.unjudged++; note("unjudged", `${L.id} k${c.order} 정답 ${c.word} · 보기 ${o}`); }
      else if (v === "fits") { extra.judgedFits++; note("judgedFits", `${L.id} k${c.order} 정답 ${c.word} · 보기 ${o}`); }
    }
  }
  // 2. 회차 · 몰라요마다 한 세트
  for (const unknown of [[], pickUnknown(L)]) {
    for (let round = 0; round < ROUNDS; round++) {
      const opts = { lessonKey: L.key, keywords: L.keywords, round, unknown, alsoFits: L.alsoFits };
      state = (SEED + round) >>> 0;
      const a = current.generateClozeItems(L.pairs, opts);
      // the lesson's pairs (what the browser gets) must give exactly the blanks of the whole table (--break subset: pr001 gets none)
      const full = current.generateClozeItems(L.pairs, { ...opts, alsoFits: FULL_FITS });
      const mine = BREAK === "subset" && L.id === "pr001" ? current.generateClozeItems(L.pairs, { ...opts, alsoFits: {} }) : a;
      if (JSON.stringify(full) !== JSON.stringify(mine)) { extra.subsetDiffers++; note("subsetDiffers", `${L.id} 회차 ${round}`); }
      state = (SEED * 7919 + round + 1) >>> 0; // Math.random 이 달라도
      let b = current.generateClozeItems(L.pairs, BREAK === "random" && L.id === "pr001" ? { ...opts, lessonKey: `${L.key}#x` } : opts);
      if (JSON.stringify(a) !== JSON.stringify(b)) { extra.nondeterministic++; note("nondeterministic", `${L.id} 회차 ${round}`); }
      if (BREAK === "romanized" && L.id === "pr154" && a[0]) a[0] = { ...a[0], options: [...a[0].options.slice(0, 3), "hanji"] };
      if (BREAK === "order" && L.id === "pr001" && a.length > 1) a.reverse();
      sets++;
      if (round === 0 && unknown.length === 0 && a.length < 3) lessonsUnder3++;
      countItems(L, a);
      const words = new Set(L.keywords.map((k) => k.word));
      for (const it of a) {
        if (!words.has(it.missingWord)) { extra.notKeyword++; note("notKeyword", `${L.id} 정답 ${it.missingWord}`); }
        const rom = [it.missingWord, ...it.options].filter((w) => ROMANIZED.has(String(w).toLowerCase()));
        if (rom.length) { extra.romanized++; note("romanized", `${L.id} 정답 ${it.missingWord} · ${rom.join(",")}`); }
      }
      for (let i = 1; i < a.length; i++) {
        if (a[i].sentenceIndex <= a[i - 1].sentenceIndex) { extra.order++; note("order", `${L.id} 회차 ${round} 문장 ${a.map((x) => x.sentenceIndex + 1).join(",")}`); break; }
      }
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        if (visibleIn(a[i].maskedSentence, a[j].missingWord)) { extra.laterAnswerShown++; note("laterAnswerShown", `${L.id} 회차 ${round} ${a[j].missingWord} 가 앞 문항 문장에 보임`); }
      }
      if (round === 0 && unknown.length === 0) {
        const regions = new Set(cands.map((c) => c.region));
        if (regions.size === 3) { regionSpread.eligible++; if (new Set(a.map((x) => x.region)).size === 3) regionSpread.three++; }
      }
    }
  }
  extra.random += randomCalls;
}

console.log(`생성기: 지금 판 · 강의 ${lessons.length} · 빈칸이 될 수 있는 핵심어 ${candidates}(보기 짝 ${pairs}) · 세트 ${sets}(회차 0~${ROUNDS - 1} × 몰라요 없음/셋) · 문항 ${count.items}${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
console.log(`  대시로 붙은 정답 ${count.dash} · 같은 꼴 보기 ${count.family} · 조동사 ${count.modal} · 같은 자리 보기 ${count.sameSlot} · 정답만 대문자 ${count.caps} · 보기 4개 미만 ${count.short}`);
console.log(`  (6단계) 정답이 또 보임 ${count.visible} · 관사 단서 ${count.article} · 이름 보기 ${count.nameOpt} · 같은 정답 ${count.reused} · 숫자 ${count.digit} · 또 맞는 보기 ${count.alsoFits}`);
console.log(`  (0927) Math.random 부름 ${extra.random} · 두 번 만든 결과가 다름 ${extra.nondeterministic} · 로마자 한국어 ${extra.romanized} · 핵심어 밖 정답 ${extra.notKeyword} · 순서/한 문장 ${extra.order} · 뒤 문항 정답이 앞 문장에 보임 ${extra.laterAnswerShown}`);
console.log(`  (0927) 판정 없는 보기 짝 ${extra.unjudged} · '맞음' 판정인데 나오는 짝 ${extra.judgedFits}  (판정 ${fs.existsSync(REVIEW_FILE) ? path.relative(REPO, REVIEW_FILE) : "파일 없음"})`);
console.log(`  (0927 유출 규칙) 강의 짝(브라우저가 받는 것)으로 만든 세트가 전체 표로 만든 세트와 다름 ${extra.subsetDiffers}`);
console.log(`  (참고) 세 부분 모두 핵심어가 있는 강의 ${regionSpread.eligible} 중 회차 0 이 앞 · 중간 · 끝 하나씩인 강의 ${regionSpread.three} · 회차 0 이 3문항 미만인 강의 ${lessonsUnder3}(문장 1~2개)`);
for (const [k, v] of Object.entries(examples)) console.log(`   예(${k}): ${v.join(" | ")}`);
const bad = Object.entries(count).filter(([k]) => k !== "items").reduce((n, [, v]) => n + v, 0) + Object.values(extra).reduce((n, v) => n + v, 0);
process.exit(bad ? 1 : 0);
