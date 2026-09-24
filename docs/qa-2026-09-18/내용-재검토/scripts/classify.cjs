#!/usr/bin/env node
/**
 * 학습 내용 재검토 1 — 목록.jsonl 의 줄마다 '화면 · 소리에 닿음 / 안 닿음' 을 가른다.
 *
 * 두 가지를 같이 본다:
 *  (가) expectations.cjs · spoken-texts.cjs — 그 줄의 지금 글이 관련 강의 쪽의 기대 글(texts) · 정답(answers · alternatives) ·
 *      소리 글(clipTexts)에 들어 있나. (이 작업 트리로 불러옴 — lib.cjs loadExpectations)
 *  (나) 칸 규칙 — 화면 코드가 그 칸을 그리는지(아래 RULES, 코드 자리를 근거로 적음). expectations 는 화면의 일부만 모형으로 가진다
 *      (VOCA 뜻 · READING 카드 품사 · STUDENT 제목 · GRAMMAR I 단계 이름 · READING 본문 쪽 한국어는 기대 글에 없음) — 그래서
 *      판정은 (나)로 하고, (가)와 다른 줄은 '모형 차이' 로 세어 까닭을 기록.md 에 적는다.
 *  없어진 줄은 지금 판에 글이 없으므로 (나)로만 — 기준 판에서 그 칸이 화면에 닿던 칸이었나.
 *
 * 또: 같은 강의(짝 포함) 안에서 없어진 글과 새로 생긴 글이 **글자까지 같으면** '옮김' 으로 짝지음(블록 합치기 · 문단 → 대체 답안).
 * 쓰는 것: 분류.json (id → 닿음 · 칸 · 근거 · 일꾼 조각 · 강의 묶음 · 옮김 · 모형) · 표준 출력에 요약.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const LIST = path.join(L.DIR, "목록.jsonl");
const OUT = path.join(L.DIR, "분류.json");
const recs = L.readJsonl(LIST);
L.preloadJson([...new Set(recs.map((r) => r.file).filter((f) => f.endsWith(".json")))]);
const E = L.loadExpectations();
const vocaUtils = L.loadTsModule("src/lib/vocaUtils.ts");

// ── 강의 쪽 기대 글 · 파일 ↔ 쪽 관계 (지금 판) ─────────────────────────────
const pageSets = new Map();
const rel = new Map(); // "course/id" | "ldscript/dNNN" | "voca/<key>" → Set(page)
const addRel = (k, p) => { if (!rel.has(k)) rel.set(k, new Set()); rel.get(k).add(p); };
const headDict = L.jsonAt(L.HEAD, "content/voca_dictionary.json");
const baseDict = L.jsonAt(L.BASE, "content/voca_dictionary.json");
const dictKey = (dict, w) => { const written = String(w).trim(); if (dict[written]) return written; const lower = written.toLowerCase(); return dict[lower] ? lower : null; };
const gridWordsOf = (d) => { const g = ((d && d.blocks) || []).find((b) => b.type === "wordgrid"); return g ? g.rows.flat().map((w) => String(w || "").trim()).filter(Boolean) : []; };
for (const course of E.COURSES) {
  for (const p of E.pages(course)) {
    const key = `${course}/${p.id}`;
    const ex = E.expected(course, p.id);
    const set = new Set();
    for (const t of ex.texts) set.add(L.clean(t.text));
    for (const a of ex.answers) { set.add(L.clean(a.text)); for (const alt of a.alternatives || []) set.add(L.clean(alt)); }
    for (const c of ex.clipTexts) set.add(L.clean(c));
    pageSets.set(key, set);
    addRel(key, key);
    if (ex.pairId) addRel(`${course}/${ex.pairId}`, key);
    if (course === "ld") addRel(`ldscript/${p.id.replace(/-1$/, "")}`, key);
    if (course === "phonics") for (const w of gridWordsOf(E.lesson("phonics", p.id))) { const k = dictKey(headDict, w); if (k) addRel(`voca/${k}`, key); }
  }
}
// 기준 판 VOCA 격자(없어진 뜻 줄이 그때 화면에 닿던 낱말이었나)
const phonicsIds = E.pages("phonics").map((p) => p.id);
L.preloadJson(phonicsIds.map((id) => `content/lessons/phonics/${id}.json`));
const baseGridKeys = new Map();
for (const id of phonicsIds) for (const w of gridWordsOf(L.jsonAt(L.BASE, `content/lessons/phonics/${id}.json`))) { const k = dictKey(baseDict, w); if (k) { if (!baseGridKeys.has(k)) baseGridKeys.set(k, new Set()); baseGridKeys.get(k).add(`phonics/${id}`); } }

function inPages(pages, s) {
  if (s == null) return null;
  const cands = new Set([L.clean(s), L.clean(L.cleanItemText(s))]);
  for (const p of pages) { const set = pageSets.get(p); if (!set) continue; for (const c of cands) if (c && set.has(c)) return true; }
  return false;
}
function hintInPages(pages, s) {
  if (s == null) return null;
  const chunks = E.hintChunks(s);
  for (const p of pages) { const set = pageSets.get(p); if (!set) continue; if (set.has(L.clean(s))) return true; for (const c of chunks) if (set.has(c)) return true; }
  return false;
}

// ── 칸 규칙 ───────────────────────────────────────────────────────────
const R = (reach, basis) => ({ reach, basis });
function blockOf(file, toks) {
  const bt = toks[1] || {};
  const doc = bt.was !== undefined ? L.jsonAt(L.BASE, file) : L.jsonAt(L.HEAD, file);
  const idx = bt.was !== undefined ? bt.was : bt.i;
  return doc && doc.blocks ? doc.blocks[idx] : undefined;
}
function ruleFor(rec) {
  const f = rec.file;
  const toks = L.parsePath(rec.path);
  let m = f.match(/^content\/lessons\/([^/]+)\/([^/]+)\.json$/);
  if (m) {
    const [, course, id] = m;
    const top = toks[0] && toks[0].k;
    if (top === "blocks") {
      const block = blockOf(f, toks);
      const btype = block ? block.type : "?";
      const sub = toks.slice(2).filter((t) => t.k !== undefined).map((t) => t.k).join(".");
      const field = `${course}.${btype}.${sub}`;
      if (sub === "type" || sub === "lang") return { field, ...R(false, "블록 종류 · 언어 표시 칸(글 아님) — 블록의 글 줄에서 함께 봄") };
      if (course === "student") {
        if (btype === "sentences" && sub === "items.text") return { field, ...R(true, "StudentLearningView 49 문장 · 소리(firstSlashAlternative) · 받아쓰기 타일") };
        if (btype === "sentences" && sub === "items.n") return { field, ...R(true, "StudentLearningView 676 문장 번호 표시") };
        if (btype === "paragraph" && sub === "text") { const ko = block && block.lang === "ko"; return { field, ...R(ko, ko ? "StudentLearningView 57 한국어 해석 · 🔈 한국어 소리" : "lang 이 ko 가 아닌 문단 — StudentLearningView 57 이 안 그림") }; }
        if (btype === "instruction" && sub === "text") return { field, ...R(true, "StudentLearningView 66 · 485 제목줄(h2)") };
      }
      if (course === "grammar1" || course === "grammar2") {
        if (btype === "sentences" && sub === "items.text") return { field, ...R(true, "GrammarLearningView 168~222 문항 · 영어는 소리(playEnglish)와 채점") };
        if (btype === "sentences" && sub === "items.alternatives") return { field, ...R(true, "GrammarLearningView 474 · 752 채점 · 927 · 1279 '다른 정답' 화면") };
        // (처음엔 '차례로 번호를 매김' 으로 안 닿음이라 했다 — 안 닿음 20줄 확인에서 C04704 가 걸려 코드를 다시 봄: numberLabel = m?.n || p?.n)
        if (btype === "sentences" && sub === "items.n") return { field, ...R(true, "GrammarLearningView 219 numberLabel(저장된 n) · 770 · 962 · 1094 · 1219 문항 번호 표시") };
        if (btype === "instruction" && sub === "text") { const rule = course === "grammar1" && /^gh1-02[01]$/.test(id); return { field, ...R(rule, rule ? "GrammarLearningView 144~165 gh1-020/021 문법 확인 요약" : "GrammarLearningView 는 gh1-020/021 밖에서 instruction 을 안 그림") }; }
        return { field, ...R(false, `GrammarLearningView 는 ${btype} 블록을 안 그림(9d6e15d 판도 같음)`) };
      }
      if (course === "ld") {
        if (btype === "hints" && sub === "text") { const main = !/-1$/.test(id); return { field, ...R(main, main ? "LdLearningView 60~144 본문 쪽 받아쓰기 힌트 칩" : "힌트는 본문 쪽 파일 것만 씀(LdLearningView 57 · 60)") }; }
        return { field, ...R(false, `LISTENING ${btype} 블록 — 대본(ld_english_scripts)이 276강 모두 있어 대체 길(LdLearningView 147~178)을 안 씀 · BUG-013 안내문 뺌`) };
      }
      if (course === "reading") return { field, ...R(false, `READING ${btype} 블록 — readingSentences 가 512쪽 모두 있어 대체 길(ReadingLearningView 189~232)만`) };
      if (course === "phonics") {
        if (btype === "wordgrid") return { field, ...R(true, "PhonicsLearningView 31 낱말 격자 · 소리(vocaWordSpeech)") };
        return { field, ...R(false, `PhonicsLearningView 는 ${btype} 블록을 안 그림`) };
      }
      return { field, ...R(false, "규칙 없음") };
    }
    if (top === "readingSentences") {
      const sub = toks.slice(2).filter((t) => t.k !== undefined).map((t) => t.k).join(".");
      const field = `reading.sentence.${sub}`;
      if (sub === "english") return { field, ...R(true, "ReadingLearningView 200~225 영어 문장 · 소리(playSentenceEn)") };
      if (sub === "korean") return { field, ...R(true, "ReadingLearningView 227~232 · 726 · 1206 · 1232 한국어(본문 · 대본 쪽 모두)") };
      return { field, ...R(false, "문장 id 칸(글 아님)") };
    }
    if (top === "readingVocabulary") {
      const sub = toks.slice(2).filter((t) => t.k !== undefined).map((t) => t.k).join(".");
      const field = `reading.vocab.${sub}`;
      if (sub === "word") return { field, ...R(true, "ReadingLearningView 803 카드 낱말 · 소리(readingWordSpeech)") };
      if (sub === "korean") return { field, ...R(true, "ReadingLearningView 838 카드 뜻 · 뜻이 소리(발음 규칙)를 고름") };
      if (sub === "partOfSpeech") return { field, ...R(true, "ReadingLearningView 800 카드 품사") };
      if (sub === "lemma") {
        const toksKey = toks.find((t) => t.key === "word");
        const w = toksKey ? toksKey.val : "";
        const shown = rec.before != null && rec.before.toLowerCase() !== w.toLowerCase() || rec.after != null && rec.after.toLowerCase() !== w.toLowerCase();
        return { field, ...R(shown, shown ? "ReadingLearningView 811~813 '← 기본형'(낱말과 다를 때만)" : "기본형이 낱말과 같아 안 그림(811)") };
      }
      if (sub === "examTags.*" || sub === "examTags" || sub === "reason") return { field, ...R(false, "keywords 에 담기만 하고 안 그림(ReadingLearningView 251 · 252)") };
      return { field, ...R(false, "규칙 없음") };
    }
    if (top === "chunkDrills") return { field: `${course}.chunkDrills`, ...R(false, "BUG-024 소유자 결정 '다 지워' — StudentLearningView 는 chunkDrills 를 받지 않음(page.tsx 430)") };
    if (top === "title" || top === "label" || top === "menuLabel") {
      const field = `${course}.lesson.${top}`;
      if (course === "student" && top === "title") return { field, ...R(true, "curriculumPresentation 275 'Part N · 제목' → 강의 쪽 h1") };
      if (course === "student" && top === "menuLabel") { const d = L.jsonAt(L.HEAD, f); const shown = d && !d.title; return { field, ...R(shown, shown ? "제목이 비어 menuLabel 이 h1" : "제목이 있어 menuLabel 은 메타 설명(page.tsx 91)에만 — 화면 밖") }; }
      return { field, ...R(false, `${course} 강의 제목은 번호로 만듦(curriculumPresentation) — ${top} 는 화면에 안 씀(menuLabel 은 메타 설명만)`) };
    }
    if (top === "audio") return { field: `${course}.audio.label`, ...R(false, "위 플레이어가 하나라 label 을 안 씀(page.tsx 366)") };
    return { field: `${course}.${top}`, ...R(false, "규칙 없음") };
  }
  if (f === "content/ld_english_scripts.json") {
    const sub = toks.slice(2).filter((t) => t.k !== undefined).map((t) => t.k).join(".");
    const field = `ld.script.${sub}`;
    if (sub === "en") return { field, ...R(true, "LdLearningView 169~178 대본 영어 · 받아쓰기 정답 · 소리") };
    if (sub === "ko") return { field, ...R(true, "LdLearningView 대본 쪽 한국어") };
    return { field, ...R(false, "번호 칸") };
  }
  if (f === "content/voca_dictionary.json") {
    const mm = rec.path.match(/^\.(.+)\.(meaning|searchWord)$/);
    const word = mm ? mm[1] : "";
    const sub = mm ? mm[2] : "?";
    const field = `voca.dict.${sub}`;
    const inGrid = rec.after != null ? (rel.get(`voca/${word}`) || new Set()).size > 0 : (baseGridKeys.get(word) || new Set()).size > 0;
    if (sub === "meaning") return { field, word, ...R(inGrid, inGrid ? "PhonicsLearningView 94~101 · 889 · 1191 낱말 뜻(카드 · 퀴즈)" : "어느 VOCA 격자에도 없는 낱말 — 뜻을 그릴 쪽이 없음(page.tsx 228~231)") };
    if (sub === "searchWord") {
      const before = vocaUtils.getCollocation(word, rec.before || undefined);
      const after = vocaUtils.getCollocation(word, rec.after || undefined);
      const differs = JSON.stringify(before) !== JSON.stringify(after);
      const reach = inGrid && differs;
      return { field, word, collocation: { before: before && before.phrase, after: after && after.phrase }, ...R(reach, reach ? "PhonicsLearningView 426~434 연어 카드가 바뀜" : inGrid ? "연어 카드가 전후 같음(getCollocation) — 화면 차이 없음" : "격자에 없는 낱말") };
    }
  }
  m = f.match(/^content\/courses\/([^/.]+)\.json$/);
  if (m) {
    const course = m[1];
    const sub = toks.filter((t) => t.k !== undefined).map((t) => t.k).join(".");
    const field = `${course}.index.${sub}`;
    if (course === "student" && sub === "lessons.title") return { field, ...R(true, "과정 목록 CourseDashboard 140 제목(Part N · 제목)") };
    if (course === "student" && sub === "lessons.label") return { field, ...R(true, "과정 목록 CourseDashboard 145 부제목") };
    if (course === "student" && sub === "lessons.menuLabel") return { field, ...R(false, "제목이 있어 과정 목록에 안 씀(curriculumPresentation 275)") };
    if (/^groups\./.test(sub)) return { field, ...R(true, "과정 목록 단계 이름(formatGroupTitle)") };
    return { field, ...R(false, `${course} 과정 목록 제목은 번호로 만듦(curriculumPresentation) — ${sub} 안 씀`) };
  }
  if (/^src\/lib\/reading(Sentences|Vocabulary)\.json$/.test(f)) return { field: "reading.mirror", ...R(false, "앱이 부르지 않는 모음 파일(readingUtils.ts 1~18 ISS-00 — 빌드 · 감사 도구만)") };
  if (f === "src/lib/curriculumPresentation.ts") return { field: "grammar1.presentation", ...R(true, "과정 목록 단계 이름 · 강의 부제목(CourseDashboard 140 · 145)") };
  if (f === "src/lib/vocaSpeech.ts") {
    if (/^VOCA_SPEECH_FORMS/.test(rec.path)) { const key = /\(열쇠\)/.test(rec.path); return { field: "vocaSpeech.speechForm", ...R(!key, key ? "표의 열쇠(화면 낱말) — 값 줄에서 봄" : "VOCA 낱말 소리 글") }; }
    if (/^VOCA_PRONUNCIATIONS/.test(rec.path)) return { field: "vocaSpeech.vocaIpa", ...R(true, "VOCA 단어 단추 소리(vocaWordSpeech) — IPA") };
    if (/^READING_PRONUNCIATIONS/.test(rec.path)) return { field: /> ipa #/.test(rec.path) ? "vocaSpeech.readingIpa" : "vocaSpeech.readingRule", ...R(true, "READING 카드 소리(readingWordSpeech) — 카드 뜻 규칙 → IPA") };
    return { field: "vocaSpeech.code", ...R(false, "함수 안의 틀 · 정규식(코드) — 소리 결과는 표 줄에서 봄") };
  }
  return { field: "?", ...R(false, "규칙 없음") };
}

// ── 일꾼 조각 · 강의 묶음 ─────────────────────────────────────────────
// 강의 번호: gh1-085 → 85 · gh2-048-1 → 48 · d001-1 → 1 · pr128 → 128 ('gh1' 의 1 을 읽지 않게)
const num = (s) => { const m = String(s).match(/^(?:gh[12]-|d|pr|hv-|mv\d-)?(\d+)/); return m ? parseInt(m[1], 10) : 0; };
function groupOf(rec, info) {
  const f = rec.file;
  if (f === "content/voca_dictionary.json" || /lessons\/phonics\//.test(f) || f === "src/lib/vocaSpeech.ts") {
    if (f === "src/lib/vocaSpeech.ts") return { chunk: "voca", group: /^READING/.test(rec.path) ? "발음표-READING" : "발음표-VOCA" };
    if (/lessons\/phonics\//.test(f)) return { chunk: "voca", group: `phonics/${rec.lesson}` };
    const pages = [...(rel.get(`voca/${info.word}`) || baseGridKeys.get(info.word) || [])].sort();
    return { chunk: "voca", group: pages.length ? pages[0] : "voca/격자밖" };
  }
  if (rec.course === "student") return { chunk: "student", group: `student/${rec.lesson || "과정목록"}` };
  if (rec.course === "grammar1") {
    const id = rec.lesson || "";
    const n = num(id);
    const base = n % 2 === 1 ? n - 1 : n;
    const chunk = f === "src/lib/curriculumPresentation.ts" ? "grammar1-a" : base <= 62 ? "grammar1-a" : "grammar1-b";
    return { chunk, group: f === "src/lib/curriculumPresentation.ts" ? "grammar1/단계이름" : `grammar1/gh1-${String(base).padStart(3, "0")}` };
  }
  if (rec.course === "grammar2") return { chunk: "grammar2", group: `grammar2/gh2-${String(num(rec.lesson)).padStart(3, "0")}` };
  if (rec.course === "ld") { const n = num(rec.lesson); return { chunk: n <= 138 ? "ld-a" : "ld-b", group: `ld/d${String(n).padStart(3, "0")}` }; }
  if (rec.course === "reading") { const n = num(rec.lesson); return { chunk: n <= 128 ? "reading-a" : "reading-b", group: `reading/pr${String(n).padStart(3, "0")}` }; }
  return { chunk: "기타", group: "기타" };
}

// ── 돌리기 ───────────────────────────────────────────────────────────
const out = {};
for (const rec of recs) {
  const r = ruleFor(rec);
  const g = groupOf(rec, r);
  // (가) 모형: 지금 글이 관련 쪽의 기대 · 정답 · 소리 글에 있나 (없어진 줄은 null)
  let pages = [];
  let m;
  if ((m = rec.file.match(/^content\/lessons\/([^/]+)\/([^/]+)\.json$/))) pages = [...(rel.get(`${m[1]}/${m[2]}`) || [])];
  else if (rec.file === "content/ld_english_scripts.json") pages = [...(rel.get(`ldscript/${rec.lesson}`) || [])];
  else if (rec.file === "content/voca_dictionary.json" && r.word) pages = [...(rel.get(`voca/${r.word}`) || [])];
  let exp = null;
  if (rec.after != null && pages.length) exp = /\.hints\.text$/.test(r.field) ? hintInPages(pages, rec.after) : inPages(pages, rec.after);
  out[rec.id] = { 닿음: r.reach, 칸: r.field, 근거: r.basis, 조각: g.chunk, 묶음: g.group, 쪽: pages.sort(), 모형: exp, ...(r.collocation ? { 연어: r.collocation } : {}) };
}
// 옮김: 같은 강의 묶음 안에서 없어진 글 ↔ 새로 생긴 글이 글자까지 같으면 하나씩 짝.
//  1차: 6글자 이상인 글만(문장 · 대체 답안 · 문단). 2차: 짧은 글(번호 n · 품사 'v.' · 기본형)은 1차에서 짝지은 문항 · 카드의
//  같은 자리 칸끼리만 — 짧은 글을 글자만으로 짝지으면 다른 카드의 품사 'v.' 끼리 '옮김' 이 됨(처음 판 읽을거리에서 봄).
const byGroup = new Map();
for (const rec of recs) { const g = out[rec.id].묶음; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(rec); }
let moved = 0;
const container = (p) => p.replace(/\.[^.[\]]+(\[(?:was )?\d+\])?$/, "");
const leaf = (p) => { const m = p.match(/\.([^.[\]]+)(\[(?:was )?\d+\])?$/); return m ? m[1] : ""; };
for (const [, list] of byGroup) {
  const added = new Map();
  for (const r of list) if (r.kind === "added") { const k = L.clean(r.after); if (!added.has(k)) added.set(k, []); added.get(k).push(r); }
  const pairedContainers = new Map(); // "file|removed container" → "file|added container"
  for (const r of list) {
    if (r.kind !== "removed" || L.clean(r.before).length < 6) continue;
    const cands = added.get(L.clean(r.before));
    if (!cands || !cands.length) continue;
    const i = cands.findIndex((a) => a.file === r.file || out[a.id].조각 === out[r.id].조각);
    if (i < 0) continue;
    const a = cands.splice(i, 1)[0];
    out[r.id].옮김 = a.id; out[a.id].옮김 = r.id; moved++;
    if (leaf(r.path) === "text" || leaf(r.path) === "word") pairedContainers.set(`${r.file}|${container(r.path)}`, `${a.file}|${container(a.path)}`);
  }
  for (const r of list) {
    if (r.kind !== "removed" || out[r.id].옮김 || L.clean(r.before).length >= 6) continue;
    const to = pairedContainers.get(`${r.file}|${container(r.path)}`);
    if (!to) continue;
    const cands = added.get(L.clean(r.before)) || [];
    const i = cands.findIndex((a) => `${a.file}|${container(a.path)}` === to && leaf(a.path) === leaf(r.path));
    if (i < 0) continue;
    const a = cands.splice(i, 1)[0];
    out[r.id].옮김 = a.id; out[a.id].옮김 = r.id; moved++;
  }
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/},"C/g, '},\n"C'));
// 요약
const sum = { 줄: recs.length, 닿음: 0, 안닿음: 0, 옮김짝: moved, 조각별: {}, 칸별: {}, 모형차이: { 규칙닿음_모형없음: 0, 규칙안닿음_모형있음: 0 } };
const diffSamples = { 규칙닿음_모형없음: {}, 규칙안닿음_모형있음: {} };
for (const rec of recs) {
  const o = out[rec.id];
  if (o.닿음) sum.닿음++; else sum.안닿음++;
  const c = (sum.조각별[o.조각] = sum.조각별[o.조각] || { 닿음: 0, 안닿음: 0, 옮김: 0 });
  c[o.닿음 ? "닿음" : "안닿음"]++; if (o.옮김) c.옮김++;
  const f = (sum.칸별[o.칸] = sum.칸별[o.칸] || { 닿음: 0, 안닿음: 0 });
  f[o.닿음 ? "닿음" : "안닿음"]++;
  if (o.모형 === false && o.닿음) { sum.모형차이.규칙닿음_모형없음++; diffSamples.규칙닿음_모형없음[o.칸] = (diffSamples.규칙닿음_모형없음[o.칸] || 0) + 1; }
  if (o.모형 === true && !o.닿음) { sum.모형차이.규칙안닿음_모형있음++; diffSamples.규칙안닿음_모형있음[o.칸] = (diffSamples.규칙안닿음_모형있음[o.칸] || 0) + 1; }
}
console.log(JSON.stringify({ ...sum, 모형차이_칸별: diffSamples }, null, 1));
