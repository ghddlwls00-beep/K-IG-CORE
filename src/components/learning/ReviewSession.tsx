"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { learningDay } from "@/lib/learning/day";
import { planDay } from "@/lib/learning/engine";
import { readCourseRecord, recordAttempt } from "@/lib/learning/record";
import { reviewSummary, type ReviewSummary } from "@/lib/learning/review";
import { syncCourseRecord } from "@/lib/learning/sync";
import type { AnswerMode, CourseProfile, CourseRecord, Help, Plan, PlanItem } from "@/lib/learning/types";
import { IconCheck, IconX } from "../icons";

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

export interface ReviewItemProps<T> {
  entry: PlanItem;
  data: T;
  /**
   * "test": the next-day check — one answer, recorded, and on to the next with no result.
   * "practice": the course's card as in its lesson — the result at once, its help after a miss.
   * "again": a check item missed in the test, once more with that help (the answers are the day's second — kept, not counted).
   */
  mode: "test" | "practice" | "again";
  onAnswer: (answer: ReviewAnswer) => void;
  onNext: () => void;
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
  /** an item in the next-day results */
  resultLine: (data: T) => ReactNode;
  /** the course's own lines above those results (PASS-OFF: 문법 정답 · 서술형 기준) */
  resultScore?: (results: ReviewResult<T>[]) => ReactNode;
  /** beside the progress line (a text size button …) */
  toolbar?: ReactNode;
  /** under the progress line while it is open (that button's settings) */
  toolbarPanel?: ReactNode;
}

export type ReviewSource<T> = { kind: "server" } | { kind: "device"; items: Record<string, T> };

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
  | { at: "again"; segment: number; index: number }
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
  /** the first answer of each next-day item, by key — the results */
  const [results, setResults] = useState<Record<string, ReviewAnswer>>({});
  const topRef = useRef<HTMLDivElement | null>(null);
  /** answers not yet sent up (with a licence) */
  const unsent = useRef(false);
  const server = source.kind === "server";
  const deviceItems = source.kind === "device" ? source.items : null;

  const sync = useCallback(async () => {
    if (!server) return;
    unsent.current = false;
    const result = await syncCourseRecord(profile.course);
    if (!result.ok) unsent.current = true;
  }, [profile.course, server]);

  /** The end: the record goes up once more, then the numbers — from this device's copy, merged with the server's. */
  const finish = useCallback(async () => {
    setStep({ at: "done" });
    if (server && unsent.current) await sync();
    const record = readCourseRecord(profile.course);
    const counted = course.sentenceKinds ? (kind: string) => course.sentenceKinds!.includes(kind) : undefined;
    const today = learningDay(Date.now());
    setSummary(reviewSummary(course.deviceRecord && !server ? course.deviceRecord(record) : record, today, profile, counted));
  }, [course, profile, server, sync]);

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
    void load();
  }, [load]);

  // leaving the page (another tab, the phone locked): what was answered goes up
  useEffect(() => {
    if (!server) return;
    const onHide = () => {
      if (document.visibilityState === "hidden" && unsent.current) void sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [server, sync]);

  // a new item or screen starts at the top of the review, as a new step does in a lesson
  useEffect(() => {
    const top = topRef.current;
    if (!top || step.at === "loading") return;
    if (top.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 72) });
  }, [step]);

  const answer = useCallback(
    (entry: PlanItem, test: boolean, given: ReviewAnswer) => {
      recordAttempt(profile, entry.key, {
        lessonId: entry.lessonId,
        kind: entry.kind,
        correct: given.correct,
        help: given.help,
        mode: given.mode,
        where: "review",
        ...(given.answer && !given.correct ? { answer: given.answer } : {}),
      });
      unsent.current = true;
      if (test) setResults((prev) => (prev[entry.key] ? prev : { ...prev, [entry.key]: given }));
    },
    [profile],
  );

  const missedOf = (segment: Segment<T>) => segment.entries.filter((e) => results[e.entry.key] && !results[e.entry.key].correct);

  function afterSegment(segment: number) {
    if (segment + 1 < segments.length) setStep({ at: "items", segment: segment + 1, index: 0 });
    else void finish();
  }

  function next() {
    if (step.at === "items") {
      const segment = segments[step.segment];
      if (step.index + 1 < segment.entries.length) setStep({ ...step, index: step.index + 1 });
      else if (segment.kind === "test") {
        void sync();
        setStep({ at: "results", segment: step.segment });
      } else afterSegment(step.segment);
    } else if (step.at === "again") {
      const missed = missedOf(segments[step.segment]);
      if (step.index + 1 < missed.length) setStep({ ...step, index: step.index + 1 });
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
    const list = again ? missedOf(segment) : segment.entries;
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
          {course.renderItem({
            entry: current.entry,
            data: current.data,
            mode,
            onAnswer: (given) => answer(current.entry, mode === "test", given),
            onNext: next,
          })}
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
              const ok = results[e.entry.key].correct;
              return (
                <li key={e.entry.key} className="flex items-start gap-2 py-2">
                  <span className={`mt-1 shrink-0 ${ok ? "text-success" : "text-danger"}`}>{ok ? <IconCheck size={16} /> : <IconX size={16} />}</span>
                  <span className="sr-only">{ok ? "맞음: " : "틀림: "}</span>
                  <div className="min-w-0 flex-1">{course.resultLine(e.data)}</div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => (missed.length ? setStep({ at: "again", segment: step.segment, index: 0 }) : afterSegment(step.segment))}
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
          <p className="mt-2 text-center text-caption text-ink-soft">푼 문항은 바로 저장돼요. 남은 문항은 다시 열면 이어서 나와요.</p>
        ) : null}
      </nav>
    </div>
  );
}

/** The one line in place of step tabs: what this part is, where the learner is, and a thin bar. */
function Progress({ label, at, of, toolbar }: { label: string; at: number; of: number; toolbar?: ReactNode }) {
  const percent = of > 0 ? Math.round((Math.min(at, of) / of) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-label text-ink">
        <span className="font-semibold">{label}</span> <span className="tabular-nums text-ink-soft">{at} / {of}</span>
      </p>
      <div
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-label="오늘 복습 진행"
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
