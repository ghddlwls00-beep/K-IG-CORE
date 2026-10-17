#!/usr/bin/env node
/**
 * LECTURE 확인(2026-10-17 · docs/lecture/확인-기록.md) — 이용권 없는 빈 프로필의 headless Edge 하나로:
 *
 *   --part play     lm001 재생 정확도: 0초 · 30초 · 120초 · 끝에서 화면(쪽 그림 + 두 캔버스)과
 *                   `node scripts/lecture/render-pen.mjs lm001 --at <초>` 의 SVG(그림 태그만 뺀 필기 선)를 같은 크기로 그려 픽셀로 비교
 *                   (필기 픽셀 IoU · 겹친 화면 픽셀 차이) + 나란히 놓은 사진 · 빠르기 2× 30초 · 막대 끌기로 끝 · End 키 · 완료 단추 ·
 *                   새로고침 · 뒤로 가기 · 자동 재생 0 · 콘솔/예외/4xx
 *   --part screens  390 · 360 · 1366 × 밝음 · 어둠: 첫 화면 LECTURE 슬라이드 · /lecture · lm001 0초 · 재생 중 · 끝 · 잠긴 lm003 ·
 *                   메뉴 서랍 · 검색 '영어독해' — 사진(JPEG) + 잰 값(옆 밀림 · 44px 미만 누름 · 12px 미만 글 · 16px 미만 입력 · 글 잘림)
 *   --part others   다른 과정 화면: 첫 화면 다른 슬라이드 · /student · /reading — 1366 · 390 밝음(--base 를 바꿔 운영과 나란히)
 *
 *   node verify-lecture-screens.cjs --part play|screens|others [--base http://localhost:3390] [--port 9991] [--out <폴더>] [--tag local]
 *
 * 이용권 · PIN 은 넣지 않는다(빈 프로필). 쓰는 것은 화면 읽기 · 누르기 · 키뿐. 결과: <out>/<part>-<tag>.json · 사진 *.jpg / *.png
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const BASE = arg("--base", "http://localhost:3390");
const PORT = Number(arg("--port", 9991));
const PART = arg("--part", "play");
const TAG = arg("--tag", "local");
const OUT = path.resolve(arg("--out", path.join(REPO, "docs/qa-2026-09-18/out/lecture/verify")));
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  m390: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  m360: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true },
  d1366: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false },
};

const HOOK = `(() => { if (window.__lv) return; window.__lv = { play: 0 };
  const P = HTMLMediaElement.prototype, o = P.play; P.play = function () { window.__lv.play++; return o.apply(this, arguments); };
  try { const s = window.speechSynthesis; if (s) { const sp = s.speak.bind(s); s.speak = (u) => { window.__lv.play++; return sp(u); }; } } catch (e) {}
})()`;

async function setViewport(tab, vp) {
  await tab.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, mobile: vp.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", vp.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
async function setTheme(tab, theme) {
  await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await tab.eval(`(() => { try { localStorage.setItem('kig:theme', '${theme}'); } catch (e) {} document.documentElement.setAttribute('data-theme', '${theme}'); return true; })()`).catch(() => null);
}
async function goto(tab, url, settle = 900) {
  await tab.send("Page.navigate", { url: BASE + url });
  const end = Date.now() + 30000;
  await sleep(200);
  while (Date.now() < end) {
    if ((await tab.eval("document.readyState").catch(() => "")) === "complete") break;
    await sleep(150);
  }
  await sleep(settle);
}
async function waitFor(tab, expr, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expr).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
}
const READY = `(() => { const v = document.querySelector('[data-lecture-view]'); if (!v || v.dataset.lectureState !== 'ready') return false;
  return [...v.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0); })()`;

async function shot(tab, name, { clipSelector = null, png = false, full = false } = {}) {
  const params = { format: png ? "png" : "jpeg", quality: png ? undefined : 82, captureBeyondViewport: full };
  if (clipSelector) {
    const r = await tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(clipSelector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
    if (r) params.clip = { ...r, scale: 1 };
  }
  const { data } = await tab.send("Page.captureScreenshot", params);
  const file = path.join(OUT, `${name}.${png ? "png" : "jpg"}`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  return path.relative(REPO, file).replace(/\\/g, "/");
}

/** a trusted click at an element's centre (scrolled into view first) */
async function click(tab, selector) {
  const r = await tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  if (!r) throw new Error(`no element ${selector}`);
  await sleep(150);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await tab.send("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
  }
  await sleep(250);
}
const VK = { Home: 36, End: 35, PageUp: 33, PageDown: 34, ArrowRight: 39, ArrowLeft: 37 };
async function key(tab, k, times = 1) {
  for (let i = 0; i < times; i++) {
    await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code: k, windowsVirtualKeyCode: VK[k] });
    await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: VK[k] });
    await sleep(60);
  }
  await sleep(250);
}
const focusBar = (tab) => tab.eval(`(() => { const e = document.querySelector('[data-lecture-view] input[type=range]'); e.focus(); return document.activeElement === e; })()`);

/** the view's state as a learner sees it */
const STATE = `(() => {
  const v = document.querySelector('[data-lecture-view]');
  const t = document.querySelector('[data-lecture-time]');
  const cvs = v ? [...v.querySelectorAll('canvas')] : [];
  const px = cvs.map((c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  const btn = document.querySelector('[data-lesson-complete]');
  const reason = btn && btn.getAttribute('aria-describedby') ? (document.getElementById(btn.getAttribute('aria-describedby')) || {}).innerText : null;
  const shown = v ? [...v.querySelectorAll('img')].find((i) => !i.classList.contains('invisible')) : null;
  return {
    state: v && v.dataset.lectureState, playing: v && v.dataset.lecturePlaying === '1', time: t && t.innerText.trim(),
    markPx: px[0] ?? null, inkPx: px[1] ?? null, page: shown ? shown.alt : null,
    completeDisabled: btn ? btn.disabled : null, completeName: btn ? btn.getAttribute('aria-label') : null, reason,
    mediaPlays: window.__lv ? window.__lv.play : null, audioEls: document.querySelectorAll('audio,video').length,
    speed: (() => { const b = v && [...v.querySelectorAll('button')].find((x) => /빠르기/.test(x.getAttribute('aria-label') || '')); return b ? b.innerText.trim() : null; })(),
  };
})()`;
const secondsOf = (s) => { const m = String(s || "").match(/^(\d+):(\d\d)/); return m ? +m[1] * 60 + +m[2] : null; };

/** measures on the whole page: sideways scroll, small targets, tiny text, small inputs, clipped text */
const MEASURE = `(() => {
  const vis = (el) => { if (!(el.offsetParent || el.getClientRects().length)) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const srOnly = (el) => { const r = el.getBoundingClientRect(); return getComputedStyle(el).position === 'absolute' && r.width <= 1 && r.height <= 1; };
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
  const W = innerWidth;
  const controls = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary')].filter(vis).filter((e) => !srOnly(e));
  const small = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
    .map((e) => { const r = e.getBoundingClientRect(); const inText = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && /^(P|LI|SPAN)$/.test(e.parentElement.tagName); return { name: name(e), w: Math.round(r.width), h: Math.round(r.height), inText }; });
  const tiny = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || !vis(el) || srOnly(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) tiny.push({ text: t.slice(0, 30), px: fs }); }
  const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select')].filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => name(e));
  const clipped = [...document.querySelectorAll('h1,h2,h3,p,li,button,span,div,a')].filter(vis).filter((el) => { const cs = getComputedStyle(el); return (cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && (el.innerText || '').trim().length > 0 && cs.textOverflow !== 'ellipsis' && !srOnly(el); }).map((el) => el.innerText.trim().slice(0, 40));
  const off = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1; }).map(name);
  return { overflowX: document.documentElement.scrollWidth > W + 1, scrollWidth: document.documentElement.scrollWidth, W,
    controls: controls.length, small: small.length, smallList: small.slice(0, 12), smallNotInText: small.filter((s) => !s.inText).length,
    tiny: tiny.length, tinyList: tiny.slice(0, 8), smallInputs: inputs.length, smallInputList: inputs.slice(0, 5), clipped: clipped.length, clippedList: clipped.slice(0, 5), offscreen: off.slice(0, 5) };
})()`;

/** draws the app's stage (page image + highlighter layer + pen layer) and the reference SVG strokes at the same size, and compares */
const COMPARE = (svgPaths, penCanvas) => `(async () => {
  const v = document.querySelector('[data-lecture-view]');
  const stage = v.querySelector('canvas').parentElement;
  const W = Math.round(stage.clientWidth), H = Math.round(stage.clientHeight);
  const [mark, ink] = [...stage.querySelectorAll('canvas')];
  const img = [...stage.querySelectorAll('img')].find((i) => !i.classList.contains('invisible'));
  const s = W / 1020;
  const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  // app: only the pen (mask) · and composed on the page
  const appInk = make(); { const g = appInk.getContext('2d'); g.drawImage(mark, 0, 0, W, H); g.drawImage(ink, 0, 0, W, H); }
  const appAll = make(); { const g = appAll.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, 827 * s, 1169 * s); g.globalAlpha = 0.42; g.globalCompositeOperation = 'multiply'; g.drawImage(mark, 0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(ink, 0, 0, W, H); }
  // reference: render-pen.mjs's SVG strokes (its <image> left out — the same page image is drawn underneath)
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="${penCanvas.w}" height="${penCanvas.h}" viewBox="0 0 ${penCanvas.w} ${penCanvas.h}">' + ${JSON.stringify(svgPaths)} + '</svg>';
  const ref = new Image(); ref.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await ref.decode();
  const refInk = make(); refInk.getContext('2d').drawImage(ref, 0, 0, ${penCanvas.w} * s, ${penCanvas.h} * s);
  const refAll = make(); { const g = refAll.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, 827 * s, 1169 * s); g.drawImage(ref, 0, 0, ${penCanvas.w} * s, ${penCanvas.h} * s); }
  const A = appInk.getContext('2d').getImageData(0, 0, W, H).data, R = refInk.getContext('2d').getImageData(0, 0, W, H).data;
  let a = 0, r = 0, both = 0, either = 0;
  for (let i = 3; i < A.length; i += 4) { const x = A[i] > 24, y = R[i] > 24; if (x) a++; if (y) r++; if (x && y) both++; if (x || y) either++; }
  const P = appAll.getContext('2d').getImageData(0, 0, W, H).data, Q = refAll.getContext('2d').getImageData(0, 0, W, H).data;
  let sum = 0, big = 0;
  const diff = make(); const dg = diff.getContext('2d'); const dd = dg.createImageData(W, H);
  for (let i = 0; i < P.length; i += 4) { const m = Math.max(Math.abs(P[i] - Q[i]), Math.abs(P[i + 1] - Q[i + 1]), Math.abs(P[i + 2] - Q[i + 2])); sum += m; if (m > 48) big++;
    const g = (P[i] + P[i + 1] + P[i + 2]) / 3; dd.data[i] = m > 48 ? 255 : g * 0.25 + 190; dd.data[i + 1] = m > 48 ? 0 : g * 0.25 + 190; dd.data[i + 2] = m > 48 ? 255 : g * 0.25 + 190; dd.data[i + 3] = 255; }
  dg.putImageData(dd, 0, 0);
  const side = document.createElement('canvas'); side.width = W * 3 + 40; side.height = H + 36; const sg = side.getContext('2d');
  sg.fillStyle = '#fff'; sg.fillRect(0, 0, side.width, side.height); sg.fillStyle = '#111'; sg.font = '20px sans-serif';
  sg.fillText('사이트 화면', 8, 24); sg.fillText('render-pen SVG', W + 28, 24); sg.fillText('다른 픽셀(보라)', 2 * W + 48, 24);
  sg.drawImage(appAll, 0, 36); sg.drawImage(refAll, W + 20, 36); sg.drawImage(diff, 2 * W + 40, 36);
  const n = W * H;
  return { W, H, appInkPx: a, refInkPx: r, inkIoU: either ? +(both / either).toFixed(4) : 1, inkOnlyApp: a - both, inkOnlyRef: r - both,
    meanDiff: +(sum / n).toFixed(3), bigDiffPx: big, bigDiffPct: +((100 * big) / n).toFixed(3), side: side.toDataURL('image/png').split(',')[1] };
})()`;

function svgPathsAt(id, seconds) {
  const tmp = path.join(os.tmpdir(), `lv-${id}-${seconds}.svg`);
  const args = [path.join(REPO, "scripts/lecture/render-pen.mjs"), id, "--out", tmp];
  if (seconds !== null) args.splice(2, 0, "--at", String(seconds));
  const log = execFileSync(process.execPath, args, { cwd: REPO, encoding: "utf8" }).trim();
  const svg = fs.readFileSync(tmp, "utf8");
  fs.rmSync(tmp, { force: true });
  const paths = (svg.match(/<path [^>]*\/>/g) || []).join("");
  return { paths, strokes: (svg.match(/<path /g) || []).length, log };
}

async function startBrowser() {
  const profile = path.join(os.tmpdir(), `kig-lecture-verify-${PART}-${PORT}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const browser = await launch({ port: PORT, profile });
  const tab = await Tab.open(PORT);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
  return { browser, tab, profile };
}
const errorsOf = (tab) => ({
  console: tab.events.console.length, exceptions: tab.events.exceptions.length,
  bad: tab.events.badResponses.map((b) => `${b.status} ${b.url.replace(BASE, "")}`).slice(0, 10), failed: tab.events.failed.slice(0, 5),
  samples: [...tab.events.console, ...tab.events.exceptions].slice(0, 5),
});

// ---------------------------------------------------------------- play
async function partPlay(tab) {
  const R = { at: new Date().toISOString(), base: BASE };
  const pen = JSON.parse(fs.readFileSync(path.join(REPO, ".lecture-media/audio/lecture/lm001/pen.json"), "utf8"));
  const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/lecture/lm001.json"), "utf8"));
  await setViewport(tab, VIEWPORTS.d1366);
  await goto(tab, "/lecture/lm001");
  R.ready = await waitFor(tab, READY, 20000);
  R.open = await tab.eval(STATE);
  await sleep(3000);
  R.after3s = await tab.eval(STATE); // nothing plays by itself
  R.compare = [];
  const points = [0, 30, 120, "end"];
  await focusBar(tab);
  for (const p of points) {
    if (p === 0) await key(tab, "Home");
    else if (p === "end") await key(tab, "End");
    else { await key(tab, "Home"); await key(tab, "PageUp", p / 30); }
    await sleep(400);
    const st = await tab.eval(STATE);
    const sec = p === "end" ? lesson.lecture.durationSec : p;
    const ref = svgPathsAt("lm001", p === "end" ? null : sec);
    const cmp = await tab.eval(COMPARE(ref.paths, pen.canvas));
    const sideFile = path.join(OUT, `play-lm001-${p}-side.png`);
    fs.writeFileSync(sideFile, Buffer.from(cmp.side, "base64"));
    delete cmp.side;
    const screen = await shot(tab, `play-lm001-${p}-screen`, { clipSelector: "[data-lecture-view]" });
    R.compare.push({ point: p, seconds: sec, state: st, renderPen: ref.log, refStrokes: ref.strokes, ...cmp, side: path.relative(REPO, sideFile).replace(/\\/g, "/"), screen });
    if (p === 120) R.beforeEnd = { completeDisabled: st.completeDisabled, reason: st.reason };
    if (p === "end") R.afterEndKey = { completeDisabled: st.completeDisabled, reason: st.reason, time: st.time };
  }
  // speed 2×: 30 s of wall time from 0:00
  await goto(tab, "/lecture/lm001");
  await waitFor(tab, READY, 20000);
  const speedSel = "[data-lecture-view] button[aria-label^='빠르기']";
  await click(tab, speedSel);
  await click(tab, speedSel);
  const sp = await tab.eval(STATE);
  const t0 = Date.now();
  await click(tab, "[data-lecture-view] button[aria-label='재생']");
  await sleep(30000);
  const mid = await tab.eval(STATE);
  const wall = (Date.now() - t0) / 1000;
  await click(tab, "[data-lecture-view] button[aria-label='일시정지']");
  const paused = await tab.eval(STATE);
  await sleep(2000);
  const paused2 = await tab.eval(STATE);
  R.speed2x = { speedLabel: sp.speed, wallSec: +wall.toFixed(2), shownAt30s: mid.time, shownSec: secondsOf(mid.time), expectedSec: +(2 * wall).toFixed(1), pausedAt: paused.time, after2sPaused: paused2.time, inkPx: mid.inkPx };
  R.speed2xShot = await shot(tab, "play-lm001-speed2x-60s", { clipSelector: "[data-lecture-view]" });
  // the bar dragged by the mouse to its right end (a learner's '끝으로 건너뛰기')
  await goto(tab, "/lecture/lm001");
  await waitFor(tab, READY, 20000);
  const box = await tab.eval(`(() => { const e = document.querySelector('[data-lecture-view] input[type=range]'); const b = e.getBoundingClientRect(); return { x0: b.left + 4, x1: b.right + 30, y: b.top + b.height / 2, max: e.max, step: e.step }; })()`);
  await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x0, y: box.y });
  await tab.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x0, y: box.y, button: "left", clickCount: 1 });
  for (let i = 1; i <= 12; i++) { await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x0 + ((box.x1 - box.x0) * i) / 12, y: box.y, button: "left", buttons: 1 }); await sleep(30); }
  await tab.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x1, y: box.y, button: "left", clickCount: 1 });
  await sleep(500);
  const dragged = await tab.eval(STATE);
  const value = await tab.eval(`document.querySelector('[data-lecture-view] input[type=range]').value`);
  R.dragToEnd = { inputMax: box.max, inputStep: box.step, inputValue: value, durationSec: lesson.lecture.durationSec, time: dragged.time, completeDisabled: dragged.completeDisabled, reason: dragged.reason, inkPx: dragged.inkPx };
  R.dragShot = await shot(tab, "play-lm001-drag-end-bar", { clipSelector: "section[aria-label='강의 마치기']" });
  // reload: back to 0:00, empty, paused
  await tab.send("Page.reload", {});
  await sleep(1500);
  await waitFor(tab, READY, 20000);
  R.afterReload = await tab.eval(STATE);
  // to the list and back
  await click(tab, "a[href='/lecture']");
  await waitFor(tab, `location.pathname === '/lecture'`, 10000);
  await sleep(800);
  await tab.eval("history.back()");
  await waitFor(tab, `location.pathname === '/lecture/lm001'`, 10000);
  R.backReady = await waitFor(tab, READY, 20000);
  await sleep(1500);
  R.afterBack = await tab.eval(STATE);
  // and play once more after coming back (the view still works)
  await click(tab, "[data-lecture-view] button[aria-label='재생']");
  await sleep(2500);
  R.afterBackPlay = await tab.eval(STATE);
  await click(tab, "[data-lecture-view] button[aria-label='일시정지']");
  // lm002 opens too (the other free lecture)
  await goto(tab, "/lecture/lm002");
  R.lm002 = { ready: await waitFor(tab, READY, 20000), ...(await tab.eval(STATE)) };
  R.errors = errorsOf(tab);
  return R;
}

// ---------------------------------------------------------------- screens
async function homeSlide(tab, label) {
  return tab.eval(`(async () => { const h = [...document.querySelectorAll('section h2')].find((x) => x.innerText.trim() === ${JSON.stringify(label)}); if (!h) return null;
    const sec = h.closest('section'); const box = sec.parentElement; box.style.scrollSnapType = 'none'; box.scrollTop = sec.offsetTop; await new Promise((r) => setTimeout(r, 1200));
    const img = sec.querySelector('img'); return { index: [...box.children].indexOf(sec) + 1, of: box.children.length, stage: (sec.innerText.match(/STAGE \\d+/) || [''])[0], photo: img ? (img.currentSrc || img.src).replace(location.origin, '') : null, photoLoaded: img ? img.complete && img.naturalWidth > 0 : null }; })()`);
}

async function partScreens(tab) {
  const R = { at: new Date().toISOString(), base: BASE, shots: [] };
  for (const vpName of ["m390", "m360", "d1366"]) {
    for (const theme of ["light", "dark"]) {
      const vp = VIEWPORTS[vpName];
      const k = `${vpName}-${theme}`;
      await setViewport(tab, vp);
      await goto(tab, "/", 300);
      await setTheme(tab, theme);
      const add = async (screen, extra = {}) => {
        const m = await tab.eval(MEASURE);
        const file = await shot(tab, `screens-${k}-${screen}`);
        R.shots.push({ vp: vpName, theme, screen, file, ...m, ...extra });
      };
      // home — the LECTURE slide
      await goto(tab, "/");
      const slide = await homeSlide(tab, "LECTURE");
      await add("home-lecture", { slide });
      // the list
      await goto(tab, "/lecture");
      await add("list", { text: await tab.eval(`(document.querySelector('main')||document.body).innerText.slice(0, 400)`) });
      // lm001 at 0
      await goto(tab, "/lecture/lm001");
      await waitFor(tab, READY, 20000);
      await add("lm001-0s", { state: await tab.eval(STATE) });
      // playing (~1:00)
      await focusBar(tab);
      await key(tab, "Home");
      await key(tab, "PageUp", 2);
      await click(tab, "[data-lecture-view] button[aria-label='재생']");
      await sleep(1500);
      const playing = await tab.eval(STATE);
      await add("lm001-playing", { state: playing });
      await click(tab, "[data-lecture-view] button[aria-label='일시정지']");
      // the end
      await focusBar(tab);
      await key(tab, "End");
      await sleep(300);
      await add("lm001-end", { state: await tab.eval(STATE) });
      await tab.eval(`document.querySelector("section[aria-label='강의 마치기']").scrollIntoView({ block: 'end' })`);
      await sleep(300);
      await add("lm001-endbar", { state: await tab.eval(STATE) });
      // locked
      await goto(tab, "/lecture/lm003");
      await add("lm003-locked", { text: await tab.eval(`(document.querySelector('main')||document.body).innerText.slice(0, 300)`) });
      // menu drawer (on the list page)
      await goto(tab, "/lecture");
      await click(tab, "button[aria-label='메뉴 열기']");
      await sleep(500);
      await add("menu", { lectureInMenu: await tab.eval(`[...document.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href') === '/lecture' || a.getAttribute('href') === '/t/lecture').map((a) => a.innerText.trim()).filter(Boolean).slice(0, 4)`) });
      await tab.eval(`document.querySelector("button[aria-label='메뉴 닫기']")?.click()`);
      await sleep(300);
      // search '영어독해'
      await click(tab, "button[aria-label='검색']");
      await sleep(400);
      await tab.eval(`document.querySelector("input[aria-label='검색어']")?.focus()`);
      await tab.send("Input.insertText", { text: "영어독해" });
      await sleep(1200);
      const results = await tab.eval(`(() => { const d = document.querySelector('[role=dialog]') || document.body; const links = [...d.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')); return { total: links.length, lecture: links.filter((h) => h.startsWith('/lecture/')).length, first: links.slice(0, 5), text: d.innerText.slice(0, 200) }; })()`);
      await add("search", { results });
      await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      console.log(k, "done");
    }
  }
  R.errors = errorsOf(tab);
  return R;
}

// ---------------------------------------------------------------- other courses
async function partOthers(tab) {
  const R = { at: new Date().toISOString(), base: BASE, shots: [] };
  for (const vpName of ["d1366", "m390"]) {
    await setViewport(tab, VIEWPORTS[vpName]);
    await goto(tab, "/", 300);
    await setTheme(tab, "light");
    for (const label of ["STUDENT", "READING", "CNN NEWS"]) {
      await goto(tab, "/");
      const slide = await homeSlide(tab, label);
      const file = await shot(tab, `others-${TAG}-${vpName}-home-${label.replace(/\W+/g, "")}`);
      R.shots.push({ vp: vpName, screen: `home ${label}`, file, slide, ...(await tab.eval(MEASURE)) });
    }
    for (const url of ["/student", "/reading"]) {
      await goto(tab, url);
      const file = await shot(tab, `others-${TAG}-${vpName}-${url.slice(1)}`);
      const text = await tab.eval(`(document.querySelector('main')||document.body).innerText`);
      R.shots.push({ vp: vpName, screen: url, file, textLength: text.length, textHead: text.slice(0, 300), ...(await tab.eval(MEASURE)) });
    }
  }
  R.errors = errorsOf(tab);
  return R;
}

(async () => {
  const { browser, tab, profile } = await startBrowser();
  let result;
  try {
    result = PART === "play" ? await partPlay(tab) : PART === "screens" ? await partScreens(tab) : await partOthers(tab);
  } finally {
    await tab.close().catch(() => {});
    try { browser.proc.kill(); } catch {}
    await sleep(800);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  }
  const file = path.join(OUT, `${PART}-${TAG}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, (k, v) => (k === "smallList" || k === "tinyList" || k === "text" || k === "textHead" ? undefined : v), 1).slice(0, 6000));
  console.log("→", path.relative(REPO, file));
})().catch((e) => { console.error(e); process.exit(1); });
