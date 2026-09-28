"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { wrongList } from "@/lib/learning/engine";
import { recordPractice } from "@/lib/learning/practice";
import { readCourseRecord } from "@/lib/learning/record";
import type { LearningNotesAnswer, WrongLesson } from "@/lib/learning/review";
import { syncCourseRecordWith } from "@/lib/learning/sync";
import type { PlanItem } from "@/lib/learning/types";
import { IconCheck, IconChevronDown } from "../icons";
import { CourseItem, Progress, type MyAnswer, type ReviewAnswer, type ReviewCourse, type ReviewSource } from "./ReviewSession";

/**
 * The wrong-answer list — the engine's screen for any course (공통-학습-엔진.md §8-5 — 단계 2-나 E2), on the same course
 * description as today's review (ReviewCourse: its item cards, words and pages):
 *   - which items: every item answered wrong (or right only with help) at least once — the engine's wrongList — lesson by
 *     lesson. With a licence the list comes from the server (POST /api/learning/<course>, view "notes": the open lessons'
 *     items, named only) and a lesson's items come with their words when the learner opens that lesson (`lesson`) — the
 *     rest of the list never leaves the server with its words. Without one (the free trial) it is this device's record and
 *     the free lessons' item data the page was given;
 *   - "지금 다시 풀기": the lesson's listed items once more with the course's own card (mode "notes": the result at once,
 *     its help after a miss). The answers are practice (practice.ts recordPractice) — nothing moves in the review's
 *     schedule; a "내 답도 맞아요" made here is kept for judging and moves nothing either. With a licence they go up at the
 *     end of the run and when the page is left.
 * The frame follows docs/디자인-규칙.md §6 like ReviewSession: the page's header and title, then the list (or one progress
 * line and the item), and the bar back to the course list at the bottom.
 */

/** What a report says once sent here (practice: the item's schedule stays). */
export const NOTES_REPORT_NOTE = "신고했어요. 확인한 뒤 맞는 답이면 정답에 더해요.";

type Phase =
  | { at: "loading" }
  | { at: "error"; status: number | "offline" }
  | { at: "list" }
  | { at: "run"; lessonId: string; keys: string[]; index: number }
  | { at: "ran"; lessonId: string; keys: string[] };

const byNumber = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });

export function WrongNotes<T>({ course, source }: { course: ReviewCourse<T>; source: ReviewSource<T> }) {
  const { profile } = course;
  const server = source.kind === "server";
  const deviceItems = source.kind === "device" ? source.items : null;
  const [phase, setPhase] = useState<Phase>({ at: "loading" });
  const [notes, setNotes] = useState<WrongLesson[]>([]);
  const [data, setData] = useState<Record<string, T>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loadingLesson, setLoadingLesson] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  /** the first answer of each item in the run on screen — its result line */
  const [firsts, setFirsts] = useState<Record<string, boolean>>({});
  const [reported, setReported] = useState<Record<string, true>>({});
  const unsent = useRef(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  const sorted = (list: WrongLesson[]) =>
    [...list]
      .map((lesson) => ({ ...lesson, items: [...lesson.items].sort((a, b) => byNumber(a.key, b.key)) }))
      .sort((a, b) => byNumber(a.lessonId, b.lessonId));

  const sync = useCallback(async () => {
    if (!server || !unsent.current) return;
    unsent.current = false;
    // the record only — no item's words come back for a practice run
    const result = await syncCourseRecordWith(profile.course, { view: "record" });
    if (!result.ok) unsent.current = true;
  }, [profile.course, server]);

  // the list: the server's with a licence, this device's without — once, when the page opens
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      if (server) {
        const result = await syncCourseRecordWith<T, LearningNotesAnswer<T>>(profile.course, { view: "notes" });
        if (!result.ok) {
          setPhase({ at: "error", status: result.status });
          return;
        }
        setNotes(sorted(result.answer.notes ?? []));
      } else {
        const record = readCourseRecord(profile.course);
        setNotes(sorted(wrongList(course.deviceRecord ? course.deviceRecord(record) : record)));
        setData(deviceItems ?? {});
      }
      setPhase({ at: "list" });
    })();
    // once — the list is read when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // leaving the page: what was practised goes up (reports included)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [sync]);

  // a new screen starts at the top, as in the review
  useEffect(() => {
    const top = topRef.current;
    if (!top || phase.at === "loading") return;
    if (top.getBoundingClientRect().top < 0) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 72) });
  }, [phase]);

  /** a lesson opened: its items' words (with a licence, from the server — that lesson's listed items only) */
  async function toggle(lessonId: string) {
    const opening = !open[lessonId];
    setOpen((prev) => ({ ...prev, [lessonId]: opening }));
    if (!opening || !server) return;
    const lesson = notes.find((l) => l.lessonId === lessonId);
    if (!lesson || lesson.items.every((item) => data[item.key] !== undefined)) return;
    setLoadingLesson(lessonId);
    setLessonError(null);
    const result = await syncCourseRecordWith<T, LearningNotesAnswer<T>>(profile.course, { view: "notes", lesson: lessonId, withRecord: false });
    setLoadingLesson(null);
    if (!result.ok) {
      setLessonError(lessonId);
      return;
    }
    setData((prev) => ({ ...prev, ...result.answer.items }));
  }

  function start(lesson: WrongLesson) {
    const keys = lesson.items.map((item) => item.key).filter((key) => data[key] !== undefined);
    if (!keys.length) return;
    setFirsts({});
    setPhase({ at: "run", lessonId: lesson.lessonId, keys, index: 0 });
  }

  const entryOf = (lessonId: string, key: string): PlanItem => {
    const kind = notes.find((l) => l.lessonId === lessonId)?.items.find((i) => i.key === key)?.kind ?? "";
    return { key, lessonId, kind, seconds: profile.secondsPerKind[kind] ?? 20, reason: "again" };
  };

  function answer(entry: PlanItem, given: ReviewAnswer) {
    recordPractice(profile, entry.key, {
      lessonId: entry.lessonId,
      kind: entry.kind,
      correct: given.correct,
      help: given.help,
      mode: given.mode,
      where: "review",
      ...(given.answer && !given.correct ? { answer: given.answer } : {}),
    });
    unsent.current = true;
    setFirsts((prev) => (entry.key in prev ? prev : { ...prev, [entry.key]: given.correct }));
  }

  function report(entry: PlanItem, mine: MyAnswer) {
    recordPractice(profile, entry.key, {
      lessonId: entry.lessonId,
      kind: entry.kind,
      correct: false,
      help: "none",
      mode: mine.mode,
      where: "review",
      pending: true,
      answer: mine.answer,
    });
    unsent.current = true;
    setReported((prev) => ({ ...prev, [entry.key]: true }));
  }

  function next() {
    if (phase.at !== "run") return;
    if (phase.index + 1 < phase.keys.length) setPhase({ ...phase, index: phase.index + 1 });
    else {
      setPhase({ at: "ran", lessonId: phase.lessonId, keys: phase.keys });
      void sync();
    }
  }

  const titleOf = (lessonId: string) => course.lessonTitle?.(lessonId) ?? lessonId;
  const count = notes.reduce((sum, lesson) => sum + lesson.items.length, 0);

  let body: ReactNode = null;
  if (phase.at === "loading") {
    body = <p className="text-body text-ink-soft" role="status">오답노트를 불러오고 있어요…</p>;
  } else if (phase.at === "error") {
    body = (
      <div className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4" role="alert">
        <p className="text-body text-ink">
          {phase.status === 401
            ? "이용권을 다시 확인해야 해요. 이용권을 등록한 뒤 다시 열어 주세요."
            : phase.status === "offline"
              ? "인터넷에 연결되지 않아 오답노트를 불러오지 못했어요."
              : "오답노트를 불러오지 못했어요. 잠시 뒤 다시 해 주세요."}
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
  } else if (phase.at === "list") {
    body = !notes.length ? (
      <section className="flex flex-col gap-2 rounded-card border border-line bg-raised p-4" data-notes-empty>
        <h2 className="text-title-s font-bold text-ink">틀린 문항이 없어요</h2>
        <p className="text-label leading-relaxed text-ink-soft">복습에서 틀리거나 도움을 받아 맞힌 문항이 레슨별로 여기에 모여요.</p>
      </section>
    ) : (
      <div className="flex flex-col gap-3">
        <p className="text-label leading-relaxed text-ink-soft">
          틀린 적 있는 문항 <span className="tabular-nums">{count}</span>개를 레슨별로 모았어요. &lsquo;지금 다시 풀기&rsquo;는 연습이라 복습
          일정은 바뀌지 않아요.
        </p>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-raised">
          {notes.map((lesson) => {
            const isOpen = Boolean(open[lesson.lessonId]);
            const ready = lesson.items.some((item) => data[item.key] !== undefined);
            return (
              <li key={lesson.lessonId} data-notes-lesson={lesson.lessonId}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => void toggle(lesson.lessonId)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1 text-label font-semibold text-ink">{titleOf(lesson.lessonId)}</span>
                  <span className="shrink-0 text-caption tabular-nums text-ink-soft">{lesson.items.length}문항</span>
                  <IconChevronDown size={18} className={`shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
                    {loadingLesson === lesson.lessonId ? (
                      <p className="text-label text-ink-soft" role="status">문항을 불러오고 있어요…</p>
                    ) : lessonError === lesson.lessonId ? (
                      <p className="text-label text-ink-soft" role="alert">문항을 불러오지 못했어요. 다시 누르면 한 번 더 불러와요.</p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-line">
                        {lesson.items.map((item) => (
                          <li key={item.key} className="flex flex-col gap-1 py-2" data-notes-item={item.key}>
                            {data[item.key] !== undefined ? course.resultLine(data[item.key]) : <p className="text-label text-ink-soft">문항을 찾지 못했어요.</p>}
                            {item.lastWrong ? (
                              <p className="text-label text-ink-soft">
                                내 답: <span lang="en" className="text-ink">{item.lastWrong}</span>
                              </p>
                            ) : null}
                            <p className="text-caption tabular-nums text-ink-soft">
                              {item.lapses > 0 ? `틀림 ${item.lapses}번` : "도움 받아 맞힘"}
                              {item.lastCorrect === true ? " · 지난번엔 맞힘" : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {ready ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => start(lesson)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
                        >
                          지금 다시 풀기
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  } else if (phase.at === "run") {
    const key = phase.keys[phase.index];
    const entry = entryOf(phase.lessonId, key);
    body = (
      <div className="flex flex-col gap-3">
        <Progress label="다시 풀기" at={phase.index + 1} of={phase.keys.length} toolbar={course.toolbar} name="다시 풀기 진행" />
        {course.toolbarPanel}
        {phase.index === 0 ? <p className="text-label text-ink-soft">연습이라 여기서 맞히거나 틀려도 복습 일정은 그대로예요.</p> : null}
        {course.itemSource ? <p className="text-caption text-ink-soft">{course.itemSource(data[key])}</p> : null}
        <div key={`notes:${key}`} data-review-item={key} data-review-mode="notes">
          <CourseItem
            render={course.renderItem}
            entry={entry}
            data={data[key]}
            mode="notes"
            onAnswer={(given) => answer(entry, given)}
            onNext={next}
            onReport={(mine) => report(entry, mine)}
            reported={Boolean(reported[key])}
          />
        </div>
      </div>
    );
  } else {
    const right = phase.keys.filter((key) => firsts[key] === true).length;
    body = (
      <section aria-labelledby="notes-ran" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4" data-notes-ran>
        <h2 id="notes-ran" className="flex items-center gap-2 text-title-s font-bold text-ink">
          <span className="text-success">
            <IconCheck size={20} />
          </span>
          <span>다시 풀기를 마쳤어요</span>
        </h2>
        <p className="text-body text-ink" role="status">
          {titleOf(phase.lessonId)} {phase.keys.length}문항 중 <span className="font-semibold tabular-nums">{right}</span>개를 처음에 맞혔어요.
        </p>
        <p className="text-label text-ink-soft">연습이라 복습 일정은 그대로예요. 날을 두고 다시 나오는 문항은 오늘 복습에서 풀어요.</p>
        <div>
          <button
            type="button"
            onClick={() => setPhase({ at: "list" })}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
          >
            오답노트로
          </button>
        </div>
      </section>
    );
  }

  return (
    <div ref={topRef} className="flex flex-col" data-notes-step={phase.at}>
      {body}
      <nav aria-label="오답노트 마치기" className="mt-8 border-t border-line pt-6">
        <Link
          href={course.listHref}
          className="flex min-h-12 w-full items-center justify-center rounded-control border border-line bg-raised text-label font-semibold text-ink transition-colors hover:bg-sunken"
        >
          과정 목록으로
        </Link>
      </nav>
    </div>
  );
}
