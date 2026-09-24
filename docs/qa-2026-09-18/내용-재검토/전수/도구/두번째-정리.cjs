#!/usr/bin/env node
// 결정 B 끝난 뒤 정리 — 두 번째 읽기 판정 · 기록(판정-<조각>2.json · 기록-<조각>2.md)을 전수/두번째/ 로 옮기고,
// 읽을거리/<조각>2 사본(git 밖 — 첫 읽을거리 복사본)을 지운다. 이 사본이 남아 있으면 full-merge.cjs 가 조각으로 잘못 센다.
// 옮기기 전에 두번째/견줌 · 확인이 모두 있는지 보고, 옮긴 뒤 파일이 있는지 다시 본다.
const fs = require("fs");
const path = require("path");
const B = path.resolve(__dirname, "..");
const D2 = path.join(B, "두번째");
for (const c of ["ld-a", "ld-b", "student"]) {
  for (const f of [`견줌-${c}.json`, `확인-${c}.json`]) if (!fs.existsSync(path.join(D2, f))) { console.error(`두번째/${f} 가 없음 — 정리하지 않음`); process.exit(1); }
}
for (const c of ["ld-a2", "ld-b2", "student2"]) {
  for (const f of [`판정-${c}.json`, `기록-${c}.md`]) {
    const from = path.join(B, f), to = path.join(D2, f);
    if (fs.existsSync(from)) { fs.renameSync(from, to); console.log(`옮김 ${f} → 두번째/`); }
    if (!fs.existsSync(to)) { console.error(`두번째/${f} 가 없음`); process.exit(1); }
  }
  const dir = path.join(B, "읽을거리", c);
  if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); console.log(`지움 읽을거리/${c}(첫 읽을거리 사본)`); }
}
console.log(`읽을거리/ 에 남은 조각: ${fs.readdirSync(path.join(B, "읽을거리")).sort().join(" ")}`);
