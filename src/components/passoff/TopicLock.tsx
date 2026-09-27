"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { topicWithParticle } from "@/lib/passoffUnlock";
import { useProgress } from "../ProgressProvider";
import { usePassoffProgress } from "../PassoffProgressProvider";
import { CheckIcon, CrossIcon, LockIcon, tone } from "./ui";

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
  const notCounted = lessons.filter((lesson) => !counted(lesson));
  // finished on this device (its own record) but not counted by the server
  const finishedHereOnly = new Set(notCounted.filter((lesson) => isCompleted(COURSE, lesson.id)).map((lesson) => lesson.id));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-12">
      <nav className="mb-6 sm:mb-8">
        <Link
          href={`/${COURSE}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-raised px-4 text-[14px] font-semibold text-ink-soft hover:text-ink"
        >
          <span aria-hidden>←</span>
          <span>PASS-OFF GRAMMAR 목록</span>
        </Link>
      </nav>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-[22px] font-bold leading-snug text-ink sm:text-[28px]">{title}</h1>
      </header>

      <section
        data-kig-paywall="progress"
        data-passoff-topic={topic}
        aria-labelledby="passoff-topic-lock"
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-8"
      >
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-soft">
          <LockIcon />
          <span>순차 학습 잠금</span>
        </p>
        <h2 id="passoff-topic-lock" className="text-[22px] font-bold leading-snug text-ink">
          {previousTopic !== null
            ? `${topicWithParticle(previousTopic, "을/를")} 마치면 열려요`
            : `${topicWithParticle(topic, "은/는")} 아직 열리지 않았어요`}
        </h2>
        <p className="text-[16px] leading-relaxed text-ink-soft">
          대주제는 차례로 열려요. 열린 대주제 안에서는 레슨을 순서와 상관없이 고를 수 있어요.
        </p>

        {current ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
            <p className="text-[14px] text-ink-soft">지금 학습할 대주제</p>
            <p className="text-[16px] font-semibold text-ink">{current.label}</p>
            <ul className="flex flex-col gap-1.5">
              <Condition ok={completedCount >= current.requiredCount}>
                레슨 {current.requiredCount}개 이상 마치기 (지금 {completedCount}/{lessons.length})
              </Condition>
              {last ? (
                <Condition ok={counted(last)}>마지막 레슨 &lsquo;{last.title}&rsquo; 5단계까지 마치기</Condition>
              ) : null}
              {current.mapRefillRequired ? (
                <Condition ok={mapRefilled}>대주제 끝 &lsquo;구성도 다시 채우기&rsquo; 한 번 하기</Condition>
              ) : null}
            </ul>

            {notCounted.length ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-line pt-3">
                <p className="text-[14px] text-ink-soft">아직 기록되지 않은 레슨</p>
                <ul className="flex flex-col">
                  {notCounted.map((lesson) => (
                    <li key={lesson.id} className="flex flex-wrap items-center gap-x-2">
                      <Link
                        href={`/${COURSE}/${lesson.id}`}
                        className="inline-flex min-h-11 min-w-11 items-center text-[16px] text-ink underline underline-offset-4 hover:text-ink-soft"
                      >
                        {lesson.title}
                      </Link>
                      {finishedHereOnly.has(lesson.id) ? <span className="text-[14px] text-ink-soft">이 기기에서 마침</span> : null}
                    </li>
                  ))}
                </ul>
                {finishedHereOnly.size ? (
                  <p className="text-[14px] leading-relaxed text-ink-soft">
                    이 기기에서 마쳤는데 기록되지 않은 레슨은 그 레슨 5단계 끝의 &lsquo;처음부터 다시 하기&rsquo;로 다시 마치면
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 text-[14px] font-semibold text-surface hover:opacity-90"
          >
            {current ? `TOPIC ${current.topic} 레슨 보기` : "목록으로"}
          </Link>
        </div>
      </section>
    </main>
  );
}

function Condition({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[16px] text-ink">
      <span className={`mt-0.5 ${ok ? tone.success : tone.danger}`}>{ok ? <CheckIcon /> : <CrossIcon />}</span>
      <span>
        <span className="sr-only">{ok ? "됨: " : "아직: "}</span>
        {children}
      </span>
    </li>
  );
}
