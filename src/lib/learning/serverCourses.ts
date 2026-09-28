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
  /**
   * 단계 2-나 E2 — the owner's "내 답도 맞아요" list (/admin/license): what an item asks and its model answer, in plain words.
   * Only the admin route calls it, for the owner. null for a key the course does not have.
   */
  describe?: (key: string) => ReportedItem | null;
}

/** An item as the owner's report list shows it. */
export interface ReportedItem {
  lessonId: string;
  lessonTitle: string;
  /** what the learner was asked (the Korean sentence, or the instruction and its sentence) */
  prompt: string;
  /** the model answer and the answers already taken — what a report is judged against */
  answers: string[];
}

const COURSES: Record<string, ServerLearningCourse> = {
  [PASSOFF_SERVER_LEARNING.course]: PASSOFF_SERVER_LEARNING,
};

/** The course's server adapter — null for a course whose record is not kept on the server (serverStore.ts). */
export function serverLearningCourse(course: string): ServerLearningCourse | null {
  return isServerLearningCourse(course) ? (COURSES[course] ?? null) : null;
}

/**
 * The course's server adapter whether or not the server keeps its record — for the item data a device asks for by key
 * (src/app/api/learning/[course]/items/route.ts): a course whose record stays on the device until D04 plans on the device,
 * and its paid items still come from the server, those keys only. Null for a course with no adapter.
 */
export function learningCourseAdapter(course: string): ServerLearningCourse | null {
  return Object.prototype.hasOwnProperty.call(COURSES, course) ? COURSES[course] : null;
}
