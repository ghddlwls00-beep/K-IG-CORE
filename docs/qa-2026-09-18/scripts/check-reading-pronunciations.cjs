#!/usr/bin/env node
/**
 * BUG-029 — READING 단어 카드는 카드 뜻의 발음으로 소리 내는가 (소유자 결정 2026-09-24 "읽기 카드도 화면 뜻대로 발음").
 *
 * 앱: ReadingLearningView playWordAudio → src/lib/vocaSpeech.ts readingWordSpeech(카드 낱말, 카드 뜻)
 *   — READING_PRONUNCIATIONS 에 있는 철자면 카드 뜻(한국어)에 맞는 규칙의 IPA 로 `<낱말> ⟨<IPA>⟩`(새 클립 이름), 아니면 낱말 그대로.
 * 이 검사(주소 있는 READING 쪽의 readingVocabulary 카드 전부):
 *   ① 표에 있는 철자인데 카드 뜻이 어느 규칙에도 안 맞음 → 실패(새 뜻이 말없이 맨 낱말로 가지 않게)
 *   ② 기본형(lemma)이 표에 있는데 이 철자(굴린 꼴)의 규칙이 없음 → 실패
 *   ③ 발음이 뜻 따라 다른 흔한 낱말(WATCH — 아래 목록, 기본형 또는 철자)인데 표에 없음 → 실패(새 카드가 들어오면 정하게)
 *   ④ 카드 뜻이 발음이 다른 규칙 둘 이상에 맞음 → 실패(첫 규칙이 말없이 이김 — 3차 점검 제안 2026-09-24: minute 의 /분/ 은 '미세한 부분' 의
 *      '부분' 에도 맞는다). 처음 돌렸을 때 6장(3강 × 두 쪽): use '사용하다' · record '기록하다'(첫 규칙 동사가 맞게 이김)와
 *      combat '싸움 (… 맞붙어 싸우는)'(동사 규칙 /싸우/ 가 예문 풀이에 걸려 명사 카드가 동사 소리 — 틀림) → 표의 규칙을 서로 안 겹치게 고침.
 *      규칙 순서로 일부러 가른 카드는 ORDERED 에 까닭과 함께(지금 0)
 *   ⑤ 명사 · 동사 강세 짝(표에 첫 음절 강세 'ˈ…' 와 뒤 음절 강세 '…ˈ…' 발음이 둘 다 있는 낱말 — increase · record · combat …): 카드 품사가
 *      n. 이면 첫 음절 강세, v. 이면 뒤 음절 강세여야 → 아니면 실패. 품사 표시는 뜻과 따로 적힌 것이라 뜻 규칙이 틀리면 여기서도 걸림(combat 이 그랬음)
 *   node docs/qa-2026-09-18/scripts/check-reading-pronunciations.cjs [--list] [--break]
 *     --break  가짜 카드 넷(increase '테스트 뜻' · objects '없는 뜻' → ① · minute '미세한 부분' → ④ · increase n. '늘리다' → ⑤)을 더함 —
 *              실패 4 · exit 1 이어야
 * exit 0 = 실패 0
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const V = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const TABLE = V.READING_PRONUNCIATIONS;
if (!TABLE || typeof V.readingWordSpeech !== "function") { console.error("vocaSpeech.ts 의 READING_PRONUNCIATIONS · readingWordSpeech 를 못 읽음"); process.exit(2); }
const LIST = process.argv.includes("--list");
const BREAK = process.argv.includes("--break");

// 발음이 뜻(품사)에 따라 다른 흔한 영어 낱말 — 기본형. 표에 없는 이 낱말이 카드에 나오면 정하라고 멈춘다.
const WATCH = new Set(["sow", "row", "lead", "wind", "live", "wound", "minute", "resume", "produce", "increase", "decrease", "digest",
  "transfer", "converse", "convert", "extract", "insert", "reject", "refuse", "graduate", "record", "present", "object", "project",
  "content", "desert", "close", "tear", "bow", "read", "use", "conduct", "contract", "permit", "subject", "export", "import", "progress",
  "protest", "rebel", "conflict", "contrast", "escort", "perfect", "suspect", "survey", "upset", "combat", "compound", "estimate",
  "separate", "moderate", "appropriate", "associate", "deliberate", "duplicate", "elaborate", "alternate", "advocate", "approximate",
  "attribute", "bass", "dove", "polish", "entrance", "invalid", "address", "abuse", "excuse", "house", "wound", "does", "lives"]);

// WATCH 낱말의 꼴이지만 이 철자는 뜻과 상관없이 발음이 하나 — 규칙 없이 둠(까닭)
const EXEMPT = {
  reading: "read 의 -ing 꼴은 늘 /ˈriːdɪŋ/ — 두 발음은 과거형 read 에만",
  houses: "명사 복수 · 동사 3인칭 모두 /ˈhaʊzɪz/",
};
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons.reading || [];
const cards = [];
for (const id of routes) {
  const f = path.join(REPO, "content/lessons/reading", `${id}.json`);
  if (!fs.existsSync(f)) continue;
  for (const v of JSON.parse(fs.readFileSync(f, "utf8")).readingVocabulary || []) cards.push({ id, word: String(v.word || ""), lemma: String(v.lemma || ""), korean: String(v.korean || ""), pos: String(v.partOfSpeech || "") });
}
if (BREAK) {
  cards.push({ id: "(깨기)", word: "increase", lemma: "increase", korean: "테스트 뜻", pos: "v." });
  cards.push({ id: "(깨기)", word: "objects", lemma: "object", korean: "없는 뜻", pos: "n." });
  cards.push({ id: "(깨기)", word: "minute", lemma: "minute", korean: "미세한 부분", pos: "adj." });
  cards.push({ id: "(깨기)", word: "increase", lemma: "increase", korean: "늘리다", pos: "n." });
}
// ④ 에서 받아 주는 카드 — `철자|카드 뜻` → 까닭(규칙 순서로 일부러 가른 것). 지금 0
const ORDERED = {};
// ⑤ 명사 · 동사 강세 짝: 표의 발음에 첫 음절 강세와 뒤 음절 강세가 둘 다 있는 낱말
const firstStress = (ipa) => ipa.startsWith("ˈ");
const laterStress = (ipa) => ipa.includes("ˈ") && !ipa.startsWith("ˈ");
const isStressPair = (rules) => rules.some((x) => firstStress(x.ipa)) && rules.some((x) => laterStress(x.ipa));

const fails = [], tagged = new Map();
let multiMatch = 0, multiSame = 0, posChecked = 0;
for (const c of cards) {
  const w = c.word.trim().toLowerCase(), l = c.lemma.trim().toLowerCase();
  const rules = TABLE[w];
  if (rules) {
    const hits = rules.filter((x) => x.meaning.test(c.korean));
    const r = hits[0];
    if (!r) { fails.push(`① ${c.id} ${c.word} '${c.korean.slice(0, 30)}' — 표에 있는 철자인데 이 뜻의 규칙이 없음`); continue; }
    if (hits.length > 1) {
      const ipas = [...new Set(hits.map((x) => x.ipa))];
      if (ipas.length === 1) multiSame++;
      else {
        multiMatch++;
        if (!ORDERED[`${w}|${c.korean}`]) { fails.push(`④ ${c.id} ${c.word} '${c.korean.slice(0, 30)}' — 발음이 다른 규칙 ${hits.length}개에 맞음(${ipas.join(" · ")}) — 첫 규칙이 말없이 이김`); continue; }
      }
    }
    const said = V.readingWordSpeech(c.word, c.korean);
    if (said !== `${c.word.trim()} ⟨${r.ipa}⟩`) { fails.push(`① ${c.id} ${c.word} — 앱 함수가 규칙과 다른 글을 냄: ${said}`); continue; }
    const pos = c.pos.trim().toLowerCase();
    if (isStressPair(rules) && (pos === "n." || pos === "v.")) {
      posChecked++;
      const ok = pos === "n." ? firstStress(r.ipa) : laterStress(r.ipa);
      if (!ok) { fails.push(`⑤ ${c.id} ${c.word} ${c.pos} '${c.korean.slice(0, 30)}' → /${r.ipa}/ — ${pos === "n." ? "명사 카드인데 뒤 음절 강세(동사 소리)" : "동사 카드인데 첫 음절 강세(명사 소리)"}`); continue; }
    }
    tagged.set(said, (tagged.get(said) || 0) + 1);
    if (LIST) console.log(`  ${c.id.padEnd(8)} ${c.word.padEnd(11)} '${c.korean.slice(0, 22)}' → ${said}`);
  } else if (EXEMPT[w]) continue;
  else if (l && TABLE[l]) fails.push(`② ${c.id} ${c.word} ← ${c.lemma} '${c.korean.slice(0, 30)}' — 기본형은 표에 있는데 이 꼴의 규칙이 없음`);
  else if (WATCH.has(w) || WATCH.has(l)) fails.push(`③ ${c.id} ${c.word}${l && l !== w ? ` ← ${c.lemma}` : ""} '${c.korean.slice(0, 30)}' — 발음이 뜻 따라 다른 낱말인데 표에 없음`);
}
const taggedCards = [...tagged.values()].reduce((a, b) => a + b, 0);
console.log(`READING 쪽 ${routes.length} · 카드 ${cards.length}${BREAK ? "(깨기 카드 4 포함)" : ""} · 뜻대로 발음을 붙인 카드 ${taggedCards} · 서로 다른 발음 글 ${tagged.size} · 실패 ${fails.length}`);
console.log(`  ④ 발음이 다른 규칙 둘 이상에 맞는 카드 ${multiMatch}(받아 준 것 ${Object.keys(ORDERED).length}) · 같은 발음 규칙 둘에 맞는 카드 ${multiSame} · ⑤ 강세 짝의 품사(n. · v.)를 본 카드 ${posChecked}`);
for (const f of fails.slice(0, 40)) console.log("  " + f);
process.exit(fails.length ? 1 : 0);
