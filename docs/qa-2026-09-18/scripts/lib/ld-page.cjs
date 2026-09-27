/**
 * LISTENING lesson page — browser-side steps the audit drivers share (2026-09-27, LISTENING 학습법 · 화면 고침).
 *
 * WHY. Since 2026-09-27 (계획 D02 나) a LISTENING lesson's '이 강의 학습 완료' (LessonEndBar, aria-label '학습 완료 체크') is disabled
 * until one line has been checked in Step 2 받아쓰기 on this device (src/lib/lessonGate.ts · LdLearningView). A driver that tests the
 * completion toggle must first do what a learner does: open Step 2, answer the line on screen and press '정답 확인'. The answer does
 * not have to be right — a wrong check counts too. The page's own markup is used, not texts:
 *   [data-ld-view][data-ready]           the view has read this device's record and registered its gate
 *   [data-step-tab="2"]                  the Step 2 tab (StepTabs)
 *   [data-step-panel="2"]                the Step 2 panel
 *   [data-mode="blanks|blocks|typing"]   the way of dictating (빈칸 · 블록 · 쓰기)
 *   [data-blank-rows] [data-option]      an option of a blank (빈칸)
 *   [data-word-bank] [data-tile]         a tile (블록 — a line without blanks is dictated in blocks)
 *   [data-action="check"]                '정답 확인'
 *   [data-feedback]                      the verdict: correct · wrong · empty · shown
 * If the page's markup changes, this returns { ok: false, why } — the caller records it as could-not-check, never as a pass.
 *
 *   const LDP = require("./lib/ld-page.cjs");
 *   await H.waitFor(tab, LDP.VIEW_READY, 8000);
 *   const r = await tab.eval(LDP.CHECK_ONE_LINE);   // { ok, verdict, why? }
 */

const VIEW_READY = `Boolean(document.querySelector('main [data-ld-view][data-ready]'))`;

/** Opens Step 2 in 빈칸, picks the first option of every blank (or places one tile) and presses '정답 확인' once. */
const CHECK_ONE_LINE = `(async () => {
  const main = document.querySelector('main'); if (!main) return { ok: false, why: 'no main' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const view = main.querySelector('[data-ld-view]'); if (!view) return { ok: false, why: 'no LISTENING view ([data-ld-view])' };
  const tab = view.querySelector('[data-step-tab="2"]'); if (!tab) return { ok: false, why: 'no Step 2 tab ([data-step-tab="2"])' };
  tab.click(); await sleep(500);
  const panel = view.querySelector('[data-step-panel="2"]'); if (!panel) return { ok: false, why: 'no Step 2 panel' };
  const blanks = panel.querySelector('[data-mode="blanks"]');
  if (blanks && blanks.getAttribute('aria-pressed') !== 'true') { blanks.click(); await sleep(300); }
  const retry = panel.querySelector('[data-action="retry"]');
  if (retry) { retry.click(); await sleep(300); }
  const rows = [...panel.querySelectorAll('[data-blank-rows] > li')];
  if (rows.length) {
    for (const row of rows) { const o = row.querySelector('[data-option]:not([disabled])'); if (o) { o.click(); await sleep(60); } }
  } else {
    const tile = panel.querySelector('[data-word-bank] [data-tile]:not([disabled])');
    if (!tile) return { ok: false, why: 'no blank and no tile on the line' };
    tile.click(); await sleep(100);
  }
  const check = panel.querySelector('[data-action="check"]'); if (!check) return { ok: false, why: "no '정답 확인' ([data-action=check])" };
  check.click(); await sleep(400);
  const fb = panel.querySelector('[data-feedback]');
  const verdict = fb ? fb.getAttribute('data-feedback') : null;
  return verdict === 'correct' || verdict === 'wrong' ? { ok: true, verdict } : { ok: false, why: 'no verdict after the check: ' + verdict };
})()`;

module.exports = { VIEW_READY, CHECK_ONE_LINE };
