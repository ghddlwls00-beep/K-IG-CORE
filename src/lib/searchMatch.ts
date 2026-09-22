/**
 * The search dialog's matching, kept pure and import-free so an offline check
 * (`docs/qa-2026-09-18/scripts/check-search.cjs`) runs this exact code against
 * the built `public/search-index.json`.
 *
 * BUG-011: there is deliberately no English-word matching here. A VOCA lesson's
 * word list is paid content and may not be in the public index — see
 * `scripts/buildSearchIndex.ts`.
 */

export interface SearchableItem {
  searchText: string;
}

/**
 * FUN-09: a numeric token matches a lesson NUMBER, not a substring. "1강" used
 * to match 01강, 11강 and 21강 alike, because the index text contains all
 * three as substrings. A token that starts with digits is now matched at a
 * number boundary — "1강" is 01강 only; "150" is d150 but not d1500.
 */
export function tokenMatches(text: string, token: string): boolean {
  const numeric = token.match(/^(\d+)(\D*)$/);
  if (!numeric) return text.includes(token);
  const number = String(parseInt(numeric[1], 10));
  const suffix = numeric[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\D)0*${number}${suffix ? suffix : "(?!\\d)"}`);
  return pattern.test(text);
}

/** Every token must match the lesson's title, code or course text; at most `limit` results. */
export function searchItems<T extends SearchableItem>(items: T[], query: string, limit = 20): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 10);
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((item) => tokens.every((tok) => tokenMatches(item.searchText, tok))).slice(0, limit);
}
