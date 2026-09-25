#!/usr/bin/env node
/**
 * 검사 복제(lib/expectations.cjs 의 hintChunks · hintsForSentence)가 **앱 코드 그 자체**와 같은 칩을 내는지 — LISTENING 2,217행 전부.
 * 앱의 칩 코드는 React 컴포넌트 안에 있어 불러올 수 없으므로, src/components/LdLearningView.tsx 에서 hintChunks 의 몸통과
 * squash · pickHintsFor 를 글자 그대로 잘라 와 타입 표기만 지우고 실행한다(다시 옮겨 적지 않음 — 복제가 틀리면 여기서 드러남).
 * 유료 강의는 로컬 개발 서버에서 열리지 않아(감사용 이용권이 운영 주소에만 걸림) 화면으로는 무료 d001·d002 만 볼 수 있다 —
 * 그래서 규칙이 같은지는 이 도구로, 화면에 그 규칙대로 그려지는지는 무료 강의 화면으로 나눠 확인한다.
 *
 *   node ld-chip-app-vs-lib.cjs            다른 행 0 이어야 함 (exit 0)
 *   node ld-chip-app-vs-lib.cjs --break    일부러 깨기: 잘라 온 앱 코드의 쪼개기를 6단계 전 규칙(/,|\.\s+|\.$|\s{2,}/)으로 바꿔 돌림 → 다른 행이 나와야 함
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const BREAK = process.argv.some((a) => a === "--break" || a.startsWith("--break="));
const strip = (s) => String(s).replace(/^﻿/, "");
const src = fs.readFileSync(path.join(REPO, "src/components/LdLearningView.tsx"), "utf8");

// 1) hintChunks 몸통: "const hintChunks = useMemo(() => {" 부터 "}, [hintsBlock]);" 까지
const m = src.match(/const hintChunks = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[hintsBlock\]\);/);
if (!m) throw new Error("LdLearningView.tsx 에서 hintChunks 를 못 찾음 — 코드 모양이 바뀜");
let chunkBody = m[1];
// 2) squash + pickHintsFor: "const squash =" 부터 "// Extract Korean sentences fallback" 앞까지
const a = src.indexOf("const squash = "), b = src.indexOf("// Extract Korean sentences fallback");
if (a < 0 || b < 0 || b < a) throw new Error("LdLearningView.tsx 에서 pickHintsFor 를 못 찾음 — 코드 모양이 바뀜");
let pickCode = src.slice(a, b);
// 타입 표기만 지움 — 최종 관문 2026-09-25: 정규식((x: string) 꼴만)으로는 칩 규칙의 새 도우미(여러 인자 · 객체 형 · number[])를 못 지워,
// 저장소의 TypeScript 변환기(transpileModule — 형만 지우고 글은 그대로 둠)로. 변환 뒤에도 형 표기가 남으면 멈춤.
const ts = require(path.join(REPO, "node_modules/typescript"));
pickCode = ts.transpileModule(pickCode, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, removeComments: false } }).outputText;
if (/:\s*(string|number|boolean)\b/.test(pickCode) || /:\s*string/.test(chunkBody)) throw new Error("지우지 못한 타입 표기가 남음");
if (BREAK) {
  // 쪼개기 식 전체(.split(/…/))를 바꾼다 — 전에는 6단계 식 글자 그대로를 찾아 바꿔, 관문 15 에서 식이 바뀌자 '못 찾음' 으로 멈췄다(2026-09-24).
  //   --break           6단계 전 규칙(천 단위 쉼표에서도 자름)
  //   --break=pre-g15   관문 15 전 규칙(칭호 · 머리글자 뒤에서도 자름) — 새 칭호 규칙을 복제가 따라가는지
  const OLD = process.argv.includes("--break=pre-g15") ? "/,(?!\\d{3}(?!\\d))|\\.\\s+|\\.$|\\s{2,}/" : "/,|\\.\\s+|\\.$|\\s{2,}/";
  const before = chunkBody;
  chunkBody = chunkBody.replace(/\.split\(\/[^\n]*?\/\)/, `.split(${OLD})`).replace(/\.replace\(\/\(\?<![^\n]*?\[\.,\]\+\$\/, ""\)/, '.replace(/[.,]+$/, "")');
  if (before === chunkBody) throw new Error("--break: 바꿀 쪼개기 식을 못 찾음");
}
const make = new Function("hintsBlock", `const hintChunks = (() => {${chunkBody}\n})();\n${pickCode}\nreturn { hintChunks, pickHintsFor };`);

const S = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8")));
let rows = 0, diff = 0, lessons = 0;
const out = [];
for (const f of fs.readdirSync(path.join(REPO, "content/lessons/ld")).filter((x) => /^d\d{3}\.json$/.test(x)).sort()) {
  const id = f.slice(0, 4);
  const L = JSON.parse(strip(fs.readFileSync(path.join(REPO, "content/lessons/ld", f), "utf8")));
  const hb = (L.blocks || []).find((x) => x.type === "hints");
  const app = make(hb);
  const libChunks = E.hintChunks(hb ? hb.text : "");
  lessons++;
  for (const r of S[id] || []) {
    rows++;
    const x = app.pickHintsFor(r.en), y = E.hintsForSentence(r.en, libChunks);
    if (JSON.stringify(x) !== JSON.stringify(y)) { diff++; if (out.length < 8) out.push(`${id}:${r.n}\n   앱: ${x.map((c) => `「${c}」`).join(" ")}\n   복제: ${y.map((c) => `「${c}」`).join(" ")}`); }
  }
}
console.log(`${BREAK ? "[일부러 깨기 — 앱 코드의 쪼개기를 옛 규칙으로] " : ""}LISTENING ${lessons}강 ${rows}행 · 앱 코드와 검사 복제의 칩이 다른 행 ${diff}`);
if (out.length) console.log(out.join("\n"));
process.exit(diff ? 1 : 0);
