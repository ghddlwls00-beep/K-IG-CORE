#!/usr/bin/env node
/**
 * GRAMMAR 영어 페이지 판정 중, 드라이버가 Step 1 정답을 펼쳐 둔 채 남겨서 "영어 문장이 화면에
 * 있다" 는 판정이 가려질 수 있었던 강의를 센다.
 *
 * 음성 시험(2026-09-23)에서 gh1-007 데스크톱은 Step 3 의 영어 줄을 지워도 통과했다 — 드라이버가
 * Step 1 에서 누른 버튼으로 42개 모범 답안이 전부 펼쳐져 있었기 때문이다. gh2-007 은 펼쳐진 것이
 * 0개라 같은 시험에서 제대로 실패했다. 어느 쪽인지는 강의마다 다르므로, 운영 스윕이 남긴 단계별
 * 화면 글자(out/rendered/<course>/<id>.<viewport>.json)에서 강의마다 직접 센다.
 *
 * 주의: 음성 시험에 쓴 네 강의(gh1-006·gh1-007·gh2-007·gh2-007-1)의 화면 파일은 로컬 시험이
 * 덮어썼으므로, 그 넷은 시험 기준선(out/proof/base) 의 것을 쓴다 — 같은 드라이버·같은 동작이다.
 *
 *   node count-masked-grammar.cjs
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");
const n = (s) => String(s || "").replace(/\s+/g, " ").toLowerCase();
const PROOF = new Set(["grammar1/gh1-006", "grammar1/gh1-007", "grammar2/gh2-007", "grammar2/gh2-007-1"]);

const result = {};
for (const course of ["grammar1", "grammar2"]) {
  for (const vp of ["desktop", "tablet", "mobile"]) {
    let pages = 0, masked = 0, maskedTexts = 0, noFile = 0;
    const examples = [];
    for (const p of E.pages(course)) {
      const exp = E.expected(course, p.id);
      if (!exp.texts.length || /[가-힣]/.test(exp.texts[0].text)) continue; // 영어 페이지만
      pages++;
      const file = PROOF.has(`${course}/${p.id}`)
        ? path.join(OUT, "proof/base", `${course}-${p.id}.${vp}.json`)
        : path.join(OUT, "rendered", course, `${p.id}.${vp}.json`);
      if (!fs.existsSync(file)) { noFile++; continue; }
      const snaps = JSON.parse(fs.readFileSync(file, "utf8"));
      const s1 = snaps.find((s) => /Step 1\b/.test(s.step));
      if (!s1) continue;
      const t = n(s1.text);
      const shown = exp.texts.filter((x) => t.includes(n(x.text))).length;
      if (shown) { masked++; maskedTexts += shown; if (examples.length < 3) examples.push(`${p.id} ${shown}/${exp.texts.length}`); }
    }
    result[`${course} ${vp}`] = { englishPages: pages, pagesWithAnswersLeftOpen: masked, textsMaskable: maskedTexts, noSnapshot: noFile, examples };
    console.log(`${course} ${vp.padEnd(7)} 영어 페이지 ${pages} · Step 1 에 정답이 펼쳐진 채 남은 강의 ${masked} (가려질 수 있던 판정 ${maskedTexts}) · 화면 파일 없음 ${noFile} · 예 ${examples.join(", ")}`);
  }
}
fs.writeFileSync(path.join(OUT, "masked-grammar.json"), JSON.stringify(result, null, 1));
