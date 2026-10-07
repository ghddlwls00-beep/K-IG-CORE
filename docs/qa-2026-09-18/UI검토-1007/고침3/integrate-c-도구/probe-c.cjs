#!/usr/bin/env node
// integrate-c (2026-10-08 고침3): 사진으로는 안 보이는 고침을 숫자로 — 로컬 next start 3380 · 빈 프로필(이용권 없음) · 브라우저 하나(9989).
//   F  깜빡임(③ · 통합 고침 LicenseButton): 데스크톱 /student 를 열 때 머리줄 '이용권 등록' 이 판정 전엔 안 보이고(data-license-pending ·
//      visibility hidden) 판정 뒤 보임 — 보였다가 사라지는 순간 0. 이용권 사본 흉내: 서명 없는 가짜 저장 이용권(로컬 서버는 검증 못 함 →
//      판정 '없음')을 localStorage 에 넣은 판도 같은 순서
//   Q  20 GRAMMAR '다음 Step →': 묶음이 남은 1단계에서 data-quiet · 테두리 투명 · 굵기 500 · 44px / 4단계(묶음 없음)에서 data-quiet 없음 · 테두리 보임
//   R  42 어둠 390 고른 칩 얇은 테두리: 과정 목록 '전체' · STUDENT s1-1 고른 칩 · GRAMMAR '⋯ 더보기' 안 고른 글자 크기 칩 — box-shadow 에 1px
//   S  55 VOCA 3단계 철자 '확인'(꺼짐): btn-filled · 불투명 1 · 바탕 투명 · 44px
//   node probe-c.cjs [--break]   (--break: 쪽 앞에 옛 모양을 심음 — 모든 칸 FAIL 이어야)
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const empty = path.join(os.tmpdir(), "integrate1007c-empty-profile-src");
fs.mkdirSync(empty, { recursive: true });
process.env.KIG_PROFILE_SOURCE = empty;
process.env.KIG_CLONE_PREFIX = "kig-intc-probe-";
process.env.BASE = process.env.BASE || "http://localhost:3380";
delete process.env.KIG_BREAK_APP;
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const BREAK = process.argv.includes("--break");
const OUTDIR = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/after-local-c/probe-c");
fs.mkdirSync(OUTDIR, { recursive: true });
const rows = [];
const check = (id, ok, detail) => { rows.push({ id, ok: !!ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${JSON.stringify(detail).slice(0, 300)}`); };

// the old looks, put before every document for --break
const BREAK_SRC = `(() => { const css = '[data-license-pending]{visibility:visible !important} [aria-pressed="true"]{box-shadow:none !important} [data-action="check-spelling"]:disabled{opacity:.4 !important;background:rgb(255,255,255) !important}';
  const put = () => { if (document.getElementById('kig-intc-break')) return; const s = document.createElement('style'); s.id = 'kig-intc-break'; s.textContent = css; (document.head || document.documentElement).appendChild(s); };
  const strip = () => { for (const b of document.querySelectorAll('[data-quiet]')) b.removeAttribute('data-quiet'); };
  const go = () => { put(); strip(); new MutationObserver(() => { put(); strip(); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-quiet'] }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); })()`;

// header pill timeline: every animation frame for 4 s from the first paint
const TIMELINE_SRC = `(() => { window.__kigPill = []; const t0 = performance.now();
  const look = () => { const b = [...document.querySelectorAll('header button')].find((x) => /이용권 등록|올패스|STUDENT 패스/.test(x.textContent || ''));
    if (b) { const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); const seen = cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0;
      const last = window.__kigPill[window.__kigPill.length - 1]; const s = (seen ? 'seen' : 'unseen') + ':' + (b.textContent || '').trim();
      if (!last || last.s !== s) window.__kigPill.push({ t: Math.round(performance.now() - t0), s, pending: b.hasAttribute('data-license-pending') }); }
    if (performance.now() - t0 < 4000) requestAnimationFrame(look); };
  requestAnimationFrame(look); })()`;

const shadowHas1px = (s) => /0px 0px 0px 1px/.test(s || "");

(async () => {
  for (let i = 0; i < 30 && os.freemem() < 1.2 * 1024 ** 3; i++) { console.log(`남은 메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1.2 — 1분`); await H.sleep(60000); }
  const browser = await H.startBrowser(BREAK ? "intc-probe-break" : "intc-probe", 9989, { fresh: true });
  try {
    const tab = await H.openTab(browser);
    if (BREAK) await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: BREAK_SRC });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: TIMELINE_SRC });
    // no writes: only GET and the app's own licence questions go out
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params; let p = ""; try { p = new URL(q.request.url).pathname; } catch {}
        const ok = /^(GET|HEAD|OPTIONS)$/.test(q.request.method) || (q.request.method === "POST" && /^\/api\/license\/(verify|session)$/.test(p));
        tab.send(ok ? "Fetch.continueRequest" : "Fetch.failRequest", ok ? { requestId: q.requestId } : { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {});
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });

    // ---- F: header pill, desktop ----
    await H.setViewport(tab, "desktop");
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    for (const [label, seed] of [["빈 기기", null], ["저장된 이용권(서명 없는 가짜 — 로컬은 검증 못 함)", { maskedKey: "KIG-****", licenseId: "probe", plan: "LIFE", activatedAt: 1, expiresAt: null, token: "probe.invalid.token" }]]) {
      await H.load(tab, "/student", { marker: null, settle: 300 });
      await tab.eval(seed ? `localStorage.setItem('kig:license:v1', ${JSON.stringify(JSON.stringify(seed))})` : `localStorage.removeItem('kig:license:v1')`).catch(() => {});
      await H.load(tab, "/student", { marker: null, settle: 4300 });
      const tl = await tab.eval("window.__kigPill || []");
      const firstSeen = tl.findIndex((x) => x.s.startsWith("seen:"));
      const flash = tl.some((x, i) => i > 0 && x.s.startsWith("unseen:") && tl.slice(0, i).some((y) => y.s.startsWith("seen:")));
      const wrongFirst = tl.length && tl[0].s.startsWith("seen:이용권 등록");
      check(`F 깜빡임 · ${label}: 처음엔 안 보임 → 판정 뒤 '이용권 등록' 한 번`, tl.length > 0 && !wrongFirst && tl[0].pending === true && firstSeen > 0 && !flash && tl[tl.length - 1].s === "seen:이용권 등록", tl);
    }
    await tab.eval("localStorage.removeItem('kig:license:v1')").catch(() => {});

    // ---- Q: '다음 Step' (20), desktop light ----
    await H.load(tab, "/grammar1/gh1-006", { marker: null, settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    const nav = `(() => { const b = [...document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')].find((x) => /다음 Step/.test(x.textContent || '')); if (!b) return null; const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); return { quiet: b.hasAttribute('data-quiet'), border: cs.borderTopColor, bg: cs.backgroundColor, weight: cs.fontWeight, h: Math.round(r.height), disabled: b.disabled }; })()`;
    const q1 = await tab.eval(nav);
    const bundles = await tab.eval(`!!document.querySelector('main [data-bundles-left]')`);
    check("Q 20 GRAMMAR 1단계(묶음 남음): '다음 Step' data-quiet · 테두리 투명 · 굵기 500 · 44px", bundles && q1 && q1.quiet && /rgba\(0, 0, 0, 0\)|transparent/.test(q1.border) && q1.weight === "500" && q1.h >= 44 && !q1.disabled, { bundles, ...q1 });
    await H.click(tab, `document.querySelector('[data-step-tab="4"]')`, { settle: 900 });
    const q4 = await tab.eval(nav);
    const bundles4 = await tab.eval(`!!document.querySelector('main [data-bundles-left]')`);
    check("Q 20 GRAMMAR 4단계(묶음 없음): '다음 Step' 예전 모양(data-quiet 없음 · 테두리 보임)", !bundles4 && q4 && !q4.quiet && !/rgba\(0, 0, 0, 0\)/.test(q4.border), { bundles4, ...q4 });

    // ---- R · S: dark 390 ----
    await H.setViewport(tab, "mobile");
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await H.load(tab, "/student", { marker: null, settle: 1500 });
    const chip = await tab.eval(`(() => { const b = document.querySelector('[role="group"][aria-label="목록 거르기"] button[aria-pressed="true"]'); return b ? { text: b.innerText.trim(), shadow: getComputedStyle(b).boxShadow } : null; })()`);
    check("R 42 어둠 390 목록 '전체' 고른 칩 1px 테두리", chip && shadowHas1px(chip.shadow), chip);
    await H.load(tab, "/student/s1-1", { marker: null, settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    const stuChips = await tab.eval(`[...document.querySelectorAll('main [role="group"][aria-label="재생 속도"] button[aria-pressed="true"], main [role="group"][aria-label="대본 보기"] button[aria-pressed="true"]')].filter((b) => b.getClientRects().length).map((b) => ({ text: b.innerText.trim(), shadow: getComputedStyle(b).boxShadow }))`);
    check("R 42 어둠 390 STUDENT s1-1 고른 칩 1px 테두리(모두)", stuChips.length > 0 && stuChips.every((c) => shadowHas1px(c.shadow)), stuChips);
    await H.load(tab, "/grammar1/gh1-006", { marker: null, settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    await H.click(tab, `document.querySelector('main details[data-more] > summary')`, { settle: 500 });
    const gChips = await tab.eval(`[...document.querySelectorAll('main details[data-more][open] button')].filter((b) => /font-semibold/.test(b.className) && /shadow-2xs/.test(b.className)).map((b) => ({ text: b.innerText.trim(), shadow: getComputedStyle(b).boxShadow }))`);
    check("R 42 어둠 390 GRAMMAR '⋯ 더보기' 고른 칩 1px 테두리", gChips.length > 0 && gChips.every((c) => shadowHas1px(c.shadow)), gChips);
    await H.load(tab, "/phonics/mv1-01", { marker: null, settle: 1500 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    await H.click(tab, `document.querySelector('[data-step-tab="3"]')`, { settle: 900 });
    // no wrong words on an empty device: '전체 30단어로 연습' → '정답 보고 듣기' → '말했어요 · 쓰기로' — the spelling card, nothing typed
    await H.click(tab, `document.querySelector('[data-step-panel="3"] [data-action="practice-all"]') || document.querySelector('[data-action="practice-all"]')`, { settle: 700 });
    await H.click(tab, `document.querySelector('[data-action="reveal"]')`, { settle: 700 });
    await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
    await H.click(tab, `document.querySelector('[data-action="said"]')`, { settle: 700 });
    const spell =await tab.eval(`(() => { const b = document.querySelector('[data-action="check-spelling"]'); if (!b) return null; const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); return { disabled: b.disabled, filled: /\\bbtn-filled\\b/.test(b.className), opacity: cs.opacity, bg: cs.backgroundColor, border: cs.borderTopColor, color: cs.color, h: Math.round(r.height) }; })()`);
    check("S 55 어둠 390 VOCA 3단계 철자 '확인' 꺼짐: btn-filled · 불투명 1 · 바탕 투명 · 44px", spell && spell.disabled && spell.filled && spell.opacity === "1" && /rgba\(0, 0, 0, 0\)/.test(spell.bg) && spell.h >= 44, spell);
    await tab.close();
  } finally {
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
  }
  const pass = rows.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(OUTDIR, BREAK ? "probe-c-break.json" : "probe-c.json"), JSON.stringify({ at: new Date().toISOString(), break: BREAK, pass, total: rows.length, rows }, null, 1));
  console.log(`${pass}/${rows.length} PASS${BREAK ? " (깨기 — 모두 FAIL 이어야)" : ""}`);
  process.exitCode = BREAK ? (pass === 0 ? 0 : 1) : (pass === rows.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exitCode = 2; });
