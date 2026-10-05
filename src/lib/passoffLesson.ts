/**
 * PASS-OFF GRAMMAR — the lesson screen's own bookkeeping (docs/pass-off-grammar/설계.md §3). Pure: no React,
 * no storage — src/components/PassoffLearningView.tsx and its steps call these.
 *
 * What lives here: how ④ is cut into sets and when a sentence comes back, the tiles' grammar distractors,
 * the first-letter clue, and the shape of the practice state kept on the device
 * (localStorage `kig:passoff:work:<lessonKey>`) with the steps that change it. What does NOT: anything that
 * crosses days — review, pass, "내일 1순위" scheduling. The lesson only records those (src/lib/passoffLearning.ts);
 * the common learning engine owns them (설계 §4, 공통-학습-엔진.md).
 *
 * The order things are SHOWN in lives here too (2026-09-28, 작업기록 할 일 5 · 6 — the end of this file): the options of a
 * choice item and of the rule questions (optionOrder), and a sentence whose English prompt is another's model answer
 * after that one (promptPartners · orderAfterPartners) — in the lesson's queues and, for the order only, in today's
 * review (orderReviewPlan; which items come on which day stays the engine's). Import-free apart from types, so the checks
 * (docs/pass-off-grammar/검사/check-lesson-state.cjs · check-screen-fixes.cjs) run this file as it is.
 */
import type { WordTile } from "./listeningUtils";
import type { PassoffHelp } from "./passoffLearning";

/** ④ comes in sets of about six minutes (설계 §2 · §3) — usually 8~10 sentences. */
export const SET_SECONDS = 360;
/** a wrong or helped sentence comes back this many sentences later ("3~5문장 뒤" — fewer when the set is ending) */
export const REQUEUE_GAP = 4;
/** …at most this many times; after that it is "내일 1순위" and no longer holds the set open */
export const MAX_REQUEUES = 3;

const wordsOf = (text: string) => String(text ?? "").trim().split(/\s+/).filter(Boolean);
const bare = (token: string) => token.replace(/^[("“‘'[]+/, "").replace(/[.,?!;:)"”’'\]]+$/, "");

/** About how long one sentence takes in the lesson: reading the Korean, typing, and the check. */
export function secondsFor(en: string): number {
  return 20 + 3 * wordsOf(en).length;
}

/**
 * The sets of ④, in lesson order. A set closes when the next sentence would pass `budget`; a last set of one or
 * two sentences joins the one before. Inside a set the challenge sentences (a grammar not learnt yet) go last
 * (설계 §0 "도전 문장은 세트 끝").
 */
export function cutSets<T extends { en: string; challenge?: boolean | null }>(items: readonly T[], budget: number = SET_SECONDS): T[][] {
  const sets: T[][] = [];
  let current: T[] = [];
  let seconds = 0;
  for (const item of items) {
    const s = secondsFor(item.en);
    if (current.length && seconds + s > budget) {
      sets.push(current);
      current = [];
      seconds = 0;
    }
    current.push(item);
    seconds += s;
  }
  if (current.length) sets.push(current);
  if (sets.length > 1 && sets[sets.length - 1].length < 3) {
    const last = sets.pop() as T[];
    sets[sets.length - 1].push(...last);
  }
  return sets.map((set) => [...set.filter((i) => !i.challenge), ...set.filter((i) => i.challenge)]);
}

/** The queue after the sentence at its head comes back later: `gap` places on, or last when fewer remain. */
export function requeue(queue: readonly string[], id: string, gap: number = REQUEUE_GAP): string[] {
  const rest = queue.filter((x) => x !== id);
  const at = Math.min(gap, rest.length);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/**
 * The clue of ladder step ②: each word's first letter, the rest as blanks ("S__ i_ t____ t____.").
 *
 * 회귀 점검 1002 P5 (사장님 2026-10-05): `show` is how the lesson draws its text (ui.tsx glossFor — a Korean word written in
 * English shown in Hangul, the whole name at once: "Yi Sun-sin" → "이순신"). With it, the sentence is first drawn so, and a
 * Korean word stays as the screen shows it, in Hangul ("Admiral Yi Sun-sin." → "A______ 이순신." — not the romanized
 * initials "A______ Y_ S__-___."); only the English words get their first letter and blanks (only Latin letters and
 * digits are blanked, so Hangul is never; English letters joined to a Korean word — "추석's" — stay blanks). Without `show`
 * (or on a page with no Korean word) the clue is as it was.
 */
export function firstLetters(text: string, show?: (text: string) => string): string {
  const drawn = show ? show(text) : text;
  return wordsOf(drawn)
    .map((token) => {
      const core = bare(token);
      if (!core) return token;
      const start = token.indexOf(core);
      const masked = core[0] + core.slice(1).replace(/[A-Za-z0-9]/g, "_");
      return token.slice(0, start) + masked + token.slice(start + core.length);
    })
    .join(" ");
}

/** Grammar partners for a word the item drills — the distractor tiles are the lesson's own contrast. */
const CONTRASTS: Record<string, string[]> = {
  am: ["is", "are"], is: ["are", "am"], are: ["is", "am"], was: ["were"], were: ["was"],
  do: ["does"], does: ["do"], did: ["does"], have: ["has"], has: ["have"], had: ["has"],
  a: ["an"], an: ["a"], the: ["a"],
  this: ["these"], these: ["this"], that: ["those"], those: ["that"],
  who: ["which"], which: ["who"], whom: ["who"], whose: ["who"], what: ["that"],
  i: ["me"], me: ["I"], he: ["him"], him: ["he"], she: ["her"], her: ["she"], we: ["us"], us: ["we"], they: ["them"], them: ["they"],
  my: ["mine"], mine: ["my"], your: ["yours"], yours: ["your"], our: ["ours"], ours: ["our"], their: ["theirs"], theirs: ["their"],
  myself: ["me"], yourself: ["you"], himself: ["him"], herself: ["her"], itself: ["it"], ourselves: ["us"], yourselves: ["you"], themselves: ["them"],
  much: ["many"], many: ["much"], few: ["little"], little: ["few"], some: ["any"], any: ["some"],
  in: ["on"], on: ["in"], at: ["in"], can: ["could"], will: ["would"], not: ["no"], no: ["not"],
  yes: ["no"], you: ["your"], it: ["its"], its: ["it"], there: ["their"], than: ["then"], then: ["than"],
};

/**
 * Words with no other number or person — a made-up "-s" form of them is no English word (회귀 점검 1002 A3: the tiles
 * showed "whens" · "hows" · "buts" · "untils" · "alway"). Conjunctions, question words, prepositions, adverbs, interjections
 * and modals; words in -s that are not plurals ("news" → "new", "besides" → "beside" would be another word); and a few
 * adjectives whose "-s" form is another word. Any other word gets a partner only when the server knows it as a word.
 */
const NO_PARTNER = new Set(
  (
    "and but or nor so yet for because although though while whereas unless until till since if whether as once " +
    "when where why how whenever wherever however whatever whoever whichever " +
    "about above across after against along among amongst around before behind below beneath beside besides between beyond " +
    "by despite down during except from inside into near of off onto out outside over past per round through throughout " +
    "to toward towards under underneath unlike up upon via with within without instead next " +
    "always never ever often sometimes usually seldom rarely already still just even only also too very quite rather " +
    "pretty really almost enough more most less least here now today tomorrow tonight yesterday soon later late early ago again twice away back " +
    "else maybe perhaps together abroad indeed nowadays afterwards upstairs downstairs indoors outdoors overseas " +
    "wow oh hey ah please okay ok hello goodbye bye " +
    "should might must may shall ought used better " +
    "news means series species physics mathematics economics politics clothes " +
    // adjectives whose "-s" form is another word ("Have a good day." → "goods")
    "good fine short long high low cold fast hard"
  ).split(" "),
);

/** The other number or person by spelling alone (likes ↔ like, studies ↔ study, watches ↔ watch, box → boxes) — candidates. */
function spelledPartners(w: string): string[] {
  if (w.length > 4 && w.endsWith("ies")) return [`${w.slice(0, -3)}y`];
  if (/(ches|shes|xes|sses|oes)$/.test(w)) return [w.slice(0, -2)];
  if (w.endsWith("s") && !w.endsWith("ss")) return [w.slice(0, -1)];
  if (/[^aeiou]y$/.test(w)) return [`${w.slice(0, -1)}ies`];
  if (/(ch|sh|x|ss|o)$/.test(w)) return [`${w}es`];
  return [`${w}s`];
}

/**
 * A word that is itself a past form, an -ing form or an -ly adverb of another word (jumped · robbed · bored · used ·
 * walking · becoming · quickly · easily · truly — A3's "jumpeds" · "walkings" · "quicklies"): it has no number or person
 * of its own. Judged by the word it comes from being a word, so "hundred" · "need" · "thing" · "family" · "fly" keep theirs.
 */
function derivedForm(w: string, isWord: (word: string) => boolean): boolean {
  const doubled = (stem: string) => /([b-df-hj-np-tv-z])\1$/.test(stem) && isWord(stem.slice(0, -1));
  if (w.length > 3 && w.endsWith("ed")) {
    const stem = w.slice(0, -2);
    if (isWord(stem) || isWord(w.slice(0, -1)) || doubled(stem) || (w.endsWith("ied") && isWord(`${w.slice(0, -3)}y`))) return true;
  }
  if (w.length > 4 && w.endsWith("ing")) {
    const stem = w.slice(0, -3);
    if (isWord(stem) || isWord(`${stem}e`) || doubled(stem)) return true;
  }
  if (w.length > 3 && w.endsWith("ly")) {
    const stem = w.slice(0, -2);
    if (isWord(stem) || isWord(`${stem}e`) || (w.endsWith("ily") && isWord(`${w.slice(0, -3)}y`)) || (w.endsWith("ally") && isWord(w.slice(0, -4)))) return true;
  }
  return false;
}

/**
 * What tells a real word from a made-up one — the server's (src/lib/passoffPartnerForms.ts: the VOCA dictionary and the
 * PASS-OFF lessons' own English), so a word list never ships to the phone. `irregular`: a past form, a participle or a
 * plural of the irregular table (said · gave · been · men) — no "-s" partner either.
 */
export interface PartnerWords {
  isWord: (word: string) => boolean;
  irregular?: (word: string) => boolean;
}

/**
 * The grammar partners of a word the item drills: the lesson's own contrast table (CONTRASTS — is ↔ are, a ↔ an, I ↔ me),
 * and otherwise its other number or person (likes ↔ like, box → boxes) — ONLY a real word (회귀 점검 1002 A3). Not for a
 * word of NO_PARTNER, a past · -ing · -ly form or an irregular form, nor a spelling `words.isWord` does not know. Without
 * `words` only the table's partners.
 */
function partnersOf(word: string, words: PartnerWords | null, verbForms: boolean): string[] {
  const w = word.toLowerCase();
  if (CONTRASTS[w]) return CONTRASTS[w];
  if (!words || verbForms || !/^[a-z]{3,}$/.test(w) || NO_PARTNER.has(w)) return [];
  if (words.irregular?.(w) || derivedForm(w, words.isWord)) return [];
  return spelledPartners(w).filter((p) => !NO_PARTNER.has(p) && words.isWord(p));
}

/** "go - went - gone" · "am, is - was - been": an item that drills a verb's principal parts — an "-s" form is no contrast there */
const isVerbFormsItem = (en: string) => /\S\s+-\s+\S/.test(en);

/**
 * The grammar partners of the item's target words, in order, once each (partnersOf) — what the server attaches to a ④ · ⑤
 * item as `partnerForms` (src/lib/passoffPartnerForms.ts), with its words. Without `words`: the contrast table's partners only.
 */
export function partnerFormsOf(item: { en: string; targets?: readonly (readonly string[])[] | null }, words: PartnerWords | null): string[] {
  const out: string[] = [];
  const verbForms = isVerbFormsItem(String(item.en ?? ""));
  for (const group of item.targets ?? []) {
    for (const form of group ?? []) {
      for (const t of wordsOf(form)) for (const p of partnersOf(bare(t), words, verbForms)) if (!out.includes(p)) out.push(p);
    }
  }
  return out;
}

/**
 * The distractor pool for the tiles of ladder step ③ (설계 §3 "문법 방해 타일"): first the wrong words of the
 * item's own error patterns ("She are" → are), then the grammatical partner of a target word (is → are,
 * likes → like) — the real words the server attached (`partnerForms` — partnerFormsOf), or with none attached the
 * contrast table's alone (회귀 점검 1002 A3: a made-up "-s" form never becomes a tile). Words already in the model answer
 * are skipped; listeningUtils.generateWordBank takes the first two that are not.
 */
export function contrastPool(item: {
  en: string;
  errorPatterns?: readonly { match: string }[] | null;
  targets?: readonly (readonly string[])[] | null;
  partnerForms?: readonly string[] | null;
}): string[] {
  const model = new Set(wordsOf(item.en).map((t) => bare(t).toLowerCase()));
  const out: string[] = [];
  const add = (token: string) => {
    const w = bare(token);
    if (!w || model.has(w.toLowerCase()) || out.some((x) => x.toLowerCase() === w.toLowerCase())) return;
    out.push(w);
  };
  for (const e of item.errorPatterns ?? []) for (const t of wordsOf(e.match)) add(t);
  for (const p of Array.isArray(item.partnerForms) ? item.partnerForms : partnerFormsOf(item, null)) add(p);
  return out;
}

/**
 * The tiles of ladder step ③: listeningUtils.generateWordBank's words of the sentence (and its accepted word
 * sequences, which verifyAnyWordSequence checks), with the two distractors taken from `pool` (contrastPool) —
 * generateWordBank leaves out a distractor that SOUNDS like a sentence word, which is right for dictation and wrong
 * here: "lives" next to "live" is the lesson's point. Its own distractors fill in when the pool is short.
 * Shuffled with `random` — call it from an event handler, never while rendering.
 */
export function contrastTiles(
  bank: { acceptedWordSequences: string[][]; allTiles: WordTile[] },
  pool: readonly string[],
  random: () => number = Math.random,
): WordTile[] {
  const inSentence = new Set(bank.acceptedWordSequences.flat().map((w) => w.toLowerCase()));
  const own = bank.allTiles.filter((t) => inSentence.has(t.word.toLowerCase()));
  const contrasts = [...new Set(pool.filter((w) => !inSentence.has(w.toLowerCase())))].slice(0, 2);
  const taken = new Set(contrasts.map((w) => w.toLowerCase()));
  const theirs = bank.allTiles.filter((t) => !inSentence.has(t.word.toLowerCase()) && !taken.has(t.word.toLowerCase()));
  const tiles: WordTile[] = [...own, ...contrasts.map((word, i) => ({ id: `contrast-${i}-${word}`, word })), ...theirs.slice(0, Math.max(0, 2 - contrasts.length))];
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

/** A word of the grader's marked answer (passoffGrading.ts DiffToken) — the fields joinNameTokens reads. */
export interface NameToken {
  kind: string;
  text: string;
  expected?: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The marked answer (ComposeCard's DiffLine) with a page's Korean name kept whole (회귀 점검 1002 A7). The grader marks one
 * word at a time, so "Admiral Yi Sun-sin." came out as "Yi" · "Sun-sin." and was drawn "Admiral 이 순신."; and where the
 * closest accepted answer has the family name alone ("Admiral Yi"), the answer shown for a wrong word was "→ 이".
 *   - a run of words of one kind (same · missing · extra · moved, or wrong — then by what the answer has there) that spells
 *     one of `names` (ui.tsx namesFor — "Yi Sun-sin") becomes one word, which the screen draws "이순신.";
 *   - a wrong or missing word whose answer is the first word of such a name alone ("Yi"), where the model answer `model`
 *     has the whole name and the next word does not go on with it, shows the whole name ("→ 이순신") — the model answer's
 *     spelling, which is graded right as well.
 * The learner's own words (same · extra · moved · a wrong word's own text) are only joined, never changed. Nothing else moves.
 */
export function joinNameTokens<T extends NameToken>(tokens: readonly T[], names: readonly string[], model: string): T[] {
  if (!names.length) return [...tokens];
  const parts = names.map((n) => n.trim().split(/\s+/)).filter((p) => p.length > 1);
  const answerOf = (t: NameToken) => bare(t.kind === "wrong" ? t.expected ?? "" : t.text);
  const out: T[] = [];
  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i];
    const run = parts.find((p) => {
      if (i + p.length > tokens.length) return false;
      const slice = tokens.slice(i, i + p.length);
      return slice.every((x) => x.kind === t.kind) && slice.map(answerOf).join(" ") === p.join(" ");
    });
    if (run) {
      const slice = tokens.slice(i, i + run.length);
      out.push({
        ...t,
        text: slice.map((x) => x.text).join(" "),
        ...(t.kind === "wrong" ? { expected: slice.map((x) => x.expected ?? "").join(" ") } : {}),
      });
      i += run.length;
      continue;
    }
    if (t.kind === "wrong" || t.kind === "missing") {
      const word = answerOf(t);
      const next = tokens[i + 1];
      const whole = parts.find(
        (p) =>
          p[0] === word &&
          new RegExp(`(^|[^A-Za-z0-9])${escapeRe(p.join(" "))}(?![A-Za-z0-9])`).test(model) &&
          !(next && answerOf(next) === p[1]),
      );
      if (whole) {
        const shown = t.kind === "wrong" ? t.expected ?? "" : t.text;
        const name = shown.replace(word, whole.join(" "));
        out.push(t.kind === "wrong" ? { ...t, expected: name } : { ...t, text: name });
        i++;
        continue;
      }
    }
    out.push(t);
    i++;
  }
  return out;
}

/** A token with a letter or a digit — not one of punctuation alone (the "-" of "go - went - gone"). */
const isWordToken = (token: string) => /[A-Za-z0-9]/.test(token);

/**
 * Ladder step ③'s bank as the card keeps it (작업기록 할 일 4): contrastTiles' tiles and generateWordBank's accepted word
 * sequences, without the tokens of punctuation alone. generateWordBank keeps a hyphen as part of a word (well-known), so
 * the free-standing "-" of "go - went - gone" came out as a word — two "-" tiles to place in each of the 126 verb-form
 * items of pg10-2 · pg10-3. They are dropped AFTER the shuffle: an item without such a token keeps exactly the tiles it
 * had — the same words, ids and order for the same random numbers (Book 1's comma lists included: a comma never was a
 * token). The card checks the placed tiles against these sequences (verifyAnyWordSequence), so "go went gone" is whole.
 */
export function wordTiles(
  bank: { acceptedWordSequences: string[][]; allTiles: WordTile[] },
  pool: readonly string[],
  random: () => number = Math.random,
): { acceptedWordSequences: string[][]; tiles: WordTile[] } {
  return {
    acceptedWordSequences: bank.acceptedWordSequences.map((words) => words.filter(isWordToken)),
    tiles: contrastTiles(bank, pool, random).filter((tile) => isWordToken(tile.word)),
  };
}

// ---------------------------------------------------------------------------
// The practice state kept on this device — kig:passoff:work:<lessonKey>
// ---------------------------------------------------------------------------

/**
 * The presentation on screen was already answered — "right" at its first try or "missed" — and not yet passed on
 * with '다음'. Kept the moment it is answered, not at '다음': a reload that showed the answer would otherwise bring
 * the same item back as new, and the answer just seen would pass as a first try (점검 2026-09-27). settleOpen
 * passes it on when the lesson opens again.
 */
export type OpenResult = "right" | "missed" | null;

export interface FormItemState {
  done: boolean;
  /** answered wrong at the first try, so it came back once at the end of ③ */
  requeued: boolean;
  open: OpenResult;
  /** "reveal" once its answer was shown — an answer after that carries it */
  help: "none" | "reveal";
}

export interface ComposeItemState {
  done: boolean;
  /** times it came back after a wrong or helped presentation */
  requeues: number;
  /** not right on its own after MAX_REQUEUES comebacks — the engine's "내일 1순위" */
  tomorrow: boolean;
  /** the first try of the first presentation — the set's two-line score */
  first: { answer: string; verdict: string; reference: string } | null;
  open: OpenResult;
  /** the most help the sentence has had in this lesson (clue · tiles · the answer) — an answer after it carries it */
  help: PassoffHelp;
}

export const newFormState = (): FormItemState => ({ done: false, requeued: false, open: null, help: "none" });
export const newComposeState = (): ComposeItemState => ({ done: false, requeues: 0, tomorrow: false, first: null, open: null, help: "none" });

export interface PassoffWork {
  v: 1;
  /** ① anchors whose English was opened */
  revealed: string[];
  /** ② the discovery option chosen (recorded, never graded) */
  discovery: number | null;
  /** ② the rule check answered right */
  ruleCheck: boolean;
  form: Record<string, FormItemState>;
  /** ③ the items still to answer, in order; null before the step starts */
  formQueue: string[] | null;
  compose: Record<string, ComposeItemState>;
  /** ④ the set on screen */
  composeSet: number;
  /** ④ that set's sentences still to get right on their own; null before the set starts */
  composeQueue: string[] | null;
  /** ⑤ the unseen sentences still to get right; null before they start */
  transferQueue: string[] | null;
  /** ⑤ the rule check answered right again */
  wrapCheck: boolean;
  /** ⑤ my own sentence — what I wrote in each blank of the frame, kept on this device only */
  frame: string[];
  /**
   * the lesson was finished and its completion recorded once: the learner pressed '이 강의 학습 완료' after the five steps
   * (단계 2-나 E2 — the five steps alone do not set it), or a lesson already complete on this device was done again through
   * '처음부터 다시 하기' (PassoffLearningView sends that completion once more by itself — there is nothing to press)
   */
  lessonDone: boolean;
}

export function emptyWork(): PassoffWork {
  return {
    v: 1,
    revealed: [],
    discovery: null,
    ruleCheck: false,
    form: {},
    formQueue: null,
    compose: {},
    composeSet: 0,
    composeQueue: null,
    transferQueue: null,
    wrapCheck: false,
    frame: [],
    lessonDone: false,
  };
}

/** The pieces of a frame template around its blanks ("I am ___ years old." → ["I am ", " years old."]). */
export function frameParts(template: string): string[] {
  return String(template ?? "").split(/_{2,}/);
}

/**
 * A stored queue while it still holds items to do; otherwise the items not done yet, in lesson order. With `partners`
 * (promptPartners — ④ · ⑤ on screen), a sentence whose prompt is another's answer waits until that one is off the queue:
 * the queue as it is drawn, whatever order a comeback ("다시 풀기 3~5문장 뒤"), a reload or the challenge-last sets left.
 */
export function queueOf(
  stored: readonly string[] | null,
  ids: readonly string[],
  isDone: (id: string) => boolean,
  partners?: ReadonlyMap<string, readonly string[]>,
): string[] {
  const valid = new Set(ids);
  const kept = (stored ?? []).filter((id) => valid.has(id) && !isDone(id));
  const queue = kept.length ? kept : ids.filter((id) => !isDone(id));
  return partners?.size ? orderAfterPartners(queue, (id) => id, partners) : queue;
}

/** ③ an item passed on with '다음': missed at its first try → once more at the end of ③ (설계 §3); otherwise done. */
export function formItemDone(w: PassoffWork, queue: readonly string[], id: string, firstTryRight: boolean): void {
  const s = w.form[id] ?? newFormState();
  const rest = queue.filter((x) => x !== id);
  if (!firstTryRight && !s.requeued) {
    s.requeued = true;
    w.formQueue = [...rest, id];
  } else {
    s.done = true;
    w.formQueue = rest;
  }
  s.open = null;
  w.form[id] = s;
}

/**
 * ④ · ⑤ a sentence passed on with '다음 문장': right on its own → done; wrong or helped → back REQUEUE_GAP sentences
 * later, or — after MAX_REQUEUES comebacks — the engine's "내일 1순위", no longer holding the set open.
 */
export function composeItemDone(w: PassoffWork, list: "composeQueue" | "transferQueue", queue: readonly string[], id: string, success: boolean): void {
  const s = w.compose[id] ?? newComposeState();
  if (success) {
    s.done = true;
    w[list] = queue.filter((x) => x !== id);
  } else if (s.requeues < MAX_REQUEUES) {
    s.requeues += 1;
    w[list] = requeue(queue, id);
  } else {
    s.done = true;
    s.tomorrow = true;
    w[list] = queue.filter((x) => x !== id);
  }
  s.open = null;
  w.compose[id] = s;
}

/**
 * Answers given but not passed on with '다음' before the learner left (a reload, a closed tab) — passed on now,
 * as the button would have: the one whose answer was already shown comes back later instead of as new.
 * `lists` are the ids of ③, of the ④ set on screen and of ⑤. Returns whether anything changed.
 */
export function settleOpen(w: PassoffWork, lists: { forms: readonly string[]; composeSet: readonly string[]; transfers: readonly string[] }): boolean {
  let changed = false;
  for (const id of lists.forms) {
    const s = w.form[id];
    if (!s?.open) continue;
    formItemDone(w, queueOf(w.formQueue, lists.forms, (x) => Boolean(w.form[x]?.done)), id, s.open === "right");
    changed = true;
  }
  for (const [list, ids] of [["composeQueue", lists.composeSet], ["transferQueue", lists.transfers]] as const) {
    for (const id of ids) {
      const s = w.compose[id];
      if (!s?.open) continue;
      composeItemDone(w, list, queueOf(w[list], ids, (x) => Boolean(w.compose[x]?.done)), id, s.open === "right");
      changed = true;
    }
  }
  for (const s of [...Object.values(w.form), ...Object.values(w.compose)]) {
    if (!s.open) continue;
    s.open = null; // an item no longer on any list (its set was left): nothing to pass on
    changed = true;
  }
  return changed;
}

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const idList = (v: unknown, known: ReadonlySet<string>): string[] | null =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && known.has(x)))] : null;
const openOf = (v: unknown): OpenResult => (v === "right" || v === "missed" ? v : null);
const HELPS: readonly PassoffHelp[] = ["none", "hint", "tiles", "reveal"];
const helpOf = (v: unknown): PassoffHelp => (HELPS.includes(v as PassoffHelp) ? (v as PassoffHelp) : "none");

/**
 * Stored work, checked item by item against the ids the lesson has now — an item id that is gone (or never
 * was) is dropped, so an edited lesson never shows a stale queue (item ids never change — 데이터-형식 "문항 id").
 */
export function sanitizeWork(raw: unknown, ids: { anchors: string[]; forms: string[]; compose: string[] }): PassoffWork {
  const work = emptyWork();
  if (!isRecord(raw) || raw.v !== 1) return work;
  const anchors = new Set(ids.anchors);
  const forms = new Set(ids.forms);
  const compose = new Set(ids.compose);
  work.revealed = idList(raw.revealed, anchors) ?? [];
  work.discovery = typeof raw.discovery === "number" && Number.isInteger(raw.discovery) && raw.discovery >= 0 ? raw.discovery : null;
  work.ruleCheck = raw.ruleCheck === true;
  if (isRecord(raw.form)) {
    for (const [id, s] of Object.entries(raw.form)) {
      if (forms.has(id) && isRecord(s)) {
        work.form[id] = { done: s.done === true, requeued: s.requeued === true, open: openOf(s.open), help: s.help === "reveal" ? "reveal" : "none" };
      }
    }
  }
  work.formQueue = idList(raw.formQueue, forms);
  if (isRecord(raw.compose)) {
    for (const [id, s] of Object.entries(raw.compose)) {
      if (!compose.has(id) || !isRecord(s)) continue;
      const first = isRecord(s.first) && typeof s.first.answer === "string" && typeof s.first.verdict === "string" && typeof s.first.reference === "string"
        ? { answer: s.first.answer, verdict: s.first.verdict, reference: s.first.reference }
        : null;
      work.compose[id] = {
        done: s.done === true,
        requeues: typeof s.requeues === "number" && s.requeues >= 0 ? Math.min(MAX_REQUEUES, Math.floor(s.requeues)) : 0,
        tomorrow: s.tomorrow === true,
        first,
        open: openOf(s.open),
        help: helpOf(s.help),
      };
    }
  }
  work.composeSet = typeof raw.composeSet === "number" && Number.isInteger(raw.composeSet) && raw.composeSet >= 0 ? raw.composeSet : 0;
  work.composeQueue = idList(raw.composeQueue, compose);
  work.transferQueue = idList(raw.transferQueue, compose);
  work.wrapCheck = raw.wrapCheck === true;
  work.frame = Array.isArray(raw.frame) ? raw.frame.slice(0, 6).map((x) => (typeof x === "string" ? x.slice(0, 120) : "")) : [];
  work.lessonDone = raw.lessonDone === true;
  return work;
}

// ---------------------------------------------------------------------------
// The order things are shown in (2026-09-28 — 작업기록 할 일 5 · 6)
// ---------------------------------------------------------------------------

/** FNV-1a (32 bits): the same number for the same text on every device and every reload. */
function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32): numbers in [0, 1), the same run for the same seed. */
function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order the options of one question are shown in (작업기록 할 일 5): place k shows option `order[k]`. A shuffle seeded by
 * the question's key — a ③ choice item's id ("pg11-3:s2"), or ruleQuestionKey for ②'s discovery question and rule check —
 * so it is the same on every reload and every device, and the same in the review, which draws the lesson's own cards. The
 * textbook data mostly put the answer first (every option question of pg11-3 · pg15-2 · pg18-2 · pg20-2); shown this way
 * it is first about once in n. Only the places change: the screen hands back the option's own index, which is what is
 * graded (`answer`) and kept (the discovery choice).
 */
export function optionOrder(key: string, count: number): number[] {
  const order = Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => i);
  const random = seeded(hashOf(key));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * The key of a lesson's rule question, which has no id of its own: "pg11-3:discovery" · "pg11-3:check" (⑤ asks ②'s check
 * again, in the same order). An item id has a letter and a number after the colon, so the two never meet.
 */
export function ruleQuestionKey(lessonId: string, which: "discovery" | "check"): string {
  return `${lessonId}:${which}`;
}

/** What pairing looks at: an item's id ("pg19-2:p4"), its model answer and its English prompt. */
export interface PromptItem {
  id: string;
  en?: string | null;
  promptEn?: string | null;
}

const lessonOfId = (id: string) => id.split(":")[0];
const sameText = (text: string | null | undefined) => String(text ?? "").trim().replace(/\s+/g, " ");

/**
 * A lesson's paraphrase pairs (작업기록 할 일 6): item B whose English prompt (`promptEn`) is item A's model answer (`en`) —
 * pg19-2 p4 rewrites p3's answer, pg05-3 p2 answers p1's tag question. Shown before A, B hands over A's answer (and in the
 * review, A's first answer of the day would pass on it). Found from the items as they are, no data field; items of
 * different lessons never pair. Returns B's id → the ids of its A.
 */
export function promptPartners(items: readonly PromptItem[]): Map<string, string[]> {
  const byAnswer = new Map<string, string[]>();
  for (const a of items) {
    const en = sameText(a.en);
    if (!en) continue;
    const key = `${lessonOfId(a.id)}\n${en}`;
    byAnswer.set(key, [...(byAnswer.get(key) ?? []), a.id]);
  }
  const partners = new Map<string, string[]>();
  for (const b of items) {
    const prompt = sameText(b.promptEn);
    if (!prompt) continue;
    const as = (byAnswer.get(`${lessonOfId(b.id)}\n${prompt}`) ?? []).filter((id) => id !== b.id);
    if (as.length) partners.set(b.id, as);
  }
  return partners;
}

/**
 * `list` with each B after its A (promptPartners) when both are in it: B moves to just after the last of its A, and all
 * else keeps its place. An A not in `list` — done already, or not in this session — holds nothing back. Items in a cycle
 * (never in the data) are kept, at the end.
 */
export function orderAfterPartners<T>(list: readonly T[], idOf: (item: T) => string, partners: ReadonlyMap<string, readonly string[]>): T[] {
  const present = new Set(list.map(idOf));
  const placed = new Set<string>();
  const out: T[] = [];
  const waiting: T[] = [];
  const free = (item: T) => (partners.get(idOf(item)) ?? []).every((a) => !present.has(a) || placed.has(a));
  for (const item of list) {
    if (!free(item)) {
      waiting.push(item);
      continue;
    }
    out.push(item);
    placed.add(idOf(item));
    // the B it held back, in their own order — and a B let out may let out one of its own (a chain)
    for (let i = 0; i < waiting.length; i++) {
      if (!free(waiting[i])) continue;
      const [next] = waiting.splice(i, 1);
      out.push(next);
      placed.add(idOf(next));
      i = -1;
    }
  }
  return [...out, ...waiting];
}

/** the engine's reason for a finished lesson's first check (src/lib/learning/engine.ts planDay) */
const NEXT_DAY = "next-day";

/**
 * Today's review in this course's order (작업기록 할 일 6): the engine's plan — which items come, and why — with every B
 * after its A when both come today. The review screen answers each lesson's next-day items first, as one test, and all
 * the rest after them (src/components/learning/ReviewSession.tsx segmentsOf). So a B still waiting for its next-day check
 * whose A comes as a practice item (answered on an earlier day — the check left half done) is answered with the practice
 * items, just after A: it takes A's reason, which here only says where the screen puts it. `itemOf` gives an entry's item
 * (the review's data); an entry without one is not drawn and holds nothing back.
 */
export function orderReviewPlan<E extends { key: string; reason: string }>(entries: readonly E[], itemOf: (key: string) => Omit<PromptItem, "id"> | null | undefined): E[] {
  const items: PromptItem[] = [];
  for (const e of entries) {
    const item = itemOf(e.key);
    if (item) items.push({ id: e.key, en: item.en, promptEn: item.promptEn });
  }
  const partners = promptPartners(items);
  if (!partners.size) return [...entries];
  let list = [...entries];
  for (let pass = 0; pass < list.length; pass++) {
    const byKey = new Map(list.map((e) => [e.key, e]));
    let moved = false;
    list = list.map((e) => {
      if (e.reason !== NEXT_DAY) return e;
      const a = (partners.get(e.key) ?? []).map((key) => byKey.get(key)).find((x): x is E => x !== undefined && x.reason !== NEXT_DAY);
      if (!a) return e;
      moved = true;
      return { ...e, reason: a.reason };
    });
    if (!moved) break;
  }
  return orderAfterPartners(list, (e) => e.key, partners);
}
