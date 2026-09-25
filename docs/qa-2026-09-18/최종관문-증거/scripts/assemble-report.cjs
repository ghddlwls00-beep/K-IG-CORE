// 최종 보고서 조립 — report-final-v3.md 의 ⟪RECORD_TABLE⟫ 에 기록 파일 표, ⟪VERIFY_REPORT⟫ · ⟪VERIFY_SHORT⟫ 에 verify-report 결과(있으면)를 넣고
// 저장소 K-IG_Commercial_Release_Readiness_Report.md 로 씀. 철회한 오탐 문구(verify-report 의 WITHDRAWN 바늘)가 있는지도 먼저 봄.
//   node assemble-report.cjs [--verify "통과 N · 문제 0 …"] [--short "…"]
const fs = require("fs");
const path = require("path");
const S = __dirname;
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
let md = fs.readFileSync(path.join(S, "report-final-v3.md"), "utf8");
const table = fs.readFileSync(path.join(S, "record-files-table.md"), "utf8").trim();
md = md.replace("⟪RECORD_TABLE⟫", table);
md = md.replace("⟪VERIFY_REPORT⟫", arg("--verify", "(아래에 채움)")).replace("⟪VERIFY_SHORT⟫", arg("--short", "(아래에 채움)"));
const left = md.match(/⟪[^⟫]+⟫/g);
if (left) console.log("남은 자리표:", [...new Set(left)].join(" "));
const needles = [/멈춤[^\n]{0,40}2,?568|timeout Emulation/, /영어 답란에 한국어/, /딕테이션[^\n]{0,30}164/, /585\s*건[^\n]{0,30}(버튼|단계)/, /한글 대본[^\n]{0,20}(557|누락 557)/, /3,?224/, /(1,?121|1,?106|1,?198|1,?299)\s*건[^\n]{0,30}(음성|클립)/, /이전\/?다음[^\n]{0,30}(64|63)\s*건/, /문항 번호[^\n]{0,40}(0점|오답)/, /카드는[^\n]{0,30}퀴즈는/];
for (const n of needles) { const m = n.exec(md); if (m) console.log(`철회 바늘에 걸림: ${n} → "${md.slice(Math.max(0, m.index - 30), m.index + 60).replace(/\n/g, " ")}"`); }
const out = path.join(REPO, "docs/qa-2026-09-18/K-IG_Commercial_Release_Readiness_Report.md");
fs.writeFileSync(out, md);
console.log(`→ ${out} · ${(md.length / 1024).toFixed(1)} KB`);
