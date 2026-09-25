#!/usr/bin/env node
/**
 * 2026-09-26 공통 기능 다시(D) — READING pr001 '멈춘 뒤 한 번 더 재생' 이 소리가 없던 까닭을 가림.
 * 찾은 것: READING 위 플레이어는 문장 소리를 말하기 엔진(unifiedSpeech — 화면에 없는 Audio)으로 틀고, 도구의 __kigStop 은 화면의
 * <audio> 만 멈춤 → 앱은 여전히 '말하는 중'(맞음) → 도구의 다음 누름이 '일시정지' 가 됨 = 도구 탓.
 * 사람이 하는 대로 다시: 앱의 '정지' 단추로 멈추고 '재생' 을 누름 — 연타 전 · 연타 뒤 모두(이용권 없는 브라우저 · 무료 pr001).
 *   node diag-reading-toggle-0926.cjs [port] [--break]   --break: '정지' 대신 '재생(일시정지)' 을 한 번 더 눌러 멈춘 척 → 소리 없어야(검사가 잡는지)
 */
const H = require("./lib/harness.cjs");
const BREAK = process.argv.includes("--break");
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
const TOGGLE = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => /^(재생|일시정지|Play|Pause)$/.test(x.getAttribute('aria-label') || ''))`;
const STOP = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => (x.getAttribute('aria-label') || '') === '정지')`;
const state = async (tab) => tab.eval(`(() => { const b = ${TOGGLE}; return b ? b.getAttribute('aria-label') : null; })()`).catch(() => null);
const soundAfter = async (tab, ms = 5000) => {
  for (let t = 0; t < ms; t += 200) { await H.sleep(200); const log = await H.audioLog(tab); if (log.some((e) => /^(playing|play-resolved|tts\.speak)$/.test(e.ev))) return true; }
  return false;
};
(async () => {
  const browser = await H.startBrowser("diag-reading", Number(process.argv[2] || 9572), { fresh: true });
  const out = [];
  let bad = 0;
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    await H.load(tab, "/reading/pr001", { marker: H.MARKERS.reading });
    // 누름마다 실제로 받은 단추를 적음(좌표로 누르는 도구가 옆 단추를 누르지 않았는지)
    await tab.eval(`(() => { window.__kigClicks = []; document.addEventListener('click', (e) => { const b = e.target.closest('button'); window.__kigClicks.push(b ? (b.getAttribute('aria-label') || (b.innerText || '').trim().slice(0, 12)) : e.target.tagName); }, true); })()`);
    const lastClick = async () => tab.eval("(window.__kigClicks || []).slice(-1)[0] || null").catch(() => null);
    const stopByApp = async () => { if (BREAK) await H.click(tab, TOGGLE, { settle: 800 }); else await H.click(tab, STOP, { settle: 800 }); };
    out.push(`처음 단추 '${await state(tab)}'`);
    await H.audioLog(tab, { clear: true });
    await H.click(tab, TOGGLE, { settle: 300 });
    const s1 = await soundAfter(tab);
    out.push(`① '재생' 한 번 → 새 소리 ${s1} · 단추 '${await state(tab)}'`);
    await stopByApp();
    out.push(`② ${BREAK ? "[깸] 재생 단추 한 번 더(일시정지)" : "앱 '정지'"} → 단추 '${await state(tab)}'`);
    await H.audioLog(tab, { clear: true });
    await H.click(tab, TOGGLE, { settle: 300 });
    const s2 = await soundAfter(tab);
    out.push(`② 그다음 '재생' → 새 소리 ${s2} · 단추 '${await state(tab)}'`);
    for (let i = 0; i < 6; i++) await H.click(tab, TOGGLE, { settle: 120 });
    await H.sleep(1500);
    out.push(`③ 연타 6번 뒤 단추 '${await state(tab)}'`);
    await stopByApp();
    out.push(`③ ${BREAK ? "[깸] 재생 단추 한 번 더" : "앱 '정지'"} → 받은 단추 '${await lastClick()}' · 단추 '${await state(tab)}'`);
    await H.audioLog(tab, { clear: true });
    await H.click(tab, TOGGLE, { settle: 300 });
    const s3 = await soundAfter(tab);
    out.push(`③ 그다음 '재생' → 새 소리 ${s3} · 단추 '${await state(tab)}'`);
    if (!(s1 && s2 && s3)) bad++;
    const ev = H.events(tab);
    out.push(`예외 ${ev.exceptions.length} · 콘솔 ${ev.console.length}`);
    await H.click(tab, STOP, { settle: 300 });
  } finally { browser.proc.kill(); }
  console.log(out.join("\n"));
  console.log(bad ? "결과: 소리 안 난 곳 있음" : "결과: 세 번 모두 새 소리");
  process.exitCode = bad ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 2; });
