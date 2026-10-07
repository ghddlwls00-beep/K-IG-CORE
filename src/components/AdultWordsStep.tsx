"use client";

/**
 * ADULT · 단어 — Step 2 of the ADULT lesson (2026-10-02, 사장님 "어덜트 섹션에서 단어 학습법 만들자 적절한 순서로 들어가게").
 *
 * READING's 핵심 어휘 way, so the site teaches words one way (ReadingLearningView renderWordRow · renderBlank):
 *   cards   the lesson's key words (the PPT's 핵심 어휘·표현, placed on the sentence that uses them — SentenceItem.words) in reading
 *           order: the word, its part of speech, the sentence with the word underlined; '뜻 보기' first (answers only after an
 *           attempt), then the meaning and 알아요 · 몰라요. The speaker says the word (`say`), the sentence button the sentence clip.
 *   blanks  up to five words a set — 몰라요 first, then the words not yet answered right, in reading order: the sentence with the
 *           word blanked, four choices (the word as written + three words of the same chapter, chosen by the build), the answer and
 *           the Korean line after a pick; '다른 빈칸으로 다시 풀기' makes the next set.
 * Records (this device, studentPractice): wordMarks · wordRight. The tab counts the words answered right; completion is unchanged.
 * Keyed by the word's place in the lesson, which the build keeps stable.
 */

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SentenceItem } from "@/lib/types";
import { getServerSpeechSnapshot, getSpeechSnapshot, playSentenceQueue, subscribeSpeech, unlockMobileAudio } from "@/lib/speech";
import type { StudentPractice, WordMark } from "@/lib/studentPractice";
import { IconCheck, IconChevronDown, IconChevronRight, IconRepeat, IconSpeaker, IconStop, IconX } from "@/components/icons";

// the three button kinds of the course views, 44px
const filledButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";

const SET_SIZE = 5;

interface Word {
  /** the word's place in the lesson (the record's key) */
  order: number;
  sentence: number;
  word: string;
  say: string;
  meaning: string;
  pos: string;
  start: number;
  end: number;
  choices: string[];
}

/** the lesson's key words in reading order */
export function lessonWords(items: SentenceItem[]): Word[] {
  const out: Word[] = [];
  items.forEach((it, sentence) => {
    for (const w of it.words ?? []) out.push({ ...w, order: out.length, sentence });
  });
  return out;
}

export function AdultWordsStep({
  items,
  koParas,
  speed,
  practice,
  setPractice,
  stopOthers,
  toggleSentence,
  sentencePlaying,
}: {
  items: SentenceItem[];
  koParas: string[];
  speed: number;
  practice: StudentPractice;
  setPractice: (update: (p: StudentPractice) => StudentPractice) => void;
  /** the lesson view's hard stop (its players) */
  stopOthers: () => void;
  toggleSentence: (idx: number) => void;
  sentencePlaying: (idx: number) => boolean;
}) {
  const words = useMemo(() => lessonWords(items), [items]);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [unfolded, setUnfolded] = useState<Record<number, boolean>>({});
  const [sayingWord, setSayingWord] = useState<number | null>(null);

  // the blanks: the set is fixed at its start (the marks of that moment), then answered one by one
  const pickSet = (marks: Record<number, WordMark>, right: Record<number, boolean>) => {
    const rank = (w: Word) => (marks[w.order] === "unknown" ? 0 : !right[w.order] ? 1 : 2);
    return [...words].sort((a, b) => rank(a) - rank(b) || a.order - b.order).slice(0, SET_SIZE).map((w) => w.order);
  };
  const [blankSet, setBlankSet] = useState<number[] | null>(null);
  const [blankIndex, setBlankIndex] = useState(0);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const set = blankSet ?? pickSet(practice.wordMarks, practice.wordRight);

  const wordPlaying = (order: number) => sayingWord === order && speech.speaking;
  const sayWord = (w: Word) => {
    if (wordPlaying(w.order)) {
      stopOthers();
      setSayingWord(null);
      return;
    }
    unlockMobileAudio();
    stopOthers();
    setSayingWord(w.order);
    playSentenceQueue([w.say], { lang: "en", rate: speed, onEnd: () => setSayingWord(null), onError: () => setSayingWord(null) });
  };

  const setMark = (order: number, mark: WordMark) => {
    setPractice((p) => ({ ...p, wordMarks: { ...p.wordMarks, [order]: mark } }));
    if (mark === "known") setUnfolded((prev) => ({ ...prev, [order]: false }));
  };

  const known = words.filter((w) => practice.wordMarks[w.order] === "known").length;
  const unknown = words.filter((w) => practice.wordMarks[w.order] === "unknown").length;
  const allRevealed = words.length > 0 && words.every((w) => revealed[w.order]);

  const underlined = (w: Word): ReactNode => {
    const text = items[w.sentence]?.text ?? "";
    return (
      <>
        {text.slice(0, w.start)}
        <span className="font-semibold text-ink underline decoration-primary decoration-2 underline-offset-4">{text.slice(w.start, w.end)}</span>
        {text.slice(w.end)}
      </>
    );
  };

  function renderCard(w: Word) {
    const mark = practice.wordMarks[w.order];
    if (mark === "known" && !unfolded[w.order]) {
      return (
        <li key={w.order} data-vocab={w.order} data-mark="known">
          <button
            type="button"
            data-action="unfold"
            aria-expanded={false}
            onClick={() => setUnfolded((prev) => ({ ...prev, [w.order]: true }))}
            className="flex min-h-12 w-full items-center gap-2 px-4 text-left transition-colors cursor-pointer hover:bg-sunken"
          >
            <span lang="en" data-word-text className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
              {w.word}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-caption font-medium text-success">
              <IconCheck size={14} />
              알아요
            </span>
            <IconChevronDown className="shrink-0 text-ink-soft" />
          </button>
        </li>
      );
    }
    const isRevealed = revealed[w.order] === true;
    const saying = wordPlaying(w.order);
    return (
      <li key={w.order} data-vocab={w.order} data-mark={mark ?? ""} className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p lang="en" data-word-text className="text-title-s font-semibold text-ink [overflow-wrap:anywhere]">
              {w.word}
            </p>
            <p className="text-caption text-ink-faint">{w.pos}</p>
          </div>
          {!isRevealed ? (
            <button type="button" data-action="reveal" onClick={() => setRevealed((prev) => ({ ...prev, [w.order]: true }))} aria-label={`${w.word} 뜻 보기`} className={outlineButton}>
              뜻 보기
            </button>
          ) : null}
          <button
            type="button"
            data-action="word-audio"
            onClick={() => sayWord(w)}
            aria-label={saying ? `${w.word} 정지` : `${w.word} 듣기`}
            className={`${outlineButton} w-11 shrink-0 px-0`}
          >
            {saying ? <IconStop /> : <IconSpeaker />}
          </button>
        </div>
        <p lang="en" data-context className="text-label text-ink-soft">
          {underlined(w)}
        </p>
        {isRevealed ? (
          <>
            <p data-meaning className="text-body text-ink">
              {w.meaning}
            </p>
            <div role="group" aria-label={`${w.word} — 이 단어를 아나요?`} className="grid grid-cols-2 gap-2">
              {(["known", "unknown"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-action={m}
                  aria-pressed={mark === m}
                  onClick={() => setMark(w.order, m)}
                  className={
                    "flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-3 text-label font-semibold transition-colors cursor-pointer " +
                    (mark === m
                      ? m === "known"
                        ? "border-success bg-success/10 text-success"
                        : "border-danger bg-danger/10 text-danger"
                      : "border-line bg-raised text-ink hover:bg-sunken")
                  }
                >
                  {mark === m ? m === "known" ? <IconCheck size={14} /> : <IconX size={14} /> : null}
                  {m === "known" ? "알아요" : "몰라요"}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </li>
    );
  }

  /** the four choices of a blank, in an order fixed by the word (not reshuffled on each render) */
  const optionsOf = (w: Word) => {
    const text = items[w.sentence]?.text ?? "";
    const answer = text.slice(w.start, w.end);
    const capital = (s: string) => (w.start === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const all = [answer, ...w.choices.map(capital)];
    const turn = (w.order * 3 + w.sentence) % all.length;
    return { answer, options: [...all.slice(turn), ...all.slice(0, turn)] };
  };

  const pick = (w: Word, option: string, answer: string) => {
    if (picks[w.order] !== undefined) return;
    if (blankSet === null) setBlankSet(set); // the set stays as it is from the first answer on
    setPicks((prev) => ({ ...prev, [w.order]: option }));
    if (option === answer) setPractice((p) => (p.wordRight[w.order] ? p : { ...p, wordRight: { ...p.wordRight, [w.order]: true } }));
  };

  const newSet = () => {
    stopOthers();
    setBlankSet(null);
    setPicks({});
    setBlankIndex(0);
  };

  function renderBlank(w: Word) {
    const text = items[w.sentence]?.text ?? "";
    const { answer, options } = optionsOf(w);
    const picked = picks[w.order];
    const answered = picked !== undefined;
    const correct = picked === answer;
    const right = set.filter((o) => {
      const x = words[o];
      return x && picks[o] === optionsOf(x).answer;
    }).length;
    const last = blankIndex + 1 >= set.length;
    const playing = sentencePlaying(w.sentence);
    return (
      <div data-cloze data-order={w.order} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label tabular-nums text-ink-soft">
            {blankIndex + 1} / {set.length}
          </p>
          <p className="text-label tabular-nums text-ink-soft">맞힘 {right}</p>
        </div>
        <p data-masked lang="en" className="rounded-card border border-line bg-raised px-4 py-4 text-body text-ink">
          {text.slice(0, w.start)}
          <span className="inline-block min-w-16 border-b-2 border-ink-faint align-baseline">&nbsp;</span>
          {text.slice(w.end)}
        </p>
        <div role="group" aria-label="보기" className="grid grid-cols-2 gap-2">
          {options.map((opt, i) => {
            const isAnswer = opt === answer;
            const isPicked = picked === opt;
            const look = !answered
              ? "border-line bg-raised text-ink hover:bg-sunken cursor-pointer"
              : isAnswer
                ? "border-success bg-success/10 font-semibold text-success"
                : isPicked
                  ? "border-danger bg-danger/10 text-danger line-through"
                  : "border-line bg-raised text-ink-faint";
            return (
              <button
                key={`${w.order}-${i}`}
                type="button"
                data-option={i}
                disabled={answered}
                onClick={() => pick(w, opt, answer)}
                className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-control border px-4 py-2 text-left text-body transition-colors disabled:cursor-default ${look}`}
              >
                <span lang="en" className="min-w-0 [overflow-wrap:anywhere]">
                  {opt}
                </span>
                {answered && isAnswer ? <IconCheck className="shrink-0" /> : answered && isPicked ? <IconX className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>
        {answered ? (
          <div data-cloze-feedback={correct ? "correct" : "wrong"} role="status" className={"flex flex-col gap-2 border-l-2 pl-3 " + (correct ? "border-success" : "border-danger")}>
            <p className={"flex items-center gap-1.5 text-label font-semibold " + (correct ? "text-success" : "text-danger")}>
              {correct ? <IconCheck size={14} /> : <IconX size={14} />}
              {correct ? "맞았어요" : "틀렸어요"}
              {!correct ? (
                <span className="font-normal text-ink">
                  {" · 정답 "}
                  <span lang="en" className="font-semibold">
                    {answer}
                  </span>
                </span>
              ) : null}
            </p>
            <p data-filled lang="en" className="text-body text-ink">
              {underlined(w)}
            </p>
            {koParas[w.sentence] ? (
              <p data-cloze-ko lang="ko" className="text-label text-ink-soft">
                {koParas[w.sentence]}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" data-action="cloze-listen" onClick={() => toggleSentence(w.sentence)} className={outlineButton}>
                {playing ? <IconStop /> : <IconSpeaker />}
                <span>{playing ? "정지" : "문장 듣기"}</span>
              </button>
            </div>
          </div>
        ) : null}
        {answered ? (
          <button
            type="button"
            data-action="cloze-next"
            onClick={() => {
              stopOthers();
              setBlankIndex((i) => i + 1);
            }}
            className={`${filledButton} min-h-12 w-full`}
          >
            <span>{last ? "결과 보기" : "다음 문제"}</span>
            <IconChevronRight />
          </button>
        ) : null}
      </div>
    );
  }

  function renderResult() {
    const rows = set.map((o) => words[o]).filter((w): w is Word => Boolean(w));
    const right = rows.filter((w) => picks[w.order] === optionsOf(w).answer).length;
    return (
      <div data-cloze-result role="status" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-title-s font-semibold text-ink">빈칸 {rows.length}문제 끝</h4>
          <p className="text-label tabular-nums text-ink-soft">
            {right} / {rows.length} 맞힘
          </p>
        </div>
        <ul className="list-none divide-y divide-line rounded-card border border-line bg-raised">
          {rows.map((w) => {
            const ok = picks[w.order] === optionsOf(w).answer;
            return (
              <li key={w.order} className="flex items-center gap-2 px-4 py-2">
                <span className={"flex shrink-0 items-center " + (ok ? "text-success" : "text-danger")} aria-label={ok ? "맞음" : "틀림"}>
                  {ok ? <IconCheck size={16} /> : <IconX size={16} />}
                </span>
                <p className="min-w-0 flex-1 text-label text-ink">
                  <span lang="en" className="font-semibold">
                    {w.word}
                  </span>
                  <span className="text-ink-soft"> · {w.meaning}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <button type="button" data-action="cloze-again" onClick={newSet} className={`${filledButton} w-full`}>
          <IconRepeat />
          <span>다른 빈칸으로 다시 풀기</span>
        </button>
      </div>
    );
  }

  if (words.length === 0) {
    return <p className="text-label text-ink-soft">이 강의에는 핵심 어휘가 없어요. 다음 Step으로 넘어가세요.</p>;
  }
  const current = words[set[blankIndex] ?? -1];
  return (
    <>
      <p className="text-label text-ink-soft">
        뜻을 먼저 떠올려 본 뒤 &lsquo;뜻 보기&rsquo;를 누르고 알아요 · 몰라요를 표시하세요. 몰라요 단어는 아래 빈칸에 먼저 나와요.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p data-vocab-summary className="text-label tabular-nums text-ink-soft">
          알아요 {known} · 몰라요 {unknown} · 남은 단어 {Math.max(0, words.length - known - unknown)}
        </p>
        <button
          type="button"
          data-action="reveal-all"
          onClick={() => setRevealed(allRevealed ? {} : Object.fromEntries(words.map((w) => [w.order, true])))}
          className={quietButton}
        >
          {allRevealed ? "뜻 모두 가리기" : "뜻 모두 보기"}
        </button>
      </div>
      <ul className="flex list-none flex-col divide-y divide-line rounded-card border border-line bg-raised">{words.map(renderCard)}</ul>

      <div data-blanks className="mt-3 flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="text-body font-semibold text-ink">빈칸 채우기</h3>
        <p className="text-label text-ink-soft">빈칸에 들어갈 표현을 고르세요. 한 번에 {Math.min(SET_SIZE, words.length)}문제, 몰라요로 표시한 단어가 먼저 나와요.</p>
        {current ? renderBlank(current) : renderResult()}
      </div>
    </>
  );
}
