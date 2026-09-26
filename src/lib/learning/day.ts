import type { Day } from "./types";

const DAY_MS = 86_400_000;

/**
 * Korea keeps UTC+9 all year, and a learning day turns at 04:00 there — a learner who studies
 * past midnight is still on the same day. 04:00 KST is 19:00 UTC, so shifting by 9 − 4 hours and
 * reading the UTC date gives the learning day.
 */
const SHIFT_MS = (9 - 4) * 3_600_000;

export function learningDay(ms: number): Day {
  return new Date(ms + SHIFT_MS).toISOString().slice(0, 10);
}

export function addDays(day: Day, days: number): Day {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** whole days from `from` to `to` (negative when `to` is earlier) */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function isDay(value: unknown): value is Day {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  // "2026-02-30" parses in some engines by rolling over; the round trip rejects it
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
