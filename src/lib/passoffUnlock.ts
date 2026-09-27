import { isDay, learningDay } from "./learning/day";

/**
 * PASS-OFF GRAMMAR — the topic order lock (docs/pass-off-grammar/설계.md §5, owner decision D5), as pure functions.
 *
 * A topic (대주제 — one group of the course index, "TOPIC 2. 동사의 현재형") is what a chapter is to STUDENT. TOPIC 1
 * is open from the start, and the lessons of an open topic can be taken in any order. The next topic opens when the
 * current one has at least ceil(0.8·n) of its n lessons finished with its LAST lesson among them (a lesson is
 * finished when the learner has done its five steps — the view's own completion), and — once the common learning
 * engine records it — the topic-end "구성도 다시 채우기" done once, whatever the score. A sentence's pass-off is not
 * a condition (it takes weeks). A LIFE pass opens every topic. `unlockedThrough` never goes down.
 *
 * THE SERVER DECIDES (src/lib/passoffProgress.ts · /api/progress/passoff-grammar · the lesson route's gate in
 * src/app/passoff-grammar/[lesson]/page.tsx); a browser only shows what the server answered. A record is taken only
 * for a topic that was already open when the request came in, so one request opens at most the next topic
 * (STUDENT's RE-010 guard, a step stricter: STUDENT also takes the chapter one ahead — here the lesson route never
 * shows a locked topic's lesson, so nothing honest can finish one).
 *
 * Kept apart from STUDENT on purpose: src/lib/studentProgress.ts (its /^s\d+-\d+$/ ids and 20 chapters) stays as it
 * is. Its one quirk is not copied: STUDENT counts the chain of completed chapters from chapter 1, so a chapter kept
 * open only because unlockedThrough never goes down cannot open the next one; here the chain starts from the stored
 * value, so finishing the open topic always opens the next.
 *
 * No imports but the engine's day functions (src/lib/learning/day.ts, itself import-free), so
 * docs/pass-off-grammar/검사/check-unlock.cjs can transpile this file alone and test every rule here — and a copy
 * that says 0.7 instead of 0.8 must fail it.
 */

/** The textbook has twenty topics (설계 §2). */
export const PASSOFF_TOPIC_MAX = 20;

export interface PassoffUnlockRule {
  /** the share of a topic's lessons to finish — STUDENT's 0.8 */
  ratio: number;
  /** the topic-end "구성도 다시 채우기" done once is also needed */
  requireMapRefill: boolean;
}

export const PASSOFF_UNLOCK_RULE: PassoffUnlockRule = {
  ratio: 0.8,
  // OFF until the common learning engine records the map refill (설계 §4 · §5 — 단계 2-나): with it on now nobody
  // could open TOPIC 2. The record field and the judgement are here already; the engine's commit turns this on.
  // check-unlock.cjs U7 holds both ways: it fails while code outside the progress files records a map refill
  // (recordPassoffMapRefill · mapRefillTopic) and this is still off — and while this is on with nothing recording one.
  requireMapRefill: false,
};

/** "2026-09-27" — the Korea-time learning day, turning at 04:00 (src/lib/learning/day.ts). */
export type PassoffDay = string;

export interface PassoffLessonState {
  completed: boolean;
  /** the browser's time of the completion, capped at the server's clock + 60 s (STUDENT's rule) */
  updatedAt: number;
  /** the FIRST completion by the SERVER's clock and its learning day — the engine's LessonDone {at, day} */
  at: string | null;
  day: PassoffDay | null;
}

/** "구성도 다시 채우기" of a topic, the first time it was done (server clock) — the engine records it (2-나). */
export interface PassoffMapRefill {
  at: string;
  day: PassoffDay;
}

export interface PassoffProgressRecord {
  version: 1;
  lessons: Record<string, PassoffLessonState>;
  /** keyed by topic number ("1" … "20") */
  mapRefills: Record<string, PassoffMapRefill>;
  /** the last open topic — never goes down */
  unlockedThrough: number;
  updatedAt: number;
}

/** A topic as the course index lists it: its lessons in order (the last one is the topic's last lesson). */
export interface PassoffTopic {
  topic: number;
  label: string;
  lessonIds: string[];
}

export interface PassoffTopicProgress extends PassoffTopic {
  completedCount: number;
  /** ceil(ratio · lessons) */
  requiredCount: number;
  percent: number;
  lastLessonId: string | null;
  lastLessonCompleted: boolean;
  mapRefilled: boolean;
  /** this topic's own conditions are met (it opens the next one if it is open itself) */
  complete: boolean;
  unlocked: boolean;
}

/** One record a browser (or, later, the engine) sends. Only completions and map refills exist — nothing un-finishes. */
export interface PassoffUpdate {
  lessonId?: string;
  completed?: boolean;
  clientUpdatedAt?: number;
  /** the topic whose "구성도 다시 채우기" was just done */
  mapRefillTopic?: number;
}

/** What the server tells a browser: its record as judged now. */
export interface PassoffProgressSnapshot {
  version: 1;
  lessons: Record<string, { completed: boolean; updatedAt: number; day: PassoffDay | null }>;
  unlockedThrough: number;
  /** a LIFE pass — every topic open */
  everyTopicOpen: boolean;
  requiredRatio: number;
  mapRefillRequired: boolean;
  updatedAt: number;
  topics: PassoffTopicProgress[];
}

const LESSON_ID = /^pg(\d{2})-(\d+)$/;
/** how far ahead of the server's clock a browser's time may be (STUDENT: 60 s) */
const CLOCK_SLACK_MS = 60_000;
/** updates taken from one request (STUDENT: 100) */
const MAX_UPDATES = 100;

/** "pg02-1" → 2; null for anything that is not a PASS-OFF GRAMMAR lesson id. */
export function passoffTopicOf(lessonId: string): number | null {
  const m = LESSON_ID.exec(lessonId);
  if (!m) return null;
  const topic = Number(m[1]);
  return topic >= 1 && topic <= PASSOFF_TOPIC_MAX ? topic : null;
}

export function clampPassoffTopic(value: unknown): number {
  return Math.min(PASSOFF_TOPIC_MAX, Math.max(1, Math.floor(Number(value) || 1)));
}

/**
 * The topics, from the course index groups (scripts/buildPassoffIndex.mjs writes one group per topic, lessons in
 * order). A lesson belongs to the topic its id names — not to the group's position — so a topic whose files are not
 * written yet leaves no gap that shifts the others.
 */
export function passoffTopicsFromGroups(
  groups: readonly { title?: string; label?: string; lessons?: readonly string[] }[],
): PassoffTopic[] {
  const byTopic = new Map<number, PassoffTopic>();
  for (const group of groups) {
    for (const id of group.lessons ?? []) {
      const topic = passoffTopicOf(id);
      if (topic === null) continue;
      let entry = byTopic.get(topic);
      if (!entry) {
        entry = { topic, label: String(group.label || group.title || "").trim() || `TOPIC ${topic}`, lessonIds: [] };
        byTopic.set(topic, entry);
      }
      if (!entry.lessonIds.includes(id)) entry.lessonIds.push(id);
    }
  }
  return [...byTopic.values()].sort((a, b) => a.topic - b.topic);
}

/** ceil(ratio · n), at least 1. The epsilon keeps a product that should be whole (0.8 · 15) from rounding up. */
export function passoffRequiredCount(lessonCount: number, ratio: number = PASSOFF_UNLOCK_RULE.ratio): number {
  return Math.max(1, Math.ceil(lessonCount * ratio - 1e-9));
}

export function emptyPassoffRecord(now: number): PassoffProgressRecord {
  return { version: 1, lessons: {}, mapRefills: {}, unlockedThrough: 1, updatedAt: now };
}

const isIso = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));
// a day is the engine's (learning/day.ts isDay): the shape AND a real date — "2026-02-30" · "2026-13-99" are not days
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** A stored record as this code can trust it: unknown ids, broken states and out-of-range topics are dropped. */
export function sanitizePassoffRecord(input: unknown, now: number): PassoffProgressRecord {
  if (!isPlainObject(input)) return emptyPassoffRecord(now);
  const lessons: Record<string, PassoffLessonState> = {};
  if (isPlainObject(input.lessons)) {
    for (const [lessonId, state] of Object.entries(input.lessons)) {
      if (passoffTopicOf(lessonId) === null || !isPlainObject(state)) continue;
      if (typeof state.completed !== "boolean" || !Number.isFinite(state.updatedAt)) continue;
      lessons[lessonId] = {
        completed: state.completed,
        updatedAt: Number(state.updatedAt),
        at: isIso(state.at) ? state.at : null,
        day: isDay(state.day) ? state.day : null,
      };
    }
  }
  const mapRefills: Record<string, PassoffMapRefill> = {};
  if (isPlainObject(input.mapRefills)) {
    for (const [key, value] of Object.entries(input.mapRefills)) {
      if (!/^\d{1,2}$/.test(key) || Number(key) < 1 || Number(key) > PASSOFF_TOPIC_MAX) continue;
      if (!isPlainObject(value) || !isIso(value.at) || !isDay(value.day)) continue;
      mapRefills[String(Number(key))] = { at: value.at, day: value.day };
    }
  }
  return {
    version: 1,
    lessons,
    mapRefills,
    unlockedThrough: clampPassoffTopic(input.unlockedThrough),
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : now,
  };
}

/**
 * Every topic's state and the last open topic. The chain starts from the stored value (never down): each open
 * topic whose conditions are met opens the one after it.
 */
export function judgePassoffTopics(
  record: PassoffProgressRecord,
  topics: readonly PassoffTopic[],
  rule: PassoffUnlockRule = PASSOFF_UNLOCK_RULE,
): { topics: PassoffTopicProgress[]; unlockedThrough: number } {
  let open = Math.max(topics.length ? topics[0].topic : 1, clampPassoffTopic(record.unlockedThrough));
  const judged = topics.map((t, index) => {
    const lessonIds = [...t.lessonIds];
    const completedCount = lessonIds.filter((id) => record.lessons[id]?.completed === true).length;
    const requiredCount = passoffRequiredCount(lessonIds.length, rule.ratio);
    const lastLessonId = lessonIds.length ? lessonIds[lessonIds.length - 1] : null;
    const lastLessonCompleted = lastLessonId !== null && record.lessons[lastLessonId]?.completed === true;
    const mapRefilled = Boolean(record.mapRefills[String(t.topic)]);
    const complete =
      lessonIds.length > 0 &&
      completedCount >= requiredCount &&
      lastLessonCompleted &&
      (!rule.requireMapRefill || mapRefilled);
    if (t.topic <= open && complete && index + 1 < topics.length) open = Math.max(open, topics[index + 1].topic);
    return {
      topic: t.topic,
      label: t.label,
      lessonIds,
      completedCount,
      requiredCount,
      percent: lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0,
      lastLessonId,
      lastLessonCompleted,
      mapRefilled,
      complete,
      unlocked: false,
    };
  });
  const unlockedThrough = clampPassoffTopic(open);
  return { topics: judged.map((t) => ({ ...t, unlocked: t.topic <= unlockedThrough })), unlockedThrough };
}

/** Raises the stored `unlockedThrough` to what the record earns — never lowers it. Returns the new value. */
export function recalculatePassoffUnlock(
  record: PassoffProgressRecord,
  topics: readonly PassoffTopic[],
  rule: PassoffUnlockRule = PASSOFF_UNLOCK_RULE,
): number {
  record.unlockedThrough = Math.max(clampPassoffTopic(record.unlockedThrough), judgePassoffTopics(record, topics, rule).unlockedThrough);
  return record.unlockedThrough;
}

/**
 * The owner opens topics by hand from /admin/license (STUDENT's '수동 해금' — to give back what a learner lost):
 * `unlockedThrough` goes UP to `topic`, only to a topic the course index lists, and never down (the owner's reset is
 * the way back to TOPIC 1). An open topic that is already complete opens the next one, as always. Returns whether
 * the record changed.
 */
export function raisePassoffUnlock(
  record: PassoffProgressRecord,
  topic: number,
  topics: readonly PassoffTopic[],
  now: number,
  rule: PassoffUnlockRule = PASSOFF_UNLOCK_RULE,
): boolean {
  if (!Number.isInteger(topic) || !topics.some((t) => t.topic === topic)) return false;
  const before = clampPassoffTopic(record.unlockedThrough);
  if (topic <= before) return false;
  record.unlockedThrough = topic;
  recalculatePassoffUnlock(record, topics, rule);
  record.updatedAt = now;
  return true;
}

export interface PassoffApplyOptions {
  /** the server's clock */
  now: number;
  /** a LIFE pass: every topic is open, so a record anywhere in the course is a real one (STUDENT's BUG-030) */
  everyTopicOpen?: boolean;
  rule?: PassoffUnlockRule;
}

export interface PassoffApplyResult {
  /** the record changed and needs writing */
  changed: boolean;
  /** lesson ids, and "map:<topic>" for a map refill */
  accepted: string[];
  refused: { what: string; why: "unknown" | "locked" | "not-a-completion" }[];
}

/**
 * Applies what a browser sent, in place. Taken only for a known lesson or topic that was open when the request came
 * in — the open topics do not widen while the list is applied, so a list of every lesson id opens one topic at most
 * (RE-010). A lesson already finished keeps its first date; the date is the server's (a browser's clock is only
 * the ordering hint `updatedAt`, capped at now + 60 s).
 */
export function applyPassoffUpdates(
  record: PassoffProgressRecord,
  updates: readonly PassoffUpdate[],
  topics: readonly PassoffTopic[],
  { now, everyTopicOpen = false, rule = PASSOFF_UNLOCK_RULE }: PassoffApplyOptions,
): PassoffApplyResult {
  const before = JSON.stringify([record.lessons, record.mapRefills, record.unlockedThrough]);
  const ceiling = everyTopicOpen ? Number.POSITIVE_INFINITY : judgePassoffTopics(record, topics, rule).unlockedThrough;
  const topicOfLesson = new Map<string, number>();
  for (const t of topics) for (const id of t.lessonIds) topicOfLesson.set(id, t.topic);
  const knownTopics = new Set(topics.map((t) => t.topic));
  const accepted: string[] = [];
  const refused: PassoffApplyResult["refused"] = [];
  const at = new Date(now).toISOString();
  const day = learningDay(now);

  for (const update of updates.slice(0, MAX_UPDATES)) {
    if (typeof update.lessonId === "string") {
      const lessonId = update.lessonId;
      const topic = topicOfLesson.get(lessonId);
      if (topic === undefined) refused.push({ what: lessonId, why: "unknown" });
      else if (update.completed !== true) refused.push({ what: lessonId, why: "not-a-completion" });
      else if (topic > ceiling) refused.push({ what: lessonId, why: "locked" });
      else {
        if (record.lessons[lessonId]?.completed !== true) {
          const sent = Number(update.clientUpdatedAt);
          record.lessons[lessonId] = {
            completed: true,
            updatedAt: Math.min(now + CLOCK_SLACK_MS, Math.max(0, Number.isFinite(sent) ? sent : now)),
            at: record.lessons[lessonId]?.at ?? at,
            day: record.lessons[lessonId]?.day ?? day,
          };
        }
        accepted.push(lessonId);
      }
    }
    if (update.mapRefillTopic !== undefined) {
      const topic = Number(update.mapRefillTopic);
      const what = `map:${update.mapRefillTopic}`;
      if (!Number.isInteger(topic) || !knownTopics.has(topic)) refused.push({ what, why: "unknown" });
      else if (topic > ceiling) refused.push({ what, why: "locked" });
      else {
        record.mapRefills[String(topic)] ??= { at, day };
        accepted.push(`map:${topic}`);
      }
    }
  }

  recalculatePassoffUnlock(record, topics, rule);
  const changed = JSON.stringify([record.lessons, record.mapRefills, record.unlockedThrough]) !== before;
  if (changed) record.updatedAt = now;
  return { changed, accepted, refused };
}

/** May this learner see this lesson? A lesson the course index does not list is never open. */
export function isPassoffLessonOpen(
  lessonId: string,
  record: PassoffProgressRecord,
  topics: readonly PassoffTopic[],
  { everyTopicOpen = false, rule = PASSOFF_UNLOCK_RULE }: { everyTopicOpen?: boolean; rule?: PassoffUnlockRule } = {},
): boolean {
  const topic = passoffTopicOf(lessonId);
  if (topic === null || !topics.some((t) => t.topic === topic && t.lessonIds.includes(lessonId))) return false;
  if (everyTopicOpen) return true;
  return topic <= Math.max(clampPassoffTopic(record.unlockedThrough), judgePassoffTopics(record, topics, rule).unlockedThrough);
}

/** The record as a browser gets it — judged now, with no more than it needs. */
export function passoffSnapshot(
  record: PassoffProgressRecord,
  topics: readonly PassoffTopic[],
  { everyTopicOpen = false, rule = PASSOFF_UNLOCK_RULE }: { everyTopicOpen?: boolean; rule?: PassoffUnlockRule } = {},
): PassoffProgressSnapshot {
  const judged = judgePassoffTopics(record, topics, rule);
  const unlockedThrough = Math.max(clampPassoffTopic(record.unlockedThrough), judged.unlockedThrough);
  return {
    version: 1,
    lessons: Object.fromEntries(
      Object.entries(record.lessons).map(([id, s]) => [id, { completed: s.completed, updatedAt: s.updatedAt, day: s.day }]),
    ),
    unlockedThrough,
    everyTopicOpen,
    requiredRatio: rule.ratio,
    mapRefillRequired: rule.requireMapRefill,
    updatedAt: record.updatedAt,
    // a LIFE pass: every topic open (the chain's own value stays in unlockedThrough)
    topics: judged.topics.map((t) => ({ ...t, unlocked: everyTopicOpen || t.topic <= unlockedThrough })),
  };
}

/**
 * "TOPIC 2를" · "TOPIC 3을" — a topic number with the particle after it, as the number is read in Korean (일 · 이 ·
 * 삼 …): 을 · 이 · 은 after a final consonant — a last digit of 1 3 6 7 8 or 0 (일 삼 육 칠 팔 · 십) — and 를 · 가 · 는
 * after 2 4 5 9 (이 사 오 구). The lock's words (설계 §5) put a particle right after the number.
 */
export function topicWithParticle(topic: number, particle: "을/를" | "이/가" | "은/는"): string {
  const [afterConsonant, afterVowel] = particle.split("/");
  const lastDigit = Math.abs(Math.trunc(topic)) % 10;
  return `TOPIC ${topic}${[1, 3, 6, 7, 8, 0].includes(lastDigit) ? afterConsonant : afterVowel}`;
}
