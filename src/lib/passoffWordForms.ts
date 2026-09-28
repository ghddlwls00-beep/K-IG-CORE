import "server-only";

import { editDistance, normalizeForComparison, referencesOf, spokenNumbersAsWords, type ProduceItemLike } from "./passoffGrading";
import type { PassoffProduceItem } from "./passoffTypes";
import type { Block } from "./types";

/**
 * PASS-OFF GRAMMAR — the irregular-verb and irregular-plural table of the typo rule, kept ON THE SERVER (점검 2026-09-28).
 *
 * The grader (passoffGrading.ts isTypo · differentWord) never takes a one-letter difference between two words of this
 * table for a spelling slip: forget/forgot · broke/broken · woman/women are two forms of one word, bought/brought two
 * words. The table used to sit in passoffGrading.ts, which every lesson page ships to the phone — and the table is what
 * the paid lesson pg10-2 teaches ("forbid - forbade - forbidden", "mistake - mistook - mistaken", "withdraw - withdrew -
 * withdrawn" were found in the public JavaScript on 2026-09-28).
 *
 * The rule only asks whether BOTH words — or both ends after a shared start (overtake/overtaken · fireman/firemen) — are
 * table words, and only for a typed word one letter away from a word of the item's answers. So an item needs only:
 *   - the table words that are its answers' words, or the ends of them, and
 *   - the table words one letter away from those — what a learner may type in their place.
 * attachWordForms puts exactly those on each ④ · ⑤ item as `wordForms`, on the server after the page's gate (the lesson
 * page: passoffContent.ts passoffLessonBlocks; the review: passoffReviewBlocks). A free lesson's page carries its own
 * items' few words, and no page carries the table. Graded with them, every answer gets the verdict the whole table gave
 * (docs/pass-off-grammar/검사/check-leak-fix.cjs compares the two over every item).
 *
 * (A plain -n / -t ending is not taken as grammar on its own: seven/seve · student/studen are real slips; the irregular
 * -n / -t forms are all here.)
 */
const WORD_FORMS =
  "arise,arose,arisen|awake,awoke,awoken|bear,bore,borne,born|beat,beaten|become,became|begin,began,begun|bend,bent|" +
  "bind,bound|bite,bit,bitten|bleed,bled|blow,blew,blown|break,broke,broken|breed,bred|bring,brought|build,built|" +
  "burn,burnt,burned|buy,bought|catch,caught|choose,chose,chosen|cling,clung|come,came|creep,crept|deal,dealt|dig,dug|" +
  "do,did,done|draw,drew,drawn|dream,dreamt,dreamed|drink,drank,drunk|drive,drove,driven|eat,ate,eaten|fall,fell,fallen|" +
  "feed,fed|feel,felt|fight,fought|find,found|flee,fled|fling,flung|fly,flew,flown|forbid,forbade,forbidden|" +
  "forget,forgot,forgotten|forgive,forgave,forgiven|freeze,froze,frozen|get,got,gotten|give,gave,given|go,went,gone|" +
  "grind,ground|grow,grew,grown|hang,hung|hear,heard|hide,hid,hidden|hold,held|keep,kept|kneel,knelt|know,knew,known|" +
  "lay,laid|lead,led|lean,leant,leaned|leap,leapt,leaped|learn,learnt,learned|leave,left|lend,lent|lie,lay,lain|" +
  "light,lit|lose,lost|make,made|mean,meant|meet,met|mistake,mistook,mistaken|pay,paid|prove,proved,proven|" +
  "ride,rode,ridden|ring,rang,rung|rise,rose,risen|run,ran|say,said|see,saw,seen|seek,sought|sell,sold|send,sent|" +
  "sew,sewed,sewn|shake,shook,shaken|shine,shone|shoot,shot|show,showed,shown|shrink,shrank,shrunk|sing,sang,sung|" +
  "sink,sank,sunk|sit,sat|sleep,slept|slide,slid|smell,smelt,smelled|speak,spoke,spoken|speed,sped|spell,spelt,spelled|" +
  "spend,spent|spill,spilt,spilled|spin,spun|spit,spat|spoil,spoilt,spoiled|spring,sprang,sprung|stand,stood|" +
  "steal,stole,stolen|stick,stuck|sting,stung|stink,stank,stunk|strike,struck|string,strung|strive,strove,striven|" +
  "swear,swore,sworn|sweep,swept|swell,swelled,swollen|swim,swam,swum|swing,swung|take,took,taken|teach,taught|" +
  "tear,tore,torn|tell,told|think,thought|throw,threw,thrown|tread,trod,trodden|understand,understood|wake,woke,woken|" +
  "wear,wore,worn|weave,wove,woven|weep,wept|win,won|wind,wound|withdraw,withdrew,withdrawn|write,wrote,written|" +
  "man,men|woman,women|child,children|foot,feet|tooth,teeth|goose,geese|mouse,mice|person,people|leaf,leaves|" +
  "life,lives|knife,knives|wife,wives|half,halves|wolf,wolves|shelf,shelves|thief,thieves|loaf,loaves|ox,oxen";

/** Every word of the table, in its order, once — what the grader knew before 2026-09-28 (the checks grade with it to compare). */
export const ALL_WORD_FORMS: readonly string[] = [...new Set(WORD_FORMS.split(/[|,]/))];
const TABLE = new Set(ALL_WORD_FORMS);

/**
 * Every word the grader can hold a typed word against for this item: the words of each answer (the model answer and the
 * accepted ones) as the grader compares them — typed and by microphone (numbers as words, no apostrophes), each `'s`
 * read as is and as has. More words than it uses is harmless here (only table words are kept below).
 */
function answerWords(item: ProduceItemLike): Set<string> {
  const out = new Set<string>();
  for (const reference of referencesOf(item)) {
    for (const text of new Set([reference, spokenNumbersAsWords(reference)])) {
      for (const apostrophes of ["keep", "drop"] as const) {
        for (const s of ["is", "has"] as const) for (const w of normalizeForComparison(text, { s, apostrophes }).split(" ")) if (w) out.add(w);
      }
    }
  }
  return out;
}

const cache = new Map<string, string[]>();
/** per answer word and cut: the table words it brings (its end, and the table words one letter away in the end's place) */
const nearCache = new Map<string, string[]>();

function formsNear(word: string, cut: number): string[] {
  const key = `${cut}\u0000${word}`;
  const hit = nearCache.get(key);
  if (hit) return hit;
  const end = word.slice(cut);
  const start = word.slice(0, cut);
  const out = [end];
  // one edit changes the length by one at most, so a longer or shorter table word cannot be one letter away
  for (const other of ALL_WORD_FORMS) if (other !== end && Math.abs(other.length - end.length) <= 1 && editDistance(start + other, word) === 1) out.push(other);
  nearCache.set(key, out);
  return out;
}

/**
 * The table words this item's answers can meet, in the table's order: each answer word's end that is a table word (the
 * whole word first), and each table word that, put in that end's place, makes a word one letter away (editDistance, as
 * the typo rule measures it) — what differentWord looks up for a one-letter slip against this item. Empty when none.
 */
export function wordFormsOf(item: ProduceItemLike): string[] {
  const key = referencesOf(item).join("\u0000");
  const hit = cache.get(key);
  if (hit) return hit;
  const needed = new Set<string>();
  for (const word of answerWords(item)) {
    for (let cut = 0; cut < word.length; cut++) if (TABLE.has(word.slice(cut))) for (const w of formsNear(word, cut)) needed.add(w);
  }
  const forms = ALL_WORD_FORMS.filter((w) => needed.has(w));
  cache.set(key, forms);
  return forms;
}

function withWordForms<T extends PassoffProduceItem>(item: T): T {
  if (!item || typeof item.en !== "string") return item;
  const wordForms = wordFormsOf(item);
  return wordForms.length ? { ...item, wordForms } : item;
}

/**
 * The view blocks with each ④ produce · ⑤ transfer item's `wordForms` attached — call it on what the page or the review
 * already decided to hand out (after the licence and the paid supplement), never on a whole lesson.
 */
export function attachWordForms(blocks: readonly Block[]): Block[] {
  return blocks.map((block) => {
    if (!block || block.type !== "drill") return block;
    return {
      ...block,
      ...(Array.isArray(block.produce) ? { produce: block.produce.map(withWordForms) } : {}),
      ...(Array.isArray(block.transfer) ? { transfer: block.transfer.map(withWordForms) } : {}),
    };
  });
}
