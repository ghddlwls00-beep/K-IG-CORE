#!/usr/bin/env node
/**
 * RE-014 — every page must have exactly ONE h1.
 *
 * The bug: the home page had NO h1 (its hero is a carousel of curriculum stages
 * whose headings were all h2), and lesson pages had TWO (the lesson title from
 * `[course]/[lesson]/page.tsx` plus a section heading inside the learning view).
 * A page with no h1 gives a screen reader nothing to announce as the page
 * subject, and gives search engines no title to weigh; a page with two leaves
 * them guessing which one counts.
 *
 * Counts `<h1` in the served HTML per route and prints the heading text, so a
 * failure says which heading is wrong rather than just how many there are.
 *
 * Run against a dev server, a preview, or production:
 *   node docs/qa-2026-09-15/scripts/verify/verify-h1.cjs http://localhost:3100
 *   node docs/qa-2026-09-15/scripts/verify/verify-h1.cjs https://k-ig-core.vercel.app
 *
 * Exits 1 if any route fails, so it is usable as a gate.
 */
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const OUT_DIR = path.join(__dirname, "..", "out");

/**
 * Section pages, course dashboards, and a lesson from each course family.
 *
 * `/admin/license` is deliberately NOT here. It is an internal route and its
 * h1 is client-state dependent: `isCheckingAuth` starts `true`, so the
 * server-rendered HTML shows only "관리자 인증 확인 중..." with no heading, and
 * the login screen / dashboard h1 appears after hydration. Measured 0 on
 * production for that reason. A transient SSR state on an internal page is not
 * the defect this probe exists to catch, and leaving it in would make the gate
 * permanently red — which is the same as having no gate.
 */
const ROUTES = [
  "/",
  "/t/students",
  "/t/voca",
  "/t/grammar1",
  "/t/grammar2",
  "/t/ld",
  "/t/reading",
  "/t/cnn",
  "/student",
  "/phonics",
  "/grammar1",
  "/grammar2",
  "/ld",
  "/reading",
  "/cnn",
  "/ld/d001",
  "/ld/d001-1",
  "/reading/pr001",
  "/reading/pr001-1",
  "/grammar1/gh1-006",
  "/grammar2/gh2-007",
  "/student/s1-1",
  "/phonics/mv1-01",
];

/** Strip tags so the heading text is readable in the output. */
const textOf = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

async function checkRoute(route) {
  const url = `${BASE}${route}`;
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();

  // Each heading in document order, with its text.
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1]));

  const problems = [];
  if (!res.ok) problems.push(`HTTP ${res.status}`);
  if (headings.length !== 1) {
    problems.push(`h1 count = ${headings.length} (want exactly 1)`);
  }
  return { route, status: res.status, count: headings.length, headings, problems };
}

(async () => {
  const results = [];
  for (const route of ROUTES) {
    try {
      results.push(await checkRoute(route));
    } catch (err) {
      results.push({ route, status: 0, count: 0, headings: [], problems: [`request failed: ${err.message}`] });
    }
  }

  const failed = results.filter((r) => r.problems.length > 0);
  for (const r of results) {
    const mark = r.problems.length === 0 ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.route.padEnd(20)} h1=${r.count}  ${JSON.stringify(r.headings)}`);
    for (const p of r.problems) console.log(`        - ${p}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} routes have exactly one h1`);

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, "verify-h1.json"),
      JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2)
    );
  } catch {
    /* evidence is best-effort */
  }

  process.exit(failed.length > 0 ? 1 : 0);
})();
