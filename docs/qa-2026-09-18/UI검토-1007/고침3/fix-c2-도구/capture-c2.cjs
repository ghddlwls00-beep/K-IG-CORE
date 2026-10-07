#!/usr/bin/env node
/**
 * UI검토-1007 고침3 fix-c2 (이름 · 목록) — 전 · 뒤 사진과 화면 글 몇 개.
 *   전 = 운영(https://k-ig-core.vercel.app) · 뒤 = 로컬 dev 서버(이 작업 트리).
 *   이용권 없는 빈 프로필(KIG_PROFILE_SOURCE = 빈 폴더) · 브라우저 하나(포트 9973) · 누르는 것: 장 펼치기 · 검색 열기 · 검색어 '발음'.
 *   진도 · 이용권 쓰기 0(이용권 없음). 앱 · 도구 파일은 읽기만.
 *
 *   node capture-c2.cjs --side before|after [--base http://localhost:3382] [--theme light,dark] [--vp phone,desktop]
 *
 * 나오는 것(git 밖): docs/qa-2026-09-18/out/ui-1007/c-fix-c2/<before|after>/<밝음|어둠>/<phone|desktop>/<쪽>-<상태>.jpg · facts.jsonl
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SIDE = arg("--side", "after");
const BASE = arg("--base", SIDE === "before" ? "https://k-ig-core.vercel.app" : "http://localhost:3382");
const THEMES = arg("--theme", "light,dark").split(",");
const VPS = arg("--vp", "phone,desktop").split(",");
const PORT = Number(arg("--port", 9973));

const empty = path.join(os.tmpdir(), "fixc2-empty-profile-src");
fs.mkdirSync(empty, { recursive: true });
process.env.KIG_PROFILE_SOURCE = empty;
process.env.KIG_CLONE_PREFIX = "kig-fixc2-free-";
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const ROOT = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/c-fix-c2", SIDE);
const FACTS = path.join(ROOT, "facts.jsonl");
const THEME_KO = { light: "밝음", dark: "어둠" };
const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};
const LISTS = ["/student", "/adult", "/passoff-grammar", "/ld", "/reading", "/phonics", "/grammar1", "/grammar2"];
const slug = (p) => p.replace(/^\//, "").replace(/[/?=&]/g, "_");

async function setView(tab, vp, theme) {
  const v = VIEW[vp];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
}
async function shot(tab, file, { fullPage = false } = {}) {
  const params = { format: "jpeg", quality: 72 };
  if (fullPage) {
    const m = await tab.send("Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 4000), scale: 1 };
    params.captureBeyondViewport = true;
  }
  const s = await tab.send("Page.captureScreenshot", params);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(s.data, "base64"));
  return path.relative(REPO, file).replace(/\\/g, "/");
}
const fact = (o) => fs.appendFileSync(FACTS, JSON.stringify({ side: SIDE, at: new Date().toISOString(), ...o }) + "\n");
const go = async (tab, p) => {
  await tab.send("Page.navigate", { url: "about:blank" }).catch(() => {});
  await H.sleep(200);
  await tab.send("Page.navigate", { url: BASE + p });
  const ok = await H.waitFor(tab, `document.readyState === "complete" && !!document.querySelector("main")`, 30000);
  if (!ok) throw new Error(`${BASE + p} did not render a <main> in 30 s`);
  await H.sleep(1800);
};
const TEXT = (sel) => `(() => [...document.querySelectorAll(${JSON.stringify(sel)})].map((e) => (e.innerText || '').replace(/\\s+/g, ' ').trim()).filter(Boolean))()`;

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const browser = await H.startBrowser("capture", PORT, { fresh: true });
  const tab = await H.Tab.open(PORT);
  await tab.send("Page.enable").catch(() => {});
  try {
    for (const theme of THEMES) for (const vp of VPS) {
      await setView(tab, vp, theme);
      const dir = path.join(ROOT, THEME_KO[theme], vp);
      // 1. course lists — every section head (closed), then the first section open
      for (const p of LISTS) {
        await go(tab, p);
        const heads = await tab.eval(TEXT("main button[aria-expanded] > span.flex-col > span:first-child"));
        const meta = await tab.eval(`(document.querySelector('main header p') || {}).innerText || ''`);
        const top = await shot(tab, path.join(dir, `${slug(p)}-list.jpg`), { fullPage: vp === "desktop" });
        await H.click(tab, `document.querySelector('main button[aria-expanded="false"]')`, { settle: 900 });
        const rows = await tab.eval(`[...document.querySelectorAll('main li[data-lesson-id]')].slice(0, 3).map((li) => li.innerText.replace(/\\s+/g, ' ').trim())`);
        const note = await tab.eval(TEXT("main button[aria-expanded='true'] > span.flex-col > span:nth-child(2)"));
        await tab.eval(`(() => { const b = document.querySelector('main button[aria-expanded="true"]'); if (b) window.scrollTo(0, Math.max(0, b.getBoundingClientRect().top + scrollY - 70)); })()`);
        await H.sleep(300);
        const open = await shot(tab, path.join(dir, `${slug(p)}-open.jpg`));
        const free = await tab.eval(TEXT("section[aria-label='무료 체험'] a"));
        fact({ theme, vp, page: p, kind: "list", meta, heads, firstRows: rows, firstNote: note, freeButtons: free, shots: [top, open] });
      }
      // 2. the lock screen (a visitor on a paid STUDENT · ADULT lesson)
      for (const p of ["/adult/a2-1", "/student/s2-1"]) {
        await go(tab, p);
        const h = await tab.eval(`(() => { const h = document.querySelector('main h1'); return { h1: h ? h.innerText : null, line: h && h.nextElementSibling ? h.nextElementSibling.innerText : null }; })()`);
        const free = await tab.eval(TEXT("[data-kig-paywall] a[href^='/']"));
        fact({ theme, vp, page: p, kind: "lock", ...h, free, shots: [await shot(tab, path.join(dir, `${slug(p)}-lock.jpg`))] });
      }
      // 3. lesson heads and end bars
      for (const p of ["/student/s1-1", "/adult/a1-2", "/passoff-grammar/pg01-1", "/grammar1/gh1-006", "/ld/d001-1", "/reading/pr001-1"]) {
        await go(tab, p);
        const h = await tab.eval(`(() => { const h = document.querySelector('main h1'); const sib = []; let n = h && h.nextElementSibling; while (n) { sib.push(n.innerText); n = n.nextElementSibling; } return { h1: h ? h.innerText : null, under: sib }; })()`);
        const head = await shot(tab, path.join(dir, `${slug(p)}-head.jpg`));
        const end = await tab.eval(`[...document.querySelectorAll('main a[href]')].filter((a) => /이전 강의|다음 강의/.test((a.innerText || '') + (a.getAttribute('aria-label') || ''))).map((a) => ({ href: new URL(a.href).pathname, text: (a.innerText || '').replace(/\\s+/g, ' ').trim(), aria: a.getAttribute('aria-label') }))`);
        await tab.eval(`window.scrollTo(0, document.documentElement.scrollHeight)`);
        await H.sleep(500);
        const endShot = await shot(tab, path.join(dir, `${slug(p)}-end.jpg`));
        fact({ theme, vp, page: p, kind: "lesson", ...h, endBar: end, shots: [head, endShot] });
      }
      // 4. search — empty on /student, then '발음'
      await go(tab, "/student");
      await H.click(tab, `document.querySelector('button[aria-label="검색"]')`, { settle: 1500 });
      await H.waitFor(tab, `document.querySelectorAll('[role=dialog] li').length > 0`, 15000);
      const r0 = await tab.eval(`[...document.querySelectorAll('[role=dialog] li')].slice(0, 3).map((li) => li.innerText.replace(/\\s+/g, ' · ').trim())`);
      const s0 = await shot(tab, path.join(dir, `search-empty.jpg`));
      await tab.send("Input.insertText", { text: "발음" });
      await H.sleep(800);
      const r1 = await tab.eval(`[...document.querySelectorAll('[role=dialog] li')].length`);
      const s1 = await shot(tab, path.join(dir, `search-balum.jpg`));
      fact({ theme, vp, page: "/student (search)", kind: "search", emptyTop3: r0, balumResults: r1, shots: [s0, s1] });
      console.log(`${SIDE} ${theme} ${vp} done`);
    }
  } finally {
    try { tab.close && tab.close(); } catch {}
    try { browser.proc.kill(); } catch {}
  }
})().catch((e) => { console.error(e); process.exit(1); });
