/**
 * The review screen's shared rules (공통-학습-엔진.md §8 — 단계 2-나) — pure, for the browser and the server alike, and
 * for no course in particular: a course says what its items are, this says what a record may keep.
 *
 * The server takes a device's record only through acceptDeviceRecord (src/app/api/learning/[course]/route.ts): items the
 * course has, in lessons this licence has open (the order lock), with the course's own lesson and kind, and no day after
 * the server's today. It answers with the merged record, the plan of the day by ITS clock, and the data of that plan's
 * items only (LearningSyncAnswer). Checked by docs/pass-off-grammar/검사/check-learning-api.cjs.
 */
import { addDays, daysBetween } from "./day";
import { planDay, type wrongList } from "./engine";
import type { CourseProfile, CourseRecord, Day, Plan } from "./types";

/** What POST /api/learning/<course> answers. */
export interface LearningSyncAnswer<T = unknown> {
  /** the licence's record after the device's was merged into it */
  record: CourseRecord;
  /** today's review by the server's clock */
  plan: Plan;
  /** the data of the plan's items — nothing else — by item key */
  items: Record<string, T>;
  /** the licence's opaque id (serverLicense.ts licenseIdFor): the device keeps it with its record */
  owner: string;
  /** false: the device's record was last kept for another licence, so it was not merged into this one */
  taken: boolean;
}

/** A copy with only the kept items (their answers and reports go with them) and the kept lessons. */
export function restrictRecord(
  record: CourseRecord,
  keepItem: (key: string) => boolean,
  keepLesson: (lessonId: string) => boolean,
): CourseRecord {
  return {
    ...record,
    lessons: Object.fromEntries(Object.entries(record.lessons).filter(([id]) => keepLesson(id))),
    items: Object.fromEntries(Object.entries(record.items).filter(([key]) => keepItem(key))),
    log: record.log.filter((e) => keepItem(e.item)),
    reports: record.reports.filter((r) => keepItem(r.item)),
  };
}

export interface AcceptRules {
  /** today by the SERVER's clock */
  today: Day;
  /** the server's clock as an ISO string — for a lesson the device says it finished on a day still to come */
  nowIso: string;
  /** the item's lesson and kind in this course — null for a key the course does not have */
  item: (key: string) => { lessonId: string; kind: string } | null;
  /** a lesson of this course that this licence has open (the order lock) */
  lessonOpen: (lessonId: string) => boolean;
}

/**
 * What the server takes from a device's record (공통-학습-엔진.md §4 "서버가 판정한다"):
 *   - only items the course has, in lessons open to this licence — an item's lesson and kind are the course's, never
 *     the device's. A locked topic's item is not taken, so its data never goes back;
 *   - no day after today: a clock set ahead neither finishes a lesson nor answers on a day that has not come, so an item
 *     cannot pass on days still to come. Such a day becomes today (the answer is kept, once). A due day stays as it is —
 *     an item due later than it should be only comes later.
 */
export function acceptDeviceRecord(record: CourseRecord, rules: AcceptRules): CourseRecord {
  const { today } = rules;
  const open = (key: string) => {
    const known = rules.item(key);
    return known && rules.lessonOpen(known.lessonId) ? known : null;
  };
  const out = restrictRecord(record, (key) => open(key) !== null, rules.lessonOpen);
  const ahead = (day: Day | null) => day !== null && daysBetween(today, day) > 0;
  const notAhead = (day: Day) => (ahead(day) ? today : day);

  for (const [id, done] of Object.entries(out.lessons)) {
    if (ahead(done.day)) out.lessons[id] = { at: rules.nowIso, day: today };
  }
  for (const [key, state] of Object.entries(out.items)) {
    const known = open(key)!;
    out.items[key] = {
      ...state,
      lessonId: known.lessonId,
      kind: known.kind,
      firstDay: notAhead(state.firstDay),
      passDays: [...new Set(state.passDays.map(notAhead))].sort(),
      lastDay: state.lastDay === null ? null : notAhead(state.lastDay),
      reviewDay: state.reviewDay === null ? null : notAhead(state.reviewDay),
    };
  }
  out.log = out.log.map((e) => (ahead(e.day) ? { ...e, day: today } : e));
  out.reports = out.reports.map((r) => (ahead(r.day) ? { ...r, day: today } : r));
  if (ahead(out.lastStudyDay)) out.lastStudyDay = today;
  return out;
}

/** Key order aside — a record read back from storage lists its fields in its own order. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** The same record — the server writes only when a merge changed something. */
export function sameRecord(a: CourseRecord, b: CourseRecord): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

export interface ReviewSummary {
  /** items answered in review today (the day's first answer moved them on) */
  answeredToday: number;
  /** items that have passed (Pass-Off), of the kinds `counted` takes */
  passed: number;
  /** items tomorrow's review brings (within the day's amount) */
  tomorrow: number;
}

/** The end screen's numbers, from the record as it is now. */
export function reviewSummary(
  record: CourseRecord,
  today: Day,
  profile: CourseProfile,
  counted: (kind: string) => boolean = () => true,
): ReviewSummary {
  const states = Object.values(record.items);
  return {
    answeredToday: states.filter((s) => s.reviewDay === today).length,
    passed: states.filter((s) => s.stage === "passed" && counted(s.kind)).length,
    tomorrow: planDay(record, addDays(today, 1), profile).items.length,
  };
}

// ---------------------------------------------------------------------------
// 단계 2-나 E2 — the wrong-answer list and "내 답도 맞아요" (공통-학습-엔진.md §8-5 · 8-6)
// ---------------------------------------------------------------------------

/** One lesson of the wrong-answer list (engine.ts wrongList) — keys, kinds and the learner's own last wrong answer, no item text. */
export type WrongLesson = ReturnType<typeof wrongList>[number];

/**
 * POST /api/learning/<course> with `view: "notes"`: the answer also carries the wrong-answer list of the lessons this licence
 * has open, and `items` holds the data of ONE lesson's listed items (`lesson`) — none without it (the list itself says only
 * which items, the text comes lesson by lesson).
 */
export interface LearningNotesAnswer<T = unknown> extends LearningSyncAnswer<T> {
  notes: WrongLesson[];
}

/** The reports of one item, from every learner's record (the owner's list — /admin/license). */
export interface ReportGroup {
  item: string;
  /** reports of this item */
  count: number;
  /** records that hold one (a learner each — the records carry no name) */
  learners: number;
  pending: number;
  accepted: number;
  rejected: number;
  lastDay: Day;
  /** the answers given — the same words (case and spaces aside) once, most given first */
  answers: { answer: string; count: number; lastDay: Day }[];
}

const sameWords = (answer: string) => answer.trim().replace(/\s+/g, " ").toLowerCase();
const later = (a: Day, b: Day) => (daysBetween(a, b) > 0 ? b : a);

/** Reports grouped by item: the most reported first, then the most recent. */
export function reportGroups(records: readonly Pick<CourseRecord, "reports">[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup & { answerMap: Map<string, { answer: string; count: number; lastDay: Day }> }>();
  records.forEach((record) => {
    const seen = new Set<string>();
    for (const report of record.reports) {
      let group = groups.get(report.item);
      if (!group) {
        group = { item: report.item, count: 0, learners: 0, pending: 0, accepted: 0, rejected: 0, lastDay: report.day, answers: [], answerMap: new Map() };
        groups.set(report.item, group);
      }
      group.count += 1;
      group[report.status] += 1;
      group.lastDay = later(group.lastDay, report.day);
      if (!seen.has(report.item)) {
        seen.add(report.item);
        group.learners += 1;
      }
      const words = sameWords(report.answer);
      const answer = group.answerMap.get(words) ?? { answer: report.answer.trim().replace(/\s+/g, " "), count: 0, lastDay: report.day };
      answer.count += 1;
      answer.lastDay = later(answer.lastDay, report.day);
      group.answerMap.set(words, answer);
    }
  });
  return [...groups.values()]
    .map(({ answerMap, ...group }) => ({
      ...group,
      answers: [...answerMap.values()].sort((a, b) => b.count - a.count || daysBetween(a.lastDay, b.lastDay)),
    }))
    .sort((a, b) => b.count - a.count || daysBetween(a.lastDay, b.lastDay) || (a.item < b.item ? -1 : 1));
}
