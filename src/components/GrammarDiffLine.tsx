/**
 * GRAMMAR I · II — the learner's answer with the marks of GRM-L02: missing (green, inserted) · wrong (red → fix) · extra (struck)
 * · moved. Used by GrammarLearningView (Step 1 영작 · Step 4 종합 평가).
 *
 * 2026-10-05 (회귀 점검 1002 A1): every word is DRAWN through `show` (koreanOnScreen — a Korean word in the English in Hangul,
 * 사장님 "한국어 로마식표기를 다 한국어로 바꿔"). Before, DiffLine received `show` but drew `token.text` · `token.expected` as they
 * were, so GRAMMAR II's marked line showed "맞는 꼴 → Busan" and a learner who wrote "부산" saw it come back as "Busan" (the diff
 * runs on romanForGrading's reading of the answer). The diff itself is still the grader's — only what is drawn changes.
 */

import { Fragment } from "react";
import type { DiffToken } from "@/lib/grammarGrading";

/**
 * Consecutive tokens of the same kind joined into one (a "wrong" token keeps its own expected word, so it stays alone). Drawn with
 * the same single spaces between them, so the line reads exactly as before — only a word that is part of a name can now be drawn
 * as that name (koreanOnScreen works on whole names: "Han River" → 한강).
 */
export function mergeSameKind(tokens: DiffToken[]): DiffToken[] {
  const out: DiffToken[] = [];
  for (const token of tokens) {
    const last = out[out.length - 1];
    if (last && last.kind === token.kind && token.kind !== "wrong") last.text = `${last.text} ${token.text}`;
    else out.push({ ...token });
  }
  return out;
}

/**
 * The tokens as drawn: merged (mergeSameKind), then every text and expected word passed through `show`.
 *
 * A name the diff cut between a wrong word's fix and the missing words after it — "Tokyo" in place of "Han River" gives
 * wrong "Tokyo" → "Han" + missing "River" — is drawn as one fix: "Tokyo → 한강". Only the words the name needs are taken from
 * the missing piece (the shortest run whose drawing differs when joined); the rest stay marked as missing.
 */
export function drawnDiffTokens(raw: DiffToken[], show: (text: string) => string = (s) => s): DiffToken[] {
  const tokens = mergeSameKind(raw);
  const out: DiffToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = { ...tokens[i] };
    const next = tokens[i + 1];
    if (token.kind === "wrong" && token.expected && next && next.kind === "missing") {
      const words = next.text.split(" ");
      for (let k = 1; k <= words.length; k++) {
        const taken = words.slice(0, k).join(" ");
        if (show(`${token.expected} ${taken}`) === `${show(token.expected)} ${show(taken)}`) continue;
        token.expected = `${token.expected} ${taken}`;
        const rest = words.slice(k).join(" ");
        if (rest) tokens[i + 1] = { ...next, text: rest };
        else tokens.splice(i + 1, 1);
        break;
      }
    }
    out.push({ ...token, text: show(token.text), expected: token.expected ? show(token.expected) : token.expected });
  }
  return out;
}

/** `show`: how a word is drawn (koreanOnScreen — a Korean word in Hangul); the diff itself is the grader's */
export function DiffLine({ tokens: raw, show = (s) => s }: { tokens: DiffToken[]; show?: (text: string) => string }) {
  const tokens = drawnDiffTokens(raw, show);
  return (
    <>
      {tokens.map((token, index) => {
        const gap = index > 0 ? " " : "";
        if (token.kind === "same") return <Fragment key={index}>{gap}{token.text}</Fragment>;
        if (token.kind === "missing") {
          return (
            <Fragment key={index}>
              {gap}
              <ins className="font-semibold text-success underline decoration-2 underline-offset-4">
                <span className="sr-only">빠진 낱말 </span>
                {token.text}
              </ins>
            </Fragment>
          );
        }
        if (token.kind === "extra") {
          return (
            <Fragment key={index}>
              {gap}
              <del className="text-ink-faint">
                <span className="sr-only">뺄 낱말 </span>
                {token.text}
              </del>
            </Fragment>
          );
        }
        if (token.kind === "moved") {
          return (
            <Fragment key={index}>
              {gap}
              <span className="underline decoration-dotted decoration-2 underline-offset-4">{token.text}</span>
              <span className="ml-0.5 text-caption text-ink-soft">(순서)</span>
            </Fragment>
          );
        }
        return (
          <Fragment key={index}>
            {gap}
            <span className="font-semibold text-danger underline decoration-wavy underline-offset-4">
              <span className="sr-only">고칠 낱말 </span>
              {token.text}
            </span>
            {token.expected ? (
              <>
                {" "}
                <ins className="font-semibold text-success no-underline">
                  <span className="sr-only">맞는 꼴 </span>→ {token.expected}
                </ins>
              </>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
