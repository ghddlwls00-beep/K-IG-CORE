import type { Block } from "./types";

/**
 * PASS-OFF GRAMMAR — ONLY WHAT THE VIEW DRAWS goes into a lesson page (설계 §7).
 *
 * Whatever the page hands PassoffLearningView is serialised into the HTML (the RSC payload), so a whole
 * lesson would send the source table and the record-only notes to every phone. The five steps draw the
 * four blocks (anchors · rule · drill · frame); inside them these fields stay on the server:
 *   - the source table's `bookRef` · `fix` · `source` · `koSource` · `note` (데이터-형식 v1.3 "화면에 안 나오는
 *     기록용"), `challengeNote`, and `paidStudent` (the server already decided what a free page gets);
 *   - `tags` · `challengeTags` — the lesson screen marks a challenge sentence with `challenge` only; the tags
 *     are for mixing and passing across days (the common engine's review, not this page);
 *   - form items marked `reserve` (beyond the lesson's 4~6 — kept for the cross-day review).
 * The ④ answers (`en` · `accept` · `targets` · `errorPatterns`) do go: the grader runs on the phone (설계 §8 —
 * no server grading), and the view shows none of them before an attempt.
 *
 * Import-free apart from a type, so docs/pass-off-grammar/검사/check-grading.cjs grades exactly this output.
 */
const VIEW_BLOCK_TYPES = new Set(["anchors", "rule", "drill", "frame"]);
const HIDDEN_ITEM_FIELDS = new Set(["bookRef", "fix", "source", "koSource", "note", "challengeNote", "paidStudent", "tags", "challengeTags"]);
const ITEM_LISTS: Record<string, string[]> = { anchors: ["items"], drill: ["select", "produce", "transfer"] };

type AnyRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is AnyRecord => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function shown(item: unknown): unknown {
  if (!isRecord(item)) return item;
  return Object.fromEntries(Object.entries(item).filter(([key]) => !HIDDEN_ITEM_FIELDS.has(key)));
}

/**
 * The line under a lesson's title (the lesson file's `subtitle` — the textbook's own subheading), as the screen draws it
 * (UI 검토 1007 37번): the textbook's section numbers '(1) ' · '(2) ' dropped — "(1) 부정사" → "부정사", and one in the middle
 * of a list turned into the list's dot — "(1) 평서문 (2) 의문문" → "평서문 · 의문문" — and null when what is left says the
 * same as the title (pg13-1 '부정사' · '(1) 부정사'), so the same words are not drawn twice. For the screen only — the
 * lesson file keeps its subtitle.
 */
export function passoffSubtitle(title: string, subtitle: string | null | undefined): string | null {
  if (typeof subtitle !== "string") return null;
  const shown = subtitle
    .replace(/(^|\s*[·/]\s*|\s+)\(\d+\)\s*/g, (_match, before: string, at: number) => (at === 0 ? "" : /[·/]/.test(before) ? before : " · "))
    .trim();
  const same = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  if (!shown || same(shown) === same(title)) return null;
  return shown;
}

export function viewBlocks(blocks: readonly Block[]): Block[] {
  return blocks
    .filter((b) => isRecord(b) && VIEW_BLOCK_TYPES.has(String(b.type)))
    .map((b) => {
      const lists = ITEM_LISTS[b.type];
      if (!lists) return b;
      const copy: AnyRecord = { ...(b as unknown as AnyRecord) };
      for (const list of lists) {
        const items = copy[list];
        if (!Array.isArray(items)) continue;
        copy[list] = items.filter((it) => !(isRecord(it) && it.reserve === true)).map(shown);
      }
      return copy as unknown as Block;
    });
}
