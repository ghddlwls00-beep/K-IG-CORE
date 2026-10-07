#!/usr/bin/env node
/**
 * UI검토-1007 고침2(dc68238e) 배포 뒤 운영 확인 — 숫자 재기(읽기만). 앱 · 내용 · 기존 도구를 고치지 않는다.
 * 누르는 것: 단계 탭 · 장 펼침 · 검색 열기 · 이용권 창 열기 · (검색 창 안) Tab · Esc — 진도 · 이용권을 바꾸는 누름 0.
 * /api/ 로 가는 GET 아닌 요청은 막는다(앱이 열릴 때 스스로 하는 /api/license/verify · session 만 통과).
 *
 *   node verify-prod-b.cjs lic     이용권 사본 — 번쩍임(10번) · 끝 막대 어둠 · PASS-OFF 목록 · 진도 막대 · 구성도 · pr154 · 이용권 창 · ADULT 탭 · 맨 위 단추
 *   node verify-prod-b.cjs free    이용권 없는 빈 사본 — 무료 강의 8개 모든 단계 훑기 · 검색 창 · 목록 글 · 404 · 카카오 · 첫 쪽
 * 나오는 것(git 밖): docs/qa-2026-09-18/out/ui-1007/after-prod-b/verify/ · verify-<mode>.json
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const MODE = process.argv[2] === "free" ? "free" : "lic";
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
if (MODE === "free") {
  const empty = path.join(os.tmpdir(), "ui1007pd3-empty-profile-src");
  fs.mkdirSync(empty, { recursive: true });
  process.env.KIG_PROFILE_SOURCE = empty;
  process.env.KIG_CLONE_PREFIX = "kig-ui1007pd3-free-";
}
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const AFTER = path.join(H.OUT, "ui-1007", "after-prod-b");
const ROOT = path.join(AFTER, "verify");
const RESULT = path.join(AFTER, `verify-${MODE}${ONLY.length ? "-" + ONLY.join("+") : ""}.json`);
fs.mkdirSync(ROOT, { recursive: true });
const PORT = MODE === "free" ? 9964 : 9960;
const out = { mode: MODE, at: new Date().toISOString(), base: H.BASE, items: {} };
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
  const v = typeof vp === "string" ? VIEW[vp] : vp;
  await tab.send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", v.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const setTheme = (tab, t) => tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: t }] });
const shot = async (tab, name, q = 72) => {
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: q });
  const f = path.join(ROOT, name + ".jpg");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(r.data, "base64"));
  return path.relative(AFTER, f).replace(/\\/g, "/");
};
const ev = (tab, e) => tab.eval(e).catch((err) => ({ error: String(err && err.message).slice(0, 160) }));
const key = async (tab, k, code, vk, mods = 0) => {
  await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await H.sleep(70);
};

// ---------- 화면 안에서 재는 함수들(함수 그대로 문자열로 보냄) ----------
function helpers() {
  const vis = (el) => { if (!(el.offsetParent || el.getClientRects().length)) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity || "1") > 0.05; };
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (s) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (t, u) => { const a = t[3]; return [t[0] * a + u[0] * (1 - a), t[1] * a + u[1] * (1 - a), t[2] * a + u[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); };
  // 요소 뒤(부모들)의 바탕색 — 불투명 바탕이 나올 때까지 겹침
  const bgBehind = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); const c = rgba(cs.backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; } }
    let base = rgba(getComputedStyle(document.documentElement).backgroundColor);
    if (base[3] < 0.999) base = rgba(getComputedStyle(document.body).backgroundColor);
    if (base[3] < 0.999) base = [255, 255, 255, 1];
    let acc = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop() : base;
    while (layers.length) acc = over(layers.pop(), acc);
    return acc;
  };
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  const label = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 50);
  return { vis, rgba, over, lum, ratio, bgBehind, box, label };
}
const HELP = "(" + helpers.toString() + ")()";

// 단계 하나를 훑어 숫자로 — 모든 과정 공통
function surveyFn() {
  const Hh = HELP_INLINE();
  const { vis, rgba, over, ratio, bgBehind, box, label } = Hh;
  const main = document.querySelector("main") || document.body;
  const vw = innerWidth;
  const mtext = main.innerText || "";
  const count = (re) => (mtext.match(re) || []).length;
  // 입력 칸 테두리 대비(51)
  const inputs = [...main.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea")].filter(vis).filter((e) => !e.closest('[role="dialog"]')).map((e) => {
    const cs = getComputedStyle(e); const bw = parseFloat(cs.borderTopWidth) || 0;
    const bg = bgBehind(e.parentElement || e);
    const bc = rgba(cs.borderTopColor); const bcc = over(bc, bg);
    return { name: label(e).slice(0, 24), tag: e.tagName, bw, ratio: ratio(bcc, bg), px: parseFloat(cs.fontSize), h: Math.round(e.getBoundingClientRect().height), cls: (e.className || "").toString().match(/border-[\w-]+/g) };
  });
  // 스위치(56)
  const switches = [...main.querySelectorAll('[role="switch"]')].filter(vis).map((e) => {
    const r = e.getBoundingClientRect(); const par = bgBehind(e.parentElement || e);
    const parts = [e, ...e.querySelectorAll("span, div, i")].map((x) => { const cs = getComputedStyle(x); const b = rgba(cs.backgroundColor); const bd = rgba(cs.borderTopColor); const rr = x.getBoundingClientRect(); return { tag: x.tagName, w: Math.round(rr.width), h: Math.round(rr.height), bg: b[3] > 0.05 ? ratio(over(b, par), par) : null, bd: (parseFloat(cs.borderTopWidth) > 0 && bd[3] > 0.05) ? ratio(over(bd, par), par) : null }; }).filter((p) => p.bg !== null || p.bd !== null);
    const sec = e.closest("section, [data-step], main");
    return { label: label(e), checked: e.getAttribute("aria-checked"), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), right: Math.round(r.right), y: Math.round(r.top + scrollY), secRight: sec ? Math.round(sec.getBoundingClientRect().right) : null, parts: parts.slice(0, 5) };
  });
  const hand = [...main.querySelectorAll("button")].filter(vis).filter((b) => !b.hasAttribute("role") && /켜|끄|가리기|보기$/.test(b.innerText || "") && b.querySelector('span[class*="rounded-full"]')).length;
  // 단계 탭 한 줄(34)
  const tabs = [...document.querySelectorAll("[data-step-tab]")].filter(vis).map((b) => {
    const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); const ys = [];
    for (let t = tw.nextNode(); t; t = tw.nextNode()) { if (!t.textContent.trim()) continue; const pr = t.parentElement.getBoundingClientRect(); if (pr.width <= 1.5 || pr.height <= 1.5) continue; const rg = document.createRange(); rg.selectNodeContents(t); for (const x of rg.getClientRects()) if (x.width > 2 && x.height > 4) ys.push(x.top + x.height / 2); }
    ys.sort((a, c) => a - c); const tops = new Set(); let last = -1e9; for (const y of ys) { if (y - last > 8) tops.add(Math.round(y)); last = y; }
    const nav = b.closest("nav"); const bar = nav ? nav.getBoundingClientRect() : { left: 0, right: vw }; const bb = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return { n: b.getAttribute("data-step-tab"), lines: tops.size, out: Math.max(0, Math.round(bb.right - bar.right), Math.round(bar.left - bb.left)), w: Math.round(bb.width), h: Math.round(bb.height), cur: b.getAttribute("aria-pressed") === "true", ring: b.getAttribute("aria-pressed") === "true" ? cs.boxShadow : null, text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 30) };
  });
  const h1 = document.querySelector("h1");
  const gold = [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && vis(e) && !e.closest("[data-step-tab]") && /^\s*\d\s*단계\s*$/.test(e.innerText || "")).map((e) => ({ text: e.innerText.trim(), color: getComputedStyle(e).color, px: parseFloat(getComputedStyle(e).fontSize) }));
  const aa = [...main.querySelectorAll("button")].filter(vis).filter((b) => /^Aa$/.test((b.innerText || "").trim()) || /글자 크기|글자 설정/.test(b.getAttribute("aria-label") || "")).map((b) => ({ ...box(b), label: label(b) }));
  const en = [...main.querySelectorAll("[data-en]")].filter(vis);
  const serif = new Set([...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && (e.innerText || "").trim().length > 12 && vis(e)).map((e) => getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim()));
  const interactive = [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary")].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1.5 && r.height > 1.5; });
  const small44 = interactive.filter((e) => { const r = e.getBoundingClientRect(); return (r.width < 44 || r.height < 44) && getComputedStyle(e).display !== "inline"; });
  const leaf = [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && (e.innerText || "").trim() && vis(e) && e.getBoundingClientRect().width > 1.5);
  const under12 = leaf.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12);
  const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select")].filter(vis);
  // LISTENING 4 · 5 단계 · 2 단계 사실(26 · 27 · 28 · 29)
  const find = (re, sel = "button, p, span, div, label") => [...main.querySelectorAll(sel)].filter((e) => vis(e) && re.test((e.innerText || "").replace(/\s+/g, " ").trim()) && (e.innerText || "").length < 60);
  const mini = (e) => (e ? { ...box(e), text: label(e) } : null);
  const counter = find(/^문장\s*\d+\s*\/\s*\d+$/, "p, span, div").sort((a, b) => a.children.length - b.children.length)[0];
  const listen = find(/^문장 듣기$/, "button")[0];
  const hideSw = [...main.querySelectorAll('[role="switch"]')].filter(vis).find((e) => /글 가리기/.test(e.innerText || ""));
  const mic = [...main.querySelectorAll("button")].filter(vis).find((e) => /마이크|말하기|녹음/.test((e.innerText || "") + (e.getAttribute("aria-label") || "")));
  const blank = [...main.querySelectorAll("[data-blank-rows] > li[data-blank]")].filter(vis);
  const blankCols = new Set(blank.map((e) => Math.round(e.getBoundingClientRect().left))).size;
  const nums = [...main.querySelectorAll("button")].filter(vis).filter((b) => /^[1-9]$/.test((b.innerText || "").trim()) && b.getBoundingClientRect().width >= 30 && b.getBoundingClientRect().width <= 60);
  const numTops = new Set(nums.map((b) => Math.round(b.getBoundingClientRect().top))).size;
  const total = main.querySelector("[data-passoff-view]");
  const kws = ["이 단계 마침", "앞 문장을 연 뒤에 차례가 와요", "누구를 가리킬까요", "굵게", "빈칸에 직접 쓰기", "직접 쓰기", "점선 칸", "회색 칸", "뜻 모두 보기", "뜻 가리기", "영어 가리기", "글 가리기", "안다고 표시", "다음 묶음", "가려 두었어요", "빈 칸", "빈칸", "해석 모두 보기", "문장 번호"];
  const kw = {}; for (const k of kws) { const n = mtext.split(k).length - 1; if (n) kw[k] = n; }
  const bundlesLeft = !!document.querySelector("[data-bundles-left]");
  return {
    url: location.pathname, vw, vh: innerHeight, docW: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw + 1,
    gutter: getComputedStyle(document.documentElement).scrollbarGutter, htmlClientW: document.documentElement.clientWidth,
    h1: h1 ? { text: h1.innerText.trim().slice(0, 50), x: Math.round(h1.getBoundingClientRect().left), y: Math.round(h1.getBoundingClientRect().top + scrollY), w: Math.round(h1.getBoundingClientRect().width) } : null,
    tabs, tabLinesMax: Math.max(0, ...tabs.map((t) => t.lines)), tabOutMax: Math.max(0, ...tabs.map((t) => t.out)),
    gold, aa, inputs, switches, handSwitches: hand, kw, bundlesLeft,
    enCount: en.length, enInButton: en.filter((e) => e.closest("button, [role=button], a")).length, play: [...main.querySelectorAll('[data-action="play"]')].filter(vis).length,
    fonts: [...serif].slice(0, 6),
    small44: small44.length, small44s: small44.slice(0, 6).map((e) => ({ t: label(e).slice(0, 24), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })), under12: under12.length, under12s: under12.slice(0, 4).map((e) => (e.innerText || "").trim().slice(0, 20)),
    zoomFields: fields.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length,
    ld: { counter: mini(counter), listen: mini(listen), hideSw: mini(hideSw), mic: mini(mic), blankRows: blank.length, blankCols },
    nums: { count: nums.length, tops: numTops, first: nums[0] ? box(nums[0]) : null, last: nums.length ? box(nums[nums.length - 1]) : null },
    passoff: total ? { step: total.getAttribute("data-step") } : null,
  };
}
function HELP_INLINE() { return HELP_PLACEHOLDER; }
// surveyFn 안의 HELP_INLINE() 는 helpers 본문으로 치환해 보낸다
const SURVEY = "(" + surveyFn.toString().replace("HELP_INLINE()", HELP) + ")()";
const survey = (tab) => ev(tab, SURVEY);
const HELP_PLACEHOLDER = null;
const FN = {
  // 끝 막대(55 · 59): 꺼진 '이 강의 학습 완료' 단추의 테두리 · 글 대비
  endbar: function () {
    const { vis, rgba, over, ratio, bgBehind } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const bar = document.querySelector('section[aria-label="강의 마치기"]');
    if (!bar) return { hasBar: false };
    const btns = [...bar.querySelectorAll("button, a[href]")].filter(vis).map((b) => {
      const cs = getComputedStyle(b); const bg = bgBehind(b.parentElement || b);
      const bw = parseFloat(cs.borderTopWidth) || 0; const bc = over(rgba(cs.borderTopColor), bg);
      const own = rgba(cs.backgroundColor); const surface = own[3] > 0.05 ? over(own, bg) : bg;
      const fg = over(rgba(cs.color), surface);
      const r = b.getBoundingClientRect();
      return { text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40), aria: b.getAttribute("aria-label"), disabled: b.disabled || b.getAttribute("aria-disabled") === "true", pressed: b.getAttribute("aria-pressed"), tag: b.tagName, bw, borderRatio: bw ? ratio(bc, bg) : 0, textRatio: ratio(fg, surface), filled: own[3] > 0.9, bgTransparent: own[3] < 0.05, opacity: cs.opacity, w: Math.round(r.width), h: Math.round(r.height) };
    });
    return { hasBar: true, text: bar.innerText.replace(/\s+/g, " ").trim().slice(0, 240), btns, reason: (main.innerText.match(/(각각 \d+문장 이상 하면 완료할 수 있어요\.?|1단계에서 한 문제를 확인하면 완료할 수 있어요\.?|[^.\n]*이 장을 마치면 열려요\.?)/g) || []).slice(0, 3), docW: document.documentElement.scrollWidth, vw: innerWidth };
  },
  modal: function () {
    const { vis, rgba, over, ratio, bgBehind } = HELP_INLINE();
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { open: false };
    const leaf = [...d.querySelectorAll("*")].filter((x) => x.children.length === 0 && (x.innerText || "").trim() && vis(x));
    const ctl = [...d.querySelectorAll("button, a, input")].filter(vis).map((x) => { const r = x.getBoundingClientRect(); const cs = getComputedStyle(x); const bg = bgBehind(x.parentElement || x); const bw = parseFloat(cs.borderTopWidth) || 0; return { text: (x.innerText || x.getAttribute("aria-label") || x.getAttribute("placeholder") || x.tagName).replace(/\s+/g, " ").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), px: parseFloat(cs.fontSize), disabled: x.disabled || x.getAttribute("aria-disabled") === "true", bw, borderRatio: bw ? ratio(over(rgba(cs.borderTopColor), bg), bg) : 0, filled: rgba(cs.backgroundColor)[3] > 0.9 }; });
    // 창 뒤 덮개 black/60 가정 → 페이지 바탕 위. 창(panel) = 대화상자 안(자기 포함)에서 테두리가 있는 가장 큰 상자
    const behind = rgba("rgba(0,0,0,0.6)");
    const page = bgBehind(document.body); const dim = over(behind, page);
    const panelEl = [d, ...d.querySelectorAll("*")].filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0 && getComputedStyle(e).borderTopStyle !== "none").sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0] || d;
    const dcs = getComputedStyle(panelEl);
    const edge = over(rgba(dcs.borderTopColor), dim);
    const t = d.innerText;
    return { open: true, text: t.replace(/\s+/g, " ").trim().slice(0, 500), emoji: (t.match(/\p{Extended_Pictographic}/gu) || []).length, under12: leaf.filter((x) => parseFloat(getComputedStyle(x).fontSize) < 12).length, ctl, borderW: parseFloat(dcs.borderTopWidth), edgeRatio: ratio(edge, dim), docW: document.documentElement.scrollWidth, vw: innerWidth, smallCtl: ctl.filter((c) => (c.w < 44 || c.h < 44) && c.text !== "").length, purchaseGuide: /구매 안내/.test(t), comingSoon: /구매 링크 준비 중/.test(t) };
  },
  maskCode: function () {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0, node;
    while ((node = w.nextNode())) { if (/[A-Z0-9]{3,}-[A-Z0-9*•]{3,}-?[A-Z0-9*•-]*/.test(node.nodeValue) && !/XXXX/.test(node.nodeValue)) { node.nodeValue = node.nodeValue.replace(/[A-Z0-9]{3,}-[A-Z0-9*•]{3,}-?[A-Z0-9*•-]*/g, "••••-••••"); n++; } }
    document.querySelectorAll("input").forEach((i) => { if (i.type !== "hidden" && i.value) { try { i.value = ""; } catch (e) {} } });
    return n;
  },
  topButton: function () {
    const s = document.querySelector('section[aria-label="진도"]');
    const a = s && s.querySelector("a");
    const t = document.body.innerText || "";
    const m = t.match(/(\d+)\s*\/\s*(\d+)\s*개\s*완료/);
    return { section: s ? s.innerText.replace(/\s+/g, " ").trim().slice(0, 200) : null, topLink: a ? { text: a.innerText.replace(/\s+/g, " ").trim().slice(0, 120), href: a.getAttribute("href") } : null, progress: m ? `${m[1]}/${m[2]}` : null };
  },
  // 진도 막대 바탕(57) · PASS-OFF 목록 줄(33)
  listFacts: function () {
    const { vis, rgba, over, ratio, bgBehind } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const tracks = [...document.querySelectorAll('[class*="bg-track"]')].filter(vis).slice(0, 6).map((e) => { const par = bgBehind(e.parentElement || e); const c = rgba(getComputedStyle(e).backgroundColor); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), ratio: ratio(over(c, par), par) }; });
    const lines = (main.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const prog = lines.filter((l) => /진행\s*\d+%/.test(l));
    const nums = [...main.querySelectorAll("li, a, div")].filter((e) => e.children.length === 0 && vis(e) && /^\d+-\d+$/.test((e.innerText || "").trim())).slice(0, 8).map((e) => ({ t: e.innerText.trim(), px: parseFloat(getComputedStyle(e).fontSize), w: Math.round(e.getBoundingClientRect().width) }));
    const tnums = [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && vis(e) && /^Topic \d+-\d+$/.test((e.innerText || "").trim())).length;
    const head = lines.find((l) => /개 강의/.test(l)) || null;
    return { tracks, progressLines: prog.slice(0, 6), progressLineCount: prog.length, numCells: nums, oldTopicNums: tnums, head, hasDaeju: lines.some((l) => /대주제 \d+개/.test(l)), docW: document.documentElement.scrollWidth, vw: innerWidth };
  },
  // 구성도 빈칸 점선 테두리(38)
  dashed: function () {
    const { vis, rgba, over, ratio, bgBehind } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const els = [...main.querySelectorAll("*")].filter((e) => vis(e) && getComputedStyle(e).borderTopStyle === "dashed" && parseFloat(getComputedStyle(e).borderTopWidth) > 0).slice(0, 40);
    const rows = els.map((e) => { const cs = getComputedStyle(e); const bg = bgBehind(e.parentElement || e); return { label: (e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 30), ratio: ratio(over(rgba(cs.borderTopColor), bg), bg), w: Math.round(e.getBoundingClientRect().width) }; });
    return { count: rows.length, minRatio: rows.length ? Math.min(...rows.map((r) => r.ratio)) : null, rows: rows.slice(0, 6), text: (main.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160), blankWord: { 빈칸: ((main.innerText || "").match(/빈칸/g) || []).length, "빈 칸": ((main.innerText || "").match(/빈 칸/g) || []).length } };
  },
  // READING 4단계 'Aa'(60)
  reading4: function () {
    const { vis, box } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const meta = main.querySelector('[data-passage-meta="timed"]');
    const aa = [...main.querySelectorAll("button")].filter(vis).find((b) => /^Aa$/.test((b.innerText || "").trim()) || /글자/.test(b.getAttribute("aria-label") || ""));
    const startBtn = [...main.querySelectorAll("button")].filter(vis).find((b) => /읽기 시작/.test(b.innerText || ""));
    const row = meta ? meta.parentElement : null;
    return { meta: meta ? { ...box(meta), text: meta.innerText.replace(/\s+/g, " ").trim().slice(0, 80) } : null, aa: aa ? box(aa) : null, start: startBtn ? box(startBtn) : null, row: row ? box(row) : null, vw: innerWidth, docW: document.documentElement.scrollWidth };
  },
  searchDlg: function () {
    const { vis, box } = HELP_INLINE();
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { found: false };
    const lb = d.getAttribute("aria-labelledby");
    const name = d.getAttribute("aria-label") || (lb && document.getElementById(lb) ? document.getElementById(lb).innerText.trim() : null);
    let cover = null;
    for (const el of document.querySelectorAll("body *")) { const cs = getComputedStyle(el); if (cs.position !== "fixed") continue; const r = el.getBoundingClientRect(); if (cs.display !== "none" && cs.visibility !== "hidden" && r.width * r.height > (cover ? cover.w * cover.h : 0)) cover = { w: Math.round(r.width), h: Math.round(r.height), inHeader: !!el.closest("header") }; }
    const input = d.querySelector("input");
    const rows = [...d.querySelectorAll("a[href], [role='option'], li")].filter(vis);
    const first = rows.slice(0, 4).map((x) => (x.innerText || "").replace(/\s+/g, " ").trim().slice(0, 70));
    const kbd = [...document.querySelectorAll("header button, header kbd, button")].map((x) => (x.innerText || x.getAttribute("title") || "").trim()).filter((t) => /(Ctrl K|⌘K)/.test(t)).slice(0, 2);
    const dlgText = d.innerText || "";
    const dr = d.getBoundingClientRect();
    return { found: true, name, cover, vw: innerWidth, vh: innerHeight, inPortal: !d.closest("header"), placeholder: input ? input.getAttribute("placeholder") : null, focusInInput: document.activeElement === input, rowCount: rows.length, first, emoji: (dlgText.match(/\p{Extended_Pictographic}/gu) || []).length, kbd, dlg: { x: Math.round(dr.left), y: Math.round(dr.top), w: Math.round(dr.width), h: Math.round(dr.height) }, hint: dlgText.replace(/\s+/g, " ").trim().slice(0, 140) };
  },
  kakao: function () {
    const { vis } = HELP_INLINE();
    const r = document.querySelector('[aria-label="브라우저 안내"]');
    if (!r) return { found: false };
    const ctl = [...r.querySelectorAll("button, a")].filter(vis).map((e) => { const b = e.getBoundingClientRect(); return { text: (e.getAttribute("aria-label") || e.innerText).trim().slice(0, 20), w: Math.round(b.width), h: Math.round(b.height) }; });
    const leaves = [...r.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && vis(e));
    const rb = r.getBoundingClientRect();
    return { found: true, text: r.innerText.replace(/\s+/g, " ").trim().slice(0, 140), ctl, small44: ctl.filter((c) => c.w < 44 || c.h < 44).length, under12: leaves.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length, emoji: /\p{Extended_Pictographic}/u.test(r.innerText), bg: getComputedStyle(r).backgroundColor, box: { w: Math.round(rb.width), h: Math.round(rb.height) }, docW: document.documentElement.scrollWidth, vw: innerWidth };
  },
  nope: function () {
    const { vis } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const h1 = document.querySelector("h1");
    const ctl = [...main.querySelectorAll("a[href], button")].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { text: (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; });
    const leaves = [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && (e.innerText || "").trim() && vis(e));
    return { h1: h1 ? h1.innerText.trim() : null, text: (main.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240), ctl, small44: ctl.filter((c) => c.h < 44).length, under12: leaves.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length, emoji: /\p{Extended_Pictographic}/u.test(main.innerText || ""), upperMono: leaves.filter((e) => /mono/i.test(getComputedStyle(e).fontFamily)).map((e) => (e.innerText || "").trim().slice(0, 20)).slice(0, 4), docW: document.documentElement.scrollWidth, vw: innerWidth };
  },
  listText: function () {
    const { vis, box } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const lines = (main.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const card = document.querySelector('[aria-label="무료 체험"]');
    const cardBtns = card ? [...card.querySelectorAll("a, button")].filter(vis).map((b) => { const r = b.getBoundingClientRect(); const cr = card.getBoundingClientRect(); return { text: (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80), h: Math.round(r.height), over: +(Math.max(r.right - cr.right, cr.left - r.left, 0)).toFixed(1) }; }) : [];
    const lessonNums = [...main.querySelectorAll("*")].filter((e) => e.children.length === 0 && vis(e) && /^(\d+-\d+|Ch \d+-\d+|Topic \d+-\d+)$/.test((e.innerText || "").trim())).slice(0, 4).map((e) => e.innerText.trim());
    return { head: lines.find((l) => /개 강의/.test(l)) || null, headAll: lines.filter((l) => /(개 강의|구간|장|대주제)/.test(l) && l.length < 60).slice(0, 5), free: !!card, cardBtns, lessonNums, jeh: lines.filter((l) => /제 \d+과/.test(l)).slice(0, 8), oldJeh: lines.filter((l) => /제 0\d+과/.test(l)).length, docW: document.documentElement.scrollWidth, vw: innerWidth, intro: lines.slice(0, 8).join(" | ").slice(0, 260) };
  },
  lockedShortcut: function () {
    const { vis } = HELP_INLINE();
    const main = document.querySelector("main") || document.body;
    const links = [...main.querySelectorAll("a[href]")].filter(vis).map((a) => ({ text: (a.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80), href: a.getAttribute("href") })).filter((l) => /\/(adult|student)\/[as]\d/.test(l.href || ""));
    return { h1: (document.querySelector("h1") || {}).innerText || null, links: links.slice(0, 5), register: [...main.querySelectorAll("button")].filter(vis).filter((b) => /이용권 등록/.test(b.innerText || "")).length, buy: /이용권 구매하기|구매 안내/.test(main.innerText || "") };
  },
  home: function () {
    const { vis } = HELP_INLINE();
    const ring = [...document.querySelectorAll('[class*="ring-white/70"]')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), shadow: getComputedStyle(e).boxShadow.slice(0, 60) }; });
    const links = [...document.querySelectorAll("a[href]")].filter(vis).filter((a) => /^\/(student|adult|passoff-grammar|phonics|grammar1|grammar2|ld|reading)(\/|$)/.test(a.getAttribute("href") || "")).map((a) => { const r = a.getBoundingClientRect(); return { text: (a.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24), h: Math.round(r.height), w: Math.round(r.width) }; });
    const mainEl = document.querySelector("main");
    return { ringCount: ring.length, ring: ring.slice(0, 3), links: links.slice(0, 10), gutterHome: getComputedStyle(document.documentElement).scrollbarGutter, fullScreen: !!document.querySelector("main[data-full-screen]"), docW: document.documentElement.scrollWidth, vw: innerWidth, docH: document.documentElement.scrollHeight, vh: innerHeight, mainTag: mainEl ? mainEl.getAttribute("data-full-screen") : null };
  },
};
// FN 안에서 HELP_INLINE() 를 helpers 본문으로 치환
const call = (tab, k) => ev(tab, "(" + FN[k].toString().replace(/HELP_INLINE\(\)/g, HELP) + ")()");

async function stepsOf(tab) {
  const list = await ev(tab, `[...document.querySelectorAll('[data-step-tab]')].filter((b) => b.offsetParent).map((b) => +b.getAttribute('data-step-tab'))`);
  return Array.isArray(list) ? [...new Set(list.filter(Number.isFinite))].sort((a, b) => a - b) : [];
}
const gotoStep = (tab, k) => H.click(tab, `document.querySelector('[data-step-tab="${k}"]')`, { settle: 900, refuseCovered: true });
const toBottom = async (tab) => { const h = await tab.eval("document.documentElement.scrollHeight").catch(() => 0); await tab.eval(`window.scrollTo(0, ${h})`).catch(() => {}); await H.sleep(500); };
const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[/?=&]/g, "_"));

// 키보드 · 검색 창 시험
async function searchTest(tab, p, vp, theme, withKeys) {
  await H.load(tab, p, { marker: null, settle: 900 });
  await H.sleep(600);
  const c = await H.click(tab, `[...document.querySelectorAll('button, a')].find((b) => /검색/.test((b.getAttribute('aria-label') || '') + (b.getAttribute('title') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1000 });
  const d = await call(tab, "searchDlg");
  const f = await shot(tab, `search_${slug(p)}_${theme}_${vp}`);
  const r = { page: p, vp, theme, clicked: c.ok, dialog: d, shot: f };
  if (withKeys && c.ok) {
    let outside = 0;
    for (let i = 0; i < 14; i++) { await key(tab, "Tab", "Tab", 9); const inD = await ev(tab, `!!(document.activeElement && document.activeElement.closest('[role="dialog"]'))`); if (inD !== true) outside++; }
    let outsideBack = 0;
    for (let i = 0; i < 6; i++) { await key(tab, "Tab", "Tab", 9, 8); const inD = await ev(tab, `!!(document.activeElement && document.activeElement.closest('[role="dialog"]'))`); if (inD !== true) outsideBack++; }
    await key(tab, "Escape", "Escape", 27);
    await H.sleep(400);
    r.keys = { tabOutside: outside, shiftTabOutside: outsideBack, afterEsc: await ev(tab, `({ open: !!document.querySelector('[role="dialog"]'), focus: document.activeElement ? (document.activeElement.getAttribute('aria-label') || document.activeElement.getAttribute('title') || document.activeElement.innerText || document.activeElement.tagName).trim().slice(0, 40) : null })`) };
  }
  return r;
}

// 번쩍임 표본(10번 · 앞 확인에서 본 '0/82 · 이용권 등록 깜빡임')
const SAMPLER = `(() => { if (window.__flash) return; const log = []; window.__flash = log; let last = '';
  const sig = () => { try { const b = document.body; if (!b) return null; const t = b.innerText || ''; const m = t.match(/(\\d+)\\s*\\/\\s*(\\d+)\\s*개\\s*완료/);
    const regBtn = [...document.querySelectorAll('header button, header a, main button, main a')].filter((e) => e.offsetParent && /이용권 등록/.test((e.innerText || '') + (e.getAttribute('aria-label') || ''))).length;
    const free = !!document.querySelector('[aria-label="무료 체험"]'); const pend = document.querySelectorAll('[data-license-pending]').length;
    const lock = (t.match(/이용권 등록 후 열림|이용권 등록 후 열립니다|무료로 먼저 해 보기|첫 두 강의 무료 체험/g) || []).length;
    return JSON.stringify({ prog: m ? m[1] + '/' + m[2] : null, regBtn, free, pend, lock, len: Math.round(t.length / 80) }); } catch (e) { return null; } };
  const tick = () => { const s = sig(); if (s && s !== last) { last = s; log.push([Math.round(performance.now()), s]); } };
  setInterval(tick, 20); })()`;

process.on("unhandledRejection", () => {});
(async () => {
  if (!(await waitMem())) { console.log("stop: memory"); process.exitCode = 4; return; }
  const browser = await H.startBrowser(`ui1007-pd3-${MODE === "free" ? "vf" : "v"}`, PORT, { fresh: true });
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
    await setTheme(tab, "light");
    await H.load(tab, "/ld/d010", { marker: null, settle: 900 });
    const lockedTxt = await ev(tab, `((document.querySelector('main')||document.body).innerText||'')`);
    const locked = H.PAYWALL_RE.test(lockedTxt || "");
    out.profileCheck = { paidLessonLocked: locked };
    if (MODE === "free" ? !locked : locked) { console.log("stop: profile mismatch"); out.stop = "profile mismatch"; save(); process.exitCode = 3; return; }

    const safe = async (label, fn) => { try { await fn(); } catch (e) { console.log(`  error ${label}: ${String(e && e.message).slice(0, 120)}`); (out.errors ||= []).push({ label, msg: String(e && e.message).slice(0, 200) }); if (/closed|WebSocket|timed out|Timeout/i.test(String(e && e.message))) throw e; } };

    if (MODE === "lic") {
      // ---- A. 번쩍임(10번 · 앞 확인의 0/82 · 이용권 등록 깜빡임) ----
      if (want("flash")) await safe("flash", async () => {
        out.items.flash = [];
        await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: SAMPLER });
        await tab.send("Network.enable").catch(() => {});
        for (const [p, vp] of [["/student", "phone"], ["/student", "desktop"], ["/passoff-grammar", "phone"], ["/passoff-grammar", "desktop"], ["/adult", "phone"], ["/reading", "phone"], ["/ld", "desktop"]]) {
          for (let rep = 1; rep <= 3; rep++) {
            await setView(tab, vp);
            await tab.send("Page.navigate", { url: "about:blank" }).catch(() => {});
            await H.sleep(300);
            await tab.send("Network.setCacheDisabled", { cacheDisabled: true }).catch(() => {});
            await tab.send("Page.navigate", { url: `${H.BASE}${p}` });
            await H.sleep(4200);
            const log = await ev(tab, "window.__flash || []");
            const states = (Array.isArray(log) ? log : []).map(([t, s]) => { let o = {}; try { o = JSON.parse(s); } catch {} return { t, ...o }; }).filter((s) => s.len > 5 || s.regBtn || s.prog);
            const final = states[states.length - 1] || {};
            const zero = (pr) => pr && /^0\//.test(pr);
            const early = states.slice(0, -1);
            const badEarly = early.filter((s) => (zero(s.prog) && final.prog && !zero(final.prog)) || (s.regBtn > 0 && !(final.regBtn > 0)) || (s.free && !final.free) || (s.lock > 0 && !(final.lock > 0)));
            const t0 = states.length ? states[0].t : 0;
            const badSpan = badEarly.length ? { fromMs: badEarly[0].t, toMs: (early[early.length - 1] || badEarly[0]).t, firstContentMs: t0 } : null;
            out.items.flash.push({ page: p, vp, rep, states: states.length, final: { prog: final.prog, regBtn: final.regBtn, free: final.free, pend: final.pend, lock: final.lock }, timeline: states.slice(0, 12).map((s) => `${s.t}ms prog=${s.prog} reg=${s.regBtn} free=${s.free ? 1 : 0} pend=${s.pend} lock=${s.lock}`), badEarlyCount: badEarly.length, badSpan, zeroProg: early.filter((s) => zero(s.prog)).length, regBlink: early.filter((s) => s.regBtn > 0).length });
            console.log("flash", p, vp, rep, "states", states.length, "final", JSON.stringify(out.items.flash[out.items.flash.length - 1].final), "badEarly", badEarly.length, badSpan ? JSON.stringify(badSpan) : "");
            if (rep === 1) await shot(tab, `flash_${slug(p)}_${vp}_final`, 60);
            save();
          }
        }
        await tab.send("Network.setCacheDisabled", { cacheDisabled: false }).catch(() => {});
      });

      // ---- B. 맨 위 단추(16) · 진도 막대 · PASS-OFF 목록(33 · 57) ----
      if (want("lists")) await safe("lists", async () => {
        out.items.lists = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const [p, vp] of [["/passoff-grammar", "phone"], ["/passoff-grammar", "desktop"], ["/student", "phone"], ["/student", "desktop"], ["/adult", "phone"], ["/grammar1", "phone"], ["/ld", "phone"], ["/reading", "desktop"], ["/phonics", "phone"], ["/grammar2", "phone"]]) {
            await setView(tab, vp);
            await H.load(tab, p, { marker: null, settle: 1500 });
            await H.sleep(2500);
            const top = await call(tab, "topButton");
            const lf0 = await call(tab, "listFacts");
            const f0 = await shot(tab, `list_${slug(p)}_${theme}_${vp}_top`);
            // 한 장(대주제) 펼쳐 줄 번호 보기
            const c = await H.click(tab, `[...document.querySelectorAll('main button[aria-expanded]')].find((b) => b.getAttribute('aria-expanded') === 'false')`, { settle: 1000, refuseCovered: true });
            await H.sleep(500);
            const lf1 = await call(tab, "listFacts");
            let f1 = null;
            if (c.ok) { await ev(tab, `(() => { const b = [...document.querySelectorAll('main button[aria-expanded="true"]')].pop(); if (b) window.scrollTo(0, Math.max(0, b.getBoundingClientRect().top + scrollY - 70)); })()`); await H.sleep(300); f1 = await shot(tab, `list_${slug(p)}_${theme}_${vp}_open`); await H.click(tab, `[...document.querySelectorAll('main button[aria-expanded="true"]')].pop()`, { settle: 300 }); }
            out.items.lists.push({ page: p, vp, theme, top, closed: lf0, expanded: lf1, expandedClicked: c.ok, shots: [f0, f1].filter(Boolean) });
            console.log("list", p, vp, theme, JSON.stringify(top.topLink), "tracks", JSON.stringify(lf0.tracks.slice(0, 2)), "progLines", lf1.progressLineCount, "nums", JSON.stringify(lf1.numCells.slice(0, 2)));
            save();
          }
        }
      });

      // ---- C. 끝 막대 어둠 · 밝음(55 · 59) ----
      if (want("endbar")) await safe("endbar", async () => {
        out.items.endbar = [];
        for (const theme of ["dark", "light"]) {
          await setTheme(tab, theme);
          for (const [p, vp] of [["/student/s11-4", "phone"], ["/adult/a6-2", "phone"], ["/student/s11-4", "small"], ["/adult/a6-2", "desktop"], ["/student/s1-6", "phone"], ["/grammar1/gh1-006", "phone"], ["/ld/d001", "phone"], ["/reading/pr154", "phone"], ["/phonics/mv1-01", "phone"]]) {
            await setView(tab, vp);
            await H.load(tab, p, { marker: null, settle: 900 });
            await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 20000);
            await H.sleep(700);
            const steps = await stepsOf(tab);
            const last = steps[steps.length - 1];
            if (last) await gotoStep(tab, last);
            await tab.eval("window.scrollTo(0,0)").catch(() => {});
            await toBottom(tab);
            const m = await call(tab, "endbar");
            const f = await shot(tab, `endbar_${slug(p)}_${theme}_${vp}`);
            out.items.endbar.push({ page: p, vp, theme, lastStep: last, ...m, shot: f });
            console.log("endbar", p, vp, theme, JSON.stringify((m.btns || []).map((b) => `${b.text}|dis=${b.disabled}|bw=${b.bw}|br=${b.borderRatio}|tr=${b.textRatio}`)));
            save();
          }
        }
      });

      // ---- D. 이용권 창 산 뒤(54 · 55) ----
      if (want("modal")) await safe("modal", async () => {
        out.items.licenseModalLicensed = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/student", { marker: null, settle: 1500 });
            await H.sleep(1500);
            if (vp === "phone") await H.click(tab, `document.querySelector('button[aria-label="메뉴 열기"]')`, { settle: 900 });
            const c = await H.click(tab, `[...document.querySelectorAll('button')].find((b) => (/이용 중 · 확인/.test(b.innerText || '') || /상태 확인/.test(b.getAttribute('title') || '') || /이용권/.test(b.getAttribute('aria-label') || '')) && b.offsetParent)`, { settle: 1300 });
            const masked = await ev(tab, "(" + FN.maskCode.toString() + ")()");
            const m = await call(tab, "modal");
            const f = await shot(tab, `licensemodal_licensed_${theme}_${vp}`);
            out.items.licenseModalLicensed.push({ theme, vp, clicked: c.ok, clickedText: c.text || null, masked, ...m, shot: f });
            console.log("modal(lic)", theme, vp, c.ok, m.open, "emoji", m.emoji, "under12", m.under12, "edge", m.edgeRatio, "small", m.smallCtl);
            save();
          }
        }
      });

      // ---- E. 구성도 어둠 360(38) · READING pr154 4단계 360(60) ----
      if (want("map")) await safe("map", async () => {
        out.items.map = [];
        for (const theme of ["dark", "light"]) {
          await setTheme(tab, theme);
          await setView(tab, "small");
          await H.load(tab, "/passoff-grammar/map?topic=1", { marker: null, settle: 1500 });
          await H.sleep(1500);
          const m = await call(tab, "dashed");
          const f = await shot(tab, `map_topic1_${theme}_small`);
          out.items.map.push({ theme, ...m, shot: f });
          console.log("map", theme, "dashed", m.count, "min", m.minRatio, JSON.stringify(m.blankWord));
          save();
        }
        out.items.reading4 = [];
        for (const [theme, vp] of [["light", "small"], ["dark", "small"], ["light", "phone"], ["light", "desktop"]]) {
          await setTheme(tab, theme); await setView(tab, vp);
          for (const id of ["pr154", "pr001"]) {
            await H.load(tab, `/reading/${id}`, { marker: null, settle: 900 });
            await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 20000);
            await gotoStep(tab, 4);
            await H.sleep(600);
            await tab.eval("window.scrollTo(0,0)").catch(() => {});
            const m = await call(tab, "reading4");
            await ev(tab, `(() => { const e = document.querySelector('[data-passage-meta="timed"]'); if (e) window.scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 160)); })()`);
            await H.sleep(300);
            const f = await shot(tab, `reading4_${id}_${theme}_${vp}`);
            out.items.reading4.push({ id, theme, vp, ...m, shot: f });
            console.log("reading4", id, theme, vp, JSON.stringify({ aa: m.aa, meta: m.meta && { y: m.meta.y, w: m.meta.w, h: m.meta.h }, row: m.row && { w: m.row.w, right: m.row.right } }));
            save();
          }
        }
      });

      // ---- E2. 구성도 쪽 '강의 놓기 0 / 3' 옆 막대(57 과 같은 모양인데 목록 밖) 바탕 대비 ----
      if (want("mapbar")) await safe("mapbar", async () => {
        out.items.mapbar = [];
        for (const theme of ["dark", "light"]) {
          await setTheme(tab, theme); await setView(tab, "small");
          await H.load(tab, "/passoff-grammar/map?topic=1", { marker: null, settle: 1500 });
          await H.sleep(1200);
          const m = await ev(tab, "(" + function () {
            const { vis, rgba, over, ratio, bgBehind } = HELP_INLINE();
            const main = document.querySelector("main") || document.body;
            const bars = [...main.querySelectorAll("div, span")].filter((e) => vis(e) && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height <= 10 && e.getBoundingClientRect().width > 80).map((e) => { const par = bgBehind(e.parentElement || e); const c = rgba(getComputedStyle(e).backgroundColor); return { cls: (e.className || "").toString().slice(0, 60), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), bg: c[3] > 0.02 ? ratio(over(c, par), par) : null }; });
            return { bars: bars.slice(0, 6) };
          }.toString().replace(/HELP_INLINE\(\)/g, HELP) + ")()");
          const f = await shot(tab, `mapbar_${theme}_small`);
          out.items.mapbar.push({ theme, ...m, shot: f });
          console.log("mapbar", theme, JSON.stringify(m.bars));
          save();
        }
      });

      // ---- F. ADULT 단계 탭 1366 · 768 · 1024 · 390 · 360 (34 · 35) — a1-2(무료) · a6-2(유료) ----
      if (want("adulttabs")) await safe("adulttabs", async () => {
        out.items.adultTabs = [];
        await setTheme(tab, "light");
        for (const id of ["a1-2", "a6-2"]) {
          for (const [w, h, mobile, tag] of [[1366, 900, false, "1366"], [1024, 800, false, "1024"], [768, 900, false, "768"], [390, 844, true, "390"], [360, 780, true, "360"]]) {
            await setView(tab, { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, touch: mobile });
            await H.load(tab, `/adult/${id}`, { marker: null, settle: 1200 });
            await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
            const per = [];
            for (const n of [1, 2, 3, 4, 5]) {
              await H.click(tab, `document.querySelector('[data-step-tab="${n}"]')`, { settle: 500 });
              const s = await survey(tab);
              per.push({ step: n, lines: s.tabs.map((t) => t.lines), out: s.tabs.map((t) => t.out), widths: s.tabs.map((t) => t.w), texts: s.tabs.map((t) => t.text), h: s.tabs.map((t) => t.h) });
              if (n === 1 || n === 5) await shot(tab, `adulttabs_${id}_${tag}_step${n}`);
            }
            const bad = per.filter((x) => x.lines.some((l) => l > 1) || x.out.some((o) => o > 0));
            out.items.adultTabs.push({ id, tag, bad: bad.length, per });
            console.log("adultTabs", id, tag, "badSteps", bad.length, JSON.stringify(per[4].texts), JSON.stringify(per[4].widths));
            save();
          }
        }
      });
    } else {
      // ================= free =================
      const LESSONS = ["/student/s1-1", "/adult/a1-2", "/passoff-grammar/pg01-1", "/phonics/mv1-01", "/grammar1/gh1-006", "/grammar2/gh2-007", "/ld/d001", "/reading/pr001"];
      // ---- A. 무료 강의 8개 모든 단계 훑기 ----
      if (want("survey")) await safe("survey", async () => {
        out.survey = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "small", "desktop"]) {
            await setView(tab, vp);
            for (const p of LESSONS) {
              if (vp === "small" && !/(adult|ld|reading|phonics|grammar1)/.test(p)) continue; // 360 은 눈여겨볼 곳만
              await H.load(tab, p, { marker: null, settle: 900 });
              await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 20000);
              await H.sleep(500);
              const steps = await stepsOf(tab);
              for (const k of steps) {
                const c = await gotoStep(tab, k);
                await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
                await tab.eval("window.scrollTo(0,0)").catch(() => {});
                await H.sleep(250);
                const s = await survey(tab);
                out.survey.push({ page: p, theme, vp, step: k, clicked: c.ok, ...s });
              }
              console.log("survey", p, theme, vp, "steps", steps.join(","));
              save();
            }
          }
        }
      });

      // ---- B. 검색 창(12 · 24 · 52 · 53) ----
      if (want("search")) await safe("search", async () => {
        out.items.search = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "desktop", "small"]) {
            await setView(tab, vp);
            for (const [p, keys] of [["/reading", true], ["/reading/pr001", false], ["/t/voca", false], ["/student", false]]) {
              if (vp === "small" && p !== "/reading") continue;
              const r = await searchTest(tab, p, vp, theme, keys);
              out.items.search.push(r);
              const d = r.dialog;
              console.log("search", p, vp, theme, d.found ? JSON.stringify({ name: d.name, portal: d.inPortal, cover: d.cover, ph: d.placeholder, emoji: d.emoji, first: d.first && d.first[0], kbd: d.kbd }) : "no dialog", r.keys ? JSON.stringify(r.keys) : "");
              save();
            }
          }
        }
      });

      // ---- C. 목록 글 · 잠김 화면 · 이용권 창(16 · 18 · 41 · 44) ----
      if (want("lists")) await safe("lists", async () => {
        out.items.lists = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "small", "desktop"]) {
            await setView(tab, vp);
            for (const p of ["/student", "/adult", "/passoff-grammar", "/grammar2", "/phonics", "/grammar1", "/ld", "/reading"]) {
              if (vp === "small" && !/student|adult|grammar2/.test(p)) continue;
              await H.load(tab, p, { marker: null, settle: 1500 });
              await H.sleep(1500);
              const m = await call(tab, "listText");
              const f = await shot(tab, `list_${slug(p)}_${theme}_${vp}`);
              out.items.lists.push({ page: p, vp, theme, ...m, shot: f });
              console.log("list", p, vp, theme, JSON.stringify({ head: m.head, free: m.free, btns: m.cardBtns.map((b) => b.text.slice(0, 40) + "/over" + b.over), jeh: m.jeh.slice(0, 2), old: m.oldJeh }));
              save();
            }
          }
          // 잠김 화면(a2-1) 바로가기 · 이용권 창
          for (const vp of ["phone", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/adult/a2-1", { marker: null, settle: 1500 });
            await H.sleep(800);
            const l = await call(tab, "lockedShortcut");
            const f1 = await shot(tab, `lock_adult_a2-1_${theme}_${vp}`);
            const c = await H.click(tab, `[...document.querySelectorAll('main button, main a, header button')].find((b) => /이용권 등록/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1200 });
            const m = await call(tab, "modal");
            const f2 = await shot(tab, `licensemodal_free_${theme}_${vp}`);
            out.items.lists.push({ page: "/adult/a2-1", vp, theme, locked: l, modalClicked: c.ok, modal: m, shots: [f1, f2] });
            console.log("lock", theme, vp, JSON.stringify(l.links.slice(0, 2)), "modal edge", m.edgeRatio, "small", m.smallCtl, "emoji", m.emoji, "under12", m.under12);
            save();
          }
        }
      });

      // ---- C2. 이용권 창(이용권 없는 사본 · 잠김 화면에서 연 창) 가장자리 · 꺼진 '등록' 단추(54 · 55) ----
      if (want("modalfree")) await safe("modalfree", async () => {
        out.items.modalFree = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "small", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/adult/a2-1", { marker: null, settle: 1500 });
            await H.sleep(800);
            const c = await H.click(tab, `[...document.querySelectorAll('main button, main a, header button')].find((b) => /이용권 등록/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')) && b.offsetParent)`, { settle: 1200 });
            const m = await call(tab, "modal");
            const f = await shot(tab, `licensemodal_free2_${theme}_${vp}`);
            out.items.modalFree.push({ theme, vp, clicked: c.ok, ...m, shot: f });
            console.log("modalFree", theme, vp, c.ok, "borderW", m.borderW, "edge", m.edgeRatio, "ctl", JSON.stringify((m.ctl || []).map((x) => [x.text.slice(0, 12), x.disabled ? "DIS" : "", x.bw ? "bR" + x.borderRatio : "", x.filled ? "filled" : ""])));
            save();
          }
        }
      });

      // ---- C3. ADULT 3단계 '뜻 모두 보기' 자리(36) · 단계 1 · 3 '점선 칸'(39) ----
      if (want("adult3")) await safe("adult3", async () => {
        out.items.adult3 = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["small", "phone", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/adult/a1-2", { marker: null, settle: 1000 });
            await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
            await gotoStep(tab, 3);
            await tab.eval("window.scrollTo(0,0)").catch(() => {});
            await H.sleep(400);
            const m = await ev(tab, `(() => {
              const vis = (e) => e.offsetParent && e.getBoundingClientRect().width > 1;
              const main = document.querySelector('main') || document.body;
              const els = [...main.querySelectorAll('button, [role=switch], label, span')].filter((e) => vis(e) && /뜻 모두 보기/.test(e.innerText || '') && (e.innerText || '').length < 20);
              const e = els.find((x) => x.tagName === 'BUTTON' || x.getAttribute('role') === 'switch') || els[0];
              const box = (x) => { const r = x.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
              const guide = [...main.querySelectorAll('p')].filter(vis).find((p) => /점선 칸/.test(p.innerText || ''));
              const sec = e ? e.closest('section') : null;
              const nums = [...main.querySelectorAll('button')].filter((b) => vis(b) && /^[1-9]$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().width >= 30 && b.getBoundingClientRect().width <= 60);
              return { found: !!e, tag: e ? e.tagName : null, role: e ? e.getAttribute('role') : null, pressed: e ? e.getAttribute('aria-pressed') : null, checked: e ? e.getAttribute('aria-checked') : null, box: e ? box(e) : null, secRight: sec ? Math.round(sec.getBoundingClientRect().right) : null, guide: guide ? { ...box(guide), text: guide.innerText.replace(/\\s+/g, ' ').trim().slice(0, 80) } : null, numCount: nums.length, numTops: new Set(nums.map((b) => Math.round(b.getBoundingClientRect().top))).size, numBox: nums.length ? { first: box(nums[0]), last: box(nums[nums.length - 1]) } : null, vw: innerWidth };
            })()`);
            const f = await shot(tab, `adult3_${theme}_${vp}`);
            out.items.adult3.push({ theme, vp, ...m, shot: f });
            console.log("adult3", theme, vp, JSON.stringify({ tag: m.tag, role: m.role, box: m.box, secRight: m.secRight, nums: m.numCount, tops: m.numTops, guide: m.guide && m.guide.text }));
            save();
          }
        }
      });

      // ---- D. 404(23) · 카카오톡 UA(19) · 첫 쪽(11 · 43) ----
      if (want("misc")) await safe("misc", async () => {
        out.items.nope = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["phone", "small", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/nope", { marker: null, settle: 800 });
            const m = await call(tab, "nope");
            const f = await shot(tab, `nope_${theme}_${vp}`);
            out.items.nope.push({ theme, vp, ...m, shot: f });
            console.log("nope", theme, vp, JSON.stringify({ h1: m.h1, small: m.small44, u12: m.under12, mono: m.upperMono }));
          }
        }
        out.items.kakao = [];
        await tab.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0" });
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme); await setView(tab, "phone");
          await H.load(tab, "/student", { marker: null, settle: 1500 });
          const k = await call(tab, "kakao");
          k.shot = await shot(tab, `kakao_${theme}_390`);
          out.items.kakao.push({ theme, ...k });
          console.log("kakao", theme, JSON.stringify({ found: k.found, small44: k.small44, u12: k.under12, emoji: k.emoji, ctl: k.ctl && k.ctl.map((c) => c.w + "x" + c.h) }));
        }
        await tab.send("Emulation.setUserAgentOverride", { userAgent: "" }).catch(() => {});
        out.items.home = [];
        for (const theme of ["light", "dark"]) {
          await setTheme(tab, theme);
          for (const vp of ["small", "phone", "desktop"]) {
            await setView(tab, vp);
            await H.load(tab, "/", { marker: null, settle: 1500 });
            await H.sleep(800);
            const m = await call(tab, "home");
            const f = await shot(tab, `home_${theme}_${vp}`);
            out.items.home.push({ theme, vp, ...m, shot: f });
            console.log("home", theme, vp, JSON.stringify({ ring: m.ringCount, links: m.links.slice(0, 3), gutter: m.gutterHome, full: m.fullScreen, docW: m.docW, vw: m.vw }));
            save();
          }
        }
        save();
      });
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
