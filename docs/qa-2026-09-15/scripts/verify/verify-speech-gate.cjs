#!/usr/bin/env node
/**
 * SEC-02 — who may fetch a pre-generated speech clip.
 *
 * WHY THIS EXISTS. `/audio/azure-ava/v1/<hash>.mp3` answered everyone. The
 * rule assumed a hash is only guessable by someone who already knows the
 * sentence — but the repository holding `content/` is public and so is the
 * hash function, and the launch audit fetched 13 of 14 locked-lesson clips
 * anonymously. `mediaAccess.ts` now serves a clip without a licence only when
 * its key is on the build-time list of clips the FREE lessons speak
 * (`src/lib/generated/freeSpeechKeys.json`).
 *
 * FOUR AXES, none of them a route count:
 *
 *   A  FREE CLIPS ARE STILL SERVED, with real audio bytes and a public cache.
 *      Narrowing an allow list is how a free lesson goes silent — RE-004 hit
 *      exactly that with STUDENT's `s1-1-1.mp3` — so this is asserted first.
 *   B  LOCKED CLIPS ARE DENIED, and the denial is not cacheable by a shared
 *      cache. The sentences come from real locked lessons of every live
 *      course, hashed with the app's own function, so the test asks for the
 *      very URLs the browser would.
 *   C  THE FREE LIST AGREES WITH THE LESSON FILES. The first sentence of every
 *      free lesson is hashed here, independently of the build script, and must
 *      be on the list. This is the drift guard between the generator's walk
 *      and the gate's list.
 *   D  AN UNKNOWN KEY IS DENIED, so the space cannot be probed anonymously.
 *
 * USAGE
 *   node verify-speech-gate.cjs http://localhost:3210
 *   node verify-speech-gate.cjs https://k-ig-core.vercel.app
 *
 * EXIT 0 = every assertion passed. Exit 1 = at least one failed.
 *
 * CDN NOTE. The old rule sent locked clips with `public, immutable` for a
 * year. Vercel's edge cache is per deployment, so a fresh deployment starts
 * clean, but a run against an OLD deployment can still see edge hits — the
 * summary prints `x-vercel-cache` for every locked sample so that is visible.
 *
 * 🔴 LOCAL RUNS: `next start` serves `public/audio/` straight from disk BEFORE
 * the route handler, and a machine that generated the clips has all of them
 * there (the folder is gitignored, so Vercel never has it). Against such a
 * server every clip answers 206 and the gate is never consulted. This probe
 * detects that and refuses to report a result — move `public/audio` aside for
 * the run, or run it against a deployment.
 */

const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");

const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");
const LESSONS = path.join(REPO, "content/lessons");

const freeList = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/freeSpeechKeys.json"), "utf8"));
const FREE_KEYS = new Set(freeList.keys);
const { unifiedSpeechKey, unifiedSpeechPath, normalizeUnifiedSpeechText } = loadTs(
  path.join(REPO, "src/lib/unifiedSpeech.ts"),
);
const LD_SCRIPTS = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const { FREE_PREVIEW_LESSON_IDS, isFreePreviewLesson } = loadTs(path.join(REPO, "src/lib/license.ts"));
const validRoutes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const LIVE_COURSES = Object.keys(validRoutes.lessons).filter((c) => c !== "cnn");

const rows = [];
function record(name, ok, notes = [], problems = []) {
  rows.push({ name, ok, notes, problems });
}

/**
 * English a lesson actually speaks, in order, already normalised the way the
 * app keys clips — a heading like "[ Page 006 ]" normalises to nothing and has
 * no clip, so it is not a sentence here. LISTENING's English lives in the
 * supplemental script file and VOCA's in the word grid, so both are read from
 * where the views read them.
 */
function sentencesOf(course, id) {
  const out = [];
  const push = (value) => {
    if (typeof value !== "string" || /[가-힣]/.test(value)) return;
    const clean = normalizeUnifiedSpeechText(value);
    if (/[A-Za-z]{3}/.test(clean)) out.push(clean);
  };
  if (course === "ld") {
    for (const row of LD_SCRIPTS[id.replace(/-1$/, "")] || []) push(row?.en);
  }
  const file = path.join(LESSONS, course, `${id}.json`);
  if (fs.existsSync(file)) {
    const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
    if (course === "phonics") {
      const grid = (lesson.blocks || []).find((b) => b?.type === "wordgrid");
      for (const word of (grid?.rows || []).flat()) push(word);
    }
    const walk = (value, key) => {
      if (typeof value === "string") {
        if (["text", "english", "en"].includes(key)) push(value);
        return;
      }
      if (Array.isArray(value)) return value.forEach((v) => walk(v, key));
      if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
    };
    walk(lesson, "");
  }
  return out;
}

async function rangeGet(url) {
  const res = await fetch(url, { headers: { Range: "bytes=0-1" }, redirect: "manual" });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    status: res.status,
    bytes: bytes.length,
    type: res.headers.get("content-type"),
    cache: res.headers.get("cache-control"),
    edge: res.headers.get("x-vercel-cache"),
  };
}

async function probeFreeClips() {
  // A deterministic stride sample of the free list, plus every course's first
  // free sentence so each course is represented.
  const sample = new Set();
  const stride = Math.max(1, Math.floor(freeList.keys.length / 20));
  for (let i = 0; i < freeList.keys.length; i += stride) sample.add(freeList.keys[i]);
  const problems = [];
  let served = 0;
  let missing = 0;
  for (const key of sample) {
    const url = `${BASE}/audio/azure-ava/v1/${key}.mp3`;
    const res = await rangeGet(url);
    if (res.status === 404) {
      // The list can name a clip the generator has not produced yet; that is
      // a generator gap, not a gate failure, but it is reported.
      missing++;
      continue;
    }
    if (res.status !== 206 && res.status !== 200) {
      problems.push(`${key}: expected 200/206 for a free clip, got ${res.status}`);
      continue;
    }
    if (!res.bytes) problems.push(`${key}: ${res.status} but no bytes`);
    if (!/^audio\//.test(res.type || "")) problems.push(`${key}: Content-Type is "${res.type}"`);
    if (!/\bpublic\b/.test(res.cache || "")) problems.push(`${key}: a free clip should be publicly cacheable — ${res.cache}`);
    served++;
  }
  record(
    `A free clips served (${sample.size} sampled of ${freeList.keys.length})`,
    problems.length === 0 && served > 0,
    [`${served} served with audio bytes, ${missing} not in the bucket (404)`],
    problems,
  );
}

async function probeLockedClips() {
  for (const course of LIVE_COURSES) {
    const ids = validRoutes.lessons[course].filter((id) => !isFreePreviewLesson(course, id));
    // A locked lesson with at least four sentences no free lesson also speaks —
    // a chapter overview of one-word headings proves little either way.
    const lessonId = ids.find(
      (id) => sentencesOf(course, id).filter((s) => !FREE_KEYS.has(unifiedSpeechKey(s)) && s.split(" ").length >= 3).length >= 4,
    ) || ids.find((id) => sentencesOf(course, id).length > 0);
    if (!lessonId) {
      record(`B locked ${course}`, false, [], ["no locked lesson with English sentences"]);
      continue;
    }
    const sentences = sentencesOf(course, lessonId)
      .filter((s) => s.split(" ").length >= 3 || course === "phonics")
      .slice(0, 4);
    const problems = [];
    const notes = [];
    let denied = 0;
    let absent = 0;
    for (const sentence of sentences) {
      const key = unifiedSpeechKey(sentence);
      if (FREE_KEYS.has(key)) {
        // A sentence shared with a free lesson is legitimately public; skip it.
        notes.push(`"${sentence.slice(0, 40)}" is also spoken by a free lesson — skipped`);
        continue;
      }
      const res = await rangeGet(`${BASE}${unifiedSpeechPath(sentence)}`);
      if (res.status === 404) {
        absent++;
        continue;
      }
      if (res.status !== 403) {
        problems.push(`${lessonId} "${sentence.slice(0, 40)}": expected 403, got ${res.status} (edge ${res.edge || "-"})`);
        continue;
      }
      if (/\bpublic\b/.test(res.cache || "")) problems.push(`${lessonId}: denial is publicly cacheable — ${res.cache}`);
      denied++;
    }
    notes.push(`${denied} denied, ${absent} absent (404)`);
    record(`B locked ${course} (${lessonId})`, problems.length === 0 && denied > 0, notes, problems);
  }
}

/**
 * Axis C hashes what the VIEW speaks, not the raw JSON value: GRAMMAR strips a
 * leading item number ("1. I was poor." is spoken as "I was poor."). Hashing
 * the raw value let this axis pass while the page requested a clip that was
 * not on the list — caught in independent review. Every sentence is checked,
 * not only the first.
 */
function probeListAgreesWithFiles() {
  const problems = [];
  let checked = 0;
  for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
    if (course === "cnn") continue;
    for (const id of ids) {
      for (const sentence of sentencesOf(course, id)) {
        const spoken = sentence.replace(/^\s*\d+[.)]\s*/, "");
        checked++;
        if (!FREE_KEYS.has(unifiedSpeechKey(spoken))) {
          problems.push(`${course}/${id}: "${spoken.slice(0, 50)}" is not on the free list`);
        }
      }
    }
  }
  record(`C free list covers every sentence the free lessons speak (${checked} checked)`, problems.length === 0, [], problems.slice(0, 10));
}

async function probeUnknownKey() {
  const res = await rangeGet(`${BASE}/audio/azure-ava/v1/0-0000000000000000.mp3`);
  record(
    "D unknown key denied",
    res.status === 403,
    [`status ${res.status}`],
    res.status === 403 ? [] : [`expected 403 for an unknown clip key, got ${res.status}`],
  );
}

(async () => {
  console.log(`SEC-02 speech gate probe — ${BASE}\n`);

  // Refuse to measure a server that answers clips from disk (see the LOCAL RUNS
  // note). A clip that exists locally but is NOT free is requested without a
  // licence; if the answer carries the static-file signature instead of the
  // route handler's Cache-Control, the gate was never asked.
  const localClips = path.join(REPO, "public/audio/azure-ava/v1");
  if (/localhost|127\.0\.0\.1/.test(BASE) && fs.existsSync(localClips)) {
    const onDisk = fs.readdirSync(localClips).find((f) => f.endsWith(".mp3") && !FREE_KEYS.has(f.slice(0, -4)));
    if (onDisk) {
      const res = await rangeGet(`${BASE}/audio/azure-ava/v1/${onDisk}`);
      if (res.status !== 403) {
        console.log(
          `REFUSED: ${onDisk} is on disk under public/audio and answered ${res.status} (${res.cache || "no cache-control"}).\n` +
            "The static file server is answering before the media route, so nothing here would test the gate.\n" +
            "Move public/audio aside for the run, or run against a deployment.",
        );
        process.exitCode = 2;
        return;
      }
    }
  }

  await probeFreeClips();
  await probeLockedClips();
  probeListAgreesWithFiles();
  await probeUnknownKey();

  let pass = 0;
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}`);
    for (const note of row.notes) console.log(`        · ${note}`);
    for (const problem of row.problems) console.log(`        ✗ ${problem}`);
    if (row.ok) pass++;
  }
  console.log(`\n${pass}/${rows.length} checks pass`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "verify-speech-gate.json"),
    JSON.stringify({ base: BASE, pass, total: rows.length, rows }, null, 2),
  );
  process.exit(pass === rows.length ? 0 : 1);
})();
