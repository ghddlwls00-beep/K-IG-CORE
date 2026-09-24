#!/usr/bin/env node
/**
 * STUDENT fixes (apply-student.cjs + the S-30 overview pages moved to content/archive) —
 * checks over EVERY served STUDENT lesson (src/lib/generated/validRoutes.json), not a sample.
 *
 *  - every chunk card's English is inside that lesson's own sentences (S-06/S-07: was 0–31 %
 *    for 17 lessons), no Hangul in any English sentence or chunk card (S-07, S-29)
 *  - English sentence count = Korean paragraph count, and s19-3 has its 4 sentences (S-05)
 *  - none of the wrong forms the audit listed survive (facts, grammar, spelling, romanization)
 *  - the facts now read right (1945 liberation, 1443 Hangul, Admiral Yi, Yongin, 1999 …)
 *  - the overview pages s1–s5 are no longer served (S-30)
 *
 *   node verify-student-fixes.cjs     exit 0 = every check as expected
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ids = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons.student;
const load = (id) => JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", `${id}.json`), "utf8"));
const norm = (s) => (s || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });

let chunks = 0, chunksIn = 0, lessonsWithChunks = 0;
const notIn = [], hangulEn = [], countMismatch = [];
const allEn = [], allKo = [];
for (const id of ids) {
  const d = load(id);
  const en = d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items.map((i) => i.text));
  const ko = d.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text);
  const text = norm(en.join(" "));
  if (en.length !== ko.length) countMismatch.push(`${id} ${en.length}/${ko.length}`);
  const cards = d.chunkDrills || [];
  if (cards.length) lessonsWithChunks++;
  for (const c of cards) {
    chunks++;
    if (text.includes(norm(c.en))) chunksIn++; else notIn.push(`${id}: ${c.en}`);
    if (/[가-힣]/.test(c.en)) hangulEn.push(`${id} chunk: ${c.en}`);
  }
  for (const t of en) if (/[가-힣]/.test(t)) hangulEn.push(`${id}: ${t}`);
  allEn.push(...en.map((t) => `${id}: ${t}`), ...cards.map((c) => `${id} chunk: ${c.en}`));
  allKo.push(...ko.map((t) => `${id}: ${t}`), ...cards.map((c) => `${id} chunk: ${c.ko}`));
}
check(`served STUDENT lessons = 82 (87 minus the 5 overview pages)`, ids.length === 82, `${ids.length}`);
check("S-30 overview pages s1–s5 not served", !["s1", "s2", "s3", "s4", "s5"].some((x) => ids.includes(x)));
// 2026-09-23 소유자 결정(BUG-024 · 7단계 7-4 c "2번 다 지워"): STUDENT 청크 드릴 데이터를 모두 지움 — 조각이 0 이면 이 검사는
// 해당 없음. 조각이 다시 생기면 전과 같이 모두 제 과 문장 안에 있어야 함.
check(chunks === 0 ? "S-06/S-07 chunk cards — 드릴 데이터 없음(BUG-024, 소유자 결정 2026-09-23 지움)" : `S-06/S-07 chunk cards inside their lesson: ${chunksIn}/${chunks} (${lessonsWithChunks} lessons)`, chunksIn === chunks, notIn.slice(0, 5).join(" | "));
check("S-07/S-29 no Hangul in English sentences or chunk cards", hangulEn.length === 0, hangulEn.slice(0, 5).join(" | "));
check("English sentence count = Korean paragraph count in every lesson", countMismatch.length === 0, countMismatch.join(", "));
const s193 = load("s19-3");
// 청크 조각은 2026-09-23 소유자 결정으로 모든 과에서 지움(BUG-024) — 문장 4개와 PDF 찌꺼기 없음만 봄
check("S-05 s19-3 has 4 dictation sentences (chunk cards: removed 2026-09-23, BUG-024)", s193.blocks.find((b) => b.type === "sentences")?.items.length === 4 && !("chunkDrills" in s193) && !JSON.stringify(s193).includes("PASS-OFF"));

const gone = (label, re, list = allEn) => { const hits = list.filter((t) => re.test(t)); check(`gone: ${label}`, hits.length === 0, hits.slice(0, 3).join(" | ")); };
gone("S-01 1948 liberation / librated", /1948|librated/);
gone("S-02 'As a result … divided'", /As a result, the Korean peninsula/);
gone("S-03 1420 / asked his royal scholars", /1420|asked his royal scholars/);
gone("S-04 'they Chinese characters'", /they Chinese characters/);
gone("S-08 General Soon-Shin Lee / 500 years / conquered them", /Soon-Shin|General Lee|500 years ago|conquered them/);
gone("S-09 three kingdoms united / other countries tried to gain power", /kingdoms united|tried to gain power/);
gone("S-10 Independence Day / Arbor Day", /Independence Day|Arbor Day/);
gone("S-11 school on Saturday", /school on Saturday/i);
gone("S-12 'A few years ago' World Cup / Queen", /A few years ago/);
gone("S-13 folk village 'near the city of Suwon' only", /near the city of Suwon/);
gone("S-14 Bulguk-Temple / Soungni-San / Independence-Hall", /Bulguk-Temple|Soungni-San|Independence-Hall/);
gone("S-15 'my sister and I feel'", /my sister and I\b/);
gone("S-16 s3-3 'He/She a very' / 'and she is good at' (s2-5 is about a sister, so 'she' is right there)", /^s3-3.*(He\/She a very|and she is good at)/);
gone("S-17 'Allow me tell'", /Allow me \(?to\)? ?tell|Let\/Allow/);
gone("S-18 'a bit different from' / anyways", /a bit different from|anyways/);
gone("S-19 'great affect'", /affect on me/);
gone("S-20 stationary store", /stationary store/);
gone("S-21 adverb 'everyday'", /[Ee]veryday I|English everyday/);
gone("S-22 'She had worked'", /She had worked/);
gone("S-23 sleep-in", /sleep-in/);
gone("S-24 glued words / ancestrial / ', People'", /dislikethe|sometimesplay|theShilla|theSilla|ancestrial|, People visit/);
gone("S-27 two sentences in s3-1 #1", /introduce my friend to you\. Allow me/);
gone("S-29 Hangul apartment/school / age 11", /한국|I am 11 years old/);
gone("S-32 romanization/notation (T.V, Shilla, Chu-seok, Gyeong-ju, song-pyeun, han-bok, Dan-goon, Gojoson, Goguryo, 1970's, story teller, Mr./Ms (, Western style, English speaking, seol-lal)", /T\.V|Shilla|Chu-seok|Gyeong-ju|song-pyeun|han-bok|Dan-goon|Gojoson\b|Goguryo\b|1970’s|1970's|story teller|Mr\.\/Ms \(|Western style|English speaking|seol-lal/);
gone("S-25 Korean: youngest child with younger sisters", /여동생이 2명/, allKo);
gone("S-28 Korean: 꿈을 깨닫", /꿈을 깨닫|꿈은 깨닫/, allKo);
gone("S-31 Korean: 국립학교 / 정상적인 계획 / 지질학적 / 이천 미터", /국립학교|정상적인 계획|지질학적|이천 미터/, allKo);
gone("S-33 Korean spelling", /11살 입니다|가정주부 이십니다|그들은매우|시간이 아주 작습니다|매일 월요일|어쨌던|힘이 쌨습니다|원할히|이루어 질것|할아버지할머니|안들 립니다/, allKo);

const has = (id, re) => { const d = load(id); const t = JSON.stringify(d); check(`${id} ${re}`, re.test(t)); };
has("s17-3", /In 1945, Korea was liberated from Japan\./);
has("s17-3", /After the war ended in 1953, the Korean [Pp]eninsula remained divided/); // 6단계 6-1754 가 지명으로 대문자 Peninsula(s17-2 #1 과 같게)
has("s19-4", /in 1443, King Sejong created a unique Korean alphabet, and it was proclaimed in 1446/);
has("s13-2", /Admiral Yi lived more than 400 years ago/);
has("s18-1", /Seollal, Liberation Day/);
has("s15-1", /Korea and Japan co-hosted the World Cup/);
has("s16-1", /In 1999, Queen Elizabeth II visited Korea/);
has("s20-3", /located in Yongin, near Suwon, in Gyeonggi Province/);
has("s20-3", /경기도 용인시/);
has("s17-2", /Silla conquered the other two kingdoms/);

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${r.ok || !r.detail ? "" : `  → ${r.detail}`}`);
console.log(`\n${results.length - failed.length}/${results.length} as expected`);
process.exit(failed.length ? 1 : 0);
