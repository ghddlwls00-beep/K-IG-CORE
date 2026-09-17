#!/usr/bin/env node
/**
 * RE-004 — who may fetch a media object.
 *
 * WHY THIS EXISTS. The media gate failed OPEN. A key whose folder did not map
 * onto a course was allowed, on the theory that such keys were section artwork.
 * They are not — the artwork is served statically from `public/images/` and
 * never reaches the route handler — so the rule let the retired courses out:
 * `audio/adults/`, `audio/man/`, `audio/woman/`, `audio/basics/`,
 * `audio/chinese/`, `audio/middle/`. Measured on production 2026-09-16,
 * `/audio/adults/am01.mp3` answered 200 with `public, max-age=31536000,
 * immutable`. A status-code probe would have called that "the gate works",
 * because 200 is what a working gate returns for a free lesson too.
 *
 * SO THIS PROBE HAS SIX AXES, and it does not count routes:
 *
 *   A  RETIRED FOLDERS ARE DENIED — and the denial is not cacheable. A 403 the
 *      CDN is allowed to store is a different bug wearing the same status code.
 *   B  RETIRED OBJECTS ACTUALLY EXIST. A 403 proves nothing if the object was
 *      never there. Existence is checked through the same origin reader the
 *      route uses, so "denied" and "absent" cannot be confused.
 *   C  WHAT THE FREE PAGES ASK FOR IS SERVED. The paths are read out of the
 *      served HTML, not out of a list in this file, and each must come back
 *      200 with real bytes. This is the axis that caught STUDENT: its free
 *      preview lesson references `s1-1-1.mp3` … and every one of them was 403.
 *   D  PAID MEDIA IS STILL DENIED, and the pre-generated clips and Range
 *      requests still work. Narrowing an allow list is how a paying customer's
 *      audio goes silent, so the paid sample is asserted per course.
 *   E  THE PAGE GATE AGREES WITH THE MEDIA GATE. A free lesson page must render
 *      its body, and a retired course must not be routable at all.
 *   F  THE ORIGIN IS STILL READABLE — /api/media-health.
 *
 * EVERYTHING IS DERIVED, NOT HAND-LISTED. The course list comes from the
 * app's own generated `validRoutes.json`; the free ids from `license.ts`; the
 * retired folders from `content/lessons/` minus the live courses; the media
 * paths from the lesson JSON and from the served HTML. Add a course and this
 * probe covers it; retire one and the probe starts asserting it is denied.
 *
 * THE CDN IS REPORTED SEPARATELY. A denied path can still be answered from the
 * edge for up to a year, because the old rule attached `immutable` to it. So
 * every retired sample records `x-vercel-cache` and `age`, and the summary
 * prints how many were edge hits. `?cb=` defeats the edge cache; compare the
 * two numbers before believing a fix.
 *
 * USAGE
 *   node verify-media-access.cjs                       # http://localhost:3210
 *   node verify-media-access.cjs http://localhost:3210
 *   node verify-media-access.cjs https://k-ig-core.vercel.app
 *
 * EXIT 0 = every assertion passed. Exit 1 = at least one failed, printed with
 * the value that failed it.
 *
 * DETECTION POWER, MEASURED. Against production before this shipped: axis A
 * fails on every retired folder (all 200 + `public, immutable`) and axis C
 * fails on STUDENT (18 of 18 references 403). Against the fixed local build:
 * 0 failures. Both numbers are in docs/qa-2026-09-15/PROGRESS.md.
 */

const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");

const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const CONTENT_LESSONS = path.join(REPO, "content/lessons");
const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");

/* ------------------------------------------------------------------ inputs */

/**
 * The origin reader needs the R2 credentials, and it reads them at import
 * time. `.env.local` is not loaded by a bare node process, so it is parsed
 * here — into this process only. No value is ever printed, logged or written
 * to the report; the report records booleans.
 */
function loadEnvLocal() {
  const file = path.join(REPO, ".env.local");
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
  return true;
}
const ENV_LOCAL_PRESENT = loadEnvLocal();

const validRoutes = JSON.parse(
  fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"),
);
const LIVE_COURSES = Object.keys(validRoutes.lessons);

const { FREE_PREVIEW_LESSON_IDS, isFreePreviewLesson } = loadTs(
  path.join(REPO, "src/lib/license.ts"),
);
const { unifiedSpeechPath } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const { HAS_S3_CREDENTIALS, fetchMediaObject } = loadTs(path.join(REPO, "src/lib/mediaOrigin.ts"));

const MEDIA_REF = /\/(audio|video)\/[A-Za-z0-9_.\/-]*[A-Za-z0-9_-]\.[a-z0-9]+/g;

function readLesson(course, id) {
  const file = path.join(CONTENT_LESSONS, course, `${id}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function lessonIds(course) {
  return fs
    .readdirSync(path.join(CONTENT_LESSONS, course))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

/** Every media path a lesson object mentions, deduplicated, in order. */
function mediaRefsOf(value) {
  return [...new Set(String(JSON.stringify(value)).match(MEDIA_REF) || [])];
}

function refsFor(course, id) {
  const lesson = readLesson(course, id);
  return lesson ? mediaRefsOf(lesson) : [];
}

// The retired lesson folders are whatever content/lessons has that the app does
// not route. The retired MEDIA folders are the ones those lessons reference
// that are not a live course's folder — that is how `adults-m` (which points at
// `audio/adults/`) resolves to the folder that actually holds the objects.
const lessonFolders = fs
  .readdirSync(CONTENT_LESSONS)
  .filter((d) => fs.statSync(path.join(CONTENT_LESSONS, d)).isDirectory());
const retiredLessonFolders = lessonFolders.filter((d) => !LIVE_COURSES.includes(d));

const retiredMediaFolders = new Map(); // folder -> [paths]
for (const folder of retiredLessonFolders) {
  for (const id of lessonIds(folder)) {
    for (const ref of refsFor(folder, id)) {
      const mediaFolder = ref.split("/").filter(Boolean)[1];
      if (!mediaFolder || LIVE_COURSES.includes(mediaFolder)) continue;
      if (!retiredMediaFolders.has(mediaFolder)) retiredMediaFolders.set(mediaFolder, []);
      const list = retiredMediaFolders.get(mediaFolder);
      if (list.length < 3 && !list.includes(ref)) list.push(ref);
    }
  }
}

/* ------------------------------------------------------------------ helpers */

const rows = [];
function record(name, ok, notes = [], problems = []) {
  rows.push({ name, ok, notes, problems });
}

function stripHtml(html) {
  const body = html.match(/<body[\s\S]*?<\/body>/i);
  let text = body ? body[0] : html;
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

async function head(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "manual" });
  return {
    status: res.status,
    type: res.headers.get("content-type"),
    length: Number(res.headers.get("content-length") || 0),
    cache: res.headers.get("cache-control"),
    edge: res.headers.get("x-vercel-cache"),
    age: res.headers.get("age"),
  };
}

/** A denial the CDN is allowed to keep is not a denial. */
function isCacheablePublic(cacheControl) {
  return /\bpublic\b/i.test(cacheControl || "");
}

/* ------------------------------------------------------------------- probes */

async function probeRetiredFolders() {
  for (const [folder, samples] of [...retiredMediaFolders.entries()].sort()) {
    const problems = [];
    const notes = [];
    let edgeHits = 0;

    for (const ref of samples) {
      const url = `${BASE}${ref}`;
      let origin = null;
      if (HAS_S3_CREDENTIALS) {
        try {
          const object = await fetchMediaObject(ref.replace(/^\//, ""), "bytes=0-1");
          origin = object.status;
        } catch (err) {
          origin = `error:${err.name || err.message}`;
        }
      }

      let res;
      try {
        res = await head(url);
      } catch (err) {
        problems.push(`${ref}: request failed — ${err.message}`);
        continue;
      }
      if (res.edge === "HIT") edgeHits++;

      // B — the object is really in the bucket, so a denial is not an absence.
      if (HAS_S3_CREDENTIALS && origin !== 200 && origin !== 206) {
        notes.push(`${ref}: NOT FOUND in the bucket (origin ${origin}) — sample proves nothing`);
        continue;
      }
      // A — denied, and the denial is not storable by a shared cache.
      if (res.status !== 403) problems.push(`${ref}: expected 403, got ${res.status}`);
      if (isCacheablePublic(res.cache)) {
        problems.push(`${ref}: denial is publicly cacheable — Cache-Control: ${res.cache}`);
      }
    }

    if (edgeHits) {
      notes.push(
        `${edgeHits}/${samples.length} answered from the edge cache — the old rule cached these for a year`,
      );
    }
    if (HAS_S3_CREDENTIALS) notes.push("existence confirmed through the origin reader");
    else notes.push("NOTE: no R2 credentials — existence not verified, only the denial is");

    record(
      `A/B retired folder "${folder}" (${samples.length} sample${samples.length === 1 ? "" : "s"})`,
      problems.length === 0,
      notes,
      problems,
    );
  }
}

async function probeFreeLessonMedia() {
  for (const course of LIVE_COURSES) {
    const freeIds = FREE_PREVIEW_LESSON_IDS[course] || [];
    if (freeIds.length === 0) {
      record(`C free preview ${course}`, false, [], ["no free preview lesson is declared"]);
      continue;
    }

    const problems = [];
    const notes = [];
    let checked = 0;

    for (const id of freeIds.slice(0, 2)) {
      const pageUrl = `${BASE}/${course}/${id}`;
      let html;
      try {
        const res = await fetch(pageUrl);
        html = await res.text();
        if (res.status !== 200) {
          problems.push(`${pageUrl}: page answered ${res.status}`);
          continue;
        }
      } catch (err) {
        problems.push(`${pageUrl}: request failed — ${err.message}`);
        continue;
      }

      const text = stripHtml(html);
      if (text.length < 300) {
        problems.push(`${pageUrl}: rendered text is ${text.length} chars — the body did not render`);
      }

      // The paths come from the page, so this asserts the gate against what the
      // customer's browser will actually request.
      const refs = [...new Set(html.match(MEDIA_REF) || [])];
      if (refs.length === 0) {
        problems.push(`${pageUrl}: references no media at all`);
        continue;
      }
      for (const ref of refs) {
        checked++;
        const res = await head(`${BASE}${ref}`);
        if (res.status !== 200) {
          problems.push(`${ref} (referenced by ${pageUrl}): expected 200, got ${res.status}`);
          continue;
        }
        if (!res.length) problems.push(`${ref}: 200 but Content-Length is 0`);
        if (!/^(audio|video)\//.test(res.type || "")) {
          problems.push(`${ref}: 200 but Content-Type is "${res.type}"`);
        }
      }
    }

    notes.push(`${checked} media path(s) referenced by the free preview page(s), all checked`);
    record(`C free preview ${course}`, problems.length === 0, notes, problems);
  }
}

async function probePaidMedia() {
  for (const course of LIVE_COURSES) {
    // Some lessons carry no media at all (STUDENT's chapter overviews), and a
    // lesson with nothing to fetch cannot prove the gate denies anything.
    const paid = lessonIds(course).find(
      (id) => !isFreePreviewLesson(course, id) && refsFor(course, id).length > 0,
    );
    if (!paid) {
      record(`D paid ${course}`, false, [], ["no paid lesson with media to sample"]);
      continue;
    }
    const refs = refsFor(course, paid);

    const problems = [];
    for (const ref of refs.slice(0, 2)) {
      const res = await head(`${BASE}${ref}`);
      if (res.status !== 403) {
        problems.push(`${ref} (paid lesson ${paid}): expected 403, got ${res.status}`);
      }
      if (isCacheablePublic(res.cache)) {
        problems.push(`${ref}: a locked response is publicly cacheable — ${res.cache}`);
      }
    }
    record(`D paid ${course} (${paid})`, problems.length === 0, [], problems);
  }
}

async function probeAvaClipsAndRange() {
  // The clips are keyed by a hash of the sentence, so the path is computed with
  // the same function the app uses rather than copied from a previous run.
  const sentences = (readLesson("reading", "pr001")?.readingSentences || [])
    .map((s) => s.english)
    .filter(Boolean);
  let clipPath = null;
  let clipStatus = 0;
  const tried = [];
  for (const sentence of sentences.slice(0, 12)) {
    const p = unifiedSpeechPath(sentence);
    const res = await head(`${BASE}${p}`);
    tried.push(`${res.status}`);
    if (res.status === 200) {
      clipPath = p;
      clipStatus = 200;
      break;
    }
    if (clipStatus === 0) clipStatus = res.status;
  }
  record(
    "D pre-generated clips",
    clipPath !== null,
    clipPath
      ? [`${clipPath} -> 200 (computed from the reading sentences, ${tried.length} tried)`]
      : [`tried ${tried.length} sentences from /reading/pr001 — statuses ${tried.join(",")}`],
    clipPath ? [] : ["no clip answered 200 for any of the free lesson's sentences"],
  );

  // Range is what audio seeking depends on; a gate that drops it breaks playback
  // without ever failing a status check.
  const rangeRef = (FREE_PREVIEW_LESSON_IDS.ld || []).includes("d001")
    ? "/audio/ld/d001.mp3"
    : refsFor("ld", "d001")[0];
  const res = await fetch(`${BASE}${rangeRef}`, { headers: { Range: "bytes=0-1" } });
  const contentRange = res.headers.get("content-range");
  const problems = [];
  if (res.status !== 206) problems.push(`${rangeRef} with Range: expected 206, got ${res.status}`);
  if (!/^bytes 0-1\//.test(contentRange || "")) {
    problems.push(`${rangeRef}: Content-Range is "${contentRange}"`);
  }
  record("D Range request", problems.length === 0, [`${rangeRef} -> ${res.status} ${contentRange || ""}`], problems);
}

async function probeRetiredPages() {
  const problems = [];
  const notes = [];
  for (const [folder] of [...retiredMediaFolders.entries()].sort()) {
    // A retired course must not be routable at all — if the page came back the
    // media gate would be the least of the problems.
    const id = lessonIds(folder)[0];
    const url = `${BASE}/${folder}/${id}`;
    try {
      const res = await fetch(url);
      const text = stripHtml(await res.text());
      if (res.status !== 404) problems.push(`${url}: expected 404, got ${res.status}`);
      if (text.length < 100) {
        problems.push(`${url}: 404 but only ${text.length} chars of server-rendered text`);
      }
      notes.push(`${url} -> ${res.status}, ${text.length} chars`);
    } catch (err) {
      problems.push(`${url}: request failed — ${err.message}`);
    }
  }
  record("E retired courses are not routable", problems.length === 0, notes, problems);
}

async function probeMediaHealth() {
  const problems = [];
  try {
    const res = await fetch(`${BASE}/api/media-health`);
    const body = await res.json();
    // SEC-06 (2026-09-17): an anonymous caller now gets only { ok } — the same
    // readyForPrivateBucket value; credentials/probe/s3Error need the admin session.
    if ("credentialsConfigured" in body || "s3Error" in body) {
      problems.push("anonymous response still carries storage details");
    }
    if (body.ok !== true) problems.push(`ok is ${body.ok}`);
    record("F origin reader", problems.length === 0, [`ok=${body.ok}`], problems);
  } catch (err) {
    record("F origin reader", false, [], [`/api/media-health failed — ${err.message}`]);
  }
}

/* --------------------------------------------------------------------- main */

(async () => {
  console.log(`RE-004 media access probe — ${BASE}\n`);
  console.log(`live courses   : ${LIVE_COURSES.join(", ")}`);
  console.log(`retired folders: ${[...retiredMediaFolders.keys()].sort().join(", ")}`);
  console.log(`retired lessons: ${retiredLessonFolders.join(", ")}`);
  console.log(`env.local      : ${ENV_LOCAL_PRESENT ? "present" : "ABSENT"} (existence checks ${HAS_S3_CREDENTIALS ? "on" : "off"})\n`);

  await probeRetiredFolders();
  await probeFreeLessonMedia();
  await probePaidMedia();
  await probeAvaClipsAndRange();
  await probeRetiredPages();
  await probeMediaHealth();

  let pass = 0;
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}`);
    for (const note of row.notes) console.log(`        · ${note}`);
    for (const problem of row.problems) console.log(`        ✗ ${problem}`);
    if (row.ok) pass++;
  }

  const failed = rows.length - pass;
  console.log(`\n${pass}/${rows.length} checks pass`);
  console.log("If a retired path still answers 200 with x-vercel-cache: HIT, the code is right");
  console.log("and the edge cache is stale — compare against a ?cb=<ts> request before purging.");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "verify-media-access.json"),
    JSON.stringify(
      {
        base: BASE,
        generatedAt: new Date().toISOString(),
        liveCourses: LIVE_COURSES,
        retiredLessonFolders,
        retiredMediaFolders: Object.fromEntries(retiredMediaFolders),
        pass,
        total: rows.length,
        rows,
      },
      null,
      2,
    ),
  );

  process.exit(failed === 0 ? 0 : 1);
})();
