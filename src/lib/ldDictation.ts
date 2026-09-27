/**
 * LISTENING Step 2 받아쓰기 — the rules, kept out of the view so node can check them over all 2,217 lines
 * (2026-09-27 학습법 · 화면 고침 — 사장님 "검토 결과대로"; listening-verified.md LD-L04 · L05 · L12 · L13 · U02 · U21, 계획 F02 · D24 나).
 *
 * Three ways to dictate a line; the learner picks, 빈칸 is the default (D24 나):
 *   빈칸 (blanks)  3–6 words of the line are blank — the weak function words and verb endings Korean learners miss
 *                  (a · the · and · in · of · to · for · can · his · her … · worked / works / work) and teen/ty numbers the
 *                  lesson's hints do not give. A blank is answered by choosing one of three sound-alike real words, or by typing.
 *                  Never a word that starts a sentence or a capitalised word (a name) — an I-form blank offers I-forms only —
 *                  so no option gives itself away by its capital.
 *   블록 (blocks) every word of the line as a tile, plus two distractors: sound-alike function words the line does not have
 *                  (in/and/an · his/is · can/can't · a/the · to/two/too · for/four · of/have · than/then · there/their ·
 *                  were/where), else lower-case words of the lesson's other lines taken in turn. A pair of distractors is used on
 *                  at most 3 lines of a lesson (it used to be the same pair on every line: d001 'Im, Mrs'). Tiles show lower case
 *                  but for I-forms and the lesson's names (LD-L13).
 *   쓰기 (typing)  the whole line, judged by listeningUtils.typedDictationMatches (numbers typed as heard, hyphens — LD-L12).
 * Blanks and distractors are the same on every visit (seeded by the lesson and the line); only the tile order is shuffled.
 * The judge of a whole line is unchanged: verifyAnyWordSequence (blocks) · typedDictationMatches (typing).
 *
 * THIS FILE SHIPS TO THE BROWSER: it holds generic English word lists only — never a word of a lesson (public files carry zero
 * paid lesson content). docs/qa-2026-09-18/scripts/check-ld-dictation-0927.cjs runs it over every line and fails loudly.
 */
import { generateWordBank, typedDictationMatches } from "@/lib/listeningUtils";

// ---------------------------------------------------------------------------------------------------------------
// Words of a line
// ---------------------------------------------------------------------------------------------------------------

/** The dictation tokens — the same pattern as listeningUtils' DICTATION_TOKEN (kept in step by the check, not by trust). */
const TOKEN = /\d{1,2}:\d{2}|\d{1,3}(?:,\d{3})+|[AaPp]\.[Mm]\.|[a-zA-Z0-9'’\-]+/g;

export interface LdToken {
  word: string;
  start: number;
  end: number;
}

export function tokensOf(text: string): LdToken[] {
  const out: LdToken[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const word = m[0].trim();
    if (word) out.push({ word, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

/** lower case, one apostrophe */
export const normWord = (w: string) => w.toLowerCase().replace(/’/g, "'");
const I_FORM = /^I(?:['’](?:m|ve|ll|d))?$/;
/** Abbreviations whose full stop does not end a sentence. */
const TITLE_BEFORE = /\b(?:Mr|Mrs|Ms|Dr|Mt|St|Jr|Sr|Prof)\.$/;

/** Does token k start a sentence (the line's first word, after . ! ? — not after "Mrs." — or after an opening quote)? */
function startsSentence(text: string, toks: readonly LdToken[], k: number): boolean {
  if (k === 0) return true;
  const gap = text.slice(toks[k - 1].end, toks[k].start);
  if (/[“"‘(]\s*$/.test(gap)) return true;
  const before = text.slice(0, toks[k].start).trimEnd();
  return /[.!?]/.test(gap) && !TITLE_BEFORE.test(before);
}

// ---------------------------------------------------------------------------------------------------------------
// Tile case (LD-L13 ②)
// ---------------------------------------------------------------------------------------------------------------

/**
 * The words that keep their capital on a tile: written with a capital in the MIDDLE of a sentence somewhere in the lesson
 * (Watson · Wisconsin · Mrs), or a capitalised word of the lesson's hints (a name that only ever starts a sentence) — but not a
 * word the lesson also writes in lower case: "The" of a book title, or "All" of a heading, is "the" and "all" on its tile, so a
 * capital never marks the first word of a line (the same word elsewhere shows lower case).
 */
export function lessonCapitals(lines: readonly string[], hintChunks: readonly string[] = []): Set<string> {
  const out = new Set<string>();
  const lower = new Set<string>();
  for (const text of lines) {
    const toks = tokensOf(text);
    toks.forEach((t, k) => {
      if (/^[a-z]/.test(t.word)) lower.add(normWord(t.word));
      else if (/^[A-Z]/.test(t.word) && !startsSentence(text, toks, k)) out.add(t.word);
    });
  }
  for (const chunk of hintChunks) for (const t of tokensOf(chunk)) if (/^[A-Z]/.test(t.word)) out.add(t.word);
  for (const w of [...out]) if (lower.has(normWord(w))) out.delete(w);
  return out;
}

/** The word as a tile shows it: lower case, except I-forms, the lesson's names and words not written "Capital + lower case". */
export function tileLabel(word: string, capitals: ReadonlySet<string>): string {
  if (I_FORM.test(word)) return word;
  if (!/^[A-Z][a-z'’\-]*$/.test(word)) return word;
  if (capitals.has(word)) return word;
  return word.charAt(0).toLowerCase() + word.slice(1);
}

// ---------------------------------------------------------------------------------------------------------------
// Blanks (D24 나 · LD-L04)
// ---------------------------------------------------------------------------------------------------------------

/**
 * The sound-alike alternatives of a weak function word — the pairs of LD-L13 (in/and/an · his/is · can/can't · a/the ·
 * to/two/too · for/four · of/have · than/then · there/their · were/where) and their neighbours. Every word is a real
 * English word; the check lists any that no lesson of the site uses.
 */
const CONFUSION: Record<string, readonly string[]> = {
  a: ["the", "an", "of"],
  an: ["and", "in", "a"],
  the: ["a", "that", "this"],
  and: ["an", "in", "end"],
  in: ["and", "an", "on"],
  on: ["in", "an", "and"],
  at: ["it", "a", "that"],
  to: ["two", "too", "the"],
  two: ["to", "too"],
  too: ["to", "two"],
  for: ["four", "from", "far"],
  four: ["for", "far"],
  from: ["for", "form"],
  of: ["have", "off", "a"],
  off: ["of", "if"],
  have: ["of", "has", "had"],
  has: ["have", "had", "his"],
  had: ["have", "has"],
  his: ["is", "he's", "has"],
  is: ["his", "as", "it's"],
  as: ["is", "has", "was"],
  was: ["is", "were", "as"],
  // never two options spelled alike but for an apostrophe (were · we're, well · we'll, its · it's) — the eye, not the ear, tells them apart
  were: ["where", "was", "wear"],
  where: ["were", "wear"],
  are: ["our", "or", "were"],
  our: ["are", "hour", "or"],
  or: ["are", "our"],
  her: ["here", "he", "hear"],
  here: ["hear", "her"],
  hear: ["here", "her"],
  him: ["them", "in", "his"],
  them: ["him", "then", "the"],
  he: ["she", "his"],
  she: ["he", "see"],
  it: ["at", "its", "is"],
  its: ["it", "is"],
  can: ["can't", "could"],
  "can't": ["can", "could"],
  could: ["would", "should", "can"],
  would: ["could", "should", "will"],
  should: ["could", "would"],
  will: ["would", "well"],
  than: ["then", "that", "and"],
  then: ["than", "them", "when"],
  that: ["the", "than", "this"],
  this: ["these", "the", "that"],
  these: ["this", "those", "the"],
  those: ["these", "this"],
  there: ["their", "they're", "the"],
  their: ["there", "they're"],
  "they're": ["their", "there"],
  they: ["the", "there"],
  with: ["which", "will", "what"],
  what: ["want", "when", "which"],
  when: ["then", "what"],
  want: ["won't", "went", "what"],
  "won't": ["want", "went", "will"],
  went: ["want", "won't", "when"],
  do: ["does", "did"],
  does: ["do", "did"],
  did: ["do", "does"],
  "don't": ["doesn't", "didn't", "won't"],
  "doesn't": ["don't", "didn't", "isn't"],
  "didn't": ["don't", "doesn't"],
  "isn't": ["is", "wasn't", "aren't"],
  "wasn't": ["was", "isn't", "weren't"],
  "aren't": ["are", "weren't", "isn't"],
  "weren't": ["were", "aren't", "wasn't"],
  "couldn't": ["could", "can't", "wouldn't"],
  "wouldn't": ["would", "won't", "couldn't"],
  "i'm": ["I", "I've", "I'd"],
  "i've": ["I", "I'm", "I'd"],
  "i'll": ["I", "I'm", "I'd"],
  "i'd": ["I", "I'll", "I'm"],
  "he's": ["his", "he", "she's"],
  "she's": ["she", "he's"],
  "it's": ["is", "it"],
  "that's": ["that", "this"],
  "there's": ["there", "these"],
  "we're": ["where", "we"],
  "you're": ["your", "you", "you'll"],
  your: ["you're", "you", "you'll"],
  you: ["your", "you'll"],
  "you'll": ["you", "you're", "your"],
  "we'll": ["will", "we"],
  been: ["being", "bean"],
  if: ["is", "of", "it"],
  us: ["as", "is"],
  we: ["he", "me"],
  me: ["my", "we"],
  my: ["me", "may"],
  very: ["every", "vary"],
  any: ["many", "an"],
  many: ["any", "money"],
  some: ["same", "come"],
  into: ["in", "onto"],
  but: ["what", "bought"],
  not: ["now", "note"],
  no: ["know", "now"],
  know: ["no", "now"],
  new: ["knew", "now"],
  knew: ["new", "know"],
  knows: ["know", "knew"],
  how: ["who", "now"],
  by: ["buy", "my"],
  one: ["won", "on"],
  say: ["said", "says"],
  says: ["said", "say"],
  said: ["says", "say"],
  get: ["got", "gets"],
  gets: ["get", "got"],
  got: ["get", "gets"],
  make: ["made", "makes"],
  makes: ["make", "made"],
  made: ["make", "makes"],
  take: ["took", "takes"],
  takes: ["take", "took"],
  took: ["take", "takes"],
  come: ["came", "comes"],
  comes: ["come", "came"],
  came: ["come", "comes"],
  give: ["gave", "gives"],
  gives: ["give", "gave"],
  gave: ["give", "gives"],
  see: ["sea", "seen"],
};

/** The weak forms LD-L04 names first — chosen before the others when a line has more candidates than blanks. */
const FIRST_CHOICE = new Set([
  "a", "an", "the", "and", "in", "of", "to", "for", "can", "can't", "his", "her", "him", "them", "is", "was", "were", "are",
  "at", "on", "it", "has", "have", "had", "than", "then", "there", "their", "they're", "want", "won't", "went", "don't",
  "doesn't", "didn't", "isn't", "wasn't", "aren't", "weren't", "couldn't", "wouldn't", "i'm", "i've", "i'll", "i'd",
  "he's", "she's", "it's", "that's", "there's", "we're", "you're", "your",
]);

/** Regular verbs: base · -s · -ed, written out (no spelling rule can invent a non-word). A blank on any form offers all three. */
const VERB_FORMS: readonly (readonly [string, string, string])[] = (
  "answer answers answered|appear appears appeared|arrive arrives arrived|ask asks asked|attend attends attended|" +
  "believe believes believed|borrow borrows borrowed|call calls called|carry carries carried|change changes changed|" +
  "check checks checked|clean cleans cleaned|climb climbs climbed|close closes closed|collect collects collected|" +
  "cook cooks cooked|count counts counted|cover covers covered|cross crosses crossed|cry cries cried|dance dances danced|" +
  "decide decides decided|die dies died|dream dreams dreamed|dress dresses dressed|drop drops dropped|dry dries dried|" +
  "earn earns earned|end ends ended|enjoy enjoys enjoyed|enter enters entered|explain explains explained|fill fills filled|" +
  "finish finishes finished|fix fixes fixed|follow follows followed|happen happens happened|hate hates hated|help helps helped|" +
  "hope hopes hoped|hurry hurries hurried|introduce introduces introduced|invite invites invited|join joins joined|" +
  "jump jumps jumped|kill kills killed|kiss kisses kissed|knock knocks knocked|laugh laughs laughed|learn learns learned|" +
  "like likes liked|listen listens listened|live lives lived|look looks looked|love loves loved|marry marries married|" +
  "miss misses missed|move moves moved|need needs needed|offer offers offered|open opens opened|order orders ordered|" +
  "paint paints painted|pass passes passed|pick picks picked|plan plans planned|plant plants planted|play plays played|" +
  "prepare prepares prepared|promise promises promised|pull pulls pulled|push pushes pushed|reach reaches reached|" +
  "receive receives received|remember remembers remembered|rent rents rented|rest rests rested|return returns returned|" +
  "save saves saved|seem seems seemed|share shares shared|shop shops shopped|shout shouts shouted|smile smiles smiled|" +
  "start starts started|stay stays stayed|stop stops stopped|study studies studied|talk talks talked|thank thanks thanked|" +
  "touch touches touched|travel travels traveled|try tries tried|turn turns turned|use uses used|visit visits visited|" +
  "wait waits waited|walk walks walked|want wants wanted|wash washes washed|watch watches watched|wish wishes wished|" +
  "work works worked|worry worries worried"
)
  .split("|")
  .map((t) => t.split(" ") as unknown as readonly [string, string, string]);
const VERB_OF = new Map<string, readonly string[]>();
for (const forms of VERB_FORMS) for (const f of forms) if (!VERB_OF.has(f)) VERB_OF.set(f, forms);

/** Teen / ty numbers heard alike — fifteen · fifty · five (digits) and fifteen · fifty · fifth (words). */
const NUMBER_WORDS: readonly (readonly [string, string, string])[] = [
  ["thirteen", "thirty", "third"],
  ["fourteen", "forty", "fourth"],
  ["fifteen", "fifty", "fifth"],
  ["sixteen", "sixty", "sixth"],
  ["seventeen", "seventy", "seventh"],
  ["eighteen", "eighty", "eighth"],
  ["nineteen", "ninety", "ninth"],
];
function numberOptions(key: string): string[] | null {
  for (const [teen, ty, th] of NUMBER_WORDS) {
    if (key === teen) return [ty, th];
    if (key === ty) return [teen, th];
  }
  if (/^1[3-9]$/.test(key)) return [String((Number(key) - 10) * 10), key.slice(1)];
  if (/^[3-9]0$/.test(key)) return [String(Number(key[0]) + 10), key[0]];
  return null;
}

export interface LdBlank {
  /** the token's index in the line */
  index: number;
  /** the word as written */
  word: string;
  /** three words, the answer among them, in a fixed shuffled order */
  options: string[];
}

export type BlankKind = "function" | "ending" | "number";

interface Candidate {
  index: number;
  word: string;
  key: string;
  kind: BlankKind;
  alts: readonly string[];
  /** one of the weak forms LD-L04 names, inside a sentence */
  first: boolean;
  /** the first word of a sentence */
  initial: boolean;
}

/** FNV-1a — a fixed "random" per lesson and line, so a line shows the same blanks on every visit and in the check. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function candidateOf(text: string, toks: readonly LdToken[], k: number, hintWords: ReadonlySet<string>): Candidate | null {
  const word = toks[k].word;
  const initial = startsSentence(text, toks, k);
  // a capital in the middle of a sentence is a name — never blanked (its capital would be the clue); a sentence's first word
  // is blanked only when it is one of the words below, and then every option is written with a capital too
  if (/^[A-Z]/.test(word) && !I_FORM.test(word) && (!initial || !/^[A-Z][a-z'’]*$/.test(word))) return null;
  const key = normWord(word);
  // a sentence start is stressed more often — the weak forms inside a sentence come first
  const conf = CONFUSION[key];
  if (conf) return { index: k, word, key, kind: "function", alts: conf, first: !initial && FIRST_CHOICE.has(key), initial };
  const verb = VERB_OF.get(key);
  if (verb) return { index: k, word, key, kind: "ending", alts: verb.filter((f) => f !== key), first: false, initial };
  const num = numberOptions(key);
  if (num && !hintWords.has(key)) return { index: k, word, key, kind: "number", alts: num, first: false, initial };
  return null;
}

/** How many blanks a line of n words gets: one per five words, at least 3, at most 6 (fewer only when it has fewer candidates). */
export const blankTarget = (words: number) => Math.min(6, Math.max(3, Math.ceil(words / 5)));
/** A set of three options (or a pair of distractors) is used on at most this many lines of one lesson. */
export const MAX_REPEAT = 3;

const tripleKey = (words: readonly string[]) => [...words].map(normWord).sort().join("|");

/**
 * An option written the way the answer is: an I-form as it is; otherwise lower case, or with a capital when the answer starts a
 * sentence with one — so all three options of a blank look alike and none gives itself away by its case or apostrophe.
 */
function shown(option: string, answer: string): string {
  if (I_FORM.test(option)) return option;
  let o = option.toLowerCase();
  if (answer.includes("’")) o = o.replace(/'/g, "’");
  if (/^[A-Z]/.test(answer) && !I_FORM.test(answer)) o = o.charAt(0).toUpperCase() + o.slice(1);
  return o;
}

export interface LineBlanks {
  blanks: LdBlank[];
  /** candidates on the line (before the per-line target and the repeat limit) */
  candidates: number;
  /** candidates left out because every set of their options was already used on MAX_REPEAT lines of the lesson */
  capped: number;
}

/**
 * The blanks of every line of a lesson, in order (the repeat limit counts across the lesson). `lessonSeed` is the lesson
 * id (the script page -1 uses its main lesson's id, so both pages blank the same words).
 */
export function lessonBlanks(lines: readonly string[], lessonSeed: string, hintChunks: readonly string[] = []): LineBlanks[] {
  const hintWords = new Set(hintChunks.flatMap((c) => tokensOf(c).map((t) => normWord(t.word))));
  const usage = new Map<string, number>();
  const seen = new Map<string, number>();
  return lines.map((text, lineIndex) => {
    const toks = tokensOf(text);
    const seed = hash(`${lessonSeed}#${lineIndex + 1}`);
    // one blank per word per line — the place inside a sentence rather than at its start
    const byKey = new Map<string, Candidate>();
    for (let k = 0; k < toks.length; k++) {
      const c = candidateOf(text, toks, k, hintWords);
      if (!c) continue;
      const had = byKey.get(c.key);
      if (!had || (had.initial && !c.initial)) byKey.set(c.key, c);
    }
    const cands = [...byKey.values()];
    const target = Math.min(blankTarget(toks.length), cands.length);
    // the named weak forms first, sentence starts last; within each, a fixed shuffle of the line — so lines blank different words
    const rank = (c: Candidate) => (c.first ? 0 : c.initial ? 2 : 1);
    const order = [...cands].sort((a, b) => rank(a) - rank(b) || hash(`${seed}:${a.index}`) - hash(`${seed}:${b.index}`));
    const chosen: { c: Candidate; options: string[] }[] = [];
    const capped = new Set<number>();
    const tryPick = (c: Candidate, spaced: boolean) => {
      if (chosen.some((x) => x.c.index === c.index)) return;
      if (spaced && chosen.some((x) => Math.abs(x.c.index - c.index) < 2)) return; // not next to another blank
      const occ = seen.get(c.key) ?? 0;
      const m = c.alts.length;
      for (let r = 0; r < Math.max(1, m); r++) {
        const pair = m <= 2 ? [...c.alts] : [c.alts[(occ + r) % m], c.alts[(occ + r + 1) % m]];
        const triple = tripleKey([c.key, ...pair]);
        if ((usage.get(triple) ?? 0) >= MAX_REPEAT) continue;
        chosen.push({ c, options: [c.word, ...pair.map((p) => shown(p, c.word))] });
        usage.set(triple, (usage.get(triple) ?? 0) + 1);
        seen.set(c.key, occ + 1);
        capped.delete(c.index);
        return;
      }
      capped.add(c.index);
    };
    for (const c of order) if (chosen.length < target) tryPick(c, true);
    for (const c of order) if (chosen.length < Math.min(3, target)) tryPick(c, false);
    const blanks = chosen
      .map(({ c, options }) => ({
        index: c.index,
        word: c.word,
        options: [...options].sort((a, b) => hash(`${seed}/${c.index}/${normWord(a)}`) - hash(`${seed}/${c.index}/${normWord(b)}`)),
      }))
      .sort((a, b) => a.index - b.index);
    return { blanks, candidates: cands.length, capped: capped.size };
  });
}

/** Is the answer to a blank right? Chosen: the same word. Typed: as a typed line is judged (case, apostrophes, numbers as heard). */
export function blankRight(given: string, answer: string, typed: boolean): boolean {
  const g = given.trim();
  if (!g) return false;
  return typed ? typedDictationMatches(g, answer) : normWord(g) === normWord(answer);
}

// ---------------------------------------------------------------------------------------------------------------
// Block distractors (F02 · LD-L13 ①)
// ---------------------------------------------------------------------------------------------------------------

export const SOUND_ALIKE_GROUPS: readonly (readonly string[])[] = [
  ["in", "and", "an"],
  ["his", "is"],
  ["can", "can't"],
  ["a", "the"],
  ["to", "two", "too"],
  ["for", "four"],
  ["of", "have"],
  ["than", "then"],
  ["there", "their"],
  ["were", "where"],
];

/** A word with its apostrophes and a trailing s removed — two words that differ only so sound the same (listeningUtils soundAlikeForm). */
const soundAlike = (w: string) => w.toLowerCase().replace(/['’]/g, "").replace(/s$/, "");

/**
 * Two distractor tiles for every line of a lesson (in order — the repeat limit counts across the lesson): sound-alike function
 * words the line does not have, else lower-case words of the lesson's other lines, starting from the next line.
 */
export function lessonDistractors(lines: readonly string[], lessonSeed: string): string[][] {
  const usage = new Map<string, number>();
  const lineWords = lines.map((text) => tokensOf(text).map((t) => t.word));
  return lines.map((_, i) => {
    const words = lineWords[i];
    const have = new Set(words.map(normWord));
    const alike = new Set(words.map(soundAlike));
    const seed = hash(`${lessonSeed}~${i + 1}`);
    const cands: { word: string; group: number }[] = [];
    SOUND_ALIKE_GROUPS.forEach((g, gi) => {
      if (!g.some((w) => have.has(w))) return;
      for (const w of g) if (!have.has(w)) cands.push({ word: w, group: gi });
    });
    cands.sort((a, b) => hash(`${seed}:${a.word}`) - hash(`${seed}:${b.word}`));
    // then the lesson's other lines, lower-case words only (never a name, never a number), from the next line on
    for (let step = 1; step < lines.length; step++) {
      const j = (i + step) % lines.length;
      for (const w of lineWords[j]) {
        const key = normWord(w);
        if (!/^[a-z][a-z'’\-]*$/.test(w) || w.length < 2 || have.has(key) || alike.has(soundAlike(w))) continue;
        if (cands.some((c) => normWord(c.word) === key)) continue;
        cands.push({ word: w, group: -1 - j });
      }
    }
    for (let a = 0; a < cands.length; a++) {
      for (let b = a + 1; b < cands.length; b++) {
        if (cands[a].group === cands[b].group && cands[a].group >= 0) continue; // "two" and "too" together say nothing new
        const key = tripleKey([cands[a].word, cands[b].word]);
        if ((usage.get(key) ?? 0) >= MAX_REPEAT) continue;
        usage.set(key, (usage.get(key) ?? 0) + 1);
        return [cands[a].word, cands[b].word];
      }
    }
    return cands.slice(0, 1).map((c) => c.word);
  });
}

export interface DictTile {
  id: string;
  /** the word the answer is judged with */
  word: string;
  /** what the tile shows (lower case unless a name or an I-form) */
  label: string;
}

/** The tiles of one line in block mode (a new shuffle each call — the judge is generateWordBank's accepted sequences). */
export function blockTiles(text: string, distractors: readonly string[], capitals: ReadonlySet<string>) {
  const bank = generateWordBank(text, [], { distractors });
  const tiles: DictTile[] = bank.allTiles.map((t) => ({ id: t.id, word: t.word, label: tileLabel(t.word, capitals) }));
  return { words: bank.correctWords, accepted: bank.acceptedWordSequences, tiles };
}

// ---------------------------------------------------------------------------------------------------------------
// Where an answer differs (LD-L05)
// ---------------------------------------------------------------------------------------------------------------

export type DiffKind = "ok" | "spelling" | "wrong" | "extra" | "missing";
export interface DiffOp {
  kind: DiffKind;
  /** the learner's word (absent for 'missing') */
  given?: string;
  /** the line's word (absent for 'extra') */
  target?: string;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * The learner's words against the line's, in order (longest common subsequence): matched words, and between two matches the
 * words given in place of others (a small spelling slip or a different word), words given too many and words missing.
 */
export function diffWords(given: readonly string[], target: readonly string[]) {
  const g = given.map(normWord);
  const t = target.map(normWord);
  const n = g.length;
  const m = t.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = g[i] === t[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  let gaveRun: string[] = [];
  let wantRun: string[] = [];
  const flush = () => {
    const both = Math.min(gaveRun.length, wantRun.length);
    for (let k = 0; k < both; k++) {
      const a = normWord(gaveRun[k]);
      const b = normWord(wantRun[k]);
      const slip = editDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 3));
      ops.push({ kind: slip ? "spelling" : "wrong", given: gaveRun[k], target: wantRun[k] });
    }
    for (let k = both; k < gaveRun.length; k++) ops.push({ kind: "extra", given: gaveRun[k] });
    for (let k = both; k < wantRun.length; k++) ops.push({ kind: "missing", target: wantRun[k] });
    gaveRun = [];
    wantRun = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && g[i] === t[j]) {
      flush();
      ops.push({ kind: "ok", given: given[i], target: target[j] });
      i++;
      j++;
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) {
      wantRun.push(target[j]);
      j++;
    } else {
      gaveRun.push(given[i]);
      i++;
    }
  }
  flush();
  const count = (k: DiffKind) => ops.filter((o) => o.kind === k).length;
  return { ops, ok: count("ok"), spelling: count("spelling"), wrong: count("wrong"), extra: count("extra"), missing: count("missing") };
}

/** '빠진 낱말 2 · 철자 1' — the kinds of difference that are there, in words. */
export function diffSummary(d: { spelling: number; wrong: number; extra: number; missing: number }): string {
  const parts: string[] = [];
  if (d.missing) parts.push(`빠진 낱말 ${d.missing}`);
  if (d.spelling) parts.push(`철자 ${d.spelling}`);
  if (d.wrong) parts.push(`다른 낱말 ${d.wrong}`);
  if (d.extra) parts.push(`더 들어간 낱말 ${d.extra}`);
  return parts.join(" · ");
}
