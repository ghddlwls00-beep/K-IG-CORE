#!/usr/bin/env node
/**
 * Answers the eight questions that decide everything else, straight from the
 * archive's raw bytes. Run this first, before any extraction — it takes seconds
 * and it settles whether the lessons we think are missing ever existed.
 *
 *   node docs/qa-2026-09-15/scripts/archive-probe.cjs "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"
 *
 * Read-only: opens files, writes nothing, touches neither the archive nor
 * content/.
 */
const fs = require("fs");
const path = require("path");

const ARCHIVE = process.argv[2];
if (!ARCHIVE) {
  console.error("사용법: node archive-probe.cjs <아카이브 경로>");
  process.exit(1);
}
if (!fs.existsSync(ARCHIVE)) {
  console.error(`경로를 찾을 수 없습니다: ${ARCHIVE}`);
  process.exit(1);
}

const REPO = path.resolve(__dirname, "../../..");
const ok = (b) => (b ? "✅" : "🔴");

// The archive mixes UTF-8 and EUC-KR. A strict UTF-8 decode throws on invalid
// sequences, which is the reliable signal — this mirrors extract.mjs:121 so the
// verdict here matches what extraction would produce.
function decode(buf) {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buf), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("euc-kr").decode(buf), encoding: "euc-kr" };
  }
}
const REPLACEMENT = /\uFFFD/g;

// Case-insensitive directory lookup: the archive's folder names may not match
// the case recorded in extract.mjs on a case-sensitive mount.
function resolveDir(...parts) {
  let at = ARCHIVE;
  for (const want of parts) {
    if (!fs.existsSync(at)) return null;
    const hit = fs.readdirSync(at).find((e) => e.toLowerCase() === want.toLowerCase());
    if (!hit) return null;
    at = path.join(at, hit);
  }
  return at;
}
function findFile(dir, name) {
  if (!dir || !fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).find((e) => e.toLowerCase() === name.toLowerCase());
  return hit ? path.join(dir, hit) : null;
}

console.log(`아카이브: ${ARCHIVE}\n`);

// ---------------------------------------------------------------- structure
console.log("=== 0. 폴더 구조 ===");
const FOLDERS = { LD: "ld", reading: "reading", phonics: "phonics", grammar1: "grammar1", grammar2: "grammar2", Student: "student", CNN: "cnn" };
const dirs = {};
let foundFolders = 0;
for (const [folder, slug] of Object.entries(FOLDERS)) {
  const d = resolveDir(folder);
  dirs[slug] = d;
  const n = d ? fs.readdirSync(d).filter((f) => /\.html?$/i.test(f)).length : 0;
  if (d && n > 0) foundFolders++;
  console.log(`  ${ok(!!d)} ${folder.padEnd(10)} ${d ? `${n}개 HTML` : "없음"}`);
}

/**
 * Stop when the tree is empty, instead of reporting it as clean.
 *
 * Every question below is of the form "is this lesson present in the archive?",
 * and each answers ✅ when the file is absent — "the original skipped this
 * number too, not a defect". That reading only holds if the archive was
 * actually found. Pointed at a path with none of these folders, the probe
 * printed twelve ✅ lines and the conclusion "원본이 원래 건너뛴 번호. 결함
 * 아님" — a confident all-clear derived from having read nothing. It happened
 * on the first real run: the archive nests the courses under
 * `랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01`, and the top level given on the
 * command line held no course folders at all.
 *
 * A probe whose failure mode is a green light is worse than no probe.
 */
if (foundFolders === 0) {
  console.error(
    "\n🔴 중단: 이 경로에서 과정 폴더를 하나도 찾지 못했습니다.\n" +
    "   아래 질문들은 '파일이 없음 = 원본도 없음 = 정상' 으로 판정하므로,\n" +
    "   경로가 틀린 채로 진행하면 전부 ✅ 로 나옵니다. 그건 답이 아닙니다.\n\n" +
    "   과정 폴더(LD · reading · phonics · grammar1 · grammar2 · Student)가\n" +
    "   직접 들어 있는 폴더를 지정하세요. 아카이브는 보통 여러 겹 안에 있습니다.\n" +
    `   예: ${path.join(ARCHIVE, "최종 Lab", "최신Lab", "본사 Lab v1.01")}`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------- Q1, Q2
console.log("\n=== 1. GRAMMAR I 결번 6개가 원본에 있는가 ===");
const G1_GAPS = [18, 19, 48, 49, 70, 71, 86, 87, 104, 105, 114, 115];
let g1Found = 0;
for (const n of G1_GAPS) {
  const id = `gh1-${String(n).padStart(3, "0")}`;
  const f = findFile(dirs.grammar1, `${id}.htm`) || findFile(dirs.grammar1, `${id}.html`);
  if (f) g1Found++;
  console.log(`  ${f ? "🔴 있음 — 유실된 레슨" : "✅ 없음 — 원본도 건너뜀"}  ${id}`);
}
console.log(`  → ${g1Found ? `레슨 ${g1Found}개 유실. 복구 필요` : "원본이 원래 건너뛴 번호. 결함 아님"}`);

console.log("\n=== 2. 시작 번호 (GRAMMAR I 001~005 / II 001~006) ===");
for (const [slug, prefix, upto] of [["grammar1", "gh1", 5], ["grammar2", "gh2", 6]]) {
  const present = [];
  for (let n = 1; n <= upto; n++) {
    const id = `${prefix}-${String(n).padStart(3, "0")}`;
    if (findFile(dirs[slug], `${id}.htm`) || findFile(dirs[slug], `${id}.html`)) present.push(n);
  }
  console.log(`  ${present.length ? "🔴" : "✅"} ${slug}: ${present.length ? `1~${upto} 중 ${present.join(",")} 존재 — 누락됨` : `1~${upto} 원본에도 없음`}`);
}

// ---------------------------------------------------------------- Q3
console.log("\n=== 3. pr231 인코딩 (지금 깨져 있는 레슨) ===");
for (const id of ["pr231", "pr231-1"]) {
  const f = findFile(dirs.reading, `${id}.htm`) || findFile(dirs.reading, `${id}.html`);
  if (!f) { console.log(`  🔴 ${id} 원본 없음`); continue; }
  const buf = fs.readFileSync(f);
  const d = decode(buf);
  const broken = (d.text.match(REPLACEMENT) || []).length;
  // Try the other encoding too — the point is whether ANY decode is clean.
  const alt = d.encoding === "utf-8"
    ? new TextDecoder("euc-kr").decode(buf)
    : (() => { try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return null; } })();
  const altBroken = alt === null ? null : (alt.match(REPLACEMENT) || []).length;
  const sample = (t) => (t.match(/[\uac00-\ud7a3][^<>\n]{6,40}/) || ["(한글 없음)"])[0];
  console.log(`  ${id}  자동판별=${d.encoding} 깨짐 ${broken}`);
  console.log(`      ${d.encoding} : ${sample(d.text)}`);
  if (alt !== null) console.log(`      ${d.encoding === "utf-8" ? "euc-kr" : "utf-8"} : ${sample(alt)}  (깨짐 ${altBroken})`);
  const best = broken === 0 ? d.encoding : (altBroken === 0 ? "다른 인코딩" : null);
  console.log(`      → ${best ? `${ok(true)} ${best} 로 복구 가능` : "🔴 원본 자체가 손상"}`);
}

// ---------------------------------------------------------------- Q4-Q7
console.log("\n=== 4~7. 개별 확인 ===");
const SPOT = [
  ["gh1-033", "grammar1", "문항 37·39 원문 (지금 36·38에 흡수됨)", /\b3[79]\s*\.\s*[A-Z]/g],
  ["gh1-041", "grammar1", "gh1-040 의 진짜 정답인가", /love|Korea|boy/gi],
  ["gh1-089", "grammar1", "gh1-088 의 진짜 정답인가", /ring|gentlemen|homeland|employees/gi],
  ["gh1-020", "grammar1", "모범답안 8개 (지금 비어 있음)", /평서문|의문문|부정문/g],
  ["pr118-1", "reading", "번역 (지금 마침표 하나)", /[\uac00-\ud7a3]{2,}/g],
];
for (const [id, slug, why, probe] of SPOT) {
  const f = findFile(dirs[slug], `${id}.htm`) || findFile(dirs[slug], `${id}.html`);
  if (!f) { console.log(`  🔴 ${id.padEnd(10)} 원본 없음 — ${why}`); continue; }
  const { text, encoding } = decode(fs.readFileSync(f));
  const hits = text.match(probe) || [];
  console.log(`  ✅ ${id.padEnd(10)} ${encoding}  신호 ${hits.length}건 — ${why}`);
  if (hits.length) console.log(`       ${hits.slice(0, 4).map((h) => h.trim().slice(0, 30)).join(" / ")}`);
}

// ---------------------------------------------------------------- Q8
console.log("\n=== 8. READING 중복 6쌍이 원본에서도 중복인가 ===");
const DUPES = [["pr009", "pr036"], ["pr024", "pr069"], ["pr197", "pr216"], ["pr152", "pr242"], ["pr190", "pr244"], ["pr247", "pr251"]];
const bodyOf = (id) => {
  const f = findFile(dirs.reading, `${id}.htm`) || findFile(dirs.reading, `${id}.html`);
  if (!f) return null;
  const { text } = decode(fs.readFileSync(f));
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
};
for (const [a, b] of DUPES) {
  const A = bodyOf(a), B = bodyOf(b);
  if (!A || !B) { console.log(`  🔴 ${a}/${b} 원본 없음`); continue; }
  const same = A === B;
  // Even when not identical, near-identity is the thing worth knowing.
  const wa = new Set(A.split(" ")), wb = new Set(B.split(" "));
  const overlap = [...wa].filter((w) => wb.has(w)).length / Math.max(wa.size, wb.size);
  console.log(`  ${same ? "🔴 원본도 동일" : overlap > 0.9 ? "🟡 원본도 거의 같음" : "✅ 원본은 다름 — 추출 오류"}  ${a}/${b}  일치율 ${(overlap * 100).toFixed(0)}%`);
}

console.log("\n─────────────────────────────────────────────");
console.log("다음 단계: 복사본에서 추출 후 compare-archive.cjs 실행");
console.log(`  현재 레포: ${REPO}`);
