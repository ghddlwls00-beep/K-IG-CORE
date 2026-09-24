/**
 * What the DATA says a lesson page must contain, must be able to speak, and what the
 * correct answers are — so the driver can judge the live page against the source of truth.
 *
 * Everything here is derived from content/ and src/lib (the app's own modules where a
 * transform is involved: vocaSpeech display→spoken form, unifiedSpeech clip keys).
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");

const unified = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const vocaSpeech = (() => {
  try { return loadTs(path.join(REPO, "src/lib/vocaSpeech.ts")); } catch { return null; }
})();
const listening = (() => {
  try { return loadTs(path.join(REPO, "src/lib/listeningUtils.ts")); } catch { return null; }
})();
const vocaUtils = (() => {
  try { return loadTs(path.join(REPO, "src/lib/vocaUtils.ts")); } catch { return null; }
})();
const vocaDictionary = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8")); } catch { return null; }
})();
// 7단계 7-2: '앱이 소리 내는 글' 은 생성기 · 무료 소리 키와 같은 한 정의(scripts/lib/spoken-texts.cjs) — clipTexts 는 그것으로
const spoken = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const lessonAudio = loadTs(path.join(REPO, "src/lib/lessonAudioText.ts"));
const validRoutes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const ldScripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"];

const lessonPath = (course, id) => path.join(REPO, "content/lessons", course, `${id}.json`);
const hasLesson = (course, id) => fs.existsSync(lessonPath(course, id));
const lesson = (course, id) => JSON.parse(fs.readFileSync(lessonPath(course, id), "utf8"));
const courseIndex = (course) => JSON.parse(fs.readFileSync(path.join(REPO, "content/courses", `${course}.json`), "utf8"));

function pages(course) {
  return (validRoutes.lessons[course] || []).map((id) => ({ course, id, url: `/${course}/${id}` }));
}

/**
 * Prev/next exactly as src/lib/content.ts getLessonContext computes them:
 * a MAIN lesson walks the main-only list, a SCRIPT page walks the full index list.
 */
function neighbours(course) {
  const lessons = courseIndex(course).lessons;
  const mains = lessons.filter((l) => l.variant === "main");
  const map = {};
  for (const l of lessons) {
    const list = l.variant === "script" ? lessons : mains;
    const i = list.findIndex((x) => x.id === l.id);
    map[l.id] = {
      prev: i > 0 ? list[i - 1].id : null,
      next: i >= 0 && i < list.length - 1 ? list[i + 1].id : null,
    };
  }
  return map;
}

/**
 * The partner lesson, computed the way the app computes it (src/lib/content.ts getLessonContext),
 * NOT from the `pairId` written in the lesson file.
 *
 * Those two disagree. GRAMMAR I pairs an even-numbered Korean lesson with the odd-numbered English
 * answer sheet of the SAME sub-variant, so /grammar1/gh1-006-1 pairs with gh1-007-1. The stored
 * pairId on gh1-006-1 says gh1-006 — another Korean lesson — so reading it made the audit expect
 * Korean where the learner types English, and report grading failures that were its own.
 */
function pairOf(course, id) {
  const lessons = courseIndex(course).lessons;
  const current = lessons.find((l) => l.id === id) || null;
  let pairId =
    current && current.variant === "main"
      ? (lessons.find((l) => l.variant === "script" && l.id.startsWith(`${id}-`)) || {}).id
      : (lessons.find((l) => l.variant === "main" && id.startsWith(`${l.id}-`)) || {}).id;
  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const sub = m[2] || "";
      const pad = (n) => String(n).padStart(3, "0");
      const other = num % 2 === 0 ? num + 1 : num - 1;
      if (lessons.some((l) => l.id === `gh1-${pad(other)}${sub}`)) pairId = `gh1-${pad(other)}${sub}`;
      else if (lessons.some((l) => l.id === `gh1-${pad(other)}`)) pairId = `gh1-${pad(other)}`;
    }
  }
  return pairId || null;
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const isKo = (s) => /[가-힣]/.test(s);

/**
 * LISTENING 받아쓰기 힌트 — src/components/LdLearningView.tsx 의 `hintChunks` ·
 * `pickHintsFor` 와 같은 규칙. 앱이 화면에 그리는 칩을 그대로 계산한다.
 *
 * 앱 쪽 코드는 컴포넌트 안에 있어 (React 훅을 쓰므로) 여기서 불러올 수 없다. 그래서
 * 규칙을 옮겨 적었고, 둘이 어긋나면 스윕에서 "hint-chip 이 화면에 없다" 로 바로 드러난다.
 * 앱을 고치면 이 세 함수도 같이 고쳐야 한다.
 */
const hintChunks = (text) =>
  String(text || "")
    // 천 단위 쉼표("4,000")에서는 자르지 않음 (앱과 같음, 6단계 3차 점검 #4 N1) · 칭호(Mr. Mrs. Ms. Dr. St. …) · 한 글자 머리글자(N. · D.W.) 뒤
    // 마침표에서도 자르지 않고, 칩 끝의 그 마침표는 남김 (앱과 같음, 관문 15 C06113 — 'Mrs. Watson' 이 [Mrs] [Watson] 로 갈리던 것)
    .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
    .map((chunk) => chunk.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
    .filter((chunk, index, all) => chunk && all.indexOf(chunk) === index); // 같은 청크는 한 번 (앱과 같음, 6단계)

const squashHint = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const PRONOUN_I = /^I(?:'m|'ve|'ll|'d)?$/;

function hintsForSentence(sentence, chunks) {
  if (!sentence || !chunks.length) return [];
  const squashed = squashHint(sentence);
  const sentenceNumbers = String(sentence).replace(/(\d),(?=\d{3}(?!\d))/g, "$1"); // 문장의 "4,000" 도 "4000" 으로 (앱과 같음)
  const relevant = chunks.filter((chunk) => {
    const whole = squashHint(chunk);
    if (whole.length >= 3 && squashed.includes(whole)) return true;
    return chunk.split(/\s+/).some((token) => {
      const bare = token.replace(/[^A-Za-z0-9'’.]/g, "").replace(/[.'’]+$/, "");
      if (/^\d{2,}$/.test(bare)) return new RegExp(`(?<!\\d)${bare}(?!\\d)`).test(sentenceNumbers);
      const letters = bare.replace(/[^A-Za-z]/g, "");
      if (letters.length < (/^[A-Z]/.test(bare) ? 3 : 5)) return false;
      return squashed.includes(squashHint(bare));
    });
  });
  if (relevant.length) return relevant;
  // 안전장치: 이름이나 숫자가 있는데 짝지은 것이 없으면 강의 힌트 전체가 나오는 것이 정상
  if (/\d/.test(sentence)) return chunks;
  const hasName = sentence.split(/(?<=[.?!])\s+/).some((part) =>
    part.trim().split(/\s+/).slice(1).some((word) => {
      const bare = word.replace(/[^A-Za-z'’]/g, "");
      if (PRONOUN_I.test(bare)) return false;
      return /^[A-Z]/.test(bare) && bare.replace(/[^A-Za-z]/g, "").length > 1;
    }));
  return hasName ? chunks : [];
}

/**
 * The app's own cleanText (src/components/GrammarLearningView.tsx:54-60): it strips a leading
 * item number and collapses slash alternatives BEFORE the sentence is displayed, spoken or
 * graded. Reading the raw data instead made the audit type "1. I was poor." into the exam,
 * where the reference is "I was poor.", and then report the product for marking it wrong.
 */
const cleanItemText = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();

function itemsOf(d) {
  const out = [];
  for (const b of d.blocks || []) if (b.type === "sentences") for (const it of b.items || []) if (it && typeof it.text === "string") out.push({ n: it.n, text: clean(cleanItemText(it.text)), alternatives: (it.alternatives || []).map((a) => clean(cleanItemText(a))) });
  return out;
}
function gridWords(d) {
  const g = (d.blocks || []).find((b) => b.type === "wordgrid");
  return g ? g.rows.flat().map(clean).filter(Boolean) : [];
}

/**
 * expected(course, id) →
 *   texts     : strings the learner must be able to see somewhere on the page
 *   answers   : ordered correct answers for graded inputs (empty when not applicable)
 *   clipTexts : every text this page may legitimately speak (for clip-path checking)
 */
function expected(course, id) {
  if (!hasLesson(course, id)) return { texts: [], answers: [], clipTexts: [], missingFile: true };
  const d = lesson(course, id);
  const pairId = pairOf(course, id);
  const pair = pairId && hasLesson(course, pairId) ? lesson(course, pairId) : null;
  const texts = [];
  const answers = [];
  const clipTexts = new Set();
  // LISTENING only: which dictation sentence shows the biggest hint box, and how many chips
  let hintWorstSentence = -1;
  let hintWorstSize = 0;
  // a text whose speech form normalises to nothing (e.g. the label "[ hv-01 ]") has no clip.
  // The browser keys every text through vocaSpeechForm first (src/lib/speech.ts cleanText — BUG-027,
  // 7단계), as the generator always has, so "labo(u)r" from the top player is requested as "labor".
  const speechForm = (t) => (vocaSpeech && typeof vocaSpeech.vocaSpeechForm === "function" ? vocaSpeech.vocaSpeechForm(String(t)) : t);
  const addClip = (t) => { const c = clean(speechForm(t)); if (c && unified.normalizeUnifiedSpeechText && unified.normalizeUnifiedSpeechText(c)) clipTexts.add(c); else if (c && !unified.normalizeUnifiedSpeechText) clipTexts.add(c); };

  if (course === "grammar1" || course === "grammar2") {
    const mine = itemsOf(d);
    const theirs = pair ? itemsOf(pair) : [];
    for (const it of mine) texts.push({ kind: "item", text: it.text });
    // the learner types the OTHER language's item: KO page → EN answers, EN page → EN itself
    const english = mine.length && !isKo(mine[0].text) ? mine : theirs;
    for (const it of english) answers.push({ n: it.n, text: it.text, alternatives: it.alternatives });
  } else if (course === "ld") {
    const base = id.replace(/-1$/, "");
    const rows = ldScripts[base] || [];
    /**
     * ENGLISH ONLY. LISTENING renders the Korean line but never speaks it: all eight playback
     * calls in LdLearningView pass `.en` or a liaison card's `original` (713/948/1081/1250 put
     * `.ko` inside a <p>, with no button), and the top player's extractSpeechTexts returns the
     * English list for `ld` (page.tsx:440). scripts/generate-azure-ava.mjs deliberately collects
     * only `row.en` for the same reason, so a clip for the Korean is never generated either.
     *
     * Expecting one anyway is what produced BUG-001: 378 of the 387 clips reported "missing from
     * production" were Korean script lines that no button can request. Measured 2026-09-22 —
     * clicking the per-sentence speaker on /ld/d002-1 requested the English key and nothing else,
     * and none of the 378 keys appears anywhere in the licensed sweep recordings of all 276
     * lessons (features/ld*.jsonl, recheck-audio-ld.jsonl), while the English control key does.
     */
    // (clips: the English rows and STEP 3's liaison PRESET phrases — generateLiaisonPoints `original`,
    // which no text of this lesson hashes to; leaving them out once made the audit report 1,198 plays
    // as "a clip of another lesson". Both come from scripts/lib/spoken-texts.cjs below.)
    // The Korean script on screen comes from ld_english_scripts.json (src/lib/content.ts
    // getLdEnglishScript), NOT from the `instruction` blocks of the lesson file. Those blocks hold
    // a second, older copy that nothing renders and that has drifted from the displayed one
    // ("개스" vs "가스") — see scripts/check-ld-duplicate-script.cjs. Comparing the page against
    // that dead copy reported hundreds of paragraphs as missing when they were on screen.
    // Only the page's own guidance line, which no script row carries, is still expected here.
    if (/-1$/.test(id)) {
      for (const r of rows) texts.push({ kind: "ko-script", text: clean(r.ko) });
      const guide = (d.blocks || []).find((b) => b.type === "instruction" && /대본을 보면서|영작해보세요/.test(String(b.text)));
      if (guide) texts.push({ kind: "ko-guide", text: clean(guide.text) });
    }
    /**
     * LD-HINTS-01 — the dictation hints are no longer shown as one block of text.
     *
     * `LdLearningView` splits the stored line into chunks and shows only the chunks that
     * belong to the sentence on screen, falling back to the whole list when the sentence
     * plainly holds a name or a number and nothing matched. Expecting the stored string
     * verbatim therefore failed on 221 main pages for a difference that is the design:
     * "Mrs.Watson. Barbara. Robert Watson. …" is never printed as one run.
     *
     * So expect what the view computes, sentence by sentence — the driver walks the
     * dictation through every sentence (drive-generic, ld dictation walk). The check is
     * not removed: a lesson whose hints produce no chip at all still expects the raw line,
     * so "the hints vanished" would fail loudly.
     */
    else {
      const hintsBlock = (d.blocks || []).find((b) => b.type === "hints" && String(b.text || "").trim());
      if (hintsBlock) {
        const chunks = hintChunks(hintsBlock.text);
        const wanted = new Set();
        let worst = -1, worstSize = 0;
        rows.forEach((r, index) => {
          const chips = hintsForSentence(String(r.en || ""), chunks);
          for (const chip of chips) wanted.add(chip);
          // The sentence with the most chips is the biggest box on screen — the fallback
          // sentences show the whole list — so that is the one worth measuring for layout.
          if (chips.length > worstSize) { worstSize = chips.length; worst = index; }
        });
        hintWorstSentence = worst;
        hintWorstSize = worstSize;
        if (wanted.size) for (const chip of wanted) texts.push({ kind: "hint-chip", text: chip });
        else texts.push({ kind: "hints", text: clean(hintsBlock.text) });
      }
    }
    for (const r of rows) answers.push({ n: r.n, text: clean(r.en), alternatives: [] });
  } else if (course === "reading") {
    for (const s of d.readingSentences || []) texts.push({ kind: "en", text: clean(s.english) });
    for (const v of d.readingVocabulary || []) { texts.push({ kind: "word", text: clean(v.word) }); texts.push({ kind: "meaning", text: clean(v.korean) }); }
    /**
     * The Korean passage (2026-09-23): one expected text PER SENTENCE ("ko-sentence") instead of
     * the whole instruction block ("ko-passage"). STEP 4 draws readingSentences[].korean sentence
     * by sentence; across all 256 script pages the instruction block and those sentences joined
     * are the same text once spacing and punctuation are ignored — it is not a stale copy, as
     * LISTENING's was. Checked per sentence, a single missing sentence is caught; the old check
     * compared the paragraph's first 60 characters and could not see the last one go.
     * Same pages as before: only those whose file carries the Korean passage (the -1 pages).
     */
    if ((d.blocks || []).some((b) => b.type === "instruction" && isKo(b.text))) {
      const shown = (d.readingSentences && d.readingSentences.length) ? d.readingSentences : ((pair && pair.readingSentences) || []);
      for (const s of shown) if (s && s.korean) texts.push({ kind: "ko-sentence", text: clean(s.korean) });
    }
  } else if (course === "phonics") {
    // (clips: vocaSpeechForm(word) — a bracketed headword such as "labo(u)r" is spoken as "labor",
    // never as itself — and the collocation card's ONE speaker button's PRESET `phrase`, never the
    // example sentence (BUG-001's other 9 of 387). Both come from scripts/lib/spoken-texts.cjs below.)
    for (const w of gridWords(d)) texts.push({ kind: "word", text: w });
  } else if (course === "student") {
    // STUDENT: English sentences live in `sentences` blocks, their Korean in `paragraph` blocks
    for (const it of itemsOf(d)) {
      texts.push({ kind: isKo(it.text) ? "ko" : "en", text: it.text });
      if (!isKo(it.text)) answers.push({ n: it.n, text: it.text, alternatives: it.alternatives });
    }
    for (const b of d.blocks || []) if (b.type === "paragraph" && typeof b.text === "string") texts.push({ kind: "ko", text: clean(b.text) });
  }
  /**
   * Every text this page may speak — 7단계 7-2: the ONE definition the clip generator and the free-clip
   * list use (scripts/lib/spoken-texts.cjs), including what the top '전체 듣기' player speaks (the page's
   * own extractSentencesForAudio). It used to add Korean READING sentences, Korean GRAMMAR items,
   * instruction/heading blocks and LISTENING `phonetic` here — 4,061 clips outside STUDENT that no
   * control ever requests, so a changed Korean line showed up as a "missing clip".
   */
  // (spokenTexts throws when one of these src modules did not load — an empty clip list would pass every check)
  const fns = { vocaSpeechForm: vocaSpeech && vocaSpeech.vocaSpeechForm, getCollocation: vocaUtils && vocaUtils.getCollocation, generateLiaisonPoints: listening && listening.generateLiaisonPoints, extractSentencesForAudio: lessonAudio.extractSentencesForAudio, firstSlashAlternative: listening && listening.firstSlashAlternative, vocaWordSpeech: vocaSpeech && vocaSpeech.vocaWordSpeech, readingWordSpeech: vocaSpeech && vocaSpeech.readingWordSpeech };
  for (const t of spoken.spokenTexts({ course, id, lesson: d, pair: pairId ? { id: pairId, ...(pair || {}) } : null, ldScripts, dictionary: vocaDictionary || {}, fns })) addClip(t);
  /**
   * The exact words the tap-dictation expects, taken from the app's own generateWordBank rather
   * than derived by splitting the sentence. A sentence with a slash alternative —
   * "Nice to meet you (sir/ma'am)." — yields FIVE correct tiles plus a spare "ma'am", while
   * splitting the text gives six words; tapping all six assembled a sentence the bank never
   * accepts, which is why every STUDENT lesson came back unassembled.
   */
  const tileWordsAll = (() => {
    if (!(course === "ld" || course === "student") || !listening || typeof listening.generateWordBank !== "function") return null;
    // STUDENT: exactly what StudentLearningView hands generateWordBank — the FIRST "sentences" block's items, raw.
    // 7단계 7-1 b: itemsOf() cleans the text (a slash becomes a space), so "He/She is a very talented artist, too."
    // reached the app's function as "He She is …" and the audit assembled BOTH pronouns; the app — one of the pair
    // is right, both is wrong (CNT-01, 9/16) — said 일치하지 않습니다, and s3-3 · s3-4 came back FAIL.
    const studentBlock = (d.blocks || []).find((b) => b.type === "sentences");
    const sentences = course === "ld"
      ? answers.map((a) => a.text)
      : ((studentBlock && studentBlock.items) || []).map((it) => it && it.text).filter((t) => typeof t === "string" && t.trim() && !isKo(t));
    const out = [];
    for (const s of sentences) {
      try { const w = listening.generateWordBank(String(s), []).correctWords; if (w && w.length) out.push(w); } catch {}
    }
    return out.length ? out : null;
  })();
  // Earlier controls on the page can move the drill to its next sentence, so the driver is given
  // EVERY sentence's tile list and picks whichever one the bank on screen actually holds. Using
  // only the first sentence left STUDENT assembling two stray words out of six.
  const tileWords = tileWordsAll ? tileWordsAll[0] : null;

  return {
    // LISTENING/STUDENT dictation is answered by tapping word tiles
    tileAnswers: course === "ld" || course === "student",
    tileWords,
    tileWordsAll,
    texts: texts.filter((t) => t.text && t.text.length >= 2)
      // a script page shows the same material but the audit only opens its steps lightly,
      // so meanings that need a click are not expected to be on screen there
      .filter((t) => !(d.variant === "script" && t.kind === "meaning")),
    answers,
    hintWorstSentence,
    hintWorstSize,
    clipTexts: [...clipTexts],
    clipPaths: new Set([...clipTexts].map((t) => unified.unifiedSpeechPath(t))),
    legacyAudio: (d.audio || []).map((a) => a.src).filter(Boolean),
    variant: d.variant,
    pairId,
    menuLabel: d.menuLabel,
    title: d.title,
  };
}

module.exports = { COURSES, pages, neighbours, lesson, hasLesson, courseIndex, expected, itemsOf, gridWords, ldScripts, clean, isKo, unified, pairOf, hintChunks, hintsForSentence };
