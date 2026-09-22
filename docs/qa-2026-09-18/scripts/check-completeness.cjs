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
 * Output: out/completeness.json + printed tables.
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--course", null);

const CLIP_DIR = path.join(REPO, "public/audio/azure-ava/v1");
const onDisk = new Set(fs.readdirSync(CLIP_DIR).filter((f) => f.endsWith(".mp3")));
const clipExists = (p) => onDisk.has(path.basename(String(p)));

const gaps = [];
const report = {};
const add = (course, kind, detail, where) => {
  const c = (report[course] ||= {});
  const k = (c[kind] ||= []);
  k.push({ where, detail });
};

for (const course of E.COURSES) {
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
    }

    // 4. every speaker button needs a clip file; a missing file is a button that cannot speak
    for (const p of x.clipPaths || []) if (!clipExists(p)) add(course, "missing-clip", `음성 파일 없음: ${p}`, where);
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
fs.writeFileSync(path.join(OUT, "completeness.json"), JSON.stringify({ at: new Date().toISOString(), totals, report }, null, 1));

console.log(`누락 점검 — 과정 ${Object.keys(report).length}개, 지적 ${grand}건\n`);
for (const [course, kinds] of Object.entries(totals)) {
  console.log(`== ${course}`);
  for (const [kind, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) {
    const sample = report[course][kind][0];
    console.log(`   ${String(n).padStart(5)} × ${kind.padEnd(24)} e.g. ${sample.where} — ${sample.detail}`);
  }
}
console.log(`\n→ ${path.join(OUT, "completeness.json")}`);
