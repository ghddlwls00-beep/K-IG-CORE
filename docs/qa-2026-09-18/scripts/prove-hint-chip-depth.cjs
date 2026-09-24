#!/usr/bin/env node
/**
 * 7단계 7-1 e 일부러 깨기 — 저장된 LISTENING 기록을 lib/content-check.cjs 로 **다시 평가**한다(브라우저 안 엶):
 *   태블릿 기록(깊이 light — 문장을 넘기지 않음): 옛 규칙(legacy)의 hint-chip '없음' N → 지금 규칙 '없음' 0 · '이 깊이에서 안 봄' N
 *   데스크톱 기록에서 문장 넘기기를 끈 것처럼(hintChips 를 지움, 깊이 full): 지금 규칙도 hint-chip 을 '없음' 으로 센다(안 봄 0) — 빼 버리지 않음
 * 입력: out/features/<파일>.jsonl 의 기록 + 그 방문의 화면 글 out/rendered/ld/<id>.<viewport>.json + 지금 강의 데이터(E.expected).
 *   node docs/qa-2026-09-18/scripts/prove-hint-chip-depth.cjs [--file ld-recheck45-mixed]
 * (강의 데이터는 지금 판이라 그 방문 때와 조금 다를 수 있다 — 옛 규칙 · 새 규칙을 같은 입력에 대어 견준다.)
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { contentCheck } = require("./lib/content-check.cjs");
const OUT = path.join(__dirname, "../out");
const fi = process.argv.indexOf("--file");
const FILE = path.join(OUT, "features", `${fi >= 0 ? process.argv[fi + 1] : "ld-recheck45-mixed"}.jsonl`);
const recs = fs.readFileSync(FILE, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const chip = (list) => list.filter((t) => t.kind === "hint-chip").length;
const tally = { tablet: { records: 0, withChips: 0, oldMissing: 0, newMissing: 0, notSeen: 0, recordedMissing: 0 }, desktopNoWalk: { records: 0, newMissing: 0, notSeen: 0 } };
let skipped = 0;
for (const r of recs) {
  if (r.visitError || !r.load || !r.load.navigated) continue;
  const id = String(r.url).split("/").pop();
  const renderedFile = path.join(OUT, "rendered", "ld", `${id}.${r.viewport}.json`);
  if (!fs.existsSync(renderedFile)) { skipped++; continue; }
  const texts = JSON.parse(fs.readFileSync(renderedFile, "utf8"));
  const exp = E.expected("ld", id);
  if (r.viewport === "tablet") {
    const t = tally.tablet;
    t.records++;
    t.recordedMissing += (r.content && r.content.missing ? r.content.missing.filter((m) => /^hint-chip/.test(m)).length : 0);
    const old = contentCheck({ course: "ld", exp, texts, rec: { ...r, depth: r.depth || "light" }, legacy: true });
    const now = contentCheck({ course: "ld", exp, texts, rec: { ...r, depth: r.depth || "light" } });
    if (chip(old.missing)) t.withChips++;
    t.oldMissing += chip(old.missing);
    t.newMissing += chip(now.missing);
    t.notSeen += chip(now.notSeen);
  } else if (r.viewport === "desktop" && chip(exp.texts)) {
    const d = tally.desktopNoWalk;
    d.records++;
    const now = contentCheck({ course: "ld", exp, texts: texts.slice(0, 1), rec: { ...r, depth: "full", hintChips: null } });
    d.newMissing += chip(now.missing);
    d.notSeen += chip(now.notSeen);
  }
}
const t = tally.tablet, d = tally.desktopNoWalk;
console.log(`${path.basename(FILE)} — 화면 글 파일이 없어 뺀 기록 ${skipped}`);
console.log(`태블릿 기록 ${t.records} (그때 기록된 hint-chip 없음 ${t.recordedMissing} — 기록에는 25개까지만 적힘)`);
console.log(`  옛 규칙: hint-chip 없음 ${t.oldMissing} (${t.withChips}기록) → 지금 규칙: 없음 ${t.newMissing} · 이 깊이에서 안 봄 ${t.notSeen}`);
console.log(`데스크톱 기록 ${d.records} — 문장 넘기기를 끈 것처럼(첫 화면 글만 · 상자 없음): 지금 규칙 hint-chip 없음 ${d.newMissing} · 안 봄 ${d.notSeen}`);
const ok = t.records > 0 && t.oldMissing > 0 && t.newMissing === 0 && t.notSeen === t.oldMissing && d.records > 0 && d.newMissing > 0 && d.notSeen === 0;
console.log(ok ? "기대대로 — 태블릿의 가짜 '없음' 은 '안 봄' 으로 옮겨지고, 걷기가 빠진 데스크톱은 여전히 '없음'" : "!! 기대와 다름");
process.exit(ok ? 0 : 1);
