#!/usr/bin/env node
/**
 * 2026-09-28 — 운영 탐침이 찾은 "유료 글이 공개 파일에" 6건을 고친 뒤, 고치기 전 코드(BEFORE_REV — git 에서 읽음)와 지금 코드를
 * 나란히 돌려 학습자가 받는 결과가 같은지 본다. 같은 AI 계열이 고치고 이 검사를 만들었다 — 독립 검수가 아니다. 숫자는 이
 * 저장소만으로 누구든 다시 낼 수 있다.
 *
 *   O. 서수(pg06-3 의 서수 목록 두 줄이 공개 JS 에 있었음): src/lib/passoffGrading.ts 와 src/lib/spokenAnswer.ts(GRAMMAR 마이크 —
 *      옆 세션의 공용 파일)의 spokenNumbersAsWords 에 0~100 의 "Nst · Nnd · Nrd · Nth", 숫자 0~101, 문장 몇 개를 넣어 고치기 전
 *      (서수 목록)과 지금(기수 낱말에서 규칙으로)의 결과가 글자까지 같음 — 두 파일 모두. 지금 두 파일에 서수 목록이 없음.
 *   T. 낱말 꼴 표(pg10-2 의 불규칙 동사 줄 셋이 공개 JS 에 있었음): 고치기 전 passoffGrading.ts 의 WORD_FORMS 낱말 = 지금 서버 파일
 *      (src/lib/passoffWordForms.ts ALL_WORD_FORMS)의 낱말(순서까지) · 지금 passoffGrading.ts 에 그 표가 없음.
 *   P. 채점: 레슨 전부(무료 체험의 유료 보충을 붙인 것)의 ④ · ⑤ 문항을 화면 모양(viewBlocks)으로 — 고치기 전 채점기(표를 품음)에는
 *      그대로, 지금 채점기에는 서버가 붙인 wordForms(attachWordForms)와 함께 넣어, 만든 답마다 결과(JSON 전체)가 같음. 답: 모범 답 ·
 *      허용 답 그대로 · 그 낱말(또는 끝)을 한 글자 차이인 표의 낱말로 바꾼 것 · 모범 답의 5글자 이상 낱말 가운데 한 글자를 바꾼 것 —
 *      타이핑과 마이크 둘 다.
 *   F. 무료 체험 레슨(license.ts FREE_PREVIEW_LESSON_IDS)의 문항에 붙는 wordForms 를 모두 보여 줌 — 무료 쪽 페이지 · 무료 복습 쪽이
 *      싣는 것 전부(이용권 없는 판: 유료 보충 없이). 한 문항의 낱말을 페이지 글이 펴지는 대로 이어 붙인 글(글자만) 안에 유료 레슨의
 *      글이 하나도 없음 — 모든 과정의 유료 레슨 파일 글 · LISTENING 영어 대본 · 떼어 둔 보충 문항(20글자 이상), LISTENING · READING
 *      문제(12글자 이상), 대소문자 무시(탐침 probe-bundle-leak-all.cjs 의 바늘과 같은 재료, 더 엄격하게). wordForms 는 문항의 마지막
 *      칸이라 앞뒤가 칸 이름("wordForms")과 다음 문항의 "id" — 레슨 글이 그걸 넘어 이어질 수 없음.
 *
 *   node docs/pass-off-grammar/검사/check-leak-fix.cjs
 *   node docs/pass-off-grammar/검사/check-leak-fix.cjs --break=ordinal  지금 두 파일의 규칙에서 twelve → twelfth 를 뺀 사본(메모리) → O FAIL
 *   node docs/pass-off-grammar/검사/check-leak-fix.cjs --break=near     서버가 한 글자 차이인 표의 낱말을 안 붙이는 사본(메모리) → P FAIL
 *   node docs/pass-off-grammar/검사/check-leak-fix.cjs --break=free-table 무료 문항마다 표 전체를 wordForms 로(메모리) — 유출이 wordForms 로
 *                                                                        돌아온 판 → F FAIL(pg10-2 의 forbid - forbade - forbidden …)
 * exit 1 on any difference or FAIL.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
/** the commit the fix was made on: the release aa1cd8a + two screen commits that touch none of these files */
const BEFORE_REV = "b34b982";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const PATCHES = {
  ordinal: {
    "src/lib/passoffGrading.ts": [', twelve: "twelfth" }', " }"],
    "src/lib/spokenAnswer.ts": [', twelve: "twelfth" }', " }"],
  },
  near: {
    "src/lib/passoffWordForms.ts": ["  for (const other of ALL_WORD_FORMS) if (other !== end && Math.abs(other.length - end.length) <= 1 && editDistance(start + other, word) === 1) out.push(other);\n", ""],
  },
  // no file changes: F gives each free item the whole table (in memory) — the leak coming back through wordForms
  "free-table": {},
};
if (BREAK && !PATCHES[BREAK]) throw new Error(`모르는 --break=${BREAK} (${Object.keys(PATCHES).join(" · ")})`);

const readBefore = (rel) => execFileSync("git", ["show", `${BEFORE_REV}:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }).replace(/\r\n/g, "\n");
function readNow(rel) {
  let src = fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
  const patch = BREAK && PATCHES[BREAK][rel];
  if (patch) {
    if (src.split(patch[0]).length !== 2) throw new Error(`--break=${BREAK}: ${rel} 에서 바꿀 글을 한 곳에서 못 찾음 — 깨기가 안 먹음`);
    src = src.replace(patch[0], patch[1]);
  }
  return src;
}
/** a source text transpiled alone; `imports`: what its require() may return */
function load(src, name, imports = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  const req = (spec) => {
    if (Object.prototype.hasOwnProperty.call(imports, spec)) return imports[spec];
    throw new Error(`${name} 가 모르는 ${spec} 를 불러옴`);
  };
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  return mod.exports;
}

const fails = [];
const fail = (stage, msg) => fails.push(`${stage} ${msg}`);

// ── the code before and now
const G0 = load(readBefore("src/lib/passoffGrading.ts"), `passoffGrading.ts@${BEFORE_REV}`);
const S0 = load(readBefore("src/lib/spokenAnswer.ts"), `spokenAnswer.ts@${BEFORE_REV}`, { "./grammarGrading": load(readBefore("src/lib/grammarGrading.ts"), "grammarGrading.ts (before)") });
const graderNow = readNow("src/lib/passoffGrading.ts");
const spokenNow = readNow("src/lib/spokenAnswer.ts");
const G1 = load(graderNow, "passoffGrading.ts");
const S1 = load(spokenNow, "spokenAnswer.ts", { "./grammarGrading": load(readNow("src/lib/grammarGrading.ts"), "grammarGrading.ts") });
const W1 = load(readNow("src/lib/passoffWordForms.ts"), "passoffWordForms.ts", { "server-only": {}, "./passoffGrading": G1 });
const { attachPaidItems } = load(readNow("src/lib/passoffSupplement.ts"), "passoffSupplement.ts");
const { viewBlocks } = load(readNow("src/lib/passoffView.ts"), "passoffView.ts");
for (const [name, fn] of [["G0.gradeProduce", G0.gradeProduce], ["G1.gradeProduce", G1.gradeProduce], ["S0.spokenNumbersAsWords", S0.spokenNumbersAsWords], ["S1.spokenNumbersAsWords", S1.spokenNumbersAsWords], ["W1.attachWordForms", W1.attachWordForms]]) {
  if (typeof fn !== "function") throw new Error(`${name} 를 못 찾음 — 이 검사가 아무것도 안 봄`);
}

// ── O. ordinals
const inputs = [];
for (let n = 0; n <= 100; n++) for (const s of ["st", "nd", "rd", "th"]) inputs.push(`${n}${s}`);
for (let n = 0; n <= 101; n++) inputs.push(String(n));
inputs.push(
  "101st", "110th", "the 21st century", "On July 4th we met at 9:05.", "He was 1st, she was 22nd and I was 103rd.",
  "11th, 12th, 13th", "the 100th day", "twenty-first and thirty-second", "It costs $5, 50% of 1,900.",
);
const samples = ["1st", "2nd", "3rd", "5th", "8th", "9th", "12th", "13th", "20th", "21st", "40th", "99th", "100th"];
for (const [file, before, now] of [["passoffGrading.ts", G0.spokenNumbersAsWords, G1.spokenNumbersAsWords], ["spokenAnswer.ts", S0.spokenNumbersAsWords, S1.spokenNumbersAsWords]]) {
  let same = 0;
  for (const t of inputs) {
    const a = before(t);
    const b = now(t);
    if (a === b) same++;
    else fail("O", `${file} "${t}": 전 "${a}" · 지금 "${b}"`);
  }
  console.log(`O 서수 ${file}: 입력 ${inputs.length}개 중 전과 같음 ${same} — 예: ${samples.map((s) => `${s}→${now(s)}`).join(" · ")}`);
}
for (const [file, src] of [["passoffGrading.ts", graderNow], ["spokenAnswer.ts", spokenNow]]) {
  if (/ORDINAL_ONES|ORDINAL_TENS|"eleventh"|"twentieth"/.test(src)) fail("O", `${file} 에 서수 목록이 남아 있음`);
}

// ── T. the word-form table: the same words, now only on the server
const oldTableSrc = readBefore("src/lib/passoffGrading.ts").match(/const WORD_FORMS =([\s\S]*?);\n/);
if (!oldTableSrc) throw new Error(`${BEFORE_REV} 의 passoffGrading.ts 에서 WORD_FORMS 를 못 찾음`);
const oldForms = [...new Set([...oldTableSrc[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("").split(/[|,]/))];
const sameTable = JSON.stringify(oldForms) === JSON.stringify(W1.ALL_WORD_FORMS);
console.log(`T 낱말 꼴 표: 전 ${oldForms.length}낱말 · 지금 서버 ${W1.ALL_WORD_FORMS.length}낱말 · 순서까지 같음 ${sameTable}`);
if (!sameTable) fail("T", "고치기 전 표와 서버의 표가 다름");
if (/WORD_FORMS|withdraw,withdrew|forbid,forbade|mistake,mistook/.test(graderNow)) fail("T", "지금 passoffGrading.ts 에 낱말 꼴 표가 남아 있음");
if (!/^import "server-only";/m.test(readNow("src/lib/passoffWordForms.ts"))) fail("T", "passoffWordForms.ts 가 server-only 가 아님");

// ── P. grading: before (the table inside) against now (the item's wordForms), every lesson's ④ · ⑤ items
const LESSON_DIR = path.join(REPO, "content/lessons/passoff-grammar");
const PRIVATE_DIR = path.join(REPO, "content/private/passoff-grammar");
const bare = (t) => String(t).replace(/^[("“‘'[]+/, "").replace(/[.,?!;:)"”’'\]]+$/, "");
const tokensOf = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const replaceToken = (en, index, next) => {
  const toks = tokensOf(en);
  toks[index] = toks[index].replace(bare(toks[index]), next);
  return toks.join(" ");
};
const matchCase = (like, word) => (like[0] === like[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word);
const midSwap = (w) => {
  const i = Math.max(1, Math.min(w.length - 3, Math.floor(w.length / 2)));
  const to = w[i].toLowerCase() === "x" ? "q" : "x";
  return w.slice(0, i) + to + w.slice(i + 1);
};
/** this check's own optimal-string-alignment distance */
const osa = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
};
const TABLE = new Set(oldForms);
const writeItems = (blocks) => blocks.filter((b) => b && b.type === "drill").flatMap((b) => [...(b.produce || []), ...(b.transfer || [])]);

// which lessons are free: license.ts FREE_PREVIEW_LESSON_IDS, read as the probe reads it (a key may be quoted; an id
// "s1" frees "s1-2" — a listed id or any id it is the start of)
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE_IDS = {};
{
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(/^\s*"?([a-z0-9-]+)"?:\s*\[/);
    if (m) { cur = m[1]; FREE_IDS[cur] = new Set(); }
    if (cur) for (const x of (m ? line.slice(line.indexOf("[")) : line).matchAll(/"([a-z0-9-]+)"/g)) FREE_IDS[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
const isFree = (course, id) => {
  const set = FREE_IDS[course];
  for (let x = id; set; ) {
    if (set.has(x)) return true;
    const s = x.replace(/-\d+$/, "");
    if (s === x) return false;
    x = s;
  }
  return false;
};
const FREE = new Set([...(FREE_IDS["passoff-grammar"] || [])]);
if (!FREE.size) throw new Error("license.ts 에서 PASS-OFF 무료 체험 레슨을 못 찾음");

// the paid text of every course, flat (letters · digits · Hangul) and lower-cased — the probe's needle material
const flatLower = (s) => String(s || "").replace(/[^A-Za-z0-9가-힣]+/g, "").toLowerCase();
const paidText = [];
{
  const collect = (v, out) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) for (const x of v) collect(x, out);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collect(x, out);
  };
  const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
  for (const course of ["student", "passoff-grammar", "phonics", "grammar1", "grammar2", "ld", "reading"]) {
    const dir = path.join(REPO, "content/lessons", course);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const id = file.replace(/\.json$/, "");
      if (isFree(course, id)) continue;
      const strings = [];
      collect(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), strings);
      if (course === "ld") for (const r of scripts[id.replace(/-1$/, "")] || []) strings.push(r.en, r.ko);
      for (const s of strings) if (flatLower(s).length >= 20) paidText.push(flatLower(s));
      const qFile = path.join(REPO, "content/questions", course, `${id.replace(/-\d+$/, "")}.json`);
      if ((course === "ld" || course === "reading") && fs.existsSync(qFile)) {
        for (const q of JSON.parse(fs.readFileSync(qFile, "utf8")).questions || []) for (const t of [q.prompt, ...(q.options || [])]) if (flatLower(t).length >= 12) paidText.push(flatLower(t));
      }
    }
  }
  for (const file of fs.readdirSync(PRIVATE_DIR).filter((x) => x.endsWith(".paid.json"))) {
    const strings = [];
    for (const e of JSON.parse(fs.readFileSync(path.join(PRIVATE_DIR, file), "utf8")).items || []) collect(e.item, strings);
    for (const s of strings) if (flatLower(s).length >= 20) paidText.push(flatLower(s));
  }
}
if (paidText.length < 10000) throw new Error(`유료 글이 ${paidText.length}개뿐 — F 가 아무것도 안 봄`);

const counts = { items: 0, answers: 0, gradings: 0, same: 0, kinds: { reference: 0, "table-word": 0, "mid-letter": 0 } };
const freeShown = [];
let longestFree = 0;
let freeChecked = 0;
const t0 = Date.now();
const files = fs.readdirSync(LESSON_DIR).filter((f) => /^pg\d{2}-\d+\.json$/.test(f)).sort();
if (!files.length) throw new Error("레슨 파일 0 — 이 검사가 아무것도 안 봄");
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, f), "utf8"));
  const sup = path.join(PRIVATE_DIR, `${data.id}.paid.json`);
  const held = fs.existsSync(sup) ? JSON.parse(fs.readFileSync(sup, "utf8")).items || [] : [];
  const view = viewBlocks(held.length ? attachPaidItems(data.blocks, held) : data.blocks);
  const before = writeItems(view);
  const now = writeItems(W1.attachWordForms(view));
  if (before.length !== now.length) fail("P", `${data.id} 문항 수가 다름 ${before.length} · ${now.length}`);
  // F — what a free page carries (the free page's own blocks: without the paid supplement)
  if (FREE.has(data.id)) {
    for (const it of writeItems(W1.attachWordForms(viewBlocks(data.blocks)))) {
      const forms = BREAK === "free-table" ? W1.ALL_WORD_FORMS : it.wordForms || [];
      if (!forms.length) continue;
      const run = flatLower(forms.join(" "));
      longestFree = Math.max(longestFree, run.length);
      freeShown.push(`${it.id} ${JSON.stringify(forms)}`);
      freeChecked += paidText.length;
      const inside = paidText.filter((t) => t.length <= run.length && run.includes(t));
      if (inside.length) fail("F", `${it.id} 무료 문항의 wordForms ${JSON.stringify(forms)} 안에 유료 글 ${inside.length}개: ${inside.slice(0, 3).join(" · ")}`);
    }
  }
  before.forEach((p0, k) => {
    const p1 = now[k];
    counts.items++;
    const refs = [p0.en, ...(p0.accept || [])].filter((s, i, all) => typeof s === "string" && s.trim() && all.indexOf(s) === i);
    const answers = new Map(); // answer → kind
    for (const r of refs) answers.set(r, "reference");
    const pairs = new Set();
    for (const r of refs) {
      tokensOf(r).forEach((t, i) => {
        const word = bare(t);
        if (!/^[A-Za-z]+$/.test(word)) return;
        const lower = word.toLowerCase();
        for (let cut = 0; cut < lower.length; cut++) {
          if (!TABLE.has(lower.slice(cut))) continue;
          for (const other of oldForms) {
            const swapped = lower.slice(0, cut) + other;
            if (osa(swapped, lower) !== 1 || pairs.has(`${lower}>${swapped}`)) continue;
            pairs.add(`${lower}>${swapped}`);
            const answer = replaceToken(r, i, matchCase(word, swapped));
            if (!answers.has(answer)) answers.set(answer, "table-word");
          }
        }
      });
    }
    tokensOf(p0.en).forEach((t, i) => {
      const word = bare(t);
      if (!/^[A-Za-z]{5,}$/.test(word)) return;
      const answer = replaceToken(p0.en, i, midSwap(word));
      if (!answers.has(answer)) answers.set(answer, "mid-letter");
    });
    for (const [answer, kind] of answers) {
      counts.answers++;
      counts.kinds[kind]++;
      for (const spoken of [false, true]) {
        counts.gradings++;
        const a = JSON.stringify(G0.gradeProduce(answer, p0, { spoken }));
        const b = JSON.stringify(G1.gradeProduce(answer, p1, { spoken }));
        if (a === b) counts.same++;
        else if (fails.filter((x) => x.startsWith("P")).length < 40) fail("P", `${p0.id} ${spoken ? "마이크" : "타이핑"} "${answer}" [${kind}]: 전 ${JSON.parse(a).verdict} · 지금 ${JSON.parse(b).verdict}`);
        else fails.push("P …");
      }
    }
  });
}
console.log(`P 채점: 레슨 ${files.length} · ④⑤ 문항 ${counts.items} · 답 ${counts.answers}(모범 · 허용 답 ${counts.kinds.reference} · 표의 한 글자 차이 꼴 ${counts.kinds["table-word"]} · 가운데 한 글자 ${counts.kinds["mid-letter"]}) × 타이핑 · 마이크 = 채점 ${counts.gradings} — 전과 같음 ${counts.same} (${Math.round((Date.now() - t0) / 1000)}초)`);
console.log(`F 무료 체험 레슨 ${[...FREE].join(" · ")}: wordForms 가 붙는 문항 ${freeShown.length} · 가장 긴 것 ${longestFree}글자 · 유료 글 ${paidText.length}개와 대 봄(${freeChecked}번) — 들어 있는 것 ${fails.filter((x) => x.startsWith("F")).length}문항`);
for (const line of freeShown) console.log(`  ${line}`);

if (fails.length) {
  const shown = [...new Set(fails)];
  console.log(`\nFAIL ${fails.length}:`);
  for (const x of shown.slice(0, 40)) console.log(`  ${x}`);
  if (BREAK) console.log(`\n(깨기 --break=${BREAK}: FAIL 이 나야 맞음 — 검사가 실패할 수 있음을 보임)`);
  process.exit(1);
}
console.log(`\nPASS${BREAK ? ` — 깨기 --break=${BREAK} 인데 PASS: 이 깨기가 아무것도 못 잡음(exit 2)` : ""}`);
process.exit(BREAK ? 2 : 0);
