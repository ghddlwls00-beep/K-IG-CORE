// 최종 관문 — 관문 15 고친 배포 뒤 다시 돌기(셋째 판 3b, 2026-09-25 04:2x): 명령서 관문 0 '코드가 바뀐 과정은 그 파일을 쓰는 과정 전부' ·
// 관문 15 '기대 글이 달라진 강의 전부 × 3화면'. 코드가 바뀐 과정 = LISTENING(LdLearningView · listeningUtils) · VOCA(vocaUtils · vocaSpeech) ·
// GRAMMAR I · II(grammarGrading — GrammarLearningView 만 씀) → 전부. STUDENT(listeningUtils — 셋째 길 비교에서 s6-2 만 달라짐) · READING 은
// 배포된 판(d2b50ca)과 견준 expect-diff-deploy.json 의 달라진 쪽만. 조각은 첫 스윕에서 잰 쪽당 시간으로 약 2시간 안팎.
// --dry-run 은 첫 스윕 기록(g0 파일)과 합쳐 전 쪽 × 3화면(4,869)이 빠짐없이 덮이는지도 센다.
// 기록 파일: out/features/<과정>-g15-<화면>-<i>of<n>(-r<k>).jsonl — gate-count 가 g0 · g15 를 같이 읽음. 드라이버 DRIVER_REV 7-1m-g15.
//   node gate0-sweep3b.cjs --changed <expect-diff-deploy.json> [--deploy-sha <sha>] [--dry-run]
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const DRIVER = path.join(REPO, "docs/qa-2026-09-18/scripts/drive-generic.cjs");
const HERE = __dirname;
const STATE = path.join(HERE, "gate0-state3b.json");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
if (process.env.BASE) { console.error(`STOP: BASE=${process.env.BASE} — 운영에서만`); process.exit(2); }
const CHANGED = arg("--changed", null);
if (!CHANGED) { console.error("--changed <expect-diff.json> 필요"); process.exit(2); }
const changed = JSON.parse(fs.readFileSync(CHANGED, "utf8")).out;
const DRIVER_SRC = fs.readFileSync(DRIVER, "utf8");
if (!/DRIVER_REV = "7-1m-g15"/.test(DRIVER_SRC)) { console.error("STOP: 본 폴더 드라이버가 7-1m-g15 가 아님 — 합치기 전?"); process.exit(2); }

const E = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
const units = [];
const U = (course, viewport, tag, est, extra) => units.push({ id: `${course}-${viewport}-${tag}`, course, viewport, suffix: `-g15-${viewport}-${tag}`, est, ...extra });
// 쪽당 시간(첫 스윕에서 잼, 분): LISTENING 데스크톱 1.2 · 태블릿 0.1 · 휴대폰 0.5 · VOCA 0.8 · 0.1 · 0.36 · GRAMMAR 데스크톱 4.5 · 태블릿 0.13 · 휴대폰 0.2 ·
// STUDENT 데스크톱 4(한 이용권 진도가 겹치지 않게 나누지 않음) · READING 0.35
const SH = (course, viewport, n, perMin) => { for (let i = 1; i <= n; i++) U(course, viewport, `${i}of${n}`, (E.pages(course).length / n) * perMin / 60, { shard: `${i}/${n}` }); };
// --ld-fine(2026-09-25 13:2x · 소유자 '그래' — 시간 줄이기 ③ 끝에 남는 긴 조각 줄이기): LISTENING 을 잘게(데스크톱 12 · 휴대폰 6 · 태블릿 2) —
//   맨 뒤 조각이 짧아 일꾼 셋이 비슷하게 끝남. LISTENING 조각을 하나도 시작하기 전에만 쓴다(조각 이름이 바뀜).
const LD_FINE = process.argv.includes("--ld-fine");
SH("ld", "desktop", LD_FINE ? 12 : 6, 1.2); SH("ld", "tablet", LD_FINE ? 2 : 1, 0.1); SH("ld", "mobile", LD_FINE ? 6 : 3, 0.5);
SH("phonics", "desktop", 2, 0.8); SH("phonics", "tablet", 1, 0.1); SH("phonics", "mobile", 1, 0.36);
SH("grammar1", "desktop", 8, 4.5); SH("grammar1", "tablet", 1, 0.13); SH("grammar1", "mobile", 1, 0.2);
SH("grammar2", "desktop", 4, 4.5); SH("grammar2", "tablet", 1, 0.13); SH("grammar2", "mobile", 1, 0.2);
for (const c of ["student", "reading"]) {
  const ids = (changed[c] && changed[c].changed) || [];
  if (!ids.length) continue;
  const per = { student: { desktop: 4, tablet: 0.3, mobile: 0.5 }, reading: { desktop: 0.35, tablet: 0.1, mobile: 0.15 } }[c];
  for (const vp of ["desktop", "tablet", "mobile"]) U(c, vp, "1of1", /* gate-count 이름 규칙(<i>of<n>) */ (ids.length * per[vp]) / 60, { ids });
}
// --changed4 <expect-diff-deploy4.json>(2026-09-25 13:4x): 세 번째 배포(소리 꼴 — 로마자 한국어 낱말 · d169 '1 1/2')로 기대 글(소리 글)이 바뀐 쪽.
//   STUDENT · READING 은 그 쪽만 그 배포 뒤 3화면 다시(조각 이름 s1of1 — gate-count 이름 규칙 s?<i>of<n>). GRAMMAR II · LISTENING 은 아직 안 돈 조각
//   (--hold · --ld-last)이 그 배포 뒤에 전부 돌므로 따로 더하지 않음. 이 인자는 그 배포가 올라온 뒤 다시 켤 때만 준다.
if (arg("--changed4", null)) {
  const ch4 = JSON.parse(fs.readFileSync(arg("--changed4", null), "utf8")).out;
  for (const c of ["student", "reading"]) {
    const ids = (ch4[c] && ch4[c].changed) || [];
    if (!ids.length) continue;
    const per = { student: { desktop: 4, tablet: 0.3, mobile: 0.5 }, reading: { desktop: 0.35, tablet: 0.1, mobile: 0.15 } }[c];
    for (const vp of ["desktop", "tablet", "mobile"]) U(c, vp, "s1of1", (ids.length * per[vp]) / 60, { ids });
  }
}
// --ld-last(2026-09-25 06:2x): LISTENING 조각을 맨 뒤로 — 소유자가 칩 번짐(앱 칩 규칙) 고침을 고르면 LISTENING 은 그 배포 뒤에 한 번만 돌게(전체 시간은 같음).
// --hold-ld: LISTENING 조각을 집지 않음(다른 과정이 끝나면 멈춤) — 그 배포를 기다릴 때.
const LD_LAST = process.argv.includes("--ld-last") || process.argv.includes("--hold-ld");
units.sort((a, b) => (LD_LAST ? (a.course === "ld") - (b.course === "ld") : 0) || b.est - a.est);
if (process.argv.includes("--hold-ld")) units.splice(0, units.length, ...units.filter((u) => u.course !== "ld"));
// --hold <과정 또는 과정-화면,…>(2026-09-25 11:4x): 한국어 발음 고침(세 번째 배포 — 소리 글이 바뀜)이 닿는 조각을 그 배포까지 집지 않음.
//   예: --hold grammar2,reading,student-tablet,student-mobile. 그 배포 뒤 --hold 없이 다시 켜면 상태 파일대로 이어 돎.
const HOLD = arg("--hold", "").split(",").filter(Boolean);
if (HOLD.length) units.splice(0, units.length, ...units.filter((u) => !HOLD.some((h) => h === u.course || h === `${u.course}-${u.viewport}`)));
const pagesOf = (u) => (u.ids ? E.pages(u.course).filter((p) => u.ids.includes(p.id)) : (() => { const [i, n] = u.shard.split("/").map(Number); return E.pages(u.course).filter((_, k) => k % n === i - 1); })());

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { startedAt: new Date().toISOString(), deploySha: arg("--deploy-sha", null), units: {} };
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
function doneIds(u, tries) {
  const done = new Set();
  for (let t = 1; t <= tries; t++) {
    const f = path.join(FEAT, `${u.course}${u.suffix}${t > 1 ? `-r${t}` : ""}.jsonl`);
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (r.viewport === u.viewport && !r.visitError && r.load && r.load.navigated) done.add(r.id); } catch {} }
  }
  return done;
}
function runUnit(u, w, attempt) {
  return new Promise((resolve) => {
    const suffix = `${u.suffix}${attempt > 1 ? `-r${attempt}` : ""}`;
    const args = [DRIVER, "--course", u.course, "--viewports", u.viewport, "--suffix", suffix, "--port", String(9710 + w), "--clone", `g0-w${w}`];
    const done = attempt > 1 ? doneIds(u, attempt - 1) : new Set();
    const left = pagesOf(u).filter((p) => !done.has(p.id)).map((p) => p.id);
    if (!left.length) return resolve(0);
    if (attempt === 1 && u.shard) args.push("--shard", u.shard); else args.push("--ids", left.join(","));
    const log = fs.createWriteStream(path.join(HERE, `gate15-w${w}.log`), { flags: "a" });
    log.write(`\n=== ${new Date().toISOString()} ${u.id} try ${attempt} (pages ${left.length})\n`);
    const p = spawn(process.execPath, args, { cwd: REPO, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => log.write(d));
    p.stderr.on("data", (d) => log.write(d));
    p.on("close", (code) => { log.write(`=== ${new Date().toISOString()} ${u.id} exit ${code}\n`); log.end(); resolve(code); });
  });
}
let next = 0;
// 브라우저 자리(2~3개까지): gate15-slots.txt 의 수(1~3, 없으면 3)보다 번호가 큰 일꾼은 새 조각을 집지 않고 1분마다 다시 봄 — 관문 검사(시험 채점 등)가
// 셋째 자리를 쓰는 동안 2로 두고, 끝나면 3으로. 도는 조각은 끊지 않음(보존 시험 쪽에서 끊기면 안 되므로).
const SLOTS = path.join(HERE, "gate15-slots.txt");
const slots = () => { try { const n = Number(fs.readFileSync(SLOTS, "utf8").trim()); return n >= 1 && n <= 3 ? n : 3; } catch { return 3; } };
const parked = new Set();
async function worker(w) {
  for (;;) {
    if (next >= units.length) return;
    if (w > slots()) {
      if (!parked.has(w)) { parked.add(w); console.log(`${new Date().toISOString()} w${w} 쉼(자리 ${slots()})`); }
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }
    if (parked.delete(w)) console.log(`${new Date().toISOString()} w${w} 다시 일함(자리 ${slots()})`);
    const k = next++;
    if (k >= units.length) return;
    const u = units[k];
    const st = (state.units[u.id] ||= { tries: 0 });
    if (st.done) continue;
    for (;;) {
      st.tries++; st.worker = w; st.startedAt = new Date().toISOString(); save();
      const code = await runUnit(u, w, st.tries);
      st.lastExit = code; st.endedAt = new Date().toISOString();
      st.left = pagesOf(u).length - doneIds(u, st.tries).size;
      if (code === 0 && st.left === 0) { st.done = true; save(); break; }
      save();
      if (st.tries >= 5) { st.gaveUp = true; save(); break; }
    }
  }
}
(async () => {
  let visits = 0;
  for (const u of units) visits += pagesOf(u).length;
  if (process.argv.includes("--dry-run")) {
    for (const u of units) console.log(`${u.id.padEnd(28)} pages ${String(pagesOf(u).length).padStart(4)} · est ${u.est.toFixed(1)} h · file ${u.course}${u.suffix}.jsonl`);
    // 첫 스윕(g0 기록) + 이 계획 = 전 쪽 × 3화면?
    const RE = /^(student|phonics|grammar1|grammar2|ld|reading)-g0-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
    const seen = new Set();
    for (const f of fs.readdirSync(FEAT).filter((x) => RE.test(x))) for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) { if (!l.trim()) continue; try { const r = JSON.parse(l); if (!r.visitError && r.load && r.load.navigated) seen.add(`${r.course}|${r.id}|${r.viewport}`); } catch {} }
    const planned = new Set(units.flatMap((u) => pagesOf(u).map((p) => `${u.course}|${p.id}|${u.viewport}`)));
    let all = 0; const miss = [];
    for (const c of ["student", "phonics", "grammar1", "grammar2", "ld", "reading"]) for (const p of E.pages(c)) for (const vp of ["desktop", "tablet", "mobile"]) { all++; const k = `${c}|${p.id}|${vp}`; if (!seen.has(k) && !planned.has(k)) miss.push(k); }
    const est = units.reduce((a, u) => a + u.est, 0);
    console.log(`units ${units.length} · visits ${visits} · 어림 ${est.toFixed(1)} 일꾼-시간 ÷ 3 ≈ ${(est / 3).toFixed(1)} 시간 — --dry-run: nothing started`);
    console.log(`덮임: 전 쪽 × 3화면 ${all} · 첫 스윕 본 것 ${seen.size} · 이 계획 ${planned.size} · 둘 다 아닌 것 ${miss.length}${miss.length ? " — " + miss.slice(0, 12).join(" ") : ""}`);
    process.exit(miss.length ? 1 : 0);
  }  save();
  console.log(`units ${units.length} · visits ${visits} · workers 3 · state ${STATE}`);
  await Promise.all([1, 2, 3].map((w) => worker(w)));
  state.finishedAt = new Date().toISOString();
  save();
  const left = units.filter((u) => !state.units[u.id] || !state.units[u.id].done).map((u) => u.id);
  console.log(`finished · units not done ${left.length}${left.length ? ": " + left.join(", ") : ""}`);
})();
