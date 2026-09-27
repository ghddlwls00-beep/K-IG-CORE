"use client";

/**
 * LISTENING — one view for every page (276 lessons and their script pages -1; tab names: STEPS below): Step 1 블라인드 · Step 2 딕테이션 · Step 3 소리
 * 클리닉 · Step 4 따라 말하기 · Step 5 다시 듣기 (the owner's order; Steps 4 and 5 named by 계획 D05 나; every tab still reads "Step N").
 *
 * 2026-09-27 학습법 · 화면 고침 (사장님 "검토 결과대로 … 끝까지"; docs/qa-2026-09-18/학습법-화면-0927/listening-verified.md · 계획.md
 * F01–F05 · D01 · D02 · D05 · D24–D29). The lines, the translations and every sound are unchanged: speakText gets
 * lessonSpeechForm(lessonKey, line) for a line and lessonSpeechForm(lessonKey, card.original) for a sound card, and the whole
 * lesson is the page's own player (A10 — the same sentences as the top player) in Step 1 and the same line list as before in
 * Step 5. The wrong sound cards only stop being shown and played (F03). What changed, by review item:
 *   Frame   no banner and no step cards (LD-U01 ③ · U08 · U15); the shared StepTabs, not sticky (U05 · U20); no '다음: Step N'
 *           rows and no empty box (U09); line icons, the colour tokens and the six text sizes (U04 · U06 · U07 · U16); one
 *           speed set 0.75 · 1 · 1.25 · 1.5 for every step (U11); one line of instruction per step + '이 단계는?' (U15).
 *   Step 1  (F01 · D01 · D25 · LD-L03) the lesson's names and numbers above the player (two lines, '더 보기'); the page's own
 *           player plays here and the top one hides from the first paint (data-owns-passage-player).
 *   Step 2  (F02 · D24 나 · LD-L04 · L05 · L12 · L13 · U02 · U03 · U21 · U22) 빈칸 (default) · 블록 · 쓰기 — the rules are in
 *           src/lib/ldDictation.ts; the Korean line after the first check; where the answer differs, word by word; '정답 보기'
 *           after two wrong checks (the line then counts as helped); tiles that stay where they are; a 16px typing box, Enter checks.
 *   Step 3  (F03 · D26 가 · LD-L15 · U13) listeningUtils.generateLiaisonPoints without its wrong cards; 'author‿in'; a line with
 *           no card offers 보통 · 느리게.
 *   Step 4  (F04 · D05 · D27 다 · LD-L07 · U12) '들은 뒤 따라 말해 보세요'; the line nav right above the microphone; a fresh
 *           tester per line; the best score is the best one; '글 가리기' for lines of 15 words or fewer.
 *   Step 5  (F01 · D05 · D29 · LD-L08 · U10 · U14 · U19) the player with the line it is on marked; '처음부터'; Korean on a press
 *           or '해석 모두 보기'; wrong and helped lines marked; the memo folded (open when it holds something).
 *   Lines   (D28 나 · LD-L10) Steps 2–4 stay on the same line. (D29 나 · LD-L16) before a line is checked in Step 2, Steps 3–5
 *           hide its English behind '먼저 받아쓰기 / 그래도 보기' — '그래도 보기' once for the lesson.
 * Completion (D02 나): LessonEndBar's '이 강의 학습 완료' opens once one dictation line has been checked (src/lib/lessonGate.ts).
 * On this device: src/lib/ldLearning.ts (an old record is read as it is). The common learning engine hears recordAttempt on every
 * dictation check and every microphone result, and markLessonDone — the lines missed or helped — when the learner completes it.
 * The data-* attributes are what the audit helpers read (lib/ld-page-helpers.js · lib/ld-page.cjs · lib/containers.cjs ·
 * drive-generic · drive-common-0926 D · gap-checks-0926 P · Z) — keep them.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Block } from "@/lib/types";
import {
  getServerSpeechSnapshot,
  getSpeechSnapshot,
  playSentenceQueue,
  speakText,
  stopSpeech,
  subscribeSpeech,
  unlockMobileAudio,
} from "@/lib/speech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { SHOW_GENERATED_QUIZ } from "@/lib/quizFlags";
import {
  generateLiaisonPoints,
  generateListeningContextQuiz,
  spokenTypedForm,
  typedDictationMatches,
  verifyAnyWordSequence,
  type LiaisonCard,
} from "@/lib/listeningUtils";
import {
  blankRight,
  blockTiles,
  diffSummary,
  diffWords,
  lessonBlanks,
  lessonCapitals,
  lessonDistractors,
  normWord,
  tokensOf,
  type DiffKind,
  type LdBlank,
} from "@/lib/ldDictation";
import {
  DEFAULT_LD_PREFS,
  LD_GATE_REASON,
  LD_HIDE_TEXT_MAX_WORDS,
  LD_LEARNING_PROFILE,
  LD_MIC_PASS,
  LD_PREFS_KEY,
  emptyLdPractice,
  ldItemKey,
  ldLessonOf,
  ldReviewEntries,
  ldStorageKey,
  parseLdPractice,
  parseLdPrefs,
  serializeLdPractice,
  type LdDictationMode,
  type LdPractice,
  type LdPrefs,
} from "@/lib/ldLearning";
import { markLessonDone, readCourseRecord, recordAttempt } from "@/lib/learning/record";
import { clearLessonGate, setLessonGate } from "@/lib/lessonGate";
import type { PassagePlayerData } from "@/lib/passagePlayer";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import { StepTabs } from "./StepTabs";
import { IconBackspace, IconCheck, IconChevronDown, IconChevronRight, IconPlay, IconSpeaker, IconStop, IconX } from "./icons";
import { LESSON_COMPLETE_EVENT, useProgress } from "./ProgressProvider";

interface LdLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  /** Kept for the callers: the whole lesson plays its sentence clips (shouldUseUnifiedSpeech), not the old mp3. */
  audioTracks?: { src: string; label?: string }[];
  ldEnglishScript?: LdScriptRow[] | null;
  /** 2026-09-27 (계획 A10 · F01): the page's whole-lesson player as data — played in Step 1; the top one then hides */
  passagePlayers?: PassagePlayerData[] | null;
}

/** `answer`: the solution of a riddle round ("Can you guess why?"), kept out of the Korean line. */
type LdScriptRow = { n: string; ko: string; en: string; answer?: string };

type StepNo = 1 | 2 | 3 | 4 | 5;
/**
 * The tab names are the owner's own SHORT labels (the old view's shortLabel: '블라인드' · '딕테이션' · '소리클리닉' — short
 * enough for five tabs; a 360px phone leaves ~84px for the current step's name), and each step's heading keeps the owner's
 * full name (fullLabel). Only Steps 4 and 5 are renamed, by 계획 D05 나 (their old names promised a pronunciation test and a
 * 1.5× comparison the steps do not do): '따라 말하기' · '다시 듣기' (heading '다시 듣기 · 대본 확인'). 2026-09-27: the first
 * draft had renamed 1-3 too ('전체 듣기' · '받아쓰기' · '소리 클리닉') — step names are the owner's, so they came back.
 */
const STEPS: { n: StepNo; name: string; full: string }[] = [
  { n: 1, name: "블라인드", full: "블라인드 리스닝" },
  { n: 2, name: "딕테이션", full: "탭-딕테이션" },
  { n: 3, name: "소리클리닉", full: "연음 & 소리 클리닉" },
  { n: 4, name: "따라 말하기", full: "따라 말하기" },
  { n: 5, name: "다시 듣기", full: "다시 듣기 · 대본 확인" },
];

/** One speed set for every step (LD-U11 · 계획 F01). */
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
const SLOW = 0.75;

// the button kinds of the course views (GrammarLearningView · StudentLearningView · PhonicsLearningView), 44px
const filledButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const iconButton =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-30";
const segmentButton = (on: boolean) =>
  "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-control px-2 text-label transition-colors cursor-pointer " +
  (on ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:bg-raised/60");
/** a word as a tile — the bank, the answer box and its measuring copy share it */
const tileBase = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border px-3 text-body font-semibold";

function headerHeight(): number {
  if (typeof window === "undefined") return 56;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
}

/** Riddle answer behind a press, so reading the Korean line does not give it away (L-71). */
function RiddleAnswer({ answer }: { answer?: string }) {
  if (!answer) return null;
  return (
    <details className="text-label text-ink-soft">
      <summary className="inline-flex min-h-11 cursor-pointer select-none items-center font-semibold text-ink">정답 보기</summary>
      <p className="leading-relaxed">{answer}</p>
    </details>
  );
}

/** '이 단계는?' — the longer word on a step, folded (LD-U15). */
function StepHelp({ children }: { children: ReactNode }) {
  return (
    <details data-step-help className="group open:basis-full">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <span>이 단계는?</span>
        <IconChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-1.5 px-2 pb-1 text-label text-ink-soft">{children}</div>
    </details>
  );
}

/** Step 1: the lesson's names and numbers before listening (D25 나) — two lines, then '더 보기'. */
function HintChips({ chunks }: { chunks: string[] }) {
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const boxRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setOverflow(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chunks, open]);
  if (!chunks.length) return null;
  return (
    <div data-passage-hints className="flex flex-col gap-1.5">
      <p className="text-label font-medium text-ink">미리 알아 둘 이름 · 숫자</p>
      <ul ref={boxRef} className={"flex list-none flex-wrap gap-1.5 overflow-hidden " + (open ? "" : "max-h-16")}>
        {chunks.map((chunk) => (
          <li key={chunk} data-hint-chip lang="en" className="rounded-control bg-sunken px-2 py-1 text-label text-ink">
            {chunk}
          </li>
        ))}
      </ul>
      {overflow || open ? (
        <button type="button" data-action="more-hints" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${quietButton} self-start`}>
          <span>{open ? "접기" : "더 보기"}</span>
          <IconChevronDown className={"transition-transform " + (open ? "rotate-180" : "")} />
        </button>
      ) : null}
    </div>
  );
}

/** What Step 2 said about the last check. */
type CheckResult =
  | { kind: "empty" }
  | { kind: "correct"; helped: boolean }
  | { kind: "wrong"; right?: number; total?: number; diff?: ReturnType<typeof diffWords> }
  | { kind: "shown" };

/**
 * A new lesson is a new view: the lesson page renders this component at the same place for every LISTENING lesson, so without a
 * key React kept the last lesson's step, line, answers and sounds when '다음 강의' opened the next one.
 */
export function LdLearningView(props: LdLearningViewProps) {
  return <LdLessonView key={props.lessonKey} {...props} />;
}

function LdLessonView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
  ldEnglishScript = null,
  passagePlayers = null,
}: LdLearningViewProps) {
  const lessonId = lessonKey.split("/").pop() || lessonKey;
  // a script page (d001-1) has its main lesson's lines — the same blanks, the same engine items (src/lib/ldLearning.ts)
  const baseId = ldLessonOf(lessonId);
  const { isCompleted } = useProgress();
  const lessonCompleted = isCompleted("ld", lessonId);

  // 1. Extract raw script blocks
  const mainBlocks = isScript ? (pairBlocks || []) : blocks;
  const scriptBlocks = isScript ? blocks : (pairBlocks || []);

  const hintsBlock = mainBlocks.find((b) => b.type === "hints") as { type: "hints"; text: string } | undefined;
  const hintWords = useMemo(() => {
    return hintsBlock
      ? hintsBlock.text
          .split(/[,.]/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0 && !/^\d+$/.test(w))
      : [];
  }, [hintsBlock]);

  /**
   * LD-HINTS-01 — the dictation instruction says "다음에 나오는 고유 명사, 숫자,
   * 어려운 단어를 참조하면서", and nothing was ever rendered. Dictating a proper
   * noun was therefore guesswork: d001 asks for "Mrs. Watson" and "Barbara"
   * with no way to know how they are spelled.
   *
   * The hints are stored per LESSON, so showing them all would hand over every
   * name in the lesson at sentence one. These are matched to the sentence on
   * screen instead. The stored line is not cleanly delimited — "John Wenger
   * Philadelphia · state of Pennsylvania" packs two hints into one chunk — so a
   * chunk counts as relevant when the whole chunk appears in the sentence OR
   * one of its capitalised words or multi-digit numbers does. Ordinary words
   * ("office", "state") are not matched, or a chunk would stick to any sentence.
   */
  const hintChunks = useMemo(() => {
    if (!hintsBlock?.text) return [];
    // A lesson's list can name the same word for two rows ("German" in d007), so a
    // chunk is kept once — otherwise a sentence that matches it shows the chip twice.
    // A comma between digits ("4,000", "2,500,000") is a thousands separator, not a
    // list break — splitting there left chips such as "000 pounds".
    // The period of a title or a one-letter initial is not a list break either:
    // "Mrs. Watson" came out as [Mrs] [Watson], "Dr. William N. Green" as [William N]
    // [Green], "St. Paul" as [St] [Paul] (content review 2026-09-24, C06113) — and the
    // title keeps its period when it ends a chunk ("Washington D.C.").
    return hintsBlock.text
      .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
      .map((chunk) => chunk.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
      .filter((chunk, index, all) => chunk && all.indexOf(chunk) === index);
  }, [hintsBlock]);

  const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

  /**
   * Final gate 2026-09-25 (spill review): a chip used to match wherever its letters appeared in the
   * sentence with spaces and punctuation squeezed out, so [Ten minutes later] rose on "forgotten",
   * [New Jersey] on "news", [at times] on "that times" and [$4.95] on "$14.95" — 88 places across
   * LISTENING. A match must now start where a word starts (it may run on: [Alaska] still meets
   * "Alaskans", [forgetful] "forgetfulness"), a capitalised word counts only as that capitalised
   * word, and a chip that carries a number shows only where every one of its numbers is spoken.
   * Squeezing is kept inside the match, so "sea shells" still meets [seashells]. Requiring the end
   * of a word as well was tried and dropped: it lost 19 chips a learner needs.
   */
  const NUMBER_WORDS = new Set(
    "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth twentieth hundredth thousandth dozen half twice".split(" "),
  );
  const unThousand = (value: string) => value.replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  const numbersIn = (chunk: string) => [
    ...(unThousand(chunk).match(/\d+/g) ?? []).map((v) => ({ digit: true, v })),
    ...chunk.toLowerCase().split(/[^a-z]+/).filter((w) => NUMBER_WORDS.has(w)).map((v) => ({ digit: false, v })),
  ];
  const hasNumber = (sentence: string, n: { digit: boolean; v: string }) =>
    n.digit
      ? new RegExp(`(?<!\\d)${n.v}(?!\\d)`).test(unThousand(sentence))
      : new RegExp(`(?<![A-Za-z])${n.v}(?![A-Za-z])`, "i").test(sentence);
  /** `needle` (letters and digits only) occurs in `sentence`, squeezed, starting where a word starts */
  const meetsAsWords = (sentence: string, needle: string, caseSensitive: boolean) => {
    const at: number[] = [];
    let squeezed = "";
    for (let i = 0; i < sentence.length; i++) {
      if (!/[A-Za-z0-9]/.test(sentence[i])) continue;
      at.push(i);
      squeezed += caseSensitive ? sentence[i] : sentence[i].toLowerCase();
    }
    for (let k = squeezed.indexOf(needle); k >= 0 && needle; k = squeezed.indexOf(needle, k + 1)) {
      const start = at[k];
      if (start === 0 || !/[A-Za-z0-9]/.test(sentence[start - 1])) return true;
    }
    return false;
  };

  /** The sentence argument is passed in: `currentDictationItem` is declared further down. */
  const pickHintsFor = (sentence: string): string[] => {
    if (!sentence || hintChunks.length === 0) return [];

    const relevant = hintChunks.filter((chunk) => {
      if (!numbersIn(chunk).every((n) => hasNumber(sentence, n))) return false;
      const whole = squash(chunk);
      if (whole.length >= 3 && meetsAsWords(sentence, whole, false)) return true;
      return chunk.split(/\s+/).some((token) => {
        const bare = token.replace(/[^A-Za-z0-9'’.]/g, "").replace(/[.'’]+$/, "");
        if (/^\d{2,}$/.test(bare)) return hasNumber(sentence, { digit: true, v: bare });
        // A proper noun counts from 3 letters; a lower-case "어려운 단어" only from
        // 5, so that a short everyday word in the chunk cannot stick to every
        // sentence. Without the lower-case case at all, the 13 lessons whose
        // hints are ordinary hard words ("farmhouse sixty") never showed a box.
        const letters = bare.replace(/[^A-Za-z]/g, "");
        const capital = /^[A-Z]/.test(bare);
        if (letters.length < (capital ? 3 : 5)) return false;
        return meetsAsWords(sentence, capital ? bare.replace(/[^A-Za-z0-9]/g, "") : squash(bare), capital);
      });
    });
    if (relevant.length > 0) return relevant;

    /**
     * The safety net the owner asked for: when the match finds nothing but the
     * sentence plainly holds a name or a number, show the lesson's whole hint
     * list rather than an empty box — the instruction must never point at
     * nothing. A row holds two or three sentences, so the first word of each
     * inner sentence is skipped (it is capitalised for being first, not for
     * being a name), as is the pronoun "I".
     */
    if (/\d/.test(sentence)) return hintChunks;
    const pronounI = /^I(?:'m|'ve|'ll|'d)?$/;
    const hasName = sentence.split(/(?<=[.?!])\s+/).some((part) =>
      part
        .trim()
        .split(/\s+/)
        .slice(1)
        .some((word) => {
          const bare = word.replace(/[^A-Za-z'’]/g, "");
          if (pronounI.test(bare)) return false;
          return /^[A-Z]/.test(bare) && bare.replace(/[^A-Za-z]/g, "").length > 1;
        }),
    );
    return hasName ? hintChunks : [];
  };

  // Extract Korean sentences fallback
  const koSentences: string[] = useMemo(() => {
    const list: string[] = [];
    for (const b of scriptBlocks) {
      if (b.type === "instruction") {
        const txt = b.text.trim();
        if (txt && !txt.includes("한글 대본을") && !txt.includes("받아쓰기를")) {
          list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
        }
      } else if (b.type === "paragraph") {
        const txt = b.text.trim();
        if (txt) list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
      } else if (b.type === "sentences") {
        for (const it of (b as { type: "sentences"; items: { n: string; text: string }[] }).items) {
          const txt = it.text.trim();
          if (txt) list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
        }
      }
    }
    return list;
  }, [scriptBlocks]);

  // Model paired sentences (English + Korean)
  const sentences: LdScriptRow[] = useMemo(() => {
    if (ldEnglishScript && ldEnglishScript.length > 0) {
      return ldEnglishScript;
    }
    return koSentences.map((ko, idx) => ({
      n: String(idx + 1),
      ko,
      en: "",
    }));
  }, [ldEnglishScript, koSentences]);

  const total = sentences.length;
  const lines = useMemo(() => sentences.map((s) => s.en), [sentences]);
  const wordCounts = useMemo(() => lines.map((en) => tokensOf(en).length), [lines]);
  const ownsPlayer = Boolean(passagePlayers && passagePlayers.length > 0);

  /**
   * KIG-008 — the auto-generated context quiz is off (see `quizFlags.ts`).
   *
   * `generateListeningContextQuiz()` selects the answer by keyword substring match against the transcript, so the "correct"
   * option frequently has nothing to do with what the speaker says. Measured: 254 of 276 lessons wrong. The call site is kept,
   * behind the flag, so turning it back on is one edit. Reviewed questions written against the transcript do not belong here.
   */
  const contextQuizzes = useMemo(() => (SHOW_GENERATED_QUIZ ? generateListeningContextQuiz(sentences, hintWords) : []), [sentences, hintWords]);

  // Step 2 — the rules of src/lib/ldDictation.ts, fixed per lesson and line
  const blanksByLine = useMemo(() => lessonBlanks(lines, baseId, hintChunks), [lines, baseId, hintChunks]);
  const distractorsByLine = useMemo(() => lessonDistractors(lines, baseId), [lines, baseId]);
  const capitals = useMemo(() => lessonCapitals(lines, hintChunks), [lines, hintChunks]);

  // the whole lesson in Step 5 — the same strings the old Step 5 queue played (lessonSpeechForm of every English line)
  const queue = useMemo(() => {
    const list: { line: number; text: string }[] = [];
    sentences.forEach((s, i) => {
      if (s.en) list.push({ line: i, text: lessonSpeechForm(lessonKey, s.en) });
    });
    return list;
  }, [sentences, lessonKey]);
  const queueTexts = useMemo(() => queue.map((q) => q.text), [queue]);

  // ------------------------------------------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------------------------------------------
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);

  const [step, setStep] = useState<StepNo>(1);
  const [speed, setSpeed] = useState<number>(1);
  /** D28 나: the line Steps 2–4 share */
  const [lineIdx, setLineIdx] = useState(0);

  // This device's record (src/lib/ldLearning.ts) — `practiceKey` names the page the record belongs to, so a record is never
  // written under another page's name before that page's own record has been read.
  const storageKey = ldStorageKey(lessonKey);
  const [practice, setPractice] = useState<LdPractice>(emptyLdPractice);
  const practiceRef = useRef<LdPractice>(practice);
  const [practiceKey, setPracticeKey] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<LdPrefs>(DEFAULT_LD_PREFS);
  const [seenCompleted, setSeenCompleted] = useState(false);

  // Step 2 — the attempt at the line on screen (reset when the line or the way of dictating changes)
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marks, setMarks] = useState<Record<number, "ok" | "wrong" | "shown">>({});
  const [placed, setPlaced] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [shownNow, setShownNow] = useState(false);
  const [tilesNonce, setTilesNonce] = useState(0);
  /** wrong checks of each line on this visit — two open '정답 보기' */
  const [wrongCount, setWrongCount] = useState<Record<number, number>>({});
  /** the words of a line's blanks missed on this visit — Step 3 shows their cards first */
  const [missedWords, setMissedWords] = useState<Record<number, string[]>>({});

  // Step 4
  const [shownText, setShownText] = useState<Record<number, boolean>>({});
  /** lines said into the microphone on this visit — the first result is the first try */
  const [micTried, setMicTried] = useState<Record<number, boolean>>({});

  // Step 5
  const [allKo, setAllKo] = useState(false);
  const [koOpen, setKoOpen] = useState<Record<number, boolean>>({});
  const [notesOpen, setNotesOpen] = useState(false);

  // a single line or card playing: its key ("line:3:1" · "card:3:work in" · "row:3") — the engine says whether it still plays
  const [playing, setPlaying] = useState<string | null>(null);

  // a lesson seen completed on this screen stays completable after '완료 취소' (like STUDENT · VOCA); adjusted while rendering
  if (lessonCompleted && !seenCompleted) setSeenCompleted(true);

  useEffect(() => {
    let raw: string | null = null;
    let prefsRaw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
      prefsRaw = window.localStorage.getItem(LD_PREFS_KEY);
    } catch {
      raw = null;
    }
    const loaded = parseLdPractice(raw);
    practiceRef.current = loaded;
    setPractice(loaded);
    setPracticeKey(storageKey);
    setPrefs(parseLdPrefs(prefsRaw));
    setNotesOpen(loaded.notes.trim().length > 0);
    // Step 2 starts on the first line not yet answered right (this runs once, right after the view appears — a new lesson is a
    // new view, see LdLearningView below the types)
    const first = sentences.findIndex((s, i) => s.en && !loaded.dictationProgress[i]);
    setLineIdx(first >= 0 ? first : 0);
  }, [storageKey, sentences]);

  /** Every change to the record goes through here: state, the ref the handlers read, and this device's storage at once. */
  const commitPractice = useCallback(
    (update: (p: LdPractice) => LdPractice) => {
      const next = update(practiceRef.current);
      practiceRef.current = next;
      setPractice(next);
      if (practiceKey !== storageKey) return;
      try {
        window.localStorage.setItem(storageKey, serializeLdPractice(next));
      } catch {
        // storage unavailable: the lesson works, nothing is remembered
      }
    },
    [practiceKey, storageKey],
  );

  const changePrefs = (update: Partial<LdPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      try {
        window.localStorage.setItem(LD_PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // ------------------------------------------------------------------------------------------------------------
  // The common learning engine (공통-학습-엔진.md §2 · §5) and the completion gate (D02 나)
  // ------------------------------------------------------------------------------------------------------------
  const noteAttempt = useCallback(
    (idx: number, correct: boolean, mode: "tap" | "typed" | "voice", help: "none" | "hint" | "reveal", firstTry: boolean) => {
      try {
        recordAttempt(LD_LEARNING_PROFILE, ldItemKey(baseId, idx + 1), { lessonId: baseId, kind: "line", correct, help, mode, where: "lesson", firstTry });
      } catch {
        // storage unavailable: the lesson works, only the review forgets
      }
    },
    [baseId],
  );

  // The lesson is finished (LessonEndBar → ProgressProvider.toggleComplete announces it): the lines missed or helped in
  // dictation come back from the next day. Un-completing keeps the record.
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ course?: string; lessonId?: string; completed?: boolean }>).detail;
      if (!detail || detail.course !== "ld" || detail.lessonId !== lessonId || !detail.completed) return;
      try {
        const entries = ldReviewEntries(baseId, sentences.length, practiceRef.current, readCourseRecord("ld").log);
        markLessonDone(LD_LEARNING_PROFILE, baseId, entries);
      } catch {
        // storage unavailable: the lesson is complete; only the review forgets
      }
    };
    window.addEventListener(LESSON_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(LESSON_COMPLETE_EVENT, onComplete);
  }, [lessonId, baseId, sentences.length]);

  const anyChecked = Object.keys(practice.checked).length > 0;
  const gateReady = anyChecked || lessonCompleted || seenCompleted;
  useEffect(() => {
    if (practiceKey !== storageKey) return;
    setLessonGate("ld", lessonId, { ready: gateReady, reason: LD_GATE_REASON });
  }, [practiceKey, storageKey, gateReady, lessonId]);
  useEffect(() => () => clearLessonGate("ld", lessonId), [lessonId]);

  // ------------------------------------------------------------------------------------------------------------
  // Sound — a line is lessonSpeechForm(lessonKey, line) and a card lessonSpeechForm(lessonKey, card.original), as always
  // ------------------------------------------------------------------------------------------------------------
  const stopAll = useCallback(() => {
    stopSpeech();
    setPlaying(null);
  }, []);
  useEffect(() => () => stopSpeech(), []);

  const isOn = (key: string) => playing === key && speech.speaking;

  /** Play one text; the same key again stops it (a line at another speed is another key). */
  const playText = useCallback(
    (key: string, text: string, rate: number) => {
      if (!text) return;
      if (playing === key && getSpeechSnapshot().speaking) {
        stopAll();
        return;
      }
      unlockMobileAudio();
      stopSpeech();
      setPlaying(key);
      const done = () => setPlaying((current) => (current === key ? null : current));
      speakText(lessonSpeechForm(lessonKey, text), { lang: "en", rate, onEnd: done, onError: done });
    },
    [playing, lessonKey, stopAll],
  );

  const playLine = useCallback((idx: number, rate: number) => playText(`line:${idx}:${rate}`, sentences[idx]?.en ?? "", rate), [playText, sentences]);

  /** '처음부터' in Step 5: the whole lesson from its first line at the chosen speed (the player shows it). */
  const playFromStart = () => {
    if (!queueTexts.length) return;
    unlockMobileAudio();
    stopAll();
    playSentenceQueue(queueTexts, { lang: "en", gender: "neutral", rate: speed, startIndex: 0, gap: 300 });
  };
  // the line the Step 5 player is on (its queue is this view's line list)
  const queueLine = playing === null && speech.speaking && speech.total === queue.length && speech.index >= 0 ? queue[speech.index]?.line ?? -1 : -1;

  // ------------------------------------------------------------------------------------------------------------
  // Steps and lines
  // ------------------------------------------------------------------------------------------------------------
  const resetAttempt = useCallback(() => {
    setAnswers({});
    setMarks({});
    setPlaced([]);
    setTyped("");
    setResult(null);
    setShownNow(false);
    setTilesNonce((n) => n + 1);
  }, []);

  /** Move Steps 2–4 to line i (D28 나); `play` plays it inside the press ('다음 문장' — LD-U02 ④). */
  const goLine = (i: number, play = false) => {
    if (i < 0 || i >= total) return;
    stopAll();
    setLineIdx(i);
    resetAttempt();
    // inside the press itself, so a phone lets the sound start (it plays the line's text; the state catches up)
    if (play && sentences[i]?.en) playLine(i, speed);
  };

  function scrollToStepTop() {
    const start = document.querySelector<HTMLElement>("main [data-ld-view] [data-step-start]");
    if (!start) return;
    const top = start.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
    const distance = Math.abs(window.scrollY - top);
    if (distance < 4) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce || distance > window.innerHeight * 1.5 ? "auto" : "smooth" });
  }

  const allChecked = total > 0 && sentences.every((s, i) => !s.en || practice.checked[i]);

  const switchStep = (n: StepNo) => {
    if (n === step) return; // the current tab again: keep the work on screen
    stopAll();
    // D28: Steps 2–4 continue on the same line — but after the last line of a finished dictation, Steps 3 · 4 start from line 1
    if ((n === 3 || n === 4) && step === 2 && lineIdx === total - 1 && allChecked) {
      setLineIdx(0);
      resetAttempt();
    }
    setStep(n);
  };

  /** A button that moves to another step presses that step's tab (LessonStepNavigation follows the tab presses), then the tabs come under the header. */
  const goToStep = (n: StepNo) => {
    const tab = document.querySelector<HTMLButtonElement>(`main [data-ld-view] [data-step-tab="${n}"]`);
    if (tab) tab.click();
    else switchStep(n);
    window.requestAnimationFrame(scrollToStepTop);
  };

  /** D29 나: a line not yet checked in Step 2 is hidden in Steps 3–5 until '그래도 보기' (once for the lesson). */
  const hiddenLine = (i: number) => !practice.peek && !practice.checked[i];
  const peek = () => commitPractice((p) => ({ ...p, peek: true }));
  const dictateFirst = (i: number) => {
    if (i !== lineIdx) {
      setLineIdx(i);
      resetAttempt();
    }
    goToStep(2);
  };

  function beforeDictation(i: number) {
    return (
      <div data-before-dictation className="flex flex-col gap-2 rounded-card border border-dashed border-ink-faint/40 bg-sunken px-4 py-3">
        <p className="text-label text-ink-soft">이 문장은 아직 받아쓰기 전이에요. 먼저 들어 보고 받아쓰면 더 오래 남아요.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-action="dictate-first" onClick={() => dictateFirst(i)} className={outlineButton}>
            먼저 받아쓰기
          </button>
          <button type="button" data-action="peek" onClick={peek} className={quietButton}>
            그래도 보기
          </button>
        </div>
      </div>
    );
  }

  function lineNav(extra?: ReactNode) {
    return (
      <div data-line-nav className="flex items-center justify-between gap-2">
        <button type="button" data-action="prev-line" aria-label="이전 문장" disabled={lineIdx <= 0} onClick={() => goLine(lineIdx - 1)} className={iconButton}>
          <IconChevronRight className="rotate-180" />
        </button>
        <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 text-label tabular-nums text-ink-soft" aria-live="polite">
          <span>
            문장 <span data-line-no>{lineIdx + 1}</span> / {total}
          </span>
          {extra}
        </p>
        <button type="button" data-action="next-line" aria-label="다음 문장" disabled={lineIdx >= total - 1} onClick={() => goLine(lineIdx + 1)} className={iconButton}>
          <IconChevronRight />
        </button>
      </div>
    );
  }

  /** A line's dictation mark: right (first try or not), helped, or wrong so far. */
  function lineMark(i: number): { kind: "right" | "helped" | "wrong" | null; label: string } {
    if (practice.revealed[i]) return { kind: "helped", label: "정답 봄" };
    if (practice.dictationProgress[i]) return { kind: "right", label: practice.missed[i] ? "다시 맞힘" : "맞힘" };
    if (practice.missed[i]) return { kind: "wrong", label: "틀림" };
    return { kind: null, label: "" };
  }
  function markChip(i: number) {
    const m = lineMark(i);
    if (!m.kind) return null;
    return (
      <span
        data-line-mark={m.kind}
        className={
          "inline-flex items-center gap-1 text-caption font-semibold " +
          (m.kind === "right" ? "text-success" : m.kind === "wrong" ? "text-danger" : "text-ink-soft")
        }
      >
        {m.kind === "right" ? <IconCheck size={12} /> : m.kind === "wrong" ? <IconX size={12} /> : null}
        {m.label}
      </span>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Step 2 — checking
  // ------------------------------------------------------------------------------------------------------------
  const row = sentences[lineIdx];
  const lineBlanks: LdBlank[] = blanksByLine[lineIdx]?.blanks ?? [];
  const mode: LdDictationMode = prefs.mode === "blanks" && lineBlanks.length === 0 ? "blocks" : prefs.mode;
  const tileSet = useMemo(
    () => (row?.en ? blockTiles(row.en, distractorsByLine[lineIdx] ?? [], capitals) : null),
    // tilesNonce: a new shuffle for a new attempt
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [row, lineIdx, distractorsByLine, capitals, tilesNonce],
  );
  const done = result?.kind === "correct" || shownNow;

  const setMode = (m: LdDictationMode) => {
    if (m === prefs.mode) return;
    changePrefs({ mode: m });
    resetAttempt();
  };

  /** One check of the line on screen: the record, the engine, the counts — never twice for a line already right. */
  function commitCheck(idx: number, correct: boolean, answerMode: "tap" | "typed", missedList: string[] = []) {
    const firstTry = !practice.checked[idx];
    const helped = practice.revealed[idx] === true;
    commitPractice((p) => ({
      ...p,
      checked: { ...p.checked, [idx]: true },
      missed: correct ? p.missed : { ...p.missed, [idx]: true },
      dictationProgress: correct ? { ...p.dictationProgress, [idx]: true } : p.dictationProgress,
    }));
    noteAttempt(idx, correct, answerMode, helped ? "reveal" : "none", firstTry);
    if (!correct) {
      setWrongCount((prev) => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
      if (missedList.length) setMissedWords((prev) => ({ ...prev, [idx]: [...new Set([...(prev[idx] ?? []), ...missedList])] }));
    }
    return helped;
  }

  function check() {
    if (!row?.en || done) return;
    const idx = lineIdx;
    if (mode === "blanks") {
      if (lineBlanks.every((_, bi) => !(answers[bi] ?? "").trim())) {
        setResult({ kind: "empty" });
        return;
      }
      const typedMode = prefs.blankInput === "type";
      const next: Record<number, "ok" | "wrong"> = {};
      let right = 0;
      lineBlanks.forEach((b, bi) => {
        const ok = blankRight(answers[bi] ?? "", b.word, typedMode);
        next[bi] = ok ? "ok" : "wrong";
        if (ok) right++;
      });
      setMarks(next);
      const correct = right === lineBlanks.length;
      const missedList = lineBlanks.filter((_, bi) => next[bi] === "wrong").map((b) => normWord(b.word));
      const helped = commitCheck(idx, correct, typedMode ? "typed" : "tap", missedList);
      setResult(correct ? { kind: "correct", helped } : { kind: "wrong", right, total: lineBlanks.length });
      return;
    }
    if (mode === "blocks") {
      if (!tileSet) return;
      if (placed.length === 0) {
        setResult({ kind: "empty" });
        return;
      }
      const words = placed.map((id) => tileSet.tiles.find((t) => t.id === id)?.word ?? "");
      const correct = verifyAnyWordSequence(words, tileSet.accepted);
      const diff = correct ? undefined : diffWords(words, tileSet.words);
      const missedList = diff ? diff.ops.filter((o) => o.kind !== "ok" && o.target).map((o) => normWord(o.target ?? "")) : [];
      const helped = commitCheck(idx, correct, "tap", missedList);
      setResult(correct ? { kind: "correct", helped } : { kind: "wrong", diff });
      return;
    }
    if (!typed.trim()) {
      setResult({ kind: "empty" });
      return;
    }
    // KIG-024 · 6단계 G1: typedDictationMatches accepts numbers typed as heard ("two o'clock" for "2:00") and a hyphen as a space
    const correct = typedDictationMatches(typed, row.en);
    const diff = correct ? undefined : diffWords(spokenTypedForm(typed).split(" ").filter(Boolean), spokenTypedForm(row.en).split(" ").filter(Boolean));
    const missedList = diff ? diff.ops.filter((o) => o.kind !== "ok" && o.target).map((o) => normWord(o.target ?? "")) : [];
    const helped = commitCheck(idx, correct, "typed", missedList);
    setResult(correct ? { kind: "correct", helped } : { kind: "wrong", diff });
  }

  /** '정답 보기' — after two wrong checks (LD-L05): the answer is shown and the line counts as helped. */
  function reveal() {
    if (!row?.en || done) return;
    const idx = lineIdx;
    commitPractice((p) => ({ ...p, revealed: { ...p.revealed, [idx]: true } }));
    if (mode === "blanks") {
      const next: Record<number, "ok" | "wrong" | "shown"> = {};
      const filled: Record<number, string> = {};
      lineBlanks.forEach((b, bi) => {
        const ok = marks[bi] === "ok" && blankRight(answers[bi] ?? "", b.word, prefs.blankInput === "type");
        next[bi] = ok ? "ok" : "shown";
        filled[bi] = ok ? answers[bi] : b.word;
      });
      setMarks(next);
      setAnswers(filled);
    }
    setShownNow(true);
    setResult({ kind: "shown" });
  }

  /** Where '다음 문장' goes: the next line not yet right (round the lesson), else the next one; null at the very end. */
  const nextLine = (() => {
    for (let k = 1; k <= total; k++) {
      const i = (lineIdx + k) % total;
      if (i !== lineIdx && sentences[i]?.en && !practice.dictationProgress[i]) return i;
    }
    return lineIdx + 1 < total ? lineIdx + 1 : null;
  })();

  /** A blank's answer, chosen or typed — its old mark and the old verdict go (the other blanks keep theirs). */
  const answerBlank = (bi: number, value: string) => {
    if (done) return;
    setAnswers((prev) => ({ ...prev, [bi]: value }));
    setMarks((prev) => {
      if (!(bi in prev)) return prev;
      const next = { ...prev };
      delete next[bi];
      return next;
    });
    setResult(null);
  };
  const placeTile = (id: string) => {
    if (done || placed.includes(id)) return;
    setPlaced((prev) => [...prev, id]);
    setResult(null);
  };
  const removeTile = (id: string) => {
    if (done) return;
    setPlaced((prev) => prev.filter((x) => x !== id));
    setResult(null);
  };

  // ------------------------------------------------------------------------------------------------------------
  // Step 4
  // ------------------------------------------------------------------------------------------------------------
  const onMicResult = useCallback(
    (idx: number, score: number, textHidden: boolean) => {
      const firstTry = !micTried[idx];
      setMicTried((prev) => ({ ...prev, [idx]: true }));
      commitPractice((p) => ({ ...p, shadowScores: { ...p.shadowScores, [idx]: Math.max(p.shadowScores[idx] ?? 0, score) } }));
      setShownText((prev) => ({ ...prev, [idx]: true }));
      // said with the English on screen is reading it out — a help; said with it hidden is recall (like STUDENT)
      noteAttempt(idx, score >= LD_MIC_PASS, "voice", textHidden ? "none" : "hint", firstTry);
    },
    [micTried, commitPractice, noteAttempt],
  );

  // ------------------------------------------------------------------------------------------------------------
  // Step 1 quiz (off — SHOW_GENERATED_QUIZ); one-shot: the first choice reveals the answer
  // ------------------------------------------------------------------------------------------------------------
  function handleSelectQuizOption(qIdx: number, oIdx: number) {
    if (practice.quizSubmitted[qIdx]) return;
    commitPractice((p) => ({ ...p, selectedAnswers: { ...p.selectedAnswers, [qIdx]: oIdx }, quizSubmitted: { ...p.quizSubmitted, [qIdx]: true } }));
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render — Step 1
  // ------------------------------------------------------------------------------------------------------------
  function renderStep1() {
    return (
      <section data-step-panel="1" aria-label="블라인드 리스닝" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-label text-ink-soft">대본 없이 끝까지 들어 보세요.</p>
          <StepHelp>
            <p>처음에는 대본을 보지 않고 전체 흐름을 들어요. 뜻으로 짐작할 수 없는 이름과 숫자는 미리 알려 드려요.</p>
            <p>그다음 받아쓰기에서 한 문장씩 자세히 들어요.</p>
          </StepHelp>
        </div>
        <HintChips chunks={hintChunks} />
        <div data-learn-first data-ld-passage className="flex flex-col gap-2">
          {ownsPlayer && passagePlayers
            ? passagePlayers.map((p) => (
                <AudioPlayer
                  key={p.id}
                  src={p.src}
                  fallbackSentences={p.fallbackSentences}
                  lang={p.lang}
                  gender={p.gender}
                  label={p.label}
                  speeds={SPEEDS}
                  initialRate={speed}
                  onRateChange={setSpeed}
                />
              ))
            : queueTexts.length > 0
              ? <AudioPlayer fallbackSentences={queueTexts} lang="en" gender="neutral" speeds={SPEEDS} initialRate={speed} onRateChange={setSpeed} />
              : <p className="text-label text-ink-soft">이 강의에는 들을 문장이 없어요.</p>}
        </div>
        {SHOW_GENERATED_QUIZ && contextQuizzes.length > 0 ? (
          <div data-quiz className="flex flex-col gap-4 rounded-card border border-line bg-raised px-4 py-4">
            {contextQuizzes.map((quiz, qIdx) => {
              const selected = practice.selectedAnswers[qIdx];
              const submitted = practice.quizSubmitted[qIdx];
              return (
                <div key={qIdx} className="flex flex-col gap-2">
                  <p className="text-body font-semibold text-ink">{quiz.question}</p>
                  {quiz.options.map((opt, oIdx) => {
                    const answer = submitted && oIdx === quiz.answerIndex;
                    const wrongPick = submitted && selected === oIdx && !answer;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelectQuizOption(qIdx, oIdx)}
                        className={
                          "flex min-h-11 items-center justify-between gap-2 rounded-control border px-3 text-left text-label " +
                          (answer ? "border-success/60 text-success" : wrongPick ? "border-danger/60 text-danger" : "border-line text-ink")
                        }
                      >
                        <span>{opt}</span>
                        {answer ? <IconCheck /> : null}
                      </button>
                    );
                  })}
                  {submitted ? <p className="text-label text-ink-soft">{quiz.explanation}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render — Step 2
  // ------------------------------------------------------------------------------------------------------------
  function feedbackText(): { kind: string; text: string } {
    if (!result) return { kind: "none", text: "" };
    if (result.kind === "empty") {
      return {
        kind: "empty",
        text: mode === "blanks" ? "빈칸을 먼저 채워 주세요." : mode === "blocks" ? "낱말을 먼저 눌러 문장을 만드세요." : "들은 문장을 먼저 써 주세요.",
      };
    }
    if (result.kind === "correct") return { kind: "correct", text: result.helped ? "맞았어요 — 정답을 본 뒤라 '도움 받음'으로 남아요." : "맞았어요." };
    if (result.kind === "shown") return { kind: "shown", text: "정답을 보여 드렸어요. 다시 들어 보고 다음 문장으로 가세요." };
    const twice = (wrongCount[lineIdx] ?? 0) >= 2 ? " '정답 보기'를 누르면 답이 보여요." : "";
    if (mode === "blanks") return { kind: "wrong", text: `빈칸 ${result.total}개 중 ${result.right}개 맞았어요. 빨간 칸을 다시 들어 보세요.${twice}` };
    const d = result.diff;
    const summary = d ? diffSummary(mode === "blocks" ? { ...d, wrong: d.wrong + d.spelling, spelling: 0 } : d) : "";
    return { kind: "wrong", text: `다시 들어 보세요${summary ? ` — ${summary}` : ""}.${twice}` };
  }

  /** The line as written with its blanks as numbered gaps — a gap shows the answer given, or its number (the rows below answer it). */
  function renderBlankSentence(text: string) {
    const toks = tokensOf(text);
    const at = new Map(lineBlanks.map((b, bi) => [b.index, bi]));
    const pieces: ReactNode[] = [];
    let cursor = 0;
    toks.forEach((t, k) => {
      if (t.start > cursor) pieces.push(<Fragment key={`g${k}`}>{text.slice(cursor, t.start)}</Fragment>);
      const bi = at.get(k);
      if (bi === undefined) {
        pieces.push(<Fragment key={`w${k}`}>{text.slice(t.start, t.end)}</Fragment>);
      } else {
        const value = (answers[bi] ?? "").trim();
        const mark = marks[bi];
        pieces.push(
          <span
            key={`b${k}`}
            data-gap={bi}
            className={
              "mx-0.5 inline-block min-w-[4.5rem] border-b-2 px-1 text-center font-semibold " +
              (mark === "ok" ? "border-success text-success" : mark === "wrong" ? "border-danger text-danger" : value ? "border-ink text-ink" : "border-dashed border-ink-faint text-ink-faint")
            }
          >
            {value || <span className="text-caption tabular-nums">{bi + 1}</span>}
          </span>,
        );
      }
      cursor = t.end;
    });
    if (cursor < text.length) pieces.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
    return (
      <p data-cloze lang="en" className="text-learn text-body leading-loose text-ink">
        {pieces}
      </p>
    );
  }

  /** 빈칸 (D24 나): one numbered row per blank — three sound-alike words to choose from, or a 16px box with '직접 쓰기'. */
  function renderBlanks(text: string) {
    const typing = prefs.blankInput === "type" && !done;
    return (
      <div className="flex flex-col gap-3">
        {renderBlankSentence(text)}
        <ol data-blank-rows className="flex list-none flex-col gap-2">
          {lineBlanks.map((blank, bi) => {
            const value = answers[bi] ?? "";
            const mark = marks[bi];
            return (
              <li key={bi} data-blank={bi} data-token={blank.index} data-mark={mark ?? undefined} className="flex flex-wrap items-center gap-2">
                <span className="w-6 shrink-0 text-label font-semibold tabular-nums text-ink-soft">{bi + 1}</span>
                {typing ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => answerBlank(bi, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        check();
                      }
                    }}
                    aria-label={`${bi + 1}번 빈칸`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    lang="en"
                    className={
                      "min-h-11 w-full max-w-[14rem] rounded-control border bg-raised px-3 text-body text-ink focus:border-ink focus:outline-none " +
                      (mark === "ok" ? "border-success/60" : mark === "wrong" ? "border-danger" : "border-line")
                    }
                  />
                ) : (
                  <div role="group" aria-label={`${bi + 1}번 빈칸`} className="flex flex-wrap gap-2">
                    {blank.options.map((option) => {
                      const picked = normWord(value) === normWord(option);
                      const tone = picked
                        ? mark === "ok"
                          ? "border-success/60 bg-success/10 text-success"
                          : mark === "wrong"
                            ? "border-danger bg-danger/10 text-danger"
                            : "border-ink bg-sunken text-ink"
                        : "border-line bg-raised text-ink hover:bg-sunken";
                      return (
                        <button
                          key={option}
                          type="button"
                          data-option={option}
                          aria-pressed={picked}
                          disabled={done && !picked}
                          onClick={() => answerBlank(bi, option)}
                          lang="en"
                          className={`inline-flex min-h-11 min-w-16 items-center justify-center rounded-control border px-4 text-body font-semibold transition-colors cursor-pointer disabled:cursor-default disabled:opacity-40 ${tone}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
                {mark === "ok" ? (
                  <IconCheck className="text-success" />
                ) : mark === "wrong" ? (
                  <IconX className="text-danger" />
                ) : mark === "shown" ? (
                  <span className="text-caption text-ink-soft">
                    정답 <span lang="en" className="font-semibold text-ink">{blank.word}</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  function renderBlocks() {
    if (!tileSet) return null;
    const byId = new Map(tileSet.tiles.map((t) => [t.id, t]));
    const placedTiles = placed.map((id) => byId.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
    // marks of the placed tiles after a wrong check, in order (diffWords over the placed words)
    const givenMarks: DiffKind[] = [];
    if (result?.kind === "wrong" && result.diff) for (const op of result.diff.ops) if (op.given !== undefined) givenMarks.push(op.kind);
    const markOf = (i: number) =>
      result?.kind === "correct" ? "border-success/60" : givenMarks[i] ? (givenMarks[i] === "ok" ? "border-success/60" : "border-danger text-danger") : "border-line";
    // The measuring copy lays the line out as the right answer will stand, then every other tile — the box never grows and the
    // bank below it does not move (LD-U02); a placed tile leaves a same-size dashed place in the bank.
    const ghost: { id: string; label: string }[] = [];
    {
      const unused = [...tileSet.tiles];
      for (const w of tileSet.words) {
        const at = unused.findIndex((t) => t.word.toLowerCase() === w.toLowerCase());
        if (at >= 0) ghost.push(unused.splice(at, 1)[0]);
      }
      ghost.push(...unused);
    }
    return (
      <div className="flex flex-col gap-2">
        <div data-assembly className="grid rounded-card border border-dashed border-ink-faint/40 bg-sunken/60 p-2.5">
          <div aria-hidden className="invisible col-start-1 row-start-1 flex flex-wrap content-start items-center gap-1.5">
            {ghost.map((t) => (
              <span key={`g-${t.id}`} className={`${tileBase} border-line`}>
                {t.label}
              </span>
            ))}
          </div>
          <div className="col-start-1 row-start-1 flex flex-wrap content-start items-center gap-1.5">
            {placedTiles.length === 0 ? (
              <span className="inline-flex min-h-11 items-center px-1 text-label text-ink-faint">들리는 순서대로 아래 낱말을 누르세요</span>
            ) : (
              placedTiles.map((t, i) => (
                <button
                  key={`p-${t.id}`}
                  type="button"
                  data-placed
                  title="눌러서 빼기"
                  aria-label={`${t.label} 빼기`}
                  onClick={() => removeTile(t.id)}
                  lang="en"
                  className={`${tileBase} bg-raised text-ink transition-colors cursor-pointer hover:bg-sunken ${markOf(i)}`}
                >
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p data-count className="text-caption tabular-nums text-ink-soft">
            내 문장 {placed.length}/{tileSet.words.length}
          </p>
          <div className="flex items-center">
            <button type="button" data-action="undo" disabled={placed.length === 0 || done} onClick={() => removeTile(placed[placed.length - 1])} className={quietButton}>
              <IconBackspace />
              <span>하나 빼기</span>
            </button>
            <button type="button" data-action="reset-tiles" disabled={done} onClick={() => { setPlaced([]); setResult(null); }} className={quietButton}>
              초기화
            </button>
          </div>
        </div>
        <div data-word-bank role="group" aria-label="낱말 보관함" className="flex flex-wrap gap-1.5">
          {tileSet.tiles.map((t) =>
            placed.includes(t.id) ? (
              <span key={t.id} aria-hidden data-placeholder className={`${tileBase} border-dashed border-line text-transparent select-none`}>
                {t.label}
              </span>
            ) : (
              <button
                key={t.id}
                type="button"
                data-tile
                disabled={done}
                onClick={() => placeTile(t.id)}
                lang="en"
                className={`${tileBase} border-line bg-raised text-ink transition-colors cursor-pointer select-none hover:bg-sunken disabled:cursor-default`}
              >
                {t.label}
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  function renderTyping() {
    const d = result?.kind === "wrong" ? result.diff : undefined;
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-ink-soft">들은 문장</span>
          <textarea
            data-typing
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                check();
              }
            }}
            rows={3}
            readOnly={done}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="들리는 영어 문장을 그대로 쓰세요"
            className="w-full resize-y rounded-control border border-line bg-raised px-3 py-2.5 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>
        {d ? (
          <div data-diff className="flex flex-col gap-1">
            <p className="text-caption text-ink-soft">내 답 — 대소문자와 부호는 빼고 견줘요. 빨간 곳이 달라요, ＿ 는 빠진 낱말이에요.</p>
            <p lang="en" className="flex flex-wrap gap-x-1.5 gap-y-1 text-body">
              {d.ops.map((op, k) =>
                op.kind === "ok" ? (
                  <span key={k} className="text-success">{op.given}</span>
                ) : op.kind === "missing" ? (
                  <span key={k} aria-label="빠진 낱말" className="text-danger">＿</span>
                ) : (
                  <span key={k} className="text-danger line-through decoration-1">{op.given}</span>
                ),
              )}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  function renderStep2() {
    if (!row || !row.en) {
      return (
        <section data-step-panel="2" aria-label="탭-딕테이션" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">이 강의에는 받아쓸 영어 문장이 없어요.</p>
        </section>
      );
    }
    const idx = lineIdx;
    const checked = practice.checked[idx] === true;
    const hints = pickHintsFor(row.en);
    const replaying = isOn(`line:${idx}:${speed}`);
    const slowOn = isOn(`line:${idx}:${SLOW}`);
    const fb = feedbackText();
    const canReveal = !done && (wrongCount[idx] ?? 0) >= 2;
    const solvedCount = sentences.filter((s, i) => s.en && practice.dictationProgress[i]).length;
    return (
      <section data-step-panel="2" data-solved-lines={solvedCount} aria-label="탭-딕테이션" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-label text-ink-soft">
            {mode === "blanks" ? "문장을 듣고 빈칸을 채우세요." : mode === "blocks" ? "문장을 듣고 들리는 순서대로 낱말을 누르세요." : "문장을 듣고 들리는 대로 쓰세요."}
          </p>
          <StepHelp>
            <p>빈칸: 약하게 들리는 작은 낱말과 끝소리(a · the · and · in · of · -ed · -s)를 비워 두었어요. 소리가 비슷한 셋 중에서 고르거나 &lsquo;직접 쓰기&rsquo;로 써요.</p>
            <p>블록: 문장의 모든 낱말을 순서대로 놓아요. 쓰기: 문장 전체를 써요 — 숫자는 들린 대로 써도 돼요.</p>
            <p>해석은 한 번 채점하면 보여요. 두 번 틀리면 &lsquo;정답 보기&rsquo;를 쓸 수 있어요.</p>
          </StepHelp>
        </div>

        <div role="group" aria-label="받아쓰기 방식" className="grid grid-cols-3 gap-1 rounded-control bg-sunken p-1">
          {(["blanks", "blocks", "typing"] as const).map((m) => (
            <button key={m} type="button" data-mode={m} aria-pressed={prefs.mode === m} onClick={() => setMode(m)} className={segmentButton(prefs.mode === m)}>
              {m === "blanks" ? "빈칸" : m === "blocks" ? "블록" : "쓰기"}
            </button>
          ))}
        </div>

        {lineNav(
          <>
            {markChip(idx)}
            <span className="text-caption text-ink-faint">맞힌 문장 {solvedCount}/{total}</span>
          </>,
        )}

        <div
          data-dictation
          data-index={idx}
          data-mode={mode}
          data-blanks={lineBlanks.length}
          data-checked={checked ? "true" : "false"}
          data-solved={practice.dictationProgress[idx] ? "true" : "false"}
          className="flex flex-col gap-3 border-t border-line pt-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" data-action="play-line" onClick={() => playLine(idx, speed)} className={outlineButton}>
              {replaying ? <IconStop /> : <IconPlay />}
              <span>{replaying ? "정지" : "듣기"}</span>
            </button>
            <button type="button" data-action="play-slow" onClick={() => playLine(idx, SLOW)} className={outlineButton}>
              {slowOn ? <IconStop /> : <IconPlay />}
              <span>{slowOn ? "정지" : `느리게 ${SLOW}×`}</span>
            </button>
            {mode === "blanks" ? (
              <button
                type="button"
                role="switch"
                aria-checked={prefs.blankInput === "type"}
                data-action="blank-typing"
                onClick={() => {
                  changePrefs({ blankInput: prefs.blankInput === "type" ? "choose" : "type" });
                  setResult(null);
                }}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
              >
                <span aria-hidden className={"relative inline-block h-5 w-9 rounded-full transition-colors " + (prefs.blankInput === "type" ? "bg-ink" : "bg-line-strong/25")}>
                  <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-2xs transition-[left] " + (prefs.blankInput === "type" ? "left-[18px]" : "left-0.5")} />
                </span>
                <span>직접 쓰기</span>
              </button>
            ) : null}
          </div>

          {checked ? (
            <div data-ko-line className="flex flex-col">
              <p data-ko className="text-label text-ink-soft">
                {row.ko}
              </p>
              <RiddleAnswer key={idx} answer={row.answer} />
            </div>
          ) : (
            <p className="text-caption text-ink-faint">해석은 한 번 채점하면 보여요.</p>
          )}

          {hints.length > 0 ? (
            // LD-HINTS-01 — the proper nouns and numbers of this line; folded where the words are on screen anyway (LD-U21)
            <details key={`hints-${idx}-${mode}`} data-line-hints open={mode === "typing"} className="group rounded-control border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-control px-3 text-label font-medium text-ink-soft transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
                <span>이름 · 숫자 힌트 {hints.length}개</span>
                <IconChevronDown className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="flex list-none flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
                {hints.map((hint, index) => (
                  <li key={`${hint}-${index}`} data-hint-chip lang="en" className="rounded-control bg-sunken px-2 py-1 text-label text-ink">
                    {hint}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {prefs.mode === "blanks" && mode === "blocks" ? <p className="text-caption text-ink-soft">이 문장은 빈칸으로 비울 낱말이 없어 블록으로 풀어요.</p> : null}
          {mode === "blanks" ? renderBlanks(row.en) : mode === "blocks" ? renderBlocks() : renderTyping()}

          {done && mode !== "blanks" ? (
            <p data-answer lang="en" className="text-learn text-body font-semibold text-ink">
              {row.en}
            </p>
          ) : null}

          <p
            data-feedback={fb.kind}
            role="status"
            aria-live="polite"
            className={
              "text-label font-semibold " +
              (fb.kind === "correct" ? "text-success" : fb.kind === "wrong" ? "text-danger" : "text-ink") +
              (fb.text ? "" : " sr-only")
            }
          >
            {fb.text}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {done ? (
              nextLine !== null ? (
                <button type="button" data-action="next" onClick={() => goLine(nextLine, true)} className={`${filledButton} w-full sm:w-auto`}>
                  <span>다음 문장</span>
                  <IconChevronRight />
                </button>
              ) : (
                <p className="text-label text-ink-soft">이 강의의 마지막 문장이에요.</p>
              )
            ) : (
              <button type="button" data-action="check" onClick={check} className={`${filledButton} w-full sm:w-auto`}>
                정답 확인
              </button>
            )}
            {canReveal ? (
              <button type="button" data-action="reveal" onClick={reveal} className={outlineButton}>
                정답 보기
              </button>
            ) : null}
            {done ? (
              <button type="button" data-action="retry" onClick={resetAttempt} className={quietButton}>
                다시 풀기
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render — Step 3
  // ------------------------------------------------------------------------------------------------------------
  function renderStep3() {
    const idx = lineIdx;
    const line = sentences[idx];
    const cards: LiaisonCard[] = line?.en ? generateLiaisonPoints(line.en) : [];
    // the cards with a word the learner missed in Step 2 first (LD-L06 ⑤)
    const missed = new Set(missedWords[idx] ?? []);
    const hit = (c: LiaisonCard) => c.original.split(" ").some((w) => missed.has(normWord(w)));
    const ordered = missed.size ? [...cards.filter(hit), ...cards.filter((c) => !hit(c))] : cards;
    const hidden = hiddenLine(idx);
    const lineOn = isOn(`line:${idx}:${speed}`);
    return (
      <section data-step-panel="3" aria-label="연음 & 소리 클리닉" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-label text-ink-soft">문장 속에서 이어지거나 줄어드는 소리를 들어 보세요.</p>
          <StepHelp>
            <p>낱말이 이어 읽히거나(연음) 줄어드는 곳을 카드로 보여 줘요. 카드의 듣기로 그 부분만 들어 보세요.</p>
            <p>받아쓰기에서 틀린 낱말이 든 카드가 맨 앞에 와요.</p>
          </StepHelp>
        </div>
        {lineNav(markChip(idx))}
        {!line?.en ? (
          <p className="text-label text-ink-soft">이 강의에는 영어 문장이 없어요.</p>
        ) : hidden ? (
          beforeDictation(idx)
        ) : (
          <div data-line={idx} className="flex flex-col gap-1">
            <p data-en lang="en" className="text-learn text-body font-semibold text-ink">
              {line.en}
            </p>
            <p data-ko className="text-label text-ink-soft">
              {line.ko}
            </p>
            <RiddleAnswer key={idx} answer={line.answer} />
          </div>
        )}
        {line?.en ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" data-action="play-line" onClick={() => playLine(idx, speed)} className={outlineButton}>
              {lineOn ? <IconStop /> : <IconPlay />}
              <span>{lineOn ? "정지" : "문장 듣기"}</span>
            </button>
          </div>
        ) : null}
        {line?.en && !hidden ? (
          ordered.length === 0 ? (
            <div data-no-cards className="flex flex-col gap-2 rounded-card border border-line bg-raised px-4 py-3">
              <p className="text-label text-ink-soft">보통 · 느린 속도로 번갈아 들어 보세요.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" data-action="play-normal" onClick={() => playLine(idx, 1)} className={outlineButton}>
                  {isOn(`line:${idx}:1`) ? <IconStop /> : <IconPlay />}
                  <span>보통 1×</span>
                </button>
                <button type="button" data-action="play-slow" onClick={() => playLine(idx, SLOW)} className={outlineButton}>
                  {isOn(`line:${idx}:${SLOW}`) ? <IconStop /> : <IconPlay />}
                  <span>느리게 {SLOW}×</span>
                </button>
              </div>
            </div>
          ) : (
            <ul data-cards className="list-none divide-y divide-line rounded-card border border-line bg-raised">
              {ordered.map((card, i) => {
                const key = `card:${idx}:${card.original}`;
                const on = isOn(key);
                return (
                  <li key={`${card.original}-${i}`} data-card className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-caption text-ink-soft">{card.typeLabel}</p>
                      <p className="text-body text-ink">
                        <span lang="en" className="font-semibold">
                          {card.original}
                        </span>
                        <span aria-hidden className="px-1.5 text-ink-faint">
                          →
                        </span>
                        <span data-heard className="font-semibold">
                          {card.koreanSound}
                        </span>
                        {card.phonetic ? <span className="ml-1.5 text-label text-ink-soft">{card.phonetic}</span> : null}
                      </p>
                      <p className="mt-0.5 text-label text-ink-soft">{card.rule}</p>
                    </div>
                    <button
                      type="button"
                      data-action="play-card"
                      aria-label={on ? `${card.original} 정지` : `${card.original} 듣기`}
                      onClick={() => playText(key, card.original, speed)}
                      className={iconButton}
                    >
                      {on ? <IconStop /> : <IconSpeaker />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render — Step 4
  // ------------------------------------------------------------------------------------------------------------
  function renderStep4() {
    const idx = lineIdx;
    const line = sentences[idx];
    const hidden = hiddenLine(idx);
    const hideable = (wordCounts[idx] ?? 0) <= LD_HIDE_TEXT_MAX_WORDS;
    const textHidden = prefs.hideText && hideable && !shownText[idx];
    const best = practice.shadowScores[idx];
    const lineOn = isOn(`line:${idx}:${speed}`);
    return (
      <section data-step-panel="4" aria-label="따라 말하기" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-label text-ink-soft">들은 뒤 따라 말해 보세요.</p>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.hideText}
            data-action="hide-text"
            onClick={() => {
              changePrefs({ hideText: !prefs.hideText });
              setShownText({});
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
          >
            <span aria-hidden className={"relative inline-block h-5 w-9 rounded-full transition-colors " + (prefs.hideText ? "bg-ink" : "bg-line-strong/25")}>
              <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-2xs transition-[left] " + (prefs.hideText ? "left-[18px]" : "left-0.5")} />
            </span>
            <span>글 가리기</span>
          </button>
          <StepHelp>
            <p>먼저 문장을 듣고, 끝난 뒤에 마이크를 눌러 따라 말해요. 점수는 알아들은 낱말의 비율이에요(발음 채점이 아니에요).</p>
            <p>&lsquo;글 가리기&rsquo;를 켜면 {LD_HIDE_TEXT_MAX_WORDS}낱말 이하 문장의 영어를 가리고, 말한 뒤에 보여 줘요.</p>
          </StepHelp>
        </div>
        {!line?.en ? (
          <p className="text-label text-ink-soft">이 강의에는 영어 문장이 없어요.</p>
        ) : (
          <>
            {hidden ? (
              beforeDictation(idx)
            ) : textHidden ? (
              <div data-line={idx} className="flex flex-wrap items-center gap-x-2">
                <p className="text-label text-ink-faint">들은 문장을 기억해서 말해 보세요.</p>
                <button type="button" data-action="show-en" onClick={() => setShownText((prev) => ({ ...prev, [idx]: true }))} className={quietButton}>
                  영어 보기
                </button>
              </div>
            ) : (
              <p data-line={idx} data-en lang="en" className="text-learn text-body font-semibold text-ink">
                {line.en}
              </p>
            )}
            <p data-ko className="text-label text-ink-soft">
              {line.ko}
            </p>
            {prefs.hideText && !hideable && !hidden ? (
              <p className="text-caption text-ink-soft">{LD_HIDE_TEXT_MAX_WORDS}낱말이 넘는 문장은 글을 보여 줘요.</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" data-action="play-line" onClick={() => playLine(idx, speed)} className={outlineButton}>
                {lineOn ? <IconStop /> : <IconPlay />}
                <span>{lineOn ? "정지" : "문장 듣기"}</span>
              </button>
              {best !== undefined ? (
                <span data-best className="text-caption tabular-nums text-ink-soft">
                  이 문장 최고 {best}점
                </span>
              ) : null}
            </div>
          </>
        )}
        {lineNav(markChip(idx))}
        {line?.en ? (
          <VoiceSpeakingTester
            key={idx}
            targetText={line.en}
            passScore={LD_MIC_PASS}
            onStart={stopAll}
            buttonLabel="말하기"
            onSuccess={(_transcript, score) => onMicResult(idx, score, textHidden || hidden)}
          />
        ) : null}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render — Step 5
  // ------------------------------------------------------------------------------------------------------------
  function renderStep5() {
    const hiddenCount = sentences.filter((s, i) => s.en && hiddenLine(i)).length;
    const firstHidden = sentences.findIndex((s, i) => s.en && hiddenLine(i));
    const english = sentences.filter((s) => s.en).length;
    const solved = sentences.filter((s, i) => s.en && practice.dictationProgress[i]).length;
    return (
      <section data-step-panel="5" aria-label="다시 듣기 · 대본 확인" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p className="text-label text-ink-soft">대본을 보며 다시 들어 보세요. 문장을 누르면 해석이 보여요.</p>
          <StepHelp>
            <p>들리는 소리와 글자를 맞춰 보는 단계예요. 속도 단추로 1.25× · 1.5×도 들어 보세요.</p>
            <p>받아쓰기에서 틀린 문장과 정답을 본 문장에는 표시가 붙어요.</p>
          </StepHelp>
        </div>
        <div data-ld-player className="flex flex-col gap-2">
          {queueTexts.length > 0 ? (
            <AudioPlayer fallbackSentences={queueTexts} lang="en" gender="neutral" speeds={SPEEDS} initialRate={speed} onRateChange={setSpeed} />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" data-action="from-start" onClick={playFromStart} disabled={!queueTexts.length} className={quietButton}>
              <IconPlay />
              <span>처음부터</span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={allKo}
              data-action="show-all-ko"
              onClick={() => {
                setAllKo((v) => !v);
                setKoOpen({});
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
            >
              <span aria-hidden className={"relative inline-block h-5 w-9 rounded-full transition-colors " + (allKo ? "bg-ink" : "bg-line-strong/25")}>
                <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-2xs transition-[left] " + (allKo ? "left-[18px]" : "left-0.5")} />
              </span>
              <span>해석 모두 보기</span>
            </button>
          </div>
        </div>
        {hiddenCount > 0 ? (
          <div data-before-dictation className="flex flex-col gap-2 rounded-card border border-dashed border-ink-faint/40 bg-sunken px-4 py-3">
            <p className="text-label text-ink-soft">아직 받아쓰기 전인 문장 {hiddenCount}개는 가려 두었어요. 먼저 받아쓰면 더 오래 남아요.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" data-action="dictate-first" onClick={() => dictateFirst(firstHidden >= 0 ? firstHidden : 0)} className={outlineButton}>
                먼저 받아쓰기
              </button>
              <button type="button" data-action="peek" onClick={peek} className={quietButton}>
                그래도 보기
              </button>
            </div>
          </div>
        ) : null}
        {total > 0 ? (
          <ol data-script className="list-none divide-y divide-line rounded-card border border-line bg-raised">
            {sentences.map((item, idx) => {
              const hidden = !!item.en && hiddenLine(idx);
              const current = queueLine === idx;
              const rowOn = isOn(`row:${idx}`);
              const showKo = allKo || koOpen[idx] === true;
              return (
                <li
                  key={idx}
                  data-line={idx}
                  data-current={current ? "" : undefined}
                  className={"flex items-start gap-2 px-3 py-2.5 transition-colors " + (current ? "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]" : "")}
                >
                  <span className="w-6 shrink-0 pt-2.5 text-label font-semibold tabular-nums text-ink-soft">{item.n || idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    {hidden ? (
                      <p className="flex min-h-11 items-center text-label text-ink-faint">받아쓰기 전이라 가려 두었어요</p>
                    ) : item.en ? (
                      <button
                        type="button"
                        data-en
                        aria-expanded={showKo}
                        onClick={() => setKoOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="block min-h-11 w-full rounded-control py-1.5 text-left transition-colors cursor-pointer hover:bg-sunken"
                      >
                        <span lang="en" className="text-learn text-body font-semibold text-ink">
                          {item.en}
                        </span>
                      </button>
                    ) : null}
                    {!hidden && showKo ? (
                      <div className="pb-1">
                        <p data-ko className="text-label text-ink-soft">
                          {item.ko}
                        </p>
                        <RiddleAnswer answer={item.answer} />
                      </div>
                    ) : null}
                    {markChip(idx)}
                  </div>
                  {item.en ? (
                    <button
                      type="button"
                      data-action="play-row"
                      aria-label={rowOn ? `${idx + 1}번 문장 정지` : `${idx + 1}번 문장 듣기`}
                      onClick={() => playText(`row:${idx}`, item.en, speed)}
                      className={iconButton}
                    >
                      {rowOn ? <IconStop /> : <IconSpeaker />}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        <p data-mastery role="status" className="text-label tabular-nums text-ink-soft">
          {english > 0 && solved >= english
            ? `받아쓰기 ${solved}/${english} 모두 맞힘 — 아래 '이 강의 학습 완료'를 누르면 목록에 표시돼요.`
            : `받아쓰기 ${solved}/${english} 맞힘`}
        </p>
        <details data-notes open={notesOpen} onToggle={(e) => setNotesOpen(e.currentTarget.open)} className="group rounded-card border border-line bg-raised">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-card px-4 text-label font-medium text-ink transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
            <span>메모{practice.notes.trim() ? " · 적어 둔 것 있음" : ""}</span>
            <IconChevronDown className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line px-4 py-3">
            <textarea
              rows={4}
              value={practice.notes}
              onChange={(e) => {
                const value = e.target.value;
                commitPractice((p) => ({ ...p, notes: value }));
              }}
              aria-label="청취 메모"
              placeholder="잘 안 들린 곳이나 새 낱말을 적어 두세요. 이 기기에만 저장돼요."
              className="w-full resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-body leading-relaxed text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          </div>
        </details>
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------------------------------------
  return (
    <div
      className="flex flex-col gap-3"
      data-ld-view
      data-ready={practiceKey === storageKey ? "" : undefined}
      data-step={step}
      data-owns-passage-player={ownsPlayer ? "" : undefined}
    >
      {/* five named tabs need ~700px from `sm` (where StepTabs shows every name): between 640 and ~740px the row scrolls inside
          itself instead of widening the page */}
      <div className="no-scrollbar overflow-x-auto">
        <StepTabs label="LISTENING 5단계 학습" stepStart current={step} onSelect={(n) => switchStep(n as StepNo)} steps={STEPS} />
      </div>
      {step === 1 ? renderStep1() : null}
      {step === 2 ? renderStep2() : null}
      {step === 3 ? renderStep3() : null}
      {step === 4 ? renderStep4() : null}
      {step === 5 ? renderStep5() : null}
    </div>
  );
}
