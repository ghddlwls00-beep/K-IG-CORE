#!/usr/bin/env node
/**
 * 6단계 진행 기록 — docs/qa-2026-09-18/6단계-진행.json 을 만들고 채우고 센다. 번호마다 한 칸.
 *
 *   node stage6-progress.cjs init                 목록(6단계-목록.json) 1,759건을 "미처리" 로 만든다 (이미 있으면 안 덮음)
 *   node stage6-progress.cjs apply <patch.json>   [{ id, status, reason, files?, clip?, batch? }, …] 를 적는다
 *   node stage6-progress.cjs add <patch.json>     이월 항목(6E-…)처럼 목록에 없던 번호를 새 칸으로 더한다
 *   node stage6-progress.cjs summary [--batch N]  상태별 개수 · 미처리 남은 수 (배치를 주면 그 배치만)
 *   node stage6-progress.cjs summary --category factual   목록의 category 가 그것인 번호만 (예: ① 사실 오류 86건)
 *   node stage6-progress.cjs summary --course LISTENING   목록의 course 가 그것인 번호만
 *
 * status 는 이 다섯 중 하나: 고침 · 필요 없음 · 이미 해결 · 보류 · 대상 아님 (처음엔 미처리).
 * 기억이 압축되면 이 파일을 읽고 "미처리" 인 것부터 이어 간다. 끝에 미처리 0 이어야 끝.
 */
const fs = require("fs");
const path = require("path");
const DIR = path.resolve(__dirname, "..");
const FILE = path.join(DIR, "6단계-진행.json");
const LIST = path.join(DIR, "6단계-목록.json");
const STATUSES = ["고침", "필요 없음", "이미 해결", "보류", "대상 아님"];

const load = () => JSON.parse(fs.readFileSync(FILE, "utf8"));
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 1) + "\n", "utf8");
const [cmd, arg] = process.argv.slice(2);

function validate(p, d, allowNew) {
  if (!p.id) throw new Error(`id 없음: ${JSON.stringify(p)}`);
  if (!allowNew && !d.items[p.id]) throw new Error(`${p.id}: 진행 기록에 없는 번호`);
  if (allowNew && d.items[p.id]) throw new Error(`${p.id}: 이미 있는 번호 — add 가 아니라 apply`);
  if (p.status && !STATUSES.includes(p.status) && p.status !== "미처리") throw new Error(`${p.id}: 모르는 상태 ${p.status}`);
  if (p.status && p.status !== "미처리" && !String(p.reason || "").trim()) throw new Error(`${p.id}: 근거(reason) 없이 ${p.status} 로 적을 수 없음`);
  if (p.clip && !["필요", "불필요"].includes(p.clip)) throw new Error(`${p.id}: clip 은 필요/불필요`);
}

if (cmd === "init") {
  if (fs.existsSync(FILE)) { console.log(`${path.basename(FILE)} 이미 있음 — 덮지 않음`); process.exit(0); }
  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const items = {};
  for (const it of list.items) items[it.id] = { status: "미처리", reason: "", files: [], clip: "", batch: null };
  save({ about: "6단계 진행 — 번호마다 한 칸. status: 고침 · 필요 없음 · 이미 해결 · 보류 · 대상 아님 (처음엔 미처리). 만든 도구: scripts/stage6-progress.cjs", listGenerated: list.generated, items });
  console.log(`만듦: ${Object.keys(items).length}칸 · 전부 미처리`);
} else if (cmd === "apply" || cmd === "add") {
  const d = load();
  const patch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8"));
  for (const p of patch) validate(p, d, cmd === "add");
  for (const p of patch) {
    const cur = d.items[p.id] || { status: "미처리", reason: "", files: [], clip: "", batch: null };
    d.items[p.id] = { ...cur, ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== "id")) };
  }
  save(d);
  console.log(`${cmd}: ${patch.length}칸 적음`);
} else if (cmd === "summary") {
  const d = load();
  const bi = process.argv.indexOf("--batch");
  const batch = bi > 0 ? process.argv[bi + 1] : null;
  const ci = process.argv.indexOf("--category");
  const category = ci > 0 ? process.argv[ci + 1] : null;
  const oi = process.argv.indexOf("--course");
  const course = oi > 0 ? process.argv[oi + 1] : null;
  const listItems = category || course ? JSON.parse(fs.readFileSync(LIST, "utf8")).items : [];
  const catOf = new Map(listItems.map((x) => [x.id, x.category]));
  const courseOf = new Map(listItems.map((x) => [x.id, x.course]));
  const rows = Object.entries(d.items)
    .filter(([, v]) => batch === null || String(v.batch) === String(batch))
    .filter(([id]) => category === null || catOf.get(id) === category)
    .filter(([id]) => course === null || courseOf.get(id) === course);
  const by = {};
  for (const [, v] of rows) by[v.status] = (by[v.status] || 0) + 1;
  const clip = rows.filter(([, v]) => v.clip === "필요").length;
  const e = rows.filter(([id]) => id.startsWith("6E-")).length;
  const label = [batch ? `배치 ${batch}` : "", category ? `category ${category}` : "", course ? `과정 ${course}` : ""].filter(Boolean).join(" · ") || "전체";
  console.log(`${label} ${rows.length}칸 (이월 6E ${e}) · ${[...STATUSES, "미처리"].map((s) => `${s} ${by[s] || 0}`).join(" · ")} · 클립 필요 ${clip}`);
} else {
  console.log("사용: init | apply <patch> | add <patch> | summary [--batch N]");
  process.exit(1);
}
