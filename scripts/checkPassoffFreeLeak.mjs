#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — the free preview gives away no paid STUDENT sentence (설계 §7, D4).
 *
 * WHY A CHECK OF ITS OWN. pg01-1 (1인칭) is free, and seven of its sentences come from paid STUDENT
 * chapters. They are kept out of its file (src/lib/passoffSupplement.ts). The site's leak checks
 * cannot see a mistake here: scripts/paidLeakCheck.mjs and probe-bundle-leak-all.cjs count every
 * string of a FREE lesson as public, so a paid sentence copied into a free lesson simply stops
 * being one of the strings they look for. This check looks from the other side.
 *
 * PAID SENTENCES
 *   - every English sentence (as written, and in the first "He/She" form STUDENT says) and every
 *     Korean line of every paid STUDENT lesson (validRoutes.lessons.student minus the free ones);
 *   - every item held back in content/private/passoff-grammar/*.paid.json (en · ko · promptEn · accept);
 *   minus what a free lesson of another course already shows or speaks — that is public anyway.
 *
 * WHAT MUST BE ZERO
 *   A. in the free PASS-OFF lesson files: a string equal to a paid sentence (any length), or a run of
 *      20 characters of one (the audit's flat form: letters, digits and Hangul, case ignored);
 *   B. the clip keys of a paid sentence (hashed as the browser does — src/lib/unifiedSpeech.ts) among
 *      the clips the free PASS-OFF lessons speak (scripts/lib/spoken-texts.cjs) and among
 *      src/lib/generated/freeSpeechKeys.json.
 *
 *   node scripts/checkPassoffFreeLeak.mjs
 *   node scripts/checkPassoffFreeLeak.mjs --break=restore   일부러 깨기: 보충 문항을 무료 레슨에 되돌려 넣음(메모리) → FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --break=keys      일부러 깨기: 유료 STUDENT 문장 클립 키 하나를 무료 목록에 넣음(메모리) → FAIL 이어야
 *   node scripts/checkPassoffFreeLeak.mjs --content <dir>   다른 content 폴더의 무료 레슨 · 보충 파일로(lessons/ · private/ 아래) —
 *                                                           시험용 사본이나 보충 문항을 파일에 되돌려 넣은 사본으로 깨 볼 때
 * exit 1 on any hit, and when a break has nothing to break.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const COURSE = "passoff-grammar";
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const CONTENT = arg("--content") ? path.resolve(arg("--content")) : path.join(ROOT, "content");
const LESSON_DIR = path.join(CONTENT, "lessons", COURSE);
const PRIVATE_DIR = path.join(CONTENT, "private", COURSE);
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["restore", "keys"].includes(BREAK)) throw new Error(`unknown --break=${BREAK}`);
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
function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}

const routes = readJson(path.join(ROOT, "src", "lib", "generated", "validRoutes.json"));
const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json")) || {};
const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json")) || {};
const spokenOf = (course, id, lesson) => {
  const index = readJson(path.join(ROOT, "content", "courses", `${course}.json`))?.lessons || [];
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
const paid = []; // { from, text, f }
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
    }
    if (b.type === "paragraph" && b.lang === "ko") { addPaid(`student/${id}`, b.text); addPaidKey(`student/${id}`, b.text); }
  }
  // exactly what the STUDENT page speaks (its own per-page speech forms)
  for (const t of spokenOf("student", id, lesson)) addPaidKey(`student/${id}`, t);
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

// A. text
const hits = [];
const needles20 = paid.filter((p) => p.f.length >= MIN);
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
  for (const p of needles20) {
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
console.log(
  `checkPassoffFreeLeak — 무료 레슨 ${freeLessons.map((l) => l.id).join(" · ")} · 유료 STUDENT 강의 ${paidStudentLessons} · ` +
    `유료 문장 ${paid.length}(20자 이상 ${needles20.length}) · 유료 클립 키 ${paidKeys.size} · 보충 파일 문항 ${held} · ` +
    `무료 레슨이 소리 내는 키 ${spokenKeys.size} · freeSpeechKeys ${listed.size}`,
);
for (const h of hits.slice(0, 12)) console.log(`  글 ${h.lesson} ${h.kind} ← ${h.paid}: ${h.text.slice(0, 70)}${h.free ? `  (무료 글: ${h.free.slice(0, 50)})` : ""}`);
for (const h of clipHits.slice(0, 12)) console.log(`  소리 ${h.where} ← ${h.paid}`);
const fail = hits.length + clipHits.length;
console.log(`${fail ? "FAIL" : "PASS"} — 무료 글 속 유료 문장 ${hits.length} · 무료 소리 속 유료 클립 ${clipHits.length}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""}`);
process.exit(fail ? 1 : 0);
