// 회귀 점검 1002 고침 A3 — PASS-OFF ④⑤ '낱말 카드' 방해 낱말을 1,290문항 모두 다시 셈(단계3/s3-student-adult-passoff-기록/po-distractors.cjs 를 따름).
// 그때와 다른 점: 문항을 화면이 받는 길 그대로 만든다 — 레슨 파일 → (이용권) 유료 보충 제자리(attachPaidItems) → viewBlocks →
// 서버가 붙이는 partnerForms(src/lib/passoffPartnerForms.ts attachPartnerForms · lessonPartnerWords — passoffContent.ts served 와 같은 차례)
// → 휴대폰의 contrastPool 앞 둘(ComposeCard 가 generateWordBank 에 넘기는 것).
//
// '가짜 낱말' = 사이트 영어(content/ 의 모든 JSON 낱말 + VOCA 사전)에 없는 낱말 — po-distractors.cjs 와 같은 잣대.
// 덧붙여: 단계 3 에서 찾은 가짜 낱말 목록(po-distractors.txt 의 150개)이 하나라도 다시 나오면 실패.
//
//   node docs/qa-2026-09-18/회귀점검-1002/고침/fix-app-passoff/po-distractors-after.cjs            지금 코드 — 가짜 0 이어야 exit 0
//   … --list                                                                                       방해 낱말 중 '짝 꼴'에서 온 것 모두(사람이 읽을 목록)
//   … --break=old <HEAD 판 passoffLesson.ts>   고치기 전 partnersOf(철자만)로 — 가짜가 나와야(exit 1)
//   … --break=any-word                        서버의 낱말 판단을 '모두 낱말'로 — 가짜가 나와야(exit 1)
//   … --free                                  이용권 없는 쪽(무료 강의의 유료 보충 없이)
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../../../..");
process.env.KIG_REPO = REPO;
process.chdir(REPO); // content.ts 가 process.cwd()/content 를 읽음
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));

const args = process.argv.slice(2);
const BREAK = (args.find((a) => a.startsWith("--break=")) || "").slice(8) || null;
const LIST = args.includes("--list");
const FREE = args.includes("--free");
const oldFile = BREAK === "old" ? args.find((a) => !a.startsWith("--")) : null;
if (BREAK === "old" && !oldFile) throw new Error("--break=old 는 고치기 전 passoffLesson.ts 파일 경로가 필요");
if (BREAK && !["old", "any-word"].includes(BREAK)) throw new Error(`모르는 깨기: ${BREAK}`);

const L = loadTs(path.join(REPO, "src/lib/passoffLesson.ts"));
const OLD = oldFile ? loadTs(path.resolve(oldFile)) : null;
const PF = loadTs(path.join(REPO, "src/lib/passoffPartnerForms.ts"));
const SUP = loadTs(path.join(REPO, "src/lib/passoffSupplement.ts"));
const VIEW = loadTs(path.join(REPO, "src/lib/passoffView.ts"));
for (const [n, f] of [["contrastPool", L.contrastPool], ["partnerFormsOf", L.partnerFormsOf], ["attachPartnerForms", PF.attachPartnerForms], ["lessonPartnerWords", PF.lessonPartnerWords], ["attachPaidItems", SUP.attachPaidItems], ["viewBlocks", VIEW.viewBlocks]]) {
  if (typeof f !== "function") throw new Error(`${n} 를 못 불러옴 — 빈 셈으로 통과하지 않게 멈춤`);
}

// 사이트 영어 낱말(po-distractors.cjs 와 같음)
const known = new Set();
const addText = (s) => { for (const w of String(s).toLowerCase().match(/[a-z]+/g) || []) known.add(w); };
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".json")) addText(fs.readFileSync(p, "utf8")); } };
walk(path.join(REPO, "content"));

// 단계 3 이 찾은 가짜 낱말 150개
const foundBefore = new Set(
  fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/회귀점검-1002/단계3/s3-student-adult-passoff-기록/po-distractors.txt"), "utf8")
    .split(/\r?\n/).map((l) => (l.match(/^([a-z]+) ×\d+/) || [])[1]).filter(Boolean),
);
if (foundBefore.size < 100) throw new Error(`단계 3 가짜 낱말 목록을 못 읽음(${foundBefore.size})`);

const COURSE = "passoff-grammar";
const ids = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons[COURSE];
let items = 0, withFake = 0, again = 0, partnerTiles = 0, attached = 0;
const fakes = new Map();
const partners = new Map();
for (const id of ids) {
  const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", COURSE, `${id}.json`), "utf8"));
  const pf = path.join(REPO, "content/private", COURSE, `${id}.paid.json`);
  const supplement = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")) : null;
  const blocks = supplement && supplement.items.length && !FREE ? SUP.attachPaidItems(lesson.blocks, supplement.items) : lesson.blocks;
  let words = PF.lessonPartnerWords([lesson.blocks, supplement ? supplement.items : []]);
  if (BREAK === "any-word") words = { ...words, isWord: () => true };
  const served = PF.attachPartnerForms(VIEW.viewBlocks(blocks), words);
  for (const b of served) {
    if (b.type !== "drill") continue;
    for (const it of [...(b.produce || []), ...(b.transfer || [])]) {
      items++;
      if (Array.isArray(it.partnerForms)) attached++;
      const pool = (OLD ? OLD.contrastPool(it) : L.contrastPool(it)).slice(0, 2);
      const fromPatterns = L.contrastPool({ en: it.en, errorPatterns: it.errorPatterns, partnerForms: [] });
      const fake = pool.filter((w) => /^[A-Za-z]+$/.test(w) && !known.has(w.toLowerCase()));
      const back = pool.filter((w) => foundBefore.has(w.toLowerCase()));
      if (fake.length || back.length) withFake++;
      if (back.length) again++;
      for (const w of new Set([...fake, ...back])) { const e = fakes.get(w) || { n: 0, ex: [] }; e.n++; if (e.ex.length < 2) e.ex.push(`${it.id} '${it.en.slice(0, 50)}'`); fakes.set(w, e); }
      for (const w of pool) if (!fromPatterns.includes(w)) { partnerTiles++; const e = partners.get(w) || { n: 0, from: new Set() }; e.n++; e.from.add((it.targets || []).flat().join("/")); partners.set(w, e); }
    }
  }
}
console.log(`문항 ${items}${FREE ? " (이용권 없는 쪽)" : ""}${BREAK ? ` · 깨기 ${BREAK}` : ""} · partnerForms 붙은 문항 ${attached} · 앞 둘 중 짝 꼴 ${partnerTiles}장(낱말 ${partners.size}개)`);
console.log(`사이트 영어에 없거나 단계 3 가짜 목록에 있는 방해 낱말이 든 문항 ${withFake} (그중 단계 3 목록 ${again})`);
for (const [w, e] of [...fakes].sort((a, b) => b[1].n - a[1].n).slice(0, 40)) console.log(`  ${w} ×${e.n} — ${e.ex.join(" · ")}`);
if (LIST) for (const [w, e] of [...partners].sort()) console.log(`  짝 ${w} ×${e.n} ← ${[...e.from].slice(0, 3).join(" | ")}`);
if (items !== 1290 && !FREE) { console.log(`문항 수가 1,290 이 아님(${items}) — 실패`); process.exit(1); }
process.exit(withFake ? 1 : 0);
