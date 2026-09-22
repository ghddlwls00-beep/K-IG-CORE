/**
 * VOCA 퀴즈·스피드 드릴의 오답 규칙(src/lib/vocaUtils.ts sharesSense · SYNONYM_GROUPS) 검사.
 *
 * 생성기를 195개 강의 전부에 대해 여러 번 돌려, 채점되는 문항이 "정답과 뜻이 겹치는 것" 또는
 * "동의어 묶음의 짝" 을 오답으로 내놓는 일이 실제로 0인지 센다. 0이 아니면 exit 1.
 *
 *   node check-voca-distractors.cjs [--runs 40] [--seed 1] [--old]
 *   --old  : 고치기 전 규칙(문자열 완전 일치, 동의어 묶음 없음)으로 같은 것을 센다.
 *            검사가 실패를 잡을 수 있는 검사인지 보이기 위한 대조군 — 0이 아니어야 정상.
 *   --seed : 생성기는 오답을 무작위로 뽑는다. 씨앗을 고정해 누가 돌려도 같은 숫자가 나오게 한다.
 *
 * 2026-09-23 4단계 1~20번 작업 중 만들었다 (작업기록 4-5단계-작업기록.md, 기준 4).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));

const RUNS = Number(process.argv.includes("--runs") ? process.argv[process.argv.indexOf("--runs") + 1] : 40);
const OLD = process.argv.includes("--old");
const SEED = Number(process.argv.includes("--seed") ? process.argv[process.argv.indexOf("--seed") + 1] : 1);

// mulberry32 — the generator calls Math.random for every shuffle and pick.
let state = SEED >>> 0;
Math.random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// --- vocaUtils.ts 를 그대로 읽어 실행한다 (--old 면 규칙만 옛것으로 되돌린다)
let src = fs.readFileSync(path.join(REPO, "src/lib/vocaUtils.ts"), "utf8");
{
  // The checker keeps its own copy of the synonym groups (below) so it does not grade the app
  // with the app's own list; that copy must still match the app's, or a new group goes unchecked.
  const block = (src.match(/const SYNONYM_GROUPS: string\[\]\[\] = (\[[\s\S]*?\n\]);/) || [])[1];
  const appGroups = block ? JSON.stringify(eval(block.replace(/\/\/[^\n]*/g, ""))) : null;
  const mine = JSON.stringify([["ancestor", "forefather"], ["anticipate", "predict", "foresee"], ["precious", "priceless"]]);
  if (appGroups !== mine) {
    console.error(`SYNONYM_GROUPS 가 앱과 다릅니다 — 앱 ${appGroups} · 검사 ${mine}. 이 파일과 voca-overlap-pairs.cjs 의 GROUPS 를 맞추세요.`);
    process.exit(2);
  }
}
// --no-fallback-fix: undo ONLY the fallback pool's synonym-mate exclusion, keeping the new
// lesson-pool rule — the control that shows the fallback line itself is what prevents the leak.
if (process.argv.includes("--no-fallback-fix")) {
  const before = src;
  src = src.replace("&& !mateMeanings.has(m) ", "");
  if (src === before) throw new Error("보충 풀 대조군 치환 실패");
}
if (OLD) {
  src = src.replace(
    /function sharesSense\(a: string, b: string\): boolean \{[\s\S]*?\n\}/,
    "function sharesSense(a: string, b: string): boolean { return a === b; }",
  );
  src = src.replace(/const SYNONYM_GROUPS: string\[\]\[\] = \[[\s\S]*?\n\];/, "const SYNONYM_GROUPS: string[][] = [];");
  if (!/return a === b/.test(src) || !/SYNONYM_GROUPS: string\[\]\[\] = \[\];/.test(src)) throw new Error("대조군 치환 실패");
}
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)(require, mod, mod.exports);
const V = mod.exports;

const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const dictMap = {};
for (const [k, v] of Object.entries(dict)) dictMap[k] = { meaning: v.meaning };

// 검사 기준은 생성기와 따로 둔다 (같은 함수를 쓰면 서로를 봐주게 된다)
const segs = (m) =>
  String(m || "").replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ")
    .split(/[;,/·]|\s+또는\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const shares = (a, b) => { const A = new Set(segs(a)); return segs(b).some((s) => A.has(s)); };
// Kept in step with SYNONYM_GROUPS in src/lib/vocaUtils.ts (checked below — a drift fails the run).
const GROUPS = [["ancestor", "forefather"], ["anticipate", "predict", "foresee"], ["precious", "priceless"]];
const grouped = (a, b) => GROUPS.some((g) => g.includes(a) && g.includes(b));
const lc = (w) => String(w).toLowerCase().trim();

const dir = path.join(REPO, "content/lessons/phonics");
const lessons = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const g = (j.blocks || []).find((b) => b.type === "wordgrid");
  return { id: f.replace(/\.json$/, ""), words: g ? g.rows.flat().map((w) => String(w).trim()).filter(Boolean) : [] };
});

let qItems = 0, qBad = 0, dItems = 0, dBad = 0, placeholders = 0;
const examples = [];
for (let run = 0; run < RUNS; run++) {
  for (const L of lessons) {
    // 문제 낱말과 같은 묶음에 든 강의 내 낱말들의 뜻 — 이것도 보기로 나오면 안 된다
    const mateMeanings = (word) => L.words.filter((w) => lc(w) !== lc(word) && grouped(lc(w), lc(word))).map((w) => dictMap[lc(w)]?.meaning || "");
    for (const q of V.generateActiveRecallQuizzes(L.words, dictMap)) {
      qItems++;
      const mates = mateMeanings(q.word);
      if (q.questionType === "en-to-ko") {
        for (const o of q.options) {
          if (o === q.correctMeaning) continue;
          if (/^단어 의미 \d$/.test(o)) { placeholders++; continue; }
          if (shares(o, q.correctMeaning) || mates.includes(o)) { qBad++; examples.push(`${L.id} en→ko "${q.word}" 정답 ${q.correctMeaning} · 오답으로 나온 것 ${o}`); }
        }
      } else {
        for (const o of q.options) {
          if (o === q.word) continue;
          if (/^vocab\d$/.test(o)) { placeholders++; continue; }
          const om = dictMap[lc(o)]?.meaning || "";
          if (shares(om, q.correctMeaning) || grouped(lc(o), lc(q.word))) { qBad++; examples.push(`${L.id} ko→en [ ${q.correctMeaning} ] · 오답으로 나온 것 ${o} (${om})`); }
        }
      }
    }
    for (const it of V.generateSpeedDrillItems(L.words, dictMap)) {
      dItems++;
      if (!it.isMatch && (shares(it.displayedMeaning, it.actualMeaning) || mateMeanings(it.word).includes(it.displayedMeaning))) {
        dBad++;
        examples.push(`${L.id} 스피드 "${it.word}"(${it.actualMeaning}) 에 ${it.displayedMeaning} 를 띄우고 "불일치" 를 기대함`);
      }
    }
  }
}

/**
 * 전역 보충 풀 시험 (3차 점검 지적, 2026-09-23). 실제 강의는 보기 후보가 늘 3개 이상이라 사전 전체에서
 * 보기를 채우는 보충 풀이 쓰이지 않는다 — 그래서 위 전수 시험은 보충 풀의 묶음 제외를 시험하지 못한다.
 * 낱말 2개짜리 합성 강의와 뜻 6개짜리 작은 사전으로 보충 풀을 강제로 쓰게 해서, 묶음 짝의 뜻이
 * 보기로 나오는지 센다. 옛 규칙(대조군)에서는 자주 나와야 하고, 새 규칙에서는 0 이어야 한다.
 */
{
  // Reseed: the full test above runs on the real dictionary, which changes while content is being
  // fixed, and would leave the random stream in a different place each time (3차 점검, 2026-09-23).
  state = SEED >>> 0;
  const tiny = {
    precious: { meaning: "소중한" }, priceless: { meaning: "값을 매길 수 없는, 대단히 귀중한" },
    apple: { meaning: "사과" }, river: { meaning: "강" }, chair: { meaning: "의자" }, cloud: { meaning: "구름" },
  };
  let mateShown = 0, asked = 0;
  for (let run = 0; run < 200; run++) {
    for (const q of V.generateActiveRecallQuizzes(["precious", "priceless"], tiny)) {
      if (q.questionType !== "en-to-ko") continue;
      asked++;
      const mate = q.word === "precious" ? tiny.priceless.meaning : tiny.precious.meaning;
      if (q.options.includes(mate)) mateShown++;
    }
  }
  console.log(`보충 풀 합성 시험: en→ko ${asked}문항 중 묶음 짝의 뜻이 오답으로 나온 문항 ${mateShown}`);
  if (!OLD && mateShown) qBad += mateShown;
}

console.log(`규칙: ${OLD ? "옛것 — 문자열 완전 일치·묶음 없음" : "새것 — 뜻 조각 겹침 + 동의어 묶음"} · ${RUNS}회 반복 · 강의 ${lessons.length}`);
console.log(`  퀴즈 문항 ${qItems}  · 정답과 뜻이 겹치거나 묶음 짝인 오답을 내놓은 문항 ${qBad}`);
console.log(`  스피드 ${dItems} · 정답인데 "불일치" 를 기대한 문항 ${dBad}`);
console.log(`  (자리채움 보기 ${placeholders})`);
if (examples.length) {
  console.log(`\n  실례 (${[...new Set(examples)].length} 종류 중 12):`);
  for (const e of [...new Set(examples)].slice(0, 12)) console.log(`    ${e}`);
}
process.exit(qBad + dBad === 0 ? 0 : 1);
