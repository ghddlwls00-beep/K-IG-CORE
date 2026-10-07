"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { passoffMapHref, topicWithParticle } from "@/lib/passoffUnlock";
import { useProgress } from "../ProgressProvider";
import { usePassoffProgress } from "../PassoffProgressProvider";
import { IconCheck, IconLock, IconX } from "../icons";
import { tone } from "./ui";

/**
 * A PASS-OFF GRAMMAR lesson in a topic this licence has not opened yet (설계 §5) — what
 * src/app/passoff-grammar/[lesson]/page.tsx renders instead of the lesson. The server decided; this only says why
 * and what opens it: the conditions of the topic the learner is on now, and that topic's lessons the server has not
 * counted yet — with a word for one this device finished but the server does not have (after the owner's reset, a
 * lost write, another code on this device — 코드 단계 C 점검 1): only finishing it again records it.
 *
 * "순차 학습 잠금" is the words STUDENT's lock uses — the audit tools know a locked page by them
 * (docs/qa-2026-09-18/scripts/lib/harness.cjs PAYWALL_RE). No `data-kig-paywall="license"`: that one makes
 * LicenseProvider reload the page after a licence check, which would not open this.
 *
 * A learner who finishes the topic's last lesson and presses '다음 강의' at once can arrive before the completion
 * reaches the server. So this sends what is still queued, and when the server's answer opens the topic it asks for
 * the page again (once) — the lesson then comes from the server's gate like any other. Only the server's own answer
 * counts for that (`confirmed`), never the copy kept on this device; the counts below follow it too.
 *
 * 2026-09-28 (merged with main — docs/디자인-규칙.md §6 · 공통 틀 2): the frame of the other lock screens — '← 목록' and the
 * title as the lesson page draws them, one card in the tokens, the conditions and lessons divided by a line instead of a
 * box inside the box. Every word above is kept (the lock checks read '순차 학습 잠금' · 'TOPIC N을 마치면 열려요').
 *
 * 단계 2-나 E2: the condition "구성도 다시 채우기" (on since the engine records it) links the topic's map page until it is done —
 * once the lesson conditions above it are met (E2 수정: the map is the topic's end, and the server takes it only then).
 */
export interface PassoffTopicLockProps {
  title: string;
  topic: number;
  previousTopic: number | null;
  current: {
    topic: number;
    label: string;
    /** in order — the last one is the topic's last lesson; `completed` as the server counted when it rendered */
    lessons: { id: string; title: string; completed: boolean }[];
    requiredCount: number;
    mapRefillRequired: boolean;
    mapRefilled: boolean;
    sectionIndex: number;
  } | null;
}

const COURSE = "passoff-grammar";

export function PassoffTopicLock({ title, topic, previousTopic, current }: PassoffTopicLockProps) {
  const router = useRouter();
  const { flush, progress, confirmed } = usePassoffProgress();
  const { isCompleted } = useProgress();
  const refreshed = useRef(false);

  useEffect(() => {
    void flush();
  }, [flush]);

  const answer = confirmed ? progress : null;
  const opened = answer !== null && (answer.everyTopicOpen || answer.unlockedThrough >= topic);
  useEffect(() => {
    if (!opened || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [opened, router]);

  const listHref = current ? `/${COURSE}#section-${current.sectionIndex}` : `/${COURSE}`;
  // what the server counts now: its answer since this page opened, or what it rendered with
  const counted = (lesson: { id: string; completed: boolean }) =>
    answer ? answer.lessons[lesson.id]?.completed === true : lesson.completed;
  const lessons = current?.lessons ?? [];
  const completedCount = lessons.filter(counted).length;
  const last = lessons[lessons.length - 1] ?? null;
  const mapRefilled = answer && current ? Boolean(answer.topics.find((t) => t.topic === current.topic)?.mapRefilled) : Boolean(current?.mapRefilled);
  // the map is the topic's end: its link once the two conditions above are met (the server takes a map refill only then)
  const lessonsDone = current !== null && last !== null && completedCount >= current.requiredCount && counted(last);
  const notCounted = lessons.filter((lesson) => !counted(lesson));
  // finished on this device (its own record) but not counted by the server
  const finishedHereOnly = new Set(notCounted.filter((lesson) => isCompleted(COURSE, lesson.id)).map((lesson) => lesson.id));

  return (
    <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
      <nav aria-label="과정으로">
        <Link
          href={`/${COURSE}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        >
          <span aria-hidden>←</span>
          <span>PASS-OFF GRAMMAR 목록</span>
        </Link>
      </nav>
      <header className="mt-1 mb-4 sm:mb-6">
        <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">{title}</h1>
      </header>

      <section
        data-kig-paywall="progress"
        data-passoff-topic={topic}
        aria-labelledby="passoff-topic-lock"
        className="mt-2 flex flex-col gap-4 rounded-card border border-line bg-raised px-5 py-6 sm:px-8 sm:py-8"
      >
        <p className="flex items-center gap-2 text-caption font-semibold text-ink-soft">
          <IconLock size={16} className="shrink-0" />
          <span>순차 학습 잠금</span>
        </p>
        <h2 id="passoff-topic-lock" className="text-title-s font-bold text-ink">
          {previousTopic !== null
            ? `${topicWithParticle(previousTopic, "을/를")} 마치면 열려요`
            : `${topicWithParticle(topic, "은/는")} 아직 열리지 않았어요`}
        </h2>
        <p className="text-label leading-relaxed text-ink-soft">
          대주제는 차례로 열려요. 열린 대주제 안에서는 강의를 순서와 상관없이 고를 수 있어요.
        </p>

        {current ? (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-label text-ink-soft">지금 학습할 대주제</p>
            <p className="text-body font-semibold text-ink">{current.label}</p>
            <ul className="flex flex-col gap-1.5">
              <Condition ok={completedCount >= current.requiredCount}>
                강의 {current.requiredCount}개 이상 마치기 (지금 {completedCount}/{lessons.length})
              </Condition>
              {last ? (
                <Condition ok={counted(last)}>마지막 강의 &lsquo;{last.title}&rsquo; 학습 완료하기</Condition>
              ) : null}
              {current.mapRefillRequired ? (
                <Condition ok={mapRefilled}>
                  {mapRefilled ? (
                    <>대주제 끝 &lsquo;구성도 다시 채우기&rsquo; 한 번 하기</>
                  ) : !lessonsDone ? (
                    <>대주제 끝 &lsquo;구성도 다시 채우기&rsquo; 한 번 하기(위 강의를 마친 뒤)</>
                  ) : (
                    <Link
                      href={passoffMapHref(current.topic)}
                      className="inline-flex min-h-11 items-center text-ink underline underline-offset-4 hover:text-ink-soft"
                    >
                      대주제 끝 &lsquo;구성도 다시 채우기&rsquo; 한 번 하기
                    </Link>
                  )}
                </Condition>
              ) : null}
            </ul>

            {notCounted.length ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-line pt-3">
                <p className="text-label text-ink-soft">아직 기록되지 않은 강의</p>
                <ul className="flex flex-col">
                  {notCounted.map((lesson) => (
                    <li key={lesson.id} className="flex flex-wrap items-center gap-x-2">
                      <Link
                        href={`/${COURSE}/${lesson.id}`}
                        className="inline-flex min-h-11 min-w-11 items-center text-body text-ink underline underline-offset-4 hover:text-ink-soft"
                      >
                        {lesson.title}
                      </Link>
                      {finishedHereOnly.has(lesson.id) ? <span className="text-label text-ink-soft">이 기기에서 마침</span> : null}
                    </li>
                  ))}
                </ul>
                {finishedHereOnly.size ? (
                  <p className="text-label leading-relaxed text-ink-soft">
                    이 기기에서 마쳤는데 기록되지 않은 강의는 그 강의 Step 5 끝의 &lsquo;처음부터 다시 하기&rsquo;로 다시 마치면
                    기록돼요.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <Link
            href={listHref}
            className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-control bg-ink px-6 text-label font-semibold text-surface transition-opacity hover:opacity-90"
          >
            {current ? `대주제 ${current.topic} 강의 보기` : "목록으로"}
          </Link>
        </div>
      </section>
    </main>
  );
}

function Condition({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-body text-ink">
      <span className={`mt-0.5 ${ok ? tone.success : tone.danger}`}>{ok ? <IconCheck size={18} /> : <IconX size={18} />}</span>
      <span>
        <span className="sr-only">{ok ? "됨: " : "아직: "}</span>
        {children}
      </span>
    </li>
  );
}
