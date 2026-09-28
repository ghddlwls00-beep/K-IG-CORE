"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { bringLessonsForward } from "@/lib/learning/practice";
import { queueForward, syncLearnerRecord } from "@/lib/learning/sync";
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
import { usePassoffProgress, type MapRefillResult } from "../PassoffProgressProvider";
import { Progress } from "../learning/ReviewSession";
import { IconCheck, IconX } from "../icons";
import { PrimaryButton, SecondaryButton, tone, usePassoffLearner } from "./ui";

/**
 * "구성도 다시 채우기" (src/lib/passoffMap.ts — 단계 2-나 E2): ① the topic's lesson chips into the empty boxes 1…n, in the
 * course's order → ② box by box, the placed lesson's rule in one line and a sentence that shows it → ③ the result box by
 * box. Taps only (no dragging — a phone), one thing on the screen at a time. The result is recorded whatever the score:
 * the topic's map refill on the server (PassoffProgressProvider.recordMapRefill — the next topic's last condition) and, for
 * the boxes filled wrong, their lessons' items back in review from tomorrow (practice.ts — this device at once, and the
 * server through the learning API's `forward`, queued on this device until a request carries it: sync.ts queueForward).
 *
 * E2 수정: a box asks about the lesson placed in it, so its rule and sentence are judged against that lesson and its
 * sentences to pick from are that lesson's (passoffMap.ts). When recording fails the screen says why (no licence on this
 * device · no connection · the server) and offers to send again; a map sent before the topic's lessons are done is not
 * taken, and the screen says so.
 *
 * Merged onto E1's records per learner: the lessons brought forward are this licence's (usePassoffLearner — its record on
 * the device and its queue); a licence still being checked on a page opened afresh is waited for a few seconds, as the map
 * refill itself waits (PassoffProgressProvider.recordMapRefill).
 */
type Stage = { at: "place" } | { at: "pick"; box: number } | { at: "result" };
type Save =
  | { at: "saving" }
  | { at: "saved"; progress: PassoffProgressSnapshot; forwarded: number | null }
  | { at: "failed"; reason: Extract<MapRefillResult, { ok: false }>["reason"] };

/** how long bringing lessons forward waits for a licence still being checked on this device (PassoffProgressProvider waits as long) */
const LEARNER_WAIT_MS = 5_000;

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
  // whose review the wrong boxes' lessons come back in — the licence of this moment (read when the map is finished)
  const learner = usePassoffLearner();
  /** the wrong boxes' lessons were brought forward in this licence's record on this device */
  const [broughtHere, setBroughtHere] = useState(false);
  const learnerRef = useRef(learner);
  useEffect(() => {
    learnerRef.current = learner;
  }, [learner]);

  const chips = useMemo(() => mapChips(data), [data]);
  const ruleOptions = useMemo(() => mapRuleOptions(data), [data]);
  const lessonOf = (id: string | null) => data.lessons.find((l) => l.id === id) ?? null;
  const titleOf = (id: string | null) => lessonOf(id)?.title ?? "";
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
    // the rule and sentence were picked for the lesson taken out
    setRules((prev) => prev.map((v, i) => (i === box ? null : v)));
    setSentences((prev) => prev.map((v, i) => (i === box ? null : v)));
  }

  /**
   * The wrong boxes' lessons back in this licence's review from tomorrow: this device's record at once (it works offline),
   * and the server's through the queue — carried by this request, or any later one of this learner. Idempotent (a send
   * again moves nothing more).
   */
  async function bringForward(missed: string[]) {
    if (!missed.length) return null;
    for (let waited = 0; !learnerRef.current && waited < LEARNER_WAIT_MS; waited += 250) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    const who = learnerRef.current;
    if (!who) return null;
    bringLessonsForward(PASSOFF_COURSE, who, missed);
    queueForward(PASSOFF_COURSE, who, missed);
    setBroughtHere(true);
    return syncLearnerRecord(PASSOFF_COURSE, who, { view: "record" });
  }

  async function record(missed: string[]) {
    setSave({ at: "saving" });
    const [refill, learning] = await Promise.all([recordMapRefill(data.topic), bringForward(missed)]);
    if (!refill.ok) {
      setSave({ at: "failed", reason: refill.reason });
      return;
    }
    const forwarded = learning && learning.ok && typeof learning.answer.forwarded === "number" ? learning.answer.forwarded : null;
    setSave({ at: "saved", progress: refill.progress, forwarded });
  }

  function finish() {
    const graded = gradeMap(data, { boxes, rules, sentences });
    const missed = mapMissedLessons(graded);
    setResults(graded);
    setNextWasOpen(Boolean(progress && (progress.everyTopicOpen || progress.topics.find((t) => t.topic > data.topic)?.unlocked)));
    setStage({ at: "result" });
    // the map refill on the server, and the wrong boxes' lessons forward (this device at once, the server with it)
    void record(missed);
  }

  function again() {
    setBoxes(empty());
    setRules(empty());
    setSentences(empty());
    setResults([]);
    setBroughtHere(false);
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
    const lessonId = boxes[box];
    const sentenceOptions = lessonId ? mapSentenceOptions(data, lessonId) : [];
    return (
      <div className="flex flex-col gap-4" data-passoff-map-stage="pick" data-passoff-map-box={box + 1}>
        <Progress label="칸 채우기" at={box + 1} of={n} name="구성도 진행" />
        <p className="text-title-s font-bold text-ink">
          <span className="tabular-nums text-ink-soft">{box + 1}.</span> {titleOf(lessonId)}
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
  const missedNames = missed.map((id) => titleOf(id)).join(" · ");
  const saved = save.at === "saved" ? save : null;
  const taken = Boolean(saved && saved.progress.topics.find((t) => t.topic === data.topic)?.mapRefilled);
  const nextTopic = saved ? saved.progress.topics.find((t) => t.topic > data.topic) : undefined;
  const opened = Boolean(saved && taken && !saved.progress.everyTopicOpen && nextTopic?.unlocked && !nextWasOpen);
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
            const placedLesson = lessonOf(r.placedId);
            // the rule and sentence were picked for the lesson placed here: what they should have been, by its name
            const about = r.lessonOk || !placedLesson ? "" : `${placedLesson.title}의 `;
            return (
              <li key={r.box} className="flex items-start gap-2 py-2" data-passoff-map-result={r.ok ? "ok" : "missed"}>
                <span className={`mt-1 shrink-0 ${r.ok ? tone.success : tone.danger}`}>{r.ok ? <IconCheck size={16} /> : <IconX size={16} />}</span>
                <span className="sr-only">{r.ok ? "맞음: " : "틀림: "}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-body font-semibold text-ink">
                    <span className="tabular-nums text-ink-soft">{r.box + 1}.</span> {lesson.title}
                  </p>
                  {!r.lessonOk ? <p className="text-label text-ink-soft">놓은 레슨: {placedLesson ? placedLesson.title : "없음"}</p> : null}
                  {!r.ruleOk && placedLesson ? (
                    <p className="text-label text-ink">
                      {about}규칙: {placedLesson.ruleTitle}
                    </p>
                  ) : null}
                  {!r.sentenceOk && placedLesson ? (
                    <p className="text-label text-ink">
                      {about}대표 문장: <span lang="en">{placedLesson.sentence.en}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-2 border-t border-line pt-3" aria-live="polite">
          {save.at === "saving" ? (
            <p className="text-label text-ink-soft" role="status">
              기록하고 있어요…
            </p>
          ) : save.at === "failed" ? (
            <div className="flex flex-col gap-2">
              <p className="text-label text-ink" role="alert">
                {save.reason === "licence"
                  ? "이 기기에서 이용권을 확인하지 못해 기록하지 못했어요. 이용권을 등록한 뒤 다시 보내 주세요."
                  : save.reason === "offline"
                    ? "인터넷에 연결되지 않아 기록하지 못했어요. 연결되면 다시 보내 주세요."
                    : "기록하지 못했어요. 잠시 뒤 다시 보내 주세요."}
              </p>
              <div>
                <SecondaryButton onClick={() => void record(missed)}>다시 보내기</SecondaryButton>
              </div>
            </div>
          ) : !taken ? (
            <p className="text-label text-ink" role="alert" data-passoff-map-not-taken>
              대주제 레슨을 모두 마치기 전이라 이번 구성도는 기록되지 않았어요. 레슨을 마친 뒤 다시 해 주세요.
            </p>
          ) : (
            <p className="text-label text-ink" role="status" data-passoff-map-saved>
              {opened && nextTopic ? `기록했어요. ${topicWithParticle(nextTopic.topic, "이/가")} 열렸어요.` : "기록했어요."}
            </p>
          )}
          {missed.length && save.at !== "saving" && (broughtHere || (saved && saved.forwarded !== null)) ? (
            <p className="text-label leading-relaxed text-ink-soft" data-passoff-map-forward>
              {saved && saved.forwarded === 0
                ? `틀린 칸의 레슨(${missedNames})에는 지금 복습할 문항이 없어요.`
                : saved && saved.forwarded !== null
                  ? `틀린 칸의 레슨(${missedNames}) 문항은 내일부터 복습에 다시 나와요.`
                  : `틀린 칸의 레슨(${missedNames}) 문항은 이 기기에서는 내일부터 복습에 나와요. 서버 기록은 다음에 연결될 때 맞춰요.`}
            </p>
          ) : null}
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
