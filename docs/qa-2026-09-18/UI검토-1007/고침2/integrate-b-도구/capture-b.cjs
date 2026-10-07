#!/usr/bin/env node
/**
 * 2026-10-07 UI · UX 한 번 더 검토(출시 앞) — 운영 사진 · 숫자 모으기. 앱 · 내용 · 기존 도구를 고치지 않는다.
 * capture-mobile-0927.cjs 의 방식(감사 이용권 사본 · 화면마다 한 화면씩 · MEASURE) + 과정 8개(ADULT · PASS-OFF 포함) + 어둠 모드.
 * 누르는 것: 단계 탭 · 장 접기/펼치기 · ☰ 메뉴 · 검색 열기 · (이용권 없는 사본) '이용권 등록' 단추로 창 열기 — 그뿐. 이용권 코드 · PIN 입력 0.
 * 네트워크: /api/ 로 가는 GET 아닌 요청은 막는다(진도 · 이용권 쓰기). 예외 둘 — 앱이 열릴 때 스스로 하는 이용권 확인(/api/license/verify · /session).
 * 막은 요청은 blocked-requests.jsonl 에 방법 + 길만 적음(본문 · 쿠키 · 토큰 없음).
 *
 *   node capture.cjs [--theme light,dark] [--vp phone,small,desktop] [--only home,lists,states,lessons,extra] [--pages /a,/b] [--redo]
 *   로그아웃 쪽: node capture.cjs --free   (KIG_PROFILE_SOURCE 빈 폴더 · 사본 이름 접두어는 스스로 맞춤)
 *
 * 나오는 것(git 밖): docs/qa-2026-09-18/out/ui-1007/<밝음|어둠>/<phone|small|desktop>/<쪽 slug>/<단계>-<n>.jpg · metrics.jsonl
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const FREE = process.argv.includes("--free");
// integrate-b (2026-10-07 고침2): 고침/integrate-도구/integrate-capture.cjs 사본.
//   바뀐 것 — 결과 폴더 out/ui-1007/after-local-b(git 밖) · 포트 9985 · 화면 390 · 360 · 1366 기본 ·
//   --free 에서도 검색 창(states) · 404(extra 중 /nope 만) · 잰 값 몇 개 더(gutter · 단계 탭 넘침 · 검색 창 덮개 · 키보드 초점).
if (FREE) {
  const empty = path.join(os.tmpdir(), "integrate1007b-empty-profile-src");
  fs.mkdirSync(empty, { recursive: true });
  process.env.KIG_PROFILE_SOURCE = empty;
  process.env.KIG_CLONE_PREFIX = "kig-integrate1007b-free-";
}
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");

const THEMES = arg("--theme", "light,dark").split(",");
const THEME_KO = { light: "밝음", dark: "어둠" };
const VPS = arg("--vp", "phone,small,desktop").split(",");
const ONLY = new Set(arg("--only", FREE ? "home,lists,states,paywall,lessons,extra" : "home,lists,states,lessons,extra").split(","));
const PORT = Number(arg("--port", 9985));
const NAME = "integrate1007b-capture-free";
const REDO = process.argv.includes("--redo");
// integrate-b: 원래 out/ui-1007(전) · out/ui-1007/after-local(1차 고침 뒤)은 건드리지 않음
const ROOT = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/after-local-b");
const METRICS = path.join(ROOT, "metrics.jsonl");
const BLOCKED = path.join(ROOT, "blocked-requests.jsonl");
const MODE = FREE ? "free" : "lic";

const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};
const LISTS = ["/student", "/adult", "/passoff-grammar", "/phonics", "/grammar1", "/grammar2", "/ld", "/reading"];
const LESSONS = arg("--pages", "") ? arg("--pages", "").split(",") : FREE ? [
  "/student/s1-1", "/adult/a1-2", "/passoff-grammar/pg01-1", "/phonics/mv1-01",
  "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001",
] : [
  "/student/s1-1", "/student/s11-4",
  "/adult/a1-2", "/adult/a6-2",
  "/passoff-grammar/pg01-1", "/passoff-grammar/pg13-1",
  "/phonics/mv1-01", "/phonics/mv3-38",
  "/grammar1/gh1-006", "/grammar1/gh1-074",
  "/grammar2/gh2-007", "/grammar2/gh2-033",
  "/ld/d001", "/ld/d001-1", "/ld/d166",
  "/reading/pr001", "/reading/pr001-1", "/reading/pr154",
];
const EXTRA = FREE ? [{ p: "/nope", slug: "nope-404" }] : [
  { p: "/passoff-grammar/review", slug: "passoff-grammar_review" },
  { p: "/passoff-grammar/review?notes=1", slug: "passoff-grammar_review_notes1" },
  { p: "/passoff-grammar/map?topic=1", slug: "passoff-grammar_map_topic1" },
  { p: "/nope", slug: "nope-404" },
];
const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[/?=&]/g, "_"));
const nShots = (vp) => (vp === "desktop" ? 2 : 4);

// ───────── 화면 안에서 재는 것 ─────────
function measureFn() {
  const vis = (el) => { if (!(el.offsetParent || el.getClientRects().length)) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity || "1") > 0.05; };
  const main = document.querySelector("main") || document.body;
  const W = innerWidth, VH = innerHeight, sy = scrollY;
  const label = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 50);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) }; };
  const fsz = (el) => parseFloat(getComputedStyle(el).fontSize);
  const srOnly = (el) => { const r = el.getBoundingClientRect(); return r.width <= 1.5 && r.height <= 1.5; };
  const inter = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary, [tabindex]:not([tabindex=\"-1\"])")].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 1.5 && r.height > 1.5; });
  const small44 = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const small44inline = small44.filter((el) => getComputedStyle(el).display === "inline");
  const leafText = [...main.querySelectorAll("*")].filter((el) => el.children.length === 0 && (el.innerText || "").trim().length > 0).filter(vis).filter((el) => !srOnly(el));
  const tiny = leafText.filter((el) => fsz(el) < 12);
  const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select")].filter(vis);
  const zoomFields = fields.filter((el) => fsz(el) < 16);
  const hscroll = [...main.querySelectorAll("*")].filter(vis).filter((el) => { const cs = getComputedStyle(el); return /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2; }).map((el) => ({ ...box(el), scrollW: el.scrollWidth, text: label(el) })).slice(0, 8);
  // 단계 탭
  let stepBtns = [...document.querySelectorAll("[data-step-tab]")].filter(vis);
  if (!stepBtns.length) stepBtns = [...main.querySelectorAll("button")].filter(vis).filter((b) => /\bStep\s*\d+\b/i.test(b.textContent || ""));
  const stepRows = [...new Set(stepBtns.map((b) => Math.round(b.getBoundingClientRect().top)))].length;
  let tabBar = null;
  if (stepBtns.length) { let p = stepBtns[0].parentElement; while (p && p !== document.body && !stepBtns.every((b) => p.contains(b))) p = p.parentElement; if (p && p.tagName === "DIV" && p.parentElement && p.parentElement.tagName === "NAV") p = p.parentElement; tabBar = p && p !== document.body ? box(p) : null; }
  const h1 = document.querySelector("h1");
  const hdr = document.querySelector("header");
  const shellBottom = tabBar ? tabBar.y + tabBar.h : h1 ? box(h1).y + box(h1).h : null;
  // 첫 학습 항목 y — 단계 탭(없으면 제목) 아래에서 처음 보이는 것(입력 칸 · 단추 · 글). 플레이어 안의 것을 뺀 값도 따로.
  const inPlayer = (el) => !!el.closest('[data-passage-player], [aria-label*="플레이어"], [aria-label*="재생"], audio, [data-audio-player]') || /^(▶\s*)?(전체 듣기|전체 재생)|^[\d.]+×$/.test((el.innerText || el.getAttribute("aria-label") || "").trim()) || !!el.closest("[role=group]") && /^[\d.]+×$/.test((el.innerText || "").trim());
  const inFrame = (el) => !!el.closest("header, nav, footer, [data-step-start]");
  const firstOf = (skipPlayer) => {
    if (shellBottom == null) return null;
    let best = null;
    for (const el of main.querySelectorAll("*")) {
      if (!vis(el) || srOnly(el)) continue;
      const tag = el.tagName;
      const isCtl = /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag) || el.getAttribute("role") === "button";
      const isText = el.children.length === 0 && (el.innerText || "").trim().length >= 2;
      if (!isCtl && !isText) continue;
      if (inFrame(el)) continue;
      if (skipPlayer && inPlayer(el)) continue;
      const b = box(el);
      if (b.y < shellBottom - 1) continue;
      if (!best || b.y < best.y) best = { y: b.y, tag, text: label(el).slice(0, 40) };
    }
    return best;
  };
  // 글자 대비(WCAG 4.5:1 · 큰 글자 3:1) — 색은 캔버스로 풀어 oklch 도 읽음 · 배경이 그림 · 그라데이션이면 건너뜀
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (s) => { if (cache.has(s)) return cache.get(s); cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; const r = [d[0], d[1], d[2], d[3] / 255]; cache.set(s, r); return r; };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let base = [255, 255, 255, 1];
    if (!layers.length || layers[layers.length - 1][3] < 0.999) base = rgba(getComputedStyle(document.documentElement).backgroundColor);
    if (base[3] < 0.999) base = [255, 255, 255, 1];
    let acc = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop() : base;
    while (layers.length) acc = over(layers.pop(), acc);
    return acc;
  };
  const low = [];
  let checked = 0, skippedBg = 0;
  for (const el of leafText.slice(0, 900)) {
    if (el.closest('[disabled], [aria-disabled="true"]')) continue;
    const cs = getComputedStyle(el);
    const bg = bgOf(el);
    if (!bg) { skippedBg++; continue; }
    const fg0 = rgba(cs.color);
    const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * parseFloat(cs.opacity || "1")], bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    checked++;
    if (ratio < need) low.push({ text: (el.innerText || "").trim().slice(0, 40), ratio: +ratio.toFixed(2), need, px, y: box(el).y });
  }
  const players = [...document.querySelectorAll('main audio, main [data-audio-player], main [aria-label*="재생"], main [aria-label*="플레이어"]')].filter(vis).map(box).slice(0, 3);
  // integrate-b: 스크롤 막대 자리(11) · 단계 탭이 막대 밖으로 나간 px(35) · 잘린 탭 글(34)
  const gutter = W - document.documentElement.clientWidth;
  let tabOut = 0; const tabClipped = [];
  if (stepBtns.length && tabBar) {
    const bl = tabBar.x, br = tabBar.x + tabBar.w;
    for (const b of stepBtns) { const r = b.getBoundingClientRect(); tabOut = Math.max(tabOut, Math.round(r.right - br), Math.round(bl - r.left)); for (const s of [b, ...b.querySelectorAll("*")]) { if (s.children.length === 0 && s.scrollWidth > s.clientWidth + 1 && getComputedStyle(s).overflow !== "visible") tabClipped.push((s.innerText || "").trim().slice(0, 30)); } }
  }
  const switches = [...document.querySelectorAll('[role="switch"]')].filter(vis).map((s) => ({ text: label(s).slice(0, 30), checked: s.getAttribute("aria-checked"), ...box(s) }));
  return {
    gutter, tabOut, tabClipped: tabClipped.slice(0, 6), switches: switches.slice(0, 6),
    url: location.pathname + location.search, vw: W, vh: VH, scrollY: Math.round(sy),
    appTheme: document.documentElement.dataset.theme || null, prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
    docHeight: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / VH).toFixed(1),
    overflowX: document.documentElement.scrollWidth > W + 1, scrollWidth: document.documentElement.scrollWidth,
    h1: h1 ? { text: h1.innerText.trim().slice(0, 60), ...box(h1), fontPx: fsz(h1) } : null,
    headerBox: hdr ? box(hdr) : null,
    stepTabs: { count: stepBtns.length, rows: stepRows, bar: tabBar, labels: stepBtns.map((b) => ({ text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40), ...box(b), current: b.getAttribute("aria-pressed") })) },
    shellBottom,
    firstItem: firstOf(false), firstItemNoPlayer: firstOf(true),
    interactive: inter.length,
    small44: { count: small44.length, inline: small44inline.length, samples: small44.slice(0, 20).map((el) => ({ text: label(el), ...box(el) })) },
    text: { leaves: leafText.length, under12: tiny.length, tinySamples: tiny.slice(0, 12).map((el) => ({ text: (el.innerText || "").trim().slice(0, 40), px: fsz(el), y: box(el).y })) },
    fields: fields.map((el) => ({ tag: el.tagName, type: el.type || null, px: fsz(el), text: label(el), ...box(el) })).slice(0, 12), zoomFields: zoomFields.length,
    contrast: { checked, skippedBg, low: low.length, samples: low.slice(0, 10) },
    hscroll, players,
  };
}
function coverFn() {
  const W = innerWidth, VH = innerHeight;
  let top = 0, bottom = 0;
  const items = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < W * 0.4 || r.height <= 0 || r.height > VH * 0.6) continue;
    if (r.bottom <= 0 || r.top >= VH) continue;
    if (r.top <= 48 && r.bottom < VH * 0.5) { top = Math.max(top, Math.round(r.bottom)); items.push({ at: "top", h: Math.round(r.height), text: (el.getAttribute("aria-label") || el.innerText || el.tagName).replace(/\s+/g, " ").trim().slice(0, 30) }); }
    else if (r.bottom >= VH - 48 && r.top > VH * 0.4) { bottom = Math.max(bottom, Math.round(VH - r.top)); items.push({ at: "bottom", h: Math.round(r.height), text: (el.getAttribute("aria-label") || el.innerText || el.tagName).replace(/\s+/g, " ").trim().slice(0, 30) }); }
  }
  return { top, bottom, items: items.slice(0, 6) };
}
const MEASURE = "(" + measureFn.toString() + ")()";
const COVER = "(" + coverFn.toString() + ")()";

// ───────── 도구 ─────────
const rec = (r) => { fs.mkdirSync(ROOT, { recursive: true }); fs.appendFileSync(METRICS, JSON.stringify({ at: new Date().toISOString(), mode: MODE, ...r }) + "\n"); };
const doneKeys = new Set();
if (!REDO && fs.existsSync(METRICS)) for (const line of fs.readFileSync(METRICS, "utf8").split("\n")) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (r.kind === "pagedone") doneKeys.add(`${r.mode}|${r.theme}|${r.vp}|${r.page}`); } catch {} }

async function waitMem(maxMin = 40) {
  const need = 1.2 * 1024 ** 3;
  for (let i = 0; i < maxMin; i++) {
    if (os.freemem() >= need) return true;
    console.log(`남은 메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1.2GB — 1분 기다림 (${i + 1}/${maxMin})`);
    await H.sleep(60000);
  }
  return os.freemem() >= need;
}
async function setView(tab, vp) {
  const v = VIEW[vp];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
async function setTheme(tab, theme) {
  await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
}
async function shotFile(tab, theme, vp, sl, state, i) {
  const file = path.join(ROOT, THEME_KO[theme], vp, sl, `${state}-${i}.jpg`);
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  return path.relative(ROOT, file).replace(/\\/g, "/");
}
async function stopSound(tab) { await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {}); }
const ev = (tab, e) => tab.eval(e).catch((err) => ({ error: String(err && err.message).slice(0, 120) }));

/** y 에서 시작해 한 화면씩 n 장. 화면마다 늘 떠 있는 막대가 가린 높이도 잼. */
async function screens(tab, ctx, sl, state, startY, n) {
  const files = [], covers = [];
  const vh = await tab.eval("innerHeight");
  const doc = await tab.eval("document.documentElement.scrollHeight");
  for (let i = 0; i < n; i++) {
    const y = startY + i * vh;
    if (i > 0 && y >= doc - 4) break;
    await tab.eval(`window.scrollTo(0, ${Math.max(0, Math.round(y))})`);
    await H.sleep(260);
    covers.push(await ev(tab, COVER));
    files.push(await shotFile(tab, ctx.theme, ctx.vp, sl, state, i + 1));
  }
  return { files, covers };
}

const lockText = (tab) => ev(tab, `((document.querySelector('main') || document.body).innerText || '')`);
async function loadPage(tab, p, settle = 900) {
  const l = await H.load(tab, p, { marker: null, settle });
  await H.sleep(500);
  await stopSound(tab);
  return l;
}

/** 쪽 하나 — 첫 화면 + (n 화면). */
async function capturePage(tab, ctx, p, sl, { n = nShots(ctx.vp), state = "open" } = {}) {
  const l = await loadPage(tab, p);
  const text = await lockText(tab);
  const paywalled = typeof text === "string" && H.PAYWALL_RE.test(text);
  const m = await ev(tab, MEASURE);
  const s = await screens(tab, ctx, sl, state, 0, n);
  rec({ ...ctx, page: p, slug: sl, state, loaded: l.rendered, paywalled, metrics: m, files: s.files, covers: s.covers });
  return { paywalled, l };
}

/** 과정 목록 — 첫 화면 2장 + 장 하나 펼친 상태 2장(펼친 뒤 다시 접음). */
async function captureList(tab, ctx, p) {
  const sl = slug(p);
  await capturePage(tab, ctx, p, sl, { n: 2 });
  const c = await H.click(tab, `[...document.querySelectorAll('main button[aria-expanded]')].find((b) => b.getAttribute('aria-expanded') === 'false')`, { settle: 900, refuseCovered: true });
  if (c.ok) {
    const y = await tab.eval(`(() => { const b = [...document.querySelectorAll('main button[aria-expanded="true"]')].pop(); return b ? Math.max(0, b.getBoundingClientRect().top + scrollY - 70) : 0; })()`).catch(() => 0);
    const m = await ev(tab, MEASURE);
    const s = await screens(tab, ctx, sl, "expanded", y, 2);
    rec({ ...ctx, page: p, slug: sl, state: "expanded", clicked: true, clickedText: c.text, metrics: m, files: s.files, covers: s.covers });
    await H.click(tab, `[...document.querySelectorAll('main button[aria-expanded="true"]')].pop()`, { settle: 400 }); // 다시 접음(펼침 기억 되돌림)
  } else {
    rec({ ...ctx, page: p, slug: sl, state: "expanded", clicked: false, reason: c.reason || null, files: [] });
  }
  rec({ kind: "pagedone", ...ctx, page: p });
}

/** 강의 — 단계 탭마다 첫 화면부터 n 화면 + 마지막 단계 맨 아래(끝 막대). */
async function captureLesson(tab, ctx, p) {
  const sl = slug(p);
  const l = await loadPage(tab, p);
  await H.waitFor(tab, `!!document.querySelector('[data-step-tab]') || [...document.querySelectorAll('main button')].some((b) => /\\bStep\\s*\\d+\\b/i.test(b.textContent || ''))`, 20000);
  await H.sleep(500);
  const text = await lockText(tab);
  const paywalled = typeof text === "string" && H.PAYWALL_RE.test(text);
  const m0 = await ev(tab, MEASURE);
  const f0 = await screens(tab, ctx, sl, "open", 0, 1);
  rec({ ...ctx, page: p, slug: sl, state: "open", loaded: l.rendered, paywalled, metrics: m0, files: f0.files, covers: f0.covers });
  if (paywalled) { rec({ kind: "pagedone", ...ctx, page: p }); return; }
  const stepList = await ev(tab, `(() => { const a = [...document.querySelectorAll('[data-step-tab]')].filter((b) => b.offsetParent).map((b) => +b.getAttribute('data-step-tab')); if (a.length) return a; return [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => { const m = (b.textContent || '').match(/\\bStep\\s*(\\d+)\\b/i); return m ? +m[1] : null; }).filter(Boolean); })()`);
  const uniq = Array.isArray(stepList) ? [...new Set(stepList)].sort((a, b) => a - b) : [];
  let last = null;
  for (const k of uniq) {
    const c = await H.click(tab, `(document.querySelector('[data-step-tab="${k}"]') || [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).find((b) => { const m = (b.textContent || '').match(/\\bStep\\s*(\\d+)\\b/i); return m && +m[1] === ${k}; }))`, { settle: 900, refuseCovered: true });
    await stopSound(tab);
    await tab.eval("window.scrollTo(0,0)").catch(() => {});
    await H.sleep(250);
    const m = await ev(tab, MEASURE);
    const s = await screens(tab, ctx, sl, `step${k}`, 0, nShots(ctx.vp));
    const after = await ev(tab, `({ docHeight: document.documentElement.scrollHeight, vh: innerHeight })`);
    rec({ ...ctx, page: p, slug: sl, state: `step${k}`, clicked: c.ok, clickReason: c.ok ? null : c.reason || null, metrics: m, afterDocHeight: after && after.docHeight, stepScreens: after && after.vh ? +(after.docHeight / after.vh).toFixed(1) : null, files: s.files, covers: s.covers });
    if (c.ok) last = k;
  }
  if (last != null) {
    // 끝 막대: 마지막 단계 맨 아래
    const h = await tab.eval("document.documentElement.scrollHeight").catch(() => 0);
    const vh = await tab.eval("innerHeight").catch(() => 800);
    await tab.eval(`window.scrollTo(0, ${h})`).catch(() => {});
    await H.sleep(500);
    const endText = await tab.eval(`(() => { const t = (document.querySelector('main') || document.body).innerText || ''; return { hasDone: /학습 완료|학습 완료함|다음 강의/.test(t) }; })()`).catch(() => null);
    const cover = await ev(tab, COVER);
    const m = await ev(tab, MEASURE);
    const file = await shotFile(tab, ctx.theme, ctx.vp, sl, "end", 1);
    rec({ ...ctx, page: p, slug: sl, state: "end", lastStep: last, endText, metrics: m, files: [file], covers: [cover], docHeightAtEnd: h, vhAtEnd: vh });
  }
  rec({ kind: "pagedone", ...ctx, page: p });
}

/** ☰ 메뉴 · 검색 열기 — 과정 목록 쪽에서. */
async function captureStates(tab, ctx) {
  const p = "/reading", sl = "reading";
  if (ctx.vp !== "desktop") {
    await loadPage(tab, p);
    const c = await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 800 });
    rec({ ...ctx, page: p, slug: sl, state: "menu-open", clicked: c.ok, metrics: await ev(tab, MEASURE), files: [await shotFile(tab, ctx.theme, ctx.vp, sl, "menu-open", 1)] });
  } else {
    await loadPage(tab, p);
    const c = await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 800 });
    if (c.ok) rec({ ...ctx, page: p, slug: sl, state: "menu-open", clicked: true, metrics: await ev(tab, MEASURE), files: [await shotFile(tab, ctx.theme, ctx.vp, sl, "menu-open", 1)] });
  }
  await loadPage(tab, p);
  const s = await H.click(tab, `[...document.querySelectorAll('button, a')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 900 });
  // integrate-b: 52 덮개 크기 · 53 이름 · 12 빈 검색어 첫 결과 · 24 단축키 글
  const dlg = await ev(tab, `(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { found: false };
    const lb = d.getAttribute('aria-labelledby');
    const name = d.getAttribute('aria-label') || (lb && document.getElementById(lb) ? document.getElementById(lb).innerText.trim() : null);
    let cover = null;
    for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.position !== 'fixed') continue; const r = el.getBoundingClientRect(); if (r.width * r.height > (cover ? cover.w * cover.h : 0) && cs.display !== 'none' && cs.visibility !== 'hidden') cover = { w: Math.round(r.width), h: Math.round(r.height), inHeader: !!el.closest('header') }; }
    const input = d.querySelector('input');
    const results = [...d.querySelectorAll('a[href], li, [role="option"]')].filter((x) => x.offsetParent).slice(0, 3).map((x) => (x.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60));
    const kbd = [...document.querySelectorAll('header button, header kbd')].map((x) => (x.innerText || '').trim()).filter((t) => /K$/.test(t)).slice(0, 2);
    return { found: true, name, cover, vw: innerWidth, vh: innerHeight, inPortal: !d.closest('header'), placeholder: input ? input.getAttribute('placeholder') : null, focusInInput: document.activeElement === input, results, kbd };
  })()`);
  rec({ ...ctx, page: p, slug: sl, state: "search-open", clicked: s.ok, dialog: dlg, metrics: await ev(tab, MEASURE), files: [await shotFile(tab, ctx.theme, ctx.vp, sl, "search-open", 1)] });
  if (s.ok) {
    const key = async (k, code, vk, mods = 0) => { await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await H.sleep(60); };
    let outside = 0;
    for (let i = 0; i < 14; i++) { await key("Tab", "Tab", 9); const inD = await ev(tab, `!!(document.activeElement && document.activeElement.closest('[role="dialog"]'))`); if (inD !== true) outside++; }
    let outsideBack = 0;
    for (let i = 0; i < 6; i++) { await key("Tab", "Tab", 9, 8); const inD = await ev(tab, `!!(document.activeElement && document.activeElement.closest('[role="dialog"]'))`); if (inD !== true) outsideBack++; }
    await key("Escape", "Escape", 27);
    await H.sleep(300);
    const after = await ev(tab, `({ open: !!document.querySelector('[role="dialog"]'), focus: document.activeElement ? (document.activeElement.getAttribute('aria-label') || document.activeElement.innerText || document.activeElement.tagName).trim().slice(0, 40) : null })`);
    rec({ ...ctx, page: p, slug: sl, state: "search-keys", tabOutside: outside, shiftTabOutside: outsideBack, afterEsc: after });
  }
  rec({ kind: "pagedone", ...ctx, page: "states" });
}

/** 이용권 없는 사본: 잠김 화면 + 이용권 창(열기만 · 코드 입력 0). */
async function captureFreeLock(tab, ctx) {
  const p = "/adult/a2-1", sl = "free_adult_a2-1";
  await capturePage(tab, ctx, p, sl, { n: ctx.vp === "desktop" ? 1 : 2 });
  const c = await H.click(tab, `[...document.querySelectorAll('main button, main a, header button')].find((b) => /이용권/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1000 });
  rec({ ...ctx, page: p, slug: sl, state: "license-modal", clicked: c.ok, clickedText: c.text || null, metrics: await ev(tab, MEASURE), files: [await shotFile(tab, ctx.theme, ctx.vp, sl, "license-modal", 1)] });
  rec({ kind: "pagedone", ...ctx, page: "freelock" });
}

process.on("uncaughtException", (e) => { try { fs.appendFileSync(path.join(ROOT, "capture-errors.log"), `${new Date().toISOString()} uncaught: ${String(e && e.stack || e).slice(0, 800)}\n`); } catch {} console.error(e); process.exit(2); });
process.on("unhandledRejection", (e) => { try { fs.appendFileSync(path.join(ROOT, "capture-errors.log"), `${new Date().toISOString()} unhandled: ${String(e && e.stack || e).slice(0, 800)}\n`); } catch {} });
process.on("exit", (c) => { try { fs.appendFileSync(path.join(ROOT, "capture-errors.log"), `${new Date().toISOString()} exit ${c}\n`); } catch {} });
(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  if (!(await waitMem())) { console.log("멈춤: 남은 메모리 부족 — 브라우저를 띄우지 않음"); process.exitCode = 4; return; }
  const browser = await H.startBrowser(NAME, PORT, { fresh: true });
  let pages = 0;
  try {
    const tab = await H.openTab(browser);
    // 어둠 모드가 사본에 남은 테마 값에 덮이지 않게(사본만 — 원본은 안 건드림)
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    // 쓰기 막기
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params, method = q.request.method;
        let pth = ""; try { pth = new URL(q.request.url).pathname; } catch {}
        const readOnly = /^(GET|HEAD|OPTIONS)$/.test(method);
        const appCheck = method === "POST" && /^\/api\/license\/(verify|session)$/.test(pth);
        if (readOnly || appCheck) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
        else { fs.appendFileSync(BLOCKED, JSON.stringify({ at: new Date().toISOString(), mode: MODE, method, path: pth }) + "\n"); tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });

    await setView(tab, "phone");
    await setTheme(tab, "light");
    await H.load(tab, "/ld/d010", { marker: null, settle: 900 });
    const locked = H.PAYWALL_RE.test(await lockText(tab) || "");
    if (FREE ? !locked : locked) { console.log(`멈춤: ${FREE ? "--free 인데 유료가 열림" : "이용권 판인데 유료가 잠김"}`); process.exitCode = 3; return; }

    const safe = async (ctx, label, fn) => { try { await fn(); } catch (e) { const msg = String(e && e.stack || e).slice(0, 600); fs.appendFileSync(path.join(ROOT, "capture-errors.log"), `${new Date().toISOString()} ${MODE} ${ctx.theme}/${ctx.vp} ${label}: ${msg}\n`); console.log(`  오류 ${label}: ${String(e && e.message).slice(0, 100)}`); if (/closed|WebSocket|timed out|Timeout/i.test(String(e && e.message))) throw e; } };
    const todo = (ctx, page) => REDO || !doneKeys.has(`${MODE}|${ctx.theme}|${ctx.vp}|${page}`);
    for (const theme of THEMES) {
      await setTheme(tab, theme);
      for (const vp of VPS) {
        await setView(tab, vp);
        const ctx = { theme, vp };
        const t0 = Date.now();
        console.log(`== ${THEME_KO[theme]} / ${vp}`);
        if (ONLY.has("home") && todo(ctx, "/")) { await safe(ctx, "/", async () => { await capturePage(tab, ctx, "/", "free_home".replace("free_", FREE ? "free_" : ""), { n: 1 }); rec({ kind: "pagedone", ...ctx, page: "/" }); }); pages++; }
        if (ONLY.has("lists")) for (const p of LISTS) if (todo(ctx, p)) { await safe(ctx, p, () => captureList(tab, ctx, p)); pages++; console.log(`  ${p}`); }
        if (ONLY.has("states") && todo(ctx, "states")) { await safe(ctx, "states", () => captureStates(tab, ctx)); pages++; }
        if (ONLY.has("paywall") && todo(ctx, "freelock")) { await safe(ctx, "freelock", () => captureFreeLock(tab, ctx)); pages++; }
        if (ONLY.has("lessons")) for (const p of LESSONS) if (todo(ctx, p)) { await safe(ctx, p, () => captureLesson(tab, ctx, p)); pages++; console.log(`  ${p} (${Math.round((Date.now() - t0) / 1000)}s)`); }
        if (ONLY.has("extra")) for (const e of EXTRA) if (todo(ctx, e.p)) { await safe(ctx, e.p, async () => { await capturePage(tab, ctx, e.p, e.slug, { n: ctx.vp === "desktop" ? 2 : 3 }); rec({ kind: "pagedone", ...ctx, page: e.p }); }); pages++; console.log(`  ${e.p}`); }
      }
    }
    await tab.close();
  } finally {
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
    console.log(`끝 · 쪽 ${pages} → ${ROOT}`);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });

