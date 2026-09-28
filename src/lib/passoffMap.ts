/**
 * PASS-OFF GRAMMAR — "구성도 다시 채우기" at the end of a topic (설계 §4 · §5, 공통-학습-엔진.md §8-7 — 단계 2-나 E2).
 *
 * The topic's map is its lessons in the course's order (the textbook's structure map: TOPIC 1. 인칭 → 1인칭 · 2인칭 ·
 * 3인칭). The learner puts the lessons' chips into the empty boxes 1…n, then for each box picks its rule in one line
 * (one of the topic's lessons' rule titles) and a sentence that shows it (one of the lessons' ① sentences). Everything
 * comes from the lesson files (src/lib/passoffReview.ts passoffMapData — no new words). A box is right when the lesson,
 * its rule and its sentence all are; the lessons of the boxes filled wrong come first at the next review (practice.ts
 * applyBringForward). Doing it once, whatever the score, is the topic's last condition (passoffUnlock.ts
 * requireMapRefill).
 *
 * Pure and import-free: the page and docs/pass-off-grammar/검사/check-learning-e2.cjs use the same functions. Every order
 * on the screen is fixed by the topic number (no Math.random while rendering — the server's HTML and the browser's
 * first render agree), and never the answer's own order.
 */

export interface PassoffMapLesson {
  id: string;
  /** the lesson's title ("2인칭") — its chip */
  title: string;
  /** the lesson's rule title — its rule in one line */
  ruleTitle: string;
  /** one ① sentence of the lesson (its first) */
  sentence: { id: string; en: string };
}

export interface PassoffMapData {
  topic: number;
  /** "TOPIC 1. 인칭" */
  label: string;
  /** in the course's order — box 1 is the first */
  lessons: PassoffMapLesson[];
}

/** What the learner put in each box: a lesson id, then the rule (by its lesson) and the sentence (by its id). */
export interface PassoffMapPicks {
  boxes: (string | null)[];
  rules: (string | null)[];
  sentences: (string | null)[];
}

export interface PassoffMapBoxResult {
  box: number;
  /** the lesson that belongs in this box */
  lessonId: string;
  lessonOk: boolean;
  ruleOk: boolean;
  sentenceOk: boolean;
  ok: boolean;
}

/** A small seeded shuffle (mulberry32) — the same order for the same topic and use, on the server and in the browser. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed order of 0…n-1 for this seed that is never 0, 1, 2 … itself (n > 1). */
export function mapOrder(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = seeded(seed * 7919 + n);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (n > 1 && order.every((v, i) => v === i)) order.push(order.shift()!);
  return order;
}

/** The chips under the boxes: the topic's lessons, not in their own order. */
export function mapChips(data: PassoffMapData): PassoffMapLesson[] {
  return mapOrder(data.lessons.length, data.topic).map((i) => data.lessons[i]);
}

/** The rule lines to pick from — every lesson's, one order for all boxes (each box's right one differs). */
export function mapRuleOptions(data: PassoffMapData): { lessonId: string; text: string }[] {
  return mapOrder(data.lessons.length, data.topic + 100).map((i) => ({ lessonId: data.lessons[i].id, text: data.lessons[i].ruleTitle }));
}

/** The sentences for box `box` (0-based): its lesson's and two others' (every lesson's when there are three or fewer). */
export function mapSentenceOptions(data: PassoffMapData, box: number): { id: string; lessonId: string; en: string }[] {
  const n = data.lessons.length;
  const picked = n <= 3 ? data.lessons.map((_, i) => i) : [box, (box + 1) % n, (box + n - 1) % n];
  return mapOrder(picked.length, data.topic * 31 + box + 200).map((k) => {
    const lesson = data.lessons[picked[k]];
    return { id: lesson.sentence.id, lessonId: lesson.id, en: lesson.sentence.en };
  });
}

/** Box by box: right when the lesson, the rule and the sentence are all the box's own. */
export function gradeMap(data: PassoffMapData, picks: PassoffMapPicks): PassoffMapBoxResult[] {
  return data.lessons.map((lesson, box) => {
    const lessonOk = picks.boxes[box] === lesson.id;
    const ruleOk = picks.rules[box] === lesson.id;
    const sentenceOk = picks.sentences[box] === lesson.sentence.id;
    return { box, lessonId: lesson.id, lessonOk, ruleOk, sentenceOk, ok: lessonOk && ruleOk && sentenceOk };
  });
}

/** The lessons whose boxes were filled wrong — they come first at the next review. */
export function mapMissedLessons(results: readonly PassoffMapBoxResult[]): string[] {
  return results.filter((r) => !r.ok).map((r) => r.lessonId);
}
