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
 * anything on that step. A reader that has to open a view to see everything (VOCA's
 * "전체 N단어 펼쳐보기", STUDENT's blind filter) opens it with a plain element.click()
 * — which does not set the driver's `__kigClicked` mark, so the control pass still
 * presses that button itself — and puts it back the way it found it.
 *
 * A reader that finds NOTHING returns an empty list, and every expected text of its
 * kind is then reported missing. That is deliberate: if the page's markup changes,
 * the check must fail loudly rather than fall back to the blob and pass silently.
 *
 * OTHER PLACES THESE SELECTORS ALSO MATCH (listed by the 2026-09-23 review, "3차 점검").
 * The selectors are class substrings, so they are only safe because of WHEN they run:
 *   student-cards   StudentLearningView.tsx:835 (dictation, koParas[dictationIdx] — sentence 1
 *                   by default) and :1178 (shadowing) — not mounted while STEP 1 is open.
 *                   :835 would be exactly LISTENING's "sentence 1 only" hole if it were.
 *   reading-passage ReadingLearningView.tsx:1130·1175 — another step's data-sentence-id spans,
 *                   not mounted during STEP 1 (the deliberate break of the last sentence was
 *                   caught 32/33, which is that fact measured).
 *   ld-script-ko    LdLearningView.tsx:493 (page note), :800 (hint chips), :1001·1134 (step
 *                   notes) — none holds a script line, so none can stand in for one.
 *   reading-vocab   scoped to section[aria-label="Key Vocabulary"], which exists only while
 *                   STEP 2 is open; nothing else in that section carries those two classes.
 *   reading-ko      scoped to the one column labelled "한글 완역" inside the STEP 4 section; the
 *                   English column beside it has the same span structure and is excluded by it.
 * If a new element with the same classes appears in the SAME step, a selector widens without
 * any error. Re-run the deliberate-break test (scripts/proof-run.cjs) after changing a view.
 */

const SLEEP = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));";
const BTN = "const btn = (re) => [...main.querySelectorAll('button')].find((b) => re.test((b.innerText || '').replace(/\\s+/g, ' ').trim()));";
const TEXTS = "const texts = (list) => list.map((el) => (el.innerText || '').replace(/\\s+/g, ' ').trim()).filter(Boolean);";

const READERS = {
  /** VOCA STEP 1 word grid — every card of every cluster (PhonicsLearningView.tsx:766-812). */
  "voca-grid": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${BTN} ${TEXTS}
    const open = btn(/^전체 \\d+단어 펼쳐보기$/);
    if (open) { open.click(); await sleep(500); }
    const cards = [...main.querySelectorAll('div')].filter((d) => /(^|\\s)min-h-\\[96px\\](\\s|$)/.test(d.className) && d.children.length >= 3);
    const words = texts(cards.map((c) => c.children[1]));
    if (open) { const close = btn(/전체 펼쳐보기 닫기/); if (close) { close.click(); await sleep(300); } }
    return words;
  })()`,

  /** GRAMMAR Step 1 Korean prompt of each item card (GrammarLearningView.tsx:796-799). */
  "grammar-ko": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('div[class*="bg-raised/50"][class*="p-3.5"] > p')]);
  })()`,

  /** GRAMMAR Step 3 English sentence of each item card — the one place English is shown without a button (GrammarLearningView.tsx:1130-1132). */
  "grammar-en": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('p[class*="group-hover:text-primary"]')]);
  })()`,

  /** STUDENT STEP 1 sentence cards, English and Korean, with the blind filter on "전체 보기" (StudentLearningView.tsx:651-766). */
  "student-cards": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${TEXTS}
    const filters = [...main.querySelectorAll('button')].filter((b) => /모두 가림|영어만|해석만|전체 보기/.test(b.innerText || ''));
    const active = filters.find((b) => /(^|\\s)bg-primary(\\s|$)/.test(b.className));
    const all = filters.find((b) => /전체 보기/.test(b.innerText || ''));
    if (all && all !== active) { all.click(); await sleep(500); }
    const out = [
      ...texts([...main.querySelectorAll('p[class*="text-[16px]"][class*="font-bold"]')]),
      ...texts([...main.querySelectorAll('p[class*="text-[13.5px]"][class*="text-ink-soft"]')]),
    ];
    if (active && all && all !== active) { active.click(); await sleep(300); }
    return out;
  })()`,

  /** READING STEP 1 passage, one span per sentence (ReadingLearningView.tsx:683-712). */
  "reading-passage": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('[data-sentence-id] > span')]);
  })()`,

  /**
   * READING STEP 2 key-vocabulary cards: the word and, once revealed, the meaning of each
   * card (ReadingLearningView.tsx:785-845). The meanings are hidden until "💡 전체 뜻 보기";
   * the driver presses it only at full depth, which is why the old page-text check reported
   * 9 meanings missing on tablet and mobile before anything was broken (2026-09-23). The
   * reader reveals them itself and hides them again afterwards.
   */
  "reading-vocab": `(async () => {
    const main = document.querySelector('main'); if (!main) return [];
    ${SLEEP} ${BTN} ${TEXTS}
    const sec = main.querySelector('section[aria-label="Key Vocabulary"]'); if (!sec) return [];
    const show = btn(/전체 뜻 보기/);
    if (show) { show.click(); await sleep(500); }
    const out = [
      ...texts([...sec.querySelectorAll('span[class*="text-[17px]"][class*="font-bold"]')]),
      ...texts([...sec.querySelectorAll('span[class*="text-[13.5px]"][class*="font-medium"]')]),
    ];
    if (show) { const hide = btn(/전체 뜻 가리기/); if (hide) { hide.click(); await sleep(300); } }
    return out;
  })()`,

  /**
   * READING STEP 4 dual view, the Korean column only — one span per sentence
   * (ReadingLearningView.tsx:1156-1197). The column is found by its label "한글 완역": the
   * English label is CSS-uppercased, so innerText reads "KOREAN INTERPRETATION".
   */
  "reading-ko": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    const sec = main.querySelector('section[aria-label="Side-by-Side Dual Reading"]'); if (!sec) return [];
    const col = [...sec.querySelectorAll('div.rounded-2xl')].find((d) => /한글 완역/.test(d.innerText || ''));
    return col ? texts([...col.querySelectorAll('[data-sentence-id] > span')]) : [];
  })()`,

  /** LISTENING STEP 5 1:1 script, the Korean line of each sentence (LdLearningView.tsx:1338-1343). */
  "ld-script-ko": `(() => {
    const main = document.querySelector('main'); if (!main) return [];
    ${TEXTS}
    return texts([...main.querySelectorAll('p[class*="text-[13px]"][class*="mt-1"]')]);
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
  reading: [
    { id: "reading-passage", step: STEP(1), kinds: ["en"] },
    { id: "reading-vocab", step: STEP(2), kinds: ["word", "meaning"] },
    { id: "reading-ko", step: STEP(4), kinds: ["ko-sentence"] },
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
