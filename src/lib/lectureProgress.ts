import "server-only";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getCourseGroups } from "@/lib/content";
import { isFreePreviewLesson, normalizeLicenseKey } from "@/lib/license";
import type {
  StudentChapterProgress,
  StudentLessonState,
  StudentProgressRecord,
  StudentProgressWriteOptions,
} from "@/lib/studentProgress";
import { LECTURE_CHAPTERS, LECTURE_LESSON_ID, lectureChapterOf } from "@/lib/lectureChapters";

/**
 * LECTURE progress on the server — the record behind LECTURE's chapter order lock (2026-10-17, docs/lecture/README.md).
 *
 * 사장님 2026-10-17: "STUDENT 처럼 순서 잠금(장의 80% + 마지막 강의를 마치면 다음 장)". This is ADULT's
 * src/lib/adultProgress.ts (itself STUDENT's src/lib/studentProgress.ts) rule for rule — a chapter is complete at 80% of its
 * lessons (rounded up) plus its last lesson, completing chapter N opens N+1, a completion is taken only for a reachable
 * chapter (RE-010), a LIFE pass opens every chapter (BUG-030), the admin can open chapters by hand — with LECTURE's own ids
 * ("lm001"–"lm100" · "lh001"–"lh100", lectureChapters.ts), its 20 chapters and its own record. ADULT's and STUDENT's files
 * are not touched and not shared, so their audited code stays as it was.
 *
 * Storage: one private R2 object per licence code, private/progress/lecture/<sha256(code)>.json in R2_LICENSE_BUCKET,
 * AES-256-GCM under a key from LICENSE_STORAGE_SECRET, writes one at a time per code — STUDENT's own prefix is the
 * bare private/progress/, so LECTURE must never write there. On a machine with no R2 settings at all (never on Vercel or
 * in production) it is data/lecture-progress.json.
 *
 * There is no legacy import: LECTURE never had an old app.
 */

export const LECTURE_PROGRESS_VERSION = 1;
export const LECTURE_REQUIRED_RATIO = 0.8;
export const LECTURE_CHAPTER_COUNT = LECTURE_CHAPTERS;
const PROGRESS_PREFIX = "private/progress/lecture/";
const LESSON_ID = LECTURE_LESSON_ID;

export type LectureProgressRecord = StudentProgressRecord;
export type LectureChapterProgress = StudentChapterProgress;

interface R2Config {
  client: S3Client;
  bucket: string;
  encryptionKey: Buffer;
}

interface EncryptedEnvelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

let cachedClient: S3Client | null = null;
const writeQueues = new Map<string, Promise<LectureProgressRecord>>();

/** SEC-KEY-01 — the one spelling of a code (license.ts), so a spaced variant files under the same record. */
function normalizeKey(key: string): string {
  return normalizeLicenseKey(key);
}

function progressObjectKey(key: string): string {
  const digest = crypto.createHash("sha256").update(normalizeKey(key)).digest("hex");
  return `${PROGRESS_PREFIX}${digest}.json`;
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_LICENSE_BUCKET?.trim();
  const secret = process.env.LICENSE_STORAGE_SECRET?.trim();
  const values = [accountId, accessKeyId, secretAccessKey, bucket, secret];

  if (values.every(Boolean)) {
    if (secret!.length < 32) throw new Error("LICENSE_STORAGE_SECRET is insecure.");
    cachedClient ??= new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
    return {
      client: cachedClient,
      bucket: bucket!,
      encryptionKey: crypto.createHash("sha256").update(secret!).digest(),
    };
  }

  if (values.some(Boolean) || process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("Durable LECTURE progress storage is not configured.");
  }
  return null;
}

function emptyRecord(): LectureProgressRecord {
  return {
    version: LECTURE_PROGRESS_VERSION,
    lessons: {},
    unlockedThrough: 1,
    updatedAt: Date.now(),
  };
}

function encrypt(record: LectureProgressRecord, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(record), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  } satisfies EncryptedEnvelope);
}

function decrypt(raw: string, key: Buffer): LectureProgressRecord {
  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted LECTURE progress record.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return sanitizeRecord(JSON.parse(plaintext));
}

function sanitizeRecord(input: unknown): LectureProgressRecord {
  if (!input || typeof input !== "object") return emptyRecord();
  const value = input as Partial<LectureProgressRecord>;
  const lessons: Record<string, StudentLessonState> = {};
  for (const [lessonId, state] of Object.entries(value.lessons || {})) {
    if (!LESSON_ID.test(lessonId)) continue;
    if (!state || typeof state !== "object") continue;
    const candidate = state as Partial<StudentLessonState>;
    if (typeof candidate.completed !== "boolean" || !Number.isFinite(candidate.updatedAt)) continue;
    lessons[lessonId] = {
      completed: candidate.completed,
      updatedAt: Number(candidate.updatedAt),
    };
  }
  return {
    version: LECTURE_PROGRESS_VERSION,
    lessons,
    unlockedThrough: clampChapter(value.unlockedThrough),
    manualUnlockedThrough: value.manualUnlockedThrough
      ? clampChapter(value.manualUnlockedThrough)
      : undefined,
    lastLessonId:
      typeof value.lastLessonId === "string" && LESSON_ID.test(value.lastLessonId)
        ? value.lastLessonId
        : undefined,
    lastLessonUpdatedAt: Number.isFinite(value.lastLessonUpdatedAt)
      ? Number(value.lastLessonUpdatedAt)
      : undefined,
    updatedAt: Number.isFinite(value.updatedAt) ? Number(value.updatedAt) : Date.now(),
  };
}

function clampChapter(value: unknown): number {
  return Math.min(LECTURE_CHAPTER_COUNT, Math.max(1, Math.floor(Number(value) || 1)));
}

function localFilePath(): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "lecture-progress.json");
}

function readLocal(): Record<string, LectureProgressRecord> {
  const file = localFilePath();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function readRecord(key: string): Promise<LectureProgressRecord> {
  const config = getR2Config();
  if (!config) return sanitizeRecord(readLocal()[normalizeKey(key)]);
  try {
    const response = await config.client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: progressObjectKey(key) }),
    );
    const raw = await response.Body?.transformToString();
    return raw ? decrypt(raw, config.encryptionKey) : emptyRecord();
  } catch (error) {
    const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404) {
      return emptyRecord();
    }
    throw error;
  }
}

async function writeRecord(key: string, record: LectureProgressRecord): Promise<void> {
  const config = getR2Config();
  if (!config) {
    const all = readLocal();
    all[normalizeKey(key)] = record;
    fs.writeFileSync(localFilePath(), JSON.stringify(all, null, 2), "utf8");
    return;
  }
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: progressObjectKey(key),
      Body: encrypt(record, config.encryptionKey),
      ContentType: "application/octet-stream",
      CacheControl: "no-store",
    }),
  );
}

/** RE-010 (as STUDENT) — the chapter of each lesson, for the reachable-chapter guard below. */
function chapterIndexByLesson(): Map<string, number> {
  const map = new Map<string, number>();
  getCourseGroups("lecture").slice(0, LECTURE_CHAPTER_COUNT).forEach((group, index) => {
    for (const id of group.lessons) {
      if (LESSON_ID.test(id)) map.set(id, index + 1);
    }
  });
  return map;
}

export function getLectureChapters(record: LectureProgressRecord): LectureChapterProgress[] {
  const groups = getCourseGroups("lecture");
  const manual = clampChapter(record.manualUnlockedThrough || 1);
  let calculatedUnlocked = 1;
  const base = groups.slice(0, LECTURE_CHAPTER_COUNT).map((group, index) => {
    const chapter = index + 1;
    const lessonIds = group.lessons.filter((id) => LESSON_ID.test(id));
    const completedCount = lessonIds.filter((id) => record.lessons[id]?.completed).length;
    const requiredCount = Math.max(1, Math.ceil(lessonIds.length * LECTURE_REQUIRED_RATIO));
    const lastLessonCompleted = Boolean(
      lessonIds.length > 0 && record.lessons[lessonIds[lessonIds.length - 1]]?.completed,
    );
    const complete = completedCount >= requiredCount && lastLessonCompleted;
    if (chapter <= calculatedUnlocked && complete && chapter < LECTURE_CHAPTER_COUNT) {
      calculatedUnlocked = chapter + 1;
    }
    return {
      chapter,
      // the index's groups carry `title` ('중등 영어독해 1~10강'), not `label` — as ADULT's
      label: group.label || (group as { title?: string }).title || `${chapter}장`,
      lessonIds,
      completedCount,
      requiredCount,
      percent: lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0,
      lastLessonCompleted,
      complete,
      unlocked: false,
    };
  });
  const unlockedThrough = Math.max(calculatedUnlocked, manual, clampChapter(record.unlockedThrough));
  return base.map((chapter) => ({
    ...chapter,
    unlocked: chapter.chapter <= unlockedThrough,
  }));
}

function recalculate(record: LectureProgressRecord): LectureProgressRecord {
  const chapters = getLectureChapters(record);
  const calculated = chapters.filter((chapter) => chapter.unlocked).at(-1)?.chapter || 1;
  record.unlockedThrough = Math.max(record.unlockedThrough, calculated);
  record.updatedAt = Date.now();
  return record;
}

export async function getLectureProgress(key: string): Promise<LectureProgressRecord> {
  return recalculate(await readRecord(key));
}

interface LectureUpdate {
  lessonId?: string;
  completed?: boolean;
  clientUpdatedAt?: number;
  lastLessonId?: string;
}

/** STUDENT's updateStudentProgress, for LECTURE: the RE-010 guard, and none for a pass that opens every chapter (BUG-030). */
export async function updateLectureProgress(
  key: string,
  updateOrUpdates: LectureUpdate | LectureUpdate[],
  { everyChapterOpen = false }: StudentProgressWriteOptions = {},
): Promise<LectureProgressRecord> {
  const normalized = normalizeKey(key);
  const previous = writeQueues.get(normalized) || Promise.resolve(emptyRecord());
  const next = previous
    .catch(() => emptyRecord())
    .then(async () => {
      const record = await readRecord(normalized);
      const validIds = new Set(getCourseGroups("lecture").flatMap((group) => group.lessons));
      const chapterOf = chapterIndexByLesson();
      const reachable = () =>
        everyChapterOpen ? Number.POSITIVE_INFINITY : clampChapter(record.unlockedThrough) + 1;
      const updates = Array.isArray(updateOrUpdates) ? updateOrUpdates.slice(0, 100) : [updateOrUpdates];
      for (const update of updates) {
        const now = Date.now();
        const clientUpdatedAt = Math.min(now + 60_000, Math.max(0, update.clientUpdatedAt || now));

        if (update.lessonId && validIds.has(update.lessonId) && typeof update.completed === "boolean") {
          const chapter = chapterOf.get(update.lessonId);
          if (chapter !== undefined && chapter > reachable()) continue;
          const existing = record.lessons[update.lessonId];
          if (!existing || clientUpdatedAt >= existing.updatedAt) {
            record.lessons[update.lessonId] = {
              completed: update.completed,
              updatedAt: clientUpdatedAt,
            };
          }
        }
        if (update.lastLessonId && validIds.has(update.lastLessonId)) {
          const chapter = chapterOf.get(update.lastLessonId);
          if (chapter !== undefined && chapter > reachable()) continue;
          if (!record.lastLessonUpdatedAt || clientUpdatedAt >= record.lastLessonUpdatedAt) {
            record.lastLessonId = update.lastLessonId;
            record.lastLessonUpdatedAt = clientUpdatedAt;
          }
        }
      }
      recalculate(record);
      await writeRecord(normalized, record);
      return record;
    });
  writeQueues.set(normalized, next);
  try {
    return await next;
  } finally {
    if (writeQueues.get(normalized) === next) writeQueues.delete(normalized);
  }
}

export async function setManualLectureChapter(key: string, chapter: number): Promise<LectureProgressRecord> {
  const record = await readRecord(key);
  record.manualUnlockedThrough = clampChapter(chapter);
  record.unlockedThrough = Math.max(record.unlockedThrough, record.manualUnlockedThrough);
  record.updatedAt = Date.now();
  await writeRecord(key, record);
  return record;
}

export async function resetLectureProgress(key: string): Promise<LectureProgressRecord> {
  const record = emptyRecord();
  await writeRecord(key, record);
  return record;
}

export { lectureChapterOf };

/** The free lectures (license.ts FREE_PREVIEW_LESSON_IDS.lecture) are open to all; any other up to the record's chapter. */
export function isLectureLessonUnlocked(lessonId: string, record: LectureProgressRecord): boolean {
  const chapter = lectureChapterOf(lessonId);
  if (chapter === null) return false;
  if (isFreePreviewLesson("lecture", lessonId)) return true;
  return chapter <= record.unlockedThrough;
}
