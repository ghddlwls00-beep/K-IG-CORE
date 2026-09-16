#!/usr/bin/env node
/**
 * RE-008 — the sitemap, and who is allowed to be indexed.
 *
 * WHY THIS EXISTS. The sitemap listed every lesson, free or not: 1,751 URLs of
 * which 1,713 answered with the paywall shell — 270 characters of navigation
 * and an upsell, the same on every lesson but the title. A sitemap is a request
 * to index, so the site was asking for 1,700 near-duplicate thin pages to be
 * indexed, which is how the 113 pages that do have content get dragged down.
 *
 * A STATUS CODE WOULD NOT HAVE CAUGHT IT. Every one of those URLs answered 200.
 * The check that matters is how much is left after the scripts are removed, and
 * whether the page asks to be indexed at all.
 *
 * FIVE AXES, and the fourth is the one with a real blast radius:
 *
 *   A  every URL in the sitemap answers 200, renders a body, and is NOT the
 *      paywall. Length alone cannot decide this: a locked lesson renders 270
 *      characters and a tab page renders 188–229, so the paywall is the LONGER
 *      of the two. The floor of 150 only catches blank and error pages; what
 *      separates real content from the paywall is the paywall's own copy.
 *   B  no locked lesson is listed — checked against the repository's own
 *      `isFreePreviewLesson`, not against a list kept in this file
 *   C  the URL count matches what the repository implies, and nothing repeats
 *   D  locked lessons carry `noindex` — and free lessons, course pages, tab
 *      pages and the home page carry NO `noindex`. A `robots` rule applied one
 *      level too high would remove the whole site from search, so this axis
 *      exists to make that mistake loud.
 *   E  the tab pages are listed at all (they are real content and were missing)
 *
 * USAGE
 *   node verify-sitemap.cjs http://localhost:3210
 *   node verify-sitemap.cjs https://k-ig-core.vercel.app
 *
 * EXIT 0 = every assertion passed. Exit 1 = at least one failed.
 *
 * DETECTION POWER, MEASURED. Against production before this shipped: axis A
 * fails on 1,638 URLs (200 with a 270-character body), axis B fails on 1,713
 * listed locked lessons, axis D fails on every locked sample (no `robots` meta
 * at all) and axis E fails on 7. Against the fixed local build: 0 failures.
 */

const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../tsload.cjs");

const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");
const BASE = (process.argv[2] || "http://localhost:3210").replace(/\/+$/, "");

/**
 * Below this, the page did not render at all. It is deliberately NOT set to
 * separate content from the paywall — that cannot be done by length, because a
 * locked lesson (270 chars) renders MORE than a tab page (188–229).
 */
const MIN_BODY = 150;

/**
 * The paywall's own copy, from `src/components/LessonPaywall.tsx:52,67`. Axis B
 * is the structural check (derived from the repository, so it survives a copy
 * change); this one is the belt to its braces, and it is what catches a
 * paywall appearing on a URL that is not a lesson at all.
 */
const PAYWALL_MARKERS = ["ALL-PASS ONLY", "STUDENT PASS ONLY", "VIP ALL-PASS REQUIRED"];

const validRoutes = JSON.parse(
  fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"),
);
const { isFreePreviewLesson } = loadTs(path.join(REPO, "src/lib/license.ts"));

const COURSES = Object.keys(validRoutes.lessons);
const TABS = validRoutes.tabs;
const ALL_LESSONS = [];
for (const [course, ids] of Object.entries(validRoutes.lessons)) {
  for (const id of ids) ALL_LESSONS.push({ course, lesson: id });
}
const FREE = ALL_LESSONS.filter((l) => isFreePreviewLesson(l.course, l.lesson));
const LOCKED = ALL_LESSONS.filter((l) => !isFreePreviewLesson(l.course, l.lesson));
const EXPECTED_COUNT = 1 + COURSES.length + TABS.length + FREE.length;

const rows = [];
function check(name, ok, notes = [], problems = []) {
  rows.push({ name, ok, notes, problems });
}

/** Rendered text: body, scripts and styles gone, tags gone. */
function renderedText(html) {
  const body = html.match(/<body[\s\S]*?<\/body>/i);
  return (body ? body[0] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function robotsMeta(html) {
  const m = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  return m ? m[1].toLowerCase() : null;
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, html: await res.text() };
}

(async () => {
  console.log(`RE-008 sitemap probe — ${BASE}\n`);

  let urls = [];
  try {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } catch (err) {
    check("sitemap fetch", false, [], [`could not fetch /sitemap.xml — ${err.message}`]);
  }

  if (urls.length) {
    console.log(`sitemap: ${urls.length} URLs`);
    console.log(`repo implies: 1 home + ${COURSES.length} courses + ${TABS.length} tabs + ${FREE.length} free lessons = ${EXPECTED_COUNT}\n`);

    // A — every URL is served with a body.
    const results = [];
    let cursor = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (cursor < urls.length) {
          const i = cursor++;
          try {
            const { status, html } = await get(urls[i]);
            const text = renderedText(html);
            results[i] = {
              url: urls[i],
              status,
              len: text.length,
              paywall: PAYWALL_MARKERS.find((m) => text.includes(m)) || null,
            };
          } catch (err) {
            results[i] = { url: urls[i], status: 0, len: 0, paywall: null, err: err.message };
          }
        }
      }),
    );

    const thin = results.filter(
      (r) => r.status !== 200 || r.len < MIN_BODY || r.paywall,
    );
    check(
      "A every sitemap URL is served with a body, and none is the paywall",
      thin.length === 0,
      [`${results.length - thin.length}/${results.length} answer 200 with >= ${MIN_BODY} rendered chars and no paywall copy`],
      thin.slice(0, 15).map(
        (r) =>
          `${r.url} -> ${r.status}, ${r.len} chars${r.paywall ? `, paywall "${r.paywall}"` : ""}`,
      ),
    );

    // B — no locked lesson is listed.
    const listedLocked = urls.filter((u) => {
      const seg = new URL(u).pathname.split("/").filter(Boolean);
      if (seg.length !== 2) return false;
      return !isFreePreviewLesson(seg[0], seg[1]) && seg[0] in validRoutes.lessons;
    });
    check(
      "B no locked lesson is listed",
      listedLocked.length === 0,
      [`${LOCKED.length} lessons are locked to an anonymous visitor; ${listedLocked.length} of them appear`],
      listedLocked.slice(0, 15),
    );

    // C — count and uniqueness.
    const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
    const countProblems = [];
    if (urls.length !== EXPECTED_COUNT) {
      countProblems.push(`expected ${EXPECTED_COUNT} URLs, found ${urls.length}`);
    }
    if (dupes.length) countProblems.push(`${dupes.length} duplicate URL(s)`);
    check(
      "C count and uniqueness",
      countProblems.length === 0,
      [`${urls.length} URLs, ${new Set(urls).size} distinct`],
      countProblems,
    );

    // E — the tab pages are listed.
    const listedTabs = TABS.filter((t) => urls.some((u) => new URL(u).pathname === `/t/${t}`));
    check(
      "E tab pages are listed",
      listedTabs.length === TABS.length,
      [`${listedTabs.length}/${TABS.length} tab pages present`],
      TABS.filter((t) => !listedTabs.includes(t)).map((t) => `/t/${t} is missing`),
    );
  }

  // D — robots: locked noindex, everything else untouched.
  const lockedSample = LOCKED.slice(0, 4);
  const mustBeIndexable = [
    { path: "/", why: "home" },
    ...COURSES.map((c) => ({ path: `/${c}`, why: "course" })),
    ...TABS.map((t) => ({ path: `/t/${t}`, why: "tab" })),
    ...FREE.slice(0, 4).map((f) => ({ path: `/${f.course}/${f.lesson}`, why: "free lesson" })),
  ];

  const problems = [];
  const notes = [];
  for (const l of lockedSample) {
    const p = `/${l.course}/${l.lesson}`;
    try {
      const { status, html } = await get(`${BASE}${p}`);
      const robots = robotsMeta(html);
      notes.push(`${p} -> ${status}, robots="${robots}"`);
      if (status !== 200) problems.push(`${p}: expected 200, got ${status}`);
      if (!robots || !robots.includes("noindex")) {
        problems.push(`${p}: a locked lesson must be noindex — robots="${robots}"`);
      } else if (!robots.includes("follow")) {
        problems.push(`${p}: robots="${robots}" — the links still need following`);
      }
    } catch (err) {
      problems.push(`${p}: request failed — ${err.message}`);
    }
  }
  check("D locked lessons are noindex", problems.length === 0, notes, problems);

  // D2 — the blast radius. This is the one that would take the site out of
  // search entirely if the rule were applied one level too high.
  const leakProblems = [];
  const leakNotes = [];
  for (const item of mustBeIndexable) {
    try {
      const { status, html } = await get(`${BASE}${item.path}`);
      const robots = robotsMeta(html);
      leakNotes.push(`${item.path} (${item.why}) -> ${status}, robots="${robots}"`);
      if (robots && robots.includes("noindex")) {
        leakProblems.push(`${item.path} (${item.why}) is noindex — it must stay indexable`);
      }
      if (status !== 200) leakProblems.push(`${item.path} (${item.why}): expected 200, got ${status}`);
    } catch (err) {
      leakProblems.push(`${item.path}: request failed — ${err.message}`);
    }
  }
  check(
    "D2 nothing that should be indexed is noindex",
    leakProblems.length === 0,
    leakNotes.slice(0, 6),
    leakProblems,
  );

  let pass = 0;
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}`);
    for (const note of row.notes) console.log(`        · ${note}`);
    for (const problem of row.problems) console.log(`        ✗ ${problem}`);
    if (row.ok) pass++;
  }
  const failed = rows.length - pass;
  console.log(`\n${pass}/${rows.length} checks pass`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "verify-sitemap.json"),
    JSON.stringify(
      { base: BASE, generatedAt: new Date().toISOString(), urlCount: urls.length, expectedCount: EXPECTED_COUNT, pass, total: rows.length, rows },
      null,
      2,
    ),
  );

  process.exit(failed === 0 ? 0 : 1);
})();
