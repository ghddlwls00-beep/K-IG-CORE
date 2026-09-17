#!/usr/bin/env node
/**
 * SEC-05 — a per-request nonce replaces `script-src 'unsafe-inline'`.
 *
 * Same script before and after, so every "after" number has a "before":
 *
 *   node verify-csp-nonce.cjs --baseline                 local `next start` of the CURRENT build → out/csp-nonce-baseline.json
 *   node verify-csp-nonce.cjs                            local `next start` after `pnpm build` of the change, compared with it
 *   node verify-csp-nonce.cjs --base https://k-ig-core.vercel.app [--baseline]
 *                                                        production, read-only: no build output, no licence, no writes
 *
 * Local runs start `next start -p 3218` with durable storage blanked and random secrets (as
 * verify-ux-fixes.cjs does), so nothing real is read or written. A paid lesson therefore shows its
 * paywall here; licensed views are walked by verify-csp-nonce-licensed.cjs under `next dev`.
 *
 * N1  build output: no page is left as static HTML (a static page would carry no nonce and load
 *     with every script blocked) apart from the 500 page, which is recorded as a known gap; the proxy
 *     matcher covers every page shape and skips files; the proxy matcher and the next.config CSP
 *     headers never cover the same path (so no response can carry two policies).
 * N2  every HTML shape (home, tab, 7 course lists, free + paid lesson per course, a 307, /admin/license,
 *     404 shapes, typos with a dot, a browser prefetch): exactly one policy; script-src is
 *     `'self' 'nonce-X' 'strict-dynamic'`; the other directives are unchanged; style-src carries no
 *     nonce; EVERY <script> tag in the raw HTML carries X; three requests give three nonces; the page
 *     stays private/no-store. A typo under a file prefix (/api/x, /images/x) gets script-src 'none'.
 * N3  files, API and media answer exactly as before, none of them went through the proxy, and each
 *     carries exactly one policy with script-src 'none'.
 * N4  headless Edge, desktop and 390 px: a `securitypolicyviolation` listener installed before any page
 *     script + CDP Audits CSP issues; search, audio, first tap, licence dialog, admin login, 404s,
 *     client-side navigation without a reload, and the theme script (counted by `data-theme` writes).
 * N5  THE POLICY BLOCKS SOMETHING: the /ld/d001 document is rewritten in flight to carry a nonce-less
 *     inline script, a script with the right nonce, and an inline onload handler. A zero in N4 only
 *     means something if this run hears the two it should.
 * N6  wall time (Node fetch, sequential) for /, /ld, /ld/d001, /ld/d150 and a 404.
 * N7  verify-error-pages.cjs and verify-proxy-allowlist.cjs --nonce against the same server.
 *
 * Written and checked by the same agent. Exit 0 = every check as expected.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");

const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out");
const argv = process.argv.slice(2);
const BASELINE = argv.includes("--baseline");
const baseIdx = argv.indexOf("--base");
const REMOTE = baseIdx >= 0 ? argv[baseIdx + 1].replace(/\/+$/, "") : null;
const PORT = 3218;
const BASE = REMOTE || `http://localhost:${PORT}`;
const TAG = REMOTE ? "-prod" : "";
const BASELINE_FILE = path.join(OUT, `csp-nonce-baseline${TAG}.json`);
const RESULT_FILE = path.join(OUT, `csp-nonce-${BASELINE ? "baseline" : "after"}${TAG}.json`);

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
const record = {}; // everything measured, written to RESULT_FILE
const before = !BASELINE && fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) : null;
// `out/` is not committed. A local run compares with the build before the change, so it needs the file.
// A production run still proves every property on its own (nonce on every script, one policy, the
// injected script blocked); only the before/after comparisons are skipped, and the labels say so.
if (!BASELINE && !before && !REMOTE) {
  console.error(`STOP: ${path.relative(REPO, BASELINE_FILE)} is missing — run with --baseline on the build before the change first`);
  process.exit(2);
}
const NO_BASELINE = !BASELINE && !before;

const S = Date.now().toString(36);
const HEADING = "찾는 페이지가 없습니다";

/** The directives other than script-src, exactly as they were before SEC-05. */
const UNCHANGED = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

// ── helpers ────────────────────────────────────────────────────────────────────────────────────
const policyCount = (csp) => (csp ? (csp.match(/default-src/g) || []).length : 0);
const directives = (csp) => (csp || "").split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean);
const nonceOf = (csp) => ((csp || "").match(/'nonce-([A-Za-z0-9+/_=-]+)'/) || [])[1] || null;
const scriptTags = (html) => html.match(/<script\b[^>]*>/gi) || [];
const visibleText = (html) => ((html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1])
  .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

async function get(route, headers = {}, { follow = false } = {}) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${route}`, { redirect: follow ? "follow" : "manual", headers });
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = performance.now() - t0;
  const h = (k) => res.headers.get(k);
  return { status: res.status, csp: h("content-security-policy"), cspRO: h("content-security-policy-report-only"), type: (h("content-type") || "").split(";")[0], cache: h("cache-control"), location: h("location"), xNonce: h("x-nonce"), leaked: [...res.headers.keys()].filter((k) => k.startsWith("x-middleware")), body: buf, ms };
}

// ── routes ─────────────────────────────────────────────────────────────────────────────────────
const COURSES = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).courses;
const PAGES = [
  { route: "/", status: 200 },
  { route: "/t/voca", status: 200 },
  ...COURSES.map((c) => ({ route: `/${c}`, status: 200 })),
  ...[["student", "s1-1", "s10-1"], ["phonics", "mv1-01", "hv-48"], ["grammar1", "gh1-006", "gh1-058"], ["grammar2", "gh2-007", "gh2-030"], ["ld", "d001", "d150"], ["reading", "pr001", "pr100"]]
    .flatMap(([c, free, paid]) => [{ route: `/${c}/${free}`, status: 200 }, { route: `/${c}/${paid}`, status: 200 }]),
  { route: "/cnn/cnn001", status: 200, loadOnly: true },
  { route: "/grammar1/gh1-007", status: 307 },
  { route: "/admin/license", status: 200 },
  { route: `/kig-404-probe-${S}`, status: 404 },
  { route: `/kig-404-probe-${S}/child`, status: 404 },
  { route: `/kig-404-probe-${S}/child/grandchild`, status: 404 },
  { route: `/ld/kig-404-probe-${S}`, status: 404 },
  { route: `/t/kig-404-probe-${S}`, status: 404 },
  { route: `/student/kig-404-probe-${S}`, status: 404 },
  { route: "/admin", status: 404 },
];
const MISSING_DOTTED = [`/kig-404-probe-${S}.php`, `/kig-404-probe-${S}.html`, "/index.html", `/.kig-404-probe-${S}`, `/ld/kig-404-probe-${S}.html`, `/kig-404-probe-${S}/child/grandchild.html`];
/** Not pages: a mistyped path under a file prefix still renders Next's HTML 404 shell. No script may run in it. */
const NON_PAGE_HTML = [`/api/kig-404-probe-${S}`, `/images/kig-404-probe-${S}`, `/API/kig-404-probe-${S}`];

function publicFiles() {
  const out = [];
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!rel && (e.name === "audio" || e.name === "video")) continue; // clips: served through the route handlers, sampled below
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else out.push(`/${r}`);
    }
  };
  walk(path.join(REPO, "public"), "");
  return out.sort();
}

// ── server ─────────────────────────────────────────────────────────────────────────────────────
function startServer() {
  const env = { ...process.env, NODE_ENV: "production", PORT: String(PORT), LICENSE_SALT: crypto.randomBytes(24).toString("hex"), LICENSE_SECRET: crypto.randomBytes(24).toString("hex"), ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex") };
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "R2_BUCKET_NAME", "LICENSE_STORAGE_SECRET", "ADMIN_PIN"]) env[k] = " ";
  delete env.VERCEL;
  const proc = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { cwd: REPO, env, stdio: ["ignore", "pipe", "pipe"] });
  proc.log = "";
  proc.stdout.on("data", (d) => (proc.log += d));
  proc.stderr.on("data", (d) => (proc.log += d));
  return proc;
}

// ── N1 build output ────────────────────────────────────────────────────────────────────────────
function n1() {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO, ".next/prerender-manifest.json"), "utf8"));
  const META = new Set(["/favicon.ico", "/icon.svg", "/robots.txt", "/sitemap.xml"]);
  const staticRoutes = Object.keys(manifest.routes);
  const staticPages = staticRoutes.filter((r) => !META.has(r));
  const htmlFiles = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith(".html")) htmlFiles.push(path.relative(path.join(REPO, ".next/server/app"), f).replace(/\\/g, "/")); } };
  walk(path.join(REPO, ".next/server/app"));
  const fn = JSON.parse(fs.readFileSync(path.join(REPO, ".next/server/functions-config-manifest.json"), "utf8")).functions["/_middleware"] || {};
  const matchers = (fn.matchers || []).map((m) => ({ re: new RegExp(m.regexp), src: m.originalSource, missing: m.missing || null }));
  const matches = (p) => matchers.some((m) => m.re.test(p));
  record.n1 = { staticRoutes: staticRoutes.length, staticPages, htmlFiles: htmlFiles.length, htmlSample: htmlFiles.slice(0, 8), dynamicRoutes: Object.keys(manifest.dynamicRoutes || {}), runtime: fn.runtime, matchers: matchers.map((m) => ({ src: m.src, missing: m.missing })) };
  if (BASELINE) return;
  const leftovers = staticPages.filter((r) => r !== "/_global-error");
  check(`N1 no page except the 500 page is prerendered any more (was ${before.n1.staticPages.length}: home, lists, free lessons, redirects, 404) — static routes left: ${staticRoutes.join(", ")}`, leftovers.length === 0, leftovers.slice(0, 10).join(", "));
  const htmlLeft = htmlFiles.filter((f) => f !== "_global-error.html");
  check(`N1 no page HTML left in .next/server/app except _global-error.html (was ${before.n1.htmlFiles})`, htmlLeft.length === 0, htmlLeft.slice(0, 10).join(", "));

  // KNOWN GAP, stated rather than hidden: the prerendered 500 page (Next's own "This page couldn't load",
  // pages/500.html) has no nonce on its scripts. It is served only when an error escapes the render. Its
  // "Reload" must be the plain form that works with no script.
  const staticErrorFiles = [".next/server/pages/500.html", ".next/server/app/_global-error.html"].filter((f) => fs.existsSync(path.join(REPO, f)));
  const e500 = staticErrorFiles.map((f) => fs.readFileSync(path.join(REPO, f), "utf8"));
  const noncedScripts = e500.flatMap((h) => scriptTags(h)).filter((t) => /nonce=/.test(t)).length;
  const noScriptReload = e500.every((h) => { const s = h.replace(/<script[\s\S]*?<\/script>/g, ""); return /<form\b(?![^>]*\baction=)[^>]*>[\s\S]*?<button type="submit"[^>]*>Reload<\/button>[\s\S]*?<\/form>/.test(s); });
  record.n1.staticErrorPages = { files: staticErrorFiles, scripts: e500.map((h) => scriptTags(h).length), noncedScripts, noScriptReload };
  check(`N1 KNOWN GAP recorded: the static 500 page (${staticErrorFiles.join(", ")}) has ${e500.map((h) => scriptTags(h).length).join("/")} scripts with no nonce, and its "Reload" is a plain form (same URL) that works with no script`, staticErrorFiles.length > 0 && noScriptReload, JSON.stringify(record.n1.staticErrorPages));

  const mustMatch = ["/", "/ld", "/student", "/api", "/images", "/ld/d001", "/t/voca", "/admin/license", "/x/y/z", "/_kig/route-guard/not-found", "/admin", "/__nextjs_original-stack-frames", "/index.html", "/.env", "/ld/d001.html", "/a/b/c.html", "/wp-login.php", "/ld.rsc", "/ld/d001.rsc", "/ld.segments/_tree.segment.rsc", "/ld/d001.segments/_tree.segment.rsc", "/x.segments/y", "/a.segments/b/c"];
  const mustSkip = ["/_next/static/chunks/a.js", "/_next/static/immutable/chunks/a.js", "/api/license/status", "/audio/ld/d001.mp3", "/video/v.mp4", "/images/og/students.jpg", "/images/x", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.svg", "/search-index.json", "/.well-known/security.txt", "/_vercel/insights/script.js"];
  check("N1 proxy matcher covers every page path at any depth, every typo with a dot, and Next's .rsc / .segments names", mustMatch.every(matches), mustMatch.filter((p) => !matches(p)).join(", "));
  check("N1 proxy matcher skips _next, _vercel, api, audio, video, images, .well-known and the root files", mustSkip.every((p) => !matches(p)), mustSkip.filter(matches).join(", "));
  const missingKeys = matchers.map((m) => (m.missing || []).map((x) => x.key.toLowerCase()).sort().join(","));
  check("N1 proxy matcher skips Link prefetches (next-router-prefetch) and nothing else — a browser's Purpose: prefetch document is not skipped", matchers.length > 0 && missingKeys.every((k) => k === "next-router-prefetch"), JSON.stringify(record.n1.matchers));
  check("N1 proxy runtime is nodejs", fn.runtime === "nodejs", String(fn.runtime));

  // THE TWO POLICIES NEVER MEET: compiled proxy matcher vs compiled next.config CSP headers, over every page,
  // every public file, the metadata files, typos and Next's internal names.
  const routes = JSON.parse(fs.readFileSync(path.join(REPO, ".next/routes-manifest.json"), "utf8"));
  const cspRules = routes.headers.filter((h) => h.headers.some((x) => x.key.toLowerCase() === "content-security-policy"));
  // Next matches next.config header sources case-insensitively unless `caseSensitive` is set; the proxy
  // matcher is case-sensitive. The proxy knows this and adds no policy on a non-page path in another case
  // (NON_PAGE_ANY_CASE in src/proxy.ts, read from the source so the test follows the code).
  const configCsp = (p) => cspRules.some((h) => new RegExp(h.regex, routes.caseSensitive ? "" : "i").test(p));
  const nonPageSrc = (fs.readFileSync(path.join(REPO, "src/proxy.ts"), "utf8").match(/const NON_PAGE_ANY_CASE =\s*\/(.+)\/i;/) || [])[1];
  const nonPageAnyCase = nonPageSrc ? new RegExp(nonPageSrc, "i") : null;
  // What the proxy function is shown: Next strips `/_next/data/<build>/…json` down to the page path.
  const proxyView = (p) => p.replace(/^\/_next\/data\/[^/]+(\/.*?)\.json$/, "$1");
  const proxyPolicy = (p) => matches(p) && !(nonPageAnyCase && nonPageAnyCase.test(proxyView(p)));
  // The one overlap src/proxy.ts accepts on purpose: `/_next/data/…` (always a 404 without a Pages Router).
  const KNOWN_OVERLAP = (p) => p.startsWith("/_next/data/");
  const valid = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
  const samplePages = ["/", ...valid.courses.map((c) => `/${c}`), ...valid.tabs.map((t) => `/t/${t}`), ...valid.staticRoutes.map((r) => `/${r}`), ...Object.entries(valid.lessons).map(([c, ids]) => `/${c}/${ids[0]}`), ...mustMatch, "/LD/D001", "/Api", "/IMAGES"];
  const sampleFiles = [...publicFiles(), "/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.svg", "/_next/static/chunks/a.js", "/api/license/status", "/api/admin/check", "/audio/azure-ava/v1/x.mp3", "/video/v.mp4", "/.well-known/security.txt", "/_vercel/insights/script.js", "/api/x", "/images/x", "/API/x", "/Images/og/a.jpg", "/ROBOTS.TXT", "/_NEXT/static/a.js", "/Audio/x.mp3", "/_next/data/x/ld/d001.json"];
  const overlapping = [...samplePages, ...sampleFiles].filter((p) => proxyPolicy(p) && configCsp(p));
  const both = overlapping.filter((p) => !KNOWN_OVERLAP(p));
  const knownOverlap = overlapping.filter(KNOWN_OVERLAP);
  const pageWithoutProxy = samplePages.filter((p) => !proxyPolicy(p));
  const fileWithoutPolicy = sampleFiles.filter((p) => !configCsp(p));
  check("N1 the proxy's any-case list of non-page paths was found in src/proxy.ts", Boolean(nonPageAnyCase));
  record.n1.disjoint = { cspRules: cspRules.map((h) => h.source), both, knownOverlap, pageWithoutProxy, fileWithoutPolicy, sampled: samplePages.length + sampleFiles.length };
  check(`N1 no path gets both policies (${record.n1.disjoint.sampled} sample paths; config CSP only on ${cspRules.length} non-page sources; known and accepted: ${knownOverlap.join(", ") || "none"})`, both.length === 0 && cspRules.length > 0 && !cspRules.some((h) => h.source === "/:path*"), both.join(", "));
  check("N1 every page path goes through the proxy, every file / API / clip path gets the no-script policy", pageWithoutProxy.length === 0 && fileWithoutPolicy.length === 0, JSON.stringify({ pageWithoutProxy, fileWithoutPolicy }));
}

// ── N2 HTML responses ──────────────────────────────────────────────────────────────────────────
async function n2() {
  record.n2 = {};
  for (const page of PAGES) {
    const reps = [];
    for (let i = 0; i < 3; i++) reps.push(await get(page.route));
    const r = reps[0];
    const html = r.body.toString("utf8");
    const nonce = nonceOf(r.csp);
    const tags = scriptTags(html);
    const withNonce = nonce ? tags.filter((t) => t.includes(`nonce="${nonce}"`)).length : 0;
    const row = { status: r.status, policies: policyCount(r.csp), scriptSrc: directives(r.csp).find((d) => d.startsWith("script-src")) || null, others: directives(r.csp).filter((d) => !d.startsWith("script-src")), nonces: reps.map((x) => nonceOf(x.csp)), scripts: tags.length, scriptsWithNonce: withNonce, cache: r.cache, xNonce: r.xNonce, leaked: r.leaked, reportOnly: r.cspRO, visibleChars: visibleText(html).length, is404Screen: visibleText(html).includes(HEADING), location: r.location };
    record.n2[page.route.replace(S, "S")] = row;
    if (BASELINE) continue;
    const L = page.route;
    const problems = [];
    if (row.status !== page.status) problems.push(`status ${row.status} (want ${page.status})`);
    if (row.policies !== 1) problems.push(`${row.policies} policies in content-security-policy (want exactly 1)`);
    if (!/^script-src 'self' 'nonce-[A-Za-z0-9+/_=-]+' 'strict-dynamic'$/.test(row.scriptSrc || "")) problems.push(`script-src = ${row.scriptSrc}`);
    if (JSON.stringify(row.others) !== JSON.stringify(UNCHANGED)) problems.push(`other directives changed: ${row.others.join("; ")}`);
    if (row.others.some((d) => d.includes("nonce-"))) problems.push("a nonce outside script-src");
    if (new Set(row.nonces).size !== 3 || row.nonces.some((n) => !n)) problems.push(`nonces over 3 requests: ${row.nonces.map((n) => (n ? n.slice(0, 6) : n)).join(", ")}`);
    if (page.status !== 307) {
      if (row.scripts === 0) problems.push("no <script> tags at all");
      if (row.scriptsWithNonce !== row.scripts) problems.push(`${row.scripts - row.scriptsWithNonce}/${row.scripts} <script> tags without this response's nonce`);
      if (!/private/.test(row.cache || "") || !/no-store/.test(row.cache || "") || /public|s-maxage/.test(row.cache || "")) problems.push(`cache-control ${row.cache}`);
    }
    // `x-middleware-rewrite` (value: the 404 sentinel path) is left on a rewrite by `next start` and was
    // there before SEC-05 too; production strips it (measured in the production baseline). Anything
    // else — `x-nonce`, `x-middleware-request-*` — would echo the request overrides.
    const leaked = row.leaked.filter((k) => REMOTE || k !== "x-middleware-rewrite");
    if (row.xNonce || leaked.length) problems.push(`internal headers on the response: ${[row.xNonce && "x-nonce", ...leaked].filter(Boolean).join(", ")}`);
    if (row.reportOnly) problems.push("a Report-Only policy is also sent");
    if (page.status === 404 && (row.visibleChars < 200 || !row.is404Screen)) problems.push(`404 is not server-rendered (${row.visibleChars} chars)`);
    if (page.status === 200 && row.is404Screen) problems.push("the 404 screen is served for a real page");
    if (page.status === 307 && !/gh1-006/.test(row.location || "")) problems.push(`redirects to ${row.location}`);
    check(`N2 ${L} — ${row.status}, one policy, script-src nonce + strict-dynamic, ${row.scriptsWithNonce}/${row.scripts} scripts carry it, 3 different nonces${page.status === 404 ? `, ${row.visibleChars} chars` : ""}`, problems.length === 0, problems.join(" | "));
  }

  // Mistyped paths with a dot, at any depth. Production answered `/x.html` and `/.x` with the router's
  // readable 404 before SEC-05 and `/ld/x.html` with the blank one; all must be readable now.
  // (Vercel answers `.php` with its own 403 before the app is reached; locally it is a plain typo.)
  record.n2dotted = {};
  for (const route of MISSING_DOTTED) {
    const r = await get(route);
    const html = r.body.toString("utf8");
    const nonce = nonceOf(r.csp);
    const tags = scriptTags(html);
    record.n2dotted[route.replace(S, "S")] = { status: r.status, visibleChars: visibleText(html).length, is404Screen: visibleText(html).includes(HEADING), policies: policyCount(r.csp), nonce: Boolean(nonce), scripts: tags.length, scriptsWithNonce: nonce ? tags.filter((t) => t.includes(`nonce="${nonce}"`)).length : 0 };
  }
  if (!BASELINE) {
    for (const [route, row] of Object.entries(record.n2dotted)) {
      const was = before && before.n2dotted[route];
      if (REMOTE && row.status === 403 && route.endsWith(".php")) { check(`N2 dotted typo ${route} — Vercel's own 403, the app is not reached`, true); continue; }
      check(`N2 dotted typo ${route} — 404 with the readable page (${row.visibleChars} chars; before: ${was ? `${was.status}, ${was.visibleChars} chars` : "n/a"}), nonce on ${row.scriptsWithNonce}/${row.scripts} scripts`,
        row.status === 404 && row.is404Screen && row.visibleChars >= 200 && row.policies === 1 && row.nonce && row.scriptsWithNonce === row.scripts, JSON.stringify(row));
    }
  }

  // Non-page paths that still come back as an HTML 404 shell: exactly one policy, and it runs no script.
  record.n2nonpage = {};
  for (const route of NON_PAGE_HTML) {
    const r = await get(route);
    const html = r.body.toString("utf8");
    record.n2nonpage[route.replace(S, "S")] = { status: r.status, type: r.type, policies: policyCount(r.csp), scriptSrc: directives(r.csp).find((d) => d.startsWith("script-src")) || null, others: directives(r.csp).filter((d) => !d.startsWith("script-src")), scripts: scriptTags(html).length };
  }
  if (!BASELINE) {
    for (const [route, row] of Object.entries(record.n2nonpage)) {
      check(`N2 non-page typo ${route} — ${row.status} ${row.type}, one policy, script-src 'none' (the ${row.scripts} scripts of Next's 404 shell may not run)`, row.status === 404 && row.policies === 1 && row.scriptSrc === "script-src 'none'" && JSON.stringify(row.others) === JSON.stringify(UNCHANGED), JSON.stringify(row));
    }
  }

  // Next's internal RSC names, requested directly as a browser would (no RSC header). Under `next start` they
  // render as an HTML page; on Vercel they may come back as RSC data. Either is fine, provided an HTML answer
  // carries exactly one policy with a nonce on every script — before the second review they carried none.
  record.n2rscnames = {};
  for (const route of ["/ld/d001.rsc", `/kig-404-probe-${S}.rsc`, `/kig-404-probe-${S}.segments/y`, `/a.segments/kig-404-probe-${S}/c`, "/ld.segments/_tree.segment.rsc"]) {
    const r = await get(route);
    const html = r.body.toString("utf8");
    const nonce = nonceOf(r.csp);
    const tags = scriptTags(html);
    record.n2rscnames[route.replace(S, "S")] = { status: r.status, type: r.type, policies: policyCount(r.csp), nonce: Boolean(nonce), scripts: tags.length, scriptsWithNonce: nonce ? tags.filter((t) => t.includes(`nonce="${nonce}"`)).length : 0 };
  }
  if (!BASELINE) {
    for (const [route, row] of Object.entries(record.n2rscnames)) {
      const html = row.type === "text/html";
      check(`N2 internal-looking name ${route} — ${row.status} ${row.type}${html ? `, one policy, nonce on ${row.scriptsWithNonce}/${row.scripts} scripts` : " (not a document)"}`, !html || (row.policies === 1 && row.nonce && row.scriptsWithNonce === row.scripts), JSON.stringify(row));
    }
  }

  // A document the BROWSER prefetches or prerenders (Purpose / Sec-Purpose) is a page it may show: it must
  // get the nonce policy and the RE-016 check like any page load. Only Next's own Link prefetch is skipped.
  record.n2purpose = {};
  for (const [label, route] of [["real", "/ld/d001"], ["typo", `/kig-404-probe-${S}`]]) {
    const r = await get(route, { Purpose: "prefetch", "Sec-Purpose": "prefetch;prerender" });
    const html = r.body.toString("utf8");
    const nonce = nonceOf(r.csp);
    const tags = scriptTags(html);
    record.n2purpose[label] = { status: r.status, policies: policyCount(r.csp), nonce: Boolean(nonce), scripts: tags.length, scriptsWithNonce: nonce ? tags.filter((t) => t.includes(`nonce="${nonce}"`)).length : 0, is404Screen: visibleText(html).includes(HEADING), visibleChars: visibleText(html).length };
  }
  if (!BASELINE) {
    const p = record.n2purpose;
    check(`N2 a browser prefetch/prerender of /ld/d001 (Purpose + Sec-Purpose) gets the nonce policy on ${p.real.scriptsWithNonce}/${p.real.scripts} scripts`, p.real.status === 200 && p.real.policies === 1 && p.real.nonce && p.real.scripts > 0 && p.real.scriptsWithNonce === p.real.scripts, JSON.stringify(p.real));
    check(`N2 a browser prefetch/prerender of a typo gets the readable 404 (${p.typo.visibleChars} chars) with the nonce policy`, p.typo.status === 404 && p.typo.is404Screen && p.typo.nonce && p.typo.scriptsWithNonce === p.typo.scripts, JSON.stringify(p.typo));
  }

  // RSC navigation and prefetch requests. Next answers a bare `RSC: 1` request with a 307 that adds
  // its `_rsc` cache-busting parameter, so these follow it, as the client does.
  record.n2rsc = {};
  for (const [label, route, headers] of [["rsc free", "/ld/d001", { RSC: "1" }], ["rsc paid", "/ld/d150", { RSC: "1" }], ["prefetch", "/phonics/mv1-01", { RSC: "1", "Next-Router-Prefetch": "1" }], ["rsc 404", `/ld/kig-404-probe-${S}`, { RSC: "1" }]]) {
    const r = await get(route, headers, { follow: true });
    record.n2rsc[label] = { status: r.status, type: r.type, nonce: Boolean(nonceOf(r.csp)), policies: policyCount(r.csp) };
  }
  if (!BASELINE) {
    const x = record.n2rsc;
    check("N2 RSC navigation requests answer 200 text/x-component (free and paid)", x["rsc free"].status === 200 && x["rsc paid"].status === 200 && x["rsc free"].type === "text/x-component", JSON.stringify(x));
    check("N2 a Link prefetch answers 200 and skips the proxy (no nonce policy on it)", x.prefetch.status === 200 && !x.prefetch.nonce, JSON.stringify(x.prefetch));
    check("N2 an RSC request for a missing lesson still answers 404", x["rsc 404"].status === 404, JSON.stringify(x["rsc 404"]));
  }
}

// ── N3 files, API, media ───────────────────────────────────────────────────────────────────────
async function n3() {
  const home = (await get("/")).body.toString("utf8");
  const chunk = (home.match(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/) || [])[1];
  const css = (home.match(/<link[^>]+href="(\/_next\/static\/[^"]+\.css)"/) || [])[1];
  const files = REMOTE ? ["/search-index.json", "/images/og/students.jpg"] : publicFiles();
  const items = [
    ...["/robots.txt", "/sitemap.xml", "/icon.svg", "/favicon.ico"].map((r) => ({ key: r, route: r })),
    ...files.map((r) => ({ key: r, route: r })),
    { key: "_next chunk", route: chunk },
    { key: "_next css", route: css },
    { key: "/audio free clip", route: null },
    { key: "/audio free clip range", route: null, headers: { Range: "bytes=0-1" } },
    { key: "/audio locked clip", route: "/audio/ld/d150.mp3", headers: { Range: "bytes=0-1" } },
    { key: "/api/media-health", route: "/api/media-health" },
    { key: "/api/admin/check", route: "/api/admin/check" },
    { key: "/api/license/status", route: "/api/license/status" },
  ];
  // a free Azure clip, as the page player asks for it
  try {
    const d001 = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student/s1-1.json"), "utf8"));
    const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
    const { unifiedSpeechKey } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
    const first = JSON.stringify(d001).match(/"(?:text|english)":"([A-Za-z][^"]{3,80})"/);
    const clip = first ? `/audio/azure-ava/v1/${unifiedSpeechKey(first[1])}.mp3` : null;
    items.find((i) => i.key === "/audio free clip").route = clip;
    items.find((i) => i.key === "/audio free clip range").route = clip;
  } catch { /* recorded as null below */ }
  record.n3 = {};
  for (const it of items) {
    if (!it.route) { record.n3[it.key] = null; continue; }
    const r = await get(it.route, it.headers || {});
    record.n3[it.key] = { status: r.status, type: r.type, cache: r.cache, nonce: Boolean(nonceOf(r.csp)), policies: policyCount(r.csp), scriptSrc: directives(r.csp).find((d) => d.startsWith("script-src")) || null, received: r.body.length };
  }
  if (BASELINE) return;
  const diffs = [];
  const proxied = [];
  const wrongPolicy = [];
  for (const [key, row] of Object.entries(record.n3)) {
    const was = before && before.n3[key];
    if (!row) { diffs.push(`${key}: not measured`); continue; }
    if (row.nonce) proxied.push(key);
    if (row.policies !== 1 || row.scriptSrc !== "script-src 'none'") wrongPolicy.push(`${key}: ${row.policies} ${row.scriptSrc}`);
    if (NO_BASELINE) continue;
    if (!was) { diffs.push(`${key}: no baseline to compare with`); continue; }
    // MEDIA-02 (2026-09-18) changed free clips on production from `public, …` to `private, max-age=31536000,
    // immutable` on purpose; locally the clip is a file in public/ and keeps its static header.
    const media02 = REMOTE && /^\/audio free clip/.test(key);
    const sameCache = key.startsWith("_next") ? true : media02 ? /^private, max-age=31536000, immutable$/.test(row.cache || "") : row.cache === was.cache;
    // The production baseline recorded 200 for the Range row: that was the MEDIA-02 bug (the CDN answering from a
    // stored copy). Since MEDIA-02 the row must be 206, checked below, so its status is not compared here.
    const sameStatus = row.status === was.status || (media02 && key === "/audio free clip range");
    if (!sameStatus || row.type !== was.type || !sameCache) diffs.push(`${key}: ${was.status} ${was.type} ${was.cache} → ${row.status} ${row.type} ${row.cache}`);
  }
  check(`N3 ${Object.keys(record.n3).length} files, clips and API routes answer as before (status, type, cache-control)${NO_BASELINE ? " — NOT COMPARED: no baseline file on this machine" : ""}`, diffs.length === 0, diffs.slice(0, 8).join(" | "));
  // This only shows the page policy did not land on them. Whether the proxy ran at all is shown by N1's
  // compiled matcher (local runs); a production run cannot see it.
  check("N3 no nonce policy on a file, clip or API answer", proxied.length === 0, proxied.join(", "));
  check("N3 every one of them carries exactly one policy, and it is script-src 'none'", wrongPolicy.length === 0, wrongPolicy.slice(0, 8).join(" | "));
  const range = record.n3["/audio free clip range"];
  // bytes=0-1 right after a plain GET of the same clip: the order that made the CDN answer 200 with 2 bytes before
  // MEDIA-02. It must be a real 206 with exactly 2 bytes, locally and in production.
  check(`N3 a free clip answers a Range request right after a full GET with 206 and exactly the 2 bytes asked for (${range && range.status}, ${range && range.received} bytes), a locked one 403 (${record.n3["/audio locked clip"] && record.n3["/audio locked clip"].status})`, range && range.status === 206 && range.received === 2 && record.n3["/audio locked clip"].status === 403, JSON.stringify(range));
}

// ── N4 browser walk ────────────────────────────────────────────────────────────────────────────
const LISTENER = `(() => {
  window.__cspv = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspv.push({ d: e.effectiveDirective, b: String(e.blockedURI).slice(0, 80), s: String(e.sample || '').slice(0, 60) }), true);
  window.__themeWrites = 0;
  new MutationObserver((ms) => { for (const m of ms) if (m.attributeName === 'data-theme') window.__themeWrites++; }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
})();`;

async function openTab(browser, kind) {
  const tab = await Tab.open(browser.port);
  await tab.viewport(kind);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: LISTENER });
  tab.cspIssues = [];
  await tab.send("Audits.enable");
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    if (msg.method === "Audits.issueAdded" && msg.params?.issue?.code === "ContentSecurityPolicyIssue") {
      const d = msg.params.issue.details?.contentSecurityPolicyIssueDetails || {};
      tab.cspIssues.push(`${d.violatedDirective || ""} ${d.contentSecurityPolicyViolationType || ""} ${d.blockedURL || ""}`.trim());
    }
    if (tab.onExtra) tab.onExtra(msg);
    orig(msg);
  };
  return tab;
}

async function visit(tab, url, waitFor = "h1") {
  await tab.send("Page.navigate", { url: "about:blank" });
  await sleep(150);
  await tab.send("Page.navigate", { url });
  let ok = false;
  for (let i = 0; i < 120 && !ok; i++) {
    await sleep(250);
    ok = await tab.eval(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(waitFor)})`).catch(() => false);
  }
  await sleep(1500);
  return ok;
}

const pageState = (tab) => tab.eval(`({ v: window.__cspv || null, theme: window.__themeWrites, dataTheme: document.documentElement.dataset.theme, hydrated: !!(window.next && window.next.router) || !!document.querySelector('[data-kig-hydrated]') || typeof window.__next_f !== 'undefined' })`);

async function tapCenter(tab, selector) {
  const box = await tab.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (!box) return false;
  for (const type of ["mousePressed", "mouseReleased"]) await tab.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  return true;
}

async function n4(browser) {
  record.n4 = { pages: {}, actions: {} };
  const steps = [];
  const note = (key, tab, extra = {}) => pageState(tab).then((st) => {
    // Full lists, not samples: a comparison with the baseline that only kept 3 would miss a 4th new error.
    // Network failures are covered by the status checks; Log entries from the network source are left out.
    const row = { violations: (st.v || []).length + 0, listener: Array.isArray(st.v), sample: (st.v || []).slice(0, 3), issues: tab.cspIssues.slice(0, 3), issueCount: tab.cspIssues.length, exceptions: tab.events.exceptions.slice(0, 50), console: tab.events.console.filter((c) => !/Failed to load resource/.test(c)).slice(0, 50), log: tab.events.log.filter((l) => !/^network:/.test(l)).slice(0, 50), ...extra };
    record.n4.pages[key] = row;
    steps.push(key);
    tab.cspIssues = [];
    tab.resetEvents();
    return row;
  });

  for (const kind of ["desktop", "mobile"]) {
    const tab = await openTab(browser, kind);
    const pages = kind === "desktop"
      ? ["/", "/t/voca", "/reading", "/student/s1-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001", "/ld/d150", "/reading/pr100", "/grammar1/gh1-058", "/student/s10-1", "/admin/license", `/kig-404-probe-${S}`, `/ld/kig-404-probe-${S}`]
      : ["/", "/student/s1-1", "/ld/d001", "/reading/pr100"];
    for (const p of pages) {
      const ok = await visit(tab, `${BASE}${p}`, p === "/admin/license" ? "form" : "h1");
      const extra = { loaded: ok };
      if (/^\/(student\/s1-1|phonics\/mv1-01|ld\/d001|reading\/pr001|grammar1\/gh1-006|grammar2\/gh2-007)$/.test(p)) {
        // first tap somewhere that is not a play button: the silent data: primer
        await tapCenter(tab, "main h1, h1");
        await sleep(600);
        tab.events.requests = [];
        // STUDENT has its own player: "전체 본문 듣기"
        const played = await tab.eval(`(() => { const b = document.querySelector('main button[aria-label="재생"]') || [...document.querySelectorAll('main button')].find((x) => x.textContent.includes('전체 본문 듣기')); if (!b) return false; b.click(); return true; })()`);
        await sleep(2500);
        extra.play = played;
        extra.audioRequests = tab.events.requests.filter((u) => u.includes("/audio/")).length;
        await tab.eval(`(() => { const b = document.querySelector('button[aria-label="정지"]') || [...document.querySelectorAll('main button')].find((x) => x.textContent.includes('전체 정지')); b?.click(); })()`).catch(() => {});
      }
      if (/^\/(ld\/d150|reading\/pr100|grammar1\/gh1-058|student\/s10-1)$/.test(p)) {
        const clicked = await tab.eval(`(() => { const b = [...document.querySelectorAll('[data-kig-paywall] button, main button')].find((x) => x.textContent.includes('이용권 코드 등록')); if (!b) return false; b.click(); return true; })()`);
        let modal = false;
        for (let i = 0; i < 20 && clicked && !modal; i++) { await sleep(200); modal = await tab.eval(`!!document.querySelector('#license-code')`).catch(() => false); }
        extra.licenceDialog = modal;
        await tab.key("Escape");
      }
      await note(`${kind} ${p.replace(S, "S")}`, tab, extra);
    }

    if (kind === "desktop") {
      // search (the header, and so the search button, is not on the home page)
      await visit(tab, `${BASE}/t/voca`);
      await tab.eval(`document.querySelector('button[aria-label="검색 (Cmd+K)"]')?.click()`);
      await sleep(600);
      await tab.eval(`document.querySelector('[role="dialog"] input')?.focus()`);
      await tab.send("Input.insertText", { text: "수능 듣기" });
      await sleep(2000);
      const found = await tab.eval(`(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.querySelectorAll('li button').length : -1; })()`);
      const idx = tab.events.requests.some((u) => u.includes("/search-index.json"));
      await note("desktop search", tab, { results: found, indexRequested: idx });

      // theme script: dark stored → the inline script and the provider both write data-theme
      await visit(tab, `${BASE}/`);
      await tab.eval(`localStorage.setItem('kig:theme', 'dark')`);
      await visit(tab, `${BASE}/t/voca`);
      const st = await pageState(tab);
      await tab.eval(`localStorage.removeItem('kig:theme')`);
      await note("desktop theme", tab, { themeWrites: st.theme, dataTheme: st.dataTheme });

      // client-side navigation with no full reload: tab page → course list (header link) → a lesson
      // (search result, router.push) → another course (header link) → back
      await visit(tab, `${BASE}/t/voca`);
      await tab.eval(`window.__nav = 1`);
      const hops = [];
      const viaSearch = `(async () => { document.querySelector('button[aria-label="검색 (Cmd+K)"]').click(); await new Promise((r) => setTimeout(r, 500)); const i = document.querySelector('[role="dialog"] input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'MV1'); i.dispatchEvent(new Event('input', { bubbles: true })); for (let k = 0; k < 20 && !document.querySelector('[role="dialog"] li button'); k++) await new Promise((r) => setTimeout(r, 200)); const b = document.querySelector('[role="dialog"] li button'); if (!b) return false; b.click(); return true; })()`;
      for (const [selector, want] of [['a[href="/phonics"]', "^/phonics$"], [null, "^/[a-z0-9]+/[a-z0-9-]+$"], ['header a[href="/grammar1"]', "^/grammar1$"]]) {
        const clicked = selector === null ? await tab.eval(viaSearch).catch(() => false) : await tab.eval(`(() => { const a = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.offsetParent !== null); if (!a) return false; a.click(); return true; })()`);
        let there = false;
        for (let i = 0; i < 40 && clicked && !there; i++) { await sleep(250); there = await tab.eval(`new RegExp(${JSON.stringify(want)}).test(location.pathname) && !!document.querySelector('h1')`).catch(() => false); }
        await sleep(800);
        hops.push({ selector, clicked, there, path: await tab.eval("location.pathname") });
      }
      await tab.eval(`history.back()`);
      await sleep(2000);
      const nav = await tab.eval(`({ still: window.__nav === 1, path: location.pathname, navEntries: performance.getEntriesByType('navigation').length })`);
      await note("desktop client navigation", tab, { hops, ...nav });
    }
    await tab.close();
  }

  if (BASELINE) return;
  const rows = Object.entries(record.n4.pages);
  const bad = rows.filter(([, r]) => r.violations > 0 || r.issueCount > 0 || !r.listener);
  check(`N4 zero CSP violations and zero CSP issues over ${rows.length} page visits and actions (desktop + 390 px)`, bad.length === 0, bad.slice(0, 4).map(([k, r]) => `${k}: ${JSON.stringify(r.sample)} ${r.issues.join(";")}`).join(" | "));
  const errorsOf = (r) => [...(r?.exceptions || []), ...(r?.console || []), ...(r?.log || [])];
  const beforePages = before ? before.n4.pages : {};
  const newErrors = rows.filter(([k, r]) => { const wasSet = new Set(errorsOf(beforePages[k])); return errorsOf(r).some((e) => !wasSet.has(e)); });
  check(NO_BASELINE ? "N4 no exception, console error or log error at all (no baseline file on this machine)" : `N4 no exception, console error or log error that the baseline did not have (baseline total ${Object.values(beforePages).reduce((n, r) => n + errorsOf(r).length, 0)})`, newErrors.length === 0, newErrors.slice(0, 3).map(([k, r]) => `${k}: ${errorsOf(r).join(" ; ")}`).join(" | "));
  const unloaded = rows.filter(([, r]) => r.loaded === false);
  check("N4 every page loaded and rendered its heading", unloaded.length === 0, unloaded.map(([k]) => k).join(", "));
  const plays = rows.filter(([k]) => /s1-1|mv1-01|d001|pr001|gh1-006|gh2-007/.test(k) && !/404/.test(k));
  const silent = plays.filter(([, r]) => !r.play || !(r.audioRequests >= 1));
  check(`N4 play button requests audio on ${plays.length} free lesson visits`, silent.length === 0, silent.map(([k, r]) => `${k} play=${r.play} req=${r.audioRequests}`).join(", "));
  const dialogs = rows.filter(([k]) => /d150|pr100|gh1-058|s10-1/.test(k));
  check(`N4 the licence dialog opens on ${dialogs.length} paywall visits`, dialogs.every(([, r]) => r.licenceDialog), dialogs.filter(([, r]) => !r.licenceDialog).map(([k]) => k).join(", "));
  const s = record.n4.pages["desktop search"];
  check(`N4 search finds lessons (${s.results} links) and loads the index`, s.results > 0 && s.indexRequested, JSON.stringify(s));
  const th = record.n4.pages["desktop theme"];
  const thWas = beforePages["desktop theme"];
  check(`N4 the inline theme script ran: data-theme written ${th.themeWrites}× (baseline ${thWas && thWas.themeWrites}×; 1 would mean only the provider ran) and the page is dark`, th.themeWrites >= 2 && th.themeWrites >= (thWas ? thWas.themeWrites : 2) && th.dataTheme === "dark", JSON.stringify(th));
  const nv = record.n4.pages["desktop client navigation"];
  check(`N4 client-side navigation /t/voca → /phonics → (search) ${nv.hops[1] && nv.hops[1].path} → /grammar1 → back, with no full reload`,nv.still && nv.hops.length === 3 && nv.hops.every((h) => h.there) && nv.path === nv.hops[1].path, JSON.stringify(nv));
}

// ── N5 prove the policy blocks ─────────────────────────────────────────────────────────────────
async function n5(browser) {
  const tab = await openTab(browser, "desktop");
  const target = `${BASE}/ld/d001`;
  let injected = null;
  await tab.send("Fetch.enable", { patterns: [{ urlPattern: target, resourceType: "Document", requestStage: "Response" }] });
  tab.onExtra = (msg) => {
    if (msg.method !== "Fetch.requestPaused") return;
    const p = msg.params;
    (async () => {
      try {
        const b = await tab.send("Fetch.getResponseBody", { requestId: p.requestId });
        let html = b.base64Encoded ? Buffer.from(b.body, "base64").toString("utf8") : b.body;
        const headers = (p.responseHeaders || []).filter((h) => !/^(content-encoding|content-length|transfer-encoding)$/i.test(h.name));
        const csp = (headers.find((h) => h.name.toLowerCase() === "content-security-policy") || {}).value || "";
        const nonce = nonceOf(csp) || "no-nonce-in-policy";
        const probe = `<script>window.__noNonce=1</script><script nonce="${nonce}">window.__withNonce=1</script>`;
        html = html.replace(/<head[^>]*>/i, (m) => m + probe).replace(/<body[^>]*>/i, (m) => `${m}<img src="/icon.svg" alt="" width="1" height="1" onload="window.__attr=1">`);
        injected = { nonce: nonce !== "no-nonce-in-policy" };
        await tab.send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: p.responseStatusCode, responseHeaders: headers, body: Buffer.from(html, "utf8").toString("base64") });
      } catch (e) {
        injected = { error: e.message };
        await tab.send("Fetch.continueRequest", { requestId: p.requestId }).catch(() => {});
      }
    })();
  };
  await visit(tab, target);
  await sleep(1500);
  const r = await tab.eval(`({ noNonce: window.__noNonce === 1, withNonce: window.__withNonce === 1, attr: window.__attr === 1, v: (window.__cspv || []).map((x) => x.d) })`);
  record.n5 = { injected, ...r, issues: tab.cspIssues.slice(0, 6) };
  await tab.send("Fetch.disable");
  await tab.close();
  if (BASELINE) return;
  check("N5 the rewrite was applied to the document (the probe is really in the page)", injected && !injected.error && r.withNonce, JSON.stringify(record.n5));
  const b5 = before ? before.n5 : null;
  check(`N5 a nonce-less inline <script> is BLOCKED (${b5 ? "baseline: it ran" : "no baseline file on this machine"})`, !r.noNonce && (!b5 || b5.noNonce === true), JSON.stringify({ now: r.noNonce, before: b5 && b5.noNonce }));
  check(`N5 an inline onload= handler is BLOCKED (${b5 ? "baseline: it ran" : "no baseline file on this machine"})`, !r.attr && (!b5 || b5.attr === true), JSON.stringify({ now: r.attr, before: b5 && b5.attr }));
  check(`N5 the listener heard both blocks (${r.v.length} violations: ${r.v.join(", ")})`, r.v.length >= 2, JSON.stringify(record.n5));
}

// ── N6 wall time ───────────────────────────────────────────────────────────────────────────────
async function n6() {
  record.n6 = {};
  const N = REMOTE ? 10 : 15;
  for (const route of ["/", "/ld", "/ld/d001", "/ld/d150", `/kig-404-probe-${S}`]) {
    const ms = [];
    await get(route); // warm
    for (let i = 0; i < N; i++) ms.push((await get(route)).ms);
    record.n6[route.replace(S, "S")] = { p50: Math.round(pct(ms, 50)), p90: Math.round(pct(ms, 90)), n: N };
  }
}

// ── main ───────────────────────────────────────────────────────────────────────────────────────
(async () => {
  let server = null;
  let browser = null;
  try {
    if (!REMOTE) {
      server = startServer();
      let up = false;
      for (let i = 0; i < 90 && !up; i++) { try { up = (await fetch(`${BASE}/`)).ok; } catch {} if (!up) await sleep(1000); }
      check("local production build is serving", up);
      if (!up) throw new Error("server did not start");
      n1();
    }
    await n2();
    await n3();
    browser = await launch({ port: 9383 });
    await n4(browser);
    await n5(browser);
    await n6();
    if (!BASELINE) {
      // N7 the two RE-016 probes, unchanged in what they assert, against the same server: every real page
      // (1,750+) served with its content and — with --nonce — its own nonce on every <script>; every
      // missing shape a readable 404. Against production the allow-list probe samples 60 pages.
      const { spawnSync } = require("child_process");
      const probe = (script, args) => spawnSync(process.execPath, [path.join(REPO, "docs/qa-2026-09-15/scripts/verify", script), BASE, ...args], { encoding: "utf8", timeout: 1200000 });
      const ep = probe("verify-error-pages.cjs", []);
      const epLast = (ep.stdout || "").trim().split("\n").pop();
      check(`N7 verify-error-pages.cjs — ${epLast}`, ep.status === 0, (ep.stdout || "").split("\n").filter((l) => /FAIL|^\s+-/.test(l)).slice(0, 8).join(" | ") || ep.stderr);
      const al = probe("verify-proxy-allowlist.cjs", REMOTE ? ["--sample", "60", "--nonce"] : ["--nonce"]);
      const alLast = (al.stdout || "").trim().split("\n").pop();
      check(`N7 verify-proxy-allowlist.cjs --nonce — ${alLast}`, al.status === 0, (al.stdout || "").split("\n").filter((l) => /^\s+-/.test(l)).slice(0, 8).join(" | ") || al.stderr);
    }
    if (!BASELINE) {
      const rows = Object.entries(record.n6).map(([k, v]) => `${k} p50 ${before && before.n6[k] ? before.n6[k].p50 : "?"}→${v.p50} ms`);
      check(`N6 wall time recorded (sequential, ${REMOTE ? "production" : "local next start"}): ${rows.join(", ")}`, true);
    }
  } catch (error) {
    check("harness ran without throwing", false, error && error.stack);
  } finally {
    if (browser) browser.proc.kill();
    if (server) {
      server.kill();
      await sleep(1000);
      fs.writeFileSync(path.join(OUT, `csp-nonce-server${BASELINE ? "-baseline" : ""}.log`), server.log.replace(/[A-Za-z0-9+/=_-]{20,}/g, "[redacted]"));
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(RESULT_FILE, JSON.stringify({ base: BASE, mode: BASELINE ? "baseline" : "after", at: new Date().toISOString(), results, ...record }, null, 2));
  if (BASELINE) {
    fs.copyFileSync(RESULT_FILE, BASELINE_FILE);
    const pages = Object.values(record.n4 ? record.n4.pages : {});
    console.log(`baseline written: ${path.relative(REPO, BASELINE_FILE)}`);
    console.log(`  N1 static pages ${record.n1 ? record.n1.staticPages.length : "-"}, html files ${record.n1 ? record.n1.htmlFiles : "-"}`);
    console.log(`  N2 ${Object.keys(record.n2 || {}).length} routes; N3 ${Object.keys(record.n3 || {}).length} items; N4 ${pages.length} visits, violations ${pages.reduce((n, r) => n + r.violations, 0)}; N5 ${JSON.stringify(record.n5)}`);
    console.log(`  N6 ${JSON.stringify(record.n6)}`);
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
