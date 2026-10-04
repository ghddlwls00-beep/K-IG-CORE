#!/usr/bin/env node
/**
 * 화면에 보이는 영어 속 한국어 낱말 — 남은 로마자를 찾는다 (사장님 2026-10-02 "표기는 한국어로 다 변경하자" · "어 있는거 싹다
 * 꼼꼼히 찾아서 다 작업해").
 *
 * 소리 내는 글만이 아니라 강의 파일의 **모든 글 칸**(제목 · 문장 · 정답 · 다른 정답 · 해설 · 표 · 문제)과 과정 목록을 본다.
 *   STUDENT · READING · ADULT  — 한국어 낱말은 한글로만 적혀야 한다(로마자가 남으면 실패). 소리는 lessonSpeechForm 이 되돌림.
 *   GRAMMAR II · PASS-OFF GRAMMAR — 강의 파일은 영어 표기(채점 · 소리 그대로), 화면은 한글만(src/lib/koreanGloss.ts koreanOnScreen —
 *                                  사장님 "한국어 로마식표기를 다 한국어로 바꿔"). 그린 글에 로마자 낱말이 남으면 실패(표에 없는 쪽 · 철자).
 *   GRAMMAR I · VOCA · LISTENING — 한국어 낱말이 없어야 한다. LISTENING 의 Kim 은 미국 사람(d011 · d012 · d025 · d026)이라 뺀다.
 * 낱말 목록: korean-names-in-speech.cjs 의 KO 판정 + 아래 VARIANTS(다른 철자) + 한국어 음절 꼴(그 도구와 같은 체)인데 영어 판정이
 * 없는 새 낱말(멈춤 — 판정해서 넣을 것).
 *
 *   node docs/adult/korean-words-on-screen.cjs          # 0 이면 exit 0
 *   node docs/adult/korean-words-on-screen.cjs --break  # STUDENT s20-4 첫 문장에 'Gyeongju' 를 몰래 되돌려 실패하는지(깨기)
 *   node docs/adult/korean-words-on-screen.cjs --break=grammar  # GRAMMAR II gh2-033 을 한글로 바꾸지 않고 그렸을 때 실패하는지
 *   node docs/adult/korean-words-on-screen.cjs --break=adult    # ADULT a1-2 #2 의 '서울' 을 'Seoul' 로 되돌렸을 때 실패하는지
 *   node docs/adult/korean-words-on-screen.cjs --break=passoff  # PASS-OFF pg06-1 을 한글로 바꾸지 않고 그렸을 때 실패하는지
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const BREAK = process.argv.includes("--break");
/** --break=grammar: GRAMMAR II gh2-033 drawn without koreanOnScreen ("Busan" left in Latin letters) — must fail */
const BREAK_GRAMMAR = process.argv.includes("--break=grammar");
// 2026-10-04 회귀 점검 단계 0: ADULT · PASS-OFF 쪽 깨기 — --break=adult (a1-2 #2 '서울' 을 'Seoul' 로 되돌림) ·
// --break=passoff (pg06-1 을 koreanOnScreen 없이 그림 — 'Chuseok' 이 로마자로 남음). 둘 다 FAIL 이어야 검사가 살아 있음.
const BREAK_ADULT = process.argv.includes("--break=adult");
const BREAK_PASSOFF = process.argv.includes("--break=passoff");
const rj = (f) => JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
const ts = require(path.join(ROOT, "node_modules", "typescript"));
const loadTs = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", "require", js)(m, m.exports, require);
  return m.exports;
};
const { koreanOnScreen } = loadTs("src/lib/koreanGloss.ts");

const judged = fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-18/내용-재검토/scripts/korean-names-in-speech.cjs"), "utf8");
const KO = eval("(" + judged.match(/const KO = (\{[\s\S]*?\n\});/)[1] + ")");
const NOT = eval(judged.match(/const NOT = (new Set\([\s\S]*?\.split\(\/\\s\+\/\)\));/)[1]);
/** other spellings of the same Korean words, as the lessons write them */
const VARIANTS = [
  "pusan", "hangang", "gyeongsangdo", "kyungsangdo", "gyeongsang", "hankuk", "dae-han", "jeong", "lee", "soon-shin", "sun-shin",
  "soon-sin", "sunsin", "chu-seok", "seol-lal", "soungni-san", "song-pyun", "song-pyeon", "je-ju", "mina", "minguk", "jjimjilbang",
  "gwangju", "hagwons", "gyeong-ju", "gyoung-gi", "shilla", "goguryo", "gojoson", "hwan-in", "hwan-ung", "ung-nyo", "dan-goon",
  "han-bok", "se-jong", "bulguk-temple", "soungni-san", "dae",
];
/** words a lesson uses that are English, not Korean (the judging tool's NOT, plus these) */
const ENGLISH = new Set(["k-ig", "heated", "osteoporosis", "reuse", "euthanasia", "aeroplane", "peoples", "chael", "walkked", "walkking"]);
const KNOWN = new Set([...Object.keys(KO), ...VARIANTS]);
const SYL = "(?:kk|gg|tt|dd|pp|bb|ss|jj|tch|ch|sh|g|k|n|d|t|r|l|m|b|p|s|j|h|w|y|f)?(?:yae|yeo|wae|eui|ae|ya|eo|ye|wa|oe|yo|wo|we|wi|yu|eu|ui|oo|ee|ou|oi|ay|a|e|o|u|i)(?:ng|kk|ss|k|g|n|t|d|l|r|m|p|b|s)?";
const wholeKo = new RegExp(`^(?:${SYL})+$`);
const koShape = /(eo|eu|yeo|ae|kk|jj|gw|gy)/;
const dict = rj(path.join(ROOT, "content/voca_dictionary.json"));
const english = new Set(Object.keys(dict).map((k) => k.toLowerCase()));
const LD_AMERICAN_KIM = new Set(["d011", "d012", "d025", "d026"]);

const routes = rj(path.join(ROOT, "src/lib/generated/validRoutes.json")).lessons;
const HANGUL_ONLY = ["student", "adult", "reading"];
const GLOSSED = ["grammar2", "passoff-grammar"];
const NONE = ["grammar1", "phonics", "ld"];
const SKIP_KEY = /^(id|legacyPath|legacySrc|src|legacyEncoding|legacyFlash|course|series|variant|pairId|type|lang|audio|video|koreanWords)$/;

const fails = [];
const unjudged = new Map();
let checked = 0;
function strings(v, p, out) {
  if (typeof v === "string") out.push([p, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${p}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!SKIP_KEY.test(k)) strings(x, p ? `${p}.${k}` : k, out);
  return out;
}
const tok = /[A-Za-z]+(?:[-'’][A-Za-z]+)*/g;
/** PASS-OFF fields the screen never draws (src/lib/passoffView.ts strips fix · note · challengeNote · bookRef; patterns and targets are matched, not shown) */
const PASSOFF_NOT_DRAWN = /(^|\.)(fix|note|challengeNote|bookRef)(\.|$|\[)|errorPatterns\[\d+\]\.match|\.targets\[/;
function look(course, page, where, text) {
  if (!/[A-Za-z]/.test(text)) return;
  if (course === "passoff-grammar" && PASSOFF_NOT_DRAWN.test(where)) return;
  checked++;
  for (const m of text.matchAll(tok)) {
    const w = m[0].replace(/['’]s$/, "");
    const k = w.toLowerCase();
    if (k === "kim" && course === "ld" && LD_AMERICAN_KIM.has(page.split("/")[1].replace(/-1$/, ""))) continue;
    if (KNOWN.has(k) && /^[A-Za-z]/.test(w) && !(k === "lee" && course !== "passoff-grammar") && !(k === "dae" && course !== "passoff-grammar") && !(k === "mina" && course !== "passoff-grammar")) {
      if (HANGUL_ONLY.includes(course) || NONE.includes(course)) fails.push(`${page} ${where}: '${w}' — ${text.slice(0, 120)}`);
      else if (GLOSSED.includes(course)) {
        // drawn through koreanOnScreen — the word must not be left in Latin letters on screen (a spelling the page's table lacks is)
        const shown = (BREAK_GRAMMAR && page === "grammar2/gh2-033") || (BREAK_PASSOFF && page === "passoff-grammar/pg06-1") ? text : koreanOnScreen(page, text);
        if (new RegExp(`(^|[^A-Za-z])${w}([^A-Za-z]|$)`).test(shown)) fails.push(`${page} ${where}: '${w}' still in Latin letters on screen — ${shown.slice(0, 120)}`);
      }
    } else if (!KNOWN.has(k) && !NOT.has(k) && !ENGLISH.has(k) && !english.has(k) && k.length >= 3 && wholeKo.test(k.replace(/[-'’]/g, "")) && koShape.test(k)) {
      if (!unjudged.has(k)) unjudged.set(k, `${page} ${where}: ${text.slice(0, 100)}`);
    }
  }
}

for (const course of [...HANGUL_ONLY, ...GLOSSED, ...NONE]) {
  const routed = new Set(routes[course] || []);
  const dir = path.join(ROOT, "content/lessons", course);
  for (const f of fs.readdirSync(dir)) {
    const id = f.replace(/\.json$/, "");
    if (!routed.has(id)) continue;
    const lesson = rj(path.join(dir, f));
    if (BREAK && course === "student" && id === "s20-4") lesson.blocks.find((b) => b.type === "sentences").items[0].text = "Another attractive destination is Gyeongju.";
    if (BREAK_ADULT && course === "adult" && id === "a1-2") { const it = lesson.blocks.find((b) => b.type === "sentences").items[1]; it.text = it.text.replace("서울", "Seoul"); }
    for (const [where, text] of strings(lesson, "", [])) look(course, `${course}/${id}`, where, text);
  }
  for (const [where, text] of strings(rj(path.join(ROOT, "content/courses", `${course}.json`)), "", [])) look(course, `index:${course}`, where, text);
}
const priv = path.join(ROOT, "content/private/passoff-grammar");
for (const f of fs.existsSync(priv) ? fs.readdirSync(priv) : []) {
  const id = f.replace(/\.paid\.json$/, "");
  for (const [where, text] of strings(rj(path.join(priv, f)), "", [])) look("passoff-grammar", `passoff-grammar/${id}`, `paid ${where}`, text);
}
const ldScripts = rj(path.join(ROOT, "content/ld_english_scripts.json"));
for (const [id, rows] of Object.entries(ldScripts)) for (const [where, text] of strings(rows, "", [])) look("ld", `ld/${id}`, `script ${where}`, text);

if (unjudged.size) {
  console.error(`판정 없는 한국어 꼴 낱말 ${unjudged.size} — 한국어면 VARIANTS(또는 판정 도구 KO), 영어면 ENGLISH 에:\n${[...unjudged].map(([k, at]) => `  ${k}  ← ${at}`).join("\n")}`);
}
if (fails.length) {
  console.error(`화면에 남은 로마자 한국어 낱말 ${fails.length}:\n${fails.slice(0, 60).map((x) => "  " + x).join("\n")}`);
}
if (unjudged.size || fails.length) process.exit(1);
console.log(`글 칸 ${checked} — STUDENT · READING · ADULT 는 한글만 · GRAMMAR II · PASS-OFF 도 화면은 한글만 · 다른 과정 0 — PASS`);
