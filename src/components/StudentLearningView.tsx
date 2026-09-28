"use client";

/**
 * STUDENT — one view for all 82 lessons: Step 1 블라인드 리스닝 · Step 2 탭 딕테이션 · Step 3 섀도잉 & 낭독 (the owner's
 * step names and order; every tab still reads "Step N").
 *
 * 2026-09-27 학습법 · 화면 고침 (사장님 "검토 결과대로 … 끝까지"; docs/qa-2026-09-18/학습법-화면-0927/student-verified.md ·
 * 계획.md D01–D04). The sentences, the translations and every sound are unchanged: what is handed to playSentenceQueue is
 * spokenEn(text) for English and the Korean line as it is, exactly as before. What changed, by review item:
 *   Frame   no title box above the steps (STU-U04 — the chapter is a line under the page title); one row with 전체 듣기
 *           (filled only in Step 1) and the speed 0.7 · 0.85 · 1 · 1.2 (STU-L16); the shared StepTabs with counts
 *           (STU-U03 · D04); line icons instead of emoji and the colour tokens only (STU-U12 · U13 · U15 · U23).
 *   Step 1  (D01 · D17) one list; the grey box is a button (aria-expanded) and '가리기' closes it again; while the English
 *           is hidden it says '먼저 듣기' and plays the sentence until that sentence has been heard to the end once (a
 *           failed play opens it — never a dead end); a four-part filter that closes opened cards (STU-U27); while the
 *           whole lesson plays, its sentence is kept in view unless the learner scrolled in the last 2 s, a small player
 *           sticks under the header, and a stop from outside (screen off) resets it (STU-U09 · U24).
 *   Step 2  (D02 · D13 · D16 · STU-L05 · L15 · U06 · U07 · U22 · U27) listen first — opening a sentence plays it and the
 *           Korean line waits behind '우리말 힌트' until a wrong check; 16+ words in two parts; an answer box that does
 *           not grow; a bar [다시 듣기][힌트][정답 확인 → 다음 문장] that stays on screen; '하나 빼기' · '초기화'; the first
 *           wrong word marked + '여기부터 다시'; a hint takes back from there first; more than a third hinted is
 *           '힌트로 완성'; distractors from the lesson's other sentences; the first tile in lower case. The judge is
 *           unchanged — verifyAnyWordSequence (the rules: src/lib/studentDictation.ts).
 *   Step 3  (D03 · D14 · STU-L01 · L02 · L03 · L13 · U08 · U25 · U26 · U10 · U18) English (tap = listen) → Korean →
 *           [듣기][반복][말하기][읽었어요]; '영어 가리기'; '내 정보' in the brackets, for the screen and the microphone only
 *           (src/lib/studentBlanks.ts); the microphone accepts every form of the sentence with STUDENT's pass mark 70
 *           and stops the model sound first; completion needs 80% dictated and 80% spoken (D18), and then offers the
 *           next lesson once the completion reached the server (A11).
 * Practice on this device: src/lib/studentPractice.ts (an old save keeps its counts). The common learning engine hears
 * markLessonDone on completion and recordAttempt on each Step 2 check and each microphone result.
 * The data-* attributes are what the audit helpers read (drive-generic.cjs · lib/containers.cjs) — keep them.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Block, SentenceItem } from "@/lib/types";
import {
  getServerSpeechSnapshot,
  getSpeechSnapshot,
  isInAppBrowser,
  isKakaoTalk,
  nextSentence,
  playSentenceQueue,
  previousSentence,
  stopSpeech,
  subscribeSpeech,
  togglePauseSpeech,
  unlockMobileAudio,
} from "@/lib/speech";
import { firstSlashAlternative } from "@/lib/listeningUtils";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { isSpeechRecognitionSupported } from "@/lib/speechRecognition";
import { markLessonDone, recordAttempt } from "@/lib/learning/record";
import {
  answerSoFar,
  buildDictation,
  checkPart,
  distractorPool,
  firstWordKeepsCase,
  hintedTooMuch,
  hintStep,
  layoutPart,
  midSentenceCapitals,
  tilesNeeded,
  type DictTile,
  type Dictation,
} from "@/lib/studentDictation";
import { blanksOf, fixedRunsOf, micTargets, readMyInfo, segmentsOf, writeMyInfo, type Blank } from "@/lib/studentBlanks";
import {
  STUDENT_LEARNING_PROFILE,
  STUDENT_MIC_PASS,
  canCompleteLesson,
  emptyPractice,
  parsePractice,
  practiceStorageKey,
  requiredCount,
  serializePractice,
  type StudentPractice,
} from "@/lib/studentPractice";
import { VoiceSpeakingTester } from "@/components/VoiceSpeakingTester";
import { StepTabs } from "@/components/StepTabs";
import {
  IconBackspace,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconPause,
  IconPlay,
  IconRepeat,
  IconSkipBack,
  IconSkipForward,
  IconSpeaker,
  IconStop,
} from "@/components/icons";
import { useProgress } from "@/components/ProgressProvider";
import { useLicense } from "@/components/LicenseProvider";

export interface StudentNextLesson {
  id: string;
  href: string;
  /** 'Ch 12-1' */
  code: string;
  /** the lesson's own title — 'School Vacations (방학맞이)' */
  title: string;
}

interface StudentLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  /**
   * Kept for the callers. The whole-lesson playback plays the sentence clips — shouldUseUnifiedSpeech() is true on every
   * STUDENT page, so the lesson's old mp3 track was never reached.
   */
  audioTracks?: { src: string; label?: string }[];
  /** per sentence: its first word keeps its capital on the tile — worked out on the server over the whole course */
  firstWordKeepsCase?: boolean[];
  /** the lesson after this one (STU-U10) */
  next?: StudentNextLesson | null;
}

type StudyMode = "listen" | "dictation" | "shadowing";
const STEPS: { mode: StudyMode; n: number; name: string }[] = [
  { mode: "listen", n: 1, name: "블라인드 리스닝" },
  { mode: "dictation", n: 2, name: "탭 딕테이션" },
  { mode: "shadowing", n: 3, name: "섀도잉 & 낭독" },
];

type ScriptFilter = "hidden" | "en_only" | "ko_only" | "all";
/** docs/qa-2026-09-18/scripts/lib/containers.cjs reads the filter by data-filter, not by these words. */
const FILTERS: { value: ScriptFilter; label: string }[] = [
  { value: "hidden", label: "가림" },
  { value: "en_only", label: "영어" },
  { value: "ko_only", label: "해석" },
  { value: "all", label: "모두" },
];

const SPEEDS = [0.7, 0.85, 1, 1.2] as const;
type PlaySpeed = (typeof SPEEDS)[number];

/** Which single sentence the player is on. */
interface ActiveTarget {
  idx: number;
  kind: "en" | "ko";
  loop: boolean;
}

type FeedbackKind = "empty" | "part" | "correct" | "hinted" | "wrong";
interface Feedback {
  kind: FeedbackKind;
  firstWrong: number | null;
  missing: boolean;
  keepTiles: number;
  hints: number;
}

// the three button kinds of the course views (GrammarLearningView), 44px
const filledButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const segmentButton = (on: boolean) =>
  "flex min-h-11 min-w-11 items-center justify-center rounded-control px-1.5 text-label tabular-nums transition-colors cursor-pointer " +
  (on ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:bg-raised/60");
/** a word as a tile: the bank, the answer box and the answer box's measuring copy share it (a fixed blank adds its own weight) */
const chipBase = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border px-3 text-body";
const tileBase = `${chipBase} font-semibold`;
const blankChip = "rounded-control bg-sunken px-1.5 text-ink underline decoration-dotted decoration-ink-faint underline-offset-4";

function headerHeight(): number {
  if (typeof window === "undefined") return 56;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
}

export function StudentLearningView({ blocks, lessonKey, firstWordKeepsCase: keepFromServer, next = null }: StudentLearningViewProps) {
  const lessonId = lessonKey.split("/").pop() || lessonKey;
  const router = useRouter();
  const { isCompleted, toggleComplete, flushStudentUpdates, studentSyncStatus } = useProgress();
  const { hasActiveLicense, licenseInfo, studentProgress } = useLicense();
  const lessonCompleted = isCompleted("student", lessonId);

  // ------------------------------------------------------------------------------------------------------------
  // The lesson: English sentences and the Korean line of each
  // ------------------------------------------------------------------------------------------------------------
  const sentenceItems = useMemo<SentenceItem[]>(() => {
    const block = blocks.find((b) => b.type === "sentences");
    return block && block.type === "sentences" ? block.items : [];
  }, [blocks]);
  const texts = useMemo(() => sentenceItems.map((s) => s.text), [sentenceItems]);
  const koParas = useMemo(
    () =>
      blocks
        .filter((b): b is Extract<Block, { type: "paragraph" }> => b.type === "paragraph" && b.lang === "ko")
        .map((p) => p.text.trim()),
    [blocks],
  );
  const total = sentenceItems.length;
  const numberOf = (idx: number) => sentenceItems[idx]?.n || String(idx + 1);

  const keepCase = useMemo(
    () => (keepFromServer && keepFromServer.length === texts.length ? keepFromServer : firstWordKeepsCase(texts, midSentenceCapitals(texts))),
    [keepFromServer, texts],
  );
  const blanks = useMemo(() => texts.map((text, i) => blanksOf(lessonId, i, text)), [lessonId, texts]);
  const blankCount = blanks.reduce((n, list) => n + list.length, 0);
  // Built once per lesson, so the tile order stays put across re-renders (the shuffle is random).
  const dictations = useMemo<Dictation[]>(
    () =>
      texts.map((text, i) =>
        buildDictation(text, {
          pool: distractorPool(texts, keepCase, i),
          fixed: fixedRunsOf(text, blanks[i]) ?? [],
          keepFirstCase: keepCase[i],
          allowSplit: true,
        }),
      ),
    [texts, keepCase, blanks],
  );

  // ------------------------------------------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------------------------------------------
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);

  const [studyMode, setStudyMode] = useState<StudyMode>("listen");
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const [target, setTarget] = useState<ActiveTarget | null>(null);
  const [fullMode, setFullMode] = useState(false);
  const [fullIdx, setFullIdx] = useState(0);

  // Step 1
  const [scriptFilter, setScriptFilter] = useState<ScriptFilter>("hidden");
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [speechUnavailable, setSpeechUnavailable] = useState(false);

  // Step 2 — the attempt at one sentence
  const [dictationIdx, setDictationIdx] = useState(0);
  const [part, setPart] = useState(0);
  const [locked, setLocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<DictTile[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [koShown, setKoShown] = useState<Record<number, boolean>>({});

  // Step 3
  const [openMic, setOpenMic] = useState<Record<number, boolean>>({});
  const [hideEn, setHideEn] = useState(false);
  const [shownEn, setShownEn] = useState<Record<number, boolean>>({});
  const [myInfo, setMyInfo] = useState<Record<string, string>>({});
  const [micSupported, setMicSupported] = useState(true);
  const [micRestricted, setMicRestricted] = useState(false);

  // completion
  const [seenCompleted, setSeenCompleted] = useState(false);
  const [navSaving, setNavSaving] = useState(false);
  const [navNotice, setNavNotice] = useState<string | null>(null);

  const itemRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const lastUserScrollRef = useRef(0);
  const triedRef = useRef<Record<number, boolean>>({});
  const micTriedRef = useRef<Record<number, boolean>>({});
  const focusRef = useRef<{ idx: number; which: "hide" | "reveal" } | null>(null);

  // ------------------------------------------------------------------------------------------------------------
  // Practice on this device (FUN-01) — `practiceKey` names the lesson the record belongs to, so a record is never
  // written under another lesson's name before that lesson's own record has been read.
  // ------------------------------------------------------------------------------------------------------------
  const storageKey = practiceStorageKey(lessonKey);
  const [practice, setPractice] = useState<StudentPractice>(emptyPractice);
  const [practiceKey, setPracticeKey] = useState<string | null>(null);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    setPractice(parsePractice(raw));
    setPracticeKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (practiceKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, serializePractice(practice));
    } catch {
      // ignore
    }
  }, [practiceKey, storageKey, practice]);

  const countOf = useCallback((map: Record<number, boolean>) => sentenceItems.filter((_, i) => map[i] === true).length, [sentenceItems]);
  const solvedCount = countOf(practice.solved);
  const spokenCount = countOf(practice.completed);
  const need = requiredCount(total);

  const markHeard = useCallback((idx: number) => {
    setPractice((p) => (p.heard[idx] ? p : { ...p, heard: { ...p.heard, [idx]: true } }));
  }, []);

  // STU-U26: a lesson seen completed on this screen stays completable after '완료 취소' (adjusted while rendering)
  if (lessonCompleted && !seenCompleted) setSeenCompleted(true);

  // The browser's abilities, known only on the client.
  useEffect(() => {
    setMicSupported(isSpeechRecognitionSupported());
    setMicRestricted(isKakaoTalk() || isInAppBrowser());
    setSpeechUnavailable(typeof window.Audio !== "function" && !("speechSynthesis" in window));
    setMyInfo(readMyInfo());
  }, []);

  // ------------------------------------------------------------------------------------------------------------
  // Sound
  // ------------------------------------------------------------------------------------------------------------

  /** Hard stop: the speech engine and every playback state of this view. */
  const stopAll = useCallback(() => {
    stopSpeech();
    setFullMode(false);
    setTarget(null);
    setFullIdx(0);
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll, lessonKey]);

  /**
   * What an English sentence is SPOKEN as: a slashed alternative ("He/She …") in its first form (BUG-028), and a Korean
   * word written in romanization in Korean (lessonSpeechForm — 소유자 결정 2026-09-25). The screen keeps the written
   * sentence; the learner's own information (Step 3 '내 정보') is never spoken.
   */
  const spokenEn = useCallback((text: string) => lessonSpeechForm(lessonKey, firstSlashAlternative(text)), [lessonKey]);
  const allSentences = useMemo(() => sentenceItems.map((s) => spokenEn(s.text)).filter(Boolean), [sentenceItems, spokenEn]);

  /** One sentence, once or looping. The end of an English sentence (or a failed play) opens its card in Step 1 (D17). */
  const playSingle = useCallback(
    (idx: number, kind: "en" | "ko", loop: boolean, rate: PlaySpeed) => {
      const text = kind === "en" ? spokenEn(sentenceItems[idx]?.text ?? "") : koParas[idx] ?? "";
      if (!text) return;
      setTarget({ idx, kind, loop });
      let starts = 0;
      playSentenceQueue([text], {
        lang: kind,
        rate,
        loop,
        gap: loop ? 600 : 250,
        onProgress: () => {
          starts += 1;
          if (kind === "en" && starts === 2) markHeard(idx); // a loop came round: heard to the end once
        },
        onEnd: () => {
          setTarget(null);
          if (kind === "en") markHeard(idx);
        },
        onError: () => {
          setTarget(null);
          if (kind === "en") markHeard(idx);
        },
      });
    },
    [spokenEn, sentenceItems, koParas, markHeard],
  );

  const startSentence = useCallback(
    (idx: number, kind: "en" | "ko", loop: boolean) => {
      unlockMobileAudio();
      stopAll();
      playSingle(idx, kind, loop, speed);
    },
    [stopAll, playSingle, speed],
  );

  const isTargetPlaying = useCallback(
    (idx: number, kind: "en" | "ko", loop: boolean) =>
      target !== null && target.idx === idx && target.kind === kind && target.loop === loop && speech.speaking,
    [target, speech.speaking],
  );

  /** 듣기 / 정지 for one sentence. */
  const toggleSentence = useCallback(
    (idx: number, kind: "en" | "ko" = "en") => {
      if (isTargetPlaying(idx, kind, false)) {
        stopAll();
        return;
      }
      startSentence(idx, kind, false);
    },
    [isTargetPlaying, startSentence, stopAll],
  );

  /** 반복 / 정지 for one sentence. */
  const toggleLoop = useCallback(
    (idx: number) => {
      if (isTargetPlaying(idx, "en", true)) {
        stopAll();
        return;
      }
      startSentence(idx, "en", true);
    },
    [isTargetPlaying, startSentence, stopAll],
  );

  /** The whole lesson, sentence by sentence (so 이전 / 다음 work). A sentence the playback moved past counts as heard. */
  const playFull = useCallback(
    (startIndex: number, rate: PlaySpeed) => {
      if (allSentences.length === 0) return;
      setFullMode(true);
      setFullIdx(startIndex);
      let last = -1;
      playSentenceQueue(allSentences, {
        lang: "en",
        rate,
        startIndex,
        gap: 350,
        onProgress: (i) => {
          if (last >= 0 && i === last + 1) markHeard(last);
          last = i;
          setFullIdx(i);
        },
        onEnd: () => {
          if (last >= 0) markHeard(last);
          setFullMode(false);
          setFullIdx(0);
        },
        // STU-U24: a failed queue does not leave the buttons saying '전체 정지'
        onError: () => {
          setFullMode(false);
          setFullIdx(0);
        },
      });
    },
    [allSentences, markHeard],
  );

  const toggleFull = useCallback(() => {
    if (fullMode) {
      stopAll();
      return;
    }
    unlockMobileAudio();
    stopAll();
    playFull(0, speed);
  }, [fullMode, stopAll, playFull, speed]);

  /** A new speed restarts what is playing at that speed (the same sentence, the same place in the lesson). */
  const changeSpeed = useCallback(
    (s: PlaySpeed) => {
      setSpeed(s);
      if (fullMode) {
        const at = fullIdx;
        window.setTimeout(() => playFull(at, s), 0);
        return;
      }
      if (target) {
        const t = target;
        window.setTimeout(() => playSingle(t.idx, t.kind, t.loop, s), 0);
      }
    },
    [fullMode, fullIdx, target, playFull, playSingle],
  );

  // STU-U24: the engine stopped from outside (screen off, another tab, the microphone starting) — nothing is playing,
  // so the whole-lesson buttons and the highlighted sentence go back.
  useEffect(() => {
    if (fullMode && !speech.speaking && !speech.paused && speech.total === 0) {
      setFullMode(false);
      setFullIdx(0);
    }
  }, [fullMode, speech.speaking, speech.paused, speech.total]);

  // A learner scrolling by hand is not pulled back for 2 s (STU-U09).
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

  // While the whole lesson plays, keep its sentence on screen (below the sticky header and player).
  useEffect(() => {
    if (!fullMode || studyMode === "dictation") return;
    if (Date.now() - lastUserScrollRef.current < 2000) return;
    const el = itemRefs.current[fullIdx];
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < headerHeight() + 60 || r.bottom > window.innerHeight - 8) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [fullMode, fullIdx, studyMode]);

  // After a card opens or closes, the keyboard stays with it.
  useEffect(() => {
    const want = focusRef.current;
    if (!want) return;
    focusRef.current = null;
    const el = itemRefs.current[want.idx]?.querySelector<HTMLElement>(want.which === "hide" ? "[data-hide]" : "[data-reveal]");
    el?.focus({ preventScroll: true });
  }, [revealed]);

  // ------------------------------------------------------------------------------------------------------------
  // Steps
  // ------------------------------------------------------------------------------------------------------------
  const resetAttempt = useCallback(() => {
    setPart(0);
    setLocked([]);
    setSelected([]);
    setFeedback(null);
    setHintCount(0);
  }, []);

  /** Open a sentence in Step 2 — it plays first (D13). */
  const openSentence = useCallback(
    (i: number, play = true) => {
      stopAll();
      setDictationIdx(i);
      resetAttempt();
      if (play && sentenceItems[i]) startSentence(i, "en", false);
    },
    [stopAll, resetAttempt, sentenceItems, startSentence],
  );

  const switchMode = useCallback(
    (mode: StudyMode) => {
      if (mode === studyMode) return; // the current tab again: keep the work on screen
      stopAll();
      setStudyMode(mode);
      setNavNotice(null);
      // 2026-09-28 (사장님 "1단계에서 2단계로 넘어가는데 음성이 나와 이거 해결해"): a step change never starts sound — the
      // sentence opens silent and the learner presses '듣기'; '다음 문장' and the number buttons inside Step 2 still play it
      if (mode === "dictation") openSentence(Math.min(dictationIdx, Math.max(0, total - 1)), false);
    },
    [studyMode, stopAll, openSentence, dictationIdx, total],
  );

  // ------------------------------------------------------------------------------------------------------------
  // The common learning engine — the only two calls this view makes (공통-학습-엔진.md §2)
  // ------------------------------------------------------------------------------------------------------------
  const recordSentence = useCallback(
    (idx: number, correct: boolean, help: "none" | "hint", mode: "tap" | "voice", firstTry: boolean) => {
      try {
        recordAttempt(STUDENT_LEARNING_PROFILE, `${lessonId}#${idx + 1}`, {
          lessonId,
          kind: "sentence",
          correct,
          help,
          mode,
          where: "lesson",
          firstTry,
        });
      } catch {
        // storage unavailable: the lesson works, only the review forgets
      }
    },
    [lessonId],
  );

  // ------------------------------------------------------------------------------------------------------------
  // Step 1
  // ------------------------------------------------------------------------------------------------------------
  const changeFilter = (value: ScriptFilter) => {
    setScriptFilter(value);
    setRevealed({}); // STU-U27: '모두 가림' closes the cards opened before
  };
  const reveal = (idx: number) => {
    focusRef.current = { idx, which: "hide" };
    setRevealed((prev) => ({ ...prev, [idx]: true }));
  };
  const hide = (idx: number) => {
    focusRef.current = { idx, which: "reveal" };
    setRevealed((prev) => ({ ...prev, [idx]: false }));
  };
  const heardOrFree = (idx: number) => practice.heard[idx] === true || speechUnavailable;

  // ------------------------------------------------------------------------------------------------------------
  // Step 2
  // ------------------------------------------------------------------------------------------------------------
  const dict = dictations[dictationIdx];
  const currentPart = dict?.parts[part];
  const chosenWords = selected.map((t) => t.word);
  const done = feedback?.kind === "correct" || feedback?.kind === "hinted";

  const selectTile = (tile: DictTile) => {
    if (selected.some((t) => t.id === tile.id)) return;
    setSelected((prev) => [...prev, tile]);
    setFeedback(null);
  };
  const removeTile = (id: string) => {
    setSelected((prev) => prev.filter((t) => t.id !== id));
    setFeedback(null);
  };
  const undoLast = () => {
    setSelected((prev) => prev.slice(0, -1));
    setFeedback(null);
  };
  const retryFrom = () => {
    if (feedback?.kind === "wrong") setSelected((prev) => prev.slice(0, feedback.keepTiles));
    setFeedback(null);
  };
  const giveHint = () => {
    if (!dict || done) return;
    const h = hintStep(dict, part, locked, selected);
    if (!h.add && h.keep === selected.length) return;
    setSelected([...selected.slice(0, h.keep), ...(h.add ? [h.add] : [])]);
    if (h.add) setHintCount((c) => c + 1);
    setFeedback(null);
  };
  const check = () => {
    if (!dict) return;
    const idx = dictationIdx;
    const r = checkPart(dict, part, locked, chosenWords);
    if (r.verdict === "empty") {
      setFeedback({ kind: "empty", firstWrong: null, missing: false, keepTiles: 0, hints: hintCount });
      return;
    }
    if (r.verdict === "part") {
      // the first part is right: its words stay, the second part's tiles come (D16). Not a verdict on the sentence yet.
      setLocked(answerSoFar(dict, part, locked, chosenWords));
      setPart(part + 1);
      setSelected([]);
      setFeedback({ kind: "part", firstWrong: null, missing: false, keepTiles: 0, hints: hintCount });
      return;
    }
    const firstTry = !triedRef.current[idx];
    triedRef.current[idx] = true;
    const help = hintCount > 0 ? "hint" : "none";
    if (r.verdict === "correct") {
      const tooMuch = hintedTooMuch(dict, hintCount);
      setFeedback({ kind: tooMuch ? "hinted" : "correct", firstWrong: null, missing: false, keepTiles: 0, hints: hintCount });
      setPractice((p) =>
        tooMuch
          ? { ...p, hinted: { ...p.hinted, [idx]: true }, hints: { ...p.hints, [idx]: hintCount } }
          : { ...p, solved: { ...p.solved, [idx]: true }, hints: { ...p.hints, [idx]: hintCount } },
      );
      recordSentence(idx, true, help, "tap", firstTry);
      startSentence(idx, "en", false); // STU-L14: the sentence plays right after a right answer
      return;
    }
    setFeedback({ kind: "wrong", firstWrong: r.firstWrong, missing: r.missing, keepTiles: r.keepTiles, hints: hintCount });
    setKoShown((prev) => ({ ...prev, [idx]: true })); // D13: the Korean line after a wrong check
    recordSentence(idx, false, help, "tap", firstTry);
  };

  /** Where '다음 문장' goes: the next sentence not yet solved (round the list), else the next one; null at the very end. */
  const nextDictation = (() => {
    for (let k = 1; k <= total; k++) {
      const i = (dictationIdx + k) % total;
      if (i !== dictationIdx && !practice.solved[i]) return i;
    }
    return dictationIdx + 1 < total ? dictationIdx + 1 : null;
  })();

  // ------------------------------------------------------------------------------------------------------------
  // Step 3
  // ------------------------------------------------------------------------------------------------------------
  const setInfo = (key: string, value: string) => {
    setMyInfo((prev) => {
      const nextValues = { ...prev, [key]: value };
      writeMyInfo(nextValues);
      return nextValues;
    });
  };
  const toggleSaid = (idx: number) => {
    setPractice((p) => ({ ...p, completed: { ...p.completed, [idx]: !p.completed[idx] } }));
  };
  const onMicResult = (idx: number, score: number) => {
    const firstTry = !micTriedRef.current[idx];
    micTriedRef.current[idx] = true;
    const passed = score >= STUDENT_MIC_PASS;
    setPractice((p) => ({
      ...p,
      mic: { ...p.mic, [idx]: Math.max(p.mic[idx] ?? 0, score) },
      completed: passed ? { ...p.completed, [idx]: true } : p.completed,
    }));
    // said with the English on screen is reading it out — a help; said with it hidden is recall
    recordSentence(idx, passed, hideEn && !shownEn[idx] ? "none" : "hint", "voice", firstTry);
  };

  // ------------------------------------------------------------------------------------------------------------
  // Completion (D18 · STU-U26 · U10 · U18 · A11)
  // ------------------------------------------------------------------------------------------------------------
  const canComplete = canCompleteLesson({ total, solved: solvedCount, spoken: spokenCount, completedHere: lessonCompleted || seenCompleted });
  const practisedHere = solvedCount + spokenCount + countOf(practice.hinted) > 0;
  const complete = () => {
    if (lessonCompleted || !canComplete) return;
    toggleComplete("student", lessonId);
    try {
      markLessonDone(
        STUDENT_LEARNING_PROFILE,
        lessonId,
        sentenceItems.map((_, i) => ({ key: `${lessonId}#${i + 1}`, kind: "sentence" })),
      );
    } catch {
      // storage unavailable: the lesson is complete; only the review forgets
    }
  };
  const undoComplete = () => {
    if (lessonCompleted) toggleComplete("student", lessonId);
  };

  const chapterOf = (id: string) => Number(id.match(/^s(\d+)-/)?.[1] ?? 0);
  const thisChapter = chapterOf(lessonId);
  const nextChapter = next ? chapterOf(next.id) : 0;
  const periodPass = hasActiveLicense && licenseInfo?.plan !== "LIFE";
  const lockedByChapter = (unlockedThrough: number | null | undefined) =>
    Boolean(next && periodPass && typeof unlockedThrough === "number" && nextChapter > thisChapter && nextChapter > unlockedThrough);
  const nextLocked = lockedByChapter(studentProgress?.unlockedThrough) && studentSyncStatus !== "syncing" && studentSyncStatus !== "pending";

  async function goNext(event: MouseEvent<HTMLAnchorElement>) {
    if (!next) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navSaving) return;
    setNavSaving(true);
    setNavNotice(null);
    const result = await flushStudentUpdates();
    if (result.status === "offline" || result.status === "error") {
      setNavNotice(
        result.status === "offline"
          ? "인터넷에 연결되지 않아 완료 기록은 이 기기에 두었어요. 연결되면 저장돼요."
          : "완료 기록을 아직 저장하지 못했어요. 잠시 뒤 다시 보내요.",
      );
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    } else if (result.progress && lockedByChapter(result.progress.unlockedThrough)) {
      setNavSaving(false); // still closed — the line in the box says so
      return;
    }
    router.push(next.href);
  }

  // ------------------------------------------------------------------------------------------------------------
  // Pieces
  // ------------------------------------------------------------------------------------------------------------

  /** The written sentence, its blanks as chips — with the learner's own words in Step 3 when there are some. */
  const sentenceText = (idx: number, personal: boolean): ReactNode => {
    const text = sentenceItems[idx]?.text ?? "";
    const list = blanks[idx] ?? [];
    if (!list.length) return text;
    return segmentsOf(text, list).map((seg, k) =>
      "blank" in seg ? (
        <span key={k} data-blank className={blankChip}>
          {personal && myInfo[seg.blank.key]?.trim() ? myInfo[seg.blank.key].trim() : seg.blank.text}
        </span>
      ) : (
        <Fragment key={k}>{seg.text}</Fragment>
      ),
    );
  };

  const koPlayButton = (idx: number) => {
    const on = isTargetPlaying(idx, "ko", false);
    return (
      <button
        type="button"
        onClick={() => toggleSentence(idx, "ko")}
        aria-label={on ? "우리말 정지" : `${numberOf(idx)}번 우리말 듣기`}
        title={on ? "정지" : "우리말 듣기"}
        className={
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer " +
          (on ? "border-primary bg-primary-soft text-primary" : "border-line bg-raised text-ink-soft hover:bg-sunken")
        }
      >
        {on ? <IconStop /> : <IconSpeaker />}
      </button>
    );
  };

  const playingClass = (on: boolean) => (on ? "border-primary bg-primary-soft text-primary" : "border-line bg-raised text-ink hover:bg-sunken");

  // --- Step 1 row ----------------------------------------------------------------------------------------------
  function renderListenItem(item: SentenceItem, idx: number) {
    const playing = isTargetPlaying(idx, "en", false);
    const looping = isTargetPlaying(idx, "en", true);
    const highlighted = playing || looping || (fullMode && fullIdx === idx);
    const ko = koParas[idx] || "";
    const cardOpen = revealed[idx] === true || scriptFilter === "all";
    const showEn = cardOpen || scriptFilter === "en_only";
    const showKo = cardOpen || scriptFilter === "ko_only";
    const canHide = revealed[idx] === true && scriptFilter !== "all" && scriptFilter !== "en_only";
    return (
      <li
        key={idx}
        data-sentence={idx}
        data-learn-first={idx === 0 ? "" : undefined}
        ref={(el) => {
          itemRefs.current[idx] = el;
        }}
        className={"px-4 py-3.5 transition-colors " + (highlighted ? "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]" : "")}
      >
        <div className="flex items-center gap-2">
          <span className="w-7 shrink-0 text-label font-semibold tabular-nums text-ink-soft">{item.n || idx + 1}</span>
          <button
            type="button"
            onClick={() => toggleSentence(idx, "en")}
            aria-label={playing ? `${numberOf(idx)}번 문장 정지` : `${numberOf(idx)}번 문장 재생`}
            className={"inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-label font-semibold transition-colors cursor-pointer " + playingClass(playing)}
          >
            {playing ? <IconStop /> : <IconPlay />}
            <span>{playing ? "정지" : "듣기"}</span>
          </button>
          <button
            type="button"
            onClick={() => toggleLoop(idx)}
            aria-pressed={looping}
            aria-label={looping ? `${numberOf(idx)}번 반복 정지` : `${numberOf(idx)}번 문장 반복 듣기`}
            className={"inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-label font-medium transition-colors cursor-pointer " + playingClass(looping)}
          >
            {looping ? <IconStop /> : <IconRepeat />}
            <span>{looping ? "정지" : "반복"}</span>
          </button>
        </div>

        <div className="mt-2 pl-9">
          {showEn ? (
            <div className="flex items-start gap-2">
              <p data-en className="min-w-0 flex-1 pt-2 text-body font-semibold text-ink">
                {sentenceText(idx, false)}
              </p>
              {canHide ? (
                <button type="button" data-hide aria-expanded onClick={() => hide(idx)} className={`${quietButton} shrink-0`}>
                  가리기
                </button>
              ) : null}
            </div>
          ) : heardOrFree(idx) ? (
            <button
              type="button"
              data-reveal="open"
              aria-expanded={false}
              onClick={() => reveal(idx)}
              className="flex min-h-11 w-full items-center justify-center rounded-control border border-dashed border-ink-faint/40 bg-sunken px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:text-ink"
            >
              눌러서 보기
            </button>
          ) : (
            <button
              type="button"
              data-reveal="locked"
              onClick={() => toggleSentence(idx, "en")}
              aria-label={`${numberOf(idx)}번 문장 먼저 듣기`}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-ink-faint/40 bg-sunken px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:text-ink"
            >
              {playing ? <IconStop /> : <IconPlay />}
              <span>{playing ? "듣는 중 — 끝까지 들으면 볼 수 있어요" : "먼저 듣기"}</span>
            </button>
          )}
          {showKo && ko ? (
            <div className="mt-1.5 flex items-start gap-2">
              <p data-ko className="min-w-0 flex-1 pt-2.5 text-label text-ink-soft">
                {ko}
              </p>
              {koPlayButton(idx)}
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  // --- Step 2 ------------------------------------------------------------------------------------------------------
  function renderDictation() {
    if (!dict || !currentPart) {
      return <p className="text-label text-ink-soft">이 강의에는 조립할 문장이 없어요.</p>;
    }
    const idx = dictationIdx;
    const ko = koParas[idx] || "";
    const slots = layoutPart(dict, part, chosenWords);
    const needTiles = tilesNeeded(dict, part);
    const usedIds = new Set(selected.map((t) => t.id));
    const fixedStarts = new Map(dict.fixed.map((run) => [run.start, run]));
    const inFixed = (pos: number) => dict.fixed.some((run) => pos > run.start && pos < run.start + run.length);
    const replaying = isTargetPlaying(idx, "en", false);
    const split = dict.parts.length > 1;
    /** STU-L05 ①: after a wrong check the right start is green and the first wrong word red (until the answer changes). */
    const markOf = (pos: number) => {
      if (done) return "border-success/60";
      if (feedback?.kind !== "wrong") return "border-line";
      if (feedback.missing) return "border-success/60";
      const wrong = feedback.firstWrong ?? -1;
      if (pos >= 0 && pos < wrong) return "border-success/60";
      if (pos === wrong || (pos < 0 && wrong >= currentPart.end)) return "border-danger text-danger";
      return "border-line";
    };

    // the finished part(s): their words as text, blanks as chips
    const lockedView = locked.length ? (
      <span data-locked className="inline-flex min-h-11 items-center px-1 text-body text-ink-soft">
        {locked
          .map((w, pos) => (fixedStarts.has(pos) ? fixedStarts.get(pos)!.text : inFixed(pos) ? null : w))
          .filter((w): w is string => w !== null)
          .join(" ")}
      </span>
    ) : null;

    const fixedChip = (text: string, key: string) => (
      <span key={key} data-fixed className={`${chipBase} border-line bg-surface font-medium text-ink-soft`}>
        {text}
      </span>
    );

    // The measuring copy lays the part out as the right answer will stand — the words in sentence order, the blanks in
    // their places — then every other tile of the bank. A learner building the sentence never needs more room than that,
    // so the box does not grow and the bank below it does not move (STU-U06).
    const ghostItems: { key: string; node: ReactNode }[] = [];
    {
      const unused = [...currentPart.tiles];
      for (let pos = currentPart.start; pos < currentPart.end; pos++) {
        const run = fixedStarts.get(pos);
        if (run) {
          ghostItems.push({ key: `g-f-${pos}`, node: fixedChip(run.text, `g-f-${pos}`) });
          continue;
        }
        if (inFixed(pos)) continue;
        const want = (dict.words[pos] ?? "").toLowerCase();
        const at = unused.findIndex((t) => t.word.toLowerCase() === want);
        if (at < 0) continue;
        const [tile] = unused.splice(at, 1);
        ghostItems.push({ key: `g-${tile.id}`, node: <span key={`g-${tile.id}`} className={`${tileBase} border-line`}>{tile.label}</span> });
      }
      for (const tile of unused) ghostItems.push({ key: `g-${tile.id}`, node: <span key={`g-${tile.id}`} className={`${tileBase} border-line`}>{tile.label}</span> });
    }

    return (
      <div data-dictation data-index={idx} data-part={part + 1} data-parts={dict.parts.length} data-part-start={currentPart.start} data-part-end={currentPart.end} data-fixed-positions={dict.fixed.flatMap((run) => Array.from({ length: run.length }, (_, k) => run.start + k)).join(",")} data-solved={practice.solved[idx] ? "true" : "false"} className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <p className="text-label tabular-nums text-ink-soft">
            문장 {idx + 1} / {total}
            {split ? <span className="text-ink-faint"> · {part === 0 ? "앞부분" : "뒷부분"} ({part + 1}/2)</span> : null}
          </p>
          {ko && !koShown[idx] ? (
            <button type="button" data-action="ko-hint" onClick={() => setKoShown((prev) => ({ ...prev, [idx]: true }))} className={quietButton}>
              우리말 힌트
            </button>
          ) : null}
        </div>
        {ko && koShown[idx] ? (
          <div className="flex items-start gap-2">
            <p data-ko className="min-w-0 flex-1 pt-2.5 text-label text-ink-soft">
              {ko}
            </p>
            {koPlayButton(idx)}
          </div>
        ) : null}

        {/*
          The answer box keeps one height for the whole part (STU-U06): an invisible copy with every tile of the part
          (ghostItems) sits in the same grid cell, so placing tiles never pushes the word bank down.
        */}
        <div data-assembly className="grid rounded-card border border-dashed border-ink-faint/40 bg-sunken/60 p-2.5">
          <div aria-hidden className="invisible col-start-1 row-start-1 flex flex-wrap content-start items-center gap-1.5">
            {lockedView}
            {ghostItems.map((item) => item.node)}
          </div>
          <div className="col-start-1 row-start-1 flex flex-wrap content-start items-center gap-1.5">
            {lockedView}
            {slots.length === 0 ? (
              <span className="inline-flex min-h-11 items-center px-1 text-label text-ink-faint">들리는 순서대로 아래 낱말을 누르세요</span>
            ) : (
              slots.map((slot, k) => {
                if (slot.fixed) {
                  const run = fixedStarts.get(slot.pos);
                  return run ? fixedChip(run.text, `f-${slot.pos}`) : null;
                }
                const tile = slot.tile !== null ? selected[slot.tile] : null;
                if (!tile) return null;
                return (
                  <button
                    key={`s-${tile.id}-${k}`}
                    type="button"
                    title="눌러서 보관함으로 되돌리기"
                    onClick={() => removeTile(tile.id)}
                    className={`${tileBase} bg-raised text-ink transition-colors cursor-pointer hover:bg-sunken ${markOf(slot.pos)}`}
                  >
                    {tile.label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <p data-count className="text-caption tabular-nums text-ink-soft">
            내 문장 {selected.length}/{needTiles}
          </p>
          <div className="flex items-center">
            <button type="button" data-action="undo" onClick={undoLast} disabled={selected.length === 0} className={quietButton}>
              <IconBackspace />
              <span>하나 빼기</span>
            </button>
            <button type="button" data-action="reset" onClick={resetAttempt} className={quietButton}>
              초기화
            </button>
          </div>
        </div>

        {feedback ? (
          <div
            data-feedback={feedback.kind}
            role={feedback.kind === "wrong" ? "alert" : "status"}
            className={
              "flex flex-wrap items-center justify-between gap-2 border-l-2 pl-3 " +
              (feedback.kind === "wrong" ? "border-danger" : feedback.kind === "empty" ? "border-line-strong/30" : "border-success")
            }
          >
            <p
              className={
                "min-w-0 text-label font-semibold " +
                (feedback.kind === "wrong" ? "text-danger" : feedback.kind === "empty" ? "text-ink" : feedback.kind === "hinted" ? "text-ink" : "text-success")
              }
            >
              {feedback.kind === "empty"
                ? "낱말을 먼저 눌러 문장을 만드세요."
                : feedback.kind === "part"
                  ? "✓ 앞부분이 맞았어요. 이어서 뒷부분을 조립하세요."
                  : feedback.kind === "correct"
                    ? `✓ 정답입니다.${feedback.hints ? ` (힌트 ${feedback.hints}번)` : ""}`
                    : feedback.kind === "hinted"
                      ? `✓ 힌트로 완성했어요 — 힌트가 낱말의 3분의 1을 넘어 탭 딕테이션 수에는 들어가지 않아요.`
                      : `✕ ${(feedback.firstWrong ?? 0) + 1}번째 낱말부터 일치하지 않습니다.${feedback.missing ? " 낱말이 더 있어요." : ""}`}
            </p>
            {feedback.kind === "wrong" && !feedback.missing && feedback.keepTiles < selected.length ? (
              <button type="button" data-action="retry-from" onClick={retryFrom} className={outlineButton}>
                여기부터 다시
              </button>
            ) : null}
            {feedback.kind === "hinted" ? (
              <button type="button" data-action="again" onClick={() => openSentence(idx)} className={outlineButton}>
                힌트 없이 다시
              </button>
            ) : null}
          </div>
        ) : null}

        <div data-word-bank role="group" aria-label="단어 보관함" className="flex flex-wrap gap-1.5">
          {currentPart.tiles.map((tile) => {
            const used = usedIds.has(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={used}
                onClick={() => selectTile(tile)}
                className={
                  `${tileBase} transition-colors select-none ` +
                  (used ? "cursor-default border-line bg-sunken text-ink-faint opacity-40" : "cursor-pointer border-line bg-raised text-ink hover:bg-sunken")
                }
              >
                {tile.label}
              </button>
            );
          })}
        </div>

        {/* STU-U06: the actions stay on screen at the bottom of a phone */}
        <div
          data-action-bar
          className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-surface/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-card sm:border"
        >
          <div className="flex items-center gap-2">
            <button type="button" data-action="replay" onClick={() => toggleSentence(idx, "en")} className={`${outlineButton} shrink-0`}>
              {replaying ? <IconStop /> : <IconPlay />}
              <span>{replaying ? "정지" : "듣기"}</span>
            </button>
            <button type="button" data-action="hint" onClick={giveHint} disabled={done} className={`${outlineButton} shrink-0`}>
              힌트
            </button>
            {done ? (
              nextDictation !== null ? (
                <button type="button" data-action="next" onClick={() => openSentence(nextDictation)} className={`${filledButton} min-w-0 flex-1`}>
                  <span>다음 문장</span>
                  <IconChevronRight />
                </button>
              ) : (
                <button type="button" data-action="to-step3" onClick={() => switchMode("shadowing")} className={`${filledButton} min-w-0 flex-1`}>
                  <span>섀도잉으로</span>
                  <IconChevronRight />
                </button>
              )
            ) : (
              <button type="button" data-action="check" onClick={check} className={`${filledButton} min-w-0 flex-1`}>
                정답 확인
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3 row ----------------------------------------------------------------------------------------------
  function renderShadowItem(item: SentenceItem, idx: number) {
    const playing = isTargetPlaying(idx, "en", false);
    const looping = isTargetPlaying(idx, "en", true);
    const highlighted = playing || looping || (fullMode && fullIdx === idx);
    const ko = koParas[idx] || "";
    const said = practice.completed[idx] === true;
    const micOpen = openMic[idx] === true;
    const enHidden = hideEn && !shownEn[idx];
    const targets = micTargets(item.text, blanks[idx] ?? [], myInfo);
    const rowButton = "inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-control border px-1 text-label font-semibold transition-colors cursor-pointer";
    return (
      <li
        key={idx}
        data-sentence={idx}
        ref={(el) => {
          itemRefs.current[idx] = el;
        }}
        className={"flex flex-col gap-2.5 px-4 py-3.5 transition-colors " + (highlighted ? "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]" : "")}
      >
        <div className="flex gap-3">
          <span className="w-7 shrink-0 pt-1 text-label font-semibold tabular-nums text-ink-soft">{item.n || idx + 1}</span>
          <div className="min-w-0 flex-1">
            {enHidden ? (
              <div className="flex flex-wrap items-center gap-x-2">
                <p className="text-label text-ink-faint">영어로 말해 보세요</p>
                <button type="button" data-action="show-en" onClick={() => setShownEn((prev) => ({ ...prev, [idx]: true }))} className={quietButton}>
                  정답 보기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggleSentence(idx, "en")}
                title="눌러서 듣기"
                className="block min-h-11 w-full rounded-control py-1 text-left transition-colors cursor-pointer hover:bg-sunken"
              >
                <span data-en className="text-title-s font-semibold text-ink">
                  {sentenceText(idx, true)}
                </span>
              </button>
            )}
            {ko ? (
              <div className="mt-1 flex items-start gap-2">
                <p data-ko className="min-w-0 flex-1 pt-2.5 text-label text-ink-soft">
                  {ko}
                </p>
                {koPlayButton(idx)}
              </div>
            ) : null}
          </div>
        </div>

        {/* '✓ 읽었어요' is the longest label — its column is a little wider so it stays on one line at 360px */}
        <div className={"grid gap-1.5 " + (micSupported ? "grid-cols-[1fr_1fr_1fr_1.35fr]" : "grid-cols-[1fr_1fr_1.35fr]")}>
          <button
            type="button"
            data-action="play"
            onClick={() => toggleSentence(idx, "en")}
            aria-label={playing ? `${numberOf(idx)}번 문장 정지` : `${numberOf(idx)}번 문장 듣기`}
            className={`${rowButton} ${playingClass(playing)}`}
          >
            {playing ? "정지" : "듣기"}
          </button>
          <button
            type="button"
            data-action="loop"
            onClick={() => toggleLoop(idx)}
            aria-pressed={looping}
            aria-label={looping ? `${numberOf(idx)}번 반복 정지` : `${numberOf(idx)}번 문장 반복 듣기`}
            className={`${rowButton} ${playingClass(looping)}`}
          >
            {looping ? "정지" : "반복"}
          </button>
          {micSupported ? (
            <button
              type="button"
              data-action="speak"
              onClick={() => setOpenMic((prev) => ({ ...prev, [idx]: !prev[idx] }))}
              aria-expanded={micOpen}
              aria-label={`${numberOf(idx)}번 문장 말하기`}
              className={`${rowButton} ${micOpen ? "border-ink/40 bg-sunken text-ink" : "border-line bg-raised text-ink hover:bg-sunken"}`}
            >
              {micOpen ? "닫기" : "말하기"}
            </button>
          ) : null}
          <button
            type="button"
            data-action="said"
            onClick={() => toggleSaid(idx)}
            aria-pressed={said}
            aria-label={`${numberOf(idx)}번 읽었어요`}
            className={`${rowButton} ${said ? "border-success/60 bg-success/10 text-success" : "border-line bg-raised text-ink hover:bg-sunken"}`}
          >
            {said ? "✓ 읽었어요" : "읽었어요"}
          </button>
        </div>

        {micOpen ? (
          <div className="border-l-2 border-line pl-3">
            <VoiceSpeakingTester
              targetText={targets[0] ?? item.text}
              targetTexts={targets}
              passScore={STUDENT_MIC_PASS}
              onStart={stopAll}
              compact
              hideWhenUnsupported
              buttonLabel="말하기 확인"
              onSuccess={(_transcript, score) => onMicResult(idx, score)}
            />
          </div>
        ) : null}
      </li>
    );
  }

  function renderMyInfo() {
    if (!blankCount) return null;
    return (
      <details data-my-info className="group rounded-card border border-line bg-raised">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-card px-4 text-label font-medium text-ink transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
          <span>내 정보 넣기 · 빈칸 {blankCount}개</span>
          <IconChevronDown className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
          <p className="text-caption text-ink-soft">
            괄호 빈칸에 내 이야기를 넣으면 이 단계의 문장과 말하기 확인에 쓰여요. 이 기기에만 저장되고, 들려주는 소리는 그대로예요.
          </p>
          {blanks.flatMap((list, idx) =>
            list.map((blank: Blank) => {
              const same = list.filter((b) => b.label === blank.label);
              const nth = same.length > 1 ? ` (${same.indexOf(blank) + 1})` : "";
              return (
                <label key={blank.key} className="flex flex-col gap-1">
                  <span className="text-caption text-ink-soft">
                    {numberOf(idx)}번 문장 · {blank.text.startsWith("(") ? blank.text : blank.label}
                    {nth}
                  </span>
                  <input
                    type="text"
                    value={myInfo[blank.key] ?? ""}
                    onChange={(e) => setInfo(blank.key, e.target.value)}
                    placeholder={blank.text.replace(/^\(|\)$/g, "")}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
                  />
                </label>
              );
            }),
          )}
        </div>
      </details>
    );
  }

  function renderCompletion() {
    return (
      <section data-completion aria-label="이 강의 완료" className="rounded-card border border-line bg-raised px-4 py-4">
        {lessonCompleted ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="inline-flex items-center gap-1.5 text-label font-semibold text-success">
                <IconCheck />
                <span>완료한 강의</span>
              </p>
              <button type="button" aria-label="학습 완료 취소" onClick={undoComplete} className={quietButton}>
                완료 취소
              </button>
            </div>
            <p className="text-caption tabular-nums text-ink-soft">
              {practisedHere
                ? `탭 딕테이션 ${solvedCount}/${total} · 섀도잉 ${spokenCount}/${total}`
                : "완료한 강의예요 — 다시 연습해도 좋아요."}
            </p>
            {next ? (
              nextLocked ? (
                <p className="text-label text-ink-soft">{nextChapter}장은 이 장을 마치면 열려요.</p>
              ) : (
                <Link href={next.href} onClick={goNext} className={`${filledButton} w-full justify-between`}>
                  <span className="min-w-0 truncate">{navSaving ? "저장 중…" : `다음 강의: ${next.code} · ${next.title}`}</span>
                  <IconChevronRight className="shrink-0" />
                </Link>
              )
            ) : null}
            {navNotice ? (
              <p role="status" className="text-caption text-ink-soft">
                {navNotice}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-label font-semibold tabular-nums text-ink">
                탭 딕테이션 {solvedCount}/{total} · 섀도잉 {spokenCount}/{total}
              </p>
              <p className="text-caption text-ink-soft">
                {canComplete
                  ? "이 강의를 완료로 표시할 수 있어요. 완료 기록은 다음 장이 열리는 데 쓰여요."
                  : `탭 딕테이션과 섀도잉을 각각 ${need}문장 이상 하면 완료할 수 있어요. (섀도잉은 말하기 확인 70점 이상이나 '읽었어요')`}
              </p>
            </div>
            <button type="button" aria-label="학습 완료 체크" disabled={!canComplete} onClick={complete} className={`${filledButton} shrink-0`}>
              이 강의 학습 완료
            </button>
          </div>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------------------------------------
  const stepNumber = STEPS.find((s) => s.mode === studyMode)?.n ?? 1;
  const hasSentences = total > 0;

  return (
    <div className="flex flex-col gap-3" data-student-view data-step={stepNumber}>
      <StepTabs
        label="STUDENT 3단계 학습"
        stepStart
        current={stepNumber}
        onSelect={(n) => switchMode(STEPS[n - 1]?.mode ?? "listen")}
        steps={STEPS.map((s) => ({
          n: s.n,
          name: s.name,
          badge: !hasSentences ? undefined : s.mode === "dictation" ? `${solvedCount}/${total}` : s.mode === "shadowing" ? `${spokenCount}/${total}` : undefined,
        }))}
      />

      {hasSentences ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            data-action="play-all"
            onClick={toggleFull}
            aria-pressed={fullMode}
            className={`${studyMode === "listen" && !fullMode ? filledButton : outlineButton} shrink-0`}
          >
            {fullMode ? <IconStop /> : <IconPlay />}
            <span>{fullMode ? "전체 정지" : "전체 듣기"}</span>
          </button>
          <div role="group" aria-label="재생 속도" className="flex gap-0.5 rounded-control bg-sunken p-1">
            {SPEEDS.map((s) => (
              <button key={s} type="button" aria-pressed={speed === s} onClick={() => changeSpeed(s)} className={segmentButton(speed === s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {fullMode ? (
        <div
          data-player
          className="sticky top-[var(--header-h)] z-20 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 py-1 backdrop-blur sm:mx-0 sm:rounded-card sm:border"
        >
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => previousSentence()} aria-label="이전 문장" className={`${quietButton} w-11 px-0`}>
              <IconSkipBack />
            </button>
            <button type="button" onClick={() => togglePauseSpeech()} aria-label={speech.paused ? "이어 듣기" : "일시정지"} className={`${quietButton} w-11 px-0`}>
              {speech.paused ? <IconPlay /> : <IconPause />}
            </button>
            <button type="button" onClick={() => nextSentence()} aria-label="다음 문장" className={`${quietButton} w-11 px-0`}>
              <IconSkipForward />
            </button>
          </div>
          <p className="text-label tabular-nums text-ink-soft" aria-live="polite">
            {Math.min(fullIdx + 1, allSentences.length)} / {allSentences.length}
          </p>
          <button type="button" onClick={stopAll} aria-label="전체 정지" className={`${quietButton} w-11 px-0`}>
            <IconStop />
          </button>
        </div>
      ) : null}

      {/* ===================== Step 1 · 블라인드 리스닝 ===================== */}
      {studyMode === "listen" ? (
        <section data-step-panel="1" aria-label="블라인드 리스닝" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">먼저 듣고, 회색 칸을 눌러 확인하세요.</p>
          <div role="group" aria-label="대본 보기" className="grid grid-cols-4 gap-1 rounded-control bg-sunken p-1">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" data-filter={f.value} aria-pressed={scriptFilter === f.value} onClick={() => changeFilter(f.value)} className={segmentButton(scriptFilter === f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          {hasSentences ? (
            <ol className="list-none divide-y divide-line rounded-card border border-line bg-raised">{sentenceItems.map(renderListenItem)}</ol>
          ) : (
            <p className="text-label text-ink-soft">이 강의에는 문장이 없어요.</p>
          )}
        </section>
      ) : null}

      {/* ===================== Step 2 · 탭 딕테이션 ===================== */}
      {studyMode === "dictation" ? (
        <section data-step-panel="2" aria-label="탭 딕테이션" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">문장을 듣고, 들리는 순서대로 낱말을 누르세요.</p>
          {hasSentences ? (
            // one row of numbers (a lesson of 8+ sentences — 9 of 82 — wraps once on a phone, so none hides off screen)
            <div role="group" aria-label="문장 고르기" className="flex flex-wrap gap-1">
              {sentenceItems.map((_, i) => {
                const state = practice.solved[i] ? "solved" : practice.hinted[i] ? "hinted" : "todo";
                const current = i === dictationIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    data-pill={i}
                    data-state={state}
                    aria-current={current ? "true" : undefined}
                    aria-label={`${i + 1}번 문장${state === "solved" ? " · 정답" : state === "hinted" ? " · 힌트로 완성" : ""}`}
                    onClick={() => openSentence(i)}
                    className={
                      "flex h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-control border px-2 text-label tabular-nums transition-colors cursor-pointer " +
                      (current ? "border-line-strong/40 bg-raised font-semibold text-ink shadow-2xs" : "border-transparent font-medium text-ink-soft hover:bg-sunken")
                    }
                  >
                    <span>{i + 1}</span>
                    {state !== "todo" ? <IconCheck size={12} className={state === "solved" ? "text-success" : "text-ink-faint"} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          {renderDictation()}
        </section>
      ) : null}

      {/* ===================== Step 3 · 섀도잉 & 낭독 ===================== */}
      {studyMode === "shadowing" ? (
        <section data-step-panel="3" aria-label="섀도잉 & 낭독" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-label text-ink-soft">듣고 바로 따라 말해 보세요.</p>
            {hasSentences ? (
              <button
                type="button"
                role="switch"
                aria-checked={hideEn}
                data-action="hide-en"
                onClick={() => {
                  setHideEn((v) => !v);
                  setShownEn({});
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken"
              >
                <span aria-hidden className={"relative inline-block h-5 w-9 rounded-full transition-colors " + (hideEn ? "bg-ink" : "bg-line-strong/25")}>
                  <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-2xs transition-[left] " + (hideEn ? "left-[18px]" : "left-0.5")} />
                </span>
                <span>영어 가리기</span>
              </button>
            ) : null}
          </div>
          {hasSentences && !micSupported ? (
            <p data-mic-notice className="text-caption text-ink-soft">
              {micRestricted
                ? "카카오톡 같은 앱 안의 브라우저에서는 마이크를 쓸 수 없어요. 오른쪽 위 메뉴에서 다른 브라우저로 열어 주세요. '읽었어요'로 세면 됩니다."
                : "이 브라우저에서는 마이크를 쓸 수 없어요. Chrome이나 Safari에서 열면 쓸 수 있어요. '읽었어요'로 세면 됩니다."}
            </p>
          ) : null}
          {renderMyInfo()}
          {hasSentences ? (
            <ol className="list-none divide-y divide-line rounded-card border border-line bg-raised">{sentenceItems.map(renderShadowItem)}</ol>
          ) : null}
          {renderCompletion()}
        </section>
      ) : null}
    </div>
  );
}
