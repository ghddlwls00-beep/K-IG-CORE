import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
}

export const MAX_DEVICES_PER_KEY = 2;
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

function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
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
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, LicenseDeviceRecord>;
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

export async function loadDeviceRecords(): Promise<Record<string, LicenseDeviceRecord>> {
  const config = getR2Config();
  if (!config) return loadLocalRecords();

  const records: Record<string, LicenseDeviceRecord> = {};
  let continuationToken: string | undefined;
  do {
    const page = await config.client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: RECORD_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    const pageRecords = await Promise.all(
      (page.Contents ?? [])
        .filter((item) => item.Key?.endsWith(".json"))
        .map(async (item) => {
          try {
            const response = await config.client.send(
              new GetObjectCommand({ Bucket: config.bucket, Key: item.Key! }),
            );
            const raw = await response.Body?.transformToString();
            return raw ? decryptRecord(raw, config.encryptionKey) : null;
          } catch (error) {
            console.error("Unable to read a license record from durable storage:", error);
            return null;
          }
        }),
    );
    for (const record of pageRecords) {
      if (record?.key) records[normalizeKey(record.key)] = record;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

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

export async function registerDeviceForKey(
  key: string,
  plan: string,
  deviceId: string,
  deviceName: string,
): Promise<{ success: boolean; error?: string; devices: RegisteredDevice[]; maxDevices: number }> {
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
  const existing = record.devices.find((device) => device.deviceId === deviceId);
  if (existing) {
    existing.lastSeenAt = now;
    if (deviceName) existing.deviceName = deviceName;
    await saveRecord(record);
    return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices };
  }

  if (record.devices.length >= effectiveMaxDevices) {
    return {
      success: false,
      error: `이용권 등록 가능한 최대 기기 수(${effectiveMaxDevices}대)를 초과하였습니다. 기존 기기에서 등록을 해제하신 후 다시 시도해 주세요.`,
      devices: record.devices,
      maxDevices: effectiveMaxDevices,
    };
  }

  record.devices.push({
    deviceId,
    deviceName: deviceName || "알 수 없는 기기",
    registeredAt: now,
    lastSeenAt: now,
  });
  await saveRecord(record);
  return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices };
}

export async function unregisterDeviceFromKey(
  key: string,
  deviceId: string,
): Promise<{ success: boolean; devices: RegisteredDevice[]; maxDevices: number }> {
  const record = await loadRecord(key);
  if (!record) return { success: true, devices: [], maxDevices: MAX_DEVICES_PER_KEY };
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
