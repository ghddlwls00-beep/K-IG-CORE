#!/usr/bin/env node
/**
 * The READING cards the dictionary pass could not reach: inflected forms.
 *
 *   node docs/qa-2026-09-15/scripts/fix-reading-vocab-inflected.cjs           # 미리보기
 *   node docs/qa-2026-09-15/scripts/fix-reading-vocab-inflected.cjs --write
 *
 * fix-reading-vocab.cjs matched on an exact headword and deliberately refused
 * to stem, because stemming had turned "notes" into "not" and the card would
 * have read 아니. That left cards like pr058's "processes → 프로세스" behind.
 *
 * WHAT MAKES STEMMING SAFE HERE. Two things the earlier pass did not have:
 *
 *   1. The longest base wins. Every rule is tried and the longest result that
 *      is a headword is taken, so "notes" resolves to "note" (메모) rather than
 *      "not" (아니다) — both are in the dictionary, and taking the first rule
 *      that fired chose the wrong one.
 *   2. The card's CURRENT gloss must be one the 2026-09-15 audit named as
 *      wrong. A false stem match would have to also be carrying a flagged
 *      gloss, which is why this is narrow enough to apply.
 *
 * All 85 were read against the sentence the word actually appears in, and the
 * headword's gloss turned out to be the wrong sense often enough that it cannot
 * be trusted on its own: "terminals" in a passage about public computers is
 * 단말기, not 종착역; "spots" on skin is 반점, not 장소. Those are written by hand
 * below. Two cards were already correct and are left alone.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const RDIR = path.join(ROOT, "content/lessons/reading");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/reading-vocab-inflected.md");

const dict = JSON.parse(fs.readFileSync(path.join(ROOT, "content/voca_dictionary.json"), "utf8"));
const defects = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/voca-meaning-defects.json"), "utf8")));

const gloss = (w) => String(dict[w]?.meaning ?? dict[w]?.korean ?? "").trim();
const byLower = new Map();
for (const w of Object.keys(dict)) byLower.set(w.toLowerCase().replace(/\(.*?\)/g, "").trim(), w);
const KNOWN_BAD = new Set(defects.map((d) => d.shown));

/**
 * Cards whose gloss is already right for the passage. They only surfaced
 * because the filter matches a *string* the audit flagged, and the same string
 * is correct here: pr204 quotes "too many cooks spoil the broth", where cooks
 * really is 요리사, and pr117's "the finishing touch" really is 마무리.
 */
const LEAVE = new Set(["pr204:cooks", "pr117:finishing"]);

/**
 * Written by hand from the sentence each card appears in. The dictionary entry
 * itself stays as it is — "slow" really is 느린, "terminal" really is 말기의 —
 * and only the card carries the sense this passage uses.
 *
 * Keyed "lesson:word" where one word means different things in different
 * lessons, otherwise by the word. pr113's "saving" is 절약 ("a fifty percent
 * saving in natural gas") while pr188's is 저축 ("saving to buy a bicycle").
 */
const OVERRIDE = {
  // verb forms sitting under an adjective or noun headword
  slowed: "늦추다; 느린",
  slows: "늦추다; 느린",
  wronged: "부당하게 대하다",
  stresses: "스트레스를 주다",          // "Crowding stresses us."
  pressing: "압박하다, 밀어붙이다",      // "groups constantly pressing for advantage"
  presented: "제시하다, 보여주다",       // "Below are presented some methods"
  storing: "저장하다, 보관하다",
  stored: "저장하다, 보관하다",
  viewed: "보다, 여기다",               // "when proverbs are viewed without qualifications"
  "pr051:saves": "저축하다, 모으다",     // "saves all he gets"

  // noun forms sitting under a verb headword
  advances: "발전, 진보",               // "many advances in technology"
  points: "점수; 요점",                 // "score more points"
  drawing: "그리기, 그림",              // "the activity of drawing"
  labeling: "표시(하기), 라벨 붙이기",   // "mandatory labeling of ... products"
  "pr113:saving": "절약",               // "a fifty percent saving in ... natural gas"
  "pr188:saving": "저축(하기)",          // "worry about saving to buy a bicycle"

  // the headword's other sense is the one this passage means
  based: "~에 근거한, ~을 바탕으로 한",
  terminals: "단말기",                  // "computers ... available at terminals"
  centers: "중심지; 시설",              // "cafes, social centers, libraries"
  spots: "점, 반점",                    // "Moles are dark spots on human skin."
  types: "유형, 종류",
  patterns: "양상, 방식",
  colder: "더 추운, 더 차가운",

  // every "turn" in these passages is 변하다 / 향하다, not 회전
  turns: "돌다; 변하다, ~하게 되다",
  turned: "돌다; 변하다, ~하게 되다",
  turning: "돌다; 변하다, ~하게 되다",
};

const FORMS = [
  (w) => w.replace(/ies$/, "y"),
  (w) => w.replace(/sses$/, "ss"),
  (w) => w.replace(/es$/, ""),
  (w) => w.replace(/s$/, ""),
  (w) => w.replace(/ing$/, ""),
  (w) => w.replace(/ing$/, "e"),
  (w) => w.replace(/ed$/, ""),
  (w) => w.replace(/ed$/, "e"),
  (w) => w.replace(/ier$/, "y"),
  (w) => w.replace(/er$/, ""),
  (w) => w.replace(/est$/, ""),
];

// Decide everything first, check the decisions, and only then write — so a
// mistyped override key cannot leave half the lessons already edited.
const changes = [];
const usedOverrides = new Set();
const planned = new Map(); // lesson → [{ card, key, want }]
for (const f of fs.readdirSync(RDIR).sort()) {
  if (!/^pr\d+\.json$/.test(f)) continue;
  const p = path.join(RDIR, f);
  const lesson = f.replace(".json", "");
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const v of j.readingVocabulary || []) {
    const word = String(v.word ?? v.english ?? "").trim();
    const key = "korean" in v ? "korean" : "meaning";
    const ko = String(v[key] ?? "").trim();
    if (!word || !ko || !KNOWN_BAD.has(ko)) continue;
    const lower = word.toLowerCase();
    if (LEAVE.has(`${lesson}:${lower}`)) continue;
    if (byLower.has(lower)) continue; // the exact pass already handled these

    let best = null;
    for (const form of FORMS) {
      const base = form(lower);
      if (base.length < 3 || base === lower) continue;
      const head = byLower.get(base);
      if (!head) continue;
      if (!best || base.length > best.base.length) best = { base, head };
    }
    if (!best) continue;

    const oKey = `${lesson}:${lower}` in OVERRIDE ? `${lesson}:${lower}` : lower;
    const overridden = oKey in OVERRIDE;
    if (overridden) usedOverrides.add(oKey);
    const want = overridden ? OVERRIDE[oKey] : gloss(best.head);
    if (!want || want === ko) continue;
    changes.push({ lesson, word, from: ko, to: want, head: best.head, overridden });
    if (!planned.has(lesson)) planned.set(lesson, []);
    planned.get(lesson).push({ word, key, want });
  }
}

// An override that matched nothing is a typo in the key, and it would fail
// silently: the card would quietly take the headword's gloss instead.
const unused = Object.keys(OVERRIDE).filter((k) => !usedOverrides.has(k));
if (unused.length) {
  console.error(`🔴 쓰이지 않은 손수정 ${unused.length}건 — 키가 틀렸습니다. 아무것도 쓰지 않았습니다.`);
  for (const k of unused) console.error(`   ${k}`);
  process.exit(1);
}

// Reading lessons are a mix of 1- and 2-space indentation, left over from the
// passes that wrote them. Re-emit each file at the width it already uses, so
// the diff is the glosses and nothing else.
const indentOf = (raw) => {
  const second = raw.split("\n")[1] ?? "";
  const n = second.length - second.trimStart().length;
  return n > 0 ? n : 2;
};

if (WRITE) {
  for (const [lesson, items] of planned) {
    const p = path.join(RDIR, `${lesson}.json`);
    const raw = fs.readFileSync(p, "utf8");
    const indent = indentOf(raw);
    const j = JSON.parse(raw);
    for (const it of items) {
      const card = (j.readingVocabulary || []).find(
        (v) => String(v.word ?? v.english ?? "").trim() === it.word,
      );
      if (!card) { console.error(`🔴 ${lesson} "${it.word}" 카드를 다시 못 찾음`); process.exit(1); }
      card[it.key] = it.want;
    }
    const out = JSON.stringify(j, null, indent) + (raw.endsWith("\n") ? "\n" : "");
    fs.writeFileSync(p, out, "utf8");
  }
}

console.log(`어형변화 카드 교정 : ${changes.length}`);
const over = changes.filter((c) => c.overridden);
console.log(`  그중 본문에 맞춰 손수정 : ${over.length}`);
for (const c of over) console.log(`    ${c.lesson} ${c.word.padEnd(12)} "${c.from}"  →  "${c.to}"   (표제어 ${c.head} 는 "${gloss(c.head)}")`);
console.log(`  뜻이 이미 맞아 손대지 않음 : ${[...LEAVE].join(", ")}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# READING 어휘 — 어형변화 카드 교정", "",
  "> 정확 일치 패스가 닿지 못한 카드입니다. 표제어를 어형에서 되찾되,",
  "> **가장 긴 어간**을 택해 `notes → not`(아니) 같은 오인을 막았습니다.",
  "> 그리고 **감사가 틀렸다고 지목한 뜻**을 쓰는 카드만 바꿉니다.", "",
  `교정 ${changes.length}장`, "",
  "| 레슨 | 카드 단어 | 표제어 | 이전 | 이후 |", "|---|---|---|---|---|"];
for (const c of changes) L.push(`| ${c.lesson} | ${esc(c.word)} | ${esc(c.head)} | ${esc(c.from)} | ${esc(c.to)}${c.overridden ? " ⟵ 품사 보정" : ""} |`);
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
else console.log(`\n✅ ${changes.length}장 기록. 🔴 뜻이 바뀌었으니 음성 클립을 확인하세요.`);
