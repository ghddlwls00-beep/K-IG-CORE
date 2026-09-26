#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — the free preview gives away no paid sentence (설계 §7, D4).
 *
 * WHY A CHECK OF ITS OWN. pg01-1 (1인칭) is free, and eight of its sentences come from paid STUDENT
 * chapters. They are kept out of its file (src/lib/passoffSupplement.ts). The site's leak checks
 * cannot see a mistake here: scripts/paidLeakCheck.mjs and probe-bundle-leak-all.cjs count every
 * string of a FREE lesson as public, so a paid sentence copied into a free lesson simply stops
 * being one of the strings they look for. This check looks from the other side.
 *
 * PAID SENTENCES — STUDENT's alone until the 2026-09-27 review showed a paid GRAMMAR sentence (설계 §3 ⑤
 * recommends GRAMMAR I·II sentences for step ⑤) put into pg01-2 passed:
 *   - every string of every paid lesson of every OTHER course whose flat form is 20 characters or longer —
 *     the audit's own needles (scripts/paidLeakCheck.mjs paidNeedles), asked with the free PASS-OFF lessons
 *     NOT counted as public, since they are what is checked;
 *   - every English sentence (as written, and in the first "He/She" form STUDENT says) and every Korean
 *     line of every paid STUDENT lesson, at ANY length (the textbook shares STUDENT's short sentences);
 *   - every item held back in content/private/passoff-grammar/*.paid.json (en · ko · promptEn · accept), at any length;
 *   minus what a free lesson of another course already shows or speaks — that is public anyway.
 *   PASS-OFF GRAMMAR's own paid lessons are not needles: inside one course, a sentence a free lesson shows is
 *   that free lesson's own (the site's leak rule, above), and which lessons are free is the course's decision
 *   (D4). The held-back items are the exception the course made on purpose, so they are needles.
 *
 * WHAT MUST BE ZERO
 *   A. in the free PASS-OFF lesson files: a string equal to a paid sentence of the any-length kinds, or a run of
 *      20 characters shared with any paid needle (the audit's flat form: letters, digits and Hangul, case
 *      ignored). A list of strings — ③'s `tokens` — is also read joined, as the screen puts the sentence
 *      together: token by token, "Sometimes I watch TV …" was never a string of its own and passed;
 *   B. the clip keys of a paid sentence — what every paid lesson of every other course speaks
 *      (scripts/lib/spoken-texts.cjs, hashed as the browser does — src/lib/unifiedSpeech.ts), the STUDENT
 *      sentences above and the held-back items — among the clips the free PASS-OFF lessons speak and among
 *      src/lib/generated/freeSpeechKeys.json.
 *
 *   node scripts/checkPassoffFreeLeak.mjs
 *   node scripts/checkPassoffFreeLeak.mjs --break=restore   일부러 깨기: 보충 문항을 무료 레슨에 되돌려 넣음(메모리) → FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --break=keys      일부러 깨기: 유료 STUDENT 문장 클립 키 하나를 무료 목록에 넣음(메모리) → FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --break=tokens    일부러 깨기: 표시 안 한 유료 STUDENT 문장을 무료 레슨 ③ 의 tokens 로 쪼개 넣음(메모리) → FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --break=grammar   일부러 깨기: 유료 GRAMMAR I 문장을 무료 레슨 ⑤ 에 넣음(메모리) → 글 · 소리 모두 FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --content <dir>   다른 content 폴더의 무료 레슨 · 보충 파일로(lessons/ · private/ 아래) —
 *                                                           시험용 사본이나 보충 문항을 파일에 되돌려 넣은 사본으로 깨 볼 때
 * exit 1 on any hit, and when a break has nothing to break.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { paidNeedles } from "./paidLeakCheck.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const COURSE = "passoff-grammar";
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const CONTENT = arg("--content") ? path.resolve(arg("--content")) : path.join(ROOT, "content");
const LESSON_DIR = path.join(CONTENT, "lessons", COURSE);
const PRIVATE_DIR = path.join(CONTENT, "private", COURSE);
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["restore", "keys", "tokens", "grammar"].includes(BREAK)) throw new Error(`unknown --break=${BREAK}`);
const MIN = 20;

const req = createRequire(import.meta.url);
const { spokenTexts, pairIdOf } = req(path.join(ROOT, "scripts", "lib", "spoken-texts.cjs"));

/** Only modules without runtime imports can be transpiled alone — as buildFreeSpeechKeys.mjs loads them. */
function loadTsModule(relativePath) {
  const ts = req(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, req);
  return mod.exports;
}
const { FREE_PREVIEW_LESSON_IDS, isFreePreviewLesson } = loadTsModule("src/lib/license.ts");
const { normalizeUnifiedSpeechText, unifiedSpeechKey } = loadTsModule("src/lib/unifiedSpeech.ts");
const { vocaSpeechForm, vocaWordSpeech, readingWordSpeech } = loadTsModule("src/lib/vocaSpeech.ts");
const { getCollocation } = loadTsModule("src/lib/vocaUtils.ts");
const { generateLiaisonPoints, firstSlashAlternative } = loadTsModule("src/lib/listeningUtils.ts");
const { extractSentencesForAudio } = loadTsModule("src/lib/lessonAudioText.ts");
const { lessonSpeechForm } = loadTsModule("src/lib/lessonSpeechForm.ts");
const { attachPaidItems } = loadTsModule("src/lib/passoffSupplement.ts");
const fns = { vocaSpeechForm, getCollocation, generateLiaisonPoints, extractSentencesForAudio, firstSlashAlternative, vocaWordSpeech, readingWordSpeech, lessonSpeechForm };
for (const [name, fn] of Object.entries({ ...fns, normalizeUnifiedSpeechText, unifiedSpeechKey, isFreePreviewLesson, attachPaidItems })) {
  if (typeof fn !== "function") throw new Error(`${name} did not load — this check would pass on nothing`);
}

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
const lessonFile = (course, id) => path.join(ROOT, "content", "lessons", course, `${id}.json`);
/** the audit's flat form (paidLeakCheck.mjs · probe-bundle-leak-all.cjs), case ignored */
const flat = (s) => String(s || "").replace(/[^A-Za-z0-9가-힣]+/g, "").toLowerCase();
/** the clip key the browser asks for — buildFreeSpeechKeys.mjs's own two steps */
const keyOf = (text) => {
  const clean = normalizeUnifiedSpeechText(vocaSpeechForm(String(text)));
  return clean && /[A-Za-z가-힣]/.test(clean) ? unifiedSpeechKey(clean) : null;
};
/** every string, and every list of strings joined as well — a sentence cut into ③'s tokens is still that sentence */
function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) {
    for (const x of v) collectStrings(x, out);
    if (v.length > 1 && v.every((x) => typeof x === "string")) out.push(v.join(" "));
  } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}

const routes = readJson(path.join(ROOT, "src", "lib", "generated", "validRoutes.json"));
const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json")) || {};
const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json")) || {};
const indexes = {};
const spokenOf = (course, id, lesson) => {
  const index = (indexes[course] ||= readJson(path.join(ROOT, "content", "courses", `${course}.json`))?.lessons || []);
  const pairId = pairIdOf(course, id, index);
  const pair = pairId ? { id: pairId, ...(readJson(lessonFile(course, pairId)) || {}) } : null;
  return spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns });
};

// --- what is public anyway: the free lessons of the other courses ------------------------------
const publicFlat = new Set();
const publicKeys = new Set();
for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
  if (course === COURSE) continue;
  for (const id of ids) {
    const lesson = readJson(lessonFile(course, id));
    if (!lesson) continue;
    const strings = [];
    collectStrings(lesson, strings);
    for (const s of strings) publicFlat.add(flat(s));
    if (course !== "cnn") for (const t of spokenOf(course, id, lesson)) { const k = keyOf(t); if (k) publicKeys.add(k); }
  }
}

// --- the paid sentences ------------------------------------------------------------------------
const paid = []; // { from, text, f } — matched whole at any length, and by 20-character runs
const paidKeys = new Map(); // key → from
const addPaid = (from, text) => {
  if (typeof text !== "string" || !text.trim()) return;
  const f = flat(text);
  if (f && !publicFlat.has(f)) paid.push({ from, text, f });
};
const addPaidKey = (from, text) => {
  const k = keyOf(text);
  if (k && !publicKeys.has(k) && !paidKeys.has(k)) paidKeys.set(k, `${from}: ${String(text).slice(0, 60)}`);
};
let paidStudentLessons = 0;
const paidStudentSentences = []; // { id, text } — for --break=tokens
for (const id of routes?.lessons?.student || []) {
  if (isFreePreviewLesson("student", id)) continue;
  const lesson = readJson(lessonFile("student", id));
  if (!lesson) continue;
  paidStudentLessons++;
  for (const b of lesson.blocks || []) {
    if (b.type === "sentences") for (const it of b.items || []) {
      if (typeof it?.text !== "string") continue;
      addPaid(`student/${id}`, it.text);
      addPaid(`student/${id}`, firstSlashAlternative(it.text));
      addPaidKey(`student/${id}`, it.text);
      addPaidKey(`student/${id}`, firstSlashAlternative(it.text));
      paidStudentSentences.push({ id, text: firstSlashAlternative(it.text) });
    }
    if (b.type === "paragraph" && b.lang === "ko") { addPaid(`student/${id}`, b.text); addPaidKey(`student/${id}`, b.text); }
  }
}
const supplements = {};
for (const f of fs.existsSync(PRIVATE_DIR) ? fs.readdirSync(PRIVATE_DIR).filter((x) => x.endsWith(".paid.json")) : []) {
  const s = readJson(path.join(PRIVATE_DIR, f));
  const lessonId = f.replace(/\.paid\.json$/, "");
  supplements[lessonId] = s;
  for (const e of s?.items || []) {
    const it = e.item || {};
    const from = `private/${lessonId} ${it.id}`;
    for (const t of [it.en, it.ko, it.promptEn, ...(Array.isArray(it.accept) ? it.accept : [])]) addPaid(from, t);
    if (typeof it.en === "string") { addPaidKey(from, it.en); addPaidKey(from, lessonSpeechForm(`${COURSE}/${lessonId}`, it.en)); }
  }
}
// every paid lesson of every other course: its 20-character needles (the audit's) and what it speaks
const courseNeedles = [];
for (const { course, id, needles } of paidNeedles({ publicExcept: [COURSE] })) {
  if (course === COURSE && !/\(held back\)$/.test(id)) continue; // PASS-OFF's own paid lessons — see the header
  for (const n of needles) if (!publicFlat.has(n.f)) courseNeedles.push({ from: `${course}/${id}`, text: n.raw, f: n.f });
}
const paidCourseLessons = {};
const paidGrammarSentences = []; // { id, text } — for --break=grammar
for (const [course, ids] of Object.entries(routes?.lessons || {})) {
  if (course === COURSE || course === "cnn") continue;
  for (const id of ids) {
    if (isFreePreviewLesson(course, id)) continue;
    const lesson = readJson(lessonFile(course, id));
    if (!lesson) continue;
    paidCourseLessons[course] = (paidCourseLessons[course] || 0) + 1;
    for (const t of spokenOf(course, id, lesson)) {
      addPaidKey(`${course}/${id}`, t);
      if (course === "grammar1" && /^[A-Z][^()/\[\]]*[.?!]$/.test(String(t).trim()) && flat(t).length >= MIN) paidGrammarSentences.push({ id, text: String(t).trim() });
    }
  }
}

// --- the free PASS-OFF lessons -------------------------------------------------------------------
const freeIds = [...(FREE_PREVIEW_LESSON_IDS[COURSE] || [])];
const freeLessons = [];
let restored = 0;
for (const id of freeIds) {
  const lesson = readJson(path.join(LESSON_DIR, `${id}.json`));
  if (!lesson) {
    console.error(`!!! free lesson ${COURSE}/${id} has no file in ${path.relative(ROOT, LESSON_DIR) || "."} — nothing to check`);
    process.exit(1);
  }
  if (BREAK === "restore" && supplements[id]?.items?.length) {
    lesson.blocks = attachPaidItems(lesson.blocks || [], supplements[id].items);
    restored += supplements[id].items.length;
  }
  freeLessons.push({ id, lesson });
}
if (BREAK === "restore") {
  if (!restored) { console.error("!!! --break=restore: no held-back item to put back — the break proves nothing"); process.exit(1); }
  console.log(`[일부러 깸] 보충 문항 ${restored}개를 무료 레슨에 되돌려 넣음(메모리)`);
}
const heldTexts = new Set(Object.values(supplements).flatMap((s) => (s?.items || []).map((e) => flat(e.item?.en))));
const lastFree = freeLessons[freeLessons.length - 1];
const drillOf = (lesson) => (lesson.blocks || []).find((b) => b && b.type === "drill") || (lesson.blocks.push({ type: "drill" }), lesson.blocks[lesson.blocks.length - 1]);
if (BREAK === "tokens") {
  // a paid STUDENT sentence nobody marked (not held back), cut into ③ tokens as a select item would have it
  const pick = paidStudentSentences.find((s) => flat(s.text).length >= 30 && !heldTexts.has(flat(s.text)) && !publicFlat.has(flat(s.text)));
  if (!pick) { console.error("!!! --break=tokens: no paid STUDENT sentence to plant"); process.exit(1); }
  const tokens = pick.text.match(/[A-Za-z0-9'’]+|[^\sA-Za-z0-9'’]/g);
  const drill = drillOf(lastFree.lesson);
  drill.select = [...(drill.select || []), { id: `${lastFree.id}:s99`, kind: "select", instruction: "(일부러 깸)", tokens, answer: [0] }];
  console.log(`[일부러 깸] 유료 STUDENT ${pick.id} 문장을 ${lastFree.id} ③ tokens ${tokens.length}개로 넣음(메모리): ${pick.text}`);
}
if (BREAK === "grammar") {
  // a paid GRAMMAR I sentence (what the lesson speaks) into ⑤, as a transfer sentence taken from GRAMMAR would be
  const pick = paidGrammarSentences.find((s) => !publicFlat.has(flat(s.text)));
  if (!pick) { console.error("!!! --break=grammar: no paid GRAMMAR I sentence to plant"); process.exit(1); }
  const drill = drillOf(lastFree.lesson);
  drill.transfer = [...(drill.transfer || []), { id: `${lastFree.id}:t99`, ko: "(일부러 깸)", en: pick.text, source: `grammar1:${pick.id}` }];
  console.log(`[일부러 깸] 유료 GRAMMAR I ${pick.id} 문장을 ${lastFree.id} ⑤ 에 넣음(메모리): ${pick.text}`);
}

// A. text
const hits = [];
const runNeedles = [...paid.filter((p) => p.f.length >= MIN), ...courseNeedles];
for (const { id, lesson } of freeLessons) {
  const strings = [];
  collectStrings(lesson, strings);
  const flats = strings.map((s) => ({ s, f: flat(s) })).filter((x) => x.f);
  const exact = new Map(flats.map((x) => [x.f, x.s]));
  const windows = new Map();
  for (const x of flats) for (let i = 0; i + MIN <= x.f.length; i++) if (!windows.has(x.f.slice(i, i + MIN))) windows.set(x.f.slice(i, i + MIN), x.s);
  const seen = new Set();
  for (const p of paid) {
    if (exact.has(p.f) && !seen.has(p.f)) { seen.add(p.f); hits.push({ lesson: id, kind: "문장", paid: p.from, text: p.text }); }
  }
  for (const p of runNeedles) {
    if (seen.has(p.f)) continue;
    for (let i = 0; i + MIN <= p.f.length; i++) {
      const w = p.f.slice(i, i + MIN);
      if (windows.has(w)) { seen.add(p.f); hits.push({ lesson: id, kind: "20자 조각", paid: p.from, text: p.text, free: windows.get(w) }); break; }
    }
  }
}

// B. clips
const spokenKeys = new Map(); // key → lesson
for (const { id, lesson } of freeLessons) for (const t of spokenOf(COURSE, id, lesson)) { const k = keyOf(t); if (k) spokenKeys.set(k, `${id}: ${String(t).slice(0, 60)}`); }
const freeFile = readJson(path.join(ROOT, "src", "lib", "generated", "freeSpeechKeys.json"));
const listed = new Set(freeFile?.keys || []);
if (BREAK === "keys") {
  const [k, from] = paidKeys.entries().next().value || [];
  if (!k) { console.error("!!! --break=keys: no paid clip key to plant"); process.exit(1); }
  listed.add(k);
  console.log(`[일부러 깸] 유료 문장 클립 키 하나를 무료 목록(메모리)에 넣음: ${from}`);
}
const clipHits = [];
for (const [k, from] of paidKeys) {
  if (spokenKeys.has(k)) clipHits.push({ where: `무료 레슨이 소리 냄 (${spokenKeys.get(k)})`, paid: from });
  if (listed.has(k)) clipHits.push({ where: "freeSpeechKeys.json", paid: from });
}

// --- report --------------------------------------------------------------------------------------
const held = Object.values(supplements).reduce((n, s) => n + (s?.items?.length || 0), 0);
const courseCounts = Object.entries(paidCourseLessons).map(([c, n]) => `${c} ${n}`).join(" · ");
console.log(
  `checkPassoffFreeLeak — 무료 레슨 ${freeLessons.map((l) => l.id).join(" · ")} · 유료 STUDENT 강의 ${paidStudentLessons} · ` +
    `유료 문장(길이 무관) ${paid.length} · 다른 과정 유료 20자 바늘 ${courseNeedles.length} · 유료 클립 키 ${paidKeys.size}(유료 강의 ${courseCounts}) · ` +
    `보충 파일 문항 ${held} · 무료 레슨이 소리 내는 키 ${spokenKeys.size} · freeSpeechKeys ${listed.size}`,
);
for (const h of hits.slice(0, 12)) console.log(`  글 ${h.lesson} ${h.kind} ← ${h.paid}: ${h.text.slice(0, 70)}${h.free ? `  (무료 글: ${h.free.slice(0, 50)})` : ""}`);
for (const h of clipHits.slice(0, 12)) console.log(`  소리 ${h.where} ← ${h.paid}`);
const fail = hits.length + clipHits.length;
console.log(`${fail ? "FAIL" : "PASS"} — 무료 글 속 유료 문장 ${hits.length} · 무료 소리 속 유료 클립 ${clipHits.length}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
process.exit(fail ? 1 : 0);
