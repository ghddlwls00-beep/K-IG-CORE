#!/usr/bin/env node
/**
 * 한국어를 로마자로 적은 낱말이 **영어 음성으로** 읽히는 곳을 모두 찾는다(소유자 2026-09-25: "20-2 … 경주를 … 영어 발음으로 … 이런 경우들 다 찾을 수 있겠어?").
 *
 * 까닭: 음성 생성기(scripts/generate-azure-ava.mjs ssml · languageRuns)는 글자 종류로 언어를 나눈다 — 한글은 ko-KR, 로마자는 en-US.
 * 그래서 영어 문장 속 'Gyeongju' · 'Bulguksa' 는 영어 규칙으로 읽힌다(한글로 적힌 곳은 이미 한국어로 읽힘).
 *
 * 하는 일(한 판을 git 에서 읽어 저장소 밖 폴더에 풀지 않고도 돌게 — 판 폴더는 git archive + node_modules 연결):
 *   1) 앱이 소리 내는 글 전부 — scripts/lib/spoken-texts.cjs + 생성기와 같은 정규화(개수가 생성기 items 와 같아야 함, 다르면 멈춤)
 *   2) 로마자 낱말 전부를 한국어 로마자 음절(개정 · 매큔-라이샤워 · 흔한 이름 표기)로 끝까지 나눠 보고, 영어 근거(VOCA 사전 표제어 ·
 *      READING 단어 카드 · 문장 가운데 소문자 3번 넘게)가 없는 것을 후보로(넓게 잡는 체)
 *   3) 후보를 사람이 본 판정(아래 KO — 한국어 · 한글 꼴, NOT — 한국어 아님)으로 가르고, 판정 없는 후보가 남으면 멈춤(새 글이 들어온 것)
 *   4) 한국어 낱말이 든 글마다: 과정 · 강의 쪽 · 글 · 한글로 읽을 꼴 · 같은 강의 한국어 쪽에 그 한글이 있는지(맞춰 봄)
 *
 *   node korean-names-in-speech.cjs <판 폴더> [--out <폴더>] [--expect-items N]
 *   node korean-names-in-speech.cjs <판 폴더> --break        (소리 내는 글 하나에 'Gyeongbokgung' 을 몰래 넣어 '판정 없는 후보' 로 멈추는지)
 */
const fs = require("fs");
const path = require("path");
const argv = process.argv.slice(2);
const ROOT = path.resolve(argv[0]);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const OUT = opt("--out");
const BREAK = argv.includes("--break");
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")) : {});

// ── 1) 앱이 소리 내는 글 ─────────────────────────────────────────────
const ts = require(path.join(ROOT, "node_modules", "typescript"));
const loadTs = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", "require", js)(m, m.exports, require);
  return m.exports;
};
const { SPOKEN_COURSES, spokenTexts, pairIdOf } = require(path.join(ROOT, "scripts", "lib", "spoken-texts.cjs"));
const vs = loadTs("src/lib/vocaSpeech.ts"), vu = loadTs("src/lib/vocaUtils.ts"), lu = loadTs("src/lib/listeningUtils.ts"), la = loadTs("src/lib/lessonAudioText.ts");
const fns = { vocaSpeechForm: vs.vocaSpeechForm, getCollocation: vu.getCollocation, generateLiaisonPoints: lu.generateLiaisonPoints, extractSentencesForAudio: la.extractSentencesForAudio, firstSlashAlternative: lu.firstSlashAlternative, vocaWordSpeech: vs.vocaWordSpeech, readingWordSpeech: vs.readingWordSpeech };
for (const [k, f] of Object.entries(fns)) if (typeof f !== "function") throw new Error(`${k} 못 불러옴 — 소리 내는 글 목록이 틀림`);
// 생성기 normalizeText 와 같은 것(src/lib/unifiedSpeech.ts 와 맞춤) — 생성기 코드에서 읽어 와 비교한다(아래 sameNormalize)
const normalizeText = (t) => t.replace(/\s*\/\s*/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/:{2,}/g, " ").replace(/-{2,}/g, " ").replace(/[…]+/g, " ").replace(/\s*\|\s*/g, ", ").replace(/\(\s*\)/g, " ").replace(/\s+/g, " ").trim();
const gen = fs.readFileSync(path.join(ROOT, "scripts", "generate-azure-ava.mjs"), "utf8");
const genNorm = (gen.match(/function normalizeText\(text\) \{\s*return text([\s\S]*?);\s*\}/) || [])[1];
if (!genNorm || genNorm.replace(/\s+/g, "") !== `.replace(/\\s*\\/\\s*/g, " ").replace(/\\[[^\\]]*\\]/g, " ").replace(/:{2,}/g, " ").replace(/-{2,}/g, " ").replace(/[…]+/g, " ").replace(/\\s*\\|\\s*/g, ", ").replace(/\\(\\s*\\)/g, " ").replace(/\\s+/g, " ").trim()`.replace(/\s+/g, "")) {
  console.error("생성기 normalizeText 가 바뀜 — 이 도구의 normalizeText 를 맞출 것"); process.exit(1);
}
const isSpeakable = (t) => /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(t);
const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json"));
const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json"));
const routes = readJson(path.join(ROOT, "src", "lib", "generated", "validRoutes.json")).lessons || {};
const rows = [];
const lessonFiles = {};
for (const course of SPOKEN_COURSES) {
  const routed = new Set(routes[course] || []);
  if (!routed.size) throw new Error(`validRoutes 에 ${course} 없음`);
  const index = readJson(path.join(ROOT, "content", "courses", `${course}.json`)).lessons || [];
  const dir = path.join(ROOT, "content", "lessons", course);
  const lessons = new Map(fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f.slice(0, -5), readJson(path.join(dir, f))]));
  lessonFiles[course] = lessons;
  for (const [id, lesson] of lessons) {
    if (!routed.has(id)) continue;
    const pairId = pairIdOf(course, id, index);
    const pair = pairId ? { id: pairId, ...(lessons.get(pairId) || {}) } : null;
    const seen = new Set();
    for (const raw of spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns })) {
      const clean = normalizeText(fns.vocaSpeechForm(String(raw)));
      if (!clean || !isSpeakable(clean) || seen.has(clean)) continue;
      seen.add(clean);
      rows.push({ course, id, pairId, text: clean });
    }
  }
}
if (BREAK) rows[Math.floor(rows.length / 2)].text += " We visited Gyeongbokgung.";
const distinct = new Set(rows.map((r) => r.text));
const expect = opt("--expect-items");
if (expect && Number(expect) !== distinct.size && !BREAK) { console.error(`소리 내는 글 ${distinct.size} ≠ 생성기 items ${expect} — 목록이 어긋남`); process.exit(1); }

// ── 2) 후보(넓게) ───────────────────────────────────────────────────
const tok = /[A-Za-zÀ-ÿŏŭŎŬ]+(?:[-'’][A-Za-zÀ-ÿŏŭŎŬ]+)*/g;
const stats = new Map();
for (const r of rows) for (const s of r.text.split(/(?<=[.!?])\s+/)) {
  let first = true;
  for (const m of s.matchAll(tok)) {
    const key = m[0].toLowerCase().replace(/['’]s$/, "");
    const st = stats.get(key) || { n: 0, lowerMid: 0 };
    st.n++;
    if (!first && /^[a-zà-ÿŏŭ]/.test(m[0])) st.lowerMid++;
    stats.set(key, st);
    first = false;
  }
}
const english = new Set();
for (const [k, v] of Object.entries(dictionary)) { english.add(k.toLowerCase()); if (v && v.searchWord) english.add(String(v.searchWord).toLowerCase()); }
for (const d of lessonFiles.reading.values()) for (const v of d.readingVocabulary || []) if (v && v.word) for (const w of String(v.word).toLowerCase().split(/[^a-z]+/)) if (w) english.add(w);
const SYL = "(?:kk|gg|tt|dd|pp|bb|ss|jj|tch|ch|sh|g|k|n|d|t|r|l|m|b|p|s|j|h|w|y|f)?(?:yae|yeo|wae|eui|ae|ya|eo|ye|wa|oe|yo|wo|we|wi|yu|eu|ui|oo|ee|ou|oi|ay|a|e|o|u|i|ŏ|ŭ|wŏ|yŏ)(?:ng|kk|ss|k|g|n|t|d|l|r|m|p|b|s)?";
const wholeKo = new RegExp(`^(?:${SYL})+$`);
const candidates = [...stats].filter(([k, st]) => { const b = k.replace(/[-'’]/g, ""); return b.length >= 2 && wholeKo.test(b) && !english.has(k) && !english.has(b) && st.lowerMid < 3; }).map(([k]) => k);

// ── 3) 사람이 본 판정 ────────────────────────────────────────────────
// KO: 한국어 낱말 → 한글(읽을 꼴). 여러 낱말 이름은 PHRASES 로 통째로(홍길동 · 이순신 · 한성순보 …).
const PHRASES = [
  ["Hong Gil Dong", "홍길동"], ["Yi Sun-sin", "이순신"], ["Hanseong Sunbo", "한성순보"], ["Hanseong Jubo", "한성주보"],
];
const KO = {
  seoul: "서울", busan: "부산", suwon: "수원", yongin: "용인", jeju: "제주", gyeongju: "경주", gangwon: "강원", gyeonggi: "경기", "gyeongsang-do": "경상도",
  halla: "한라", songnisan: "속리산", han: "한", bulguksa: "불국사", heungdeok: "흥덕", cheongju: "청주", jikji: "직지",
  gojoseon: "고조선", goguryeo: "고구려", baekje: "백제", silla: "신라", goryeo: "고려", joseon: "조선",
  hwanin: "환인", hwanung: "환웅", ungnyeo: "웅녀", dangun: "단군", sejong: "세종", yi: "이", kim: "김",
  seollal: "설날", chuseok: "추석", songpyeon: "송편", hanbok: "한복", kimchi: "김치", bulgogi: "불고기", hangul: "한글", hanji: "한지",
  hanseong: "한성", sunbo: "순보", jubo: "주보", "sun-sin": "순신", hong: "홍", gil: "길", dong: "동",
};
// 한국어 이름인데 이 글에서는 한국어가 아닌 사람 · 영어 낱말인 것(과정 · 까닭) — 낱말 판정보다 먼저 본다
const NOT_IN = [
  { word: "kim", course: "ld", why: "LISTENING 의 Kim(Kim Norris · Carlos 와 Kim) — 미국 사람 이름, 영어 발음이 맞음" },
];
const NOT = new Set(("korea korean koreans korea's korea’s i'm i’m we're we’re she's here's he'd we'd i'd don bob tom ben pete pete's jim al sue dad pat ted roger jean rod " +
  "george washington israelis israeli israel mississippi russian european louis patterson makeup kingdom non-fattening part-time langdon georges inuit michael rigoletto galileo " +
  "e-businesses poe's joe swiss mussolini san fernando huskisson usa pepsi fattening issues potatoes chess motionless bitten possesses rebuilding submitting surgeon atlanta-based " +
  "suing butter buttered marionettes salespeople shipped europe's bookkeeper permitting susan forgetfulness gossip toenail wi-fi someone's motto possessed attached upper messages " +
  "homeless operagoer mass wireless losses people’s guessing letting businessmen guides weaknesses suppertime united italian alaska lite cherokee angeles aboriginal japan los chinese " +
  "watson london asia halloween portuguese helen peter morton inga mubarak palestinian charles holmes benjamin pomo indian jensen sawyer mays filipino nobel asian dallas madison norris " +
  "indies rome montag wilbur bachelor norway estes twain jonker kaplan yosemite paris willie sundays gates saturdays reagan atlanta sophia taliban danes laden pakistanis shakespeare " +
  "james persian william wenger anne laura guadeloupe gilda karen miller austin warner ellis detroit martian manchester india burma jones ohio iii anchorage nome boston logan maya " +
  "apache sigrid paul tempe sodom goose bible babel well-earned life-long head-on big-league auto-making athenian darwin human-made lunar interior pakistan dole mondale rear-ended " +
  "argentina barbara ellie kenya nile sahara jordan patralis jules naiba lewis madrid taylor gibson toronto lakeside wilma superdome mardi wendel michigan wilson dayton napa shipton " +
  "iditarod alaska's nenana one-eyed margaret bering pueblo bureau torkelson genoa norwegian burmese peru tibet hawaii minnesota minneapolis samuel langhorne jumping rita wayne " +
  "chesapeake maria roman far-away augustine miami seminole sherman good-natured tang wagner e-mail deep-seated jasmine seminar sas johannes iranian on-line harrison legionella edgar " +
  "allan purloined paper-making sumerian saudi arabia bannister belgian palladium re-plan yang liwei china's guus ii man-made role-playing web ro chin " +
  "surname oral angela marta irene fulton estelle managing missouri mining poe likewise rarer").split(/\s+/));
// 한국어 이름 판정에서 뺀 낱말 가운데 성씨처럼 쓰일 수 있는 영어 낱말(문장 가운데 대문자면 따로 봄)
const SURNAME_LIKE = /(?<=\S\s+)(Park|Oh|Moon|Song|Son|Lee|Choi|Jung|Kang|Cho|Yoon|Jang|Lim|Shin|Kwon|Hwang|Ahn|Yoo|Jeon|Ko|Bae|Baek|Nam|Min|Ryu|Jin)(?![A-Za-z])/;
const unjudged = candidates.filter((k) => !(k in KO) && !NOT.has(k) && !english.has(k));
const ordinaryLeft = unjudged.filter((k) => !/^[a-z]/.test(k) || true);
// 사람이 본 판정 밖의 후보: 소문자로만 쓰인 흔한 영어 낱말이 대부분 — 한국어 꼴 글자(eo · eu · yeo · ae · kk · jj · gw · gy)가 있거나 대문자로만 쓰인 것만 멈춤 사유로
const cap = new Map();
for (const r of rows) for (const m of r.text.matchAll(tok)) { const k = m[0].toLowerCase().replace(/['’]s$/, ""); if (/^[A-Z]/.test(m[0])) cap.set(k, true); }
const koShape = /(eo|eu|yeo|ae|kk|jj|gw|gy|ŏ|ŭ)/;
const stop = unjudged.filter((k) => koShape.test(k) || (cap.get(k) && (stats.get(k) || {}).lowerMid === 0));
if (stop.length) {
  console.error(`판정 없는 후보 ${stop.length}(한국어 꼴 글자 또는 대문자로만 쓰임): ${stop.join(" ")}\n→ 문맥을 보고 KO 또는 NOT 에 넣을 것`);
  process.exit(1);
}

// ── 4) 한국어 낱말이 든 글 ───────────────────────────────────────────
const koOf = (course, id, pairId) => {
  const texts = [];
  for (const pid of [id, pairId]) {
    const d = pid && lessonFiles[course].get(pid);
    if (!d) continue;
    const walk = (v) => { if (typeof v === "string") { if (/[가-힣]/.test(v)) texts.push(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
    walk(d);
  }
  return texts.join("\n");
};
const hits = new Map();
for (const r of rows) {
  let spoken = r.text;
  const found = [];
  for (const [en, ko] of PHRASES) if (spoken.includes(en)) { found.push([en, ko]); spoken = spoken.split(en).join(ko); }
  for (const m of r.text.matchAll(tok)) {
    const k = m[0].toLowerCase().replace(/['’]s$/, "");
    if (!(k in KO)) continue;
    if (NOT_IN.some((x) => x.word === k && x.course === r.course)) continue;
    if (PHRASES.some(([en]) => en.split(/\s+/).some((p) => p.toLowerCase() === k) && r.text.includes(en))) continue;
    if (!found.some(([en]) => en === m[0].replace(/['’]s$/, ""))) found.push([m[0].replace(/['’]s$/, ""), KO[k]]);
  }
  const surname = r.text.match(SURNAME_LIKE);
  if (!found.length && !surname) continue;
  for (const [en, ko] of found) spoken = spoken.replace(new RegExp(`(?<![A-Za-z])${en.replace(/[-]/g, "\\-")}(?![A-Za-z])`, "g"), ko);
  const h = hits.get(r.text) || { text: r.text, words: found, spoken, surname: surname ? surname[1] : null, at: [], koCheck: [] };
  h.at.push(`${r.course}/${r.id}`);
  const koText = koOf(r.course, r.id, r.pairId);
  for (const [en, ko] of found) if (!h.koCheck.some((c) => c.en === en)) h.koCheck.push({ en, ko, inKorean: koText.includes(ko) });
  hits.set(r.text, h);
}
const list = [...hits.values()].filter((h) => h.words.length);
const surnameOnly = [...hits.values()].filter((h) => !h.words.length);
const words = {};
for (const h of list) for (const [en, ko] of h.words) { const k = `${en} → ${ko}`; words[k] = (words[k] || 0) + 1; }
const byCourse = {};
for (const h of list) { const c = h.at[0].split("/")[0]; byCourse[c] = (byCourse[c] || 0) + 1; }
console.log(`소리 내는 글 ${distinct.size} · 로마자 낱말 ${stats.size} · 넓은 후보 ${candidates.length} · 한국어 낱말이 든 글 ${list.length}(${JSON.stringify(byCourse)}) · 성씨 꼴 영어 낱말만 든 글 ${surnameOnly.length}`);
const miss = list.flatMap((h) => h.koCheck.filter((c) => !c.inKorean).map((c) => `${h.at[0]} ${c.en}→${c.ko}`));
console.log(`같은 강의 한국어 쪽에 그 한글이 없는 것 ${miss.length}${miss.length ? ": " + miss.join(" · ") : ""}`);
if (OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "목록.json"), JSON.stringify({ 판: ROOT, 소리글: distinct.size, 글: list, 성씨꼴: surnameOnly, 낱말: words }, null, 1));
}
if (BREAK) { console.log("(깨기: 판정 없는 후보로 멈췄어야 함 — 여기까지 오면 실패)"); process.exit(1); }
