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
import { normalizeLicenseKey } from "@/lib/license";
import type {
  StudentChapterProgress,
  StudentLessonState,
  StudentProgressRecord,
  StudentProgressWriteOptions,
} from "@/lib/studentProgress";

/**
 * ADULT progress on the server — the record behind ADULT's chapter order lock (2026-10-02, docs/adult/README.md).
 *
 * ADULT is taught exactly as STUDENT (사장님 "학습법은 student랑 완전히 똑같이"), so this is STUDENT's
 * src/lib/studentProgress.ts rule for rule — a chapter is complete at 80% of its lessons (rounded up) plus its last
 * lesson, completing chapter N opens N+1, a completion is taken only for a reachable chapter (RE-010), a LIFE pass opens
 * every chapter (BUG-030), the admin can open chapters by hand — with ADULT's own ids ("a<chapter>-<part>"), its 12
 * chapters and its own record. STUDENT's file is not touched and not shared (as PASS-OFF GRAMMAR's passoffProgress.ts),
 * so the audited STUDENT code stays as it was.
 *
 * Storage: one private R2 object per licence code, private/progress/adult/<sha256(code)>.json in R2_LICENSE_BUCKET,
 * AES-256-GCM under a key from LICENSE_STORAGE_SECRET, writes one at a time per code — STUDENT's own prefix is the
 * bare private/progress/, so ADULT must never write there. On a machine with no R2 settings at all (never on Vercel or
 * in production) it is data/adult-progress.json.
 *
 * There is no legacy import: ADULT never had an old app.
 */

export const ADULT_PROGRESS_VERSION = 1;
export const ADULT_REQUIRED_RATIO = 0.8;
export const ADULT_CHAPTER_COUNT = 12;
const PROGRESS_PREFIX = "private/progress/adult/";
const LESSON_ID = /^a(?:[1-9]|1[0-2])-\d+$/;

export type AdultProgressRecord = StudentProgressRecord;
export type AdultChapterProgress = StudentChapterProgress;

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
const writeQueues = new Map<string, Promise<AdultProgressRecord>>();

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
    throw new Error("Durable ADULT progress storage is not configured.");
  }
  return null;
}

function emptyRecord(): AdultProgressRecord {
  return {
    version: ADULT_PROGRESS_VERSION,
    lessons: {},
    unlockedThrough: 1,
    updatedAt: Date.now(),
  };
}

function encrypt(record: AdultProgressRecord, key: Buffer): string {
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

function decrypt(raw: string, key: Buffer): AdultProgressRecord {
  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted ADULT progress record.");
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

function sanitizeRecord(input: unknown): AdultProgressRecord {
  if (!input || typeof input !== "object") return emptyRecord();
  const value = input as Partial<AdultProgressRecord>;
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
    version: ADULT_PROGRESS_VERSION,
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
  return Math.min(ADULT_CHAPTER_COUNT, Math.max(1, Math.floor(Number(value) || 1)));
}

function localFilePath(): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "adult-progress.json");
}

function readLocal(): Record<string, AdultProgressRecord> {
  const file = localFilePath();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function readRecord(key: string): Promise<AdultProgressRecord> {
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

async function writeRecord(key: string, record: AdultProgressRecord): Promise<void> {
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
  getCourseGroups("adult").slice(0, ADULT_CHAPTER_COUNT).forEach((group, index) => {
    for (const id of group.lessons) {
      if (LESSON_ID.test(id)) map.set(id, index + 1);
    }
  });
  return map;
}

export function getAdultChapters(record: AdultProgressRecord): AdultChapterProgress[] {
  const groups = getCourseGroups("adult");
  const manual = clampChapter(record.manualUnlockedThrough || 1);
  let calculatedUnlocked = 1;
  const base = groups.slice(0, ADULT_CHAPTER_COUNT).map((group, index) => {
    const chapter = index + 1;
    const lessonIds = group.lessons.filter((id) => LESSON_ID.test(id));
    const completedCount = lessonIds.filter((id) => record.lessons[id]?.completed).length;
    const requiredCount = Math.max(1, Math.ceil(lessonIds.length * ADULT_REQUIRED_RATIO));
    const lastLessonCompleted = Boolean(
      lessonIds.length > 0 && record.lessons[lessonIds[lessonIds.length - 1]]?.completed,
    );
    const complete = completedCount >= requiredCount && lastLessonCompleted;
    if (chapter <= calculatedUnlocked && complete && chapter < ADULT_CHAPTER_COUNT) {
      calculatedUnlocked = chapter + 1;
    }
    return {
      chapter,
      label: group.label || `Chapter ${chapter}`,
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

function recalculate(record: AdultProgressRecord): AdultProgressRecord {
  const chapters = getAdultChapters(record);
  const calculated = chapters.filter((chapter) => chapter.unlocked).at(-1)?.chapter || 1;
  record.unlockedThrough = Math.max(record.unlockedThrough, calculated);
  record.updatedAt = Date.now();
  return record;
}

export async function getAdultProgress(key: string): Promise<AdultProgressRecord> {
  return recalculate(await readRecord(key));
}

interface AdultUpdate {
  lessonId?: string;
  completed?: boolean;
  clientUpdatedAt?: number;
  lastLessonId?: string;
}

/** STUDENT's updateStudentProgress, for ADULT: the RE-010 guard, and none for a pass that opens every chapter (BUG-030). */
export async function updateAdultProgress(
  key: string,
  updateOrUpdates: AdultUpdate | AdultUpdate[],
  { everyChapterOpen = false }: StudentProgressWriteOptions = {},
): Promise<AdultProgressRecord> {
  const normalized = normalizeKey(key);
  const previous = writeQueues.get(normalized) || Promise.resolve(emptyRecord());
  const next = previous
    .catch(() => emptyRecord())
    .then(async () => {
      const record = await readRecord(normalized);
      const validIds = new Set(getCourseGroups("adult").flatMap((group) => group.lessons));
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

export async function setManualAdultChapter(key: string, chapter: number): Promise<AdultProgressRecord> {
  const record = await readRecord(key);
  record.manualUnlockedThrough = clampChapter(chapter);
  record.unlockedThrough = Math.max(record.unlockedThrough, record.manualUnlockedThrough);
  record.updatedAt = Date.now();
  await writeRecord(key, record);
  return record;
}

export async function resetAdultProgress(key: string): Promise<AdultProgressRecord> {
  const record = emptyRecord();
  await writeRecord(key, record);
  return record;
}

/** The chapter of an ADULT lesson id ("a7-2" → 7), or null. */
export function adultChapterOf(lessonId: string): number | null {
  if (!LESSON_ID.test(lessonId)) return null;
  return Number(lessonId.slice(1).split("-")[0]);
}

export function isAdultLessonUnlocked(lessonId: string, record: AdultProgressRecord): boolean {
  const chapter = adultChapterOf(lessonId);
  if (chapter === null) return false;
  if (lessonId === "a1-1" || lessonId === "a1-2") return true;
  return chapter <= record.unlockedThrough;
}
