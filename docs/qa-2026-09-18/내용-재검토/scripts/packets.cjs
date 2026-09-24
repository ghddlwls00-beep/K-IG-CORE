#!/usr/bin/env node
/**
 * 학습 내용 재검토 1 — 일꾼이 읽을 '읽을거리' 를 만든다(목록.jsonl + 분류.json → 읽을거리/<조각>/NN.md).
 * 강의 묶음마다: 판정할 줄(닿음)의 전 · 뒤 + 그 강의의 지금 화면 글(한국어 · 정답 · 다른 정답 · 힌트 칩 · 소리 글)과 기준 판 글.
 * 같은 바뀜이 여러 파일에 있으면(READING 두 쪽 · GRAMMAR 분할본) 한 항목으로 묶어 보여 준다 — 판정은 id 마다 같게.
 * 읽을거리는 만든 것(이 스크립트로 다시 만듦)이라 git 에 넣지 않는다(.gitignore).
 *   node packets.cjs            → 읽을거리/ 전부 다시 만듦 · 조각별 판정할 줄 목록 읽을거리/<조각>/ids.json
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const Rn = require("./render.cjs");

const OUT = path.join(L.DIR, "읽을거리");
const recs = L.readJsonl(path.join(L.DIR, "목록.jsonl"));
const cls = require(path.join(L.DIR, "분류.json"));
const byId = new Map(recs.map((r) => [r.id, r]));
const q = Rn.q;
const HB = L.HEAD.slice(0, 7), BB = L.BASE.slice(0, 7); // 읽을거리 머리의 판 이름(내용 재검토 2a80bba · 9d6e15d / 고친 것 다시 읽기 cd679df · 2a80bba)
const KIND = { changed: "바뀜", added: "새로 생김", removed: "없어짐" };
const MAX = 32000;

// 조각 → 묶음 → 줄
const chunks = new Map();
for (const r of recs) {
  const c = cls[r.id];
  if (!chunks.has(c.조각)) chunks.set(c.조각, new Map());
  const g = chunks.get(c.조각);
  if (!g.has(c.묶음)) g.set(c.묶음, { reached: [], unreached: [] });
  g.get(c.묶음)[c.닿음 ? "reached" : "unreached"].push(r);
}
// 미리 읽기: 묶음에 든 파일 + 짝 파일(안 바뀐 것도)
const files = new Set(recs.map((r) => r.file).filter((f) => f.endsWith(".json")));
for (const c of ["grammar1", "grammar2", "ld", "reading", "phonics", "student"]) for (const f of fs.readdirSync(path.join(L.WT, "content/lessons", c))) files.add(`content/lessons/${c}/${f}`);
files.add("content/courses/student.json");
L.preloadJson([...files]);

/** 한 줄이 가리키는 것(문항 n · 문장 id · 카드 낱말 · 대본 n)을 사람이 읽는 말로 */
function where(r) {
  if (/\.ts$/.test(r.file)) return `${r.file.replace(/^src\/lib\//, "")} ${r.path}`;
  const t = L.parsePath(r.path);
  const bits = [];
  for (const x of t) {
    if (x.key) bits.push(x.key === "n" ? `#${x.val}` : x.key === "id" ? x.val.replace(/^reading-\d+-/, "") : `'${x.val}'`);
    if (x.was !== undefined && bits.length === 0) bits.push(`옛 블록 ${x.was}`);
  }
  const last = [...t].reverse().find((x) => x.k !== undefined);
  return `${r.file.replace(/^content\/lessons\/[^/]+\//, "").replace(/^content\//, "").replace(/\.json$/, "")} ${bits.join(" ")} .${last ? last.k : ""}`.trim();
}
/** 같은 바뀜(칸 · 가리키는 것 · 전 · 뒤가 같음)을 묶음 */
function dupKey(r) {
  const t = L.parsePath(r.path);
  const tail = t.filter((x) => x.key || x.k).map((x) => (x.key ? `${x.key}=${x.val}` : x.k)).join("/");
  return [cls[r.id].칸, tail, r.kind, r.before, r.after].join("\u0001");
}
function changedLines(list) {
  const groups = new Map();
  for (const r of list) { const k = dupKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const out = [];
  for (const [, rs] of groups) {
    const r = rs[0];
    const c = cls[r.id];
    const ids = rs.map((x) => `◆${x.id}`).join(" · ");
    const whereAll = rs.map((x) => where(x)).join(" | ");
    let head = `- ${ids} · ${c.칸} · ${KIND[r.kind]} · ${whereAll}`;
    if (rs.length > 1) head += `  (같은 바뀜 ${rs.length}곳 — 판정은 모두 같게)`;
    out.push(head);
    if (r.before != null) out.push(`  전: ${q(r.before)}`);
    if (r.after != null) out.push(`  뒤: ${q(r.after)}`);
    const mv = rs.map((x) => cls[x.id].옮김).filter(Boolean);
    if (mv.length) out.push(`  옮김: 같은 글이 ${mv.map((m) => `◆${m}(${where(byId.get(m))})`).join(" · ")} 로/에서 — 글은 그대로, 자리만 바뀜. 자리(어느 문항 · 차례 · 짝)가 맞는지 판정`);
    if (c.연어) out.push(`  연어 카드: 전 ${q(c.연어.before)} → 뒤 ${q(c.연어.after)}`);
  }
  return out;
}
const unreachedNote = (list) => {
  if (!list.length) return [];
  const byField = {};
  for (const r of list) byField[cls[r.id].칸] = (byField[cls[r.id].칸] || 0) + 1;
  return [`- 안 닿는 줄 ${list.length} (판정 안 함 — 수만): ${Object.entries(byField).map(([k, v]) => `${k} ${v}`).join(" · ")}`];
};
/** ◆ 표시: 그 파일 · 그 대상(문항 n · 문장 id · 카드 낱말 · 대본 n)을 가리키는 닿는 줄 */
function marksFor(list, file, keyName, keyVal, field) {
  return list.filter((r) => r.file === file && L.parsePath(r.path).some((x) => x.key === keyName && x.val === String(keyVal)) && (!field || new RegExp(`\\.${field}(\\[|$)`).test(r.path))).map((r) => `◆${r.id}`).join(" ");
}

// ── 과정별 문맥 ───────────────────────────────────────────────────────
function ctxStudent(group, list) {
  const id = group.split("/")[1];
  const now = Rn.student(L.HEAD, id), old = Rn.student(L.BASE, id);
  if (!now) return [`(강의 파일 없음: ${id})`];
  const f = `content/lessons/student/${id}.json`;
  const out = [`### 지금 화면 글 (${HB}) — /student/${id}`, `- h1: ${q(now.h1)} · 과정 목록: ${q(now.indexTitle)} / 부제목 ${q(now.indexSubtitle)}`, `- 제목줄(h2): ${q(now.instruction)}`];
  const koRecs = list.filter((r) => r.file === f && cls[r.id].칸 === "student.paragraph.text" && r.after != null);
  now.rows.forEach((r, i) => {
    const mEn = [marksFor(list, f, "n", r.n, "text"), marksFor(list, f, "n", r.n, "n")].filter(Boolean).join(" ");
    const mKo = koRecs.filter((x) => String(x.after).trim() === r.ko).map((x) => `◆${x.id}`).join(" ");
    out.push(`- ${i + 1}. [n ${r.n}] EN: ${q(r.en)}${r.spoken !== r.en ? `  (소리: ${q(r.spoken)})` : ""} ${mEn}`);
    out.push(`     KO: ${q(r.ko)} ${mKo}`);
  });
  const koMarks = list.filter((r) => r.file === f && cls[r.id].칸 === "student.paragraph.text").map((r) => `◆${r.id}`);
  if (koMarks.length) out.push(`- (한국어 문단 줄 ${koMarks.join(" ")} — 위 KO 는 차례대로 문장과 짝(StudentLearningView 658 koParas[idx]))`);
  if (old) {
    out.push(`### 기준 판(${BB}) 글 — 비교용`);
    out.push(`- h1: ${q(old.h1)} · 제목줄: ${q(old.instruction)}`);
    old.rows.forEach((r, i) => out.push(`- ${i + 1}. [n ${r.n}] EN: ${q(r.en)} / KO: ${q(r.ko)}`));
  }
  return out;
}
function ctxGrammar(group, list) {
  const [course, idPart] = group.split("/");
  if (idPart === "단계이름") {
    const out = ["### 지금 화면 글 — GRAMMAR I 과정 목록 단계 이름 · 강의 부제목(curriculumPresentation.ts)"];
    for (const s of ["제 1 단계", "제 2 단계", "제 3 단계", "제 4 단계", "제 5 단계", "제 6 단계"]) out.push(`- ${s} → ${q(Rn.curriculum.formatGroupTitle("grammar1", s))}`);
    for (const id of ["gh1-042", "gh1-044", "gh1-054", "gh1-055", "gh1-056", "gh1-114", "gh1-116", "gh1-117", "gh1-123"]) out.push(`- ${id}: ${q(Rn.curriculum.formatLessonPresentation("grammar1", { id }).subtitle)}`);
    const idx = L.jsonAt(L.HEAD, "content/courses/grammar1.json");
    const stage = new Map(); for (const g of idx.groups || []) for (const l of g.lessons) stage.set(l, g.label || g.title);
    out.push(`- 과정 목록에서 3단계에 든 강의: ${[...stage].filter(([, s]) => /3/.test(s)).map(([l]) => l).join(" ")}`);
    return out;
  }
  const baseNum = parseInt(idPart.replace(/^gh[12]-/, ""), 10);
  const out = [];
  const pairs = Rn.grammarGroupPairs(course, baseNum);
  const full = pairs.find(([k]) => !/-\d+$/.test(k.replace(/^gh[12]-\d+/, "")));
  const cellMarks = (file, n, field) => (file && n != null ? marksFor(list, `content/lessons/${course}/${file}.json`, "n", n, field) : "");
  for (const [a, b] of pairs) {
    const now = Rn.grammarPair(L.HEAD, course, a, b);
    if (!now) continue;
    const isSplit = full && a !== full[0];
    const fileOf = (row, side) => { const koFirst = /[가-힣]/.test(String((Rn.lessonAt(L.HEAD, course, a) || {}).blocks ? "" : "")); return null; };
    // 어느 파일이 한국어 쪽인가 — 첫 문항에 한글이 있는 파일
    const hasKo = (id) => { const d = Rn.lessonAt(L.HEAD, course, id); const it = (d ? d.blocks : []).filter((x) => x.type === "sentences").flatMap((x) => x.items || [])[0]; return /[가-힣]/.test(String(it && it.text)); };
    const koFile = hasKo(a) ? a : b, enFile = koFile === a ? b : a;
    if (isSplit) {
      // 분할본: 본문 짝과 문항(n)별로 대조 — 다른 것만
      const fullRows = Rn.grammarPair(L.HEAD, course, full[0], full[1]).rows;
      const byLabel = new Map(fullRows.map((r) => [String(r.enN || r.label), r]));
      const diffs = [];
      for (const r of now.rows) {
        const f = byLabel.get(String(r.enN || r.label));
        if (!f) { diffs.push(`  - [n ${r.label}] 본문 짝에 없는 문항: KO ${q(r.ko)} / EN ${q(r.en)}`); continue; }
        if (f.en !== r.en || f.ko !== r.ko || JSON.stringify(f.alts) !== JSON.stringify(r.alts)) diffs.push(`  - [n ${r.label}] 본문: KO ${q(f.ko)} · EN ${q(f.en)} · 다른 정답 ${q(f.alts.join(" / "))}\n    분할: KO ${q(r.ko)} · EN ${q(r.en)} · 다른 정답 ${q(r.alts.join(" / "))}`);
      }
      out.push(`### 분할본 ${koFile} ↔ ${enFile} (문항 ${now.rows.length}) — 본문 짝과 글이 다른 문항 ${diffs.length}${now.counts[0] !== now.counts[1] ? ` · ⚠ 두 쪽 문항 수 다름 ${now.counts.join(" : ")}` : ""}`);
      out.push(...diffs);
      const splitMarks = list.filter((r) => [a, b].some((x) => r.file === `content/lessons/${course}/${x}.json`)).map((r) => `◆${r.id}`);
      if (splitMarks.length) out.push(`  (이 분할본 파일의 줄: ${splitMarks.join(" ")} — 본문 짝의 같은 문항과 같게 판정)`);
      continue;
    }
    out.push(`### 지금 화면 글 (${HB}) — ${koFile}(한국어 문제) ↔ ${enFile}(영어) · 차례로 짝(GrammarLearningView 182~222) · 문항 수 ${now.counts.join(" : ")}${now.counts[0] !== now.counts[1] ? " ⚠ 다름" : ""}`);
    if (now.ruleSummary.length) out.push(`- 문법 확인 요약(instruction): ${now.ruleSummary.map(q).join(" · ")}`);
    for (const r of now.rows) {
      const mk = [cellMarks(koFile, r.koN, "text"), cellMarks(enFile, r.enN, "text"), cellMarks(enFile, r.enN, "alternatives"), cellMarks(koFile, r.koN, "alternatives")].filter(Boolean).join(" ");
      out.push(`- ${r.i}. [번호 ${r.label}] KO: ${q(r.ko)}`);
      out.push(`     EN: ${q(r.en)}${r.alts.length ? `  · 다른 정답: ${r.alts.map(q).join(" / ")}` : ""} ${mk}`);
    }
    const old = Rn.grammarPair(L.BASE, course, a, b);
    if (old) {
      const changedRows = old.rows.filter((r, i) => { const n = now.rows[i]; return !n || n.ko !== r.ko || n.en !== r.en || JSON.stringify(n.alts) !== JSON.stringify(r.alts) || n.label !== r.label; });
      out.push(`### 기준 판(${BB}) — 같은 차례에서 다른 문항만 (${changedRows.length} · 문항 수 ${old.counts.join(" : ")})`);
      for (const r of changedRows) out.push(`- ${r.i}. [번호 ${r.label}] KO: ${q(r.ko)} / EN: ${q(r.en)}${r.alts.length ? ` · 다른 정답: ${r.alts.map(q).join(" / ")}` : ""}`);
    }
  }
  return out;
}
function ctxLd(group, list) {
  const base = group.split("/")[1];
  const now = Rn.ldLesson(L.HEAD, base), old = Rn.ldLesson(L.BASE, base);
  const out = [`### 지금 화면 글 (${HB}) — /ld/${base}(받아쓰기 · 힌트 칩) · /ld/${base}-1(대본: 한국어 + 영어)`];
  out.push(`- 힌트 줄(${base}.json): ${q(now.hints)}${old.hints !== now.hints ? `\n  기준 판 힌트 줄: ${q(old.hints)}` : ""} ${list.filter((r) => /\.hints|blocks/.test(cls[r.id].칸) && cls[r.id].칸 === "ld.hints.text").map((r) => `◆${r.id}`).join(" ")}`);
  const oldByN = new Map(old.rows.map((r) => [String(r.n), r]));
  for (const r of now.rows) {
    const o = oldByN.get(String(r.n)) || {};
    const mEn = marksFor(list, "content/ld_english_scripts.json", "n", r.n, "en");
    const mKo = marksFor(list, "content/ld_english_scripts.json", "n", r.n, "ko");
    out.push(`- n${r.n} EN: ${q(r.en)} ${mEn}`);
    out.push(`       KO: ${q(r.ko)} ${mKo}`);
    const chipsChanged = JSON.stringify(o.chips || []) !== JSON.stringify(r.chips);
    out.push(`       칩: ${r.chips.length ? r.chips.map((c) => `[${c}]`).join(" ") : "(없음)"}${chipsChanged ? `   ← 기준 판 칩: ${(o.chips || []).length ? o.chips.map((c) => `[${c}]`).join(" ") : "(없음)"}` : ""}`);
  }
  if (old.rows.length !== now.rows.length) out.push(`- ⚠ 대본 줄 수: 기준 ${old.rows.length} → 지금 ${now.rows.length}`);
  return out;
}
function ctxReading(group, list) {
  const id = group.split("/")[1];
  const out = [];
  const a = Rn.readingLesson(L.HEAD, id), b = Rn.readingLesson(L.HEAD, `${id}-1`);
  const oa = Rn.readingLesson(L.BASE, id);
  if (!a) return [`(강의 파일 없음 ${id})`];
  const same = b && JSON.stringify(a) === JSON.stringify(b);
  out.push(`### 지금 화면 글 (${HB}) — /reading/${id} · /reading/${id}-1 ${same ? "(두 쪽 글 같음)" : "⚠ 두 쪽 글이 다름 — 아래 둘 다"}`);
  const f = `content/lessons/reading/${id}.json`, f1 = `content/lessons/reading/${id}-1.json`;
  const renderOne = (x, file) => {
    for (const s of x.sentences) {
      out.push(`- ${s.id.replace(/^reading-\d+-/, "")} EN: ${q(s.en)} ${marksFor(list, file, "id", s.id, "english")}`);
      out.push(`         KO: ${q(s.ko)} ${marksFor(list, file, "id", s.id, "korean")}`);
    }
    out.push(`- 카드 ${x.cards.length}장:`);
    for (const c of x.cards) out.push(`  · ${c.word} (${c.pos})${c.lemma ? ` ← ${c.lemma}` : ""} : ${q(c.ko)}${c.spoken !== c.word ? `  소리 ${q(c.spoken)}` : ""} ${marksFor(list, file, "word", c.word)}`);
  };
  renderOne(a, f);
  if (b && !same) { out.push(`#### ${id}-1 쪽`); renderOne(b, f1); }
  if (oa) {
    const nowIds = new Map(a.sentences.map((s) => [s.id, s]));
    const diff = oa.sentences.filter((s) => { const n = nowIds.get(s.id); return !n || n.en !== s.en || n.ko !== s.ko; });
    const oldCards = oa.cards.filter((c) => !a.cards.some((n) => n.word === c.word && n.ko === c.ko && n.pos === c.pos));
    out.push(`### 기준 판(${BB}) — 다른 문장 ${diff.length} · 다른 카드 ${oldCards.length}`);
    for (const s of diff) out.push(`- ${s.id.replace(/^reading-\d+-/, "")} EN: ${q(s.en)} / KO: ${q(s.ko)}`);
    for (const c of oldCards) out.push(`  · ${c.word} (${c.pos})${c.lemma ? ` ← ${c.lemma}` : ""} : ${q(c.ko)}`);
  }
  return out;
}
const dictWordLessons = (() => {
  const m = new Map();
  for (const id of Rn.listFiles("phonics", /\.json$/)) for (const w of Rn.vocaLesson(L.HEAD, id) || []) if (w.key) { if (!m.has(w.key)) m.set(w.key, []); m.get(w.key).push(id); }
  return m;
})();
function ctxVoca(group, list) {
  if (group === "발음표-VOCA") {
    const dict = L.jsonAt(L.HEAD, "content/voca_dictionary.json");
    const out = ["### VOCA 발음 표(vocaSpeech.ts VOCA_PRONUNCIATIONS · VOCA_SPEECH_FORMS) — 낱말 · 소리 IPA · 카드 뜻(voca_dictionary) · 나오는 강의"];
    for (const [w, ipa] of Object.entries(Rn.vocaSpeech.VOCA_PRONUNCIATIONS)) out.push(`- ${w} ⟨${ipa}⟩ · 뜻 ${q((dict[w] || {}).meaning)} · 강의 ${(dictWordLessons.get(w) || []).join(" ")} ${list.filter((r) => new RegExp(`> ${w} #`).test(r.path)).map((r) => `◆${r.id}`).join(" ")}`);
    out.push(`- 말하는 꼴: ${Object.entries(Rn.vocaSpeech.VOCA_SPEECH_FORMS).map(([k, v]) => `${k} → ${v}`).join(" · ")} ${list.filter((r) => /VOCA_SPEECH_FORMS/.test(r.path)).map((r) => `◆${r.id}`).join(" ")}`);
    return out;
  }
  if (group === "발음표-READING") {
    const out = ["### READING 발음 표(vocaSpeech.ts READING_PRONUNCIATIONS) — 규칙(카드 뜻 정규식 → IPA)과, 그 철자의 READING 카드 전부(쪽 · 품사 · 뜻 → 고른 소리)"];
    const cards = new Map();
    for (const id of Rn.listFiles("reading", /\.json$/)) for (const c of (Rn.readingLesson(L.HEAD, id) || { cards: [] }).cards) { const k = String(c.word).toLowerCase(); if (!cards.has(k)) cards.set(k, []); cards.get(k).push({ id, ...c }); }
    for (const [w, rules] of Object.entries(Rn.vocaSpeech.READING_PRONUNCIATIONS)) {
      const ids = list.filter((r) => new RegExp(`> ${w} > `).test(r.path)).map((r) => `◆${r.id}`).join(" ");
      out.push(`- **${w}** 규칙: ${rules.map((r) => `${r.meaning} → ⟨${r.ipa}⟩`).join(" · ")} ${ids}`);
      const cs = cards.get(w) || [];
      const uniq = new Map();
      for (const c of cs) { const k = `${c.pos}|${c.ko}|${c.spoken}`; if (!uniq.has(k)) uniq.set(k, { ...c, pages: [] }); uniq.get(k).pages.push(c.id); }
      for (const [, c] of uniq) out.push(`    · (${c.pos}) ${q(c.ko)} → ${q(c.spoken)}  [${c.pages.join(" ")}]`);
      if (!cs.length) out.push(`    · (이 철자의 READING 카드 없음)`);
    }
    return out;
  }
  // 강의 묶음 phonics/<id>
  const id = group.split("/")[1];
  const now = Rn.vocaLesson(L.HEAD, id) || [];
  const oldDict = L.jsonAt(L.BASE, "content/voca_dictionary.json");
  const out = [`### 지금 화면 글 (${HB}) — /phonics/${id} 낱말 ${now.length} (뜻은 카드 · 퀴즈에 · 소리는 낱말)`];
  for (const w of now) {
    const mk = list.filter((r) => r.file === "content/voca_dictionary.json" && r.path.startsWith(`.${w.key}.`)).map((r) => `◆${r.id}`).join(" ");
    const oldMeaning = w.key && oldDict[w.key] ? oldDict[w.key].meaning : null;
    const other = (dictWordLessons.get(w.key) || []).filter((x) => x !== id);
    out.push(`- ${w.word}${w.spoken !== w.word ? ` (소리 ${q(w.spoken)})` : ""} : ${q(w.meaning)}${oldMeaning !== w.meaning ? `   ← 기준 판 ${q(oldMeaning)}` : ""} ${mk}${mk && other.length ? `  (다른 강의에도: ${other.slice(0, 6).join(" ")}${other.length > 6 ? " …" : ""})` : ""}`);
    if (w.collocation) out.push(`    연어: ${q(w.collocation.phrase)} ${q(w.collocation.translation)} · 예문 ${q(w.collocation.exampleSentence)} ${q(w.collocation.sentenceTranslation)}`);
    if (w.etymology) out.push(`    어원: ${q(w.etymology.explanation)}`);
  }
  const gridMarks = list.filter((r) => r.file === `content/lessons/phonics/${id}.json`).map((r) => `◆${r.id}`);
  if (gridMarks.length) out.push(`- (격자 낱말 줄: ${gridMarks.join(" ")})`);
  return out;
}
const CTX = { student: ctxStudent, grammar1: ctxGrammar, grammar2: ctxGrammar, ld: ctxLd, reading: ctxReading, voca: ctxVoca, phonics: ctxVoca };

// ── 쓰기 ────────────────────────────────────────────────────────────
// 조각 폴더만 새로(표본-* 은 sample.cjs 몫이라 그대로)
fs.mkdirSync(OUT, { recursive: true });
for (const d of fs.readdirSync(OUT)) if (!d.startsWith("표본-")) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
fs.writeFileSync(path.join(L.DIR, ".gitignore"), "읽을거리/\nwork/\n");
fs.mkdirSync(path.join(L.DIR, "work"), { recursive: true });
const summary = {};
const groupNum = (g) => { const m = g.match(/(\d+)(?!.*\d)/); return m ? parseInt(m[1], 10) : 0; };
for (const [chunk, groups] of chunks) {
  const dir = path.join(OUT, chunk);
  fs.mkdirSync(dir, { recursive: true });
  const names = [...groups.keys()].sort((a, b) => (a.startsWith("발음표") ? 1 : 0) - (b.startsWith("발음표") ? 1 : 0) || a.split("/")[0].localeCompare(b.split("/")[0]) || groupNum(a) - groupNum(b) || a.localeCompare(b));
  const sections = [];
  const ids = { reached: [], unreached: [], groups: {} };
  for (const g of names) {
    const { reached, unreached } = groups.get(g);
    ids.unreached.push(...unreached.map((r) => r.id));
    if (!reached.length) continue;
    ids.reached.push(...reached.map((r) => r.id));
    ids.groups[g] = reached.map((r) => r.id);
    const kind = g.startsWith("발음표") ? "voca" : g.split("/")[0];
    const lines = [`## ▣ ${g} — 판정할 줄 ${reached.length}${reached.some((r) => cls[r.id].옮김) ? ` (옮김 ${reached.filter((r) => cls[r.id].옮김).length})` : ""}`, "### 바뀐 줄", ...changedLines(reached), ...unreachedNote(unreached)];
    try { lines.push(...(CTX[kind] ? CTX[kind](g, reached) : [])); } catch (e) { lines.push(`(문맥을 그리다 오류: ${e.message} — 바뀐 줄로만 판정하고 기록에 적을 것)`); }
    sections.push({ g, text: lines.join("\n") + "\n" });
  }
  // 묶음을 쪼개지 않고 MAX 글자까지 한 파일에
  const batches = [];
  let cur = [];
  let len = 0;
  for (const s of sections) {
    if (cur.length && len + s.text.length > MAX) { batches.push(cur); cur = []; len = 0; }
    cur.push(s); len += s.text.length;
  }
  if (cur.length) batches.push(cur);
  batches.forEach((b, i) => {
    const name = `${String(i + 1).padStart(2, "0")}.md`;
    const idsIn = b.flatMap((s) => ids.groups[s.g]);
    fs.writeFileSync(path.join(dir, name), `# 읽을거리 ${chunk} ${name} — 묶음 ${b.length} · 판정할 줄 ${idsIn.length}\n\n${b.map((s) => s.text).join("\n")}`);
    ids.batches = ids.batches || {};
    ids.batches[name] = idsIn;
  });
  fs.writeFileSync(path.join(dir, "ids.json"), JSON.stringify(ids, null, 1));
  summary[chunk] = { 판정할줄: ids.reached.length, 안닿는줄: ids.unreached.length, 묶음: Object.keys(ids.groups).length, 파일: batches.length, 글자: sections.reduce((s, x) => s + x.text.length, 0) };
}
console.log(JSON.stringify(summary, null, 1));
