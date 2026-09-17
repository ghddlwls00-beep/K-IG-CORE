#!/usr/bin/env node
/**
 * ⚠️ SUPERSEDED — kept as the record of RE-006, not as a current check. It expects the Report-Only
 * header of 8c59d82 and has failed by design since the policy was enforced (71b9491). Since SEC-05 the
 * page policy is a per-request nonce sent by `src/proxy.ts`; the current probe is
 * `docs/qa-2026-09-17/scripts/verify-csp-nonce.cjs`.
 *
 * RE-006 — Content-Security-Policy probe.
 *
 * WHY THIS EXISTS. A CSP is the one header that can take the whole site down at
 * once, and the failure is invisible from a status code: block `script-src` and
 * every page still answers 200 with a dead shell. So this probe does not ask
 * "is the header there" and stop. It asks the two questions that actually
 * decide whether the policy is safe:
 *
 *   1. Is the policy the one we wrote? (every directive, verbatim)
 *   2. Does the policy ALLOW EVERYTHING THE PAGES ACTUALLY USE? This is the
 *      half that matters and the half that is normally skipped. The answer comes
 *      from the served HTML, not from the config: every absolute origin that
 *      appears in a `src`/`href` is collected and checked against `'self'`.
 *      A policy can be perfectly well-formed and still be wrong, and this is the
 *      only assertion that notices.
 *
 * IT ALSO PROVES THE POLICY IS NOT SUPERSTITION. `'unsafe-inline'` is the weak
 * point of the shipped policy, and it is only defensible if inline script and
 * inline style really are present. The probe counts them and prints the counts,
 * so the claim is measured rather than asserted. If those counts ever hit zero,
 * `'unsafe-inline'` should come out.
 *
 * REPORT-ONLY IS THE EXPECTED SHAPE RIGHT NOW. The probe therefore requires the
 * report-only header to be present AND the enforcing header to be absent. That
 * second half is what makes the flip to enforcing a one-line change that this
 * probe notices, rather than something that happens silently in a diff.
 *
 * USAGE
 *   node verify-csp.cjs                       # http://localhost:3100
 *   node verify-csp.cjs http://localhost:3100
 *   node verify-csp.cjs https://k-ig-core.vercel.app
 *
 * EXIT 0 = every assertion passed. Exit 1 = at least one failed, and every
 * failure is printed with the value that failed it.
 *
 * DETECTION POWER, MEASURED. Run against production before this shipped: the
 * header assertions fail on all routes (no CSP is sent at all), which is the
 * state the probe is meant to catch. Run against the fixed local build: 0
 * failures. Both numbers are in docs/qa-2026-09-15/PROGRESS.md.
 */

const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const OUT_DIR = path.join(REPO, "docs/qa-2026-09-15/scripts/out");

const BASE = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const BASE_HOST = (() => {
  try {
    return new URL(BASE).host;
  } catch {
    return BASE;
  }
})();

/**
 * The routes are chosen for shape, not for count — the RE-016 lesson was that
 * five paths sharing one axis is still one test. Between them these cover: the
 * home carousel (inline style attributes everywhere), a course index, a free
 * lesson, a free VOCA lesson (audio player), a tab page, a STUDENT lesson
 * (cookie-gated), a READING lesson, a GRAMMAR lesson (the heaviest client
 * bundle), and a mistyped path that must still carry the header on its 404.
 */
const ROUTES = [
  "/",
  "/ld",
  "/ld/d001",
  "/phonics/mv1-01",
  "/t/ld",
  "/student/s1-1",
  "/reading/pr001",
  "/grammar1/gh1-006",
  "/x/y/z",
];

/** Verbatim, in order. A reordered or reworded policy is a different policy. */
const REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

const OTHER_SECURITY_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];

const REPORT_ONLY = "content-security-policy-report-only";
const ENFORCING = "content-security-policy";

const isLoopback = (host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);

/**
 * THE SITE'S OWN ORIGIN IS NOT THE REQUEST'S HOST, and getting this wrong made
 * this probe fail 8/9 on its first run against a correct build. `metadataBase`
 * pins canonical and `og:url` to the production domain, so on a local server
 * every page carries `k-ig-core.vercel.app` in a `href` and the probe called the
 * site a third party to itself. The same trap cost time in
 * `verify-metadata.cjs` (there: comparing origins instead of paths).
 *
 * So the self-origin is READ OFF THE PAGE rather than assumed: whatever
 * canonical and `og:url` say the site is, plus the host actually requested.
 * That stays correct on localhost, on a preview deployment, and on production,
 * without a hardcoded domain to drift. The inferred set is printed, so a
 * canonical that ever pointed somewhere unexpected would be visible rather than
 * silently widening the allow-list.
 */
function inferSelfHosts(html, baseHost) {
  const self = new Set([baseHost]);
  const patterns = [
    /<link[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i,
    /<link[^>]*\bhref="([^"]+)"[^>]*\brel="canonical"/i,
    /<meta[^>]*\bproperty="og:url"[^>]*\bcontent="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    try {
      self.add(new URL(m[1], `https://${baseHost}`).host);
    } catch {
      /* unparseable — ignore rather than guess */
    }
  }
  return self;
}

/**
 * Origins that appear in real attribute positions. The RSC flight payload is
 * deliberately excluded: it carries serialised props, and a string that looks
 * like a URL there is data, not a fetch the browser will make. Blocking it would
 * be a false positive that trains us to ignore the probe.
 */
function analyseHtml(html, selfHosts) {
  const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) || []).length;
  const inlineStyles = (html.match(/\sstyle\s*=\s*"/gi) || []).length;

  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");

  const attrUrls = [];
  const attrRe = /\b(?:src|href)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(withoutScripts))) {
    const v = m[1].trim();
    if (/^https?:\/\//i.test(v) || /^\/\//.test(v)) attrUrls.push(v.startsWith("//") ? `https:${v}` : v);
  }

  const hosts = new Set();
  for (const u of attrUrls) {
    try {
      hosts.add(new URL(u).host);
    } catch {
      /* not a URL we can parse; ignore */
    }
  }

  const thirdParty = [...hosts].filter((h) => !selfHosts.has(h) && !isLoopback(h));

  return { inlineScripts, inlineStyles, attrUrls: attrUrls.length, thirdParty };
}

async function probe(base) {
  const results = [];
  for (const route of ROUTES) {
    const url = `${base}${route}`;
    const row = { route, ok: false, problems: [], notes: [] };
    let res;
    try {
      res = await fetch(url, { redirect: "follow", headers: { "user-agent": "kig-verify-csp" } });
    } catch (err) {
      row.problems.push(`request failed: ${err.message}`);
      results.push(row);
      continue;
    }

    const headers = res.headers;
    const csp = headers.get(REPORT_ONLY);
    const enforcing = headers.get(ENFORCING);
    row.status = res.status;

    if (!csp) {
      row.problems.push(`no ${REPORT_ONLY} header`);
    } else {
      const missing = REQUIRED_DIRECTIVES.filter((d) => !csp.includes(d));
      if (missing.length) row.problems.push(`directives missing: ${missing.join(" | ")}`);
      row.notes.push(`policy ${csp.length} chars, ${csp.split(";").length} directives`);
    }

    if (enforcing) {
      row.problems.push(
        `enforcing ${ENFORCING} is present — the policy is Report-Only by decision (a wrong CSP breaks every route at once); flip CSP_REPORT_ONLY only after this probe reports 0 violations on production`,
      );
    }

    const absent = OTHER_SECURITY_HEADERS.filter((h) => !headers.get(h));
    if (absent.length) row.problems.push(`other security headers missing: ${absent.join(", ")}`);

    const html = await res.text();
    const selfHosts = inferSelfHosts(html, BASE_HOST);
    const a = analyseHtml(html, selfHosts);
    row.notes.push(`inlineScripts ${a.inlineScripts}, inlineStyles ${a.inlineStyles}, attrUrls ${a.attrUrls}`);
    row.notes.push(`self origins: ${[...selfHosts].join(", ")}`);
    if (a.thirdParty.length) {
      row.problems.push(`third-party origins in src/href, blocked by the policy: ${a.thirdParty.join(", ")}`);
    }
    if (a.inlineScripts === 0 && a.inlineStyles === 0) {
      row.notes.push("no inline script or style — 'unsafe-inline' could be dropped");
    }

    row.ok = row.problems.length === 0;
    results.push(row);
  }
  return results;
}

/**
 * MEDIA IS THE PART OF THIS POLICY MOST LIKELY TO BE GOT WRONG, and the part a
 * learner notices first. `media-src 'self'` is only correct while every clip is
 * served from this origin — which is true today because `/audio/*` is a route
 * handler, not a bucket URL (that was the point of the media gate). So the probe
 * fetches one clip from a free lesson and requires 200. If a clip ever moves
 * back to an absolute bucket URL, this fails instead of the audio going silent.
 *
 * The locked clip is reported but not asserted: 403 is the media gate doing its
 * job, and that behaviour belongs to a different probe. It is here only so the
 * two numbers can be read side by side and a "200 for everything" regression
 * would be obvious.
 */
const FREE_CLIP = "/audio/ld/d001.mp3";
const LOCKED_CLIP = "/audio/ld/d276.mp3";

async function probeMedia(base) {
  const row = { route: FREE_CLIP, ok: false, problems: [], notes: [] };
  try {
    const res = await fetch(`${base}${FREE_CLIP}`, { headers: { "user-agent": "kig-verify-csp" } });
    row.status = res.status;
    row.notes.push(`content-type ${res.headers.get("content-type") || "-"}`);
    if (res.status !== 200) {
      row.problems.push(`free-lesson clip is not 200 — media-src 'self' cannot help if the clip is not served from here`);
    }
    if (res.headers.get("content-security-policy-report-only") === null) {
      row.problems.push(`no ${REPORT_ONLY} header on the media route`);
    }
    row.ok = row.problems.length === 0;
  } catch (err) {
    row.problems.push(`request failed: ${err.message}`);
  }

  const note = { route: LOCKED_CLIP, ok: true, problems: [], notes: [] };
  try {
    const res = await fetch(`${base}${LOCKED_CLIP}`, { headers: { "user-agent": "kig-verify-csp" } });
    note.status = res.status;
    note.notes.push(`locked clip answers ${res.status} (403 expected — media gate, not this probe's assertion)`);
  } catch (err) {
    note.notes.push(`locked clip request failed: ${err.message}`);
  }

  return [row, note];
}

(async () => {
  console.log(`RE-006 CSP probe — ${BASE}\n`);

  const results = [...(await probe(BASE)), ...(await probeMedia(BASE))];

  let pass = 0;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.route}  [${r.status ?? "-"}]`);
    for (const n of r.notes) console.log(`        · ${n}`);
    for (const p of r.problems) console.log(`        ✗ ${p}`);
    if (r.ok) pass++;
  }

  const failed = results.length - pass;
  console.log(`\n${pass}/${results.length} routes pass`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "verify-csp.json"),
    JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), pass, total: results.length, results }, null, 2),
  );

  process.exit(failed === 0 ? 0 : 1);
})();
