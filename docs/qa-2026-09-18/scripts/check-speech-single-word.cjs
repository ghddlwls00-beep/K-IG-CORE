#!/usr/bin/env node
/**
 * 한 낱말 말하기 확인(src/lib/speechSingleWord.ts — 계획.md B03 · voca-verified.md VOCA-L10, 2026-09-27) — "바르게 말한 한 낱말을
 * 틀렸다고 하지 않는가", "다른 낱말은 여전히 '한 번 더' 인가", "문장 채점은 한 점도 안 바뀌었는가".
 * 만든 쪽과 확인한 쪽이 같은 일꾼입니다(따로 검토한 사람 없음) — 그래서 칸마다 --break 로 실패할 수 있음을 먼저 보입니다.
 *
 * ① 고정 목록 71낱말 = VOCA 무료 두 강의 mv1-01 · mv1-02 의 60낱말(PhonicsLearningView 가 만드는 그대로: wordgrid 칸 → trim → 빈 칸 뺌,
 *    과녁은 vocaSpeechForm) + 숫자 낱말 5(ten · hundred · thousand · million · billion) + 하이픈 낱말 6(VOCA 의 한 낱말 하이픈 표제어 전부).
 *    낱말마다 인식기가 돌려줄 법한 다른 꼴 — 대문자 · 마침표, 동음이의어(표 HOMOPHONES), 숫자 ↔ 말, 하이픈 · 띄어쓰기 · 붙여 쓰기,
 *    첫 추측은 딴 말이고 셋째 추측이 그 낱말 — 을 넣어 모두 '알아들었어요' · onSuccess 점수 100.
 *    고치기 전 앱(b842836: 첫 추측 하나를 문장 채점기로 — VOCA 는 통과 점수가 없어 80점부터 초록)이면 몇 점이었는지 함께 적음.
 * ② 다른 낱말: 고정 목록의 낱말마다 목록의 다음 낱말, 그리고 소리가 비슷한 딴 낱말(go ↔ do, now ↔ know …)을 넣으면 '알아들었어요' 가
 *    아니고 "'<들린 말>'로 들렸어요 — 한 번 더", onSuccess 점수는 추측들의 문장 채점기 최고 점수(100 아님).
 * ③ 문장은 이 길을 타지 않음: 앱이 마이크에 넘기는 모든 과녁(STUDENT micTargets 모든 꼴 · READING 첫 줄 · LISTENING · GRAMMAR I·II ·
 *    VOCA) 가운데 두 낱말 이상이거나 [[빈칸]] 이 든 과녁은 isSingleWordTarget 이 모두 false, 한 낱말 과녁은 모두 true. 과정별 수를 적음.
 * ④ 문장 채점 전후 diff: 고치기 전(b842836) speechRecognition.ts 와 작업 사본의 evaluateAgainstAny(결과 전체 + 꼴 번호) ·
 *    presentResult(통과 점수 없음 · 70)를 모든 과녁 × 흉내 읽기 여덟 가지(check-speech-scorer.cjs SIMS) + ① · ② 의 추측 문자열로 견줌.
 *    하나라도 다르면 실패.
 * ⑤ 오류 안내: 가짜 인식기로 listenToSpeech 를 돌려 — 아이폰 · 아이패드(데스크탑 모드 포함)의 'service-not-allowed' → 받아쓰기 켜는 곳
 *    한 줄, 'not-allowed' → Safari 마이크 허용 한 줄('마이크 접근 권한이' 로 시작 — 점검 도우미가 읽음). 그 밖의 기기와 오류 코드는
 *    고치기 전과 글자 하나 다르지 않음.
 * ⑥ 추측 여럿: 가짜 인식기가 한 결과에 추측 셋을 주면 maxAlternatives 5 로 연 listenToSpeech 가 인식기에 5 를 걸고 onResult(첫 추측,
 *    [셋]) 을 부름 · 두 조각 결과는 조각마다 바꿔 끼운 꼴 · maxAlternatives 를 안 주면 인식기에 1 이 걸리고 첫 인자는 고치기 전과 같음.
 *
 *   node check-speech-single-word.cjs [--break] [--head] [--list]
 *   --break : 칸마다 일부러 망가뜨린 사본으로 — ① 규칙 하나씩 뺀 사본 넷(동음이의어 · 숫자 · 하이픈 · 첫 추측만), ② sameWord 가 늘 참,
 *             ③ isSingleWordTarget 이 늘 참, ④ 점수 식 65 · 20 → 64 · 21, ⑤ 아이폰을 못 알아봄, ⑥ 추측을 안 모음. 모든 칸이 실패를 잡으면
 *             exit 1(맞음), 못 잡은 칸이 있으면 exit 3. 사본을 못 만들면(고칠 줄을 못 찾으면) 바로 멈춤 — 깨기가 헛돌지 않게.
 *   --head  : ① · ② 를 고치기 전 앱의 판정(첫 추측을 문장 채점기로, 80점 이상 초록)으로 — ① 이 실패해야 맞음(exit 1).
 *   --list  : 줄마다 자세히.
 * 기본: 하나라도 실패하면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const argv = process.argv.slice(2);
const BREAK = argv.includes("--break");
const HEAD = argv.includes("--head");
const LIST = argv.includes("--list");
/** HEAD when this work began — the scorer and recogniser before B03 (pinned: once B03 is committed, HEAD is the new code). */
const BEFORE_REV = "b842836";

const transpile = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
/** speechRecognition.ts has no imports. */
const loadScorer = (src) => {
  const mod = { exports: {} };
  new Function("module", "exports", "require", transpile(src))(mod, mod.exports, require);
  return mod.exports;
};
/** speechSingleWord.ts with its one import answered by the given scorer module. */
const loadSingle = (src, scorer) => {
  const mod = { exports: {} };
  const req = (spec) => (/speechRecognition$/.test(spec) ? scorer : require(spec));
  new Function("module", "exports", "require", transpile(src))(mod, mod.exports, req);
  return mod.exports;
};
/** A deliberately broken copy: every [from, to] must be found, so a break can never silently do nothing. */
const mutate = (src, pairs, name) => {
  let out = src;
  for (const [from, to] of pairs) {
    const hit = typeof from === "string" ? out.includes(from) : from.test(out);
    if (!hit) throw new Error(`--break 사본 '${name}': 고칠 줄을 못 찾음 — ${String(from).slice(0, 80)} (검사를 고칠 것)`);
    out = out.replace(from, to);
  }
  return out;
};

const SR_SRC = fs.readFileSync(path.join(REPO, "src/lib/speechRecognition.ts"), "utf8");
const SW_SRC = fs.readFileSync(path.join(REPO, "src/lib/speechSingleWord.ts"), "utf8");
const SR = loadScorer(SR_SRC);
const SW = loadSingle(SW_SRC, SR);
const BEFORE = loadScorer(execSync(`git show ${BEFORE_REV}:src/lib/speechRecognition.ts`, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }));
const LU = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const VS = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const SB = loadTs(path.join(REPO, "src/lib/studentBlanks.ts"));
const TAG = `${BREAK ? "[--break] " : ""}${HEAD ? `[--head 고치기 전 ${BEFORE_REV} 앱 판정] ` : ""}`;

const results = [];
const report = (id, title, total, fails, detail) => {
  results.push({ id, failed: fails.length > 0 });
  console.log(`${TAG}${id} ${title} ${total} · 어긋남 ${fails.length}${detail ? ` · ${detail}` : ""}`);
  if (LIST || (fails.length && fails.length <= 6)) for (const x of fails.slice(0, LIST ? 60 : 6)) console.log(`  ${x}`);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));

// ---------------------------------------------------------------------------------------------------
// The words — as PhonicsLearningView builds them: the wordgrid's cells, trimmed, empty ones dropped; the target
// handed to VoiceSpeakingTester is vocaSpeechForm(word).
// ---------------------------------------------------------------------------------------------------
const phonicsDir = path.join(REPO, "content/lessons/phonics");
const lessonWords = (file) => {
  const d = JSON.parse(fs.readFileSync(path.join(phonicsDir, file), "utf8"));
  const g = (d.blocks || []).find((b) => b.type === "wordgrid");
  return (g ? g.rows.flat() : []).map((w) => (w || "").trim()).filter(Boolean);
};
const vocaTargets = new Map(); // target → "lesson word"
for (const f of fs.readdirSync(phonicsDir).filter((x) => x.endsWith(".json")).sort()) {
  for (const w of lessonWords(f)) {
    const t = VS.vocaSpeechForm(w);
    if (!vocaTargets.has(t)) vocaTargets.set(t, `${f.replace(".json", "")} ${w}`);
  }
}
const free = [...lessonWords("mv1-01.json"), ...lessonWords("mv1-02.json")].map((w) => VS.vocaSpeechForm(w));
const NUMBER_WORDS = ["ten", "hundred", "thousand", "million", "billion"];
const hyphenWords = [...vocaTargets.keys()].filter((t) => /^[A-Za-z]+(?:-[A-Za-z]+)+$/.test(t));
const setupFails = [];
if (free.length !== 60) setupFails.push(`mv1-01 · mv1-02 낱말 ${free.length} (60 이어야 함)`);
for (const n of NUMBER_WORDS) if (!vocaTargets.has(n)) setupFails.push(`숫자 낱말 '${n}' 이 VOCA 에 없음`);
if (hyphenWords.length !== 6) setupFails.push(`하이픈 낱말 ${hyphenWords.length} (6 이어야 함): ${hyphenWords.join(" ")}`);
const fixed = [...free, ...NUMBER_WORDS, ...hyphenWords];

// the homophone table itself: lower case, each word in one group only
{
  const seen = new Map();
  for (const g of SW.HOMOPHONES) {
    for (const w of g) {
      if (w !== w.toLowerCase() || /\s/.test(w)) setupFails.push(`동음이의어 표: '${w}' 는 소문자 한 낱말이어야 함`);
      if (seen.has(w)) setupFails.push(`동음이의어 표: '${w}' 가 두 묶음에(${seen.get(w)} · ${g.join("/")})`);
      seen.set(w, g.join("/"));
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// What each judge says. The app's judge: speechSingleWord (NEW). --head: the app before B03 — the first guess
// alone through the sentence scorer, green from 80 (VOCA passes no pass mark, so presentResult's 80).
// ---------------------------------------------------------------------------------------------------
const oldScore = (guesses, target) => BEFORE.evaluateAgainstAny(guesses[0] || "", [target]).result.score;
const judgeWith = (sw) => (guesses, target) => {
  if (HEAD) {
    const score = oldScore(guesses, target);
    return { understood: score >= 80, label: `${score}점`, score };
  }
  const r = sw.judgeSingleWord(guesses, [target]);
  const shown = sw.presentSingleWord(r);
  return { understood: r.understood, label: shown.label, success: shown.success, score: r.score, heard: r.heard };
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const groupOf = (w) => SW.HOMOPHONES.find((g) => g.includes(w.toLowerCase().replace(/[.]$/, "")));

/** The recogniser strings each fixed word is fed as, by kind. */
function variantsOf(t) {
  const out = [];
  const add = (kind, guesses) => out.push({ kind, guesses });
  add("대소문자", [t.toUpperCase()]);
  add("대소문자", [`${cap(t)}.`]);
  const g = groupOf(t);
  if (g) for (const h of g) if (h !== t.toLowerCase().replace(/[.]$/, "")) add("동음이의어", [h.length === 1 ? h.toUpperCase() : h]);
  const NUM = {
    ten: ["10"], hundred: ["100", "a hundred", "one hundred"], thousand: ["1,000", "1000", "a thousand"],
    million: ["1,000,000", "1 million"], billion: ["1,000,000,000", "1 billion"],
  };
  for (const n of NUM[t] || []) add("숫자", [n]);
  if (t.includes("-")) {
    add("하이픈", [t.replace(/-/g, "")]);
    add("하이픈", [t.replace(/-/g, " ")]);
    add("하이픈", [t.split("-").map(cap).join("-")]);
  }
  add("셋째 추측", ["zebra", "pizza", t]);
  return out;
}
const KINDS = ["대소문자", "동음이의어", "숫자", "하이픈", "셋째 추측"];

function runFixed(sw) {
  const judge = judgeWith(sw);
  const rows = [];
  for (const t of fixed) for (const v of variantsOf(t)) {
    const j = judge(v.guesses, t);
    rows.push({ t, ...v, j, old: oldScore(v.guesses, t) });
  }
  return rows;
}

// ① 고정 목록
{
  const rows = runFixed(SW);
  const fails = [...setupFails];
  for (const r of rows) {
    const ok = r.j.understood && (HEAD || (r.j.label === "알아들었어요" && r.j.success === true && r.j.score === 100));
    if (!ok) fails.push(`${r.kind} ${r.t} ← ${JSON.stringify(r.guesses)} : ${r.j.label} (점수 ${r.j.score})`);
    if (LIST && ok) console.log(`  ${r.kind} ${r.t} ← ${JSON.stringify(r.guesses)} : ${r.j.label} · 고치기 전 ${r.old}점`);
  }
  const oldRed = rows.filter((r) => r.old < 80);
  const low = rows.reduce((m, r) => Math.min(m, r.old), 101);
  const probe = (t, g) => (rows.find((r) => r.t === t && r.guesses[0] === g) || {}).old;
  const byKind = KINDS.map((k) => `${k} ${rows.filter((r) => r.kind === k).length}`).join(" · ");
  report("①", `고정 목록(mv1-01·02 60 + 숫자 5 + 하이픈 6 = ${fixed.length}낱말)을 다른 꼴로 — 줄(${byKind})`, rows.length, fails,
    `고치기 전 앱이 초록(80점 이상)이 아니었던 줄 ${oldRed.length} · 가장 낮은 ${low}점 · do←'due' ${probe("do", "due")}점 · know←'no' ${probe("know", "no")}점 · ten←'10' ${probe("ten", "10")}점 · well-done←'well done' ${probe("well-done", "well done")}점 · good-bye←'goodbye' ${probe("good-bye", "goodbye")}점 · Mr.←'mister' ${probe("Mr.", "mister")}점`);
}

// ② 다른 낱말
const NEAR = [
  ["do", "go"], ["do", "doe"], ["know", "now"], ["not", "note"], ["here", "hair"], ["there", "they"], ["see", "she"],
  ["so", "saw"], ["why", "way"], ["where", "were"], ["some", "same"], ["find", "fine"], ["time", "team"], ["ten", "tin"],
  ["hundred", "hundreds"], ["thousand", "thousands"], ["good-bye", "good boy"], ["well-done", "well known"], ["Mr.", "Mrs."],
  ["English", "England"], ["can", "can't"], ["that", "those"],
];
function otherRows() {
  const rows = [];
  fixed.forEach((t, i) => rows.push({ kind: "다음 낱말", t, guesses: [fixed[(i + 1) % fixed.length]] }));
  for (const [t, g] of NEAR) rows.push({ kind: "비슷한 딴 낱말", t, guesses: [g] });
  rows.push({ kind: "추측 셋 모두 딴 말", t: "do", guesses: ["go", "goat", "dough"] });
  return rows;
}
function runOther(sw) {
  const judge = judgeWith(sw);
  return otherRows().map((r) => ({ ...r, j: judge(r.guesses, r.t) }));
}
{
  const rows = runOther(SW);
  const fails = [];
  for (const r of rows) {
    if (!HEAD && SW.sameWord(r.guesses[0], r.t)) { fails.push(`표본이 잘못됨: '${r.guesses[0]}' 는 '${r.t}' 와 같은 낱말로 봄`); continue; }
    const best = Math.max(...r.guesses.map((g) => SR.evaluateAgainstAny(g, [r.t]).result.score));
    // the first guess as the learner sees it: its edge punctuation off ('Mrs.' → 'Mrs')
    const heard = r.guesses[0].replace(/^[\s.,?!;:"“”]+|[\s.,?!;:"“”]+$/g, "");
    const ok = HEAD
      ? !r.j.understood
      : !r.j.understood && r.j.success === false && r.j.label === `'${heard}'로 들렸어요 — 한 번 더` && r.j.score === best && r.j.score < 100;
    if (!ok) fails.push(`${r.kind} ${r.t} ← ${JSON.stringify(r.guesses)} : ${r.j.label} (점수 ${r.j.score})`);
    else if (LIST) console.log(`  ${r.kind} ${r.t} ← ${JSON.stringify(r.guesses)} : ${r.j.label} (점수 ${r.j.score})`);
  }
  const high = rows.reduce((m, r) => Math.max(m, r.j.score), -1);
  report("②", "다른 낱말 → '한 번 더'(다음 낱말 · 소리가 비슷한 딴 낱말 · 추측 셋 모두 딴 말)", rows.length, fails, `onSuccess 점수 가장 높은 ${high}`);
}

// ---------------------------------------------------------------------------------------------------
// Every target the app hands the microphone (③ and ④).
// ---------------------------------------------------------------------------------------------------
const courses = [];
{
  // STUDENT: StudentLearningView passes micTargets(item.text, blanks, myInfo) — here with nothing typed (blanks stay [[slots]]).
  const list = [];
  const dir = path.join(REPO, "content/lessons/student");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const b = (d.blocks || []).find((x) => x.type === "sentences");
    if (!b) continue;
    const id = f.replace(".json", "");
    b.items.forEach((it, i) => list.push({ where: `${id} #${i + 1}`, text: it.text, forms: SB.micTargets(it.text, SB.blanksOf(id, i, it.text), {}) }));
  }
  courses.push(["STUDENT", list]);
}
{
  // READING: ReadingLearningView passes the lesson's first sentence (sentencePairs[0].en).
  const list = [];
  const dir = path.join(REPO, "content/lessons/reading");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const s0 = (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).readingSentences || [])[0];
    if (s0) list.push({ where: f.replace(".json", ""), text: s0.english, forms: [s0.english] });
  }
  courses.push(["READING 첫 줄", list]);
}
{
  // LISTENING: LdLearningView passes each shadowing sentence (.en).
  const list = [];
  const ld = readJson("content/ld_english_scripts.json");
  const seen = new Set();
  for (const k of Object.keys(ld)) for (const row of ld[k]) if (row.en && !seen.has(row.en)) { seen.add(row.en); list.push({ where: `${k} #${row.n}`, text: row.en, forms: [row.en] }); }
  courses.push(["LISTENING", list]);
}
{
  // GRAMMAR I · II: GrammarLearningView passes item.englishText (the English side, cleanText'ed) — as check-speech-scorer.cjs builds it.
  const list = [];
  const isEnglish = (t) => { const latin = (t.match(/[a-zA-Z]/g) || []).length; const hangul = (t.match(/[가-힯ᄀ-ᇿ]/g) || []).length; return latin >= hangul && latin > 0; };
  const cleanText = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
  const seen = new Set();
  for (const c of ["grammar1", "grammar2"]) {
    const gd = path.join(REPO, "content/lessons", c);
    for (const f of fs.readdirSync(gd).filter((x) => x.endsWith(".json")).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(gd, f), "utf8"));
      for (const b of (d.blocks || []).filter((x) => x.type === "sentences")) for (const it of b.items) {
        const t = cleanText(it.text || "");
        if (t && isEnglish(t) && !seen.has(t)) { seen.add(t); list.push({ where: `${f.replace(".json", "")} #${it.n}`, text: t, forms: [t] }); }
      }
    }
  }
  courses.push(["GRAMMAR I·II", list]);
}
courses.push(["VOCA", [...vocaTargets].map(([t, where]) => ({ where, text: t, forms: [t] }))]);

/**
 * Words of a target counted without the module under test: slots as one word, dashes and '…' as breaks, a word in
 * any script counted ("너는 강했니(strong)?" is two — GRAMMAR items that are Korean with an English word in brackets).
 */
const wordCount = (t) => t.replace(/\[\[[^\]]*\]\]/g, " SLOT ").split(/[\s‒-―…]+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function runRoute(sw) {
  const fails = [];
  const counts = [];
  const oneWordOutsideVoca = [];
  for (const [name, list] of courses) {
    let single = 0;
    for (const s of list) {
      const got = sw.isSingleWordTarget(s.forms);
      const sentence = s.forms.some((f) => wordCount(f) !== 1 || f.includes("[["));
      if (got) single++;
      if (sentence && got) fails.push(`문장인데 한 낱말 판정 ${name} ${s.where} | ${s.forms[0].slice(0, 60)}`);
      if (!sentence && !got) fails.push(`한 낱말인데 문장 채점 ${name} ${s.where} | ${s.forms.join(" / ")}`);
      if (got && name !== "VOCA") oneWordOutsideVoca.push(`${name} ${s.where} '${s.forms.join(" / ")}'`);
    }
    counts.push(`${name} ${single}/${list.length}`);
  }
  return { fails, counts, oneWordOutsideVoca };
}
{
  const { fails, counts, oneWordOutsideVoca } = runRoute(SW);
  const vocaTwo = courses.find(([n]) => n === "VOCA")[1].filter((s) => !SW.isSingleWordTarget(s.forms)).map((s) => s.text);
  report("③", "한 낱말 판정을 받는 과녁(두 낱말 이상 · [[빈칸]] 은 모두 문장 채점) — 과녁", courses.reduce((n, [, l]) => n + l.length, 0), fails,
    `${counts.join(" · ")} · VOCA 두 낱말: ${vocaTwo.join(" · ")} · VOCA 밖 한 낱말: ${oneWordOutsideVoca.join(" · ") || "없음"}`);
}

// ---------------------------------------------------------------------------------------------------
// ④ The sentence scorer before (BEFORE_REV) and now — every target × the eight simulated readings of
// check-speech-scorer.cjs (copied as they are there) + the guesses of ① · ②.
// ---------------------------------------------------------------------------------------------------
const perfect = (t) => t
  .replace(/[‘’]/g, "'").replace(/[“”]/g, "\"")
  .replace(/[‒-―…]/g, " ").replace(/(^|\s)-{1,2}(?=\s|$)/g, " ")
  .replace(/["()[\]]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const wordsOf = (t) => perfect(t).replace(/[.,?!;:]/g, "").split(/\s+/).filter(Boolean);
const MISHEARD = { to: "do", a: "the", the: "a", in: "and", and: "in", of: "have", is: "as", it: "at", at: "it", on: "an", for: "far", i: "eye", my: "me", we: "he", he: "we", she: "he", you: "yeah", are: "or", or: "are", was: "is", an: "and", as: "is" };
const splitAt = (w) => [w.slice(0, Math.ceil(w.length / 2)), w.slice(Math.ceil(w.length / 2))];
const pickName = (s, w) => {
  const shown = perfect(s.forms[0]).replace(/[.,?!;:]/g, "").split(/\s+/).filter(Boolean);
  const orig = s.forms[0].replace(/[‒-―…]/g, " ").split(/\s+/).filter((x) => perfect(x).replace(/[.,?!;:]/g, ""));
  let k = -1;
  if (orig.length === shown.length) k = orig.findIndex((x, i) => i > 0 && /^[A-Z][a-z]{5,}/.test(x.replace(/^[“"‘'(]+/, "")) && x !== "I");
  if (k < 0) { let len = 5; w.forEach((x, i) => { if (x.length > len && /^[a-z]+$/.test(x)) { len = x.length; k = i; } }); }
  return k;
};
const SIMS = [
  ["perfect", (w) => w],
  ["repeat3", (w) => [...w.slice(0, 3), ...w]],
  ["replace1", (w) => w.map((x, i) => (i === Math.floor(w.length / 2) ? "zebra" : x))],
  ["short2", (w) => { let n = 0; const out = w.map((x) => (n < 2 && MISHEARD[x] ? (n++, MISHEARD[x]) : x)); return n === 2 ? out : null; }],
  ["split", (w, s) => { const k = pickName(s, w); return k < 0 ? null : w.flatMap((x, i) => (i === k ? splitAt(x) : [x])); }],
  ["splitOff", (w, s) => { const k = pickName(s, w); return k < 0 ? null : w.flatMap((x, i) => (i === k ? [splitAt(x)[0], "joo"] : [x])); }],
  ["drop3", (w) => (w.length > 3 ? w.slice(0, -3) : null)],
  ["unrelated", () => "purple monkeys juggle frozen pizza quietly".split(" ")],
];
function runDiff(after) {
  const sig = (mod, spoken, forms) => {
    const r = mod.evaluateAgainstAny(spoken, forms);
    return JSON.stringify([r.index, r.result, mod.presentResult(r.result), mod.presentResult(r.result, 70)]);
  };
  const fails = [];
  let n = 0;
  const per = [];
  const compare = (name, where, spoken, forms) => {
    n++;
    if (sig(BEFORE, spoken, forms) !== sig(after, spoken, forms)) fails.push(`${name} ${where} | "${spoken.slice(0, 50)}"`);
  };
  for (const [name, list] of courses) {
    const start = n;
    for (const s of list) {
      const w = wordsOf(s.forms[0]);
      if (!w.length) continue;
      for (const [, make] of SIMS) {
        const said = make(w, s);
        if (said) compare(name, s.where, said.join(" "), s.forms);
      }
    }
    per.push(`${name} ${n - start}`);
  }
  const start = n;
  for (const t of fixed) for (const v of variantsOf(t)) for (const g of v.guesses) compare("①추측", t, g, [t]);
  for (const r of otherRows()) for (const g of r.guesses) compare("②추측", r.t, g, [r.t]);
  per.push(`①·② 추측 ${n - start}`);
  return { fails, n, per };
}
{
  const { fails, n, per } = runDiff(BREAK ? loadScorer(mutate(SR_SRC, [["wordAccuracy * 65 + charSim * 20", "wordAccuracy * 64 + charSim * 21"]], "④ 점수 식")) : SR);
  report("④", `문장 채점 전후(${BEFORE_REV} → 작업 사본) evaluateAgainstAny 결과 전체 · presentResult(없음 · 70) — 견준 수`, n, fails, per.join(" · "));
}

// ---------------------------------------------------------------------------------------------------
// ⑤ ⑥ listenToSpeech with a fake recogniser in a fake browser (window · navigator).
// ---------------------------------------------------------------------------------------------------
function inBrowser(ua, touchPoints, fn) {
  const saved = { window: Object.getOwnPropertyDescriptor(globalThis, "window"), navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  const made = [];
  class FakeRecognition {
    constructor() { this.maxAlternatives = -1; made.push(this); }
    start() {}
    stop() {}
    abort() {}
  }
  Object.defineProperty(globalThis, "window", { value: { SpeechRecognition: FakeRecognition }, configurable: true, writable: true });
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua, maxTouchPoints: touchPoints }, configurable: true, writable: true });
  try {
    return fn(made);
  } finally {
    for (const k of ["window", "navigator"]) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    }
  }
}
const DEVICES = [
  ["아이폰 Safari", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1", 5, true],
  ["아이패드(데스크탑 모드)", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15", 5, true],
  ["Mac Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15", 0, false],
  ["Windows Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", 0, false],
  ["안드로이드 Chrome", "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36", 5, false],
];
const CODES = ["no-speech", "not-allowed", "service-not-allowed", "network", "audio-capture", "aborted", "language-not-supported"];
const errorLine = (mod, ua, touch, code) => inBrowser(ua, touch, (made) => {
  let said = null;
  mod.listenToSpeech({ onResult: () => {}, onError: (m) => { said = m; } });
  made[0].onerror({ error: code });
  return said;
});
{
  const mod = BREAK ? loadScorer(mutate(SR_SRC, [["function isAppleMobile(): boolean {", "function isAppleMobile(): boolean {\n  return false;"]], "⑤ 아이폰 못 알아봄")) : SR;
  const fails = [];
  let n = 0;
  for (const [device, ua, touch, apple] of DEVICES) {
    for (const code of CODES) {
      n++;
      const now = errorLine(mod, ua, touch, code);
      const before = errorLine(BEFORE, ua, touch, code);
      const oneLine = typeof now === "string" && !/\n/.test(now) && now.length <= 80;
      if (apple && code === "service-not-allowed") {
        if (!(oneLine && /받아쓰기/.test(now) && /설정 > 일반 > 키보드/.test(now))) fails.push(`${device} ${code} → "${now}"`);
      } else if (apple && code === "not-allowed") {
        if (!(oneLine && /^마이크 접근 권한이/.test(now) && /Safari/.test(now) && /허용/.test(now))) fails.push(`${device} ${code} → "${now}"`);
      } else if (now !== before) {
        fails.push(`${device} ${code} 바뀜: "${before}" → "${now}"`);
      }
      if (LIST) console.log(`  ${device} ${code}: ${now}`);
    }
  }
  const iphone = errorLine(mod, DEVICES[0][1], 5, "service-not-allowed");
  report("⑤", "오류 안내(기기 5 × 오류 코드 7) — 아이폰·아이패드 두 코드만 새 한 줄, 나머지는 고치기 전과 같은 말", n, fails, `아이폰 service-not-allowed: "${iphone}"`);
}

// ⑥ guesses
{
  const mod = BREAK
    ? loadScorer(mutate(SR_SRC, [["recognition.maxAlternatives = maxAlternatives;", "recognition.maxAlternatives = 1;"], ["finalParts.push(guesses);", "finalParts.push([res[0].transcript]);"]], "⑥ 추측 안 모음"))
    : SR;
  const fails = [];
  const alt = (...ts) => { const r = { length: ts.length, isFinal: true }; ts.forEach((t, k) => { r[k] = { transcript: t }; }); return r; };
  const interim = (t) => ({ 0: { transcript: t }, length: 1, isFinal: false });
  const run = (m, opts, events) => inBrowser(DEVICES[3][1], 0, (made) => {
    const calls = [];
    m.listenToSpeech({ ...opts, onResult: (...args) => calls.push(args), onInterim: (t) => calls.push(["interim", t]) });
    for (const e of events) made[0].onresult(e);
    return { max: made[0].maxAlternatives, calls };
  });
  const oneEvent = (...parts) => [{ resultIndex: 0, results: Object.assign(parts.reduce((o, p, i) => ((o[i] = p), o), {}), { length: parts.length }) }];
  // (가) one final result with three guesses, maxAlternatives 5
  const a = run(mod, { maxAlternatives: 5 }, oneEvent(alt("due", "do", "dew")));
  if (a.max !== 5) fails.push(`(가) 인식기 maxAlternatives ${a.max} (5 여야 함)`);
  if (JSON.stringify(a.calls) !== JSON.stringify([["due", ["due", "do", "dew"]]])) fails.push(`(가) onResult ${JSON.stringify(a.calls)}`);
  const judged = SW.judgeSingleWord((a.calls[0] || [])[1] || [], ["do"]);
  if (!judged.understood) fails.push(`(가) 판정 ${JSON.stringify(judged)}`);
  // (나) two final parts — each part's other guesses in its place
  const b = run(mod, { maxAlternatives: 5 }, oneEvent(alt("well"), alt(" done", " dumb")));
  if (JSON.stringify(b.calls) !== JSON.stringify([["well done", ["well done", "well dumb"]]])) fails.push(`(나) onResult ${JSON.stringify(b.calls)}`);
  // (다) no maxAlternatives: 1 on the recogniser, and the transcript (first argument) the same as before B03 — interim then final
  const events = [{ resultIndex: 0, results: { 0: interim("du"), length: 1 } }, ...oneEvent(alt("due"))];
  const c = run(mod, {}, events);
  const cb = run(BEFORE, {}, events);
  if (c.max !== 1) fails.push(`(다) 인식기 maxAlternatives ${c.max} (1 이어야 함)`);
  const firstArgs = (calls) => JSON.stringify(calls.map((x) => (x[0] === "interim" ? x : [x[0]])));
  if (firstArgs(c.calls) !== firstArgs(cb.calls)) fails.push(`(다) 첫 인자 다름: ${firstArgs(cb.calls)} → ${firstArgs(c.calls)}`);
  if (cb.max !== 1) fails.push(`(다) 고치기 전 인식기 maxAlternatives ${cb.max}`);
  report("⑥", "추측 여럿(가 추측 셋 · 나 두 조각 · 다 maxAlternatives 없이 = 고치기 전)", 3, fails, `(가) ${JSON.stringify(a.calls[0] || null)}`);
}

// ---------------------------------------------------------------------------------------------------
// --break: ① with four copies, each without one rule — the rows of that kind must fail; ② and ③ with a broken copy.
// ---------------------------------------------------------------------------------------------------
if (BREAK) {
  const copies = [
    ["동음이의어", mutate(SW_SRC, [[/export const HOMOPHONES: readonly \(readonly string\[\]\)\[\] = \[[\s\S]*?\n\];/, "export const HOMOPHONES: readonly (readonly string[])[] = [];"]], "① 동음이의어 표 비움")],
    ["숫자", mutate(SW_SRC, [["function numberOf(tokens: string[]): { value: number; ordinal: boolean } | null {", "function numberOf(tokens: string[]): { value: number; ordinal: boolean } | null {\n  return null;"]], "① 숫자 끔")],
    ["하이픈", mutate(SW_SRC, [["keys.add(`w:${tokens.join(\"\").replace(/['-]/g, \"\")}`);", "keys.add(`w:${tokens.join(\" \").replace(/'/g, \"\")}`);"]], "① 하이픈 · 띄어쓰기 그대로")],
    ["셋째 추측", mutate(SW_SRC, [["for (const guess of said) {", "for (const guess of said.slice(0, 1)) {"]], "① 첫 추측만")],
  ];
  const fails = [];
  const lines = [];
  for (const [kind, src] of copies) {
    const rows = runFixed(loadSingle(src, SR)).filter((r) => r.kind === kind);
    const broken = rows.filter((r) => !r.j.understood).length;
    lines.push(`${kind} 규칙 뺀 사본: 그 종류 ${rows.length}줄 중 '알아들었어요' 아님 ${broken}`);
    if (broken > 0) fails.push(`${kind}: ${broken}/${rows.length}`);
  }
  results.push({ id: "①깨기", failed: fails.length === copies.length });
  console.log(`${TAG}①깨기 규칙 하나씩 뺀 사본 ${copies.length} — 사본마다 그 종류 줄이 실패해야 맞음 · ${lines.join(" · ")}`);
  if (fails.length !== copies.length) console.log(`  못 잡은 사본 있음 — ${copies.length - fails.length}`);

  const always = loadSingle(mutate(SW_SRC, [["export function sameWord(guess: string, target: string): boolean {", "export function sameWord(guess: string, target: string): boolean {\n  return true;"]], "② sameWord 늘 참"), SR);
  const other = runOther(always).filter((r) => r.j.understood);
  results.push({ id: "②깨기", failed: other.length > 0 });
  console.log(`${TAG}②깨기 sameWord 가 늘 참인 사본 — 다른 낱말을 '알아들었어요' 로 본 줄 ${other.length} / ${otherRows().length}`);

  const route = runRoute(loadSingle(mutate(SW_SRC, [
    ["if (t.includes(\"[[\")) return false;", ""],
    ["return tokens.length === 1 && (ONE_WORD.test(tokens[0]) || GROUPED_DIGITS.test(tokens[0]));", "return tokens.length >= 1;"],
  ], "③ 늘 한 낱말"), SR));
  results.push({ id: "③깨기", failed: route.fails.length > 0 });
  console.log(`${TAG}③깨기 isSingleWordTarget 이 늘 참인 사본 — 문장인데 한 낱말 판정 ${route.fails.length}`);
}

// ---------------------------------------------------------------------------------------------------
const failed = results.filter((r) => r.failed).map((r) => r.id);
if (BREAK) {
  // ① · ② · ③ are broken through their own '…깨기' rows (the normal ① · ② · ③ rows run the real module and pass)
  const must = ["①깨기", "②깨기", "③깨기", "④", "⑤", "⑥"];
  const missed = must.filter((id) => !failed.includes(id));
  console.log(missed.length ? `\n깨기: 못 잡은 칸 ${missed.join(" · ")} — exit 3` : `\n깨기: 모든 칸이 일부러 망가뜨린 사본을 잡음(FAIL 이 나야 맞음) — exit 1`);
  process.exit(missed.length ? 3 : 1);
}
if (HEAD) {
  console.log(`\n--head: 실패한 칸 ${failed.join(" · ") || "없음"}${failed.includes("①") ? " — ① 은 고치기 전 앱에서 실패해야 맞음" : " — ① 이 실패하지 않음: 검사가 고치기 전 결함을 못 잡음"}`);
  process.exit(failed.length ? 1 : 0);
}
console.log(failed.length ? `\n실패: ${failed.join(" · ")}` : "\n①~⑥ 모두 통과");
process.exit(failed.length ? 1 : 0);
