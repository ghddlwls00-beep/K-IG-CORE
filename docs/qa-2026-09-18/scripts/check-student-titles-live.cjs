/**
 * 최종 관문 — STUDENT 제목 10강(관문15-고침/제목-다시.json 의 33칸)이 운영 화면에 새 값으로 뜨는지, 옛 값이 남지 않았는지 3화면에서 본다.
 * 2026-09-25 두 번째 관문 15 배포(소유자: "배포 뒤 바뀐 쪽(제목 10강 · 과정 목록 …)은 다시 확인해").
 * expectations(스윕의 내용 대조)는 제목 · 머리 줄을 보지 않아(expect-diff 에서 student 달라진 쪽 0) 따로 잰다.
 *
 * 칸마다: 새 값(공백 · 따옴표 모양만 맞춤)이 보이는 글에 있으면 '보임', 화면에는 없고 DOM(접힌 메뉴 등)에만 있으면 'DOM',
 * 없으면 '없음'. 옛 값이 보이는 글에 그대로 있으면 '옛 값 남음'. 통과 = 칸마다 새 값이 보이거나 DOM 에 있고 옛 값이 어디에도 없음.
 * 배포 전 판에서 돌리면 33칸 모두 '없음 · 옛 값 남음' 으로 떨어져야 한다(검사가 떨어질 수 있다는 증거).
 *
 *   KIG_PROFILE_SOURCE=... KIG_CLONE_PREFIX=... node check-student-titles-live.cjs [--viewports desktop,tablet,mobile] [--port 9650] [--clone titles-check] [--tag 이름]
 * 결과: out/student-titles-live(-<tag>).json · exit 0 통과 / 1 떨어짐 / 2 페이지를 못 엶
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const VPS = arg("--viewports", "desktop,tablet,mobile").split(",");
const PORT = Number(arg("--port", 9650));
const CLONE = arg("--clone", "titles-check");
const TAG = arg("--tag", null);
const OPS = JSON.parse(fs.readFileSync(path.join(__dirname, "../관문15-고침/제목-다시.json"), "utf8").replace(/^﻿/, ""));
const DEST = path.join(__dirname, "../out", TAG ? `student-titles-live-${TAG}.json` : "student-titles-live.json");

const norm = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
// 칸 → 그 값이 뜨는 쪽: 과정 파일(courses/student.json)은 과정 목록 /student, 강의 파일은 그 강의 쪽
// (menuLabel 은 과정 목록이 아니라 강의 쪽 메뉴에 뜸 — 배포 전 판에서 /student 에 옛 값도 없어 찾음)
const pageOf = (op) => {
  const menu = op.file === "content/courses/student.json" && op.path.match(/^\.lessons\[id=(s[\d-]+)\]\.menuLabel$/);
  if (menu) return `/student/${menu[1]}`;
  if (op.file === "content/courses/student.json") return "/student";
  const m = op.file.match(/content\/lessons\/student\/(s[\d-]+)\.json$/);
  if (!m) throw new Error(`모르는 파일 ${op.file}`);
  return `/student/${m[1]}`;
};
const READ = `(() => ({ href: location.href, visible: document.body.innerText || '', dom: document.body.textContent || '', paywall: ${H.PAYWALL_RE}.test(document.body.innerText || '') }))()`;

(async () => {
  const pages = [...new Set(OPS.map(pageOf))];
  const browser = await H.startBrowser(CLONE, PORT);
  const tab = await H.openTab(browser);
  const rows = [];
  let blocked = 0;
  try {
    for (const vp of VPS) {
      await H.setViewport(tab, vp);
      for (const url of pages) {
        // 과정 목록에는 강의 쪽의 'STUDENT 목록' 표시가 없음 — 16장 머리가 뜨기를 기다림
        const loaded = await H.load(tab, url, { marker: url === "/student" ? "Chapter 16" : H.MARKERS.student });
        const snap = loaded.rendered ? await tab.eval(READ).catch(() => null) : null;
        if (!snap || snap.paywall) { blocked++; console.log(`${vp} ${url} — 페이지를 못 엶${snap && snap.paywall ? "(잠금 · 이용권 화면)" : ""}`); }
        const vis = snap ? norm(snap.visible) : "", dom = snap ? norm(snap.dom) : "";
        for (const op of OPS.filter((o) => pageOf(o) === url)) {
          const nw = norm(op.new), old = norm(op.old);
          const where = vis.includes(nw) ? "보임" : dom.includes(nw) ? "DOM" : "없음";
          const oldLeft = old !== nw && (vis.includes(old) || dom.includes(old));
          const pass = !!snap && !snap.paywall && where !== "없음" && !oldLeft;
          rows.push({ viewport: vp, url, file: op.file, path: op.path, new: op.new, where, oldLeft, pass });
          if (!pass) console.log(`  떨어짐 ${vp} ${url} ${op.path} — 새 값 ${where}${oldLeft ? " · 옛 값 남음" : ""}`);
        }
      }
    }
  } finally {
    try { await tab.close(); } catch {}
    try { browser.proc.kill(); } catch {}
  }
  const fail = rows.filter((r) => !r.pass);
  const byWhere = rows.reduce((a, r) => ((a[r.where] = (a[r.where] || 0) + 1), a), {});
  const summary = `STUDENT 제목 ${OPS.length}칸 × ${VPS.length}화면 = ${rows.length} · 통과 ${rows.length - fail.length} · 떨어짐 ${fail.length} (새 값 ${Object.entries(byWhere).map(([k, v]) => `${k} ${v}`).join(" · ")} · 옛 값 남음 ${rows.filter((r) => r.oldLeft).length}) · 못 연 쪽 ${blocked}`;
  console.log(summary);
  fs.writeFileSync(DEST, JSON.stringify({ at: new Date().toISOString(), base: H.BASE, viewports: VPS, summary, rows }, null, 1));
  console.log(`→ ${DEST}`);
  process.exit(blocked ? 2 : fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
