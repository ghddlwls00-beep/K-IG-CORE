#!/usr/bin/env node
/**
 * RE-016 — the proxy denies unknown lessons by default. This checks that it
 * does not deny any REAL one.
 *
 * WHY THIS IS THE IMPORTANT PROBE. `verify-error-pages.cjs` proves the blank
 * 404 is gone. It cannot prove the opposite mistake was not made, and the
 * opposite mistake is worse: a short allow list turns real lessons into 404s.
 * A previous attempt at this bug shipped exactly that — 404s fixed, real
 * lessons broken. A dozen sampled URLs would not have caught it, so this
 * enumerates EVERY lesson and fetches it.
 *
 * THE LEFT SIDE IS `content/`, NOT THE GENERATED LIST. It has to be. Reading
 * `src/lib/generated/validRoutes.json` and fetching what it contains would be a
 * tautology — a lesson the generator dropped is a lesson this check would never
 * ask about. `content/lessons/<course>/*.json` is what `getLesson()` serves
 * from, so a drift in the generator shows up here as a 404 on a path that
 * certainly exists. This is not hypothetical: the first version of the
 * generator enumerated the course index and missed STUDENT's `s1`–`s5`, which
 * are on disk, absent from the index, and answer 200.
 *
 * A lesson is judged by what the visitor gets, not by the status code alone:
 * 200, and the 404 screen is not on the page. See PROMPT.md on why a status
 * code is not a page.
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-proxy-allowlist.cjs http://localhost:3100
 *   node docs/qa-2026-09-15/scripts/verify/verify-proxy-allowlist.cjs https://k-ig-core.vercel.app --sample 60
 *
 * Against production use `--sample`: 1,742 requests is fine against a local
 * server and antisocial against the live site.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith("http")) || "http://localhost:3100").replace(/\/+$/, "");
const sampleIndex = args.indexOf("--sample");
const SAMPLE = sampleIndex >= 0 ? Number(args[sampleIndex + 1]) || 0 : 0;
const CONCURRENCY = 8;

/** Course slugs, read from the app's own list rather than restated here. */
function courseSlugs() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "courses.ts"), "utf8");
  return [...new Set([...src.matchAll(/^\s+slug: "([a-z0-9-]+)",/gm)].map((m) => m[1]))];
}

/** Tab slugs, same idea. */
function tabSlugs() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "tabs.ts"), "utf8");
  return [...new Set([...src.matchAll(/^\s+slug: "([a-z0-9-]+)",/gm)].map((m) => m[1]))];
}

function lessonPaths() {
  const out = [];
  for (const slug of courseSlugs()) {
    // Mirrors `getLesson()`, NOT `getAllLessonParams()`. The route is dynamic,
    // so a lesson is served whenever the course is one of the seven, the id
    // matches the pattern, and the file exists — the course index is never
    // consulted. STUDENT's `s1`–`s5` are on disk but absent from the index and
    // answer 200 in production; enumerating the index instead of the directory
    // is precisely the mistake that would have gone unnoticed here.
    const dir = path.join(ROOT, "content", "lessons", slug);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const id = file.slice(0, -".json".length);
      if (/^[a-z0-9-]+$/i.test(id)) out.push(`/${slug}/${id}`);
    }
  }
  return out;
}

const HEADING = "찾는 페이지가 없습니다";

function visibleText(html) {
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  let paths = lessonPaths().concat(tabSlugs().map((t) => `/t/${t}`));
  const total = paths.length;
  if (SAMPLE > 0 && paths.length > SAMPLE) {
    // Evenly spaced rather than the first N, so a hole at the end of a course
    // is as likely to be hit as one at the start.
    const step = paths.length / SAMPLE;
    paths = Array.from({ length: SAMPLE }, (_, i) => paths[Math.floor(i * step)]);
  }

  console.log(`base: ${BASE}`);
  console.log(`real pages from content/: ${total}${SAMPLE > 0 ? ` (sampling ${paths.length})` : ""}\n`);

  const failures = [];
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < paths.length) {
      const p = paths[cursor++];
      try {
        const res = await fetch(`${BASE}${p}`, { redirect: "follow" });
        const text = visibleText(await res.text());
        if (res.status !== 200) failures.push(`${p} -> status ${res.status} (want 200)`);
        else if (text.includes(HEADING)) failures.push(`${p} -> 200 but the 404 screen is on the page`);
      } catch (e) {
        failures.push(`${p} -> ${e.message}`);
      }
      done += 1;
      if (done % 200 === 0) console.log(`  ... ${done}/${paths.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, paths.length) }, worker));

  console.log(`\nchecked ${done} real page(s)`);
  if (failures.length) {
    for (const f of failures.slice(0, 40)) console.log(`  - ${f}`);
    if (failures.length > 40) console.log(`  ... and ${failures.length - 40} more`);
    console.log(`\nFAIL — ${failures.length} real page(s) are not being served`);
    process.exit(1);
  }
  console.log(`PASS — all ${done} real lesson and tab pages are served with their content`);
})();
