#!/usr/bin/env node
/**
 * BUG-030 — 평생(LIFE) 이용권으로 연 STUDENT 챕터에서 '이 강의 학습 완료' 가 서버에 남는가.
 *
 * 운영에서 잰 것(2026-09-24, 감사용 LIFE 이용권): s3-3 에서 완료를 두 번 눌렀는데 서버 진도에 s3-3 이 없었다
 * (unlockedThrough 1). 강의 쪽 문(src/app/student/[lesson]/page.tsx)은 LIFE 면 모든 챕터를 여는데,
 * 진도 저장(src/lib/studentProgress.ts updateStudentProgress)의 RE-010 가드는 plan 을 모르고
 * '해금 챕터 + 1' 너머의 완료를 말없이 버렸다. 고친 뒤: 경로(src/app/api/progress/student/route.ts)가
 * 강의 쪽 문과 같은 규칙(plan === "LIFE")으로 everyChapterOpen 을 넘긴다.
 *
 * 이 검사는 진짜 route.ts 의 POST 를 부른다(이용권 확인만 가짜 — 아래 SESSION). 진도는 임시 폴더의
 * data/student-progress.json 에만 쓴다: R2 환경값이 하나라도 있으면 아무것도 안 하고 멈춘다(exit 2).
 *   ① 1Y  : s3-3 완료 → 버려짐(RE-010 그대로)            ② 1Y : 모든 강의 한꺼번에 → unlockedThrough ≤ 3
 *   ③ LIFE: s3-3 완료 → 남음                              ④ LIFE: s3-3 완료 취소 → false 로 남음
 *   ⑤ LIFE: 마지막 강의 s5-2 → 남음                        ⑥ LIFE: 옛 완료 목록(s4-1 · s4-2) → 둘 다 남음
 *   ⑦ STULIFE: s3-3 완료 → 버려짐(강의 쪽 문이 STULIFE 는 순서대로 열므로 같은 답)
 *   ⑧ 강의 쪽 문의 규칙 글자가 그대로인가(바뀌면 route.ts 도 같이 바꾸라고 멈춤)
 *   node docs/qa-2026-09-18/scripts/prove-life-completion.cjs [--break]
 *     --break  LIFE 칸에 1Y 이용권을 넣는다 — ③~⑥ 실패 · exit 1 이어야
 *   KIG_CODE_ROOT=<고치기 전 커밋을 풀어 둔 폴더> 로 돌리면 ③~⑥ · ⑧ 실패 · exit 1 이어야(고치기 전 코드가 정말 버렸는가)
 * exit 0 = 실패 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const REPO = path.resolve(__dirname, "../../..");
// KIG_CODE_ROOT=<src · content 가 있는 다른 폴더> — 같은 검사를 다른 판(예: 고치기 전 커밋)에 돌린다. node_modules 는 이 저장소 것.
const CODE = process.env.KIG_CODE_ROOT ? path.resolve(process.env.KIG_CODE_ROOT) : REPO;
const BREAK = process.argv.includes("--break");

// --- 진짜 저장소에 절대 쓰지 않게: R2 값이 보이면 멈춘다 ---
const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"];
const present = R2_ENV.filter((k) => process.env[k]);
if (present.length || process.env.NODE_ENV === "production") {
  console.error(`멈춤: ${[...present, process.env.NODE_ENV === "production" ? "NODE_ENV=production" : ""].filter(Boolean).join(", ")} 가 설정돼 있어 진짜 진도 저장소에 쓸 수 있음`);
  process.exit(2);
}

// --- route.ts 를 그대로 불러오되 이용권 확인(licenseSession)만 바꿔 끼운다 ---
const ts = require(path.join(REPO, "node_modules/typescript"));
let SESSION = null;
const OVERRIDES = {
  "server-only": {},
  "@/lib/licenseSession": { verifyLicenseSession: async () => SESSION },
};
const cache = new Map();
function resolveSpec(spec, fromDir) {
  let p;
  if (spec.startsWith("@/")) p = path.join(CODE, "src", spec.slice(2));
  else if (spec.startsWith(".")) p = path.join(fromDir, spec);
  else return null;
  for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  return p;
}
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
    fileName: file,
  }).outputText;
  const m = { exports: {} };
  cache.set(file, m);
  const dir = path.dirname(file);
  const req = (spec) => {
    if (Object.prototype.hasOwnProperty.call(OVERRIDES, spec)) return OVERRIDES[spec];
    const r = resolveSpec(spec, dir);
    if (r) return load(r);
    return Module.createRequire(path.join(REPO, "package.json"))(spec);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", out)(req, m, m.exports, file, dir);
  return m.exports;
}

// content.ts 는 불러올 때 process.cwd()/content 를 잡고, 진도 파일은 부를 때 process.cwd()/data 에 쓴다.
// 저장소에서 불러온 뒤 임시 폴더로 옮겨 부른다 — 저장소의 data/ 에는 아무것도 안 생긴다.
process.chdir(CODE);
const route = load(path.join(CODE, "src/app/api/progress/student/route.ts"));
if (CODE !== REPO) console.log(`(판: ${CODE})`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kig-bug030-"));
process.chdir(TMP);

let seq = 0;
const fakeKey = (plan) => `KIG-${plan}-${String(++seq).padStart(16, "0")}-${"F".repeat(16)}`;
const sessionFor = (plan) => ({ payload: { key: fakeKey(BREAK && plan === "LIFE" ? "1Y" : plan), deviceId: `prove-${seq}`, plan: BREAK && plan === "LIFE" ? "1Y" : plan } });
async function post(session, body) {
  SESSION = session;
  const res = await route.POST(new Request("http://local/api/progress/student", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const data = await res.json();
  if (res.status !== 200 || !data.success) throw new Error(`POST ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  return data.progress;
}

const results = [];
const check = (name, ok, note) => results.push({ name, ok: !!ok, note });

(async () => {
  const t = Date.now();
  const allIds = JSON.parse(fs.readFileSync(path.join(CODE, "content/courses/student.json"), "utf8")).lessons.map((l) => l.id).filter((id) => /^s\d+-\d+$/.test(id));

  // ① ② 1Y — RE-010 가드는 그대로
  const y = sessionFor("1Y");
  let p = await post(y, { updates: [{ lessonId: "s3-3", completed: true, clientUpdatedAt: t }] });
  check("① 1Y s3-3 완료 → 버려짐", !p.lessons["s3-3"], `s3-3=${JSON.stringify(p.lessons["s3-3"] || null)} unlockedThrough=${p.unlockedThrough}`);
  const y2 = sessionFor("1Y");
  p = await post(y2, { updates: allIds.map((id) => ({ lessonId: id, completed: true, clientUpdatedAt: t })) });
  const beyond = Object.keys(p.lessons).filter((id) => Number(id.match(/^s(\d+)-/)[1]) > 2);
  check("② 1Y 모든 강의 한꺼번에 → unlockedThrough ≤ 3 · 3챕터 이후 저장 0", p.unlockedThrough <= 3 && beyond.length === 0, `보낸 ${allIds.length}강 · unlockedThrough=${p.unlockedThrough} · 3챕터 이후 저장 ${beyond.length}`);

  // ③ ④ ⑤ ⑥ LIFE — 어느 챕터든 남는다
  const life = sessionFor("LIFE");
  p = await post(life, { updates: [{ lessonId: "s3-3", completed: true, clientUpdatedAt: t }] });
  check("③ LIFE s3-3 완료 → 남음", p.lessons["s3-3"]?.completed === true, `s3-3=${JSON.stringify(p.lessons["s3-3"] || null)} unlockedThrough=${p.unlockedThrough}`);
  p = await post(life, { updates: [{ lessonId: "s3-3", completed: false, clientUpdatedAt: t + 1000 }] });
  check("④ LIFE s3-3 완료 취소 → false", p.lessons["s3-3"]?.completed === false, `s3-3=${JSON.stringify(p.lessons["s3-3"] || null)}`);
  p = await post(life, { updates: [{ lastLessonId: "s5-2", clientUpdatedAt: t + 2000 }] });
  check("⑤ LIFE 마지막 강의 s5-2 → 남음", p.lastLessonId === "s5-2", `lastLessonId=${p.lastLessonId}`);
  p = await post(life, { legacyCompletedLessonIds: ["s4-1", "s4-2"] });
  check("⑥ LIFE 옛 완료 목록 s4-1 · s4-2 → 둘 다 남음", p.lessons["s4-1"]?.completed === true && p.lessons["s4-2"]?.completed === true, `s4-1=${JSON.stringify(p.lessons["s4-1"] || null)} s4-2=${JSON.stringify(p.lessons["s4-2"] || null)}`);

  // ⑦ STULIFE — 강의 쪽 문이 순서대로 여는 이용권은 가드 그대로
  p = await post(sessionFor("STULIFE"), { updates: [{ lessonId: "s3-3", completed: true, clientUpdatedAt: t }] });
  check("⑦ STULIFE s3-3 완료 → 버려짐", !p.lessons["s3-3"], `s3-3=${JSON.stringify(p.lessons["s3-3"] || null)}`);

  // ⑧ 강의 쪽 문과 진도 저장이 같은 규칙인가 — 글자로 대조
  const gate = fs.readFileSync(path.join(CODE, "src/app/student/[lesson]/page.tsx"), "utf8");
  const writer = fs.readFileSync(path.join(CODE, "src/app/api/progress/student/route.ts"), "utf8");
  const RULE = 'session.payload.plan === "LIFE"';
  check("⑧ 강의 쪽 문 · 진도 저장 규칙 글자 같음", gate.includes(RULE) && writer.includes(`everyChapterOpen: ${RULE}`), `page.tsx ${gate.includes(RULE) ? "있음" : "없음"} · route.ts ${writer.includes(`everyChapterOpen: ${RULE}`) ? "있음" : "없음"} — 한쪽을 바꾸면 다른 쪽도`);

  const leftovers = [REPO, CODE].some((root) => fs.existsSync(path.join(root, "data", "student-progress.json")) && fs.statSync(path.join(root, "data", "student-progress.json")).mtimeMs >= t);
  check("저장소 data/ 에 쓴 것 없음", !leftovers, leftovers ? "저장소의 data/student-progress.json 이 이번에 바뀜" : "임시 폴더에만 씀");

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${BREAK ? "[--break] " : ""}실패 ${failed} / ${results.length}`);
  process.chdir(REPO); // Windows 는 지금 있는 폴더를 못 지운다
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
