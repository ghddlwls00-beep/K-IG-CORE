#!/usr/bin/env node
/**
 * 7단계 7-2 — '앱이 소리 내는 글' 한 정의(scripts/lib/spoken-texts.cjs)의 증명.
 *   1. 옛 생성기 규칙(034e91b generate-azure-ava.mjs 의 모으기 — 모든 강의 폴더(CNN 빼고)의 text · en · ko · english · korean · word · lemma ·
 *      phrase · meaning · searchWord · hanzi 칸 + 대본 영어 + 사전 전부 + 연어 · 연음)과 새 정의를 **지금 내용**에 대어, 빠진 글을
 *      (과정 폴더 · 칸)으로 나눠 센다 — '앱이 안 부르는 칸을 뺀 만큼만' 줄었는지.
 *   2. 감사 스윕 기록(out/features/*.jsonl · out/recheck-audio*.jsonl)에 **실제로 요청된** 클립 키 가운데, 옛 규칙에는 있는데 새 정의에는
 *      없는 것 = 앱이 부르는데 새 정의가 빠뜨린 것 → 0 이어야 한다(아니면 exit 1).
 *   3. 두 규칙 모두에 없는 요청 키도 믿지 않고 확인한다: 앱이 글 그대로 요청한 것(BUG-027) 또는 git 옛 판(스윕 무렵 이후 바뀐
 *      강의 파일의 직전 판)에서 소리 내던 글이어야 한다 — 어디에도 없으면 exit 1.
 *   4. (BUG-028, 소유자 결정 2026-09-24) STUDENT 빗금 문장은 이제 첫 꼴로 말한다. 배포 전 운영을 돈 스윕은 두 꼴을 이어 읽은 글
 *      ('He She is …')의 키를 불렀다 — 그 키는 이 결정으로 바뀐 것이라 따로 센다: 지금 글 · 옛 판의 빗금 문장의 두 꼴 글 키만.
 *   5. (7-6, 소유자 결정 2026-09-24) VOCA 의 발음이 둘인 20낱말은 이제 `<낱말> ⟨<IPA>⟩` 새 키로 말한다. 배포 전 운영은 맨 낱말 키를
 *      불렀다 — VOCA 단어판에 있는 그 20낱말의 맨 낱말 키만 따로 센다(READING 과 같이 쓰는 6낱말은 READING 이 여전히 불러 새 정의 안).
 *   6. (BUG-029, 소유자 결정 2026-09-24) READING 단어 카드도 카드 뜻의 발음(`<낱말> ⟨IPA⟩`)을 말한다 — 그렇게 바뀐 카드의 맨 낱말 키만 따로 셈.
 *   (a) BUG-027 은 VOCA 단어판의 **쓴 꼴**(colo(u)r)로 만든 키 — 위 플레이어가 이제 말하는 꼴로 넘겨 새 정의의 글에서는 안 나오므로 쓴 꼴에서 셈.
 *   node docs/qa-2026-09-18/scripts/prove-spoken-definition.cjs [--list] [--break=history] [--break=bug028] [--break=voca76] [--break=reading29]
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { SPOKEN_COURSES, spokenTexts, pairIdOf, gridWords } = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const vocaMod = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const unified = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const fns = {
  vocaSpeechForm: loadTs(path.join(REPO, "src/lib/vocaSpeech.ts")).vocaSpeechForm,
  getCollocation: loadTs(path.join(REPO, "src/lib/vocaUtils.ts")).getCollocation,
  generateLiaisonPoints: loadTs(path.join(REPO, "src/lib/listeningUtils.ts")).generateLiaisonPoints,
  extractSentencesForAudio: loadTs(path.join(REPO, "src/lib/lessonAudioText.ts")).extractSentencesForAudio,
  firstSlashAlternative: loadTs(path.join(REPO, "src/lib/listeningUtils.ts")).firstSlashAlternative,
  vocaWordSpeech: loadTs(path.join(REPO, "src/lib/vocaSpeech.ts")).vocaWordSpeech,
  readingWordSpeech: loadTs(path.join(REPO, "src/lib/vocaSpeech.ts")).readingWordSpeech,
};
const LIST = process.argv.includes("--list");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
const ldScripts = readJson("content/ld_english_scripts.json");
const dictionary = readJson("content/voca_dictionary.json");
const isSpeakable = (t) => /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(t);
const keyOf = (value) => {
  const clean = unified.normalizeUnifiedSpeechText(fns.vocaSpeechForm(String(value)));
  return clean && isSpeakable(clean) ? { clean, key: unified.unifiedSpeechKey(clean) } : null;
};
const LESSONS = path.join(REPO, "content/lessons");

// ── 새 정의 — 주소 있는 쪽만(validRoutes; 생성기와 같음 — ld/LD_001 처럼 열리지 않는 파일은 소리 낼 곳이 없다)
const ROUTES = readJson("src/lib/generated/validRoutes.json").lessons || {};
const NEW = new Map(); // key → {text, course}
for (const course of SPOKEN_COURSES) {
  const index = readJson(`content/courses/${course}.json`).lessons || [];
  const routed = new Set(ROUTES[course] || []);
  const lessons = new Map(fs.readdirSync(path.join(LESSONS, course)).filter((x) => x.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(LESSONS, course, f), "utf8"))]));
  for (const [id, lesson] of lessons) {
    if (!routed.has(id)) continue;
    const pid = pairIdOf(course, id, index);
    const pair = pid ? { id: pid, ...(lessons.get(pid) || {}) } : null;
    for (const t of spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns })) {
      const k = keyOf(t); if (k && !NEW.has(k.key)) NEW.set(k.key, { text: k.clean, course });
    }
  }
}
// ── BUG-028: STUDENT 빗금 문장의 '두 꼴을 이어 읽은' 글 키(배포 전 운영이 부르는 것) — 지금 글에서. 옛 판은 아래 옛 판 확인에서 더한다.
// 깨기 시험 --break=bug028 — 이 칸을 끄면 그 키들이 '빠뜨림' · '까닭 없음' 으로 돌아와 exit 1 이어야 한다.
const BREAK_028 = process.argv.includes("--break=bug028");
const slashOldKeysOf = (lesson) => {
  const out = [];
  for (const b of (lesson && lesson.blocks) || []) if (b && b.type === "sentences") for (const it of b.items || []) {
    const t = it && it.text;
    if (typeof t === "string" && fns.firstSlashAlternative(t) !== t) { const k = keyOf(t); if (k) out.push(k.key); }
  }
  return out;
};
const BUG028 = new Map(); // key → where the two-form wording is
for (const id of ROUTES.student || []) {
  const f = path.join(LESSONS, "student", `${id}.json`);
  if (fs.existsSync(f)) for (const k of slashOldKeysOf(JSON.parse(fs.readFileSync(f, "utf8")))) if (!BUG028.has(k)) BUG028.set(k, `지금 student/${id}`);
}
// ── 7-6: VOCA 단어판에 있는 발음이 둘인 20낱말의 **맨 낱말** 키(배포 전 운영이 부르는 것 — 새 정의는 `<낱말> ⟨<IPA>⟩` 새 키) ·
//        (a) BUG-027 을 가리는 VOCA 단어판 **쓴 꼴** 키도 여기서 모음. 깨기 --break=voca76 — (d) 칸을 끄면 그 키들이 '빠뜨림' 으로 돌아와야.
const BREAK_76 = process.argv.includes("--break=voca76");
// BUG-029: READING 카드 가운데 이제 카드 뜻의 발음(`<낱말> ⟨IPA⟩`)을 말하는 카드의 **맨 낱말** 키 — 배포 전 운영이 부르는 것. 깨기 --break=reading29
const BREAK_29 = process.argv.includes("--break=reading29");
const READING_BARE = new Map(); // key → word
for (const id of ROUTES.reading || []) {
  const f = path.join(LESSONS, "reading", `${id}.json`);
  if (!fs.existsSync(f)) continue;
  for (const v of JSON.parse(fs.readFileSync(f, "utf8")).readingVocabulary || []) {
    if (!v || !v.word || fns.readingWordSpeech(v.word, v.korean) === v.word) continue;
    const k = keyOf(v.word); if (k) READING_BARE.set(k.key, String(v.word).trim());
  }
}
const VOCA_BARE = new Map(); // key → word
const VOCA_WRITTEN = new Set(); // raw keys of the written grid words
for (const id of ROUTES.phonics || []) {
  const f = path.join(LESSONS, "phonics", `${id}.json`);
  if (!fs.existsSync(f)) continue;
  for (const w of gridWords(JSON.parse(fs.readFileSync(f, "utf8")))) {
    const raw = unified.normalizeUnifiedSpeechText(String(w));
    if (raw && isSpeakable(raw)) VOCA_WRITTEN.add(unified.unifiedSpeechKey(raw));
    if (vocaMod.VOCA_PRONUNCIATIONS && vocaMod.VOCA_PRONUNCIATIONS[String(w).trim()]) { const k = keyOf(w); if (k) VOCA_BARE.set(k.key, String(w).trim()); }
  }
}

// ── 옛 생성기 규칙(034e91b) — 어디서 왔는지(과정 폴더 · 칸)도 적음
const OLD_KEYS = new Set(["text", "en", "ko", "english", "korean", "word", "lemma", "phrase", "meaning", "searchWord", "hanzi"]);
const OLD = new Map(); // key → {text, from}
const addOld = (v, from) => { const k = keyOf(v); if (k && !OLD.has(k.key)) OLD.set(k.key, { text: k.clean, from }); };
function walkOld(value, key, from, inGrid = false) {
  if (typeof value === "string") {
    if (OLD_KEYS.has(key) || inGrid) { addOld(value, `${from} · ${inGrid ? "wordgrid" : key}`); if (value.includes("\n")) for (const line of value.split(/\r?\n/)) addOld(line, `${from} · ${key}(줄)`); }
    return;
  }
  if (Array.isArray(value)) { for (const x of value) walkOld(x, key, from, inGrid); return; }
  if (!value || typeof value !== "object") return;
  const grid = inGrid || value.type === "wordgrid";
  for (const [k, v] of Object.entries(value)) walkOld(v, k, from, grid && k === "rows");
}
for (const dir of fs.readdirSync(LESSONS)) {
  if (dir.toLowerCase() === "cnn" || !fs.statSync(path.join(LESSONS, dir)).isDirectory()) continue;
  const walkDir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walkDir(p); else if (e.name.endsWith(".json")) walkOld(JSON.parse(fs.readFileSync(p, "utf8")), "", dir); } };
  walkDir(path.join(LESSONS, dir));
}
for (const rows of Object.values(ldScripts)) for (const r of rows || []) if (r && r.en) addOld(r.en, "ld_english_scripts · en");
walkOld(dictionary, "", "voca_dictionary");
for (const [word, entry] of Object.entries(dictionary)) addOld((entry && entry.searchWord) || word, "voca_dictionary · 표제어/searchWord");
for (const [word, entry] of Object.entries(dictionary)) { const c = fns.getCollocation(word, entry && entry.searchWord); if (c && c.phrase) addOld(c.phrase, "voca_dictionary · 연어 phrase"); }
for (const rows of Object.values(ldScripts)) for (const r of rows || []) for (const v of [r && r.en].filter(Boolean)) if (/[A-Za-z]/.test(v) && v.trim().split(/\s+/).length > 2) for (const card of fns.generateLiaisonPoints(v)) if (card && card.original) addOld(card.original, "ld 연음 original");

// ── 견줌
const dropped = [...OLD.keys()].filter((k) => !NEW.has(k));
const added = [...NEW.keys()].filter((k) => !OLD.has(k));
const byFrom = {};
for (const k of dropped) { const f = OLD.get(k).from; byFrom[f] = (byFrom[f] || 0) + 1; }
console.log(`옛 규칙 ${OLD.size.toLocaleString()}클립 · 새 정의 ${NEW.size.toLocaleString()}클립 · 옛에만 ${dropped.length.toLocaleString()} · 새에만 ${added.length.toLocaleString()}`);
console.log("옛에만 있는 것(앱이 안 부르는 칸) — 과정 폴더 · 칸:");
for (const [f, n] of Object.entries(byFrom).sort((a, b) => b[1] - a[1]).slice(0, LIST ? 200 : 25)) console.log(`  ${String(n).padStart(6)}  ${f}`);
const addedBy = {};
for (const k of added) { const c = NEW.get(k).course; addedBy[c] = (addedBy[c] || 0) + 1; }
console.log(`새에만 있는 것(옛 생성기가 빠뜨림): ${Object.entries(addedBy).map(([c, n]) => `${c} ${n}`).join(" · ") || "없음"}`);
for (const k of added.slice(0, LIST ? 50 : 5)) console.log(`    ${NEW.get(k).course}: ${NEW.get(k).text.slice(0, 70)}`);

// ── 스윕이 실제로 요청한 클립
const OUT = path.join(__dirname, "../out");
const requested = new Set();
const files = [
  ...fs.readdirSync(path.join(OUT, "features")).filter((x) => x.endsWith(".jsonl")).map((x) => path.join(OUT, "features", x)),
  ...fs.readdirSync(OUT).filter((x) => /^recheck-audio.*\.jsonl$/.test(x)).map((x) => path.join(OUT, x)),
];
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/\/audio\/azure-ava\/v1\/([A-Za-z0-9-]+)\.mp3/g)) requested.add(m[1]);
// 옛 규칙에만 있는 요청 키: 그 글이 지금 주소 있는 6과정(또는 대본 · 사전)에 있으면 = 앱이 부르는데 새 정의가 빠뜨림(gap).
// 폐지된 과정 파일에만 있으면 = 그때 다른 과(예: 9/7 08b77af 가 STUDENT 에 끼운 다른 과정 글)의 글이 그 뒤 바뀐 것(옛 키).
const RETIRED = /^(basics|middle|adults|man|woman|chinese|adults-m|adults-w) /;
// 스윕 뒤에 요청 자체가 없어진 것 — 까닭을 적어 둔 것만 빼 준다(까닭 없는 빠뜨림은 실패)
const EXPLAINED = {
  "7v-2a8f92de7c7531ae": "pr161 지문 전체 한 줄 — 9/18 스윕 때 readingSentences 가 지문 전체 1줄(8325e10 에도 1줄)이라 위 플레이어가 통째로 읽었다. 86d9ac9 에서 두 문장으로 갈라 지금은 두 문장을 읽음",
  "1i-e1cb4e914826a09c": "gh1-084 한국어 문제 — 위 플레이어가 한국어 문제 31개를 영어로 여겨 읽던 BUG-026(7단계에서 고침, src/lib/lessonAudioText.ts) — 지금은 영어 답을 읽음",
};
for (const [k, why] of Object.entries(EXPLAINED)) console.log(`  (까닭 있음) ${k}: ${why}`);
const gapAll = [...requested].filter((k) => OLD.has(k) && !NEW.has(k) && !RETIRED.test(OLD.get(k).from) && !EXPLAINED[k]);
const gap028 = BREAK_028 ? [] : gapAll.filter((k) => BUG028.has(k));
const gap76 = BREAK_76 ? [] : gapAll.filter((k) => VOCA_BARE.has(k));
const gap29 = BREAK_29 ? [] : gapAll.filter((k) => READING_BARE.has(k) && !gap76.includes(k));
const gap = gapAll.filter((k) => !gap028.includes(k) && !gap76.includes(k) && !gap29.includes(k));
if (BREAK_29) console.log("(깨기 시험 --break=reading29 — BUG-029 READING 맨 낱말 칸을 끔)");
console.log(`  (BUG-029 READING 맨 낱말) 운영(배포 전)이 부른, 이제 카드 뜻의 발음을 말하는 READING 카드의 맨 낱말 키 ${gap29.length} — 새 정의는 '<낱말> ⟨IPA⟩'(소유자 결정 2026-09-24)`);
if (BREAK_028) console.log("(깨기 시험 --break=bug028 — BUG-028 옛 꼴 칸을 끔)");
if (BREAK_76) console.log("(깨기 시험 --break=voca76 — 7-6 VOCA 맨 낱말 칸을 끔)");
console.log(`  (BUG-028 옛 꼴) 운영(배포 전)이 부른 두 꼴 글 키 가운데 지금 글에 빗금 문장으로 있는 것 ${gap028.length} — 새 정의는 첫 꼴을 말함(소유자 결정 2026-09-24)`);
console.log(`  (7-6 VOCA 맨 낱말) 운영(배포 전)이 부른 발음 둘 낱말의 맨 낱말 키 ${gap76.length}${gap76.length ? ` — ${gap76.map((k) => VOCA_BARE.get(k)).join(" ")}` : ""} — 새 정의는 '<낱말> ⟨IPA⟩' 새 키(소유자 결정 2026-09-24)`);
const retiredOnly = [...requested].filter((k) => OLD.has(k) && !NEW.has(k) && RETIRED.test(OLD.get(k).from));
const stale = [...requested].filter((k) => !OLD.has(k) && !NEW.has(k));
console.log(`\n스윕 기록 ${files.length}파일이 실제로 요청한 클립 ${requested.size.toLocaleString()} — 새 정의 안 ${[...requested].filter((k) => NEW.has(k)).length.toLocaleString()} · 새 정의가 빠뜨림 ${gap.length} · 글이 지금 폐지 과정 파일에만 남은 옛 키 ${retiredOnly.length} · 둘 다 없음 ${stale.length}`);
for (const k of gap.slice(0, 30)) console.log(`  빠뜨림 ${k}: ${OLD.get(k).from} — "${OLD.get(k).text.slice(0, 70)}"`);
if (LIST) for (const k of retiredOnly) console.log(`  폐지 과정에만 ${k}: ${OLD.get(k).from} — "${OLD.get(k).text.slice(0, 70)}"`);

// ── '둘 다 없음' 을 "그 뒤 글이 바뀐 옛 키" 라고 믿지 않고 하나씩 확인한다(7-2 에서 이 칸에 BUG-027 이 숨어 있었다).
//   (a) 새 정의의 글을 **vocaSpeechForm 없이** 키로 만든 것 — 앱이 글 그대로 요청한 것(BUG-027: 위 플레이어가 "colo(u)r" 를 그대로 요청.
//       src/lib/speech.ts cleanText 에서 고침). 스윕은 고치기 전에 돌았다.
//   (b) 스윕 무렵부터 지금까지의 **옛 판**(git: 2026-09-12 이후 content 를 바꾼 커밋마다 그 직전 판 + 커밋 안 된 변경의 HEAD 판)에서
//       소리 내던 글 — 그 뒤 글이 바뀐 것.
//   (a)(b) 어디에도 없으면 까닭 없는 것 → 실패.
const { execFileSync, spawnSync } = require("child_process");
const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", "-c", "core.safecrlf=false", ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 256 << 20 });
const rawKey = (value) => { const clean = unified.normalizeUnifiedSpeechText(String(value)); return clean && isSpeakable(clean) ? unified.unifiedSpeechKey(clean) : null; };
const NEW_RAW = new Set();
for (const course of SPOKEN_COURSES) {
  const index = readJson(`content/courses/${course}.json`).lessons || [];
  for (const f of fs.readdirSync(path.join(LESSONS, course)).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    if (!(ROUTES[course] || []).includes(id)) continue;
    const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS, course, f), "utf8"));
    const pid = pairIdOf(course, id, index);
    const pair = pid ? { id: pid, ...(fs.existsSync(path.join(LESSONS, course, `${pid}.json`)) ? JSON.parse(fs.readFileSync(path.join(LESSONS, course, `${pid}.json`), "utf8")) : {}) } : null;
    for (const t of spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns })) { const k = rawKey(t); if (k) NEW_RAW.add(k); }
  }
}
// (a) 의 VOCA 쪽: 단어판의 쓴 꼴 그대로의 키(위 플레이어가 이제 말하는 꼴을 넘기므로 새 정의의 글에서는 안 나옴)
for (const k of VOCA_WRITTEN) NEW_RAW.add(k);
/** git cat-file --batch — "rev:path" 여럿을 한 번에. 없으면 null. */
function catFiles(specs) {
  const out = new Map();
  const uniq = [...new Set(specs)];
  if (!uniq.length) return out;
  const res = spawnSync("git", ["cat-file", "--batch"], { cwd: REPO, input: uniq.join("\n") + "\n", maxBuffer: 1 << 30 });
  const buf = res.stdout;
  let at = 0;
  for (const spec of uniq) {
    const nl = buf.indexOf(0x0a, at);
    const header = buf.slice(at, nl).toString("utf8");
    at = nl + 1;
    const m = header.match(/^\S+ blob (\d+)$/);
    if (!m) { out.set(spec, null); continue; }
    const size = Number(m[1]);
    out.set(spec, buf.slice(at, at + size).toString("utf8"));
    at += size + 1;
  }
  return out;
}
const parseMaybe = (s) => { try { return s == null ? null : JSON.parse(String(s).replace(/^﻿/, "")); } catch { return null; } };
const HISTORY = new Map(); // key → "rev path"
const versions = []; // {rev, rel}
const commits = git(["rev-list", "--since=2026-09-12", "HEAD", "--", "content/lessons", "content/ld_english_scripts.json"]).split(/\r?\n/).filter(Boolean);
for (const c of commits) for (const rel of git(["diff-tree", "--no-commit-id", "--name-only", "-r", c, "--", "content/lessons", "content/ld_english_scripts.json"]).split(/\r?\n/).filter(Boolean)) versions.push({ rev: `${c}^`, rel });
for (const rel of git(["diff", "HEAD", "--name-only", "--", "content/lessons", "content/ld_english_scripts.json"]).split(/\r?\n/).filter(Boolean)) versions.push({ rev: "HEAD", rel });
const revs = [...new Set(versions.map((v) => v.rev))];
const pass1 = catFiles([
  ...versions.map((v) => `${v.rev}:${v.rel}`),
  ...revs.flatMap((r) => [`${r}:content/ld_english_scripts.json`, ...SPOKEN_COURSES.map((c) => `${r}:content/courses/${c}.json`)]),
]);
const lessonAt = [];
for (const { rev, rel } of versions) {
  if (rel === "content/ld_english_scripts.json") {
    const then = parseMaybe(pass1.get(`${rev}:${rel}`)) || {};
    for (const base of Object.keys(then)) if (JSON.stringify(then[base]) !== JSON.stringify(ldScripts[base])) for (const id of [base, `${base}-1`]) lessonAt.push({ rev, course: "ld", id, lessonNow: true });
    continue;
  }
  const m = rel.match(/^content\/lessons\/([^/]+)\/([^/]+)\.json$/);
  if (m && SPOKEN_COURSES.includes(m[1])) lessonAt.push({ rev, course: m[1], id: m[2] });
}
const indexAt = (rev, course) => (parseMaybe(pass1.get(`${rev}:content/courses/${course}.json`)) || {}).lessons || [];
const pass2 = catFiles(lessonAt.flatMap(({ rev, course, id }) => { const p = pairIdOf(course, id, indexAt(rev, course)); return [`${rev}:content/lessons/${course}/${id}.json`, ...(p ? [`${rev}:content/lessons/${course}/${p}.json`] : [])]; }));
for (const { rev, course, id } of lessonAt) {
  const lesson = parseMaybe(pass2.get(`${rev}:content/lessons/${course}/${id}.json`));
  if (!lesson) continue;
  const p = pairIdOf(course, id, indexAt(rev, course));
  const pair = p ? { id: p, ...(parseMaybe(pass2.get(`${rev}:content/lessons/${course}/${p}.json`)) || {}) } : null;
  const scriptsThen = parseMaybe(pass1.get(`${rev}:content/ld_english_scripts.json`)) || ldScripts;
  let texts = [];
  try { texts = spokenTexts({ course, id, lesson, pair, ldScripts: scriptsThen, dictionary, fns }); } catch { continue; }
  for (const t of texts) for (const k of [keyOf(t) && keyOf(t).key, rawKey(t)]) if (k && !HISTORY.has(k)) HISTORY.set(k, `${rev.slice(0, 8)} ${course}/${id}`);
  if (course === "student") for (const k of slashOldKeysOf(lesson)) if (!BUG028.has(k)) BUG028.set(k, `${rev.slice(0, 8)} student/${id}`);
}
// 깨기 시험: --break=history — 옛 판을 안 본 것으로 치면 '까닭 없음' 이 생겨 exit 1 이어야 한다
if (process.argv.includes("--break=history")) { HISTORY.clear(); console.log("(깨기 시험 --break=history — 옛 판 확인을 비움)"); }
const bug027 = stale.filter((k) => NEW_RAW.has(k));
const fromHistory = stale.filter((k) => !NEW_RAW.has(k) && HISTORY.has(k));
const bug028 = BREAK_028 ? [] : stale.filter((k) => !NEW_RAW.has(k) && !HISTORY.has(k) && BUG028.has(k));
const unexplained = stale.filter((k) => !NEW_RAW.has(k) && !HISTORY.has(k) && !bug028.includes(k));
console.log(`'둘 다 없음' ${stale.length} 확인 — (a) 앱이 글 그대로 요청(BUG-027, 고침) ${bug027.length} · (b) 옛 판(git ${commits.length}커밋의 직전 판 + HEAD, 강의 쪽 ${lessonAt.length})에서 소리 내던 글 ${fromHistory.length} · (c) BUG-028 옛 꼴(옛 판의 빗금 문장 두 꼴 글) ${bug028.length} · 까닭 없음 ${unexplained.length}`);
if (LIST) for (const k of bug028) console.log(`  BUG-028 옛 꼴 ${k} ← ${BUG028.get(k)}`);
for (const k of bug027) console.log(`  BUG-027 ${k}`);
if (LIST) for (const k of fromHistory) console.log(`  옛 판 ${k} ← ${HISTORY.get(k)}`);
for (const k of unexplained.slice(0, 40)) console.log(`  까닭 없음 ${k}`);
process.exit(gap.length || unexplained.length ? 1 : 0);
