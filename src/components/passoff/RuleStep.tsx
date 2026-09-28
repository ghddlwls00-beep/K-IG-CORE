"use client";

import { useState } from "react";
import { optionOrder, ruleQuestionKey } from "@/lib/passoffLesson";
import type { PassoffAnchor, PassoffRuleBlock } from "@/lib/passoffTypes";
import { IconCheck, IconX } from "../icons";
import { FOCUS_CLASS, FONT, Marked, PrimaryButton, SecondaryButton, Verdict, tone, type FontSize } from "./ui";

/**
 * ② 문법 설명 1~3분 (설계 §3): a discovery question on the sentences of ① (recorded, never graded — the answer and
 * why come right after the choice) → the explanation card (rule 3~5 lines · a table · how Korean differs ·
 * ✗/✓ common mistakes · a worked example · old and new term) → one rule check. A wrong check points at the
 * rule line it is about and asks again.
 *
 * The step tabs are free to press, so ② can come before ①: a sentence whose English ① has not opened yet is
 * shown by its Korean here — the English would give away ①'s "먼저 떠올리기" (점검 2026-09-27).
 *
 * Both questions show their options in the lesson's own stable order (passoffLesson.ts optionOrder, keyed by
 * ruleQuestionKey — 작업기록 할 일 5); the choice kept and checked is the option's own index (`data-option`).
 */
export function RuleStep({
  rule,
  lessonId,
  anchors,
  revealed,
  discovery,
  onDiscovery,
  checkDone,
  onCheckRight,
  font,
  onGoAnchors,
  onNext,
}: {
  rule: PassoffRuleBlock | null;
  /** the lesson's id — the key of its rule questions' option order */
  lessonId: string;
  anchors: PassoffAnchor[];
  /** ① sentences whose English was opened */
  revealed: readonly string[];
  discovery: number | null;
  onDiscovery: (option: number) => void;
  checkDone: boolean;
  onCheckRight: () => void;
  font: FontSize;
  onGoAnchors: () => void;
  onNext: () => void;
}) {
  const [missedPoint, setMissedPoint] = useState<number | null>(null);
  if (!rule) return <p className="text-body text-ink-soft">이 강의에는 문법 설명 카드가 없습니다.</p>;
  const d = rule.discovery;
  const cardOpen = !d || discovery !== null;
  const shownAnchors = d?.anchorIds?.length ? anchors.filter((a) => d.anchorIds?.includes(a.id)) : [];
  const opened = new Set(revealed);
  const notOpened = shownAnchors.filter((a) => !opened.has(a.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {d ? (
        <section aria-labelledby="passoff-discovery" className="flex flex-col gap-3">
          <h3 id="passoff-discovery" className="text-body font-semibold text-ink">
            먼저 찾아보기
          </h3>
          {shownAnchors.length ? (
            <ul className="flex flex-col gap-1.5 border-l-2 border-line pl-3">
              {shownAnchors.map((a) =>
                opened.has(a.id) ? (
                  <li key={a.id} lang="en" className={`${FONT[font].text} text-ink`}>
                    <Marked text={a.en} phrases={a.focus} className={FOCUS_CLASS} />
                  </li>
                ) : (
                  <li key={a.id} className={`${FONT[font].text} text-ink-soft`}>
                    {a.ko}
                  </li>
                ),
              )}
            </ul>
          ) : null}
          {notOpened ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-label text-ink-soft">1단계에서 먼저 떠올린 문장만 영어로 보여요.</p>
              <SecondaryButton onClick={onGoAnchors}>1단계로</SecondaryButton>
            </div>
          ) : null}
          <p className={`${FONT[font].text} text-ink`}>{d.question}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="고르기">
            {optionOrder(ruleQuestionKey(lessonId, "discovery"), d.options.length).map((i) => {
              const option = d.options[i];
              const chosen = discovery === i;
              const isAnswer = discovery !== null && i === d.answer;
              return (
                <button
                  key={i}
                  type="button"
                  data-option={i}
                  aria-pressed={chosen}
                  disabled={discovery !== null}
                  onClick={() => onDiscovery(i)}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border px-4 text-body transition-colors ${
                    isAnswer ? `${tone.successBorder} font-semibold text-ink` : chosen ? "border-line-strong text-ink" : "border-line text-ink hover:bg-sunken"
                  } disabled:cursor-default`}
                >
                  {isAnswer ? <span className={tone.success}><IconCheck size={16} /></span> : null}
                  {option}
                </button>
              );
            })}
          </div>
          {discovery !== null ? (
            <p className="text-body leading-relaxed text-ink">
              {discovery === d.answer ? "잘 찾았어요. " : `정답은 '${d.options[d.answer]}'예요. `}
              {d.why}
            </p>
          ) : null}
        </section>
      ) : null}

      {cardOpen ? (
        <>
          <RuleCard rule={rule} font={font} highlight={missedPoint} />
          {rule.check ? (
            <section aria-labelledby="passoff-rule-check" className="flex flex-col gap-3">
              <h3 id="passoff-rule-check" className="text-body font-semibold text-ink">
                문법 설명 확인
              </h3>
              <RuleCheck
                check={rule.check}
                orderKey={ruleQuestionKey(lessonId, "check")}
                points={rule.points}
                done={checkDone}
                font={font}
                onRight={onCheckRight}
                onMiss={(point) => setMissedPoint(point)}
                showPointInline={false}
              />
            </section>
          ) : null}
          {checkDone || !rule.check ? (
            <div className="flex justify-end">
              <PrimaryButton onClick={onNext}>다음 단계: 형태 찾기</PrimaryButton>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** The explanation card — no box inside the box: lines and space only (디자인 규칙 §1-3). */
export function RuleCard({ rule, font, highlight }: { rule: PassoffRuleBlock; font: FontSize; highlight: number | null }) {
  return (
    <section aria-labelledby="passoff-rule-title" className="flex flex-col gap-4 rounded-card border border-line bg-raised p-4">
      <h3 id="passoff-rule-title" className="text-title-s font-bold text-ink">
        {rule.title}
      </h3>
      <ul className="flex flex-col gap-2">
        {rule.points.map((point, i) => (
          <li
            key={i}
            id={`passoff-rule-point-${i}`}
            className={`${FONT[font].text} flex gap-2 text-ink ${highlight === i ? "rounded-control bg-sunken px-2 py-1 font-semibold" : ""}`}
          >
            <span aria-hidden className="text-ink-faint">
              ·
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {rule.table && rule.table.columns.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-label">
            <thead>
              <tr>
                {rule.table.columns.map((c, i) => (
                  <th key={i} scope="col" className="border-b border-line-strong px-2 py-2 font-semibold text-ink">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rule.table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-line px-2 py-2 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {rule.koDiff ? (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <h4 className="text-label font-semibold text-ink-soft">한국어와 다른 점</h4>
          <p className={`${FONT[font].text} text-ink`}>{rule.koDiff}</p>
        </div>
      ) : null}

      {rule.mistakes?.length ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <h4 className="text-label font-semibold text-ink-soft">자주 하는 실수</h4>
          <ul className="flex flex-col gap-3">
            {rule.mistakes.map((m, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p lang="en" className={`${FONT[font].text} flex items-start gap-2 text-ink-soft`}>
                  <span className={`mt-1 ${tone.danger}`}>
                    <IconX size={16} />
                  </span>
                  <span className="sr-only">틀린 문장: </span>
                  <span className="line-through decoration-1">{m.wrong}</span>
                </p>
                <p lang="en" className={`${FONT[font].text} flex items-start gap-2 font-semibold text-ink`}>
                  <span className={`mt-1 ${tone.success}`}>
                    <IconCheck size={16} />
                  </span>
                  <span className="sr-only">맞는 문장: </span>
                  <span>{m.right}</span>
                </p>
                {m.why ? <p className="pl-6 text-label text-ink-soft">{m.why}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rule.worked?.length ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <h4 className="text-label font-semibold text-ink-soft">풀이 예시</h4>
          <ol className="flex flex-col gap-1">
            {rule.worked.map((w, i) => (
              <li key={i} className={`${FONT[font].text} flex gap-2 text-ink ${i === rule.worked!.length - 1 ? "font-semibold" : ""}`}>
                <span className="w-5 shrink-0 text-right text-label tabular-nums text-ink-faint">{i + 1}</span>
                <span>{w}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {rule.terms?.length ? (
        <p className="border-t border-line pt-3 text-label text-ink-soft">
          용어: {rule.terms.map((t) => `${t.now}(교재: ${t.book})`).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

/**
 * One rule-check question. A wrong choice says so, points at the rule line it is about (`pointIndex`) and
 * leaves the other choices open; a right one shows why and calls `onRight` once. The options come in the order of
 * `orderKey` (ruleQuestionKey — the same in ② and ⑤); what is checked is the option's own index.
 */
export function RuleCheck({
  check,
  orderKey,
  points,
  done,
  font,
  onRight,
  onMiss,
  showPointInline,
}: {
  check: NonNullable<PassoffRuleBlock["check"]>;
  /** the key of the options' order (passoffLesson.ts optionOrder) */
  orderKey: string;
  points: string[];
  done: boolean;
  font: FontSize;
  onRight: () => void;
  onMiss?: (pointIndex: number | null) => void;
  /** in ⑤ the card is on another step: the line is quoted here instead */
  showPointInline: boolean;
}) {
  const [wrong, setWrong] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(done ? check.answer : null);
  const right = done || picked === check.answer;
  const point = typeof check.pointIndex === "number" ? points[check.pointIndex] : undefined;

  function choose(i: number) {
    if (right) return;
    setPicked(i);
    if (i === check.answer) {
      onRight();
    } else {
      setWrong((prev) => (prev.includes(i) ? prev : [...prev, i]));
      onMiss?.(typeof check.pointIndex === "number" ? check.pointIndex : null);
      if (!showPointInline && typeof check.pointIndex === "number") {
        document.getElementById(`passoff-rule-point-${check.pointIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className={`${FONT[font].text} text-ink`}>{check.question}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="고르기">
        {optionOrder(orderKey, check.options.length).map((i) => {
          const option = check.options[i];
          const isRight = right && i === check.answer;
          const isWrong = wrong.includes(i);
          return (
            <button
              key={i}
              type="button"
              data-option={i}
              disabled={right || isWrong}
              onClick={() => choose(i)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border px-4 text-body transition-colors disabled:cursor-default ${
                isRight ? `${tone.successBorder} font-semibold text-ink` : isWrong ? "border-line text-ink-faint line-through" : "border-line text-ink hover:bg-sunken"
              }`}
            >
              {isRight ? <span className={tone.success}><IconCheck size={16} /></span> : null}
              {option}
            </button>
          );
        })}
      </div>
      {right ? (
        <Verdict ok>맞았어요. {check.why}</Verdict>
      ) : wrong.length ? (
        <div className="flex flex-col gap-1">
          <Verdict ok={false}>다시 골라 보세요.</Verdict>
          {point ? (
            showPointInline ? (
              <p className="text-body leading-relaxed text-ink">문법 설명: {point}</p>
            ) : (
              <p className="text-label text-ink-soft">위 문법 설명 카드에 표시한 줄을 다시 읽어 보세요.</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
