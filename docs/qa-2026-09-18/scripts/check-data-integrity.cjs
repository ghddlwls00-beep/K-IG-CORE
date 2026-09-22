#!/usr/bin/env node
/**
 * 명령서 §6(VOCA 낱말별 항목)·§11(데이터 무결성)이 요구하는 전수 검사.
 *
 * The completeness pass asked whether a lesson's parts exist; this asks the questions that only
 * show up when the whole dataset is compared with itself: the same passage sitting in two
 * lessons, one clip serving two different sentences, a word whose quiz teaches a different
 * meaning from its card, an id that appears twice.
 *
 *   node check-data-integrity.cjs
 * Output: out/data-integrity.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const OUT = path.join(__dirname, "../out");

const voca = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const report = {};
const add = (kind, severity, detail) => ((report[kind] ||= { severity, items: [] }).items.push(detail));

// ---------------------------------------------------------------- §11 ids and ordering
const seenIds = {};
for (const course of E.COURSES) {
  const idx = E.courseIndex(course).lessons || [];
  const counts = {};
  for (const l of idx) counts[l.id] = (counts[l.id] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) if (n > 1) add("duplicate-lesson-id", "P2", `${course}/${id} — 목차에 ${n}번 등장`);
  // an id reused across two different courses would break routing
  for (const l of idx) ((seenIds[l.id] ||= []).push(course));
  // Ordering, checked WITHIN a family of ids. VOCA legitimately restarts numbering at each level
  // (hv-01…hv-75, mv1-01…, mv2-01…), so comparing across families reported a jump that is the
  // design. Only a step backwards inside one prefix is out of order.
  const mains = idx.filter((l) => l.variant === "main");
  const byPrefix = {};
  for (const l of mains) {
    const m = String(l.id).match(/^(.*?)(\d+)$/);
    if (m) (byPrefix[m[1]] ||= []).push(Number(m[2]));
  }
  for (const [prefix, nums] of Object.entries(byPrefix)) {
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < nums[i - 1]) { add("out-of-order", "P3", `${course} — 목차에서 ${prefix}${nums[i - 1]} 다음에 ${prefix}${nums[i]}`); break; }
    }
  }
}
for (const [id, courses] of Object.entries(seenIds)) if (new Set(courses).size > 1) add("id-in-two-courses", "P2", `${id} — ${[...new Set(courses)].join(", ")} 에 모두 존재`);

// ---------------------------------------------------------------- §11 duplicated lesson content
// A passage that appears word-for-word in another lesson is either a copy-paste mistake or a
// lesson the learner pays for twice.
const fingerprint = (texts) => {
  const body = texts.filter((t) => t.text && t.text.length > 25).map((t) => t.text.replace(/\s+/g, "")).sort().join("|");
  return body.length > 120 ? body.slice(0, 600) : null;
};
const byPrint = {};
for (const course of E.COURSES) {
  for (const p of E.pages(course)) {
    if (!E.hasLesson(course, p.id)) continue;
    const x = E.expected(course, p.id);
    const fp = fingerprint(x.texts);
    if (fp) (byPrint[fp] ||= []).push(`${course}/${p.id}`);
  }
}
for (const [, group] of Object.entries(byPrint)) {
  if (group.length < 2) continue;
  // A main lesson and its own script page legitimately share the text. Strip only the variant
  // suffix (-1/-2): stripping any trailing -digits turns "gh1-013" into "gh1" and made the main
  // lesson look like a different lesson from its own script page.
  const bases = new Set(group.map((g) => g.replace(/-[12]$/, "")));
  if (bases.size === 1) continue;
  add("duplicate-lesson-content", "P2", `본문이 완전히 같은 강의: ${group.join(" = ")}`);
}

// ---------------------------------------------------------------- §11 one clip, two texts
const inv = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, "audio-inventory.json"), "utf8")); } catch { return null; } })();
if (inv) {
  for (const c of inv.clips) {
    if ((c.textCount || (c.texts || []).length) > 1) {
      const texts = (c.texts || []).map((t) => String(t).replace(/\s+/g, " ").trim());
      if (new Set(texts.map((t) => t.toLowerCase())).size > 1) {
        add("one-clip-two-texts", "P2", `${c.path} — 서로 다른 문장 ${texts.length}개가 같은 음성을 씁니다: ${texts.slice(0, 2).map((t) => JSON.stringify(t.slice(0, 50))).join(" / ")}`);
      }
    }
  }
}

// ---------------------------------------------------------------- §6 VOCA per-word fields
const vocaStats = { words: 0, distinct: 0, withMeaning: 0, withCollocation: 0, withAudio: 0 };
const seenWord = {};
for (const p of E.pages("phonics")) {
  if (!E.hasLesson("phonics", p.id)) continue;
  const words = E.gridWords(E.lesson("phonics", p.id));
  const inLesson = {};
  for (const w of words) {
    vocaStats.words++;
    inLesson[w.toLowerCase()] = (inLesson[w.toLowerCase()] || 0) + 1;
    (seenWord[w.toLowerCase()] ||= []).push(p.id);
    const entry = dict[w] || dict[w.toLowerCase().trim()];
    if (!entry || !String(entry.meaning || "").trim()) add("voca-no-meaning", "P1", `phonics/${p.id} — "${w}" 의 뜻이 사전에 없음`);
    else vocaStats.withMeaning++;
    if (voca.getCollocation && voca.getCollocation(w, entry && entry.searchWord)) vocaStats.withCollocation++;
    // Can the quiz end up teaching a different meaning from the card?
    // Only if ONE LESSON holds two case-variants of the same word. PhonicsLearningView builds the
    // quiz dictionary from the lesson's own words with the exact-form lookup and keys it by the
    // lower-cased word (`dictMap[clean] = { meaning: getMeaning(w) }`), so "Miss" in one lesson
    // and "miss" in another never collide — comparing the two dictionary entries directly said
    // they did, which was wrong. Two variants in the SAME lesson would overwrite each other.
    // (Measured: 0 lessons do this.)
  }
  for (const [w, n] of Object.entries(inLesson)) if (n > 1) add("voca-duplicate-in-lesson", "P3", `phonics/${p.id} — "${w}" 가 한 강의에 ${n}번`);
  // two case-variants of one word in the same lesson: the quiz dictionary would keep only one
  const byLower = {};
  for (const w of words) (byLower[w.toLowerCase().trim()] ||= new Set()).add(w);
  for (const [k, set] of Object.entries(byLower)) {
    if (set.size > 1) add("voca-case-clash-in-lesson", "P2", `phonics/${p.id} — 같은 강의에 "${[...set].join('" 과 "')}" 가 함께 있어 퀴즈가 한쪽 뜻만 씁니다`);
  }
}
vocaStats.distinct = Object.keys(seenWord).length;
for (const [w, lessons] of Object.entries(seenWord)) {
  if (lessons.length > 3) add("voca-word-in-many-lessons", "P3", `"${w}" 가 강의 ${lessons.length}개에 중복 등장 (${lessons.slice(0, 4).join(", ")}…)`);
}

// ---------------------------------------------------------------- §11 prev/next routes
for (const course of E.COURSES) {
  const nb = E.neighbours(course);
  const ids = new Set(E.pages(course).map((p) => p.id));
  for (const [id, n] of Object.entries(nb)) {
    if (n.prev && !ids.has(n.prev)) add("broken-prev-next", "P2", `${course}/${id} — 이전 강의 ${n.prev} 가 존재하지 않음`);
    if (n.next && !ids.has(n.next)) add("broken-prev-next", "P2", `${course}/${id} — 다음 강의 ${n.next} 가 존재하지 않음`);
  }
}

// ---------------------------------------------------------------- 결과
const totals = {};
for (const [k, g] of Object.entries(report)) totals[k] = { severity: g.severity, count: g.items.length };
fs.writeFileSync(path.join(OUT, "data-integrity.json"), JSON.stringify({ at: new Date().toISOString(), vocaStats, totals, report }, null, 1));

console.log(`VOCA 낱말 ${vocaStats.words}개 (서로 다른 낱말 ${vocaStats.distinct}개)`);
console.log(`  뜻이 있는 낱말 ${vocaStats.withMeaning} / ${vocaStats.words}`);
console.log(`  연어(콜로케이션) 카드가 있는 낱말 ${vocaStats.withCollocation} / ${vocaStats.words}`);
console.log(`\n데이터 무결성 지적 ${Object.values(totals).reduce((a, t) => a + t.count, 0)}건\n`);
for (const [k, t] of Object.entries(totals).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${t.severity}  ${String(t.count).padStart(5)} × ${k}`);
  for (const i of report[k].items.slice(0, 3)) console.log(`            ${String(i).slice(0, 150)}`);
}
console.log(`\n→ ${path.join(OUT, "data-integrity.json")}`);
