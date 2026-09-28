import "server-only";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { normalizeLicenseKey } from "@/lib/license";
import { emptyRecord, sanitizeRecord } from "./engine";
import type { CourseRecord } from "./types";

/**
 * The learning record on the server (공통-학습-엔진.md §4 · §8-1) — the same CourseRecord a device keeps, one per licence
 * and course, stored the way STUDENT's progress is (src/lib/studentProgress.ts — not touched, not shared): one private R2
 * object, private/learning/<course>/<sha256(code)>.json in R2_LICENSE_BUCKET, AES-256-GCM under a key from
 * LICENSE_STORAGE_SECRET, one change at a time per code. On a machine with no R2 settings at all — never on Vercel or in
 * production — it is data/learning-<course>.json instead (.gitignore), as STUDENT has data/student-progress.json.
 *
 * As PASS-OFF GRAMMAR's progress does (src/lib/passoffProgress.ts changeRecord), a change is written only over the version
 * it was read from (R2's ETag), so two server instances merging two devices at the same moment do not lose one of them.
 *
 * Only the courses listed here keep their record on the server; the others keep it on the device until the owner decides
 * D04, and then are added here with the same shape.
 */
export const SERVER_LEARNING_COURSES: readonly string[] = ["passoff-grammar"];

export function isServerLearningCourse(course: string): boolean {
  return SERVER_LEARNING_COURSES.includes(course);
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
const writeQueues = new Map<string, Promise<unknown>>();

function checkedCourse(course: string): string {
  // the course is part of an object name and a file name: only a listed slug gets that far
  if (!isServerLearningCourse(course)) throw new Error(`No server learning record for course "${course}".`);
  return course;
}

function objectKey(course: string, key: string): string {
  const digest = crypto.createHash("sha256").update(normalizeLicenseKey(key)).digest("hex");
  return `private/learning/${checkedCourse(course)}/${digest}.json`;
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
    throw new Error("Durable learning record storage is not configured.");
  }
  return null;
}

function encrypt(record: CourseRecord, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(record), "utf8"), cipher.final()]);
  return JSON.stringify({
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  } satisfies EncryptedEnvelope);
}

function decrypt(raw: string, key: Buffer, course: string): CourseRecord {
  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted learning record.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return sanitizeRecord(JSON.parse(plaintext), course);
}

function localFilePath(course: string): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, `learning-${checkedCourse(course)}.json`);
}

function readLocal(course: string): Record<string, unknown> {
  const file = localFilePath(course);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeLocal(course: string, key: string, record: CourseRecord): void {
  const all = readLocal(course);
  all[normalizeLicenseKey(key)] = record;
  fs.writeFileSync(localFilePath(course), JSON.stringify(all, null, 2), "utf8");
}

/** A record and the version it was read at: R2's ETag — null when there is no object yet, and for the local file. */
interface StoredRecord {
  record: CourseRecord;
  etag: string | null;
}

type StoreError = { name?: string; $metadata?: { httpStatusCode?: number } } | null | undefined;
const isMissing = (error: unknown) =>
  (error as StoreError)?.name === "NoSuchKey" || (error as StoreError)?.$metadata?.httpStatusCode === 404;
/** R2 turned a conditional write down (412): another server instance wrote the record after this one read it. */
const isConflict = (error: unknown) =>
  (error as StoreError)?.name === "PreconditionFailed" || (error as StoreError)?.$metadata?.httpStatusCode === 412;

async function readStored(course: string, key: string): Promise<StoredRecord> {
  const config = getR2Config();
  if (!config) return { record: sanitizeRecord(readLocal(course)[normalizeLicenseKey(key)], course), etag: null };
  try {
    const response = await config.client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: objectKey(course, key) }),
    );
    const raw = await response.Body?.transformToString();
    return {
      record: raw ? decrypt(raw, config.encryptionKey, course) : emptyRecord(course),
      etag: response.ETag ?? null,
    };
  } catch (error) {
    if (isMissing(error)) return { record: emptyRecord(course), etag: null };
    throw error;
  }
}

/** `condition` — write only over the version read (IfMatch), or only where no object is yet (IfNoneMatch "*"). */
async function putRecord(
  config: R2Config,
  course: string,
  key: string,
  record: CourseRecord,
  condition: { IfMatch?: string; IfNoneMatch?: string },
): Promise<void> {
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey(course, key),
      Body: encrypt(record, config.encryptionKey),
      ContentType: "application/octet-stream",
      CacheControl: "no-store",
      ...condition,
    }),
  );
}

/** One change at a time per course and code — a read, the change and its write never interleave with another's. */
async function serialized<T>(course: string, key: string, run: () => Promise<T>): Promise<T> {
  const queue = `${course}:${normalizeLicenseKey(key)}`;
  const previous = writeQueues.get(queue) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  writeQueues.set(queue, next);
  try {
    return await next;
  } finally {
    if (writeQueues.get(queue) === next) writeQueues.delete(queue);
  }
}

/** conditional writes tried before the one plain write that ends a run of conflicts (passoffProgress.ts) */
const WRITE_ATTEMPTS = 4;

/** The licence's record for a course (a read never writes). */
export async function readLearningRecord(course: string, key: string): Promise<CourseRecord> {
  return (await readStored(checkedCourse(course), key)).record;
}

/** records read by one request of the owner's report list (/admin/license) at most — the list goes on with `next` */
export const REPORT_PAGE_LIMIT = 200;
/** reads in flight at once while listing */
const LIST_READS_AT_ONCE = 8;

/** One page of every licence's reports: each record's reports only (the rest of a record is dropped as soon as it is read). */
export interface LearningReportsPage {
  /** one entry per record read — its reports, maybe none */
  records: Pick<CourseRecord, "reports">[];
  /** where the next page starts (an object name — a hash of a code — or, for the local file, a position); null at the end */
  next: string | null;
}

/**
 * Every licence's "내 답도 맞아요" reports for a course, read-only, nameless and a page at a time (단계 2-나 E2 — the owner's list,
 * 공통-학습-엔진.md §8-6; 수정: the first version read up to 5,000 whole records in one request, about 300 KB each). The objects
 * under private/learning/<course>/ are named by a hash of the code, so nothing here says whose a record is, and a record is
 * cut down to its reports right after it is read. R2: one listing of `limit` names (Class A) + one read each (Class B) per
 * page, only when the owner asks. The local stand-in file is paged by position.
 */
export async function listLearningReports(
  course: string,
  { after = null, limit = REPORT_PAGE_LIMIT }: { after?: string | null; limit?: number } = {},
): Promise<LearningReportsPage> {
  checkedCourse(course);
  const size = Math.min(REPORT_PAGE_LIMIT, Math.max(1, Math.floor(limit) || REPORT_PAGE_LIMIT));
  const reportsOnly = (record: CourseRecord) => ({ reports: record.reports });
  const config = getR2Config();
  if (!config) {
    const all = Object.values(readLocal(course));
    const start = after !== null && /^\d+$/.test(after) ? Number(after) : 0;
    const end = start + size;
    return {
      records: all.slice(start, end).map((raw) => reportsOnly(sanitizeRecord(raw, course))),
      next: end < all.length ? String(end) : null,
    };
  }
  const prefix = `private/learning/${course}/`;
  const page = await config.client.send(
    new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix, MaxKeys: size, ...(after && after.startsWith(prefix) ? { StartAfter: after } : {}) }),
  );
  const keys = (page.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key && key.endsWith(".json")));
  const records: Pick<CourseRecord, "reports">[] = [];
  for (let i = 0; i < keys.length; i += LIST_READS_AT_ONCE) {
    const batch = await Promise.all(
      keys.slice(i, i + LIST_READS_AT_ONCE).map(async (Key) => {
        try {
          const response = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key }));
          const raw = await response.Body?.transformToString();
          return raw ? reportsOnly(decrypt(raw, config.encryptionKey, course)) : null;
        } catch (error) {
          // one unreadable record does not hide the others' reports
          console.error(`Learning record unreadable (${course}):`, error);
          return null;
        }
      }),
    );
    for (const record of batch) if (record) records.push(record);
  }
  const last = page.Contents?.[page.Contents.length - 1]?.Key ?? null;
  return { records, next: page.IsTruncated && last ? last : null };
}

/**
 * Read → change → write, only when `change` says the record changed (a device sending what the server already has costs
 * no write). The write replaces only the version that was read; on a conflict (412) the record is read again and the
 * change made again on the newer one — a merge, so both devices' answers stay. A store that refuses the condition itself,
 * or a fourth conflict in a row, gets a plain write (passoffProgress.ts changeRecord — never worse than no condition).
 */
export async function changeLearningRecord(
  course: string,
  key: string,
  change: (record: CourseRecord) => { record: CourseRecord; changed: boolean },
): Promise<CourseRecord> {
  checkedCourse(course);
  return serialized(course, key, async () => {
    for (let attempt = 1; ; attempt++) {
      const { record: stored, etag } = await readStored(course, key);
      const { record, changed } = change(stored);
      if (!changed) return record;
      const config = getR2Config();
      if (!config) {
        writeLocal(course, key, record);
        return record;
      }
      if (attempt >= WRITE_ATTEMPTS) {
        await putRecord(config, course, key, record, {});
        return record;
      }
      try {
        await putRecord(config, course, key, record, etag ? { IfMatch: etag } : { IfNoneMatch: "*" });
        return record;
      } catch (error) {
        if (isConflict(error)) continue;
        await putRecord(config, course, key, record, {});
        return record;
      }
    }
  });
}
