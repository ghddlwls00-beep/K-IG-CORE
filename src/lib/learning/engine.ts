/**
 * The common learning engine — pure functions over a CourseRecord (no storage, no DOM, no course data).
 * Design: docs/pass-off-grammar/공통-학습-엔진.md v1. Checked by scripts/check-learning-engine.cjs
 * (unit cases, a 90-day simulation of three learners, and deliberate breaks that must fail).
 *
 * Schedule: a finished lesson's items come back the next day (the next-day check), then after 2 and
 * 4 more days, and every 4 days until they pass; a passed item comes back after 21, 60 and 120 days.
 * A wrong or helped answer sends the item back to the next-day check and clears its pass days.
 * Pass: right at the first try without help on 3 different days (2 for element items), the first
 * day never counting, one of them at least 6 days after the first day, and the last answer right.
 */
import { addDays, daysBetween, isDay, learningDay } from "./day";
import type {
  Attempt,
  AttemptEffect,
  AttemptInput,
  CourseProfile,
  CourseRecord,
  Day,
  ItemState,
  LessonDone,
  PassRule,
  Plan,
  PlanItem,
  Report,
} from "./types";

export const DEFAULT_RULE: PassRule = {
  days: 3,
  elementDays: 2,
  minGapFromFirstDay: 6,
  learning: [2, 4, 4],
  upkeep: [21, 60, 120],
};
export const DEFAULT_BUDGET_SECONDS = 600;
export const COMEBACK_AFTER_DAYS = 3;
export const COMEBACK_ITEMS = 10;
export const REVIEW_FIRST_OVER = 60;
export const LOG_LIMIT = 100;
export const REPORT_LIMIT = 500;
export const ITEM_LIMIT = 20_000;
const ANSWER_LIMIT = 200;
const DEFAULT_ITEM_SECONDS = 20;

export function ruleOf(profile: CourseProfile): PassRule {
  return { ...DEFAULT_RULE, ...(profile.rule || {}) };
}

export function emptyRecord(course: string): CourseRecord {
  return { v: 1, course, lessons: {}, items: {}, log: [], reports: [], lastStudyDay: null };
}

function studiedOn(record: CourseRecord, day: Day) {
  if (!record.lastStudyDay || daysBetween(record.lastStudyDay, day) > 0) record.lastStudyDay = day;
}

/**
 * A lesson is finished. Keeps its FIRST completion date and brings `entries` (the course adapter
 * decides which items) into review from the next day. Items already in the record stay as they are.
 */
export function applyLessonDone(
  record: CourseRecord,
  lessonId: string,
  atMs: number,
  entries: { key: string; kind: string }[],
): CourseRecord {
  const day = learningDay(atMs);
  if (!record.lessons[lessonId]?.day) record.lessons[lessonId] = { at: new Date(atMs).toISOString(), day };
  let count = Object.keys(record.items).length;
  for (const entry of entries) {
    if (record.items[entry.key]) continue;
    if (count >= ITEM_LIMIT) break;
    record.items[entry.key] = {
      lessonId,
      kind: entry.kind,
      stage: "learning",
      firstDay: day,
      dueDay: addDays(day, 1),
      step: 0,
      passDays: [],
      lastDay: null,
      lastCorrect: null,
      reviewDay: null,
      lapses: 0,
    };
    count += 1;
  }
  studiedOn(record, day);
  return record;
}

/** Completions kept from before dates were recorded (`true`): the lesson is done, its date unknown. */
export function importUndatedDone(record: CourseRecord, lessonIds: string[]): CourseRecord {
  for (const id of lessonIds) if (!record.lessons[id]) record.lessons[id] = { at: null, day: null };
  return record;
}

export function isPassed(state: ItemState, rule: PassRule, element: boolean): boolean {
  if (state.lastCorrect !== true) return false;
  const days = state.passDays.filter((d) => daysBetween(state.firstDay, d) > 0);
  if (days.length < (element ? rule.elementDays : rule.days)) return false;
  return days.some((d) => daysBetween(state.firstDay, d) >= rule.minGapFromFirstDay);
}

const intervalAt = (list: number[], index: number) => list[Math.min(Math.max(index, 0), list.length - 1)];

/**
 * One answer. Only the first answer of the day on an item that is due counts; a second answer the
 * same day is a retry, an answer before the due day is practice, and an answer inside a lesson never
 * counts (the model answer was just in front of the learner).
 */
export function applyAttempt(
  record: CourseRecord,
  itemKey: string,
  input: AttemptInput,
  atMs: number,
  profile: CourseProfile,
): AttemptEffect {
  const rule = ruleOf(profile);
  const day = learningDay(atMs);
  const state = record.items[itemKey];
  let effect: AttemptEffect;
  let firstTry = input.firstTry !== false;

  if (input.where === "lesson") effect = input.pending ? "pending" : "lesson";
  else if (!state) effect = "unknown";
  else {
    firstTry = state.reviewDay !== day;
    if (input.pending) effect = "pending";
    else if (!firstTry) effect = "retry";
    else if (daysBetween(day, state.dueDay) > 0) effect = "practice";
    else effect = input.correct && input.help === "none" ? "right" : "wrong";
  }

  if (state && input.where === "review") {
    const element = profile.elementKinds.includes(state.kind);
    if (effect === "right") {
      state.lastDay = day;
      state.lastCorrect = true;
      state.reviewDay = day;
      delete state.pending;
      if (daysBetween(state.firstDay, day) > 0 && !state.passDays.includes(day)) {
        state.passDays = [...state.passDays, day].sort();
      }
      if (state.stage === "passed") {
        state.step += 1;
        state.dueDay = addDays(day, intervalAt(rule.upkeep, state.step));
      } else if (isPassed(state, rule, element)) {
        state.stage = "passed";
        state.step = 0;
        state.dueDay = addDays(day, intervalAt(rule.upkeep, 0));
      } else {
        state.dueDay = addDays(day, intervalAt(rule.learning, state.step));
        state.step += 1;
      }
    } else if (effect === "wrong") {
      state.stage = "learning";
      state.step = 0;
      state.dueDay = addDays(day, 1);
      state.passDays = [];
      if (!input.correct) state.lapses += 1;
      state.lastDay = day;
      state.lastCorrect = false;
      state.reviewDay = day;
      delete state.pending;
      if (!input.correct && input.answer) state.lastWrong = input.answer.slice(0, ANSWER_LIMIT);
    } else if (effect === "pending") {
      state.pending = true;
      state.lastDay = day;
      state.reviewDay = day;
      if (daysBetween(day, state.dueDay) <= 0) state.dueDay = addDays(day, 1);
    }
  }

  if (input.pending) {
    record.reports.push({ item: itemKey, answer: (input.answer || "").slice(0, ANSWER_LIMIT), day, status: "pending" });
    if (record.reports.length > REPORT_LIMIT) record.reports.splice(0, record.reports.length - REPORT_LIMIT);
  }
  const answer = input.answer ? input.answer.slice(0, ANSWER_LIMIT) : undefined;
  record.log.push({ ...input, answer, item: itemKey, day, at: new Date(atMs).toISOString(), firstTry, effect });
  if (record.log.length > LOG_LIMIT) record.log.splice(0, record.log.length - LOG_LIMIT);
  studiedOn(record, day);
  return effect;
}

/** Interleave items of different lessons that fall on the same due day (mixing from the second review on). */
function mixLessons(entries: [string, ItemState][]): [string, ItemState][] {
  const byDay = new Map<Day, Map<string, [string, ItemState][]>>();
  for (const entry of entries) {
    const dayMap = byDay.get(entry[1].dueDay) || new Map<string, [string, ItemState][]>();
    const list = dayMap.get(entry[1].lessonId) || [];
    list.push(entry);
    dayMap.set(entry[1].lessonId, list);
    byDay.set(entry[1].dueDay, dayMap);
  }
  const out: [string, ItemState][] = [];
  for (const day of [...byDay.keys()].sort()) {
    const lists = [...byDay.get(day)!.values()];
    for (let i = 0; lists.some((list) => i < list.length); i += 1) {
      for (const list of lists) if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}

/**
 * What to review today, in order, within about `budgetSeconds`:
 * 1. next-day checks, a whole lesson at a time (the first one even if it alone runs over),
 * 2. items that were wrong or helped last time,
 * 3. the rest, oldest due first, lessons mixed.
 * After three days or more away, a short comeback set (the ten most overdue) comes instead.
 */
export function planDay(record: CourseRecord, today: Day, profile: CourseProfile): Plan {
  const budget = profile.budgetSeconds ?? DEFAULT_BUDGET_SECONDS;
  const seconds = (kind: string) => profile.secondsPerKind[kind] ?? DEFAULT_ITEM_SECONDS;
  const due = Object.entries(record.items).filter(([, s]) => daysBetween(s.dueDay, today) >= 0);
  const byDue = (a: [string, ItemState], b: [string, ItemState]) => daysBetween(b[1].dueDay, a[1].dueDay);
  const reasonOf = (s: ItemState): PlanItem["reason"] =>
    s.stage === "passed" ? "upkeep" : s.step === 0 ? (s.lastDay === null ? "next-day" : "again") : "review";
  const toItem = ([key, s]: [string, ItemState]): PlanItem => ({
    key,
    lessonId: s.lessonId,
    kind: s.kind,
    seconds: seconds(s.kind),
    reason: reasonOf(s),
  });
  const comeback =
    due.length > 0 && !!record.lastStudyDay && daysBetween(record.lastStudyDay, today) >= COMEBACK_AFTER_DAYS;

  let items: PlanItem[] = [];
  if (comeback) {
    items = [...due].sort(byDue).slice(0, COMEBACK_ITEMS).map(toItem);
  } else {
    const nextDay = due.filter(([, s]) => reasonOf(s) === "next-day");
    const groups = new Map<string, [string, ItemState][]>();
    for (const entry of [...nextDay].sort(byDue)) {
      const list = groups.get(entry[1].lessonId) || [];
      list.push(entry);
      groups.set(entry[1].lessonId, list);
    }
    let used = 0;
    for (const group of groups.values()) {
      const cost = group.reduce((sum, [, s]) => sum + seconds(s.kind), 0);
      if (items.length && used + cost > budget) break;
      items.push(...group.map(toItem));
      used += cost;
    }
    const again = due.filter(([, s]) => reasonOf(s) === "again").sort(byDue);
    const rest = mixLessons(due.filter(([, s]) => s.step > 0 || s.stage === "passed").sort(byDue));
    for (const entry of [...again, ...rest]) {
      const cost = seconds(entry[1].kind);
      if (items.length && used + cost > budget) break;
      items.push(toItem(entry));
      used += cost;
    }
  }
  const total = items.reduce((sum, item) => sum + item.seconds, 0);
  return {
    day: today,
    items,
    seconds: total,
    dueTotal: due.length,
    leftOver: due.length - items.length,
    comeback,
    reviewFirst: due.length > REVIEW_FIRST_OVER,
  };
}

/** The wrong-answer list: items wrong or helped at least once, by lesson. */
export function wrongList(record: CourseRecord) {
  const lessons = new Map<string, { key: string; kind: string; lapses: number; lastCorrect: boolean | null; lastWrong?: string }[]>();
  for (const [key, s] of Object.entries(record.items)) {
    if (!(s.lapses > 0 || s.lastCorrect === false)) continue;
    const list = lessons.get(s.lessonId) || [];
    list.push({ key, kind: s.kind, lapses: s.lapses, lastCorrect: s.lastCorrect, lastWrong: s.lastWrong });
    lessons.set(s.lessonId, list);
  }
  return [...lessons.entries()].map(([lessonId, items]) => ({ lessonId, items }));
}

/**
 * Two copies of one learner's record (two devices, or the device and the server). The later answer
 * wins; on the same day a wrong answer wins over a right one; pass days of the same day are joined.
 */
export function mergeRecords(a: CourseRecord, b: CourseRecord): CourseRecord {
  const out = emptyRecord(a.course);
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    const x = a.lessons[id];
    const y = b.lessons[id];
    out.lessons[id] = !x ? y : !y ? x : !x.day ? y : !y.day ? x : daysBetween(x.day, y.day) >= 0 ? x : y;
  }
  for (const key of new Set([...Object.keys(a.items), ...Object.keys(b.items)])) {
    const x = a.items[key];
    const y = b.items[key];
    if (!x || !y) {
      out.items[key] = { ...(x || y), passDays: [...(x || y).passDays] };
      continue;
    }
    const later = !x.lastDay ? (y.lastDay ? y : null) : !y.lastDay ? x : daysBetween(x.lastDay, y.lastDay) > 0 ? y : daysBetween(y.lastDay, x.lastDay) > 0 ? x : null;
    let pick: ItemState;
    if (later) pick = later;
    else if (x.lastCorrect === false && y.lastCorrect !== false) pick = x;
    else if (y.lastCorrect === false && x.lastCorrect !== false) pick = y;
    else pick = (x.stage === "passed") !== (y.stage === "passed") ? (x.stage === "passed" ? x : y) : x.step >= y.step ? x : y;
    const sameDay = !later && pick.lastCorrect !== false;
    out.items[key] = {
      ...pick,
      firstDay: daysBetween(x.firstDay, y.firstDay) >= 0 ? x.firstDay : y.firstDay,
      passDays: sameDay ? [...new Set([...x.passDays, ...y.passDays])].sort() : [...pick.passDays],
      lapses: Math.max(x.lapses, y.lapses),
    };
  }
  const reportKey = (r: Report) => `${r.item}|${r.day}|${r.answer}`;
  const reports = new Map<string, Report>();
  for (const r of [...a.reports, ...b.reports]) {
    const seen = reports.get(reportKey(r));
    if (!seen || seen.status === "pending") reports.set(reportKey(r), { ...r });
  }
  out.reports = [...reports.values()].slice(-REPORT_LIMIT);
  const logKey = (e: Attempt) => `${e.item}|${e.at}|${e.where}`;
  const log = new Map<string, Attempt>();
  for (const e of [...a.log, ...b.log]) log.set(logKey(e), e);
  out.log = [...log.values()].sort((p, q) => (p.at < q.at ? -1 : p.at > q.at ? 1 : 0)).slice(-LOG_LIMIT);
  out.lastStudyDay = !a.lastStudyDay ? b.lastStudyDay : !b.lastStudyDay ? a.lastStudyDay : daysBetween(a.lastStudyDay, b.lastStudyDay) > 0 ? b.lastStudyDay : a.lastStudyDay;
  return out;
}

const isKey = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 80;
const HELPS = new Set(["none", "hint", "tiles", "reveal"]);
const MODES = new Set(["typed", "voice", "tap"]);
const EFFECTS = new Set(["lesson", "right", "wrong", "retry", "practice", "pending", "unknown"]);

/** A record read from storage or sent by a client, checked field by field (unknown or broken parts dropped). */
export function sanitizeRecord(input: unknown, course: string): CourseRecord {
  const out = emptyRecord(course);
  if (!input || typeof input !== "object") return out;
  const value = input as Partial<CourseRecord>;
  if (value.v !== 1 || value.course !== course) return out;
  for (const [id, done] of Object.entries(value.lessons || {})) {
    if (!isKey(id) || !done || typeof done !== "object") continue;
    const d = done as LessonDone;
    out.lessons[id] = isDay(d.day) && typeof d.at === "string" ? { at: d.at, day: d.day } : { at: null, day: null };
  }
  for (const [key, raw] of Object.entries(value.items || {}).slice(0, ITEM_LIMIT)) {
    const s = raw as ItemState;
    if (!isKey(key) || !s || typeof s !== "object") continue;
    if (!isKey(s.lessonId) || typeof s.kind !== "string" || !isDay(s.firstDay) || !isDay(s.dueDay)) continue;
    if (s.stage !== "learning" && s.stage !== "passed") continue;
    out.items[key] = {
      lessonId: s.lessonId,
      kind: s.kind.slice(0, 40),
      stage: s.stage,
      firstDay: s.firstDay,
      dueDay: s.dueDay,
      step: Number.isInteger(s.step) && s.step >= 0 ? Math.min(s.step, 50) : 0,
      passDays: Array.isArray(s.passDays) ? [...new Set(s.passDays.filter(isDay))].sort().slice(-20) : [],
      lastDay: isDay(s.lastDay) ? s.lastDay : null,
      lastCorrect: typeof s.lastCorrect === "boolean" ? s.lastCorrect : null,
      reviewDay: isDay(s.reviewDay) ? s.reviewDay : null,
      lapses: Number.isInteger(s.lapses) && s.lapses >= 0 ? Math.min(s.lapses, 1000) : 0,
      ...(typeof s.lastWrong === "string" ? { lastWrong: s.lastWrong.slice(0, ANSWER_LIMIT) } : {}),
      ...(s.pending === true ? { pending: true } : {}),
    };
  }
  for (const e of (Array.isArray(value.log) ? value.log : []).slice(-LOG_LIMIT)) {
    if (!e || !isKey(e.item) || !isDay(e.day) || typeof e.at !== "string" || !EFFECTS.has(e.effect)) continue;
    if (!HELPS.has(e.help) || !MODES.has(e.mode) || (e.where !== "lesson" && e.where !== "review")) continue;
    out.log.push({
      item: e.item,
      lessonId: String(e.lessonId || "").slice(0, 80),
      kind: String(e.kind || "").slice(0, 40),
      correct: e.correct === true,
      help: e.help,
      mode: e.mode,
      where: e.where,
      firstTry: e.firstTry === true,
      ...(e.pending === true ? { pending: true } : {}),
      ...(typeof e.answer === "string" ? { answer: e.answer.slice(0, ANSWER_LIMIT) } : {}),
      day: e.day,
      at: e.at.slice(0, 40),
      effect: e.effect,
    });
  }
  for (const r of (Array.isArray(value.reports) ? value.reports : []).slice(-REPORT_LIMIT)) {
    if (!r || !isKey(r.item) || !isDay(r.day) || typeof r.answer !== "string") continue;
    if (r.status !== "pending" && r.status !== "accepted" && r.status !== "rejected") continue;
    out.reports.push({ item: r.item, answer: r.answer.slice(0, ANSWER_LIMIT), day: r.day, status: r.status });
  }
  out.lastStudyDay = isDay(value.lastStudyDay) ? value.lastStudyDay : null;
  return out;
}

export { learningDay };
