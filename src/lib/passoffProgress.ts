import "server-only";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getCourseGroups, getCourseIndex } from "@/lib/content";
import { normalizeLicenseKey } from "@/lib/license";
import {
  applyPassoffUpdates,
  emptyPassoffRecord,
  isPassoffLessonOpen,
  judgePassoffTopics,
  passoffSnapshot,
  passoffTopicOf,
  passoffTopicsFromGroups,
  PASSOFF_UNLOCK_RULE,
  raisePassoffUnlock,
  recalculatePassoffUnlock,
  sanitizePassoffRecord,
  type PassoffProgressRecord,
  type PassoffProgressSnapshot,
  type PassoffTopic,
  type PassoffUpdate,
} from "@/lib/passoffUnlock";

/**
 * PASS-OFF GRAMMAR progress on the server — the record behind the topic order lock (docs/pass-off-grammar/설계.md §5).
 *
 * Kept the way STUDENT's is (src/lib/studentProgress.ts — not touched, and not shared: its ids and chapter count are
 * STUDENT's own): one private R2 object per licence code, private/progress/passoff-grammar/<sha256(code)>.json in
 * R2_LICENSE_BUCKET, AES-256-GCM under a key from LICENSE_STORAGE_SECRET, writes one at a time per code. On a machine
 * with no R2 settings at all — never on Vercel or in production — it is data/passoff-progress.json instead, the
 * local stand-in STUDENT has in data/student-progress.json.
 *
 * One thing STUDENT's does not do: a change is written only over the version it was read from (R2's ETag — see
 * changeRecord), so two server instances changing the same code's record at the same moment do not lose one change.
 *
 * The rules themselves (what opens a topic, which records are taken) are pure functions in src/lib/passoffUnlock.ts,
 * tested alone by docs/pass-off-grammar/검사/check-unlock.cjs; this file stores and reads
 * (docs/pass-off-grammar/검사/check-progress-api.cjs · check-progress-r2.cjs).
 */

const COURSE = "passoff-grammar";
const PROGRESS_PREFIX = "private/progress/passoff-grammar/";

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
    throw new Error("Durable PASS-OFF GRAMMAR progress storage is not configured.");
  }
  return null;
}

function encrypt(record: PassoffProgressRecord, key: Buffer): string {
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

function decrypt(raw: string, key: Buffer): PassoffProgressRecord {
  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted PASS-OFF GRAMMAR progress record.");
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
  return sanitizePassoffRecord(JSON.parse(plaintext), Date.now());
}

function localFilePath(): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "passoff-progress.json");
}

function readLocal(): Record<string, unknown> {
  const file = localFilePath();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** A record and the version it was read at: R2's ETag — null when there is no object yet, and for the local file. */
interface StoredRecord {
  record: PassoffProgressRecord;
  etag: string | null;
}

type StoreError = { name?: string; $metadata?: { httpStatusCode?: number } } | null | undefined;
const isMissing = (error: unknown) =>
  (error as StoreError)?.name === "NoSuchKey" || (error as StoreError)?.$metadata?.httpStatusCode === 404;
/** R2 turned a conditional write down (412): another server instance wrote the record after this one read it. */
const isConflict = (error: unknown) =>
  (error as StoreError)?.name === "PreconditionFailed" || (error as StoreError)?.$metadata?.httpStatusCode === 412;

async function readStored(key: string): Promise<StoredRecord> {
  const config = getR2Config();
  if (!config) return { record: sanitizePassoffRecord(readLocal()[normalizeKey(key)], Date.now()), etag: null };
  try {
    const response = await config.client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: progressObjectKey(key) }),
    );
    const raw = await response.Body?.transformToString();
    return {
      record: raw ? decrypt(raw, config.encryptionKey) : emptyPassoffRecord(Date.now()),
      etag: response.ETag ?? null,
    };
  } catch (error) {
    if (isMissing(error)) return { record: emptyPassoffRecord(Date.now()), etag: null };
    throw error;
  }
}

async function readRecord(key: string): Promise<PassoffProgressRecord> {
  return (await readStored(key)).record;
}

function writeLocal(key: string, record: PassoffProgressRecord): void {
  const all = readLocal();
  all[normalizeKey(key)] = record;
  fs.writeFileSync(localFilePath(), JSON.stringify(all, null, 2), "utf8");
}

/** `condition` — write only over the version read (IfMatch), or only where no object is yet (IfNoneMatch "*"). */
async function putRecord(
  config: R2Config,
  key: string,
  record: PassoffProgressRecord,
  condition: { IfMatch?: string; IfNoneMatch?: string },
): Promise<void> {
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: progressObjectKey(key),
      Body: encrypt(record, config.encryptionKey),
      ContentType: "application/octet-stream",
      CacheControl: "no-store",
      ...condition,
    }),
  );
}

/** One change at a time per code — a read, the change and its write never interleave with another's. */
async function serialized<T>(key: string, run: () => Promise<T>): Promise<T> {
  const normalized = normalizeKey(key);
  const previous = writeQueues.get(normalized) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  writeQueues.set(normalized, next);
  try {
    return await next;
  } finally {
    if (writeQueues.get(normalized) === next) writeQueues.delete(normalized);
  }
}

/** conditional writes tried before the one plain write that ends a run of conflicts */
const WRITE_ATTEMPTS = 4;

/**
 * Read → change → write. `serialized` orders one server instance's requests for a code, but Vercel runs several
 * instances: two devices finishing different lessons at the same moment could each read the record, and the later
 * write would drop the earlier one's lesson (코드 단계 C 점검 1 — one way the list's ✓ and the lock came apart). So
 * the write replaces only the version that was read (If-Match its ETag; If-None-Match "*" for a first write); when
 * R2 answers 412 the record is read again and the change made again on the newer one
 * (docs/pass-off-grammar/검사/check-progress-r2.cjs, with a stand-in for R2).
 *
 * Never worse than the plain write this code made before: a store that refuses the condition itself, or a fourth
 * conflict in a row, gets that plain write. `change` says whether it changed anything — nothing is written when it
 * did not (finishing a lesson twice costs no write).
 */
async function changeRecord(
  key: string,
  change: (record: PassoffProgressRecord, now: number) => boolean,
): Promise<PassoffProgressRecord> {
  return serialized(key, async () => {
    for (let attempt = 1; ; attempt++) {
      const { record, etag } = await readStored(key);
      if (!change(record, Date.now())) return record;
      const config = getR2Config();
      if (!config) {
        writeLocal(key, record);
        return record;
      }
      if (attempt >= WRITE_ATTEMPTS) {
        await putRecord(config, key, record, {});
        return record;
      }
      try {
        await putRecord(config, key, record, etag ? { IfMatch: etag } : { IfNoneMatch: "*" });
        return record;
      } catch (error) {
        if (isConflict(error)) continue;
        // not a conflict — the condition itself refused, or a passing fault: the plain write (a real fault fails
        // it too, and the browser keeps the completion and sends it again)
        await putRecord(config, key, record, {});
        return record;
      }
    }
  });
}

/** The course's topics as the course index lists them now. */
export function passoffTopics(): PassoffTopic[] {
  return passoffTopicsFromGroups(getCourseGroups(COURSE));
}

/** A licence's record, its `unlockedThrough` raised to what it has earned (a read never writes). */
export async function getPassoffProgress(key: string): Promise<PassoffProgressRecord> {
  const record = await readRecord(key);
  recalculatePassoffUnlock(record, passoffTopics());
  return record;
}

export interface PassoffProgressWriteOptions {
  /** a LIFE pass — the lesson route opens every topic, so a record anywhere is a real one (STUDENT's BUG-030) */
  everyTopicOpen?: boolean;
}

/**
 * Takes a browser's completions (and, from the engine, map refills) — only for topics open when the request came
 * in (src/lib/passoffUnlock.ts applyPassoffUpdates). Writes only when something changed: finishing a lesson twice,
 * or sending the same queue again after a lost answer, costs no R2 write.
 */
export async function updatePassoffProgress(
  key: string,
  updates: readonly PassoffUpdate[],
  { everyTopicOpen = false }: PassoffProgressWriteOptions = {},
): Promise<PassoffProgressRecord> {
  const topics = passoffTopics();
  return changeRecord(key, (record, now) => applyPassoffUpdates(record, updates, topics, { now, everyTopicOpen }).changed);
}

/**
 * The owner opens this licence's topics up to `topic` by hand (/admin/license '수동 해금' — STUDENT's setChapter, for
 * giving back what a learner lost). Only upward and only to a listed topic (passoffUnlock.ts raisePassoffUnlock).
 */
export async function setPassoffTopic(key: string, topic: number): Promise<PassoffProgressRecord> {
  const topics = passoffTopics();
  return changeRecord(key, (record, now) => raisePassoffUnlock(record, topic, topics, now));
}

/** The topic-end "구성도 다시 채우기" done — for the common learning engine (단계 2-나), which will call this. */
export async function recordPassoffMapRefill(
  key: string,
  topic: number,
  options: PassoffProgressWriteOptions = {},
): Promise<PassoffProgressRecord> {
  return updatePassoffProgress(key, [{ mapRefillTopic: topic }], options);
}

/** The owner's reset — back to TOPIC 1 with nothing finished, over whatever is stored (a plain write). */
export async function resetPassoffProgress(key: string): Promise<PassoffProgressRecord> {
  return serialized(key, async () => {
    const record = emptyPassoffRecord(Date.now());
    const config = getR2Config();
    if (config) await putRecord(config, key, record, {});
    else writeLocal(key, record);
    return record;
  });
}

export function passoffProgressSnapshot(
  record: PassoffProgressRecord,
  { everyTopicOpen = false }: PassoffProgressWriteOptions = {},
): PassoffProgressSnapshot {
  return passoffSnapshot(record, passoffTopics(), { everyTopicOpen });
}

export function isPassoffLessonUnlocked(
  lessonId: string,
  record: PassoffProgressRecord,
  { everyTopicOpen = false }: PassoffProgressWriteOptions = {},
): boolean {
  return isPassoffLessonOpen(lessonId, record, passoffTopics(), { everyTopicOpen });
}

/** What the lock screen of a locked lesson says: its topic, and the conditions of the topic the learner is on. */
export interface PassoffLockInfo {
  topic: number;
  /** the topic that has to be finished to open this one */
  previousTopic: number | null;
  /** the topic the learner is on now — the first one still to finish */
  current: {
    topic: number;
    label: string;
    /** its lessons in order, and whether the SERVER counts each as finished (the last one is the topic's last) */
    lessons: { id: string; title: string; completed: boolean }[];
    requiredCount: number;
    mapRefillRequired: boolean;
    mapRefilled: boolean;
    /** its section on the course list (id="section-<n>") */
    sectionIndex: number;
  } | null;
}

export function passoffLockInfo(lessonId: string, record: PassoffProgressRecord): PassoffLockInfo {
  const topics = passoffTopics();
  const topic = passoffTopicOf(lessonId) ?? 1;
  const judged = judgePassoffTopics(record, topics);
  const position = topics.findIndex((t) => t.topic === topic);
  const previousTopic = position > 0 ? topics[position - 1].topic : null;
  // the last open topic is the one to finish now (earlier open topics are finished or optional)
  const currentIndex = judged.topics.reduce((last, t, i) => (t.unlocked ? i : last), -1);
  const current = currentIndex >= 0 ? judged.topics[currentIndex] : null;
  const titles = new Map((getCourseIndex(COURSE)?.lessons ?? []).map((l) => [l.id, l.title]));
  return {
    topic,
    previousTopic,
    current: current
      ? {
          topic: current.topic,
          label: current.label,
          lessons: current.lessonIds.map((id) => ({
            id,
            title: titles.get(id) || id,
            completed: record.lessons[id]?.completed === true,
          })),
          requiredCount: current.requiredCount,
          mapRefillRequired: PASSOFF_UNLOCK_RULE.requireMapRefill,
          mapRefilled: current.mapRefilled,
          sectionIndex: currentIndex,
        }
      : null,
  };
}
