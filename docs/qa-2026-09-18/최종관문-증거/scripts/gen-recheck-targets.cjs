// 최종 관문 5 — 관문 0 기록(g0 · g15 파일만)의 PASS 아닌 음성 결과를 recheck-audio.cjs --from 이 읽는 꼴로 뽑는다.
// recheck-audio.cjs 는 --from 없이 돌면 out/features 의 **모든** 기록(9/18 등 옛 기록)과 옛 recheck-audio*.jsonl 을 '이미 함' 으로 섞는다 —
// 관문 5 는 새 기록으로만. 그래서 대상을 여기서 고르고 --from 으로 넘긴다(그 경우 도구는 recheck-audio<suffix>.jsonl 만 '이미 함' 으로 봄).
// 거르개(마이크 · 이동 · 속도 버튼 · 재생 버튼 아닌 것)는 recheck-audio.cjs 의 NOT_PLAYBACK · worthRechecking 소스를 그대로 읽어 씀 — 두 벌로 갈라지지 않게.
//   node gen-recheck-targets.cjs --out <targets.jsonl>
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
const SRC = fs.readFileSync(path.join(REPO, "docs/qa-2026-09-18/scripts/recheck-audio.cjs"), "utf8");
const m = SRC.match(/const NOT_PLAYBACK = \[[\s\S]*?\nfunction worthRechecking\(a\) \{[\s\S]*?\n  return true;\n\}/);
if (!m) { console.error("STOP: recheck-audio.cjs 의 거르개를 못 찾음 — 도구가 바뀜"); process.exit(2); }
const worthRechecking = new Function(`${m[0].replace("const NOT_PLAYBACK", "var NOT_PLAYBACK")}\nvar skipped = [];\nreturn { worthRechecking, skipped: () => skipped, NOT_PLAYBACK };`.replace(/^const skipped = \[\];$/m, ""))();
// 도구 거르개의 결함(관문 5 에서 찾음 — 도구는 관문 중 안 고침): 마이크 규칙을 '단계 이름 ▶ 버튼 이름' 전체에 대어,
// LISTENING STEP 4 '섀도잉 & 발음 테스트' 단계의 진짜 재생 버튼 '🔊 소리 듣기'(LdLearningView playText)까지 마이크로 뺀다.
// 그런 것만(버튼 이름만으로는 마이크가 아니고 재생 버튼인 것) 다시 볼 대상에 넣고 표시한다.
const PLAY_LABEL = /🔊|🔉|🔈|▶️|▶|재생|듣기|발음|청취|speak|play control/i;
// 도구 거르개의 결함 둘째(관문 5 끝에 찾음 — 00:4x): 속도 규칙(/\d(.\d+)?x|표준 속도|배속/)이 LISTENING 의 진짜 재생 버튼까지 뺌 —
// STEP 2 '🔊 표준 속도'(playText 1.0) · '🐢 0.85x 느리게'(playText 0.82) · STEP 5 문장마다 '🔊 1.25x'(playText) · '⚡ 1x 배속 연속 청취'(toggleWholePassage).
// 진짜 속도 고르기(STEP 1 '0.85x' · STEP 5 '🥉 1.0x 표준 속도' 등 — setSpeedRate 만)는 그대로 뺌. --revive-speed 일 때만 되살림.
const REVIVE_SPEED = process.argv.includes("--revive-speed");
const SPEED_PLAY_LABEL = /^(🔊|🐢)|연속 청취/;
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const OUTF = arg("--out", null);
if (!OUTF) { console.error("--out 필요"); process.exit(2); }
const FILE_RE = /^(student|phonics|grammar1|grammar2|ld|reading)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
// 강의 × 화면마다 가장 늦은 기록만(관문 0 집계와 같음)
const latest = new Map();
for (const f of fs.readdirSync(FEAT).filter((x) => FILE_RE.test(x))) {
  for (const l of fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/)) {
    if (!l.trim()) continue;
    const r = JSON.parse(l);
    const k = `${r.course}|${r.id}|${r.viewport}`;
    if (!latest.has(k) || new Date(latest.get(k).at) < new Date(r.at)) latest.set(k, r);
  }
}
const targets = new Map();
let nonPass = 0, excluded = 0;
const why = {};
for (const r of latest.values()) {
  for (const a of r.audio || []) {
    if (a.status === "PASS") continue;
    nonPass++;
    const before = worthRechecking.skipped().length;
    const [step, label] = String(a.control).split(" ▶ ");
    let titleOnlyMic = false;
    if (!worthRechecking.worthRechecking(a)) {
      const w = worthRechecking.skipped()[before].why;
      const rule = worthRechecking.NOT_PLAYBACK.find((n) => n.why === w);
      // 뺀 규칙이 버튼 이름에는 안 맞고(단계 이름에만 맞음) · 버튼 이름이 어떤 뺌 규칙에도 안 맞고 · 재생 버튼 이름이면 다시 봄
      titleOnlyMic = !!(rule && label && !worthRechecking.NOT_PLAYBACK.some((n) => n.re.test(label)) && PLAY_LABEL.test(label)) && w;
      const speedPlay = REVIVE_SPEED && !titleOnlyMic && rule && /속도 전환/.test(rule.why) && label && SPEED_PLAY_LABEL.test(label.trim()) && r.course === "ld";
      if (!titleOnlyMic && !speedPlay) { excluded++; why[w] = (why[w] || 0) + 1; continue; }
      const k = speedPlay ? `(다시 봄) 도구 거르개가 속도 버튼으로 뺀 LISTENING 재생 버튼(🔊 · 🐢 · 연속 청취)` : `(다시 봄) 도구 거르개가 단계 이름 때문에 뺀 재생 버튼 — ${w.slice(0, 20)}`;
      if (speedPlay) titleOnlyMic = "speed-play";
      why[k] = (why[k] || 0) + 1;
    }
    const key = `${r.url}|${step}|${label}`;
    if (!targets.has(key)) targets.set(key, { course: r.course, id: r.id, url: r.url, step, label, sweepNote: a.note || "", sweepViewports: [], status: a.status, titleOnlyMic });
    const t = targets.get(key);
    if (!t.sweepViewports.includes(r.viewport)) t.sweepViewports.push(r.viewport);
  }
}
fs.writeFileSync(OUTF, [...targets.values()].map((t) => JSON.stringify(t)).join("\n") + (targets.size ? "\n" : ""));
console.log(`기록(강의×화면) ${latest.size} · PASS 아닌 음성 결과 ${nonPass} · 거르개로 뺌 ${excluded} · 다시 볼 대상 ${targets.size} → ${OUTF}`);
for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)} ${k}`);
const byCourse = {};
for (const t of targets.values()) byCourse[`${t.course} ${t.status}`] = (byCourse[`${t.course} ${t.status}`] || 0) + 1;
console.log(`   대상: ${JSON.stringify(byCourse)}`);
