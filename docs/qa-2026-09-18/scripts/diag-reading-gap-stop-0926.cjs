#!/usr/bin/env node
/**
 * 2026-09-26 — READING 위 플레이어: 문장과 문장 사이(약 0.3초)에 '정지' 를 누르면 먹는가.
 * 첫 문장이 끝나는 순간('ended')을 기다렸다가 바로 '정지' 를 누름 → 그 순간 정지 단추가 꺼져 있었나 · 다음 문장이 그래도 시작하나.
 * 비교: 같은 쪽에서 문장 가운데(재생 1초 뒤) '정지' → 멈춰야 함. 세 번씩(이용권 없는 브라우저 · 무료 pr001).
 *   node diag-reading-gap-stop-0926.cjs [port]
 */
const H = require("./lib/harness.cjs");
const VIS = `(b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
const TOGGLE = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => /^(재생|일시정지)$/.test(x.getAttribute('aria-label') || ''))`;
const STOP = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => (x.getAttribute('aria-label') || '') === '정지')`;
(async () => {
  const browser = await H.startBrowser("diag-gap", Number(process.argv[2] || 9575), { fresh: true });
  const rows = [];
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    for (const mode of ["문장 가운데", "문장 사이", "문장 가운데", "문장 사이", "문장 가운데", "문장 사이"]) {
      await H.load(tab, "/reading/pr001", { marker: H.MARKERS.reading });
      await H.audioLog(tab, { clear: true });
      await H.click(tab, TOGGLE, { settle: 0 });
      if (mode === "문장 가운데") await H.sleep(1000);
      else {
        // 첫 문장이 끝나는 순간까지 기다림(50ms 마다)
        for (let i = 0; i < 200; i++) { const log = await H.audioLog(tab); if (log.some((e) => e.ev === "ended")) break; await H.sleep(50); }
      }
      const before = await tab.eval(`(() => { const s = ${STOP}; const t = ${TOGGLE}; return { stopDisabled: s ? s.disabled : null, toggle: t ? t.getAttribute('aria-label') : null, at: Math.round(performance.now()) }; })()`);
      // 정지 누름 — 꺼진 단추에도 '누름' 이 되도록 좌표 대신 진짜 마우스를 그 자리에(사람 손가락처럼)
      // --toggle: '정지' 대신 '재생/일시정지' 단추를 그 자리에서(멈추려던 사람) — 코드상 틈에는 말하는 중이 아니라 첫 문장부터 다시 시작할 것
      const target = process.argv.includes("--toggle") ? TOGGLE : STOP;
      const r = await tab.eval(`(() => { const s = ${target}; const x = s.getBoundingClientRect(); return { x: x.x + x.width / 2, y: x.y + x.height / 2 }; })()`);
      for (const type of ["mousePressed", "mouseReleased"]) await tab.send("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
      const t0 = await tab.eval("Math.round(performance.now())");
      await H.sleep(1500);
      const log = await H.audioLog(tab);
      const startedAfter = log.filter((e) => e.t > t0 && /^(playing|play-resolved)$/.test(e.ev)).map((e) => String(e.src).split("/").pop().slice(-24));
      const after = await tab.eval(`(() => { const t = ${TOGGLE}; return t ? t.getAttribute('aria-label') : null; })()`);
      const stopped = !startedAfter.length && after === "재생";
      let resumed = "";
      // --resume(--toggle 과 같이): 틈에서 멈춘 뒤 다시 '재생' → 이어서 다음 문장이 나와야(첫 문장부터 다시가 아니라)
      if (process.argv.includes("--resume") && mode === "문장 사이" && stopped) {
        const t1 = await tab.eval("Math.round(performance.now())");
        await H.click(tab, TOGGLE, { settle: 0 });
        await H.sleep(2000);
        const next = (await H.audioLog(tab)).filter((e) => e.t > t1 && e.ev === "playing").map((e) => String(e.src).split("/").pop().slice(-24));
        resumed = ` · 다시 '재생' → 나온 소리 ${next.length ? next[0] : "없음"}`;
      }
      rows.push(`${mode}: 누를 때 정지 단추 ${before.stopDisabled ? "꺼짐" : "켜짐"} · 재생 단추 '${before.toggle}' → 1.5초 뒤 단추 '${after}' · 누른 뒤 새로 시작한 소리 ${startedAfter.length ? startedAfter.join(",") : "없음"} → ${stopped ? "멈춤" : "안 멈춤"}${resumed}`);
      await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
      const s2 = await tab.eval(`(() => { const s = ${STOP}; return s && !s.disabled; })()`).catch(() => false);
      if (s2) await H.click(tab, STOP, { settle: 300 });
    }
  } finally { browser.proc.kill(); }
  console.log(rows.join("\n"));
})().catch((e) => { console.error(e); process.exitCode = 2; });
