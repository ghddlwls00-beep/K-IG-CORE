/**
 * GRAMMAR II driver support (2026-09-18 audit).
 *
 * Everything the grammar2 driver needs that does not belong in the shared harness:
 *   - the EXPECTED data for a page, rebuilt from content/ with the very functions the
 *     page uses (GrammarLearningView item extraction + buildCloze are re-implemented
 *     here line by line because they are not exported; the grader, the pronunciation
 *     scorer and the title formatter are the SHIPPED modules, loaded through tsload)
 *   - answer variants (capitalisation / spacing / punctuation / curly quotes /
 *     contractions / textbook alternatives) with the grade the shipped grader gives
 *   - in-page DOM helpers (window.__g2) injected before every document, so a reload
 *     keeps them, plus a fake SpeechRecognition (UI wiring only — a real microphone
 *     cannot be tested headless)
 *   - tab utilities: one-round-trip waits, fast trusted typing, touch taps, dialog
 *     capture, /api and /audio network capture, faster reload/goto
 *
 * Nothing here edits the repository or the shared harness.
 */
const fs = require("fs");
const path = require("path");
const H = require("./harness.cjs");

const REPO = H.REPO;
const grading = H.loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const speechRec = H.loadTs(path.join(REPO, "src/lib/speechRecognition.ts"));
const presentation = H.loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));

const COURSE = "grammar2";
const CONTENT = path.join(REPO, "content");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const INDEX = readJson(path.join(CONTENT, "courses", `${COURSE}.json`));
const VALID_ROUTES = readJson(path.join(REPO, "src/lib/generated/validRoutes.json"));
const FREE_IDS = new Set(["gh2-007", "gh2-007-1", "gh2-008", "gh2-008-1"]);

const lessonCache = new Map();
function lessonFile(id) {
  if (!lessonCache.has(id)) {
    const f = path.join(CONTENT, "lessons", COURSE, `${id}.json`);
    lessonCache.set(id, fs.existsSync(f) ? readJson(f) : null);
  }
  return lessonCache.get(id);
}

// --- the page's own text handling (GrammarLearningView.tsx GRAMMAR_KEYWORDS · buildCloze · item list) -------
// 2026-09-27 (GRAMMAR 학습법 · 화면 고침): brought up to the view as it is now — the negative contractions (6-1357, which
// this copy had missed) and GRM-L06: a sentence without a function word gets no blank when the fallback word opens it.
const GRAMMAR_KEYWORDS = new Set([
  "am", "is", "are", "was", "were", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "if", "unless", "since", "though", "although", "because", "while", "after", "before", "until", "as", "that", "whether",
  "not", "never", "no",
  "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their", "mine", "yours", "hers", "theirs",
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "in", "on", "at", "for", "to", "from", "with", "by", "of", "into", "out",
  "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "haven't", "hasn't", "hadn't",
  "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't",
]);
const NEGATIVE_CONTRACTION = /^[A-Za-z]+n['’]t$/;

function isEnglish(text) {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}
const hasKorean = (t) => (t ? /[\uAC00-\uD7AF\u1100-\u11FF]/.test(t) : false);
const cleanText = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
/** Page-side isEnglishText for extractSentencesForAudio ([lesson]/page.tsx:415-419) — note `>` not `>=`. */
function isEnglishTextPage(text) {
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin > hangul;
}

function buildCloze(enText) {
  const tokens = enText
    .split(/(\s+|[.,?!;:"()]+)/)
    .flatMap((t) => (t.includes("'") && !NEGATIVE_CONTRACTION.test(t) ? t.split(/('+)/) : [t]));
  const candidates = [];
  for (let i = 0; i < tokens.length; i++) {
    const clean = tokens[i].toLowerCase().replace(/’/g, "'").trim();
    if (GRAMMAR_KEYWORDS.has(clean)) candidates.push({ index: i, word: tokens[i] });
  }
  if (candidates.length === 0) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) {
        const opensSentence = !tokens.slice(0, i).some((t) => /[A-Za-z0-9]/.test(t));
        if (!opensSentence) candidates.push({ index: i, word: tokens[i] });
        break;
      }
    }
  }
  const toBlank = candidates.slice(0, 2);
  const blankIndices = new Set(toBlank.map((c) => c.index));
  const parts = tokens.map((t, i) => (blankIndices.has(i) ? { text: t, isBlank: true, answer: t } : { text: t, isBlank: false }));
  return { parts, blanks: toBlank.map((c) => ({ partIdx: c.index, answer: c.word })) };
}

const sentenceBlocks = (lesson) => (lesson?.blocks || []).filter((b) => b.type === "sentences");
const allItems = (lesson) => sentenceBlocks(lesson).flatMap((b) => b.items || []);

function pairIdOf(id) {
  const summary = INDEX.lessons.find((l) => l.id === id);
  if (!summary) return null;
  if (summary.variant === "main") {
    return INDEX.lessons.find((l) => l.variant === "script" && l.id.startsWith(`${id}-`))?.id ?? null;
  }
  return INDEX.lessons.find((l) => l.variant === "main" && id.startsWith(`${l.id}-`))?.id ?? null;
}

/** The item list GrammarLearningView builds for this page. */
function buildItems(id) {
  const lesson = lessonFile(id);
  const pair = pairIdOf(id) ? lessonFile(pairIdOf(id)) : null;
  const mainSentences = allItems(lesson);
  const pairSentences = pair ? allItems(pair) : [];
  const count = Math.max(mainSentences.length, pairSentences.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const m = mainSentences[i];
    const p = pairSentences[i];
    const textM = m?.text ?? "";
    const textP = p?.text ?? "";
    const altM = Array.isArray(m?.alternatives) ? m.alternatives : [];
    const altP = Array.isArray(p?.alternatives) ? p.alternatives : [];
    let en = "", ko = "", alternatives = [];
    if (isEnglish(textM) && !isEnglish(textP)) { en = textM; ko = textP; alternatives = altM; }
    else if (!isEnglish(textM) && isEnglish(textP)) { en = textP; ko = textM; alternatives = altP; }
    else if (hasKorean(textM)) { ko = textM; en = textP; alternatives = altP; }
    else { en = textM; ko = textP; alternatives = altM; }
    const englishText = cleanText(en);
    const cloze = buildCloze(englishText);
    out.push({
      id: i + 1,
      numberLabel: m?.n || p?.n || String(i + 1),
      koreanText: cleanText(ko),
      englishText,
      alternatives: alternatives.map(cleanText).filter(Boolean),
      clozeParts: cloze.parts,
      blanks: cloze.blanks,
      clipPath: H.expectedClip(englishText),
    });
  }
  return out;
}

/** extractSentencesForAudio for grammar2 ([lesson]/page.tsx:428-485) — the top player's queue. */
function topPlayerSentences(id) {
  const lesson = lessonFile(id);
  const isScript = lesson.variant === "script";
  const pairId = pairIdOf(id);
  const pair = pairId ? lessonFile(pairId) : null;
  const blocks = lesson.blocks || [];
  const pairBlocks = pair?.blocks || null;
  let targetBlocks = isScript && pairBlocks && pairBlocks.length > 0 ? pairBlocks : blocks;
  const mainSent = blocks.find((b) => b.type === "sentences");
  const pairSent = pairBlocks?.find((b) => b.type === "sentences");
  if (pairSent?.items?.[0]?.text) {
    const mainIsEn = Boolean(mainSent?.items?.[0]?.text && isEnglishTextPage(mainSent.items[0].text));
    const pairIsEn = isEnglishTextPage(pairSent.items[0].text);
    if (!mainIsEn && pairIsEn) targetBlocks = pairBlocks;
    else if (mainIsEn) targetBlocks = blocks;
  }
  const sentBlock = targetBlocks.find((b) => b.type === "sentences");
  if (sentBlock?.items?.length) return sentBlock.items.map((it) => cleanText(it.text)).filter(Boolean);
  return [];
}

/**
 * getLessonContext (content.ts:124-163) restricted to grammar2.
 * UI검토-1007 25번 (2026-10-08 · tools-c): a script page (gh2-007-1) is asked with its main page's id (page.tsx neighboursOf =
 * canonicalLessonId) — it shows gh2-007's prev / next (it walked the whole index). --break=neighbours-old (argv): the old walk.
 */
function neighbours(id) {
  const mains = INDEX.lessons.filter((l) => l.variant === "main");
  const asked = INDEX.lessons.find((l) => l.id === id) ?? null;
  const base = id.replace(/-\d+$/, "");
  if (asked?.variant === "script" && !process.argv.includes("--break=neighbours-old") && mains.some((l) => l.id === base)) id = base;
  const current = INDEX.lessons.find((l) => l.id === id) ?? null;
  const list = current?.variant === "script" ? INDEX.lessons : mains;
  const i = list.findIndex((l) => l.id === id);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const title = (l) => (l ? presentation.formatLessonPresentation(COURSE, l).title : null);
  return {
    prev: prev ? { id: prev.id, title: title(prev), href: `/${COURSE}/${prev.id}` } : null,
    next: next ? { id: next.id, title: title(next), href: `/${COURSE}/${next.id}` } : null,
  };
}

function pageInfo(id) {
  const summary = INDEX.lessons.find((l) => l.id === id);
  if (!summary) throw new Error(`unknown grammar2 id ${id}`);
  const pres = presentation.formatLessonPresentation(COURSE, summary);
  return {
    id,
    variant: summary.variant,
    isScript: summary.variant === "script",
    canonical: summary.variant === "script" ? id.replace(/-\d+$/, "") : id,
    title: pres.title,
    menuLabel: summary.menuLabel,
    free: FREE_IDS.has(id),
    url: `/${COURSE}/${id}`,
    storageKey: `kig:grammar:work:${COURSE}/${id}`,
    items: buildItems(id),
    top: topPlayerSentences(id),
    nav: neighbours(id),
  };
}

const allPageIds = () => VALID_ROUTES.lessons[COURSE].slice();

/** text -> ids of every grammar2 lesson that contains it (for "foreign text" detection). */
let TEXT_OWNERS = null;
function textOwners() {
  if (TEXT_OWNERS) return TEXT_OWNERS;
  TEXT_OWNERS = new Map();
  for (const l of INDEX.lessons) {
    for (const it of allItems(lessonFile(l.id))) {
      const t = cleanText(it.text);
      if (!t) continue;
      if (!TEXT_OWNERS.has(t)) TEXT_OWNERS.set(t, new Set());
      TEXT_OWNERS.get(t).add(l.id);
    }
  }
  return TEXT_OWNERS;
}
/** Which OTHER lessons a rendered text belongs to (empty when it is this page's own or unknown). */
function foreignOwners(text, id) {
  const owners = textOwners().get(text);
  if (!owners) return [];
  const pair = pairIdOf(id);
  return [...owners].filter((o) => o !== id && o !== pair);
}

// --- grading ---------------------------------------------------------------------
const gradeOf = (input, item) => grading.gradeAgainstReferences(input, [item.englishText, ...item.alternatives]);
const gradeBlank = (input, answer) => grading.gradeAnswer(input, answer);
const scoreSpeech = (spoken, target) => speechRec.evaluatePronunciation(spoken, target);

const CONTRACT_EXPAND = [
  [/\bcan't\b/gi, "cannot"], [/\bwon't\b/gi, "will not"], [/\bshan't\b/gi, "shall not"],
  [/\bdon't\b/gi, "do not"], [/\bdoesn't\b/gi, "does not"], [/\bdidn't\b/gi, "did not"],
  [/\bisn't\b/gi, "is not"], [/\baren't\b/gi, "are not"], [/\bwasn't\b/gi, "was not"], [/\bweren't\b/gi, "were not"],
  [/\bhaven't\b/gi, "have not"], [/\bhasn't\b/gi, "has not"], [/\bhadn't\b/gi, "had not"],
  [/\bwouldn't\b/gi, "would not"], [/\bcouldn't\b/gi, "could not"], [/\bshouldn't\b/gi, "should not"],
  [/\bmustn't\b/gi, "must not"], [/\bI'm\b/g, "I am"], [/\b(you|we|they)'re\b/gi, "$1 are"],
  [/\b([A-Za-z]+)'ll\b/g, "$1 will"], [/\b(i|you|we|they|could|would|should|might|must)'ve\b/gi, "$1 have"],
  [/\blet's\b/gi, "let us"],
];
const CONTRACT_SHORTEN = [
  [/\bdo not\b/g, "don't"], [/\bdoes not\b/g, "doesn't"], [/\bdid not\b/g, "didn't"],
  [/\bcannot\b/g, "can't"], [/\bcan not\b/g, "can't"], [/\bwill not\b/g, "won't"],
  [/\bis not\b/g, "isn't"], [/\bare not\b/g, "aren't"], [/\bwas not\b/g, "wasn't"], [/\bwere not\b/g, "weren't"],
  [/\bhave not\b/g, "haven't"], [/\bhas not\b/g, "hasn't"], [/\bhad not\b/g, "hadn't"],
  [/\bwould not\b/g, "wouldn't"], [/\bcould not\b/g, "couldn't"], [/\bshould not\b/g, "shouldn't"],
  [/\bI am\b/g, "I'm"], [/\b(You|We|They) are\b/g, (m, p) => `${p}'${p === "You" || p === "We" || p === "They" ? "re" : "re"}`],
  [/\bIt is\b/g, "It's"], [/\bHe is\b/g, "He's"], [/\bShe is\b/g, "She's"], [/\bThat is\b/g, "That's"],
  [/\blet us\b/g, "let's"],
];
/** "She has been" -> "She's been", "I would like" -> "I'd like" (map risk S-4). */
const SHORTEN_RISKY = [
  [/\b(He|She|It|That|There|Who|What) has\b/g, "$1's", "S-4 ('s read as \"is\" only)"],
  [/\b(I|You|We|They) have\b/g, "$1've", "S-4 ('ve)"],
  [/\b(I|You|We|They|He|She|It) would\b/g, "$1'd", "S-4 ('d never expanded)"],
  [/\b(I|You|We|They|He|She|It) had\b/g, "$1'd", "S-4 ('d never expanded)"],
];

function applyAll(text, table) {
  let out = text;
  for (const [re, rep] of table) out = out.replace(re, rep);
  return out;
}

const WRONG_CANDIDATES = [
  "The purple banana sang loudly yesterday.",
  "Nobody expected the elephant to paint.",
  "Zebra guitar window melted.",
];

/** Inputs to type into one item's Step 1 / Step 4 box, with the grade the shipped grader gives. */
function answerVariants(item) {
  const en = item.englishText;
  const list = [];
  const add = (kind, text, risk) => {
    if (!text || text === undefined) return;
    if (list.some((v) => v.text === text && v.kind !== "exact")) return;
    list.push({ kind, text, grade: gradeOf(text, item), risk: risk || null });
  };
  add("exact", en);
  add("lower", en.toLowerCase());
  add("upper", en.toUpperCase());
  add("spaces", `  ${en.replace(/ /g, "  ")}  `);
  const noPunct = en.replace(/[.?!]+\s*$/, "");
  if (noPunct !== en) add("noFinalPunct", noPunct);
  if (/'/.test(en)) add("curlyApostrophe", en.replace(/'/g, "\u2019"));
  if (/"/.test(en)) {
    let flip = 0;
    add("curlyQuotes", en.replace(/"/g, () => (flip++ % 2 === 0 ? "\u201C" : "\u201D")), "S-4 (curly \u201C \u201D not normalised)");
  }
  const expanded = applyAll(en, CONTRACT_EXPAND);
  if (expanded !== en) add("contractionExpanded", expanded);
  const shortened = applyAll(en, CONTRACT_SHORTEN);
  if (shortened !== en) add("contractionShortened", shortened);
  for (const [re, rep, risk] of SHORTEN_RISKY) {
    const t = en.replace(re, rep);
    if (t !== en) add("contractionShortenedRisky", t, risk);
  }
  item.alternatives.forEach((alt, i) => add(`alternative${i + 1}`, alt));
  return list;
}

/** A clearly wrong answer the shipped grader calls "incorrect". */
function wrongAnswerFor(item) {
  for (const cand of WRONG_CANDIDATES) if (gradeOf(cand, item) === "incorrect") return cand;
  return null;
}

/** A near-miss the shipped grader calls "partial" (one transposed letter in a long word). */
function partialAnswerFor(item) {
  const words = item.englishText.split(" ");
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const core = w.replace(/[^A-Za-z]/g, "");
    if (core.length < 5) continue;
    for (let k = 1; k < core.length - 2; k++) {
      if (core[k] === core[k + 1]) continue;
      const swapped = core.slice(0, k) + core[k + 1] + core[k] + core.slice(k + 2);
      const cand = words.slice();
      cand[i] = w.replace(core, swapped);
      const text = cand.join(" ");
      if (gradeOf(text, item) === "partial") return text;
    }
  }
  // fall back to swapping one function word
  const swap = item.englishText.replace(/\bthe\b/, "a").replace(/\ba\b/, "the");
  return gradeOf(swap, item) === "partial" ? swap : null;
}

const examScore = (items, answers) => {
  let exact = 0, partial = 0;
  const per = {};
  for (const it of items) {
    const g = gradeOf(answers[it.id] || "", it);
    per[it.id] = g;
    if (g === "exact") exact++;
    else if (g === "partial") partial++;
  }
  return { score: Math.round(((exact * 1.0 + partial * 0.7) / (items.length || 1)) * 100), exact, partial, per };
};

// --- injected page helpers --------------------------------------------------------
const PAGE_HELPERS = `(() => {
  if (window.__g2) return;
  const norm = (s) => (s || "").replace(/\\s+/g, " ").trim();
  const txt = (el) => (el ? norm(el.innerText) : null);
  const vis = (el) => !!el && !!(el.offsetParent || el.getClientRects().length);
  const all = (sel) => [...document.querySelectorAll(sel)];
  const byText = (root, t) => (root ? [...root.querySelectorAll("button")].find((b) => norm(b.innerText).includes(t)) || null : null);
  // 2026-09-27 (GRAMMAR 학습법 · 화면 고침 — GRM-U02 · U04 · U11 · L08): an item is li[data-item="N"] inside its step's
  // section[data-step-panel="k"]; the rounded-2xl cards, font-mono numbers, emoji button labels and the tinted Korean box
  // these helpers used to key on are gone. Steps 1–3 show ten items at a time (data-set bundles; the others are in the
  // DOM but hidden — setNext() / setPrev() switch, bundleOf(n) says where an item is). Step 4 rows are li[data-exam-row].
  const panel = (k) => document.querySelector('main [data-step-panel="' + k + '"]');
  const itemIn = (k, n) => { const p = panel(k); return p ? p.querySelector('[data-item="' + n + '"]') : null; };
  const card1 = (n) => itemIn(1, n);
  const card2 = (n) => itemIn(2, n);
  const cards2 = () => { const p = panel(2); return p ? [...p.querySelectorAll("[data-item]")] : []; };
  const cards3 = () => { const p = panel(3); return p ? [...p.querySelectorAll("[data-item]")] : []; };
  const card4 = (n) => document.querySelector('main [data-exam-row][data-item="' + n + '"]');
  const modelCard = (c) => (c ? c.querySelector("[data-answer-panel]") : null);
  // the top player: its root is now div.rounded-card (공통 틀 1); in GRAMMAR it sits folded in details[data-answer-player] (GRM-L03 ④)
  // UI검토-1007 4장 7 (2026-10-08): the page-level player stays in the DOM hidden; the view's own is at the end of Step 3 and of Step 4
  // after grading (main [data-grammar-view] details[data-answer-player]) — open Step 3 first. It used to be the first one in main.
  const playerDetails = () => document.querySelector("main [data-grammar-view] details[data-answer-player]");
  const player = () => (playerDetails() || document).querySelector('[data-grammar-view] input[aria-label="문장 이동"]')?.closest('div[class*="rounded-card"], div[class*="rounded-3xl"]') || null;
  const playerOnScreen = () => all("main details[data-answer-player]").some((d) => d.getClientRects().length > 0);
  const completeBtn = () => document.querySelector('main section[aria-label="강의 마치기"] button[aria-label="이 강의 학습 완료"], main section[aria-label="강의 마치기"] button[aria-label="학습 완료함 · 취소하려면 누르세요"]');
  const pills = () => all('main nav[aria-label="문법 4단계 학습 모드"] button');
  const chromeNav = () => document.querySelector('main nav[aria-label="강의 이동"]');
  const stepNav = () => document.querySelector('main nav[aria-label="학습 단계 이동"]');
  const viewRoot = () => document.querySelector("main [data-grammar-view]") || document.querySelector("main");
  const activePanel = () => document.querySelector("main [data-step-panel]");
  const more = () => { const p = activePanel(); return p ? p.querySelector("details[data-more]") : null; };
  const FONT_KEY = { "기본": "normal", "크게": "large", "특대": "xlarge" };

  window.__g2 = {
    norm, txt, vis,
    pills, pill: (i) => pills()[i] || null,
    // the current tab is aria-pressed (GRM-U15); it used to be the one with bg-ink
    step: () => { const p = pills().findIndex((b) => b.getAttribute("aria-pressed") === "true"); return p < 0 ? null : p + 1; },
    header: () => {
      const m = document.querySelector("main");
      const t = m ? norm(m.innerText) : "";
      const s = document.querySelector("main [data-summary][data-total]");
      return {
        // the header box ('Grammar 2 : 문법 패턴 & 구문 직독직해' · '총 N개 문항') was removed on purpose (GRM-U05);
        // the item count is the summary line's data-total now
        headline: null,
        hasTitle: false,
        count: s ? Number(s.dataset.total) : null,
        savedAt: (t.match(/([^\\n]{0,24}자동 저장됨)/) || [])[1] || null,
        detailsRuleSummary: !!document.querySelector("main details[data-rule-summary]"),
        radios: all('main input[type="radio"]').length,
        textareas: all("main textarea").length,
        // textContent: on a phone the other steps' names are hidden, but every tab still reads 'Step N · 이름'
        pills: pills().map((b) => norm(b.textContent)),
        speedPressed: all("main [data-speed]").map((b) => ({ t: norm(b.textContent), pressed: b.getAttribute("aria-pressed") === "true" })),
        fonts: ["기본", "크게", "특대"].map((f) => { const b = document.querySelector('main [data-font="' + FONT_KEY[f] + '"]'); return { t: f, pressed: b ? b.getAttribute("aria-pressed") === "true" : null }; }),
      };
    },
    // Step 1 summary (it replaced the three stats cards — GRM-U05 · U13: accuracy = 맞음 ÷ (맞음 + 다시 풀기))
    dash: () => {
      const s = document.querySelector('main [data-step-panel="1"] [data-summary]');
      if (!s) return null;
      const d = s.dataset;
      const answered = Number(d.answered), total = Number(d.total);
      return {
        answered, total,
        progressPct: total > 0 ? Math.round((answered / total) * 100) : 0,
        correct: Number(d.correct), retry: Number(d.retry),
        accuracyPct: d.accuracy === "" ? null : Number(d.accuracy),
      };
    },
    input1: (n) => document.querySelector('main [aria-label="' + n + '번 영작 답안"]'),
    card1,
    btn1: (n, which) => {
      const c = card1(n); if (!c) return null;
      const q = (sel) => c.querySelector(sel);
      if (which === "check" || which === "reveal") return q("[data-check]"); // '확인' opens the answer after an attempt (was '💡 정답 확인')
      if (which === "hint") return q("[data-hint]");
      if (which === "mic") return q("[data-mic]");
      if (which === "micUndo") return q("[data-mic-undo]");
      if (which === "ok") return q('[data-grade="correct"]');
      if (which === "retry") return q('[data-grade="retry"]');
      if (which === "next") return q("[data-next]");
      if (which === "play" || which === "modelPlay") return q("[data-answer-panel] [data-play]"); // only after 확인 (GRM-L03 ①)
      return null; // clear (GRM-U19) · copy (GRM-U12) · micReset: removed
    },
    state1: (n) => {
      const c = card1(n); if (!c) return null;
      const mc = modelCard(c);
      const inp = c.querySelector('[aria-label$="번 영작 답안"]');
      const badge = c.querySelector("[data-badge]");
      const verdict = c.querySelector("[data-verdict]");
      const micLine = c.querySelector("[data-mic-line]");
      const micGrade = c.querySelector("[data-mic-grade]");
      const alts = mc ? mc.querySelector("[data-alts]") : null;
      const mic = c.querySelector("[data-mic]");
      return {
        number: txt(c.querySelector("[data-q]")),
        korean: txt(c.querySelector("[data-ko]")),
        visible: vis(c),
        value: inp ? inp.value : null,
        placeholder: inp ? inp.placeholder : null,
        ariaLabel: inp ? inp.getAttribute("aria-label") : null,
        badge: badge ? badge.dataset.badge : null, // done · review · hint
        verdict: verdict ? verdict.dataset.verdict : null, // exact · partial · incorrect (after 확인)
        exactBadge: !!verdict && verdict.dataset.verdict === "exact", // was '🎯 정답 일치!'
        doneBadge: !!badge && badge.dataset.badge === "done", // was '✓ 학습 완료'
        reviewBadge: !!badge && badge.dataset.badge === "review", // was '↺ 복습 필요'
        diff: mc ? txt(mc.querySelector("[data-diff]")) : null,
        hint: txt(c.querySelector("[data-hint-text]")),
        nudge: txt(c.querySelector("[data-nudge]")),
        playLabel: null,
        clearVisible: false,
        revealLabel: txt(c.querySelector("[data-check]")),
        revealed: !!mc,
        model: mc ? txt(mc.querySelector("[data-model]")) : null,
        modelAlts: alts ? (norm(alts.innerText).match(/다른 정답: (.+)$/) || [])[1] || null : null,
        closest: mc ? txt(mc.querySelector("[data-closest]")) : null,
        copyLabel: null,
        micLabel: mic ? mic.getAttribute("aria-label") : null,
        micResult: micLine && micGrade ? {
          grade: micGrade.dataset.micGrade,
          transcript: (norm(micLine.innerText).match(/들은 문장: “([^”]*)”/) || [])[1] || null,
          score: null, matched: null,
        } : null,
        micError: txt(c.querySelector("[data-mic-error]")),
      };
    },
    cards2, card2,
    // aria-label is 'N번 문장 빈칸 (k/개수)' now (GRM-U01) — a prefix match; '1번 …' does not take '10번 …'
    blank: (n, k) => document.querySelectorAll('main [aria-label^="' + n + '번 문장 빈칸"]')[k] || null,
    btn2: (n, which) => {
      const c = card2(n); if (!c) return null;
      if (which === "play") return c.querySelector("[data-play]"); // only once the sentence is right or shown (GRM-L03 ⑤)
      if (which === "check") return c.querySelector("[data-cloze-check]");
      if (which === "retry") return c.querySelector("[data-cloze-retry]");
      return c.querySelector("[data-cloze-reveal]") || c.querySelector("[data-cloze-check]");
    },
    state2: (n) => {
      const c = card2(n); if (!c) return null;
      const line = c.querySelector("[data-cloze]");
      const inputs = [...c.querySelectorAll("input[data-blank]")];
      return {
        number: txt(c.querySelector("[data-q]")),
        korean: txt(c.querySelector("[data-ko]")),
        visible: vis(c),
        blanks: inputs.map((i) => {
          const mark = i.parentElement.querySelector("[data-mark]");
          return {
            value: i.value, aria: i.getAttribute("aria-label"), placeholder: i.placeholder,
            width: getComputedStyle(i).width, fontSize: getComputedStyle(i).fontSize, height: getComputedStyle(i).height,
            correct: !!mark && mark.dataset.mark === "correct", wrong: !!mark && mark.dataset.mark === "wrong",
            mark: mark ? norm(mark.innerText) : "",
          };
        }),
        marks: [...c.querySelectorAll("[data-mark]")].map((s) => s.dataset.mark),
        lineText: line ? norm(line.innerText) : null,
        lineTokens: line ? [...line.childNodes].map((nd) => (nd.nodeType === 3 ? nd.textContent : nd.querySelector && nd.querySelector("input") ? "[BLANK]" : nd.textContent)) : null,
        answers: [...c.querySelectorAll("[data-answer]")].map((s) => norm(s.innerText)),
        verdict: txt(c.querySelector("[data-cloze-verdict]")),
        checkLabel: txt(c.querySelector("[data-cloze-check]")),
        revealLabel: txt(c.querySelector("[data-cloze-reveal]")),
        revealed: c.querySelectorAll("[data-answer]").length > 0,
      };
    },
    cards3,
    card3: (i) => cards3()[i] || null,
    p3: (i) => { const c = cards3()[i]; return c ? c.querySelector("[data-en]") : null; },
    btn3: (i, which) => {
      const c = cards3()[i]; if (!c) return null;
      if (which === "play") return c.querySelector("[data-play]"); // aria-label '문장 듣기' / '정지' (was title '발음 듣기')
      if (which === "said") return c.querySelector("[data-said]"); // '따라 말했어요' — counts one repetition (GRM-L04)
      if (which === "mic") return c.querySelector('button[title^="마이크를 누르고"]'); // VoiceSpeakingTester '따라 말하고 확인'
      return null; // copy: removed (GRM-U12)
    },
    state3: (i) => {
      const c = cards3()[i]; if (!c) return null;
      const reps = c.querySelector("[data-reps]");
      const play = c.querySelector("[data-play]");
      const mic = c.querySelector('button[title^="마이크를 누르고"]');
      return {
        number: txt(c.querySelector("[data-q]")),
        english: txt(c.querySelector("[data-en]")), korean: txt(c.querySelector("[data-ko]")),
        visible: vis(c),
        repeatLabel: reps ? norm(reps.innerText) : "",
        repeats: reps ? Number(reps.dataset.count) : null,
        playTitle: play ? play.getAttribute("aria-label") : null,
        copyAria: null,
        micLabel: mic ? norm(mic.innerText) : "",
        hasMicResult: norm(c.innerText).includes("인식된 내 음성:"),
      };
    },
    input4: (n) => document.querySelector('main [aria-label="' + n + '번 시험 답안"]'),
    card4,
    btn4: (n) => { const c = card4(n); return c ? c.querySelector("[data-play]") : null; }, // after grading only
    state4: (n) => {
      const c = card4(n); if (!c) return null;
      const inp = c.querySelector('[aria-label$="번 시험 답안"]');
      const badge = c.querySelector("[data-badge]");
      const alts = c.querySelector("[data-alts]");
      return {
        prompt: txt(c.querySelector("[data-ko]")),
        qLabel: txt(c.querySelector("[data-q]")),
        value: inp ? inp.value : null,
        disabled: inp ? inp.readOnly : null, // a graded sheet is read-only (was disabled)
        aria: inp ? inp.getAttribute("aria-label") : null, placeholder: inp ? inp.placeholder : null,
        badge: badge ? badge.dataset.badge : null, // exact · partial · incorrect
        badgeText: txt(badge),
        model: txt(c.querySelector("[data-model]")),
        alts: alts ? (norm(alts.innerText).match(/또는: (.*?)(?: 외 \\d+개)?$/) || [])[1] || null : null,
        diff: txt(c.querySelector("[data-diff]")),
      };
    },
    exam: () => {
      const p = panel(4); const t = p ? norm(p.innerText) : "";
      const sum = document.querySelector("main [data-exam-summary]");
      const line = p ? p.querySelector("[data-summary]") : null;
      const sub = document.querySelector("main [data-exam-submit]");
      const last = t.match(/지난 시험 (\\d+)점/);
      return {
        header: !!p,
        footer: line ? { answered: Number(line.dataset.answered), total: Number(line.dataset.total) } : null,
        emptyNotice: !!document.querySelector("main [data-exam-notice]"),
        submitDisabled: sub ? sub.getAttribute("aria-disabled") === "true" : null,
        submitted: !!sum,
        score: sum ? Number(sum.dataset.score) : null,
        exact: sum ? Number(sum.dataset.exact) : null,
        partial: sum ? Number(sum.dataset.partial) : null,
        incorrect: sum ? Number(sum.dataset.incorrect) : null,
        lastExam: last ? Number(last[1]) : null,
      };
    },
    // before grading: the submit; after: '새 시험' (the old '답안 다시 수정하기' is gone — GRM-L01)
    submitBtn: () => document.querySelector("main [data-exam-submit]") || document.querySelector('main [data-exam-action="new"]'),
    newExamBtn: () => document.querySelector('main [data-exam-action="new"]'),
    retryWrongExamBtn: () => document.querySelector('main [data-exam-action="retry-wrong"]'),
    // these live in '⋯ 더보기' (details[data-more]) now — press moreSummary() first so they are visible (GRM-L03 ② · U05 · U20)
    moreSummary: () => { const d = more(); return d ? d.querySelector("summary") : null; },
    batchBtn: (show) => document.querySelector('main [data-action="' + (show ? "reveal-all" : "hide-all") + '"]'),
    resetBtn: () => document.querySelector('main [data-action="reset"]'),
    resetConfirmBtn: () => document.querySelector('main [data-action="reset-confirm"]'),
    fontBtn: (label) => document.querySelector('main [data-font="' + (FONT_KEY[label] || label) + '"]'),
    speedBtn: (label) => document.querySelector('main [data-speed="' + (/^1(\\.0)?/.test(String(label)) ? "1" : "0.85") + '"]'),
    fontSizes: () => {
      const c = card1(1) || card4(1);
      const ko = c ? c.querySelector("[data-ko]") : null;
      const inp = c ? c.querySelector("textarea, input") : null;
      const mc = c ? modelCard(c) : null;
      const cs = (el) => (el ? getComputedStyle(el).fontSize : null);
      return { korean: cs(ko), input: cs(inp), english: cs(mc ? mc.querySelector("[data-model]") : null), width: window.innerWidth };
    },
    // bundles of ten in Steps 1–3 (GRM-L08)
    setInfo: () => { const s = document.querySelector("main [data-set-nav]"); return s ? { index: Number(s.dataset.setIndex), count: Number(s.dataset.setCount), text: txt(s.querySelector("p")) } : null; },
    setNext: () => all("main [data-set-next]").find(vis) || null,
    setPrev: () => all("main [data-set-prev]").find(vis) || null,
    bundleOf: (n) => { const li = document.querySelector('main [data-step-panel] [data-item="' + n + '"]'); const ol = li ? li.closest("[data-set]") : null; return ol ? Number(ol.dataset.set) : null; },
    playerDetails,
    playerOnScreen,
    playerSummary: () => { const d = playerDetails(); return d ? d.querySelector("summary") : null; },
    playerBtn: (which) => {
      const p = player(); if (!p) return null;
      const map = { play: '[aria-label="재생"], [aria-label="일시정지"]', stop: '[aria-label="정지"]', prev: '[aria-label="이전 문장"]', next: '[aria-label="다음 문장"]' };
      if (map[which]) return p.querySelector(map[which]);
      return [...p.querySelectorAll("button")].find((b) => norm(b.innerText) === which) || null;
    },
    player: () => {
      const p = player(); if (!p) return null;
      const t = norm(p.innerText);
      const slider = p.querySelector('input[aria-label="문장 이동"]');
      const play = p.querySelector('[aria-label="재생"], [aria-label="일시정지"]');
      const stop = p.querySelector('[aria-label="정지"]');
      const d = playerDetails();
      return {
        folded: d ? !d.open : false,
        counter: (t.match(/(\\d+)\\/(\\d+)/) || [0, null, null]).slice(1).join("/") || null,
        status: /음성 읽는 중/.test(t) ? "speaking" : /일시정지됨/.test(t) ? "paused" : /재생 버튼을 눌러/.test(t) ? "idle" : null,
        sliderMax: slider ? Number(slider.max) : null,
        sliderValue: slider ? Number(slider.value) : null,
        sliderValueText: slider ? slider.getAttribute("aria-valuetext") : null,
        playAria: play ? play.getAttribute("aria-label") : null,
        stopDisabled: stop ? stop.disabled : null,
        speeds: [...p.querySelectorAll("button")].filter((b) => /×$/.test(norm(b.innerText))).map((b) => ({ t: norm(b.innerText), pressed: b.getAttribute("aria-pressed") === "true" })),
        hasAudioEl: !!p.querySelector("audio"),
      };
    },
    chrome: () => {
      const nav = chromeNav(); const sn = stepNav();
      const links = nav ? [...nav.querySelectorAll("a")] : [];
      const prev = links.find((a) => (a.getAttribute("aria-label") || "").startsWith("이전 강의"));
      const next = links.find((a) => (a.getAttribute("aria-label") || "").startsWith("다음 강의"));
      const courseLink = links.find((a) => norm(a.innerText).includes("목록"));
      const btns = nav ? [...nav.querySelectorAll("button")] : [];
      const bm = btns.find((b) => /북마크/.test(b.getAttribute("aria-label") || ""));
      // UI검토-1007 (10-07 end bar · 10-08 59): the completion is the end bar's button (section 강의 마치기), named by its visible words
      const done = completeBtn();
      const snButtons = sn ? [...sn.querySelectorAll("button")] : [];
      return {
        h1: txt(document.querySelector("main h1")),
        subtitle: txt(document.querySelector("main header p")), // GRAMMAR only (GRM-U22)
        title: document.title,
        canonical: (document.querySelector('link[rel="canonical"]') || {}).href || null,
        robots: (document.querySelector('meta[name="robots"]') || {}).content || null,
        description: (document.querySelector('meta[name="description"]') || {}).content || null,
        paywall: !!document.querySelector("[data-kig-paywall]"),
        courseHref: courseLink ? courseLink.getAttribute("href") : null,
        courseText: courseLink ? norm(courseLink.innerText) : null,
        prevHref: prev ? prev.getAttribute("href") : null, prevAria: prev ? prev.getAttribute("aria-label") : null,
        nextHref: next ? next.getAttribute("href") : null, nextAria: next ? next.getAttribute("aria-label") : null,
        bookmarkAria: bm ? bm.getAttribute("aria-label") : null, bookmarkText: bm ? norm(bm.innerText) : null,
        completeAria: done ? done.getAttribute("aria-label") : null, completeText: done ? norm(done.innerText) : null,
        stepNavPrevDisabled: snButtons[0] ? snButtons[0].disabled : null,
        stepNavNextDisabled: snButtons[1] ? snButtons[1].disabled : null,
        stepNavListHref: sn ? (sn.querySelector("a") || {}).getAttribute("href") : null,
      };
    },
    chromeBtn: (which) => {
      const nav = chromeNav(); const sn = stepNav();
      if (which === "bookmark") return nav ? [...nav.querySelectorAll("button")].find((b) => /북마크/.test(b.getAttribute("aria-label") || "")) : null;
      if (which === "complete") return completeBtn();
      if (which === "stepPrev") return sn ? sn.querySelectorAll("button")[0] : null;
      if (which === "stepNext") return sn ? sn.querySelectorAll("button")[1] : null;
      if (which === "prevLesson") return nav ? [...nav.querySelectorAll("a")].find((a) => (a.getAttribute("aria-label") || "").startsWith("이전 강의")) : null;
      if (which === "nextLesson") return nav ? [...nav.querySelectorAll("a")].find((a) => (a.getAttribute("aria-label") || "").startsWith("다음 강의")) : null;
      return null;
    },
    viewText: () => { const v = viewRoot(); return v ? norm(v.innerText) : null; },
    work: (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return "PARSE-ERROR"; } },
    progress: () => { const g = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }; return { completed: g("kig:progress:completed"), bookmarks: g("kig:progress:bookmarks"), recent: g("kig:progress:recent") }; },
    courseList: () => {
      const t = norm(document.body.innerText);
      const m = t.match(/학습 진도율: (\\d+) \\/ (\\d+)개 완료 \\((\\d+)%\\)/);
      const all = [...document.querySelectorAll("button")].map((b) => norm(b.innerText));
      return {
        progress: m ? { done: Number(m[1]), total: Number(m[2]), pct: Number(m[3]) } : null,
        filters: all.filter((x) => /^(전체|★북마크|미완료) \\(\\d+\\)$/.test(x)),
        emptyBookmark: t.includes("아직 북마크된 레슨이 없습니다."),
        emptyFiltered: t.includes("조건에 해당하는 레슨이 없습니다."),
        accordions: [...document.querySelectorAll("button[aria-expanded]")].map((b) => norm(b.innerText).slice(0, 60)),
        cardIds: [...document.querySelectorAll('a[href^="/grammar2/"]')].map((a) => a.getAttribute("href")),
      };
    },
    filterBtn: (prefix) => [...document.querySelectorAll("button")].find((b) => norm(b.innerText).startsWith(prefix)) || null,
  };
})()`;

const FAKE_STT = `(() => {
  if (window.__sttInstalled) return;
  window.__sttInstalled = true;
  window.__sttTranscript = null;      // null => the recogniser reports "no-speech"
  window.__sttStarts = 0;
  class FakeSR {
    constructor() { this.onstart = this.onresult = this.onerror = this.onend = null; this.lang = ""; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; }
    start() {
      window.__sttStarts++;
      setTimeout(() => {
        try { this.onstart && this.onstart(); } catch (e) {}
        const t = window.__sttTranscript;
        if (t == null) { this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); return; }
        const r = [{ transcript: t }]; r.isFinal = true; r.length = 1;
        const results = [r]; results.length = 1;
        this.onresult && this.onresult({ resultIndex: 0, results });
        this.onend && this.onend();
      }, 20);
    }
    stop() { this.onend && this.onend(); }
    abort() {}
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
})()`;

// --- tab utilities ---------------------------------------------------------------

/** Open a tab with the audio hook (harness) plus __g2 helpers and the fake recogniser. */
async function openTab(browser) {
  const tab = await H.openTab(browser);
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE_STT });
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: PAGE_HELPERS });
  await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
  instrument(tab);
  return tab;
}

/** Capture dialogs (and answer them), /api calls and /audio responses. */
function instrument(tab) {
  if (tab.extra) return tab;
  tab.extra = { dialogs: [], api: [], audio: [], autoAccept: true };
  const orig = tab.ws.onmessage;
  tab.ws.onmessage = (m) => {
    let msg = null;
    try { msg = JSON.parse(m.data); } catch { return orig(m); }
    const p = msg.params || {};
    if (msg.method === "Page.javascriptDialogOpening") {
      const accept = tab.extra.autoAccept;
      tab.extra.dialogs.push({ type: p.type, message: p.message, accepted: accept });
      tab.send("Page.handleJavaScriptDialog", { accept }).catch(() => {});
    } else if (msg.method === "Network.requestWillBeSent" && /\/api\//.test(p.request?.url || "")) {
      tab.extra.api.push({ method: p.request.method, url: p.request.url, body: p.request.postData ? String(p.request.postData).slice(0, 300) : null });
    } else if (msg.method === "Network.responseReceived" && /\/audio\//.test(p.response?.url || "")) {
      tab.extra.audio.push({ url: p.response.url, status: p.response.status, fromCache: !!p.response.fromDiskCache });
    }
    return orig(m);
  };
  return tab;
}

/** Wait for a condition INSIDE the page — one round trip instead of a poll loop. */
async function waitIn(tab, cond, ms = 6000, every = 25) {
  return await tab
    .eval(`new Promise((res) => { const t0 = performance.now(); const tick = () => { let v = false; try { v = (${cond}); } catch (e) { v = false; } if (v || performance.now() - t0 > ${ms}) return res(!!v); setTimeout(tick, ${every}); }; tick(); })`)
    .catch(() => false);
}

/** Trusted typing: focus + select, then insertText (or Backspace to clear). */
async function typeIn(tab, expr, text) {
  const ok = await tab
    .eval(`(() => { const el = (${expr}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.focus(); if (typeof el.select === 'function') el.select(); return document.activeElement === el; })()`)
    .catch(() => false);
  if (!ok) return false;
  if (text === "") {
    await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  } else {
    await tab.send("Input.insertText", { text });
  }
  // let React flush the controlled-input update before anything is read back
  await tab.eval("new Promise((r) => setTimeout(r, 0))").catch(() => {});
  return true;
}

const POINT_EXPR = (elExpr) => `(() => { const el = (${elExpr}); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); const rects = [...el.getClientRects()].filter((x) => x.width > 0 && x.height > 0); const pts = rects.map((x) => [x.left + x.width / 2, x.top + x.height / 2]).concat(rects.map((x) => [x.left + Math.min(8, x.width / 2), x.top + x.height / 2])); pts.push([r.left + r.width / 2, r.top + r.height / 2]); let pick = null, top = null; for (const [x, y] of pts) { const t = document.elementFromPoint(x, y); if (t && (t === el || el.contains(t))) { pick = [x, y]; top = t; break; } } const fb = pts[pts.length - 1]; const t2 = pick ? top : document.elementFromPoint(fb[0], fb[1]); const [cx, cy] = pick || fb; return { x: cx, y: cy, w: r.width, h: r.height, text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 60), disabled: !!el.disabled, covered: !pick, coveredBy: !pick && t2 ? (t2.innerText || t2.tagName).trim().slice(0, 40) : null }; })()`;

/** A trusted TAP (touch) at a point verified to hit the element — used on touch viewports. */
async function tap(tab, elExpr) {
  const info = await tab.eval(POINT_EXPR(elExpr)).catch((e) => ({ error: e.message }));
  if (!info) return { ok: false, reason: "not found" };
  if (info.error) return { ok: false, reason: info.error };
  if (!(info.w > 0 && info.h > 0)) return { ok: false, reason: "zero size", ...info };
  const pt = [{ x: info.x, y: info.y, radiusX: 8, radiusY: 8, force: 1 }];
  await tab.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt });
  await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return { ok: true, ...info };
}

/** click on desktop, tap on touch viewports (falls back to a mouse click if a tap does nothing). */
function clicker(viewport) {
  if (viewport === "desktop") return (tab, expr) => H.click(tab, expr);
  return async (tab, expr) => {
    const before = await tab.eval("window.__g2 ? 1 : 0").catch(() => 0);
    const r = await tap(tab, expr);
    if (!r.ok || !before) return r;
    return r;
  };
}

/** Reload without the about:blank round trip; waits for the view to be interactive again. */
async function reload(tab, { marker = H.MARKERS.grammar2, settle = 500, timeout = 45000 } = {}) {
  tab.resetEvents();
  await tab.send("Page.reload", {});
  const ok = await waitIn(tab, `document.readyState === "complete" && !!document.querySelector('main nav[aria-label="문법 4단계 학습 모드"]') && (document.querySelector("main").innerText || "").includes(${JSON.stringify(marker)})`, timeout, 60);
  await H.sleep(settle);
  return { ok, href: await tab.eval("location.href").catch(() => null) };
}

/** Navigate (soft or hard) and wait for a URL + condition. */
async function goto(tab, url, { expectPath = null, cond = "true", timeout = 45000, settle = 400 } = {}) {
  const target = url.startsWith("http") ? url : `${H.BASE}${url}`;
  const want = (expectPath ? `${H.BASE}${expectPath}` : target).split("?")[0].split("#")[0];
  tab.resetEvents();
  await tab.send("Page.navigate", { url: target });
  const ok = await waitIn(tab, `location.href.split("?")[0].split("#")[0] === ${JSON.stringify(want)} && document.readyState === "complete" && (${cond})`, timeout, 60);
  await H.sleep(settle);
  return { ok, href: await tab.eval("location.href").catch(() => null) };
}

const clearAudio = (tab) => tab.eval("(() => { if (window.__kigAudio) window.__kigAudio.length = 0; return 1; })()").catch(() => 0);

/**
 * Click a play control and wait until its clip is actually playing.
 * Returns what the audio hook saw: the clip paths requested, whether 'playing' fired,
 * any media error / rejected play(), and any browser-TTS fallback (a silent fallback is a FAIL).
 */
async function playAndWait(tab, elExpr, expectedPath, { click = null, timeout = 9000 } = {}) {
  await clearAudio(tab);
  const doClick = click || ((t, e) => H.click(t, e));
  const c = await doClick(tab, elExpr);
  if (!c.ok) return { clicked: false, reason: c.reason, requested: [], playing: false, error: null, tts: [], ms: 0 };
  const res = await tab.eval(`new Promise((res) => {
    const want = ${JSON.stringify(expectedPath)};
    const t0 = performance.now();
    const p = (s) => { try { return new URL(s, location.origin).pathname; } catch (e) { return s; } };
    const tick = () => {
      const log = (window.__kigAudio || []).filter((e) => !/^data:/.test(e.src || ""));
      const playing = log.some((e) => e.ev === "playing" && p(e.src) === want);
      const err = log.find((e) => (e.ev === "error" || e.ev === "play-rejected" || e.ev === "play-threw") && p(e.src) === want);
      const tts = log.filter((e) => e.ev === "tts.speak").map((e) => e.text);
      if (playing || err || tts.length || performance.now() - t0 > ${timeout}) {
        const plays = log.filter((e) => e.ev === "play()");
        return res({
          playing, tts,
          requested: [...new Set(plays.map((e) => p(e.src)))],
          rates: [...new Set(plays.map((e) => e.rate))],
          error: err ? (err.msg || err.name || ("mediaError " + err.err) || err.ev) : null,
          ended: log.some((e) => e.ev === "ended" && p(e.src) === want),
          ms: Math.round(performance.now() - t0),
        });
      }
      setTimeout(tick, 20);
    };
    tick();
  })`).catch((e) => ({ playing: false, error: String(e.message).slice(0, 120), requested: [], tts: [], ms: 0 }));
  return { clicked: true, ...res };
}

/** Everything the audio hook recorded since the last clear, summarised. */
const audioSummary = async (tab) => H.summariseAudio(await H.audioLog(tab));

function ensureDir(f) { fs.mkdirSync(path.dirname(f), { recursive: true }); }

module.exports = {
  H, COURSE, INDEX, FREE_IDS,
  lessonFile, pairIdOf, buildItems, topPlayerSentences, neighbours, pageInfo, allPageIds,
  foreignOwners, cleanText,
  grading, gradeOf, gradeBlank, scoreSpeech, answerVariants, wrongAnswerFor, partialAnswerFor, examScore,
  PAGE_HELPERS, FAKE_STT, openTab, instrument, waitIn, typeIn, tap, clicker, reload, goto,
  clearAudio, playAndWait, audioSummary, ensureDir, POINT_EXPR,
};
