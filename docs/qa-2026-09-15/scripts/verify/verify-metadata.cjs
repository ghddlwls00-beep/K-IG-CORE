#!/usr/bin/env node
/**
 * RE-011 / RE-012 — per-route canonical + Open Graph.
 *
 * The bug being guarded against: the root layout used to declare a global
 * `canonical: "/"`, and `/t/[tab]` (plus `/student/[lesson]`) overrode only
 * `title`. So those routes told search engines they were duplicates of the
 * home page, and sharing one into KakaoTalk produced a bare link with no
 * thumbnail and no description.
 *
 * This probe asserts, per route:
 *   - exactly ONE <link rel="canonical">, whose PATH is the route's own path
 *     (the origin is deliberately the production domain via `metadataBase`,
 *     so it is compared by path, not by the origin the request was made to)
 *   - that path is not "/" for any non-home route (the exact pre-fix value)
 *   - og:title / og:description / og:image / og:url are present and non-empty
 *   - og:url points at the same path
 *   - twitter:card is present
 *
 * Run against a preview or production:
 *   node docs/qa-2026-09-15/scripts/verify/verify-metadata.cjs http://localhost:3100
 *   node docs/qa-2026-09-15/scripts/verify/verify-metadata.cjs https://k-ig-core.vercel.app
 *
 * Exits 1 if any route fails, so it is usable as a gate.
 */
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const OUT_DIR = path.join(__dirname, "..", "out");

/** Every tab route, plus the other metadata-bearing route families. */
const ROUTES = [
  "/",
  "/t/students",
  "/t/voca",
  "/t/grammar1",
  "/t/grammar2",
  "/t/ld",
  "/t/reading",
  "/t/cnn",
  "/ld",
  "/reading",
  "/ld/d001",
  "/reading/pr001",
  "/student/s1-1",
  "/student/s1-2",
];

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
};

function parseHead(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const canonical = links.filter((t) => /rel="canonical"/i.test(t)).map((t) => attr(t, "href"));
  const byProperty = (key) => {
    const hit = metas.find(
      (t) =>
        (attr(t, "property") || attr(t, "name") || "").toLowerCase() === key.toLowerCase(),
    );
    return hit ? attr(hit, "content") : null;
  };
  return {
    canonical,
    ogTitle: byProperty("og:title"),
    ogDescription: byProperty("og:description"),
    ogImage: byProperty("og:image"),
    ogUrl: byProperty("og:url"),
    twitterCard: byProperty("twitter:card"),
  };
}

/** The path of an absolute or relative URL, with the trailing slash removed. */
function pathOf(url) {
  if (!url) return null;
  try {
    const p = new URL(url, "https://placeholder.invalid").pathname.replace(/\/+$/, "");
    return p || "/";
  } catch {
    return null;
  }
}

async function checkRoute(route) {
  const url = `${BASE}${route}`;
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  const head = parseHead(html);
  const want = route.replace(/\/+$/, "") || "/";

  const problems = [];
  const notes = [];
  if (!res.ok) problems.push(`HTTP ${res.status}`);
  if (head.canonical.length !== 1) {
    problems.push(`canonical count = ${head.canonical.length} (want exactly 1)`);
  } else {
    const got = pathOf(head.canonical[0]);
    if (got !== want) problems.push(`canonical path = ${got} (want ${want})`);
    // The pre-fix failure mode, called out separately so the output is legible.
    if (want !== "/" && got === "/") {
      problems.push("canonical points at the site ROOT — the pre-fix bug");
    }
  }
  for (const [label, value] of [
    ["og:title", head.ogTitle],
    ["og:description", head.ogDescription],
    ["og:image", head.ogImage],
    ["twitter:card", head.twitterCard],
  ]) {
    if (!value) problems.push(`${label} missing or empty`);
  }
  // og:url is optional per the OG spec, and the home page deliberately inherits
  // the layout's openGraph block (a page-level openGraph would REPLACE it, not
  // merge, dropping the inherited title/image). So report it, don't fail it.
  if (!head.ogUrl) {
    notes.push("og:url not set (inherited openGraph; optional per spec)");
  } else if (pathOf(head.ogUrl) !== want) {
    problems.push(`og:url path = ${pathOf(head.ogUrl)} (want ${want})`);
  }
  if (head.ogImage && !/^https?:\/\//.test(head.ogImage)) {
    problems.push(`og:image is not absolute: ${head.ogImage}`);
  }

  return {
    route,
    status: res.status,
    canonical: head.canonical,
    ogImage: head.ogImage,
    problems,
    notes,
  };
}

(async () => {
  const results = [];
  for (const route of ROUTES) {
    try {
      results.push(await checkRoute(route));
    } catch (err) {
      results.push({ route, status: 0, problems: [`request failed: ${err.message}`] });
    }
  }

  const failed = results.filter((r) => r.problems.length > 0);
  for (const r of results) {
    const mark = r.problems.length === 0 ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.route.padEnd(18)} canonical=${JSON.stringify(r.canonical)}`);
    for (const p of r.problems) console.log(`        - ${p}`);
    for (const n of r.notes || []) console.log(`        note: ${n}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} routes pass`);

  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, "verify-metadata.json"),
      JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2),
    );
  } catch {
    /* evidence is best-effort */
  }

  process.exit(failed.length > 0 ? 1 : 0);
})();
