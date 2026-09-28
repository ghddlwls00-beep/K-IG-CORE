import "server-only";

import { PASSOFF_SERVER_LEARNING } from "@/lib/passoffReview";
import { isServerLearningCourse } from "./serverStore";
import type { CourseProfile } from "./types";

/**
 * What a course gives the learning API (src/app/api/learning/[course]/route.ts) — the server side of its adapter
 * (공통-학습-엔진.md §5 "오늘 낼 문항의 데이터(서버 전용 — 유료 글)는 과정 쪽 서버 함수가 준다"). The API itself knows no
 * course: it checks the licence, merges and plans with the engine, and asks the course three things.
 */
export interface ServerLearningAccess {
  /** a lesson this licence has open — the course's order lock; every listed lesson for a course without one */
  lessonOpen: (lessonId: string) => boolean;
}

export interface ServerLearningCourse<T = unknown> {
  course: string;
  profile: CourseProfile;
  /** what an item key is in this course — its lesson and kind — or null when the course has no such item */
  item: (key: string) => { lessonId: string; kind: string } | null;
  /** the lessons this licence may keep a record of and review (plan is the licence's plan: "1Y", "STU1Y", "LIFE" …) */
  access: (licence: { key: string; plan: string }) => Promise<ServerLearningAccess>;
  /** the data the review screen draws — for these items only, and only those of open lessons */
  itemData: (keys: readonly string[], access: ServerLearningAccess) => Record<string, T>;
}

const COURSES: Record<string, ServerLearningCourse> = {
  [PASSOFF_SERVER_LEARNING.course]: PASSOFF_SERVER_LEARNING,
};

/** The course's server adapter — null for a course whose record is not kept on the server (serverStore.ts). */
export function serverLearningCourse(course: string): ServerLearningCourse | null {
  return isServerLearningCourse(course) ? (COURSES[course] ?? null) : null;
}
