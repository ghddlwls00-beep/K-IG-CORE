#!/usr/bin/env node
/**
 * ADULT — the lessons, made from the owner's PPTs (2026-10-02, 사장님 "student 다음에 adult 섹션 … 학습법은 student랑 완전히 똑같이
 * … 각 ppt의 본문만"). Reads docs/adult/ppt-본문.json (the PPTs' English and 한글 번역 slides, paired by number — the 핵심 어휘 and
 * 청크 끊어읽기 slides are not used here — the chunks come from docs/adult/ppt-청크.json (CHUNK_FIX below), the words from
 * docs/adult/ppt-어휘.json (placeWords below)) and writes content/lessons/adult/a<chapter>-<part>.json + content/courses/adult.json.
 *
 *   node scripts/build-adult-content.mjs          # write
 *   node scripts/build-adult-content.mjs --check  # exit 1 if the files on disk differ from what this would write
 *   … --chunks                                    # also print each sentence whose PPT chunk breaks were moved onto new words
 *
 * One lesson per ▎ sub-unit of a PPT, exactly as STUDENT is one lesson per sub-unit of a chapter. Owner decisions (2026-10-02):
 *   · 6과 남성용 / 여성용 differ only in the Saturday sub-unit (3 sentences), so 6-1 is the men's Saturday, 6-2 the women's, and
 *     the three shared sub-units follow ("토요일만 두 강의로").
 *   · 1과: the names inside English sentences are '내 정보' blanks as in STUDENT s1-2 (src/lib/studentBlanks.ts).
 *   · Every Korean word inside the English is WRITTEN in Hangul (경주 · 불고기 · 제주도 …) and SAID as the romanization the clips
 *     were made from ("표기는 한국어로 다 변경하자 … 음성은 만든거 사용" — src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES).
 *   · 7~10과 are the old text of STUDENT 17~20장. They take STUDENT's audited sentences (facts, English and Revised Romanization —
 *     content/lessons/student/s17-1 … s20-5) one for one; the Korean line is the PPT's where the meaning did not change and is
 *     rewritten where it did ("STUDENT 처럼 고치기"). The PPT's sentence count and sub-units stay: 9과 Food keeps "I like them both."
 *     as its own sentence, where STUDENT joined it to the one before.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "adult", "ppt-본문.json");
const LESSON_DIR = path.join(ROOT, "content", "lessons", "adult");
const INDEX_FILE = path.join(ROOT, "content", "courses", "adult.json");
const CHECK = process.argv.includes("--check");

const ppt = JSON.parse(fs.readFileSync(SRC, "utf8")).files;
const pptChunks = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "adult", "ppt-청크.json"), "utf8")).files;
const DIAG = process.argv.includes("--chunks");

/** Chapter order, title (English · Korean) and the PPT file(s) it comes from. */
const CHAPTERS = [
  { file: "1과.pptx", en: "Self-Introduction", ko: "자기소개" },
  { file: "2과.pptx", en: "Family Introduction", ko: "가족 소개" },
  { file: "3과.pptx", en: "Friend Introduction", ko: "친구 소개" },
  { file: "4과.pptx", en: "Relative Introduction", ko: "친척 소개" },
  { file: "5과.pptx", en: "My Day", ko: "나의 하루" },
  { file: "6과(남성용).pptx", women: "6과(여성용).pptx", en: "My Weekend", ko: "나의 주말" },
  { file: "7과.pptx", en: "History", ko: "역사", student: 17 },
  { file: "8과.pptx", en: "Traditional Holidays", ko: "전통 명절", student: 18 },
  { file: "9과.pptx", en: "Culture", ko: "문화", student: 19 },
  { file: "10과.pptx", en: "Famous Places", ko: "유명한 장소", student: 20 },
  { file: "11과.pptx", en: "Democracy in Korea", ko: "한국의 민주주의" },
  { file: "12과.pptx", en: "Education in Korea", ko: "한국의 교육" },
];

/** Sub-unit titles: the PPT's ▎ header, with title case and STUDENT's romanization ("Chu-seok" → "Chuseok"). */
const TITLE_FIX = {
  "Helping hand (봉사활동)": "Helping Hand (봉사활동)",
  "How Korea was Founded (한국의 건국)": "How Korea Was Founded (한국의 건국)",
  "The Kingdoms are Divided (삼국의 분열과 통일)": "The Kingdoms Are Divided (삼국의 분열과 통일)",
  "Independence / Civil War (독립과 한국전쟁)": "Independence & the Korean War (독립과 한국전쟁)",
  // a title that is only a Korean name is written in Hangul alone (사장님 "표기는 한국어로")
  "Chu-seok (추석)": "추석",
  "Korean Culture is Unique (한국 문화의 독특함)": "Korean Culture Is Unique (한국 문화의 독특함)",
  "Gyeong-Ju (경주)": "경주",
  "Jeju Island and Mt. Halla (제주도와 한라산)": "제주도와 한라산",
};

/**
 * 1과 — the sentences in romanization (STUDENT s1-2's way), which is what speech says; the screen then writes the Korean
 * words in Hangul again (KOREAN_DISPLAY_PAGES below). The '내 정보' blanks are src/lib/studentBlanks.ts EXTRA_BLANKS "a1-2".
 * #6 "I live at 부산 apartment" → "I live in … Apartments" (an apartment complex's name — 사장님 2026-10-02 "너 추천대로 가자").
 */
const CH1_EN = {
  4: "My name is Hong Gil Dong, but you can call me Mrs. Hong.",
  5: "I was born in Seoul, but now I live in Busan.",
  6: "I live in Busan Apartments with my husband and 2 children.",
  7: "I graduated from Busan Women's High School in 1980 in Busan.",
  9: "I studied English at Hanguk University.",
};

/**
 * Other English the owner approved changing (2026-10-02 "너 추천대로 가자"), PPT file → sentence number → [English, Korean].
 * 2과 #14: the family has one son and one daughter, so "Our eldest son" (the oldest of three or more) becomes "Our son".
 */
const EN_FIX = {
  // #21: the PPT's "(2)" is a fill-in; the number itself, so it is a tile like every word (사장님 2026-10-02 "이렇게 오류 있는거 다
  // 찾아서 변경해" — a "(…)" is placed by the app, never assembled). It stays a '내 정보' blank in Step 3 (studentBlanks a1-5).
  "1과.pptx": {
    21: ["I have been studying English for 2 months so far.", "저는 지금까지 2개월 동안 영어를 공부해 오고 있습니다."],
  },
  "2과.pptx": {
    14: [
      "Our son, who has always been thoughtful and considerate, has wanted to give back since childhood and now works as a social worker at a community center.",
      "늘 사려 깊고 남을 배려해 온 아들은 어릴 때부터 사회에 봉사하고 싶어 했고, 지금은 커뮤니티 센터에서 사회복지사로 일하고 있습니다.",
    ],
  },
};

/**
 * The Korean words of the English are WRITTEN in Hangul (사장님 2026-10-02 "표기는 한국어로 다 변경하자", "음성은 만든거
 * 사용") — page → [Hangul, romanization], the table speech reads back (src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES,
 * loaded from there so there is one table). Every sentence is checked: romanizedForm(the Hangul sentence) must give the
 * romanized sentence again exactly, or the clips made for it would not be the ones played.
 */
function loadSpeechForm() {
  const require = createRequire(import.meta.url);
  const ts = require(path.join(ROOT, "node_modules", "typescript"));
  const source = fs.readFileSync(path.join(ROOT, "src", "lib", "lessonSpeechForm.ts"), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", "require", js)(m, m.exports, require);
  return m.exports;
}
const { KOREAN_DISPLAY_PAGES, romanizedForm } = loadSpeechForm();

function hangulForm(page, text) {
  const pairs = KOREAN_DISPLAY_PAGES[page];
  if (!pairs) return text;
  const byRoman = new Map(pairs.map(([hangul, roman]) => [roman.toLowerCase(), hangul]));
  const alternatives = pairs
    .map(([, roman]) => roman)
    .sort((a, b) => b.length - a.length)
    .map((r) => `[${r[0].toUpperCase()}${r[0].toLowerCase()}]${r.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    .join("|");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${alternatives})(?![A-Za-z0-9])`, "g"), (_m, before, roman) => `${before}${byRoman.get(roman.toLowerCase())}`);
}

/**
 * 7~10과 — the Korean line where STUDENT's fix changed what the English says (sentence number in the PPT → Korean). Every other
 * Korean line is the PPT's.
 */
const KO_FIX = {
  "7과.pptx": {
    2: "전설에 따르면 우리나라의 역사는 4,000여 년 전에 시작되었습니다.",
    9: "훗날 신라가 다른 두 왕국을 정복하고 한반도의 대부분을 통일했습니다.",
    10: "신라는 8세기에 가장 강성했습니다.",
    12: "신라 이후에는 고려와 조선 왕조가 약 1,000년 동안 한국을 다스렸습니다.",
    13: "그 뒤 1910년부터 1945년까지 한국은 일본의 지배를 받았습니다.",
    16: "1950년, 북쪽 군대가 남쪽을 침략하면서 한국전쟁이 일어났습니다.",
    17: "1953년 전쟁이 끝난 뒤에도 한반도는 북한과 남한으로 나뉜 채 남았습니다.",
    18: "1953년 전쟁이 끝난 이후 나라는 매우 빠르게 발전해 왔는데, 특히 1970년대에 그러했습니다.",
    19: "그때부터 지금까지 나라는 계속 성장해 왔습니다.",
  },
  "8과.pptx": {
    1: "우리나라에는 공휴일이 많습니다.",
    2: "공휴일은 가족들이 함께 모여 축하할 수 있는 특별한 시간입니다.",
    3: "우리는 설날, 광복절, 어린이날, 부처님 오신 날, 추석 등 많은 날을 기념합니다.",
    5: "첫 번째 큰 명절은 음력 새해 첫날인 설날입니다.",
  },
  "9과.pptx": {
    17: "그러나 1443년 세종대왕이 한국 고유의 문자를 만들었고, 이 문자는 1446년에 반포되었습니다.",
    18: "이 문자 체계가 바로 한글입니다.",
  },
  "10과.pptx": {
    5: "가 볼 만한 아주 흥미로운 곳 하나는 한국민속촌으로, 수도 서울에서 멀지 않은 경기도 용인(수원 근처)에 있습니다.",
    9: "경주는 신라 왕국의 옛 수도입니다.",
    18: "한라산은 남한에서 가장 높은 산으로, 높이가 거의 2,000미터(약 6,400피트)에 이릅니다.",
  },
};

/** STUDENT's audited English of chapter `ch`, in order — split where the PPT has two sentences for one of STUDENT's. */
function studentEnglish(ch) {
  const out = [];
  for (let part = 1; ; part++) {
    const file = path.join(ROOT, "content", "lessons", "student", `s${ch}-${part}.json`);
    if (!fs.existsSync(file)) break;
    const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const raw of lesson.blocks.find((b) => b.type === "sentences").items) {
      // STUDENT writes its Korean words in Hangul too (scripts/korean-words-hangul.mjs) — take the romanization it is said in
      const text = romanizedForm(`student/s${ch}-${part}`, raw.text);
      // s19-3 #4 holds two of the PPT's sentences
      if (text.endsWith(" I like them both.")) out.push(text.slice(0, -" I like them both.".length), "I like them both.");
      else out.push(text);
    }
  }
  return out;
}

/**
 * 끊어 읽기 (2026-10-02, 사장님 "어덜트 섹션에서 청크 학습법 하나 만들자 적절한 순서로 들어가게") — each sentence's chunks, from the
 * PPT's 청크 단위 끊어읽기 slides (docs/adult/ppt-청크.json, docs/adult/extract-chunks.ps1): [English, Korean] in order, the English
 * making up the sentence exactly. Where the sentence was changed after the PPT (1과 · 2과 #14 · 7~10과 above):
 *   · the English only (spelling, a word or two, the Korean line unchanged) — the PPT's breaks are carried over to the new words
 *     (alignChunks) and the Korean chunks stay;
 *   · the meaning (KO_FIX, a Korean chunk that no longer fits) — written here, file → sentence number → chunks.
 */
const CHUNK_FIX = {
  "1과.pptx": {
    21: [["I have been studying English", "저는 영어를 공부해 오고 있습니다"], ["for 2 months so far.", "지금까지 2개월 동안."]],
  },
  "2과.pptx": {
    14: [
      ["Our son, who has always been thoughtful and considerate,", "늘 사려 깊고 남을 배려해 온 아들은,"],
      ["has wanted to give back since childhood", "어릴 때부터 사회에 봉사하고 싶어 했고"],
      ["and now works as a social worker at a community center.", "지금은 커뮤니티 센터에서 사회복지사로 일하고 있습니다."],
    ],
  },
  "7과.pptx": {
    2: [["According to legend,", "전설에 따르면,"], ["our country’s history started", "우리나라의 역사는 시작되었습니다"], ["more than 4,000 years ago.", "4,000여 년 전에."]],
    9: [["Later,", "훗날,"], ["Silla conquered the other two kingdoms", "신라가 다른 두 왕국을 정복하고"], ["and unified most of the peninsula.", "한반도의 대부분을 통일했습니다."]],
    10: [["Silla was at its most powerful", "신라는 가장 강성했습니다"], ["during the 8th century.", "8세기에."]],
    12: [["After Silla,", "신라 이후에는,"], ["the Goryeo and Joseon dynasties ruled Korea", "고려와 조선 왕조가 한국을 다스렸습니다"], ["for about 1,000 years.", "약 1,000년 동안."]],
    13: [["Later,", "그 뒤,"], ["Korea was ruled by Japan", "한국은 일본의 지배를 받았습니다"], ["from 1910 to 1945.", "1910년부터 1945년까지."]],
    16: [["The Korean War broke out in 1950", "1950년에 한국전쟁이 일어났습니다"], ["when armies from the North invaded the South.", "북쪽 군대가 남쪽을 침략하면서."]],
    17: [["After the war ended in 1953,", "1953년 전쟁이 끝난 뒤에도,"], ["the Korean Peninsula remained divided", "한반도는 나뉜 채 남았습니다"], ["into North and South Korea.", "북한과 남한으로."]],
    18: [["Since the end of the war in 1953,", "1953년 전쟁이 끝난 이후,"], ["the country has developed very quickly,", "나라는 매우 빠르게 발전해 왔는데,"], ["especially during the 1970s.", "특히 1970년대에 그러했습니다."]],
    19: [["From then until now,", "그때부터 지금까지,"], ["the country has continued to grow.", "나라는 계속 성장해 왔습니다."]],
  },
  "8과.pptx": {
    1: [["My country has many holidays.", "우리나라에는 공휴일이 많습니다."]],
    2: [["Holidays are a special time", "공휴일은 특별한 시간입니다"], ["when families can get together and celebrate.", "가족들이 함께 모여 축하할 수 있는."]],
    3: [["We celebrate Seollal, Liberation Day, Children’s Day,", "우리는 설날, 광복절, 어린이날,"], ["Buddha’s Birthday, Chuseok, and many more.", "부처님 오신 날, 추석 등 많은 날을 기념합니다."]],
    5: [["The first big holiday is Seollal,", "첫 번째 큰 명절은 설날로,"], ["Lunar New Year’s Day.", "음력 새해 첫날입니다."]],
  },
  "9과.pptx": {
    17: [["However, in 1443,", "그러나 1443년,"], ["King Sejong created a unique Korean alphabet,", "세종대왕이 한국 고유의 문자를 만들었고,"], ["and it was proclaimed in 1446.", "이 문자는 1446년에 반포되었습니다."]],
    18: [["This writing system", "이 문자 체계는"], ["is known as Hangul.", "한글이라고 알려져 있습니다."]],
  },
  "10과.pptx": {
    5: [
      ["One very interesting place to visit", "가 볼 만한 아주 흥미로운 곳 하나는"],
      ["is the Korean Folk Village,", "한국민속촌인데,"],
      ["located in Yongin, near Suwon, in Gyeonggi Province,", "경기도 용인(수원 근처)에 있으며,"],
      ["not far from the capital, Seoul.", "수도 서울에서 멀지 않습니다."],
    ],
    9: [["Gyeongju is the old capital", "경주는 옛 수도입니다"], ["of the Silla Kingdom.", "신라 왕국의."]],
    18: [["Mt. Halla is the highest mountain in South Korea;", "한라산은 남한에서 가장 높은 산으로,"], ["it’s almost 2,000 meters high", "높이가 거의 2,000미터에 이르며"], ["(about 6,400 feet).", "(약 6,400피트)."]],
  },
};

/** a word compared without case, punctuation or the apostrophe's shape */
const wordKey = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'가-힣]/g, "");

/**
 * The PPT's chunk breaks moved onto a changed sentence: the words are matched (longest common run of words), and a break goes where
 * its neighbours went. A break between two words that were both replaced cannot be placed so — null, and the sentence needs CHUNK_FIX.
 */
function alignChunks(chunks, sentence) {
  const old = chunks.flatMap(([en], c) => en.split(/\s+/).filter(Boolean).map((w) => ({ w, c })));
  const neu = sentence.split(/\s+/).filter(Boolean);
  const a = old.map((x) => wordKey(x.w)), b = neu.map(wordKey);
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const cuts = [];
  for (let k = 1; k < old.length; k++) {
    if (old[k].c === old[k - 1].c) continue; // a break sits before old word k
    const before = [...pairs].reverse().find(([i]) => i < k) ?? [-1, -1];
    const after = pairs.find(([i]) => i >= k) ?? [old.length, neu.length];
    let cut;
    if (after[1] === before[1] + 1) cut = after[1]; // the new words around it are neighbours
    else if (after[0] === k) cut = after[1]; // the old words before the break were replaced: the new ones go before it
    else if (before[0] === k - 1) cut = before[1] + 1; // the old words after it were replaced: the new ones go after it
    else return null;
    cuts.push(cut);
  }
  if (cuts.some((c, i) => c <= (cuts[i - 1] ?? 0) || c >= neu.length)) return null;
  const bounds = [0, ...cuts, neu.length];
  return chunks.map(([, ko], c) => [neu.slice(bounds[c], bounds[c + 1]).join(" "), ko]);
}

/** this sentence's chunks, [English (as s.en — romanized), Korean] */
function chunksOf(file, page, s, meaningChanged) {
  const fixed = CHUNK_FIX[file]?.[s.n];
  const ppt = pptChunks[file]?.[String(s.n)];
  if (!ppt) throw new Error(`${file} #${s.n}: no chunk slide`);
  // the PPT writes 1과's Korean names in Hangul; the sentence here is in the romanization speech uses
  const pptRoman = ppt.map(([en, ko]) => [romanizedForm(page, en), ko]);
  const same = pptRoman.map(([en]) => en).join(" ") === s.en;
  if (fixed) {
    if (same && !meaningChanged) throw new Error(`${file} #${s.n}: CHUNK_FIX for a sentence the PPT's chunks already fit`);
    if (fixed.map(([en]) => en).join(" ") !== s.en) throw new Error(`${file} #${s.n}: CHUNK_FIX "${fixed.map(([en]) => en).join(" | ")}" is not "${s.en}"`);
    return fixed;
  }
  if (meaningChanged) throw new Error(`${file} #${s.n}: the Korean line was rewritten (KO_FIX) — write its chunks in CHUNK_FIX`);
  if (same) return pptRoman;
  const moved = alignChunks(pptRoman, s.en);
  if (!moved) throw new Error(`${file} #${s.n}: the PPT's chunk breaks cannot be carried to "${s.en}" — write its chunks in CHUNK_FIX`);
  if (DIAG) console.log(`${page} #${s.n}: ${moved.map(([en]) => en).join(" | ")}`);
  return moved;
}

/**
 * 단어 (2026-10-02, 사장님 "어덜트 섹션에서 단어 학습법 만들자 적절한 순서로 들어가게") — the PPT's 핵심 어휘·표현 slides
 * (docs/adult/ppt-어휘.json, docs/adult/extract-words.ps1), each word put on the sentence of its chapter that uses it: the PPT's
 * example phrase first, then the word's own forms ('unite' → 'united', '(A)' · '(someone)' · "one's" any words between). The place
 * to underline is where the word's forms are in that sentence (else the example phrase). 6과's two PPTs have the same 32 words
 * (all for the shared parts), so the men's list serves the chapter. A word the sentences no longer have — 7~10과 took STUDENT's
 * audited English — is left out and listed in WORDS_GONE, which must match exactly (a new loss stops the build).
 */
const pptWords = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "adult", "ppt-어휘.json"), "utf8")).files;
const WORDS_GONE = {
  "7과.pptx": ["unite", "gain power over", "civil war", "as a result", "rapidly"],
  "8과.pptx": ["also known as"],
  "9과.pptx": ["in order to", "royal"],
  "10과.pptx": ["ancient times"],
};
const POS_KO = {
  "n.": "명사", "n. (불가산)": "명사(셀 수 없음)", "v.": "동사", "adj.": "형용사", "adv.": "부사", "conj.": "접속사",
  "phr.": "구", "phr. v.": "구동사", "expr.": "표현", "collocation": "연어", "idiom": "관용구", "grammar": "문법",
};
/** '(A)' · '(someone)' inside brackets, and someone · something · oneself · one's on their own, stand for any words */
const PLACEHOLDER = /^(a|b|someone|something|oneself|one's)$/i;
const PLACEHOLDER_WORD = /^(someone|something|oneself|one's)$/i;
/** the irregular forms of the verbs the words start with */
const FORMS = {
  be: "be|is|am|are|was|were|been|being", have: "have|has|had|having", make: "make|makes|made|making", take: "take|takes|took|taken|taking",
  give: "give|gives|gave|given|giving", get: "get|gets|got|gotten|getting", go: "go|goes|went|gone|going", keep: "keep|keeps|kept|keeping",
  hold: "hold|holds|held|holding", catch: "catch|catches|caught|catching", grow: "grow|grows|grew|grown|growing", meet: "meet|meets|met|meeting",
  set: "set|sets|setting", light: "light|lights|lit|lighting", find: "find|finds|found|finding", stop: "stop|stops|stopped|stopping",
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const foldQuotes = (s) => s.replace(/[’‘]/g, "'");

/**
 * the word's forms as a pattern: each word by its stem (or FORMS), a placeholder, a comma or '…' lets up to 30 letters between
 * ('out of sight, out of mind' — "out of sight means out of mind"), and a word placeholder at the end takes the next word
 * ('keep (something) to (oneself)' — "keep those talents to himself"; '(B)' at the end does not)
 */
function wordPattern(word) {
  const parts = word
    .replace(/\(([^)]*)\)/g, (_m, inner) => (PLACEHOLDER_WORD.test(inner.trim()) ? " ＊ " : PLACEHOLDER.test(inner.trim()) ? " … " : " "))
    .replace(/\+\s*\S+/g, " ")
    .replace(/(^|\s)-ing\b/g, " ")
    .replace(/,/g, " … ")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => (PLACEHOLDER_WORD.test(p) ? "＊" : p));
  let src = "";
  let gap = false;
  let wordGap = false; // the last gap stands for a word (someone · oneself), not '(B)'
  for (const p of parts) {
    if (p === "…" || p === "＊") { gap = true; wordGap = p === "＊"; continue; }
    const t = p.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!t) continue;
    const stem = t.length > 3 && t.endsWith("e") ? t.slice(0, -1) : t.length > 4 && t.endsWith("y") ? t.slice(0, -1) : t;
    if (src) src += gap ? "[^.;]{1,30}?" : "[\\s-]+";
    src += FORMS[t] ? `(?:${FORMS[t]})\\b` : `${escapeRe(stem)}[a-z'’]*`;
    gap = false;
  }
  if (src && gap && wordGap) src += "\\s+[a-z'’]+";
  return src ? new RegExp(`\\b${src}`, "i") : null;
}

/**
 * how the card's word is SAID: a placeholder word stays ('keep something to oneself'), '(A)' is 'something', '(contribute to)' ·
 * '+ N/-ing' · '-ing' go.
 * A word said two ways is said as the card means it (the VOCA way — `<word> ⟨<IPA>⟩`, the generator's SSML): 8과 'bow' 절하다.
 */
const SAY_AS = { bow: "bow ⟨baʊ⟩" };
function wordSpeech(word) {
  if (SAY_AS[word]) return SAY_AS[word];
  return word
    // '(A)' is said 'something' — 'regard A as B' could be read 'regard uh as bee'
    .replace(/\(([^)]*)\)/g, (_m, inner) => (/^(someone|something|oneself)$/i.test(inner.trim()) ? inner.trim() : /^[AB]$/.test(inner.trim()) ? "something" : " "))
    .replace(/\+\s*\S+/g, " ")
    .replace(/(^|\s)-ing\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** file → the chapter's words placed: { lessonId, sentence index, word, meaning, pos } (the span is found on the written text later) */
function placeWords(file, chapterLessons) {
  const sentences = chapterLessons.flatMap((l) => l.sentences.map((s, i) => ({ id: l.id, i, en: s.en })));
  const placed = [];
  const gone = [];
  for (const w of pptWords[file]) {
    const pattern = wordPattern(w.word);
    const phrases = w.usage
      .split(/…|\.\.\.|\//)
      .map((x) => foldQuotes(x).replace(/[?.!,;]+$/, "").trim())
      .filter((x) => x.length > 2 && !/[가-힣]/.test(x));
    const byPhrase = phrases.length ? sentences.find((s) => phrases.every((p) => foldQuotes(s.en).toLowerCase().includes(p.toLowerCase()))) : null;
    const hit = byPhrase ?? sentences.find((s) => pattern && pattern.test(foldQuotes(s.en)));
    if (!hit) { gone.push(w.word); continue; }
    placed.push({ id: hit.id, i: hit.i, word: w.word, meaning: w.meaning, pos: POS_KO[w.pos] ?? w.pos, pattern, phrases });
  }
  const expect = WORDS_GONE[file] ?? [];
  if (JSON.stringify(gone) !== JSON.stringify(expect)) throw new Error(`${file}: words not in the sentences ${JSON.stringify(gone)}, WORDS_GONE says ${JSON.stringify(expect)}`);
  return placed;
}

/** where to underline the word in the written sentence: its forms, else the example phrase */
function wordSpan(text, w) {
  const folded = foldQuotes(text);
  const m = w.pattern ? folded.match(w.pattern) : null;
  if (m) return [m.index, m.index + m[0].length];
  for (const p of w.phrases) {
    const at = folded.toLowerCase().indexOf(p.toLowerCase());
    if (at >= 0) return [at, at + p.length];
  }
  return null;
}

const lessons = [];
const groups = [];
let order = 0;

CHAPTERS.forEach((chapter, ci) => {
  const unit = ci + 1;
  const label = `Chapter ${unit}. ${chapter.en} (${chapter.ko})`;
  const source = ppt[chapter.file];
  if (!source) throw new Error(`no PPT ${chapter.file}`);
  let sections = source.sections.map((s) => ({ header: s.header, sentences: s.sentences.map((x) => ({ ...x })) }));

  if (chapter.student) {
    const english = studentEnglish(chapter.student);
    const all = sections.flatMap((s) => s.sentences);
    if (english.length !== all.length) throw new Error(`${chapter.file}: ${all.length} sentences, STUDENT ${chapter.student}장 ${english.length}`);
    all.forEach((s, i) => {
      s.en = english[i];
      if (KO_FIX[chapter.file]?.[s.n]) s.ko = KO_FIX[chapter.file][s.n];
    });
  }
  if (unit === 1) for (const s of sections.flatMap((x) => x.sentences)) if (CH1_EN[s.n]) s.en = CH1_EN[s.n];
  for (const s of sections.flatMap((x) => x.sentences)) {
    const fix = EN_FIX[chapter.file]?.[s.n];
    if (fix) [s.en, s.ko] = fix;
  }

  if (chapter.women) {
    const women = ppt[chapter.women].sections[0];
    if (women.header !== sections[0].header) throw new Error("6과: the women's first sub-unit is not Saturday");
    sections = [
      { ...sections[0], title: "Saturday — Men's Version (토요일 · 남성용)" },
      { header: women.header, title: "Saturday — Women's Version (토요일 · 여성용)", file: chapter.women, sentences: women.sentences.map((x) => ({ ...x })) },
      ...sections.slice(1),
    ];
  }

  // 단어: the chapter's words onto its sentences (6과 — the men's list, the same as the women's)
  const placed = placeWords(chapter.file, sections.map((section, si) => ({ id: `a${unit}-${si + 1}`, sentences: section.sentences })));

  const ids = [];
  sections.forEach((section, si) => {
    const part = si + 1;
    const id = `a${unit}-${part}`;
    const title = section.title ?? TITLE_FIX[section.header] ?? section.header;
    for (const s of section.sentences) {
      s.chunks = chunksOf(section.file ?? chapter.file, `adult/${id}`, s, Boolean(KO_FIX[chapter.file]?.[s.n]));
      if (/[가-힣]/.test(s.en)) throw new Error(`${id}: Hangul left in the English "${s.en}"`);
      if (!s.ko || !/[가-힣]/.test(s.ko)) throw new Error(`${id}: no Korean line for "${s.en}"`);
      // the screen's form: the Korean words in Hangul — and the way back speech takes must give this sentence exactly
      const page = `adult/${id}`;
      const written = hangulForm(page, s.en);
      if (romanizedForm(page, written) !== s.en) throw new Error(`${id}: "${written}" reads back as "${romanizedForm(page, written)}", not "${s.en}"`);
      s.en = written;
      // the chunks are written as the sentence is (Hangul) and must still make it up exactly
      s.chunks = s.chunks.map(([en, ko]) => ({ en: hangulForm(page, en), ko }));
      if (s.chunks.map((c) => c.en).join(" ") !== written) throw new Error(`${id} #${s.n}: chunks "${s.chunks.map((c) => c.en).join(" | ")}" are not "${written}"`);
    }
    // 단어: each with where it is in the written sentence, in reading order
    section.sentences.forEach((s, i) => {
      const here = placed.filter((w) => w.id === id && w.i === i).map((w) => {
        const span = wordSpan(s.en, w);
        if (!span) throw new Error(`${id} #${i + 1}: "${w.word}" placed here but not found in "${s.en}"`);
        if (DIAG) console.log(`${id} #${i + 1} ${w.word} ⇒ [${s.en.slice(span[0], span[1])}]`);
        return { word: w.word, say: wordSpeech(w.word), meaning: w.meaning, pos: w.pos, start: span[0], end: span[1] };
      });
      here.sort((a, b) => a.start - b.start);
      s.words = here;
    });
    order += 1;
    const enTitle = title.replace(/\s*\([^()]*\)\s*$/, "");
    const lesson = {
      id,
      course: "adult",
      series: "a",
      variant: "main",
      pairId: null,
      title,
      label,
      menuLabel: `${unit}-${part}. ${enTitle}`,
      unit,
      part,
      order,
      audio: [],
      video: [],
      blocks: [
        { type: "instruction", text: `${label} - ${title}` },
        { type: "sentences", items: section.sentences.map((s, k) => ({ n: String(k + 1), text: s.en, chunks: s.chunks, ...(s.words.length ? { words: s.words } : {}) })) },
        ...section.sentences.map((s) => ({ type: "paragraph", text: s.ko, lang: "ko" })),
      ],
      legacyPath: `docs/adult/ppt-본문.json#${chapter.file}`,
      legacyEncoding: "utf-8",
    };
    lessons.push(lesson);
    ids.push(id);
  });
  // 단어 — the blank's three wrong choices: the words of the same chapter as the sentences write them, the same part of speech
  // first, never the answer's own letters; picked in a fixed order so a rebuild gives the same choices
  const chapterWords = lessons
    .filter((l) => l.unit === unit)
    .flatMap((l) =>
      l.blocks.find((b) => b.type === "sentences").items.flatMap((it) =>
        (it.words ?? []).map((w) => {
          const written = it.text.slice(w.start, w.end);
          // a word that begins its sentence loses that capital as a choice elsewhere ('However' → 'however'); the view
          // capitalises every choice of a blank that begins its sentence
          return { w, form: w.start === 0 ? written.charAt(0).toLowerCase() + written.slice(1) : written };
        }),
      ),
    );
  // (and the same ending — '-ed' · '-ing' · '-s' — so the form does not give the answer away)
  const ending = (s) => (s.match(/(ed|ing|s)$/i)?.[1] ?? "").toLowerCase();
  chapterWords.forEach(({ w, form }, k) => {
    const score = (o) => 2 * Number(o.w.pos === w.pos) + Number(ending(o.form) === ending(form));
    const others = chapterWords
      .map((o, j) => ({ ...o, j }))
      .filter((o) => o.form.toLowerCase() !== form.toLowerCase())
      .sort((a, b) => score(b) - score(a) || ((a.j - k + chapterWords.length) % chapterWords.length) - ((b.j - k + chapterWords.length) % chapterWords.length));
    const picked = [];
    for (const o of others) if (picked.length < 3 && !picked.some((p) => p.toLowerCase() === o.form.toLowerCase())) picked.push(o.form);
    if (picked.length < 3) throw new Error(`a${unit}: "${w.word}" has only ${picked.length} wrong choices`);
    w.choices = picked;
  });

  // as STUDENT's index: the course list names a chapter Korean first, and the group has no `label`
  groups.push({ title: `Chapter ${unit}. ${chapter.ko} (${chapter.en})`, lessons: ids });
});

const index = {
  course: "adult",
  tab: "adult",
  lessonCount: lessons.length,
  groups,
  lessons: lessons.map((l) => ({
    id: l.id,
    title: l.title,
    label: l.label,
    series: l.series,
    variant: l.variant,
    unit: l.unit,
    part: l.part,
    order: l.order,
    hasAudio: false,
    menuLabel: l.menuLabel,
  })),
};

const files = new Map(lessons.map((l) => [path.join(LESSON_DIR, `${l.id}.json`), JSON.stringify(l, null, 2) + "\n"]));
files.set(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");

if (CHECK) {
  // git on Windows checks these out with CRLF — compare the text, not the line endings
  const onDisk = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const differ = [...files].filter(([file, text]) => !fs.existsSync(file) || onDisk(file) !== text).map(([f]) => path.relative(ROOT, f));
  const extra = fs.existsSync(LESSON_DIR)
    ? fs.readdirSync(LESSON_DIR).map((f) => path.join(LESSON_DIR, f)).filter((f) => !files.has(f)).map((f) => path.relative(ROOT, f))
    : [];
  if (differ.length || extra.length) {
    console.error(`ADULT content differs: ${[...differ, ...extra.map((f) => `${f} (extra)`)].join(", ")}`);
    process.exit(1);
  }
  console.log(`ADULT content OK — ${lessons.length} lessons in ${groups.length} chapters`);
} else {
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  for (const [file, text] of files) fs.writeFileSync(file, text, "utf8");
  const sentences = lessons.reduce((n, l) => n + l.blocks.find((b) => b.type === "sentences").items.length, 0);
  console.log(`wrote ${lessons.length} lessons (${sentences} sentences) in ${groups.length} chapters + content/courses/adult.json`);
}
