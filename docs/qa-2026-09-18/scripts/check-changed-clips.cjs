#!/usr/bin/env node
/**
 * 바뀐 글의 클립이 있는가 — 커밋된 판(HEAD)과 지금 판에서 강의 쪽마다 **앱이 소리 내는 글**을 계산해, 지금만 있는 글의
 * 클립 파일이 있는지 본다. 명령서(4·5단계): "고친 영어 문장 전부에 대해 … '클립이 없는 문장: N건' 을 보고".
 *
 * 7단계 7-2 — '앱이 소리 내는 글' 은 생성기(scripts/generate-azure-ava.mjs) · 무료 소리 키(scripts/buildFreeSpeechKeys.mjs) ·
 * 감사 목록(lib/expectations.cjs clipTexts)과 같은 **한 정의** scripts/lib/spoken-texts.cjs 로 센다. 전에는 칸을 여기서 따로 골랐다
 * (ld-en-changes.cjs 의 LISTENING·READING 영어 + 연음 조각 + GRAMMAR 영어 문항 + STUDENT 영어·한국어 + READING 낱말 + VOCA 낱말) —
 * 위 '전체 듣기' 플레이어가 읽는 글과 짝 강의가 빌려 주는 글은 보지 못했다.
 *
 * 어떤 쪽을 보나: 바뀐(또는 새) 강의 파일의 쪽 + 그 쪽을 짝으로 쓰는 쪽(src/lib/content.ts 의 짝 규칙 — pairIdOf).
 *   대본(content/ld_english_scripts.json)의 줄이 바뀐 LISTENING 강의, 사전(content/voca_dictionary.json)이 바뀌면 VOCA 전부,
 *   과정 목록(content/courses/<과정>.json)이 바뀌면 그 과정 전부.
 * 글 → 클립 키는 생성기와 같은 것: unifiedSpeechKey(normalizeUnifiedSpeechText(vocaSpeechForm(글))), 소리 낼 글자가 있는 것만.
 * src 함수(extractSentencesForAudio 등)는 지금 판을 쓴다 — 함수만 바뀌어 새로 소리 내는 글은 이 도구가 아니라 audio-inventory ·
 *   check-completeness 가 (모든 쪽을) 본다.
 *
 * 있는 곳: 이 컴퓨터의 public/audio/azure-ava/v1/<키>.mp3(생성기가 쓰는 곳 — 소유자가 R2 에 올려야 함) 또는 R2 버킷
 *   (lib/r2-keys.cjs — 읽기만, .env.local 을 스스로 읽는다). 자격이 없으면 이 컴퓨터만 보고 그렇다고 크게 찍는다.
 * 운영 주소로 확인하는 방법은 넣지 않았다: 미디어 문지기가 이용권 없는 요청에 파일이 있든 없든 403 을 먼저 돌려주므로
 *   (mediaAccess.ts), 운영의 403 은 "있음" 의 증거가 못 된다.
 *
 *   node docs/qa-2026-09-18/scripts/check-changed-clips.cjs [--list]
 *     --list                  확인한 글을 한 줄씩(기본은 '없음' 만)
 *     --break=student-ko      깨기 시험: STUDENT s1-1 한국어 해석 한 줄을 메모리에서만 바꿈 → '클립 없음' 이 1 늘어야 한다
 *     --break=reading-ko      깨기 시험: READING pr001-1 한국어 한 문장을 메모리에서만 바꿈 → 확인할 글이 늘지 않아야 한다(소리 안 냄)
 * 하나라도 없으면 exit 1. 파일은 아무것도 쓰지 않는다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { SPOKEN_COURSES, spokenTexts, pairIdOf } = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const { r2ClipKeys, LOCAL_ONLY_WARNING } = require("./lib/r2-keys.cjs");
const { unifiedSpeechKey, normalizeUnifiedSpeechText } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
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
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !["student-ko", "reading-ko"].includes(BREAK)) { console.error(`--break=${BREAK} 는 없다 (student-ko · reading-ko)`); process.exit(2); }

// ── 커밋된 판(HEAD)과 지금 판
// core.safecrlf=false: 줄 끝(LF→CRLF) 경고 수백 줄만 끈다 — 비교하는 내용은 그대로
const git = (args) => execFileSync("git", ["-c", "core.quotepath=false", "-c", "core.safecrlf=false", ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 });
const lines = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const changed = new Set(lines(git(["diff", "HEAD", "--name-only", "--", "content"])));
const untracked = new Set(lines(git(["ls-files", "--others", "--exclude-standard", "--", "content"])));

/** HEAD 판 파일 여럿을 한 번에(git cat-file --batch). HEAD 에 없는 파일은 null. */
function headFiles(rels) {
  const out = new Map();
  if (!rels.length) return out;
  const res = spawnSync("git", ["cat-file", "--batch"], { cwd: REPO, input: rels.map((r) => `HEAD:${r}`).join("\n") + "\n", maxBuffer: 1 << 30 });
  if (res.status !== 0) throw new Error(`git cat-file 실패: ${String(res.stderr)}`);
  const buf = res.stdout;
  let at = 0;
  for (const rel of rels) {
    const nl = buf.indexOf(0x0a, at);
    const header = buf.slice(at, nl).toString("utf8");
    at = nl + 1;
    const m = header.match(/^\S+ blob (\d+)$/);
    if (!m) { out.set(rel, null); continue; } // "<이름> missing" — HEAD 에 없던 파일
    const size = Number(m[1]);
    out.set(rel, buf.slice(at, at + size).toString("utf8"));
    at += size + 1;
  }
  return out;
}
const HEAD = headFiles([...changed].filter((r) => !untracked.has(r)));
const readNowText = (rel) => { const f = path.join(REPO, rel); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null; };
const readHeadText = (rel) => (untracked.has(rel) ? null : changed.has(rel) ? HEAD.get(rel) ?? null : readNowText(rel));
const parse = (s) => (s == null ? null : JSON.parse(String(s).replace(/^﻿/, "")));
const isChanged = (rel) => changed.has(rel) || untracked.has(rel);

// 깨기 시험 — 메모리 안에서만 바꾼 '지금 판'
const NOW_OVERRIDE = new Map();
if (BREAK === "student-ko") {
  const rel = "content/lessons/student/s1-1.json";
  const d = parse(readNowText(rel));
  const b = (d.blocks || []).find((x) => x && x.type === "paragraph" && x.lang === "ko");
  b.text = `${b.text} (깨기 시험 한 줄)`;
  NOW_OVERRIDE.set(rel, d);
} else if (BREAK === "reading-ko") {
  const rel = "content/lessons/reading/pr001-1.json";
  const d = parse(readNowText(rel));
  const s = (d.readingSentences || []).find((x) => x && x.korean);
  s.korean = `${s.korean} (깨기 시험 한 줄)`;
  NOW_OVERRIDE.set(rel, d);
}
const readNow = (rel) => (NOW_OVERRIDE.has(rel) ? NOW_OVERRIDE.get(rel) : parse(readNowText(rel)));
const readHead = (rel) => parse(readHeadText(rel));
const touched = (rel) => isChanged(rel) || NOW_OVERRIDE.has(rel);

const LD_REL = "content/ld_english_scripts.json";
const DICT_REL = "content/voca_dictionary.json";
const ldNow = readNow(LD_REL) || {}, ldHead = readHead(LD_REL) || {};
const dictNow = readNow(DICT_REL) || {}, dictHead = readHead(DICT_REL) || {};

const isSpeakable = (t) => /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(t);
function keysOf(texts) {
  const out = new Map();
  for (const value of texts) {
    const clean = normalizeUnifiedSpeechText(fns.vocaSpeechForm(String(value)));
    if (clean && isSpeakable(clean)) { const k = unifiedSpeechKey(clean); if (!out.has(k)) out.set(k, clean); }
  }
  return out;
}

// ── 강의 쪽마다: 지금만 소리 내는 글
const targets = new Map(); // key → {where, text, course}
const pagesByCourse = {};
const newByCourse = {};
for (const course of SPOKEN_COURSES) {
  const lessonRel = (id) => `content/lessons/${course}/${id}.json`;
  const idxRel = `content/courses/${course}.json`;
  const indexNow = (readNow(idxRel) || {}).lessons || [];
  const indexHead = (readHead(idxRel) || {}).lessons || [];
  const prefix = `content/lessons/${course}/`;
  const affected = new Set();
  const everyId = () => new Set([...indexNow, ...indexHead].map((l) => l.id).concat(fs.readdirSync(path.join(REPO, prefix)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))));
  if (touched(idxRel) || (course === "phonics" && touched(DICT_REL))) for (const id of everyId()) affected.add(id);
  for (const rel of [...changed, ...untracked, ...NOW_OVERRIDE.keys()]) {
    if (rel.startsWith(prefix) && rel.endsWith(".json") && !rel.slice(prefix.length).includes("/")) affected.add(rel.slice(prefix.length, -".json".length));
  }
  if (course === "ld" && touched(LD_REL)) {
    for (const base of new Set([...Object.keys(ldNow), ...Object.keys(ldHead)])) {
      if (JSON.stringify(ldNow[base] || null) === JSON.stringify(ldHead[base] || null)) continue;
      affected.add(base); affected.add(`${base}-1`);
    }
  }
  // 짝으로 빌려 쓰는 쪽
  for (const [index] of [[indexNow], [indexHead]]) for (const l of index) { const p = pairIdOf(course, l.id, index); if (p && affected.has(p)) affected.add(l.id); }

  let pages = 0;
  const routed = new Set(((readNow("src/lib/generated/validRoutes.json") || {}).lessons || {})[course] || []);
  for (const id of [...affected].sort()) {
    const now = readNow(lessonRel(id));
    if (!now) continue; // 지워진 쪽 — 소리 낼 것이 없다
    if (!routed.has(id)) continue; // 주소가 없는 파일(ld/LD_001 — 쪽이 404) — 소리 낼 곳이 없다(생성기와 같음)
    pages++;
    const pidNow = pairIdOf(course, id, indexNow);
    const pairNow = pidNow ? { id: pidNow, ...(readNow(lessonRel(pidNow)) || {}) } : null;
    const nowKeys = keysOf(spokenTexts({ course, id, lesson: now, pair: pairNow, ldScripts: ldNow, dictionary: dictNow, fns }));
    const head = readHead(lessonRel(id));
    let headKeys = new Map();
    if (head) {
      const pidHead = pairIdOf(course, id, indexHead);
      const pairHead = pidHead ? { id: pidHead, ...(readHead(lessonRel(pidHead)) || {}) } : null;
      headKeys = keysOf(spokenTexts({ course, id, lesson: head, pair: pairHead, ldScripts: ldHead, dictionary: dictHead, fns }));
    }
    for (const [k, text] of nowKeys) {
      if (headKeys.has(k) || targets.has(k)) continue;
      targets.set(k, { where: `${course}/${id}`, text, course });
      newByCourse[course] = (newByCourse[course] || 0) + 1;
    }
  }
  pagesByCourse[course] = pages;
}

(async () => {
  const inBucket = await r2ClipKeys();
  if (!inBucket) console.warn(LOCAL_ONLY_WARNING);
  if (BREAK) console.log(`(깨기 시험 --break=${BREAK} — 파일은 그대로, 메모리 안에서만 바꿈)`);
  let missing = 0, local = 0, bucket = 0;
  for (const [key, t] of targets) {
    const isLocal = fs.existsSync(path.join(REPO, "public/audio/azure-ava/v1", `${key}.mp3`));
    const isBucket = Boolean(inBucket && inBucket.has(key));
    const where = isBucket ? "R2 에 있음" : isLocal ? "로컬(올려야 함)" : "없음";
    if (!isLocal && !isBucket) missing++;
    else if (isBucket) bucket++;
    else local++;
    if (LIST || (!isLocal && !isBucket)) console.log(`${where.padEnd(10)} ${t.where.padEnd(24)} ${key}  ${JSON.stringify(t.text.slice(0, 60))}`);
  }
  const fmt = (o) => SPOKEN_COURSES.filter((c) => o[c]).map((c) => `${c} ${o[c]}`).join(" · ") || "없음";
  console.log(`\n본 쪽 ${Object.values(pagesByCourse).reduce((a, b) => a + b, 0)} (${fmt(pagesByCourse)}) — 바뀐 파일과 그 짝, 대본 · 사전 · 과정 목록이 바뀐 곳`);
  console.log(`커밋된 판에는 없고 지금 소리 내는 글 ${targets.size} (${fmt(newByCourse)}) — 정의: scripts/lib/spoken-texts.cjs`);
  console.log(`  R2 에 이미 있음 ${bucket} · 로컬에만 있음(업로드 필요) ${local} · 클립이 없는 것: ${missing}건${inBucket ? ` (버킷 ${inBucket.size}개 확인)` : " (로컬만 봄)"}`);
  if (!inBucket) console.warn(LOCAL_ONLY_WARNING);
  process.exit(missing ? 1 : 0);
})();
