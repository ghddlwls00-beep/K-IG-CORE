/**
 * 학습 내용 재검토 — 강의 쪽의 '학습자가 보고 듣는 글' 을 판(rev)마다 그려 주는 함수.
 * 읽을거리(packets.cjs)와 표본(sample.cjs)이 같이 쓴다. 화면 코드의 규칙을 그대로 옮김(자리는 각 함수 주석).
 * 소리 글은 지금 코드(2a80bba)의 함수로만 계산한다(firstSlashAlternative · vocaWordSpeech · readingWordSpeech).
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const E = L.loadExpectations();
const listening = L.loadTsModule("src/lib/listeningUtils.ts");
const vocaSpeech = L.loadTsModule("src/lib/vocaSpeech.ts");
const vocaUtils = L.loadTsModule("src/lib/vocaUtils.ts");
const curriculum = L.loadTsModule("src/lib/curriculumPresentation.ts");

const q = (s) => (s == null ? "∅" : JSON.stringify(s));
const blocksOf = (d) => (d && Array.isArray(d.blocks) ? d.blocks : []);
const lessonAt = (rev, course, id) => L.jsonAt(rev, `content/lessons/${course}/${id}.json`);
const listFiles = (course, re) => fs.readdirSync(path.join(L.WT, "content/lessons", course)).filter((f) => re.test(f)).map((f) => f.replace(/\.json$/, ""));

/** STUDENT — StudentLearningView 49 · 57 · 66 · 658(koParas[idx]) · curriculumPresentation 275 */
function student(rev, id) {
  const d = lessonAt(rev, "student", id);
  if (!d) return null;
  const idx = (L.jsonAt(rev, "content/courses/student.json") || { lessons: [] }).lessons.find((l) => l.id === id) || {};
  const sent = blocksOf(d).find((b) => b.type === "sentences");
  const items = (sent && sent.items) || [];
  const ko = blocksOf(d).filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => String(b.text || "").trim());
  const instruction = (blocksOf(d).find((b) => b.type === "instruction") || {}).text || "STUDENT 실전 듣기·읽기 완성 훈련";
  const pres = curriculum.formatLessonPresentation("student", d);
  const presIdx = curriculum.formatLessonPresentation("student", idx);
  return {
    h1: pres.title, instruction, indexTitle: presIdx.title, indexSubtitle: presIdx.subtitle,
    rows: Array.from({ length: Math.max(items.length, ko.length) }, (_, i) => ({
      n: items[i] ? items[i].n : null, en: items[i] ? items[i].text : null,
      spoken: items[i] ? listening.firstSlashAlternative(items[i].text) : null, ko: ko[i] == null ? null : ko[i],
    })),
  };
}

/** GRAMMAR — GrammarLearningView 168~222: 두 쪽의 sentences 문항을 차례(i)로 짝, 한글이 있는 쪽이 한국어 · numberLabel = m.n || p.n */
function grammarPair(rev, course, mainId, pairId) {
  const m = lessonAt(rev, course, mainId), p = pairId ? lessonAt(rev, course, pairId) : null;
  if (!m) return null;
  const items = (d) => blocksOf(d).filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
  const mi = items(m), pi = items(p);
  const hasKo = (t) => /[가-힣]/.test(String(t || ""));
  const rows = [];
  for (let i = 0; i < Math.max(mi.length, pi.length); i++) {
    const a = mi[i], b = pi[i];
    const [ko, en] = hasKo(a && a.text) ? [a, b] : [b, a];
    rows.push({ i: i + 1, label: (a && a.n) || (b && b.n) || String(i + 1), ko: ko ? ko.text : null, en: en ? en.text : null, alts: (en && en.alternatives) || [], koN: ko && ko.n, enN: en && en.n });
  }
  const summary = course === "grammar1" ? (/^gh1-02[01]$/.test(mainId) ? blocksOf(m).filter((b) => b.type === "instruction").map((b) => b.text) : []) : [];
  return { rows, counts: [mi.length, pi.length], ruleSummary: summary };
}
/** GRAMMAR 한 묶음의 쪽 짝들: G1 = 짝수(한국어) ↔ 홀수(영어) 같은 가지 · G2 = gh2-NNN ↔ gh2-NNN-1 */
function grammarGroupPairs(course, baseNum) {
  const pad = (n) => String(n).padStart(3, "0");
  if (course === "grammar1") {
    const ko = listFiles("grammar1", new RegExp(`^gh1-${pad(baseNum)}(-\\d+)?\\.json$`));
    return ko.map((k) => { const suf = k.slice(`gh1-${pad(baseNum)}`.length); return [k, `gh1-${pad(baseNum + 1)}${suf}`]; });
  }
  const files = listFiles("grammar2", new RegExp(`^gh2-${pad(baseNum)}(-\\d+)?\\.json$`)).sort();
  const main = files.find((f) => f === `gh2-${pad(baseNum)}`);
  return main ? [[main, files.find((f) => f !== main) || null]] : [];
}

/** LISTENING — 대본(ld_english_scripts) · 본문 쪽 힌트(LdLearningView 60~144 = expectations hintChunks · hintsForSentence) */
function ldLesson(rev, base) {
  const scripts = L.jsonAt(rev, "content/ld_english_scripts.json") || {};
  const rows = scripts[base] || [];
  const main = lessonAt(rev, "ld", base);
  const hintsBlock = blocksOf(main).find((b) => b.type === "hints" && String(b.text || "").trim());
  const chunks = hintsBlock ? E.hintChunks(hintsBlock.text) : [];
  return { hints: hintsBlock ? hintsBlock.text : null, rows: rows.map((r) => ({ n: r.n, en: r.en, ko: r.ko, chips: E.hintsForSentence(String(r.en || ""), chunks) })) };
}

/** READING — ReadingLearningView 200~257 · 794~838: 그 쪽 파일의 readingSentences · 14장 readingVocabulary */
function readingLesson(rev, id) {
  const d = lessonAt(rev, "reading", id);
  if (!d) return null;
  return {
    sentences: (d.readingSentences || []).map((s) => ({ id: s.id, en: s.english, ko: s.korean })),
    cards: (d.readingVocabulary || []).map((v) => ({ word: v.word, pos: v.partOfSpeech, lemma: v.lemma && v.lemma.toLowerCase() !== String(v.word).toLowerCase() ? v.lemma : null, ko: v.korean, spoken: vocaSpeech.readingWordSpeech(v.word, v.korean) })),
  };
}

/** VOCA — page.tsx 228~231 getVocaDictionaryForWords · PhonicsLearningView 94~101 뜻 · vocaWordSpeech 소리 · 426~434 연어 · 420 어원 */
function vocaLesson(rev, id) {
  const d = lessonAt(rev, "phonics", id);
  if (!d) return null;
  const dict = L.jsonAt(rev, "content/voca_dictionary.json") || {};
  const g = blocksOf(d).find((b) => b.type === "wordgrid");
  const words = g ? g.rows.flat().map((w) => String(w || "").trim()).filter(Boolean) : [];
  return words.map((w) => {
    const key = dict[w] ? w : dict[w.toLowerCase()] ? w.toLowerCase() : null;
    const entry = key ? dict[key] : null;
    const col = vocaUtils.getCollocation(w, entry && entry.searchWord);
    const ety = typeof vocaUtils.analyzeEtymology === "function" ? vocaUtils.analyzeEtymology(w) : null;
    return { word: w, key, meaning: entry ? entry.meaning : null, spoken: vocaSpeech.vocaWordSpeech(w), collocation: col || null, etymology: ety || null };
  });
}

module.exports = { E, listening, vocaSpeech, vocaUtils, curriculum, q, student, grammarPair, grammarGroupPairs, ldLesson, readingLesson, vocaLesson, lessonAt, listFiles };
