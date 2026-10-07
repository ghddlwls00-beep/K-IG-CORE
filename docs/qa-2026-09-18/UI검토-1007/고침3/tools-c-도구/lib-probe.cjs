#!/usr/bin/env node
/**
 * tools-c (2026-10-08 UI검토-1007 고침3) — the page-helper libraries whose own drivers are not in this repository any more
 * (lib/g1-page.cjs · lib/g2-driver.cjs · lib/student-page.cjs): load them the way their drivers did, on the LOCAL build's free lessons
 * (gh1-006 · gh2-007 · s1-1, empty browser), and read what the 고침3 changes touch:
 *   59  the completion button found by its new name (g1 actionBtn · g2 chromeBtn('complete') · student shadowing().completion)
 *   7   GRAMMAR '정답 문장 전체 듣기': none on screen in Step 1 · after Step 3 the view's fold is found, opens, and its player reads 'n/N'
 *   25  g2-driver neighbours('gh2-007-1') = gh2-007's (Node side; --break=neighbours-old → the old walk)
 * KIG_BREAK_APP=1008 (lib/ui-1008.cjs — the page put back as before 10-08) → the 59 · 7 rows must FAIL.
 *   node lib-probe.cjs --port 9982     (BASE · KIG_PROFILE_SOURCE · KIG_CLONE_PREFIX from run.cjs)
 */
const fs = require("fs");
const path = require("path");
const S = path.resolve(__dirname, "../../../scripts");
const H = require(path.join(S, "lib/harness.cjs"));
const G1 = require(path.join(S, "lib/g1-page.cjs"));
const G2 = require(path.join(S, "lib/g2-driver.cjs"));
const SP = require(path.join(S, "lib/student-page.cjs"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9982));
const OUT = path.join(H.OUT, "ui-1007", "c-tools-c");
const tag = `${process.env.KIG_BREAK_APP ? "-break-app" + process.env.KIG_BREAK_APP : ""}${process.argv.includes("--break=neighbours-old") ? "-break-neighbours" : ""}`;
const rows = [];
const check = (id, ok, note) => { rows.push({ id, ok: !!ok, note }); console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${typeof note === "string" ? note : JSON.stringify(note)}`); };
const TODO = "이 강의 학습 완료";

(async () => {
  // 25 — Node side first
  const nbScript = G2.neighbours("gh2-007-1"), nbMain = G2.neighbours("gh2-007");
  check("25 g2-driver neighbours(gh2-007-1) = gh2-007's", JSON.stringify(nbScript) === JSON.stringify(nbMain), { script: [nbScript.prev && nbScript.prev.id, nbScript.next && nbScript.next.id], main: [nbMain.prev && nbMain.prev.id, nbMain.next && nbMain.next.id] });

  const browser = await H.startBrowser("libprobe", PORT, { fresh: true });
  try {
    // ---- GRAMMAR I (g1-page) ----
    {
      const tab = await G1.openTab(browser);
      await H.setViewport(tab, "desktop");
      await H.load(tab, "/grammar1/gh1-006", { marker: H.MARKERS.grammar1 });
      await H.waitFor(tab, "window.__g1 && window.__g1.ready()", 15000);
      const act = await tab.eval("window.__g1.actions()").catch(() => null);
      check("59 g1-page actionBtn('complete') = '이 강의 학습 완료'", act && act.completeAria === TODO, act);
      const on1 = await tab.eval("window.__g1.playerOnScreen()").catch(() => null);
      check("7 g1-page Step 1: no answer player on screen", on1 === false, { onScreen: on1 });
      await H.click(tab, "window.__g1.pill(3)", { settle: 700 });
      const sum = await tab.eval("Boolean(window.__g1.playerSummary())").catch(() => false);
      if (sum) await H.click(tab, "window.__g1.playerSummary()", { settle: 500 });
      const p = await tab.eval("window.__g1.player()").catch(() => null);
      check("7 g1-page Step 3: the view's fold found · opened · player 'n/N'", sum && p && !p.folded && /^\d+\/\d+$/.test(p.counter || ""), { summary: sum, player: p && { folded: p.folded, counter: p.counter, playAria: p.playAria } });
      await tab.close();
    }
    // ---- GRAMMAR II (g2-driver) ----
    {
      const tab = await G2.openTab(browser);
      await H.setViewport(tab, "desktop");
      await H.load(tab, "/grammar2/gh2-007", { marker: H.MARKERS.grammar2 });
      await H.waitFor(tab, "window.__g2 && window.__g2.pills().length >= 4", 15000);
      const chrome = await tab.eval("(() => { const b = window.__g2.chromeBtn('complete'); return b ? b.getAttribute('aria-label') : null; })()").catch(() => null);
      check("59 g2-driver chromeBtn('complete') = '이 강의 학습 완료'", chrome === TODO, { aria: chrome });
      const on1 = await tab.eval("window.__g2.playerOnScreen()").catch(() => null);
      check("7 g2-driver Step 1: no answer player on screen", on1 === false, { onScreen: on1 });
      await H.click(tab, "window.__g2.pill(2)", { settle: 700 });
      const sum = await tab.eval("Boolean(window.__g2.playerSummary())").catch(() => false);
      if (sum) await H.click(tab, "window.__g2.playerSummary()", { settle: 500 });
      const p = await tab.eval("window.__g2.player()").catch(() => null);
      check("7 g2-driver Step 3: the view's fold found · opened · player 'n/N'", sum && p && !p.folded && /^\d+\/\d+$/.test(p.counter || ""), { summary: sum, player: p && { folded: p.folded, counter: p.counter, playAria: p.playAria } });
      await tab.close();
    }
    // ---- STUDENT (student-page) ----
    {
      const tab = await H.openTab(browser);
      await SP.installHelpers(tab);
      await H.setViewport(tab, "mobile");
      await H.load(tab, "/student/s1-1", { marker: H.MARKERS.student });
      await H.sleep(800);
      const sh = await tab.eval("window.__S.shadowing()").catch(() => null);
      check("59 student-page shadowing().completion = '이 강의 학습 완료' (꺼짐)", sh && sh.completion && sh.completion.aria === TODO && sh.completion.disabled === true, sh && sh.completion);
      await tab.close();
    }
  } catch (e) {
    check("RUN", false, String(e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e));
  } finally {
    browser.proc.kill();
  }
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `lib-probe${tag}.json`);
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), base: H.BASE, breakApp: process.env.KIG_BREAK_APP || null, rows }, null, 1));
  console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} PASS → ${file}`);
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
})();
