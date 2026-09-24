#!/usr/bin/env node
/**
 * 7단계 7-4 f — 6단계 보류를 소유자 답(결정표 22개, 2026-09-23 밤)대로 닫는 진행 기록 패치를 만든다.
 * 보류 때의 근거(reason)는 지우지 않고 앞에 결론을 붙인다: "소유자 결정 2026-09-23 (결정표 N번 …) → … | 보류 때: <옛 근거>".
 *
 *   node stage7-hold-patch.cjs <결론 목록.json> <패치 출력.json>
 *   결론 목록: [{ "id": "6-1393", "status": "필요 없음", "decision": "5번 B", "note": "…" }, …]
 * 만든 패치는 stage6-progress.cjs apply 로 적는다. 보류가 아닌 번호가 섞이면 멈춘다.
 */
const fs = require("fs");
const path = require("path");
const DIR = path.resolve(__dirname, "..");
const prog = JSON.parse(fs.readFileSync(path.join(DIR, "6단계-진행.json"), "utf8"));
const [listPath, outPath] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(path.resolve(listPath), "utf8"));
const patch = [];
for (const x of list) {
  const cur = prog.items[x.id];
  if (!cur) throw new Error(`${x.id}: 진행 기록에 없음`);
  if (cur.status !== "보류") throw new Error(`${x.id}: 지금 상태가 '${cur.status}' — 보류가 아님, 멈춤`);
  if (!["고침", "필요 없음"].includes(x.status)) throw new Error(`${x.id}: 결론은 고침 · 필요 없음 중 하나`);
  const reason = `소유자 결정 2026-09-23 (결정표 ${x.decision}) → ${x.note} | 보류 때: ${cur.reason}`;
  const p = { id: x.id, status: x.status, reason, stage7: "7-4 f" };
  if (x.files) p.files = x.files;
  if (x.clip) p.clip = x.clip;
  patch.push(p);
}
fs.writeFileSync(path.resolve(outPath), JSON.stringify(patch, null, 1) + "\n");
console.log(`패치 ${patch.length}칸 → ${outPath}`);
