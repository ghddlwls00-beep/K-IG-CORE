/**
 * WHERE each kind of expected text must appear — read from that place only.
 *
 * WHY THIS EXISTS. The content check used to join the innerText of every step into
 * one blob and pass an expected string if it occurred anywhere in it, as a lowercase
 * substring of its first 60 characters. Every course shows its sentences in more than
 * one step (GRAMMAR prints each item in all four; LISTENING prints each Korean line in
 * four places; VOCA's words reappear on the STEP 3 review cards), and the driver puts
 * text on screen itself (it presses "전체 정답 보기", assembles dictation tiles). So a
 * text that vanished from the place a learner is meant to see it was still "found".
 * Measured 2026-09-23 with deliberate breaks, one course at a time: see
 * docs/qa-2026-09-18/4-5단계-작업기록.md and scripts/proof-summary.cjs.
 *
 * Each reader runs right after the driver opens its step, before the driver presses
 * anything on that step. A reader that has to open a view to see everything (STUDENT's
 * blind filter; VOCA's "전체 N단어 펼쳐보기" until 2026-09-27) opens it with a plain element.click()
 * — which does not set the driver's `__kigClicked` mark, so the control pass still
 * presses that button itself — and puts it back the way it found it.
 *
 * A reader that finds NOTHING returns an empty list, and every expected text of its
 * kind is then reported missing. That is deliberate: if the page's markup changes,
 * the check must fail loudly rather than fall back to the blob and pass silently.
 *
 * OTHER PLACES THESE SELECTORS ALSO MATCH (listed by the 2026-09-23 review, "3차 점검").
 * The selectors are class substrings, so they are only safe because of WHEN they run:
 *   student-cards   2026-09-27: scoped to [data-step-panel="1"] — Step 2 (its one sentence's Korean line behind
 *                   '우리말 힌트') and Step 3 (English and Korean of every sentence) also carry [data-en] / [data-ko],
 *                   but they are other panels and not mounted while STEP 1 is open. Step 2's one line would be
 *                   exactly LISTENING's "sentence 1 only" hole if the reader were not scoped.
 *   reading-passage 2026-09-27: scoped to [data-step-panel="1"] and to [data-en] — Step 3's rows (원문 대조) and Step 4's timed
 *                   passage (only while its clock runs) also carry data-sentence-id, but those panels are not mounted
 *                   during STEP 1 (2026-09-28 순서 바꿈: 1 처음 읽기 · 2 핵심 어휘 · 3 원문 대조 · 4 다시 읽고 재기).
 *   ld-script-ko    2026-09-27: scoped to [data-step-panel="5"] [data-line] [data-ko] — Steps 2–4 also carry [data-ko] for the
 *                   line on screen, but they are other panels and not mounted while STEP 5 is open.
 *   reading-vocab   2026-09-27: scoped to [data-step-panel="2"] li[data-vocab] — [data-word-text] · [data-meaning]. 2026-09-28: the
 *                   blanks share Step 2 now (below the cards, [data-blanks]); they are not li[data-vocab] and carry neither mark.
 *   reading-ko      2026-09-28: scoped to [data-step-panel="3"] [data-rows] — 원문 대조 moved from Step 4 to Step 3. The English of a
 *                   row is [data-en], a different attribute, so it cannot stand in for the Korean.
 *   student-cards   (ADULT, 2026-10-04) the same reader on ADULT Step 1; ADULT Step 3 also carries [data-en] · [data-ko]
 *                   (each chunk) and Step 5 every sentence, but those panels are not mounted while STEP 1 is open.
 *   adult-words     scoped to [data-step-panel="2"] li[data-vocab] — the blanks below ([data-cloze]) repeat the sentence
 *                   ([data-masked] · [data-filled]) but are not li[data-vocab].
 *   adult-chunks    scoped to [data-step-panel="3"] [data-chunk-sentence] li[data-chunk] — Step 5's [data-sentence] rows also
 *                   carry [data-en] · [data-ko], but that panel is not mounted while STEP 3 is open.
 * If a new element with the same classes appears in the SAME step, a selector widens without
 * any error. Re-run the deliberate-break test (scripts/proof-run.cjs) after changing a view.
 */

const SLEEP = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));";
const BTN = "const btn = (re) => [...main.querySelectorAll('button')].find((b) => re.test((b.innerText || '').replace(/\\s+/g, ' ').trim()));";
const TEXTS = "const texts = (list) => list.map((el) => (el.innerText || '').replace(/\\s+/g, ' ').trim()).filter(Boolean);";

const READERS = {
  /**
   * VOCA STEP 1 word list — every word of every row.
   * 2026-09-27 (VOCA 학습법 · 화면 고침 — E01 · VOCA-U09): Step 1 shows every word at once (no '전체 N단어 펼쳐보기', no
   * 'Cluster #n'), each word a button whose word is [data-word-text] inside li[data-word] in the Step 1 panel
   * ([data-step-panel="1"]) — the card class this read before (min-h-[96px]) left with the design rules. '뜻 가리기' hides only
   * the meanings, never the words. Steps 2–4 are other panels and not mounted while STEP 1 is open.
   */
  "voca-grid": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-step-panel="1"] [data-word] [data-word-text]')]);
  })()`,

  /**
   * GRAMMAR Step 1 Korean prompt of each item.
   * 2026-09-27 (GRAMMAR 학습법 · 화면 고침 — GRM-U11 · L08): the prompt is p[data-ko] inside the Step 1 panel
   * (section[data-step-panel="1"]); the tinted box it used to sit in (div.bg-raised/50.p-3.5) is gone. Steps 1–3
   * show ten items at a time, but every bundle stays in the DOM (hidden), and innerText of a hidden element is
   * its text content — so this still reads EVERY item, not just the ten on screen.
   */
  "grammar-ko": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-step-panel="1"] [data-item] [data-ko]')]);
  })()`,

  /**
   * GRAMMAR Step 3 English sentence of each item — the one place English is shown without a button.
   * 2026-09-27: p[data-en] in the Step 3 panel (its hover colour, which this used to key on, left with the design rules).
   */
  "grammar-en": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-step-panel="3"] [data-item] [data-en]')]);
  })()`,

  /**
   * STUDENT STEP 1 sentence list, English and Korean, with the script filter on '모두'.
   * 2026-09-27 (STUDENT 학습법 · 화면 고침 — D01 · STU-U05): the filter is a four-part row '가림 · 영어 · 해석 · 모두'
   * ([data-filter] with aria-pressed — it used to be found by '모두 가림 · 영어만 · 해석만 · 전체 보기' and a gold fill), and a
   * sentence is li[data-sentence] with its English in [data-en] and its Korean in [data-ko], inside the Step 1 panel
   * ([data-step-panel="1"]) — the class sizes this read before (text-[16px] · text-[13.5px]) left with the design rules.
   * A blank in brackets is a chip INSIDE [data-en] whose text is the bracket itself, so the sentence reads as written.
   */
  "student-cards": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${TEXTS}
    const panel = main.querySelector('[data-step-panel="1"]'); if (!panel) return [];
    const active = panel.querySelector('[data-filter][aria-pressed="true"]');
    const all = panel.querySelector('[data-filter="all"]');
    if (all && all !== active) { all.click(); await sleep(500); }
    const out = [
      ...texts([...panel.querySelectorAll('[data-sentence] [data-en]')]),
      ...texts([...panel.querySelectorAll('[data-sentence] [data-ko]')]),
    ];
    if (active && all && all !== active) { active.click(); await sleep(300); }
    return out;
  })()`,

  /**
   * ADULT Step 2 '단어' (회귀 점검 1002 · 2026-10-04 — src/components/AdultWordsStep.tsx renderCard): one card per key word,
   * li[data-vocab] in the Step 2 panel — the word [data-word-text], its part of speech (the line right after the word,
   * no mark of its own), the meaning [data-meaning] (only after '뜻 보기'; '뜻 모두 보기' is [data-action="reveal-all"]) and the
   * sentence [data-context]. A card marked '알아요' is folded ([data-action="unfold"]) and draws none of that, so the reader
   * unfolds such cards first (they stay unfolded for this visit), reveals every meaning, reads, and hides them again.
   * One text per card: 'word | pos | meaning | sentence' (lib/expectations.cjs word-card) — a meaning on another card is a miss.
   * The blanks below the cards ([data-blanks]) are not li[data-vocab].
   */
  "adult-words": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP}
    const panel = main.querySelector('[data-step-panel="2"]'); if (!panel) return [];
    const t = (el) => (el ? (el.innerText || el.textContent || '') : '').replace(/\\s+/g, ' ').trim();
    for (const b of [...panel.querySelectorAll('[data-vocab] [data-action="unfold"]')]) b.click();
    if (panel.querySelector('[data-vocab] [data-action="unfold"]')) await sleep(300);
    await sleep(100);
    const toggle = panel.querySelector('[data-action="reveal-all"]');
    const hidden = panel.querySelectorAll('[data-vocab] [data-action="reveal"]').length > 0;
    if (toggle && hidden) { toggle.click(); await sleep(400); }
    const out = [...panel.querySelectorAll('li[data-vocab]')].map((li) => {
      const w = li.querySelector('[data-word-text]');
      return [t(w), t(w && w.nextElementSibling), t(li.querySelector('[data-meaning]')), t(li.querySelector('[data-context]'))].join(' | ');
    });
    if (toggle && hidden) { toggle.click(); await sleep(250); }
    return out;
  })()`,

  /**
   * ADULT Step 3 '끊어 읽기' (회귀 점검 1002 — StudentLearningView renderChunks): ONE sentence at a time ([data-chunk-sentence]),
   * each chunk li[data-chunk] with its English [data-en] and, once opened, its Korean [data-ko]; with every meaning open the
   * sentence's Korean line shows in [data-chunk-whole] ('문장 전체 해석', its second line). The reader opens every sentence by its
   * number button ([data-pill] — that plays the sentence's chunks, as for a learner; the sound is stopped at the end), turns
   * '뜻 모두 보기' ([data-action="all-meanings"]) on, reads, and turns it back off. Opening every meaning counts the sentence as read
   * in chunks on this device (practice.chunked — the tab's count), which is what a learner who looks has done.
   * Texts: 'en | ko' per chunk, and the whole line as it is (lib/expectations.cjs chunk · chunk-whole).
   */
  "adult-chunks": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP}
    const panel = main.querySelector('[data-step-panel="3"]'); if (!panel || !panel.querySelector('[data-chunk-sentence]')) return [];
    const t = (el) => (el ? (el.innerText || el.textContent || '') : '').replace(/\\s+/g, ' ').trim();
    const out = [];
    const pills = [...panel.querySelectorAll('[data-pill]')];
    for (let i = 0; i < Math.max(1, pills.length); i++) {
      if (pills[i]) { pills[i].click(); for (let k = 0; k < 20 && (panel.querySelector('[data-chunk-sentence]') || {}).getAttribute?.('data-chunk-sentence') !== String(i); k++) await sleep(50); }
      await sleep(150);
      const all = panel.querySelector('[data-action="all-meanings"]');
      const wasOn = all && all.getAttribute('aria-pressed') === 'true';
      if (all && !wasOn) { all.click(); await sleep(300); }
      for (const li of panel.querySelectorAll('[data-chunk-sentence] li[data-chunk]')) out.push(t(li.querySelector('[data-en]')) + ' | ' + t(li.querySelector('[data-ko]')));
      const whole = panel.querySelector('[data-chunk-whole]');
      if (whole) out.push(t(whole.lastElementChild));
      if (all && !wasOn) { all.click(); await sleep(150); }
    }
    if (pills[0]) { pills[0].click(); await sleep(200); }
    try { window.__kigStop && window.__kigStop(); } catch (e) {}
    return out;
  })()`,

  /**
   * READING STEP 1 passage, one element per sentence.
   * 2026-09-27 (READING 학습법 · 화면 고침 — G01 · G05): the sentence's English is [data-en] inside [data-sentence-id] in the
   * Step 1 panel ([data-step-panel="1"]) — a sentence also carries a number <sup> and, when pressed, a Korean line OUTSIDE it,
   * so only [data-en] is read. 2026-09-28: Step 1 is '처음 읽기' (not timed) and still shows the whole passage from the start;
   * Step 3's rows and Step 4's timed passage carry [data-sentence-id] too, but are other panels, not mounted during STEP 1.
   */
  "reading-passage": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-step-panel="1"] [data-sentence-id] [data-en]')]);
  })()`,

  /**
   * READING STEP 2 key words: the word and, once revealed, the meaning of each row.
   * 2026-09-27 (READING 학습법 · 화면 고침 — G02 · D32): one row per word, li[data-vocab] in the Step 2 panel — the word is
   * [data-word-text], the meaning [data-meaning] (hidden until '뜻 보기'; '뜻 모두 보기' is [data-action="reveal-all"]). A word the
   * learner marked '알아요' is a folded row ([data-action="unfold"]) whose meaning is not drawn, so the reader unfolds such rows
   * first (they stay unfolded for this visit), reveals every meaning, and hides them again afterwards. The class sizes this
   * read before (text-[17px] · text-[13.5px]) left with the design rules.
   */
  "reading-vocab": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${TEXTS}
    const panel = main.querySelector('[data-step-panel="2"]'); if (!panel) return [];
    for (const b of [...panel.querySelectorAll('[data-action="unfold"]')]) b.click();
    if (panel.querySelector('[data-action="unfold"]')) await sleep(300);
    const toggle = panel.querySelector('[data-action="reveal-all"]');
    const hidden = panel.querySelectorAll('[data-action="reveal"]').length > 0;
    if (toggle && hidden) { toggle.click(); await sleep(400); }
    const out = [
      ...texts([...panel.querySelectorAll('[data-vocab] [data-word-text]')]),
      ...texts([...panel.querySelectorAll('[data-vocab] [data-meaning]')]),
    ];
    if (toggle && hidden) { toggle.click(); await sleep(250); }
    return out;
  })()`,

  /**
   * READING STEP 3 (원문 대조), the Korean of each sentence row.
   * 2026-09-27 (READING 학습법 · 화면 고침 — G03): one row per sentence (ol[data-rows] li[data-sentence-id]) with its English
   * [data-en] and its Korean [data-ko]. The view opens on '영어 · 한글', where every row shows [data-ko]; under '영어만' a row
   * shows '해석 보기' instead, so a reader running after a driver chose that view finds fewer.
   * 2026-09-28 (사장님 D31 다 — 순서 바꿈): 원문 대조 is Step 3 now (it was Step 4), so the reader reads the Step 3 panel.
   */
  "reading-ko": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-step-panel="3"] [data-rows] [data-sentence-id] [data-ko]')]);
  })()`,

  /**
   * LISTENING STEP 5 script, the Korean line of each sentence.
   * 2026-09-27 (LISTENING 학습법 · 화면 고침 — D29 나 · LD-L08): a line is li[data-line] in the Step 5 panel ([data-step-panel="5"])
   * and its Korean p[data-ko] shows on a press or with '해석 모두 보기' ([data-action="show-all-ko"], role switch); a line not yet
   * dictated is hidden until '그래도 보기' ([data-action="peek"] — once for the lesson, kept on this device). The reader presses
   * '그래도 보기' if it is there and '해석 모두 보기' if it is off, reads, and turns '해석 모두 보기' back (the peek stays — it is
   * what a learner who looks has done). It read p.text-[13px].mt-1 before, a class the design rules removed.
   */
  "ld-script-ko": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${TEXTS}
    const panel = main.querySelector('[data-step-panel="5"]'); if (!panel) return [];
    const peek = panel.querySelector('[data-action="peek"]');
    if (peek) { peek.click(); await sleep(400); }
    const all = panel.querySelector('[data-action="show-all-ko"]');
    const wasOn = all && all.getAttribute('aria-checked') === 'true';
    if (all && !wasOn) { all.click(); await sleep(400); }
    const out = texts([...panel.querySelectorAll('[data-line] [data-ko]')]);
    if (all && !wasOn) { all.click(); await sleep(200); }
    return out;
  })()`,
};

/**
 * course → the containers the driver reads, which step they live on (matched against
 * the step button's label), and which expected-text kinds they answer for. `lang`
 * narrows a container to Korean or English texts of a kind that holds both (GRAMMAR's
 * "item" is Korean on a Korean page and English on an English one).
 */
// Step labels differ in case and decoration by course ("STEP 1 💡 …", "✍️ Step 1 · …",
// "🎧 Step 1. …"), so match the number only, and never "Step 10".
const STEP = (n) => new RegExp(`\\bstep ${n}(?!\\d)`, "i");

const CONTAINERS = {
  phonics: [{ id: "voca-grid", step: STEP(1), kinds: ["word"] }],
  grammar1: [
    { id: "grammar-ko", step: STEP(1), kinds: ["item"], lang: "ko" },
    { id: "grammar-en", step: STEP(3), kinds: ["item"], lang: "en" },
  ],
  grammar2: [
    { id: "grammar-ko", step: STEP(1), kinds: ["item"], lang: "ko" },
    { id: "grammar-en", step: STEP(3), kinds: ["item"], lang: "en" },
  ],
  student: [{ id: "student-cards", step: STEP(1), kinds: ["en", "ko"] }],
  // 회귀 점검 1002 (2026-10-04): ADULT — StudentLearningView with five steps: 1 블라인드 리스닝 (STUDENT's Step 1 list, the same
  // reader) · 2 단어 (cards) · 3 끊어 읽기 (chunks) · 4 탭 딕테이션 · 5 섀도잉 & 낭독. The tabs are 'compact' (StepTabs): a tab that is
  // not the current one reads 'Step N' only — STEP(n) matches that too.
  adult: [
    { id: "student-cards", step: STEP(1), kinds: ["en", "ko"] },
    { id: "adult-words", step: STEP(2), kinds: ["word-card"] },
    { id: "adult-chunks", step: STEP(3), kinds: ["chunk", "chunk-whole"] },
  ],
  // 2026-09-28 (READING 순서 바꿈 — D31 다): 1 처음 읽기 (passage) · 2 핵심 어휘 (cards + blanks) · 3 원문 대조 (rows) · 4 다시 읽고 재기
  reading: [
    { id: "reading-passage", step: STEP(1), kinds: ["en"] },
    { id: "reading-vocab", step: STEP(2), kinds: ["word", "meaning"] },
    { id: "reading-ko", step: STEP(3), kinds: ["ko-sentence"] },
  ],
  ld: [{ id: "ld-script-ko", step: STEP(5), kinds: ["ko-script"] }],
};

const isKo = (s) => /[가-힣]/.test(String(s || ""));

/** The container that answers for one expected text, or null when that kind has no reader yet. */
function containerFor(course, text) {
  return (CONTAINERS[course] || []).find((c) =>
    c.kinds.includes(text.kind) && (!c.lang || (c.lang === "ko") === isKo(text.text))) || null;
}

/** Comparison key: case, spacing, curly quotes and "a/b" alternatives do not count as differences. */
const key = (s) => String(s || "")
  .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
  .replace(/\s*\/\s*/g, " ")
  .replace(/\s+/g, " ").trim().toLowerCase();

module.exports = { READERS, CONTAINERS, containerFor, key };
