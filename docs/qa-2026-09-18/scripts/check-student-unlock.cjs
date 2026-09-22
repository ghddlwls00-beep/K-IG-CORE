#!/usr/bin/env node
/**
 * 명령서 §5 — STUDENT 챕터 해금 로직 전수 검사.
 *
 * STUDENT is the only course that gates itself: a chapter opens when the learner finishes enough
 * of the one before it. Nothing in the sweep exercises that, because the sweep reads pages rather
 * than earning its way through them. This simulates the product's own rule over the real chapter
 * data instead.
 *
 * The rule lives in src/lib/studentProgress.ts, which is marked "server-only" and cannot be
 * imported here, so the two functions below MIRROR it. They are written from that file and the
 * line references are kept, so a change there that this misses shows up as a disagreement with
 * the live site rather than silently passing.
 *
 * The check that matters most: a lesson's chapter is decided TWO different ways in that file —
 * by its position in the course groups (`chapterIndexByLesson`, used when saving progress) and by
 * the number inside its id (`isStudentLessonUnlocked`, used when opening a lesson). If those two
 * ever disagree for a lesson, a learner can be told a lesson is open and then be refused, or the
 * reverse.
 *
 *   node check-student-unlock.cjs
 * Output: out/student-unlock.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");

const REQUIRED_RATIO = 0.8;                       // STUDENT_REQUIRED_RATIO, studentProgress.ts:14
const groups = (E.courseIndex("student").groups || []).slice(0, 20);
const problems = [];
const add = (kind, severity, detail) => problems.push({ kind, severity, detail });

// ---------------------------------------------------------------- 1. 챕터 구성
const chapters = groups.map((g, i) => ({
  chapter: i + 1,
  label: g.label || `Chapter ${i + 1}`,
  lessonIds: (g.lessons || []).filter((id) => /^s\d+-\d+$/.test(id)),
}));
const totalLessons = chapters.reduce((a, c) => a + c.lessonIds.length, 0);
const allIds = E.pages("student").map((p) => p.id);

if (chapters.length !== 20) add("chapter-count", "P2", `챕터가 20개가 아니라 ${chapters.length}개`);
for (const c of chapters) if (!c.lessonIds.length) add("empty-chapter", "P1", `챕터 ${c.chapter} (${c.label}) 에 강의가 없음`);
for (const id of allIds) if (!chapters.some((c) => c.lessonIds.includes(id))) add("lesson-outside-chapter", "P2", `${id} 가 어느 챕터에도 속하지 않음 — 진도 저장 시 챕터를 알 수 없음`);
if (totalLessons !== allIds.length) add("chapter-total-mismatch", "P2", `챕터에 담긴 강의 ${totalLessons}개 ≠ 실제 강의 ${allIds.length}개`);

// ---------------------------------------------------------------- 2. 두 가지 챕터 판정이 일치하는가
for (const c of chapters) {
  for (const id of c.lessonIds) {
    const byId = Number(String(id).match(/^s(\d+)-/)[1]);   // isStudentLessonUnlocked, :420-423
    if (byId !== c.chapter) {
      add("chapter-number-disagrees", "P1",
        `${id} — 목차상 챕터 ${c.chapter} (${c.label}) 인데 강의 번호로는 챕터 ${byId}. 진도 저장은 ${c.chapter}, 열람 허용은 ${byId} 기준으로 판단합니다`);
    }
  }
}

// ---------------------------------------------------------------- 3. 해금 계단이 실제로 올라가는가
// getStudentChapters, studentProgress.ts:254-287
function unlockedThrough(completed) {
  let calc = 1;
  chapters.forEach((c, i) => {
    const chapter = i + 1;
    const done = c.lessonIds.filter((id) => completed.has(id)).length;
    const required = Math.max(1, Math.ceil(c.lessonIds.length * REQUIRED_RATIO));
    const lastDone = c.lessonIds.length > 0 && completed.has(c.lessonIds[c.lessonIds.length - 1]);
    if (chapter <= calc && done >= required && lastDone && chapter < 20) calc = chapter + 1;
  });
  return calc;
}

// 아무것도 안 했을 때: 챕터 1만 열려 있어야 함
if (unlockedThrough(new Set()) !== 1) add("initial-unlock", "P1", `진도가 없는데 챕터 ${unlockedThrough(new Set())} 까지 열림`);

// 챕터를 하나씩 끝내면 다음 챕터가 정확히 하나씩 열려야 함
const completed = new Set();
for (let n = 1; n <= 20; n++) {
  const c = chapters[n - 1];
  if (!c) break;
  for (const id of c.lessonIds) completed.add(id);          // 챕터 전체 완료
  const got = unlockedThrough(completed);
  const want = Math.min(20, n + 1);
  if (got !== want) add("unlock-step", "P1", `챕터 ${n} 을 전부 끝냈는데 해금이 ${got} (기대 ${want})`);
}

// 80% 미만이면 열리면 안 됨 / 80% 이상이어도 마지막 강의를 안 했으면 열리면 안 됨
{
  const c = chapters[0];
  const required = Math.max(1, Math.ceil(c.lessonIds.length * REQUIRED_RATIO));
  const notEnough = new Set(c.lessonIds.slice(0, Math.max(0, required - 1)));
  if (unlockedThrough(notEnough) > 1) add("unlock-too-early", "P1", `챕터 1 을 ${notEnough.size}/${c.lessonIds.length} 만 했는데 다음 챕터가 열림 (필요 ${required})`);
  const withoutLast = new Set(c.lessonIds.slice(0, c.lessonIds.length - 1));
  if (withoutLast.size >= required && unlockedThrough(withoutLast) > 1) {
    add("unlock-without-last", "P2", `챕터 1 의 마지막 강의를 안 했는데 다음 챕터가 열림`);
  }
}

// ---------------------------------------------------------------- 4. 무료 체험과 마지막 강의
for (const id of ["s1-1", "s1-2"]) if (!allIds.includes(id)) add("free-trial-missing", "P1", `무료 체험 강의 ${id} 가 없음`);
const last = chapters[chapters.length - 1];
const lastLesson = last && last.lessonIds[last.lessonIds.length - 1];
const nb = E.neighbours("student");
if (lastLesson && nb[lastLesson] && nb[lastLesson].next) {
  add("last-lesson-next", "P2", `마지막 강의 ${lastLesson} 에 다음 강의 링크(${nb[lastLesson].next})가 있음 — 20챕터 끝에서 빠져나갈 곳이 있어야 함`);
}

// ---------------------------------------------------------------- 결과
const byKind = {};
for (const p of problems) (byKind[p.kind] ||= []).push(p);
fs.writeFileSync(path.join(OUT, "student-unlock.json"), JSON.stringify({
  at: new Date().toISOString(),
  chapters: chapters.map((c) => ({ chapter: c.chapter, label: c.label, lessons: c.lessonIds.length, required: Math.max(1, Math.ceil(c.lessonIds.length * REQUIRED_RATIO)), first: c.lessonIds[0], last: c.lessonIds[c.lessonIds.length - 1] })),
  totalLessons, problems,
}, null, 1));

console.log(`STUDENT 챕터 ${chapters.length}개 · 강의 ${totalLessons}개 (주소로 열리는 강의 ${allIds.length}개)\n`);
for (const c of chapters) console.log(`  챕터 ${String(c.chapter).padStart(2)} ${String(c.label).slice(0, 26).padEnd(28)} 강의 ${String(c.lessonIds.length).padStart(2)}개 · 해금 조건 ${Math.max(1, Math.ceil(c.lessonIds.length * REQUIRED_RATIO))}개 + 마지막 강의 · ${c.lessonIds[0]} ~ ${c.lessonIds[c.lessonIds.length - 1]}`);
console.log(`\n지적 ${problems.length}건`);
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`  ${list[0].severity}  ${String(list.length).padStart(3)} × ${kind}`);
  for (const p of list.slice(0, 4)) console.log(`         ${p.detail}`);
}
console.log(`\n→ ${path.join(OUT, "student-unlock.json")}`);
