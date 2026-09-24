#!/usr/bin/env node
/**
 * 6단계 0 — 9/15 감사에서 넘어온 판단 대기 항목을 **지금 파일로** 행마다 대조한다. content/ 는 고치지 않는다.
 *
 *   A. docs/qa-2026-09-15/evidence/textbook-defects.json (589행) — 통째로 읽지 않고 필요한 칸만 쓴다(lessonSentences 버림).
 *      이 행들을 낸 compare-archive.cjs 는 결함을 **찾는** 스크립트가 아니다. archive-checklist.json 의 의심 622건을
 *      아카이브 추출본과 견줘 나눌 뿐이고, 의심을 만든 검출기는 저장소에 없다(코드 이름은 compare-archive.cjs 와 이 파일에만
 *      나온다). VOCA 뜻·LISTENING 영어 대본은 교재에 없던 데이터라 compare-archive 도 UNVERIFIABLE 로 둔다(93~116행).
 *      그래서 다시 돌리는 대신, 코드마다 9/15 의 신호를 **같은 규칙으로** 커밋마다 다시 재서
 *        (1) 9/15 상태에서 그 신호가 9/15 기록과 같게 나오는지 (규칙이 맞는지의 확인),
 *        (2) 어느 커밋에서 사라졌는지, (3) 지금 남았는지를 적는다.
 *      9/15 상태 = 의심 목록(archive-checklist.json)을 만든 2026-09-16 03:02 전의 마지막 커밋 (경로마다 BASE_BEFORE 로 구함).
 *   B. ld-korean-fixes.json 의 _unfixable · _korean_only · _korean_typos, ld-english-fixes.json 의 _one_off · _entry_removals
 *      (각 키의 "note" 는 설명이라 뺀다). 그 파일이 커밋된 상태(35c055d/ad592a6, 9f1e47f)부터 커밋마다 잰다.
 *   C. d058 "3행이 옛 영어" (docs/qa-2026-09-15/NEXT-SESSION.md 229행) — 녹음이 끝난 뒤의 영어.
 *
 * 판정은 사람이 plans/carryover-0915-decisions.json 에 행마다 적는다 — 이 스크립트는 증거를 모으고, 판정이 빠짐없는지 센다.
 *   node carryover-0915.cjs              증거 → out/carryover-0915.json (+ VOCA 읽기용 out/carryover-0915-voca.tsv) + 요약
 *   node carryover-0915.cjs --finalize   판정 파일 대조 → 빠진 행·모르는 결과가 있으면 exit 1,
 *                                        없으면 docs/qa-2026-09-18/6단계-이월.json 을 만들고 결과별 개수를 센다
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out");
const PLAN = path.join(__dirname, "plans/carryover-0915-decisions.json");
const CARRY = path.join(REPO, "docs/qa-2026-09-18/6단계-이월.json");
const git = (args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8", maxBuffer: 256 << 20 });
const strip = (s) => String(s).replace(/^﻿/, "");

const cache = new Map();
/** rev 가 "now" 면 작업 트리, 아니면 그 커밋의 JSON. 없으면 null. */
function readAt(rev, file) {
  const k = `${rev}:${file}`;
  if (!cache.has(k)) {
    let v = null;
    try { v = JSON.parse(strip(rev === "now" ? fs.readFileSync(path.join(REPO, file), "utf8") : git(["show", `${rev}:${file}`]))); } catch { v = null; }
    cache.set(k, v);
  }
  return cache.get(k);
}
const lsCache = new Map();
function lsAt(rev, dir) {
  const k = `${rev}:${dir}`;
  if (!lsCache.has(k)) {
    lsCache.set(k, rev === "now" ? fs.readdirSync(path.join(REPO, dir))
      : git(["ls-tree", "--name-only", rev, `${dir}/`]).split("\n").filter(Boolean).map((p) => path.posix.basename(p)));
  }
  return lsCache.get(k);
}
/** 그 경로를 건드린 커밋 (오래된 것부터) + "now" */
const revsOf = (p) => [...git(["log", "--reverse", "--format=%h", "--", p]).split("\n").map((s) => s.trim()).filter(Boolean), "now"];
const BASE_BEFORE = "2026-09-16 03:02:00 +0900"; // archive-checklist.json 을 만든 커밋(00c5df0) 시각
// HEAD 가 맞는 곳(7-1 n): 여기 HEAD 는 역사를 거슬러 오를 출발점일 뿐 — 찾는 판은 날짜(BASE_BEFORE)로 고정된다.
const baseOf = (p) => git(["rev-list", "-1", `--before=${BASE_BEFORE}`, "HEAD", "--", p]).trim().slice(0, 7);
/** revs 에서 base 부터(포함) 본다 */
const fromBase = (revs, base) => revs.slice(Math.max(0, revs.findIndex((r) => base.startsWith(r) || r.startsWith(base))));

const LIST = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/6단계-목록.json"), "utf8")).items;
const FIX4 = fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/content-fix-list.md"), "utf8");
const FIX4_ITEMS = (() => {
  const items = [];
  const re = /^- \*\*\[(Critical|High)\] ([^*]+)\*\* \(([^\n]*)\)$/gm;
  let m, n = 0;
  while ((m = re.exec(FIX4))) { n++; items.push({ n, head: m[2], loc: m[3] }); }
  return items;
})();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const results = [];

// ============================================================ A. textbook-defects
function partA() {
  const td = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-15/evidence/textbook-defects.json"), "utf8"));
  const rows = td.rows.map((r, i) => { const { lessonSentences, ...rest } = r; void lessonSentences; return { i, ...rest }; });

  // ---- VOCA: 사전은 앱과 같은 순서로 찾는다 — 쓴 그대로 먼저, 없으면 소문자 (src/lib/content.ts getVocaDictionaryForWords)
  const DICT = "content/voca_dictionary.json";
  const DICT_REVS = fromBase(revsOf(DICT), baseOf(DICT));
  const look = (d, word) => { const w = String(word).trim(); const e = d?.[w] ?? d?.[w.toLowerCase()]; return e ? e.meaning : undefined; };
  const PH = "content/lessons/phonics";
  const PH_REVS = fromBase(revsOf(PH), baseOf(PH));
  const gridWords = (rev) => {
    const out = new Map();
    for (const f of lsAt(rev, PH).filter((x) => x.endsWith(".json"))) {
      const g = (readAt(rev, `${PH}/${f}`)?.blocks || []).find((b) => b.type === "wordgrid");
      out.set(f.replace(".json", ""), g ? g.rows.flat().map((w) => String(w || "").trim()).filter(Boolean) : []);
    }
    return out;
  };
  const gridsAt = new Map(PH_REVS.map((r) => [r, gridWords(r)]));
  const lessonsWith = (rev, w, exact) => [...gridsAt.get(rev)].filter(([, ws]) => ws.some((x) => (exact ? x === w : x.toLowerCase() === w.toLowerCase()))).map(([id]) => id);
  // VOCA 항목의 lesson 은 낱말(사전 단위)이거나 강의 번호(격자 단위)다. 강의 단위면 위치 설명이 낱말을 따옴표·key·칸 번호로 짚는다.
  // ("line 918" · "row n=" 같은 말에 line·row 가 걸리지 않게 느슨한 낱말 검색은 쓰지 않는다)
  const wordRe = (w) => new RegExp(`(['"“‘]${esc(w)}['"”’]|key\\s+['"“]${esc(w)}['"”]|(col\\s*\\d+|r\\d+c\\d+)\\s+${esc(w)}(?![A-Za-z]))`, "i");
  const sixVoca = (w) => LIST.filter((x) => x.course === "VOCA" && (String(x.lesson).toLowerCase() === w.toLowerCase() || wordRe(w).test(x.locator))).map((x) => x.id);
  const fourVoca = (w) => FIX4_ITEMS.filter((x) => /VOCA/.test(x.head) && (x.head.trim().toLowerCase() === `voca ${w.toLowerCase()}` || wordRe(w).test(x.loc))).map((x) => x.n);
  const VOCA_MEANING = new Set(["MEANING_TRANSLITERATION", "MEANING_WRONG_SENSE", "MEANING_POS", "MEANING_NOT_KOREAN", "MEANING_MALFORMED", "MEANING_INAPPROPRIATE"]);

  // ---- LISTENING: 신호 = 영어가 문장 끝 부호로 끝나지 않는 행.
  // 이 규칙은 9/15 목록의 강의 116개 중 102개에서 켜지고 목록 밖 강의에서는 한 번도 안 켜지지만, 개수는 77강만 같다 —
  // 9/15 검출기는 저장소에 없어 그 차이를 재현할 수 없다. 그래서 녹음 대조를 하나 더 둔다(shorterThanRecording).
  const LDS = "content/ld_english_scripts.json";
  const LD_REVS = fromBase(revsOf(LDS), baseOf(LDS));
  const cutRows = (rows) => (rows || []).filter((x) => String(x.en || "").trim() && !/[.?!]["'”’)]*\s*$/.test(String(x.en).trim()));
  // 녹음 대조: 대본의 한 문장이 녹음의 더 긴 문장의 앞부분에서 끝나고, 대본의 다음 말이 녹음의 나머지를 잇지 않으면 "녹음보다 짧게 끝남".
  // 녹음 = docs/qa-2026-09-15/evidence/ld-transcripts.json 의 sentences (5ac7caf 등이 영어를 다시 만들 때 쓴 것)
  const TR = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-15/evidence/ld-transcripts.json"), "utf8"));
  const words = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
  const splitSent = (s) => String(s || "").split(/(?<=[.?!]["'”’)]*)\s+(?=["“'‘(]*[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
  function shorterThanRecording(lesson, rows) {
    const t = TR[lesson];
    if (!t) return null;
    const ts = (t.sentences || []).map(words);
    const sents = (rows || []).flatMap((r) => splitSent(r.en).map((s) => ({ n: r.n, s, w: words(s) })));
    const stream = sents.flatMap((x) => x.w);
    const out = [];
    let pos = 0;
    for (const x of sents) {
      const start = pos; pos += x.w.length;
      if (x.w.length < 3) continue;
      const longer = ts.find((tw) => tw.length >= x.w.length + 2 && x.w.every((v, i) => tw[i] === v));
      if (!longer) continue;
      const rest = longer.slice(x.w.length);
      const next = stream.slice(start + x.w.length, start + x.w.length + rest.length);
      if (rest.every((v, i) => next[i] === v)) continue; // 대본이 다음 문장으로 나눠 이어 씀 — 잘린 것이 아님
      out.push({ n: x.n, en: x.s, recording: longer.join(" ") });
    }
    return out;
  }

  // ---- GRAMMAR I: 신호 = 영어 답안(본 파일과 분할 -1·-2)의 그 번호 문항·대체 답안에 한글
  const G1 = "content/lessons/grammar1";
  const G1_REVS = fromBase(revsOf(G1), baseOf(G1));
  function koreanAt(rev, id, n) {
    const files = lsAt(rev, G1).filter((f) => f === `${id}.json` || (f.startsWith(`${id}-`) && f.endsWith(".json")));
    const hits = []; let seen = 0;
    for (const f of files) {
      for (const b of readAt(rev, `${G1}/${f}`)?.blocks || []) if (b.type === "sentences") for (const it of b.items || []) {
        if (String(it.n) !== String(n)) continue;
        seen++;
        if (/[가-힣]/.test(String(it.text || ""))) hits.push({ f, text: it.text });
        for (const a of it.alternatives || []) if (/[가-힣]/.test(a)) hits.push({ f, alt: a });
      }
    }
    return { seen, hits, files: files.length };
  }

  for (const r of rows) {
    const base = { key: `A-${String(r.i).padStart(3, "0")}`, part: "A", row: r.i, code: r.code, section: r.section, lesson: r.lesson, detail: r.detail };
    if (VOCA_MEANING.has(r.code)) {
      const old = r.shown ?? r.meaning;
      const chain = [];
      let prev = null;
      for (const rev of DICT_REVS) { const m = look(readAt(rev, DICT), r.word); if (m !== prev) chain.push([rev, m ?? null]); prev = m; }
      const at915 = chain.length ? chain[0][1] : null;
      const now = look(readAt("now", DICT), r.word);
      const firstChange = chain.find(([, m]) => m !== old);
      // 사전에 낱말 자체가 없어진 행(철자 틀린 표제어)은 격자에서 그 낱말이 사라진 커밋을 댄다
      const gridPer = now === undefined ? PH_REVS.map((rev) => [rev, lessonsWith(rev, String(r.word), false).length]) : null;
      const gridGone = gridPer ? (gridPer.find(([, c]) => c === 0) || [null])[0] : null;
      results.push({ ...base, word: r.word, old, suggested: r.suggested || null, now: now ?? null,
        signal915: at915 === old ? "같음" : `다름(${at915})`,
        changedIn: now === undefined ? gridGone : now !== old && firstChange ? firstChange[0] : null, chain, gridPer,
        lessonsNow: lessonsWith("now", String(r.word), false),
        state: now === undefined ? "사전에 없음" : now !== old ? "바뀜" : "그대로", six: sixVoca(String(r.word)), four: fourVoca(String(r.word)) });
    } else if (r.code === "WORD_MALFORMED") {
      const w = String(r.word || "");
      const per = PH_REVS.map((rev) => [rev, lessonsWith(rev, w, true).length]);
      results.push({ ...base, word: w, per, lessonsNow: lessonsWith("now", w, true), meaningNow: look(readAt("now", DICT), w) ?? null,
        state: lessonsWith("now", w, true).length ? "그대로" : "바뀜", six: sixVoca(w), four: fourVoca(w) });
    } else if (r.code === "SENTENCE_TRUNCATED") {
      const per = LD_REVS.map((rev) => [rev, cutRows(readAt(rev, LDS)?.[r.lesson]).length]);
      const cut915 = cutRows(readAt(LD_REVS[0], LDS)?.[r.lesson]).map((x) => ({ n: x.n, en: x.en }));
      const cutNow = cutRows(readAt("now", LDS)?.[r.lesson]).map((x) => ({ n: x.n, en: x.en }));
      const zeroAt = per.find(([, c]) => c === 0);
      const six = LIST.filter((x) => x.course === "LISTENING" && x.lesson === r.lesson && /truncat|cut off|잘린|ends mid|incomplete|fragment/i.test(`${x.problem} ${x.category}`)).map((x) => x.id);
      const shortNow = shorterThanRecording(r.lesson, readAt("now", LDS)?.[r.lesson]);
      const short915 = shorterThanRecording(r.lesson, readAt(LD_REVS[0], LDS)?.[r.lesson]);
      // 9/15 상태에서 이 규칙이 안 켜진 강의(9/15 검출기와 차이)는 "영어를 처음 다시 쓴 커밋" 을 댄다
      const enOf = (rev) => (readAt(rev, LDS)?.[r.lesson] || []).map((x) => x.en).join("\u0001");
      const enChangedIn = (LD_REVS.slice(1).find((rev) => enOf(rev) !== enOf(LD_REVS[0])) || null);
      results.push({ ...base, count915: r.count, signal915: per[0][1] === r.count ? "같음" : `다름(${per[0][1]})`, per,
        cut915, cutNow, short915: short915 ? short915.length : null, shortNow, enChangedIn,
        changedIn: cutNow.length === 0 ? (per[0][1] > 0 && zeroAt ? zeroAt[0] : enChangedIn) : null,
        state: cutNow.length || (shortNow && shortNow.length) ? "그대로" : "바뀜", six, four: [] });
    } else if (r.code === "KOREAN_IN_ANSWER") {
      const per = G1_REVS.map((rev) => [rev, koreanAt(rev, r.lesson, r.n).hits.length]);
      const now = koreanAt("now", r.lesson, r.n);
      const zeroAt = per.find(([, c]) => c === 0);
      const six = LIST.filter((x) => x.course === "GRAMMAR I" && (x.lesson === r.lesson || String(x.lesson).startsWith(`${r.lesson}-`))
        && new RegExp(`(#|n=\\\\?"?|item |문항 )${r.n}\\b`).test(x.locator) && /[가-힣]|korean|hangul/i.test(`${x.problem}`)).map((x) => x.id);
      results.push({ ...base, n: r.n, signal915: per[0][1] > 0 ? "같음" : "다름(0)", per, nowSeen: now.seen, nowFiles: now.files, koreanNow: now.hits,
        changedIn: now.hits.length === 0 && zeroAt ? zeroAt[0] : null,
        state: now.seen === 0 ? "문항 없음" : now.hits.length ? "그대로" : "바뀜", six, four: [] });
    } else {
      results.push({ ...base, raw: r, state: "사람이 봄", six: [], four: [] });
    }
  }

  // VOCA 행을 읽기 쉬운 표로 — 판정은 사람이 읽고 한다
  const tsv = results.filter((x) => x.part === "A" && (VOCA_MEANING.has(x.code) || x.code === "WORD_MALFORMED"))
    .map((x) => [x.key, x.code.replace("MEANING_", ""), x.word, x.old ?? "", x.suggested ?? "", x.now ?? x.meaningNow ?? "", x.state, x.changedIn ?? "", x.six.join(","), x.four.join(",")].join("\t"));
  fs.writeFileSync(path.join(OUT, "carryover-0915-voca.tsv"), ["key\tcode\tword\t9/15\t제안\t지금\t상태\t바뀐 커밋\t6단계\t4단계", ...tsv].join("\n") + "\n", "utf8");
}

// ============================================================ B. LISTENING 판단 대기 36건
function partB() {
  const LDS = "content/ld_english_scripts.json";
  const LD_REVS = revsOf(LDS);
  const KF = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-15/ld-korean-fixes.json"), "utf8"));
  const EF = JSON.parse(fs.readFileSync(path.join(REPO, "docs/qa-2026-09-15/ld-english-fixes.json"), "utf8"));
  // 그 목록이 쓰인 상태: 한국어 목록은 ad592a6(마지막으로 고친 커밋), 영어 목록은 9f1e47f
  const lists = [
    ["_unfixable", KF._unfixable, "ad592a6"], ["_korean_only", KF._korean_only, "ad592a6"], ["_korean_typos", KF._korean_typos, "ad592a6"],
    ["_one_off", EF._one_off, "9f1e47f"], ["_entry_removals", EF._entry_removals, "9f1e47f"],
  ];
  /** 행마다 무엇이 "아직 있음" 인지 — 목록 설명에서 뽑은 글이 그 회차에 남아 있나 */
  const OVERRIDE = {
    "_one_off:d131#5": { field: "en", text: "All the guests are served in the All the guests" },
    "_one_off:d215#1": { field: "en", re: /(^|")\s*215\s+In addition/ },
    "_one_off:d132#4": { field: "en", text: "I don't know. some people" },
    "_one_off:d229#5": { field: "en", text: "Their trailers park side by side for miniature cities" },
    "_unfixable:d109#6": { field: "en", text: null }, // 문단 설명만 있음 — 사람이 봄
  };
  const needleOf = (list, key, note) => {
    const o = OVERRIDE[`${list}:${key}`];
    if (o) return o;
    if (list === "_korean_typos") { const m = note.match(/'([^']+)'/); return { field: "ko", text: m ? m[1] : null }; }
    if (list === "_korean_only") return { field: "ko", text: note.split(" — ")[0].trim().slice(0, 18) };
    // 영어 문장: " — " 앞, 말줄임표 앞, 처음 45자
    const en = note.split(" — ")[0].split("…")[0].trim();
    return { field: "en", text: /[A-Za-z]/.test(en) ? en.slice(0, 45) : null };
  };
  const has = (rows, nd) => (rows || []).filter((x) => nd.re ? nd.re.test(String(x[nd.field] || "")) : nd.text && String(x[nd.field] || "").includes(nd.text));
  // "옮길 원문이 없다"(_unfixable)·"영어가 없다"(_korean_only) 는 그 글이 남았나가 아니라 **짝이 생겼나 / 다른 회차로 갔나** 로 잰다
  const en = (x) => String(x.en || ""), ko = (x) => String(x.ko || "");
  const RESOLVED = {
    "_unfixable:d181#1": (S) => (S.d181 || []).some((x) => /태초부터/.test(ko(x)) && /From the beginning of time/.test(en(x))),
    "_unfixable:d166#1": (S) => (S.d166 || []).some((x) => /작가는 없다/.test(ko(x)) && /No author in American literature/.test(en(x))),
    "_unfixable:d171#1": (S) => (S.d171 || []).some((x) => /나의 사촌은 매우 당황했지만/.test(ko(x)) && /My cousin was very embarrassed/.test(en(x))),
    "_unfixable:d183#1": (S) => (S.d183 || []).some((x) => /그 백만장자는/.test(ko(x)) && /The millionaire insisted/.test(en(x))),
    // d109 #6 에 붙어 있던 Franklin 전기 문단은 다음 회차 d110 의 것 — d109 에서 빠지고 d110 에 한국어와 함께 있으면 해결
    "_unfixable:d109#6": (S) => !(S.d109 || []).some((x) => /Franklin was a leader/.test(en(x))) && (S.d110 || []).some((x) => /Franklin was a leader in his community/.test(en(x)) && /[가-힣]/.test(ko(x))),
    // d064 #6 끝의 영어는 다음 회차 d065 #1 의 첫 문장
    "_unfixable:d064#6": (S) => !(S.d064 || []).some((x) => /social customs is not to do anything/.test(en(x))) && (S.d065 || []).some((x) => /social customs is not to do anything/.test(en(x)) && /[가-힣]/.test(ko(x))),
    "_unfixable:d164#1": (S) => !(S.d164 || []).some((x) => /^They have both become an essential part/.test(en(x))),
    "_unfixable:d177#1": (S) => !(S.d177 || []).some((x) => /Rudd gets to the train stop/.test(en(x))),
    "_unfixable:d221#5": (S) => !(S.d221 || []).some((x) => /^You just want to camp along the way/.test(en(x))),
    "_korean_only:d091#5": (S) => (S.d091 || []).some((x) => /It is for junior and senior high school students/.test(en(x)) && /중고교 학생을 위해서이다/.test(ko(x))),
    "_korean_only:d123#5": (S) => (S.d123 || []).some((x) => /The result is that 40,000/.test(en(x)) && /그 결과는 4만/.test(ko(x))),
    "_korean_only:d272#6": (S) => (S.d272 || []).some((x) => /classical racket of men like Wagner/.test(en(x)) && /바그너같은/.test(ko(x))),
  };
  for (const [list, obj, writtenAt] of lists) {
    for (const [key, note] of Object.entries(obj)) {
      if (key === "note") continue;
      const [lesson, nStr] = key.split("#");
      const nd = needleOf(list, key, note);
      const revs = LD_REVS.slice(LD_REVS.indexOf(writtenAt));
      const per = revs.map((rev) => [rev, nd.text || nd.re ? has(readAt(rev, LDS)?.[lesson], nd).length : null]);
      const rowsNow = readAt("now", LDS)?.[lesson] || [];
      const hitNow = nd.text || nd.re ? has(rowsNow, nd) : null;
      const goneAt = per.find(([, c]) => c === 0);
      const six = LIST.filter((x) => x.course === "LISTENING" && x.lesson === lesson && new RegExp(`n=\\\\?"?${nStr}\\b`).test(x.locator)).map((x) => ({ id: x.id, category: x.category, problem: String(x.problem).slice(0, 160) }));
      const rv = RESOLVED[`${list}:${key}`];
      const resolvedPer = rv ? LD_REVS.map((rev) => [rev, rv(readAt(rev, LDS) || {}) ? 1 : 0]) : null;
      const resolvedNow = rv ? rv(readAt("now", LDS) || {}) : null;
      const byNeedle = { changedIn: hitNow && hitNow.length === 0 && goneAt ? goneAt[0] : null, state: hitNow === null ? "사람이 봄" : hitNow.length ? "그대로" : "바뀜" };
      // 해결 검사가 있는 행: 적힌 뒤(writtenAt 부터) 처음 참이 된 커밋. 적힐 때 이미 참이면 null (사람이 판정에 적는다)
      const after = resolvedPer ? resolvedPer.slice(LD_REVS.indexOf(writtenAt)) : null;
      const firstTrue = after ? (after.find(([, v]) => v === 1) || [null])[0] : null;
      results.push({ key: `B-${list}-${key}`, part: "B", code: list, lesson, n: nStr, detail: note, needle: nd.re ? String(nd.re) : nd.text, field: nd.field,
        per, resolvedPer, rowNow: rowsNow.find((x) => String(x.n) === nStr) || null, rowsAround: rowsNow.filter((x) => Math.abs(Number(x.n) - Number(nStr)) <= 1),
        hitNow: hitNow ? hitNow.map((x) => x.n) : null,
        changedIn: rv ? (resolvedNow && firstTrue !== writtenAt ? firstTrue : null) : byNeedle.changedIn,
        state: rv ? (resolvedNow ? "바뀜" : "그대로") : byNeedle.state, six, four: [] });
    }
  }
}

// ============================================================ C. d058
function partC() {
  const LDS = "content/ld_english_scripts.json";
  const rows = readAt("now", LDS)?.d058 || [];
  const last = rows[rows.length - 1];
  const six = LIST.filter((x) => x.course === "LISTENING" && x.lesson === "d058").map((x) => ({ id: x.id, locator: x.locator, category: x.category, problem: String(x.problem).slice(0, 200) }));
  results.push({ key: "C-d058", part: "C", code: "D058_OLD_ENGLISH", lesson: "d058", detail: "녹음이 본문보다 먼저 끝납니다. 3행이 옛 영어 그대로입니다. (NEXT-SESSION.md 229행)",
    rowCount: rows.length, lastRow: last, state: "사람이 봄", six, four: [] });
}

// ============================================================ 실행
const part = process.argv.includes("--part") ? process.argv[process.argv.indexOf("--part") + 1] : null;
fs.mkdirSync(OUT, { recursive: true });

if (process.argv.includes("--finalize")) {
  const ev = JSON.parse(fs.readFileSync(path.join(OUT, "carryover-0915.json"), "utf8"));
  const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
  const RESULTS = ["이미 해결", "6단계 같은 항목", "4단계 같음", "아직 열림", "보류"];
  const byKey = new Map(plan.rows.map((x) => [x.key, x]));
  const problems = [];
  for (const e of ev) {
    const d = byKey.get(e.key);
    if (!d) { problems.push(`${e.key}: 판정 없음`); continue; }
    if (!RESULTS.includes(d.result)) problems.push(`${e.key}: 모르는 결과 ${d.result}`);
    if (!String(d.reason || "").trim()) problems.push(`${e.key}: 근거 없음`);
    if (d.result === "이미 해결" && !d.commit) problems.push(`${e.key}: 이미 해결인데 커밋 없음`);
    if (d.result === "6단계 같은 항목" && !(d.six || []).length) problems.push(`${e.key}: 6단계 번호 없음`);
    if (d.result === "6단계 같은 항목" && (d.six || []).some((id) => !LIST.some((x) => x.id === id))) problems.push(`${e.key}: 목록에 없는 6단계 번호 ${d.six}`);
    if (d.result === "4단계 같음" && !(d.four || []).length) problems.push(`${e.key}: 4단계 번호 없음`);
  }
  for (const k of byKey.keys()) if (!ev.some((e) => e.key === k)) problems.push(`${k}: 증거에 없는 행`);
  if (problems.length) { console.log(`판정 문제 ${problems.length}건`); for (const p of problems.slice(0, 40)) console.log(`  ${p}`); process.exit(1); }
  // 아직 열림 → 6E 번호. 같은 대상(예: 같은 낱말)을 가리키는 행은 하나의 6E 로 묶을 수 있게 plan 이 group 을 준다.
  const open = plan.rows.filter((x) => x.result === "아직 열림");
  const groups = new Map();
  for (const x of open) { const g = x.group || x.key; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
  let n = 0;
  const items = [];
  for (const [g, xs] of groups) {
    n++;
    const e0 = ev.find((e) => e.key === xs[0].key);
    items.push({ id: `6E-${String(n).padStart(3, "0")}`, source: "9/15 이월", from: xs.map((x) => x.key), course: xs[0].course, lesson: e0.lesson, file: xs[0].file,
      locator: xs[0].locator, original: xs[0].original, problem: xs[0].problem, group: g });
  }
  // 대조 중 새로 찾은 것 — 9/15 행 수에는 넣지 않는다
  for (const x of plan.extras || []) {
    n++;
    items.push({ id: `6E-${String(n).padStart(3, "0")}`, source: "대조 중 발견", from: [x.key], course: x.course, lesson: x.lesson, file: x.file, locator: x.locator, problem: x.problem });
  }
  const counts = {};
  for (const x of plan.rows) counts[x.result] = (counts[x.result] || 0) + 1;
  const fromRows = items.filter((x) => x.source === "9/15 이월").length;
  fs.writeFileSync(CARRY, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), about: "9/15 감사에서 넘어온 판단 대기 항목 중 아직 열린 것 + 대조 중 새로 찾은 것 — 6단계와 같은 기준으로 처리한다. 만든 도구: scripts/carryover-0915.cjs --finalize", source: "scripts/plans/carryover-0915-decisions.json", count: items.length, items }, null, 1) + "\n", "utf8");
  console.log(`행 ${plan.rows.length} · ${RESULTS.map((r) => `${r} ${counts[r] || 0}`).join(" · ")} · 6E ${items.length}개 (이월 행에서 ${fromRows} · 대조 중 발견 ${items.length - fromRows}) → ${path.relative(REPO, CARRY)}`);
  for (const x of items) console.log(`  ${x.id} [${x.source}] ${x.course} ${x.lesson} · ${x.from.length}행 · ${String(x.problem).slice(0, 70)}`);
  process.exit(0);
}

if (!part || part === "A") partA();
if (!part || part === "B") partB();
if (!part || part === "C") partC();
fs.writeFileSync(path.join(OUT, "carryover-0915.json"), JSON.stringify(results, null, 1));
const byCode = {};
for (const r of results) { const k = `${r.part} ${r.code}`; (byCode[k] ||= {}); byCode[k][r.state] = (byCode[k][r.state] || 0) + 1; }
for (const [k, v] of Object.entries(byCode)) console.log(`${k.padEnd(34)} ${Object.entries(v).map(([s, c]) => `${s} ${c}`).join(" · ")}`);
const sig = {};
for (const r of results) if (r.signal915) { const k = `${r.code} 9/15 신호 ${r.signal915.startsWith("같음") ? "같음" : "다름"}`; sig[k] = (sig[k] || 0) + 1; }
console.log(JSON.stringify(sig));
const byRev = {};
for (const r of results) if (r.changedIn) { const k = `${r.part} ${r.changedIn}`; byRev[k] = (byRev[k] || 0) + 1; }
console.log(`처음 사라진 커밋: ${JSON.stringify(byRev)}`);
console.log(`→ out/carryover-0915.json (${results.length}행)`);
