#!/usr/bin/env node
/**
 * 말하기 채점기(src/lib/speechRecognition.ts — evaluatePronunciation · evaluateAgainstAny) — "틀림없이 읽으면 100점인가",
 * "다시 말하거나 낱말이 둘로 들려도 맞게 읽은 낱말은 초록인가".
 *
 * ① 6-1274(pr235): normalizeText 가 . , ? ! ; : " ' ( ) 만 지워 줄표로 붙은 'subject―is' 가 한 낱말로 남고,
 *    곡선 따옴표 · 아포스트로피(“junk” · don’t)도 그대로 남아 인식기가 돌려주는 junk · don't 와 안 맞았다.
 *    앱이 채점하는 READING 첫 줄(발음 시험 문장) 256개에 "완벽한 읽기" — 소문자, 곡선 따옴표 · 아포스트로피는 곧은 것,
 *    줄표 · 말줄임은 빈칸, 따옴표 · 괄호는 뺀 글 — 를 넣어 100 이 아닌 문장을 센다.
 * ② 6N-001(3차 점검 #10): 줄임말 규칙 18줄이 아포스트로피를 먼저 지운 뒤에 돌아 하나도 안 먹었다('I am happy to see you'
 *    를 'I'm happy to see you' 에 읽으면 31점). 강의 파일 영어 글 전부(폐지 cnn 은 뺌)에서, 줄임말 한 쌍의 **한 꼴만** 쓰는 글을
 *    다른 꼴로 읽은 것(I'm → I am · do not → don't …)이 100 이 아닌 글을 센다. 두 꼴을 다 쓰는 글은 어느 쪽인지 알 수 없어 뺀다.
 *
 * 2026-09-27 (B01 · B02 — STU-U21 · STU-U01 · STU-L03): 두 낱말 창 대신 문장 전체 정렬, 여러 꼴 정답, 빈칸(슬롯).
 *   "앱이 채점하는 방식" = STUDENT 는 문장의 모든 꼴(expandSlashAlternatives — He/She · (sir/ma'am))을 넘겨 가장 잘 맞은 꼴
 *   (evaluateAgainstAny), 다른 과정은 문장 하나. evaluateAgainstAny 가 없는 채점기(고치기 전)는 그때 앱이 부르던 대로 쓴 글 그대로.
 * ③ 되풀이: STUDENT 414 문장(첫 sentences 칸)과 READING readingSentences 전부(서로 다른 1,478)에서 8낱말 이상인 문장을
 *    앞 세 낱말을 한 번 더 넣어 읽으면 85점 이상 · 빨간 낱말 0 (고치기 전: s1-1 #3 44점, 13낱말 중 10개 빨강).
 * ④ 완벽한 읽기 100: STUDENT 414 · READING 1,478 을 evaluateAgainstAny(expandSlashAlternatives(글)) 로 — 꼴마다 따로 읽어
 *    모두 100 · 빨간 낱말 0. He/She · (sir/ma'am) 37문장 포함(고치기 전: s14-2 #3 69점, s1-1 #1 83점).
 * ⑤ (가) 전혀 다른 말: 8낱말 이상 문장에 'purple monkey dishwasher' → 20점 이하.
 *    (나) Gyeongju 가 'gyeong ju' 두 낱말로 들림: 이 낱말이 든 모든 말하기 문장(STUDENT · READING · LISTENING · GRAMMAR) → 85점 이상.
 *    (다) 끝 세 낱말 빼먹기(4낱말 이상 STUDENT · READING): 그 세 낱말만 빨강, 점수는 고치기 전 채점기에 같은 꼴을 준 점수보다 높지 않음.
 * ⑥ 빈칸 [[이름]]: 'I go to [[school name]].' 에 'i go to hanbit elementary school' → 100 · 빨강 0, 빈칸을 말하지 않으면 빈칸만 빨강
 *    (+ 빈칸 뒤에 낱말이 이어지는 꼴, 빈칸 없이 말해도 뒤 낱말 'and' 는 초록, 빈칸 둘).
 * ⑥나 빈칸 없는 문장은 빈칸 처리가 없는 채점기(같은 파일에서 SLOT · SLOT_TOKEN 만 끈 사본)와 점수 · 낱말 표시 · 수가 똑같음 —
 *    STUDENT · READING 모든 꼴 × 흉내 읽기 여덟 가지. (⑥ 에는 '10' 을 '12' 로 말하면 '10' 만 빨강인 칸도 있음 — 숫자가 빈칸으로 새지 않음.)
 * ⑦ 통과 점수(presentResult · STU-U25): STUDENT 문장마다 아래 흉내 읽기 여덟 가지를 통과 점수 70 으로 — 70점 이상은 버튼 · 카드가
 *    초록이고 이름 · 설명에 '다시' 가 없음, 70~79점에 빨간 낱말이 있으면 '통과했어요 — 빨간 낱말만 한 번 더 말해 보세요', 70 미만은
 *    초록 아님. 통과 점수를 안 주면 전과 같음(채점기 말 그대로, 버튼 80 · 카드 85 부터 초록).
 * 그리고 전후 표(기본 실행에서만): 앱이 마이크에 넘기는 모든 문장(STUDENT · READING 첫 줄 · LISTENING · GRAMMAR I·II · VOCA 낱말,
 *    폐지 과정의 DialogueLearningView 는 뺌)에 흉내 읽기 여덟 가지를 넣어 고치기 전 → 뒤 점수. 완벽한 읽기가 100 이 아닌 문장은 이름을 적는다.
 *
 *   node check-speech-scorer.cjs [--head] [--rev <커밋>] [--old] [--list] [--break]
 *   --head  : 고치기 전 판(1117b2f — B01 을 고치기 직전 HEAD, --rev 로 바꿈)의 채점기로 모든 칸을 돌림 — ③ · ④ 가 실패해야 맞음(exit 1).
 *             HEAD 가 아니라 커밋을 박아 둔 까닭: 고친 채점기가 커밋되면 HEAD 가 고친 판이 되어 실패를 못 보여 준다(--old 가 겪은 일).
 *   --old   : 고치기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞)의 speechRecognition.ts 로 (고치기 전과 견줌 — ① 13 · ② 1,680 넘게, exit 1)
 *             (전에는 git HEAD — 고친 채점기가 커밋된 뒤로는 HEAD 가 고친 판이라 0 · 0 이었다, 7-1 n)
 *   --break : 칸마다 일부러 틀린 읽기를 넣음(① · ④ 끝 셋 뺌, ③ 되풀이 + 끝 셋 뺌, ⑤ 다른 말 대신 완벽한 읽기 · 반만 읽기 · 안 빼먹기,
 *             ⑥ 기대를 뒤바꿈, ⑦ 통과 점수를 안 줌) — 모든 칸이 실패를 잡으면 exit 1(맞음), 못 잡은 칸이 있으면 exit 3.
 *   --list  : 실패한 문장과 표의 자세한 줄을 보임.
 *   환경 변수 KIG_SCORER_SRC=<파일> : 작업 사본 대신 그 파일의 채점기로(일부러 망가뜨린 사본으로 칸이 실패하는지 볼 때).
 * 기본: ① ~ ⑦ 중 하나라도(또는 표에서 완벽한 읽기가 100 이 아닌 문장이) 있으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const argv = process.argv.slice(2);
const OLD = argv.includes("--old");
const HEAD = argv.includes("--head");
const LIST = argv.includes("--list");
const BREAK = argv.includes("--break");
const BEFORE_REV = (argv.includes("--rev") && argv[argv.indexOf("--rev") + 1]) || "1117b2f";

const gitShow = (rev) => execSync(`git show ${rev}:src/lib/speechRecognition.ts`, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 });
const fromSource = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, require);
  return mod.exports;
};
// KIG_SCORER_SRC: score with another copy of the scorer (a deliberately broken one, to prove a check can fail).
const NEW_PATH = process.env.KIG_SCORER_SRC || path.join(REPO, "src/lib/speechRecognition.ts");
const NEW = fromSource(fs.readFileSync(NEW_PATH, "utf8"));
const BEFORE = fromSource(gitShow(BEFORE_REV));
const SR = OLD ? fromSource(gitShow("f35e8be")) : HEAD ? BEFORE : NEW;
const { evaluatePronunciation } = SR;
const TAG = `${OLD ? "[고치기 전 f35e8be 채점기] " : HEAD ? `[고치기 전 ${BEFORE_REV} 채점기] ` : ""}${BREAK ? "[--break] " : ""}`;
const LU = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const VS = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));

// 인식기가 돌려줄 법한 완벽한 읽기
const perfect = (t) => t
  .replace(/[‘’]/g, "'").replace(/[“”]/g, "\"")
  .replace(/[‒-―…]/g, " ").replace(/(^|\s)-{1,2}(?=\s|$)/g, " ")
  .replace(/["()[\]]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// ① READING 첫 줄
const dir = path.join(REPO, "content/lessons/reading");
const reading = new Map();
for (const f of fs.readdirSync(dir).filter((x) => /^pr\d+(-1)?\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const s0 = (d.readingSentences || [])[0];
  if (s0) reading.set(s0.english, (reading.get(s0.english) || []).concat(f.replace(".json", "")));
}
const bad = [];
for (const [t, where] of reading) {
  let spoken = perfect(t);
  if (BREAK) spoken = spoken.split(" ").slice(0, -3).join(" ");
  const r = evaluatePronunciation(spoken, t);
  if (r.score !== 100) bad.push({ t, where, score: r.score, miss: r.wordAnalysis.filter((w) => !w.matched).map((w) => w.word).slice(0, 6) });
}
const WHICH = OLD ? "[고치기 전 f35e8be 채점기] " : HEAD ? `[고치기 전 ${BEFORE_REV} 채점기] ` : "";
console.log(`${WHICH}${BREAK ? "[--break 끝 셋 뺌] " : ""}① READING 첫 줄(S[0]) 서로 다른 문장 ${reading.size} · 완벽한 읽기가 100 이 아닌 문장 ${bad.length}`);
if (LIST) for (const b of bad) console.log(`  ${b.score}점 ${b.where[0]} | 안 맞은 ${b.miss.join(" · ")} | ${b.t.slice(0, 90)}`);

// ② 줄임말 — 한 꼴만 쓰는 글을 다른 꼴로 읽기
const PAIRS = [["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["they're", "they are"],
  ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["can't", "cannot"], ["couldn't", "could not"], ["won't", "will not"], ["wouldn't", "would not"],
  ["shouldn't", "should not"], ["hasn't", "has not"], ["haven't", "have not"], ["hadn't", "had not"], ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"]];
const strings = new Set();
const walk = (v) => { if (typeof v === "string") { if ((v.match(/[A-Za-z]{2,}/g) || []).length >= 3 && !/[가-힣]/.test(v)) strings.add(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
const root = path.join(REPO, "content/lessons");
for (const c of fs.readdirSync(root)) {
  if (c === "cnn") continue;
  const d = path.join(root, c);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json"))) walk(JSON.parse(fs.readFileSync(path.join(d, f), "utf8")));
}
let tried = 0;
const cbad = [];
if (!BREAK) for (const t of strings) {
  const sp = perfect(t).replace(/[.,?!;:]/g, "");
  for (const [s, f] of PAIRS) {
    const rs = new RegExp(`(^| )${s}(?= |$)`, "g"), rf = new RegExp(`(^| )${f}(?= |$)`, "g");
    const hasS = rs.test(sp), hasF = rf.test(sp);
    if (hasS === hasF) continue; // 없거나 두 꼴 다
    tried++;
    const alt = hasS ? sp.replace(rs, `$1${f}`) : sp.replace(rf, `$1${s}`);
    const r = evaluatePronunciation(alt, t);
    if (r.score !== 100) cbad.push(`${r.score}점 | ${alt.slice(0, 80)}`);
    break;
  }
}
if (!BREAK) console.log(`${WHICH}② 줄임말 한 꼴만 쓰는 글 ${tried} · 다른 꼴로 읽어 100 이 아닌 글 ${cbad.length}`);
if (LIST) for (const b of cbad.slice(0, 20)) console.log(`  ${b}`);

// ---------------------------------------------------------------------------------------------------
// ③ ~ ⑥ (2026-09-27)
// ---------------------------------------------------------------------------------------------------

/** The words of a reading, as the recogniser would write them (no punctuation, lower case). */
const wordsOf = (t) => perfect(t).replace(/[.,?!;:]/g, "").split(/\s+/).filter(Boolean);
const red = (r) => r.wordAnalysis.filter((w) => !w.matched).length;
/** evaluateAgainstAny for a scorer that has none: the best form by score, then by fewest red words. */
const bestOf = (mod, spoken, forms) => {
  let best = null;
  for (const f of forms) {
    const r = mod.evaluatePronunciation(spoken, f);
    if (!best || r.score > best.score || (r.score === best.score && red(r) < red(best))) best = r;
  }
  return best;
};
/** How the app scores: every accepted form (STUDENT) when the scorer can take them, else the sentence as written. */
const asApp = (mod, spoken, s) => (mod.evaluateAgainstAny ? mod.evaluateAgainstAny(spoken, s.forms).result : mod.evaluatePronunciation(spoken, s.text));

// STUDENT: the first "sentences" block of each lesson (StudentLearningView sentenceItems) — every accepted form.
const student = [];
const sdir = path.join(REPO, "content/lessons/student");
for (const f of fs.readdirSync(sdir).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(sdir, f), "utf8"));
  const b = (d.blocks || []).find((x) => x.type === "sentences");
  if (!b) continue;
  b.items.forEach((it, i) => student.push({ course: "STUDENT", where: `${f.replace(".json", "")} #${it.n || i + 1}`, text: it.text, forms: LU.expandSlashAlternatives(it.text) }));
}
// READING: every readingSentences[].english (distinct).
const readingAll = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const s of d.readingSentences || []) if (!readingAll.has(s.english)) readingAll.set(s.english, f.replace(".json", ""));
}
const readingItems = [...readingAll].map(([text, where]) => ({ course: "READING", where, text, forms: LU.expandSlashAlternatives(text) }));
const scored = [...student, ...readingItems];
const long8 = scored.filter((s) => wordsOf(s.forms[0]).length >= 8);

const results = [];
const report = (id, title, total, fails, detail) => {
  results.push({ id, failed: fails.length > 0 });
  console.log(`${TAG}${id} ${title} ${total} · 어긋남 ${fails.length}${detail ? ` · ${detail}` : ""}`);
  if (LIST || (fails.length && fails.length <= 5)) for (const x of fails.slice(0, LIST ? 40 : 5)) console.log(`  ${x}`);
};

// ③ 되풀이(앞 세 낱말 한 번 더)
{
  const fails = [];
  let low = 101;
  const readingOf = (s) => {
    const w = wordsOf(s.forms[0]);
    return [...w.slice(0, 3), ...(BREAK ? w.slice(0, -3) : w)].join(" ");
  };
  for (const s of long8) {
    const r = asApp(SR, readingOf(s), s);
    low = Math.min(low, r.score);
    if (r.score < 85 || red(r) > 0) fails.push(`${r.score}점 빨강 ${red(r)} ${s.course} ${s.where} | ${s.text.slice(0, 70)}`);
  }
  const probe = (where) => {
    const s = student.find((x) => x.where === where);
    return asApp(SR, readingOf(s), s).score;
  };
  report("③", `되풀이 읽기(앞 세 낱말 한 번 더) — 8낱말 이상 STUDENT·READING`, long8.length, fails,
    `가장 낮은 ${low}점 · s1-1 #3 ${probe("s1-1 #3")}점 · s11-4 #5 ${probe("s11-4 #5")}점`);
}

// ④ 완벽한 읽기 100 — 꼴마다
{
  const fails = [];
  let forms = 0;
  const readingOf = (f) => {
    const w = wordsOf(f);
    return (BREAK ? w.slice(0, -3) : w).join(" ");
  };
  for (const s of scored) {
    for (const f of s.forms) {
      forms++;
      const r = asApp(SR, readingOf(f), s);
      if (r.score !== 100 || red(r) > 0) fails.push(`${r.score}점 빨강 ${red(r)} ${s.course} ${s.where} | 읽은 꼴 "${f.slice(0, 60)}"`);
    }
  }
  const probe = (where) => {
    const s = student.find((x) => x.where === where);
    return asApp(SR, readingOf(s.forms[0]), s).score;
  };
  const twoForms = student.filter((s) => s.forms.length > 1).length;
  report("④", `완벽한 읽기(꼴마다) — STUDENT ${student.length} · READING ${readingItems.length} 문장, 읽은 꼴`, forms, fails,
    `두 꼴 이상 STUDENT ${twoForms}문장 · s14-2 #3 ${probe("s14-2 #3")}점 · s1-1 #1 ${probe("s1-1 #1")}점`);
}

// ⑤ (가) 전혀 다른 말
{
  const fails = [];
  let high = -1;
  for (const s of long8) {
    const spoken = BREAK ? wordsOf(s.forms[0]).join(" ") : "purple monkey dishwasher";
    const r = asApp(SR, spoken, s);
    high = Math.max(high, r.score);
    if (r.score > 20) fails.push(`${r.score}점 ${s.course} ${s.where} | ${s.text.slice(0, 70)}`);
  }
  report("⑤가", "전혀 다른 말('purple monkey dishwasher') — 8낱말 이상", long8.length, fails, `가장 높은 ${high}점`);
}

// ⑤ (나) Gyeongju → 'gyeong ju' — every mic sentence of the four sentence courses that has the word
const listening = [];
{
  const ld = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
  const seen = new Set();
  for (const k of Object.keys(ld)) for (const row of ld[k]) if (row.en && !seen.has(row.en)) { seen.add(row.en); listening.push({ course: "LISTENING", where: `${k} #${row.n}`, text: row.en, forms: [row.en] }); }
}
// GRAMMAR I · II: GrammarLearningView items — the English side of every "sentences" item, cleanText'ed (number and slashes off).
const grammar = [];
{
  const isEnglish = (t) => { const latin = (t.match(/[a-zA-Z]/g) || []).length; const hangul = (t.match(/[가-힯ᄀ-ᇿ]/g) || []).length; return latin >= hangul && latin > 0; };
  const cleanText = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
  const seen = new Set();
  for (const c of ["grammar1", "grammar2"]) {
    const gd = path.join(REPO, "content/lessons", c);
    for (const f of fs.readdirSync(gd).filter((x) => x.endsWith(".json")).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(gd, f), "utf8"));
      for (const b of (d.blocks || []).filter((x) => x.type === "sentences")) {
        for (const it of b.items) {
          const t = cleanText(it.text || "");
          if (t && isEnglish(t) && !seen.has(t)) { seen.add(t); grammar.push({ course: "GRAMMAR", where: `${f.replace(".json", "")} #${it.n}`, text: t, forms: [t] }); }
        }
      }
    }
  }
}
{
  const withName = [...student, ...readingItems, ...listening, ...grammar].filter((s) => /gyeongju/i.test(s.forms[0]));
  const fails = [];
  let low = 101;
  for (const s of withName) {
    let w = wordsOf(s.forms[0]).flatMap((x) => (x.replace(/[’']s$/, "") === "gyeongju" ? ["gyeong", x.replace(/^gyeongju/, "ju")] : [x]));
    if (BREAK) w = w.slice(0, Math.ceil(w.length / 2));
    const r = asApp(SR, w.join(" "), s);
    low = Math.min(low, r.score);
    if (r.score < 85) fails.push(`${r.score}점 빨강 ${red(r)} ${s.course} ${s.where} | ${s.text.slice(0, 70)}`);
  }
  report("⑤나", "Gyeongju 를 'gyeong ju' 로 — 이 낱말이 든 말하기 문장", withName.length, fails, `가장 낮은 ${low}점`);
}

// ⑤ (다) 끝 세 낱말 빼먹기 — those three red, and no higher than the old scorer given the same forms
{
  const fails = [];
  let higher = 0;
  const set = scored.filter((s) => wordsOf(s.forms[0]).length >= 4);
  for (const s of set) {
    const w = wordsOf(s.forms[0]);
    const spoken = (BREAK ? w : w.slice(0, -3)).join(" ");
    const r = asApp(SR, spoken, s);
    const old = bestOf(BEFORE, spoken, s.forms);
    const marks = r.wordAnalysis.map((x) => x.matched);
    const lastThreeRed = marks.slice(-3).every((m) => !m) && marks.slice(0, -3).every(Boolean);
    if (r.score > old.score) higher++;
    if (!lastThreeRed || r.score > old.score) fails.push(`${r.score}점(고치기 전 ${old.score}) 끝 셋 빨강 ${lastThreeRed ? "예" : "아니오"} ${s.course} ${s.where} | ${s.text.slice(0, 60)}`);
  }
  report("⑤다", `끝 세 낱말 빼먹기 — 4낱말 이상 STUDENT·READING(끝 셋만 빨강 · 점수 ≤ 고치기 전 ${BEFORE_REV})`, set.length, fails, `고치기 전보다 높은 ${higher}`);
}

// ⑥ 빈칸 [[이름]]
{
  const cases = [
    { target: "I go to [[school name]].", said: "i go to hanbit elementary school", want: "full" },
    { target: "I go to [[school name]].", said: "i go to", want: "slotRed" },
    { target: "I am a 4th grade student at [[school name]] Elementary School.", said: "I am a 4th grade student at Hanbit Elementary School", want: "full" },
    { target: "My best friend is [[name]], and I have known him for 3 years.", said: "my best friend is and i have known him for 3 years", want: "slotRed" },
    { target: "My favorite TV shows are [[TV show name]] and [[TV show name]].", said: "my favorite tv shows are running man and pororo", want: "full" },
    // no [[ ]]: a number is an ordinary word, not a slot — '12' said for '10' leaves '10' red
    { target: "I am 10 years old.", said: "i am 12 years old", want: "numberRed" },
  ];
  const fails = [];
  for (const c of cases) {
    const flip = BREAK ? (c.want === "full" ? "slotRed" : "full") : c.want;
    const r = SR.evaluatePronunciation(c.said, c.target);
    // "full": 100 and nothing red. "slotRed": the slot — shown as '(label)' — is the one red word.
    // "numberRed": the number is the one red word.
    const ok = flip === "full"
      ? r.score === 100 && red(r) === 0
      : flip === "numberRed"
      ? red(r) === 1 && r.wordAnalysis.some((w) => !w.matched && w.word === "10")
      : red(r) === 1 && r.wordAnalysis.some((w) => !w.matched && w.word.startsWith("("));
    if (!ok) fails.push(`${r.score}점 빨강 ${red(r)} 기대 ${flip} | "${c.said}" → ${c.target} | ${r.wordAnalysis.map((w) => (w.matched ? w.word : `[${w.word}]`)).join(" ")}`);
  }
  report("⑥", "빈칸 [[이름]] 문장", cases.length, fails);
}

// Simulated readings — used by ⑦ and by the table below.
const MISHEARD = { to: "do", a: "the", the: "a", in: "and", and: "in", of: "have", is: "as", it: "at", at: "it", on: "an", for: "far", i: "eye", my: "me", we: "he", he: "we", she: "he", you: "yeah", are: "or", or: "are", was: "is", an: "and", as: "is" };
const splitAt = (w) => [w.slice(0, Math.ceil(w.length / 2)), w.slice(Math.ceil(w.length / 2))];
const pickName = (s, w) => {
  // the first capitalised word after the first (not I), 6+ letters; else the longest word of 6+ letters
  const shown = perfect(s.forms[0]).replace(/[.,?!;:]/g, "").split(/\s+/).filter(Boolean);
  const orig = s.forms[0].replace(/[‒-―…]/g, " ").split(/\s+/).filter((x) => perfect(x).replace(/[.,?!;:]/g, ""));
  let k = -1;
  if (orig.length === shown.length) k = orig.findIndex((x, i) => i > 0 && /^[A-Z][a-z]{5,}/.test(x.replace(/^[“"‘'(]+/, "")) && x !== "I");
  if (k < 0) { let len = 5; w.forEach((x, i) => { if (x.length > len && /^[a-z]+$/.test(x)) { len = x.length; k = i; } }); }
  return k;
};
const SIMS = [
  ["perfect", "완벽한 읽기", (w) => w],
  ["repeat3", "앞 세 낱말 되풀이", (w) => [...w.slice(0, 3), ...w]],
  ["replace1", "한 낱말 다른 말로", (w) => w.map((x, i) => (i === Math.floor(w.length / 2) ? "zebra" : x))],
  ["short2", "짧은 낱말 둘 잘못 들림", (w) => { let n = 0; const out = w.map((x) => (n < 2 && MISHEARD[x] ? (n++, MISHEARD[x]) : x)); return n === 2 ? out : null; }],
  ["split", "이름 한 낱말이 둘로(이어 붙이면 같음)", (w, s) => { const k = pickName(s, w); return k < 0 ? null : w.flatMap((x, i) => (i === k ? splitAt(x) : [x])); }],
  ["splitOff", "이름이 둘로, 뒤 반쪽도 잘못 들림", (w, s) => { const k = pickName(s, w); return k < 0 ? null : w.flatMap((x, i) => (i === k ? [splitAt(x)[0], "joo"] : [x])); }],
  ["drop3", "끝 세 낱말 빼먹기", (w) => (w.length > 3 ? w.slice(0, -3) : null)],
  ["unrelated", "전혀 다른 문장", () => "purple monkeys juggle frozen pizza quietly".split(" ")],
];

// ⑥나 빈칸 없는 문장은 빈칸 처리가 없는 채점기와 똑같음 — 같은 채점기에서 SLOT · SLOT_TOKEN 을 결코 맞지 않는 식으로 바꾼 사본과
//     STUDENT · READING 모든 문장 × 흉내 읽기 여덟 가지의 점수 · 낱말 표시 · 일치 수 · 덧붙은 말 수를 견준다(하나라도 다르면 실패).
//     숫자 같은 보통 낱말이 빈칸으로 새면 여기서 잡힌다. --break 는 고치기 전 채점기와 견줘 다름을 보여 준다.
{
  const fails = [];
  let n = 0;
  if (!SR.evaluateAgainstAny || HEAD || OLD) {
    report("⑥나", "빈칸 없는 문장 = 빈칸 처리 없는 채점기", 0, [], "고치기 전 채점기에는 빈칸 처리가 없어 건너뜀");
  } else {
    const src = fs.readFileSync(NEW_PATH, "utf8");
    const off = src.replace(/^const SLOT = .*$/m, "const SLOT = /(?!)/g;").replace(/^const SLOT_TOKEN = .*$/m, "const SLOT_TOKEN = /(?!)/;");
    if (off === src || (off.match(/\(\?!\)/g) || []).length !== 2) throw new Error("⑥나: SLOT · SLOT_TOKEN 줄을 못 찾음 — 검사를 고칠 것");
    const NOSLOT = BREAK ? BEFORE : fromSource(off);
    const sig = (r) => `${r.score}|${r.matchedCount}|${r.extraWords}|${r.wordAnalysis.map((w) => `${w.matched ? 1 : 0}${w.word}`).join(" ")}`;
    for (const s of scored) {
      for (const [id, , make] of SIMS) {
        const said = make(wordsOf(s.forms[0]), s);
        if (!said) continue;
        for (const f of s.forms) {
          n++;
          const a = SR.evaluatePronunciation(said.join(" "), f);
          const b = NOSLOT.evaluatePronunciation(said.join(" "), f);
          if (sig(a) !== sig(b)) fails.push(`${id} ${s.course} ${s.where} | ${a.score} vs ${b.score}`);
        }
      }
    }
    report("⑥나", "빈칸 없는 문장 = 빈칸 처리 없는 채점기(점수 · 표시 · 수)", n, fails);
  }
}

// ⑦ 통과 점수(passScore, STU-U25) — STUDENT 가 넘기는 70 으로, 모든 흉내 읽기에서: 통과한 카드(70점 이상)는 초록이고
//    '다시' 라는 말이 없음 · 70~79점에 빨간 낱말이 있으면 '통과했어요 — 빨간 낱말만 한 번 더 말해 보세요' · 70 미만은 초록이 아님.
//    통과 점수를 주지 않으면 전과 같음(버튼 80 · 카드 85 부터 초록, 채점기 말 그대로).
{
  const fails = [];
  let passedN = 0, belowGoodRed = 0, n = 0;
  if (!SR.presentResult) {
    fails.push("presentResult 없음 — 이 채점기는 통과 점수를 모름");
  } else {
    for (const s of student) {
      for (const [, , make] of SIMS) {
        const said = make(wordsOf(s.forms[0]), s);
        if (!said) continue;
        const r = asApp(SR, said.join(" "), s);
        n++;
        const bare = SR.presentResult(r);
        if (bare.label !== r.ratingLabel || bare.feedback !== r.feedback || bare.buttonSuccess !== r.score >= 80 || bare.cardSuccess !== r.score >= 85) {
          fails.push(`통과 점수 없이 전과 다름 ${r.score}점 ${s.where}`);
        }
        const p = SR.presentResult(r, BREAK ? undefined : 70);
        const words = `${p.label} ${p.feedback}`;
        if (r.score >= 70) {
          passedN++;
          if (/다시/.test(words) || !p.buttonSuccess || !p.cardSuccess) fails.push(`${r.score}점 통과인데 "${words}" 초록 ${p.buttonSuccess}/${p.cardSuccess} ${s.where}`);
          if (r.score < 80 && red(r) > 0) {
            belowGoodRed++;
            if (p.feedback !== "통과했어요 — 빨간 낱말만 한 번 더 말해 보세요") fails.push(`${r.score}점 빨강 ${red(r)} 인데 "${p.feedback}" ${s.where}`);
          }
        } else if (p.buttonSuccess || p.cardSuccess) {
          fails.push(`${r.score}점 통과 못 했는데 초록 ${s.where}`);
        }
      }
    }
  }
  report("⑦", "통과 점수 70(STUDENT) — STUDENT 흉내 읽기 결과", n, fails, `70점 이상 ${passedN} · 그중 70~79점에 빨간 낱말 ${belowGoodRed}`);
}

// ---------------------------------------------------------------------------------------------------
// 전후 표 — 고치기 전(BEFORE_REV) → 뒤(작업 사본), 앱이 마이크에 넘기는 모든 문장
// ---------------------------------------------------------------------------------------------------
if (!HEAD && !OLD && !BREAK) {
  const readingMic = [...reading.keys()].map((text) => ({ course: "READING", where: reading.get(text)[0], text, forms: [text] }));
  const voca = [];
  {
    const vd = path.join(REPO, "content/lessons/phonics");
    const seen = new Set();
    for (const f of fs.readdirSync(vd).filter((x) => x.endsWith(".json")).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(vd, f), "utf8"));
      const g = (d.blocks || []).find((x) => x.type === "wordgrid");
      for (const w of (g ? g.rows.flat() : []).map((x) => (x || "").trim()).filter(Boolean)) {
        const t = VS.vocaSpeechForm(w);
        if (!seen.has(t)) { seen.add(t); voca.push({ course: "VOCA", where: `${f.replace(".json", "")} ${w}`, text: t, forms: [t] }); }
      }
    }
  }
  const courses = [["STUDENT", student], ["READING 첫 줄", readingMic], ["LISTENING", listening], ["GRAMMAR I·II", grammar], ["VOCA 낱말", voca]];
  console.log(`\n전후 표 — 고치기 전 ${BEFORE_REV} → 뒤(작업 사본). 칸: 문장 수 · 평균 전→뒤 · 가장 낮은 전→뒤 · 오른 문장/내린 문장. STUDENT 는 전=쓴 글 그대로(그때 앱), 뒤=모든 꼴(evaluateAgainstAny).`);
  const notPerfect = [];
  for (const [name, list] of courses) {
    console.log(`  ${name} (${list.length})`);
    for (const [id, label, make] of SIMS) {
      let n = 0, sb = 0, sa = 0, mb = 101, ma = 101, up = 0, down = 0, redB = 0, redA = 0;
      const moves = [];
      for (const s of list) {
        const w = wordsOf(s.forms[0]);
        if (!w.length) continue;
        const said = make(w, s);
        if (!said) continue;
        const spoken = said.join(" ");
        const b = BEFORE.evaluatePronunciation(spoken, s.text);
        const a = NEW.evaluateAgainstAny(spoken, s.forms).result;
        n++; sb += b.score; sa += a.score; mb = Math.min(mb, b.score); ma = Math.min(ma, a.score);
        redB += red(b); redA += red(a);
        if (a.score > b.score) up++;
        if (a.score < b.score) down++;
        if (a.score !== b.score) moves.push(`${b.score}→${a.score} ${s.where} | ${spoken.slice(0, 60)}`);
        if (id === "perfect" && (a.score !== 100 || red(a) > 0)) notPerfect.push(`${a.score}점 빨강 ${red(a)} ${name} ${s.where} | ${s.text.slice(0, 70)}`);
      }
      if (!n) { console.log(`    ${label.padEnd(24)} 해당 없음`); continue; }
      console.log(`    ${label.padEnd(24)} ${String(n).padStart(5)} · 평균 ${(sb / n).toFixed(1)}→${(sa / n).toFixed(1)} · 최저 ${mb}→${ma} · 오름 ${up} / 내림 ${down} · 빨간 낱말 평균 ${(redB / n).toFixed(2)}→${(redA / n).toFixed(2)}`);
      if (LIST) for (const x of moves.slice(0, 8)) console.log(`        ${x}`);
    }
  }
  console.log(`  완벽한 읽기가 100 이 아닌 문장(뒤): ${notPerfect.length}${notPerfect.length ? "" : " — 모든 과정 · VOCA 한 낱말 포함 100"}`);
  for (const x of notPerfect.slice(0, 40)) console.log(`    ${x}`);
  if (notPerfect.length) results.push({ id: "표-완벽", failed: true });
}

const failed = results.filter((r) => r.failed).map((r) => r.id);
const oneTwoFail = bad.length > 0 || cbad.length > 0;
if (BREAK) {
  // every check must catch its deliberate break; ② does not run under --break
  const missed = results.filter((r) => !r.failed).map((r) => r.id).concat(bad.length ? [] : ["①"]);
  console.log(missed.length ? `\n깨기: 못 잡은 칸 ${missed.join(" · ")} — exit 3` : `\n깨기: 모든 칸이 일부러 틀린 읽기를 잡음(FAIL 이 나야 맞음) — exit 1`);
  process.exit(missed.length ? 3 : 1);
}
if (HEAD) {
  const want = ["③", "④"].filter((id) => !failed.includes(id));
  console.log(`\n--head: 실패한 칸 ${failed.join(" · ") || "없음"}${want.length ? ` — ${want.join(" · ")} 이(가) 실패하지 않음: 검사가 고치기 전 결함을 못 잡음` : " — ③ · ④ 는 고치기 전 채점기에서 실패해야 맞음"}`);
  process.exit(failed.length || oneTwoFail ? 1 : 0);
}
console.log(failed.length || oneTwoFail ? `\n실패: ${[...(oneTwoFail ? ["① 또는 ②"] : []), ...failed].join(" · ")}` : "\n①~⑦ 모두 통과");
process.exit(failed.length || oneTwoFail ? 1 : 0);
