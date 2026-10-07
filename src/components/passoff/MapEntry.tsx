"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { passoffLessonsDone, passoffMapHref, topicWithParticle, type PassoffProgressSnapshot } from "@/lib/passoffUnlock";
import { usePassoffProgress } from "../PassoffProgressProvider";
import { IconCheck, IconChevronRight } from "../icons";

/**
 * Where the course list leads to "구성도 다시 채우기" (단계 2-나 E2 — 설계 §5, the topic's last condition), from the server's
 * answer (PassoffProgressProvider — with a licence only):
 *   - PassoffMapNext, in the list's progress box: the topic whose lessons are done and whose map is not — the one step left
 *     before the next topic opens (not for a LIFE pass: every topic is open);
 *   - PassoffMapRow, at the end of an open topic's lessons: the map of that topic once its lessons are done, '마침' once the
 *     map is done.
 *
 * E2 수정: the map is the topic's END — offered once the topic's lessons are done as the lock counts them (passoffLessonsDone;
 * the server takes a map refill only then). Before that the row says so without a link. 'TOPIC N이 열려요' only when there is
 * a next topic still locked; the last topic, or one whose next topic is already open (the owner opened it by hand), says
 * only that it ends the topic. PassoffMapWaiting is the map page's line while the lessons are not done.
 */
export function PassoffMapNext({ progress }: { progress: PassoffProgressSnapshot | null }) {
  if (!progress || progress.everyTopicOpen || !progress.mapRefillRequired) return null;
  const topic = progress.topics.find((t) => t.unlocked && !t.mapRefilled && passoffLessonsDone(t));
  if (!topic) return null;
  const next = progress.topics.find((t) => t.topic > topic.topic);
  const opens = Boolean(next && !next.unlocked);
  return (
    <div className="mt-3 flex flex-col gap-1.5" data-passoff-map-next={topic.topic}>
      <Link
        href={passoffMapHref(topic.topic)}
        className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-line-strong bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
      >
        <span>대주제 {topic.topic} 구성도 다시 채우기</span>
        <IconChevronRight size={18} className="shrink-0 text-ink-soft" />
      </Link>
      <p className="text-caption text-ink-soft">
        {opens && next ? `한 번 하면 ${topicWithParticle(next.topic, "이/가")} 열려요.` : "대주제를 마무리하는 단계예요."}
      </p>
    </div>
  );
}

/** `ready`: the topic's lessons are done (the map opens then) — without it the row is one line, no link. */
export function PassoffMapRow({ topic, done, ready }: { topic: number; done: boolean; ready: boolean }) {
  if (!done && !ready) {
    return (
      <div className="border-t border-line" data-passoff-map-row={topic} data-passoff-map-row-waiting>
        <p className="flex min-h-12 items-center gap-2 px-4 text-label text-ink-soft">
          <span className="font-semibold">구성도 다시 채우기</span>
          <span className="text-caption">대주제 강의를 마친 뒤 할 수 있어요</span>
        </p>
      </div>
    );
  }
  return (
    <div className="border-t border-line" data-passoff-map-row={topic}>
      <Link
        href={passoffMapHref(topic)}
        className="flex min-h-12 items-center justify-between gap-3 px-4 text-label text-ink transition-colors hover:bg-sunken"
      >
        <span className="min-w-0">
          <span className="font-semibold">구성도 다시 채우기</span>
          <span className="ml-2 text-caption text-ink-soft">대주제 끝</span>
        </span>
        {done ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-caption text-success">
            <IconCheck size={14} />
            <span>마침</span>
          </span>
        ) : (
          <IconChevronRight size={18} className="shrink-0 text-ink-soft" />
        )}
      </Link>
    </div>
  );
}

/**
 * The map page before the topic's lessons are done (what the server counted when it drew the page). A completion still on
 * its way from this device goes now; when the server's answer shows the lessons done, the page is asked for again (once) and
 * comes with the map — as the lock screen does for a lesson (TopicLock).
 */
export function PassoffMapWaiting({
  topic,
  required,
  completed,
  total,
  lastTitle,
}: {
  topic: number;
  required: number;
  completed: number;
  total: number;
  lastTitle: string;
}) {
  const router = useRouter();
  const { flush, progress, confirmed } = usePassoffProgress();
  const refreshed = useRef(false);

  useEffect(() => {
    void flush();
  }, [flush]);

  const state = confirmed && progress ? (progress.topics.find((t) => t.topic === topic) ?? null) : null;
  const ready = Boolean(state && passoffLessonsDone(state));
  useEffect(() => {
    if (!ready || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [ready, router]);

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4" data-passoff-map-waiting={topic}>
      <p className="text-body text-ink">구성도 다시 채우기는 대주제의 강의를 마친 뒤 할 수 있어요.</p>
      <ul className="flex flex-col gap-1 text-label text-ink-soft">
        <li>
          강의 {required}개 이상 마치기 <span className="tabular-nums">(지금 {state?.completedCount ?? completed}/{total})</span>
        </li>
        <li>마지막 강의 &lsquo;{lastTitle}&rsquo; 마치기</li>
      </ul>
      <div>
        <Link
          href="/passoff-grammar"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
        >
          과정 목록으로
        </Link>
      </div>
    </section>
  );
}
