// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
const { loadTs, REPO } = require("./tsload.cjs");
const fs = require("fs");
const ru = loadTs(`${REPO}/src/lib/readingUtils.ts`);
const lu = loadTs(`${REPO}/src/lib/listeningUtils.ts`);
const short = { "남성과 여성의": "M/F대화", "환경 오염": "환경", "문화적 배경과": "음악예술", "청소년기": "10대", "수동적 사고": "비판적사고", "정보 통신": "IT기술", "감정에 치우치지": "문제해결", "사회 질서를": "법양심", "말의 무게": "말습관", "부정적 감정": "감정행복", "글로벌 문화": "언어학습" };
const lines = [];
for (let i = 1; i <= 256; i++) {
  const id = `pr${String(i).padStart(3, "0")}`;
  const L = JSON.parse(fs.readFileSync(`${REPO}/content/lessons/reading/${id}.json`, "utf8"));
  const en = L.readingSentences.map((s) => s.english).join(" "), ko = L.readingSentences.map((s) => s.korean).join(" ");
  const q = ru.generateReadingQuiz(en, ko, `reading/${id}`);
  const a = q[0].options[q[0].answerIndex];
  const tag = Object.entries(short).find(([k]) => a.startsWith(k))?.[1] || "FALLBACK";
  lines.push(`${id}|${tag}|${en.slice(0, 150)}`);
}
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/reading-q1.txt", lines.join("\n"));
const sc = JSON.parse(fs.readFileSync(`${REPO}/content/ld_english_scripts.json`, "utf8"));
const lshort = { "화자가 자신의 신원": "자기소개(기본값)", "자신이 사는 국가": "브라질", "시골에 계신": "조부모농장", "학교 생활과": "학교결석", "아프리카 여행": "아프리카", "병원에서 일하는": "간호사", "자신의 이름과 가족": "이름가족동네", "해외 여행 경험": "해외여행" };
const l2 = [];
for (let i = 1; i <= 276; i++) {
  const id = `d${String(i).padStart(3, "0")}`;
  const q = lu.generateListeningContextQuiz(sc[id], []);
  const a = q[0].options[q[0].answerIndex];
  const tag = Object.entries(lshort).find(([k]) => a.startsWith(k))?.[1];
  l2.push(`${id}|${tag}|${sc[id].map((s) => s.en).join(" ").slice(0, 130)}`);
}
fs.writeFileSync("C:/Users/ghddl/AppData/Local/Temp/kq/out/ld-q1.txt", l2.join("\n"));
