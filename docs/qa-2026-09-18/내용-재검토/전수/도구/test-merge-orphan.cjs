// 합치기 두 도구의 '어느 칸에도 안 들어간 조정 키 → exit 1' 깨기 시험(3차 점검 요청).
// 없는 대상을 가리키는 조정 키 하나를 넣고 돌려 exit 1 · 치우고 다시 돌려 exit 0 인지. 조정 파일이 이미 있으면 시험하지 않음(덮어쓰지 않게).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const B = path.resolve(__dirname, "..");
const cases = [
  { tool: "채점-합치기.cjs", adj: path.join(B, "채점", "조정.json"), key: "B:grammar1/gh1-006#1:9" },
  { tool: "두번째-합치기.cjs", adj: path.join(B, "두번째", "조정.json"), key: "N:ld/d999:T01" },
];
for (const c of cases) {
  if (fs.existsSync(c.adj)) { console.log(`${c.tool}: 조정.json 이 이미 있어 시험 안 함`); continue; }
  fs.mkdirSync(path.dirname(c.adj), { recursive: true });
  const run = () => spawnSync(process.execPath, [path.join(__dirname, c.tool)], { encoding: "utf8" });
  const before = run().status;
  fs.writeFileSync(c.adj, JSON.stringify({ [c.key]: { 결론: "표에 올림", 까닭: "깨기 시험 — 없는 대상" } }));
  const r = run();
  fs.unlinkSync(c.adj);
  const after = run().status;
  console.log(`${c.tool}: 조정 없음 exit ${before} · 없는 키 조정 exit ${r.status} (${(r.stderr || "").trim().split("\n").pop()}) · 치운 뒤 exit ${after} → ${before === 0 && r.status === 1 && after === 0 ? "✔ 깨기 잡음" : "✘"}`);
}
