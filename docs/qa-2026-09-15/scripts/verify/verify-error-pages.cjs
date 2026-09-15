#!/usr/bin/env node
/**
 * RE-016 — a missing path must serve a 404 that a human can actually read.
 *
 * TWO THINGS WENT WRONG HERE, and the second is why this file was rewritten.
 *
 * 1. STATUS. An unmatched route used to fall through to Next's default page: it
 *    rendered inside the layout, so the nav was there, but it said nothing a
 *    visitor could act on and offered no route back.
 *
 * 2. THE FIRST VERSION OF THIS PROBE CHECKED THE WRONG AXIS. It grew from one
 *    path shape to five — and still only asserted the status code plus "is the
 *    heading somewhere in the response". It passed. It passed while the page was
 *    BLANK: for four of the five shapes Next was streaming an empty shell
 *    (`<body><div hidden></div><script>…</script></body>`) with a 404 status, and
 *    the not-found content existed only inside the flight payload in those
 *    <script> tags. A visitor saw a white screen until React ran; a crawler and a
 *    JS-disabled client saw a white screen forever. A status code is not a page.
 *
 * So the assertions below run on the SERVER-RENDERED TEXT: scripts removed
 * first, then tags. Anything that only exists in the flight payload does not
 * count, which is exactly the distinction the previous version missed.
 *
 * FIVE PATH SHAPES, because the rendering path depends on how deep the path is
 * and which dynamic route it collides with:
 *
 *   /x          matches [course]           -> the page calls notFound()
 *   /x/y        matches [course]/[lesson]  -> the page calls notFound()
 *   /x/y/z      matches no route at all
 *   /ld/x       matches [course]/[lesson] with a real course
 *   /t/x        matches t/[tab]
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

const SHAPES = [
  `/kig-404-probe-${S}`,
  `/kig-404-probe-${S}/child`,
  `/kig-404-probe-${S}/child/grandchild`,
  `/ld/kig-404-probe-${S}`,
  `/t/kig-404-probe-${S}`,
];

const HEADING = "찾는 페이지가 없습니다";
const TITLE = "페이지를 찾을 수 없습니다";
/** A 404 that says nothing is not a 404 screen. See the header. */
const MIN_VISIBLE_CHARS = 200;

/**
 * What a client without JavaScript receives: the body, with the flight payload
 * and every other script removed, then tags stripped. This is the whole point
 * of the probe — if the content is not here, the page is blank.
 */
function serverRendered(html) {
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  return body.replace(/<script[\s\S]*?<\/script>/gi, " ");
}

function visibleText(html) {
  return serverRendered(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const countH1 = (html) => (html.match(/<h1\b/gi) || []).length;

(async () => {
  const problems = [];
  const rows = [];

  for (const route of SHAPES) {
    const res = await fetch(`${BASE}${route}`, { redirect: "follow" });
    const html = await res.text();
    const markup = serverRendered(html);
    const text = visibleText(html);
    const row = {
      route,
      status: res.status,
      h1: countH1(html),
      visibleChars: text.length,
      bytes: html.length,
      problems: [],
    };

    // 1. the status code
    if (res.status !== 404) row.problems.push(`status = ${res.status} (want 404)`);

    // 2. THE PAGE IS ACTUALLY THERE, in the server-rendered HTML.
    if (text.length < MIN_VISIBLE_CHARS) {
      row.problems.push(
        `server-rendered text is ${text.length} chars (want >= ${MIN_VISIBLE_CHARS}) — ` +
          `the body is an empty shell and the content is only in the flight payload`
      );
    }
    if (!text.includes(HEADING)) {
      row.problems.push(`"${HEADING}" is not in the server-rendered text`);
    }

    // 3. a way back, also server-rendered.
    if (!/<a\b[^>]*href="\/"/i.test(markup)) {
      row.problems.push('no server-rendered link home (href="/")');
    }

    // 4. this site's 404, not Next's default.
    if (/This page could not be found/i.test(text)) {
      row.problems.push("Next's default 404 text is being served");
    }

    // 5. the metadata a crawler acts on.
    if (!html.includes(TITLE)) row.problems.push(`title "${TITLE}" missing`);
    if (!/noindex/i.test(html)) row.problems.push("not marked noindex");

    // 6. the chrome survived, so the page is still the site's.
    for (const label of ["VOCA", "LISTENING"]) {
      if (!text.includes(label)) row.problems.push(`nav label "${label}" missing from the text`);
    }

    // 7. exactly one h1, and it is the 404's.
    if (row.h1 !== 1) row.problems.push(`server-rendered h1 = ${row.h1} (want exactly 1)`);

    console.log(
      `${row.problems.length === 0 ? "PASS" : "FAIL"}  ${route.padEnd(44)} ` +
        `status=${row.status} text=${row.visibleChars}c h1=${row.h1}`
    );
    for (const p of row.problems) console.log(`        - ${p}`);

    rows.push(row);
    problems.push(...row.problems.map((p) => `${route}: ${p}`));
  }

  // 8. nothing was broken to get here.
  const home = await fetch(`${BASE}/`, { redirect: "follow" });
  if (home.status !== 200) problems.push(`/ returned ${home.status} (want 200)`);
  console.log(`\n/ -> ${home.status}`);

  const failed = rows.filter((r) => r.problems.length > 0).length;
  console.log(
    problems.length
      ? `\nFAIL — ${failed}/${rows.length} missing-path shapes wrong`
      : `\nPASS — all ${rows.length} shapes: 404, readable server-rendered text, a link home`
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
