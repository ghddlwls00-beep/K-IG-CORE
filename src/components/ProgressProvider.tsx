"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLicense, type StudentProgressSnapshot } from "./LicenseProvider";

/**
 * 2026-09-27: fired on window by toggleComplete — a learner marking a lesson done (or undone) by hand. Never by the
 * restore on mount or the server-progress sync, which are not a learner finishing a lesson.
 * detail: { course, lessonId, completed }.
 */
export const LESSON_COMPLETE_EVENT = "kig:lesson-complete";

/**
 * What flushStudentUpdates reports (A11 — STUDENT's '다음 강의' waits for it):
 *   saved    the queue reached the server (or was already empty) · `progress` is the server's answer when one came
 *   local    nothing to send — no licence on this device, the record lives here only
 *   offline  no connection: the queue stays on this device and goes out when the browser is back online
 *   error    the server did not take it: the queue stays and is sent again later
 */
export interface StudentFlushResult {
  status: "saved" | "local" | "offline" | "error";
  progress: StudentProgressSnapshot | null;
}

export interface RecentLesson {
  course: string;
  lessonId: string;
  title: string;
  courseTitle?: string;
  updatedAt: string;
}

interface ProgressContextType {
  completed: Record<string, boolean>;
  bookmarks: Record<string, boolean>;
  recent: RecentLesson | null;
  /** 2026-09-27 (점검 FRAME-U02 · FRAME-L02): the last lesson opened in each course, for '이어서 학습' */
  recentByCourse: Record<string, RecentLesson>;
  isCompleted: (course: string, lessonId: string) => boolean;
  toggleComplete: (course: string, lessonId: string) => void;
  isBookmarked: (course: string, lessonId: string) => boolean;
  toggleBookmark: (course: string, lessonId: string) => void;
  recordRecent: (course: string, lessonId: string, title: string, courseTitle?: string) => void;
  getCourseCompletedCount: (course: string) => number;
  getCourseBookmarkCount: (course: string) => number;
  studentSyncStatus: "local" | "syncing" | "saved" | "pending" | "error";
  /** Sends the queued STUDENT progress now; resolves when the server answered or the send failed (A11). */
  flushStudentUpdates: () => Promise<StudentFlushResult>;
  /** ADULT (2026-10-02) — STUDENT's server sync for ADULT's own record (/api/progress/adult) */
  adultSyncStatus: "local" | "syncing" | "saved" | "pending" | "error";
  flushAdultUpdates: () => Promise<StudentFlushResult>;
}

const ProgressContext = createContext<ProgressContextType>({
  completed: {},
  bookmarks: {},
  recent: null,
  recentByCourse: {},
  isCompleted: () => false,
  toggleComplete: () => {},
  isBookmarked: () => false,
  toggleBookmark: () => {},
  recordRecent: () => {},
  getCourseCompletedCount: () => 0,
  getCourseBookmarkCount: () => 0,
  studentSyncStatus: "local",
  flushStudentUpdates: async () => ({ status: "local", progress: null }),
  adultSyncStatus: "local",
  flushAdultUpdates: async () => ({ status: "local", progress: null }),
});

const COMPLETED_KEY = "kig:progress:completed";
const BOOKMARKS_KEY = "kig:progress:bookmarks";
const RECENT_KEY = "kig:progress:recent";
/** { [course]: RecentLesson } — RECENT_KEY keeps only the one lesson opened last, in any course */
const RECENT_BY_COURSE_KEY = "kig:progress:recent:v2";
const PENDING_KEY = "kig:student:pending:v1";
/**
 * 2026-10-05 (회귀 점검 1002 A2): the STUDENT lessons the server's record had as done when it was last applied on this device
 * (JSON list of lesson ids). The studentProgress effect writes the server's completions into COMPLETED_KEY; without this list,
 * the next page load read those copies back as the device's own old completions and sent them as `legacyCompletedLessonIds` —
 * a lesson the learner had un-completed on another device came back as done. A completion in this list is the server's, never
 * an old one to carry over.
 */
const STUDENT_SERVER_COPY_KEY = "kig:student:server-completed:v1";
/** ADULT's queue — the same records as STUDENT's, in a key of its own */
const ADULT_PENDING_KEY = "kig:adult:pending:v1";

interface StudentPendingUpdate {
  lessonId?: string;
  completed?: boolean;
  lastLessonId?: string;
  clientUpdatedAt: number;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const {
    hasActiveLicense,
    licenseInfo,
    studentProgress,
    applyStudentProgress,
    adultProgress,
    applyAdultProgress,
  } = useLicense();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [recent, setRecent] = useState<RecentLesson | null>(null);
  const [recentByCourse, setRecentByCourse] = useState<Record<string, RecentLesson>>({});
  const [studentSyncStatus, setStudentSyncStatus] = useState<ProgressContextType["studentSyncStatus"]>("local");
  const pendingRef = useRef<StudentPendingUpdate[]>([]);
  const legacyStudentIdsRef = useRef<string[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const flushingRef = useRef<Promise<StudentFlushResult> | null>(null);
  const [adultSyncStatus, setAdultSyncStatus] = useState<ProgressContextType["adultSyncStatus"]>("local");
  const adultPendingRef = useRef<StudentPendingUpdate[]>([]);
  const adultFlushTimerRef = useRef<number | null>(null);
  const adultFlushingRef = useRef<Promise<StudentFlushResult> | null>(null);

  /**
   * 2026-09-27 (A11 · STU-U10): also callable by a view — STUDENT's '다음 강의' awaits it, so the completion reaches the
   * server before the next lesson's page asks the server whether that lesson is open. It answers with the outcome; the
   * request and the record format are unchanged. A send already under way is waited for, not repeated.
   */
  const flushStudentUpdates = useCallback(async (): Promise<StudentFlushResult> => {
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (flushingRef.current) await flushingRef.current.catch(() => null);
    if (!hasActiveLicense) return { status: "local", progress: null };
    if (pendingRef.current.length === 0) return { status: "saved", progress: null };
    const run = (async (): Promise<StudentFlushResult> => {
      const updates = pendingRef.current.slice(0, 100);
      setStudentSyncStatus("syncing");
      try {
        const response = await fetch("/api/progress/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "sync failed");
        pendingRef.current = pendingRef.current.slice(updates.length);
        window.localStorage.setItem(PENDING_KEY, JSON.stringify(pendingRef.current));
        applyStudentProgress(data.progress);
        setStudentSyncStatus(pendingRef.current.length ? "pending" : "saved");
        return { status: "saved", progress: (data.progress as StudentProgressSnapshot) ?? null };
      } catch {
        const online = navigator.onLine;
        setStudentSyncStatus(online ? "error" : "pending");
        return { status: online ? "error" : "offline", progress: null };
      }
    })();
    flushingRef.current = run;
    try {
      return await run;
    } finally {
      if (flushingRef.current === run) flushingRef.current = null;
    }
  }, [applyStudentProgress, hasActiveLicense]);

  const queueStudentUpdate = useCallback((update: StudentPendingUpdate) => {
    const identity = update.lessonId
      ? `lesson:${update.lessonId}`
      : update.lastLessonId
        ? "recent"
        : `event:${update.clientUpdatedAt}`;
    pendingRef.current = pendingRef.current.filter((item) => {
      const itemIdentity = item.lessonId
        ? `lesson:${item.lessonId}`
        : item.lastLessonId
          ? "recent"
          : `event:${item.clientUpdatedAt}`;
      return itemIdentity !== identity;
    });
    pendingRef.current.push(update);
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(pendingRef.current));
    } catch {
      // Keep the in-memory queue when browser storage is unavailable.
    }
    setStudentSyncStatus(navigator.onLine ? "syncing" : "pending");
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(flushStudentUpdates, 650);
  }, [flushStudentUpdates]);

  /** ADULT (2026-10-02) — flushStudentUpdates above, for ADULT's queue and endpoint. */
  const flushAdultUpdates = useCallback(async (): Promise<StudentFlushResult> => {
    if (adultFlushTimerRef.current) {
      window.clearTimeout(adultFlushTimerRef.current);
      adultFlushTimerRef.current = null;
    }
    if (adultFlushingRef.current) await adultFlushingRef.current.catch(() => null);
    if (!hasActiveLicense) return { status: "local", progress: null };
    if (adultPendingRef.current.length === 0) return { status: "saved", progress: null };
    const run = (async (): Promise<StudentFlushResult> => {
      const updates = adultPendingRef.current.slice(0, 100);
      setAdultSyncStatus("syncing");
      try {
        const response = await fetch("/api/progress/adult", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "sync failed");
        adultPendingRef.current = adultPendingRef.current.slice(updates.length);
        window.localStorage.setItem(ADULT_PENDING_KEY, JSON.stringify(adultPendingRef.current));
        applyAdultProgress(data.progress);
        setAdultSyncStatus(adultPendingRef.current.length ? "pending" : "saved");
        return { status: "saved", progress: (data.progress as StudentProgressSnapshot) ?? null };
      } catch {
        const online = navigator.onLine;
        setAdultSyncStatus(online ? "error" : "pending");
        return { status: online ? "error" : "offline", progress: null };
      }
    })();
    adultFlushingRef.current = run;
    try {
      return await run;
    } finally {
      if (adultFlushingRef.current === run) adultFlushingRef.current = null;
    }
  }, [applyAdultProgress, hasActiveLicense]);

  const queueAdultUpdate = useCallback((update: StudentPendingUpdate) => {
    const identityOf = (item: StudentPendingUpdate) =>
      item.lessonId ? `lesson:${item.lessonId}` : item.lastLessonId ? "recent" : `event:${item.clientUpdatedAt}`;
    const identity = identityOf(update);
    adultPendingRef.current = adultPendingRef.current.filter((item) => identityOf(item) !== identity);
    adultPendingRef.current.push(update);
    try {
      window.localStorage.setItem(ADULT_PENDING_KEY, JSON.stringify(adultPendingRef.current));
    } catch {
      // Keep the in-memory queue when browser storage is unavailable.
    }
    setAdultSyncStatus(navigator.onLine ? "syncing" : "pending");
    if (adultFlushTimerRef.current) window.clearTimeout(adultFlushTimerRef.current);
    adultFlushTimerRef.current = window.setTimeout(flushAdultUpdates, 650);
  }, [flushAdultUpdates]);

  // Restore on mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const savedCompleted = window.localStorage.getItem(COMPLETED_KEY);
      if (savedCompleted) {
        const parsed = JSON.parse(savedCompleted) as Record<string, boolean>;
        setCompleted(parsed);
        // old completions = this device's own, not the copies of the server's record (STUDENT_SERVER_COPY_KEY — A2)
        let serverCopy: string[] = [];
        try {
          const raw = JSON.parse(window.localStorage.getItem(STUDENT_SERVER_COPY_KEY) || "[]");
          if (Array.isArray(raw)) serverCopy = raw.filter((id): id is string => typeof id === "string");
        } catch {
          // a broken list counts as none
        }
        const fromServer = new Set(serverCopy);
        legacyStudentIdsRef.current = Object.keys(parsed)
          .filter((key) => key.startsWith("student:") && parsed[key])
          .map((key) => key.substring("student:".length))
          .filter((lessonId) => !fromServer.has(lessonId));
      }

      const savedBookmarks = window.localStorage.getItem(BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedRecent = window.localStorage.getItem(RECENT_KEY);
      if (savedRecent) setRecent(JSON.parse(savedRecent));

      const savedByCourse = window.localStorage.getItem(RECENT_BY_COURSE_KEY);
      if (savedByCourse) setRecentByCourse(JSON.parse(savedByCourse));
      else if (savedRecent) {
        // first visit after this change: seed the per-course map from the single old record
        const old = JSON.parse(savedRecent) as RecentLesson;
        if (old?.course) setRecentByCourse({ [old.course]: old });
      }

      const pending = window.localStorage.getItem(PENDING_KEY);
      if (pending) pendingRef.current = JSON.parse(pending);

      const adultPending = window.localStorage.getItem(ADULT_PENDING_KEY);
      if (adultPending) adultPendingRef.current = JSON.parse(adultPending);
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (!studentProgress) return;
    setCompleted((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(next)) {
        if (key.startsWith("student:")) delete next[key];
      }
      const fromServer: string[] = [];
      for (const [lessonId, state] of Object.entries(studentProgress.lessons)) {
        if (!state.completed) continue;
        next[`student:${lessonId}`] = true;
        fromServer.push(lessonId);
      }
      try {
        window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
        window.localStorage.setItem(STUDENT_SERVER_COPY_KEY, JSON.stringify(fromServer));
      } catch {
        // ignore
      }
      return next;
    });
    setStudentSyncStatus("saved");
  }, [studentProgress]);

  // ADULT — the server's record is what the list and the lesson show as done, as STUDENT's above
  useEffect(() => {
    if (!adultProgress) return;
    setCompleted((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(next)) {
        if (key.startsWith("adult:")) delete next[key];
      }
      for (const [lessonId, state] of Object.entries(adultProgress.lessons)) {
        if (state.completed) next[`adult:${lessonId}`] = true;
      }
      try {
        window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setAdultSyncStatus("saved");
  }, [adultProgress]);

  useEffect(() => {
    if (!hasActiveLicense) return;
    const onOnline = () => void flushAdultUpdates();
    window.addEventListener("online", onOnline);
    if (adultPendingRef.current.length) void flushAdultUpdates();
    return () => window.removeEventListener("online", onOnline);
  }, [flushAdultUpdates, hasActiveLicense]);

  useEffect(() => {
    if (!hasActiveLicense) return;
    const onOnline = () => void flushStudentUpdates();
    window.addEventListener("online", onOnline);
    if (pendingRef.current.length) void flushStudentUpdates();
    return () => window.removeEventListener("online", onOnline);
  }, [flushStudentUpdates, hasActiveLicense]);

  useEffect(() => {
    if (!hasActiveLicense || !studentProgress) return;
    const legacyIds = legacyStudentIdsRef.current;
    if (!legacyIds.length) return;
    // BUG-018: the marker used to be named after the code's last 16 characters (its whole
    // checksum). It is named after the opaque licence id now; an old-named marker still
    // means "already sent", so it is renamed instead of sending the same lessons again.
    // Wait for the id: a pre-BUG-018 copy has none until its first verification, and a
    // marker written under a placeholder name would not be found once the id arrives —
    // the lessons would be sent a second time (3차 점검, 2026-09-24).
    const licenseId = licenseInfo?.licenseId;
    if (!licenseId) return;
    const marker = `kig:student:migrated:${licenseId}`;
    const oldMarkers = Object.keys(window.localStorage).filter((name) => /^kig:student:migrated:[A-F0-9]{16}$/.test(name));
    if (oldMarkers.length) {
      window.localStorage.setItem(marker, "1");
      for (const name of oldMarkers) window.localStorage.removeItem(name);
      legacyStudentIdsRef.current = [];
      return;
    }
    if (window.localStorage.getItem(marker)) return;
    void fetch("/api/progress/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legacyCompletedLessonIds: legacyIds }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.localStorage.setItem(marker, "1");
          legacyStudentIdsRef.current = [];
          applyStudentProgress(data.progress);
        }
      });
  }, [applyStudentProgress, hasActiveLicense, licenseInfo?.licenseId, studentProgress]);

  const isCompleted = useCallback(
    (course: string, lessonId: string) => {
      return Boolean(completed[`${course}:${lessonId}`]);
    },
    [completed]
  );

  /**
   * 2026-09-27: the new value is decided here, from the state this press saw, so the saved record, the server queue and
   * the LESSON_COMPLETE_EVENT all carry the same value (the event is how the learning engine hears a learner finish a
   * lesson; only this function sends it).
   */
  const toggleComplete = useCallback((course: string, lessonId: string) => {
    const key = `${course}:${lessonId}`;
    const willBe = !completed[key];
    setCompleted((prev) => {
      const next = { ...prev, [key]: willBe };
      if (!next[key]) delete next[key];
      try {
        window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (course === "student" && hasActiveLicense) {
      queueStudentUpdate({
        lessonId,
        completed: willBe,
        clientUpdatedAt: Date.now(),
      });
    }
    if (course === "adult" && hasActiveLicense) {
      queueAdultUpdate({ lessonId, completed: willBe, clientUpdatedAt: Date.now() });
    }
    try {
      window.dispatchEvent(new CustomEvent(LESSON_COMPLETE_EVENT, { detail: { course, lessonId, completed: willBe } }));
    } catch {
      // an old browser without CustomEvent: the completion is saved; only listeners miss it
    }
  }, [completed, hasActiveLicense, queueAdultUpdate, queueStudentUpdate]);

  const isBookmarked = useCallback(
    (course: string, lessonId: string) => {
      return Boolean(bookmarks[`${course}:${lessonId}`]);
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback((course: string, lessonId: string) => {
    setBookmarks((prev) => {
      const key = `${course}:${lessonId}`;
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      try {
        window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const recordRecent = useCallback(
    (course: string, lessonId: string, title: string, courseTitle?: string) => {
      const item: RecentLesson = {
        course,
        lessonId,
        title,
        courseTitle,
        updatedAt: new Date().toISOString(),
      };
      setRecent(item);
      setRecentByCourse((previous) => {
        const next = { ...previous, [course]: item };
        try {
          window.localStorage.setItem(RECENT_BY_COURSE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(item));
      } catch {
        // ignore
      }
      if (course === "student" && hasActiveLicense) {
        queueStudentUpdate({ lastLessonId: lessonId, clientUpdatedAt: Date.now() });
      }
      if (course === "adult" && hasActiveLicense) {
        queueAdultUpdate({ lastLessonId: lessonId, clientUpdatedAt: Date.now() });
      }
    },
    [hasActiveLicense, queueAdultUpdate, queueStudentUpdate]
  );

  const getCourseCompletedCount = useCallback(
    (course: string) => {
      const prefix = `${course}:`;
      return Object.keys(completed).filter((k) => k.startsWith(prefix) && completed[k]).length;
    },
    [completed]
  );

  const getCourseBookmarkCount = useCallback(
    (course: string) => {
      const prefix = `${course}:`;
      return Object.keys(bookmarks).filter((k) => k.startsWith(prefix) && bookmarks[k]).length;
    },
    [bookmarks]
  );

  return (
    <ProgressContext.Provider
      value={{
        completed,
        bookmarks,
        recent,
        recentByCourse,
        isCompleted,
        toggleComplete,
        isBookmarked,
        toggleBookmark,
        recordRecent,
        getCourseCompletedCount,
        getCourseBookmarkCount,
        studentSyncStatus,
        flushStudentUpdates,
        adultSyncStatus,
        flushAdultUpdates,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}
