#!/usr/bin/env node
/**
 * 누락 점검 — is anything a learner has paid for simply NOT THERE?
 *
 * This asks a different question from the sweeps. The sweeps drive the live pages and report what
 * misbehaves; this reads the content that the pages are built from and reports what is absent:
 * a lesson the course index promises but has no file, a lesson number skipped, a sentence with no
 * translation, a word with no meaning, a speaker button whose clip file does not exist.
 *
 * Everything here is offline and deterministic, so it can be re-run after any fix and the numbers
 * are comparable. It never judges whether content is GOOD — only whether it is PRESENT.
 *
 *   node check-completeness.cjs [--course reading]
 *   node check-completeness.cjs --break=missing-clip   일부러 깨기: 없는 클립 이름 하나를 첫 강의에 넣어 'missing-clip' 이 1 늘어야 한다
 * Output: out/completeness.json + printed tables.
 *
 * missing-clip (7단계 7-1 g): 클립은 이 컴퓨터의 public/audio 에 **또는 R2 버킷**에 있으면 있는 것 — public/audio 는 git 에 없어
 * 컴퓨터마다 다르다(6단계 끝 missing-clip 8 은 실제로 R2 에 있는 클립 2개였다). R2 목록은 lib/r2-keys.cjs 로 읽기만 하고
 * (.env.local 을 스스로 읽음), 자격이 없으면 "로컬만 봄" 을 크게 찍는다.
 *
 * 회귀 점검 1002 단계 0 (2026-10-04): 과정 목록이 expectations.cjs 의 COURSES(ADULT 없음)라 ADULT 55강의는 클립도 내용도 안 봤다.
 *   이제 validRoutes 의 과정 전부(CNN 폐지) — 과정별 '필요한 부분' 규칙이 없는 과정이 생기면 멈춘다. ADULT 규칙(5단계에 필요한 것):
 *   문장 · 문장마다 한국어 줄(paragraph ko — 수가 같음) · 덩어리(영어+한국어, 영어 덩어리를 이으면 문장과 같음) · 낱말(표현 · 말하는 꼴 ·
 *   뜻 · 품사 · 밑줄 자리 · 빈칸 보기 3). missing-clip 이 있으면 exit 1(명령서 ④ — 전에는 숫자만).
 *   node check-completeness.cjs --break=adult-missing-clip  깨기: 없는 클립 이름을 첫 유료 ADULT 강의(a2-1)에 넣음 → adult missing-clip 1 · exit 1
 *   node check-completeness.cjs --break=adult-chunk         깨기: a2-1 첫 문장의 한국어 덩어리 하나를 메모리에서 비움 → adult chunk-missing-ko 1 · exit 1
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { r2ClipKeys, LOCAL_ONLY_WARNING } = require("./lib/r2-keys.cjs");
const { REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--course", null);
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const FAKE_CLIP = "/audio/azure-ava/v1/b-0000000000000000.mp3";
// 회귀 점검 1002: validRoutes 의 과정 전부(CNN 폐지)
const RULED = ["student", "adult", "passoff-grammar", "phonics", "grammar1", "grammar2", "ld", "reading"];
const COURSES = Object.keys(JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons).filter((c) => c !== "cnn");
{
  const unruled = COURSES.filter((c) => !RULED.includes(c));
  if (unruled.length) { console.error(`!!! 이 검사에 '필요한 부분' 규칙이 없는 과정: ${unruled.join(", ")} — 규칙을 넣고 다시 · exit 2`); process.exit(2); }
}
// 이 도구가 지적하면 exit 1 인 종류(명령서 ④ 와 ADULT 의 학습에 꼭 필요한 것). 그 밖의 종류는 전처럼 숫자만(옛 과정의 알려진 것들).
const FATAL = new Set(["missing-clip", "missing-file"]);
const FATAL_COURSE = new Set(["adult"]);

const CLIP_DIR = path.join(REPO, "public/audio/azure-ava/v1");
const onDisk = new Set(fs.readdirSync(CLIP_DIR).filter((f) => f.endsWith(".mp3")));
let inBucket = null;
const clipExists = (p) => {
  const name = path.basename(String(p));
  return onDisk.has(name) || Boolean(inBucket && inBucket.has(name.replace(/\.mp3$/, "")));
};

(async () => {
inBucket = await r2ClipKeys();
console.log(inBucket ? `음성 클립: 이 컴퓨터 ${onDisk.size}개 + R2 ${inBucket.size}개와 함께 봄` : LOCAL_ONLY_WARNING);
if (BREAK && !["missing-clip", "adult-missing-clip", "adult-chunk"].includes(BREAK)) throw new Error(`모르는 --break=${BREAK}`);
let injected = false;

const gaps = [];
const report = {};
const add = (course, kind, detail, where) => {
  const c = (report[course] ||= {});
  const k = (c[kind] ||= []);
  k.push({ where, detail });
};

for (const course of COURSES) {
  if (ONLY && course !== ONLY) continue;
  const ids = E.pages(course).map((p) => p.id);
  const index = E.courseIndex(course);
  const indexIds = (index.lessons || []).map((l) => l.id);

  // 1. the course index and the routes must describe the same set of lessons
  for (const id of indexIds) if (!ids.includes(id)) add(course, "index-without-route", "목차에는 있는데 접속 주소가 없음", `${course}/${id}`);
  for (const id of ids) if (!indexIds.includes(id)) add(course, "route-without-index", "주소는 열리는데 목차에 없음", `${course}/${id}`);
  const dup = indexIds.filter((x, i) => indexIds.indexOf(x) !== i);
  for (const id of new Set(dup)) add(course, "duplicate-in-index", "목차에 두 번 들어 있음", `${course}/${id}`);

  // 2. a skipped lesson number is a hole the learner sees in the list
  const nums = ids.map((id) => {
    const m = String(id).match(/(\d+)/);
    return m ? { id, n: Number(m[1]) } : null;
  }).filter(Boolean);
  const seen = new Set(nums.map((x) => x.n));
  if (seen.size) {
    const max = Math.max(...seen), min = Math.min(...seen);
    for (let n = min; n <= max; n++) if (!seen.has(n)) gaps.push({ course, n });
  }

  for (const id of ids) {
    const where = `${course}/${id}`;
    if (!E.hasLesson(course, id)) { add(course, "missing-file", "강의 데이터 파일이 없음", where); continue; }
    const d = E.lesson(course, id);
    if (BREAK === "adult-chunk" && course === "adult" && id === "a2-1") {
      const c0 = ((((d.blocks || []).find((b) => b.type === "sentences") || {}).items || [])[0] || {}).chunks;
      if (!c0 || !c0[0]) { console.log("!!! --break=adult-chunk: a2-1 첫 문장에 덩어리가 없음 — 아무것도 증명 못 함 · exit 2"); process.exit(2); }
      c0[0].ko = "";
      console.log("[일부러 깸] adult/a2-1 첫 문장 첫 덩어리의 한국어를 메모리에서 비움");
    }
    const x = E.expected(course, id);

    if (!String(d.title || "").trim()) add(course, "missing-title", "제목 없음", where);
    if (!String(d.menuLabel || "").trim()) add(course, "missing-menu-label", "목차 표시 이름 없음", where);
    if (!(d.blocks || []).length && !(d.readingSentences || []).length) add(course, "empty-lesson", "내용 블록이 하나도 없음", where);

    // 3. the parts each course's learning view needs in order to work at all
    if (course === "grammar1" || course === "grammar2") {
      const mine = E.itemsOf(d);
      if (!mine.length) add(course, "no-items", "영작 문항이 하나도 없음", where);
      // the pair the APP shows, not the stale pairId in the file (see expectations.cjs pairOf)
      const pid = E.pairOf(course, id);
      if (pid && !E.hasLesson(course, pid)) add(course, "broken-pair", `짝 강의 ${pid} 파일이 없음`, where);
      if (pid && E.hasLesson(course, pid)) {
        const theirs = E.itemsOf(E.lesson(course, pid));
        if (mine.length !== theirs.length) add(course, "pair-count-mismatch", `${mine.length}문항 ↔ 짝 ${pid} 은 ${theirs.length}문항`, where);
        else {
          for (let i = 0; i < mine.length; i++) if (mine[i].n !== theirs[i].n) { add(course, "pair-number-mismatch", `${i + 1}번째 문항 번호가 ${mine[i].n} ↔ ${theirs[i].n} 로 어긋남`, where); break; }
        }
      }
      for (const it of mine) if (!it.text) add(course, "empty-item", `${it.n}번 문항이 비어 있음`, where);
    } else if (course === "ld") {
      const base = id.replace(/-1$/, "");
      const rows = E.ldScripts[base] || [];
      if (!rows.length) add(course, "no-script", "대본 데이터가 없음", where);
      for (const r of rows) {
        if (!String(r.en || "").trim()) add(course, "script-missing-en", `${r.n}번 영어 문장 없음`, where);
        if (!String(r.ko || "").trim()) add(course, "script-missing-ko", `${r.n}번 한국어 해석 없음`, where);
      }
    } else if (course === "reading") {
      if (!(d.readingSentences || []).length) add(course, "no-sentences", "지문 문장이 없음", where);
      for (const s of d.readingSentences || []) {
        if (!String(s.english || "").trim()) add(course, "sentence-missing-en", "영어 문장 없음", where);
        if (!String(s.korean || "").trim()) add(course, "sentence-missing-ko", `해석 없음: "${String(s.english).slice(0, 50)}"`, where);
      }
      for (const v of d.readingVocabulary || []) {
        if (!String(v.word || "").trim()) add(course, "vocab-missing-word", "단어 없음", where);
        if (!String(v.korean || "").trim()) add(course, "vocab-missing-meaning", `뜻 없음: "${String(v.word).slice(0, 40)}"`, where);
      }
    } else if (course === "phonics") {
      const words = E.gridWords(d);
      if (!words.length) add(course, "no-words", "단어표가 비어 있음", where);
    } else if (course === "student") {
      if (!E.itemsOf(d).length) add(course, "no-items", "문장이 하나도 없음", where);
    } else if (course === "adult") {
      // 회귀 점검 1002 — ADULT 5단계(docs/adult/README.md)가 쓰는 것: 문장 · 한국어 줄 · 덩어리 · 낱말
      // 날것의 문항(E.itemsOf 는 n · text 만 남긴다 — 덩어리 · 낱말이 빠짐)
      const items = (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []).filter((it) => it && typeof it.text === "string");
      const koLines = (d.blocks || []).filter((b) => b.type === "paragraph" && b.lang === "ko");
      if (!items.length) add(course, "no-items", "문장이 하나도 없음", where);
      if (items.length !== koLines.length) add(course, "ko-line-count", `문장 ${items.length} ↔ 한국어 줄 ${koLines.length}`, where);
      for (const l of koLines) if (!String(l.text || "").trim()) add(course, "empty-ko-line", "빈 한국어 줄", where);
      let words = 0;
      const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
      for (const it of items) {
        if (!String(it.text || "").trim()) { add(course, "empty-item", `${it.n}번 문장이 비어 있음`, where); continue; }
        const chunks = it.chunks || [];
        if (!chunks.length) add(course, "no-chunks", `${it.n}번 문장에 덩어리(끊어 읽기)가 없음`, where);
        for (const c of chunks) {
          if (!String((c && c.en) || "").trim()) add(course, "chunk-missing-en", `${it.n}번 덩어리 영어 없음`, where);
          if (!String((c && c.ko) || "").trim()) add(course, "chunk-missing-ko", `${it.n}번 덩어리 "${String(c && c.en).slice(0, 30)}" 한국어 없음`, where);
        }
        if (chunks.length && norm(chunks.map((c) => c && c.en).join(" ")) !== norm(it.text)) add(course, "chunks-not-sentence", `${it.n}번 영어 덩어리를 이어도 문장과 다름`, where);
        for (const w of it.words || []) {
          words++;
          for (const k of ["word", "say", "meaning", "pos"]) if (!String((w && w[k]) || "").trim()) add(course, `word-missing-${k}`, `${it.n}번 낱말 "${w && w.word}" 의 ${k} 없음`, where);
          if (!(Number.isInteger(w.start) && Number.isInteger(w.end) && w.end > w.start && w.end <= String(it.text).length)) add(course, "word-bad-span", `${it.n}번 낱말 "${w.word}" 밑줄 자리(start · end)가 문장 밖`, where);
          if (!Array.isArray(w.choices) || w.choices.length !== 3 || w.choices.some((x) => !String(x || "").trim())) add(course, "word-choices", `${it.n}번 낱말 "${w.word}" 빈칸 보기가 3개가 아님`, where);
        }
      }
      if (!words) add(course, "no-words", "낱말(단어 단계)이 하나도 없음", where);
    } else if (course === "passoff-grammar") {
      // docs/pass-off-grammar/데이터-형식.md — what the five steps need to work at all. A free preview's
      // held-back paid items (content/private/passoff-grammar/<id>.paid.json) are checked with it.
      const blocks = d.blocks || [];
      const held = (() => {
        const f = path.join(REPO, "content/private/passoff-grammar", `${id}.paid.json`);
        return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")).items || []) : [];
      })();
      const heldIn = (list) => held.filter((e) => e.list === list).map((e) => e.item);
      const anchors = [...blocks.filter((b) => b.type === "anchors").flatMap((b) => b.items || []), ...heldIn("items")];
      const rule = blocks.find((b) => b.type === "rule");
      const drill = blocks.find((b) => b.type === "drill") || {};
      const select = [...(drill.select || []), ...heldIn("select")];
      const produce = [...(drill.produce || []), ...heldIn("produce")];
      const transfer = [...(drill.transfer || []), ...heldIn("transfer")];
      if (!anchors.length) add(course, "no-anchors", "예문(①)이 하나도 없음", where);
      if (anchors.length > 8) add(course, "too-many-anchors", `예문 ${anchors.length}개 — 8개까지`, where);
      for (const a of anchors) {
        if (!String(a.en || "").trim()) add(course, "anchor-missing-en", `${a.id} 영어 없음`, where);
        if (!String(a.ko || "").trim()) add(course, "anchor-missing-ko", `${a.id} 한국어 없음`, where);
      }
      if (!rule) add(course, "no-rule", "규칙(②)이 없음", where);
      else {
        if (!String(rule.title || "").trim() || !(rule.points || []).length) add(course, "rule-incomplete", "규칙 제목이나 설명 줄이 없음", where);
        if (!rule.check || !Array.isArray(rule.check.options) || typeof rule.check.answer !== "number") add(course, "rule-check-missing", "규칙 확인 문항(보기 · 정답 번호)이 없음", where);
      }
      if (!select.some((s) => !s.reserve)) add(course, "no-form-items", "형태 찾기(③) 문항이 없음", where);
      for (const s of select) {
        const keyed = s.kind === "select" || s.kind === "short" ? Array.isArray(s.answer) && s.answer.length > 0 : s.kind === "choice" ? Number.isInteger(s.answer) : false;
        if (!keyed) add(course, "form-missing-answer", `${s.id} (${s.kind}) 정답 없음`, where);
      }
      if (!produce.length) add(course, "no-produce", "영작(④) 문항이 없음", where);
      for (const p of [...produce, ...transfer]) {
        if (!String(p.ko || "").trim() && !String(p.promptEn || "").trim()) add(course, "prompt-missing", `${p.id} 제시문(한국어 · 영어) 없음`, where);
        if (!String(p.en || "").trim()) add(course, "answer-missing-en", `${p.id} 모범 답 없음`, where);
      }
      if (transfer.length < 2) add(course, "few-transfer", `처음 보는 문장(⑤) ${transfer.length}개 — 2개여야 함`, where);
    }

    // 4. every speaker button needs a clip file; a missing file is a button that cannot speak
    const clipPaths = [...(x.clipPaths || [])];
    if (BREAK === "missing-clip" && !injected) { clipPaths.push(FAKE_CLIP); injected = true; }
    if (BREAK === "adult-missing-clip" && !injected && course === "adult" && id === "a2-1") { clipPaths.push(FAKE_CLIP); injected = true; }
    for (const p of clipPaths) if (!clipExists(p)) add(course, "missing-clip", `음성 파일 없음: ${p}`, where);
    for (const src of x.legacyAudio || []) {
      const f = path.join(REPO, "public", String(src).replace(/^\//, ""));
      if (!fs.existsSync(f)) add(course, "missing-legacy-audio", `옛 음성 파일 없음: ${src}`, where);
    }
  }
}

for (const g of gaps) add(g.course, "lesson-number-gap", `${g.n}번 강의가 건너뛰어져 있음`, `${g.course}`);

const totals = {};
let grand = 0;
for (const [course, kinds] of Object.entries(report)) {
  totals[course] = {};
  for (const [kind, list] of Object.entries(kinds)) { totals[course][kind] = list.length; grand += list.length; }
}
// 깨기 결과는 진짜 결과 파일을 덮지 않는다(회귀 점검 1002)
const OUT_FILE = path.join(OUT, BREAK ? `completeness-break-${BREAK}.json` : "completeness.json");
fs.writeFileSync(OUT_FILE, JSON.stringify({ at: new Date().toISOString(), totals, report }, null, 1));

console.log(`누락 점검 — 과정 ${Object.keys(report).length}개, 지적 ${grand}건\n`);
for (const [course, kinds] of Object.entries(totals)) {
  console.log(`== ${course}`);
  for (const [kind, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) {
    const sample = report[course][kind][0];
    console.log(`   ${String(n).padStart(5)} × ${kind.padEnd(24)} e.g. ${sample.where} — ${sample.detail}`);
  }
}
const missingClips = Object.values(report).reduce((n, k) => n + (k["missing-clip"] || []).length, 0);
console.log(`\nmissing-clip ${missingClips}${inBucket ? " (이 컴퓨터 + R2)" : " (이 컴퓨터만 — R2 를 못 봄)"}${/missing-clip$/.test(BREAK) ? ` [일부러 깸: ${FAKE_CLIP} 를 넣음]` : ""}`);
console.log(`→ ${OUT_FILE}`);
// 회귀 점검 1002: 과정마다 본 강의 수 · 클립 수(ADULT 가 세어지는지) · exit 1 은 missing-clip · missing-file · ADULT 의 지적
const fatal = [];
for (const [course, kinds] of Object.entries(report)) for (const [kind, list] of Object.entries(kinds)) if (FATAL.has(kind) || FATAL_COURSE.has(course)) fatal.push(`${course} ${kind} ${list.length}`);
console.log(`과정 ${COURSES.filter((c) => !ONLY || c === ONLY).length}개(${COURSES.filter((c) => !ONLY || c === ONLY).join(" · ")})${BREAK ? ` [일부러 깸: ${BREAK}]` : ""} · exit 1 인 지적: ${fatal.length ? fatal.join(" · ") : "없음"} → exit ${fatal.length ? 1 : 0}`);
process.exitCode = fatal.length ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
