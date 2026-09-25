#!/usr/bin/env node
/**
 * 2026-09-26 — READING 위 플레이어: '재생 ↔ 일시정지' 연타 뒤 '정지' 를 눌러도 단추가 '일시정지'(말하는 중)로 남고 다음 '재생' 이 소리를 안 냄.
 * 무엇이 일어나는지 시각별로: 소리 엔진의 play() · playing · pause · ended 와 단추 글, 그리고 브라우저 말하기(speechSynthesis)까지 적음.
 *   node diag-reading-toggle2-0926.cjs [port] [--taps N] [--gap ms]
 */
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const TAPS = Number(arg("--taps", 6));
const GAP = Number(arg("--gap", 120));
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
const TOGGLE = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => /^(재생|일시정지)$/.test(x.getAttribute('aria-label') || ''))`;
const STOP = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => (x.getAttribute('aria-label') || '') === '정지')`;
(async () => {
  const browser = await H.startBrowser("diag-reading2", Number(process.argv[2] || 9573), { fresh: true });
  const lines = [];
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    await H.load(tab, "/reading/pr001", { marker: H.MARKERS.reading });
    await tab.eval("window.__kigT0 = performance.now()");
    const mark = async (what) => {
      const s = await tab.eval(`(() => { const b = ${TOGGLE}; return { t: Math.round(performance.now() - window.__kigT0), label: b ? b.getAttribute('aria-label') : null, synth: window.speechSynthesis ? { speaking: speechSynthesis.speaking, paused: speechSynthesis.paused } : null }; })()`);
      lines.push(`[${String(s.t).padStart(6)}ms] ${what} → 단추 '${s.label}' · 브라우저 말하기 ${JSON.stringify(s.synth)}`);
    };
    const stopState = `(() => { const b = ${STOP}; return b ? (b.disabled ? '정지 꺼짐' : '정지 켜짐') : '정지 없음'; })()`;
    const markS = async (what) => mark(`${what} · ${await tab.eval(stopState).catch(() => "?")}`);
    await mark("시작");
    if (process.argv.includes("--replay")) {
      // 첫 판(diag-reading-toggle-0926)과 같은 차례: 재생 → 정지 → 재생 → (아래) 연타
      await H.click(tab, TOGGLE, { settle: 0 }); await markS("재생 누름");
      await H.sleep(2000); await markS("2초 뒤");
      await H.click(tab, STOP, { settle: 800 }); await markS("정지 누름 0.8초 뒤");
      await H.click(tab, TOGGLE, { settle: 300 }); await markS("다시 재생 누름");
      const after = Number(arg("--tap-after", 2000));
      await H.sleep(after); await markS(`${after / 1000}초 뒤`);
    } else {
      await H.click(tab, TOGGLE, { settle: 0 }); await mark("재생 누름");
      await H.sleep(2500); await mark("2.5초 뒤");
    }
    for (let i = 0; i < TAPS; i++) { await H.click(tab, TOGGLE, { settle: GAP }); await mark(`연타 ${i + 1}`); }
    for (let k = 1; k <= 6; k++) { await H.sleep(250); await markS(`연타 끝 ${k * 0.25}초 뒤`); }
    await H.click(tab, STOP, { settle: 0 }); await markS("정지 누름");
    await H.sleep(800); await markS("정지 0.8초 뒤");
    await H.sleep(3000); await mark("정지 3.8초 뒤");
    await H.click(tab, TOGGLE, { settle: 0 }); await mark("재생 누름");
    await H.sleep(3000); await mark("3초 뒤");
    const log = await H.audioLog(tab);
    const t0 = await tab.eval("window.__kigT0");
    lines.push("--- 소리 엔진 사건(시각 · 사건 · 파일 끝)");
    for (const e of log) lines.push(`[${String(Math.round(e.t - t0)).padStart(6)}ms] ${e.ev}${e.name ? " " + e.name : ""} ${String(e.src || e.text || "").split("/").pop().slice(-28)}${e.ct !== undefined ? ` ct ${e.ct}` : ""}`);
    const ev = H.events(tab);
    lines.push(`예외 ${ev.exceptions.length} · 콘솔 ${ev.console.length} ${JSON.stringify(ev.console).slice(0, 300)}`);
    await H.click(tab, STOP, { settle: 200 });
  } finally { browser.proc.kill(); }
  console.log(lines.join("\n"));
})().catch((e) => { console.error(e); process.exitCode = 2; });
