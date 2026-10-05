/**
 * 회귀 점검 1002 T5 (2026-10-05 — 단계1/triage-ld-reading 6): the WPM a READING timed run may show, from what the record keeps.
 *
 * The app computes the WPM from the UNROUNDED time (ReadingLearningView `wordsPerMinute(wordCount, ms)`) and keeps the time rounded
 * to the millisecond (`ms: Math.round(ms)`). drive-reading re-computed the WPM from the rounded ms, so when words × 60000 ÷ ms sat on
 * an x.5 boundary the two rounded to neighbouring numbers (READING FAIL 9 — 312.5000 · 411.5058 · 349.4946 … all within 0.5 ms).
 * The true time lies in [ms − 0.5, ms + 0.5): every WPM wordsPerMinute gives inside that window is one the app could rightly show.
 * Anything outside it is still a FAIL (a wrong word count, a wrong formula, a time off by a whole millisecond or more).
 *
 *   window(wordsPerMinute, words, ms) → { lo, hi }     ok(…, shown) → shown within [lo, hi]
 */
function windowOf(wordsPerMinute, words, ms) {
  const a = wordsPerMinute(words, ms + 0.5);
  const b = wordsPerMinute(words, Math.max(ms - 0.5, 0.0001));
  return { lo: Math.min(a, b), hi: Math.max(a, b), at: wordsPerMinute(words, ms) };
}
const within = (wordsPerMinute, words, ms, shown) => {
  const w = windowOf(wordsPerMinute, words, ms);
  return Number(shown) >= w.lo && Number(shown) <= w.hi;
};
const say = (w) => (w.lo === w.hi ? String(w.lo) : `${w.lo}~${w.hi} (기록된 시간은 1ms 로 반올림 — ±0.5ms 안의 값)`);
module.exports = { windowOf, within, say };
