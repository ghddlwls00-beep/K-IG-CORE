"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

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
});

const COMPLETED_KEY = "kig:progress:completed";
const BOOKMARKS_KEY = "kig:progress:bookmarks";
const RECENT_KEY = "kig:progress:recent";

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [recent, setRecent] = useState<RecentLesson | null>(null);

  // Restore on mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const savedCompleted = window.localStorage.getItem(COMPLETED_KEY);
      if (savedCompleted) setCompleted(JSON.parse(savedCompleted));

      const savedBookmarks = window.localStorage.getItem(BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedRecent = window.localStorage.getItem(RECENT_KEY);
      if (savedRecent) setRecent(JSON.parse(savedRecent));
    } catch {
      // LocalStorage unavailable
    }
  }, []);

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
      return next;
    });
  }, []);

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
    },
    []
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
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  return useContext(ProgressContext);
}
