#!/usr/bin/env node
/**
 * 2026-09-27 — 사장님 "모바일로 보니깐 겁나 불편" · "학습법들이 이게 최선이야?"(CNN 제외).
 * 고치기 전 기준: 휴대폰 화면을 학습자가 보는 그대로 한 화면씩 찍고, 화면마다 숫자를 잰다. 고친 것 없음 — 누르는 것은 Step 탭 · ☰ · 검색 · 이용권 창 열기뿐.
 * 이용권 브라우저(평생 — lib/profile.cjs 의 %USERPROFILE%\KIG-audit-licensed-profile 사본). STUDENT 진도 서버 쓰기는 막음. 이용권 값은 읽지도 적지도 않음.
 *
 *   node capture-mobile-0927.cjs [--only home,lists,lessons,states] [--vp phone,small,desktop] [--screens 4] [--port 9585] [--tag before]
 *   로그아웃 쪽(첫 쪽 · 잠김 화면 · 이용권 창):
 *     $env:KIG_PROFILE_SOURCE = "<빈 폴더>"; $env:KIG_CLONE_PREFIX = "kig-mob-free-"; node capture-mobile-0927.cjs --free
 *
 * 나오는 것(out/ — git 에 없음): out/mobile-0927/<tag>/<vp>/<쪽>/<상태>-<n>.jpg · out/mobile-0927/<tag>/metrics.jsonl
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const FREE = process.argv.includes("--free");
const TAG = arg("--tag", FREE ? "before-free" : "before");
const ONLY = new Set(arg("--only", FREE ? "home,lists,paywall,states" : "home,lists,lessons,states").split(","));
const VPS = arg("--vp", "phone,small,desktop").split(",");
const MAX_SCREENS = Number(arg("--screens", 4));
// 2026-09-27 사장님 "데스크탑도 사실 보면 너무 어지러워" — 데스크탑도 여러 화면을 찍을 때 --all-screens(기본은 휴대폰만 여러 화면)
const ALL_SCREENS = process.argv.includes("--all-screens");
const ROOT = path.join(H.OUT, "mobile-0927", TAG);
const METRICS = path.join(ROOT, `metrics-${VPS.join("-")}.jsonl`); // 화면 크기마다 따로(프로세스 여럿이 한 파일에 같이 쓰지 않게)

const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },   // 아이폰 12 ~ 15
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },   // 갤럭시 S 계열
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};
// 과정마다 첫 강의(무료) · 60% 자리 강의(유료) · 대본 쪽(있는 과정만)
const LESSONS = arg("--pages", "") ? arg("--pages", "").split(",") : [
  "/student/s1-1", "/student/s11-4",
  "/phonics/mv1-01", "/phonics/mv3-38",
  "/grammar1/gh1-006", "/grammar1/gh1-074", "/grammar1/gh1-006-1",
  "/grammar2/gh2-007", "/grammar2/gh2-033", "/grammar2/gh2-007-1",
  "/ld/d001", "/ld/d166", "/ld/d001-1",
  "/reading/pr001", "/reading/pr154", "/reading/pr001-1",
];
const LISTS = ["/student", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading"];

const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));
const rec = (r) => { fs.mkdirSync(ROOT, { recursive: true }); fs.appendFileSync(METRICS, JSON.stringify({ at: new Date().toISOString(), tag: TAG, ...r }) + "\n"); };

async function setView(tab, vp) {
  const v = VIEW[vp];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}

async function shot(tab, file) {
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

// 화면에서 잰 것 — 학습자가 손가락으로 쓰기 어려운 것 · 너무 작은 글 · 아이폰이 확대해 버리는 입력 칸(16px 미만) · 늘 떠 있는 것 · 옆으로 밀리는 것
const MEASURE = `(() => {
  const vis = (el) => { if (!(el.offsetParent || el.getClientRects().length)) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity || '1') > 0.05; };
  const main = document.querySelector('main') || document.body;
  const W = innerWidth, VH = innerHeight, sy = scrollY;
  const label = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 50);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) }; };
  const inter = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary, [tabindex]:not([tabindex="-1"])')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const small44 = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const small24 = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; });
  const leafText = [...main.querySelectorAll('*')].filter((el) => el.children.length === 0 && (el.innerText || '').trim().length > 0).filter(vis);
  const fs = (el) => parseFloat(getComputedStyle(el).fontSize);
  const tiny = leafText.filter((el) => fs(el) < 12);
  const under14 = leafText.filter((el) => fs(el) < 14);
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select')].filter(vis);
  const zoomFields = fields.filter((el) => fs(el) < 16);
  const fixed = [...document.querySelectorAll('body *')].filter((el) => { const p = getComputedStyle(el).position; return (p === 'fixed' || p === 'sticky') && vis(el); }).map((el) => ({ pos: getComputedStyle(el).position, ...box(el), text: label(el) })).filter((f) => f.h > 0).slice(0, 12);
  const hscroll = [...main.querySelectorAll('*')].filter(vis).filter((el) => { const cs = getComputedStyle(el); return /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2; }).map((el) => ({ ...box(el), scrollW: el.scrollWidth, text: label(el) })).slice(0, 8);
  const stepBtns = [...main.querySelectorAll('button')].filter(vis).filter((b) => /\\bStep\\s*\\d+\\b/i.test(b.textContent || ''));
  const stepRows = [...new Set(stepBtns.map((b) => Math.round(b.getBoundingClientRect().top)))].length;
  const tabBar = stepBtns.length ? (() => { let p = stepBtns[0].parentElement; while (p && p !== main && !stepBtns.every((b) => p.contains(b))) p = p.parentElement; return p ? box(p) : null; })() : null;
  const h1 = document.querySelector('h1');
  const players = [...document.querySelectorAll('main audio, main [data-audio-player], main [aria-label*="재생"], main [aria-label*="플레이어"]')].filter(vis).map(box).slice(0, 3);
  return {
    url: location.pathname, vw: W, vh: VH, scrollY: Math.round(sy),
    docHeight: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / VH).toFixed(1),
    overflowX: document.documentElement.scrollWidth > W + 1,
    h1: h1 ? { text: h1.innerText.trim().slice(0, 60), ...box(h1), fontPx: fs(h1) } : null,
    stepTabs: { count: stepBtns.length, rows: stepRows, bar: tabBar, labels: stepBtns.map((b) => ({ text: (b.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40), ...box(b), current: b.getAttribute('aria-selected') || b.getAttribute('aria-current') || b.getAttribute('aria-pressed') || null })) },
    interactive: inter.length,
    small44: { count: small44.length, samples: small44.slice(0, 25).map((el) => ({ text: label(el), ...box(el) })) },
    small24: { count: small24.length, samples: small24.slice(0, 12).map((el) => ({ text: label(el), ...box(el) })) },
    text: { leaves: leafText.length, under12: tiny.length, under14: under14.length, tinySamples: tiny.slice(0, 15).map((el) => ({ text: (el.innerText || '').trim().slice(0, 40), px: fs(el), y: box(el).y })) },
    fields: fields.map((el) => ({ tag: el.tagName, type: el.type || null, px: fs(el), text: label(el), ...box(el) })).slice(0, 12), zoomFields: zoomFields.length,
    fixedOrSticky: fixed, hscroll, players,
  };
})()`;

async function screens(tab, dir, state, startY, n) {
  const files = [];
  const vh = await tab.eval("innerHeight");
  const doc = await tab.eval("document.documentElement.scrollHeight");
  for (let i = 0; i < n; i++) {
    const y = startY + i * vh;
    if (i > 0 && y >= doc - 4) break;
    await tab.eval(`window.scrollTo(0, ${y})`);
    await H.sleep(280);
    files.push(await shot(tab, path.join(ROOT, dir, `${state}-${i + 1}.jpg`)));
  }
  return files;
}

async function stopSound(tab) { await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {}); }

async function capturePage(tab, vp, p, { stepsToo = false, n = MAX_SCREENS } = {}) {
  const dir = path.join(vp, slug(p));
  const l = await H.load(tab, p, { marker: null, settle: 900 });
  if (stepsToo) await H.waitFor(tab, `[...document.querySelectorAll('main button')].some((b) => /\\bStep\\s*\\d+\\b/i.test(b.textContent || ''))`, 20000);
  await H.sleep(600);
  await stopSound(tab);
  const text = await tab.eval(`((document.querySelector('main') || document.body).innerText || '')`).catch(() => "");
  const paywalled = H.PAYWALL_RE.test(text);
  const m0 = await tab.eval(MEASURE).catch((e) => ({ error: e.message }));
  const nFirst = (vp === "phone" || ALL_SCREENS) ? n : 1;
  const f0 = await screens(tab, dir, "s1-open", 0, nFirst);
  rec({ vp, page: p, state: "open", loaded: l.rendered, paywalled, metrics: m0, files: f0 });
  if (!stepsToo || paywalled) return;
  const steps = await tab.eval(`[...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => { const m = (b.textContent || '').match(/\\bStep\\s*(\\d+)\\b/i); return m ? +m[1] : null; }).filter(Boolean)`).catch(() => []);
  const uniq = [...new Set(steps)].sort((a, b) => a - b);
  for (const k of uniq) {
    const c = await H.click(tab, `[...document.querySelectorAll('main button')].filter((b) => b.offsetParent).find((b) => { const m = (b.textContent || '').match(/\\bStep\\s*(\\d+)\\b/i); return m && +m[1] === ${k}; })`, { settle: 900 });
    await stopSound(tab);
    const m = await tab.eval(MEASURE).catch((e) => ({ error: e.message }));
    const barTop = m && m.stepTabs && m.stepTabs.bar ? Math.max(0, m.stepTabs.bar.y - 8) : 0;
    const files = await screens(tab, dir, `step${k}`, barTop, (vp === "phone" || ALL_SCREENS) ? n : 1);
    const mm = await tab.eval(`({ docHeight: document.documentElement.scrollHeight, vh: innerHeight })`).catch(() => null); // 찍은 뒤 문서 높이(펼쳐진 것 포함)
    rec({ vp, page: p, state: `step${k}`, clicked: c.ok, clickCovered: c.covered || false, coveredBy: c.coveredBy || null, metrics: m, afterDocHeight: mm && mm.docHeight, stepStartY: barTop, stepScreens: mm ? +((mm.docHeight - barTop) / mm.vh).toFixed(1) : null, files });
  }
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const browser = await H.startBrowser(`mob0927-${FREE ? "free-" : ""}${VPS.join("-")}`, Number(arg("--port", FREE ? 9586 : 9585)), { fresh: true });
  let pages = 0;
  try {
    const tab = await H.openTab(browser);
    // STUDENT 진도 서버 쓰기 막기(사장님 이용권 기록 보호) — 읽기(GET)만 통과
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => { if (msg.method === "Fetch.requestPaused") { const q = msg.params; if (!/^(GET|HEAD|OPTIONS)$/.test(q.request.method)) tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); else tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {}); return; } return orig(msg); };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/progress/student*", requestStage: "Request" }] });

    // 이용권이 살아 있는지(이용권 판) · 없는지(--free) 먼저 — 어긋나면 멈춤
    await setView(tab, "phone");
    await H.load(tab, "/ld/d010", { marker: null, settle: 900 });
    const locked = H.PAYWALL_RE.test(await tab.eval(`((document.querySelector('main') || document.body).innerText || '')`).catch(() => ""));
    if (FREE ? !locked : locked) { console.log(`멈춤: ${FREE ? "--free 인데 유료가 열림" : "이용권 판인데 유료가 잠김"}`); process.exitCode = 3; return; }

    for (const vp of VPS) {
      await setView(tab, vp);
      if (ONLY.has("home")) { await capturePage(tab, vp, "/"); pages++; }
      if (ONLY.has("lists")) for (const p of LISTS) { await capturePage(tab, vp, p); pages++; }
      if (ONLY.has("lessons")) for (const p of LESSONS) { await capturePage(tab, vp, p, { stepsToo: true }); pages++; console.log(`${vp} ${p}`); }
      if (ONLY.has("paywall")) for (const p of ["/ld/d166", "/reading/pr154", "/student/s11-4"]) { await capturePage(tab, vp, p); pages++; }
      if (ONLY.has("states") && vp !== "desktop") {
        // ☰ 메뉴 · 검색 창 · (로그아웃이면) 이용권 창 — 열어서 한 화면
        await H.load(tab, "/reading", { marker: null, settle: 900 });
        const menu = await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 800 });
        rec({ vp, page: "/reading", state: "menu-open", clicked: menu.ok, metrics: await tab.eval(MEASURE).catch(() => null), files: [await shot(tab, path.join(ROOT, vp, "reading", "menu-open-1.jpg"))] });
        await H.load(tab, "/reading", { marker: null, settle: 900 });
        const s = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
        rec({ vp, page: "/reading", state: "search-open", clicked: s.ok, metrics: await tab.eval(MEASURE).catch(() => null), files: [await shot(tab, path.join(ROOT, vp, "reading", "search-open-1.jpg"))] });
        if (FREE) {
          // 첫 쪽 머리에는 이용권 단추가 없음(첫 판 clicked false) — 과정 목록 머리의 '이용권 등록' 으로 엶. 코드는 넣지 않음.
          await H.load(tab, "/reading", { marker: null, settle: 900 });
          const lb = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => /이용권/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
          rec({ vp, page: "/reading", state: "license-modal", clicked: lb.ok, text: lb.text || null, metrics: await tab.eval(MEASURE).catch(() => null), files: [await shot(tab, path.join(ROOT, vp, "reading", "license-modal-1.jpg"))] });
        }
      }
    }
    await tab.close();
  } finally {
    browser.proc.kill();
    console.log(`끝 · 쪽 ${pages} → ${ROOT}`);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
