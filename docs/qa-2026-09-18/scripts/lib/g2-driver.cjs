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

// --- the page's own text handling (GrammarLearningView.tsx:30-115, 156-217) -------
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
]);

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
  const tokens = enText.split(/(\s+|[.,?!;:"'()]+)/);
  const candidates = [];
  for (let i = 0; i < tokens.length; i++) {
    const clean = tokens[i].toLowerCase().trim();
    if (GRAMMAR_KEYWORDS.has(clean)) candidates.push({ index: i, word: tokens[i] });
  }
  if (candidates.length === 0) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) { candidates.push({ index: i, word: tokens[i] }); break; }
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

/** getLessonContext (content.ts:124-163) restricted to grammar2. */
function neighbours(id) {
  const mains = INDEX.lessons.filter((l) => l.variant === "main");
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
  const card1 = (n) => { const i = document.querySelector('main input[aria-label="' + n + '번 영작 답안"]'); return i ? i.closest('div[class*="rounded-2xl"]') : null; };
  const card2 = (n) => { const i = document.querySelector('main input[aria-label="' + n + '번 문장 빈칸"]'); if (i) return i.closest('div[class*="rounded-2xl"]'); return cards2().find((c) => norm(c.querySelector("span").innerText) === String(n)) || null; };
  const cards2 = () => all('main div[class*="rounded-2xl"]').filter((d) => byText(d, "문장 듣기"));
  const cards3 = () => all('main div[class*="rounded-2xl"]').filter((d) => d.querySelector('button[title="발음 듣기"], button[title="발음 정지"]'));
  const card4 = (n) => { const i = document.querySelector('main input[aria-label="' + n + '번 시험 답안"]'); return i ? i.parentElement.parentElement : null; };
  const modelCard = (c) => (c ? [...c.querySelectorAll("div")].find((d) => norm(d.innerText).startsWith("모범 답안 (Model Answer)")) || null : null);
  const player = () => document.querySelector('main input[aria-label="문장 이동"]')?.closest('div[class*="rounded-3xl"]') || null;
  const pills = () => all('main nav[aria-label="문법 4단계 학습 모드"] button');
  const chromeNav = () => document.querySelector('main nav[aria-label="강의 이동"]');
  const stepNav = () => document.querySelector('main nav[aria-label="학습 단계 이동"]');
  const viewRoot = () => pills().length ? pills()[0].closest("div.flex.flex-col.gap-8") || document.querySelector("main") : document.querySelector("main");

  window.__g2 = {
    norm, txt, vis,
    pills, pill: (i) => pills()[i] || null,
    step: () => { const p = pills().findIndex((b) => b.className.includes("bg-ink")); return p < 0 ? null : p + 1; },
    header: () => {
      const m = document.querySelector("main");
      const t = m ? norm(m.innerText) : "";
      return {
        headline: (document.querySelector("main span.font-semibold") || {}).innerText || null,
        hasTitle: t.includes("Grammar 2 : 문법 패턴 & 구문 직독직해"),
        count: (t.match(/총 (\\d+)개 문항/) || [])[1] ? Number((t.match(/총 (\\d+)개 문항/) || [])[1]) : null,
        savedAt: (t.match(/([^\\n]{0,24}자동 저장됨)/) || [])[1] || null,
        detailsRuleSummary: all("main details").some((d) => norm(d.innerText).includes("문법 확인")),
        radios: all('main input[type="radio"]').length,
        textareas: all("main textarea").length,
        pills: pills().map((b) => norm(b.innerText)),
        speedPressed: all("main button[title^='음성 속도']").map((b) => ({ t: norm(b.innerText), pressed: b.getAttribute("aria-pressed") === "true" })),
        fonts: ["기본", "크게", "특대"].map((f) => { const b = all("main button").find((x) => norm(x.innerText) === f); return { t: f, pressed: b ? b.getAttribute("aria-pressed") === "true" : null }; }),
      };
    },
    dash: () => {
      const m = document.querySelector("main");
      const t = m ? norm(m.innerText) : "";
      const prog = t.match(/작성 진행률 (\\d+) \\/ (\\d+) (\\d+)%/);
      const acc = t.match(/자가 채점 정답률 (\\d+) 개 맞음 (-?\\d+)%/);
      return prog || acc ? {
        answered: prog ? Number(prog[1]) : null, total: prog ? Number(prog[2]) : null,
        progressPct: prog ? Number(prog[3]) : null,
        correct: acc ? Number(acc[1]) : null, accuracyPct: acc ? Number(acc[2]) : null,
      } : null;
    },
    input1: (n) => document.querySelector('main input[aria-label="' + n + '번 영작 답안"]'),
    card1,
    btn1: (n, which) => {
      const c = card1(n); if (!c) return null;
      if (which === "play") return byText(c, "영어 정답 발음") || byText(c, "정지");
      if (which === "clear") return [...c.querySelectorAll('button[title="지우기"]')][0] || null;
      if (which === "reveal") return byText(c, "정답 확인") || byText(c, "정답 가리기");
      if (which === "ok") return byText(c, "맞음");
      if (which === "retry") return byText(c, "다시 풀기");
      if (which === "mic") return byText(c, "마이크로 말해서 영작하기") || byText(c, "듣고 있는 중") || [...c.querySelectorAll('button[title^="마이크를 누르고"]')][0] || null;
      if (which === "micReset") return byText(c, "다시 녹음");
      const mc = modelCard(c); if (!mc) return null;
      if (which === "copy") return byText(mc, "복사");
      if (which === "modelPlay") return byText(mc, "발음 듣기");
      return null;
    },
    state1: (n) => {
      const c = card1(n); if (!c) return null;
      const t = norm(c.innerText);
      const mc = modelCard(c);
      const inp = c.querySelector("input");
      const mic = byText(c, "마이크로 말해서 영작하기") || [...c.querySelectorAll('button[title^="마이크를 누르고"]')][0];
      return {
        number: norm(c.querySelector("span").innerText),
        korean: txt(c.querySelector("div[class*='bg-raised'] p")),
        value: inp ? inp.value : null,
        placeholder: inp ? inp.placeholder : null,
        ariaLabel: inp ? inp.getAttribute("aria-label") : null,
        exactBadge: t.includes("🎯 정답 일치!"),
        doneBadge: t.includes("✓ 학습 완료"),
        reviewBadge: t.includes("↺ 복습 필요"),
        playLabel: txt(byText(c, "영어 정답 발음") || byText(c, "정지")),
        clearVisible: !!c.querySelector('button[title="지우기"]'),
        revealLabel: txt(byText(c, "정답 확인") || byText(c, "정답 가리기")),
        revealed: !!mc,
        model: mc ? txt(mc.querySelector("p")) : null,
        modelAlts: mc ? (norm(mc.innerText).match(/다른 정답: (.+)$/) || [])[1] || null : null,
        copyLabel: mc ? txt(byText(mc, "복사")) : null,
        micLabel: mic ? norm(mic.innerText) : null,
        micResult: t.includes("인식된 내 음성:") ? {
          score: Number((t.match(/(\\d+)점/) || [])[1]),
          transcript: (norm(c.innerText).match(/인식된 내 음성: "([^"]*)"/) || [])[1] || null,
          matched: (t.match(/단어 일치 (\\d+\\/\\d+)/) || [])[1] || null,
        } : null,
        micError: (t.match(/⚠️ ([^⚠]*?)(?: 🌐|$)/) || [])[1] || null,
      };
    },
    cards2, card2,
    blank: (n, k) => document.querySelectorAll('main input[aria-label="' + n + '번 문장 빈칸"]')[k] || null,
    btn2: (n, which) => { const c = card2(n); if (!c) return null; return which === "play" ? byText(c, "전체 문장 듣기") : byText(c, "빈칸 정답 확인") || byText(c, "빈칸 가리기"); },
    state2: (n) => {
      const c = card2(n); if (!c) return null;
      const line = [...c.querySelectorAll("div")].find((d) => d.className.includes("flex-wrap") && (d.querySelector("input") || d.className.includes("items-center")));
      const inputs = [...c.querySelectorAll("input")];
      const marks = [...c.querySelectorAll('[role="status"]')].map((s) => norm(s.innerText));
      return {
        number: norm(c.querySelector("span").innerText),
        korean: txt(c.querySelector("p")),
        blanks: inputs.map((i) => {
          const wrap = i.parentElement;
          const mark = norm((wrap.querySelector('[role="status"]') || {}).innerText || "");
          return { value: i.value, aria: i.getAttribute("aria-label"), placeholder: i.placeholder, width: i.style.width, correct: mark === "✓", wrong: mark === "✗", mark };
        }),
        marks,
        lineText: line ? norm(line.innerText) : null,
        lineTokens: line ? [...line.children].map((ch) => (ch.tagName === "SPAN" && !ch.querySelector("input") ? ch.textContent : "[BLANK]")) : null,
        revealLabel: txt(byText(c, "빈칸 정답 확인") || byText(c, "빈칸 가리기")),
        revealed: !!byText(c, "빈칸 가리기"),
      };
    },
    cards3,
    card3: (i) => cards3()[i] || null,
    p3: (i) => { const c = cards3()[i]; return c ? c.querySelector("p") : null; },
    btn3: (i, which) => {
      const c = cards3()[i]; if (!c) return null;
      if (which === "play") return c.querySelector('button[title="발음 듣기"], button[title="발음 정지"]');
      if (which === "copy") return c.querySelector('button[title="문장 복사"], button[aria-label="복사됨"]');
      if (which === "mic") return byText(c, "내 발음 채점 및 섀도잉 검증") || [...c.querySelectorAll('button[title^="마이크를 누르고"]')][0] || null;
      return null;
    },
    state3: (i) => {
      const c = cards3()[i]; if (!c) return null;
      const ps = [...c.querySelectorAll("p")];
      const t = norm(c.innerText);
      return {
        number: norm(c.querySelector("span").innerText),
        english: txt(ps[0]), korean: txt(ps[1]),
        repeatLabel: norm([...c.querySelectorAll("span")].map((s) => norm(s.innerText)).find((s) => /회 연습|3회 달성/.test(s)) || ""),
        playTitle: (c.querySelector('button[title="발음 듣기"], button[title="발음 정지"]') || {}).title || null,
        copyAria: (c.querySelector('button[title="문장 복사"], button[aria-label="복사됨"]') || {}).getAttribute ? (c.querySelector('button[title="문장 복사"], button[aria-label="복사됨"]')).getAttribute("aria-label") : null,
        micLabel: norm(((byText(c, "내 발음 채점") || [...c.querySelectorAll('button[title^="마이크를 누르고"]')][0]) || {}).innerText || ""),
        hasMicResult: t.includes("인식된 내 음성:"),
      };
    },
    input4: (n) => document.querySelector('main input[aria-label="' + n + '번 시험 답안"]'),
    card4,
    btn4: (n) => { const c = card4(n); return c ? byText(c, "발음 청취") : null; },
    state4: (n) => {
      const c = card4(n); if (!c) return null;
      const inp = c.querySelector("input");
      const t = norm(c.innerText);
      return {
        prompt: t.split(" ").length ? norm((c.querySelector("span.font-semibold") || {}).innerText || "") : null,
        qLabel: norm((c.querySelector("span.font-mono") || {}).innerText || ""),
        value: inp ? inp.value : null, disabled: inp ? inp.disabled : null,
        aria: inp ? inp.getAttribute("aria-label") : null, placeholder: inp ? inp.placeholder : null,
        badge: t.includes("✓ 정답 (100점)") ? "exact" : t.includes("△ 부분 정답 (70점)") ? "partial" : t.includes("✕ 오답 (0점)") ? "incorrect" : null,
        model: (t.match(/모범 답안: (.*?)(?: \\(또는:|🔊|$)/) || [])[1] || null,
        alts: (t.match(/\\(또는: (.*?)\\)/) || [])[1] || null,
      };
    },
    exam: () => {
      const m = document.querySelector("main"); const t = m ? norm(m.innerText) : "";
      const sub = [...document.querySelectorAll("main button")].find((b) => norm(b.innerText).includes("전체 시험 채점하기"));
      const again = [...document.querySelectorAll("main button")].find((b) => norm(b.innerText).includes("답안 다시 수정하기"));
      const done = t.match(/작성 완료: (\\d+) \\/ (\\d+) 문항/);
      return {
        header: t.includes("실전 영작 모의 시험"),
        footer: done ? { answered: Number(done[1]), total: Number(done[2]) } : null,
        emptyNotice: t.includes("작성한 문항이 없습니다"),
        submitDisabled: sub ? sub.disabled : null,
        submitted: !!again,
        score: (t.match(/최종 획득 점수 (\\d+)점/) || [])[1] ? Number((t.match(/최종 획득 점수 (\\d+)점/) || [])[1]) : null,
        exact: (t.match(/정답 일치: (\\d+)개/) || [])[1] ? Number((t.match(/정답 일치: (\\d+)개/) || [])[1]) : null,
        partial: (t.match(/부분 일치: (\\d+)개/) || [])[1] ? Number((t.match(/부분 일치: (\\d+)개/) || [])[1]) : null,
      };
    },
    submitBtn: () => [...document.querySelectorAll("main button")].find((b) => /전체 시험 채점하기|답안 다시 수정하기/.test(norm(b.innerText))) || null,
    batchBtn: (show) => [...document.querySelectorAll("main button")].find((b) => norm(b.innerText) === (show ? "💡 전체 정답 보기" : "🔒 전체 정답 가리기")) || null,
    resetBtn: () => [...document.querySelectorAll("main button")].find((b) => norm(b.innerText).includes("모든 작성 내용 초기화")) || null,
    fontBtn: (label) => [...document.querySelectorAll("main button")].find((b) => norm(b.innerText) === label) || null,
    speedBtn: (label) => [...document.querySelectorAll("main button")].find((b) => norm(b.innerText) === label && (b.title || "").startsWith("음성 속도")) || null,
    fontSizes: () => {
      const c = card1(1) || card4(1);
      const ko = c ? c.querySelector("p, span.font-semibold") : null;
      const inp = c ? c.querySelector("input") : null;
      const mc = c ? modelCard(c) : null;
      const cs = (el) => (el ? getComputedStyle(el).fontSize : null);
      return { korean: cs(ko), input: cs(inp), english: cs(mc ? mc.querySelector("p") : null), width: window.innerWidth };
    },
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
      return {
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
      const done = btns.find((b) => /학습 완료/.test(b.getAttribute("aria-label") || ""));
      const snButtons = sn ? [...sn.querySelectorAll("button")] : [];
      return {
        h1: txt(document.querySelector("main h1")),
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
      if (which === "complete") return nav ? [...nav.querySelectorAll("button")].find((b) => /학습 완료/.test(b.getAttribute("aria-label") || "")) : null;
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
