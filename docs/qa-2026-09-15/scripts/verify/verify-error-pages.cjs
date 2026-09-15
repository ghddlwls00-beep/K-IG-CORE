#!/usr/bin/env node
/**
 * RE-016 — the 404 screen is real, is the site's own, and is still a 404.
 *
 * Before this work an unmatched route fell through to Next's default page: it
 * rendered inside the layout, so the nav bar was there, but it said nothing a
 * visitor could act on and offered no route back.
 *
 * SEVERAL PATH SHAPES, not one. The status code and the rendering path depend on
 * how deep the path is and which dynamic route it collides with, and they do NOT
 * all behave the same. This list is not padding: an earlier version of this
 * probe tested a single shape and passed, while four of these five were serving
 * HTTP 200 with 404 content — a soft 404, which is WORSE than the default it
 * replaced, because a soft 404 is indexable and every bad URL and stale link
 * becomes a page search engines keep.
 *
 *   /x          matches [course]           -> the page calls notFound()
 *   /x/y        matches [course]/[lesson]  -> the page calls notFound()
 *   /x/y/z      matches no route at all
 *   /ld/x       matches [course]/[lesson] with a real course
 *   /t/x        matches t/[tab]
 *
 * TWO RENDERING PATHS, and the probe asserts different things for each:
 *
 *   unmatched    Next server-renders `not-found.tsx` into the HTML. A crawler
 *                with no JavaScript sees the whole page, so this one must have
 *                the h1 and the chrome in the raw markup.
 *   notFound()   Next returns 404 and streams the not-found content through the
 *                RSC payload; the raw markup has the title, the noindex and the
 *                chrome but no <h1> element until React runs. That is Next's
 *                behaviour, not this project's -- production behaved the same
 *                way before this change -- so the probe does not demand a
 *                server-rendered h1 there, but it does demand the 404 status,
 *                the title and the noindex, which are the parts search engines
 *                act on.
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-error-pages.cjs http://localhost:3100
 *   node docs/qa-2026-09-15/scripts/verify/verify-error-pages.cjs https://k-ig-core.vercel.app
 *
 * NOTE ON SCOPE: `error.tsx` and `global-error.tsx` are error boundaries the
 * framework invokes when a component throws. Nothing in this app throws on
 * demand, so no URL reaches them and they cannot be asserted from outside. They
 * are covered by `tsc --noEmit` and by the build compiling them; this probe
 * deliberately claims no more than that.
 */
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const OUT_DIR = path.join(__dirname, "..", "out");

// A random suffix so a cached response cannot make a broken build look fixed.
const S = Date.now().toString(36);

/** `unmatched: true` = the shape Next server-renders the not-found page for. */
const SHAPES = [
  { route: `/kig-404-probe-${S}`, unmatched: false },
  { route: `/kig-404-probe-${S}/child`, unmatched: false },
  { route: `/kig-404-probe-${S}/child/grandchild`, unmatched: true },
  { route: `/ld/kig-404-probe-${S}`, unmatched: false },
  { route: `/t/kig-404-probe-${S}`, unmatched: false },
];

const HEADING = "찾는 페이지가 없습니다";
const TITLE = "페이지를 찾을 수 없습니다";

const countH1 = (html) => (html.match(/<h1\b/gi) || []).length;

(async () => {
  const problems = [];
  const rows = [];

  for (const { route, unmatched } of SHAPES) {
    const res = await fetch(`${BASE}${route}`, { redirect: "follow" });
    const html = await res.text();
    const row = { route, unmatched, status: res.status, bytes: html.length, h1: countH1(html), problems: [] };

    // 1. the status code. The whole point.
    if (res.status !== 404) row.problems.push(`status = ${res.status} (want 404)`);

    // 2. this site's 404 is the one being served, not Next's default.
    if (!html.includes(HEADING)) row.problems.push(`"${HEADING}" absent from the response`);
    if (/This page could not be found/i.test(html)) {
      row.problems.push("Next's default 404 text is being served");
    }

    // 3. the metadata a crawler acts on.
    if (!html.includes(TITLE)) row.problems.push(`title "${TITLE}" missing`);
    if (!/noindex/i.test(html)) row.problems.push("not marked noindex");

    // 4. the chrome survived, so the page is still the site's.
    //
    // Checked against the RAW response, not script-stripped text. For the
    // notFound() shapes the nav arrives in the RSC payload and React renders it
    // on the client, so stripping <script> would hide it and report a missing
    // nav on a page that has one. If the layout were genuinely broken the
    // labels would be absent from the payload too.
    for (const label of ["VOCA", "LISTENING"]) {
      if (!html.includes(label)) row.problems.push(`site chrome missing: nav label "${label}"`);
    }

    // 5. the unmatched shape is fully server-rendered; require the h1 there.
    if (unmatched && row.h1 !== 1) {
      row.problems.push(`server-rendered h1 = ${row.h1} (want exactly 1)`);
    }

    console.log(
      `${row.problems.length === 0 ? "PASS" : "FAIL"}  ${route.padEnd(44)} ` +
        `status=${row.status} h1=${row.h1}${unmatched ? " (unmatched)" : ""}`
    );
    for (const p of row.problems) console.log(`        - ${p}`);

    rows.push(row);
    problems.push(...row.problems.map((p) => `${route}: ${p}`));
  }

  // 6. nothing was broken to get here.
  const home = await fetch(`${BASE}/`, { redirect: "follow" });
  if (home.status !== 200) problems.push(`/ returned ${home.status} (want 200)`);
  console.log(`\n/ -> ${home.status}`);

  const failed = rows.filter((r) => r.problems.length > 0).length;
  console.log(
    problems.length
      ? `\nFAIL — ${failed}/${rows.length} missing-path shapes wrong`
      : `\nPASS — all ${rows.length} missing-path shapes return 404 with this site's own screen`
  );

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, "verify-error-pages.json"),
      JSON.stringify({ base: BASE, at: new Date().toISOString(), rows, homeStatus: home.status, problems }, null, 2)
    );
  } catch {
    /* evidence is best-effort */
  }

  process.exit(problems.length ? 1 : 0);
})();
