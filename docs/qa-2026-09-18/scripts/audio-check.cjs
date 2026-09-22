#!/usr/bin/env node
/**
 * Phase 6 (2/2) — is every clip really there, really audio, and really gated?
 *
 *   --anon      no cookies at all (plain node fetch, Range bytes=0-1):
 *               a clip of a FREE lesson must answer 200/206 audio/mpeg,
 *               every other clip must answer 403, and the legacy course media
 *               (/audio/<course>/<file>) must follow the same rule. Retired course
 *               folders and suffix-stripped free ids are probed too.
 *   --licensed  inside the licensed clone's own page (so the licence cookie is used and
 *               never read by this script): fetch each clip in full and compute status,
 *               bytes, SHA-256 and the MP3 duration from its frame headers, then flag
 *               missing/empty/invalid clips, duration outliers against the text length,
 *               and one audio file shared by different texts.
 *
 *   node audio-check.cjs --anon [--limit N] [--concurrency 12]
 *   node audio-check.cjs --licensed [--limit N] [--concurrency 8] [--port 9560]
 * Output: out/audio-check-anon.json / out/audio-check-licensed.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const MODE = process.argv.includes("--licensed") ? "licensed" : "anon";
const LIMIT = Number(arg("--limit", 0)) || 0;
const CONC = Number(arg("--concurrency", MODE === "anon" ? 12 : 8));
const PORT = Number(arg("--port", 9560));
const OUT = path.join(__dirname, "../out");
const inv = JSON.parse(fs.readFileSync(path.join(OUT, "audio-inventory.json"), "utf8"));
const clips = LIMIT ? inv.clips.slice(0, LIMIT) : inv.clips;

async function anon() {
  const rows = [];
  let i = 0;
  const worker = async () => {
    for (;;) {
      const k = i++;
      if (k >= clips.length) return;
      const c = clips[k];
      let r = null;
      for (let a = 0; a < 3 && !r; a++) {
        r = await fetch(H.BASE + c.path, { headers: { range: "bytes=0-1" } }).catch(() => null);
        if (r && (r.status === 429 || r.status >= 500)) { await new Promise((x) => setTimeout(x, 1200 * (a + 1))); r = null; }
      }
      if (!r) { rows.push({ path: c.path, free: c.freeLesson, status: -1, pass: false, note: "request failed" }); continue; }
      await r.arrayBuffer().catch(() => {});
      const type = r.headers.get("content-type") || "";
      const open = r.status === 200 || r.status === 206;
      const shouldOpen = c.inFreeKeyList;
      rows.push({ path: c.path, free: c.freeLesson, inFreeKeyList: c.inFreeKeyList, status: r.status, type, pass: shouldOpen ? open && /audio/.test(type) : r.status === 403, note: shouldOpen && !open ? "free-lesson clip is NOT served anonymously" : !shouldOpen && open ? "paid clip served anonymously" : "" });
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));

  // legacy course media + retired folders + the suffix-stripping probe
  const extra = [];
  for (const l of inv.legacyAudio) extra.push({ url: l.src, expect: l.freeLesson ? "open" : "403", why: `lesson media ${l.lessons[0]}` });
  for (const p of ["/audio/adults/am01.mp3", "/audio/man/m01.mp3", "/audio/woman/w01.mp3", "/audio/basics/b01.mp3", "/audio/chinese/c01.mp3", "/audio/middle/mid01.mp3"]) extra.push({ url: p, expect: "403", why: "retired course folder" });
  for (const p of ["/audio/student/s1-1-9.mp3", "/audio/ld/d001-9.mp3", "/audio/reading/pr001-9.mp3"]) extra.push({ url: p, expect: "403-or-404", why: "free id with an invented suffix (mediaAccess suffix stripping)" });
  const extraRows = [];
  let j = 0;
  const worker2 = async () => {
    for (;;) {
      const k = j++;
      if (k >= extra.length) return;
      const e = extra[k];
      const r = await fetch(H.BASE + e.url, { headers: { range: "bytes=0-1" } }).catch(() => null);
      if (r) await r.arrayBuffer().catch(() => {});
      const status = r ? r.status : -1;
      const open = status === 200 || status === 206;
      extraRows.push({ ...e, status, pass: e.expect === "open" ? open : e.expect === "403" ? status === 403 : status === 403 || status === 404 });
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker2));

  const fails = rows.filter((r) => !r.pass);
  const extraFails = extraRows.filter((r) => !r.pass);
  const out = {
    at: new Date().toISOString(), base: H.BASE, clips: rows.length,
    summary: {
      freeListedOpen: rows.filter((r) => r.inFreeKeyList && r.pass).length,
      freeListedTotal: rows.filter((r) => r.inFreeKeyList).length,
      paidBlocked: rows.filter((r) => !r.inFreeKeyList && r.pass).length,
      paidTotal: rows.filter((r) => !r.inFreeKeyList).length,
      failures: fails.length,
    },
    failures: fails.slice(0, 100),
    legacyAndFolders: { checked: extraRows.length, failures: extraFails.slice(0, 60) },
  };
  fs.writeFileSync(path.join(OUT, "audio-check-anon.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.summary, null, 1), "\nlegacy/folder failures:", extraFails.length);
  for (const f of fails.slice(0, 15)) console.log("  FAIL", JSON.stringify(f));
  for (const f of extraFails.slice(0, 15)) console.log("  FAIL", JSON.stringify(f));
}

/** Runs inside the page: fetch a clip with the licence cookie, measure it, return numbers only. */
const MEASURE = `async (urls) => {
  const mp3Duration = (buf) => {
    const b = new Uint8Array(buf);
    let i = 0;
    if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) i = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
    const V = [2.5, 0, 2, 1], RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };
    const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
    let frames = 0, seconds = 0, guard = 0;
    while (i + 4 <= b.length && guard++ < 200000) {
      if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
      const ver = V[(b[i + 1] >> 3) & 3], layer = 4 - ((b[i + 1] >> 1) & 3);
      const brIdx = (b[i + 2] >> 4) & 15, srIdx = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
      if (!ver || layer !== 3 || brIdx === 0 || brIdx === 15 || srIdx === 3) { i++; continue; }
      const sr = RATES[ver][srIdx], br = (ver === 1 ? BR1[brIdx] : BR2[brIdx]) * 1000;
      const spf = ver === 1 ? 1152 : 576;
      const len = Math.floor((spf / 8) * br / sr) + pad;
      if (len < 8) { i++; continue; }
      frames++; seconds += spf / sr; i += len;
    }
    return { frames, seconds: Math.round(seconds * 1000) / 1000 };
  };
  const out = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!(r.status === 200 || r.status === 206)) { out.push({ url, status: r.status }); continue; }
      const buf = await r.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buf);
      const hex = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
      const d = mp3Duration(buf);
      out.push({ url, status: r.status, type: r.headers.get('content-type') || '', bytes: buf.byteLength, sha: hex, seconds: d.seconds, frames: d.frames });
    } catch (e) { out.push({ url, status: -1, error: String(e && e.message).slice(0, 80) }); }
  }
  return out;
}`;

async function licensed() {
  const browser = await H.startBrowser("audio", PORT);
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    await H.load(tab, "/", { marker: null });
    const batches = [];
    for (let i = 0; i < clips.length; i += 25) batches.push(clips.slice(i, i + 25));
    let done = 0;
    const started = Date.now();
    const online = async () => { try { const r = await fetch(H.BASE + "/robots.txt", { signal: AbortSignal.timeout(10000) }); return r.ok; } catch { return false; } };
    for (const batch of batches) {
      // never record clips as missing because the machine went offline — wait and redo the batch
      let res;
      for (;;) {
        while (!(await online())) { console.log("offline — waiting"); await H.sleep(60000); }
        res = await tab.eval(`(${MEASURE})(${JSON.stringify(batch.map((c) => c.path))})`).catch((e) => [{ error: String(e.message).slice(0, 120) }]);
        if ((res || []).every((r) => r.status === -1 || r.error) && !(await online())) continue;
        break;
      }
      for (const r of res || []) {
        const c = clips.find((x) => x.path === r.url);
        rows.push({ ...r, texts: c ? c.texts.slice(0, 2) : [], chars: c ? (c.texts[0] || "").length : 0, lessons: c ? c.lessons.slice(0, 2) : [] });
      }
      done += batch.length;
      if (done % 500 < 25) {
        const rate = (Date.now() - started) / done;
        console.log(`${done}/${clips.length} · eta ${Math.round(((clips.length - done) * rate) / 60000)} min`);
        fs.writeFileSync(path.join(OUT, "audio-check-licensed.partial.json"), JSON.stringify({ rows }, null, 1));
      }
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  // duration vs text length: fit seconds-per-character on the middle of the distribution
  const ok = rows.filter((r) => r.status === 200 || r.status === 206);
  const ratios = ok.filter((r) => r.chars > 4 && r.seconds > 0).map((r) => r.seconds / r.chars).sort((a, b) => a - b);
  const med = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
  const shaMap = new Map();
  for (const r of ok) if (r.sha) (shaMap.get(r.sha) || shaMap.set(r.sha, []).get(r.sha)).push(r);
  const sharedAudio = [...shaMap.values()].filter((g) => new Set(g.map((x) => x.texts[0])).size > 1);
  const out = {
    at: new Date().toISOString(), clips: rows.length,
    summary: {
      served: ok.length,
      missingOrBlocked: rows.filter((r) => r.status !== 200 && r.status !== 206).length,
      notAudio: ok.filter((r) => !/audio/.test(r.type || "")).length,
      empty: ok.filter((r) => !r.bytes || r.bytes < 500).length,
      unparsable: ok.filter((r) => !r.frames).length,
      medianSecondsPerChar: Math.round(med * 1000) / 1000,
      tooShort: ok.filter((r) => r.chars > 8 && r.seconds > 0 && r.seconds / r.chars < med * 0.35).length,
      tooLong: ok.filter((r) => r.chars > 8 && r.seconds / r.chars > med * 2.5).length,
      sameAudioDifferentText: sharedAudio.length,
    },
    failures: rows.filter((r) => r.status !== 200 && r.status !== 206).slice(0, 100),
    suspicious: ok.filter((r) => r.chars > 8 && r.seconds > 0 && (r.seconds / r.chars < med * 0.35 || r.seconds / r.chars > med * 2.5)).slice(0, 100),
    sharedAudio: sharedAudio.slice(0, 30).map((g) => g.map((x) => ({ url: x.url, text: (x.texts[0] || "").slice(0, 50) }))),
    rows,
  };
  fs.writeFileSync(path.join(OUT, "audio-check-licensed.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.summary, null, 1));
}

(MODE === "anon" ? anon() : licensed()).catch((e) => { console.error(e); process.exit(1); });
