"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { bringLessonsForward } from "@/lib/learning/practice";
import { syncCourseRecordWith } from "@/lib/learning/sync";
import { PASSOFF_COURSE } from "@/lib/passoffLearning";
import {
  gradeMap,
  mapChips,
  mapMissedLessons,
  mapRuleOptions,
  mapSentenceOptions,
  type PassoffMapBoxResult,
  type PassoffMapData,
} from "@/lib/passoffMap";
import { topicWithParticle, type PassoffProgressSnapshot } from "@/lib/passoffUnlock";
import { usePassoffProgress } from "../PassoffProgressProvider";
import { Progress } from "../learning/ReviewSession";
import { IconCheck, IconX } from "../icons";
import { PrimaryButton, SecondaryButton, tone } from "./ui";

/**
 * "구성도 다시 채우기" (src/lib/passoffMap.ts — 단계 2-나 E2): ① the topic's lesson chips into the empty boxes 1…n, in the
 * course's order → ② box by box, its rule in one line and a sentence that shows it → ③ the result box by box. Taps only
 * (no dragging — a phone), one thing on the screen at a time. The result is recorded whatever the score: the topic's map
 * refill on the server (PassoffProgressProvider.recordMapRefill — the next topic's last condition) and, for the boxes
 * filled wrong, their lessons' items to the front of the next review (practice.ts — this device, and the server through
 * the learning API's `forward`).
 */
type Stage = { at: "place" } | { at: "pick"; box: number } | { at: "result" };
type Save = { at: "saving" } | { at: "saved"; progress: PassoffProgressSnapshot } | { at: "failed" };

export function PassoffMapRefill({ data }: { data: PassoffMapData }) {
  const n = data.lessons.length;
  const empty = () => Array.from({ length: n }, () => null as string | null);
  const [stage, setStage] = useState<Stage>({ at: "place" });
  const [boxes, setBoxes] = useState<(string | null)[]>(empty);
  const [rules, setRules] = useState<(string | null)[]>(empty);
  const [sentences, setSentences] = useState<(string | null)[]>(empty);
  const [results, setResults] = useState<PassoffMapBoxResult[]>([]);
  const [save, setSave] = useState<Save>({ at: "saving" });
  /** the next topic was open before this map refill (then its answer opens nothing new) */
  const [nextWasOpen, setNextWasOpen] = useState(false);
  const { recordMapRefill, progress } = usePassoffProgress();

  const chips = useMemo(() => mapChips(data), [data]);
  const ruleOptions = useMemo(() => mapRuleOptions(data), [data]);
  const titleOf = (id: string | null) => data.lessons.find((l) => l.id === id)?.title ?? "";
  const placed = boxes.filter(Boolean).length;

  function place(id: string) {
    setBoxes((prev) => {
      const at = prev.indexOf(null);
      if (at < 0 || prev.includes(id)) return prev;
      const next = [...prev];
      next[at] = id;
      return next;
    });
  }

  function take(box: number) {
    setBoxes((prev) => prev.map((id, i) => (i === box ? null : id)));
  }

  async function record(missed: string[]) {
    setSave({ at: "saving" });
    const [progress, learning] = await Promise.all([
      recordMapRefill(data.topic),
      missed.length ? syncCourseRecordWith(PASSOFF_COURSE, { forward: missed, view: "record" }) : Promise.resolve({ ok: true as const }),
    ]);
    setSave(progress && learning.ok ? { at: "saved", progress } : { at: "failed" });
  }

  function finish() {
    const graded = gradeMap(data, { boxes, rules, sentences });
    const missed = mapMissedLessons(graded);
    setResults(graded);
    setNextWasOpen(Boolean(progress && (progress.everyTopicOpen || progress.topics.find((t) => t.topic > data.topic)?.unlocked)));
    setStage({ at: "result" });
    // this device's review first (it works offline); the server's copy with the map refill
    if (missed.length) bringLessonsForward(PASSOFF_COURSE, missed);
    void record(missed);
  }

  function again() {
    setBoxes(empty());
    setRules(empty());
    setSentences(empty());
    setResults([]);
    setStage({ at: "place" });
  }

  if (stage.at === "place") {
    return (
      <div className="flex flex-col gap-4" data-passoff-map-stage="place">
        <Progress label="레슨 놓기" at={placed} of={n} name="구성도 진행" />
        <p className="text-label leading-relaxed text-ink-soft">
          대주제의 레슨을 순서대로 칸에 놓으세요. 레슨 이름을 누르면 빈 칸에 들어가고, 놓은 칸을 누르면 빠져요.
        </p>
        <ol className="flex flex-col gap-2" aria-label="구성도 칸">
          {boxes.map((id, box) => (
            <li key={box}>
              <button
                type="button"
                onClick={() => take(box)}
                disabled={!id}
                aria-label={id ? `${box + 1}번 칸: ${titleOf(id)} — 누르면 빠져요` : `${box + 1}번 칸: 비어 있음`}
                className={`flex min-h-12 w-full items-center gap-3 rounded-control px-4 text-left text-body transition-colors disabled:cursor-default ${
                  id ? "border border-line-strong bg-raised font-semibold text-ink cursor-pointer hover:bg-sunken" : "border border-dashed border-line text-ink-faint"
                }`}
              >
                <span className="w-6 shrink-0 text-label tabular-nums text-ink-soft">{box + 1}</span>
                <span className="min-w-0">{id ? titleOf(id) : "빈 칸"}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2" role="group" aria-label="레슨 칩">
          {chips
            .filter((chip) => !boxes.includes(chip.id))
            .map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => place(chip.id)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-line bg-surface px-3 text-body text-ink transition-colors cursor-pointer hover:bg-sunken"
              >
                {chip.title}
              </button>
            ))}
        </div>
        <div className="flex justify-end">
          <PrimaryButton disabled={placed < n} onClick={() => setStage({ at: "pick", box: 0 })}>
            다음
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (stage.at === "pick") {
    const box = stage.box;
    const sentenceOptions = mapSentenceOptions(data, box);
    return (
      <div className="flex flex-col gap-4" data-passoff-map-stage="pick" data-passoff-map-box={box + 1}>
        <Progress label="칸 채우기" at={box + 1} of={n} name="구성도 진행" />
        <p className="text-title-s font-bold text-ink">
          <span className="tabular-nums text-ink-soft">{box + 1}.</span> {titleOf(boxes[box])}
        </p>
        <section aria-labelledby="map-rule" className="flex flex-col gap-2">
          <h2 id="map-rule" className="text-label font-semibold text-ink-soft">
            이 레슨의 규칙 한 줄
          </h2>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="map-rule">
            {ruleOptions.map((option) => (
              <button
                key={option.lessonId}
                type="button"
                aria-pressed={rules[box] === option.lessonId}
                onClick={() => setRules((prev) => prev.map((v, i) => (i === box ? option.lessonId : v)))}
                className={`min-h-11 w-full rounded-control border px-4 py-2 text-left text-body transition-colors cursor-pointer ${
                  rules[box] === option.lessonId ? "border-line-strong bg-sunken font-semibold text-ink" : "border-line text-ink hover:bg-sunken"
                }`}
              >
                {option.text}
              </button>
            ))}
          </div>
        </section>
        <section aria-labelledby="map-sentence" className="flex flex-col gap-2">
          <h2 id="map-sentence" className="text-label font-semibold text-ink-soft">
            이 규칙을 보여 주는 대표 문장
          </h2>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="map-sentence">
            {sentenceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                lang="en"
                aria-pressed={sentences[box] === option.id}
                onClick={() => setSentences((prev) => prev.map((v, i) => (i === box ? option.id : v)))}
                className={`min-h-11 w-full rounded-control border px-4 py-2 text-left text-body transition-colors cursor-pointer ${
                  sentences[box] === option.id ? "border-line-strong bg-sunken font-semibold text-ink" : "border-line text-ink hover:bg-sunken"
                }`}
              >
                {option.en}
              </button>
            ))}
          </div>
        </section>
        <div className="flex items-center justify-between gap-2">
          <SecondaryButton onClick={() => setStage(box > 0 ? { at: "pick", box: box - 1 } : { at: "place" })}>이전</SecondaryButton>
          <PrimaryButton
            disabled={!rules[box] || !sentences[box]}
            onClick={() => (box + 1 < n ? setStage({ at: "pick", box: box + 1 }) : finish())}
          >
            {box + 1 < n ? "다음 칸" : "결과 보기"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const right = results.filter((r) => r.ok).length;
  const missed = mapMissedLessons(results);
  const nextTopic = save.at === "saved" ? save.progress.topics.find((t) => t.topic > data.topic) : undefined;
  const opened = Boolean(save.at === "saved" && !save.progress.everyTopicOpen && nextTopic?.unlocked && !nextWasOpen);
  return (
    <div className="flex flex-col gap-4" data-passoff-map-stage="result">
      <section aria-labelledby="map-result" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
        <h2 id="map-result" className="text-title-s font-bold text-ink">
          구성도 결과
        </h2>
        <p className="text-body text-ink" role="status">
          칸 {n}개 중 <span className="font-semibold tabular-nums">{right}</span>개를 맞혔어요.
        </p>
        <ol className="flex flex-col divide-y divide-line border-t border-line">
          {results.map((r) => {
            const lesson = data.lessons[r.box];
            return (
              <li key={r.box} className="flex items-start gap-2 py-2" data-passoff-map-result={r.ok ? "ok" : "missed"}>
                <span className={`mt-1 shrink-0 ${r.ok ? tone.success : tone.danger}`}>{r.ok ? <IconCheck size={16} /> : <IconX size={16} />}</span>
                <span className="sr-only">{r.ok ? "맞음: " : "틀림: "}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-body font-semibold text-ink">
                    <span className="tabular-nums text-ink-soft">{r.box + 1}.</span> {lesson.title}
                  </p>
                  {!r.lessonOk ? <p className="text-label text-ink-soft">놓은 레슨: {titleOf(boxes[r.box])}</p> : null}
                  {!r.ruleOk ? <p className="text-label text-ink">규칙: {lesson.ruleTitle}</p> : null}
                  {!r.sentenceOk ? (
                    <p className="text-label text-ink">
                      대표 문장: <span lang="en">{lesson.sentence.en}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {missed.length ? (
          <p className="text-label leading-relaxed text-ink-soft">
            틀린 칸의 레슨({missed.map((id) => titleOf(id)).join(" · ")})은 다음 복습에서 먼저 나와요.
          </p>
        ) : null}
        <div className="border-t border-line pt-3" aria-live="polite">
          {save.at === "saving" ? (
            <p className="text-label text-ink-soft" role="status">
              기록하고 있어요…
            </p>
          ) : save.at === "failed" ? (
            <div className="flex flex-col gap-2">
              <p className="text-label text-ink" role="alert">
                기록하지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요.
              </p>
              <div>
                <SecondaryButton onClick={() => void record(missed)}>다시 보내기</SecondaryButton>
              </div>
            </div>
          ) : (
            <p className="text-label text-ink" role="status" data-passoff-map-saved>
              {opened && nextTopic ? `기록했어요. ${topicWithParticle(nextTopic.topic, "이/가")} 열렸어요.` : "기록했어요."}
            </p>
          )}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SecondaryButton onClick={again}>다시 하기</SecondaryButton>
        <Link
          href={`/${PASSOFF_COURSE}`}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity hover:opacity-90"
        >
          과정 목록으로
        </Link>
      </div>
    </div>
  );
}
