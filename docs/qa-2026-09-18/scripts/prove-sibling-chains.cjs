#!/usr/bin/env node
/**
 * 7단계 7-1 d · h 를 형제 도구에 넓힌 것의 일부러 깨기 — 임시 복사본에만 손대고 저장소 파일은 건드리지 않는다.
 *   1. VOCA: 뒤 계획이 다시 고친 줄(stage6-voca-c 6-0602 associate → zzc)의 사슬 끝 뜻을 복사본 사전에서 몰래 바꿈
 *      → 옛 판(034e91b, 'from 이 아니기만')은 통과, 지금 판(사슬 끝과 대조)은 어긋남.
 *   2. GRAMMAR 문항: 옛 판이 이름 무늬 때문에 안 보던 계획(stage7-g9-that)의 문항 글을 복사본에서 몰래 바꿈
 *      → 옛 판은 통과, 지금 판(꼴로 고름)은 어긋남.
 *   3. GRAMMAR 대체 답안: 뒤 계획이 대신한 줄의 supersededBy 를 없는 계획으로 바꾼 계획 폴더 사본
 *      → 지금 판은 어긋남(사슬 끊김). 옛 판은 그런 줄을 처음부터 걸러 내고(all.filter(x => !x.supersededBy)) 보지 않으므로
 *        같은 사본에서 돌릴 필요 없이 못 잡는다 — 이 도구는 앱 채점기(TypeScript)를 불러 복사본에서 옛 판을 돌리기 어렵다.
 *      깨지 않은 사본은 지금 판도 통과해야 한다.
 *   node docs/qa-2026-09-18/scripts/prove-sibling-chains.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const OLD_REV = "034e91b";
const REL = "docs/qa-2026-09-18/scripts";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kig-prove-sib-"));
const cp = (rel) => fs.cpSync(path.join(REPO, rel), path.join(tmp, rel), { recursive: true });
const oldSrc = (tool) => execFileSync("git", ["show", `${OLD_REV}:${REL}/${tool}`], { cwd: REPO, encoding: "utf8" });
const place = (tool) => {
  fs.mkdirSync(path.join(tmp, REL), { recursive: true });
  fs.writeFileSync(path.join(tmp, REL, `old-${tool}`), oldSrc(tool));
  fs.copyFileSync(path.join(__dirname, tool), path.join(tmp, REL, `new-${tool}`));
};
function edit(rel, from, to) {
  const f = path.join(tmp, rel);
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes(from)) throw new Error(`깨기 자리 없음: ${rel} '${from}'`);
  fs.writeFileSync(f, t.replace(from, to));
}
const run = (file, args, cwd = tmp) => {
  const r = spawnSync(process.execPath, [file, ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 26 });
  const sum = (r.stdout || "").trim().split("\n").filter((x) => /계획/.test(x)).pop() || (r.stderr || "").trim().split("\n")[0];
  return { code: r.status, sum: (sum || "").trim() };
};
let wrong = 0;
const report = (name, want, o, n) => {
  const ok = (o ? o.code === want[0] : true) && n.code === want[1];
  if (!ok) wrong++;
  console.log(`${ok ? "기대대로" : "!! 기대와 다름"} · ${name}${o ? `\n   옛 판 exit ${o.code} — ${o.sum}` : ""}\n   지금 판 exit ${n.code} — ${n.sum}`);
};
try {
  cp(`${REL}/plans`);
  cp("content/voca_dictionary.json");
  cp("content/lessons/grammar1");
  cp("content/lessons/grammar2");
  cp("docs/qa-2026-09-15/scripts/tsload.cjs"); // 지금 판 check-grammar-item-plans 가 앱 채점기로 다시 채점함
  cp("src/lib/grammarGrading.ts");
  place("set-voca-meanings.cjs");
  place("check-grammar-item-plans.cjs");
  const P = (f) => path.join(tmp, REL, "plans", f);
  const voca = (label) => ["--check", P("stage6-voca-c.json")];
  // 1. VOCA
  report("VOCA 깨지 않음(stage6-voca-c)", [0, 0], run(path.join(tmp, REL, "old-set-voca-meanings.cjs"), voca()), run(path.join(tmp, REL, "new-set-voca-meanings.cjs"), voca()));
  const dict = JSON.parse(fs.readFileSync(path.join(tmp, "content/voca_dictionary.json"), "utf8"));
  const endMeaning = dict.associate.meaning;
  edit("content/voca_dictionary.json", `"meaning": ${JSON.stringify(endMeaning)}`, `"meaning": ${JSON.stringify(endMeaning + " (몰래 바꿈)")}`);
  report(`VOCA 사슬 끝 뜻을 몰래 바꿈 — associate '${endMeaning}'`, [0, 1], run(path.join(tmp, REL, "old-set-voca-meanings.cjs"), voca()), run(path.join(tmp, REL, "new-set-voca-meanings.cjs"), voca()));
  // 2. GRAMMAR 문항 — stage7-g9-that 첫 줄이 더한 대체 답안 하나를 복사본 강의 파일에서 뺌
  const g9 = JSON.parse(fs.readFileSync(P("stage7-g9-that.json"), "utf8")).find((l) => l.alternatives && l.alternatives.to.length);
  report("GRAMMAR 문항 깨지 않음", [0, 0], run(path.join(tmp, REL, "old-check-grammar-item-plans.cjs"), []), run(path.join(tmp, REL, "new-check-grammar-item-plans.cjs"), []));
  const gf = path.join(tmp, g9.file);
  const gd = JSON.parse(fs.readFileSync(gf, "utf8"));
  const it = gd.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items).find((i) => String(i.n) === String(g9.n));
  const dropped = g9.alternatives.to[0];
  if (!it || !(it.alternatives || []).includes(dropped)) throw new Error(`깨기 자리 없음: ${g9.file} #${g9.n} '${dropped}'`);
  it.alternatives = it.alternatives.filter((a) => a !== dropped);
  fs.writeFileSync(gf, JSON.stringify(gd, null, 2));
  report(`GRAMMAR 대체 답안 하나를 몰래 뺌 — ${g9.file} #${g9.n} '${dropped}'(stage7-g9-that)`, [0, 1], run(path.join(tmp, REL, "old-check-grammar-item-plans.cjs"), []), run(path.join(tmp, REL, "new-check-grammar-item-plans.cjs"), []));
  // 3. GRAMMAR 대체 답안 — 지금 판만(제자리 도구 + 계획 폴더 사본)
  const altTool = path.join(__dirname, "check-grammar-alt-plans.cjs");
  const altDir = path.join(tmp, "alt-plans");
  fs.cpSync(path.join(__dirname, "plans"), altDir, { recursive: true });
  report("GRAMMAR 대체 답안 깨지 않은 계획 폴더 사본", [null, 0], null, run(altTool, ["--plans-dir", altDir], REPO));
  edit(path.relative(tmp, path.join(altDir, "stage6-grammar-alts-k.json")), '"supersededBy": "stage6-grammar-items-l.json', '"supersededBy": "stage6-grammar-items-zz.json');
  report("GRAMMAR 대체 답안 사슬을 없는 계획으로 끊음(stage6-grammar-alts-k 6-1420 → items-zz)", [null, 1], null, run(altTool, ["--plans-dir", altDir], REPO));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n기대와 다름 ${wrong}`);
process.exit(wrong ? 1 : 0);
