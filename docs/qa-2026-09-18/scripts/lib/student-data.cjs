/**
 * STUDENT course — everything the driver expects BEFORE a browser is opened.
 *
 * Derived from the shipped data files and the app's own pure modules
 * (listeningUtils, speechRecognition, unifiedSpeech, curriculumPresentation),
 * loaded through docs/qa-2026-09-15/scripts/tsload.cjs, so the expectations are
 * the product's own logic and not a re-implementation of it.
 *
 * Nothing here touches the network or the repository (read-only).
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../../qa-2026-09-15/scripts/tsload.cjs");

const U = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const SR = loadTs(path.join(REPO, "src/lib/speechRecognition.ts"));
const SP = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const PRES = loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));

const COURSE = "student";
const INDEX = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/student.json"), "utf8"));
const VALID = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const LESSON_DIR = path.join(REPO, "content/lessons/student");

/** Lesson ids in the app's own navigation order (content.ts uses the index array order). */
const ORDER = INDEX.lessons.map((l) => l.id);
const VALID_IDS = (VALID.lessons && VALID.lessons.student) || [];
/** Routes the audit must cover: the allow-list, walked in the app's order. */
const ROUTE_IDS = ORDER.filter((id) => VALID_IDS.includes(id));
const ROUTE_MISMATCH = {
  inIndexNotValid: ORDER.filter((id) => !VALID_IDS.includes(id)),
  inValidNotIndex: VALID_IDS.filter((id) => !ORDER.includes(id)),
};

const lessonCache = new Map();
function lessonFile(id) {
  if (!lessonCache.has(id)) {
    lessonCache.set(id, JSON.parse(fs.readFileSync(path.join(LESSON_DIR, `${id}.json`), "utf8")));
  }
  return lessonCache.get(id);
}

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const lower = (s) => norm(s).toLowerCase();

function sentencesOf(L) {
  const block = (L.blocks || []).find((b) => b.type === "sentences");
  return (block && block.items) || [];
}
function koreanOf(L) {
  return (L.blocks || [])
    .filter((b) => b.type === "paragraph" && b.lang === "ko")
    .map((b) => (b.text || "").trim());
}
function instructionOf(L) {
  const b = (L.blocks || []).find((x) => x.type === "instruction");
  return (b && b.text) || "STUDENT 실전 듣기·읽기 완성 훈련";
}

/** Multiset helper: {word(lowercased): count} */
function counts(words) {
  const m = new Map();
  for (const w of words) m.set(w.toLowerCase(), (m.get(w.toLowerCase()) || 0) + 1);
  return m;
}
function canBuild(sequence, tileWords) {
  const need = counts(sequence);
  const have = counts(tileWords);
  for (const [w, n] of need) if ((have.get(w) || 0) < n) return false;
  return true;
}

/**
 * A wrong sequence that uses ONLY tiles that exist, and that the app's own
 * verifier rejects. Returns null when the sentence cannot produce one
 * (a one-word sentence whose reverse is itself, etc.).
 */
function wrongSequences(wb) {
  const tiles = wb.allTiles.map((t) => t.word);
  const accepted = wb.acceptedWordSequences;
  const bad = (seq) => seq.length > 0 && canBuild(seq, tiles) && !U.verifyAnyWordSequence(seq, accepted);

  const reversed = wb.correctWords.slice().reverse();
  const leftover = (() => {
    const have = counts(tiles);
    for (const w of wb.correctWords) have.set(w.toLowerCase(), have.get(w.toLowerCase()) - 1);
    const spare = [];
    for (const t of tiles) {
      const key = t.toLowerCase();
      if ((have.get(key) || 0) > 0) {
        spare.push(t);
        have.set(key, have.get(key) - 1);
      }
    }
    return spare;
  })();

  // correct words with the last one swapped for a spare tile (a distractor or an
  // alternative's word) — a plausible learner mistake the app must reject.
  let distractor = null;
  if (leftover.length) {
    const cand = wb.correctWords.slice(0, -1).concat([leftover[0]]);
    if (bad(cand)) distractor = { words: cand, tile: leftover[0] };
  }

  // A mixed pronoun sentence ("He … her …") when the sentence has two accepted
  // gendered readings: neither reading accepts the mix.
  let mixed = null;
  if (accepted.length >= 2) {
    const a = accepted[0];
    const b = accepted[1];
    if (a.length === b.length) {
      const diff = [];
      for (let i = 0; i < a.length; i++) if (a[i].toLowerCase() !== b[i].toLowerCase()) diff.push(i);
      if (diff.length >= 2) {
        const cand = a.slice();
        cand[diff[0]] = b[diff[0]];
        if (bad(cand)) mixed = cand;
      }
    }
  }

  return {
    reversed: bad(reversed) ? reversed : null,
    distractor,
    mixed,
    spareTiles: leftover,
  };
}

/** Everything the driver needs for one lesson. */
function expectedFor(id) {
  const L = lessonFile(id);
  const pres = PRES.formatLessonPresentation(COURSE, L);
  const en = sentencesOf(L);
  const ko = koreanOf(L);
  const idx = ORDER.indexOf(id);
  const prevId = idx > 0 ? ORDER[idx - 1] : null;
  const nextId = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  const titleOf = (other) =>
    other ? PRES.formatLessonPresentation(COURSE, lessonFile(other)).title : null;

  const sentences = en.map((item, i) => {
    const text = item.text;
    const wb = U.generateWordBank(text);
    const variants = U.expandSlashAlternatives(text);
    const fakeTranscript = variants[0].replace(/[’]/g, "'").replace(/[()“”"]/g, "");
    const score = SR.evaluatePronunciation(fakeTranscript, text);
    return {
      i,
      n: item.n,
      text,
      ko: ko[i] || "",
      enClip: SP.unifiedSpeechPath(text),
      koClip: ko[i] ? SP.unifiedSpeechPath(ko[i]) : null,
      correctWords: wb.correctWords,
      accepted: wb.acceptedWordSequences,
      tiles: wb.allTiles.map((t) => t.word).slice().sort(),
      wrong: wrongSequences(wb),
      fake: {
        transcript: fakeTranscript,
        score: score.score,
        ratingLabel: score.ratingLabel,
        matched: score.matchedCount,
        total: score.totalWords,
      },
    };
  });

  return {
    id,
    chapter: Number((id.match(/^s(\d+)-/) || [])[1] || 0),
    part: Number((id.match(/-(\d+)$/) || [])[1] || 0),
    title: pres.title,
    subtitle: pres.subtitle,
    code: pres.code,
    instruction: instructionOf(L),
    label: L.label || "",
    url: `/${COURSE}/${id}`,
    prev: prevId ? { id: prevId, title: titleOf(prevId) } : null,
    next: nextId ? { id: nextId, title: titleOf(nextId) } : null,
    sentences,
    koCount: ko.length,
    stepLabels: [
      "🎧Step 1. 블라인드 리스닝",
      `🧩Step 2. 탭 딕테이션 (0/${en.length})`,
      "🗣️Step 3. 섀도잉 & 낭독",
    ],
  };
}

/** Chapters, for the completion / unlock arithmetic (studentProgress.ts:254-287). */
const CHAPTERS = (INDEX.groups || []).slice(0, 20).map((g, i) => ({
  chapter: i + 1,
  title: g.title || g.label || `Chapter ${i + 1}`,
  lessonIds: (g.lessons || []).filter((x) => /^s\d+-\d+$/.test(x)),
})).map((c) => ({
  ...c,
  requiredCount: Math.max(1, Math.ceil(c.lessonIds.length * 0.8)),
}));

/**
 * Would marking `id` complete make its chapter complete (and therefore raise
 * unlockedThrough, which nothing but the forbidden admin reset can undo)?
 * `lessons` is the server snapshot's lessons map.
 */
function completionWouldUnlock(id, lessons) {
  const chapter = CHAPTERS.find((c) => c.lessonIds.includes(id));
  if (!chapter) return false;
  const done = new Set(
    chapter.lessonIds.filter((x) => lessons && lessons[x] && lessons[x].completed),
  );
  done.add(id);
  const last = chapter.lessonIds[chapter.lessonIds.length - 1];
  return done.size >= chapter.requiredCount && done.has(last);
}

/** Every English sentence in the course, for the "text of another lesson" check. */
function foreignTextIndex() {
  const byText = new Map();
  for (const id of ORDER) {
    for (const item of sentencesOf(lessonFile(id))) {
      const key = lower(item.text);
      if (!byText.has(key)) byText.set(key, new Set());
      byText.get(key).add(id);
    }
  }
  // only texts that belong to exactly one lesson can prove a foreign text
  const unique = [];
  for (const [key, ids] of byText) if (ids.size === 1) unique.push({ key, id: [...ids][0] });
  return unique;
}

module.exports = {
  COURSE,
  INDEX,
  ORDER,
  ROUTE_IDS,
  ROUTE_MISMATCH,
  CHAPTERS,
  lessonFile,
  expectedFor,
  completionWouldUnlock,
  foreignTextIndex,
  norm,
  lower,
  U,
  SR,
  SP,
  PRES,
};
