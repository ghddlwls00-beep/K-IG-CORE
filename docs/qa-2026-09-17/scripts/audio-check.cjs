#!/usr/bin/env node
/**
 * Phase 4 — every lesson's own recording, fetched WITH the LIFE licence cookie
 * (inside the audit profile, so the httpOnly session cookie is sent), READ-ONLY:
 * a 2-byte Range GET per file.
 *
 * Source of truth: `audio[].src` in each content/lessons/<course>/<id>.json that
 * validRoutes serves. Expect 206/200 and an audio content-type. Also fetches the
 * same list WITHOUT credentials from Node to confirm paid files answer 401/403.
 *
 *   node audio-check.cjs      (do not run while the sweep uses the profile)
 * Output: out/audio-check.json
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const REPO = path.resolve(__dirname, "../../..");
const BASE = "https://k-ig-core.vercel.app";
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE = new Set([...freeBlock.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));

const files = [];
for (const [course, ids] of Object.entries(routes)) {
  for (const id of ids) {
    const f = path.join(REPO, "content/lessons", course, `${id}.json`);
    if (!fs.existsSync(f)) { files.push({ course, id, src: null, note: "no lesson file" }); continue; }
    const d = JSON.parse(fs.readFileSync(f, "utf8"));
    const srcs = (d.audio || []).map((a) => a.src).filter(Boolean);
    if (!srcs.length) files.push({ course, id, src: null, note: "no audio in data" });
    for (const src of srcs) files.push({ course, id, src, free: FREE.has(id) });
  }
}

(async () => {
  const withAudio = files.filter((f) => f.src);
  const unique = [...new Set(withAudio.map((f) => f.src))];
  // 1. licensed, inside the browser profile
  const browser = await launch({ port: 9372, profile: path.join(os.tmpdir(), "kig-audit-licensed-profile") });
  const tab = await Tab.open(browser.port);
  await tab.send("Page.navigate", { url: `${BASE}/reading/pr100` });
  for (let i = 0; i < 150; i++) { if (await tab.eval(`document.readyState === 'complete' && document.cookie !== undefined`).catch(() => false)) break; await sleep(200); }
  await sleep(4000); // licence verification sets/refreshes the session cookie
  const licensed = {};
  for (let start = 0; start < unique.length; start += 150) {
    const part = await tab.eval(`(async () => {
    const list = ${JSON.stringify(unique.slice(start, start + 150))};
    const out = {};
    let i = 0;
    async function worker() { for (;;) { const k = i++; if (k >= list.length) return; const u = list[k];
      try { const r = await fetch(u, { headers: { Range: 'bytes=0-1' }, credentials: 'include', cache: 'no-store' }); out[u] = [r.status, r.headers.get('content-type')]; await r.arrayBuffer(); } catch (e) { out[u] = [-1, String(e)]; } } }
    await Promise.all(Array.from({ length: 6 }, worker));
    return out;
  })()`);
    Object.assign(licensed, part);
    console.log(`  licensed ${Math.min(start + 150, unique.length)}/${unique.length}`);
  }
  await tab.close();
  browser.proc.kill();
  // 2. anonymous, from Node
  const anon = {};
  let j = 0;
  async function w() { for (;;) { const k = j++; if (k >= unique.length) return; const u = unique[k]; try { const r = await fetch(BASE + u, { headers: { Range: "bytes=0-1" } }); anon[u] = r.status; await r.arrayBuffer(); } catch { anon[u] = -1; } } }
  await Promise.all(Array.from({ length: 6 }, w));

  const rows = withAudio.map((f) => ({ ...f, licensed: licensed[f.src], anonymous: anon[f.src] }));
  const okLicensed = rows.filter((r) => r.licensed && (r.licensed[0] === 206 || r.licensed[0] === 200) && /audio|mpeg|octet/.test(r.licensed[1] || ""));
  const badLicensed = rows.filter((r) => !okLicensed.includes(r));
  const anonLeak = rows.filter((r) => !r.free && (r.anonymous === 200 || r.anonymous === 206));
  const anonFreeBlocked = rows.filter((r) => r.free && !(r.anonymous === 200 || r.anonymous === 206));
  fs.writeFileSync(path.join(__dirname, "../out/audio-check.json"), JSON.stringify({ at: new Date().toISOString(), lessonsWithoutAudio: files.filter((f) => !f.src), rows }, null, 1));
  console.log(`lesson audio refs ${rows.length} (unique files ${unique.length}); lessons with no audio in data ${files.filter((f) => !f.src).length}`);
  console.log(`licensed OK ${okLicensed.length}, licensed NOT OK ${badLicensed.length}`);
  for (const b of badLicensed.slice(0, 20)) console.log("  bad", b.course, b.id, b.src, JSON.stringify(b.licensed));
  console.log(`anonymous: paid files served without licence ${anonLeak.length}; free files blocked ${anonFreeBlocked.length}`);
  for (const b of anonLeak.slice(0, 10)) console.log("  leak", b.src, b.anonymous);
  const byStatus = {};
  for (const r of rows) byStatus[`${r.free ? "free" : "paid"} anon ${r.anonymous}`] = (byStatus[`${r.free ? "free" : "paid"} anon ${r.anonymous}`] || 0) + 1;
  console.log(byStatus);
})();
