#!/usr/bin/env node
// 통합 검사(고침2 · 2026-10-08) — capture-b 가 숫자로 못 잡는 것을 로컬 3380 · 이용권 없는 빈 프로필로 한 번 더 본다.
//   ① ADULT a1-2 단계 탭: 탭 글이 몇 줄로 그려지는지(34 — 1366 · 1024 · 768 에서 1줄이어야) · 360 · 390 넘침(35)
//   ② GRAMMAR gh1-006 어둠: 지금 탭에 ring(42 — 통합이 더함)
//   ③ PASS-OFF pg01-1 390 밝음: '영어 보기' 대비를 0~4초 동안 250ms 마다(capture-b 의 4.12 한 번이 바뀌는 순간인지)
//   ④ PASS-OFF pg01-1: 2단계 '1단계로' 를 자판(Enter)으로 누르면 초점이 1단계 탭으로(14)
//   ⑤ STUDENT s1-1 3단계: 영어 문장이 단추가 아님 · '듣기'(data-action=play) 는 있음(31)
//   ⑥ 카카오톡(아이폰 UA) /student 390 밝음 · 어둠: 띠 사진 + 44px · 12px · 이모지 · 호박색(19)
//   node probe-c.cjs [--break]   (--break: ① 을 옛 flex-1 처럼 탭 폭을 141px 로 묶어 '2줄' 이 잡히는지)
// 앱 · 점검 도구는 바꾸지 않음. 진도 · 이용권 쓰기(GET 아닌 /api/)는 막음. 결과: out/ui-1007/after-local-b/probe-c/*.jpg · probe-c.json
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const empty = path.join(os.tmpdir(), "integrate1007c-empty-profile-src");
fs.mkdirSync(empty, { recursive: true });
process.env.KIG_PROFILE_SOURCE = empty;
process.env.KIG_CLONE_PREFIX = "kig-integrate1007c-free-";
process.env.BASE = process.env.BASE || "http://localhost:3380";
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(REPO + "/docs/qa-2026-09-18/scripts/lib/harness.cjs");
const OUT = path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/after-local-b/probe-c");
const BREAK = process.argv.includes("--break");
const res = { at: new Date().toISOString(), break: BREAK, checks: [] };
const ok = (name, pass, detail) => { res.checks.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name} ${JSON.stringify(detail).slice(0, 300)}`); };

async function view(tab, w, h, mobile) {
  await tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await tab.send("Emulation.setTouchEmulationEnabled", mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const theme = (tab, t) => tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: t }] });
async function shot(tab, name) {
  const r = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name + ".jpg"), Buffer.from(r.data, "base64"));
  return "probe-c/" + name + ".jpg";
}
const key = async (tab, k, code, vk) => {
  await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k === "Enter" ? "\r" : undefined });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
  await H.sleep(120);
};
// 탭 글 줄 수: 탭 안 글자 범위의 줄 상자(top 이 다른 것) 수
const TAB_LINES = `(() => [...document.querySelectorAll('[data-step-tab]')].filter((b) => b.offsetParent).map((b) => {
  // 보이는 글자 마디(text node)만 — 화면 읽기용 sr-only(1px) 는 뺌 — 의 줄 상자 top 을 8px 넘게 다를 때만 다른 줄로 셈
  const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
  const ys = [];
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    if (!t.textContent.trim()) continue;
    const pr = t.parentElement.getBoundingClientRect();
    if (pr.width <= 1.5 || pr.height <= 1.5) continue;
    const r = document.createRange(); r.selectNodeContents(t);
    for (const x of r.getClientRects()) if (x.width > 2 && x.height > 4) ys.push(x.top + x.height / 2);
  }
  ys.sort((a, c) => a - c);
  const tops = new Set(); let last = -1e9; for (const y of ys) { if (y - last > 8) tops.add(Math.round(y)); last = y; }
  const bar = b.closest('nav').getBoundingClientRect(), bb = b.getBoundingClientRect();
  return { n: b.getAttribute('data-step-tab'), text: b.innerText.replace(/\\s+/g, ' ').trim(), lines: tops.size, w: Math.round(bb.width), out: Math.max(0, Math.round(bb.right - bar.right), Math.round(bar.left - bb.left)) };
}))()`;

(async () => {
  const need = 1.2 * 1024 ** 3;
  for (let i = 0; i < 30 && os.freemem() < need; i++) { console.log(`남은 메모리 ${(os.freemem() / 1024 ** 3).toFixed(2)}GB < 1.2 — 1분`); await H.sleep(60000); }
  const browser = await H.startBrowser("integrate1007c-probe", 9986, { fresh: true });
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.removeItem('kig:theme'); } catch (e) {}` });
    const orig = tab.onMessage.bind(tab);
    tab.onMessage = (msg) => {
      if (msg.method === "Fetch.requestPaused") {
        const q = msg.params; let p = ""; try { p = new URL(q.request.url).pathname; } catch {}
        const pass = /^(GET|HEAD|OPTIONS)$/.test(q.request.method) || (q.request.method === "POST" && /^\/api\/license\/(verify|session)$/.test(p));
        if (pass) tab.send("Fetch.continueRequest", { requestId: q.requestId }).catch(() => {});
        else { res.blocked = (res.blocked || 0) + 1; tab.send("Fetch.failRequest", { requestId: q.requestId, errorReason: "BlockedByClient" }).catch(() => {}); }
        return;
      }
      return orig(msg);
    };
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });

    // ① ADULT 단계 탭
    await theme(tab, "light");
    for (const [w, h, mobile, tag] of [[1366, 900, false, "1366"], [1024, 800, false, "1024"], [768, 900, false, "768"], [390, 844, true, "390"], [360, 780, true, "360"]]) {
      await view(tab, w, h, mobile);
      await H.load(tab, "/adult/a1-2", { marker: null, settle: 1200 });
      await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
      const all = [];
      for (const n of [1, 2, 3, 4, 5]) {
        await H.click(tab, `document.querySelector('[data-step-tab="${n}"]')`, { settle: 500 });
        if (BREAK) await tab.eval(`document.querySelectorAll('[data-step-tab]').forEach((b) => { b.style.flex = '0 0 141px'; })`);
        const t = await tab.eval(TAB_LINES);
        all.push({ step: n, tabs: t });
        if (n === 1 || n === 5) await shot(tab, `${BREAK ? "break-" : ""}adult-tabs-${tag}-step${n}`);
      }
      const bad = all.flatMap((s) => s.tabs.filter((t) => t.lines > 1 || t.out > 0).map((t) => ({ step: s.step, ...t })));
      ok(`34·35 ADULT 탭 ${tag}: 탭 글 1줄 · 막대 밖 0`, bad.length === 0, bad.length ? bad.slice(0, 4) : all[4].tabs.map((t) => `${t.text}[${t.w}]`));
    }
    if (BREAK) { console.log("깨기 끝 — ① 만 돌림"); return; }

    // ② GRAMMAR 어둠 지금 탭 ring
    await theme(tab, "dark");
    await view(tab, 360, 780, true);
    await H.load(tab, "/grammar1/gh1-006", { marker: null, settle: 1200 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    const ring = await tab.eval(`(() => { const b = document.querySelector('[data-step-tab][aria-pressed="true"]'); return b ? getComputedStyle(b).boxShadow : null; })()`);
    await shot(tab, "grammar-dark-360-tab");
    ok("42 GRAMMAR 어둠 지금 탭 ring", !!ring && /rgb\(110, 106, 101\)/.test(ring), { ring });

    // ③ · ④ PASS-OFF
    await theme(tab, "light");
    await view(tab, 390, 844, true);
    await H.load(tab, "/passoff-grammar/pg01-1", { marker: null, settle: 200 });
    const samples = [];
    for (let i = 0; i < 18; i++) {
      samples.push(await tab.eval(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === '영어 보기'); if (!b) return null; const cs = getComputedStyle(b); return { t: ${i * 250}, dis: b.getAttribute('aria-disabled'), color: cs.color, bg: cs.backgroundColor, op: cs.opacity, tr: cs.transitionProperty + ' ' + cs.transitionDuration }; })()`));
      await H.sleep(250);
    }
    const lum = (s) => { const m = String(s).match(/[\d.]+/g); if (!m) return null; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]); };
    const states = samples.filter(Boolean).map((s) => { const fg = lum(s.color); let bg = lum(s.bg); if (/rgba\(0, 0, 0, 0\)/.test(s.bg)) bg = lum("rgb(255,255,255)"); const r = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05); return { ...s, ratio: +r.toFixed(2) }; });
    const steadyOn = states.filter((s) => s.dis === "false").slice(2);
    ok("55 PASS-OFF '영어 보기' 켜진 뒤 대비(바뀌는 순간 뒤)", steadyOn.length > 0 && steadyOn.every((s) => s.ratio >= 4.5), { first: states.slice(0, 3), turned: states.find((s) => s.dis === "false"), steady: steadyOn.slice(-1) });
    await H.click(tab, `document.querySelector('[data-step-tab="2"]')`, { settle: 700 });
    const focused = await tab.eval(`(() => { const b = [...document.querySelectorAll('section:not([hidden]) button')].find((x) => x.innerText.trim() === '1단계로'); if (!b) return false; b.focus(); return document.activeElement === b; })()`);
    await key(tab, "Enter", "Enter", 13);
    await H.sleep(500);
    const after = await tab.eval(`(() => { const a = document.activeElement; return { tab: a && a.getAttribute('data-step-tab'), pressed: a && a.getAttribute('aria-pressed'), text: a && a.innerText.replace(/\\s+/g, ' ').trim(), outline: a ? getComputedStyle(a).outlineStyle : null, step: document.querySelector('[data-passoff-view]').getAttribute('data-step') }; })()`);
    await shot(tab, "passoff-focus-after-enter");
    ok("14 PASS-OFF '1단계로'(Enter) → 초점이 1단계 탭", focused === true && after.tab === "1" && after.pressed === "true" && after.step === "1", { focused, after });

    // ⑤ STUDENT 3단계 영어 문장
    await H.load(tab, "/student/s1-1", { marker: null, settle: 1200 });
    await H.waitFor(tab, `!!document.querySelector('[data-step-tab]')`, 15000);
    await H.click(tab, `document.querySelector('[data-step-tab="3"]')`, { settle: 700 });
    const s31 = await tab.eval(`(() => { const en = [...document.querySelectorAll('main [data-en]')].filter((e) => e.offsetParent); return { en: en.length, inButton: en.filter((e) => e.closest('button, [role=button], a')).length, play: [...document.querySelectorAll('main [data-action="play"]')].filter((e) => e.offsetParent).length }; })()`);
    ok("31 STUDENT 3단계 영어 문장은 단추가 아님 · '듣기' 있음", s31.en > 0 && s31.inButton === 0 && s31.play > 0, s31);

    // ⑥ 카카오톡 띠(아이폰 — 안드로이드는 Chrome 으로 넘어가므로)
    await tab.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0" });
    for (const t of ["light", "dark"]) {
      await theme(tab, t);
      await view(tab, 390, 844, true);
      await H.load(tab, "/student", { marker: null, settle: 1500 });
      const k = await tab.eval(`(() => { const r = document.querySelector('[aria-label="브라우저 안내"]'); if (!r) return { found: false }; const vis = (e) => e.offsetParent && e.getBoundingClientRect().width > 1; const ctl = [...r.querySelectorAll('button, a')].filter(vis).map((e) => { const b = e.getBoundingClientRect(); return { text: (e.getAttribute('aria-label') || e.innerText).trim().slice(0, 20), w: Math.round(b.width), h: Math.round(b.height) }; }); const leaves = [...r.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && vis(e)); return { found: true, text: r.innerText.replace(/\\s+/g, ' ').trim().slice(0, 120), ctl, small44: ctl.filter((c) => c.w < 44 || c.h < 44).length, under12: leaves.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length, emoji: /\\p{Extended_Pictographic}/u.test(r.innerText), bg: getComputedStyle(r).backgroundColor }; })()`);
      k.file = await shot(tab, `kakao-${t}-390`);
      ok(`19 카카오톡 띠 ${t}`, k.found && k.small44 === 0 && k.under12 === 0 && !k.emoji, k);
    }
    await tab.send("Emulation.setUserAgentOverride", { userAgent: "" }).catch(() => {});
    await tab.close();
  } finally {
    browser.proc.kill();
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" }); } catch {}
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, BREAK ? "probe-c-break.json" : "probe-c.json"), JSON.stringify(res, null, 1));
    const fail = res.checks.filter((c) => !c.pass).length;
    console.log(`checks ${res.checks.length} · FAIL ${fail} · blocked ${res.blocked || 0}`);
    process.exitCode = fail ? 1 : 0;
  }
})().catch((e) => { console.error(e); process.exitCode = 2; });
