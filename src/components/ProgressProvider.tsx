"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLicense } from "./LicenseProvider";

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
  isCompleted: (course: string, lessonId: string) => boolean;
  toggleComplete: (course: string, lessonId: string) => void;
  isBookmarked: (course: string, lessonId: string) => boolean;
  toggleBookmark: (course: string, lessonId: string) => void;
  recordRecent: (course: string, lessonId: string, title: string, courseTitle?: string) => void;
  getCourseCompletedCount: (course: string) => number;
  getCourseBookmarkCount: (course: string) => number;
  studentSyncStatus: "local" | "syncing" | "saved" | "pending" | "error";
}

const ProgressContext = createContext<ProgressContextType>({
  completed: {},
  bookmarks: {},
  recent: null,
  isCompleted: () => false,
  toggleComplete: () => {},
  isBookmarked: () => false,
  toggleBookmark: () => {},
  recordRecent: () => {},
  getCourseCompletedCount: () => 0,
  getCourseBookmarkCount: () => 0,
  studentSyncStatus: "local",
});

const COMPLETED_KEY = "kig:progress:completed";
const BOOKMARKS_KEY = "kig:progress:bookmarks";
const RECENT_KEY = "kig:progress:recent";
const PENDING_KEY = "kig:student:pending:v1";

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
  } = useLicense();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [recent, setRecent] = useState<RecentLesson | null>(null);
  const [studentSyncStatus, setStudentSyncStatus] = useState<ProgressContextType["studentSyncStatus"]>("local");
  const pendingRef = useRef<StudentPendingUpdate[]>([]);
  const legacyStudentIdsRef = useRef<string[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const flushStudentUpdates = useCallback(async () => {
    if (!hasActiveLicense || pendingRef.current.length === 0) return;
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
    } catch {
      setStudentSyncStatus(navigator.onLine ? "error" : "pending");
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

  // Restore on mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const savedCompleted = window.localStorage.getItem(COMPLETED_KEY);
      if (savedCompleted) {
        const parsed = JSON.parse(savedCompleted) as Record<string, boolean>;
        setCompleted(parsed);
        legacyStudentIdsRef.current = Object.keys(parsed)
          .filter((key) => key.startsWith("student:") && parsed[key])
          .map((key) => key.substring("student:".length));
      }

      const savedBookmarks = window.localStorage.getItem(BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedRecent = window.localStorage.getItem(RECENT_KEY);
      if (savedRecent) setRecent(JSON.parse(savedRecent));

      const pending = window.localStorage.getItem(PENDING_KEY);
      if (pending) pendingRef.current = JSON.parse(pending);
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
      for (const [lessonId, state] of Object.entries(studentProgress.lessons)) {
        if (state.completed) next[`student:${lessonId}`] = true;
      }
      try {
        window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    setStudentSyncStatus("saved");
  }, [studentProgress]);

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
    const marker = `kig:student:migrated:${licenseInfo?.key.slice(-16) || "active"}`;
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
  }, [applyStudentProgress, hasActiveLicense, licenseInfo?.key, studentProgress]);

  const isCompleted = useCallback(
    (course: string, lessonId: string) => {
      return Boolean(completed[`${course}:${lessonId}`]);
    },
    [completed]
  );

  const toggleComplete = useCallback((course: string, lessonId: string) => {
    setCompleted((prev) => {
      const key = `${course}:${lessonId}`;
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      try {
        window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (course === "student" && hasActiveLicense) {
        queueStudentUpdate({
          lessonId,
          completed: Boolean(next[key]),
          clientUpdatedAt: Date.now(),
        });
      }
      return next;
    });
  }, [hasActiveLicense, queueStudentUpdate]);

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
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(item));
      } catch {
        // ignore
      }
      if (course === "student" && hasActiveLicense) {
        queueStudentUpdate({ lastLessonId: lessonId, clientUpdatedAt: Date.now() });
      }
    },
    [hasActiveLicense, queueStudentUpdate]
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
        isCompleted,
        toggleComplete,
        isBookmarked,
        toggleBookmark,
        recordRecent,
        getCourseCompletedCount,
        getCourseBookmarkCount,
        studentSyncStatus,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}
