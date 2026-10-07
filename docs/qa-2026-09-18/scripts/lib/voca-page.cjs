/**
 * VOCA lesson page — browser-side steps the audit drivers share (2026-09-27, VOCA 학습법 · 화면 고침).
 *
 * WHY. Since 2026-09-27 (계획 D02 나) a VOCA lesson's '이 강의 학습 완료' (LessonEndBar, aria-label '학습 완료 체크' — since 2026-10-08 '이 강의 학습 완료', 59) is disabled
 * until one Step 2 round has been finished on this device (src/lib/lessonGate.ts · PhonicsLearningView). A driver that tests the
 * completion toggle must first do what a learner does: open Step 2 and answer every question of a round. The answers do not
 * have to be right — a round ends when its queue is empty (a missed word is asked again at most twice, so a round is at most
 * three times its words). The page's own markup is used, not texts:
 *   [data-step-tab="2"]        the Step 2 tab (StepTabs)
 *   [data-step-panel="2"]      the Step 2 panel
 *   [data-option]              an option of the question on screen (disabled once answered)
 *   [data-action="next"]       '다음' / '결과 보기' after an answer
 *   [data-round-result]        the result of a finished round
 *   [data-action="new-round"]  '한 회차 더' on a result screen
 * If the page's markup changes, this returns { ok: false, why } — the caller records it as could-not-check, never as a pass.
 *
 *   const V = require("./lib/voca-page.cjs");
 *   const r = await tab.eval(V.FINISH_ROUND);   // { ok, answered, why? }
 */

/**
 * True once the VOCA view has read this device's record and registered its completion gate ([data-voca-view][data-ready] —
 * the server's HTML has no gate yet, so a completion button read before this is the pre-hydration one).
 */
const VIEW_READY = `Boolean(document.querySelector('main [data-voca-view][data-ready]'))`;

/** Opens Step 2 and answers the first option of every question until the round's result shows (at most 400 presses). */
const FINISH_ROUND = `(async () => {
  const main = document.querySelector('main'); if (!main) return { ok: false, why: 'no main' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tab = main.querySelector('[data-step-tab="2"]'); if (!tab) return { ok: false, why: 'no Step 2 tab ([data-step-tab="2"])' };
  tab.click(); await sleep(500);
  let answered = 0;
  for (let i = 0; i < 400; i++) {
    const panel = main.querySelector('[data-step-panel="2"]'); if (!panel) return { ok: false, why: 'no Step 2 panel' };
    if (panel.querySelector('[data-round-result]')) return { ok: true, answered };
    const next = panel.querySelector('[data-action="next"]');
    if (next && !next.disabled) { next.click(); await sleep(120); continue; }
    const option = panel.querySelector('[data-option]:not([disabled])');
    if (option) { option.click(); answered++; await sleep(120); continue; }
    await sleep(150);
  }
  return { ok: false, answered, why: 'the round did not end within 400 steps' };
})()`;

module.exports = { VIEW_READY, FINISH_ROUND };
