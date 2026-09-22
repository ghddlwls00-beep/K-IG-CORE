import { getPlanLabel, normalizeLicenseKey, type LicensePlan } from "./license";

/**
 * ISS-14 — the admin licence list, built from the server records instead of the
 * issuing browser's localStorage. Pure functions so the list, sort and search can be
 * checked without a browser (docs/qa-2026-09-17/scripts/verify-admin-records.cjs).
 */

export interface AdminDeviceInfo {
  deviceId: string;
  deviceName: string;
  registeredAt: number;
  lastSeenAt: number;
}

export interface AdminLicenseRecord {
  key: string;
  plan: string;
  maxDevices?: number;
  devices: AdminDeviceInfo[];
  isRevoked?: boolean;
  revokedAt?: number;
  revokeReason?: string;
  firstActivatedAt?: number;
  createdAt?: number;
  memo?: string;
}

/** What the old admin page kept in localStorage `kig:admin:history`. */
export interface LegacyHistoryItem {
  key: string;
  plan?: string;
  createdAt?: string | number;
  memo?: string;
  maxDevices?: number;
}

export interface AdminLicenseRow {
  record: AdminLicenseRecord;
  createdAt?: number;
  memo: string;
  /** A memo that exists only in this browser's old history (not yet on the server). */
  legacyMemo: string;
  sortTime: number;
}

/**
 * The old history stored `new Date().toLocaleString("ko-KR")` from a Korean browser,
 * e.g. "2026. 9. 12. 오후 3:04:05". Returns epoch ms (Korea time), or undefined.
 */
export function parseKoreanDateTime(value: string | number | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const m = value.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(오전|오후)\s*)?(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return undefined;
  let hour = m[5] ? Number(m[5]) : 0;
  if (m[4] === "오후" && hour < 12) hour += 12;
  if (m[4] === "오전" && hour === 12) hour = 0;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour - 9, Number(m[6] || 0), Number(m[7] || 0));
  return Number.isFinite(ms) ? ms : undefined;
}

export function formatKoreanDateTime(ms: number | undefined): string {
  return typeof ms === "number" ? new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "";
}

export const compactLicenseKey = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function buildAdminLicenseRows(
  records: Record<string, AdminLicenseRecord>,
  legacyHistory: LegacyHistoryItem[],
): AdminLicenseRow[] {
  // SEC-KEY-01: the same spelling the records are filed under, so an old history
  // entry written with a stray space still finds its record.
  const legacyByKey = new Map<string, LegacyHistoryItem>();
  for (const item of legacyHistory) legacyByKey.set(normalizeLicenseKey(item.key), item);

  const rows = Object.values(records).map((record) => {
    const legacy = legacyByKey.get(normalizeLicenseKey(record.key));
    const createdAt = record.createdAt ?? parseKoreanDateTime(legacy?.createdAt);
    const devices = record.devices || [];
    return {
      record,
      createdAt,
      memo: record.memo ?? "",
      legacyMemo: !record.memo && legacy?.memo ? legacy.memo : "",
      sortTime:
        createdAt ??
        record.firstActivatedAt ??
        (devices.length ? Math.min(...devices.map((d) => d.registeredAt)) : 0),
    };
  });
  rows.sort((a, b) => b.sortTime - a.sortTime || a.record.key.localeCompare(b.record.key));
  return rows;
}

/** Code (with or without hyphens), memo, plan label, device name or block reason. */
export function filterAdminLicenseRows(rows: AdminLicenseRow[], query: string): AdminLicenseRow[] {
  const text = query.trim().toLowerCase();
  if (!text) return rows;
  const keyPart = compactLicenseKey(text);
  return rows.filter(({ record, memo, legacyMemo }) =>
    (keyPart.length > 0 && compactLicenseKey(record.key).includes(keyPart)) ||
    memo.toLowerCase().includes(text) ||
    legacyMemo.toLowerCase().includes(text) ||
    getPlanLabel(record.plan as LicensePlan).toLowerCase().includes(text) ||
    (record.devices || []).some((d) => (d.deviceName || "").toLowerCase().includes(text)) ||
    (record.revokeReason || "").toLowerCase().includes(text),
  );
}

/** Old-history entries that would add something the server record lacks. */
export function countLegacyToImport(
  records: Record<string, AdminLicenseRecord>,
  legacyHistory: LegacyHistoryItem[],
): number {
  return legacyHistory.filter((item) => {
    const record = records[normalizeLicenseKey(item.key)];
    return Boolean(record && ((item.memo && !record.memo) || (item.createdAt && !record.createdAt)));
  }).length;
}
