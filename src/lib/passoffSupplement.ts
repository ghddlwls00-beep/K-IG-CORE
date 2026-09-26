/**
 * PASS-OFF GRAMMAR — the paid STUDENT sentences of a free preview lesson (설계 §7, D4).
 *
 * pg01-1 (1인칭) is free, but seven of its sentences come from paid STUDENT chapters
 * (s2-2 "I have a nice family." …). Left in the free lesson file they would be public twice
 * over: the free page would show them to anyone, and their clips would join the free clip list
 * (scripts/buildFreeSpeechKeys.mjs). And the site's leak checks (scripts/paidLeakCheck.mjs,
 * probe-bundle-leak-all.cjs) count every string of a free lesson as public, so they would stop
 * looking for those sentences anywhere at all.
 *
 * So an item marked `paidStudent: true` does not stay in a free lesson's file:
 *   - scripts/buildPassoffIndex.mjs moves it to content/private/passoff-grammar/<id>.paid.json
 *     (splitPaidItems + mergePaidEntries);
 *   - the lesson page puts it back, on the server, only for a licence that opens the course
 *     (attachPaidItems, called from src/lib/passoffContent.ts). The free page says how many
 *     sentences a licence adds;
 *   - scripts/checkPassoffFreeLeak.mjs proves that no paid STUDENT sentence is left in the free
 *     files or the free clip list, and fails when the supplement is put back (attachPaidItems).
 *
 * PURE AND IMPORT-FREE so the scripts can transpile it alone, as they do license.ts — the build,
 * the check and the page use the same split and the same attach.
 */

/** One item taken out of a free lesson, with where to put it back. */
export interface PaidEntry {
  /** the block it came from: its type ("anchors" · "drill") and which one of that type (0 = first) */
  block: string;
  nth: number;
  /** the list inside that block ("items" · "select" · "produce" · "transfer") */
  list: string;
  /** the id of the item before it in the full list (null when it was first), and its index there */
  after: string | null;
  at: number;
  item: Record<string, unknown>;
}

/** content/private/passoff-grammar/<id>.paid.json */
export interface PaidSupplement {
  lesson: string;
  note?: string;
  items: PaidEntry[];
}

type AnyBlock = { type?: unknown } & Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const itemId = (v: unknown): string | null => (isObject(v) && typeof v.id === "string" ? v.id : null);

/** The item lists of a block — every array of objects in it ("items" · "select" · "produce" · "transfer"). */
function itemLists(block: AnyBlock): string[] {
  return Object.keys(block).filter((k) => Array.isArray(block[k]) && (block[k] as unknown[]).some(isObject));
}

/**
 * Takes every `paidStudent: true` item out of the blocks. Returns new blocks (a block is copied
 * only when something left it) and the entries, in the order they appeared.
 */
export function splitPaidItems<B>(blocks: B[]): { blocks: B[]; entries: PaidEntry[] } {
  const entries: PaidEntry[] = [];
  const seenOfType: Record<string, number> = {};
  const out = blocks.map((raw) => {
    if (!isObject(raw)) return raw;
    const block = raw as AnyBlock;
    const type = String(block.type);
    const nth = seenOfType[type] ?? 0;
    seenOfType[type] = nth + 1;
    let copy: AnyBlock | null = null;
    for (const list of itemLists(block)) {
      const items = block[list] as unknown[];
      if (!items.some((it) => isObject(it) && it.paidStudent === true)) continue;
      items.forEach((it, at) => {
        if (isObject(it) && it.paidStudent === true) {
          entries.push({ block: type, nth, list, after: at > 0 ? itemId(items[at - 1]) : null, at, item: it });
        }
      });
      copy = copy ?? { ...block };
      copy[list] = items.filter((it) => !(isObject(it) && it.paidStudent === true));
    }
    return (copy ?? block) as B;
  });
  return { blocks: out, entries };
}

/**
 * Puts the entries back. Each goes after the item it followed; when that item is gone it goes to
 * its old index (or the end). Entries are placed in their stored order, so a run of paid items
 * that followed one another comes back in the same order. Blocks are copied, never changed.
 */
export function attachPaidItems<B>(blocks: B[], entries: readonly PaidEntry[]): B[] {
  const out = blocks.map((b) => (isObject(b) ? ({ ...b } as B) : b));
  const copied = new Set<string>();
  for (const e of entries) {
    let nth = -1;
    const block = out.find((b) => isObject(b) && String((b as AnyBlock).type) === e.block && ++nth === e.nth) as AnyBlock | undefined;
    if (!block) continue;
    const key = `${out.indexOf(block as B)}:${e.list}`;
    if (!copied.has(key)) {
      block[e.list] = Array.isArray(block[e.list]) ? [...(block[e.list] as unknown[])] : [];
      copied.add(key);
    }
    const list = block[e.list] as unknown[];
    const after = e.after === null ? -1 : list.findIndex((it) => itemId(it) === e.after);
    const at = e.after === null ? 0 : after >= 0 ? after + 1 : Math.min(e.at, list.length);
    list.splice(at, 0, e.item);
  }
  return out;
}

/**
 * The supplement after a split: entries just taken out of the lesson replace the stored ones
 * with the same item id, and a stored entry whose id is back in the lesson as a free item is
 * dropped (the lesson file decides — the item is no longer marked paid).
 */
export function mergePaidEntries(stored: readonly PaidEntry[], fresh: readonly PaidEntry[], freeIds: ReadonlySet<string>): PaidEntry[] {
  const freshIds = new Set(fresh.map((e) => itemId(e.item)));
  return [
    ...stored.filter((e) => !freshIds.has(itemId(e.item)) && !freeIds.has(itemId(e.item) ?? "")),
    ...fresh,
  ];
}

/** Every item id in the blocks (all lists). */
export function itemIdsOf(blocks: readonly unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const b of blocks) {
    if (!isObject(b)) continue;
    for (const list of itemLists(b as AnyBlock)) for (const it of b[list] as unknown[]) {
      const id = itemId(it);
      if (id) ids.add(id);
    }
  }
  return ids;
}
