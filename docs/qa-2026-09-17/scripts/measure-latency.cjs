#!/usr/bin/env node
/**
 * PERF-04 — server response time on production, and WHERE the function ran.
 *
 * Read-only: sequential anonymous GETs, nothing written. For each route: 2 warm-up requests, then N timed
 * ones (Node fetch wall time, body fully read). Records the WHOLE `x-vercel-id`
 * (`<edge>::<function region>::…`; a CDN hit has no function part), so a before/after pair shows the move
 * itself, not only the timing.
 *
 * Routes chosen to separate the parts of the delay:
 *   pages through the proxy     /  /reading  /ld  /ld/d001  /ld/d150  a 404
 *   function, no proxy, no R2   /api/license/session (no cookie → answers without storage)
 *   function + ONE R2 call      /audio/ld/d001.zzlatencyprobe (the lesson id is read without its last
 *                               extension, so this is the free d001 → allowed → one GetObject → 404, no-store)
 *   function, no R2             /audio/adults/<x>.mp3 (retired folder → 403 before storage)
 *   CDN only                    /robots.txt
 * The gap between the last two /audio rows is the cost of one R2 round trip from the function's region.
 *
 *   node measure-latency.cjs [--n 20] [--label before-icn1]
 *   → docs/qa-2026-09-17/out/latency-<label>.json
 */
const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = opt("--base", "https://k-ig-core.vercel.app").replace(/\/+$/, "");
const N = Number(opt("--n", 20));
const LABEL = opt("--label", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
const OUT = path.join(__dirname, "../out");

const ROUTES = [
  ["/", "page"],
  ["/reading", "page"],
  ["/ld", "page"],
  ["/ld/d001", "page (free lesson)"],
  ["/ld/d150", "page (paid lesson, no licence)"],
  ["/kig-latency-probe-404", "page (404)"],
  ["/api/license/session", "function, no proxy, no storage"],
  ["/audio/ld/d001.zzlatencyprobe", "function + one R2 call"],
  ["/audio/adults/zz-latency-probe.mp3", "function, no storage"],
  ["/robots.txt", "CDN only"],
];

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]); };

(async () => {
  const rows = {};
  for (const [route, kind] of ROUTES) {
    for (let i = 0; i < 2; i++) await (await fetch(BASE + route, { redirect: "manual" })).arrayBuffer().catch(() => {});
    const ms = [];
    const ids = new Set();
    let status = null;
    let cache = null;
    for (let i = 0; i < N; i++) {
      const t0 = performance.now();
      const res = await fetch(BASE + route, { redirect: "manual" });
      await res.arrayBuffer();
      ms.push(performance.now() - t0);
      status = res.status;
      cache = res.headers.get("x-vercel-cache");
      const id = (res.headers.get("x-vercel-id") || "").split("::");
      ids.add(id.length > 2 ? `${id[0]}::${id[1]}` : `${id[0]}::(cdn)`);
    }
    rows[route] = { kind, status, cache, where: [...ids], p50: pct(ms, 50), p90: pct(ms, 90), min: Math.round(Math.min(...ms)) };
    console.log(`${route.padEnd(36)} ${kind.padEnd(32)} p50 ${String(rows[route].p50).padStart(4)} ms  p90 ${String(rows[route].p90).padStart(4)}  min ${String(rows[route].min).padStart(4)}  ${status}  ${[...ids].join(",")}`);
  }
  const r2 = rows["/audio/ld/d001.zzlatencyprobe"].p50 - rows["/audio/adults/zz-latency-probe.mp3"].p50;
  if (rows["/audio/ld/d001.zzlatencyprobe"].status !== 404) console.log(`WARNING: the one-R2-call probe answered ${rows["/audio/ld/d001.zzlatencyprobe"].status}, not 404 — the R2 figure below is not valid`);
  console.log(`\none R2 round trip from the function region ≈ ${r2} ms (median difference of the two /audio rows)`);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `latency-${LABEL}.json`);
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), base: BASE, n: N, r2RoundTripMs: r2, rows }, null, 1));
  console.log(`saved ${path.relative(path.join(__dirname, "../../.."), file)}`);
})();
