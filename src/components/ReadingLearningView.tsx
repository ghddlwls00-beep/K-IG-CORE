"use client";

/**
 * READING — one view for all 512 pages (256 lessons and their "-1" pages): Step 1 처음 읽기 · Step 2 핵심 어휘 · Step 3 원문 대조 ·
 * Step 4 다시 읽고 재기 (every tab still reads "Step N · name" — StepTabs; LessonStepNavigation and the audit drivers find it so).
 *
 * 2026-09-28 순서 바꿈 — 사장님 결정 D31 다 ("그 순서로 바꾸고"; docs/qa-2026-09-18/학습법-화면-0927/README.md '사장님 결정 (09-28)'):
 * READING no longer times a passage the learner has never read. Before: 1 속독 챌린지 (a timed first reading) · 2 핵심 어휘 ·
 * 3 독해 퀴즈 (the blanks) · 4 원문 대조 (+ '같은 글 다시 읽기'). Now:
 *   Step 1  처음 읽기 — the passage, read for meaning: no clock, no WPM, no target. A sentence plays and shows its Korean as before.
 *           '다 읽었어요' at the end of the passage records nothing and opens nothing; it offers '다음: Step 2 핵심 어휘' and the
 *           whole-lesson player (D01 나 — the player comes after the first reading). A learner who read the passage before (a timed
 *           record, the lesson completed) sees both at once.
 *   Step 2  핵심 어휘 — the key-word cards, then the blanks that were Step 3. Until the first answer of a set, the set follows the
 *           '몰라요' marks made on the cards above it (asked first in their part of the passage); from the first answer on it stays.
 *   Step 3  원문 대조 — the line-by-line view that was Step 4 (rows, views, dotted key words, the whole-lesson player), then the
 *           reading-aloud check (it sat with the blanks; D34 would make it this view's '따라 읽기') and the memo.
 *   Step 4  다시 읽고 재기 — the only timed reading, with the machinery Step 1 had (Timing below). The result is this run's time or
 *           WPM only: the first reading has no number now, so there is no 'A → B' and no percentage. Under it, the passage's two
 *           comprehension questions ([data-comprehension] — 2026-09-28 새 문제, LessonQuestions, the same component as LISTENING
 *           Step 1; hidden while the clock runs; a passage without a question file shows nothing there). The tab still says
 *           '다시 읽고 재기' (사장님: "들어오기 전엔 다시 읽고 재기만" — and a 360px phone has no room for more); the questions
 *           have their own heading '이해 문제'.
 * Completion (D02): '이 강의 학습 완료' opens after one timed reading in Step 4 — readingGateOpen (src/lib/readingLearning.ts): the
 * record's `again`, or an older record (the timed first reading of 09-27 ~ 28, an old best WPM of 1–500). The sentences, the
 * translations, every sound, the storage keys and the engine calls are unchanged; a "-1" page shares the main page's records.
 *
 * 2026-09-27 학습법 · 화면 고침 (사장님 "검토 결과대로 … 끝까지"; docs/qa-2026-09-18/학습법-화면-0927/reading-verified.md · 계획.md
 * G01–G05 · D01 · D02 · D31–D33 · D35) — all still so, under the new step numbers. speakText gets lessonSpeechForm(pageKey, sentence)
 * for a sentence and readingWordSpeech(word, meaning) for a key word, and the whole-lesson player is the page's own AudioPlayer with
 * the same sentences (the page hands them over as data — A10). By review item:
 *   Frame   no header card (RD-U07): the word count in Step 1's row, the target in Step 4's; the shared StepTabs (RD-U15); line
 *           icons, the colour tokens and the six text sizes (RD-U08 · U09 · U20); 44px controls (RD-U10); one 'Aa' menu — text
 *           size, sentence numbers, copy — remembered for every lesson (RD-U07); nothing changes on mouse-over (RD-U02).
 *   Passage (Step 1 — RD-U02 · U06 · U11) a sentence is a button (Enter/Space) that plays it and opens its Korean line under it on
 *           a phone, in a panel under the passage from sm. The playing sentence is underlined, not bold red. Text is selectable.
 *   Timing  (Step 4 — G01 · RD-L03 · L04 · U01 · U05 · U17) '읽기 시작' → the passage comes up under the header, numbers and
 *           sentence taps are off, '다 읽었어요' waits at the end of the passage; the time is performance.now() and stops while
 *           the page is hidden; faster than 500 WPM is explained and not saved; one line against the target (180 WPM) instead
 *           of grades; the one-sentence passages show the time only.
 *   Player  (D01 나 · G04 · RD-L07) never before the first reading: in Step 1 after it, and in Step 3; while it plays, its
 *           sentence is tinted (Step 1's passage, Step 3's English line) and kept in view.
 *   Cards   (Step 2 — G02 · D32 다 · RD-L05 · L15 · U13) one row per word — word 18 · part of speech and base form 12, '뜻 보기'
 *           and a speaker, the word's passage line with the word underlined; the meaning stays hidden until asked; then
 *           '알아요 / 몰라요' ('알아요' folds the row and it stays folded; '몰라요' words come first in the blanks and the review).
 *   Blanks  (Step 2 — G02 · D33 나 · RD-L06 · L13 · U14) one blank at a time from the lesson's key words — the start, the middle
 *           and the end of the passage; options 2×2 at 48px; after an answer the filled sentence, its translation and '문장 듣기';
 *           'n/3' and '다른 빈칸으로 다시 풀기'. Seeded by the lesson (readingUtils) — the same for every learner, never a
 *           romanized Korean word.
 *   Rows    (Step 3 — G03 · D32 다 · RD-U03 · U05 · U18 · U23 · L08) one row per sentence — number (plays it) | English | Korean,
 *           the Korean under the English on a phone; '영어만' puts '해석 보기' in each row instead of a bottom bar; key words are
 *           dotted — pressing one shows its meaning (a played row also lists them as buttons); the reading-aloud check, named for
 *           what it is (a romanized Korean word is any word to it — RD-L13 ④); the memo, folded, at the end.
 * A step change stops any sound and never starts one (사장님 2026-09-28). On this device and for the learning engine:
 * src/lib/readingLearning.ts (storage keys, what is kept, the engine's items). The data-* attributes are what the audit helpers
 * read (drive-reading.cjs · lib/containers.cjs · lib/reading-page.cjs · gap-checks-0926.cjs T · drive-common-0926.cjs D) — keep them.
 */

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { Block, ReadingSentence, ReadingVocabularyItem } from "@/lib/types";
import { getServerSpeechSnapshot, getSpeechSnapshot, speakText, stopSpeech, subscribeSpeech, unlockMobileAudio } from "@/lib/speech";
import { readingWordSpeech } from "@/lib/vocaSpeech";
import { LESSON_SPEECH_WORDS, lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { SHOW_GENERATED_QUIZ } from "@/lib/quizFlags";
import { markLessonDone, recordAttempt } from "@/lib/learning/record";
import { clearLessonGate, setLessonGate } from "@/lib/lessonGate";
import type { PassagePlayerData } from "@/lib/passagePlayer";
import type { LessonQuestion } from "@/lib/lessonQuestions";
import {
  contextSnippet,
  extractFullReadingPassage,
  extractPassageKeywords,
  findWordSpans,
  generateClozeItems,
  generateReadingQuiz,
  type ClozeItem,
  type KeyWord,
} from "@/lib/readingUtils";
import {
  PREFS_STORAGE_KEY,
  READING_GATE_REASON,
  READING_LEARNING_PROFILE,
  READING_MAX_WPM,
  READING_TARGET_WPM,
  clockElapsed,
  clockHide,
  clockShow,
  clockStart,
  formatApprox,
  formatClock,
  formatDuration,
  isTimeOnlyPassage,
  legacyBestCounts,
  legacyWpmStorageKey,
  parsePrefs,
  parseSpeedRecord,
  parseWordsRecord,
  posLabel,
  readingGateOpen,
  readingItemKey,
  readingMainId,
  reviewEntries,
  serializePrefs,
  serializeSpeedRecord,
  serializeWordsRecord,
  speedStorageKey,
  targetMs,
  targetVerdict,
  wordsPerMinute,
  wordsStorageKey,
  type PassageSize,
  type ReadingClockState,
  type ReadingPrefs,
  type SpeedRecord,
  type WordMark,
  type WordsRecord,
} from "@/lib/readingLearning";
import { AudioPlayer } from "./AudioPlayer";
import { LessonQuestions } from "./LessonQuestions";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import { StepTabs } from "./StepTabs";
import { IconCheck, IconChevronDown, IconChevronRight, IconRepeat, IconSpeaker, IconStop, IconX } from "./icons";
import { LESSON_COMPLETE_EVENT, useProgress } from "./ProgressProvider";

interface ReadingLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
  readingSentences?: ReadingSentence[] | null;
  readingVocabulary?: ReadingVocabularyItem[] | null;
  /** 2026-09-27 (계획 A10 · D01 나): the page's whole-lesson player as data — offered after the first reading (Step 1) and in
   *  원문 대조 (Step 3 since 2026-09-28) */
  passagePlayers?: PassagePlayerData[] | null;
  /** 2026-09-27 (유출 규칙): this lesson's reviewed 'also fits' blank pairs, worked out on the server (readingClozeFitsForLesson) */
  clozeAlsoFits?: Record<string, string[]> | null;
  /** 2026-09-28 새 문제: this passage's comprehension questions, read on the server after the access check (lessonQuestions.ts) */
  lessonQuestions?: LessonQuestion[] | null;
}

type StepNo = 1 | 2 | 3 | 4;
/**
 * 2026-09-28 (사장님 D31 다): 1 처음 읽기 → 2 핵심 어휘 → 3 원문 대조 → 4 다시 읽고 재기 (+ 이해 문제). Step 4 is named for what it
 * does today — "들어오기 전엔 다시 읽고 재기만" — and '· 이해 문제' is not a tab name a learner meets before any question exists;
 * it is also too long for a 360px phone's tab row, where the current tab has about 176px (LISTENING keeps short tab names for
 * the same reason). When the questions come, their part of Step 4 gets its own heading.
 */
const STEPS: { n: StepNo; name: string }[] = [
  { n: 1, name: "처음 읽기" },
  { n: 2, name: "핵심 어휘" },
  { n: 3, name: "원문 대조" },
  { n: 4, name: "다시 읽고 재기" },
];

// the button kinds of the course views (GrammarLearningView · StudentLearningView · PhonicsLearningView), 44px
const filledButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const iconButton =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink";
const segmentButton = (on: boolean) =>
  "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-control px-2 text-label transition-colors cursor-pointer " +
  (on ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:bg-raised/60");

/** The passage sizes of the 'Aa' menu — English and the Korean line beside it (the six-size scale: 16/14 · 18/16 · 22/18). */
const SIZE_CLASS: Record<PassageSize, { en: string; ko: string }> = {
  normal: { en: "text-body", ko: "text-label" },
  large: { en: "text-title-s", ko: "text-body" },
  xlarge: { en: "text-title", ko: "text-title-s" },
};
const SIZE_LABEL: Record<PassageSize, string> = { normal: "보통", large: "크게", xlarge: "특대" };
const REGION_LABEL = ["글 앞", "글 중간", "글 끝"] as const;

/** The orders of the words marked '몰라요', in order — what a set of blanks asks first in its part of the passage. */
function unknownOf(marks: Record<number, WordMark>): number[] {
  return Object.entries(marks)
    .filter(([, mark]) => mark === "unknown")
    .map(([order]) => Number(order))
    .sort((a, b) => a - b);
}

/** A tinted sentence (selected, or the one the whole-lesson player is reading); playing alone adds the underline (RD-U06). */
const TINT = "bg-primary-soft";
const PLAYING_MARK = "bg-primary-soft underline decoration-primary decoration-2 underline-offset-4";

function headerHeight(): number {
  if (typeof window === "undefined") return 56;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
}

/** Scroll so `y` (a page offset) is at the top — instantly when it is more than 1.5 screens away or motion is reduced. */
function scrollPageTo(y: number) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const far = Math.abs(y - window.scrollY) > window.innerHeight * 1.5;
  window.scrollTo({ top: Math.max(0, y), behavior: reduce || far ? "auto" : "smooth" });
}

/** Bring `el` under the sticky header when it is off screen — the smallest move that shows it ("nearest"). */
function keepInView(el: Element | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const top = headerHeight() + 8;
  const bottom = window.innerHeight - 8;
  if (r.top >= top && r.bottom <= bottom) return;
  const delta = r.top < top || r.height > bottom - top ? r.top - top : r.bottom - bottom;
  scrollPageTo(window.scrollY + delta);
}

/**
 * The timed reading in progress — Step 4 '다시 읽고 재기', the only one since 2026-09-28 (Step 1 is no longer timed). Its clock
 * stands still while the page is hidden.
 */
interface ReadingRun {
  clock: ReadingClockState;
}

interface RunOutcome {
  wpm: number;
  ms: number;
  hiddenMs: number;
  tooFast: boolean;
}

/** The clock of a timed reading — its own small component, so the 250 ms tick does not re-render the view. */
const ReadingClock = memo(function ReadingClock({ read }: { read: () => number }) {
  const [text, setText] = useState(() => formatClock(read()));
  useEffect(() => {
    const timer = window.setInterval(() => setText(formatClock(read())), 250);
    return () => window.clearInterval(timer);
  }, [read]);
  return <span className="tabular-nums">{text}</span>;
});

/** The 'Aa' menu — text size, sentence numbers, copying the passage (RD-U07). Remembered for every READING lesson. */
function ViewMenu({
  prefs,
  onChange,
  onCopy,
  copied,
}: {
  prefs: ReadingPrefs;
  onChange: (next: ReadingPrefs) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        type="button"
        data-action="view-menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="보기 설정 — 글자 크기 · 문장 번호 · 지문 복사"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-control border border-line bg-raised text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
      >
        <span aria-hidden>Aa</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label="보기 설정"
          className="absolute right-0 top-full z-30 mt-2 flex w-64 flex-col gap-3 rounded-card border border-line bg-raised p-3 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            <p className="text-caption text-ink-soft">글자 크기</p>
            <div className="flex gap-1 rounded-control bg-sunken p-1" role="group" aria-label="글자 크기">
              {(["normal", "large", "xlarge"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  data-size={size}
                  aria-pressed={prefs.size === size}
                  onClick={() => onChange({ ...prefs, size })}
                  className={segmentButton(prefs.size === size)}
                >
                  {SIZE_LABEL[size]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.numbers}
            data-action="toggle-numbers"
            onClick={() => onChange({ ...prefs, numbers: !prefs.numbers })}
            className="flex min-h-11 items-center justify-between gap-2 rounded-control px-1 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
          >
            <span>문장 번호</span>
            <span aria-hidden className={"relative inline-block h-5 w-9 rounded-full transition-colors " + (prefs.numbers ? "bg-ink" : "bg-line-strong/25")}>
              <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-2xs transition-[left] " + (prefs.numbers ? "left-[18px]" : "left-0.5")} />
            </span>
          </button>
          <button type="button" data-action="copy-passage" onClick={onCopy} className={`${outlineButton} w-full`}>
            {copied ? <IconCheck /> : null}
            <span>{copied ? "복사했어요" : "지문 복사"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReadingLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  vocaDictionary = null,
  readingSentences = null,
  readingVocabulary = null,
  passagePlayers = null,
  clozeAlsoFits = null,
  lessonQuestions = null,
}: ReadingLearningViewProps) {
  const pageId = lessonKey.split("/").pop() || lessonKey;
  /** the main page's id — a "-1" page shares its passage, its words, its records and its engine items */
  const mainId = readingMainId(pageId);
  const mainKey = `reading/${mainId}`;
  const { isCompleted } = useProgress();
  const lessonCompleted = isCompleted("reading", pageId);

  // ------------------------------------------------------------------------------------------------------------
  // The lesson: the 1:1 sentence pairs (the server passes them after the licence check — ISS-00: never an
  // all-lessons data file here) and the 14 key words
  // ------------------------------------------------------------------------------------------------------------
  const mainText = extractFullReadingPassage(blocks);
  const pairText = extractFullReadingPassage(pairBlocks);
  const mainIsEn = isEnglish(mainText);
  const enPassageFallback = mainIsEn ? mainText : pairText;
  const koPassageFallback = mainIsEn ? pairText : mainText;

  const sentencePairs = useMemo(() => {
    if (readingSentences && readingSentences.length > 0) {
      return readingSentences.map((s, idx) => ({ id: s.id, index: idx, en: s.english, ko: s.korean }));
    }
    const enSents = splitSentences(enPassageFallback);
    const koSents = splitSentences(koPassageFallback);
    return alignSentences(enSents, koSents).map((s, idx) => ({ id: `fallback-s${idx + 1}`, index: idx, en: s.en, ko: s.ko }));
  }, [readingSentences, enPassageFallback, koPassageFallback]);

  const enPassage = useMemo(
    () => (sentencePairs.length > 0 ? sentencePairs.map((s) => s.en).join(" ") : enPassageFallback),
    [sentencePairs, enPassageFallback],
  );
  const koPassage = useMemo(
    () => (sentencePairs.length > 0 ? sentencePairs.map((s) => s.ko).join(" ") : koPassageFallback),
    [sentencePairs, koPassageFallback],
  );
  const wordCount = useMemo(() => enPassage.trim().split(/\s+/).filter(Boolean).length, [enPassage]);
  const timeOnly = isTimeOnlyPassage(sentencePairs.length);

  // Every lesson carries 14 cards (RD-L05 ④ — the condition changes only with the data)
  const keywords: KeyWord[] = useMemo(() => {
    if (readingVocabulary && readingVocabulary.length === 14) {
      return readingVocabulary.map((v) => ({
        word: v.word,
        pos: v.partOfSpeech,
        meaning: v.korean,
        lemma: v.lemma,
        score: v.score,
        reason: v.reason,
        examTags: v.examTags,
        freq: v.freq,
      }));
    }
    return extractPassageKeywords(enPassage, 14, vocaDictionary);
  }, [readingVocabulary, enPassage, vocaDictionary]);

  /** each key word's first passage line, as a short piece with the word in it (Step 2 — D32 · RD-L05 ②) */
  const contexts = useMemo(
    () =>
      keywords.map((kw) => {
        for (const pair of sentencePairs) {
          const spans = findWordSpans(pair.en, kw.word);
          if (spans.length) return contextSnippet(pair.en, spans[0], 48);
        }
        return null;
      }),
    [keywords, sentencePairs],
  );

  /** the key words in each sentence — the dotted words of 원문 대조 (Step 3 since 2026-09-28 · D32 다 · RD-L08) */
  const keywordMarks = useMemo(
    () =>
      sentencePairs.map((pair) => {
        const found = keywords
          .flatMap((kw, k) => findWordSpans(pair.en, kw.word).map(([start, end]) => ({ start, end, order: k + 1 })))
          .sort((a, b) => a.start - b.start || b.end - a.end);
        const kept: typeof found = [];
        for (const m of found) if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
        return kept;
      }),
    [keywords, sentencePairs],
  );

  /**
   * KIG-008 — the auto-generated comprehension questions stay off (quizFlags.ts; 208 of 256 lessons had a wrong answer key).
   * The call site is kept behind the flag, so turning it back on is one edit. Reviewed questions are a later stage and do
   * not belong behind this flag (RD-L02).
   */
  const questions = useMemo(
    () => (SHOW_GENERATED_QUIZ ? generateReadingQuiz(enPassage, koPassage, lessonKey) : []),
    [enPassage, koPassage, lessonKey],
  );

  const ownsPlayer = Boolean(passagePlayers && passagePlayers.length > 0);
  const playerAligned = Boolean(passagePlayers && passagePlayers[0] && passagePlayers[0].fallbackSentences.length === sentencePairs.length);

  // ------------------------------------------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------------------------------------------
  const [step, setStep] = useState<StepNo>(1);
  const [prefs, setPrefs] = useState<ReadingPrefs>({ size: "normal", numbers: true });
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [seenCompleted, setSeenCompleted] = useState(false);

  // sound — one key at a time: "s:<sentence index>" or "w:<word order>"
  const [playing, setPlaying] = useState<string | null>(null);
  const playingSawRef = useRef(false);

  // Step 1 — the first reading ('다 읽었어요' on this visit; it is not timed and not stored — readOnce below also counts records)
  const [firstReadDone, setFirstReadDone] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // Step 4 — the timed reading (the record's `again`; `first` is an older record, read only)
  const [speed, setSpeed] = useState<SpeedRecord>({ first: null, again: null });
  const [legacyRead, setLegacyRead] = useState(false);
  const [running, setRunning] = useState(false);
  const runRef = useRef<ReadingRun | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  // Step 2 — the cards
  const [words, setWords] = useState<WordsRecord>({ marks: {}, missed: [] });
  const wordsRef = useRef<WordsRecord>(words);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [unfolded, setUnfolded] = useState<Record<number, boolean>>({});
  const answeredRef = useRef<Set<number>>(new Set());

  // Step 2 — the blanks, one at a time (Step 3 until 2026-09-28)
  const [clozeRound, setClozeRound] = useState(0);
  const [clozeUnknown, setClozeUnknown] = useState<number[]>([]);
  const [clozeIndex, setClozeIndex] = useState(0);
  const [clozePicks, setClozePicks] = useState<Record<number, number>>({});
  // Step 4 — the generated quiz's answers (SHOW_GENERATED_QUIZ — off)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // Step 3 — 원문 대조 (Step 4 until 2026-09-28)
  const [dualView, setDualView] = useState<"both" | "en" | "ko">("both");
  const [shownKo, setShownKo] = useState<Record<number, boolean>>({});
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [gloss, setGloss] = useState<{ row: number; order: number } | null>(null);

  // the memo (kept exactly as it was stored — kig:reading:notes:<page key>)
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notesRestored, setNotesRestored] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const lastSavedNotesRef = useRef<string | null>(null);
  const notesStorageKey = `kig:reading:notes:${lessonKey}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const passageRef = useRef<HTMLDivElement | null>(null);
  const firstReadRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const lastUserScrollRef = useRef(0);

  // a lesson seen completed on this screen stays completable after '완료 취소' (like VOCA · STUDENT); adjusted while rendering
  if (lessonCompleted && !seenCompleted) setSeenCompleted(true);

  /**
   * The learner has read this passage once: '다 읽었어요' in Step 1 on this visit, or a record from before (a timed reading, an old
   * best WPM, the lesson completed). Step 1 then offers '다음: Step 2' and the whole-lesson player (D01 나 — never before it).
   */
  const readOnce = firstReadDone || Boolean(speed.first || speed.again) || legacyRead || lessonCompleted || seenCompleted;

  // ------------------------------------------------------------------------------------------------------------
  // This device's records (src/lib/readingLearning.ts) — read once per lesson
  // ------------------------------------------------------------------------------------------------------------
  useEffect(() => {
    let speedRaw: string | null = null;
    let wordsRaw: string | null = null;
    let prefsRaw: string | null = null;
    let legacy = false;
    try {
      speedRaw = window.localStorage.getItem(speedStorageKey(mainId));
      wordsRaw = window.localStorage.getItem(wordsStorageKey(mainId));
      prefsRaw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      legacy =
        legacyBestCounts(window.localStorage.getItem(legacyWpmStorageKey(`reading/${mainId}`))) ||
        legacyBestCounts(window.localStorage.getItem(legacyWpmStorageKey(lessonKey)));
    } catch {
      // storage unavailable: the lesson works, nothing is remembered
    }
    setSpeed(parseSpeedRecord(speedRaw));
    const record = parseWordsRecord(wordsRaw, keywords.length);
    wordsRef.current = record;
    setWords(record);
    // the first set of blanks (Step 2) asks the words kept as '몰라요' first
    setClozeUnknown(unknownOf(record.marks));
    setPrefs(parsePrefs(prefsRaw));
    setLegacyRead(legacy);
    setLoaded(true);
  }, [mainId, lessonKey, keywords.length]);

  useEffect(() => {
    let restoredNotes = "";
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (raw) {
        const data = JSON.parse(raw);
        restoredNotes = data.notes || "";
        setNotes(restoredNotes);
        setSavedAt(data.at || null);
      }
    } catch {
      // ignore
    }
    lastSavedNotesRef.current = restoredNotes;
    // a memo that holds something is shown open (RD-U18 — folded only when empty)
    setMemoOpen(restoredNotes.length > 0);
    setNotesRestored(true);
  }, [notesStorageKey]);

  useEffect(() => {
    if (!notesRestored || notes === lastSavedNotesRef.current) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
        window.localStorage.setItem(notesStorageKey, JSON.stringify({ notes, at }));
        lastSavedNotesRef.current = notes;
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, notesStorageKey, notesRestored]);

  const changePrefs = (next: ReadingPrefs) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, serializePrefs(next));
    } catch {
      // ignore
    }
  };

  const commitWords = useCallback(
    (next: WordsRecord) => {
      wordsRef.current = next;
      setWords(next);
      try {
        window.localStorage.setItem(wordsStorageKey(mainId), serializeWordsRecord(next));
      } catch {
        // ignore
      }
    },
    [mainId],
  );

  // ------------------------------------------------------------------------------------------------------------
  // The common learning engine — the only two calls this view makes (공통-학습-엔진.md §2 · §5)
  // ------------------------------------------------------------------------------------------------------------
  const noteAttempt = useCallback(
    (order: number, correct: boolean, answer?: string) => {
      const firstTry = !answeredRef.current.has(order);
      answeredRef.current.add(order);
      try {
        recordAttempt(READING_LEARNING_PROFILE, readingItemKey(mainId, order), {
          lessonId: mainId,
          kind: "word",
          correct,
          help: "none",
          mode: "tap",
          where: "lesson",
          firstTry,
          ...(answer ? { answer } : {}),
        });
      } catch {
        // storage unavailable: the lesson works, only the review forgets
      }
    },
    [mainId],
  );

  // The lesson is finished (LessonEndBar → ProgressProvider.toggleComplete announces it): the '몰라요' words and the words of
  // missed blanks come back from the next day (공통-학습-엔진.md §5). Un-completing keeps the record.
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ course?: string; lessonId?: string; completed?: boolean }>).detail;
      if (!detail || detail.course !== "reading" || detail.lessonId !== pageId || !detail.completed) return;
      try {
        markLessonDone(READING_LEARNING_PROFILE, mainId, reviewEntries(mainId, wordsRef.current));
      } catch {
        // storage unavailable: the lesson is complete; only the review forgets
      }
    };
    window.addEventListener(LESSON_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(LESSON_COMPLETE_EVENT, onComplete);
  }, [pageId, mainId]);

  // D02 (2026-09-28, after the reorder): '이 강의 학습 완료' opens after one timed reading in Step 4 — readingGateOpen, where an
  // older record counts too — or when the lesson was completed. Step 1's '다 읽었어요' does not open it. lessonGate
  const gateReady = readingGateOpen(speed, legacyRead) || lessonCompleted || seenCompleted;
  useEffect(() => {
    if (!loaded) return;
    setLessonGate("reading", pageId, { ready: gateReady, reason: READING_GATE_REASON });
  }, [loaded, gateReady, pageId]);
  useEffect(() => () => clearLessonGate("reading", pageId), [pageId]);

  // ------------------------------------------------------------------------------------------------------------
  // Sound — a sentence is lessonSpeechForm(pageKey, sentence) and a word readingWordSpeech(word, meaning), as always
  // ------------------------------------------------------------------------------------------------------------
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);
  // the whole-lesson player reads the passage's sentences in order (page.tsx fallbackSentences), so its place is the sentence's
  const queueIndex = playerAligned && speech.speaking && speech.total === sentencePairs.length && speech.index >= 0 ? speech.index : -1;

  // a single sound that ended or was stopped elsewhere (the player, another step, the screen going off) clears its mark
  useEffect(() => {
    if (!playing) {
      playingSawRef.current = false;
      return;
    }
    if (speech.total > 0) {
      setPlaying(null);
      return;
    }
    if (speech.speaking) playingSawRef.current = true;
    else if (playingSawRef.current) {
      playingSawRef.current = false;
      setPlaying(null);
    }
  }, [speech.speaking, speech.total, playing]);

  const stopAll = useCallback(() => {
    stopSpeech();
    setPlaying(null);
  }, []);

  useEffect(() => () => stopSpeech(), []);

  const playSentence = (i: number, toggle = true) => {
    const pair = sentencePairs[i];
    if (!pair?.en) return;
    const key = `s:${i}`;
    if (toggle && playing === key) {
      stopAll();
      return;
    }
    stopSpeech();
    playingSawRef.current = false;
    setPlaying(key);
    // a Korean word written in romanization ('Jikji', 'hanji') is said in Korean (lessonSpeechForm — 소유자 결정 2026-09-25)
    speakText(lessonSpeechForm(lessonKey, pair.en), {
      lang: "en",
      rate: 0.95,
      onEnd: () => setPlaying((cur) => (cur === key ? null : cur)),
      onError: () => setPlaying((cur) => (cur === key ? null : cur)),
    });
  };

  const playWord = (order: number) => {
    const kw = keywords[order - 1];
    if (!kw?.word) return;
    const key = `w:${order}`;
    if (playing === key) {
      stopAll();
      return;
    }
    stopSpeech();
    playingSawRef.current = false;
    setPlaying(key);
    // BUG-029: a word whose pronunciation depends on the meaning is said as the card's meaning
    speakText(readingWordSpeech(kw.word, kw.meaning), {
      lang: "en",
      rate: 0.9,
      onEnd: () => setPlaying((cur) => (cur === key ? null : cur)),
      onError: () => setPlaying((cur) => (cur === key ? null : cur)),
    });
  };

  // A learner scrolling by hand is not pulled back for 2 s (like STUDENT — STU-U09)
  useEffect(() => {
    const mark = () => {
      lastUserScrollRef.current = Date.now();
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) mark();
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // G04: while the whole lesson plays, its sentence stays in view (the smallest move — "nearest"). The player is in Step 1 (after
  // the first reading) and in Step 3 (원문 대조) since 2026-09-28.
  useEffect(() => {
    if (queueIndex < 0 || running || (step !== 1 && step !== 3)) return;
    if (Date.now() - lastUserScrollRef.current < 2000) return;
    const id = sentencePairs[queueIndex]?.id;
    if (!id) return;
    keepInView(rootRef.current?.querySelector(`[data-step-panel="${step}"] [data-sentence-id="${CSS.escape(id)}"]`) ?? null);
  }, [queueIndex, running, step, sentencePairs]);

  // ------------------------------------------------------------------------------------------------------------
  // The timed reading — Step 4 only since 2026-09-28 (G01 · D31 다 · RD-L04) — performance.now(), paused while the page is hidden
  // ------------------------------------------------------------------------------------------------------------
  const readElapsed = useCallback(() => {
    const run = runRef.current;
    return run ? clockElapsed(run.clock, performance.now()) : 0;
  }, []);

  useEffect(() => {
    if (!running) return;
    const onVisibility = () => {
      const run = runRef.current;
      if (!run) return;
      if (document.visibilityState === "hidden") clockHide(run.clock, performance.now());
      else clockShow(run.clock, performance.now());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running]);

  /** the passage's top under the header (G01 — "시작하면 지문 맨 위가 머리줄 밑에") */
  const bringPassageUp = () => {
    window.requestAnimationFrame(() => {
      const el = passageRef.current;
      if (!el) return;
      scrollPageTo(el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8);
    });
  };

  const startRun = () => {
    unlockMobileAudio();
    stopAll();
    setSelected(null);
    setActiveRow(null);
    setGloss(null);
    setOutcome(null);
    runRef.current = { clock: clockStart(performance.now()) };
    setRunning(true);
    bringPassageUp();
  };

  const cancelRun = () => {
    runRef.current = null;
    setRunning(false);
  };

  const finishRun = () => {
    const run = runRef.current;
    if (!run) return;
    const ms = readElapsed();
    runRef.current = null;
    setRunning(false);
    const wpm = wordsPerMinute(wordCount, ms);
    const tooFast = wpm > READING_MAX_WPM;
    setOutcome({ wpm, ms, hiddenMs: run.clock.hiddenMs, tooFast });
    if (!tooFast) {
      // the record's `again` ('다시 읽기'); an older `first` stays as it was (it still opens the completion — readingGateOpen)
      const next: SpeedRecord = { ...speed, again: { wpm, ms: Math.round(ms), at: new Date().toISOString() } };
      setSpeed(next);
      try {
        window.localStorage.setItem(speedStorageKey(mainId), serializeSpeedRecord(next));
      } catch {
        // storage unavailable: the result shows; it is not kept
      }
    }
    // the passage closes and the result (or the reason it was not kept) takes its place — keep it on screen
    window.requestAnimationFrame(() => keepInView(resultRef.current));
  };

  /** Step 1's '다 읽었어요' — nothing is timed or stored; what comes next appears under the passage and is kept in view */
  const finishFirstRead = () => {
    setFirstReadDone(true);
    window.requestAnimationFrame(() => keepInView(firstReadRef.current));
  };

  // ------------------------------------------------------------------------------------------------------------
  // Steps
  // ------------------------------------------------------------------------------------------------------------
  const unknownOrders = useMemo(() => unknownOf(words.marks), [words.marks]);

  // A step change stops the sound and never starts one (사장님 2026-09-28). The blanks follow the '몰라요' marks by themselves
  // now that they share Step 2 with the cards (clozeItems below) — the step change no longer seeds them.
  const switchStep = (n: StepNo) => {
    if (n === step) return;
    stopAll();
    if (runRef.current) cancelRun();
    setSelected(null);
    setGloss(null);
    setActiveRow(null);
    setStep(n);
  };

  /**
   * A button that moves to another step presses that step's tab (계획 G05), so the step bar below (LessonStepNavigation,
   * which follows the tab presses) moves with it, and brings the new step's top under the header.
   */
  const goToStep = (n: StepNo) => {
    const tab = rootRef.current?.querySelector<HTMLButtonElement>(`[data-step-tab="${n}"]`);
    if (tab) tab.click();
    else switchStep(n);
    window.requestAnimationFrame(() => {
      const start = rootRef.current?.querySelector<HTMLElement>("[data-step-start]");
      if (start && start.getBoundingClientRect().top < headerHeight()) {
        scrollPageTo(start.getBoundingClientRect().top + window.scrollY - headerHeight() - 8);
      }
    });
  };

  const copyPassage = () => {
    if (!enPassage || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(enPassage)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  // ------------------------------------------------------------------------------------------------------------
  // Pieces
  // ------------------------------------------------------------------------------------------------------------
  const size = SIZE_CLASS[prefs.size];

  const speakerButton = (label: string, key: string, onPress: () => void, action?: string) => {
    const on = playing === key;
    return (
      <button
        type="button"
        data-action={action}
        onClick={onPress}
        aria-label={on ? `${label} 정지` : `${label} 듣기`}
        className={iconButton + (on ? " border-ink/40 text-ink" : "")}
      >
        {on ? <IconStop /> : <IconSpeaker />}
      </button>
    );
  };

  const pressSentence = (i: number) => {
    if (running) return;
    if (selected === i) {
      setSelected(null);
      if (playing === `s:${i}`) stopAll();
      return;
    }
    setSelected(i);
    playSentence(i, false);
  };

  /**
   * The passage as flowing text — Step 1 '처음 읽기' ("step1"), and Step 4 while it is timed ("timed", only while the clock runs,
   * so it cannot be read before '읽기 시작'). A sentence is a button: inline, with vertical padding so its pressable box is at least
   * 44px tall without moving the lines (the passage keeps a loose line height); its text carries the tint. While timing: plain
   * text, no numbers, no taps (RD-U01 ④). Step 1 is never timed (2026-09-28): its passage ends with '다 읽었어요', which only
   * says the first reading is over.
   */
  const renderPassage = (where: "step1" | "timed") => {
    const timing = where === "timed";
    return (
      <div
        ref={passageRef}
        data-passage={where}
        className="rounded-card border border-line bg-raised px-4 py-4 sm:px-6 sm:py-5"
      >
        {timing ? (
          // one slim line, so the passage's first line still comes up right under the header (G01 — y ≤ 120)
          <p className="mb-1 text-label font-medium text-ink-soft" role="status">
            읽는 중 · <ReadingClock read={readElapsed} />
          </p>
        ) : null}
        <div lang="en" className={`${size.en} font-serif leading-loose text-left text-ink sm:max-w-[68ch]`}>
          {sentencePairs.map((pair, i) => {
            const learnFirst = where === "step1" && i === 0 ? "" : undefined;
            if (timing) {
              return (
                <Fragment key={pair.id}>
                  <span data-sentence-id={pair.id} data-learn-first={learnFirst} className="px-1.5 py-3.5">
                    <span data-en>{pair.en}</span>
                  </span>{" "}
                </Fragment>
              );
            }
            const isSelected = selected === i;
            const isPlaying = playing === `s:${i}`;
            const isCurrent = queueIndex === i;
            return (
              <Fragment key={pair.id}>
                <span
                  role="button"
                  tabIndex={0}
                  data-sentence-id={pair.id}
                  data-learn-first={learnFirst}
                  aria-pressed={isSelected}
                  onClick={() => pressSentence(i)}
                  onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      // the top player listens for Space on the window — this press is the sentence's (RD-U02 CHECK)
                      event.preventDefault();
                      event.stopPropagation();
                      pressSentence(i);
                    }
                  }}
                  className="cursor-pointer rounded-control px-1.5 py-3.5"
                >
                  {prefs.numbers ? (
                    <sup aria-hidden className="mr-0.5 font-sans text-caption tabular-nums text-ink-faint">
                      {i + 1}
                    </sup>
                  ) : null}
                  <span data-en className={`box-decoration-clone rounded-sm ${isPlaying ? PLAYING_MARK : isSelected || isCurrent ? TINT : ""}`}>
                    {pair.en}
                  </span>
                </span>{" "}
                {isSelected ? (
                  // a phone opens the Korean line right under the sentence (RD-U11); from sm it is in the panel below
                  <span data-ko-line lang="ko" className="my-1 block rounded-control bg-sunken px-3 py-2 font-sans text-label text-ink sm:hidden">
                    {pair.ko}
                  </span>
                ) : null}
              </Fragment>
            );
          })}
        </div>
        {timing ? (
          // where the reading ends — the eyes are already here (RD-U01 ②)
          <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center">
            <button type="button" data-action="finish-reading" onClick={finishRun} className={`${filledButton} min-h-12 w-full sm:w-auto sm:px-6`}>
              <IconCheck />
              <span>다 읽었어요</span>
            </button>
            <button type="button" data-action="cancel-reading" onClick={cancelRun} className={`${quietButton} w-full sm:w-auto`}>
              그만두기
            </button>
          </div>
        ) : loaded && !readOnce ? (
          // the first reading ends here too — nothing is timed or kept; it offers the next step and the player
          <div className="mt-3">
            <button type="button" data-action="first-read-done" onClick={finishFirstRead} className={`${filledButton} min-h-12 w-full sm:w-auto sm:px-6`}>
              <IconCheck />
              <span>다 읽었어요</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  /** one line against the target (RD-L04 ② — instead of the grades '최상위 속독 수준' …, whose steps did not match the target) */
  const verdictLine = (wpm: number) => {
    const verdict = targetVerdict(wpm);
    if (timeOnly) {
      const goal = formatApprox(targetMs(wordCount));
      return verdict === "faster" ? `목표 시간(약 ${goal})보다 빨라요.` : verdict === "slower" ? `목표 시간(약 ${goal})보다 오래 걸렸어요.` : `목표 시간(약 ${goal})과 비슷해요.`;
    }
    const goal = `1분에 ${READING_TARGET_WPM}단어`;
    return verdict === "faster" ? `목표(${goal})보다 빨라요.` : verdict === "slower" ? `목표(${goal})보다 느려요.` : `목표(${goal})와 비슷해요.`;
  };

  const tooFastNotice = (o: RunOutcome) => (
    <p data-too-fast role="status" className="border-l-2 border-danger pl-3 text-label text-ink">
      이해하며 읽기엔 너무 빨라요 — 1분에 {READING_MAX_WPM}단어를 넘었어요({formatDuration(o.ms)}). 끝까지 읽은 뒤 &lsquo;다 읽었어요&rsquo;를 눌러
      주세요. 이번 기록은 저장하지 않았어요.
    </p>
  );

  const hiddenNote = (o: RunOutcome | null) =>
    o && o.hiddenMs >= 500 ? <p className="text-caption text-ink-soft">다른 화면에 있던 {formatDuration(o.hiddenMs)}는 빼고 쟀어요.</p> : null;

  const playerBlock = (where: "step1" | "step3") =>
    ownsPlayer && passagePlayers ? (
      // the page's whole-lesson player, here (A10 · D01 나) — the same sentences and voice as the top one, which is hidden
      <div data-reading-player={where} className="flex flex-col gap-1.5">
        <p className="text-label text-ink-soft">{where === "step1" ? "이제 들으며 다시 읽어 보세요." : "들으면서 읽으면 지금 문장에 색이 칠해져요."}</p>
        {passagePlayers.map((p) => (
          <AudioPlayer key={p.id} src={p.src} fallbackSentences={p.fallbackSentences} lang={p.lang} gender={p.gender} label={p.label} />
        ))}
      </div>
    ) : null;

  // --- Step 1 · 처음 읽기 (not timed — 2026-09-28) --------------------------------------------------------------------
  function renderStep1() {
    return (
      <section data-step-panel="1" aria-label="처음 읽기" className="flex flex-col gap-3">
        <p className="text-label text-ink-soft">
          {readOnce
            ? "문장을 누르면 해석과 소리가 나와요."
            : "뜻을 파악하며 끝까지 읽으세요. 막히는 문장은 누르면 해석과 소리가 나와요. 다 읽으면 '다 읽었어요'를 누르세요."}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p data-passage-meta="first" className="text-label tabular-nums text-ink-soft">
            {wordCount}단어 · {sentencePairs.length}문장
          </p>
          <ViewMenu prefs={prefs} onChange={changePrefs} onCopy={copyPassage} copied={copied} />
        </div>

        {renderPassage("step1")}

        <div data-ko-panel className="hidden min-h-12 sm:block" aria-live="polite">
          {selected !== null && sentencePairs[selected] ? (
            <div className="flex items-start gap-3 rounded-card border border-line bg-raised px-4 py-2">
              <span className="pt-2.5 text-label font-semibold tabular-nums text-ink-soft">{selected + 1}</span>
              <p lang="ko" className="min-w-0 flex-1 py-2 text-body text-ink">
                {sentencePairs[selected].ko}
              </p>
              {speakerButton(`${selected + 1}번 문장`, `s:${selected}`, () => playSentence(selected))}
            </div>
          ) : null}
        </div>

        {readOnce ? (
          <div ref={firstReadRef} data-first-read role="status" className="flex flex-col gap-2 rounded-card border border-line bg-raised px-4 py-4">
            <p className="text-label text-ink">처음 읽기를 마쳤어요. 다음 단계에서 이 글의 핵심 어휘를 익혀요.</p>
            <button type="button" data-action="to-step2" onClick={() => goToStep(2)} className={`${filledButton} sm:self-start`}>
              <span>다음: Step 2 핵심 어휘</span>
              <IconChevronRight />
            </button>
          </div>
        ) : null}

        {readOnce ? playerBlock("step1") : null}
      </section>
    );
  }

  // --- Step 2 ------------------------------------------------------------------------------------------------------
  const setMark = (order: number, mark: WordMark) => {
    const cur = wordsRef.current;
    if (cur.marks[order] === mark) return;
    const next: WordsRecord = { ...cur, marks: { ...cur.marks, [order]: mark } };
    commitWords(next);
    // the blanks below take the '몰라요' words first — until the first answer of a set (2026-09-28: they share this step)
    if (Object.keys(clozePicks).length === 0) setClozeUnknown(unknownOf(next.marks));
    // a self-report: '몰라요' is a wrong answer for the engine, '알아요' a right one (both inside the lesson — never a pass)
    noteAttempt(order, mark === "known");
    if (mark === "known") setUnfolded((prev) => ({ ...prev, [order]: false }));
  };

  function renderWordRow(kw: KeyWord, order: number) {
    const mark = words.marks[order];
    const isRevealed = revealed[order] === true;
    const context = contexts[order - 1];
    const lemma = kw.lemma && kw.lemma.toLowerCase() !== kw.word.toLowerCase() ? kw.lemma : null;
    if (mark === "known" && !unfolded[order]) {
      return (
        <li key={order} data-vocab={order} data-mark="known">
          <button
            type="button"
            data-action="unfold"
            aria-expanded={false}
            onClick={() => setUnfolded((prev) => ({ ...prev, [order]: true }))}
            className="flex min-h-12 w-full items-center gap-2 px-4 text-left transition-colors cursor-pointer hover:bg-sunken"
          >
            <span lang="en" data-word-text className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
              {kw.word}
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
    return (
      <li key={order} data-vocab={order} data-mark={mark ?? ""} className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p lang="en" data-word-text className="text-title-s font-semibold text-ink [overflow-wrap:anywhere]">
              {kw.word}
            </p>
            <p className="text-caption text-ink-faint">
              {posLabel(kw.pos)}
              {lemma ? (
                <>
                  {" · 기본형 "}
                  <span lang="en">{lemma}</span>
                </>
              ) : null}
            </p>
          </div>
          {!isRevealed ? (
            <button
              type="button"
              data-action="reveal"
              onClick={() => setRevealed((prev) => ({ ...prev, [order]: true }))}
              aria-label={`${kw.word} 뜻 보기`}
              className={outlineButton}
            >
              뜻 보기
            </button>
          ) : null}
          {speakerButton(kw.word, `w:${order}`, () => playWord(order), "word-audio")}
        </div>
        {context ? (
          <p lang="en" data-context className="text-label text-ink-soft">
            {context.before}
            <span className="font-semibold text-ink underline decoration-primary decoration-2 underline-offset-4">{context.match}</span>
            {context.after}
          </p>
        ) : null}
        {isRevealed ? (
          <>
            <p data-meaning className="text-body text-ink">
              {kw.meaning}
            </p>
            <div role="group" aria-label={`${kw.word} — 이 단어를 아나요?`} className="grid grid-cols-2 gap-2">
              {(["known", "unknown"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-action={m}
                  aria-pressed={mark === m}
                  onClick={() => setMark(order, m)}
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

  // --- Step 2 · the blanks (Step 3 until 2026-09-28) ------------------------------------------------------------------
  const clozeKeywords = useMemo(() => keywords.map((kw) => ({ word: kw.word, pos: kw.pos })), [keywords]);
  /**
   * clozeUnknown — the '몰라요' words the set asks first. Until the first answer of a set it follows the marks made on the cards
   * above it (setMark · the records read on load); from the first answer on it stays, and '다른 빈칸으로 다시 풀기' starts a new set
   * from the marks of that moment. The cards and the blanks share Step 2 now (2026-09-28), so no step change seeds the set.
   */
  const clozeItems: ClozeItem[] = useMemo(
    () => generateClozeItems(sentencePairs, { lessonKey: mainKey, keywords: clozeKeywords, round: clozeRound, unknown: clozeUnknown, alsoFits: clozeAlsoFits ?? {} }),
    [sentencePairs, mainKey, clozeKeywords, clozeRound, clozeUnknown, clozeAlsoFits],
  );

  const pickOption = (item: ClozeItem, optionIndex: number) => {
    if (clozePicks[item.id] !== undefined) return;
    const correct = optionIndex === item.answerIndex;
    setClozePicks((prev) => ({ ...prev, [item.id]: optionIndex }));
    noteAttempt(item.order, correct, correct ? undefined : item.options[optionIndex]);
    if (!correct) {
      const cur = wordsRef.current;
      if (!cur.missed.includes(item.order)) commitWords({ ...cur, missed: [...cur.missed, item.order] });
    }
  };

  const nextBlank = () => {
    stopAll();
    setClozeIndex((i) => i + 1);
  };

  const newBlanks = () => {
    stopAll();
    setClozeRound((r) => r + 1);
    setClozeUnknown(unknownOrders);
    setClozePicks({});
    setClozeIndex(0);
  };

  const filledSentence = (item: ClozeItem): ReactNode => {
    const spans = findWordSpans(item.originalSentence, item.missingWord);
    const out: ReactNode[] = [];
    let at = 0;
    spans.forEach(([start, end], k) => {
      out.push(item.originalSentence.slice(at, start));
      out.push(
        <span key={k} className="font-semibold underline decoration-primary decoration-2 underline-offset-4">
          {item.originalSentence.slice(start, end)}
        </span>,
      );
      at = end;
    });
    out.push(item.originalSentence.slice(at));
    return out;
  };

  function renderBlank(item: ClozeItem) {
    const picked = clozePicks[item.id];
    const answered = picked !== undefined;
    const correct = picked === item.answerIndex;
    const total = clozeItems.length;
    const right = clozeItems.filter((it) => clozePicks[it.id] === it.answerIndex).length;
    const last = clozeIndex + 1 >= total;
    const pair = sentencePairs[item.sentenceIndex];
    return (
      <div data-cloze data-order={item.order} data-region={item.region} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label tabular-nums text-ink-soft">
            {clozeIndex + 1} / {total} · {REGION_LABEL[item.region]}
          </p>
          <p className="text-label tabular-nums text-ink-soft">맞힘 {right}</p>
        </div>
        <p data-masked lang="en" className="rounded-card border border-line bg-raised px-4 py-4 font-serif text-body text-ink">
          {item.maskedSentence}
        </p>
        <div role="group" aria-label="보기" className="grid grid-cols-2 gap-2">
          {item.options.map((opt, i) => {
            const isAnswer = i === item.answerIndex;
            const isPicked = picked === i;
            const look = !answered
              ? "border-line bg-raised text-ink hover:bg-sunken cursor-pointer"
              : isAnswer
                ? "border-success bg-success/10 font-semibold text-success"
                : isPicked
                  ? "border-danger bg-danger/10 text-danger line-through"
                  : "border-line bg-raised text-ink-faint";
            return (
              <button
                key={`${item.id}-${i}`}
                type="button"
                data-option={i}
                disabled={answered}
                onClick={() => pickOption(item, i)}
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
                    {item.missingWord}
                  </span>
                </span>
              ) : null}
            </p>
            <p data-filled lang="en" className="font-serif text-body text-ink">
              {filledSentence(item)}
            </p>
            {pair ? (
              <p data-cloze-ko lang="ko" className="text-label text-ink-soft">
                {pair.ko}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" data-action="cloze-listen" onClick={() => playSentence(item.sentenceIndex)} className={outlineButton}>
                {playing === `s:${item.sentenceIndex}` ? <IconStop /> : <IconSpeaker />}
                <span>{playing === `s:${item.sentenceIndex}` ? "정지" : "문장 듣기"}</span>
              </button>
            </div>
          </div>
        ) : null}
        {answered ? (
          <button type="button" data-action="cloze-next" onClick={nextBlank} className={`${filledButton} min-h-12 w-full`}>
            <span>{last ? "결과 보기" : "다음 문제"}</span>
            <IconChevronRight />
          </button>
        ) : null}
      </div>
    );
  }

  function renderBlankResult() {
    const total = clozeItems.length;
    const right = clozeItems.filter((it) => clozePicks[it.id] === it.answerIndex).length;
    return (
      <div data-cloze-result role="status" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-title-s font-semibold text-ink">빈칸 {total}문제 끝</h4>
          <p className="text-label tabular-nums text-ink-soft">
            {right} / {total} 맞힘
          </p>
        </div>
        <ul className="list-none divide-y divide-line rounded-card border border-line bg-raised">
          {clozeItems.map((it) => {
            const ok = clozePicks[it.id] === it.answerIndex;
            return (
              <li key={it.id} className="flex items-center gap-2 px-4 py-2">
                <span className={"flex shrink-0 items-center " + (ok ? "text-success" : "text-danger")} aria-label={ok ? "맞음" : "틀림"}>
                  {ok ? <IconCheck size={16} /> : <IconX size={16} />}
                </span>
                <p className="min-w-0 flex-1 text-label text-ink">
                  <span lang="en" className="font-semibold">
                    {it.missingWord}
                  </span>
                  <span className="text-ink-soft"> · {REGION_LABEL[it.region]}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <button type="button" data-action="cloze-again" onClick={newBlanks} className={`${filledButton} w-full`}>
          <IconRepeat />
          <span>다른 빈칸으로 다시 풀기</span>
        </button>
      </div>
    );
  }

  /** Step 2 — the key-word cards, then the blanks (Step 3 until 2026-09-28 · D31 다 '핵심 어휘(카드 · 알아요/몰라요 + 빈칸)') */
  function renderStep2() {
    const known = Object.values(words.marks).filter((m) => m === "known").length;
    const unknown = Object.values(words.marks).filter((m) => m === "unknown").length;
    const allRevealed = keywords.length > 0 && keywords.every((_, i) => revealed[i + 1]);
    const item = clozeItems[clozeIndex];
    return (
      <section data-step-panel="2" aria-label="핵심 어휘" className="flex flex-col gap-3">
        <p className="text-label text-ink-soft">
          뜻을 먼저 떠올려 본 뒤 &lsquo;뜻 보기&rsquo;를 누르고 알아요 · 몰라요를 표시하세요. 몰라요 단어는 아래 빈칸에 먼저 나와요.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p data-vocab-summary className="text-label tabular-nums text-ink-soft">
            알아요 {known} · 몰라요 {unknown} · 남은 단어 {Math.max(0, keywords.length - known - unknown)}
          </p>
          <button
            type="button"
            data-action="reveal-all"
            onClick={() => {
              if (allRevealed) setRevealed({});
              else setRevealed(Object.fromEntries(keywords.map((_, i) => [i + 1, true])));
            }}
            className={quietButton}
          >
            {allRevealed ? "뜻 모두 가리기" : "뜻 모두 보기"}
          </button>
        </div>
        {keywords.length ? (
          <ul className="flex list-none flex-col divide-y divide-line rounded-card border border-line bg-raised">
            {keywords.map((kw, i) => renderWordRow(kw, i + 1))}
          </ul>
        ) : (
          <p className="text-label text-ink-soft">이 강의에는 핵심 어휘가 없어요.</p>
        )}

        <div data-blanks className="mt-3 flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-body font-semibold text-ink">빈칸 채우기</h3>
          <p className="text-label text-ink-soft">
            빈칸에 들어갈 단어를 고르세요. 이 글의 핵심 어휘에서 글 앞 · 중간 · 끝 한 문제씩 나오고, 몰라요로 표시한 단어가 먼저 나와요.
          </p>
          {clozeItems.length === 0 ? (
            <p className="text-label text-ink-soft">이 글에서는 빈칸 문제를 만들 수 없어요.</p>
          ) : item ? (
            renderBlank(item)
          ) : (
            renderBlankResult()
          )}
        </div>
      </section>
    );
  }

  /** the romanized Korean words of this page (lessonSpeechForm) — any word the learner says there counts (RD-L13 ④) */
  const readAloudTargets = useMemo(() => {
    const target = sentencePairs[0]?.en ?? "";
    const korean = (LESSON_SPEECH_WORDS[lessonKey] || []).filter(([, spoken]) => spoken.includes("⟨")).map(([written]) => written);
    let slotted = target;
    for (const written of korean.sort((a, b) => b.length - a.length)) {
      const spans = findWordSpans(slotted, written);
      for (const [start, end] of [...spans].reverse()) slotted = `${slotted.slice(0, start)}[[${slotted.slice(start, end)}]]${slotted.slice(end)}`;
    }
    return slotted !== target ? [target, slotted] : undefined;
  }, [sentencePairs, lessonKey]);

  // --- Step 3 · 원문 대조 (Step 4 until 2026-09-28) ------------------------------------------------------------------
  const englishWithKeywords = (i: number): ReactNode => {
    const text = sentencePairs[i]?.en ?? "";
    const marks = keywordMarks[i] || [];
    if (!marks.length) return text;
    const out: ReactNode[] = [];
    let at = 0;
    for (const m of marks) {
      out.push(text.slice(at, m.start));
      const open = gloss?.row === i && gloss.order === m.order;
      out.push(
        <span
          key={`${m.start}-${m.order}`}
          data-keyword={m.order}
          className={
            "cursor-pointer underline decoration-dotted decoration-1 underline-offset-4 " +
            (open ? "decoration-primary decoration-2 font-semibold" : "decoration-ink-faint")
          }
        >
          {text.slice(m.start, m.end)}
        </span>,
      );
      at = m.end;
    }
    out.push(text.slice(at));
    return out;
  };

  const toggleGloss = (row: number, order: number) => {
    setGloss((cur) => (cur && cur.row === row && cur.order === order ? null : { row, order }));
  };

  const playRow = (i: number) => {
    if (activeRow === i && playing === `s:${i}`) {
      stopAll();
      setActiveRow(null);
      return;
    }
    setActiveRow(i);
    playSentence(i, false);
  };

  const onRowClick = (event: ReactMouseEvent<HTMLLIElement>, i: number) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, summary")) return;
    // a drag that selected text is not a press
    if (typeof window !== "undefined" && (window.getSelection()?.toString() ?? "").trim()) return;
    const keyword = target.closest("[data-keyword]");
    if (keyword) {
      toggleGloss(i, Number(keyword.getAttribute("data-keyword")));
      return;
    }
    playRow(i);
  };

  function renderRow(pair: (typeof sentencePairs)[number], i: number) {
    const isPlaying = playing === `s:${i}`;
    const isCurrent = queueIndex === i;
    const koVisible = dualView === "both" || dualView === "ko" || shownKo[i];
    const rowWords = (keywordMarks[i] || []).map((m) => m.order).filter((o, k, all) => all.indexOf(o) === k);
    const glossWord = gloss && gloss.row === i ? keywords[gloss.order - 1] : null;
    return (
      <li
        key={pair.id}
        data-sentence-id={pair.id}
        data-row={i + 1}
        onClick={(event) => onRowClick(event, i)}
        className="grid cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 px-2 py-2 sm:grid-cols-[2.75rem_minmax(0,1.7fr)_minmax(0,1fr)] sm:gap-x-4 sm:px-3"
      >
        <button
          type="button"
          data-action="play-row"
          aria-pressed={isPlaying}
          aria-label={isPlaying ? `${i + 1}번 문장 정지` : `${i + 1}번 문장 듣기`}
          onClick={() => playRow(i)}
          className={
            "row-span-2 flex h-11 w-11 items-center justify-center self-start rounded-full border text-label font-semibold tabular-nums transition-colors cursor-pointer sm:row-span-1 " +
            (isPlaying || isCurrent ? "border-primary bg-primary-soft text-ink" : "border-line bg-raised text-ink-soft hover:bg-sunken hover:text-ink")
          }
        >
          {isPlaying ? <IconStop /> : prefs.numbers ? i + 1 : <IconSpeaker />}
        </button>
        {dualView !== "ko" ? (
          <p lang="en" data-en className={`${size.en} py-2 font-serif leading-relaxed text-ink`}>
            <span className={`box-decoration-clone rounded-sm ${isPlaying ? PLAYING_MARK : isCurrent ? TINT : ""}`}>{englishWithKeywords(i)}</span>
          </p>
        ) : null}
        {koVisible ? (
          <p lang="ko" data-ko className={`${size.ko} py-2 text-ink-soft sm:pt-2.5`}>
            {pair.ko}
          </p>
        ) : (
          <div className="pb-1 sm:pt-0.5">
            <button
              type="button"
              data-action="show-ko"
              onClick={() => setShownKo((prev) => ({ ...prev, [i]: true }))}
              className={quietButton + " -ml-3"}
            >
              해석 보기
            </button>
          </div>
        )}
        {glossWord ? (
          <div data-gloss role="status" className="col-span-full mb-1 flex items-center gap-2 rounded-control bg-sunken px-3 py-1">
            <p className="min-w-0 flex-1 text-label text-ink">
              <span lang="en" className="font-semibold">
                {glossWord.word}
              </span>
              <span className="text-ink-soft"> · {posLabel(glossWord.pos)} · </span>
              {glossWord.meaning}
            </p>
            {speakerButton(glossWord.word, `w:${gloss!.order}`, () => playWord(gloss!.order))}
            <button type="button" aria-label="뜻 닫기" onClick={() => setGloss(null)} className={iconButton}>
              <IconX />
            </button>
          </div>
        ) : null}
        {activeRow === i && rowWords.length ? (
          // the same words as buttons — for a keyboard, and for anyone who did not see that the dotted words open
          <div className="col-span-full flex flex-wrap items-center gap-1 pb-1" role="group" aria-label={`${i + 1}번 문장의 핵심 어휘`}>
            <span className="pr-1 text-caption text-ink-soft">핵심 어휘</span>
            {rowWords.map((order) => (
              <button
                key={order}
                type="button"
                data-keyword-chip={order}
                aria-pressed={gloss?.row === i && gloss.order === order}
                onClick={() => toggleGloss(i, order)}
                className="inline-flex min-h-11 items-center rounded-control border border-line bg-raised px-3 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
              >
                <span lang="en">{keywords[order - 1]?.word}</span>
              </button>
            ))}
          </div>
        ) : null}
      </li>
    );
  }

  function renderStep3() {
    const views: { value: "both" | "en" | "ko"; label: string }[] = [
      { value: "both", label: "영어 · 한글" },
      { value: "en", label: "영어만" },
      { value: "ko", label: "한글만" },
    ];
    return (
      <section data-step-panel="3" aria-label="원문 대조" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-label font-semibold text-ink">영어 원문 · 한글 해석</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-control bg-sunken p-1" role="group" aria-label="대조 보기">
              {views.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  data-view={v.value}
                  aria-pressed={dualView === v.value}
                  onClick={() => {
                    setDualView(v.value);
                    setShownKo({});
                  }}
                  className={segmentButton(dualView === v.value)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <ViewMenu prefs={prefs} onChange={changePrefs} onCopy={copyPassage} copied={copied} />
          </div>
        </div>
        <p className="text-label text-ink-soft">줄이나 번호를 누르면 그 문장을 들어요. 점선 단어를 누르면 뜻이 보여요.</p>
        {playerBlock("step3")}
        <ol data-rows className="flex list-none flex-col divide-y divide-line rounded-card border border-line bg-raised">
          {sentencePairs.map((pair, i) => renderRow(pair, i))}
        </ol>

        {sentencePairs[0] ? (
          // the reading-aloud check — with the blanks until 2026-09-28; D34 would make it this view's '따라 읽기' of a chosen sentence
          <div data-read-aloud className="mt-3 flex flex-col gap-3 border-t border-line pt-4">
            <div>
              <h3 className="text-body font-semibold text-ink">소리 내어 읽기 · 말하기 인식(단어 일치)</h3>
              <p className="mt-0.5 text-label text-ink-soft">첫 문장을 소리 내어 읽으면, 알아들은 단어가 원문과 얼마나 맞는지 보여 줘요.</p>
            </div>
            <p lang="en" className="rounded-card border border-line bg-raised px-4 py-3 font-serif text-body text-ink">
              {sentencePairs[0].en}
            </p>
            <VoiceSpeakingTester targetText={sentencePairs[0].en} targetTexts={readAloudTargets} onStart={stopAll} buttonLabel="소리 내어 읽기" />
          </div>
        ) : null}

        <details data-notes open={memoOpen} onToggle={(event) => setMemoOpen(event.currentTarget.open)} className="group rounded-card border border-line bg-raised">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-card px-4 text-label font-medium text-ink transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
            <span>메모</span>
            <span className="flex items-center gap-2">
              {savedAt ? <span className="text-caption font-normal text-ink-soft">저장됨 · {savedAt}</span> : null}
              <IconChevronDown className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="flex flex-col gap-1 border-t border-line px-4 py-3">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              aria-label="메모"
              placeholder="이 글에서 기억할 것을 적어 두세요. 이 기기에 저장돼요."
              className="w-full rounded-control border border-line bg-surface p-3 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
            <p className="text-caption tabular-nums text-ink-soft">{notes.length}자</p>
          </div>
        </details>
      </section>
    );
  }

  // --- Step 4 · 다시 읽고 재기 + 이해 문제 (2026-09-28 · D31 다) ---------------------------------------------------------
  /**
   * 이해 문제 자리 — 사장님 D31 다 "4 다시 읽고 재기 + 이해 문제(새 문제 512 가 들어갈 자리 — 들어오기 전엔 다시 읽고 재기만)".
   * 2026-09-28 새 문제: the passage's two questions (lessonQuestions — the page reads them on the server, like clozeAlsoFits: the
   * leak rule) come HERE, under the timed reading, with their own heading '이해 문제' (the tab keeps '다시 읽고 재기' — a 360px
   * phone has no room for more). They are hidden while the clock runs. An answered question shows its sentences with their
   * translation. The same component as LISTENING Step 1 (LessonQuestions). A passage without a question file keeps the slot
   * empty and hidden: no heading, no '준비 중'. [data-comprehension] is the hook for the audit tools (drive-reading.cjs).
   * KIG-008's auto-generated quiz (SHOW_GENERATED_QUIZ — off, the call site kept behind it; it was Step 3 '독해 퀴즈') would show
   * here, where there is no question file, if it were turned back on.
   */
  const evidenceSentences = (question: LessonQuestion) => {
    const rows = question.evidence.map((n) => ({ n, pair: sentencePairs[n - 1] })).filter((row) => row.pair);
    if (rows.length === 0) return null;
    return (
      <div data-question-evidence className="flex flex-col gap-2 rounded-control bg-sunken px-3 py-2.5">
        <p className="text-caption font-semibold text-ink-soft">근거</p>
        {rows.map(({ n, pair }) => (
          <div key={n} className="flex flex-col gap-0.5">
            <p lang="en" className="text-label text-ink">
              <span className="tabular-nums text-ink-soft">{n}.</span> {pair.en}
            </p>
            {pair.ko ? <p className="text-label text-ink-soft">{pair.ko}</p> : null}
          </div>
        ))}
      </div>
    );
  };

  function renderComprehension() {
    if (lessonQuestions && lessonQuestions.length > 0) {
      return (
        <div data-comprehension="questions">
          <LessonQuestions
            course="reading"
            mainId={mainId}
            questions={lessonQuestions}
            profile={READING_LEARNING_PROFILE}
            heading="이해 문제"
            intro="다시 읽은 뒤 풀어 보세요. 고르면 바로 답이 나와요."
            evidence={evidenceSentences}
          />
        </div>
      );
    }
    if (!(SHOW_GENERATED_QUIZ && questions.length > 0)) return <div data-comprehension="" hidden />;
    return (
      <div data-comprehension="generated" className="flex flex-col gap-3">
        {questions.map((q) => {
          const picked = quizAnswers[q.id];
          const answered = picked !== undefined;
          return (
            <div key={q.id} className="flex flex-col gap-2 rounded-card border border-line bg-raised px-4 py-4">
              <h3 className="text-body font-semibold text-ink">{q.question}</h3>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={answered}
                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                    className={
                      "flex min-h-11 items-center rounded-control border px-3 text-left text-label transition-colors " +
                      (!answered
                        ? "border-line bg-raised text-ink hover:bg-sunken cursor-pointer"
                        : oIdx === q.answerIndex
                          ? "border-success text-success"
                          : picked === oIdx
                            ? "border-danger text-danger line-through"
                            : "border-line text-ink-faint")
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {answered ? <p className="text-label text-ink-soft">{q.explanation}</p> : null}
            </div>
          );
        })}
      </div>
    );
  }

  /**
   * The timed reading (Step 1's machinery until 2026-09-28): the passage is not on screen until '읽기 시작', so it cannot be read
   * before the clock starts; while timing it is plain text with '다 읽었어요' at its end. The result is this run only — its time
   * or WPM against the target, no earlier number, no percentage — and '다시 재기' times it again.
   */
  function renderStep4() {
    const again = speed.again;
    const shown = outcome;
    return (
      <section data-step-panel="4" aria-label="다시 읽고 재기" className="flex flex-col gap-3">
        {!running ? (
          <p className="text-label text-ink-soft">
            {again
              ? "같은 글을 다시 재려면 '다시 재기'를 누르세요."
              : "원문 대조까지 마쳤으면 같은 글을 다시 읽으며 시간을 재 보세요. '읽기 시작'을 누르면 글이 나와요. 뜻을 파악하며 평소 속도로 읽고, 다 읽으면 '다 읽었어요'를 누르세요."}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {!running && !again ? (
              <button type="button" data-action="start-reading" onClick={() => startRun()} className={`${filledButton} min-h-12 px-5`}>
                <span>읽기 시작</span>
              </button>
            ) : null}
            <p data-passage-meta="timed" className="text-label tabular-nums text-ink-soft">
              {wordCount}단어 · {sentencePairs.length}문장 · 목표 약 {formatApprox(targetMs(wordCount))}
            </p>
          </div>
          <ViewMenu prefs={prefs} onChange={changePrefs} onCopy={copyPassage} copied={copied} />
        </div>

        {running ? renderPassage("timed") : null}

        {!running && (shown?.tooFast || again) ? (
          <div ref={resultRef} className="flex flex-col gap-3">
            {shown?.tooFast ? tooFastNotice(shown) : null}
            {again ? (
              <div data-speed-result role="status" className="flex flex-col gap-2 rounded-card border border-line bg-raised px-4 py-4">
                <p className="text-caption text-ink-soft">다시 읽기</p>
                <p className="text-title font-semibold tabular-nums text-ink">{timeOnly ? formatDuration(again.ms) : `${again.wpm} WPM`}</p>
                <p className="text-label tabular-nums text-ink-soft">
                  {wordCount}단어 · {formatDuration(again.ms)}
                </p>
                <p className="text-label text-ink">{verdictLine(again.wpm)}</p>
                {hiddenNote(shown && !shown.tooFast ? shown : null)}
                <button type="button" data-action="measure-again" onClick={() => startRun()} className={`${outlineButton} sm:self-start`}>
                  <IconRepeat />
                  <span>다시 재기</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!running ? renderComprehension() : null}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------------------------------------
  const markedCount = Object.keys(words.marks).length;
  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-3"
      data-reading-view
      data-ready={loaded ? "" : undefined}
      data-step={step}
      data-owns-passage-player={ownsPlayer ? "" : undefined}
    >
      <StepTabs
        label="READING 4단계 학습"
        stepStart
        current={step}
        onSelect={(n) => switchStep(n as StepNo)}
        steps={STEPS.map((s) => ({ n: s.n, name: s.name, badge: s.n === 2 && markedCount > 0 ? `${markedCount}/${keywords.length}` : undefined }))}
      />
      {step === 1 ? renderStep1() : null}
      {step === 2 ? renderStep2() : null}
      {step === 3 ? renderStep3() : null}
      {step === 4 ? renderStep4() : null}
    </div>
  );
}

// Helpers — the passage from the lesson blocks when a lesson has no sentence pairs (never for today's data: all 512
// READING pages carry readingSentences; kept so a lesson without them still shows its text)
function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function cleanSentenceText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/^\s*\([A-Za-z0-9]\)\s*/, "")
    .replace(/^\s*\[[A-Za-z0-9]\]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  // Protect abbreviations like Mr., Mrs., Ms., Dr., Prof., etc. from being split
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.\s+/gi, "$1.__SPACE__")
    .replace(/\b(U\.S\.|e\.g\.|i\.e\.)\s+/gi, (m) => m.replace(/\s+/g, "__SPACE__"));

  // 2026-09-27: split after . ? ! without a look-behind (older iOS Safari cannot parse one — lessonSpeechForm.ts)
  return protectedText
    .replace(/([.?!])\s+/g, "$1\u0000")
    .split("\u0000")
    .map((s) => cleanSentenceText(s.replace(/__SPACE__/g, " ")))
    .filter((s) => s.length > 0);
}

function alignDP(enSents: string[], koSents: string[]): { en: string; ko: string }[] {
  const N = enSents.length;
  const M = koSents.length;
  const dp: number[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(Infinity));
  const parent: ([number, number] | null)[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(null));

  dp[0][0] = 0;

  function cost(eText: string, kText: string, di: number, dj: number): number {
    const elen = eText.length;
    const klen = kText.length;
    let base = 0;
    if (di === 1 && dj === 1) base = 0;
    else if ((di === 1 && dj === 2) || (di === 2 && dj === 1)) base = 25;
    else if ((di === 1 && dj === 3) || (di === 3 && dj === 1)) base = 80;
    else base = 150;

    const diff = elen - klen * 1.7;
    const varLen = Math.sqrt(elen + klen * 1.7 + 1);
    const score = Math.pow(diff / varLen, 2);
    return base + Math.min(score, 100);
  }

  const moves = [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, 3],
    [3, 1],
  ];

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= M; j++) {
      if (dp[i][j] === Infinity) continue;
      for (const [di, dj] of moves) {
        if (i + di <= N && j + dj <= M) {
          const eText = enSents.slice(i, i + di).join(" ");
          const kText = koSents.slice(j, j + dj).join(" ");
          const c = cost(eText, kText, di, dj);
          if (dp[i][j] + c < dp[i + di][j + dj]) {
            dp[i + di][j + dj] = dp[i][j] + c;
            parent[i + di][j + dj] = [i, j];
          }
        }
      }
    }
  }

  let currI = N;
  let currJ = M;
  const path: { en: string; ko: string }[] = [];
  while (currI > 0 || currJ > 0) {
    const p = parent[currI][currJ];
    if (!p) break;
    const [prevI, prevJ] = p;
    path.push({
      en: enSents.slice(prevI, currI).join(" "),
      ko: koSents.slice(prevJ, currJ).join(" "),
    });
    currI = prevI;
    currJ = prevJ;
  }
  path.reverse();
  return path;
}

function alignSentences(enSents: string[], koSents: string[]) {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: "", ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: "" }));

  // If enSents is shorter than koSents, check if any enSent contains a semicolon ';' separating clauses
  if (enSents.length < koSents.length) {
    const candidateEn: string[] = [];
    for (const s of enSents) {
      if (s.includes(";")) {
        const parts = s.split(/;\s*/).map(cleanSentenceText).filter(Boolean);
        if (parts.length > 1) {
          candidateEn.push(...parts);
        } else {
          candidateEn.push(s);
        }
      } else {
        candidateEn.push(s);
      }
    }
    if (candidateEn.length === koSents.length) {
      enSents = candidateEn;
    } else if (candidateEn.length > enSents.length && candidateEn.length <= koSents.length) {
      enSents = candidateEn;
    }
  }

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  return alignDP(enSents, koSents);
}
