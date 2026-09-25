#!/usr/bin/env node
/**
 * 2026-09-26 — 접근성 잰 값을 9/18(out/a11y.json, 이용권 · 옛 앱)과 오늘(out/a11y-0926.json, 이용권 없음 · 지금 운영)을 쪽마다 나란히.
 * 오늘은 이용권 원본이 지워져 유료 쪽(pr100 · d150) 대신 무료 pr002 · d002 — 그 둘은 비교 없이 오늘 값만.
 *   node a11y-compare-0926.cjs [--old out/a11y.json] [--new out/a11y-0926.json]
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const read = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(__dirname, "..", f), "utf8"));
const OLD = read(arg("--old", "out/a11y.json"));
const NEW = read(arg("--new", "out/a11y-0926.json"));
const key = (p) => `${p.url} ${p.theme}`;
const sum = (p) => ({
  low: p.desktop && p.desktop.lowContrastCount, measured: p.desktop && p.desktop.measured,
  smallD: p.desktop && p.desktop.smallTargetCount, smallM: p.mobile && p.mobile.smallTargetCount,
  unlabeled: p.desktop && p.desktop.unlabeledControls ? p.desktop.unlabeledControls.length : null,
  noAlt: p.desktop && p.desktop.imagesWithoutAlt,
  kbStops: p.keyboard ? p.keyboard.stops : null, kbNoRing: p.keyboard ? p.keyboard.withoutVisibleFocus : null,
});
const oldMap = new Map(OLD.pages.map((p) => [key(p), sum(p)]));
const cols = ["low", "smallD", "smallM", "unlabeled", "noAlt", "kbStops", "kbNoRing"];
const names = { low: "대비 낮은 글", smallD: "작은 단추(컴퓨터)", smallM: "작은 단추(휴대폰)", unlabeled: "이름 없는 단추", noAlt: "alt 없는 그림", kbStops: "Tab 멈춤", kbNoRing: "초점 표시 없음" };
const totals = { old: {}, now: {} };
console.log(`9/18: ${OLD.at} · 오늘: ${NEW.at}${NEW.injectCss ? " · [깨기 CSS 넣음]" : ""}`);
console.log(`쪽 · 테마 | ${cols.map((c) => names[c]).join(" | ")}`);
for (const p of NEW.pages) {
  const k = key(p); const n = sum(p); const o = oldMap.get(k);
  const cell = (c) => (o && o[c] !== null && o[c] !== undefined ? `${o[c]}→${n[c]}` : `${n[c]}`);
  console.log(`${k} | ${cols.map(cell).join(" | ")}`);
  for (const c of cols) {
    if (typeof n[c] === "number") totals.now[c] = (totals.now[c] || 0) + n[c];
    if (o && typeof o[c] === "number" && typeof n[c] === "number") { totals.old[c] = (totals.old[c] || 0) + o[c]; totals[`both_${c}`] = (totals[`both_${c}`] || 0) + n[c]; }
  }
}
console.log(`\n같은 쪽끼리 합(9/18 → 오늘): ${cols.map((c) => `${names[c]} ${totals.old[c] ?? "-"}→${totals[`both_${c}`] ?? "-"}`).join(" · ")}`);
