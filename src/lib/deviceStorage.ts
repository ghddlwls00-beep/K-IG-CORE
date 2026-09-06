import fs from "fs";
import path from "path";

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

function getStorageFilePath(): string {
  const primaryDir = path.join(process.cwd(), "data");
  const primaryFile = path.join(primaryDir, "license-devices.json");

  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    // Test write permission
    fs.writeFileSync(primaryFile + ".test", "");
    fs.unlinkSync(primaryFile + ".test");
    return primaryFile;
  } catch {
    // Fallback to /tmp in read-only serverless environments
    const fallbackDir = "/tmp";
    return path.join(fallbackDir, "license-devices.json");
  }
}

export function loadDeviceRecords(): Record<string, LicenseDeviceRecord> {
  const filePath = getStorageFilePath();
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, LicenseDeviceRecord>;
  } catch (err) {
    console.error("Error reading device records:", err);
    return {};
  }
}

export function saveDeviceRecords(records: Record<string, LicenseDeviceRecord>): void {
  const filePath = getStorageFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving device records:", err);
  }
}

/**
 * Configure the maximum allowed devices for a key.
 */
export function setMaxDevicesForKey(
  key: string,
  maxDevices: number,
  plan?: string,
): { success: boolean; record: LicenseDeviceRecord } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  const record: LicenseDeviceRecord = records[normalizedKey] || {
    key: normalizedKey,
    plan: plan || "1Y",
    maxDevices,
    devices: [],
  };

  record.maxDevices = Math.max(1, maxDevices);
  records[normalizedKey] = record;
  saveDeviceRecords(records);
  return { success: true, record };
}

/**
 * Attempt to register a device for a key.
 * If the device is already registered, updates lastSeenAt and succeeds.
 * If new device and count < maxDevices, adds it and succeeds.
 * If new device and count >= maxDevices, rejects with a helpful message.
 */
export function registerDeviceForKey(
  key: string,
  plan: string,
  deviceId: string,
  deviceName: string,
): { success: boolean; error?: string; devices: RegisteredDevice[]; maxDevices: number } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();

  const record: LicenseDeviceRecord = records[normalizedKey] || {
    key: normalizedKey,
    plan,
    maxDevices: MAX_DEVICES_PER_KEY,
    devices: [],
  };

  const effectiveMaxDevices = record.maxDevices || MAX_DEVICES_PER_KEY;

  // 0. Check if revoked
  if (record.isRevoked) {
    return {
      success: false,
      error: `환불 처리되어 사용이 영구 중지된 이용권입니다. (${record.revokeReason || "환불 처리"})`,
      devices: [],
      maxDevices: effectiveMaxDevices,
    };
  }
  const now = Date.now();
  const existingIdx = record.devices.findIndex((d) => d.deviceId === deviceId);

  if (existingIdx !== -1) {
    // Already registered device: update last seen and device name if changed
    record.devices[existingIdx].lastSeenAt = now;
    if (deviceName) record.devices[existingIdx].deviceName = deviceName;
    records[normalizedKey] = record;
    saveDeviceRecords(records);
    return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices };
  }

  // New device: check limit
  if (record.devices.length >= effectiveMaxDevices) {
    return {
      success: false,
      error: `이용권 등록 가능한 최대 기기 수(${effectiveMaxDevices}대)를 초과하였습니다. 기존 기기에서 등록을 해제하신 후 다시 시도해 주세요.`,
      devices: record.devices,
      maxDevices: effectiveMaxDevices,
    };
  }

  // Add new device
  const newDevice: RegisteredDevice = {
    deviceId,
    deviceName: deviceName || "알 수 없는 기기",
    registeredAt: now,
    lastSeenAt: now,
  };

  record.devices.push(newDevice);
  records[normalizedKey] = record;
  saveDeviceRecords(records);

  return { success: true, devices: record.devices, maxDevices: effectiveMaxDevices };
}

/**
 * Deactivate / Unlink a device from a license key.
 */
export function unregisterDeviceFromKey(
  key: string,
  deviceId: string,
): { success: boolean; devices: RegisteredDevice[] } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  const record = records[normalizedKey];

  if (!record) {
    return { success: true, devices: [] };
  }

  record.devices = record.devices.filter((d) => d.deviceId !== deviceId);
  records[normalizedKey] = record;
  saveDeviceRecords(records);

  return { success: true, devices: record.devices };
}

/**
 * Admin reset: clear all registered devices for a key.
 */
export function resetAllDevicesForKey(key: string): { success: boolean } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  if (records[normalizedKey]) {
    records[normalizedKey].devices = [];
    saveDeviceRecords(records);
  }
  return { success: true };
}

/**
 * Admin revoke / block: instantly blacklist a key (e.g. customer refund).
 * Clears all registered devices and marks as isRevoked.
 */
export function revokeLicenseKey(
  key: string,
  reason = "환불 처리 / 관리자 차단",
): { success: boolean; record: LicenseDeviceRecord } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  const record: LicenseDeviceRecord = records[normalizedKey] || {
    key: normalizedKey,
    plan: "1Y",
    maxDevices: MAX_DEVICES_PER_KEY,
    devices: [],
  };

  record.isRevoked = true;
  record.revokedAt = Date.now();
  record.revokeReason = reason;
  record.devices = []; // disconnect all devices immediately

  records[normalizedKey] = record;
  saveDeviceRecords(records);
  return { success: true, record };
}

/**
 * Admin unrevoke / restore: remove from blacklist.
 */
export function unrevokeLicenseKey(
  key: string,
): { success: boolean; record?: LicenseDeviceRecord } {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  const record = records[normalizedKey];
  if (!record) return { success: false };

  record.isRevoked = false;
  record.revokedAt = undefined;
  record.revokeReason = undefined;

  records[normalizedKey] = record;
  saveDeviceRecords(records);
  return { success: true, record };
}

/**
 * Check if a license key is revoked.
 */
export function isLicenseRevoked(key: string): boolean {
  const normalizedKey = key.trim().toUpperCase();
  const records = loadDeviceRecords();
  return Boolean(records[normalizedKey]?.isRevoked);
}

