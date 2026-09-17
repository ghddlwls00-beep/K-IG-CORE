#!/usr/bin/env node
/**
 * After deploy 886b08c: are the speech clips for the new R-64 (pr151) and R-65
 * (pr170) text served on production? READ-ONLY 2-byte Range GETs.
 *
 * Clip URL = unifiedSpeechPath(text) from src/lib/unifiedSpeech.ts (loaded as-is),
 * for every English sentence and every vocabulary card word of both passages.
 *   licensed   — fetched inside the audit profile (LIFE licence cookie sent): expect 206/200 audio/*
 *   anonymous  — fetched from Node with no cookie: expect 401/403 (paid lesson clips)
 * Exit 1 on any licensed miss.  Do not run while a sweep uses the profile.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launch, Tab, sleep } = require("../../qa-2026-09-15/scripts/verify/cdp.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const BASE = "https://k-ig-core.vercel.app";
const speech = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));

const texts = [];
for (const id of ["pr151", "pr170"]) {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
  for (const s of d.readingSentences) texts.push({ id, kind: "sentence", text: s.english });
  for (const v of d.readingVocabulary) texts.push({ id, kind: "card", text: v.word });
}
for (const t of texts) t.url = speech.unifiedSpeechPath(t.text);

(async () => {
  const browser = await launch({ port: 9373, profile: path.join(os.tmpdir(), "kig-audit-licensed-profile") });
  let licensed;
  try {
    const tab = await Tab.open(browser.port);
    await tab.send("Page.navigate", { url: `${BASE}/reading/pr151` });
    for (let i = 0; i < 150; i++) { if (await tab.eval(`document.readyState === 'complete'`).catch(() => false)) break; await sleep(200); }
    await sleep(5000); // licence verification sets/refreshes the session cookie (and may reload once)
    licensed = await tab.eval(`(async () => {
      const out = {};
      for (const u of ${JSON.stringify([...new Set(texts.map((t) => t.url))])}) {
        try { const r = await fetch(u, { headers: { Range: 'bytes=0-1' }, credentials: 'include', cache: 'no-store' }); out[u] = [r.status, r.headers.get('content-type')]; await r.arrayBuffer(); }
        catch (e) { out[u] = [-1, String(e)]; }
      }
      return out;
    })()`);
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  let miss = 0, anonOpen = 0;
  for (const t of texts) {
    const [status, type] = licensed[t.url] || [0, null];
    t.licensed = status;
    t.licensedOk = (status === 206 || status === 200) && /audio|mpeg|octet/.test(type || "");
    if (!t.licensedOk) miss++;
    const r = await fetch(BASE + t.url, { headers: { Range: "bytes=0-1" } });
    t.anonymous = r.status;
    await r.arrayBuffer();
    if (r.status === 200 || r.status === 206) anonOpen++;
  }
  const byKind = (k) => `${texts.filter((t) => t.kind === k && t.licensedOk).length}/${texts.filter((t) => t.kind === k).length}`;
  const summary = { at: new Date().toISOString(), clips: texts.length, licensedSentencesOk: byKind("sentence"), licensedCardsOk: byKind("card"), anonymousServed: anonOpen, misses: texts.filter((t) => !t.licensedOk) };
  console.log(summary);
  fs.writeFileSync(path.join(__dirname, "../out/r64-r65-audio.json"), JSON.stringify({ summary, texts }, null, 1));
  process.exit(miss ? 1 : 0);
})();
