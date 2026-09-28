"use client";

/**
 * 2026-09-28 새 문제 — the comprehension questions of a LISTENING lesson (Step 1, under the whole-lesson player) and of a READING
 * passage (Step 4, after reading it again): one component, so a question works the same in both courses (src/lib/lessonQuestions.ts).
 *
 * A question is answered once: the first option pressed is the answer, the buttons lock, the right option is marked, and what
 * proves it comes up under it — `evidence` is the course's own (LISTENING: the lines to hear again, never their text before
 * dictation; READING: the sentences with their translation). '다시 풀기' clears the picks once every question is answered.
 * Nothing here plays a sound by itself.
 * The learning engine hears every pick (recordAttempt — kind 'question', inside the lesson, so it never changes a review
 * schedule). Whether a wrong question should come back on a later day is the common engine's decision (공통-학습-엔진.md §5),
 * so nothing is handed to markLessonDone yet.
 * data-lesson-questions · data-question · data-verdict · data-option · data-action="questions-again" are what the audit tools read.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { recordAttempt } from "@/lib/learning/record";
import type { CourseProfile } from "@/lib/learning/types";
import {
  OPTION_MARKS,
  QUESTION_KIND,
  emptyPicks,
  parsePicks,
  questionsStorageKey,
  serializePicks,
  type LessonQuestion,
  type QuestionPicks,
} from "@/lib/lessonQuestions";
import { IconCheck, IconRepeat, IconX } from "./icons";

interface LessonQuestionsProps {
  course: "ld" | "reading";
  /** the main lesson id — a "-1" page shares its main page's record */
  mainId: string;
  questions: LessonQuestion[];
  profile: CourseProfile;
  heading: string;
  intro: string;
  /** what proves the answer, shown once the question is answered */
  evidence: (question: LessonQuestion) => ReactNode;
}

const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken";

export function LessonQuestions({ course, mainId, questions, profile, heading, intro, evidence }: LessonQuestionsProps) {
  const storageKey = questionsStorageKey(course, mainId);
  const [record, setRecord] = useState<QuestionPicks>(emptyPicks);
  const recordRef = useRef<QuestionPicks>(record);
  // the key whose stored record has been read — nothing is written under a key before its own record is read
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    const loaded = parsePicks(raw, questions);
    recordRef.current = loaded;
    setRecord(loaded);
    setLoadedKey(storageKey);
  }, [storageKey, questions]);

  const commit = useCallback(
    (next: QuestionPicks) => {
      recordRef.current = next;
      setRecord(next);
      if (loadedKey !== storageKey) return;
      try {
        window.localStorage.setItem(storageKey, serializePicks(next));
      } catch {
        // storage unavailable: the questions work, nothing is remembered
      }
    },
    [loadedKey, storageKey],
  );

  const pick = (question: LessonQuestion, option: number) => {
    const current = recordRef.current;
    if (current.picks[question.id] !== undefined) return;
    const firstTry = current.first[question.id] === undefined;
    commit({
      picks: { ...current.picks, [question.id]: option },
      first: firstTry ? { ...current.first, [question.id]: option } : current.first,
    });
    try {
      recordAttempt(profile, question.id, {
        lessonId: mainId,
        kind: QUESTION_KIND,
        correct: option === question.answer,
        help: "none",
        mode: "tap",
        where: "lesson",
        firstTry,
        answer: question.options[option],
      });
    } catch {
      // storage unavailable: the question is answered; only the engine forgets
    }
  };

  const again = () => commit({ picks: {}, first: recordRef.current.first });

  const answered = questions.filter((q) => record.picks[q.id] !== undefined).length;
  const right = questions.filter((q) => record.picks[q.id] === q.answer).length;
  const allAnswered = answered === questions.length;

  return (
    <section
      data-lesson-questions={course}
      data-answered={answered}
      data-right={right}
      aria-label={heading}
      className="flex flex-col gap-4 rounded-card border border-line bg-raised px-4 py-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-body font-semibold text-ink">{heading}</h3>
          <p className="text-label tabular-nums text-ink-soft">
            {allAnswered ? `${questions.length}문제 중 ${right}개 맞힘` : `${answered} / ${questions.length}`}
          </p>
        </div>
        <p className="text-label text-ink-soft">{intro}</p>
      </div>
      <ol className="flex list-none flex-col gap-5">
        {questions.map((q, qi) => {
          const picked = record.picks[q.id];
          const done = picked !== undefined;
          const correct = done && picked === q.answer;
          return (
            <li key={q.id} data-question={q.id} data-verdict={done ? (correct ? "right" : "wrong") : undefined} className="flex flex-col gap-2">
              <p className="text-body font-semibold text-ink">
                <span className="tabular-nums">{qi + 1}.</span> {q.prompt}
              </p>
              <div role="group" aria-label={`${qi + 1}번 문제의 보기`} className="flex flex-col gap-2">
                {q.options.map((option, oi) => {
                  const isAnswer = done && oi === q.answer;
                  const isWrongPick = done && oi === picked && !correct;
                  return (
                    <button
                      key={oi}
                      type="button"
                      data-option={oi}
                      disabled={done}
                      onClick={() => pick(q, oi)}
                      className={
                        "flex min-h-11 w-full items-start gap-2 rounded-control border bg-surface px-3 py-2.5 text-left text-body transition-colors " +
                        (!done
                          ? "cursor-pointer border-line text-ink hover:bg-sunken"
                          : isAnswer
                            ? "border-success text-success"
                            : isWrongPick
                              ? "border-danger text-danger"
                              : "border-line text-ink-faint")
                      }
                    >
                      <span aria-hidden className="shrink-0">
                        {OPTION_MARKS[oi]}
                      </span>
                      <span className="min-w-0 flex-1">{option}</span>
                      {isAnswer ? (
                        <>
                          <IconCheck className="mt-1 shrink-0" />
                          <span className="sr-only">정답</span>
                        </>
                      ) : isWrongPick ? (
                        <>
                          <IconX className="mt-1 shrink-0" />
                          <span className="sr-only">고른 답</span>
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {done ? (
                <div data-question-result role="status" className="flex flex-col gap-2">
                  <p className={"text-label font-semibold " + (correct ? "text-success" : "text-danger")}>
                    {correct ? "맞았어요." : `정답은 ${OPTION_MARKS[q.answer]}번이에요.`}
                  </p>
                  {evidence(q)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {allAnswered ? (
        <button type="button" data-action="questions-again" onClick={again} className={`${quietButton} self-start`}>
          <IconRepeat />
          <span>다시 풀기</span>
        </button>
      ) : null}
    </section>
  );
}
