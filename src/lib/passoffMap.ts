/**
 * PASS-OFF GRAMMAR — "구성도 다시 채우기" at the end of a topic (설계 §4 · §5, 공통-학습-엔진.md §8-7 — 단계 2-나 E2).
 *
 * The topic's map is its lessons in the course's order (the textbook's structure map: TOPIC 1. 인칭 → 1인칭 · 2인칭 ·
 * 3인칭). The learner puts the lessons' chips into the empty boxes 1…n, then for each box picks its rule in one line
 * (one of the topic's lessons' rule titles) and a sentence that shows it (one of the lessons' ① sentences). Everything
 * comes from the lesson files (src/lib/passoffReview.ts passoffMapData — no new words). A box is right when the lesson
 * placed there is the box's own and the rule and the sentence picked are that lesson's; the lessons of the boxes filled
 * wrong come back in review from tomorrow (practice.ts applyBringForward). Doing it once, whatever the score, after the
 * topic's lessons, is the topic's last condition (passoffUnlock.ts requireMapRefill).
 *
 * E2 수정: a box's screen asks about the lesson PLACED in it ("2. 2인칭 — 이 강의의 문법 설명 한 줄"), so its rule and sentence are
 * judged against that lesson, and its sentences to pick from are that lesson's and two others' — they no longer give away
 * that the lesson was placed in the wrong box.
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
  /** the lesson the learner placed in it (null: none) — the one its rule and sentence were picked for */
  placedId: string | null;
  lessonOk: boolean;
  /** the rule picked is the placed lesson's */
  ruleOk: boolean;
  /** the sentence picked is the placed lesson's */
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

/**
 * The sentences to pick from for a lesson placed in a box: that lesson's and two others' (a fixed pick by the topic and the
 * lesson — not its neighbours, which would hint at the course's order), or every lesson's when there are three or fewer.
 * The same for the lesson whichever box it was placed in.
 */
export function mapSentenceOptions(data: PassoffMapData, lessonId: string): { id: string; lessonId: string; en: string }[] {
  const n = data.lessons.length;
  const at = Math.max(0, data.lessons.findIndex((l) => l.id === lessonId));
  let picked = data.lessons.map((_, i) => i);
  if (n > 3) {
    const others = picked.filter((i) => i !== at);
    const order = mapOrder(others.length, data.topic * 17 + at + 300);
    picked = [at, others[order[0]], others[order[1]]];
  }
  return mapOrder(picked.length, data.topic * 31 + at + 200).map((k) => {
    const lesson = data.lessons[picked[k]];
    return { id: lesson.sentence.id, lessonId: lesson.id, en: lesson.sentence.en };
  });
}

/** Box by box: right when the lesson placed is the box's own, and the rule and the sentence picked are the placed lesson's. */
export function gradeMap(data: PassoffMapData, picks: PassoffMapPicks): PassoffMapBoxResult[] {
  return data.lessons.map((lesson, box) => {
    const placedId = picks.boxes[box] ?? null;
    const placed = data.lessons.find((l) => l.id === placedId) ?? null;
    const lessonOk = placedId === lesson.id;
    const ruleOk = placed !== null && picks.rules[box] === placed.id;
    const sentenceOk = placed !== null && picks.sentences[box] === placed.sentence.id;
    return { box, lessonId: lesson.id, placedId, lessonOk, ruleOk, sentenceOk, ok: lessonOk && ruleOk && sentenceOk };
  });
}

/**
 * The lessons whose boxes were filled wrong — they come back in review from tomorrow. A lesson placed in a wrong box leaves
 * its own box wrong too (the boxes are a permutation), so the boxes' own lessons name every lesson involved.
 */
export function mapMissedLessons(results: readonly PassoffMapBoxResult[]): string[] {
  return results.filter((r) => !r.ok).map((r) => r.lessonId);
}
