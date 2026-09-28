"use client";

import Link from "next/link";
import { passoffMapHref } from "@/lib/passoffLearning";
import { topicWithParticle, type PassoffProgressSnapshot } from "@/lib/passoffUnlock";
import { IconCheck, IconChevronRight } from "../icons";

/**
 * Where the course list leads to "구성도 다시 채우기" (단계 2-나 E2 — 설계 §5, the topic's last condition), from the server's
 * answer (PassoffProgressProvider — with a licence only):
 *   - PassoffMapNext, in the list's progress box: the topic whose last lesson is done and whose map is not — the one step
 *     left before the next topic opens (not for a LIFE pass: every topic is open);
 *   - PassoffMapRow, at the end of an open topic's lessons: the map of that topic any time, '마침' once done.
 */
export function PassoffMapNext({ progress }: { progress: PassoffProgressSnapshot | null }) {
  if (!progress || progress.everyTopicOpen || !progress.mapRefillRequired) return null;
  const topic = progress.topics.find((t) => t.unlocked && t.lastLessonCompleted && !t.mapRefilled);
  if (!topic) return null;
  const next = progress.topics.find((t) => t.topic > topic.topic);
  const last = Boolean(next) && topic.completedCount >= topic.requiredCount;
  return (
    <div className="mt-3 flex flex-col gap-1.5" data-passoff-map-next={topic.topic}>
      <Link
        href={passoffMapHref(topic.topic)}
        className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-line-strong bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
      >
        <span>TOPIC {topic.topic} 구성도 다시 채우기</span>
        <IconChevronRight size={18} className="shrink-0 text-ink-soft" />
      </Link>
      <p className="text-caption text-ink-soft">
        {last && next ? `한 번 하면 ${topicWithParticle(next.topic, "이/가")} 열려요.` : "대주제를 마무리하는 단계예요. 다음 대주제가 열리는 조건 중 하나예요."}
      </p>
    </div>
  );
}

export function PassoffMapRow({ topic, done }: { topic: number; done: boolean }) {
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
