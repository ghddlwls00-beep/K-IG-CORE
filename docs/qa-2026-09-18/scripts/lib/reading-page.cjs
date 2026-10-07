/**
 * READING lesson page — browser-side steps the audit drivers share (2026-09-27, READING 학습법 · 화면 고침).
 *
 * (2026-10-08 UI검토-1007 고침3: the button's name is its words '이 강의 학습 완료' — it was '학습 완료 체크' (59); and Step 4's
 * comprehension questions open only after this '다 읽었어요' (4장 6) — the order below is unchanged, so this helper is too.)
 * WHY. Since 2026-09-27 (계획 D02 나) a READING lesson's '이 강의 학습 완료' (LessonEndBar, aria-label '학습 완료 체크') is disabled
 * until the passage was read and timed once on this device (src/lib/lessonGate.ts · ReadingLearningView). A driver that tests the
 * completion toggle must first do what a learner does: open the timed step, press '읽기 시작', wait as long as reading takes, press
 * '다 읽었어요'. A run faster than 500 words a minute is not a reading and is not saved (RD-L04), so the wait is the passage's
 * words × 0.12 s plus a second.
 *
 * 2026-09-28 (사장님 D31 다 — READING 순서 바꿈): the timed reading moved from Step 1 to Step 4 '다시 읽고 재기'. Step 1 '처음 읽기'
 * is not timed any more — its own '다 읽었어요' ([data-action="first-read-done"]) records nothing and does NOT open the completion,
 * so this helper must not press it; it opens Step 4 instead. The page's own markup is used, not texts:
 *   [data-reading-view][data-ready]                    the view read this device's record and registered its completion gate
 *   [data-step-tab="4"]                                the Step 4 tab (StepTabs)
 *   [data-step-panel="4"] [data-passage-meta]          "76단어 · 5문장 · 목표 약 25초" — the word count is read from it
 *   [data-step-panel="4"] [data-action="start-reading"] '읽기 시작' (no run yet) · [data-action="measure-again"] '다시 재기' (a run exists)
 *   [data-step-panel="4"] [data-action="finish-reading"] '다 읽었어요' at the end of the timed passage
 *   [data-step-panel="4"] [data-speed-result]          the result
 * If the page's markup changes, this returns { ok: false, why } — the caller records it as could-not-check, never as a pass.
 *
 *   const R = require("./lib/reading-page.cjs");
 *   await tab.eval(R.VIEW_READY) ;  const r = await tab.eval(R.MEASURE_ONCE);   // { ok, words, waitedMs, why? }
 *
 * The drivers that press READING's completion today: drive-reading.cjs (uses this), drive-generic.cjs and gap-checks-0926.cjs P
 * (they need the same one step for READING that they do for VOCA with voca-page.cjs).
 */

/** True once the READING view has read this device's record and registered its completion gate. */
const VIEW_READY = `Boolean(document.querySelector('main [data-reading-view][data-ready]'))`;

/** Opens Step 4 (다시 읽고 재기), times one reading slowly enough to count (≤ 500 WPM), and waits for the result. */
const MEASURE_ONCE = `(async () => {
  const main = document.querySelector('main'); if (!main) return { ok: false, why: 'no main' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tab = main.querySelector('[data-step-tab="4"]'); if (!tab) return { ok: false, why: 'no Step 4 tab ([data-step-tab="4"])' };
  tab.click(); await sleep(400);
  const panel = main.querySelector('[data-step-panel="4"]'); if (!panel) return { ok: false, why: 'no Step 4 panel ([data-step-panel="4"])' };
  // a run left going by an earlier press (the tab click does not stop it when Step 4 was already open) is stopped first
  const leftover = panel.querySelector('[data-action="cancel-reading"]');
  if (leftover) { leftover.click(); await sleep(300); }
  const meta = panel.querySelector('[data-passage-meta]');
  const words = meta ? Number(((meta.textContent || '').match(/(\\d+)\\s*단어/) || [])[1]) : NaN;
  if (!(words > 0)) return { ok: false, why: 'no word count ([data-step-panel="4"] [data-passage-meta])' };
  const start = panel.querySelector('[data-action="start-reading"]') || panel.querySelector('[data-action="measure-again"]');
  if (!start) return { ok: false, why: 'no start button ([data-step-panel="4"] [data-action="start-reading"] / "measure-again")' };
  start.click(); await sleep(300);
  const waitedMs = Math.ceil(words * 120) + 1000;
  await sleep(waitedMs);
  const finish = main.querySelector('[data-step-panel="4"] [data-action="finish-reading"]');
  if (!finish) return { ok: false, words, why: 'no finish button ([data-step-panel="4"] [data-action="finish-reading"])' };
  finish.click(); await sleep(400);
  const result = main.querySelector('[data-step-panel="4"] [data-speed-result]');
  return result ? { ok: true, words, waitedMs } : { ok: false, words, waitedMs, why: 'no result after 다 읽었어요 ([data-step-panel="4"] [data-speed-result])' };
})()`;

module.exports = { VIEW_READY, MEASURE_ONCE };
