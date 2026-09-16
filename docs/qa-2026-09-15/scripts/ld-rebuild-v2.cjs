#!/usr/bin/env node
/**
 * Rebuild every LISTENING lesson's English from the recording — matching
 * ENGLISH TO ENGLISH, and starting again from before the two bad passes.
 *
 *   node docs/qa-2026-09-15/scripts/ld-rebuild-v2.cjs d191   # 한 레슨
 *   node docs/qa-2026-09-15/scripts/ld-rebuild-v2.cjs        # 전체 미리보기
 *   node docs/qa-2026-09-15/scripts/ld-rebuild-v2.cjs --write
 *
 * WHY THIS REPLACES BOTH EARLIER PASSES.
 *
 * `rebuild-ld-scripts.cjs` (5ac7caf) paired Korean sentences to spoken
 * sentences by POSITION, on the grounds that the two counts were equal.
 * `align-ld-remaining.cjs` (7df60ea) paired them by a cross-language score
 * built from numbers, Latin-script names and a length ratio.
 *
 * Both shipped misaligned lessons. Checked afterwards by asking, for each row,
 * whether its new English matches its own original English better than a
 * neighbour's — 69 of 276 lessons failed, in both passes. d191 was off by three
 * rows:
 *
 *   KO  나는 내가 어디로 가기를 원하는지 설명했고 그녀는 …
 *   EN  Can I help you?
 *
 * Equal counts are not proof of correspondence, and a cross-language score that
 * looks plausible is not one either: where the recording opens with a sentence
 * the script never had, a wrong pair still scored better than the cost of
 * skipping it, so the whole lesson slid by one.
 *
 * WHAT THIS DOES INSTEAD. Every row already holds a Korean line and an English
 * line that is a translation of it — poor wording, but the same content. So the
 * match is English against English: the row's own English against the spoken
 * sentences, scored on shared content words. One language, real overlap,
 * nothing inferred from length.
 *
 * The base is 59b37b5, the last commit before either pass, so the rows are the
 * textbook's own again and the parallel English is intact.
 *
 * ROWS MAY MERGE, NEVER SPLIT BLINDLY. A row that holds half a sentence is
 * joined to its neighbour (Korean and all) when the recording says them as one;
 * that is what makes "그 눈이 충분히 단단하면 이웃의 언덕들은 곧 썰매타는" whole
 * again. Korean text is never rewritten, only rejoined.
 *
 * Every spoken sentence lands somewhere: one the script never had is appended
 * to the row before it rather than dropped.
 *
 * A lesson whose match is weak is REPORTED and left at its base state.
 *
 * 🔴 `en` changes, so the clips keyed on its hash must be rebuilt.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/ld_english_scripts.json");
const T = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-rebuild-v2.md");
const BASE = "59b37b5"; // before rebuild-ld-scripts and align-ld-remaining

const WRITE = process.argv.includes("--write");
const only = process.argv.find((a) => /^d\d+$/.test(a));
const MIN = 0.30;

const transcripts = JSON.parse(fs.readFileSync(T, "utf8"));
const base = JSON.parse(
  execSync(`git show ${BASE}:content/ld_english_scripts.json`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
    .replace(/^﻿/, ""),
);

/* ------------------------------------------------------------ splitting --- */
const ABBREV = /\b(?:Mrs|Mr|Ms|Dr|Prof|St|Mt|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Fig|approx|Ave|Rd|Blvd|Gen|Capt|Sgt|Lt|Col|Rev|Hon|Univ|Dept|[A-Z])\.$/;
const isLessonNumber = (s) => /^\d{1,3}\.$/.test(String(s).trim());

function splitSpoken(t) {
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
 * The recordings contain retakes: the reader stumbles, stops and says the
 * sentence again, and both takes are on the tape. Left in, one row gets the
 * abandoned take and the next gets the good one, so the lesson shows the same
 * sentence twice and one of them is broken.
 *
 * A take is abandoned when a sentence close behind it repeats most of its words
 * and says more of them. The window is short because a passage may legitimately
 * repeat a phrase much later.
 */
function dropRetakes(sentences) {
  const keep = sentences.map(() => true);
  const trailsOff = (s) => /(\.\.\.|[^.?!])\s*$/.test(String(s).trim());

  for (let i = 0; i < sentences.length; i++) {
    if (!keep[i]) continue;
    for (let j = i + 1; j < Math.min(i + 4, sentences.length); j++) {
      if (!keep[j]) continue;

      // A fragment that trails off is an abandoned take whenever a sentence
      // nearby says all of it. Dice scores this pair low — the fragment is
      // short and the finished take is long — so it needs containment, not
      // overlap. d237 kept "He may murmur a silent..." as its own row while
      // the complete take sat in the next one.
      const iFrag = trailsOff(sentences[i]), jFrag = trailsOff(sentences[j]);
      if (iFrag !== jFrag) {
        const frag = iFrag ? i : j, whole = iFrag ? j : i;
        if (contains(sentences[whole], sentences[frag]) >= 0.8) { keep[frag] = false; continue; }
      }

      if (overlap(sentences[i], sentences[j]) < 0.62) continue;
      if (iFrag && !jFrag) keep[i] = false;
      else if (jFrag && !iFrag) keep[j] = false;
      else if (sentences[j].length > sentences[i].length) keep[i] = false;
      else keep[j] = false;
    }
  }
  return sentences.filter((_, i) => keep[i]);
}

/** Share of b's content words that appear in a. */
function contains(a, b) {
  const A = bag(a), B = bag(b);
  if (!B.size) return 0;
  let hit = 0;
  for (const w of B) if (A.has(w)) hit++;
  return hit / B.size;
}

/* -------------------------------------------------------------- scoring --- */
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
  // Dice, so a long spoken sentence cannot score well against a short row just
  // by happening to contain its words.
  return (2 * hit) / (A.size + B.size);
}

/* ------------------------------------------------------------- matching --- */
const SKIP = -0.18;

function match(rowsEn, said) {
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
          if (rows > 1 && sents > 1) continue; // one side expands at a time
          const a = rowsEn.slice(i, i + rows).join(" ");
          const b = said.slice(j, j + sents).join(" ");
          put(i + rows, j + sents, overlap(a, b) - (rows + sents - 2) * 0.04);
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
  return steps.reverse();
}

/* ------------------------------------------------------------------ run --- */
const results = [];
for (const id of Object.keys(base).sort()) {
  if (only && id !== only) continue;
  const rows = base[id] || [];
  const said = splitSpoken(transcripts[id]?.text || "");
  if (!rows.length || !said.length) { results.push({ id, ok: false, score: 0, reason: "전사 없음" }); continue; }

  const steps = match(rows.map((r) => r.en), said);
  if (!steps) { results.push({ id, ok: false, score: 0, reason: "정렬 실패" }); continue; }

  const out = [];
  const scores = [];
  const keptOriginal = [];
  for (const s of steps) {
    const spoken = said.slice(s.j, s.toJ).join(" ");
    if (s.toI === s.i) {
      // A spoken sentence with no row: keep it, attached to the row before —
      // unless that row is one whose own English was kept, where appending
      // would splice unrelated text onto it.
      if (out.length && !keptOriginal.includes(out.length)) out[out.length - 1].en += ` ${spoken}`;
      continue;
    }
    const group = rows.slice(s.i, s.toI);
    const own = group.map((r) => r.en).join(" ");
    const score = overlap(own, spoken);
    scores.push(score);

    // The recording does not always cover the whole script. d058 ends at
    // "Glass, leather, wood." while the Korean goes on about his own mine and
    // his own ships; the aligner, obliged to place every row, handed that row
    // the previous row's sentence. Where the assigned English has almost
    // nothing to do with what this row has always said, keep what it had. A
    // stale translation in one row is a smaller harm than another row's
    // sentence sitting under the wrong Korean.
    const kept = score < 0.12;
    if (kept) keptOriginal.push(out.length + 1);
    out.push({
      ko: group.map((r) => r.ko).join(" ").replace(/\s+/g, " ").trim(),
      en: kept ? own : spoken,
    });
  }
  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  results.push({ id, ok: score >= MIN, score, rows: out, wasRows: rows.length, saidN: said.length, keptOriginal });
}

if (only) {
  const r = results[0];
  if (!r) { console.error(`${only} 없음`); process.exit(1); }
  console.log(`${r.id} — 원래 ${r.wasRows}행 · 음성 ${r.saidN}문장 → ${r.rows?.length ?? 0}행 · 점수 ${(r.score * 100).toFixed(0)}\n`);
  (r.rows || []).forEach((x, i) => {
    console.log(`  #${i + 1}`);
    console.log(`    KO  ${x.ko}`);
    console.log(`    EN  ${x.en}`);
    console.log("");
  });
  process.exit(0);
}

const good = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(`레슨 ${results.length}개`);
console.log(`  정렬 성공 : ${good.length}`);
console.log(`  미달·실패 : ${bad.length}${bad.length ? `  (${bad.map((b) => `${b.id}${b.reason ? "" : `(${(b.score * 100).toFixed(0)})`}`).join(" ")})` : ""}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# LISTENING 재구성 v2 — 영어↔영어 대조", "",
  "> 앞선 두 번(위치 기준 / 언어 간 점수)은 276개 중 69개를 어긋나게 만들었습니다.",
  "> 이번에는 각 행의 **기존 영어**를 녹음 문장과 맞춥니다. 같은 언어라 겹침이 실제 근거가 됩니다.",
  "> 한국어 글자는 그대로 두고, 행이 합쳐질 때만 이어 붙입니다.", "",
  `성공 ${good.length} · 미달 ${bad.length}`, ""];
for (const r of good) {
  L.push(`### ${r.id}  (점수 ${(r.score * 100).toFixed(0)} · ${r.wasRows}행 → ${r.rows.length}행)`, "",
    "| # | 한국어 | 음성 그대로 |", "|---|---|---|");
  r.rows.forEach((x, i) => L.push(`| ${i + 1} | ${esc(x.ko)} | ${esc(x.en)} |`));
  L.push("");
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }

const next = {};
for (const id of Object.keys(base)) {
  const r = results.find((x) => x.id === id);
  next[id] = r && r.ok
    ? r.rows.map((x, i) => ({ n: String(i + 1), ko: x.ko, en: x.en }))
    : base[id]; // untouched, at its pre-rebuild state
}
fs.writeFileSync(P, JSON.stringify(next, null, 1), "utf8");
console.log(`\n✅ ${good.length}개 레슨 기록. 미달 ${bad.length}개는 원래 상태(${BASE})로 되돌렸습니다.`);
console.log("🔴 음성 클립을 다시 구우세요.");
