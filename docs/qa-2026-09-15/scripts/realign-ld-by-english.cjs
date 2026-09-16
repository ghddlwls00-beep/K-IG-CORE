#!/usr/bin/env node
/**
 * Replace the English of the remaining LISTENING lessons with the recording's
 * own words, matching ENGLISH TO ENGLISH instead of guessing across languages.
 *
 *   node docs/qa-2026-09-15/scripts/realign-ld-by-english.cjs d185
 *   node docs/qa-2026-09-15/scripts/realign-ld-by-english.cjs
 *   node docs/qa-2026-09-15/scripts/realign-ld-by-english.cjs --write
 *
 * WHY THE FIRST ATTEMPT WAS WRONG. align-ld-remaining.cjs paired Korean
 * sentences to spoken sentences directly, scoring on numbers, Latin-script
 * names and a length ratio. Where the recording opens with a sentence the
 * script does not have, a bad pair still scored better than the penalty for
 * skipping it, so the whole lesson shifted by one. d185 scored 70 and every row
 * was off:
 *
 *   KO  그가 작업을 시작할 준비가 되었다고 느꼈을 때 그는 하나의 결함을 발견했다.
 *   EN  Kaplan, the cutter, studied the diamond for 12 whole months.   ← 다른 문장
 *
 * A plausible-looking score is not a correct pairing, and d178 and d177 were
 * wrong too. All of it is reverted before this runs.
 *
 * WHAT THIS DOES INSTEAD. Every row already holds a Korean line and an English
 * line that IS a translation of it — wrong in wording, but about the same
 * content. So the match is English against English: row English against spoken
 * sentences, scored on shared content words. Same language, real overlap,
 * no length-ratio guessing.
 *
 * ROWS ARE NOT RE-CUT. The 191 lessons in the previous pass could be re-split
 * by sentence because both sides had the same count, which proved the split.
 * Here they do not, so the rows stay exactly where the textbook put them and
 * only the English inside each changes. A row keeps its Korean untouched.
 *
 * Every spoken sentence lands in some row — a sentence the script never had is
 * appended to the row before it rather than dropped, so nothing the speaker
 * says disappears.
 *
 * Lessons whose match is weak are reported and left alone.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/ld_english_scripts.json");
const T = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-realign-preview.md");
const BASE_COMMIT = "5ac7caf"; // before the bad alignment

const WRITE = process.argv.includes("--write");
const only = process.argv.find((a) => /^d\d+$/.test(a));
const MIN = 0.30; // average shared-word score below this is not a match

const transcripts = JSON.parse(fs.readFileSync(T, "utf8"));
const current = JSON.parse(fs.readFileSync(P, "utf8"));
// The pre-alignment rows: Korean and its (poor but parallel) English.
const base = JSON.parse(
  execSync(`git show ${BASE_COMMIT}:content/ld_english_scripts.json`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
    .replace(/^﻿/, ""),
);

const ABBREV = /\b(?:Mrs|Mr|Ms|Dr|Prof|St|Mt|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Fig|approx|Ave|Rd|Blvd|Gen|Capt|Sgt|Lt|Col|Rev|Hon|Univ|Dept|[A-Z])\.$/;
const isLessonNumber = (s) => /^\d{1,3}\.$/.test(String(s).trim());
function splitEn(t) {
  const out = [];
  for (const p of String(t).replace(/\s+/g, " ").trim().split(/(?<=[.?!])\s+/)) {
    const piece = p.trim();
    if (!piece || isLessonNumber(piece)) continue;
    const prev = out[out.length - 1];
    if (prev && (ABBREV.test(prev) || /^[a-z]/.test(piece))) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return dropRetakes(out);
}

/**
 * Drop the narrator's false starts.
 *
 * The recordings contain retakes — the reader stumbles, stops, and says the
 * sentence again, and both takes are on the tape. d237 has
 *
 *   "One boards the plane with great apprehension as he sits in his place and
 *    fastens his seatbelt."
 *   "He may murmur a silent..."
 *   "One boards the plane with great apprehension and as he sits in his place
 *    and fastens his seatbelt, he may murmur a silent prayer for a safe journey."
 *
 * and d164 reads a line once with "civilian" and again with "civilization".
 * Left in, the aligner hands the abandoned take to one row and the good take to
 * the next, and the lesson shows the same sentence twice — one of them broken.
 *
 * A take is abandoned when a later sentence nearby says most of the same words
 * and says more of them. Only a short window is considered, because a passage
 * may legitimately repeat a phrase chapters apart.
 */
function dropRetakes(sentences) {
  const keep = sentences.map(() => true);
  for (let i = 0; i < sentences.length; i++) {
    if (!keep[i]) continue;
    for (let j = i + 1; j < Math.min(i + 3, sentences.length); j++) {
      if (!keep[j]) continue;
      // Two shapes of retake. Dice catches a re-read of about the same length
      // ("civilian" / "civilization"); containment catches the reader starting
      // in the middle and then going back for the whole sentence, where the
      // short take sits entirely inside the long one and Dice stays near 0.5:
      //
      //   "Most states provide attractive roadside camps for motorists."
      //   "For the traveler who merely wants to camp along the way … most
      //    states provide attractive roadside camps for motorists."
      const sim = overlap(sentences[i], sentences[j]);
      const inside = Math.max(containment(sentences[i], sentences[j]), containment(sentences[j], sentences[i]));
      if (sim < 0.6 && inside < 0.9) continue;
      // Keep whichever take is more complete; an unfinished one trails off.
      const iBroken = /[^.?!]$|\.\.\.$/.test(sentences[i].trim());
      const jBroken = /[^.?!]$|\.\.\.$/.test(sentences[j].trim());
      if (iBroken && !jBroken) keep[i] = false;
      else if (jBroken && !iBroken) keep[j] = false;
      else if (sentences[j].length > sentences[i].length) keep[i] = false;
      else keep[j] = false;
    }
  }
  return sentences.filter((_, i) => keep[i]);
}

/** Share of a's content words that also appear in b. */
function containment(a, b) {
  const A = bag(a), B = bag(b);
  if (!A.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / A.size;
}

const STOP = new Set(("a an the of to in on at and or but is are was were be been being am i you he she it we they this "
  + "that these those for with as his her their my your there here not no do does did have has had will would can could "
  + "so if then than very much many more most some any all from by about into out up down over under").split(" "));
const stem = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ed|ing)$/, "");
const bag = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/)
  .filter((w) => w.length > 2 && !STOP.has(w)).map(stem));

function overlap(a, b) {
  const A = bag(a), B = bag(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  // Dice: rewards agreement on both sides, so a long spoken sentence does not
  // score well against a short row just by containing its words.
  return (2 * hit) / (A.size + B.size);
}

const SKIP = -0.18;      // a spoken sentence the script never had
const MIN_PAIR = 0.15;   // below this the two are not the same sentence

/**
 * Monotonic match of rows to spoken sentences.
 *
 * Moves in both directions, because the textbook's rows and the recording's
 * sentences are not the same unit and neither side is always the longer one:
 *
 *   1 row : 1-3 sentences   a row holds a long line, or several short ones
 *   2-3 rows : 1 sentence   a sentence broken across display lines — d050 has
 *                           10 rows against 9 spoken sentences, so without this
 *                           some row is left with no English at all
 *   skip a sentence         the recording says something the script never had
 *
 * When rows merge, their Korean joins too. That is the same re-cutting the
 * earlier pass did for the lessons whose counts matched, and it is what makes a
 * row like "그 눈이 충분히 단단하면 이웃의 언덕들은 곧 썰매타는" whole again.
 */
function match(rowsEn, rowsKo, said) {
  const n = rowsEn.length, m = said.length;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(-Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  dp[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (dp[i][j] === -Infinity) continue;
      const put = (ni, nj, add) => {
        const v = dp[i][j] + add;
        if (v > dp[ni][nj]) { dp[ni][nj] = v; back[ni][nj] = { i, j }; }
      };
      for (let rows = 1; rows <= 3 && i + rows <= n; rows++) {
        for (let sents = 1; sents <= 3 && j + sents <= m; sents++) {
          if (rows > 1 && sents > 1) continue; // one side at a time
          const a = rowsEn.slice(i, i + rows).join(" ");
          const b = said.slice(j, j + sents).join(" ");
          const sim = overlap(a, b);
          // A pair this weak is not a pair. Without the floor, a near-zero
          // score still beat the cost of skipping, so a spoken sentence the
          // script never had was forced onto the first row and the lesson slid
          // by one — d177 opened with "To make the trip more interesting for
          // his young children…" under a Korean line about arriving at the
          // station.
          if (sim < MIN_PAIR) continue;
          // A small cost per extra unit, so an even pairing is preferred when
          // the scores are close.
          put(i + rows, j + sents, sim - (rows + sents - 2) * 0.04);
        }
      }
      if (j < m) put(i, j + 1, SKIP);
    }
  }
  if (dp[n][m] === -Infinity) return null;

  const steps = [];
  let i = n, j = m;
  while (i || j) {
    const b = back[i][j];
    if (!b) return null;
    steps.push({ i: b.i, j: b.j, toI: i, toJ: j });
    i = b.i; j = b.j;
  }
  steps.reverse();

  const out = [];
  const scores = [];
  // A sentence skipped before any row has no row to hang on yet; it waits and
  // goes in front of the first one. d178's recording opens with "Read the
  // following set of numbers.", which the script does not have, and dropping it
  // would lose the instruction the speaker gives.
  let pending = "";
  for (const s of steps) {
    const text = said.slice(s.j, s.toJ).join(" ");
    if (s.toI === s.i) {
      if (out.length) out[out.length - 1].en += ` ${text}`;
      else pending = pending ? `${pending} ${text}` : text;
      continue;
    }
    const ko = rowsKo.slice(s.i, s.toI).join(" ");
    const en = pending ? `${pending} ${text}` : text;
    pending = "";
    out.push({ ko, en });
    scores.push(overlap(rowsEn.slice(s.i, s.toI).join(" "), text));
  }
  if (out.some((r) => !r.ko || !r.en)) return null;
  return {
    rows: out,
    score: scores.reduce((a, b) => a + b, 0) / (scores.length || 1),
    skipped: steps.filter((s) => s.toI === s.i).length,
    merged: steps.filter((s) => s.toI - s.i > 1).length,
  };
}

/* ------------------------------------------------------------------ run --- */
/**
 * All 276, not just the ones the earlier pass left alone.
 *
 * The retakes are in every recording, so the 191 lessons the sentence-count
 * pass already rewrote carry them too — it split the transcript the same way
 * and never knew to look. Rebuilding every lesson from the same base keeps one
 * path through this data instead of two.
 */
const targets = Object.keys(base);
const results = [];
for (const id of targets) {
  if (only && id !== only) continue;
  const rows = base[id];
  const said = splitEn(transcripts[id]?.text || "");
  if (!said.length) continue;
  const m = match(rows.map((r) => r.en), rows.map((r) => r.ko), said);
  results.push(m
    ? { id, ok: m.score >= MIN, old: rows, out: m.rows, score: m.score, skipped: m.skipped, merged: m.merged, said: said.length }
    : { id, ok: false, old: rows, out: null, score: 0, skipped: 0, merged: 0, said: said.length });
}

if (only) {
  const r = results[0];
  if (!r) { console.error(`${only} 는 대상이 아닙니다.`); process.exit(1); }
  console.log(`${r.id} — 이전 ${r.old.length}행 · 음성 ${r.said}문장 · 점수 ${(r.score * 100).toFixed(0)} · 합친 행 ${r.merged} · 앞 행에 붙인 문장 ${r.skipped}\n`);
  if (!r.out) { console.log("  (매칭 실패)"); process.exit(1); }
  r.out.forEach((row, i) => {
    console.log(`  ${String(i + 1).padStart(2)} KO  ${row.ko}`);
    console.log(`     EN  ${row.en}`);
    console.log("");
  });
  process.exit(0);
}

const good = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(`대상 ${results.length}개`);
console.log(`  매칭 성공 : ${good.length}`);
console.log(`  약함 — 손대지 않음 : ${bad.length}${bad.length ? `  (${bad.map((r) => `${r.id}(${(r.score * 100).toFixed(0)})`).join(" ")})` : ""}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# LISTENING 재정렬 — 영어끼리 맞춘 결과", "",
  "> 행은 그대로 두고 **영어만** 녹음의 말로 바꿉니다. 한국어는 글자 하나 건드리지 않습니다.",
  "> 짝짓기는 한↔영이 아니라 **영↔영**(기존 영어 ↔ 녹음)으로 했습니다.", "",
  `성공 ${good.length} · 약함 ${bad.length}`, ""];
for (const r of good) {
  L.push(`### ${r.id} (점수 ${(r.score * 100).toFixed(0)} · ${r.old.length}행 → ${r.out.length}행)`, "",
    "| # | 한국어 | 새 영어 (녹음) |", "|---|---|---|");
  r.out.forEach((row, i) => L.push(`| ${i + 1} | ${esc(row.ko)} | ${esc(row.en)} |`));
  L.push("");
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }
// Revert every target to its pre-alignment rows first, so a lesson this pass
// cannot fix is left as it was rather than keeping the bad alignment.
for (const r of results) current[r.id] = base[r.id].map((row) => ({ ...row }));
for (const r of good) current[r.id] = r.out.map((row, i) => ({ n: String(i + 1), ko: row.ko, en: row.en }));
fs.writeFileSync(P, JSON.stringify(current, null, 1), "utf8");
console.log(`\n✅ ${good.length}개 적용 · ${bad.length}개는 이전 상태로 되돌림`);
console.log("🔴 음성 클립을 다시 구우세요.");
