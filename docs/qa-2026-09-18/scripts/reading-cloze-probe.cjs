#!/usr/bin/env node
/**
 * READING Step 3 빈칸 — 앱의 생성기(src/lib/readingUtils.ts)가 강의마다 낼 수 있는 빈칸을 그대로 보인다.
 * (2026-09-28 순서 바꿈 — 사장님 D31 다: 빈칸은 이제 Step 2 '핵심 어휘' 카드 아래. 생성기와 씨앗은 그대로.)
 * 앱과 같은 것을 넘긴다: readingSentences 의 english · 핵심어 readingVocabulary(word · partOfSpeech) · 씨앗 'reading/<본 강의 id>'.
 *
 * 2026-09-27 (READING 학습법 · 화면 — 계획 G02 · D33 나): 빈칸은 이제 그 강의의 핵심어에서만 나오고 모두 씨앗으로 정해진다
 * (Math.random 없음). 그래서 '여러 번 돌려 몇 %' 대신, 강의가 낼 수 있는 빈칸 전부(핵심어마다 하나 — 문장 · 보기 · 순서가 고정)와
 * 회차(다른 빈칸으로 다시 풀기)마다 나오는 세 문제를 보인다. '둘 다 맞는 보기' 검토는 --dump 로 뽑아 사람이(또는 검토 일꾼이) 읽고,
 * 판정은 reading-cloze-review.json 에 남긴다 — check-reading-cloze.cjs 가 판정 없는 짝이나 '맞음' 짝을 내면 실패한다.
 *
 *   node reading-cloze-probe.cjs pr001 pr154 [--rounds 3] [--unknown 4,7]   강의가 낼 수 있는 빈칸 전부 + 회차 0..N-1 의 세 문제
 *   node reading-cloze-probe.cjs --all --dump <파일.json> [--unreviewed]    256강 빈칸 전부를 파일로(검토용). --unreviewed: 판정 없는 보기가 있는 문항만
 *   node reading-cloze-probe.cjs pr003 --old [--runs 400]                    고치기 전 판(f35e8be)의 생성기 — 여러 번 돌려 정답 · 보기가 몇 %로 나오는지(예전 방식)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const OLD = argv.includes("--old");
const ALL = argv.includes("--all");
const DUMP = arg("--dump", null);
const UNREVIEWED = argv.includes("--unreviewed");
const ROUNDS = Number(arg("--rounds", 3));
const UNKNOWN = String(arg("--unknown", "")).split(",").map(Number).filter((x) => x > 0);
const RUNS = Number(arg("--runs", 400));
const LESSON_DIR = path.join(REPO, "content/lessons/reading");
const REVIEW_FILE = path.join(__dirname, "reading-cloze-review.json");
const ids = ALL
  ? fs.readdirSync(LESSON_DIR).filter((f) => /^pr\d+\.json$/.test(f)).map((f) => f.replace(/\.json$/, "")).sort()
  : argv.filter((a, i) => /^pr\d+$/.test(a) && !["--runs", "--rounds", "--unknown"].includes(argv[i - 1]));

const lessonOf = (id) => {
  const d = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, `${id}.json`), "utf8"));
  return {
    pairs: (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean })),
    keywords: (d.readingVocabulary || []).map((v) => ({ word: v.word, pos: v.partOfSpeech })),
  };
};

if (OLD) {
  // 고치기 전 판: 문장만 받고 Math.random 으로 보기를 섞던 생성기 — 대조용
  let state = 12345;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ts = require(path.join(REPO, "node_modules", "typescript"));
  const src = execSync("git show f35e8be:src/lib/readingUtils.ts", { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)((spec) => (spec.startsWith(".") || spec.startsWith("@/") ? {} : require(spec)), mod, mod.exports);
  for (const id of ids) {
    const { pairs } = lessonOf(id);
    const stats = new Map();
    for (let r = 0; r < RUNS; r++) {
      mod.exports.generateClozeItems(pairs).forEach((it, i) => {
        const k = `${i + 1}`;
        if (!stats.has(k)) stats.set(k, { targets: new Map(), masked: it.maskedSentence, opts: new Map() });
        const st = stats.get(k);
        st.targets.set(it.missingWord, (st.targets.get(it.missingWord) || 0) + 1);
        for (const o of it.options) if (o !== it.missingWord) st.opts.set(o, (st.opts.get(o) || 0) + 1);
      });
    }
    console.log(`\n== ${id} (고치기 전 f35e8be 생성기) · ${RUNS}회`);
    for (const [k, st] of stats) {
      const opts = [...st.opts.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${((n / RUNS) * 100).toFixed(0)}%`).join(" · ");
      console.log(` #${k} 정답 ${[...st.targets.keys()].join("/")}\n    ${st.masked}\n    보기: ${opts}`);
    }
  }
  process.exit(0);
}

// 지금 판 — 앱과 같은 모듈 불러오기(@/ import 를 따라감)
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const ru = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
// 2026-09-27 (유출 규칙): the app's generator gets its lesson's reviewed pairs from the server (readingClozeFitsForLesson.ts) —
// the probe gives it exactly the same (check-reading-cloze.cjs proves they equal the whole table's blanks)
const fitsFor = loadTs(path.join(REPO, "src/lib/readingClozeFitsForLesson.ts")).clozeAlsoFitsFor;
const lessonFits = (pairs, keywords) => fitsFor(pairs.map((p) => p.en), keywords.map((k) => k.word));
const review = fs.existsSync(REVIEW_FILE) ? JSON.parse(fs.readFileSync(REVIEW_FILE, "utf8")) : { judged: {} };
const verdictOf = (id, answer, option) => ((review.judged || {})[id] || {})[answer.toLowerCase()]?.[option.toLowerCase()] ?? null;

if (DUMP) {
  const out = [];
  let items = 0, unjudged = 0;
  for (const id of ids) {
    const { pairs, keywords } = lessonOf(id);
    const { candidates } = ru.clozeCandidates(pairs, keywords, `reading/${id}`, lessonFits(pairs, keywords));
    const list = [];
    for (const c of candidates) {
      const others = c.options.filter((o) => o !== c.word);
      const open = others.filter((o) => verdictOf(id, c.word, o) === null);
      unjudged += open.length;
      if (UNREVIEWED && !open.length) continue;
      list.push({ k: c.order, sentence: c.maskedSentence, answer: c.word, others: UNREVIEWED ? open : others });
      items++;
    }
    if (list.length) out.push({ lesson: id, items: list });
  }
  fs.writeFileSync(path.resolve(DUMP), JSON.stringify(out, null, 1));
  console.log(`${out.length}강 · 문항 ${items} · 판정 없는 보기 ${unjudged} → ${path.resolve(DUMP)}`);
  process.exit(0);
}

for (const id of ids) {
  const { pairs, keywords } = lessonOf(id);
  const key = `reading/${id}`;
  const fits = lessonFits(pairs, keywords);
  const { candidates, skipped } = ru.clozeCandidates(pairs, keywords, key, fits);
  console.log(`\n== ${id} · 문장 ${pairs.length} · 핵심어 ${keywords.length} · 빈칸이 될 수 있는 핵심어 ${candidates.length}`);
  for (const c of candidates) {
    const marks = c.options.map((o) => (o === c.word ? `[${o}]` : `${o}${verdictOf(id, c.word, o) === "fits" ? "(맞음!)" : verdictOf(id, c.word, o) === null ? "(판정 없음)" : ""}`));
    console.log(` k${c.order} ${["앞", "중간", "끝"][c.region]} · 문장 ${c.sentenceIndex + 1}\n    ${c.maskedSentence}\n    보기: ${marks.join(" · ")}`);
  }
  if (skipped.length) console.log(` 빈칸이 안 되는 핵심어: ${skipped.map((s) => `${s.word}(${s.why})`).join(" · ")}`);
  for (let r = 0; r < ROUNDS; r++) {
    const items = ru.generateClozeItems(pairs, { lessonKey: key, keywords, round: r, unknown: UNKNOWN, alsoFits: fits });
    console.log(` 회차 ${r}${UNKNOWN.length ? ` · 몰라요 ${UNKNOWN.join(",")}` : ""}: ${items.map((it) => `${["앞", "중간", "끝"][it.region]} k${it.order} ${it.missingWord}`).join(" · ")}`);
  }
}
