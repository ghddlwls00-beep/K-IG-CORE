/**
 * PASS-OFF GRAMMAR lesson blocks — the shape agreed between the content session and the code
 * session in docs/pass-off-grammar/데이터-형식.md (v1, 2026-09-27). Field names are English and
 * values Korean. When the shape changes, that file changes first, then this one.
 *
 * A lesson's `blocks` hold these four, in this order: anchors (① 예문 떠올리기), rule (② 규칙),
 * drill (③ 형태 찾기 · ④ 영작 · ⑤ 처음 보는 문장), frame (⑤ 내 문장).
 *
 * Item ids ("pg02-1:p4") never change once given — they are the keys of a learner's record.
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

/** Fields every item may carry. */
interface PassoffItemBase {
  id: string;
  bookRef?: PassoffBookRef;
  /**
   * A sentence of a paid STUDENT chapter inside a free preview lesson (설계 §7). It never stays in
   * the free lesson file — scripts/buildPassoffIndex.mjs moves it to the server-only supplement.
   */
  paidStudent?: boolean;
  /** A heteronym said in the meaning the screen shows ("read" → "red"), under its own clip. */
  speakAs?: string;
  /** what was changed from the textbook, and why (the source table shows it) */
  fix?: { from: string; kind: string; why: string } | null;
  /** a label for the clause the sentence shows ("의문사 절" — pg08-4 keeps it apart from what-clauses) */
  clauseLabel?: string;
}

/** ① 예문 떠올리기 — at most eight. */
export interface PassoffAnchor extends PassoffItemBase {
  en: string;
  ko: string;
  /** words to highlight; a multi-word unit is one string ("had better") */
  focus?: string[];
  studentRef?: PassoffStudentRef;
}

export interface PassoffQuestion {
  question: string;
  options: string[];
  answer: number;
  why?: string;
}

/** ② 규칙 — a discovery question, the explanation card and one rule check. */
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
  errorPatterns?: { match: string; hint: string }[];
  tags?: string[];
  challenge?: boolean;
  challengeTags?: string[];
  studentRef?: PassoffStudentRef | null;
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
