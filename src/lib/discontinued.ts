/**
 * Courses that are no longer offered but whose pages are left working exactly as
 * they are — the owner's rule is "CNN · GVA 는 폐지된 과정이다. 과정 자체는 손대지
 * 마라". Only what ADVERTISES the catalogue leaves them out: the sitemap
 * (BUG-016, `src/app/sitemap.ts`) and its probe
 * (`docs/qa-2026-09-15/scripts/verify/verify-sitemap.cjs`) both read this one
 * list, so the two cannot drift apart.
 *
 * Import-free on purpose: the probe loads it with a plain transpile.
 */
export const DISCONTINUED_COURSES: ReadonlySet<string> = new Set(["cnn"]);
