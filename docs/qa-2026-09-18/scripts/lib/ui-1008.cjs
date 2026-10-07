/**
 * UI검토-1007 고침3 (2026-10-08 · tools-c) — the app's names and words that the audit drivers read, kept in ONE place so the next
 * rename is one edit here (the old ones are kept beside them for the break test and for reading old records).
 *
 *   59  the end bar's completion button (src/components/LessonEndBar.tsx TODO_NAME · DONE_NAME): its name is now its visible words,
 *       aria-pressed is gone, and data-lesson-complete="todo" | "done" marks it whatever its words.
 *         '학습 완료 체크' → '이 강의 학습 완료'  ·  '학습 완료 취소' → '학습 완료함 · 취소하려면 누르세요'
 *   17  PASS-OFF Step 5: '5단계를 모두 마쳤어요' → 'Step 1~5를 모두 마쳤어요' · 'TOPIC N 마무리' → '대주제 N 마무리'
 *   41  course list: '서버에 저장됨' → '진도 저장됨' · '진도를 서버와 맞추는 중…' → '진도를 맞추는 중…' · topic/chapter lines '…열립니다/열림' → '…열려요'
 *    8  names: STUDENT · ADULT 'Ch 1-2 · ' → '1-2 · ' (the end bar's neighbour) · list heads 'Chapter 16. …' → '16장 · …' · 'TOPIC 1. 인칭' → '대주제 1 · 인칭'
 *    7  GRAMMAR '정답 문장 전체 듣기': the page's top <details data-answer-player> stays in the DOM but hidden (display:none); the view
 *       draws its own at the end of Step 3 (data-answer-player-step="3") and of Step 4 after grading ("4") inside [data-grammar-view].
 *    6  READING Step 4: the questions open after '다 읽었어요' — before it the slot is [data-comprehension="waiting"] with one line.
 *   고침3 통합 (2026-10-08 · integrate-c): 17 the end bar's gate lines (src/lib/passoffLearning.ts · vocaLearning.ts · readingLearning.ts)
 *       '5단계를 모두 마치면 …' → 'Step 1~5를 모두 마치면 …' · '2단계 퀴즈를 …' → 'Step 2 퀴즈를 …' · '4단계에서 지문을 …' → 'Step 4에서 지문을 …'
 *       · 8 passoffUnlock.ts topicWithParticle 'TOPIC 2를 마치면 열려요' → '대주제 2를 마치면 열려요' (lock screen · map result · map row)
 *
 * Break test (docs 규칙 '깨기 시험 없는 PASS 는 안 셈'): KIG_BREAK_APP=1008 makes lib/harness.cjs openTab put REVERT_1008 before every
 * document — the page is turned back into the app as it was before 2026-10-08 (old completion names + aria-pressed, old words, the GRAMMAR
 * top player shown and the Step 3 · 4 players hidden). Every check that reads the new app must then FAIL. READING's order (6) and the end
 * bar's neighbours (25) cannot be put back in the DOM — their drivers carry their own --break flags.
 */
const COMPLETE_TODO = "이 강의 학습 완료";
const COMPLETE_DONE = "학습 완료함 · 취소하려면 누르세요";
const OLD = {
  COMPLETE_TODO: "학습 완료 체크",
  COMPLETE_DONE: "학습 완료 취소",
  PASSOFF_ALL_DONE: "5단계를 모두 마쳤어요",
  SAVED: "서버에 저장됨",
  SYNCING: "진도를 서버와 맞추는 중",
  PASSOFF_GATE: "5단계를 모두 마치면 완료할 수 있어요.",
  VOCA_GATE: "2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요",
  READING_GATE: "4단계에서 지문을 다시 읽고 시간을 한 번 재면 완료할 수 있어요.",
};
/** the end bar's gate lines (integrate-c, 17) — src/lib/passoffLearning.ts · vocaLearning.ts · readingLearning.ts */
const PASSOFF_GATE = "Step 1~5를 모두 마치면 완료할 수 있어요.";
const VOCA_GATE = "Step 2 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요";
const READING_GATE = "Step 4에서 지문을 다시 읽고 시간을 한 번 재면 완료할 수 있어요.";
const COMPLETE_TODO_SEL = `button[aria-label="${COMPLETE_TODO}"]`;
const COMPLETE_DONE_SEL = `button[aria-label="${COMPLETE_DONE}"]`;
const COMPLETE_ANY_SEL = `${COMPLETE_TODO_SEL}, ${COMPLETE_DONE_SEL}`;
/** a completion button's name, either state — for regex tests on aria-label */
const COMPLETE_NAME_RE = /^(이 강의 학습 완료|학습 완료함 · 취소하려면 누르세요)$/;
/**
 * 59 itself: the name is the visible words (WCAG 2.5.3) and there is no aria-pressed (the name says the state). Evaluates in the page
 * to { name, text, pressed, state, ok } or null when no completion button. `text` drops the leading '✓'.
 */
const COMPLETE_NAME_CHECK = `(() => { const b = document.querySelector('section[aria-label="강의 마치기"] button[data-lesson-complete]') || document.querySelector('main button[data-lesson-complete]'); if (!b) return null; const name = b.getAttribute('aria-label') || ''; const text = (b.innerText || b.textContent || '').replace(/^\\s*✓\\s*/, '').replace(/\\s+/g, ' ').trim(); const pressed = b.getAttribute('aria-pressed'); const state = b.getAttribute('data-lesson-complete'); return { name, text, pressed, state, ok: name === text && pressed === null && (state === 'done' ? name === ${JSON.stringify(COMPLETE_DONE)} : name === ${JSON.stringify(COMPLETE_TODO)}) }; })()`;

const PASSOFF_ALL_DONE = "Step 1~5를 모두 마쳤어요";
const SAVED = "진도 저장됨";
const SYNCING = "진도를 맞추는 중";

/** GRAMMAR (7): the view's own folded player — the page's top one is still in the DOM, hidden */
const GRAMMAR_PLAYER = "main [data-grammar-view] details[data-answer-player]";
const GRAMMAR_PLAYER_FOLDED_SUMMARY = `document.querySelector('${GRAMMAR_PLAYER}:not([open]) > summary')`;
/** the first VISIBLE details[data-answer-player] in main (the view's; never the hidden top one) — null when none is on screen */
const VISIBLE_ANSWER_PLAYER = `[...document.querySelectorAll('main details[data-answer-player]')].find((d) => d.getClientRects().length > 0) || null`;

/** what lib/harness.cjs openTab puts before every document when KIG_BREAK_APP=1008 (see the head comment) */
const REVERT_1008 = `(() => {
  if (window.__kigRevert1008) return; window.__kigRevert1008 = true;
  const TEXT = [
    [/Step 1~5를 모두 마쳤어요/g, ${JSON.stringify(OLD.PASSOFF_ALL_DONE)}],
    [/진도 저장됨/g, ${JSON.stringify(OLD.SAVED)}],
    [/진도를 맞추는 중/g, ${JSON.stringify(OLD.SYNCING)}],
    [/대주제 (\\d+) 마무리/g, 'TOPIC $1 마무리'],
    [/대주제 (\\d+)([을를이가은는]) /g, 'TOPIC $1$2 '],
    [/(\\d+)장을 마치면 열려요/g, '$1장을 마치면 열립니다'],
    [/이용권 등록 후 열려요/g, '이용권 등록 후 열림'],
    [/Step 1~5를 모두 마치면 완료할/g, '5단계를 모두 마치면 완료할'],
    [/Step 2 퀴즈를 한 번 끝까지/g, '2단계 퀴즈를 한 번 끝까지'],
    [/Step 4에서 지문을 다시 읽고/g, '4단계에서 지문을 다시 읽고'],
    [/대주제 (\\d+)([을를이가은는])$/g, 'TOPIC $1$2'],
  ];
  const student = () => /^\\/(student|adult)\\//.test(location.pathname);
  const fix = () => {
    for (const b of document.querySelectorAll('button[data-lesson-complete]')) {
      const done = b.getAttribute('data-lesson-complete') === 'done';
      const name = done ? ${JSON.stringify(OLD.COMPLETE_DONE)} : ${JSON.stringify(OLD.COMPLETE_TODO)};
      if (b.getAttribute('aria-label') !== name) b.setAttribute('aria-label', name);
      if (b.getAttribute('aria-pressed') !== String(done)) b.setAttribute('aria-pressed', String(done));
    }
    if (student()) for (const a of document.querySelectorAll('a[aria-label^="다음 강의: "], a[aria-label^="이전 강의: "]')) {
      const l = a.getAttribute('aria-label'); const m = l.match(/^(다음|이전) 강의: (\\d+-\\d+) · /);
      if (m) a.setAttribute('aria-label', l.replace(m[0], m[1] + ' 강의: Ch ' + m[2] + ' · '));
    }
    const root = document.querySelector('main');
    if (root) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { let v = n.nodeValue; for (const [re, to] of TEXT) v = v.replace(re, to); if (v !== n.nodeValue) n.nodeValue = v; }
    }
  };
  const style = () => { if (document.getElementById('kig-revert-1008')) return; const s = document.createElement('style'); s.id = 'kig-revert-1008'; s.textContent = 'main > details[data-answer-player] { display: block !important; } main [data-answer-player-step] { display: none !important; }'; (document.head || document.documentElement).appendChild(s); };
  const start = () => { style(); fix(); new MutationObserver(() => { style(); fix(); }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'data-lesson-complete'] }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})()`;

const BREAK_APP = process.env.KIG_BREAK_APP || "";

module.exports = {
  COMPLETE_TODO, COMPLETE_DONE, COMPLETE_TODO_SEL, COMPLETE_DONE_SEL, COMPLETE_ANY_SEL, COMPLETE_NAME_RE, COMPLETE_NAME_CHECK,
  PASSOFF_ALL_DONE, SAVED, SYNCING, PASSOFF_GATE, VOCA_GATE, READING_GATE,
  GRAMMAR_PLAYER, GRAMMAR_PLAYER_FOLDED_SUMMARY, VISIBLE_ANSWER_PLAYER,
  OLD, REVERT_1008, BREAK_APP,
};
