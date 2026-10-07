// Does the end bar's completion still hand the lesson to the learning engine (markLessonDone via LESSON_COMPLETE_EVENT)?
// STUDENT s1-1 · ADULT a1-1 (practice seeded as 3/3 dictated and spoken) · GRAMMAR I gh1-006 (one Step 1 check), logged out, local.
//   node engine-check.cjs <port> [--break]   (--break: press nothing — the engine lines must FAIL)
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/harness.cjs"));
const PORT = Number(process.argv[2] || 9963);
const BREAK = process.argv.includes("--break");
let fails = 0;
const ok = (name, cond, note) => { console.log(`${cond ? "PASS" : "FAIL"} ${name} — ${note}`); if (!cond) fails++; };
const END = `section[aria-label="강의 마치기"]`;
const btn = (aria) => `document.querySelector('${END} button[aria-label="${aria}"]')`;
const state = (tab) => tab.eval(`(() => { const b = document.querySelector('${END} button[aria-label^="학습 완료"]'); const n = document.querySelector('${END} a[aria-label^="다음 강의"]'); const bg = (el) => el ? getComputedStyle(el).backgroundColor : null; return { aria: b && b.getAttribute('aria-label'), disabled: b ? b.disabled : null, reason: [...document.querySelectorAll('${END} p')].map((p) => p.innerText.trim()).join(' / '), nextBg: bg(n), viewBox: !!document.querySelector('[data-completion] button, [data-completion] a') }; })()`);
const store = (tab, key) => tab.eval(`(() => { try { return JSON.parse(localStorage.getItem(${JSON.stringify(key)}) || 'null'); } catch (e) { return null; } })()`);

(async () => {
  const browser = await H.startBrowser("engine-check", PORT, { fresh: true });
  const tab = await H.openTab(browser);
  try {
    await H.setViewport(tab, "mobile");
    for (const [course, id] of [["student", "s1-1"], ["adult", "a1-1"]]) {
      await H.load(tab, "/");
      await tab.eval(`(() => { localStorage.clear(); localStorage.setItem('kig:student:practice:${course}/${id}', JSON.stringify({ v: 2, solved: { 0: true, 1: true, 2: true }, completed: { 0: true, 1: true, 2: true }, hinted: {}, hints: {}, heard: {}, mic: {}, chunked: {}, wordMarks: {}, wordRight: {} })); })()`);
      await H.load(tab, `/${course}/${id}`, { marker: H.MARKERS[course] });
      await H.sleep(800);
      const s0 = await state(tab);
      ok(`${id} practised 3/3 → end bar button on, no button left in the view`, s0.aria === "학습 완료 체크" && s0.disabled === false && !s0.viewBox, JSON.stringify(s0));
      if (!BREAK) await H.click(tab, btn("학습 완료 체크"), { settle: 900 });
      const s1 = await state(tab);
      const rec = await store(tab, `kig-learning:${course}`);
      const items = rec ? Object.keys(rec.items || {}).sort() : [];
      ok(`${id} completed → '학습 완료 취소' · '다음 강의' filled`, s1.aria === "학습 완료 취소" && /rgb\((1\d|2\d|[0-9]),/.test(String(s1.nextBg)), JSON.stringify(s1));
      ok(`${id} engine: kig-learning:${course} lessons.${id} + its 3 sentences`, !!(rec && rec.lessons && rec.lessons[id]) && JSON.stringify(items) === JSON.stringify([`${id}#1`, `${id}#2`, `${id}#3`]), `lesson ${JSON.stringify(rec && rec.lessons && rec.lessons[id])} · items ${items.join(",")}`);
      if (!BREAK) await H.click(tab, btn("학습 완료 취소"), { settle: 700 });
      const s2 = await state(tab);
      ok(`${id} un-completed → button on again (STU-U26)`, s2.aria === "학습 완료 체크" && s2.disabled === false, JSON.stringify(s2));
    }
    // GRAMMAR I gh1-006
    await H.load(tab, "/");
    await tab.eval("localStorage.clear()");
    await H.load(tab, "/grammar1/gh1-006", { marker: H.MARKERS.grammar1 });
    await H.sleep(800);
    const g0 = await state(tab);
    ok("gh1-006 nothing checked → off + reason", g0.disabled === true && /1단계에서 한 문제를 확인하면/.test(g0.reason), JSON.stringify(g0));
    await H.click(tab, `document.querySelector('main [data-step-tab="1"]')`, { settle: 300 });
    await tab.eval(`(() => { const b = document.querySelector('main [data-action="reveal-all"]'); if (b) b.click(); })()`); // '전체 정답 보기' alone must not open it
    await H.sleep(400);
    const gR = await state(tab);
    ok("gh1-006 '전체 정답 보기' alone → still off", gR.disabled === true, JSON.stringify(gR));
    await tab.eval(`(() => { const b = document.querySelector('main [data-action="hide-all"]'); if (b) b.click(); })()`);
    await H.sleep(300);
    const box = `[...document.querySelectorAll('main [data-step-panel="1"] [data-item] textarea')].find((t) => t.offsetParent !== null)`;
    if (!BREAK && (await H.type(tab, box, "I am a student"))) await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await H.sleep(900);
    const g1 = await state(tab);
    ok("gh1-006 one Step 1 check → on", g1.disabled === false, JSON.stringify(g1));
    await H.sleep(600); // the work is saved 400 ms after a change
    await H.load(tab, "/grammar1/gh1-006", { marker: H.MARKERS.grammar1 });
    await H.sleep(800);
    const g2 = await state(tab);
    ok("gh1-006 after a reload the saved check keeps it on", g2.disabled === false, JSON.stringify(g2));
    if (!BREAK) await H.click(tab, btn("학습 완료 체크"), { settle: 800 });
    const grec = await store(tab, "kig-learning:grammar1");
    ok("gh1-006 engine: kig-learning:grammar1 lessons.gh1-006", !!(grec && grec.lessons && grec.lessons["gh1-006"]), JSON.stringify(grec && grec.lessons));
    if (!BREAK) await H.click(tab, btn("학습 완료 취소"), { settle: 600 });
    const g3 = await state(tab);
    ok("gh1-006 completed lesson can be un-completed", g3.aria === "학습 완료 체크", JSON.stringify(g3));
    await tab.eval("localStorage.clear()");
  } finally {
    try { browser.proc.kill(); } catch {}
  }
  console.log(fails ? `FAIL ${fails}` : "all PASS");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
