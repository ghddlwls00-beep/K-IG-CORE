/**
 * GRAMMAR I expected data, computed from content/ with the app's own modules.
 *
 * Only the parts that live INSIDE a React component (GrammarLearningView's item
 * builder / cloze builder) and inside `[course]/[lesson]/page.tsx`
 * (extractSentencesForAudio, the top-player track choice) are re-implemented
 * here — they are not exported, so they cannot be loaded. Every line below is a
 * transcription of that source at commit 9d6e15d; `--selftest` checks the
 * resulting totals against the numbers in maps/grammar1.md.
 *
 * Everything that IS exported is loaded from the real module instead:
 *   content.ts            getLesson / getLessonContext / getCourseIndex  (ordering, pairing)
 *   curriculumPresentation.ts  formatLessonPresentation                 (h1 + nav titles)
 *   grammarGrading.ts     gradeAnswer / gradeAgainstReferences          (expected verdicts)
 *   license.ts            isFreePreviewLesson
 *   speechRecognition.ts  evaluatePronunciation                          (mic wiring expectations)
 *   unifiedSpeech.ts      via harness.expectedClip                       (clip paths)
 */
const path = require("path");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");

// content.ts resolves `content/` from process.cwd() (tooling R7), so it must be
// loaded with the repository as the working directory.
const cwdBefore = process.cwd();
process.chdir(REPO);
const content = loadTs(path.join(REPO, "src/lib/content.ts"));
const presentation = loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const license = loadTs(path.join(REPO, "src/lib/license.ts"));
const speechRecognition = loadTs(path.join(REPO, "src/lib/speechRecognition.ts"));
const validRoutes = require(path.join(REPO, "src/lib/generated/validRoutes.json"));
process.chdir(cwdBefore);

const COURSE = "grammar1";

// --- GrammarLearningView.tsx:30-115 (verbatim) ------------------------------
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
  const hangul = (text.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  return latin >= hangul && latin > 0;
}
function hasKorean(text) {
  if (!text) return false;
  return /[가-힯ᄀ-ᇿ]/.test(text);
}
function cleanText(text) {
  if (!text) return "";
  return text.replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
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
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) {
        candidates.push({ index: i, word: tokens[i] });
        break;
      }
    }
  }
  const toBlank = candidates.slice(0, 2);
  const blankIndices = new Set(toBlank.map((c) => c.index));
  const parts = tokens.map((t, i) => (blankIndices.has(i) ? { text: t, isBlank: true, answer: t } : { text: t, isBlank: false }));
  return { parts, keywords: toBlank.map((c) => c.word) };
}

// --- [course]/[lesson]/page.tsx:415-530 (grammar1 branches only) ------------
function isEnglishTextStrict(text) {
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  return latin > hangul;
}
function extractSentencesForAudio(blocks, pairBlocks, isScript) {
  let targetBlocks = isScript && pairBlocks && pairBlocks.length > 0 ? pairBlocks : blocks;
  const wordgrid = targetBlocks.find((b) => b.type === "wordgrid");
  if (wordgrid && wordgrid.rows) {
    const words = wordgrid.rows.flat().map(cleanText).filter(Boolean);
    if (words.length > 0) return words;
  }
  const mainSent = blocks.find((b) => b.type === "sentences");
  const pairSent = pairBlocks ? pairBlocks.find((b) => b.type === "sentences") : undefined;
  if (pairSent && pairSent.items && pairSent.items[0] && pairSent.items[0].text) {
    const mainIsEn = Boolean(mainSent && mainSent.items && mainSent.items[0] && mainSent.items[0].text && isEnglishTextStrict(mainSent.items[0].text));
    const pairIsEn = isEnglishTextStrict(pairSent.items[0].text);
    if (!mainIsEn && pairIsEn) targetBlocks = pairBlocks;
    else if (mainIsEn) targetBlocks = blocks;
  }
  const sentBlock = targetBlocks.find((b) => b.type === "sentences");
  if (sentBlock && sentBlock.items && sentBlock.items.length > 0) {
    return sentBlock.items.map((it) => cleanText(it.text)).filter(Boolean);
  }
  const legacy = targetBlocks
    .filter((b) => b.type === "instruction" || b.type === "hints")
    .map((b) => cleanText(b.text))
    .filter((t) => /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(t));
  if (legacy.length > 0) return legacy;
  const paras = targetBlocks.filter((b) => b.type === "paragraph");
  if (paras.length > 0) return paras.map((p) => cleanText(p.text)).filter(Boolean);
  return [];
}

// --- GrammarLearningView.tsx:132-153 (07강 rule summary) --------------------
function buildRuleSummary(lessonKey, blocks, pairBlocks) {
  if (!/^grammar1\/gh1-02[01]$/.test(lessonKey)) return [];
  const linesOf = (list) => (list || []).filter((b) => b.type === "instruction").map((b) => String(b.text).trim());
  const hasAnswers = (lines) => lines.some((l) => /^답:\s*\S/.test(l));
  const main = linesOf(blocks);
  const pair = linesOf(pairBlocks);
  const lines = hasAnswers(main) || !hasAnswers(pair) ? main : pair;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\(\d+\)\s*(.*)$/);
    if (!m) continue;
    const answer = [];
    while (i + 1 < lines.length && !/^\(\d+\)/.test(lines[i + 1])) {
      const line = lines[i + 1].replace(/^답:\s*/, "").trim();
      if (line) answer.push(line);
      i++;
    }
    out.push({ question: m[1], answer: answer.join(" ") });
  }
  return out;
}

// --- GrammarLearningView.tsx:156-217 (item list) ---------------------------
function buildItems(blocks, pairBlocks) {
  const flat = (list) => (list || []).filter((b) => b.type === "sentences").flatMap((b) => b.items);
  const mainSentences = flat(blocks);
  const pairSentences = pairBlocks ? flat(pairBlocks) : [];
  const count = Math.max(mainSentences.length, pairSentences.length);
  const result = [];
  for (let i = 0; i < count; i++) {
    const m = mainSentences[i];
    const p = pairSentences[i];
    const textM = (m && m.text) || "";
    const textP = (p && p.text) || "";
    const altM = Array.isArray(m && m.alternatives) ? m.alternatives : [];
    const altP = Array.isArray(p && p.alternatives) ? p.alternatives : [];
    let en = "";
    let ko = "";
    let alternatives = [];
    if (isEnglish(textM) && !isEnglish(textP)) {
      en = textM; ko = textP; alternatives = altM;
    } else if (!isEnglish(textM) && isEnglish(textP)) {
      en = textP; ko = textM; alternatives = altP;
    } else if (hasKorean(textM)) {
      ko = textM; en = textP; alternatives = altP;
    } else {
      en = textM; ko = textP; alternatives = altM;
    }
    const cleanEn = cleanText(en);
    const cleanKo = cleanText(ko);
    const { parts, keywords } = buildCloze(cleanEn);
    result.push({
      id: i + 1,
      numberLabel: (m && m.n) || (p && p.n) || String(i + 1),
      koreanText: cleanKo,
      englishText: cleanEn,
      alternatives: alternatives.map(cleanText).filter(Boolean),
      clozeParts: parts,
      blanks: parts.map((part, pIdx) => ({ pIdx, answer: part.answer, isBlank: part.isBlank })).filter((b) => b.isBlank)
        .map((b) => ({ pIdx: b.pIdx, answer: b.answer, width: Math.max((b.answer ? b.answer.length : 3) * 14, 58) })),
      targetKeywords: keywords,
    });
  }
  return result;
}

/** Every grammar1 route of validRoutes, in index order, with its expected page model. */
function pageModel(id) {
  const lesson = content.getLesson(COURSE, id);
  if (!lesson) return { id, missing: true };
  const ctx = content.getLessonContext(COURSE, id);
  const pairLesson = ctx.pair ? content.getLesson(COURSE, ctx.pair.id) : null;
  const num = Number((id.match(/^gh1-(\d+)/) || [])[1]);
  const redirectsTo = num % 2 !== 0 && pairLesson ? pairLesson.id : null;
  const isScript = lesson.variant === "script";
  const pres = presentation.formatLessonPresentation(COURSE, lesson);
  const items = buildItems(lesson.blocks, pairLesson ? pairLesson.blocks : null);
  const fallbackSentences = extractSentencesForAudio(lesson.blocks, pairLesson ? pairLesson.blocks : null, isScript);
  // page.tsx:227 dedupe + :239-245 grammar1 top track choice
  const audio = (lesson.audio || []).filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  const englishAudio = audio.find((a) => {
    const m = a.src.match(/gh1-(\d+)/);
    return m ? parseInt(m[1], 10) % 2 !== 0 : false;
  }) || audio[audio.length - 1];
  const topLevelAudio = englishAudio ? [englishAudio] : [];
  return {
    id,
    url: `/${COURSE}/${id}`,
    missing: false,
    variant: lesson.variant,
    isScript,
    redirectsTo,
    free: license.isFreePreviewLesson(COURSE, id),
    title: pres.title,
    subtitle: pres.subtitle,
    items,
    itemCount: items.length,
    blankCount: items.reduce((n, it) => n + it.blanks.length, 0),
    fallbackSentences,
    playerLabel: topLevelAudio.length > 0 ? null : "전체 듣기",
    hasTopPlayer: fallbackSentences.length > 0,
    ruleSummary: buildRuleSummary(`${COURSE}/${id}`, lesson.blocks, pairLesson ? pairLesson.blocks : null),
    prev: ctx.prev ? { id: ctx.prev.id, title: presentation.formatLessonPresentation(COURSE, ctx.prev).title } : null,
    next: ctx.next ? { id: ctx.next.id, title: presentation.formatLessonPresentation(COURSE, ctx.next).title } : null,
    pairId: ctx.pair ? ctx.pair.id : null,
  };
}

const routeIds = () => validRoutes.lessons[COURSE].slice();

/** text -> the page ids on which the learner should legitimately see it. */
function buildTextIndex(models) {
  const index = new Map();
  const add = (text, id) => {
    if (!text) return;
    const key = text.trim();
    if (!key) return;
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(id);
  };
  for (const m of models) {
    if (m.missing || m.redirectsTo) continue;
    for (const it of m.items) {
      add(it.koreanText, m.id);
      add(it.englishText, m.id);
      for (const alt of it.alternatives) add(alt, m.id);
    }
  }
  return index;
}

module.exports = {
  COURSE,
  content,
  presentation,
  grading,
  license,
  speechRecognition,
  routeIds,
  pageModel,
  buildTextIndex,
  cleanText,
  isEnglish,
  hasKorean,
};

if (require.main === module) {
  // --selftest: the totals in docs/qa-2026-09-18/maps/grammar1.md §2
  const ids = routeIds();
  const models = ids.map(pageModel);
  const rendered = models.filter((m) => !m.redirectsTo);
  const mains = rendered.filter((m) => m.variant === "main");
  const scripts = rendered.filter((m) => m.variant === "script");
  const sum = (list, f) => list.reduce((n, m) => n + f(m), 0);
  const alts = sum(rendered, (m) => m.items.reduce((n, it) => n + it.alternatives.length, 0));
  const report = {
    routes: ids.length,
    rendered: rendered.length,
    redirects: models.filter((m) => m.redirectsTo).length,
    mainItems: sum(mains, (m) => m.itemCount),
    scriptItems: sum(scripts, (m) => m.itemCount),
    totalItems: sum(rendered, (m) => m.itemCount),
    blanks: sum(rendered, (m) => m.blankCount),
    alternatives: alts,
    oneBlankItems: sum(rendered, (m) => m.items.filter((i) => i.blanks.length === 1).length),
    twoBlankItems: sum(rendered, (m) => m.items.filter((i) => i.blanks.length === 2).length),
    noBlankItems: sum(rendered, (m) => m.items.filter((i) => i.blanks.length === 0).length),
    playerMismatch: rendered.filter((m) => m.fallbackSentences.length !== m.itemCount).map((m) => `${m.id} ${m.fallbackSentences.length}/${m.itemCount}`),
    koreanInPlayer: rendered.filter((m) => m.fallbackSentences.some((s) => hasKorean(s))).map((m) => m.id),
    rule07: models.filter((m) => m.ruleSummary && m.ruleSummary.length).map((m) => `${m.id}:${m.ruleSummary.length}`),
    noPlayerLabel: rendered.filter((m) => m.playerLabel).map((m) => m.id),
  };
  const expect = { routes: 194, rendered: 97, redirects: 97, mainItems: 1635, scriptItems: 866, totalItems: 2501, blanks: 3844, alternatives: 453, oneBlankItems: 1158, twoBlankItems: 1343, noBlankItems: 0 };
  const diffs = Object.entries(expect).filter(([k, v]) => report[k] !== v).map(([k, v]) => `${k}: got ${report[k]}, map says ${v}`);
  console.log(JSON.stringify(report, null, 1));
  console.log(diffs.length ? "MISMATCH vs map:\n" + diffs.join("\n") : "totals match maps/grammar1.md");
}
