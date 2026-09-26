/**
 * PASS-OFF GRAMMAR — the lesson screen's own bookkeeping (docs/pass-off-grammar/설계.md §3). Pure: no React,
 * no storage — src/components/PassoffLearningView.tsx and its steps call these.
 *
 * What lives here: how ④ is cut into sets and when a sentence comes back, the tiles' grammar distractors,
 * the first-letter clue, and the shape of the practice state kept on the device
 * (localStorage `kig:passoff:work:<lessonKey>`) with the steps that change it. What does NOT: anything that
 * crosses days — review, pass, "내일 1순위" scheduling. The lesson only records those (src/lib/passoffLearning.ts);
 * the common learning engine owns them (설계 §4, 공통-학습-엔진.md).
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

/** The clue of ladder step ②: each word's first letter, the rest as blanks ("S__ i_ t____ t____."). */
export function firstLetters(text: string): string {
  return wordsOf(text)
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

/** The other number or person of a word: likes ↔ like, studies ↔ study, watches ↔ watch, box → boxes. */
function partnersOf(word: string): string[] {
  const w = word.toLowerCase();
  if (CONTRASTS[w]) return CONTRASTS[w];
  if (!/^[a-z]{3,}$/.test(w)) return [];
  if (w.length > 4 && w.endsWith("ies")) return [`${w.slice(0, -3)}y`];
  if (/(ches|shes|xes|sses|oes)$/.test(w)) return [w.slice(0, -2)];
  if (w.endsWith("s") && !w.endsWith("ss")) return [w.slice(0, -1)];
  if (/[^aeiou]y$/.test(w)) return [`${w.slice(0, -1)}ies`];
  if (/(ch|sh|x|ss|o)$/.test(w)) return [`${w}es`];
  return [`${w}s`];
}

/**
 * The distractor pool for the tiles of ladder step ③ (설계 §3 "문법 방해 타일"): first the wrong words of the
 * item's own error patterns ("She are" → are), then the grammatical partner of a target word (is → are,
 * likes → like). Words already in the model answer are skipped; listeningUtils.generateWordBank takes the
 * first two that are not.
 */
export function contrastPool(item: { en: string; errorPatterns?: readonly { match: string }[] | null; targets?: readonly (readonly string[])[] | null }): string[] {
  const model = new Set(wordsOf(item.en).map((t) => bare(t).toLowerCase()));
  const out: string[] = [];
  const add = (token: string) => {
    const w = bare(token);
    if (!w || model.has(w.toLowerCase()) || out.some((x) => x.toLowerCase() === w.toLowerCase())) return;
    out.push(w);
  };
  for (const e of item.errorPatterns ?? []) for (const t of wordsOf(e.match)) add(t);
  for (const group of item.targets ?? []) for (const form of group ?? []) for (const t of wordsOf(form)) for (const p of partnersOf(bare(t))) add(p);
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
  /** all five steps finished (the completion was recorded once) */
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

/** A stored queue while it still holds items to do; otherwise the items not done yet, in lesson order. */
export function queueOf(stored: readonly string[] | null, ids: readonly string[], isDone: (id: string) => boolean): string[] {
  const valid = new Set(ids);
  const kept = (stored ?? []).filter((id) => valid.has(id) && !isDone(id));
  return kept.length ? kept : ids.filter((id) => !isDone(id));
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
