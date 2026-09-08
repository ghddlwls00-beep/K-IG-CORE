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

export const STUDENT_PROGRESS_VERSION = 1;
export const STUDENT_REQUIRED_RATIO = 0.8;
const PROGRESS_PREFIX = "private/progress/";

export interface StudentLessonState {
  completed: boolean;
  updatedAt: number;
}

export interface StudentProgressRecord {
  version: 1;
  lessons: Record<string, StudentLessonState>;
  unlockedThrough: number;
  manualUnlockedThrough?: number;
  lastLessonId?: string;
  lastLessonUpdatedAt?: number;
  updatedAt: number;
}

export interface StudentChapterProgress {
  chapter: number;
  label: string;
  lessonIds: string[];
  completedCount: number;
  requiredCount: number;
  percent: number;
  lastLessonCompleted: boolean;
  complete: boolean;
  unlocked: boolean;
}

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
const writeQueues = new Map<string, Promise<StudentProgressRecord>>();

function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
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
    throw new Error("Durable STUDENT progress storage is not configured.");
  }
  return null;
}

function emptyRecord(): StudentProgressRecord {
  return {
    version: STUDENT_PROGRESS_VERSION,
    lessons: {},
    unlockedThrough: 1,
    updatedAt: Date.now(),
  };
}

function encrypt(record: StudentProgressRecord, key: Buffer): string {
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

function decrypt(raw: string, key: Buffer): StudentProgressRecord {
  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted STUDENT progress record.");
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

function sanitizeRecord(input: unknown): StudentProgressRecord {
  if (!input || typeof input !== "object") return emptyRecord();
  const value = input as Partial<StudentProgressRecord>;
  const lessons: Record<string, StudentLessonState> = {};
  for (const [lessonId, state] of Object.entries(value.lessons || {})) {
    if (!/^s(?:[1-9]|1\d|20)-\d+$/.test(lessonId)) continue;
    if (!state || typeof state !== "object") continue;
    const candidate = state as Partial<StudentLessonState>;
    if (typeof candidate.completed !== "boolean" || !Number.isFinite(candidate.updatedAt)) continue;
    lessons[lessonId] = {
      completed: candidate.completed,
      updatedAt: Number(candidate.updatedAt),
    };
  }
  return {
    version: STUDENT_PROGRESS_VERSION,
    lessons,
    unlockedThrough: clampChapter(value.unlockedThrough),
    manualUnlockedThrough: value.manualUnlockedThrough
      ? clampChapter(value.manualUnlockedThrough)
      : undefined,
    lastLessonId:
      typeof value.lastLessonId === "string" && /^s(?:[1-9]|1\d|20)-\d+$/.test(value.lastLessonId)
        ? value.lastLessonId
        : undefined,
    lastLessonUpdatedAt: Number.isFinite(value.lastLessonUpdatedAt)
      ? Number(value.lastLessonUpdatedAt)
      : undefined,
    updatedAt: Number.isFinite(value.updatedAt) ? Number(value.updatedAt) : Date.now(),
  };
}

function clampChapter(value: unknown): number {
  return Math.min(20, Math.max(1, Math.floor(Number(value) || 1)));
}

function localFilePath(): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "student-progress.json");
}

function readLocal(): Record<string, StudentProgressRecord> {
  const file = localFilePath();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function readRecord(key: string): Promise<StudentProgressRecord> {
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

async function writeRecord(key: string, record: StudentProgressRecord): Promise<void> {
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

export function getStudentChapters(record: StudentProgressRecord): StudentChapterProgress[] {
  const groups = getCourseGroups("student");
  const manual = clampChapter(record.manualUnlockedThrough || 1);
  let calculatedUnlocked = 1;
  const base = groups.slice(0, 20).map((group, index) => {
    const chapter = index + 1;
    const lessonIds = group.lessons.filter((id) => /^s\d+-\d+$/.test(id));
    const completedCount = lessonIds.filter((id) => record.lessons[id]?.completed).length;
    const requiredCount = Math.max(1, Math.ceil(lessonIds.length * STUDENT_REQUIRED_RATIO));
    const lastLessonCompleted = Boolean(
      lessonIds.length > 0 && record.lessons[lessonIds[lessonIds.length - 1]]?.completed,
    );
    const complete = completedCount >= requiredCount && lastLessonCompleted;
    if (chapter <= calculatedUnlocked && complete && chapter < 20) {
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

function recalculate(record: StudentProgressRecord): StudentProgressRecord {
  const chapters = getStudentChapters(record);
  const calculated = chapters.filter((chapter) => chapter.unlocked).at(-1)?.chapter || 1;
  record.unlockedThrough = Math.max(record.unlockedThrough, calculated);
  record.updatedAt = Date.now();
  return record;
}

export async function getStudentProgress(key: string): Promise<StudentProgressRecord> {
  return recalculate(await readRecord(key));
}

export async function updateStudentProgress(
  key: string,
  updateOrUpdates: {
    lessonId?: string;
    completed?: boolean;
    clientUpdatedAt?: number;
    lastLessonId?: string;
  } | Array<{
    lessonId?: string;
    completed?: boolean;
    clientUpdatedAt?: number;
    lastLessonId?: string;
  }>,
): Promise<StudentProgressRecord> {
  const normalized = normalizeKey(key);
  const previous = writeQueues.get(normalized) || Promise.resolve(emptyRecord());
  const next = previous
    .catch(() => emptyRecord())
    .then(async () => {
      const record = await readRecord(normalized);
      const validIds = new Set(getCourseGroups("student").flatMap((group) => group.lessons));
      const updates = Array.isArray(updateOrUpdates) ? updateOrUpdates.slice(0, 100) : [updateOrUpdates];
      for (const update of updates) {
        const now = Date.now();
        const clientUpdatedAt = Math.min(now + 60_000, Math.max(0, update.clientUpdatedAt || now));

        if (update.lessonId && validIds.has(update.lessonId) && typeof update.completed === "boolean") {
          const existing = record.lessons[update.lessonId];
          if (!existing || clientUpdatedAt >= existing.updatedAt) {
            record.lessons[update.lessonId] = {
              completed: update.completed,
              updatedAt: clientUpdatedAt,
            };
          }
        }
        if (update.lastLessonId && validIds.has(update.lastLessonId)) {
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

export async function mergeLegacyStudentProgress(
  key: string,
  lessonIds: string[],
): Promise<StudentProgressRecord> {
  const validIds = new Set(getCourseGroups("student").flatMap((group) => group.lessons));
  const now = Date.now();
  let record = await readRecord(key);
  for (const id of lessonIds.slice(0, 100)) {
    if (!validIds.has(id) || record.lessons[id]?.completed) continue;
    record.lessons[id] = { completed: true, updatedAt: now };
  }
  record = recalculate(record);
  await writeRecord(key, record);
  return record;
}

export async function setManualStudentChapter(
  key: string,
  chapter: number,
): Promise<StudentProgressRecord> {
  const record = await readRecord(key);
  record.manualUnlockedThrough = clampChapter(chapter);
  record.unlockedThrough = Math.max(record.unlockedThrough, record.manualUnlockedThrough);
  record.updatedAt = Date.now();
  await writeRecord(key, record);
  return record;
}

export async function resetStudentProgress(key: string): Promise<StudentProgressRecord> {
  const record = emptyRecord();
  await writeRecord(key, record);
  return record;
}

export function isStudentLessonUnlocked(
  lessonId: string,
  record: StudentProgressRecord,
): boolean {
  const match = lessonId.match(/^s(\d+)-(\d+)$/);
  if (!match) return false;
  if (lessonId === "s1-1" || lessonId === "s1-2") return true;
  return Number(match[1]) <= record.unlockedThrough;
}
