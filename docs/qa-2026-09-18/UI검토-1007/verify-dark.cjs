#!/usr/bin/env node
/**
 * 2026-10-07 UI 검토 보충 — verify-dark(반박 점검) 도구. 앱 · 내용 파일을 고치지 않는다.
 * 감사 이용권 사본 'ui1007b-verify' 하나로 운영을 읽기만 한다(포트 9990). /api/ 로 가는 GET 아닌 요청은 막는다
 * (예외: 앱이 스스로 하는 /api/license/verify · /session). 이용권 코드 · PIN 입력 0 · 토큰 · 쿠키 출력 0.
 * 진도를 바꾸는 누름 0 — 누르는 것은 단계 탭 · 검색 단추 · (이용권 없는 격리 문맥의) '이용권 등록' 창 열기뿐.
 * 대비: getComputedStyle 의 색을 조상 바탕부터 1px 캔버스에 차례로 칠해(브라우저와 같은 sRGB 합성) 실제 그려진 색을 얻고,
 *       같은 자리의 화면 사진(PNG) 픽셀로 한 번 더 잰다.
 *
 *   node verify-dark.cjs [--only=dark-01,dark-02]
 * 결과: docs/qa-2026-09-18/out/ui-1007/verify-dark/ (사진 · verify-dark.jsonl)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const H = require("../scripts/lib/harness.cjs");

const ROOT = path.join(H.OUT, "ui-1007", "verify-dark");
const LOG = path.join(ROOT, "verify-dark.jsonl");
const PORT = 9990;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};

function guard(tab, tag) {
  const orig = tab.onMessage.bind(tab);
  tab.onMessage = (msg) => {
    if (msg.method === "Fetch.requestPaused") {
      const q = msg.params, method = q.request.method;
      let pth = ""; try { pth = new URL(q.request.url).pathname; } catch {}
      const ok = /^(GET|HEAD|OPTIONS)$/.test(method) || (method === "POST" && /^\/api\/license\/(verify|session)$/.test(pth));
      if (ok) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
      else { fs.appendFileSync(path.join(ROOT, "blocked.jsonl"), JSON.stringify({ at: new Date().toISOString(), tag, method, path: pth }) + "\n"); tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
      return;
    }
    return orig(msg);
  };
  return tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
}

async function freeTab(port) {
  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { bws.onopen = res; bws.onerror = rej; });
  let id = 0; const pend = new Map();
  bws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
  const bsend = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); bws.send(JSON.stringify({ id: i, method, params })); });
  const { browserContextId } = await bsend("Target.createBrowserContext", { disposeOnDetach: false });
  const { targetId } = await bsend("Target.createTarget", { url: "about:blank", browserContextId });
  const ws = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${targetId}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const tab = new H.Tab(ws, port);
  await tab.send("Page.enable"); await tab.send("Runtime.enable"); await tab.send("Network.enable");
  tab.resetEvents = tab.resetEvents || (() => {});
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: H.AUDIO_HOOK });
  await guard(tab, "free");
  tab.closeCtx = async () => { try { await bsend("Target.disposeBrowserContext", { browserContextId }); } catch {} try { bws.close(); } catch {} };
  return tab;
}

/* ---------- PNG 픽셀 ---------- */
function decodePNG(buf) {
  let p = 8, w, h, ct; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString("ascii", p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === "IDAT") idat.push(data); else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 4; const stride = w * bpp; const out = Buffer.alloc(h * stride); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)); const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    prev = cur;
  }
  return { w, h, get: (x, y) => { x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y))); const i = y * stride + x * bpp; return [out[i], out[i + 1], out[i + 2]]; } };
}
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };

/* ---------- 쪽 안 도구: 실제 그려진 색 ---------- */
const INJ = `(() => {
  if (window.__vd) return true;
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const over = (rgb, color) => { ctx.globalCompositeOperation = 'copy'; ctx.globalAlpha = 1; ctx.fillStyle = 'rgb(' + rgb.join(',') + ')'; ctx.fillRect(0, 0, 1, 1); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
  const chain = (el) => { const a = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) a.unshift(e); return a; };
  const px = (el, top) => {
    let cur = [255, 255, 255]; const groups = [];
    for (const e of chain(el)) { const cs = getComputedStyle(e); const op = +cs.opacity; if (op < 1) groups.push({ below: cur.slice(), op }); cur = over(cur, cs.backgroundColor); }
    if (top) cur = over(cur, top);
    for (let i = groups.length - 1; i >= 0; i--) { const g = groups[i]; cur = cur.map((v, k) => Math.round(g.op * v + (1 - g.op) * g.below[k])); }
    return cur;
  };
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const info = (el, { behindEl = null } = {}) => {
    if (!el) return null;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const behind = px(behindEl || el.parentElement); const own = px(el);
    const bw = parseFloat(cs.borderLeftWidth) || 0;
    const border = bw > 0 ? px(el, cs.borderLeftColor) : null;
    const text = px(el, cs.color);
    return { tag: el.tagName, label: (el.getAttribute('aria-label') || el.innerText || el.placeholder || '').replace(/\\s+/g, ' ').trim().slice(0, 50), box: box(el), opacity: cs.opacity, disabled: !!el.disabled,
      css: { bg: cs.backgroundColor, border: bw ? cs.borderLeftWidth + ' ' + cs.borderLeftColor : 'none', color: cs.color },
      px: { behind, own, border, text },
      cr: { borderVsBehind: border ? cr(border, behind) : null, borderVsOwn: border ? cr(border, own) : null, ownVsBehind: cr(own, behind), textVsOwn: cr(text, own) },
      sample: { dpr: devicePixelRatio, border: bw ? [r.left + bw / 2, r.top + r.height / 2] : null, outside: [r.left - 4, r.top + r.height / 2], inside: [r.left + bw + 6, r.top + Math.min(r.height / 2, 6) + bw] } };
  };
  window.__vd = { px, info, cr, vis, box, theme: () => ({ dataTheme: document.documentElement.getAttribute('data-theme'), prefersDark: matchMedia('(prefers-color-scheme: dark)').matches, body: getComputedStyle(document.body).backgroundColor }) };
  return true;
})()`;

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const need = 1.2 * 1024 ** 3;
  for (let i = 0; i < 30 && os.freemem() < need; i++) { console.log(`메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB — 1분 기다림`); await H.sleep(60000); }
  if (os.freemem() < need) { console.log("멈춤: 메모리 부족"); process.exitCode = 4; return; }
  const browser = await H.startBrowser("ui1007b-verify", PORT, { fresh: process.argv.includes("--fresh") });
  const tab = await H.openTab(browser);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
  await guard(tab, "lic");
  const rec = (r) => { fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(JSON.stringify(r).slice(0, 1500)); };
  const ev = async (e, t = tab) => { try { return await t.eval(e); } catch (err) { return { error: String(err && err.message).slice(0, 200) }; } };
  async function view(vp, theme, t = tab) {
    const v = VIEW[vp];
    await t.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
    await t.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await t.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  }
  async function load(p, t = tab) { const l = await H.load(t, p, { marker: null, settle: 900 }); await H.sleep(700); await ev("window.__kigStop && window.__kigStop()", t); await ev(INJ, t); return l; }
  async function step(k, t = tab) {
    await H.waitFor(t, `!!document.querySelector('[data-step-tab]')`, 15000);
    const c = await H.click(t, `document.querySelector('[data-step-tab="${k}"]')`, { settle: 900, refuseCovered: true });
    await ev("window.__kigStop && window.__kigStop()", t); await ev("window.scrollTo(0,0)", t); await H.sleep(300); await ev(INJ, t);
    return c.ok;
  }
  async function shot(name, t = tab) { const r = await t.send("Page.captureScreenshot", { format: "jpeg", quality: 72 }); fs.writeFileSync(path.join(ROOT, name + ".jpg"), Buffer.from(r.data, "base64")); return "out/ui-1007/verify-dark/" + name + ".jpg"; }
  async function pixels(items, t = tab) {
    // items: info() results — sample border / outside / inside on a fresh PNG of the viewport
    const r = await t.send("Page.captureScreenshot", { format: "png" }); const img = decodePNG(Buffer.from(r.data, "base64"));
    return items.map((it) => {
      if (!it || !it.sample) return null; const d = it.sample.dpr;
      const g = (p) => (p ? img.get(p[0] * d, p[1] * d) : null);
      const b = g(it.sample.border), o = g(it.sample.outside), i = g(it.sample.inside);
      return { border: b, outside: o, inside: i, borderVsOutside: b && o ? cr(b, o) : null, insideVsOutside: i && o ? cr(i, o) : null };
    });
  }
  async function measure(expr, t = tab, { scroll = true, behind = null } = {}) {
    return ev(`(() => { const el = (${expr}); if (!el) return null; ${scroll ? "el.scrollIntoView({ block: 'center' });" : ""} return window.__vd.info(el${behind ? `, { behindEl: (${behind}) }` : ""}); })()`, t);
  }

  try {
    /* ---------- dark-01 입력 칸 테두리 ---------- */
    if (want("dark-01")) {
      const cases = [
        { p: "/grammar1/gh1-006", s: 2, vp: "desktop", th: "dark", sel: `[...document.querySelectorAll('main input')].find((e) => window.__vd.vis(e) && /빈칸/.test(e.getAttribute('aria-label') || ''))` },
        { p: "/grammar1/gh1-006", s: 2, vp: "desktop", th: "light", sel: `[...document.querySelectorAll('main input')].find((e) => window.__vd.vis(e) && /빈칸/.test(e.getAttribute('aria-label') || ''))` },
        { p: "/grammar1/gh1-006", s: 1, vp: "desktop", th: "dark", sel: `[...document.querySelectorAll('main textarea')].find(window.__vd.vis)` },
        { p: "/grammar2/gh2-033", s: 2, vp: "desktop", th: "dark", sel: `[...document.querySelectorAll('main input')].find((e) => window.__vd.vis(e) && /빈칸/.test(e.getAttribute('aria-label') || ''))` },
        { p: "/passoff-grammar/pg13-1", s: 4, vp: "small", th: "dark", sel: `[...document.querySelectorAll('main input, main textarea')].find((e) => window.__vd.vis(e) && e.type !== 'checkbox' && e.type !== 'radio' && e.type !== 'range')` },
        { p: "/student/s1-1", s: 2, vp: "small", th: "dark", sel: `[...document.querySelectorAll('main input, main textarea')].find((e) => window.__vd.vis(e) && e.type !== 'checkbox' && e.type !== 'radio' && e.type !== 'range')` },
        { p: "/student/s1-1", s: 2, vp: "small", th: "light", sel: `[...document.querySelectorAll('main input, main textarea')].find((e) => window.__vd.vis(e) && e.type !== 'checkbox' && e.type !== 'radio' && e.type !== 'range')` },
      ];
      for (const c of cases) {
        await view(c.vp, c.th); await load(c.p); const ok = await step(c.s);
        const m = await measure(c.sel); await H.sleep(300);
        const [pxm] = await pixels([m]);
        const all = await ev(`[...document.querySelectorAll('main input:not([type=checkbox]):not([type=radio]):not([type=range]), main textarea')].filter(window.__vd.vis).length`);
        const f = await shot(`d01_${c.p.replace(/\//g, "_")}_s${c.s}_${c.vp}_${c.th}`);
        rec({ id: "dark-01", page: c.p, step: c.s, vp: c.vp, theme: c.th, stepClicked: ok, theme_: await ev("window.__vd.theme()"), fields: all, m, pixel: pxm, shot: f });
      }
    }

    /* ---------- dark-01b 다른 과정의 글 쓰는 칸 · 이용권 창 입력 ---------- */
    if (want("dark-01b")) {
      const anyField = `[...document.querySelectorAll('main input, main textarea')].find((e) => window.__vd.vis(e) && !/checkbox|radio|range|hidden/.test(e.type))`;
      for (const [p, steps] of [["/ld/d001-1", [2, 3, 4, 5]], ["/adult/a1-1", [1, 2, 3, 4, 5]], ["/student/s1-1", [1, 2, 3]], ["/reading/pr001", [1, 2, 3, 4]], ["/phonics/mv3-38", [1, 2, 3]]]) {
        await view("small", "dark"); await load(p);
        for (const s of steps) {
          const ok = await step(s);
          const n = await ev(`[...document.querySelectorAll('main input, main textarea')].filter((e) => window.__vd.vis(e) && !/checkbox|radio|range|hidden/.test(e.type)).length`);
          const m = n ? await measure(anyField) : null;
          const dashed = await ev(`(() => { const d = [...document.querySelectorAll('main div')].find((x) => window.__vd.vis(x) && getComputedStyle(x).borderLeftStyle === 'dashed' && x.getBoundingClientRect().height > 60); return d ? window.__vd.info(d) : null; })()`);
          if (m) await shot(`d01b_${p.replace(/\//g, "_")}_s${s}_small_dark`);
          rec({ id: "dark-01b", page: p, step: s, stepClicked: ok, fields: n, m, dashed: dashed ? { cr: dashed.cr, css: dashed.css } : null });
        }
      }
      const ft = await freeTab(PORT);
      try {
        await view("small", "dark", ft); await load("/adult/a2-1", ft);
        await H.click(ft, `[...document.querySelectorAll('main button, main a')].find((b) => /이용권 등록/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1100 });
        await ev(INJ, ft);
        const m = await measure(`[...document.querySelectorAll('[role="dialog"] input')].find(window.__vd.vis)`, ft, { scroll: false });
        rec({ id: "dark-01b", page: "license-modal-input", vp: "small", theme: "dark", m });
      } finally { await ft.close().catch(() => {}); await ft.closeCtx(); }
    }

    /* ---------- dark-02 / dark-03 검색 창 ---------- */
    if (want("dark-02") || want("dark-03")) {
      for (const [vp, th] of [["desktop", "dark"], ["phone", "dark"], ["small", "light"]]) {
        await view(vp, th); await load("/reading");
        const before = await ev(`(() => { const h = document.querySelector('header'); const cs = getComputedStyle(h); return { headerBox: window.__vd.box(h), backdrop: cs.backdropFilter || cs.webkitBackdropFilter, dialogInHeader: null }; })()`);
        const c = await H.click(tab, `document.querySelector('header button[aria-label="검색"]')`, { settle: 900 });
        const st = await ev(`(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); const mid = document.elementFromPoint(innerWidth / 2, innerHeight - 40); const midTop = document.elementFromPoint(20, Math.round(r.bottom) + 30); return { insideHeader: !!d.closest('header'), overlay: window.__vd.box(d), vh: innerHeight, vw: innerWidth, coversViewport: r.top <= 0 && r.bottom >= innerHeight - 1 && r.width >= innerWidth - 1, bottomPointInDialog: d.contains(mid), bottomPointIs: mid ? (mid.closest('a,button') ? (mid.closest('a,button').innerText || '').trim().slice(0, 30) : mid.tagName) : null, belowOverlayIsDialog: midTop ? d.contains(midTop) : null, panel: d.firstElementChild ? window.__vd.box(d.firstElementChild) : null, ariaLabel: d.getAttribute('aria-label'), ariaLabelledby: d.getAttribute('aria-labelledby'), active: document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.tagName) }; })()`);
        // 덮개 바깥(머리줄 아래) 화면 밝기: 사진 픽셀로 — 덮개가 덮었으면 열기 전보다 어두움
        const f = await shot(`d02_search_${vp}_${th}`);
        let tabs = null, after = null;
        if (vp === "desktop" && th === "dark") {
          // dark-03: Tab 을 14번 — 초점이 창 밖으로 나가는지
          tabs = [];
          for (let i = 0; i < 14; i++) {
            await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
            await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
            await H.sleep(120);
            tabs.push(await ev(`(() => { const a = document.activeElement; const d = document.querySelector('[role="dialog"]'); return { inDialog: !!d && d.contains(a), what: a ? ((a.getAttribute('aria-label') || a.innerText || a.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 30) : null }; })()`));
          }
          await H.click(tab, `document.querySelector('[role="dialog"] input')`, { settle: 300 });
          await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
          await H.sleep(400);
          after = await ev(`(() => { const a = document.activeElement; return { dialogOpen: !!document.querySelector('[role="dialog"]'), active: a ? (a.tagName + ' ' + (a.getAttribute('aria-label') || '')).trim() : null }; })()`);
          // AX 이름
        }
        rec({ id: "dark-02/03", vp, theme: th, clicked: c.ok, before, st, tabs, afterEscape: after, shot: f });
      }
    }

    /* ---------- dark-04 이용권 창(이용권 없는 격리 문맥) ---------- */
    if (want("dark-04")) {
      const ft = await freeTab(PORT);
      try {
        for (const [vp, th] of [["desktop", "dark"], ["small", "dark"], ["desktop", "light"]]) {
          await view(vp, th, ft); await load("/adult/a2-1", ft);
          const c = await H.click(ft, `[...document.querySelectorAll('main button, main a')].find((b) => /이용권 등록/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1100 });
          await ev(INJ, ft);
          const panel = await measure(`document.querySelector('[role="dialog"][aria-labelledby="license-modal-title"] > div') || document.querySelector('[role="dialog"] > div')`, ft, { scroll: false });
          const [pxm] = await pixels([panel], ft);
          const f = await shot(`d04_license_${vp}_${th}`, ft);
          rec({ id: "dark-04", vp, theme: th, clicked: c.ok, clickedText: c.text, theme_: await ev("window.__vd.theme()", ft), panel, pixel: pxm, shot: f });
        }
      } finally { await ft.close().catch(() => {}); await ft.closeCtx(); }
    }

    /* ---------- dark-05 꺼진 단추 ---------- */
    if (want("dark-05")) {
      const cases = [
        { p: "/reading/pr001", s: 2, vp: "small", th: "dark" }, { p: "/reading/pr001", s: 2, vp: "small", th: "light" },
        { p: "/phonics/mv3-38", s: 3, vp: "small", th: "dark" },
        { p: "/grammar1/gh1-006", s: 4, vp: "desktop", th: "dark" },
      ];
      for (const c of cases) {
        await view(c.vp, c.th); await load(c.p); const ok = await step(c.s);
        const list = await ev(`(() => { const out = []; for (const b of document.querySelectorAll('main button[disabled], main button:disabled')) { if (!window.__vd.vis(b)) continue; const t = (b.innerText || '').replace(/\\s+/g, ' ').trim(); if (!/학습 완료|다음 Step|채점|확인/.test(t)) continue; out.push(t.slice(0, 30)); } return out; })()`);
        const done = await measure(`[...document.querySelectorAll('main button')].find((b) => /이 강의 학습 완료/.test(b.innerText || '') && window.__vd.vis(b))`, tab, { scroll: true });
        const pDone = (await pixels([done]))[0];
        const fDone = await shot(`d05_${c.p.replace(/\//g, "_")}_s${c.s}_${c.vp}_${c.th}_done`);
        const nextLesson = await measure(`[...document.querySelectorAll('main a, main button')].find((b) => /다음 강의/.test(b.getAttribute('aria-label') || b.innerText || '') && window.__vd.vis(b))`, tab, { scroll: false });
        const nextStep = await measure(`[...document.querySelectorAll('main button')].find((b) => /다음 Step/.test(b.innerText || '') && window.__vd.vis(b))`);
        const grade = await measure(`[...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || '') && window.__vd.vis(b))`);
        const pOther = await pixels([nextStep, grade]);
        const f = await shot(`d05_${c.p.replace(/\//g, "_")}_s${c.s}_${c.vp}_${c.th}_other`);
        rec({ id: "dark-05", page: c.p, step: c.s, vp: c.vp, theme: c.th, stepClicked: ok, disabledButtons: list, done, pDone, nextLesson, nextStep, grade, pOther, shots: [fDone, f] });
      }
    }

    /* ---------- dark-06 스위치 ---------- */
    if (want("dark-06")) {
      const cases = [
        { p: "/ld/d001-1", s: 4, vp: "small", th: "dark" }, { p: "/ld/d001-1", s: 4, vp: "small", th: "light" },
        { p: "/student/s1-1", s: 3, vp: "small", th: "dark" },
      ];
      for (const c of cases) {
        await view(c.vp, c.th); await load(c.p); const ok = await step(c.s);
        const tracks = await ev(`(() => [...document.querySelectorAll('main span.rounded-full')].filter((s) => window.__vd.vis(s) && /\\bh-5\\b/.test(s.className) && /\\bw-9\\b/.test(s.className)).map((s) => { s.scrollIntoView({ block: 'center' }); const i = window.__vd.info(s); const knob = s.firstElementChild ? window.__vd.info(s.firstElementChild, { behindEl: s }) : null; const lab = s.closest('label, button'); return { label: lab ? (lab.innerText || lab.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 30) : null, checked: lab ? (lab.querySelector('input') ? lab.querySelector('input').checked : lab.getAttribute('aria-checked') || lab.getAttribute('aria-pressed')) : null, cls: s.className.slice(0, 120), track: i, knob }; }))()`);
        const t0 = Array.isArray(tracks) && tracks[0] ? tracks[0].track : null;
        if (t0) await ev(`(() => { const s = [...document.querySelectorAll('main span.rounded-full')].find((s) => window.__vd.vis(s) && /\\bh-5\\b/.test(s.className) && /\\bw-9\\b/.test(s.className)); s.scrollIntoView({ block: 'center' }); })()`);
        const t1 = await ev(`(() => { const s = [...document.querySelectorAll('main span.rounded-full')].find((s) => window.__vd.vis(s) && /\\bh-5\\b/.test(s.className) && /\\bw-9\\b/.test(s.className)); return s ? window.__vd.info(s) : null; })()`);
        // 스위치 바탕 가운데 픽셀 vs 바깥
        const pxm = t1 ? (await pixels([{ ...t1, sample: { dpr: t1.sample.dpr, border: [t1.box.x + t1.box.w - 5, t1.box.y + t1.box.h / 2], outside: [t1.box.x - 6, t1.box.y + t1.box.h / 2], inside: [t1.box.x + t1.box.w / 2, t1.box.y + 2] } }]))[0] : null;
        const f = await shot(`d06_${c.p.replace(/\//g, "_")}_s${c.s}_${c.vp}_${c.th}`);
        rec({ id: "dark-06", page: c.p, step: c.s, vp: c.vp, theme: c.th, stepClicked: ok, tracks, pixelTrack: pxm, shot: f });
      }
    }

    /* ---------- dark-07 진도 막대 ---------- */
    if (want("dark-07")) {
      const cases = [["/phonics", "small", "dark"], ["/reading", "small", "dark"], ["/grammar1", "desktop", "dark"], ["/grammar1", "desktop", "light"], ["/student", "small", "dark"]];
      for (const [p, vp, th] of cases) {
        await view(vp, th); await load(p); await H.sleep(800); await ev(INJ);
        const bar = await measure(`[...document.querySelectorAll('main div')].find((d) => /\\bh-1\\.5\\b/.test(d.className) && /\\bbg-sunken\\b/.test(d.className) && window.__vd.vis(d))`);
        const txt = await ev(`(() => { const p = [...document.querySelectorAll('main p')].find((x) => /학습 진도율/.test(x.innerText || '')); return p ? p.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);
        const pxm = bar ? (await pixels([{ ...bar, sample: { dpr: bar.sample.dpr, border: null, outside: [bar.box.x + bar.box.w - 4, bar.box.y - 6], inside: [bar.box.x + bar.box.w - 4, bar.box.y + bar.box.h / 2] } }]))[0] : null;
        const f = await shot(`d07_${p.replace(/\//g, "_")}_${vp}_${th}`);
        rec({ id: "dark-07", page: p, vp, theme: th, progressText: txt, bar, pixel: pxm, shot: f });
      }
    }

    /* ---------- dark-08 GRAMMAR 1단계 영작 칸 폭 ---------- */
    if (want("dark-08")) {
      for (const [p, vp] of [["/grammar1/gh1-006", "small"], ["/grammar1/gh1-006", "phone"], ["/grammar2/gh2-033", "small"], ["/grammar1/gh1-006", "desktop"]]) {
        await view(vp, "dark"); await load(p); const ok = await step(1);
        const m = await ev(`(() => { const ta = [...document.querySelectorAll('main textarea')].find(window.__vd.vis); if (!ta) return null; ta.scrollIntoView({ block: 'center' }); const row = ta.parentElement; const kids = [...row.children].filter(window.__vd.vis).map((k) => ({ tag: k.tagName, label: (k.getAttribute('aria-label') || k.innerText || '').trim().slice(0, 20), ...window.__vd.box(k) })); const cs = getComputedStyle(ta); return { textarea: window.__vd.box(ta), font: cs.fontSize, padL: cs.paddingLeft, padR: cs.paddingRight, rowW: Math.round(row.getBoundingClientRect().width), kids, charsFit: Math.round((ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / (parseFloat(cs.fontSize) * 0.5)) }; })()`);
        const f = await shot(`d08_${p.replace(/\//g, "_")}_s1_${vp}`);
        rec({ id: "dark-08", page: p, vp, stepClicked: ok, m, shot: f });
      }
    }

    /* ---------- dark-09 학습 완료 단추 이름 ---------- */
    if (want("dark-09")) {
      for (const p of ["/student/s1-1", "/reading/pr001", "/phonics/mv3-38", "/grammar1/gh1-006"]) {
        await view("desktop", "dark"); await load(p);
        const b = await ev(`(() => [...document.querySelectorAll('main button')].filter((b) => /학습 완료/.test(b.innerText || '') || /학습 완료/.test(b.getAttribute('aria-label') || '')).map((b) => ({ text: (b.innerText || '').replace(/\\s+/g, ' ').trim(), ariaLabel: b.getAttribute('aria-label'), ariaPressed: b.getAttribute('aria-pressed'), disabled: b.disabled, describedby: b.getAttribute('aria-describedby') })))()`);
        let ax = null;
        try {
          const doc = await tab.send("DOM.getDocument", { depth: 0 });
          const q = await tab.send("DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: "main button[aria-pressed]" });
          const out = [];
          for (const nodeId of q.nodeIds.slice(0, 20)) { const a = await tab.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false }); const n = a.nodes && a.nodes[0]; if (n && /학습 완료/.test((n.name && n.name.value) || "")) out.push({ role: n.role && n.role.value, name: n.name && n.name.value, pressed: (n.properties || []).filter((x) => /pressed|disabled/.test(x.name)).map((x) => `${x.name}=${x.value && x.value.value}`) }); }
          ax = out;
        } catch (e) { ax = { error: String(e.message).slice(0, 120) }; }
        rec({ id: "dark-09", page: p, buttons: b, ax });
      }
    }

    /* ---------- dark-10 READING 4단계 위쪽 줄 ---------- */
    if (want("dark-10")) {
      for (const [p, vp] of [["/reading/pr154", "small"], ["/reading/pr001", "small"], ["/reading/pr154", "phone"], ["/reading/pr154", "desktop"]]) {
        await view(vp, "dark"); await load(p); const ok = await step(4);
        const m = await ev(`(() => { const meta = document.querySelector('[data-passage-meta="timed"]'); if (!meta) return null; meta.scrollIntoView({ block: 'center' }); const left = meta.parentElement; const row = left.parentElement; const kids = [...row.children].filter(window.__vd.vis).map((k) => ({ tag: k.tagName, text: (k.innerText || k.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 40), ...window.__vd.box(k) })); const aa = [...row.querySelectorAll('button')].find((b) => /Aa|글자|보기/.test((b.innerText || '') + (b.getAttribute('aria-label') || ''))); return { rowCls: row.className.slice(0, 120), rowW: Math.round(row.getBoundingClientRect().width), kids, metaText: meta.innerText, aa: aa ? { label: aa.getAttribute('aria-label') || aa.innerText.trim(), ...window.__vd.box(aa) } : null, start: (() => { const s = document.querySelector('[data-action="start-reading"]'); return s ? window.__vd.box(s) : null; })() }; })()`);
        const f = await shot(`d10_${p.replace(/\//g, "_")}_s4_${vp}`);
        rec({ id: "dark-10", page: p, vp, stepClicked: ok, m, shot: f });
      }
    }
  } finally {
    await tab.close().catch(() => {});
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
