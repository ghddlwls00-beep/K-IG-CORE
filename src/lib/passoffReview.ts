import "server-only";

import { getCourseIndex, getLesson } from "@/lib/content";
import type { ReportedItem, ServerLearningAccess, ServerLearningCourse } from "@/lib/learning/serverCourses";
import { passoffReviewBlocks } from "@/lib/passoffContent";
import type { PassoffMapData } from "@/lib/passoffMap";
import { viewBlocks } from "@/lib/passoffView";
import {
  PASSOFF_COURSE,
  PASSOFF_FREE_LESSONS,
  PASSOFF_PROFILE,
  passoffLessonOfItem,
  type PassoffItemKind,
  type PassoffReviewItem,
} from "@/lib/passoffLearning";
import { getPassoffProgress, isPassoffLessonUnlocked } from "@/lib/passoffProgress";
import type { PassoffAnchor, PassoffFormItem, PassoffProduceItem } from "@/lib/passoffTypes";
import { emptyPassoffRecord, type PassoffTopic } from "@/lib/passoffUnlock";
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

  // E2 — the owner's report list: the Korean (or the instruction) and the answers a report is judged against
  describe(key): ReportedItem | null {
    const lessonId = passoffLessonOfItem(key);
    const found = lessonItems(lessonId, true)?.get(key);
    if (!found) return null;
    if (found.kind === "produce" || found.kind === "transfer") {
      const item = found.item as PassoffProduceItem;
      const prompt = [item.promptEn, item.ko, item.condition ? `(${item.condition})` : null].filter(Boolean).join(" ");
      return { lessonId, lessonTitle: found.lessonTitle, prompt, answers: [item.en, ...(item.accept ?? [])] };
    }
    const item = found.item as PassoffFormItem;
    if (item.kind === "select") {
      const label = (k: number) => (Array.isArray(item.labelAnswer) ? item.labelAnswer[k] : item.labelAnswer);
      const picked = item.answer.map((i, k) => (item.labels?.length && label(k) ? `${item.tokens[i]}(${label(k)})` : item.tokens[i]));
      return { lessonId, lessonTitle: found.lessonTitle, prompt: `${item.instruction} — ${item.tokens.join(" ")}`, answers: [picked.join(" ")] };
    }
    const prompt = item.sentence ? `${item.instruction} — ${item.sentence}` : item.instruction;
    return { lessonId, lessonTitle: found.lessonTitle, prompt, answers: item.kind === "choice" ? [item.options[item.answer]] : item.answer };
  },
};

/**
 * "구성도 다시 채우기" of a topic (src/lib/passoffMap.ts — 단계 2-나 E2): each lesson's title, rule title and first ① sentence,
 * from the lesson files as their pages show them (viewBlocks — a free lesson's paid STUDENT sentences stay out). The map page
 * calls this only for a licence that has the topic open.
 */
export function passoffMapData(topic: PassoffTopic): PassoffMapData | null {
  const lessons: PassoffMapData["lessons"] = [];
  for (const lessonId of topic.lessonIds) {
    const lesson = listedLessons().has(lessonId) ? getLesson(PASSOFF_COURSE, lessonId) : null;
    if (!lesson) return null;
    const blocks = viewBlocks(lesson.blocks);
    const rule = blocks.find((b) => b.type === "rule");
    const anchors = blocks.flatMap((b) => (b.type === "anchors" ? (b.items as PassoffAnchor[]) : []));
    const ruleTitle = rule && rule.type === "rule" ? rule.title : "";
    if (!ruleTitle || !anchors.length) return null;
    lessons.push({ id: lessonId, title: lesson.title || lessonId, ruleTitle, sentence: { id: anchors[0].id, en: anchors[0].en } });
  }
  return lessons.length ? { topic: topic.topic, label: topic.label, lessons } : null;
}

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
