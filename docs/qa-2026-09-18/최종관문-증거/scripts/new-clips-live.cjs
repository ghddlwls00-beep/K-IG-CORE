// 관문 15 · 재점검 명령서 ① 방식 — 관문 중 배포 셋에서 새로 만든 클립(이 컴퓨터 public/audio/azure-ava/v1 에 09-25 02:00 뒤 생긴 파일 = R2 에 올린 75 + 56)을
// 운영에서 이용권 쪽 안에서 받아(쿠키 값은 안 읽음 — 브라우저가 붙임) 상태 200 · audio/mpeg · 바이트 수가 이 컴퓨터 파일과 같은지. 하나라도 다르면 exit 1.
//   KIG_PROFILE_SOURCE · KIG_CLONE_PREFIX 와 함께: node new-clips-live.cjs [--since 2026-09-25T02:00:00] [--break]
//   --break: 첫 파일의 기대 바이트를 1 늘려 '다름' 을 잡는지(도구가 떨어질 수 있다는 증거).
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SINCE = new Date(arg("--since", "2026-09-25T02:00:00+09:00"));
const BREAK = process.argv.includes("--break");
const DIR = path.join(REPO, "public/audio/azure-ava/v1");
const T = fs.readdirSync(DIR).filter((f) => f.endsWith(".mp3")).map((f) => ({ f, st: fs.statSync(path.join(DIR, f)) }))
  .filter((x) => x.st.mtime >= SINCE).sort((a, b) => a.st.mtime - b.st.mtime)
  .map((x) => ({ url: `/audio/azure-ava/v1/${x.f}`, localBytes: x.st.size, made: x.st.mtime.toISOString() }));
if (BREAK && T.length) T[0].localBytes += 1;
console.log(`새 클립(${SINCE.toISOString()} 뒤 생김) ${T.length}${BREAK ? " · [일부러 깸] 첫 파일 기대 바이트 +1" : ""}`);
(async () => {
  const browser = await H.startBrowser("new-clips-live", Number(arg("--port", 9662)));
  try {
    const tab = await H.openTab(browser);
    const loaded = await H.load(tab, "/ld/d192", { marker: null });
    const res = await tab.eval(`(async () => { const urls = ${JSON.stringify(T.map((t) => t.url))}; const out = [];
      for (let i = 0; i < urls.length; i += 6) out.push(...await Promise.all(urls.slice(i, i + 6).map(async (u) => {
        try { const r = await fetch(u, { cache: "no-store" }); const b = await r.arrayBuffer(); return { u, status: r.status, type: r.headers.get("content-type") || "", bytes: b.byteLength }; }
        catch (e) { return { u, status: 0, type: String(e), bytes: 0 }; } })));
      return out; })()`);
    let same = 0; const bad = [];
    for (const t of T) {
      const r = res.find((x) => x.u === t.url) || {};
      if (r.status === 200 && /audio\/mpeg/.test(r.type) && r.bytes === t.localBytes) same++;
      else bad.push(`${t.url} 운영 ${r.status} ${String(r.type).split(";")[0]} ${r.bytes}B · 로컬 ${t.localBytes}B (만든 때 ${t.made})`);
    }
    for (const b of bad.slice(0, 20)) console.log(`  ✘ ${b}`);
    const byHour = {};
    for (const t of T) { const h = new Date(t.made).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 13); byHour[h] = (byHour[h] || 0) + 1; }
    console.log(`(쪽 ${loaded.href}) 만든 때(한국 시각)별 ${JSON.stringify(byHour)}`);
    console.log(`운영에서 200 · audio/mpeg · 바이트 같음 ${same} / ${T.length} · 다름 ${bad.length}`);
    fs.writeFileSync(path.join(__dirname, `new-clips-live${BREAK ? "-break" : ""}.json`), JSON.stringify({ at: new Date().toISOString(), since: SINCE.toISOString(), total: T.length, same, bad }, null, 1));
    process.exitCode = bad.length || !T.length ? 1 : 0;
  } finally { browser.proc.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
