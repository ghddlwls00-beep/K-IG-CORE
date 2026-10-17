#!/usr/bin/env node
/**
 * LECTURE 확인(2026-10-17) — 다른 과정 화면이 그대로인지: verify-lecture-screens.cjs --part others 를 로컬(--tag local)과
 * 운영(--tag prod)에서 찍은 사진을 짝지어 픽셀로 비교(같은 크기 · 채널 차이 > 32 인 픽셀 %)하고 잰 값(옆 밀림 · 작은 누름 · 작은 글 · 글자 수)을 나란히.
 *   node docs/lecture/확인-도구/compare-others.cjs
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const pnpm = path.join(REPO, "node_modules/.pnpm");
const sharp = require(path.join(pnpm, fs.readdirSync(pnpm).find((d) => d.startsWith("sharp@")), "node_modules/sharp"));
const OUT = path.join(REPO, "docs/qa-2026-09-18/out/lecture/verify");
const local = require(path.join(OUT, "others-local.json"));
const prod = require(path.join(OUT, "others-prod.json"));

(async () => {
  const rows = [];
  for (const a of local.shots) {
    const b = prod.shots.find((x) => x.vp === a.vp && x.screen === a.screen);
    if (!b) continue;
    const A = await sharp(path.join(REPO, a.file)).raw().toBuffer({ resolveWithObject: true });
    const B = await sharp(path.join(REPO, b.file)).resize(A.info.width, A.info.height, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let big = 0;
    const n = A.info.width * A.info.height;
    const c = A.info.channels;
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(A.data[i * c + k] - B.data[i * c + k]));
      if (m > 32) big++;
    }
    rows.push({
      vp: a.vp, screen: a.screen, size: `${A.info.width}x${A.info.height}`, diffPct: +((100 * big) / n).toFixed(2),
      local: { ovX: a.overflowX, small: a.small, tiny: a.tiny, text: a.textLength ?? null, slide: a.slide ? `${a.slide.stage} ${a.slide.index}/${a.slide.of}` : null },
      prod: { ovX: b.overflowX, small: b.small, tiny: b.tiny, text: b.textLength ?? null, slide: b.slide ? `${b.slide.stage} ${b.slide.index}/${b.slide.of}` : null },
      localFile: a.file, prodFile: b.file,
    });
  }
  for (const r of rows) console.log(`${r.vp} ${r.screen}: diff ${r.diffPct}% · local ${JSON.stringify(r.local)} · prod ${JSON.stringify(r.prod)}`);
  fs.writeFileSync(path.join(OUT, "others-compare.json"), JSON.stringify(rows, null, 2));
})();
