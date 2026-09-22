import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { calculateExpiry } from "./serverLicense";
import { normalizeLicenseKey } from "./license";

export interface RegisteredDevice {
  deviceId: string;
  deviceName: string;
  registeredAt: number;
  lastSeenAt: number;
}

export interface LicenseDeviceRecord {
  key: string;
  plan: string;
  maxDevices?: number;
  devices: RegisteredDevice[];
  isRevoked?: boolean;
  revokedAt?: number;
  revokeReason?: string;
  /**
   * When this licence was first registered on any device. The paid period of a
   * 1M/1Y plan runs from here and does not restart (owner decision, 2026-09-17).
   */
  firstActivatedAt?: number;
  /**
   * ISS-14 / ADM-06 — when the code was issued and the admin's note for it. Kept in
   * this encrypted record so every admin browser sees the same list; they used to
   * live only in the issuing browser's localStorage. Records issued before this
   * field existed have neither until an admin saves them from that browser.
   */
  createdAt?: number;
  memo?: string;
}

export const MAX_DEVICES_PER_KEY = 2;
export const MAX_MEMO_LENGTH = 200;

/**
 * SEC-01 — when the paid period of a licence started.
 *
 * WHAT WAS WRONG. `/api/license/activate` computed the expiry from "now" on every
 * activation, and the record kept no start date. Re-entering a 1-month code on
 * the same device after it expired issued a fresh 30-day token, and a second
 * device registered later got its own later expiry — a fixed-term plan never
 * ended.
 *
 * Records written before `firstActivatedAt` existed fall back to the earliest
 * `registeredAt` of the devices still on the record: that is the oldest
 * registration the record can prove. A record whose devices were all removed
 * before this field existed has no proof left, so it returns null and the next
 * activation starts the period. Reset, revoke and unregister now write the start
 * date before removing devices, so that loss cannot happen again.
 */
export function licenseStartedAt(record: LicenseDeviceRecord | null | undefined): number | null {
  if (!record) return null;
  if (typeof record.firstActivatedAt === "number") return record.firstActivatedAt;
  const times = (record.devices || [])
    .map((device) => device.registeredAt)
    .filter((time): time is number => typeof time === "number" && Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : null;
}

/**
 * The expiry that applies to a session: the fixed period from the record when
 * the record knows its start, otherwise the token's own expiry. When both exist
 * the earlier one wins — a token issued by a re-activation before SEC-01 carries
 * a later date than the licence actually allows.
 */
export function effectiveLicenseExpiry(
  record: LicenseDeviceRecord | null | undefined,
  plan: string,
  tokenExpiresAt: number | null,
): number | null {
  const startedAt = licenseStartedAt(record);
  const fixed = startedAt === null ? null : calculateExpiry(plan, startedAt);
  if (fixed === null) return startedAt === null ? tokenExpiresAt : null;
  return tokenExpiresAt === null ? fixed : Math.min(fixed, tokenExpiresAt);
}

/**
 * SEC-KEY-01 — fold two records of the SAME code into one.
 *
 * Before the fix, "KIG-1Y-AAAA BBBB-CCCC" was filed separately from the code it
 * actually is, so a bucket can still hold a second record for a code already
 * sold. Now that both spell the same key, a plain `records[key] = record` would
 * let whichever loaded last hide the other — the devices on the hidden one would
 * vanish from the admin list while still being registered, and a refund block
 * written on one could be hidden by the other.
 *
 * So the rules are all "the safer of the two": every device is kept (the limit
 * applies to the NEXT registration, so nobody's paid device is evicted behind
 * their back), a revoke on either side survives, and the paid period keeps the
 * earliest start it can prove, so merging can never hand out a fresh period.
 */
export function mergeDeviceRecords(
  primary: LicenseDeviceRecord,
  other: LicenseDeviceRecord,
): LicenseDeviceRecord {
  const devices = new Map<string, RegisteredDevice>();
  for (const device of [...(primary.devices || []), ...(other.devices || [])]) {
    if (!device?.deviceId) continue;
    const existing = devices.get(device.deviceId);
    devices.set(
      device.deviceId,
      existing
        ? {
            ...existing,
            deviceName: existing.deviceName || device.deviceName,
            registeredAt: Math.min(existing.registeredAt, device.registeredAt),
            lastSeenAt: Math.max(existing.lastSeenAt, device.lastSeenAt),
          }
        : device,
    );
  }

  const earliest = (a?: number, b?: number): number | undefined => {
    const times = [a, b].filter((t): t is number => typeof t === "number" && Number.isFinite(t));
    return times.length ? Math.min(...times) : undefined;
  };
  const fewest = (a?: number, b?: number): number | undefined => {
    const limits = [a, b].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    return limits.length ? Math.min(...limits) : undefined;
  };
  const startedAt = earliest(
    licenseStartedAt(primary) ?? undefined,
    licenseStartedAt(other) ?? undefined,
  );
  const revoking = primary.isRevoked ? primary : other.isRevoked ? other : null;

  return {
    ...primary,
    key: normalizeKey(primary.key),
    plan: primary.plan || other.plan,
    // The LOWER limit wins, like every other rule here. Taking the first record's
    // made the result depend on the order R2 happens to list objects in, so the
    // same two records could merge to a limit of 1 or of 3 on different reads.
    maxDevices: fewest(primary.maxDevices, other.maxDevices),
    devices: [...devices.values()].sort((a, b) => a.registeredAt - b.registeredAt),
    isRevoked: Boolean(primary.isRevoked || other.isRevoked),
    revokedAt: revoking ? earliest(primary.revokedAt, other.revokedAt) : undefined,
    revokeReason: revoking?.revokeReason,
    firstActivatedAt: startedAt,
    createdAt: earliest(primary.createdAt, other.createdAt),
    memo: primary.memo || other.memo,
  };
}

function keepStartDate(record: LicenseDeviceRecord): void {
  const startedAt = licenseStartedAt(record);
  if (startedAt !== null) record.firstActivatedAt = startedAt;
}

function formatKoreanDate(ms: number): string {
  return new Date(ms).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}
const RECORD_PREFIX = "private/license-records/";
let cachedR2Client: S3Client | null = null;

interface R2Config {
  client: S3Client;
  bucket: string;
  encryptionKey: Buffer;
}

interface EncryptedRecordEnvelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_LICENSE_BUCKET?.trim();
  const storageSecret = process.env.LICENSE_STORAGE_SECRET?.trim();
  const values = [accountId, accessKeyId, secretAccessKey, bucket, storageSecret];

  if (values.every(Boolean)) {
    if (storageSecret!.length < 32) {
      throw new Error("LICENSE_STORAGE_SECRET must contain at least 32 characters.");
    }
    cachedR2Client ??= new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
    return {
      client: cachedR2Client,
      bucket: bucket!,
      encryptionKey: crypto.createHash("sha256").update(storageSecret!).digest(),
    };
  }

  if (values.some(Boolean) || process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "Durable license storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_LICENSE_BUCKET, and LICENSE_STORAGE_SECRET.",
    );
  }

  return null;
}

function encryptRecord(record: LicenseDeviceRecord, encryptionKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(record), "utf8"),
    cipher.final(),
  ]);
  const envelope: EncryptedRecordEnvelope = {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope);
}

function decryptRecord(raw: string, encryptionKey: Buffer): LicenseDeviceRecord {
  const envelope = JSON.parse(raw) as EncryptedRecordEnvelope;
  if (
    envelope.version !== 1 ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted license record.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as LicenseDeviceRecord;
}

/**
 * SEC-KEY-01 (BUG-002) — this used to be `key.trim().toUpperCase()`, which kept
 * inner spaces while `validateLicenseKey` removed them. Every function in this
 * module routes through here (objectKey, the record map, register, revoke, reset,
 * limit), so one spelling here is one spelling everywhere a record is filed,
 * found or compared.
 */
function normalizeKey(key: string): string {
  return normalizeLicenseKey(key);
}

function objectKey(key: string): string {
  const digest = crypto.createHash("sha256").update(normalizeKey(key)).digest("hex");
  return `${RECORD_PREFIX}${digest}.json`;
}

function getLocalStorageFilePath(): string {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "license-devices.json");
}

function loadLocalRecords(): Record<string, LicenseDeviceRecord> {
  const filePath = getLocalStorageFilePath();
  if (!fs.existsSync(filePath)) return {};
  const stored = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, LicenseDeviceRecord>;
  // SEC-KEY-01: same folding as the R2 path — a file written before the fix can
  // hold a spaced variant under its own entry.
  const records: Record<string, LicenseDeviceRecord> = {};
  for (const record of Object.values(stored)) {
    if (!record?.key) continue;
    const id = normalizeKey(record.key);
    const seen = records[id];
    records[id] = seen ? mergeDeviceRecords(seen, record) : record;
  }
  return records;
}

function saveLocalRecords(records: Record<string, LicenseDeviceRecord>): void {
  fs.writeFileSync(getLocalStorageFilePath(), JSON.stringify(records, null, 2), "utf-8");
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}

async function loadRemoteRecord(config: R2Config, key: string): Promise<LicenseDeviceRecord | null> {
  try {
    const response = await config.client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: objectKey(key) }),
    );
    const raw = await response.Body?.transformToString();
    return raw ? decryptRecord(raw, config.encryptionKey) : null;
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

async function saveRemoteRecord(config: R2Config, record: LicenseDeviceRecord): Promise<void> {
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey(record.key),
      Body: encryptRecord(record, config.encryptionKey),
      ContentType: "application/octet-stream",
      CacheControl: "no-store",
    }),
  );
}

async function loadRecord(key: string): Promise<LicenseDeviceRecord | null> {
  const normalizedKey = normalizeKey(key);
  const config = getR2Config();
  if (config) return loadRemoteRecord(config, normalizedKey);
  return loadLocalRecords()[normalizedKey] ?? null;
}

/** Read one license record without listing the entire private bucket. */
export async function getDeviceRecordForKey(
  key: string,
): Promise<LicenseDeviceRecord | null> {
  return loadRecord(key);
}

async function saveRecord(record: LicenseDeviceRecord): Promise<void> {
  const config = getR2Config();
  if (config) {
    await saveRemoteRecord(config, record);
    return;
  }
  const records = loadLocalRecords();
  records[normalizeKey(record.key)] = record;
  saveLocalRecords(records);
}

/**
 * ADM-07 — the admin "기기 현황 새로고침" lists every licence record, and it used
 * to download every one of them on every refresh, all at the same moment
 * (1,000 customers = 1,000 GETs fired together, again on the next refresh).
 *
 * The listing already carries each object's ETag, and every save re-encrypts the
 * record with a fresh IV, so a changed record always has a new ETag. A record
 * this server instance has already read under the same ETag is not downloaded
 * again, and the downloads that are needed run at most READ_CONCURRENCY at a
 * time. The cache keeps the ENCRYPTED text and decrypts on every call, so no two
 * callers ever share a record object; entries for objects no longer listed are
 * dropped. A cold instance simply starts empty and reads everything once.
 */
const READ_CONCURRENCY = 16;
const encryptedRecordCache = new Map<string, { etag: string; raw: string }>();

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function loadDeviceRecords(): Promise<Record<string, LicenseDeviceRecord>> {
  const config = getR2Config();
  if (!config) return loadLocalRecords();

  const records: Record<string, LicenseDeviceRecord> = {};
  const listed = new Set<string>();
  let continuationToken: string | undefined;
  do {
    const page = await config.client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: RECORD_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    const items = (page.Contents ?? []).filter((item) => item.Key?.endsWith(".json"));
    const pageRecords = await mapWithLimit(items, READ_CONCURRENCY, async (item) => {
      const name = item.Key!;
      listed.add(name);
      try {
        const cached = encryptedRecordCache.get(name);
        let raw = cached && item.ETag && cached.etag === item.ETag ? cached.raw : null;
        if (raw === null) {
          const response = await config.client.send(
            new GetObjectCommand({ Bucket: config.bucket, Key: name }),
          );
          raw = (await response.Body?.transformToString()) ?? "";
          const etag = response.ETag ?? item.ETag;
          if (raw && etag) encryptedRecordCache.set(name, { etag, raw });
        }
        return raw ? decryptRecord(raw, config.encryptionKey) : null;
      } catch (error) {
        console.error("Unable to read a license record from durable storage:", error);
        return null;
      }
    });
    for (const record of pageRecords) {
      if (!record?.key) continue;
      // SEC-KEY-01: a bucket written before the fix can hold a spaced variant of a
      // code that now spells the same. Fold it in rather than letting it overwrite.
      const id = normalizeKey(record.key);
      const seen = records[id];
      records[id] = seen ? mergeDeviceRecords(seen, record) : record;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  for (const name of encryptedRecordCache.keys()) {
    if (!listed.has(name)) encryptedRecordCache.delete(name);
  }
  return records;
}

export async function setMaxDevicesForKey(
  key: string,
  maxDevices: number,
  plan?: string,
): Promise<{ success: boolean; record: LicenseDeviceRecord }> {
  const normalizedKey = normalizeKey(key);
  const record: LicenseDeviceRecord = (await loadRecord(normalizedKey)) || {
    key: normalizedKey,
    plan: plan || "1Y",
    maxDevices,
    devices: [],
  };
  record.maxDevices = Math.max(1, maxDevices);
  await saveRecord(record);
  return { success: true, record };
}

function cleanMemo(memo: unknown): string | undefined {
  if (typeof memo !== "string") return undefined;
  const text = memo.replace(/\s+/g, " ").trim().slice(0, MAX_MEMO_LENGTH);
  return text || undefined;
}

/** A freshly issued code: device limit, plan, issue time and the admin's note. */
export async function createIssuedLicenseRecord(
  key: string,
  plan: string,
  maxDevices: number,
  memo?: string,
  createdAt = Date.now(),
): Promise<LicenseDeviceRecord> {
  const normalizedKey = normalizeKey(key);
  const record: LicenseDeviceRecord = (await loadRecord(normalizedKey)) || {
    key: normalizedKey,
    plan,
    devices: [],
  };
  record.maxDevices = Math.max(1, maxDevices);
  record.createdAt ??= createdAt;
  const note = cleanMemo(memo);
  if (note !== undefined) record.memo = note;
  await saveRecord(record);
  return record;
}

/**
 * Admin note and issue time for a code that ALREADY has a record — never creates one,
 * so an arbitrary string cannot plant a record. `fillMissingOnly` is for carrying the
 * old browser-only history over: it never overwrites what the server already has.
 */
export async function updateLicenseRecordMeta(
  key: string,
  meta: { memo?: string; createdAt?: number },
  fillMissingOnly: boolean,
): Promise<{ success: boolean; changed: boolean; record?: LicenseDeviceRecord }> {
  const record = await loadRecord(key);
  if (!record) return { success: false, changed: false };
  let changed = false;
  if (meta.memo !== undefined) {
    const note = cleanMemo(meta.memo);
    if (!(fillMissingOnly && record.memo) && note !== record.memo) {
      record.memo = note;
      changed = true;
    }
  }
  if (
    typeof meta.createdAt === "number" &&
    Number.isFinite(meta.createdAt) &&
    meta.createdAt > Date.UTC(2020, 0, 1) &&
    meta.createdAt <= Date.now() &&
    !(fillMissingOnly && record.createdAt) &&
    meta.createdAt !== record.createdAt
  ) {
    record.createdAt = meta.createdAt;
    changed = true;
  }
  if (changed) await saveRecord(record);
  return { success: true, changed, record };
}

export async function registerDeviceForKey(
  key: string,
  plan: string,
  deviceId: string,
  deviceName: string,
): Promise<{
  success: boolean;
  error?: string;
  devices: RegisteredDevice[];
  maxDevices: number;
  /** Start of the paid period (first registration). Absent only for a revoked key. */
  firstActivatedAt?: number;
  /** Fixed end of the paid period, null for lifetime plans. */
  expiresAt?: number | null;
  expired?: boolean;
}> {
  const normalizedKey = normalizeKey(key);
  const record: LicenseDeviceRecord = (await loadRecord(normalizedKey)) || {
    key: normalizedKey,
    plan,
    maxDevices: MAX_DEVICES_PER_KEY,
    devices: [],
  };
  const effectiveMaxDevices = record.maxDevices || MAX_DEVICES_PER_KEY;

  if (record.isRevoked) {
    return {
      success: false,
      error: `환불 처리되어 사용이 영구 중지된 이용권입니다. (${record.revokeReason || "환불 처리"})`,
      devices: [],
      maxDevices: effectiveMaxDevices,
    };
  }

  const now = Date.now();
  // SEC-01: the period starts at the first registration and never restarts.
  const firstActivatedAt = licenseStartedAt(record) ?? now;
  const expiresAt = calculateExpiry(plan, firstActivatedAt);
  if (expiresAt !== null && expiresAt <= now) {
    return {
      success: false,
      error: `이용 기간이 끝난 이용권입니다. (첫 등록 ${formatKoreanDate(firstActivatedAt)} · 만료 ${formatKoreanDate(expiresAt)})`,
      devices: record.devices,
      maxDevices: effectiveMaxDevices,
      firstActivatedAt,
      expiresAt,
      expired: true,
    };
  }
  record.firstActivatedAt = firstActivatedAt;

  const existing = record.devices.find((device) => device.deviceId === deviceId);
  if (existing) {
    existing.lastSeenAt = now;
    if (deviceName) existing.deviceName = deviceName;
    await saveRecord(record);
    return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices, firstActivatedAt, expiresAt };
  }

  if (record.devices.length >= effectiveMaxDevices) {
    return {
      success: false,
      error: `이용권 등록 가능한 최대 기기 수(${effectiveMaxDevices}대)를 초과하였습니다. 기존 기기에서 등록을 해제하신 후 다시 시도해 주세요.`,
      devices: record.devices,
      maxDevices: effectiveMaxDevices,
      firstActivatedAt,
      expiresAt,
    };
  }

  record.devices.push({
    deviceId,
    deviceName: deviceName || "알 수 없는 기기",
    registeredAt: now,
    lastSeenAt: now,
  });
  await saveRecord(record);
  return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices, firstActivatedAt, expiresAt };
}

export async function unregisterDeviceFromKey(
  key: string,
  deviceId: string,
): Promise<{ success: boolean; devices: RegisteredDevice[]; maxDevices: number }> {
  const record = await loadRecord(key);
  if (!record) return { success: true, devices: [], maxDevices: MAX_DEVICES_PER_KEY };
  keepStartDate(record);
  record.devices = record.devices.filter((device) => device.deviceId !== deviceId);
  await saveRecord(record);
  return {
    success: true,
    devices: record.devices,
    maxDevices: record.maxDevices || MAX_DEVICES_PER_KEY,
  };
}

export async function resetAllDevicesForKey(key: string): Promise<{ success: boolean }> {
  const record = await loadRecord(key);
  if (record) {
    keepStartDate(record);
    record.devices = [];
    await saveRecord(record);
  }
  return { success: true };
}

export async function revokeLicenseKey(
  key: string,
  reason = "환불 처리 / 관리자 차단",
): Promise<{ success: boolean; record: LicenseDeviceRecord }> {
  const normalizedKey = normalizeKey(key);
  const record: LicenseDeviceRecord = (await loadRecord(normalizedKey)) || {
    key: normalizedKey,
    plan: "1Y",
    maxDevices: MAX_DEVICES_PER_KEY,
    devices: [],
  };
  record.isRevoked = true;
  record.revokedAt = Date.now();
  record.revokeReason = reason;
  keepStartDate(record);
  record.devices = [];
  await saveRecord(record);
  return { success: true, record };
}

export async function unrevokeLicenseKey(
  key: string,
): Promise<{ success: boolean; record?: LicenseDeviceRecord }> {
  const record = await loadRecord(key);
  if (!record) return { success: false };
  record.isRevoked = false;
  record.revokedAt = undefined;
  record.revokeReason = undefined;
  await saveRecord(record);
  return { success: true, record };
}

export async function isLicenseRevoked(key: string): Promise<boolean> {
  return Boolean((await loadRecord(key))?.isRevoked);
}

export interface WhitespaceKeyMigrationEntry {
  /** the code exactly as the stale record spelled it, with the middle masked */
  staleKeyMasked: string;
  canonicalKeyMasked: string;
  devicesBefore: { canonical: number; stale: number };
  devicesAfter: number;
  maxDevices: number;
  /** true when the merged record now holds more devices than the licence allows */
  overLimit: boolean;
  revokedBefore: { canonical: boolean; stale: boolean };
  revokedAfter: boolean;
}

/** Never print a whole licence code in a log: it is the credential itself. */
function maskKey(key: string): string {
  const parts = normalizeKey(key).split("-");
  if (parts.length !== 4) return `${key.slice(0, 6)}…`;
  const short = (part: string) => (part.length > 4 ? `${part.slice(0, 3)}…${part.slice(-2)}` : part);
  return `${parts[0]}-${parts[1]}-${short(parts[2])}-${short(parts[3])}`;
}

/**
 * SEC-KEY-01 one-off cleanup — fold every record that was filed under a spaced
 * variant into the record for the code it really is, and remove the stale object.
 *
 * Reading already merges (see `loadDeviceRecords`), so this is not what makes the
 * data correct; it is what stops a stale object from resurrecting devices after
 * an admin clears them, and what makes the bucket say the same thing the app does.
 *
 * DEFAULTS TO A DRY RUN. `apply: true` writes and deletes. A code with nothing to
 * strip keeps the same object name, so a healthy bucket reports zero entries and
 * nothing is touched.
 */
export async function migrateWhitespaceKeyRecords(
  options: { apply?: boolean } = {},
): Promise<{ scanned: number; applied: boolean; entries: WhitespaceKeyMigrationEntry[] }> {
  const apply = options.apply === true;
  const config = getR2Config();
  const entries: WhitespaceKeyMigrationEntry[] = [];

  /** [objectName | map key, record] for every record as it is actually stored */
  const stored: { name: string; record: LicenseDeviceRecord }[] = [];
  if (config) {
    let continuationToken: string | undefined;
    do {
      const page = await config.client.send(
        new ListObjectsV2Command({ Bucket: config.bucket, Prefix: RECORD_PREFIX, ContinuationToken: continuationToken }),
      );
      for (const item of page.Contents ?? []) {
        if (!item.Key?.endsWith(".json")) continue;
        const response = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: item.Key }));
        const raw = await response.Body?.transformToString();
        if (raw) stored.push({ name: item.Key, record: decryptRecord(raw, config.encryptionKey) });
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  } else {
    const filePath = getLocalStorageFilePath();
    const raw = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, LicenseDeviceRecord>)
      : {};
    for (const [name, record] of Object.entries(raw)) stored.push({ name, record });
  }

  const stale = stored.filter(({ record }) => record?.key && normalizeKey(record.key) !== record.key);
  const byCanonical = new Map<string, LicenseDeviceRecord>();
  for (const { record } of stored) {
    if (!record?.key) continue;
    const id = normalizeKey(record.key);
    if (normalizeKey(record.key) === record.key) byCanonical.set(id, record);
  }

  for (const { name, record } of stale) {
    const id = normalizeKey(record.key);
    const canonical = byCanonical.get(id) ?? null;
    const merged = canonical ? mergeDeviceRecords(canonical, record) : mergeDeviceRecords({ ...record, key: id }, record);
    const maxDevices = merged.maxDevices ?? MAX_DEVICES_PER_KEY;
    entries.push({
      staleKeyMasked: maskKey(record.key),
      canonicalKeyMasked: maskKey(id),
      devicesBefore: { canonical: canonical?.devices?.length ?? 0, stale: record.devices?.length ?? 0 },
      devicesAfter: merged.devices.length,
      maxDevices,
      overLimit: merged.devices.length > maxDevices,
      revokedBefore: { canonical: Boolean(canonical?.isRevoked), stale: Boolean(record.isRevoked) },
      revokedAfter: Boolean(merged.isRevoked),
    });

    if (!apply) continue;
    await saveRecord(merged);
    byCanonical.set(id, merged);
    if (config) {
      await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: name }));
      encryptedRecordCache.delete(name);
    } else {
      const filePath = getLocalStorageFilePath();
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, LicenseDeviceRecord>;
      delete raw[name];
      raw[id] = merged;
      saveLocalRecords(raw);
    }
  }

  return { scanned: stored.length, applied: apply, entries };
}
