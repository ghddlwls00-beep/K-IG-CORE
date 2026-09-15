#!/usr/bin/env node
/**
 * Put STUDENT lesson s19-3 back.
 *
 *   node docs/qa-2026-09-15/scripts/restore-s19-3.cjs <2009판 추출 content> [--write]
 *
 * Chapter 19 runs s19-1, s19-2, s19-4: the third lesson has been missing since
 * the site was built, which is why the third card on that chapter reads
 * "Part 4". The cause was the source, not the extraction — the 2012 edition of
 * the archive (`최종 Lab/최신Lab/본사 Lab v1.01`) has no `Student/s19-3.html`,
 * while the 2009 edition (`랩모음/본사 Lab`) does, along with its `s19-3.swf`.
 * Extracting the older edition recovers the lesson whole and unbroken.
 *
 * It is the only real content difference between the two editions; everything
 * else that differs is a `desktop.ini` or a `Thumbs.db`.
 *
 * THE TITLE IS SUPPLIED. The 2009 index carries no display titles — every entry
 * is just its id — so the curated titles on this site were written later. This
 * follows the pattern its siblings use, from the lesson's own "Culture : Food"
 * label and its content (bulgogi, kimchi, a traditional Korean meal):
 *
 *     19-1  Korean Culture is Unique (독창적인 한국 문화)
 *     19-2  Traditional Clothing (Hanbok) (전통 의상 (한복))
 *     19-3  Traditional Food (Bulgogi) (전통 음식 (불고기))   ← supplied
 *     19-4  Our Language (Hangul) (우리말과 훈민정음 (한글))
 *
 * AFTERWARDS, two things still have to happen — this script does neither:
 *   1. the four MP3s live in the 2009 `s19-3.swf` and are not in R2 yet;
 *   2. the lesson's sentences need Ava clips.
 * Both are printed at the end.
 */
const fs = require("node:fs");
const path = require("node:path");

const SRC = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const WRITE = process.argv.includes("--write");
if (!SRC) {
  console.error("사용법: node restore-s19-3.cjs <2009판 추출 content 경로> [--write]");
  process.exit(1);
}
const ROOT = path.resolve(__dirname, "../../..");
const LESSON_OUT = path.join(ROOT, "content/lessons/student/s19-3.json");
const INDEX = path.join(ROOT, "content/courses/student.json");

const TITLE = "Traditional Food (Bulgogi) (전통 음식 (불고기))";
const MENU_LABEL = "19-3. Traditional Food (Bulgogi)";

const fresh = JSON.parse(fs.readFileSync(path.join(SRC, "lessons/student/s19-3.json"), "utf8"));
const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const sib = JSON.parse(fs.readFileSync(path.join(ROOT, "content/lessons/student/s19-2.json"), "utf8"));

if (fs.existsSync(LESSON_OUT)) { console.error("🔴 s19-3.json 이 이미 있습니다. 중단합니다."); process.exit(1); }
const broken = (JSON.stringify(fresh).match(/�/g) || []).length;
if (broken) { console.error(`🔴 추출본에 깨진 문자 ${broken}개. 중단합니다.`); process.exit(1); }

// Take the sibling's presentation fields so the new lesson cannot look foreign
// next to the ones either side of it.
const lesson = {
  ...fresh,
  title: TITLE,
  label: sib.label,
  menuLabel: MENU_LABEL,
  order: sib.order + 1,
};

/* ------------------------------------------------------------- the index */
const lessons = idx.lessons;
const at = lessons.findIndex((l) => l.id === "s19-4");
if (at < 0) { console.error("🔴 index 에서 s19-4 를 찾지 못했습니다."); process.exit(1); }
if (lessons.some((l) => l.id === "s19-3")) { console.error("🔴 index 에 s19-3 이 이미 있습니다."); process.exit(1); }

const prev = lessons[at - 1];
const entry = {
  id: "s19-3", title: TITLE, label: prev.label, series: "s", variant: "main",
  unit: 19, part: 3, order: prev.order + 1, hasAudio: true, menuLabel: MENU_LABEL,
};
lessons.splice(at, 0, entry);

// `order` is a dense sequence, so everything after the insertion shifts by one.
// Leaving a duplicate would make the prev/next pair of two lessons ambiguous.
let bumped = 0;
for (let i = at + 1; i < lessons.length; i++) {
  if (typeof lessons[i].order === "number") { lessons[i].order += 1; bumped++; }
}
idx.lessonCount = lessons.length;

const group = (idx.groups || []).find((g) => Array.isArray(g.lessons) && g.lessons.includes("s19-4"));
if (!group) { console.error("🔴 s19-4 가 속한 그룹을 찾지 못했습니다."); process.exit(1); }
const gAt = group.lessons.indexOf("s19-4");
group.lessons.splice(gAt, 0, "s19-3");

/* ------------------------------------------------------------- 보고 */
console.log(`모드          : ${WRITE ? "WRITE" : "dry run"}`);
console.log(`레슨 수       : ${lessons.length - 1} → ${lessons.length}`);
console.log(`제목          : ${TITLE}`);
console.log(`그룹          : ${group.title}`);
console.log(`              ${group.lessons.join(" · ")}`);
console.log(`order 재배치  : 뒤쪽 ${bumped}개 +1`);
console.log(`음성 참조     : ${(lesson.audio || []).length}개`);
console.log(`본문 블록     : ${(lesson.blocks || []).length}개 · 깨진 문자 0`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }

fs.writeFileSync(LESSON_OUT, JSON.stringify(lesson, null, 1), "utf8");
fs.writeFileSync(INDEX, JSON.stringify(idx, null, 1), "utf8");
console.log("\n✅ 기록했습니다.\n");
console.log("🔴 남은 두 가지:");
console.log("   1) 음성 4개가 R2 에 없습니다. 2009판에서 미디어 포함 추출 후 업로드하세요:");
console.log("        node scripts/extract.mjs --src \"<2009판>\" --course student");
console.log("        node scripts/upload-media.mjs");
console.log("   2) Ava 클립:");
console.log("        node scripts/generate-azure-ava.mjs --dry-run   # pending 확인");
