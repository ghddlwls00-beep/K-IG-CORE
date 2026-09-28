import "server-only";

import { getCourseIndex, getLesson } from "@/lib/content";
import type { ServerLearningAccess, ServerLearningCourse } from "@/lib/learning/serverCourses";
import { passoffReviewBlocks } from "@/lib/passoffContent";
import {
  PASSOFF_COURSE,
  PASSOFF_FREE_LESSONS,
  PASSOFF_PROFILE,
  passoffLessonOfItem,
  type PassoffItemKind,
  type PassoffReviewItem,
} from "@/lib/passoffLearning";
import { getPassoffProgress, isPassoffLessonUnlocked } from "@/lib/passoffProgress";
import type { PassoffFormItem, PassoffProduceItem } from "@/lib/passoffTypes";
import { emptyPassoffRecord } from "@/lib/passoffUnlock";
import type { Block } from "@/lib/types";

/**
 * PASS-OFF GRAMMAR's server side of the review (공통-학습-엔진.md §5 · §8) — what the learning API asks the course:
 *   - which items exist: those a finished lesson brings into review (PassoffLearningView's finish) — ④ produce ·
 *     ⑤ transfer · ③ form items other than `reserve` — found from the item id: "pg02-1:p4" → lesson pg02-1 → its drill
 *     block → the item, with the kind the lesson gives it;
 *   - which lessons are open to the licence: the topic order lock as the lesson route decides it
 *     (src/app/passoff-grammar/[lesson]/page.tsx — a LIFE pass opens every topic, other passes up to `unlockedThrough`);
 *   - the data of today's items: each item's view fields (passoffView.ts viewBlocks — no source table, no record-only
 *     notes), with the lesson's title and rule title. The API holds a licence that opens the course, so a free lesson's
 *     paid STUDENT sentences are attached (passoffContent.ts passoffReviewBlocks).
 * The free review page (no licence) takes the free lessons' items without them (passoffFreeReviewItems).
 */

type ItemTable = Map<string, PassoffReviewItem>;

const tables = new Map<string, ItemTable | null>();

function drillItems(blocks: Block[]): { item: PassoffProduceItem | PassoffFormItem; kind: PassoffItemKind }[] {
  const out: { item: PassoffProduceItem | PassoffFormItem; kind: PassoffItemKind }[] = [];
  for (const block of blocks) {
    if (block.type !== "drill") continue;
    // viewBlocks has already left out `reserve` form items — they are not in a finished lesson's review either
    for (const item of block.select ?? []) out.push({ item, kind: item.kind });
    for (const item of block.produce ?? []) out.push({ item, kind: "produce" });
    for (const item of block.transfer ?? []) out.push({ item, kind: "transfer" });
  }
  return out;
}

let listed: Set<string> | null = null;

/** Every lesson the course index lists (a lesson file the index does not list is not a lesson of the course). */
function listedLessons(): Set<string> {
  listed ??= new Set((getCourseIndex(PASSOFF_COURSE)?.lessons ?? []).map((l) => l.id));
  return listed;
}

/**
 * A listed lesson's review items by id — cached per lesson and per version (with or without the paid sentences). Only
 * listed lessons are looked up, so a record full of made-up ids adds nothing to the cache.
 */
function lessonItems(lessonId: string, withPaid: boolean): ItemTable | null {
  if (!listedLessons().has(lessonId)) return null;
  const cacheKey = `${lessonId}:${withPaid ? "paid" : "free"}`;
  if (tables.has(cacheKey)) return tables.get(cacheKey) ?? null;
  const lesson = getLesson(PASSOFF_COURSE, lessonId);
  let table: ItemTable | null = null;
  if (lesson) {
    const blocks = passoffReviewBlocks(lesson, { withPaid });
    const rule = blocks.find((b) => b.type === "rule");
    const ruleTitle = rule && rule.type === "rule" && rule.title ? rule.title : undefined;
    const lessonTitle = lesson.title || lessonId;
    table = new Map();
    for (const { item, kind } of drillItems(blocks)) {
      if (typeof item.id !== "string" || passoffLessonOfItem(item.id) !== lessonId) continue;
      table.set(item.id, { lessonId, kind, lessonTitle, ...(ruleTitle ? { ruleTitle } : {}), item });
    }
  }
  tables.set(cacheKey, table);
  return table;
}

export const PASSOFF_SERVER_LEARNING: ServerLearningCourse<PassoffReviewItem> = {
  course: PASSOFF_COURSE,
  profile: PASSOFF_PROFILE,

  item(key) {
    const lessonId = passoffLessonOfItem(key);
    const found = lessonItems(lessonId, true)?.get(key);
    return found ? { lessonId, kind: found.kind } : null;
  },

  async access({ key, plan }) {
    // the lesson route's own rule (src/app/passoff-grammar/[lesson]/page.tsx): a LIFE pass opens every topic
    const everyTopicOpen = plan === "LIFE";
    const progress = everyTopicOpen ? emptyPassoffRecord(Date.now()) : await getPassoffProgress(key);
    return { lessonOpen: (lessonId) => isPassoffLessonUnlocked(lessonId, progress, { everyTopicOpen }) };
  },

  itemData(keys, access: ServerLearningAccess) {
    const out: Record<string, PassoffReviewItem> = {};
    for (const key of keys) {
      const lessonId = passoffLessonOfItem(key);
      if (!access.lessonOpen(lessonId)) continue;
      const found = lessonItems(lessonId, true)?.get(key);
      if (found) out[key] = found;
    }
    return out;
  },
};

/**
 * The free review page's items (no licence — 공통-학습-엔진.md §8-2 "무료 체험은 서버를 안 씀"): every review item of the
 * free lessons, WITHOUT the paid STUDENT sentences — the same as their free lesson pages show. Which of them come today
 * the device decides from its own record.
 */
export function passoffFreeReviewItems(): Record<string, PassoffReviewItem> {
  const out: Record<string, PassoffReviewItem> = {};
  for (const lessonId of PASSOFF_FREE_LESSONS) {
    for (const [key, value] of lessonItems(lessonId, false) ?? []) out[key] = value;
  }
  return out;
}
