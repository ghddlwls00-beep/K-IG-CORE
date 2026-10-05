/**
 * 회귀 점검 1002 T2 (2026-10-06): which control drive-generic presses as a SOUND control (NEXT_CONTROL · COUNT_CONTROLS ·
 * openPlayFolds). Kept here, apart, so the very same rule is tried offline on the records (prove-play-control-t2.cjs).
 *
 * The old rule took any label with the letters 'play' in it — so a dictation word tile 'play' · 'players' · 'playground'
 * (ADULT/STUDENT [data-word-bank] · LISTENING [data-word-bank] [data-tile]), a LISTENING Step 5 script line (button[data-en] —
 * it opens the Korean, makes no sound: '… put on plays') and a question's answer option (button[data-option] — '… 영어 발음과 …',
 * '… 알아듣기 …') were pressed as speakers → RETEST 'no audio request' (rc2 · pd2: 27 of 40 RETEST).
 *
 *   PLAY_RE      'play' only as a word (play · plays · playing · played · player(s)) — not inside 'playground' · 'display' …
 *   NOT_PLAY_CTX a button in the word bank or the answer box ([data-word-bank] · [data-assembly]), an answer option
 *                ([data-option]) or a script line toggle (the button itself [data-en]) is never a sound control, whatever it says.
 *   CTX_OF       a short description of where a pressed control sits — written on each sound row (row.ctx) as evidence.
 *
 * --break=play-regex (drive-generic): the old PLAY_RE and no NOT_PLAY_CTX — the tiles come back as RETEST.
 */
const PLAY_RE = /🔊|▶|재생|듣기|발음|낭독|\bplay(?:s|ing|ed|ers?)?\b|전체 듣기|한 문장/i;
const PLAY_RE_OLD = /🔊|▶|재생|듣기|발음|낭독|play|전체 듣기|한 문장/i;
const NOT_PLAY_SEL_ANCESTOR = "[data-word-bank], [data-assembly]";
const NOT_PLAY_SEL_SELF = "[data-option], [data-en]";
const NOT_PLAY_CTX = `(el) => !!(el.closest(${JSON.stringify(NOT_PLAY_SEL_ANCESTOR)}) || el.matches(${JSON.stringify(NOT_PLAY_SEL_SELF)}))`;
const NOT_PLAY_CTX_OFF = `(el) => false`;
const CTX_OF = `(el) => [
  el.closest('[data-word-bank]') ? 'word-bank' : '',
  el.closest('[data-assembly]') ? 'assembly' : '',
  el.hasAttribute('data-option') ? 'option' : '',
  el.hasAttribute('data-en') ? 'en' : '',
  el.hasAttribute('data-tile') ? 'tile' : '',
  el.getAttribute('data-action') ? 'action=' + el.getAttribute('data-action') : '',
  el.getAttribute('title') ? 'title=' + el.getAttribute('title') : '',
].filter(Boolean).join(' ')`;

function rule(breakPlay) {
  return breakPlay ? { PLAY_RE: PLAY_RE_OLD, NOT_PLAY_CTX: NOT_PLAY_CTX_OFF } : { PLAY_RE, NOT_PLAY_CTX };
}

module.exports = { PLAY_RE, PLAY_RE_OLD, NOT_PLAY_SEL_ANCESTOR, NOT_PLAY_SEL_SELF, NOT_PLAY_CTX, NOT_PLAY_CTX_OFF, CTX_OF, rule };
