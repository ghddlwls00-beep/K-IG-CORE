"use client";

import { useRef, useState } from "react";
import type { PassoffFormItem } from "@/lib/passoffTypes";
import { expectedLabel, gradeChoice, gradeSelect, gradeShort, hasHangul } from "@/lib/passoffGrading";
import { notePassoffAttempt, type PassoffAnswerMode, type PassoffAttempt } from "@/lib/passoffLearning";
import { optionOrder, type FormItemState } from "@/lib/passoffLesson";
import { IconCheck } from "../icons";
import { MyAnswerReport } from "../learning/MyAnswerReport";
import { LESSON_REPORT_NOTE, useLessonReport } from "./lessonReport";
import { FONT, Marked, PrimaryButton, SecondaryButton, Verdict, glossFor, tone, usePassoffLearner, type FontSize } from "./ui";

/**
 * ③ 형태 찾기 4~6문제 (설계 §3) — one item at a time: tap the words (and give each its label), pick an option, or
 * type a word or two. Graded at once and deterministically (src/lib/passoffGrading.ts). A miss gets one more
 * try, then the answer and why; an item missed at its first try comes back once at the end of the step.
 * The first try and a shown answer are kept at once (onItemFirstTry · onItemShown), not only at '다음'.
 */
export function FormStep({
  items,
  queue,
  lessonId,
  font,
  states,
  onItemFirstTry,
  onItemShown,
  onItemDone,
  onNext,
}: {
  items: PassoffFormItem[];
  /** the items still to answer, in order */
  queue: string[];
  lessonId: string;
  font: FontSize;
  /** each item's state (sent back once · its answer shown) */
  states: Readonly<Record<string, FormItemState>>;
  onItemFirstTry: (id: string, right: boolean) => void;
  onItemShown: (id: string) => void;
  onItemDone: (id: string, firstTryRight: boolean) => void;
  onNext: () => void;
}) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const current = queue.length ? byId.get(queue[0]) : undefined;

  if (!items.length) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-soft">이 강의에는 형태 찾기 문제가 없습니다.</p>
        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>다음 단계: 영작</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-4">
        <Verdict ok>형태 찾기 {items.length}문제를 모두 마쳤어요.</Verdict>
        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>다음 단계: 영작</PrimaryButton>
        </div>
      </div>
    );
  }

  const again = Boolean(states[current.id]?.requeued);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-label tabular-nums text-ink-soft">
        남은 문제 {queue.length} / {items.length}
        {again ? " · 다시 풀기" : ""}
      </p>
      <FormItemCard
        key={`${current.id}:${again ? 1 : 0}`}
        item={current}
        lessonId={lessonId}
        firstPresentation={!again}
        answerSeen={states[current.id]?.help === "reveal"}
        font={font}
        onFirstTry={(right) => onItemFirstTry(current.id, right)}
        onShown={() => onItemShown(current.id)}
        onDone={(firstTryRight) => onItemDone(current.id, firstTryRight)}
      />
    </div>
  );
}

type Phase = "answer" | "retry" | "right" | "shown";

/**
 * One ③ item. The review screen (공통-학습-엔진.md §8 — src/components/passoff/PassoffReview.tsx) uses it too: its answers
 * go to `onAttempt` (recorded there with where "review"), and `test` is the next-day check — one answer, recorded, and
 * passed on at once with no result (the results come together at the end). `missed` is that check's wrong answer when the
 * item comes once more after the results: it counts as the first try, so the card opens on '한 번 더' (the option picked
 * struck out, the word typed still in the box) and a second miss shows the answer. Without them the card is the lesson's.
 *
 * A choice item's options come in the order its id gives (passoffLesson.ts optionOrder — the same on every reload, device
 * and in the review; 작업기록 할 일 5); a button hands back its option's own index (`data-option`), which gradeChoice checks.
 *
 * 단계 2-나 E2 — "내 답도 맞아요" (§8-6) under a wrong result ('한 번 더' · the answer shown): the words tapped (with their
 * labels), the option picked or the word typed (on a card opened on the check's `missed` answer, that answer until another
 * is checked). In the lesson it is kept for judging (useLessonReport); on the review screen `onReport` hands it to the frame.
 *
 * Its text is drawn with the lesson's Hangul glosses (glossFor(lessonId) — a word button "Songnisan" reads
 * "Songnisan(속리산)"); the words are picked and graded by their index, and the answer recorded is the lesson's own words.
 */
export function FormItemCard({
  item,
  lessonId,
  firstPresentation,
  answerSeen,
  font,
  onFirstTry,
  onShown,
  onDone,
  onAttempt,
  test = false,
  missed,
  onReport,
  reported,
  reportNote,
}: {
  item: PassoffFormItem;
  lessonId: string;
  firstPresentation: boolean;
  /** its answer was shown before (the first presentation missed twice): this presentation's answers carry "reveal" */
  answerSeen: boolean;
  font: FontSize;
  onFirstTry: (right: boolean) => void;
  onShown: () => void;
  onDone: (firstTryRight: boolean) => void;
  /** who records each answer — the lesson's own record (notePassoffAttempt) when absent */
  onAttempt?: (attempt: PassoffAttempt) => void;
  /** the next-day check: one answer, recorded, then passed on at once — no result */
  test?: boolean;
  /** the check's wrong answer — the card opens on '한 번 더' */
  missed?: string;
  /** "내 답도 맞아요" — who records it (the lesson's own report when absent) */
  onReport?: (mine: { answer: string; mode: PassoffAnswerMode }) => void;
  /** reported already (the review frame knows; the lesson card keeps its own) */
  reported?: boolean;
  /** the line once reported */
  reportNote?: string;
}) {
  const learner = usePassoffLearner();
  const lessonReport = useLessonReport();
  const gloss = glossFor(lessonId);
  const again = missed !== undefined;
  const [reportedHere, setReportedHere] = useState(false);
  /** the last answer graded wrong, as the learner gave it — what "내 답도 맞아요" sends (the check's, on a card opened on it) */
  const [lastWrong, setLastWrong] = useState<string | null>(missed ? missed : null);
  const isReported = reported ?? reportedHere;
  const mode: PassoffAnswerMode = item.kind === "short" ? "typed" : "tap";
  function sendReport() {
    if (lastWrong === null || isReported) return;
    if (onReport) onReport({ answer: lastWrong, mode });
    else lessonReport({ lessonId, itemId: item.id, kind: item.kind, help: answerSeen ? "reveal" : "none", mode, answer: lastWrong });
    setReportedHere(true);
  }
  const [phase, setPhase] = useState<Phase>(again ? "retry" : "answer");
  const [tries, setTries] = useState(again ? 1 : 0);
  const [firstRight, setFirstRight] = useState<boolean | null>(again ? false : null);
  // select
  const [picked, setPicked] = useState<number[]>([]);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [labelFor, setLabelFor] = useState<number | null>(null);
  const [selectNote, setSelectNote] = useState<string | null>(null);
  // choice
  const [wrongOptions, setWrongOptions] = useState<number[]>(() =>
    item.kind === "choice" && missed !== undefined && item.options.includes(missed) ? [item.options.indexOf(missed)] : [],
  );
  // short
  const [text, setText] = useState(item.kind === "short" && missed ? missed : "");
  const [hangul, setHangul] = useState(false);
  const composing = useRef(false);
  const settled = phase === "right" || phase === "shown";

  /** `answer`: as the learner gave it — the words tapped with their labels ("quickly(부사)"), the option, the word typed */
  function record(correct: boolean, answer?: string) {
    const first = tries === 0;
    if (first) {
      setFirstRight(correct);
      onFirstTry(correct);
    }
    if (!correct) setLastWrong(answer ?? "");
    // the help taken BEFORE this answer: "한 번 더" is not help; the answer shown in an earlier presentation is
    const note = onAttempt ?? ((attempt: PassoffAttempt) => notePassoffAttempt(attempt, learner));
    note({
      lessonId,
      itemId: item.id,
      kind: item.kind,
      correct,
      help: answerSeen ? "reveal" : "none",
      mode: item.kind === "short" ? "typed" : "tap",
      firstTry: first && firstPresentation,
      answer,
    });
    if (test) {
      // the next-day check: this one answer is the result — shown with the others at the end
      onDone(correct);
      return;
    }
    setTries((t) => t + 1);
    if (correct) {
      setPhase("right");
    } else if (tries >= 1) {
      setPhase("shown");
      onShown();
    } else {
      setPhase("retry");
    }
  }

  function checkSelect() {
    if (item.kind !== "select" || settled) return;
    const res = gradeSelect(item, picked, labels);
    if (!res.correct) {
      const parts: string[] = [];
      if (res.missed.length) parts.push(`아직 안 고른 것이 있어요(${res.missed.length}개)`);
      if (res.wrongPicks.length) parts.push(`골라야 할 것이 아닌 낱말이 있어요(${res.wrongPicks.length}개)`);
      if (res.wrongLabels.length) parts.push(`이름표가 틀린 것이 있어요(${res.wrongLabels.length}개)`);
      setSelectNote(parts.join(" · "));
    }
    // with its labels: the review's results, the wrong-answer list and a report show what was really given (E2 수정 — a right
    // word with a wrong label read as a right answer there)
    record(res.correct, picked.map((i) => (labels[i] ? `${item.tokens[i]}(${labels[i]})` : item.tokens[i])).join(" "));
  }

  function toggleToken(i: number) {
    if (item.kind !== "select" || settled) return;
    if (picked.includes(i)) {
      setPicked((prev) => prev.filter((x) => x !== i));
      setLabels((prev) => {
        const next = { ...prev };
        delete next[i];
        return next;
      });
      setLabelFor((prev) => (prev === i ? null : prev));
      return;
    }
    setPicked((prev) => [...prev, i].sort((a, b) => a - b));
    if (item.labels?.length) setLabelFor(i);
  }

  function chooseOption(i: number) {
    if (item.kind !== "choice" || settled || wrongOptions.includes(i)) return;
    const ok = gradeChoice(item, i);
    if (!ok) setWrongOptions((prev) => [...prev, i]);
    record(ok, item.options[i]);
  }

  function checkShort() {
    if (item.kind !== "short" || settled || composing.current) return;
    const verdict = gradeShort(item, text);
    if (verdict === "empty") return;
    if (verdict === "hangul") {
      setHangul(true);
      return;
    }
    setHangul(false);
    record(verdict === "correct", text);
  }

  const answerSet = new Set(item.kind === "select" ? item.answer : []);
  const optionalSet = new Set(item.kind === "select" ? item.optional ?? [] : []);

  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-raised p-4">
      <h3 className="text-body font-semibold text-ink">{gloss(item.instruction)}</h3>

      {item.kind === "select" ? (
        <div className="flex flex-col gap-3">
          <div lang="en" className="flex flex-wrap gap-2" role="group" aria-label="낱말 고르기">
            {item.tokens.map((token, i) => {
              if (!/[A-Za-z0-9]/.test(token)) {
                return (
                  <span key={i} className={`${FONT[font].text} self-center text-ink-soft`}>
                    {token}
                  </span>
                );
              }
              const on = picked.includes(i);
              const isAnswer = phase === "shown" && answerSet.has(i);
              const label = phase === "shown" && isAnswer ? expectedLabel(item, i) : labels[i];
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  disabled={settled}
                  onClick={() => toggleToken(i)}
                  className={`inline-flex min-h-11 min-w-11 flex-col items-center justify-center rounded-control border px-3 py-1 ${FONT[font].text} transition-colors disabled:cursor-default ${
                    isAnswer
                      ? `${tone.successBorder} border-2 font-semibold text-ink`
                      : on
                        ? "border-line-strong bg-sunken font-semibold text-ink"
                        : "border-line text-ink hover:bg-sunken"
                  }`}
                >
                  <span>{gloss(token)}</span>
                  {label ? <span className="text-caption font-normal text-ink-soft">{label}</span> : null}
                  {phase === "shown" && optionalSet.has(i) ? <span className="text-caption font-normal text-ink-faint">골라도 됨</span> : null}
                </button>
              );
            })}
          </div>
          {item.labels?.length && labelFor !== null && picked.includes(labelFor) && !settled ? (
            <div className="flex flex-col gap-2">
              <p className="text-label text-ink-soft">
                <span lang="en" className="font-semibold text-ink">
                  {gloss(item.tokens[labelFor])}
                </span>{" "}
                은(는)?
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="이름표 고르기">
                {item.labels.map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={labels[labelFor] === l}
                    onClick={() => {
                      setLabels((prev) => ({ ...prev, [labelFor]: l }));
                      setLabelFor(null);
                    }}
                    className={`min-h-11 min-w-11 rounded-control border px-3 text-label transition-colors ${
                      labels[labelFor] === l ? "border-line-strong bg-sunken font-semibold text-ink" : "border-line text-ink hover:bg-sunken"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {item.labels?.length && !settled ? (
            <p className="text-caption text-ink-faint">고른 낱말을 다시 누르면 빠져요. 이름표는 낱말을 고르면 나와요.</p>
          ) : null}
          {!settled ? (
            <div className="flex justify-end">
              <PrimaryButton disabled={!picked.length} onClick={checkSelect}>
                확인
              </PrimaryButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.kind === "choice" ? (
        <div className="flex flex-col gap-3">
          {item.sentence ? (
            <p lang="en" className={`${FONT[font].text} text-ink`}>
              <Marked text={item.sentence} phrases={item.underline} className="underline decoration-2 underline-offset-4" gloss={gloss} />
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2" role="group" aria-label="보기">
            {optionOrder(item.id, item.options.length).map((i) => {
              const option = item.options[i];
              const isAnswer = settled && i === item.answer;
              const isWrong = wrongOptions.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-option={i}
                  disabled={settled || isWrong}
                  onClick={() => chooseOption(i)}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border px-4 text-body transition-colors disabled:cursor-default ${
                    isAnswer ? `${tone.successBorder} font-semibold text-ink` : isWrong ? "border-line text-ink-faint line-through" : "border-line text-ink hover:bg-sunken"
                  }`}
                >
                  {isAnswer ? <span className={tone.success}><IconCheck size={16} /></span> : null}
                  {gloss(option)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {item.kind === "short" ? (
        <div className="flex flex-col gap-3">
          {item.sentence ? (
            <p lang="en" className={`${FONT[font].text} text-ink`}>
              {gloss(item.sentence)}
            </p>
          ) : null}
          <input
            type="text"
            lang="en"
            value={text}
            disabled={settled}
            aria-label="답"
            placeholder="영어로 쓰세요"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => {
              setText(e.target.value);
              setHangul(hasHangul(e.target.value));
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                checkShort();
              }
            }}
            className={`min-h-11 w-full rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none ${FONT[font].input}`}
          />
          {hangul ? <p className={`text-label ${tone.danger}`}>한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.</p> : null}
          {!settled ? (
            <div className="flex justify-end">
              <PrimaryButton disabled={!text.trim()} onClick={checkShort}>
                확인
              </PrimaryButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "retry" ? (
        <div className="flex flex-col gap-1">
          <Verdict ok={false}>한 번 더 해 보세요.</Verdict>
          {selectNote ? <p className="text-label text-ink-soft">{selectNote}</p> : null}
          {lastWrong !== null ? <MyAnswerReport reported={isReported} note={reportNote ?? LESSON_REPORT_NOTE} onReport={sendReport} /> : null}
        </div>
      ) : null}
      {phase === "right" ? <Verdict ok>맞았어요.</Verdict> : null}
      {phase === "shown" ? (
        <div className="flex flex-col gap-1">
          <Verdict ok={false}>정답을 확인하세요.</Verdict>
          {item.kind === "short" ? (
            <p lang="en" className={`${FONT[font].text} font-semibold text-ink`}>
              {item.answer.map(gloss).join(" / ")}
            </p>
          ) : null}
          {lastWrong !== null ? <MyAnswerReport reported={isReported} note={reportNote ?? LESSON_REPORT_NOTE} onReport={sendReport} /> : null}
        </div>
      ) : null}
      {settled && item.why ? <p className={`${FONT[font].text} text-ink`}>{gloss(item.why)}</p> : null}
      {settled ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {phase === "shown" || firstRight === false ? (
            <span className="text-label text-ink-soft">{firstPresentation ? "이 문제는 끝에서 한 번 더 나와요." : ""}</span>
          ) : null}
          <PrimaryButton onClick={() => onDone(firstRight === true)}>다음</PrimaryButton>
        </div>
      ) : null}
      {phase === "retry" && item.kind === "select" ? (
        <div className="flex justify-end">
          <SecondaryButton
            onClick={() => {
              setPicked([]);
              setLabels({});
              setLabelFor(null);
            }}
          >
            다시 고르기
          </SecondaryButton>
        </div>
      ) : null}
    </section>
  );
}
