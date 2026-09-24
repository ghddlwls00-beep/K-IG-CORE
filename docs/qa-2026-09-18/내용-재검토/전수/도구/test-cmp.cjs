// 두번째-견주기.cjs 시험 — 가짜 두 번째 판정(첫 판정 사본에서 틀림 하나 빼고 · 새 틀림 하나 더함)으로 같음 n-1 · 새것 1 · 첫에만 1 이 나오는지. 끝나면 치움.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const WT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/hopeful-joliot-c445c0";
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const T = path.join(B, "도구/두번째-견주기.cjs");
const one = JSON.parse(fs.readFileSync(path.join(B, "판정-student.json"), "utf8"));
const n1 = one.묶음.reduce((s, g) => s + g.틀림.length + (g["판단 필요"] || []).length + (g["원본 그대로"] || []).length, 0);
const two = JSON.parse(JSON.stringify(one));
const gi = two.묶음.findIndex((g) => g.틀림.length > 0);
const removed = two.묶음[gi].틀림.shift();
const free = two.묶음.find((g) => g["읽은 글"] >= 3 && !g.틀림.some((x) => x.T === "T03") && !(g["판단 필요"] || []).some((x) => x.T === "T03"));
free.틀림.push({ T: "T03", 종류: "②", 심각도: "낮음", 확신: "보통", 까닭: "시험", 지금: "x", "고칠 글": "y", "고칠 곳": "z", "새 음성 클립": false });
const f2 = path.join(B, "판정-student2.json");
if (fs.existsSync(f2)) { console.error("판정-student2.json 이 이미 있음 — 시험 안 함"); process.exit(1); }
fs.writeFileSync(f2, JSON.stringify(two));
const r = spawnSync(process.execPath, [T, "student", "--pick"], { cwd: WT, encoding: "utf8" });
console.log(r.stdout.trim(), r.stderr.trim());
const cmp = JSON.parse(fs.readFileSync(path.join(B, "두번째/견줌-student.json"), "utf8"));
const g1 = one.묶음.filter((g) => !g.틀림.length); // 그냥 참고
console.log(`기대: 같음 ${n1 - 1} · 새것 1 · 첫에만 1 (+ 첫 확인 G: 틀림이 두 번째에 없으면 첫에만에 더해짐)`);
console.log(`실제: 같음 ${cmp.같음} · 새것 ${cmp.새것} · 첫에만 ${cmp.첫에만} · 첫에만 목록 ${JSON.stringify(cmp.첫에만목록)}`);
console.log(`뺀 것: ${gi >= 0 ? two.묶음[gi].묶음 : ""} ${removed.T} · 더한 것: ${free.묶음} T03`);
for (const f of [f2, path.join(B, "두번째/확인-student.json"), path.join(B, "두번째/견줌-student.json")]) if (fs.existsSync(f)) fs.unlinkSync(f);
console.log(`치움: ${[f2, path.join(B, "두번째/확인-student.json"), path.join(B, "두번째/견줌-student.json")].every((f) => !fs.existsSync(f)) ? "✔" : "✘"}`);
