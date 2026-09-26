import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { Block, Lesson } from "./types";
import { planOpensCourse } from "./license";
import { LICENSE_SESSION_COOKIE_NAME, verifyLicenseSessionToken } from "./licenseSession";
import { attachPaidItems, type PaidSupplement } from "./passoffSupplement";

/**
 * PASS-OFF GRAMMAR — what a lesson page may hand its view (설계 §7).
 *
 * A free preview lesson keeps its paid STUDENT sentences in a server-only file,
 * content/private/passoff-grammar/<id>.paid.json (see src/lib/passoffSupplement.ts for why and
 * how they got there). This runs after the page's own gate and adds them only when the request
 * carries a licence that opens the course; otherwise the view is told how many a licence adds.
 * Nothing from that file reaches a page, a clip list or a bundle any other way.
 *
 * The path is literal so the build traces this one folder into the server bundle, as
 * getLesson() does for the lesson folders.
 */
const PRIVATE_DIR = path.join(process.cwd(), "content", "private", "passoff-grammar");

const cache = new Map<string, PaidSupplement | null>();

function readSupplement(id: string): PaidSupplement | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  if (cache.has(id)) return cache.get(id) ?? null;
  let supplement: PaidSupplement | null = null;
  const file = path.join(PRIVATE_DIR, `${id}.paid.json`);
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8")) as PaidSupplement;
      if (Array.isArray(data?.items)) supplement = data;
    } catch {
      supplement = null;
    }
  }
  cache.set(id, supplement);
  return supplement;
}

/**
 * "이용권이 있으면 N문장 더" counts SENTENCES, not held-back items: pg01-1 holds one sentence in step ①
 * and again in step ④, and its form exercises are built on those same sentences.
 */
function sentenceCount(supplement: PaidSupplement): number {
  return new Set(supplement.items.map((e) => e.item.en).filter((en): en is string => typeof en === "string" && en.trim() !== "")).size;
}

/**
 * ONLY WHAT THE VIEW DRAWS goes into the page. Whatever this returns is serialised into the HTML (the
 * RSC payload), so a whole lesson would send every answer list and the source table to a phone that
 * shows none of it — and a learner could read ④'s answers there before trying. Stage A draws step ①,
 * so only the anchors go, without the fields no screen shows (the source table's `bookRef` · `fix` ·
 * `source` · `koSource` · `note`, and `paidStudent`). Stage B adds the blocks of the steps it draws here.
 */
const VIEW_BLOCK_TYPES = new Set(["anchors"]);
const HIDDEN_ITEM_FIELDS = new Set(["bookRef", "fix", "source", "koSource", "note", "paidStudent"]);

function viewBlocks(blocks: Block[]): Block[] {
  return blocks
    .filter((b) => VIEW_BLOCK_TYPES.has(b.type))
    .map((b) =>
      b.type === "anchors"
        ? {
            ...b,
            items: b.items.map(
              (item) => Object.fromEntries(Object.entries(item).filter(([key]) => !HIDDEN_ITEM_FIELDS.has(key))) as typeof item,
            ),
          }
        : b,
    );
}

export async function passoffLessonBlocks(
  course: string,
  lesson: Lesson,
): Promise<{ blocks: Block[]; lockedExtraCount: number }> {
  const supplement = readSupplement(lesson.id);
  if (!supplement || supplement.items.length === 0) return { blocks: viewBlocks(lesson.blocks), lockedExtraCount: 0 };
  const session = await verifyLicenseSessionToken(
    (await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value,
  );
  if (session && planOpensCourse(session.payload.plan, course)) {
    return { blocks: viewBlocks(attachPaidItems(lesson.blocks, supplement.items)), lockedExtraCount: 0 };
  }
  return { blocks: viewBlocks(lesson.blocks), lockedExtraCount: sentenceCount(supplement) };
}
