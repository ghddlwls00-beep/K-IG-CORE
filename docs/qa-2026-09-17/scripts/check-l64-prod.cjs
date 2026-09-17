#!/usr/bin/env node
/**
 * After deploying the L-64 LISTENING fix: does production show and play the changed rows?
 *
 * Changed rows = content/ld_english_scripts.json in the working tree vs --base <commit>
 * (the commit before apply-l64.cjs). For every changed round, both pages
 * (/ld/<id> and /ld/<id>-1) are expected in the licensed sweep output
 * (sweep-licensed.cjs --ids … --suffix <suffix>):
 *   - 2 visits each (desktop, mobile), loaded, no recorded problems, no paywall
 *   - STEP 5 (대조) desktop text contains every changed row's new English and Korean
 *   - replaced English that is not part of the new text is gone
 * Then, inside the LIFE-licence audit profile, a 2-byte Range GET of the speech clip of
 * every changed row's English (unifiedSpeechPath) — expect 206/200 audio; and the same
 * without a cookie from Node — expect 403 (paid).
 *
 *   node check-l64-prod.cjs --base 1dd14cb --suffix -l64
 * Exit 1 on any failure. Do not run while a sweep uses the profile.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const BASE_URL = "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BASE = arg("--base", null);
const SUFFIX = arg("--suffix", "-l64");
if (!BASE) { console.error("--base <commit> required"); process.exit(2); }
const speech = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const flat = (s) => (s || "").replace(/[^A-Za-z0-9가-힣]+/g, "");

const before = JSON.parse(execFileSync("git", ["show", `${BASE}:content/ld_english_scripts.json`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 }));
const after = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const changed = [];
for (const id of Object.keys(after)) {
  after[id].forEach((r, i) => {
    const o = before[id][i];
    if (o.en !== r.en || o.ko !== r.ko) changed.push({ id, n: r.n, en: r.en, ko: r.ko, oldEn: o.en });
  });
}
const ids = [...new Set(changed.map((c) => c.id))];
console.log(`changed rows: ${changed.length} in ${ids.length} rounds`);
if (process.argv.includes("--list-ids")) { console.log(ids.flatMap((id) => [id, `${id}-1`]).join(",")); process.exit(0); }

let bad = 0;
const lines = fs.readFileSync(path.join(OUT, `sweep-licensed${SUFFIX}.jsonl`), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const pageResults = [];
for (const id of ids) {
  for (const page of [id, `${id}-1`]) {
    const visits = lines.filter((r) => r.course === "ld" && r.id === page);
    const problems = visits.flatMap((v) => [
      ...(v.loaded && v.loaded.rendered ? [] : [`${v.viewport}:not loaded`]),
      ...v.rows.flatMap((r) => (r.problems || []).map((p) => `${v.viewport}:${r.step}:${typeof p === "string" ? p : JSON.stringify(p)}`)),
      ...v.rows.filter((r) => r.snap && (r.snap.paywall || r.snap.errorScreen || r.snap.overflowX)).map((r) => `${v.viewport}:${r.step}:paywall/error/overflow`),
      ...((v.audio && v.audio.bad) || []).map((b) => `${v.viewport}:audio ${JSON.stringify(b)}`),
    ]);
    const file = path.join(OUT, `rendered${SUFFIX}`, "ld", `${page}.json`);
    const steps = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    const step5 = flat((steps.find((s) => /STEP 5/.test(s.step)) || {}).text);
    const rows = changed.filter((c) => c.id === id);
    const notShown = rows.filter((c) => !step5.includes(flat(c.en)) || !step5.includes(flat(c.ko))).map((c) => `#${c.n}`);
    const oldStill = rows.filter((c) => c.oldEn !== c.en && !flat(c.en).includes(flat(c.oldEn)) && step5.includes(flat(c.oldEn))).map((c) => `#${c.n}`);
    const ok = visits.length === 2 && step5.length > 0 && problems.length === 0 && notShown.length === 0 && oldStill.length === 0;
    if (!ok) bad++;
    pageResults.push({ page, visits: visits.length, step5Saved: step5.length > 0, rowsChecked: rows.length, notShown, oldStill, problems, ok });
  }
}
const pagesOk = pageResults.filter((p) => p.ok).length;
console.log(`pages: ${pagesOk}/${pageResults.length} ok`);
for (const p of pageResults.filter((x) => !x.ok)) console.log("  FAIL", JSON.stringify(p));

(async () => {
  const urls = [...new Set(changed.map((c) => speech.unifiedSpeechPath(c.en)))];
  const browser = await launch({ port: 9374, profile: path.join(os.tmpdir(), "kig-audit-licensed-profile") });
  let licensed;
  try {
    const tab = await Tab.open(browser.port);
    await tab.send("Page.navigate", { url: `${BASE_URL}/ld/${ids[0]}` });
    for (let i = 0; i < 150; i++) { if (await tab.eval(`document.readyState === 'complete'`).catch(() => false)) break; await sleep(200); }
    await sleep(5000);
    licensed = await tab.eval(`(async () => {
      const out = {};
      for (const u of ${JSON.stringify(urls)}) {
        try { const r = await fetch(u, { headers: { Range: 'bytes=0-1' }, credentials: 'include', cache: 'no-store' }); out[u] = [r.status, r.headers.get('content-type')]; await r.arrayBuffer(); }
        catch (e) { out[u] = [-1, String(e)]; }
      }
      return out;
    })()`);
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  let audioOk = 0, anon403 = 0;
  const audioBad = [];
  for (const u of urls) {
    const [status, type] = licensed[u] || [0, null];
    if ((status === 206 || status === 200) && /audio|mpeg|octet/.test(type || "")) audioOk++;
    else audioBad.push([u, status, type]);
    const r = await fetch(BASE_URL + u, { headers: { Range: "bytes=0-1" } });
    await r.arrayBuffer();
    if (r.status === 403) anon403++;
  }
  if (audioBad.length) bad++;
  const summary = { at: new Date().toISOString(), base: BASE, changedRows: changed.length, rounds: ids.length, pages: `${pagesOk}/${pageResults.length}`, clipsLicensedOk: `${audioOk}/${urls.length}`, clipsAnonymous403: `${anon403}/${urls.length}`, audioBad };
  console.log(summary);
  fs.writeFileSync(path.join(OUT, "l64-prod.json"), JSON.stringify({ summary, pageResults, changed }, null, 1));
  console.log(bad ? `FAIL ${bad}` : "PASS");
  process.exit(bad ? 1 : 0);
})();
