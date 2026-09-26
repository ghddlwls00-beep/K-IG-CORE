#!/usr/bin/env node
/**
 * 2026-09-26 배포 뒤 — D 빠른 동작에서 GRAMMAR II gh2-007 만 '멈춘 뒤 한 번 더 재생' 에 소리 오류 2(error · play-rejected NotSupportedError).
 * 새 소리는 났음. 어느 소리(파일)가 어떤 차례로 오류가 났는지 시각별로 — BUG-034 고침(speech.ts) 탓인지 원래 있던 대체 길인지 가림.
 * D 와 같은 차례: 재생 단추 6번 연타 + 두 번 누르기 → 단계 3바퀴 → 앱 '정지'(켜져 있으면) · __kigStop → 첫 단계 → 재생 한 번. 세 번 되풀이.
 *   node diag-grammar2-again-0926.cjs [port] [--page /grammar2/gh2-007]
 */
const H = require("./lib/harness.cjs");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PAGE = arg("--page", "/grammar2/gh2-007");
const VIS = `(b) => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;
(async () => {
  const browser = await H.startBrowser("diag-g2", Number(process.argv[2] || 9578), { fresh: true });
  const lines = [];
  try {
    const tab = await H.openTab(browser);
    await H.setViewport(tab, "desktop");
    for (let run = 1; run <= 3; run++) {
      const course = PAGE.split("/")[1];
      await H.load(tab, PAGE, { marker: H.MARKERS[course] });
      const tagPlay = (re) => `(() => { const b = [...document.querySelectorAll('main button')].filter(${VIS}).find((x) => ${re}.test((x.getAttribute('aria-label') || '') + (x.innerText || ''))); if (!b) return null; document.querySelectorAll('[data-kig-play]').forEach((x) => x.removeAttribute('data-kig-play')); b.setAttribute('data-kig-play', '1'); return (b.getAttribute('aria-label') || b.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 30); })()`;
      const tagged = `document.querySelector('main [data-kig-play="1"]')`;
      const first = await tab.eval(tagPlay("/재생|🔊/"));
      for (let i = 0; i < 6; i++) { if (!(await tab.eval(`Boolean(${tagged})`))) await tab.eval(tagPlay("/재생|🔊|⏹|정지/")); await H.click(tab, tagged, { settle: 120 }); }
      const steps = (await tab.eval(`[...document.querySelectorAll('main button')].filter(${VIS}).filter((b) => /step\\s*\\d|단계/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, ' ').trim())`)) || [];
      for (let r = 0; r < 3; r++) for (const s of steps) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(s)})`, { settle: 120 });
      await H.sleep(1500);
      const STOPBTN = `[...document.querySelectorAll('main button')].filter(${VIS}).find((x) => (x.getAttribute('aria-label') || '') === '정지')`;
      for (let k = 0; k < 8; k++) { const st = await tab.eval(`(() => { const s = ${STOPBTN}; return s ? (s.disabled ? 'off' : 'on') : 'none'; })()`); if (st === "on") { await H.click(tab, STOPBTN, { settle: 600 }); break; } if (st === "none") break; await H.sleep(250); }
      await tab.eval("window.__kigStop && window.__kigStop()");
      await H.sleep(800);
      if (steps.length) await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(steps[0])})`, { settle: 900 });
      const againLabel = await tab.eval(tagPlay("/재생|🔊/"));
      await H.audioLog(tab, { clear: true });
      const t0 = await tab.eval("performance.now()");
      await H.click(tab, tagged, { settle: 200 });
      await H.sleep(4000);
      const log = await H.audioLog(tab);
      lines.push(`== ${run}번째 · 처음 누른 단추 '${first}' · 다시 누른 단추 '${againLabel}'`);
      for (const e of log.slice(0, 14)) lines.push(`  +${String(Math.round(e.t - t0)).padStart(5)}ms ${e.ev}${e.name ? " " + e.name : ""}${e.err ? " err" + e.err : ""} ${String(e.src || e.text || "").replace(H.BASE, "").slice(-60)}`);
      await tab.eval("window.__kigStop && window.__kigStop()");
    }
  } finally { browser.proc.kill(); }
  console.log(lines.join("\n"));
})().catch((e) => { console.error(e); process.exitCode = 2; });
