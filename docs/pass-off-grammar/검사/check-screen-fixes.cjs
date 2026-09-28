#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 화면 고침 세 가지(작업기록 할 일 4 · 5 · 6, 2026-09-28) — 같은 AI 계열이 고치고 이 검사도 만들었다. 독립 검수가 아니다.
 *
 * src/lib/passoffLesson.ts 를 그대로(단독 트랜스파일 — 타입만 가져오는 파일) 불러 67레슨 전부의 문항으로 본다. 문항은 휴대폰이 받는
 * 모양: 무료 레슨이 떼어 둔 유료 보충 문항을 앱과 같은 함수(passoffSupplement.ts attachPaidItems)로 제자리에 붙이고 passoffView.ts
 * viewBlocks 로 바꾼 것(check-grading 과 같음 — 이용권이 있는 사람이 보는 전부).
 *
 *   T  ④ 사다리 ③ 낱말 타일 — wordTiles(할 일 4)
 *      T1 고치기 전(같은 모듈의 contrastTiles + generateWordBank 의 허용 차례 그대로 — ComposeCard 가 전에 하던 것)과 뒤(wordTiles)를
 *         문항마다 같은 난수로 만들어 비교: 바뀐 문항은 '문장부호뿐인 토큰'이 있는 문항과 정확히 같고, 바뀐 것은 모두 그 타일 · 낱말을
 *         뺀 것뿐(남은 타일의 낱말 · id · 순서, 허용 차례의 나머지 낱말이 글자까지 그대로)
 *      T2 1권(part 1)에서 en 에 쉼표가 있는 문항(목록 — pg06-3 …) 타일 · 허용 차례가 고치기 전과 글자까지 같음 M/M
 *      T3 뒤: 문장부호뿐인 타일 0 · 모든 문항에서 모범 답의 낱말(허용 차례 첫째)을 타일로 놓을 수 있고 카드의 판정
 *         (verifyAnyWordSequence)이 그 차례를 받음 · 방해 낱말 풀에 문장부호뿐인 낱말이 든 문항 수(0 이어야 — 있으면 방해 타일이 줄어듦)
 *   O  보기 순서 — optionOrder(할 일 5): ③ choice(화면에 나오는 것 — reserve 제외) · ② 발견 질문 · ② 규칙 확인(⑤ 에서 같은 순서)
 *      O1 같은 키는 두 번 불러도, 모듈을 따로 두 번 불러도(그 사이 Math.random 을 다른 것으로 바꿔도) 같은 순서 · 0..n-1 의 순열
 *      O2 정답(데이터의 answer)이 첫 자리에 보이는 비율 — 레슨마다 전 → 후, 전체, 최소 · 최대. 후: 전체 비율이 기대값(Σ1/n)의
 *         ±3σ 안 · 모든 질문의 정답이 첫 자리인 레슨 0(우연으로 그럴 확률이 1/100 이상인 작은 레슨은 이름만 적고 FAIL 로 세지 않음 —
 *         오늘은 해당 없음)
 *      O3 채점은 원래 번호로: 보여 준 자리 k 의 단추는 원래 번호 order[k] 를 넘기고(화면 글 검사 O4), gradeChoice(item, order[k]) 는
 *         order[k] === answer 일 때만 참 · 정답이 보이는 자리의 단추가 정답 · 발견 질문의 기록도 원래 번호
 *      O4 화면 연결(글 검사 — TSX 는 돌리지 않음): FormStep · RuleStep · WrapUpStep 이 optionOrder 로 그리고 data-option 에 원래 번호
 *   P  짝 순서 — promptPartners · orderAfterPartners · orderReviewPlan(할 일 6)
 *      P1 짝 찾기: 한 레슨 안에서 B.promptEn = A.en 인 ④ · ⑤ 문항 — 목록을 적고, 이끄는 세션이 적은 pg19-2 p3→p4 · p7→p8 · p12→p13 이
 *         모두 있음 · 다른 레슨끼리는 짝 없음 · 순환 없음 · 줄 순서로 못 막는 짝 0(B 가 A 보다 앞 세트 · A 는 ⑤ 인데 B 는 ④ — 내용을
 *         바꿀 일. A 가 앞 세트면 그 세트가 끝나야 B 의 세트가 나오므로 괜찮음)
 *      P2 ④ 다시 풀기 줄: 짝이 있는 레슨의 세트마다, 짝마다 A 를 1~4번 틀리게(4 = 세 번 다시 나와도 못 맞힘 → '내일 1순위') · B 도
 *         0~1번 틀리게 하고 나머지는 맞게, 화면과 같은 줄(queueOf(…, partners) → 머리 문장 → composeItemDone)로 끝까지 풀어 봄 —
 *         A 가 아직 줄에 있는데 B 가 나온 적 0. 옛 저장 줄(B 가 A 앞)을 다시 연 경우 · ⑤ 줄 · 합성 레슨(A 가 도전이라 세트 끝 ·
 *         사슬 A→B→C · 순환 · A 가 없는 줄 · 다른 레슨의 같은 글 · 띄어쓰기만 다른 글)도
 *      P3 오늘 복습: 엔진(planDay — src/lib/learning 을 그대로)으로 만든 기록에서, 화면과 같은 묶기(ReviewSession.tsx 의 segmentsOf 를
 *         파일에서 그대로 떼어 돌림 — 다음 날 확인은 레슨마다 먼저, 나머지 뒤)로 보여 주는 차례를 만들어 B 가 A 보다 먼저 0:
 *         (a) '내일 1순위'라 B 가 기록에 먼저 들어감 (b) 확인을 반쯤 하다 그만둠 — A 는 다시(again), B 는 아직 다음 날 확인
 *         (c) B 는 again, A 는 review(나머지) (d) A 가 오늘 없음 → 그대로 (e) 67레슨 모두 어제 끝냄(B 먼저) — 짝이 없는 문항의 차례는
 *         그대로, 문항 집합도 그대로. 각 경우 고치기 전 차례로는 B 가 먼저인지도 셈(그 경우가 문제를 실제로 건드리는지).
 *      P4 화면 연결(글 검사): PassoffLearningView 가 ④ · ⑤ 줄에 partners · PassoffReview 가 orderReviewPlan 을 orderItems 로 ·
 *         ReviewSession 이 segmentsOf 앞에서 orderItems · ComposeCard 가 wordTiles
 *
 *   node docs/pass-off-grammar/검사/check-screen-fixes.cjs            exit 0 = 모두 PASS
 *   node docs/pass-off-grammar/검사/check-screen-fixes.cjs --list     레슨별 보기 첫 자리 표 · 짝 목록 전부
 *   node docs/pass-off-grammar/검사/check-screen-fixes.cjs --prove-breaks   안 깬 판 exit 0 · 아래 깨기 모두 exit 1 인지
 *   일부러 깨기(메모리 사본 — 저장소 파일은 그대로; 줄 끝을 LF 로 맞춘 뒤 찾고, 못 찾으면 exit 2 '깨기가 안 먹음'):
 *     --break=tiles          문장부호뿐인 토큰도 낱말로 봄(고치기 전) → T FAIL
 *     --break=order          보기를 데이터 차례 그대로(고치기 전) → O2 FAIL
 *     --break=pairs          짝을 보지 않음(고치기 전) → P2 · P3 FAIL
 *     --break=review-reason  복습에서 다음 날 확인의 B 를 A 쪽으로 옮기지 않음 → P3 (b) FAIL
 *     --break=wiring         PassoffLearningView 가 ④ 줄에 partners 를 안 넘김 → P4 FAIL
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules/typescript"));
const LESSON_DIR = path.join(REPO, "content/lessons/passoff-grammar");
const PRIVATE_DIR = path.join(REPO, "content/private/passoff-grammar");
const LIST = process.argv.includes("--list");

/** [file, the text in it, what it becomes] — the behaviour before the fix, in memory only */
const BREAKS = {
  tiles: ["src/lib/passoffLesson.ts", "const isWordToken = (token: string) => /[A-Za-z0-9]/.test(token);", "const isWordToken = (token: string) => token.length > 0;"],
  order: ["src/lib/passoffLesson.ts", "  const random = seeded(hashOf(key));\n", "  const random = () => 0.9999999;\n"],
  pairs: [
    "src/lib/passoffLesson.ts",
    "  const free = (item: T) => (partners.get(idOf(item)) ?? []).every((a) => !present.has(a) || placed.has(a));\n",
    "  const free = (item: T) => Boolean(item) || true;\n",
  ],
  "review-reason": ["src/lib/passoffLesson.ts", "      if (e.reason !== NEXT_DAY) return e;\n", "      if (e) return e;\n"],
  wiring: ["src/components/PassoffLearningView.tsx", "queueOf(work.composeQueue, onScreenSet, composeDone, partners)", "queueOf(work.composeQueue, onScreenSet, composeDone)"],
};

const lastLine = (text) => String(text || "").trim().split(/\r?\n/).pop();
if (process.argv.includes("--prove-breaks")) {
  const run = (extra) => spawnSync(process.execPath, [__filename, ...extra], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rows = [];
  const clean = run([]);
  rows.push({ run: "(깨지 않음)", exit: clean.status, want: 0, ok: clean.status === 0, line: lastLine(clean.stdout) });
  for (const name of Object.keys(BREAKS)) {
    const r = run([`--break=${name}`]);
    const firstFail = String(r.stdout || "").split(/\r?\n/).find((l) => /^\s+FAIL /.test(l)) || lastLine(r.stdout || r.stderr);
    rows.push({ run: `--break=${name}`, exit: r.status, want: 1, ok: r.status === 1, line: firstFail.trim().slice(0, 150) });
  }
  for (const r of rows) console.log(`${r.ok ? "ok  " : "BAD "} ${r.run.padEnd(24)} exit ${r.exit} (기대 ${r.want})  ${r.line}`);
  const bad = rows.filter((r) => !r.ok);
  console.log(bad.length ? `\nFAIL — 기대와 다른 판 ${bad.length}` : `\nPASS — 안 깬 판 exit 0 · 깨기 ${rows.length - 1}가지 모두 exit 1(이름 붙은 FAIL)`);
  process.exit(bad.length ? 1 : 0);
}

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !BREAKS[BREAK]) {
  console.log(`모르는 --break=${BREAK} (${Object.keys(BREAKS).join(" · ")})`);
  process.exit(2);
}

/** a file as text, LF line ends (a Windows checkout has CRLF), with this run's break applied when it is that file's */
function sourceOf(rel) {
  let src = fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
  const b = BREAKS[BREAK];
  if (b && b[0] === rel) {
    if (src.split(b[1]).length !== 2) {
      console.log(`--break=${BREAK}: ${rel} 에서 바꿀 글을 한 곳에서 못 찾음 — 깨기가 안 먹음(이 파일의 BREAKS 를 고칠 것)`);
      process.exit(2);
    }
    src = src.replace(b[1], b[2]);
  }
  return src;
}
const transpile = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
/** an import-free file (type imports are erased), run as it is */
function loadAlone(rel) {
  const m = { exports: {} };
  new Function("module", "exports", transpile(sourceOf(rel)))(m, m.exports);
  return m.exports;
}
/** the learning engine (engine.ts imports ./day) */
function loadLearning() {
  const cache = {};
  const load = (name) => {
    if (cache[name]) return cache[name].exports;
    const m = { exports: {} };
    cache[name] = m;
    new Function("require", "module", "exports", transpile(sourceOf(`src/lib/learning/${name}.ts`)))((spec) => load(spec.replace(/^\.\//, "")), m, m.exports);
    return m.exports;
  };
  return { E: load("engine"), D: load("day") };
}
/** one function of a file, cut out of it as written (ReviewSession.tsx segmentsOf — not exported) */
function functionFrom(rel, name) {
  const text = sourceOf(rel);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  let found = null;
  sf.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === name) found = n.getText(sf);
  });
  if (!found) throw new Error(`${rel} 에서 function ${name} 을 못 찾음 — 이 검사가 화면의 묶기를 못 봄`);
  return transpile(found);
}

const L = loadAlone("src/lib/passoffLesson.ts");
const U = loadAlone("src/lib/listeningUtils.ts");
const G = loadAlone("src/lib/passoffGrading.ts");
const { attachPaidItems } = loadAlone("src/lib/passoffSupplement.ts");
const { viewBlocks } = loadAlone("src/lib/passoffView.ts");
const { E, D } = loadLearning();
const segmentsOf = new Function("daysBetween", `${functionFrom("src/components/learning/ReviewSession.tsx", "segmentsOf")}\nreturn segmentsOf;`)(D.daysBetween);
for (const [name, fn] of Object.entries({
  wordTiles: L.wordTiles, contrastTiles: L.contrastTiles, contrastPool: L.contrastPool, optionOrder: L.optionOrder, ruleQuestionKey: L.ruleQuestionKey,
  promptPartners: L.promptPartners, orderAfterPartners: L.orderAfterPartners, orderReviewPlan: L.orderReviewPlan, queueOf: L.queueOf,
  composeItemDone: L.composeItemDone, cutSets: L.cutSets, emptyWork: L.emptyWork, generateWordBank: U.generateWordBank,
  verifyAnyWordSequence: U.verifyAnyWordSequence, gradeChoice: G.gradeChoice, planDay: E.planDay, segmentsOf,
})) {
  if (typeof fn !== "function") throw new Error(`${name} 를 못 찾음 — 이 검사가 아무것도 안 봄`);
}

// ── lessons: the file (paid supplement in place) → what the page hands the view
const lessons = fs
  .readdirSync(LESSON_DIR)
  .filter((f) => /^pg\d{2}-\d+\.json$/.test(f))
  .sort()
  .map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, f), "utf8"));
    const sup = path.join(PRIVATE_DIR, `${data.id}.paid.json`);
    const held = fs.existsSync(sup) ? JSON.parse(fs.readFileSync(sup, "utf8")).items || [] : [];
    const file = held.length ? attachPaidItems(data.blocks, held) : data.blocks;
    const view = viewBlocks(file);
    const drill = view.find((b) => b.type === "drill") || {};
    return {
      id: data.id,
      part: data.part,
      rule: view.find((b) => b.type === "rule") || null,
      forms: drill.select || [],
      produce: drill.produce || [],
      transfers: drill.transfer || [],
      // record only: the `reserve` choice items the page does not send today (kept for the review — 데이터-형식 v1.3)
      reserve: ((file.find((b) => b.type === "drill") || {}).select || []).filter((s) => s.kind === "choice" && s.reserve),
    };
  });
if (lessons.length !== 67) throw new Error(`레슨 ${lessons.length}개 — 67 이 아님(이 검사의 숫자를 다시 볼 것)`);

const fails = [];
const lines = [];
const fail = (section, text) => fails.push(`${section} ${text}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (BREAK) console.log(`(깨기 시험 --break=${BREAK} — ${BREAKS[BREAK][0]} 의 "${BREAKS[BREAK][1].trim().slice(0, 70)}" 을 바꾼 사본)`);

/** a seeded stand-in for Math.random (mulberry32 over the text's FNV-1a) — the same numbers for both sides of a comparison */
function seededFrom(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  let a = h | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
function withRandom(seedText, fn) {
  Math.random = seededFrom(seedText);
  try {
    return fn();
  } finally {
    Math.random = realRandom;
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// T — ④ ladder rung ③'s word tiles
// ════════════════════════════════════════════════════════════════════════════════════════════════
{
  const punctOnly = (w) => !/[A-Za-z0-9]/.test(w);
  let items = 0;
  let withPunct = 0;
  let changed = 0;
  let onlyRemoval = 0;
  let punctTilesAfter = 0;
  let assemblable = 0;
  let poolPunct = 0;
  const changedBy = {};
  const commaSame = [];
  const commaDiff = [];
  for (const lesson of lessons) {
    for (const item of [...lesson.produce, ...lesson.transfers]) {
      items++;
      const pool = L.contrastPool(item);
      if (pool.some(punctOnly)) poolPunct++;
      // before: what ComposeCard did — generateWordBank's sequences as they are, contrastTiles' tiles
      const before = withRandom(item.id, () => {
        const bank = U.generateWordBank(item.en, pool);
        return { acceptedWordSequences: bank.acceptedWordSequences, tiles: L.contrastTiles(bank, pool) };
      });
      // after: what it does now
      const after = withRandom(item.id, () => L.wordTiles(U.generateWordBank(item.en, pool), pool));
      const has = before.tiles.some((t) => punctOnly(t.word)) || before.acceptedWordSequences.flat().some(punctOnly);
      if (has) withPunct++;
      const isChanged = !same(after, before);
      if (isChanged) {
        changed++;
        changedBy[lesson.id] = (changedBy[lesson.id] || 0) + 1;
      }
      const expected = {
        acceptedWordSequences: before.acceptedWordSequences.map((seq) => seq.filter((w) => !punctOnly(w))),
        tiles: before.tiles.filter((t) => !punctOnly(t.word)),
      };
      if (same(after, expected)) onlyRemoval++;
      else fail("T1", `${item.id} "${item.en}": 뒤 타일이 '앞 타일 − 문장부호뿐인 타일'과 다름 — 앞 ${JSON.stringify(before.tiles.map((t) => t.word))} · 뒤 ${JSON.stringify(after.tiles.map((t) => t.word))}`);
      if (has !== isChanged) fail("T1", `${item.id}: 문장부호뿐인 토큰 ${has ? "있음" : "없음"}인데 타일이 ${isChanged ? "바뀜" : "그대로"}`);
      const left = after.tiles.filter((t) => punctOnly(t.word));
      punctTilesAfter += left.length;
      if (left.length) fail("T3", `${item.id}: 뒤에도 문장부호뿐인 타일 ${JSON.stringify(left.map((t) => t.word))}`);
      // the model answer can be placed from the tiles, and the card's own judge takes it
      const model = after.acceptedWordSequences[0] || [];
      const bag = new Map();
      for (const t of after.tiles) bag.set(t.word.toLowerCase(), (bag.get(t.word.toLowerCase()) || 0) + 1);
      const placeable = model.every((w) => {
        const k = w.toLowerCase();
        if (!bag.get(k)) return false;
        bag.set(k, bag.get(k) - 1);
        return true;
      });
      if (placeable && model.length && U.verifyAnyWordSequence(model, after.acceptedWordSequences)) assemblable++;
      else fail("T3", `${item.id}: 모범 답 낱말 ${JSON.stringify(model)} 을 타일로 놓아 맞힐 수 없음`);
      if (lesson.part === 1 && item.en.includes(",")) (same(after, before) ? commaSame : commaDiff).push(item.id);
    }
  }
  for (const id of commaDiff) fail("T2", `${id}: 1권 쉼표 문항의 타일이 고치기 전과 다름`);
  if (!commaSame.length) fail("T2", "1권 쉼표 문항 0 — 이 검사가 아무것도 안 봄");
  if (poolPunct) fail("T3", `방해 낱말 풀에 문장부호뿐인 낱말이 든 문항 ${poolPunct} — 그 문항은 방해 타일이 한 장 줄어듦`);
  const byLesson = Object.entries(changedBy).map(([k, v]) => `${k} ${v}`).join(" · ") || "없음";
  if (changed !== withPunct) fail("T1", `바뀐 문항 ${changed} ≠ 문장부호뿐인 토큰이 있는 문항 ${withPunct}`);
  if (!withPunct) fail("T1", "문장부호뿐인 토큰이 있는 문항 0 — 고칠 것이 없는데 고쳤다고 할 수 없음(할 일 4 의 126 문항은?)");
  lines.push(`T1 ④ 문항 ${items}개(67레슨 · ④ ⑤ — 무료 레슨의 유료 보충 포함): 타일이 바뀐 문항 ${changed}(${byLesson}) = 문장부호뿐인 토큰이 있는 문항 ${withPunct} · 바뀐 것은 모두 그 타일 · 낱말을 뺀 것뿐(${onlyRemoval}/${items} 이 '앞 − 문장부호뿐인 것'과 글자까지 같음)`);
  lines.push(`T2 1권 쉼표 문항 타일 · 허용 차례가 고치기 전과 글자까지 같음 ${commaSame.length}/${commaSame.length + commaDiff.length}`);
  lines.push(`T3 뒤: 문장부호뿐인 타일 ${punctTilesAfter} · 모범 답을 타일로 놓아 맞힐 수 있는 문항 ${assemblable}/${items} · 방해 낱말 풀에 문장부호뿐인 낱말 ${poolPunct}`);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// O — the options' order
// ════════════════════════════════════════════════════════════════════════════════════════════════
{
  const questions = [];
  for (const lesson of lessons) {
    for (const item of lesson.forms.filter((f) => f.kind === "choice")) {
      questions.push({ lesson: lesson.id, what: "choice", key: item.id, n: item.options.length, answer: item.answer, item });
    }
    if (lesson.rule && lesson.rule.discovery) {
      const d = lesson.rule.discovery;
      questions.push({ lesson: lesson.id, what: "discovery", key: L.ruleQuestionKey(lesson.id, "discovery"), n: d.options.length, answer: d.answer });
    }
    if (lesson.rule && lesson.rule.check) {
      const c = lesson.rule.check;
      questions.push({ lesson: lesson.id, what: "check", key: L.ruleQuestionKey(lesson.id, "check"), n: c.options.length, answer: c.answer });
    }
  }
  // O1 — stable: twice in a row, and from a second load of the module with another Math.random in between
  const second = withRandom("another device", () => loadAlone("src/lib/passoffLesson.ts"));
  let stable = 0;
  for (const q of questions) {
    const a = L.optionOrder(q.key, q.n);
    const b = L.optionOrder(q.key, q.n);
    const c = withRandom(`other-${q.key}`, () => second.optionOrder(q.key, q.n));
    const perm = a.length === q.n && [...a].sort((x, y) => x - y).every((v, i) => v === i);
    if (same(a, b) && same(a, c) && perm) stable++;
    else fail("O1", `${q.key}: 순서가 부를 때마다 다르거나 순열이 아님 ${JSON.stringify([a, b, c])}`);
  }
  // O2 — the answer shown first: before (the data's order) and after
  const rows = new Map();
  let firstBefore = 0;
  let firstAfter = 0;
  let expected = 0;
  let variance = 0;
  for (const q of questions) {
    const order = L.optionOrder(q.key, q.n);
    const row = rows.get(q.lesson) || { n: 0, before: 0, after: 0, chance: 1 };
    row.n++;
    row.chance *= 1 / q.n;
    if (q.answer === 0) {
      row.before++;
      firstBefore++;
    }
    if (order[0] === q.answer) {
      row.after++;
      firstAfter++;
    }
    expected += 1 / q.n;
    variance += (1 / q.n) * (1 - 1 / q.n);
    rows.set(q.lesson, row);
  }
  const sigma = Math.sqrt(variance);
  const share = (a, b) => (b ? a / b : 0);
  const list = [...rows.entries()];
  const allFirstBefore = list.filter(([, r]) => r.n >= 2 && r.before === r.n);
  const allFirstAfter = list.filter(([, r]) => r.n >= 2 && r.after === r.n);
  const unlikely = allFirstAfter.filter(([, r]) => r.chance < 0.01);
  for (const [id, r] of unlikely) fail("O2", `${id}: 보기 질문 ${r.n}개의 정답이 모두 첫 자리(우연일 확률 ${r.chance.toExponential(1)})`);
  if (Math.abs(firstAfter - expected) > 3 * sigma) {
    fail("O2", `정답이 첫 자리인 질문 ${firstAfter}/${questions.length} — 기대값 ${expected.toFixed(1)} ± ${(3 * sigma).toFixed(1)}(3σ) 밖`);
  }
  const sharesBefore = list.map(([, r]) => share(r.before, r.n));
  const sharesAfter = list.map(([, r]) => share(r.after, r.n));
  const pct = (x) => `${Math.round(x * 100)}%`;
  const named = (arr, key) => arr.map(([id, r]) => `${id} ${r[key]}/${r.n}`).join(" · ") || "0";
  lines.push(`O1 보기 질문 ${questions.length}개(③ choice ${questions.filter((q) => q.what === "choice").length} · 발견 ${questions.filter((q) => q.what === "discovery").length} · 규칙 확인 ${questions.filter((q) => q.what === "check").length} — ⑤ 는 ② 확인과 같은 순서): 두 번 · 따로 불러도 같은 순서 ${stable}/${questions.length}`);
  lines.push(`O2 정답이 첫 자리: 전 ${firstBefore}/${questions.length}(${pct(share(firstBefore, questions.length))}) → 후 ${firstAfter}/${questions.length}(${pct(share(firstAfter, questions.length))}), 기대값 ${expected.toFixed(1)}(${pct(expected / questions.length)}) ± ${(3 * sigma).toFixed(1)}(3σ)`);
  lines.push(`   레슨마다(보기 질문이 있는 ${list.length}레슨) 최소 · 최대: 전 ${pct(Math.min(...sharesBefore))} · ${pct(Math.max(...sharesBefore))} → 후 ${pct(Math.min(...sharesAfter))} · ${pct(Math.max(...sharesAfter))}`);
  lines.push(`   모든 질문의 정답이 첫 자리인 레슨: 전 ${allFirstBefore.length}(${named(allFirstBefore, "before")}) → 후 ${allFirstAfter.length}${allFirstAfter.length ? `(${named(allFirstAfter, "after")} — 우연 확률 1/100 미만이면 FAIL)` : ""}`);
  for (const id of ["pg11-3", "pg15-2", "pg18-2", "pg20-2"]) {
    const r = rows.get(id);
    if (r) lines.push(`   ${id}: 전 ${r.before}/${r.n} → 후 ${r.after}/${r.n}`);
  }
  // record only — the reserve choice items are not on any page today; FormItemCard would show them in the same way
  const reserve = lessons.flatMap((l) => l.reserve);
  const reserveFirst = (list, after) => list.filter((s) => (after ? L.optionOrder(s.id, s.options.length)[0] : 0) === s.answer).length;
  const pg113 = lessons.find((l) => l.id === "pg11-3").reserve;
  lines.push(`   (기록만) 화면에 안 나오는 reserve choice ${reserve.length}개: 정답 첫 자리 전 ${reserveFirst(reserve, false)} → 후 ${reserveFirst(reserve, true)} · pg11-3 ${reserveFirst(pg113, false)}/${pg113.length} → ${reserveFirst(pg113, true)}/${pg113.length}`);
  if (LIST) for (const [id, r] of list) console.log(`   ${id}  질문 ${r.n} · 첫 자리 전 ${r.before} → 후 ${r.after}`);
  // O3 — graded by the option's own index
  let graded = 0;
  for (const q of questions) {
    const order = L.optionOrder(q.key, q.n);
    const at = order.indexOf(q.answer);
    const ok = order.every((original, place) => {
      const right = q.item ? G.gradeChoice(q.item, original) : original === q.answer;
      return right === (place === at);
    });
    if (ok && at >= 0) graded++;
    else fail("O3", `${q.key}: 보여 준 자리의 원래 번호로 채점하면 정답 자리에서만 맞아야 하는데 아님`);
  }
  lines.push(`O3 채점은 원래 번호로(gradeChoice · 규칙 확인 · 발견 기록): 정답이 보이는 자리의 단추만 맞음 ${graded}/${questions.length}`);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// P — paraphrase pairs
// ════════════════════════════════════════════════════════════════════════════════════════════════
const allPairs = [];
{
  // P1 — the pairs in the lessons
  for (const lesson of lessons) {
    const partners = L.promptPartners([...lesson.produce, ...lesson.transfers]);
    const setOf = new Map();
    L.cutSets(lesson.produce).forEach((set, i) => set.forEach((p) => setOf.set(p.id, i)));
    for (const [b, as] of partners) {
      for (const a of as) {
        allPairs.push({ lesson: lesson.id, a, b, where: setOf.has(a) && setOf.has(b) ? (setOf.get(a) === setOf.get(b) ? "same-set" : "sets") : "transfer" });
        // the queue orders one list: ④'s set on screen, or ⑤. A pair it cannot see —
        //   B in an earlier ④ set than A, or B in ④ with A in ⑤ — would show B first: the content must change
        if (setOf.has(a) && setOf.has(b) && setOf.get(b) < setOf.get(a)) fail("P1", `${a} → ${b}: B 가 A 보다 앞 세트 — 줄 순서로는 막지 못함(내용 확인)`);
        if (!setOf.has(a) && setOf.has(b)) fail("P1", `${a} → ${b}: A 는 ⑤, B 는 ④ — ④ 가 먼저라 B 가 먼저 나옴(내용 확인)`);
        if ((partners.get(a) || []).includes(b)) fail("P1", `${a} ↔ ${b}: 순환`);
      }
    }
  }
  // no pair across lessons (the same text in two lessons)
  const everything = lessons.flatMap((l) => [...l.produce, ...l.transfers]);
  const across = L.promptPartners(everything);
  let crossLesson = 0;
  for (const [b, as] of across) for (const a of as) if (a.split(":")[0] !== b.split(":")[0]) crossLesson++;
  if (crossLesson) fail("P1", `다른 레슨끼리 짝 ${crossLesson}`);
  const want = ["pg19-2:p3>pg19-2:p4", "pg19-2:p7>pg19-2:p8", "pg19-2:p12>pg19-2:p13"];
  for (const w of want) if (!allPairs.some((p) => `${p.a}>${p.b}` === w)) fail("P1", `이끄는 세션이 적은 짝 ${w.replace(">", " → ")} 을 못 찾음`);
  const byLesson = {};
  for (const p of allPairs) (byLesson[p.lesson] = byLesson[p.lesson] || []).push(`${p.a.split(":")[1]}→${p.b.split(":")[1]}`);
  const where = (w) => allPairs.filter((p) => p.where === w).length;
  lines.push(`P1 짝(한 레슨 안 ④ · ⑤ 에서 B.promptEn = A.en) ${allPairs.length}개: ${Object.entries(byLesson).map(([k, v]) => `${k} ${v.join(" ")}`).join(" · ")}`);
  lines.push(`   이끄는 세션이 적은 pg19-2 p3→p4 · p7→p8 · p12→p13 포함 · 같은 세트 ${where("same-set")} · 세트가 갈림 ${where("sets")} · ⑤ 가 든 짝 ${where("transfer")} · 다른 레슨끼리 ${crossLesson}`);
  lines.push(`   (A 가 앵커인 것 — pg05-3 · pg11-4 · pg13-2 · pg19-2 의 a→… — 은 ① 이 일부러 보여 주는 문장이고, 앵커는 ④ 줄에도 복습에도 없어 막을 것이 없음)`);
}

/**
 * The view's ④ · ⑤ queue, answered to the end: `misses(id)` wrong presentations before a right one. `judge` — the pairs a
 * shown sentence is checked against (the lesson's own; `partners` alone orders the queue, so a run without them shows what
 * the queue did before the fix).
 */
function runQueue(ids, partners, misses, stored = null, judge = partners) {
  const w = L.emptyWork();
  w.composeQueue = stored ? [...stored] : null;
  const isDone = (id) => Boolean(w.compose[id] && w.compose[id].done);
  const shown = [];
  for (let guard = 0; guard < 400; guard++) {
    const queue = L.queueOf(w.composeQueue, ids, isDone, partners); // PassoffLearningView: queueOf(work.composeQueue, onScreenSet, composeDone, partners)
    if (!queue.length) return { shown, ended: true };
    const id = queue[0]; // ComposeRun draws the head
    const waitingFor = (judge.get(id) || []).filter((a) => ids.includes(a) && !isDone(a));
    const presentation = (w.compose[id] && w.compose[id].requeues) || 0;
    shown.push({ id, waitingFor });
    L.composeItemDone(w, "composeQueue", queue, id, presentation >= misses(id)); // '다음 문장'
  }
  return { shown, ended: false };
}
const beforeA = (shown) => shown.filter((s) => s.waitingFor.length);

{
  // P2 — the lesson's queue on the real lessons
  let runs = 0;
  let bad = 0;
  let exercised = 0;
  const noPartners = new Map();
  for (const lesson of lessons) {
    const partners = L.promptPartners([...lesson.produce, ...lesson.transfers]);
    if (!partners.size) continue;
    for (const set of L.cutSets(lesson.produce)) {
      const ids = set.map((p) => p.id);
      const pairs = [...partners].flatMap(([b, as]) => as.map((a) => ({ a, b }))).filter((p) => ids.includes(p.a) && ids.includes(p.b));
      for (const { a, b } of pairs) {
        for (let aMiss = 1; aMiss <= 4; aMiss++) {
          for (let bMiss = 0; bMiss <= 1; bMiss++) {
            const misses = (id) => (id === a ? aMiss : id === b ? bMiss : 0);
            const run = runQueue(ids, partners, misses);
            runs++;
            const wrong = beforeA(run.shown);
            if (!run.ended) fail("P2", `${lesson.id} ${a}→${b} (A 틀림 ${aMiss} · B 틀림 ${bMiss}): 줄이 끝나지 않음`);
            if (wrong.length) {
              bad++;
              if (bad <= 5) fail("P2", `${lesson.id} ${a}→${b} (A 틀림 ${aMiss} · B 틀림 ${bMiss}): ${wrong[0].id} 가 ${wrong[0].waitingFor.join(",")} 보다 먼저 나옴 — 차례 ${run.shown.map((s) => s.id.split(":")[1]).join(" ")}`);
            }
            // the same run with the queue as it was before (no pairs): does the case touch the problem at all?
            if (beforeA(runQueue(ids, noPartners, misses, null, partners).shown).length) exercised++;
          }
        }
      }
      // a queue kept on the device before the fix (B ahead of A), opened again
      for (const { a, b } of pairs) {
        const stored = [b, ...ids.filter((id) => id !== a && id !== b), a];
        const run = runQueue(ids, partners, () => 0, stored);
        runs++;
        if (beforeA(run.shown).length) {
          bad++;
          fail("P2", `${lesson.id}: 옛 저장 줄 ${stored.map((id) => id.split(":")[1]).join(" ")} 을 다시 열었더니 ${b} 가 ${a} 보다 먼저`);
        }
      }
    }
  }
  if (bad > 5) fail("P2", `… B 가 먼저 나온 풀이가 모두 ${bad}`);
  if (!exercised) fail("P2", "짝을 안 보는 줄로도 B 가 먼저 나온 풀이 0 — 이 경우들이 문제를 건드리지 않음(시험을 고칠 것)");
  lines.push(`P2 ④ 다시 풀기 줄(화면과 같은 queueOf(…, partners) → 머리 → composeItemDone, 끝까지): 풀이 ${runs}번 · A 가 아직 줄에 있는데 B 가 나옴 ${bad} (같은 경우를 고치기 전 줄로 풀면 ${exercised}번이 B 먼저 — 경우가 문제를 실제로 건드림)`);

  // P2 — made-up lessons: the corners
  const P = (id, en, promptEn = null, challenge = false) => ({ id, en, promptEn, ko: "가", challenge });
  const synth = [];
  {
    // A is a challenge: the set puts it last, B came before it
    const items = [P("zz01-1:p1", "Is it a dog?"), P("zz01-1:p2", "Yes, it is.", "Is it a dog?"), P("zz01-1:p3", "Tom was here.")];
    items[0].challenge = true;
    const set = L.cutSets(items)[0].map((p) => p.id);
    const partners = L.promptPartners(items);
    const shown = runQueue(set, partners, () => 0).shown.map((s) => s.id.split(":")[1]).join(" ");
    synth.push(["A 가 도전(세트 끝)", shown, shown === "p3 p1 p2"]);
  }
  {
    // a chain A → B → C, stored backwards
    const items = [P("zz02-1:p1", "He is old."), P("zz02-1:p2", "Old, he is.", "He is old."), P("zz02-1:p3", "Is he old?", "Old, he is.")];
    const partners = L.promptPartners(items);
    const got = L.orderAfterPartners(["zz02-1:p3", "zz02-1:p2", "zz02-1:p1"], (x) => x, partners).map((x) => x.split(":")[1]).join(" ");
    synth.push(["사슬 A→B→C(거꾸로 둔 줄)", got, got === "p1 p2 p3"]);
    const miss = runQueue(items.map((p) => p.id), partners, (id) => (id.endsWith("p1") ? 2 : 0));
    synth.push(["사슬 · A 두 번 틀림", miss.shown.map((s) => s.id.split(":")[1]).join(" "), beforeA(miss.shown).length === 0 && miss.ended]);
  }
  {
    // a cycle: never in the data — kept, and the queue still ends
    const items = [P("zz03-1:p1", "A one.", "B two."), P("zz03-1:p2", "B two.", "A one."), P("zz03-1:p3", "C three.")];
    const partners = L.promptPartners(items);
    const got = L.orderAfterPartners(items.map((p) => p.id), (x) => x, partners).map((x) => x.split(":")[1]).join(" ");
    const run = runQueue(items.map((p) => p.id), partners, () => 0);
    synth.push(["순환(데이터에 없음)", got, got === "p3 p1 p2" && run.ended && run.shown.length === 3]);
  }
  {
    // two B for one A; an A that is not in the list; the same text in another lesson; spacing only
    const items = [P("zz04-1:p1", "It is  far, isn't it?"), P("zz04-1:p2", "Yes, it is.", " It is far, isn't it? "), P("zz04-1:p3", "No, it isn't.", "It is far, isn't it?"), P("zz05-1:p1", "Yes.", "It is far, isn't it?")];
    const partners = L.promptPartners(items);
    const pairs = [...partners].map(([b, as]) => `${as.join("+")}→${b}`).join(" · ");
    synth.push(["B 둘 · 띄어쓰기만 다른 글 · 다른 레슨은 짝 아님", pairs, pairs === "zz04-1:p1→zz04-1:p2 · zz04-1:p1→zz04-1:p3"]);
    const got = L.orderAfterPartners(["zz04-1:p3", "zz04-1:p2", "zz04-1:p1"], (x) => x, partners).map((x) => x.split(":")[1]).join(" ");
    synth.push(["B 둘은 A 뒤에 원래 차례대로", got, got === "p1 p3 p2"]);
    const absent = L.orderAfterPartners(["zz04-1:p3", "zz04-1:p2"], (x) => x, partners).map((x) => x.split(":")[1]).join(" ");
    synth.push(["A 가 줄에 없으면 B 는 제자리", absent, absent === "p3 p2"]);
  }
  {
    // ⑤: the transfer queue goes through the same queueOf
    const items = [P("zz06-1:t1", "She can swim."), P("zz06-1:t2", "Can she swim?", "She can swim.")];
    const partners = L.promptPartners(items);
    const run = runQueue(items.map((p) => p.id), partners, (id) => (id.endsWith("t1") ? 1 : 0));
    synth.push(["⑤ 줄(같은 queueOf) · A 한 번 틀림", run.shown.map((s) => s.id.split(":")[1]).join(" "), beforeA(run.shown).length === 0]);
  }
  for (const [name, got, ok] of synth) if (!ok) fail("P2", `합성 레슨 — ${name}: ${got}`);
  lines.push(`   합성 레슨 ${synth.filter((s) => s[2]).length}/${synth.length}: ${synth.map(([name, got]) => `${name} → ${got}`).join(" / ")}`);
}

{
  // P3 — today's review: the engine's plan → orderReviewPlan (PassoffReview orderItems) → ReviewSession's segmentsOf
  const PROFILE = { course: "passoff-grammar", secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 }, elementKinds: ["select", "choice", "short"] };
  const WIDE = { ...PROFILE, budgetSeconds: 1e9 };
  const DAY = 86_400_000;
  const NOW = Date.UTC(2026, 8, 28, 3, 0, 0); // 12:00 Korea time
  const today = D.learningDay(NOW);
  const byLesson = new Map(lessons.map((l) => [l.id, l]));
  /** the review's data of an item, as passoffReview.ts gives it */
  const data = {};
  for (const l of lessons) {
    for (const item of l.produce) data[item.id] = { lessonId: l.id, kind: "produce", item };
    for (const item of l.transfers) data[item.id] = { lessonId: l.id, kind: "transfer", item };
    for (const item of l.forms) data[item.id] = { lessonId: l.id, kind: item.kind, item };
  }
  /** PassoffReview's orderItems, word for word */
  const isSentence = (d) => d.kind === "produce" || d.kind === "transfer";
  const orderItems = (entries, items) =>
    L.orderReviewPlan(entries, (key) => {
      const found = items[key];
      return found && isSentence(found) ? found.item : null;
    });
  /** a finished lesson's entries in PassoffLearningView finish's order (④ · ⑤ · ③), '내일 1순위' first (notePassoffLessonDone) */
  const entriesOf = (id, first = []) => {
    const l = byLesson.get(id);
    const all = [...l.produce.map((p) => ({ key: p.id, kind: "produce" })), ...l.transfers.map((t) => ({ key: t.id, kind: "transfer" })), ...l.forms.map((f) => ({ key: f.id, kind: f.kind }))];
    return [...all.filter((e) => first.includes(e.key)), ...all.filter((e) => !first.includes(e.key))];
  };
  const answer = (record, key, correct, atMs) =>
    E.applyAttempt(record, key, { lessonId: key.split(":")[0], kind: record.items[key].kind, correct, help: "none", mode: "typed", where: "review" }, atMs, PROFILE);
  /** the screen's order of first presentations: each lesson's next-day test, then the practice items */
  const shownOrder = (plan, record, ordered) => {
    const p = ordered ? { ...plan, items: orderItems(plan.items, data) } : plan;
    return segmentsOf(p, data, record, today).flatMap((s) => s.entries.map((e) => ({ key: e.entry.key, mode: s.kind })));
  };
  const pairs = allPairs;
  const notes = [];
  const violations = (shown) => {
    const at = new Map(shown.map((s, i) => [s.key, i]));
    return pairs.filter((p) => at.has(p.a) && at.has(p.b) && at.get(p.b) < at.get(p.a)).map((p) => `${p.b.split(":")[1]}<${p.a.split(":")[1]}`);
  };
  const scenarios = [];
  const scenario = (name, record, profile, expect = {}) => {
    const plan = E.planDay(record, today, profile);
    const raw = shownOrder(plan, record, false);
    const shown = shownOrder(plan, record, true);
    const keysSame = same([...raw.map((s) => s.key)].sort(), [...shown.map((s) => s.key)].sort());
    const v = violations(shown);
    const vBefore = violations(raw);
    scenarios.push({ name, v, vBefore, keysSame, count: shown.length, shown, raw, expect });
    if (v.length) fail("P3", `${name}: B 가 A 보다 먼저 ${v.join(" ")}`);
    if (!keysSame) fail("P3", `${name}: 차례를 바꾸면서 문항이 빠지거나 늘어남`);
    if (expect.touches && !vBefore.length) fail("P3", `${name}: 고치기 전 차례로도 B 먼저가 없음 — 이 경우가 문제를 건드리지 않음(시험을 고칠 것)`);
    return { plan, shown, raw };
  };

  // (a) '내일 1순위' — the three B of pg19-2 went into the record first
  {
    const r = E.emptyRecord("passoff-grammar");
    E.applyLessonDone(r, "pg19-2", NOW - DAY, entriesOf("pg19-2", ["pg19-2:p4", "pg19-2:p8", "pg19-2:p13"]));
    scenario("(a) pg19-2 다음 날 확인 — '내일 1순위' B 셋이 먼저 들어옴", r, PROFILE, { touches: true });
  }
  // (b) the check left half done yesterday: p3 (A) answered wrong → again today; p4 (B) never answered → still next-day.
  //     p7 (A) answered right → not due today, so p8 (B) stays in the check (its A is not in this session)
  {
    const r = E.emptyRecord("passoff-grammar");
    E.applyLessonDone(r, "pg19-2", NOW - 2 * DAY, entriesOf("pg19-2"));
    answer(r, "pg19-2:p1", true, NOW - DAY);
    answer(r, "pg19-2:p3", false, NOW - DAY);
    answer(r, "pg19-2:p7", true, NOW - DAY);
    const { shown } = scenario("(b) pg19-2 확인을 반쯤 하다 그만둠 — A(p3)는 again, B(p4)는 아직 다음 날 확인", r, PROFILE, { touches: true });
    const mode = new Map(shown.map((s) => [s.key, s.mode]));
    if (mode.get("pg19-2:p4") !== "practice") fail("P3", `(b) p4 가 A(p3) 와 함께 복습 쪽으로 가지 않음 — ${mode.get("pg19-2:p4")}`);
    if (mode.get("pg19-2:p8") !== "test") fail("P3", `(b) A(p7)가 오늘 없는 p8 이 다음 날 확인에서 빠짐 — ${mode.get("pg19-2:p8")}`);
    if (mode.get("pg19-2:p2") !== "test") fail("P3", `(b) A(p1)가 오늘 없는 p2 가 다음 날 확인에서 빠짐 — ${mode.get("pg19-2:p2")}`);
  }
  // (c) pg05-3: B (p2 · p3 · p5) wrong last time → again; A (p1 · p4) right → review; all due today
  {
    const r = E.emptyRecord("passoff-grammar");
    E.applyLessonDone(r, "pg05-3", NOW - 4 * DAY, entriesOf("pg05-3").filter((e) => /:p[1-6]$/.test(e.key)));
    for (const k of ["p1", "p4", "p6"]) answer(r, `pg05-3:${k}`, true, NOW - 3 * DAY);
    for (const k of ["p2", "p3", "p5"]) answer(r, `pg05-3:${k}`, false, NOW - 3 * DAY);
    scenario("(c) pg05-3 — B(p2 · p3 · p5)는 again(앞), A(p1 · p4)는 review(뒤)", r, PROFILE, { touches: true });
  }
  // (d) pg13-2: A (p1 · p3) right yesterday, so not due today — B (p2 · p4, wrong) come, and nothing moves
  {
    const r = E.emptyRecord("passoff-grammar");
    E.applyLessonDone(r, "pg13-2", NOW - 3 * DAY, entriesOf("pg13-2").filter((e) => /:p[1-4]$/.test(e.key)));
    answer(r, "pg13-2:p1", true, NOW - DAY);
    answer(r, "pg13-2:p3", true, NOW - DAY);
    answer(r, "pg13-2:p2", false, NOW - 2 * DAY);
    answer(r, "pg13-2:p4", false, NOW - DAY);
    const plan = E.planDay(r, today, PROFILE);
    const ordered = orderItems(plan.items, data);
    const unchanged = same(ordered, plan.items);
    scenarios.push({ name: "(d) pg13-2 — A 가 오늘 없음(B 만 옴)", v: unchanged ? [] : ["바뀜"], vBefore: [], keysSame: true, count: plan.items.length, shown: [], raw: [] });
    if (!unchanged) fail("P3", `(d) A 가 오늘 없는데 계획이 바뀜: ${JSON.stringify(plan.items.map((i) => i.key))} → ${JSON.stringify(ordered.map((i) => i.key))}`);
    if (!plan.items.some((i) => i.key === "pg13-2:p2") || plan.items.some((i) => i.key === "pg13-2:p1")) fail("P3", "(d) 시험 기록이 뜻한 대로가 아님(p2 만 와야)");
  }
  // (e) all 67 lessons finished yesterday, every B first — nothing else moves, nothing is lost
  {
    const r = E.emptyRecord("passoff-grammar");
    const firsts = new Set(allPairs.map((p) => p.b));
    for (const l of lessons) E.applyLessonDone(r, l.id, NOW - DAY, entriesOf(l.id, [...firsts].filter((k) => k.startsWith(`${l.id}:`))));
    const { shown, raw } = scenario("(e) 67레슨 모두 어제 끝냄(B 가 먼저 들어옴) — 하루 한도 없이", r, WIDE, { touches: true });
    const moved = new Set(allPairs.map((p) => p.b));
    const rest = (list) => list.filter((s) => !moved.has(s.key)).map((s) => s.key);
    if (!same(rest(shown), rest(raw))) fail("P3", "(e) 짝의 B 가 아닌 문항의 차례가 바뀜");
    const plain = E.planDay(r, today, WIDE);
    const noPairLessons = plain.items.filter((i) => !allPairs.some((p) => p.lesson === i.lessonId));
    const orderedNoPair = orderItems(noPairLessons, data);
    if (!same(orderedNoPair, noPairLessons)) fail("P3", "(e) 짝이 없는 레슨들의 계획이 바뀜");
    notes.push(`   (e) 보여 주는 문항 ${shown.length}개 · 짝의 B 가 아닌 문항 ${rest(shown).length}개의 차례 그대로 · 짝 없는 레슨만의 계획은 글자까지 그대로(${noPairLessons.length}문항)`);
  }
  lines.push(`P3 오늘 복습(엔진 planDay → orderReviewPlan → ReviewSession.tsx 의 segmentsOf 를 파일에서 그대로): 경우 ${scenarios.length}가지 · B 가 A 보다 먼저 ${scenarios.reduce((n, s) => n + s.v.length, 0)}`);
  for (const s of scenarios) {
    lines.push(`   ${s.v.length ? "FAIL" : "ok  "} ${s.name}: 보여 주는 ${s.count}문항 · B 가 A 보다 먼저 ${s.v.length}${s.expect && s.expect.touches ? ` (고치기 전 차례로는 ${s.vBefore.length}: ${s.vBefore.slice(0, 4).join(" ")}${s.vBefore.length > 4 ? " …" : ""})` : ""}`);
  }
  lines.push(...notes);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// wiring — the screens call what this check runs (text; the TSX is not run here — the browser drives run it)
// ════════════════════════════════════════════════════════════════════════════════════════════════
{
  const need = [
    ["O4", "src/components/passoff/FormStep.tsx", ["optionOrder(item.id, item.options.length).map((i) => {", "const option = item.options[i];", "data-option={i}", "onClick={() => chooseOption(i)}"], ["item.options.map("]],
    ["O4", "src/components/passoff/RuleStep.tsx", ['optionOrder(ruleQuestionKey(lessonId, "discovery"), d.options.length).map((i) => {', "onClick={() => onDiscovery(i)}", "optionOrder(orderKey, check.options.length).map((i) => {", "onClick={() => choose(i)}", 'orderKey={ruleQuestionKey(lessonId, "check")}', "data-option={i}"], ["d.options.map(", "check.options.map("]],
    ["O4", "src/components/passoff/WrapUpStep.tsx", ['orderKey={ruleQuestionKey(lessonId, "check")}'], []],
    ["O4", "src/components/PassoffLearningView.tsx", ["lessonId={lessonId}"], []],
    ["T4", "src/components/passoff/ComposeCard.tsx", ["setBank(wordTiles(generateWordBank(item.en, pool), pool));"], ["contrastTiles("]],
    ["P4", "src/components/PassoffLearningView.tsx", ["promptPartners([...content.produce, ...content.transfers])", "queueOf(work.composeQueue, onScreenSet, composeDone, partners)", "queueOf(work.transferQueue, transferIds, composeDone, partners)"], []],
    ["P4", "src/components/passoff/PassoffReview.tsx", ["orderReviewPlan(entries, (key) => {", "return found && isSentence(found) ? found.item : null;", "    orderItems,\n"], []],
    ["P4", "src/components/learning/ReviewSession.tsx", ["segmentsOf(orderItems ? { ...plan, items: orderItems(plan.items, items) } : plan, items, record, today)"], []],
  ];
  let ok = 0;
  let total = 0;
  for (const [section, rel, must, mustNot] of need) {
    const text = sourceOf(rel);
    for (const s of must) {
      total++;
      if (text.includes(s)) ok++;
      else fail(section, `${rel}: "${s.trim()}" 이 없음 — 화면이 이 검사가 돌린 함수를 부르지 않음`);
    }
    for (const s of mustNot) {
      total++;
      if (!text.includes(s)) ok++;
      else fail(section, `${rel}: "${s}" 이 남음 — 고치기 전 길`);
    }
  }
  lines.push(`O4 · T4 · P4 화면 연결(글): ${ok}/${total}`);
}

console.log(`check-screen-fixes — 레슨 ${lessons.length}${BREAK ? ` (깨기 --break=${BREAK})` : ""}`);
for (const l of lines) console.log(l);
if (LIST) for (const p of allPairs) console.log(`   짝 ${p.a} → ${p.b}`);
if (fails.length) {
  console.log(`\nFAIL ${fails.length}:`);
  for (const f of fails.slice(0, LIST ? fails.length : 40)) console.log(`  FAIL ${f}`);
  if (!LIST && fails.length > 40) console.log(`  … (--list 로 전부)`);
  if (BREAK) console.log(`\n(깨기 --break=${BREAK}: FAIL 이 나야 맞음 — 검사가 실패할 수 있음을 보임)`);
  process.exit(1);
}
console.log("\nPASS");
