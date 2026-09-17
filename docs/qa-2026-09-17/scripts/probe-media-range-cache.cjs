#!/usr/bin/env node
/**
 * MEDIA-02 — does a Range request for a publicly cached clip get a correct 206?
 *
 * Read-only. Uses a free speech clip (on the free list, so no licence) with a unique query string,
 * so this run starts from an empty CDN entry and never touches what real visitors are served:
 *   1. Range bytes=0-1        (what Safari sends first)   → before any full GET
 *   2. plain GET               (fills the CDN cache)
 *   3. Range bytes=0-1         again, now possibly from the cache
 *   4. Range bytes=100-199     a seek into the clip
 *   5. Range bytes=0-          what Chrome sends
 * For each: status, x-vercel-cache, content-range, content-length, bytes actually received, cache-control.
 * A correct answer to a Range request is 206 with exactly the requested bytes. A 200 whose body is only the
 * requested slice is wrong: the browser takes it as the whole file.
 *
 *   node probe-media-range-cache.cjs [--base https://k-ig-core.vercel.app] [--key 1-7c5ff007cb7a5acb]
 *   → exit 1 if any Range answer is not a correct 206 (or a full 200 for bytes=0-)
 */
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = opt("--base", "https://k-ig-core.vercel.app").replace(/\/+$/, "");
const KEY = opt("--key", require("../../../src/lib/generated/freeSpeechKeys.json").keys[0]);
const url = `${BASE}/audio/azure-ava/v1/${KEY}.mp3?rangeprobe=${Date.now().toString(36)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(range) {
  const res = await fetch(url, { headers: range ? { Range: range } : {} });
  const buf = Buffer.from(await res.arrayBuffer());
  const h = (k) => res.headers.get(k);
  return { range: range || "(none)", status: res.status, cache: h("x-vercel-cache"), contentRange: h("content-range"), contentLength: h("content-length"), received: buf.length, cacheControl: h("cache-control") };
}

(async () => {
  const steps = [];
  steps.push(await get("bytes=0-1"));
  steps.push(await get(null));
  await sleep(1500);
  const total = steps[1].received;
  steps.push(await get("bytes=0-1"));
  steps.push(await get("bytes=100-199"));
  steps.push(await get("bytes=0-"));
  const problems = [];
  for (const s of steps) {
    let ok;
    if (s.range === "(none)") ok = s.status === 200 && s.received === total;
    else if (s.range === "bytes=0-") ok = (s.status === 206 && s.received === total) || (s.status === 200 && s.received === total && !s.contentRange);
    else {
      const [a, b] = s.range.slice(6).split("-").map(Number);
      ok = s.status === 206 && s.received === b - a + 1 && new RegExp(`^bytes ${a}-${b}/${total}$`).test(s.contentRange || "");
    }
    s.ok = ok;
    if (!ok) problems.push(s);
    console.log(`${ok ? "OK  " : "BAD "} ${s.range.padEnd(14)} ${s.status} cache=${s.cache} content-range=${s.contentRange} length=${s.contentLength} received=${s.received} cc=${s.cacheControl}`);
  }
  console.log(`\nclip ${KEY}, ${total} bytes, ${url.split("?")[1]}`);
  console.log(problems.length ? `FAIL — ${problems.length} answer(s) a browser would misread` : "PASS — every Range request got a correct answer");
  process.exit(problems.length ? 1 : 0);
})();
