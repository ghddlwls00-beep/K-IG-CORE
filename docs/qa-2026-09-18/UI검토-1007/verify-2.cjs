#!/usr/bin/env node
/**
 * 2026-10-07 UI 검토 — verify-2(반박 점검). 다섯 검토자가 찾은 것을 운영에서 다시 연다. 앱 · 내용을 고치지 않는다.
 * 누르는 것: 단계 탭 · ☰ 메뉴 · 검색 열기 · (이용권 없는 사본) '구매 안내' · '이용권 등록'으로 창 열기 — 그뿐.
 * /api/ 로 가는 GET 아닌 요청은 막음(앱이 열릴 때 하는 /api/license/verify · /session 확인만 통과). 토큰 · 쿠키 · 본문 출력 0.
 *   node verify-2.cjs            (이용권 사본 ui1007-verify-2 · 포트 9981)
 *   node verify-2.cjs --free     (빈 사본 · 포트 9982)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const FREE = process.argv.includes("--free");
if (FREE) {
  const empty = path.join(os.tmpdir(), "ui1007-empty-profile-src");
  fs.mkdirSync(empty, { recursive: true });
  process.env.KIG_PROFILE_SOURCE = empty;
  process.env.KIG_CLONE_PREFIX = "kig-ui1007-free-";
}
const H = require("../scripts/lib/harness.cjs");
const ROOT = path.join(H.OUT, "ui-1007", "verify");
const OUTJ = path.join(ROOT, FREE ? "verify-2-free.json" : "verify-2.json");
const PORT = FREE ? 9982 : 9981;
const NAME = FREE ? "ui1007-verify-2-free" : "ui1007-verify-2";
const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};
const only = (() => { const i = process.argv.indexOf("--only"); return i > 0 ? new Set(process.argv[i + 1].split(",")) : null; })();
const R = {};
const save = () => { fs.mkdirSync(ROOT, { recursive: true }); fs.writeFileSync(OUTJ, JSON.stringify(R, null, 1)); };

async function setView(tab, vp) {
  const v = VIEW[vp];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const setTheme = (tab, t) => tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: t }] });
async function shot(tab, name, clip) {
  const p = { format: "jpeg", quality: 72 };
  if (clip) { p.clip = { ...clip, scale: 1 }; p.captureBeyondViewport = true; }
  const r = await tab.send("Page.captureScreenshot", p);
  const f = path.join(ROOT, `${name}.jpg`);
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(f, Buffer.from(r.data, "base64"));
  return `docs/qa-2026-09-18/out/ui-1007/verify/${name}.jpg`;
}
const ev = (tab, e) => tab.eval(e).catch((err) => ({ error: String(err && err.message).slice(0, 160) }));
async function open(tab, p, settle = 900) {
  const l = await H.load(tab, p, { marker: null, settle });
  await H.sleep(600);
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  await H.waitFor(tab, `!!document.querySelector('main')`, 8000);
  return l;
}
async function step(tab, k) {
  const c = await H.click(tab, `document.querySelector('[data-step-tab="${k}"]')`, { settle: 1000, refuseCovered: true });
  await tab.eval("window.__kigStop && window.__kigStop(); window.scrollTo(0,0)").catch(() => {});
  await H.sleep(400);
  return c.ok;
}
const TEXT = `((document.querySelector('main') || document.body).innerText || '')`;
const count = (s, re) => (typeof s === "string" ? (s.match(re) || []).length : null);

// a text's positions (document y) and what holds it
const FIND = (needle) => `(() => { const out = []; const w = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.toLowerCase().includes(${JSON.stringify(needle.toLowerCase())})) continue; const el = n.parentElement; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!r.width) continue; out.push({ y: Math.round(r.top + scrollY), x: Math.round(r.left), tag: el.tagName, weight: cs.fontWeight, deco: cs.textDecorationLine, vis: cs.visibility, op: cs.opacity, text: (el.closest('p,li,div') || el).innerText.trim().slice(0, 140) }); } return out.slice(0, 8); })()`;
const BLANK = `(() => [...document.querySelectorAll('main *')].filter((el) => el.children.length === 0 && /_{3,}/.test(el.textContent || '') && el.getBoundingClientRect().width).map((el) => ({ y: Math.round(el.getBoundingClientRect().top + scrollY), text: (el.closest('p,li,div') || el).innerText.trim().slice(0, 140) })).slice(0, 6))()`;

async function lic(tab) {
  // ---------- READING ----------
  if (!only || only.has("reading")) {
    await setTheme(tab, "light"); await setView(tab, "phone");
    for (const [p, ans] of [["/reading/pr001", "mothers"], ["/reading/pr154", "hand-made"], ["/adult/a1-2", "graduated from"]]) {
      await open(tab, p);
      await step(tab, 2);
      const blanks = await ev(tab, BLANK);
      const hits = await ev(tab, FIND(ans));
      const sl = p.split("/").slice(1).join("_");
      // the first hit and the first blank, same screen if close
      const ys = [].concat(Array.isArray(hits) ? hits.map((h) => h.y) : [], Array.isArray(blanks) ? blanks.map((b) => b.y) : []);
      let file = null;
      if (Array.isArray(blanks) && blanks.length) {
        const top = Math.max(0, blanks[0].y - 600);
        await tab.eval(`window.scrollTo(0, ${top})`); await H.sleep(300);
        file = await shot(tab, `pfl07-${sl}-step2`);
      }
      R[`pfl07 ${p}`] = { answer: ans, hits, blanks, file };
      save();
    }
    // segmented control wrap (phone + desktop) — pr001 step 3
    for (const vp of ["phone", "desktop"]) {
      await setView(tab, vp);
      await open(tab, "/reading/pr001");
      await step(tab, 3);
      const seg = await ev(tab, `(() => [...document.querySelectorAll('main button')].filter((b) => /^(영어 · 한글|영어만|한글만)$/.test((b.innerText || '').replace(/\\s+/g, ' ').trim())).map((b) => { const r = b.getBoundingClientRect(); return { text: b.innerText, h: Math.round(r.height), w: Math.round(r.width), y: Math.round(r.top + scrollY), lines: Math.round(r.height / parseFloat(getComputedStyle(b).lineHeight || 20)) }; }))()`);
      let file = null;
      if (Array.isArray(seg) && seg.length) { await tab.eval(`window.scrollTo(0, ${Math.max(0, seg[0].y - 200)})`); await H.sleep(250); file = await shot(tab, `pfl16-dc08-reading_pr001-step3-${vp}`); }
      R[`seg ${vp}`] = { seg, file };
      save();
    }
    // serif font — pr154 step 1 desktop
    await setView(tab, "desktop");
    await open(tab, "/reading/pr154");
    const font = await ev(tab, `(() => { const el = document.querySelector('main [lang=en].font-serif, main .font-serif'); if (!el) return null; const r = el.getBoundingClientRect(); return { family: getComputedStyle(el).fontFamily, y: Math.round(r.top + scrollY), hasHanji: (el.innerText || '').includes('한지'), sample: (el.innerText || '').slice(0, 100) }; })()`);
    let ff = null;
    if (font && font.y != null) { await tab.eval(`window.scrollTo(0, ${Math.max(0, font.y - 120)})`); await H.sleep(250); ff = await shot(tab, `dc09-reading_pr154-step1-desktop`); }
    const hanjiHits = await ev(tab, FIND("한지"));
    R["dc09 serif"] = { font, hanjiHits, file: ff };
    // step 4 — questions before reading
    await open(tab, "/reading/pr001");
    await step(tab, 4);
    const s4 = await ev(tab, `(() => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0; }; const start = [...document.querySelectorAll('main button')].find((b) => /읽기 시작/.test(b.innerText)); const opts = [...document.querySelectorAll('main button, main [role=radio], main input[type=radio]')].filter(vis).filter((b) => b !== start && b.closest('[data-step-start], main') && !/Step|읽기 시작|이전|다음|학습 완료|목록|북마크|검색|메뉴/.test(b.innerText || b.getAttribute('aria-label') || '')); const r = start && start.getBoundingClientRect(); return { start: start ? { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + scrollY), disabled: start.disabled } : null, optionButtons: opts.length, optsSample: opts.slice(0, 10).map((b) => (b.innerText || '').trim().slice(0, 40)), main: (document.querySelector('main').innerText || '').slice(0, 1200) }; })()`);
    R["dc24 step4"] = { ...s4, file: await shot(tab, "dc24-reading_pr001-step4-desktop") };
    save();
  }

  // ---------- LISTENING ----------
  if (!only || only.has("ld")) {
    await setTheme(tab, "light"); await setView(tab, "phone");
    await open(tab, "/ld/d001");
    await step(tab, 2);
    const t2 = await ev(tab, `(() => { const b = [...document.querySelectorAll('main button, main [role=switch], main label')].filter((x) => /쓰기/.test(x.innerText || x.getAttribute('aria-label') || '')).map((x) => ({ tag: x.tagName, role: x.getAttribute('role'), text: (x.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 40), y: Math.round(x.getBoundingClientRect().top + scrollY) })); return b; })()`);
    R["pfl15 ld step2 phone"] = { controls: t2, file: await shot(tab, "pfl15-ld_d001-step2-phone") };
    await step(tab, 5);
    const t5 = await ev(tab, TEXT);
    R["pfl14 ld step5 phone"] = { repeats: count(t5, /받아쓰기 전이라 가려 두었어요/g), file: await shot(tab, "pfl14-ld_d001-step5-phone") };
    await open(tab, "/ld/d166"); await step(tab, 5);
    R["pfl14 ld d166 step5"] = { repeats: count(await ev(tab, TEXT), /받아쓰기 전이라 가려 두었어요/g) };
    // script page end bar
    await open(tab, "/ld/d001-1");
    const endbar = await ev(tab, `(() => { const h1 = (document.querySelector('main h1') || {}).innerText; const links = [...document.querySelectorAll('main a[href]')].filter((a) => /이전 강의|다음 강의/.test(a.innerText)).map((a) => ({ text: a.innerText.replace(/\\s+/g, ' ').trim(), href: a.getAttribute('href') })); return { h1, links }; })()`);
    await tab.eval("window.scrollTo(0, document.documentElement.scrollHeight)"); await H.sleep(400);
    R["pfl13 ld d001-1 endbar"] = { ...endbar, file: await shot(tab, "pfl13-ld_d001-1-end-phone") };
    await open(tab, "/reading/pr001-1");
    R["pfl13 reading pr001-1 endbar"] = await ev(tab, `(() => ({ h1: (document.querySelector('main h1') || {}).innerText, links: [...document.querySelectorAll('main a[href]')].filter((a) => /이전 강의|다음 강의/.test(a.innerText)).map((a) => ({ text: a.innerText.replace(/\\s+/g, ' ').trim(), href: a.getAttribute('href') })) }))()`);
    // does the list or anything link to a -1 page?
    await open(tab, "/ld");
    R["ld list links to -1"] = await ev(tab, `[...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /\\/ld\\/d\\d+-1$/.test(h)).slice(0, 5)`);
    await open(tab, "/ld/d001");
    R["ld d001 links to -1"] = await ev(tab, `[...document.querySelectorAll('a[href]')].filter((a) => /-1$/.test(a.getAttribute('href'))).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 40) })).slice(0, 5)`);
    save();
    // desktop: step 2 chip layout · step 4 sentence nav position
    await setView(tab, "desktop");
    await open(tab, "/ld/d001");
    for (const k of [2, 3, 4]) {
      await step(tab, k);
      const m = await ev(tab, `(() => { const nav = [...document.querySelectorAll('main *')].find((e) => e.children.length < 6 && /문장\\s*\\d+\\s*\\/\\s*\\d+/.test(e.innerText || '') && e.getBoundingClientRect().height < 80 && e.getBoundingClientRect().height > 0); const check = [...document.querySelectorAll('main button')].find((b) => /정답 확인/.test(b.innerText)); const mainEl = document.querySelector('[data-step-start]') || document.querySelector('main'); const tabs = document.querySelector('[data-step-tab]'); const tabsY = tabs ? tabs.getBoundingClientRect().bottom + scrollY : 0; const rect = (e) => e ? { y: Math.round(e.getBoundingClientRect().top + scrollY), x: Math.round(e.getBoundingClientRect().left), w: Math.round(e.getBoundingClientRect().width) } : null; const toggle = [...document.querySelectorAll('main button, main [role=switch]')].find((b) => /글 가리기/.test(b.innerText || b.getAttribute('aria-label') || '')); return { tabsBottom: Math.round(tabsY), nav: rect(nav), navText: nav ? nav.innerText.replace(/\\s+/g, ' ').slice(0, 40) : null, check: rect(check), toggle: rect(toggle), vh: innerHeight }; })()`);
      R[`dc17/18 ld desktop step${k}`] = { ...m, file: await shot(tab, `dc17-18-ld_d001-step${k}-desktop`) };
    }
    save();
  }

  // ---------- PASS-OFF ----------
  if (!only || only.has("pg")) {
    await setTheme(tab, "light"); await setView(tab, "phone");
    for (const p of ["/passoff-grammar/pg01-1", "/passoff-grammar/pg13-1"]) {
      await open(tab, p);
      const t = await ev(tab, TEXT);
      R[`pfl14 ${p}`] = { repeats: count(t, /앞 문장을 연 뒤에 차례가 와요/g), file: await shot(tab, `pfl14-${p.split("/").pop()}-step1-phone`) };
    }
    save();
  }

  // ---------- desktop jump (scrollbar) ----------
  if (!only || only.has("jump")) {
    await setTheme(tab, "light"); await setView(tab, "desktop");
    await open(tab, "/phonics/mv1-01");
    const m = [];
    for (const k of [1, 2, 3, 4]) {
      await step(tab, k);
      m.push({ step: k, ...(await ev(tab, `(() => { const a = document.querySelector('header a[href="/"]'); const h1 = document.querySelector('main h1'); return { logoX: a ? Math.round(a.getBoundingClientRect().left) : null, h1X: h1 ? Math.round(h1.getBoundingClientRect().left) : null, docH: document.documentElement.scrollHeight, vh: innerHeight, sb: innerWidth - document.documentElement.clientWidth, gutter: getComputedStyle(document.documentElement).scrollbarGutter }; })()`)) });
    }
    R["dc02 jump"] = m;
    save();
  }

  // ---------- duplicate play buttons ----------
  if (!only || only.has("play")) {
    await setTheme(tab, "light"); await setView(tab, "desktop");
    await open(tab, "/student/s11-4");
    const b = await ev(tab, `(() => { const bs = [...document.querySelectorAll('main button')].filter((x) => x.getBoundingClientRect().width > 0); const lab = (x) => ((x.innerText || '') + ' ' + (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '')).replace(/\\s+/g, ' ').trim(); const listen = bs.filter((x) => /듣기|재생|play/i.test(lab(x))); const counts = {}; for (const x of listen) { const k = lab(x).slice(0, 30); counts[k] = (counts[k] || 0) + 1; } return { total: bs.length, listen: listen.length, counts, inFirstScreen: listen.filter((x) => x.getBoundingClientRect().top < innerHeight).length }; })()`);
    R["dc05 s11-4 step1"] = { ...b, file: await shot(tab, "dc05-student_s11-4-step1-desktop") };
    await step(tab, 3);
    R["dc05 s11-4 step3"] = { ...(await ev(tab, `(() => { const bs = [...document.querySelectorAll('main button')].filter((x) => x.getBoundingClientRect().width > 0); const lab = (x) => ((x.innerText || '') + ' ' + (x.getAttribute('aria-label') || '') + ' |t:' + (x.getAttribute('title') || '')).replace(/\\s+/g, ' ').trim(); return bs.slice(0, 40).map(lab).filter((s) => s.length < 120); })()`)), file: await shot(tab, "dc05-student_s11-4-step3-desktop") };
    save();
  }

  // ---------- search ----------
  if (!only || only.has("search")) {
    for (const [theme, vp] of [["dark", "desktop"], ["light", "phone"]]) {
      await setTheme(tab, theme); await setView(tab, vp);
      await open(tab, "/reading");
      const kbd = await ev(tab, `(() => { const k = [...document.querySelectorAll('header kbd, kbd')].find((x) => x.getBoundingClientRect().width > 0); return k ? k.innerText : null; })()`);
      const c = await H.click(tab, `[...document.querySelectorAll('header button, header a')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.innerText || '') + (b.getAttribute('title') || '')) && b.getBoundingClientRect().width > 0)`, { settle: 900 });
      const s = await ev(tab, `(() => { const i = document.querySelector('[role=dialog] input, input[type=search]'); const d = i && i.closest('[role=dialog]'); const rows = d ? [...d.querySelectorAll('a[href], [role=option], li')].filter((x) => x.getBoundingClientRect().width > 0).slice(0, 6).map((x) => x.innerText.replace(/\\s+/g, ' ').trim().slice(0, 90)) : []; let ph = null; if (i) { const cv = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(i); cv.font = cs.fontSize + ' ' + cs.fontFamily; ph = { text: i.placeholder, textW: Math.round(cv.measureText(i.placeholder).width), boxW: Math.round(i.clientWidth) }; } const all = d ? (d.innerText.match(/🎙️|🔊|📖/g) || []).length : null; return { opened: !!i, rows, ph, emojiCount: all }; })()`);
      R[`search ${theme} ${vp}`] = { kbd, clicked: c.ok, ...s, file: await shot(tab, `dc03-cf05-search-${theme}-${vp}`) };
      await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
      await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
    }
    // ⌘K on light desktop at 1366
    await setTheme(tab, "light"); await setView(tab, "desktop");
    await open(tab, "/student");
    R["dc14 kbd 1366"] = { kbd: await ev(tab, `(() => { const k = [...document.querySelectorAll('kbd')].find((x) => x.getBoundingClientRect().width > 0); return k ? k.innerText : null; })()`), file: await shot(tab, "dc14-cf18-header-desktop", { x: 0, y: 0, width: 1366, height: 70 }) };
    save();
  }

  // ---------- lists: start button · flash · wording ----------
  if (!only || only.has("lists")) {
    await setTheme(tab, "dark"); await setView(tab, "phone");
    for (const p of ["/student", "/passoff-grammar", "/grammar1"]) {
      // flash: poll text from navigation start
      await tab.send("Page.navigate", { url: "about:blank" }); await H.sleep(400);
      await tab.send("Page.navigate", { url: `${H.BASE}${p}` });
      const t0 = Date.now(); const seen = [];
      let flashShot = null;
      while (Date.now() - t0 < 5000) {
        const s = await tab.eval(`(() => { const t = (document.querySelector('main') || {}).innerText || ''; return { free: /무료로 먼저 해 보기/.test(t), start: (t.match(/(이어서 학습|처음부터)\\n?[^\\n]*/) || [''])[0].replace(/\\n/g, ' ') }; })()`).catch(() => null);
        if (s) { const k = `${s.free ? "FREE" : "-"}|${s.start}`; if (!seen.length || seen[seen.length - 1].k !== k) { seen.push({ ms: Date.now() - t0, k }); if (s.free && !flashShot) flashShot = await shot(tab, `cf02-flash${p.replace(/\//g, "_")}-dark-phone`); } }
        await H.sleep(60);
      }
      const st = await ev(tab, `(() => { const t = (document.querySelector('main') || {}).innerText || ''; return { progress: (t.match(/학습 진도율[^\\n]*/) || [''])[0], head: t.slice(0, 900) }; })()`);
      R[`cf02/04 ${p}`] = { seen, flashShot, ...st, file: await shot(tab, `cf04${p.replace(/\//g, "_")}-dark-phone`) };
      save();
    }
    // dark contrast — filter chips (list) and step tabs (lesson), desktop
    await setView(tab, "desktop");
    const CON = `(() => { const lum = (c) => { const m = c.match(/[\\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return { L: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m.length > 3 ? m[3] : 1, rgb: m.slice(0, 3).join(',') }; }; const bgOf = (e) => { while (e) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; }; const out = []; for (const b of document.querySelectorAll('[aria-pressed="true"]')) { if (!b.getBoundingClientRect().width) continue; const own = getComputedStyle(b).backgroundColor; const par = bgOf(b.parentElement); const A = lum(own), B = lum(par); const ratio = (Math.max(A.L, B.L) + 0.05) / (Math.min(A.L, B.L) + 0.05); out.push({ text: b.innerText.replace(/\\s+/g, ' ').slice(0, 30), own: A.rgb + '/' + A.a, parent: B.rgb, ratio: +ratio.toFixed(2), shadow: getComputedStyle(b).boxShadow.slice(0, 60), weight: getComputedStyle(b).fontWeight }); } return out.slice(0, 6); })()`;
    await open(tab, "/student");
    R["cf15 list dark desktop"] = { pressed: await ev(tab, CON), file: await shot(tab, "cf15-student-list-dark-desktop") };
    await open(tab, "/student/s1-1");
    R["cf15 lesson dark desktop"] = { pressed: await ev(tab, CON), file: await shot(tab, "cf15-student_s1-1-dark-desktop", { x: 0, y: 0, width: 1366, height: 450 }) };
    await setTheme(tab, "light");
    await open(tab, "/student/s1-1");
    R["cf15 lesson light desktop"] = { pressed: await ev(tab, CON) };
    // wording on lists (light desktop)
    for (const p of ["/student", "/passoff-grammar", "/ld", "/grammar1", "/phonics"]) {
      await open(tab, p);
      const t = await ev(tab, `(() => { const t = (document.querySelector('main') || {}).innerText || ''; const boxes = [...document.querySelectorAll('main section, main div')].filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderBottomWidth) >= 1 && parseFloat(cs.borderRadius) >= 10 && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().width > 200; }).length; return { head: t.slice(0, 1400), boxesFirstScreen: boxes, docH: document.documentElement.scrollHeight }; })()`);
      R[`list ${p}`] = { ...t, file: await shot(tab, `list${p.replace(/\//g, "_")}-light-desktop`) };
    }
    save();
  }

  // ---------- menu · 404 · home ----------
  if (!only || only.has("misc")) {
    await setTheme(tab, "light"); await setView(tab, "phone");
    await open(tab, "/reading");
    await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 800 });
    R["cf12 menu"] = { items: await ev(tab, `[...document.querySelectorAll('[role=dialog] a[href], nav a[href], aside a[href]')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.innerText.replace(/\\s+/g, ' ').trim().slice(0, 40) + ' → ' + a.getAttribute('href')).slice(0, 20)`), file: await shot(tab, "cf12-menu-phone") };
    await open(tab, "/nope-404-verify");
    R["404"] = { ...(await ev(tab, `(() => { const p = [...document.querySelectorAll('main p, p')].find((x) => /404/.test(x.innerText)); const cs = p && getComputedStyle(p); const home = [...document.querySelectorAll('a')].find((a) => /홈으로/.test(a.innerText)); return { first: p ? { text: p.innerText, font: cs.fontFamily.slice(0, 40), size: cs.fontSize, ls: cs.letterSpacing, tt: cs.textTransform } : null, homeRadius: home ? getComputedStyle(home).borderRadius : null, links: [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href') + ' | ' + a.innerText.replace(/\\s+/g, ' ').slice(0, 60)).slice(0, 12) }; })()`)), file: await shot(tab, "cf11-404-phone") };
    await open(tab, "/t/ld");
    R["/t/ld"] = { text: (await ev(tab, TEXT)).slice(0, 400), file: await shot(tab, "cf11-t_ld-phone") };
    // home dots 360 light
    await setView(tab, "small");
    await open(tab, "/");
    const dots = await ev(tab, `(() => { const ds = [...document.querySelectorAll('button[aria-label]')].filter((b) => /슬라이드|번째|로 이동/.test(b.getAttribute('aria-label')) && b.getBoundingClientRect().width > 0); return ds.map((b) => { const r = b.getBoundingClientRect(); const inner = b.querySelector('span') || b; return { label: b.getAttribute('aria-label').slice(0, 30), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(inner).backgroundColor }; }); })()`);
    const vw = 360;
    R["cf23 home dots small light"] = { dots, homeText: (await ev(tab, `document.body.innerText.slice(0, 600)`)), file: await shot(tab, "cf23-home-small-light"), crop: await shot(tab, "cf23-home-small-light-dots", { x: vw - 60, y: 200, width: 60, height: 500 }) };
    // home text: does a courses.ts description appear on the home page?
    R["home has courses.ts description"] = await ev(tab, `/매트릭스|청취력을 완성|직독직해 능력|정밀 클리닉/.test(document.body.innerText)`);
    await setView(tab, "phone");
    R["cf23 home dots phone light"] = { file: await shot(tab, "cf23-home-phone-light") };
    save();
  }

  // ---------- naming of 단계 ----------
  if (!only || only.has("names")) {
    await setTheme(tab, "light"); await setView(tab, "desktop");
    await open(tab, "/grammar1/gh1-074");
    R["cf09 gh1-074"] = { head: (await ev(tab, TEXT)).slice(0, 700), file: await shot(tab, "cf09-grammar1_gh1-074-desktop") };
    await open(tab, "/phonics/mv3-38");
    await tab.eval("window.scrollTo(0, document.documentElement.scrollHeight)"); await H.sleep(500);
    R["cf09 mv3-38 end"] = { reason: await ev(tab, `((document.querySelector('main') || {}).innerText.match(/[^\\n]*단계[^\\n]*완료[^\\n]*/g) || []).slice(0, 4)`), tabs: await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`) };
    await open(tab, "/reading/pr001");
    R["reading tabs"] = await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`);
    await open(tab, "/ld/d001");
    R["ld tabs"] = await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`);
    await open(tab, "/student/s1-1");
    R["student tabs"] = await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`);
    // font size control per course (lesson header + anywhere)
    const fs1 = {};
    for (const p of ["/student/s1-1", "/adult/a1-2", "/passoff-grammar/pg01-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/ld/d001", "/reading/pr001"]) {
      await open(tab, p);
      fs1[p] = await ev(tab, `[...document.querySelectorAll('button, [role=group]')].filter((b) => /글자 크기|Aa|보기 설정/.test((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '').slice(0, 20))).map((b) => ({ label: (b.getAttribute('aria-label') || b.innerText).slice(0, 30), visible: b.getBoundingClientRect().width > 0, y: Math.round(b.getBoundingClientRect().top + scrollY) })).slice(0, 4)`);
    }
    R["dc04 font controls (step 1)"] = fs1;
    save();
  }

  // ---------- KakaoTalk in-app banner (iPhone UA — no auto-redirect on iOS) ----------
  if (!only || only.has("kakao")) {
    await tab.send("Network.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0" });
    for (const theme of ["light", "dark"]) {
      await setTheme(tab, theme); await setView(tab, "phone");
      await open(tab, "/student");
      const b = await ev(tab, `(() => { const bn = [...document.querySelectorAll('div')].find((d) => /카카오톡 브라우저 접속 중|인앱 브라우저 접속 중/.test(d.innerText || '') && d.className.includes('amber-50')); if (!bn) return null; const r = bn.getBoundingClientRect(); return { h: Math.round(r.height), bg: getComputedStyle(bn).backgroundColor, text: bn.innerText.replace(/\\s+/g, ' ').slice(0, 160), buttons: [...bn.querySelectorAll('button')].map((x) => ({ t: (x.innerText || x.getAttribute('aria-label')).replace(/\\s+/g, ' ').slice(0, 20), w: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height), fs: getComputedStyle(x).fontSize, color: getComputedStyle(x).color, bg: getComputedStyle(x).backgroundColor })) }; })()`);
      R[`cf14 kakao ${theme}`] = { banner: b, file: await shot(tab, `cf14-kakao-banner-${theme}-phone`, { x: 0, y: 0, width: 390, height: 300 }) };
    }
    await tab.send("Network.setUserAgentOverride", { userAgent: "" }).catch(() => {});
    save();
  }
}

async function free(tab) {
  if (only && only.has("freelists")) {
    for (const vp of ["phone", "small"]) {
      await setTheme(tab, "light"); await setView(tab, vp);
      for (const p of ["/student", "/adult", "/passoff-grammar", "/phonics", "/grammar1", "/ld", "/reading"]) {
        await open(tab, p);
        const m = await ev(tab, `(() => { const sec = document.querySelector('section[aria-label="무료 체험"]'); if (!sec) return null; const sr = sec.getBoundingClientRect(); const cs = getComputedStyle(sec); const inner = sr.right - parseFloat(cs.paddingRight); return { cardRight: Math.round(sr.right), innerRight: Math.round(inner), docW: document.documentElement.scrollWidth, links: [...sec.querySelectorAll('a')].map((a) => { const r = a.getBoundingClientRect(); return { text: a.innerText.replace(/\\s+/g, ' ').slice(0, 50), right: Math.round(r.right), w: Math.round(r.width), over: Math.round(r.right - inner) }; }), y: Math.round(sr.top + scrollY) }; })()`);
        let file = null;
        if (m && m.links && m.links.some((l) => l.over > 1)) { await tab.eval(`window.scrollTo(0, ${Math.max(0, m.y - 80)})`); await H.sleep(250); file = await shot(tab, `v2new-freecard${p.replace(/\//g, "_")}-${vp}`); }
        R[`freecard ${vp} ${p}`] = { ...m, file };
      }
      save();
    }
    return;
  }
  for (const [theme, vp] of [["light", "phone"], ["dark", "desktop"], ["light", "small"]]) {
    await setTheme(tab, theme); await setView(tab, vp);
    await open(tab, "/adult/a2-1");
    const pw = await ev(tab, `(() => { const t = (document.querySelector('main') || {}).innerText || ''; return { text: t.slice(0, 500), buttons: [...document.querySelectorAll('main button, main a')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 30)).filter(Boolean).slice(0, 12) }; })()`);
    const MODAL = `(() => { const d = document.querySelector('[role=dialog]'); if (!d) return null; const foot = [...d.querySelectorAll('p')].find((p) => /각 코스/.test(p.innerText)); const close = [...d.querySelectorAll('button')].find((b) => /닫기|✕/.test((b.getAttribute('aria-label') || '') + b.innerText)); const fcs = foot && getComputedStyle(foot); const pur = [...d.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')); return { text: d.innerText.replace(/\\n+/g, ' / ').slice(0, 700), purchaseLinks: pur, readyChip: /구매 링크 준비 중/.test(d.innerText), foot: foot ? { font: fcs.fontFamily.slice(0, 50), size: fcs.fontSize, ls: fcs.letterSpacing } : null, close: close ? { w: Math.round(close.getBoundingClientRect().width), h: Math.round(close.getBoundingClientRect().height) } : null, emoji: (d.innerText.match(/🔑|💡|🛒|👑|🎓/g) || []) }; })()`;
    const c1 = await H.click(tab, `[...document.querySelectorAll('main button, main a')].find((b) => /구매 안내/.test(b.innerText) && b.getBoundingClientRect().width > 0)`, { settle: 900 });
    const m1 = await ev(tab, MODAL);
    const f1 = await shot(tab, `pfl02-cf01-modal-buy-${theme}-${vp}`);
    await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
    await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
    await H.sleep(500);
    const c2 = await H.click(tab, `[...document.querySelectorAll('main button, main a')].find((b) => /^이용권 등록$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0)`, { settle: 900 });
    const m2 = await ev(tab, MODAL);
    R[`free ${theme} ${vp}`] = { paywall: pw, buyClicked: c1.ok, buyModal: m1, regClicked: c2.ok, sameModal: !!(m1 && m2 && m1.text === m2.text), file: f1, paywallFile: null };
    await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
    await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }).catch(() => {});
    save();
  }
}

(async () => {
  const freeMb = os.freemem() / 1024 ** 2;
  for (let i = 0; i < 10 && os.freemem() < 1.2 * 1024 ** 3; i++) { console.log("메모리 부족 — 1분 기다림"); await H.sleep(60000); }
  console.log(`free ${Math.round(freeMb)}MB`);
  const browser = await H.startBrowser(NAME, PORT, { fresh: true });
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params, method = q.request.method;
        let pth = ""; try { pth = new URL(q.request.url).pathname; } catch {}
        const ok = /^(GET|HEAD|OPTIONS)$/.test(method) || (method === "POST" && /^\/api\/license\/(verify|session)$/.test(pth));
        if (ok) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
        else { (R.blocked ||= []).push(`${method} ${pth}`); tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
    await setView(tab, "phone"); await setTheme(tab, "light");
    await H.load(tab, "/ld/d010", { marker: null, settle: 900 });
    const locked = H.PAYWALL_RE.test((await ev(tab, TEXT)) || "");
    R.mode = { free: FREE, d010Locked: locked };
    if (FREE ? !locked : locked) { console.log("멈춤: 이용권 상태가 기대와 다름"); save(); return; }
    if (FREE) await free(tab); else await lic(tab);
    await tab.close();
  } catch (e) {
    R.error = String(e && e.stack || e).slice(0, 800); console.error(e);
  } finally {
    save();
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
    console.log("끝 →", OUTJ);
  }
})();
