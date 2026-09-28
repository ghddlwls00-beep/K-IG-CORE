"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { learningDay } from "@/lib/learning/day";
import { planDay, wrongList } from "@/lib/learning/engine";
import { readCourseRecord, recordAttempt, reportMyAnswer } from "@/lib/learning/record";
import { reviewSummary, type ReviewSummary } from "@/lib/learning/review";
import { syncCourseRecord } from "@/lib/learning/sync";
import type { AnswerMode, CourseProfile, CourseRecord, Help, Plan, PlanItem } from "@/lib/learning/types";
import { IconCheck, IconX } from "../icons";
import { MyAnswerReport } from "./MyAnswerReport";

/**
 * Today's review — the engine's screen, for any course (공통-학습-엔진.md §8-3). The course gives its item cards
 * (`renderItem`) and a few words; this frame does the rest the same way for every course:
 *   - where the day's items come from: with a licence, this device's record goes up and today's plan comes back with the
 *     data of its items only (POST /api/learning/<course> — src/lib/learning/sync.ts); without one (the free trial), the
 *     plan is made here from this device's record and the item data the page was given;
 *   - the order: each lesson's next-day check (reason "next-day") is answered like a test — one answer an item, no result
 *     — and its results come together at the end, the missed items then once more with the course's help; every other
 *     item shows its result at once (the course's own card);
 *   - every answer goes to the engine's record function (recordAttempt, where "review") — the engine decides what it
 *     counts (the day's first answer on a due item); the record goes up again after each check and at the end;
 *   - the end: today's answered items · passed sentences · how many come tomorrow.
 * The frame follows docs/디자인-규칙.md §6 (the page's header and title are the page's): one progress line instead of
 * step tabs → the item → a bar at the bottom back to the course list.
 *
 * 단계 2-나 E2 — "내 답도 맞아요" (§8-6): beside a wrong result (the check's results here, a course card's own result) the
 * learner may say the answer is right. That report is the day's answer instead of the wrong one — neither right nor wrong
 * (the engine's "pending": nothing moves but the item comes back tomorrow, and the answer waits for the owner's judging). So a
 * wrong FIRST answer is held back here, not recorded at once, until the learner moves on (the next item · leaving the check's
 * results · the end · leaving the page): then it is recorded as it was, at the time it was given (an answer given at 03:58
 * and passed on at 04:01 stays on the day of the test). A report on an answer already recorded is still kept for judging,
 * and the day's wrong stands. The check's results go up to the server when the learner leaves them (not when they show),
 * so a report there reaches it the same way. The end screen links the wrong-answer list (`notesHref`).
 *
 * E2 수정 — a page that is only hidden (a glance at another app, the phone locked) is not left: the held answers stay held,
 * so a report pressed after coming back is still the day's answer, and only what was recorded goes up. A phone may end a
 * hidden page, so the held answers are also kept on the device ("kig-learning-held:<course>"); the next review or
 * wrong-answer list page of the course records what a page left behind, at its own time (commitLeftAnswers).
 */

export interface ReviewAnswer {
  /** the course grader's verdict; a partial answer is not right */
  correct: boolean;
  help: Help;
  mode: AnswerMode;
  /** the learner's answer (kept short with a wrong one — the wrong-answer list) */
  answer?: string;
  /** what the course wants back when it draws the results (its grader's verdict …) */
  detail?: unknown;
}

/** "내 답도 맞아요": the answer the learner says is right, and how it was given. */
export interface MyAnswer {
  answer: string;
  mode: AnswerMode;
}

export interface ReviewItemProps<T> {
  entry: PlanItem;
  data: T;
  /**
   * "test": the next-day check — one answer, recorded, and on to the next with no result.
   * "practice": the course's card as in its lesson — the result at once, its help after a miss.
   * "again": a check item missed in the test, once more with that help (the answers are the day's second — kept, not counted).
   * "notes": the wrong-answer list's "지금 다시 풀기" (WrongNotes) — the result at once; nothing moves in the schedule.
   */
  mode: "test" | "practice" | "again" | "notes";
  onAnswer: (answer: ReviewAnswer) => void;
  onNext: () => void;
  /** "내 답도 맞아요" on the card's own wrong result (not in "test", which shows none) — the frame records it */
  onReport: (report: MyAnswer) => void;
  /** that item was reported here */
  reported: boolean;
}

export interface ReviewResult<T> {
  entry: PlanItem;
  data: T;
  answer: ReviewAnswer;
}

export interface ReviewCourse<T> {
  profile: CourseProfile;
  /** the course list — the bottom bar's link and the end screen's button */
  listHref: string;
  /** the kinds the end screen's pass count counts (every kind when absent), and its words ('통과한 문항' when absent) */
  sentenceKinds?: readonly string[];
  passedLabel?: string;
  /** without a licence: the part of this device's record the review may use (the free trial's lessons) */
  deviceRecord?: (record: CourseRecord) => CourseRecord;
  renderItem: (props: ReviewItemProps<T>) => ReactNode;
  /** a small line above an item: where it comes from (the lesson's name) */
  itemSource?: (data: T) => string;
  /** an item in the next-day results (and in the wrong-answer list) */
  resultLine: (data: T) => ReactNode;
  /** the course's own lines above those results (PASS-OFF: 문법 정답 · 서술형 기준) */
  resultScore?: (results: ReviewResult<T>[]) => ReactNode;
  /** beside the progress line (a text size button …) */
  toolbar?: ReactNode;
  /** under the progress line while it is open (that button's settings) */
  toolbarPanel?: ReactNode;
  /** 단계 2-나 E2: the wrong-answer list's page (the end screen's link — none when absent) */
  notesHref?: string;
  /** the wrong-answer list's lesson names (WrongNotes — the lesson id when absent) */
  lessonTitle?: (lessonId: string) => string;
}

export type ReviewSource<T> = { kind: "server" } | { kind: "device"; items: Record<string, T> };

/** What a report says once sent, in the review (the item was due: it comes back tomorrow). */
export const REVIEW_REPORT_NOTE = "신고했어요. 확인한 뒤 맞는 답이면 정답에 더해요. 이 문항은 내일 다시 나와요.";

/** A wrong first answer not recorded yet, and when it was given. */
interface HeldAnswer {
  entry: PlanItem;
  given: ReviewAnswer;
  at: number;
}

/** + the course: the held answers of a review page, kept on the device while it is open (a phone may end a hidden page) */
const HELD_PREFIX = "kig-learning-held:";
const HELPS: readonly Help[] = ["none", "hint", "tiles", "reveal"];
const MODES: readonly AnswerMode[] = ["typed", "voice", "tap"];
/** a held answer older than this is not recorded any more (the day it belonged to is long past) */
const HELD_MAX_AGE_MS = 7 * 86_400_000;

function saveHeld(course: string, held: ReadonlyMap<string, HeldAnswer>): void {
  try {
    if (!held.size) {
      window.localStorage.removeItem(HELD_PREFIX + course);
      return;
    }
    const list = [...held.values()].map(({ entry, given, at }) => ({
      entry: { key: entry.key, lessonId: entry.lessonId, kind: entry.kind, seconds: entry.seconds, reason: entry.reason },
      given: { correct: given.correct, help: given.help, mode: given.mode, ...(given.answer ? { answer: given.answer.slice(0, 200) } : {}) },
      at,
    }));
    window.localStorage.setItem(HELD_PREFIX + course, JSON.stringify(list));
  } catch {
    // no storage: the held answers live in this page only
  }
}

/** The held answers a page left behind (it ended while hidden), taken off the device — well-formed ones only. */
function takeLeftHeld(course: string): HeldAnswer[] {
  try {
    const raw = window.localStorage.getItem(HELD_PREFIX + course);
    if (raw === null) return [];
    window.localStorage.removeItem(HELD_PREFIX + course);
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    const text = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 80;
    return list.filter(
      (h): h is HeldAnswer =>
        Boolean(h) &&
        typeof h.at === "number" &&
        h.at <= now + 60_000 &&
        now - h.at <= HELD_MAX_AGE_MS &&
        Boolean(h.entry) &&
        text(h.entry.key) &&
        text(h.entry.lessonId) &&
        typeof h.entry.kind === "string" &&
        Boolean(h.given) &&
        typeof h.given.correct === "boolean" &&
        HELPS.includes(h.given.help) &&
        MODES.includes(h.given.mode),
    );
  } catch {
    return [];
  }
}

/** The engine's input for a review answer (where "review" — the engine decides what it counts). */
function reviewInput(entry: PlanItem, given: Pick<ReviewAnswer, "correct" | "help" | "mode" | "answer">) {
  return {
    lessonId: entry.lessonId,
    kind: entry.kind,
    correct: given.correct,
    help: given.help,
    mode: given.mode,
    where: "review" as const,
    ...(given.answer && !given.correct ? { answer: given.answer } : {}),
  };
}

/**
 * The held answers a review page left behind when it ended while hidden, recorded as they were at their own time. The review
 * and the wrong-answer list call this when they open, before they read the record. Returns how many were recorded.
 */
export function commitLeftAnswers(profile: CourseProfile): number {
  const left = takeLeftHeld(profile.course);
  for (const h of left) recordAttempt(profile, h.entry.key, reviewInput(h.entry, h.given), h.at);
  return left.length;
}

interface Entry<T> {
  entry: PlanItem;
  data: T;
}

interface Segment<T> {
  kind: "test" | "practice";
  entries: Entry<T>[];
}

type Step =
  | { at: "loading" }
  | { at: "error"; status: number | "offline" }
  | { at: "items"; segment: number; index: number }
  | { at: "results"; segment: number }
  /** `keys`: the check's items missed and not reported, as they were when the results were left */
  | { at: "again"; segment: number; index: number; keys: string[] }
  | { at: "done" };

/** Each lesson's next-day check is one test (the engine brings a lesson's check whole); everything else after them. */
function segmentsOf<T>(plan: Plan, items: Record<string, T>): Segment<T>[] {
  const withData = plan.items.filter((entry) => items[entry.key] !== undefined).map((entry) => ({ entry, data: items[entry.key] }));
  const tests = new Map<string, Entry<T>[]>();
  const practice: Entry<T>[] = [];
  for (const e of withData) {
    if (e.entry.reason !== "next-day") {
      practice.push(e);
      continue;
    }
    const list = tests.get(e.entry.lessonId) ?? [];
    list.push(e);
    tests.set(e.entry.lessonId, list);
  }
  return [
    ...[...tests.values()].map((entries) => ({ kind: "test" as const, entries })),
    ...(practice.length ? [{ kind: "practice" as const, entries: practice }] : []),
  ];
}

const STEP_LABEL = { test: "다음 날 확인", practice: "복습", again: "다시 풀기" } as const;

export function ReviewSession<T>({ course, source }: { course: ReviewCourse<T>; source: ReviewSource<T> }) {
  const { profile } = course;
  const [step, setStep] = useState<Step>({ at: "loading" });
  const [segments, setSegments] = useState<Segment<T>[]>([]);
  const [comeback, setComeback] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  /** the first answer of each next-day item, by key — the results */
  const [results, setResults] = useState<Record<string, ReviewAnswer>>({});
  /** items reported here ("내 답도 맞아요") */
  const [reported, setReported] = useState<Record<string, true>>({});
  const topRef = useRef<HTMLDivElement | null>(null);
  /** answers not yet sent up (with a licence) */
  const unsent = useRef(false);
  /** wrong first answers not recorded yet — a report may still take their place (see above) — also kept on the device */
  const held = useRef(new Map<string, HeldAnswer>());
  /** items answered on this page (a later answer is the day's second — never held) */
  const answeredHere = useRef(new Set<string>());
  const server = source.kind === "server";
  const deviceItems = source.kind === "device" ? source.items : null;

  const sync = useCallback(async () => {
    if (!server) return;
    unsent.current = false;
    const result = await syncCourseRecord(profile.course);
    if (!result.ok) unsent.current = true;
  }, [profile.course, server]);

  /** one answer to the engine, at the time it was given */
  const put = useCallback(
    (entry: PlanItem, given: ReviewAnswer, at: number = Date.now()) => {
      recordAttempt(profile, entry.key, reviewInput(entry, given), at);
      unsent.current = true;
    },
    [profile],
  );

  /** the held wrong answers (or one item's) recorded as they were — the learner moved on */
  const commit = useCallback(
    (key?: string) => {
      let changed = false;
      for (const k of key === undefined ? [...held.current.keys()] : [key]) {
        const h = held.current.get(k);
        if (!h) continue;
        held.current.delete(k);
        put(h.entry, h.given, h.at);
        changed = true;
      }
      if (changed) saveHeld(profile.course, held.current);
    },
    [profile.course, put],
  );

  /** The end: the held answers are recorded, the record goes up once more, then the numbers — from this device's copy. */
  const finish = useCallback(async () => {
    commit();
    setStep({ at: "done" });
    if (server && unsent.current) await sync();
    const record = readCourseRecord(profile.course);
    const counted = course.sentenceKinds ? (kind: string) => course.sentenceKinds!.includes(kind) : undefined;
    const today = learningDay(Date.now());
    const scope = course.deviceRecord && !server ? course.deviceRecord(record) : record;
    setSummary(reviewSummary(scope, today, profile, counted));
    setWrongCount(wrongList(scope).reduce((sum, lesson) => sum + lesson.items.length, 0));
  }, [commit, course, profile, server, sync]);

  // today's items: from the server with a licence, from this device's record without one — once, when the page opens
  const load = useCallback(async () => {
    let plan: Plan;
    let items: Record<string, T>;
    if (server) {
      const result = await syncCourseRecord<T>(profile.course);
      if (!result.ok) {
        setStep({ at: "error", status: result.status });
        return;
      }
      plan = result.answer.plan;
      items = result.answer.items;
    } else {
      const record = readCourseRecord(profile.course);
      plan = planDay(course.deviceRecord ? course.deviceRecord(record) : record, learningDay(Date.now()), profile);
      items = deviceItems ?? {};
    }
    const list = segmentsOf(plan, items);
    setSegments(list);
    setComeback(plan.comeback);
    if (list.length) setStep({ at: "items", segment: 0, index: 0 });
    else void finish();
  }, [course, deviceItems, finish, profile, server]);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // answers an earlier page held when it ended while hidden: recorded first, so the plan and the record include them
    if (commitLeftAnswers(profile)) unsent.current = true;
    void load();
  }, [load, profile]);

  // the page hidden (another app, the phone locked) is not left: the held answers stay held — a report pressed after coming
  // back is still the day's answer — and only what was recorded goes up
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (server && unsent.current) void sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [server, sync]);
  // the page really left (closed, reloaded, another site): the held answers are recorded and what was answered goes up
  useEffect(() => {
    const onLeave = () => {
      commit();
      if (server && unsent.current) void sync();
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [commit, server, sync]);
  // …and going to another page of the site (the list, a lesson): the same, once
  const leaving = useRef({ commit, sync, server });
  useEffect(() => {
    leaving.current = { commit, sync, server };
  }, [commit, server, sync]);
  useEffect(
    () => () => {
      leaving.current.commit();
      if (leaving.current.server && unsent.current) void leaving.current.sync();
    },
    [],
  );

  // a new item or screen starts at the top of the review, as a new step does in a lesson
  useEffect(() => {
    const top = topRef.current;
    if (!top || step.at === "loading") return;
    if (top.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 72) });
  }, [step]);

  const answer = useCallback(
    (entry: PlanItem, test: boolean, given: ReviewAnswer) => {
      if (test) setResults((prev) => (prev[entry.key] ? prev : { ...prev, [entry.key]: given }));
      const first = !answeredHere.current.has(entry.key);
      answeredHere.current.add(entry.key);
      if (first && !given.correct) {
        held.current.set(entry.key, { entry, given, at: Date.now() });
        saveHeld(profile.course, held.current);
        return;
      }
      // a second answer: the first one (held) goes in before it — the engine then keeps this one as the day's retry
      commit(entry.key);
      put(entry, given);
    },
    [commit, profile.course, put],
  );

  const report = useCallback(
    (entry: PlanItem, mine: MyAnswer) => {
      const h = held.current.get(entry.key);
      if (h) {
        held.current.delete(entry.key);
        saveHeld(profile.course, held.current);
      }
      // in place of a held answer: the day it was given
      reportMyAnswer(
        profile,
        entry.key,
        {
          lessonId: entry.lessonId,
          kind: entry.kind,
          help: h ? h.given.help : "none",
          mode: h ? h.given.mode : mine.mode,
          where: "review",
          answer: mine.answer || h?.given.answer || "",
        },
        h ? h.at : Date.now(),
      );
      unsent.current = true;
      setReported((prev) => ({ ...prev, [entry.key]: true }));
    },
    [profile],
  );

  const missedOf = (segment: Segment<T>) =>
    segment.entries.filter((e) => results[e.entry.key] && !results[e.entry.key].correct && !reported[e.entry.key]);

  function afterSegment(segment: number) {
    if (segment + 1 < segments.length) setStep({ at: "items", segment: segment + 1, index: 0 });
    else void finish();
  }

  /** leaving a check's results: its held answers are recorded (the reported ones are reports now) and go up */
  function leaveResults(segment: number, missed: string[]) {
    commit();
    void sync();
    if (missed.length) setStep({ at: "again", segment, index: 0, keys: missed });
    else afterSegment(segment);
  }

  /** the items of "다시 풀기", fixed when it began (a report during it does not move the others) */
  const againOf = (segment: Segment<T>, keys: string[]) => segment.entries.filter((e) => keys.includes(e.entry.key));

  function next() {
    if (step.at === "items") {
      const segment = segments[step.segment];
      const current = segment.entries[step.index];
      // a test's wrong answers wait for its results — the learner may report one there
      if (segment.kind !== "test" && current) commit(current.entry.key);
      if (step.index + 1 < segment.entries.length) setStep({ ...step, index: step.index + 1 });
      else if (segment.kind === "test") setStep({ at: "results", segment: step.segment });
      else afterSegment(step.segment);
    } else if (step.at === "again") {
      const list = againOf(segments[step.segment], step.keys);
      const current = list[step.index];
      if (current) commit(current.entry.key);
      if (step.index + 1 < list.length) setStep({ ...step, index: step.index + 1 });
      else afterSegment(step.segment);
    }
  }

  const total = segments.reduce((sum, s) => sum + s.entries.length, 0);
  const passed = (segment: number) => segments.slice(0, segment).reduce((sum, s) => sum + s.entries.length, 0);

  let body: ReactNode = null;
  if (step.at === "loading") {
    body = <p className="text-body text-ink-soft" role="status">오늘 복습을 준비하고 있어요…</p>;
  } else if (step.at === "error") {
    body = (
      <div className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4" role="alert">
        <p className="text-body text-ink">
          {step.status === 401
            ? "이용권을 다시 확인해야 해요. 이용권을 등록한 뒤 다시 열어 주세요."
            : step.status === "offline"
              ? "인터넷에 연결되지 않아 오늘 복습을 불러오지 못했어요."
              : "오늘 복습을 불러오지 못했어요. 잠시 뒤 다시 해 주세요."}
        </p>
        <div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
          >
            다시 불러오기
          </button>
        </div>
      </div>
    );
  } else if (step.at === "items" || step.at === "again") {
    const segment = segments[step.segment];
    const again = step.at === "again";
    const list = step.at === "again" ? againOf(segment, step.keys) : segment.entries;
    const current = list[step.index];
    const mode = again ? "again" : segment.kind;
    const shown = again ? step.index + 1 : passed(step.segment) + step.index + 1;
    const of = again ? list.length : total;
    body = current ? (
      <div className="flex flex-col gap-3">
        <Progress label={STEP_LABEL[mode]} at={shown} of={of} toolbar={course.toolbar} />
        {course.toolbarPanel}
        {comeback && !again && step.segment === 0 && step.index === 0 ? (
          <p className="text-label text-ink-soft">오랜만이에요. 오늘은 복습 10개부터 해요.</p>
        ) : null}
        {mode === "test" && step.index === 0 ? (
          <p className="text-label text-ink-soft">어제 배운 레슨을 시험처럼 풀어요. 답을 하나씩 쓰면 결과는 끝에서 한꺼번에 보여 드려요.</p>
        ) : null}
        {course.itemSource ? <p className="text-caption text-ink-soft">{course.itemSource(current.data)}</p> : null}
        <div key={`${mode}:${current.entry.key}`} data-review-item={current.entry.key} data-review-mode={mode}>
          <CourseItem
            render={course.renderItem}
            entry={current.entry}
            data={current.data}
            mode={mode}
            onAnswer={(given) => answer(current.entry, mode === "test", given)}
            onNext={next}
            onReport={(mine) => report(current.entry, mine)}
            reported={Boolean(reported[current.entry.key])}
          />
        </div>
      </div>
    ) : null;
  } else if (step.at === "results") {
    const segment = segments[step.segment];
    const answered = segment.entries.filter((e) => results[e.entry.key]);
    const right = answered.filter((e) => results[e.entry.key].correct).length;
    const missed = missedOf(segment);
    body = (
      <section aria-labelledby="review-results" className="flex flex-col gap-4">
        <Progress label={STEP_LABEL.test} at={passed(step.segment) + segment.entries.length} of={total} toolbar={course.toolbar} />
        <div className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <h2 id="review-results" className="text-title-s font-bold text-ink">
            다음 날 확인 결과
          </h2>
          <p className="text-body text-ink" role="status">
            {answered.length}문항 중 <span className="font-semibold tabular-nums">{right}</span>개 맞았어요.
          </p>
          {course.resultScore
            ? course.resultScore(answered.map((e) => ({ entry: e.entry, data: e.data, answer: results[e.entry.key] })))
            : null}
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {answered.map((e) => {
              const given = results[e.entry.key];
              const ok = given.correct;
              return (
                <li key={e.entry.key} className="flex items-start gap-2 py-2" data-review-result={e.entry.key}>
                  <span className={`mt-1 shrink-0 ${ok ? "text-success" : "text-danger"}`}>{ok ? <IconCheck size={16} /> : <IconX size={16} />}</span>
                  <span className="sr-only">{ok ? "맞음: " : "틀림: "}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {course.resultLine(e.data)}
                    {!ok && given.answer ? (
                      <p className="text-label text-ink-soft">
                        내 답: <span lang="en" className="text-ink">{given.answer}</span>
                      </p>
                    ) : null}
                    {!ok ? (
                      <MyAnswerReport
                        reported={Boolean(reported[e.entry.key])}
                        note={REVIEW_REPORT_NOTE}
                        onReport={() => report(e.entry, { answer: given.answer ?? "", mode: given.mode })}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => leaveResults(step.segment, missed.map((e) => e.entry.key))}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
          >
            {missed.length ? `틀린 문항 다시 풀기 (${missed.length})` : step.segment + 1 < segments.length ? "이어서 복습" : "복습 마치기"}
          </button>
        </div>
      </section>
    );
  } else {
    body = (
      <section aria-labelledby="review-done" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
        <h2 id="review-done" className="flex items-center gap-2 text-title-s font-bold text-ink">
          {total ? (
            <>
              <span className="text-success">
                <IconCheck size={20} />
              </span>
              <span>오늘 복습을 마쳤어요</span>
            </>
          ) : (
            <span>오늘 복습 없음</span>
          )}
        </h2>
        {summary ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body" role="status">
            {total ? (
              <>
                <dt className="text-ink-soft">오늘 푼 문항</dt>
                <dd className="font-semibold tabular-nums text-ink">{summary.answeredToday}개</dd>
              </>
            ) : null}
            <dt className="text-ink-soft">{course.passedLabel ?? "통과한 문항"}</dt>
            <dd className="font-semibold tabular-nums text-ink">{summary.passed}개</dd>
            <dt className="text-ink-soft">내일 올 문항</dt>
            <dd className="font-semibold tabular-nums text-ink">{summary.tomorrow}개</dd>
          </dl>
        ) : (
          <p className="text-label text-ink-soft" role="status">
            기록을 저장하고 있어요…
          </p>
        )}
        {!total ? <p className="text-label leading-relaxed text-ink-soft">레슨을 마치면 다음 날부터 그 레슨의 문항이 복습으로 나와요.</p> : null}
        {course.notesHref && summary && wrongCount > 0 ? (
          <div>
            <Link
              href={course.notesHref}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
            >
              오답노트 보기
              <span className="font-normal tabular-nums text-ink-soft">{wrongCount}문항</span>
            </Link>
          </div>
        ) : null}
      </section>
    );
  }

  const done = step.at === "done";
  return (
    <div ref={topRef} className="flex flex-col" data-review-step={step.at}>
      {body}
      <nav aria-label="복습 마치기" className="mt-8 border-t border-line pt-6">
        <Link
          href={course.listHref}
          className={`flex min-h-12 w-full items-center justify-center rounded-control text-label font-semibold transition-colors ${
            done ? "bg-ink text-surface hover:opacity-90" : "border border-line bg-raised text-ink hover:bg-sunken"
          }`}
        >
          {done ? "과정 목록으로" : "그만하고 과정 목록으로"}
        </Link>
        {!done && step.at !== "loading" && step.at !== "error" ? (
          <p className="mt-2 text-center text-caption text-ink-soft">푼 문항은 저장돼요. 남은 문항은 다시 열면 이어서 나와요.</p>
        ) : null}
      </nav>
    </div>
  );
}

/**
 * A course's item card, drawn by the course's `renderItem` — as a component, so the frame's answer and report functions
 * reach the card as the event handlers they are (never called while the frame renders).
 */
export function CourseItem<T>({ render, ...props }: ReviewItemProps<T> & { render: (props: ReviewItemProps<T>) => ReactNode }) {
  return <>{render(props)}</>;
}

/** The one line in place of step tabs: what this part is, where the learner is, and a thin bar. */
export function Progress({
  label,
  at,
  of,
  toolbar,
  name = "오늘 복습 진행",
}: {
  label: string;
  at: number;
  of: number;
  toolbar?: ReactNode;
  /** the bar's name for a screen reader */
  name?: string;
}) {
  const percent = of > 0 ? Math.round((Math.min(at, of) / of) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-label text-ink">
        <span className="font-semibold">{label}</span> <span className="tabular-nums text-ink-soft">{at} / {of}</span>
      </p>
      <div
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={of}
        aria-valuenow={Math.min(at, of)}
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
      {toolbar}
    </div>
  );
}
