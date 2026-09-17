#!/usr/bin/env node
/**
 * MEDIA-01 — R2 media bodies: never cut off mid-stream, and never left holding a connection.
 *
 * Loads the REAL src/lib/mediaOrigin.ts (working tree) next to earlier versions of it and talks to R2 for
 * real (read-only GetObject; storage credentials come from .env.local and are never printed):
 *
 *   1  SLOW READ    — the body is read with a 5 s pause after the first chunk. The committed version
 *                     (HEAD, `AbortSignal.timeout(4000)` armed for the whole transfer) is cut off; the working
 *                     tree must deliver every byte.
 *   2  UNREAD BODIES — 60 objects are fetched and their bodies never read, exactly as the HEAD routes and the
 *                     health probe do, then one normal Range request must answer 206 within 2 s. The first
 *                     version of the fix (timer cleared, bodies not cancelled; `--leaky <file>`) exhausted the
 *                     SDK's 50-socket pool here; the working tree cancels, which must free the sockets.
 *   3  DISCONNECTS  — 20 downloads are dropped after the first chunk (a listener skipping a clip), then the same
 *                     206-within-2-s request.
 *   4  STALL        — `toWebStream` on a fake stream that goes silent: a waiting read must fail after the stall
 *                     limit, and a reader that simply pauses must not.
 *   5  SAME ANSWERS — Range still 206 with the bytes asked for; a missing key still 404; no storage fault recorded.
 *   2b BACKSTOP     — 60 bodies nobody reads or cancels are freed by the transfer ceiling (shortened for the test).
 *   2c NOT TOO EAGER — a reader who has taken the first chunk and pauses past that ceiling still gets every byte.
 *   6  END TO END   — `next start` (reads .env.local), 60 HEAD requests, 20 dropped GETs, and (6b) 60 clients that
 *                     hang up before R2 answers, each followed by a Range GET that must be 206 in time; a full 3 MB
 *                     download; /api/media-health ok. Skipped with --no-server. Needs a current `pnpm build`.
 *                     6b failed before the route cancelled on the request's abort signal: 502 after 4.5 s.
 *
 *   node --env-file=.env.local docs/qa-2026-09-17/scripts/verify-media-origin-stream.cjs [--leaky <path to first-fix copy>] [--no-server]
 *   exit 0 = every check as expected
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const { spawn, execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BIG_KEY = opt("--key", "audio/grammar1/gh1-006.mp3"); // 3 MB, free preview
const MID_KEY = "audio/ld/d001.mp3"; // 610 KB, free preview, not under public/audio locally
const PAUSE = Number(opt("--pause", 5000));
const LEAKY = opt("--leaky", null);
const SERVER = !argv.includes("--no-server");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
  console.error("STOP: run with node --env-file=.env.local (R2 variables are missing)");
  process.exit(2);
}

const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: Boolean(ok), detail: typeof detail === "string" ? detail : JSON.stringify(detail) });

function loadCopy(source, tag) {
  const file = path.join(os.tmpdir(), `mediaOrigin-${tag}-${process.pid}.ts`);
  fs.writeFileSync(file, source);
  const mod = loadTs(file);
  fs.rmSync(file, { force: true });
  return mod;
}

async function readSlowly(body) {
  let bytes = 0;
  let error = null;
  const t0 = Date.now();
  const reader = body.getReader ? body.getReader() : null;
  try {
    if (reader) {
      let first = true;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (first) { first = false; await sleep(PAUSE); }
      }
    } else {
      let first = true;
      for await (const chunk of body) {
        bytes += chunk.length;
        if (first) { first = false; await sleep(PAUSE); }
      }
    }
  } catch (e) {
    error = `${e.name || "Error"}: ${e.message}`.slice(0, 120);
  }
  return { bytes, error, ms: Date.now() - t0 };
}

async function readAll(body) {
  const reader = body.getReader();
  let bytes = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) return bytes; bytes += value.length; }
}

/** One Range request; ok when it is a real 206 of 2 bytes within `budgetMs`. */
async function rangeInTime(mod, budgetMs = 2000) {
  const t0 = Date.now();
  const res = await mod.fetchMediaObject(MID_KEY, "bytes=0-1");
  const bytes = res.body && res.status === 206 ? await readAll(res.body) : 0;
  const ms = Date.now() - t0;
  return { status: res.status, bytes, ms, ok: res.status === 206 && bytes === 2 && ms <= budgetMs };
}

(async () => {
  const current = loadTs(path.join(REPO, "src/lib/mediaOrigin.ts"));

  // ── 1 slow read ──
  const committed = loadCopy(execFileSync("git", ["show", "HEAD:src/lib/mediaOrigin.ts"], { cwd: REPO, encoding: "utf8" }), "head");
  for (const [name, mod] of [["committed (HEAD)", committed], ["working tree", current]]) {
    const res = await mod.fetchMediaObject(BIG_KEY, null);
    const expected = Number(res.headers.get("content-length"));
    const slow = res.body ? await readSlowly(res.body) : { bytes: 0, error: "no body", ms: 0 };
    console.log(`1 ${name.padEnd(17)} ${res.status} content-length ${expected} received ${slow.bytes} in ${slow.ms} ms${slow.error ? ` ERROR ${slow.error}` : ""}`);
    if (mod === committed) check(`1 the slow read reproduces the cut on the committed version: ${slow.bytes} of ${expected} bytes${slow.error ? ` (${slow.error})` : ""}`, slow.bytes < expected);
    else check(`1 the working tree delivers the whole object through a ${PAUSE / 1000} s pause: ${slow.bytes} of ${expected} bytes`, res.status === 200 && expected > 0 && slow.bytes === expected && !slow.error, slow.error || "");
  }

  // ── 2 unread bodies ──
  if (LEAKY) {
    const leaky = loadCopy(fs.readFileSync(LEAKY, "utf8"), "leaky");
    for (let i = 0; i < 60; i++) { const res = await leaky.fetchMediaObject(MID_KEY, null); new Response(res.body); }
    const after = await rangeInTime(leaky);
    console.log(`2 first fix (leaky)  after 60 unread bodies: ${JSON.stringify(after)}`);
    check(`2 the unread-body test reproduces the leak on the first fix: Range after 60 unread bodies → ${after.status}, ${after.bytes} bytes, ${after.ms} ms`, !after.ok);
  }
  for (let i = 0; i < 60; i++) {
    const res = await current.fetchMediaObject(MID_KEY, null);
    const dropped = new Response(res.body); // what the HEAD route builds, then throws away
    void dropped.body?.cancel().catch(() => {}); // what the HEAD route now does
  }
  const afterHead = await rangeInTime(current);
  console.log(`2 working tree       after 60 cancelled bodies: ${JSON.stringify(afterHead)}`);
  check(`2 after 60 fetched-and-cancelled bodies a Range request still answers 206 with 2 bytes in ≤ 2 s (${afterHead.status}, ${afterHead.bytes} bytes, ${afterHead.ms} ms)`, afterHead.ok, afterHead);

  // 2b the backstop: bodies nobody reads OR cancels (a path nobody thought of) are freed by the transfer ceiling.
  // A fresh copy of the module gets its own 50-socket pool, so this cannot borrow sockets freed above.
  const backstop = loadCopy(fs.readFileSync(path.join(REPO, "src/lib/mediaOrigin.ts"), "utf8"), "backstop");
  for (let i = 0; i < 60; i++) { const res = await backstop.fetchMediaObject(MID_KEY, null, { transferMaxMs: 1500 }); new Response(res.body); }
  await sleep(2500);
  const afterForgotten = await rangeInTime(backstop);
  console.log(`2b fresh copy        after 60 forgotten bodies + ceiling: ${JSON.stringify(afterForgotten)}`);
  check(`2b 60 bodies nobody reads or cancels are freed by the transfer ceiling (1.5 s in this test, 120 s in the app): Range then 206 in ≤ 2 s (${afterForgotten.status}, ${afterForgotten.ms} ms)`, afterForgotten.ok, afterForgotten);

  // 2c the ceiling must NOT cut a reader who has started and then pauses (a player preloading, then waiting for "play").
  {
    const res = await current.fetchMediaObject(BIG_KEY, null, { transferMaxMs: 1500 });
    const expected = Number(res.headers.get("content-length"));
    const reader = res.body.getReader();
    let bytes = 0;
    let err = null;
    try {
      const first = await reader.read();
      bytes += first.value ? first.value.length : 0;
      await sleep(3000); // twice the (shortened) ceiling
      for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; }
    } catch (e) { err = `${e.name}: ${e.message}`; }
    check(`2c a reader who pauses 3 s after the first chunk (ceiling 1.5 s) still gets the whole object: ${bytes} of ${expected} bytes`, !err && bytes === expected, err || "");
  }

  // ── 3 disconnects ──
  for (let i = 0; i < 20; i++) {
    const res = await current.fetchMediaObject(BIG_KEY, null);
    const reader = res.body.getReader();
    await reader.read();
    await reader.cancel();
  }
  const afterDrop = await rangeInTime(current);
  console.log(`3 working tree       after 20 dropped downloads: ${JSON.stringify(afterDrop)}`);
  check(`3 after 20 downloads dropped mid-stream a Range request still answers 206 in ≤ 2 s (${afterDrop.status}, ${afterDrop.ms} ms)`, afterDrop.ok, afterDrop);

  // ── 4 stall ──
  {
    let destroyed = false;
    const silent = new Readable({ read() {} });
    silent.push(Buffer.from("first chunk"));
    const origDestroy = silent.destroy.bind(silent);
    silent.destroy = (e) => { destroyed = true; return origDestroy(e); };
    const stream = current.toWebStream(silent, 300);
    const reader = stream.getReader();
    await reader.read();
    const t0 = Date.now();
    let err = null;
    try { await reader.read(); } catch (e) { err = e.message; }
    check(`4 a read waiting on a silent R2 body fails after the stall limit (${Date.now() - t0} ms, "${err}") and the stream is destroyed`, err && Date.now() - t0 >= 250 && destroyed, { err, destroyed });

    const slowSource = Readable.from((async function* () { yield Buffer.from("a"); yield Buffer.from("b"); })());
    const paused = current.toWebStream(slowSource, 300);
    const r2 = paused.getReader();
    await r2.read();
    await sleep(900); // the reader stops pulling for 3× the limit
    let pausedErr = null;
    let rest = 0;
    try { for (;;) { const { done, value } = await r2.read(); if (done) break; rest += value.length; } } catch (e) { pausedErr = e.message; }
    check(`4 a reader that pauses for 3× the stall limit is not cut off (${rest} more byte(s))`, !pausedErr && rest === 1, pausedErr || "");
  }

  // ── 5 same answers ──
  const ranged = await current.fetchMediaObject(BIG_KEY, "bytes=100-199");
  const rangedBytes = ranged.body ? await readAll(ranged.body) : 0;
  check(`5 Range still 206 with the requested 100 bytes (${ranged.status}, ${ranged.headers.get("content-range")}, ${rangedBytes} bytes)`, ranged.status === 206 && rangedBytes === 100 && /^bytes 100-199\//.test(ranged.headers.get("content-range") || ""));
  const missing = await current.fetchMediaObject(`${BIG_KEY}.kig-missing-probe`, null);
  check(`5 a missing key is still a plain 404 (${missing.status})`, missing.status === 404);
  check("5 no storage fault recorded on the working tree (nothing fell back to the public URL)", !current.getLastS3Error(), current.getLastS3Error());

  // ── 6 end to end ──
  if (SERVER) {
    const PORT = 3221;
    const BASE = `http://localhost:${PORT}`;
    const env = { ...process.env, PORT: String(PORT), NODE_ENV: "production" };
    delete env.VERCEL;
    const srv = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { cwd: REPO, env, stdio: "ignore" });
    try {
      let up = false;
      for (let i = 0; i < 60 && !up; i++) { try { up = (await fetch(`${BASE}/robots.txt`)).ok; } catch {} if (!up) await sleep(1000); }
      check("6 local next start is serving", up);
      const url = `${BASE}/audio/ld/d001.mp3`;
      let headOk = 0;
      for (let i = 0; i < 60; i++) { const r = await fetch(url, { method: "HEAD" }); if (r.status === 200) headOk++; }
      const t0 = Date.now();
      const r1 = await fetch(url, { headers: { Range: "bytes=0-1" } });
      const b1 = Buffer.from(await r1.arrayBuffer()).length;
      const ms1 = Date.now() - t0;
      check(`6 after 60 HEAD requests (${headOk} answered 200) a Range GET is 206 with 2 bytes in ≤ 2 s (${r1.status}, ${b1} bytes, ${ms1} ms)`, headOk === 60 && r1.status === 206 && b1 === 2 && ms1 <= 2000);
      for (let i = 0; i < 20; i++) {
        const ctrl = new AbortController();
        const r = await fetch(`${BASE}/audio/grammar1/gh1-006.mp3`, { signal: ctrl.signal });
        const reader = r.body.getReader();
        await reader.read();
        ctrl.abort();
        await reader.cancel().catch(() => {});
      }
      await sleep(500);
      const t1 = Date.now();
      const r2 = await fetch(url, { headers: { Range: "bytes=0-1" } });
      const b2 = Buffer.from(await r2.arrayBuffer()).length;
      const ms2 = Date.now() - t1;
      check(`6 after 20 downloads aborted by the client a Range GET is 206 with 2 bytes in ≤ 2 s (${r2.status}, ${b2} bytes, ${ms2} ms)`, r2.status === 206 && b2 === 2 && ms2 <= 2000);
      // 6b hang-ups BEFORE R2 answers: Next never starts the response, so only the route's abort handling (or
      // the 120 s ceiling, too slow for this check) gives the connection back. Before that handling: 502 after 4.5 s.
      const http = require("http");
      const hangUp = () => new Promise((resolve) => {
        const req = http.request({ host: "127.0.0.1", port: PORT, path: "/audio/grammar1/gh1-006.mp3", method: "GET", headers: { Range: "bytes=0-" } });
        req.on("error", () => resolve());
        req.on("response", (res) => { res.destroy(); resolve(); });
        req.end();
        setTimeout(() => { req.destroy(); resolve(); }, 3);
      });
      for (let i = 0; i < 60; i++) await hangUp();
      await sleep(1500);
      const t2 = Date.now();
      const r3 = await fetch(url, { headers: { Range: "bytes=0-1" } });
      const b3 = Buffer.from(await r3.arrayBuffer()).length;
      const ms3 = Date.now() - t2;
      check(`6b after 60 clients hung up before R2 answered, a Range GET is 206 with 2 bytes in ≤ 2 s (${r3.status}, ${b3} bytes, ${ms3} ms)`, r3.status === 206 && b3 === 2 && ms3 <= 2000);

      const full = await fetch(`${BASE}/audio/grammar1/gh1-006.mp3`);
      const fullBytes = Buffer.from(await full.arrayBuffer()).length;
      check(`6 a whole 3 MB recording still downloads in full through the route (${full.status}, ${fullBytes} bytes, cache ${full.headers.get("cache-control")})`, full.status === 200 && fullBytes === Number(full.headers.get("content-length")) && /^private, max-age=31536000, immutable$/.test(full.headers.get("cache-control") || ""));
      const health = await (await fetch(`${BASE}/api/media-health`)).json();
      check(`6 /api/media-health says ok (${JSON.stringify(health)})`, health.ok === true);
    } finally {
      srv.kill();
    }
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok || !r.detail ? "" : `  — ${r.detail}`}`);
  console.log(`\n${results.length - failed.length}/${results.length} as expected`);
  process.exit(failed.length ? 1 : 0);
})();
