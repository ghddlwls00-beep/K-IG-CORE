#!/usr/bin/env node
/**
 * LECTURE 확인(2026-10-17) — 쪽 넘김 경로를 앱의 함수(src/lib/lecturePen.ts 그대로)로: lm057(57 → 59 → 60 → 58 → 57) · lh082(쪽 기록 없음)
 * 그리고 200강 모두에서 (1) 0초에 그려지는 선분 수 (2) 각 쪽 이벤트 직후 그 쪽의 선분 수가 render-pen.mjs 와 같은 규칙(쪽이 같고 t ≤ T)과
 * 같은지 (3) 강의 길이가 1초 단위로 떨어지는지(구간 막대 step=1 과 끝 판정) 를 센다. .lecture-media/ 의 pen.json 을 읽는다(git 밖).
 *
 *   node docs/lecture/확인-도구/check-page-turns.cjs
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const L = loadTs(path.join(REPO, "src/lib/lecturePen.ts"));
const MEDIA = path.join(REPO, ".lecture-media/audio/lecture");

/** render-pen.mjs's rule: strokes of `page` with points t ≤ limit — counted as segments */
function refSegments(pen, page, limit) {
  let n = 0;
  for (const s of pen.strokes) {
    if (s[1] !== page || s[0] > limit) continue;
    let t = s[0];
    for (let i = 5; i + 2 < s.length; i += 3) { t += s[i]; if (t > limit) break; n++; }
  }
  return n;
}
function appSegments(tl, page, units) {
  const reach = L.lectureSegmentsAt(tl, units);
  let n = 0;
  for (let k = 0; k < reach; k++) if (tl.strokes[tl.segStroke[k]].page === page) n++;
  return n;
}

const out = { lectures: 0, zeroAtStart: 0, nonZeroAtStart: [], mismatches: [], durationsNotWhole: 0, checks: 0 };
const ids = fs.readdirSync(MEDIA).sort();
for (const id of ids) {
  const pen = JSON.parse(fs.readFileSync(path.join(MEDIA, id, "pen.json"), "utf8"));
  const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/lecture", `${id}.json`), "utf8"));
  const tl = L.buildLectureTimeline(pen);
  const first = lesson.lecture.pages[0].page;
  out.lectures++;
  const at0 = appSegments(tl, L.lecturePageAt(tl, 0, first), 0);
  if (at0 === 0) out.zeroAtStart++; else out.nonZeroAtStart.push(`${id}:${at0}`);
  if (lesson.lecture.durationSec % 1 !== 0) out.durationsNotWhole++;
  // every page event, a moment after it, the middle and the end
  const end = lesson.lecture.durationSec / pen.unitSec;
  const moments = [0, ...pen.pageEvents.map(([t]) => t + 0.5), end / 2, end];
  for (const u of moments) {
    const page = L.lecturePageAt(tl, u, first);
    let refPage = pen.pageEvents.length ? pen.pageEvents[0][1] : first;
    for (const [t, pg] of pen.pageEvents) if (t <= u) refPage = pg;
    const a = appSegments(tl, page, u);
    const r = refSegments(pen, refPage, u);
    out.checks++;
    if (a !== r || page !== refPage) out.mismatches.push({ id, units: u, page, refPage, app: a, ref: r });
  }
  if (id === "lm057" || id === "lh082") {
    const tlog = [];
    const marks = id === "lm057" ? [0, 1779, 1780, 1785, 1791, 1795, 1801, 1805, 1806, 1810, end] : [0, end / 2, end];
    for (const u of marks) tlog.push({ sec: +(u * pen.unitSec).toFixed(1), units: u, page: L.lecturePageAt(tl, u, first), segmentsOnPage: appSegments(tl, L.lecturePageAt(tl, u, first), u) });
    out[id] = { pageEvents: pen.pageEvents, pagesInLessonFile: lesson.lecture.pages.map((p) => p.page), timeline: tlog };
  }
}
console.log(JSON.stringify(out, null, 1));
process.exit(out.mismatches.length || out.lectures !== 200 ? 1 : 0);
