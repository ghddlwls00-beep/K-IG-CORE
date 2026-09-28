"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { daysBetween, learningDay } from "@/lib/learning/day";
import { planDay } from "@/lib/learning/engine";
import { readLearnerRecord, recordLearnerAttempt } from "@/lib/learning/record";
import { restrictRecord, reviewSummary, type ReviewSummary } from "@/lib/learning/review";
import { fetchReviewItems, syncLearnerRecord, type SyncOptions } from "@/lib/learning/sync";
import type { AnswerMode, CourseProfile, CourseRecord, Day, Help, Plan, PlanItem } from "@/lib/learning/types";
import { IconCheck, IconX } from "../icons";

/**
 * Today's review — the engine's screen, for any course (공통-학습-엔진.md §8-3 · §10). The course gives its item cards
 * (`renderItem`) and a few words; this frame does the rest the same way for every course:
 *   - where the day's items come from (ReviewSource): with a licence and the record kept on the server, this licence's
 *     record on the device goes up and today's plan comes back with the data of its items only (POST
 *     /api/learning/<course> — src/lib/learning/sync.ts); with no server, the plan is made here from this device's record
 *     over the items the page was given (the free trial) — or, for a course whose record stays on the device until D04,
 *     over the items it then asks the server for, those keys only (POST /api/learning/<course>/items);
 *   - the order: each lesson's next-day check (reason "next-day") is answered like a test — one answer an item, no result
 *     — and its results come together at the end, the missed items then once more, opening on the check's answer with the
 *     course's help (or passed over: they come back tomorrow anyway); every other item shows its result at once;
 *   - every answer goes to the engine's record function (where "review", into this learner's record) — the engine
 *     decides what it counts (the day's first answer on a due item). With a licence the answers go up after each check,
 *     every few answers, at the end, and when the page is hidden or left;
 *   - the end: today's answered items · passed sentences · how many come tomorrow.
 * The frame follows docs/디자인-규칙.md §6 (the page's header and title are the page's): one progress line instead of
 * step tabs → the item → a bar at the bottom back to the course list. A new item or screen takes the focus when the
 * learner moved there (a screen reader hears where it is; the button pressed has gone).
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
  /** "again": the check's answer that was wrong — the card opens on it, where the course's help starts */
  missed?: ReviewAnswer;
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
  /** what the course calls one of its lessons in the frame's words ('강의' when absent — PASS-OFF says '레슨') */
  unit?: string;
  /** the kinds the end screen's pass count counts (every kind when absent), and its words ('통과한 문항' when absent) */
  sentenceKinds?: readonly string[];
  passedLabel?: string;
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

export type ReviewSource<T> =
  /** a licence, and the course's record kept on the server — `learner` is the licence's id (the page reads the session) */
  | { kind: "server"; learner: string }
  /** no server: the device plans from the record kept with no licence, over these items (the page's — free text only) */
  | { kind: "device"; items: Record<string, T> }
  /** the record on the device (a course before D04), paid items: the device plans, the server gives those items' data */
  | { kind: "device-plan" };

interface Entry<T> {
  entry: PlanItem;
  data: T;
}

interface Segment<T> {
  kind: "test" | "practice";
  entries: Entry<T>[];
  /** a test: days since its lesson was finished (1 = yesterday), null when the record does not say */
  since: number | null;
}

type Step =
  | { at: "loading" }
  | { at: "error"; status: number | "offline" }
  | { at: "items"; segment: number; index: number }
  | { at: "results"; segment: number }
  | { at: "again"; segment: number; index: number }
  | { at: "done" };

/** answers sent up together with a licence (besides after each check, at the end, and when the page is hidden or left) */
const SYNC_EVERY = 5;

/** Each lesson's next-day check is one test (the engine brings a lesson's check whole); everything else after them. */
function segmentsOf<T>(plan: Plan, items: Record<string, T>, record: CourseRecord, today: Day): Segment<T>[] {
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
  const since = (entries: Entry<T>[]) => {
    const firstDay = record.items[entries[0].entry.key]?.firstDay;
    return firstDay ? daysBetween(firstDay, today) : null;
  };
  return [
    ...[...tests.values()].map((entries) => ({ kind: "test" as const, entries, since: since(entries) })),
    ...(practice.length ? [{ kind: "practice" as const, entries: practice, since: null }] : []),
  ];
}

const STEP_LABEL = { test: "다음 날 확인", practice: "복습", again: "다시 풀기" } as const;

export function ReviewSession<T>({ course, source }: { course: ReviewCourse<T>; source: ReviewSource<T> }) {
  const { profile } = course;
  const unit = course.unit ?? "강의";
  const [step, setStep] = useState<Step>({ at: "loading" });
  const [segments, setSegments] = useState<Segment<T>[]>([]);
  const [comeback, setComeback] = useState(false);
  /** the record has items at all (the empty screen's words) */
  const [studied, setStudied] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  /** the first answer of each next-day item, by key — the results */
  const [results, setResults] = useState<Record<string, ReviewAnswer>>({});
  const topRef = useRef<HTMLDivElement | null>(null);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  /** answers not yet sent up (with a licence) */
  const pending = useRef(0);
  /** the learner moved on (an answer, a button) — the new item or screen takes the focus */
  const moved = useRef(false);
  const learner = source.kind === "server" ? source.learner : null;
  const deviceItems = source.kind === "device" ? source.items : null;

  /** The record this review plans from and writes to — with no server, only items the page can draw can come. */
  const readRecord = useCallback(() => {
    const record = readLearnerRecord(profile.course, learner);
    return deviceItems ? restrictRecord(record, (key) => deviceItems[key] !== undefined, () => true) : record;
  }, [deviceItems, learner, profile.course]);

  /** With a licence: what was answered goes up (the plan comes back, without item data). */
  const sync = useCallback(
    async (options: SyncOptions = {}) => {
      if (!learner) return null;
      const count = pending.current;
      pending.current = 0;
      const result = await syncLearnerRecord<T>(profile.course, learner, { planOnly: true, ...options });
      if (!result.ok) pending.current += count;
      return result;
    },
    [learner, profile.course],
  );

  /** The end: the answers go up once more, then the numbers — tomorrow's by the server's count with a licence. */
  const finish = useCallback(
    async (known?: number) => {
      setStep({ at: "done" });
      let tomorrow = known;
      if (learner && (pending.current || tomorrow === undefined)) {
        const synced = await sync();
        if (synced && synced.ok) tomorrow = synced.answer.tomorrow;
      }
      const counted = course.sentenceKinds ? (kind: string) => course.sentenceKinds!.includes(kind) : undefined;
      const numbers = reviewSummary(readRecord(), learningDay(Date.now()), profile, counted);
      setSummary(tomorrow === undefined ? numbers : { ...numbers, tomorrow });
    },
    [course.sentenceKinds, learner, profile, readRecord, sync],
  );

  // today's items — once, when the page opens
  const load = useCallback(async () => {
    const today = learningDay(Date.now());
    let plan: Plan;
    let items: Record<string, T>;
    let record: CourseRecord;
    let tomorrow: number | undefined;
    if (learner) {
      const result = await syncLearnerRecord<T>(profile.course, learner);
      if (!result.ok) {
        setStep({ at: "error", status: result.status });
        return;
      }
      ({ plan, items, record, tomorrow } = result.answer);
    } else {
      record = readRecord();
      plan = planDay(record, today, profile);
      if (deviceItems) items = deviceItems;
      else {
        const fetched = await fetchReviewItems<T>(profile.course, plan.items.map((item) => item.key));
        if (!fetched.ok) {
          setStep({ at: "error", status: fetched.status });
          return;
        }
        items = fetched.items;
      }
    }
    const list = segmentsOf(plan, items, record, today);
    setSegments(list);
    setComeback(plan.comeback);
    setStudied(Object.keys(record.items).length > 0);
    if (list.length) setStep({ at: "items", segment: 0, index: 0 });
    else void finish(tomorrow);
  }, [deviceItems, finish, learner, profile, readRecord]);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  // hidden (another tab, the phone locked) or left (a link, the list): what was answered goes up — a request that
  // outlives the page (sync.ts `leaving`)
  useEffect(() => {
    if (!learner) return;
    const flush = () => {
      if (pending.current) void sync({ leaving: true });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [learner, sync]);

  // a new item or screen starts at the top of the review, as a new step does in a lesson
  useEffect(() => {
    const top = topRef.current;
    if (!top || step.at === "loading") return;
    if (top.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 72) });
  }, [step]);

  // …and takes the focus when the learner moved there (not when the page opens)
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (step.at === "items" || step.at === "again" ? itemRef.current : headingRef.current)?.focus({ preventScroll: true });
  }, [step]);

  const answer = useCallback(
    (entry: PlanItem, test: boolean, given: ReviewAnswer) => {
      recordLearnerAttempt(profile, learner, entry.key, {
        lessonId: entry.lessonId,
        kind: entry.kind,
        correct: given.correct,
        help: given.help,
        mode: given.mode,
        where: "review",
        ...(given.answer && !given.correct ? { answer: given.answer } : {}),
      });
      if (test) setResults((prev) => (prev[entry.key] ? prev : { ...prev, [entry.key]: given }));
      if (!learner) return;
      pending.current += 1;
      if (!test && pending.current >= SYNC_EVERY) void sync();
    },
    [learner, profile, sync],
  );

  const missedOf = (segment: Segment<T>) => segment.entries.filter((e) => results[e.entry.key] && !results[e.entry.key].correct);

  function afterSegment(segment: number) {
    if (segment + 1 < segments.length) setStep({ at: "items", segment: segment + 1, index: 0 });
    else void finish();
  }

  function next() {
    moved.current = true;
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
          <p className="text-label text-ink-soft">
            {segment.since === 1 ? "어제" : "지난번에"} 배운 {unit}의 문항이에요. 시험처럼 하나씩 답하면 결과는 끝에서 한꺼번에
            보여 드려요.
          </p>
        ) : null}
        {course.itemSource ? <p className="text-caption text-ink-soft">{course.itemSource(current.data)}</p> : null}
        <div
          key={`${mode}:${current.entry.key}`}
          ref={itemRef}
          tabIndex={-1}
          role="group"
          aria-label={`${STEP_LABEL[mode]} ${shown} / ${of}`}
          data-review-item={current.entry.key}
          data-review-mode={mode}
        >
          <ReviewItem
            render={course.renderItem}
            entry={current.entry}
            data={current.data}
            mode={mode}
            missed={again ? results[current.entry.key] : undefined}
            onAnswer={(given) => answer(current.entry, mode === "test", given)}
            onNext={next}
          />
        </div>
      </div>
    ) : null;
  } else if (step.at === "results") {
    const segment = segments[step.segment];
    const answered = segment.entries.filter((e) => results[e.entry.key]);
    const right = answered.filter((e) => results[e.entry.key].correct).length;
    const missed = missedOf(segment);
    const onward = step.segment + 1 < segments.length;
    body = (
      <section aria-labelledby="review-results" className="flex flex-col gap-4">
        <Progress label={STEP_LABEL.test} at={passed(step.segment) + segment.entries.length} of={total} toolbar={course.toolbar} />
        <div className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <h2 id="review-results" ref={headingRef} tabIndex={-1} className="text-title-s font-bold text-ink">
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
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {missed.length ? (
              <button
                type="button"
                onClick={() => {
                  moved.current = true;
                  afterSegment(step.segment);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
              >
                {onward ? "다시 풀지 않고 이어서" : "다시 풀지 않고 마치기"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                moved.current = true;
                if (missed.length) setStep({ at: "again", segment: step.segment, index: 0 });
                else afterSegment(step.segment);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
            >
              {missed.length ? `틀린 문항 다시 풀기 (${missed.length})` : onward ? "이어서 복습" : "복습 마치기"}
            </button>
          </div>
          {missed.length ? <p className="text-caption text-ink-soft">틀린 문항은 내일 다시 나와요.</p> : null}
        </div>
      </section>
    );
  } else {
    body = (
      <section aria-labelledby="review-done" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
        <h2 id="review-done" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-title-s font-bold text-ink">
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
          <div role="status">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
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
          </div>
        ) : (
          <p className="text-label text-ink-soft" role="status">
            기록을 저장하고 있어요…
          </p>
        )}
        {!total && !studied ? (
          <p className="text-label leading-relaxed text-ink-soft">마친 {unit}의 문항은 다음 날부터 복습으로 나와요.</p>
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
          <p className="mt-2 text-center text-caption text-ink-soft">푼 문항은 바로 저장돼요. 남은 문항은 다시 열면 이어서 나와요.</p>
        ) : null}
      </nav>
    </div>
  );
}

/**
 * The course's card, drawn by a component of its own: the answer handlers reach it as props and are called when the
 * learner answers, never while drawing.
 */
function ReviewItem<T>({ render, ...props }: ReviewItemProps<T> & { render: (props: ReviewItemProps<T>) => ReactNode }) {
  return <>{render(props)}</>;
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
