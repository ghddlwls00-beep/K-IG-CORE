"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLicense } from "./LicenseProvider";
import { passoffTopicOf, type PassoffProgressSnapshot } from "@/lib/passoffUnlock";

/**
 * PASS-OFF GRAMMAR progress in the browser (docs/pass-off-grammar/설계.md §5) — what ProgressProvider does for
 * STUDENT, done for this course in a provider of its own (ProgressProvider is not touched):
 *   - a finished lesson (PassoffLearningView, once its five steps are done) goes into a queue on this device
 *     (localStorage kig:passoff:pending:v1) under the licence it was finished with, and to POST
 *     /api/progress/passoff-grammar as soon as that licence is active — at once, not after a pause, so it is on the
 *     server before the next lesson's page asks there. A lesson finished with no licence (a free preview lesson) goes
 *     with the first licence entered; one finished under another code waits for that code (it used to go with
 *     whichever licence came next — 코드 단계 C 점검 9). One the server does not take because its topic is not open
 *     waits — not counted on the list — until an answer shows that topic open, and goes once more (the owner opened
 *     it by hand, the learner finished the topic before); refused again it is dropped, and one the course does not
 *     list is dropped at once;
 *   - on the course's pages it asks the server for the record (the course list every time, a lesson page once) and
 *     hands the answer to LicenseProvider, whose isUnlocked shows the topic locks from it. The last answer is kept on
 *     this device per licence (kig:passoff:answer:<licence>) and shown until the server's comes, so a page opened
 *     again does not first draw every topic after TOPIC 1 locked (점검 6). It is for showing only: `confirmed` tells
 *     the server's own answer apart, and the lock screen acts on that alone;
 *   - `countedIds` — the lessons the server counts, plus completions on their way — is what the course list marks
 *     done with a licence. The topic lock counts the server's record alone, so a list that also took this device's
 *     own record showed ✓ the lock did not count (점검 1: after the owner's reset, a lost write, another code here).
 * The server decides what is open; nothing here judges.
 */

export type PassoffSyncStatus = "local" | "syncing" | "saved" | "pending" | "error";

interface PendingCompletion {
  lessonId: string;
  clientUpdatedAt: number;
  /** the licence it was finished under; null — with no licence (a free preview lesson): the first licence takes it */
  licence: string | null;
  /** the server did not take it once (its topic was not open then) — it goes once more when an answer shows that topic open */
  refused?: boolean;
}

interface PassoffProgressContextType {
  /** the record as the server last answered — or, until it has since this page opened, as it answered last time */
  progress: PassoffProgressSnapshot | null;
  /** `progress` is the server's answer since this page opened, not the copy kept on this device */
  confirmed: boolean;
  /**
   * The lessons this licence has finished as far as the course list may say: the server's completed ones and those
   * on their way to it. Null with no licence, or before any answer — the list then shows this device's own record.
   */
  countedIds: ReadonlySet<string> | null;
  syncStatus: PassoffSyncStatus;
  /** the five steps of this lesson are done */
  recordLessonComplete: (lessonId: string) => void;
  /** sends the queue now; resolves with the server's answer, or null when nothing went or it failed */
  flush: () => Promise<PassoffProgressSnapshot | null>;
  /** a topic opened that the course list has not announced yet (usePassoffUnlockNotice) */
  unannouncedTopic: number | null;
  markTopicAnnounced: (topic: number) => void;
}

const PassoffProgressContext = createContext<PassoffProgressContextType>({
  progress: null,
  confirmed: false,
  countedIds: null,
  syncStatus: "local",
  recordLessonComplete: () => {},
  flush: async () => null,
  unannouncedTopic: null,
  markTopicAnnounced: () => {},
});

const PENDING_KEY = "kig:passoff:pending:v1";
/** + the licence id: the server's last answer for that licence, shown until the next one comes */
const ANSWER_KEY = "kig:passoff:answer:";
/** + the licence id: the last topic the course list announced (or found open) on this device */
const SEEN_TOPIC_KEY = "kig:passoff:seen-topic:";
const COURSE_PATH = "/passoff-grammar";
const API = "/api/progress/passoff-grammar";
/** the server takes 100 records a request (src/lib/passoffUnlock.ts) — and there are 67 lessons */
const MAX_PENDING = 100;

function readPending(): PendingCompletion[] {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is PendingCompletion =>
          Boolean(item) &&
          typeof item.lessonId === "string" &&
          passoffTopicOf(item.lessonId) !== null &&
          typeof item.clientUpdatedAt === "number",
      )
      .map((item) => ({
        lessonId: item.lessonId,
        clientUpdatedAt: item.clientUpdatedAt,
        licence: typeof item.licence === "string" && item.licence ? item.licence : null,
        ...(item.refused === true ? { refused: true } : {}),
      }))
      .slice(-MAX_PENDING);
  } catch {
    return [];
  }
}

function writePending(items: PendingCompletion[]) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {
    // private window or blocked storage: this tab still has the queue in memory
  }
}

/** What belongs to a licence: its own completions and those finished with no licence. */
function sendableFor(items: readonly PendingCompletion[], licence: string | null): PendingCompletion[] {
  return licence === null ? [] : items.filter((item) => item.licence === null || item.licence === licence);
}

/** What a licence sends now: its completions — one the server refused only once an answer shows its topic open. */
function dueFor(items: readonly PendingCompletion[], licence: string | null, answer: PassoffProgressSnapshot | null): PendingCompletion[] {
  return sendableFor(items, licence).filter((item) => {
    if (!item.refused) return true;
    const topic = passoffTopicOf(item.lessonId);
    return answer !== null && topic !== null && (answer.everyTopicOpen || topic <= answer.unlockedThrough);
  });
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** The kept answer, if it still has the shape the screens read (it is this device's storage — anything can be there). */
function readAnswer(licence: string): PassoffProgressSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ANSWER_KEY + licence) || "null");
    if (!isPlainObject(parsed) || parsed.version !== 1 || !isPlainObject(parsed.lessons)) return null;
    if (typeof parsed.unlockedThrough !== "number" || !Array.isArray(parsed.topics)) return null;
    const topicsOk = parsed.topics.every(
      (t: unknown) =>
        isPlainObject(t) &&
        typeof t.topic === "number" &&
        Array.isArray(t.lessonIds) &&
        typeof t.requiredCount === "number" &&
        typeof t.percent === "number",
    );
    return topicsOk ? (parsed as unknown as PassoffProgressSnapshot) : null;
  } catch {
    return null;
  }
}

function writeAnswer(licence: string, progress: PassoffProgressSnapshot) {
  try {
    window.localStorage.setItem(ANSWER_KEY + licence, JSON.stringify(progress));
  } catch {
    // no storage: the next page waits for the server's answer, as before
  }
}

export function PassoffProgressProvider({ children }: { children: React.ReactNode }) {
  const { hasActiveLicense, licenseInfo, passoffProgress, applyPassoffProgress } = useLicense();
  const pathname = usePathname() ?? "";
  const [status, setStatus] = useState<Exclude<PassoffSyncStatus, "local">>("syncing");
  const [unannouncedTopic, setUnannouncedTopic] = useState<number | null>(null);
  // Read at the first render: nothing reads the queue before a licence and an answer exist, which never happens
  // before hydration, so the server's render and the browser's first one agree.
  const [pending, setPending] = useState<PendingCompletion[]>(() => (typeof window === "undefined" ? [] : readPending()));
  /** the server's last answer object — `confirmed` while it is the one shown */
  const [serverAnswer, setServerAnswer] = useState<PassoffProgressSnapshot | null>(null);
  const pendingRef = useRef<PendingCompletion[]>(pending);
  const flushingRef = useRef<Promise<PassoffProgressSnapshot | null> | null>(null);
  /** the licence whose answer (kept on this device or from the server) is shown */
  const shownForRef = useRef<string | null>(null);
  /** the licence the server has answered for since this page opened */
  const answeredForRef = useRef<string | null>(null);
  /** that answer — a refused completion waits on it for its topic to open */
  const lastAnswerRef = useRef<PassoffProgressSnapshot | null>(null);

  // which licence this is — an answer for another one must not be shown (a second code entered on this device)
  const licenseIdentity = hasActiveLicense ? licenseInfo?.licenseId || licenseInfo?.maskedKey || "active" : null;
  const identityRef = useRef<string | null>(null);
  useEffect(() => {
    identityRef.current = licenseIdentity;
  }, [licenseIdentity]);

  /** the queue as it is now — in memory, on this device and for the screens */
  const commitPending = useCallback((items: PendingCompletion[]) => {
    pendingRef.current = items;
    writePending(items);
    setPending(items);
  }, []);

  // a licence became known: show the answer kept for it until the server's comes (or none — never another's)
  useEffect(() => {
    if (!licenseIdentity || shownForRef.current === licenseIdentity) return;
    shownForRef.current = licenseIdentity;
    answeredForRef.current = null;
    lastAnswerRef.current = null;
    applyPassoffProgress(readAnswer(licenseIdentity));
  }, [applyPassoffProgress, licenseIdentity]);

  /**
   * The server's answer: shown, kept on this device, and checked for a topic opened since the list last said so. A
   * topic usually opens on a lesson page (its last lesson's completion), so the list cannot count on being on screen
   * at that moment the way STUDENT's does — the last topic announced is kept on this device. The first answer a
   * licence gets on this device is only noted (a new phone does not announce old topics). LIFE opens everything:
   * nothing to announce.
   */
  const accept = useCallback(
    (progress: PassoffProgressSnapshot) => {
      const owner = identityRef.current;
      if (!owner) return;
      shownForRef.current = owner;
      answeredForRef.current = owner;
      lastAnswerRef.current = progress;
      setServerAnswer(progress);
      applyPassoffProgress(progress);
      writeAnswer(owner, progress);
      if (progress.everyTopicOpen) return;
      try {
        const raw = window.localStorage.getItem(SEEN_TOPIC_KEY + owner);
        if (raw === null || !Number.isFinite(Number(raw))) {
          window.localStorage.setItem(SEEN_TOPIC_KEY + owner, String(progress.unlockedThrough));
        } else if (progress.unlockedThrough > Number(raw)) {
          setUnannouncedTopic(progress.unlockedThrough);
        }
      } catch {
        // no storage: no announcement
      }
    },
    [applyPassoffProgress],
  );

  const markTopicAnnounced = useCallback((topic: number) => {
    const owner = identityRef.current;
    try {
      if (owner) {
        const seen = Number(window.localStorage.getItem(SEEN_TOPIC_KEY + owner)) || 0;
        window.localStorage.setItem(SEEN_TOPIC_KEY + owner, String(Math.max(seen, topic)));
      }
    } catch {
      // ignore — it may be announced once more
    }
    setUnannouncedTopic((current) => (current !== null && current <= topic ? null : current));
  }, []);

  const flush = useCallback(async (): Promise<PassoffProgressSnapshot | null> => {
    if (flushingRef.current) await flushingRef.current.catch(() => null);
    const licence = identityRef.current;
    if (!hasActiveLicense || !licence) return null;
    const sent = dueFor(pendingRef.current, licence, lastAnswerRef.current).slice(0, MAX_PENDING);
    if (!sent.length) return null;
    const run = (async (): Promise<PassoffProgressSnapshot | null> => {
      setStatus("syncing");
      try {
        const response = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: sent.map((item) => ({ lessonId: item.lessonId, completed: true, clientUpdatedAt: item.clientUpdatedAt })),
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "sync failed");
        const progress = data.progress as PassoffProgressSnapshot;
        // what the server took is done with; a lesson finished meanwhile stays queued. One it refused (its topic was
        // not open) waits until an answer shows the topic open and goes once more; refused again, or a lesson the
        // course does not list, it is dropped.
        const listed = new Set(progress.topics.flatMap((t) => t.lessonIds));
        const kept: PendingCompletion[] = [];
        for (const item of pendingRef.current) {
          if (!sent.includes(item)) kept.push(item);
          else if (progress.lessons[item.lessonId]?.completed) continue;
          else if (!listed.has(item.lessonId) || item.refused) continue;
          else kept.push({ ...item, licence, refused: true });
        }
        commitPending(kept);
        if (identityRef.current === licence) accept(progress);
        setStatus(sendableFor(kept, licence).some((item) => !item.refused) ? "pending" : "saved");
        return progress;
      } catch {
        setStatus(navigator.onLine ? "error" : "pending");
        return null;
      }
    })();
    flushingRef.current = run;
    try {
      return await run;
    } finally {
      if (flushingRef.current === run) flushingRef.current = null;
    }
  }, [accept, commitPending, hasActiveLicense]);

  const recordLessonComplete = useCallback(
    (lessonId: string) => {
      if (passoffTopicOf(lessonId) === null) return;
      const licence = identityRef.current;
      commitPending(
        [
          ...pendingRef.current.filter((item) => item.lessonId !== lessonId || item.licence !== licence),
          { lessonId, clientUpdatedAt: Date.now(), licence },
        ].slice(-MAX_PENDING),
      );
      if (hasActiveLicense) void flush();
    },
    [commitPending, flush, hasActiveLicense],
  );

  // a licence became active (or the connection came back): what waited for it goes now
  useEffect(() => {
    if (!licenseIdentity) return;
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    if (dueFor(pendingRef.current, licenseIdentity, lastAnswerRef.current).length) void flush();
    return () => window.removeEventListener("online", onOnline);
  }, [flush, licenseIdentity]);

  // the course's pages ask the server: the list every time (it shows the locks), a lesson page when the server has
  // not answered for this licence since this page opened
  const inCourse = pathname === COURSE_PATH || pathname.startsWith(`${COURSE_PATH}/`);
  const onList = pathname === COURSE_PATH;
  useEffect(() => {
    if (!licenseIdentity || !inCourse) return;
    if (!onList && answeredForRef.current === licenseIdentity) return;
    let cancelled = false;
    void (async () => {
      await flush(); // anything queued goes first, so the answer includes it
      try {
        const response = await fetch(API, { cache: "no-store" });
        const data = await response.json();
        if (cancelled || identityRef.current !== licenseIdentity) return;
        if (!response.ok || !data.success) {
          setStatus("error");
          return;
        }
        accept(data.progress);
        if (!sendableFor(pendingRef.current, licenseIdentity).some((item) => !item.refused)) setStatus("saved");
        // a refused completion whose topic this answer shows open goes now
        if (dueFor(pendingRef.current, licenseIdentity, data.progress).length) void flush();
      } catch {
        if (!cancelled) setStatus(navigator.onLine ? "error" : "pending");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accept, flush, inCourse, licenseIdentity, onList, pathname]);

  const countedIds = useMemo<ReadonlySet<string> | null>(() => {
    if (!licenseIdentity || !passoffProgress) return null;
    const ids = new Set(
      sendableFor(pending, licenseIdentity)
        .filter((item) => !item.refused)
        .map((item) => item.lessonId),
    );
    for (const [id, state] of Object.entries(passoffProgress.lessons)) if (state.completed) ids.add(id);
    return ids;
  }, [licenseIdentity, passoffProgress, pending]);

  const value = useMemo<PassoffProgressContextType>(
    () => ({
      progress: passoffProgress,
      confirmed: passoffProgress !== null && passoffProgress === serverAnswer,
      countedIds,
      syncStatus: hasActiveLicense ? status : "local",
      recordLessonComplete,
      flush,
      unannouncedTopic: hasActiveLicense ? unannouncedTopic : null,
      markTopicAnnounced,
    }),
    [countedIds, flush, hasActiveLicense, markTopicAnnounced, passoffProgress, recordLessonComplete, serverAnswer, status, unannouncedTopic],
  );

  return <PassoffProgressContext.Provider value={value}>{children}</PassoffProgressContext.Provider>;
}

export function usePassoffProgress(): PassoffProgressContextType {
  return useContext(PassoffProgressContext);
}

/**
 * "TOPIC N이 열렸어요" on the course list (설계 §5) — a topic opened since this licence's list last said so (see
 * accept above). Shown for five seconds, as STUDENT's, and then counted as said (leaving the list sooner shows it
 * once more next time).
 */
export function usePassoffUnlockNotice(active: boolean): number | null {
  const { unannouncedTopic, markTopicAnnounced } = usePassoffProgress();
  const topic = active ? unannouncedTopic : null;
  useEffect(() => {
    if (topic === null) return;
    const timer = window.setTimeout(() => markTopicAnnounced(topic), 5000);
    return () => window.clearTimeout(timer);
  }, [markTopicAnnounced, topic]);
  return topic;
}
