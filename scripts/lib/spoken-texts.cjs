/**
 * 앱이 소리 내는 글 — 한 곳에서 정한다 (7단계 7-2).
 *
 * 전에는 네 곳이 따로 정했다: 생성기(scripts/generate-azure-ava.mjs)와 무료 소리 키(scripts/buildFreeSpeechKeys.mjs)는 강의 JSON 의
 * text · en · ko · english · korean · word · lemma · phrase · meaning · searchWord 칸을 모두 모았고, 감사 도구
 * (docs/qa-2026-09-18/scripts/lib/expectations.cjs clipTexts → audio-inventory · audio-check, check-changed-clips)는 또 다르게 모았다.
 * 그래서 앱이 한 번도 부르지 않는 글(READING 한국어 · GRAMMAR 한국어 · VOCA 뜻 · 안내문)의 클립을 만들고 세었다 —
 * 6단계 끝 생성기 pending 1,610 중 약 893, 감사 목록 19,816 중 STUDENT 밖 한국어 4,061.
 *
 * 근거는 화면 코드가 소리를 부르는 곳(speakText · playSentenceQueue)이 넘기는 글이다:
 *   STUDENT   StudentLearningView — 영어 문장(sentences.items.text) · 한국어 해석(paragraph lang "ko") — startSentence(…, kind "en" | "ko")
 *   VOCA      PhonicsLearningView:143 · :183 vocaSpeechForm(격자 낱말) · :643 연어 카드 selectedCollocation.phrase
 *   GRAMMAR   GrammarLearningView:361 playEnglish(item.englishText) — 영어 문항만(한국어 쪽 강의는 짝 강의의 영어)
 *   LISTENING LdLearningView:317 playText(….en · card.original) · :335 allEnglishSentences — 대본(ld_english_scripts)의 영어와 연음 카드 original
 *   READING   ReadingLearningView:421 playSentenceEn(pair.en) · :438 playWordAudio(kw.word) — 문장 영어 · 카드 낱말
 *   위 '전체 듣기' — page.tsx 가 src/lib/lessonAudioText.ts extractSentencesForAudio 로 만든 fallbackSentences 를 AudioPlayer 가 소리 낸다
 *            (CNN 밖에서는 늘 합성 음성 모드 — shouldUseUnifiedSpeech). 대개 위 목록 안의 영어지만 추측하지 않고 **그 함수를 그대로 돌려** 더한다
 *            (그렇게 해서 찾은 것: gh1-084 가 한국어 문제 31개를 영어로 여겨 읽던 BUG-026 — 고침). 보이는 조건은 page.tsx 대로
 *            (STUDENT 는 녹음이 하나일 때만).
 * 한국어를 소리 내는 것은 STUDENT 뿐이다.
 * 주소가 있는 6개 과정만(src/lib/generated/validRoutes.json) — CNN(원래 방송 음성) · 폐지된 옛 과정은 소리를 부르는 화면이 없다.
 * 부르는 쪽은 그 과정 안에서도 **주소가 있는 쪽만** 돌린다(validRoutes.lessons[과정]) — ld/LD_001 처럼 폴더에 있어도 열리지 않는
 * 파일은 소리 낼 곳이 없다(7-2 재점검: 생성기가 그 파일의 한국어 3줄을 세고 있었다). 짝은 어느 파일에서든 빌려 온다.
 *
 * spokenTexts 는 날것의 글을 돌려준다(VOCA 는 vocaSpeechForm 을 거친 말하는 꼴). 정규화 · 키는 부르는 쪽이
 * src/lib/unifiedSpeech.ts 로 — 앱과 같은 것으로 — 한다. 함수(getCollocation · generateLiaisonPoints · vocaSpeechForm)도
 * 부르는 쪽이 src 에서 불러 넘긴다(여기서 다시 만들지 않음).
 * STUDENT 영어 문장은 빗금 두 꼴 중 첫 꼴로 말한다(BUG-028 · 소유자 결정 2026-09-24 — listeningUtils firstSlashAlternative:
 * StudentLearningView 의 문장 재생 · 전체 재생 · 속도 바꿈, page.tsx 가 extractSentencesForAudio 에 넘기는 것과 같은 함수).
 * VOCA 단어 단추는 vocaSpeech vocaWordSpeech 로 말한다(7단계 7-6 · 소유자 결정 2026-09-24 — 발음이 뜻 따라 다른 20낱말은
 * `<낱말> ⟨<IPA>⟩` 로 새 클립 이름, 나머지는 vocaSpeechForm 그대로 — PhonicsLearningView playWord · playRow, 위 플레이어).
 */
const SPOKEN_COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"];
const isKo = (s) => /[가-힣]/.test(String(s || ""));
/** GrammarLearningView · page.tsx cleanText 와 같은 것 — 앞 번호 "1. " 와 " / " */
const cleanText = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const blocksOf = (d) => (d && Array.isArray(d.blocks) ? d.blocks : []);
const itemsOf = (d) => blocksOf(d).filter((b) => b && b.type === "sentences").flatMap((b) => b.items || []);
const gridWords = (d) => {
  const g = blocksOf(d).find((b) => b && b.type === "wordgrid");
  return g && Array.isArray(g.rows) ? g.rows.flat().map((w) => String(w || "").trim()).filter(Boolean) : [];
};

/**
 * 강의 쪽의 짝 — src/lib/content.ts getLessonContext 의 짝 규칙을 옮긴 것(본문 'main' ↔ '<id>-N' 대본 'script' · GRAMMAR I 짝수 ↔ 홀수).
 * index: content/courses/<course>.json 의 lessons([{id, variant}]). 규칙이 바뀌면 docs/qa-2026-09-18/scripts/check-unreached-data.cjs 의
 * 코드 자리 확인이 멈춘다.
 */
function pairIdOf(course, id, index) {
  const current = index.find((l) => l.id === id);
  let pairId = current && current.variant === "main"
    ? (index.find((l) => l.variant === "script" && l.id.startsWith(`${id}-`)) || {}).id
    : (index.find((l) => l.variant === "main" && id.startsWith(`${l.id}-`)) || {}).id;
  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10), sub = m[2] || "", pad = (n) => String(n).padStart(3, "0");
      const other = num % 2 === 0 ? num + 1 : num - 1;
      if (index.some((l) => l.id === `gh1-${pad(other)}${sub}`)) pairId = `gh1-${pad(other)}${sub}`;
      else if (index.some((l) => l.id === `gh1-${pad(other)}`)) pairId = `gh1-${pad(other)}`;
    }
  }
  return pairId || null;
}

/**
 * 강의 쪽 하나가 소리 낼 수 있는 글.
 * @param {{course: string, id: string, lesson: object, pair?: object|null, ldScripts?: object, dictionary?: object,
 *          fns: {vocaSpeechForm: Function, getCollocation: Function, generateLiaisonPoints: Function, extractSentencesForAudio: Function,
 *                firstSlashAlternative: Function, vocaWordSpeech: Function}}} a
 *   pair 는 그 쪽의 짝 강의(pairIdOf) — 위 플레이어 · GRAMMAR · READING 이 짝의 글을 쓴다.
 * @returns {string[]}
 */
const FNS = ["vocaSpeechForm", "getCollocation", "generateLiaisonPoints", "extractSentencesForAudio", "firstSlashAlternative", "vocaWordSpeech"];
/** page.tsx 와 같은 선택 — 이 과정의 항목을 어떻게 말하나(위 플레이어에 넘김) */
const speechFormFor = (course, fns) => (course === "student" ? fns.firstSlashAlternative : course === "phonics" ? fns.vocaWordSpeech : undefined);
function spokenTexts({ course, id, lesson, pair = null, ldScripts = {}, dictionary = {}, fns }) {
  if (!fns || FNS.some((k) => typeof fns[k] !== "function")) {
    throw new Error(`spokenTexts: fns(${FNS.join(" · ")})를 src 에서 불러 넘겨야 함`);
  }
  const out = [];
  const add = (t) => { if (typeof t === "string" && t.trim()) out.push(t); };
  // 위 '전체 듣기' — page.tsx 와 같은 입력으로 그 함수를 그대로
  const audio = (lesson && Array.isArray(lesson.audio) ? lesson.audio : []).filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  if (course !== "student" || audio.length === 1) {
    const base = (s) => String(s).replace(/-1$/, "");
    const script = course === "ld" ? (ldScripts[base(id)] || (pair && pair.id ? ldScripts[base(pair.id)] : null) || null) : null;
    const reading = (lesson && lesson.readingSentences) || (pair && pair.readingSentences) || null;
    for (const t of fns.extractSentencesForAudio(blocksOf(lesson), pair ? blocksOf(pair) : null, Boolean(lesson && lesson.variant === "script"), course, script, reading, speechFormFor(course, fns)) || []) add(t);
  }
  if (course === "student") {
    for (const it of itemsOf(lesson)) if (it && typeof it.text === "string") add(fns.firstSlashAlternative(it.text));
    for (const b of blocksOf(lesson)) if (b && b.type === "paragraph" && b.lang === "ko") add(b.text);
  } else if (course === "grammar1" || course === "grammar2") {
    for (const d of [lesson, pair]) for (const it of itemsOf(d)) if (it && it.text && !isKo(it.text)) add(cleanText(it.text));
  } else if (course === "ld") {
    const base = String(id).replace(/-1$/, "");
    const rows = ldScripts[base] || (pair && pair.id ? ldScripts[String(pair.id).replace(/-1$/, "")] : null) || [];
    for (const r of rows) {
      if (!r || !r.en) continue;
      add(r.en);
      for (const card of fns.generateLiaisonPoints(String(r.en)) || []) if (card) add(card.original);
    }
  } else if (course === "reading") {
    const pick = (k) => (lesson && Array.isArray(lesson[k]) && lesson[k].length ? lesson[k] : (pair && Array.isArray(pair[k]) ? pair[k] : []));
    for (const s of pick("readingSentences")) add(s && s.english);
    for (const v of pick("readingVocabulary")) add(v && v.word);
  } else if (course === "phonics") {
    for (const w of gridWords(lesson)) {
      add(fns.vocaWordSpeech(w));
      const entry = dictionary[w] || dictionary[w.toLowerCase()] || null;
      const col = fns.getCollocation(w, entry && entry.searchWord);
      if (col) add(col.phrase);
    }
  }
  return out;
}

module.exports = { SPOKEN_COURSES, spokenTexts, pairIdOf, isKo, cleanText, itemsOf, gridWords };
