/**
 * PASS-OFF GRAMMAR lesson blocks — the shape agreed between the content session and the code
 * session in docs/pass-off-grammar/데이터-형식.md (v1.3, 2026-09-27: its "필드 목록" is every field an
 * item may carry, and the content check refuses any other). Field names are English and values
 * Korean. When the shape changes, that file changes first, then this one.
 *
 * A lesson's `blocks` hold these four, in this order: anchors (① 예문 떠올리기), rule (② 문법 설명),
 * drill (③ 형태 찾기 · ④ 영작 · ⑤ 처음 보는 문장), frame (⑤ 내 문장).
 *
 * Item ids ("pg02-1:p4") never change once given — they are the keys of a learner's record.
 *
 * Gone in v1.3, so a grader must not look for them: `reject` (a wrong answer that only differs by a
 * contraction is now an error pattern with `literal: true`) and `koFix` (now `fix.fromKo`).
 */

/** Where an item sits in the textbook, for the source table the owner can hold against the page. */
export interface PassoffBookRef {
  book: number;
  page: number;
  where: string;
  reviewWhere?: string;
}

/** The same sentence in STUDENT: "exact" when identical to the letter (a link target), "adapted" when changed. */
export interface PassoffStudentRef {
  lesson: string;
  kind: "exact" | "adapted";
}

/** What was changed from the textbook, and why — for the source table, never the learner's screen. */
export interface PassoffFix {
  /** the old English (or sentence) */
  from?: string;
  /** the old Korean */
  fromKo?: string;
  /** which field changed: "en" · "ko" · "en+ko" · "sentence" · "underline" … */
  field?: string;
  kind: string;
  why: string;
}

/** Fields every item may carry. */
interface PassoffItemBase {
  id: string;
  bookRef?: PassoffBookRef | null;
  /**
   * A sentence of a paid STUDENT chapter inside a free preview lesson (설계 §7). It never stays in
   * the free lesson file — scripts/buildPassoffIndex.mjs moves it to the server-only supplement.
   */
  paidStudent?: boolean;
  /** A heteronym said in the meaning the screen shows ("read" → "red"), under its own clip. */
  speakAs?: string;
  fix?: PassoffFix | null;
  /** a label for the clause the sentence shows ("의문사 절" — pg08-4 keeps it apart from what-clauses) */
  clauseLabel?: string;
  /**
   * Record-only, never shown: where a task not printed in the book came from ("new" ·
   * "student:s3-3#1" · "grammar1:gh1-007#3"), where the Korean came from, and a note for the next editor.
   */
  source?: string;
  koSource?: string;
  note?: string;
}

/** ① 예문 떠올리기 — at most eight. */
export interface PassoffAnchor extends PassoffItemBase {
  en: string;
  ko: string;
  /** words to highlight; a multi-word unit is one string ("had better") */
  focus?: string[];
  studentRef?: PassoffStudentRef | null;
  /** an answer lesson's English question (pg05-2 …): shown above the Korean, never spoken — only `en` is */
  promptEn?: string | null;
}

export interface PassoffQuestion {
  question: string;
  options: string[];
  answer: number;
  why?: string;
}

/** ② 문법 설명 — a discovery question, the explanation card and one rule check. */
export interface PassoffRuleBlock {
  type: "rule";
  discovery?: PassoffQuestion & { anchorIds?: string[] };
  title: string;
  points: string[];
  table?: { columns: string[]; rows: string[][] } | null;
  koDiff?: string;
  mistakes?: { wrong: string; right: string; why?: string }[];
  worked?: string[];
  terms?: { now: string; book: string }[];
  check?: PassoffQuestion & { pointIndex?: number };
}

interface PassoffFormItemBase extends PassoffItemBase {
  instruction: string;
  why?: string;
  /** beyond the lesson's 4~6 form items: kept for review instead */
  reserve?: boolean;
}

/** ③ 형태 찾기 — tap the tokens (select), pick an option (choice) or type a short answer (short). */
export type PassoffFormItem =
  | (PassoffFormItemBase & {
      kind: "select";
      tokens: string[];
      answer: number[];
      optional?: number[];
      labels?: string[] | null;
      labelAnswer?: string | string[] | null;
    })
  | (PassoffFormItemBase & {
      kind: "choice";
      sentence?: string;
      underline?: string[];
      options: string[];
      answer: number;
    })
  | (PassoffFormItemBase & {
      kind: "short";
      sentence?: string;
      answer: string[];
    });

/** ④ 영작 (Application Sentences). Sets are cut by the code from sentence length. */
export interface PassoffProduceItem extends PassoffItemBase {
  ko: string;
  /** condition chip: "it을 써서" · "(who)" · "수동태로" … */
  condition?: string | null;
  /** the English prompt of a transformation item (active → passive, a yes/no question) */
  promptEn?: string | null;
  /** the model answer — shown and spoken */
  en: string;
  accept?: string[];
  /** any-of groups; an answer missing one group is wrong */
  targets?: string[][];
  errorPatterns?: PassoffErrorPattern[];
  tags?: string[];
  challenge?: boolean;
  challengeTags?: string[];
  /** record-only: why a sentence is or is not a challenge */
  challengeNote?: string;
  studentRef?: PassoffStudentRef | null;
  /**
   * NOT A LESSON-FILE FIELD — the server attaches it to what a page or the review hands out (src/lib/passoffWordForms.ts):
   * the irregular-verb and plural table's words this item's answers can meet, for the grader's typo rule.
   */
  wordForms?: string[];
}

/**
 * A known wrong answer and the hint it earns (데이터-형식.md "오답 패턴"). A plain pattern is a piece of
 * a wrong answer, compared word by word after the grader's normalising. `literal: true` is a WHOLE wrong
 * answer that only differs from a right one by a contraction ("Yes, it's."): the grader compares it
 * first, before any accepted answer, ignoring only case and punctuation — never expanding the
 * contraction (설계 §8).
 */
export interface PassoffErrorPattern {
  match: string;
  hint: string;
  literal?: boolean;
}

/** ⑤ 처음 보는 문장 — a produce item plus where it came from ("new" · "grammar1:gh1-007#3"). */
export interface PassoffTransferItem extends PassoffProduceItem {
  source: string;
}

export interface PassoffAnchorsBlock {
  type: "anchors";
  items: PassoffAnchor[];
}

export interface PassoffDrillBlock {
  type: "drill";
  select?: PassoffFormItem[];
  produce?: PassoffProduceItem[];
  transfer?: PassoffTransferItem[];
}

/** ⑤ 내 문장 틀 — not graded, kept on the device only. */
export interface PassoffFrameBlock {
  type: "frame";
  id: string;
  template: string;
  ko: string;
}

export type PassoffBlock = PassoffAnchorsBlock | PassoffRuleBlock | PassoffDrillBlock | PassoffFrameBlock;
