#!/usr/bin/env node
/**
 * UI검토-1007 배포 뒤 운영 확인 — 화면 숫자 재기(읽기만).
 * 앱 · 내용 · 기존 도구를 고치지 않는다. 진도 · 이용권을 바꾸는 누름 0: 누르는 것은 단계 탭 · 장 펼침 · 이용권 창 열기뿐.
 * /api/ 로 가는 GET 아닌 요청은 막는다(앱이 열릴 때 스스로 하는 /api/license/verify · session 만 통과).
 *
 *   node verify-prod.cjs lic     이용권 사본(ui1007-pd-v)  — 끝 막대 · READING 3단계 · 장 듣기 줄 · 목록 번쩍임(10번) · 맨 위 단추(6번) · GRAMMAR 처음 · 이용권 창(산 뒤)
 *   node verify-prod.cjs free    이용권 없는 빈 사본        — 무료 카드 넘침(4번) · 잠김 화면(2번) · 이용권 창(3번)
 * 나오는 것(git 밖): docs/qa-2026-09-18/out/ui-1007/after-prod/verify/ · verify-<mode>.json
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const MODE = process.argv[2] === "free" ? "free" : "lic";
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
if (MODE === "free") {
  const empty = path.join(os.tmpdir(), "ui1007pd-empty-profile-src");
  fs.mkdirSync(empty, { recursive: true });
  process.env.KIG_PROFILE_SOURCE = empty;
  process.env.KIG_CLONE_PREFIX = "kig-ui1007pd-free-";
}
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const ROOT = path.join(H.OUT, "ui-1007", "after-prod", "verify");
const RESULT = path.join(H.OUT, "ui-1007", "after-prod", `verify-${MODE}.json`);
fs.mkdirSync(ROOT, { recursive: true });
const PORT = MODE === "free" ? 9964 : 9963;
const out = { mode: MODE, at: new Date().toISOString(), items: {} };
const save = () => fs.writeFileSync(RESULT, JSON.stringify(out, null, 1));
const VIEW = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, touch: true },
  small: { width: 360, height: 780, deviceScaleFactor: 2, mobile: true, touch: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false, touch: false },
};
async function waitMem() {
  for (let i = 0; i < 40; i++) {
    if (os.freemem() >= 1.2 * 1024 ** 3) return true;
    console.log(`memory ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1.2GB wait ${i + 1}`);
    await H.sleep(60000);
  }
  return false;
}
async function setView(tab, vp) {
  const v = VIEW[vp];
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const shot = async (tab, name, q = 72) => {
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: q });
  const f = path.join(ROOT, name + ".jpg");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(r.data, "base64"));
  return path.relative(path.join(H.OUT, "ui-1007", "after-prod"), f).replace(/\\/g, "/");
};
const ev = (tab, e) => tab.eval(e).catch((err) => ({ error: String(err && err.message).slice(0, 160) }));

// ---------- 화면 안에서 재는 함수들 ----------
const FN = {
  endbar: () => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const lum = (s) => { const m = s.match(/[\d.]+/g) || []; const c = m.slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const alpha = (s) => { const m = s.match(/[\d.]+/g) || []; return m.length > 3 ? +m[3] : 1; };
    const main = document.querySelector("main") || document.body;
    const bar = document.querySelector('section[aria-label="강의 마치기"]');
    const btnInfo = (b) => {
      const cs = getComputedStyle(b);
      const bw = parseFloat(cs.borderTopWidth) || 0;
      return { text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60), aria: b.getAttribute("aria-label"), disabled: b.disabled || b.getAttribute("aria-disabled") === "true", tag: b.tagName, href: b.getAttribute("href"), bg: cs.backgroundColor, bgDark: alpha(cs.backgroundColor) > 0.9 && lum(cs.backgroundColor) < 0.2, borderPx: bw, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) };
    };
    const inBar = bar ? [...bar.querySelectorAll("button, a[href]")].filter(vis).map(btnInfo) : [];
    const allBtns = [...main.querySelectorAll("button, a[href]")].filter(vis);
    const dark = allBtns.map(btnInfo).filter((b) => b.bgDark);
    const inBoxBtns = [...document.querySelectorAll("[data-completion] button, [data-completion] a")].filter(vis).length;
    const nextEls = allBtns.filter((b) => /다음 강의/.test((b.innerText || "") + (b.getAttribute("aria-label") || "")));
    return {
      hasBar: !!bar, barText: bar ? bar.innerText.replace(/\s+/g, " ").trim().slice(0, 300) : null, buttons: inBar,
      darkFilled: dark.map((b) => b.text || b.aria), darkFilledCount: dark.length, inBoxButtons: inBoxBtns,
      nextCount: nextEls.length, doneText: /학습 완료함/.test(main.innerText), reasonText: (main.innerText.match(/(각각 \d+문장 이상 하면 완료할 수 있어요\.?|1단계에서 한 문제를 확인하면 완료할 수 있어요\.?|[^.\n]*이 장을 마치면 열려요\.?)/g) || []).slice(0, 4),
      nextLockedLine: (document.querySelector("[data-next-locked]") || {}).innerText || null,
      under12: [...main.querySelectorAll("*")].filter((el) => el.children.length === 0 && (el.innerText || "").trim() && vis(el) && parseFloat(getComputedStyle(el).fontSize) < 12).length,
      docW: document.documentElement.scrollWidth, vw: innerWidth,
    };
  },
  freecard: () => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const card = document.querySelector('[aria-label="무료 체험"]');
    if (!card) return { card: false };
    const cr = card.getBoundingClientRect();
    const btns = [...card.querySelectorAll("a, button")].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return { text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 70), overRight: +(r.right - cr.right).toFixed(1), overLeft: +(cr.left - r.left).toFixed(1), h: Math.round(r.height), w: Math.round(r.width) }; });
    const maxOver = Math.max(0, ...btns.map((b) => Math.max(b.overRight, b.overLeft)));
    return { card: true, cardW: Math.round(cr.width), btns, maxOver, docW: document.documentElement.scrollWidth, vw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
  },
  reading3: () => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const main = document.querySelector("main") || document.body;
    const segs = [...main.querySelectorAll("button")].filter(vis).filter((b) => /^(영어 · 한글|영어만|한글만)$/.test((b.innerText || "").replace(/\s+/g, " ").trim()));
    return { found: segs.length, segs: segs.map((b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const lines = Math.round(r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4); const rng = document.createRange(); rng.selectNodeContents(b); const rects = [...rng.getClientRects()].map((x) => Math.round(x.top)); return { text: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), textLines: new Set(rects).size, overflowX: b.scrollWidth > b.clientWidth + 1, pressed: b.getAttribute("aria-pressed") }; }), docW: document.documentElement.scrollWidth, vw: innerWidth };
  },
  chapterAudio: () => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const els = [...document.querySelectorAll("[data-chapter-audio]")].filter(vis);
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      const leaf = [...el.querySelectorAll("*")].filter((x) => x.children.length === 0 && (x.innerText || "").trim() && vis(x));
      const ctl = [el, ...el.querySelectorAll("button, a, [role=button]")].filter(vis).map((x) => { const q = x.getBoundingClientRect(); return { tag: x.tagName, text: (x.innerText || x.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 50), w: Math.round(q.width), h: Math.round(q.height) }; });
      const bg = getComputedStyle(el).backgroundColor, bd = getComputedStyle(el).borderTopColor;
      return { text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 120), aria: el.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), minFont: Math.min(...leaf.map((x) => parseFloat(getComputedStyle(x).fontSize))), under12: leaf.filter((x) => parseFloat(getComputedStyle(x).fontSize) < 12).length, ctl, bg, bd, emoji: /\p{Extended_Pictographic}/u.test(el.innerText), oneLine: leaf.every((x) => { const g = document.createRange(); g.selectNodeContents(x); return new Set([...g.getClientRects()].map((q) => Math.round(q.top))).size <= 1; }) };
    });
  },
  topButton: () => {
    const s = document.querySelector('section[aria-label="진도"]');
    const a = s && s.querySelector("a");
    return { section: s ? s.innerText.replace(/\s+/g, " ").trim().slice(0, 200) : null, topLink: a ? { text: a.innerText.replace(/\s+/g, " ").trim().slice(0, 120), href: a.getAttribute("href") } : null };
  },
  flashFrame: () => {
    const main = document.querySelector("main") || document.body;
    const t = main.innerText || "";
    const bad = [];
    for (const re of [/무료로 먼저 해 보기/, /이용권 등록 후 열립니다/, /이용권 등록 후 열림/, /1·2강 무료/, /\n무료\n/, /🔒/]) if (re.test(t)) bad.push(String(re));
    const lockSvg = [...main.querySelectorAll("svg[data-icon='lock'], svg[aria-label*='잠'], [aria-label*='잠김'], [aria-label*='잠겨']")].length;
    const free = document.querySelector('[aria-label="무료 체험"]');
    return { len: t.length, bad, lockSvg, freeCard: !!free, pending: document.querySelectorAll("[data-license-pending]").length, h1: (document.querySelector("h1") || {}).innerText || null, url: location.pathname };
  },
  modal: () => {
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { open: false };
    const leaf = [...d.querySelectorAll("*")].filter((x) => x.children.length === 0 && (x.innerText || "").trim() && vis(x));
    const ctl = [...d.querySelectorAll("button, a, input")].filter(vis).map((x) => { const r = x.getBoundingClientRect(); return { text: (x.innerText || x.getAttribute("aria-label") || x.getAttribute("placeholder") || x.tagName).replace(/\s+/g, " ").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), px: parseFloat(getComputedStyle(x).fontSize) }; });
    const t = d.innerText;
    return { open: true, text: t.replace(/\s+/g, " ").trim().slice(0, 700), emoji: (t.match(/\p{Extended_Pictographic}/gu) || []).length, under12: leaf.filter((x) => parseFloat(getComputedStyle(x).fontSize) < 12).length, minFont: Math.min(...leaf.map((x) => parseFloat(getComputedStyle(x).fontSize))), purchaseGuide: /구매 안내/.test(t), buyLink: /이용권 구매하기/.test(t), comingSoon: /구매 링크 준비 중/.test(t), ctl, docW: document.documentElement.scrollWidth, vw: innerWidth, smallCtl: ctl.filter((c) => (c.w < 44 || c.h < 44) && c.text !== "").length };
  },
  lock: () => {
    const main = document.querySelector("main") || document.body;
    const t = main.innerText || "";
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const btns = [...main.querySelectorAll("button, a[href]")].filter(vis).map((b) => ({ text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 50), href: b.getAttribute("href"), dark: false }));
    return { paywall: !!document.querySelector("[data-kig-paywall]"), purchaseGuide: (t.match(/구매 안내/g) || []).length, register: btns.filter((b) => /이용권 등록/.test(b.text)).length, buy: (t.match(/이용권 구매하기/g) || []).length, comingSoon: /구매 링크 준비 중/.test(t), btns: btns.slice(0, 12), markers: ["ALL-PASS ONLY", "STUDENT PASS", "ALL-PASS"].filter((m) => t.includes(m)) };
  },
  maskCode: () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0, node;
    while ((node = w.nextNode())) { if (/[A-Z0-9]{3,}-[A-Z0-9*•]{3,}-?[A-Z0-9*•-]*/.test(node.nodeValue) && !/XXXX/.test(node.nodeValue)) { node.nodeValue = node.nodeValue.replace(/[A-Z0-9]{3,}-[A-Z0-9*•]{3,}-?[A-Z0-9*•-]*/g, "••••-••••"); n++; } }
    return n;
  },
};
const call = (tab, k) => ev(tab, "(" + FN[k].toString() + ")()");

async function lastStep(tab) {
  const list = await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].filter((b) => b.offsetParent).map((b) => +b.getAttribute('data-step-tab'))`);
  const arr = Array.isArray(list) ? list.filter(Number.isFinite).sort((a, b) => a - b) : [];
  return arr;
}
async function gotoStep(tab, k) {
  return H.click(tab, `document.querySelector('[data-step-tab="${k}"]')`, { settle: 900, refuseCovered: true });
}
async function toBottom(tab) {
  const h = await tab.eval("document.documentElement.scrollHeight").catch(() => 0);
  await tab.eval(`window.scrollTo(0, ${h})`).catch(() => {});
  await H.sleep(500);
}

process.on("unhandledRejection", () => {});
(async () => {
  if (!(await waitMem())) { console.log("stop: memory"); process.exitCode = 4; return; }
  const browser = await H.startBrowser(`ui1007-pd-${MODE === "free" ? "vf" : "v"}`, PORT, { fresh: true });
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    const orig = tab.onMessage.bind(tab);
    const blocked = [];
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params, method = q.request.method;
        let pth = ""; try { pth = new URL(q.request.url).pathname; } catch {}
        const ok = /^(GET|HEAD|OPTIONS)$/.test(method) || (method === "POST" && /^\/api\/license\/(verify|session)$/.test(pth));
        if (ok) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
        else { blocked.push(`${method} ${pth}`); tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
    await setView(tab, "phone");
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await H.load(tab, "/ld/d010", { marker: null, settle: 900 });
    const lockedTxt = await ev(tab, `((document.querySelector('main')||document.body).innerText||'')`);
    const locked = H.PAYWALL_RE.test(lockedTxt || "");
    out.profileCheck = { paidLessonLocked: locked };
    if (MODE === "free" ? !locked : locked) { console.log("stop: profile mismatch"); out.stop = "profile mismatch"; save(); process.exitCode = 3; return; }

    if (MODE === "lic") {
      // ---- 6번: 이 기기에 최근 강의 기록이 없는 새 사본에서 목록 맨 위 단추(강의 쪽을 열기 전에 먼저) ----
      out.items.topButtonFresh = [];
      for (const [p, vp] of [["/student", "phone"], ["/passoff-grammar", "phone"], ["/student", "desktop"], ["/adult", "phone"]]) {
        await setView(tab, vp);
        await H.load(tab, p, { marker: null, settle: 1500 });
        await H.sleep(2500);
        const top = await call(tab, "topButton");
        const f0 = await shot(tab, `top_${p.replace(/\//g, "")}_${vp}`);
        out.items.topButtonFresh.push({ page: p, vp, ...top, shot: f0 });
        console.log("topFresh", p, vp, JSON.stringify(top.topLink));
        save();
      }
      // ---- 1·5번: 끝 막대(마지막 단계 맨 아래) ----
      out.items.endbar = [];
      for (const [p, vp] of [["/student/s1-1", "phone"], ["/student/s11-4", "phone"], ["/student/s1-6", "phone"], ["/adult/a1-2", "phone"], ["/adult/a6-2", "phone"], ["/student/s1-1", "desktop"], ["/adult/a1-2", "desktop"], ["/grammar1/gh1-006", "phone"], ["/grammar2/gh2-007", "phone"], ["/grammar1/gh1-006", "desktop"]]) {
        await setView(tab, vp);
        await H.load(tab, p, { marker: null, settle: 900 });
        await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 20000);
        await H.sleep(800);
        const steps = await lastStep(tab);
        const open = await call(tab, "endbar");
        const last = steps[steps.length - 1];
        const c = last ? await gotoStep(tab, last) : { ok: false };
        await tab.eval("window.scrollTo(0,0)").catch(() => {});
        await toBottom(tab);
        const m = await call(tab, "endbar");
        const f = await shot(tab, `endbar_${p.replace(/\//g, "_").replace(/^_/, "")}_${vp}`);
        out.items.endbar.push({ page: p, vp, steps, lastStep: last, clickedLast: c.ok, atLastStep: m, shot: f });
        console.log("endbar", p, vp, m.darkFilledCount, JSON.stringify(m.buttons && m.buttons.map((b) => b.text)));
        save();
      }
      // ---- 9번: READING 3단계 ----
      out.items.reading3 = [];
      for (const vp of ["phone", "small", "desktop"]) {
        await setView(tab, vp);
        await H.load(tab, "/reading/pr001", { marker: null, settle: 900 });
        await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 20000);
        const c = await gotoStep(tab, 3);
        await H.sleep(600);
        await tab.eval("window.scrollTo(0,0)").catch(() => {});
        const m = await call(tab, "reading3");
        // 세 단추가 보이는 곳으로
        await ev(tab, `(() => { const b = [...document.querySelectorAll('main button')].find((x) => /^영어 · 한글$/.test((x.innerText||'').replace(/\\s+/g,' ').trim())); if (b) window.scrollTo(0, Math.max(0, b.getBoundingClientRect().top + scrollY - 200)); })()`);
        await H.sleep(300);
        const f = await shot(tab, `reading3_${vp}`);
        out.items.reading3.push({ vp, clicked: c.ok, ...m, shot: f });
        console.log("reading3", vp, JSON.stringify(m.segs));
        save();
      }
      // ---- 8번: 장 듣기 줄 + 6번 맨 위 단추 ----
      out.items.chapterAudio = [];
      out.items.topButton = [];
      for (const [p, vp] of [["/student", "phone"], ["/student", "desktop"], ["/adult", "phone"], ["/passoff-grammar", "phone"]]) {
        await setView(tab, vp);
        await H.load(tab, p, { marker: null, settle: 1500 });
        await H.sleep(2500);
        const top = await call(tab, "topButton");
        out.items.topButton.push({ page: p, vp, ...top });
        console.log("top", p, vp, JSON.stringify(top.topLink));
        const c = await H.click(tab, `[...document.querySelectorAll('main button[aria-expanded]')].find((b) => b.getAttribute('aria-expanded') === 'false')`, { settle: 1200, refuseCovered: true });
        await H.sleep(800);
        const ca = await call(tab, "chapterAudio");
        await ev(tab, `(() => { const e = document.querySelector('[data-chapter-audio]'); if (e) window.scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 120)); })()`);
        await H.sleep(300);
        const f = await shot(tab, `chapteraudio_${p.replace(/\//g, "")}_${vp}`);
        out.items.chapterAudio.push({ page: p, vp, expanded: c.ok, found: Array.isArray(ca) ? ca.length : 0, bars: ca, shot: f });
        console.log("chapterAudio", p, vp, JSON.stringify(Array.isArray(ca) ? ca.slice(0, 1) : ca).slice(0, 300));
        save();
      }
      // ---- 이용권 창(산 뒤): 3번 ----
      out.items.licenseModalLicensed = [];
      for (const theme of ["light", "dark"]) {
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
        for (const vp of ["phone", "desktop"]) {
          await setView(tab, vp);
          await H.load(tab, "/student", { marker: null, settle: 1500 });
          await H.sleep(1500);
          let c;
          if (vp === 'phone') { await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 900 }); }
          c = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => (/이용 중 · 확인/.test(b.innerText || '') || /상태 확인/.test(b.getAttribute('title') || '')) && b.offsetParent)`, { settle: 1200 });
          const masked = await ev(tab, "(" + FN.maskCode.toString() + ")()");
          const m = await call(tab, "modal");
          const f = await shot(tab, `licensemodal_licensed_${theme}_${vp}`);
          out.items.licenseModalLicensed.push({ theme, vp, clicked: c.ok, clickedText: c.text || null, masked, ...m, shot: f });
          console.log("modal(lic)", theme, vp, c.ok, m.open, "emoji", m.emoji, "under12", m.under12);
          save();
        }
      }
      await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
      // ---- 10번: 목록 번쩍임(0.1초 간격 6장) ----
      out.items.flash = [];
      await tab.send("Network.enable").catch(() => {});
      for (const [p, vp] of [["/passoff-grammar", "phone"], ["/student", "phone"], ["/adult", "phone"], ["/reading", "phone"], ["/passoff-grammar", "desktop"], ["/student", "desktop"]]) {
        for (let rep = 1; rep <= 2; rep++) {
          await setView(tab, vp);
          await H.load(tab, "/nope", { marker: null, settle: 300 }).catch(() => {});
          await tab.send("Network.setCacheDisabled", { cacheDisabled: true }).catch(() => {});
          const frames = [];
          const t0 = Date.now();
          await tab.send("Page.navigate", { url: `${H.BASE}${p}` });
          for (let i = 1; i <= 6; i++) {
            const t = Date.now() - t0;
            const m = await call(tab, "flashFrame");
            const f = await shot(tab, `flash/${p.replace(/\//g, "")}_${vp}_r${rep}_${i}`, 60);
            frames.push({ i, ms: t, ...m, shot: f });
            await H.sleep(100);
          }
          out.items.flash.push({ page: p, vp, rep, frames, badFrames: frames.filter((x) => (x.bad && x.bad.length) || x.freeCard).length, totalFrames: frames.length });
          console.log("flash", p, vp, rep, frames.map((x) => `${x.ms}ms:${x.len}:${x.bad ? x.bad.length : "err"}${x.freeCard ? "F" : ""}`).join(" "));
          save();
        }
      }
      await tab.send("Network.setCacheDisabled", { cacheDisabled: false }).catch(() => {});
    } else {
      // ---- 4번: STUDENT 무료 카드 넘침 ----
      out.items.freecard = [];
      for (const [p, vp] of [["/student", "phone"], ["/student", "small"], ["/student", "desktop"], ["/adult", "phone"], ["/passoff-grammar", "phone"], ["/phonics", "phone"]]) {
        await setView(tab, vp);
        await H.load(tab, p, { marker: null, settle: 1500 });
        await H.sleep(1200);
        const m = await call(tab, "freecard");
        const f = await shot(tab, `freecard_${p.replace(/\//g, "")}_${vp}`);
        out.items.freecard.push({ page: p, vp, ...m, shot: f });
        console.log("freecard", p, vp, JSON.stringify({ over: m.maxOver, h: m.hscroll }));
        save();
      }
      // ---- 2·3번: 잠김 화면 + 이용권 창 ----
      out.items.lock = [];
      for (const theme of ["light", "dark"]) {
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
        for (const vp of ["phone", "desktop"]) {
          await setView(tab, vp);
          await H.load(tab, "/adult/a2-1", { marker: null, settle: 1500 });
          await H.sleep(1000);
          const l = await call(tab, "lock");
          const f1 = await shot(tab, `lock_adult_a2-1_${theme}_${vp}`);
          const c = await H.click(tab, `[...document.querySelectorAll('main button, main a, header button')].find((b) => /이용권 등록/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1200 });
          const m = await call(tab, "modal");
          const f2 = await shot(tab, `licensemodal_free_${theme}_${vp}`);
          out.items.lock.push({ theme, vp, lock: l, clicked: c.ok, clickedText: c.text || null, modal: m, shots: [f1, f2] });
          console.log("lock", theme, vp, JSON.stringify({ guide: l.purchaseGuide, reg: l.register, buy: l.buy }), "modal emoji", m.emoji, "under12", m.under12, "guide", m.purchaseGuide, "soon", m.comingSoon);
          save();
        }
      }
    }
    out.blockedRequests = blocked;
    save();
    await tab.close();
  } finally {
    browser.proc.kill();
    try { require("child_process").execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
    console.log("done", RESULT);
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
