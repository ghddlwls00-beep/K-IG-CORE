#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 진도 저장의 조건부 쓰기(R2 ETag)를 가짜 R2 로 확인 (설계 §5 · 코드 단계 C 점검 1).
 *
 * src/lib/passoffProgress.ts 를 두 번 불러 서버 인스턴스 둘을 흉내 낸다(인스턴스마다 '코드마다 한 줄 세우기' Map 이 따로 —
 * Vercel 의 인스턴스 둘과 같음). "@aws-sdk/client-s3" 는 이 파일의 가짜(메모리 안 객체 · ETag · If-Match · If-None-Match
 * 를 S3 처럼 따짐)로 바꾸고, R2 환경값은 이 프로세스 안에서만 가짜로 넣는다 — 네트워크로 나가는 것 없음. 진짜 R2 환경값이
 * 이미 있으면 아무것도 안 하고 멈춘다(exit 2).
 *   R1 두 인스턴스가 같은 코드에 거의 같은 때 다른 레슨을 씀(처음 쓰기 · 그다음 쓰기 둘 다) → 둘 다 남음
 *      (예전 판은 나중 쓰기가 앞 것을 지움 — 목록 ✓ 와 잠금이 어긋난 원인 하나)
 *   R2 처음 쓰기는 If-None-Match "*" · 그다음은 읽은 때의 ETag 로 If-Match
 *   R3 조건을 받지 않는 저장소(501) → 조건 없이 한 번 더 써서 남음(예전 동작 — 더 나빠지지 않음)
 *   R4 계속 412 → 조건부 3번 뒤 조건 없는 쓰기 1번으로 끝남(끝없이 돌지 않음)
 *   R5 바뀐 것이 없으면 쓰기 0(같은 완료를 다시 보내도)
 *   R6 저장된 몸은 암호문(레슨 id · 이용권 코드가 보이지 않음) · 다시 읽으면 같은 기록
 *   R7 관리자 초기화는 조건 없는 쓰기 · 수동 해금은 조건부 쓰기
 *   R8 이 저장소 폴더의 data/ 에 쓴 것 없음
 *
 *   node docs/pass-off-grammar/검사/check-progress-r2.cjs                      # exit 0 = 실패 0
 *   node docs/pass-off-grammar/검사/check-progress-r2.cjs --break=no-condition # 조건 없이 쓰는 사본 — FAIL(exit 1)이어야
 *
 * 한계: 진짜 R2 가 If-Match · If-None-Match 를 이렇게 따지는지는 이 컴퓨터에서 못 봄(R2 자격 없음). Cloudflare 문서는
 * PutObject 가 이 조건 머리를 받고 어긋나면 412 PreconditionFailed 라고 한다. 받지 않더라도(R3) 예전처럼 저장된다.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Module = require("module");

const REPO = path.resolve(__dirname, "../../..");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "no-condition") {
  console.error(`모르는 깨기: ${BREAK} — no-condition`);
  process.exit(2);
}

// --- never the real store: stop when real R2 values are around, then put fake ones in this process only ---
const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"];
const present = R2_ENV.filter((k) => process.env[k]);
if (present.length || process.env.NODE_ENV === "production") {
  console.error(`멈춤: ${[...present, process.env.NODE_ENV === "production" ? "NODE_ENV=production" : ""].filter(Boolean).join(", ")} 가 설정돼 있음 — 가짜 R2 값만 쓰는 검사`);
  process.exit(2);
}
process.env.R2_ACCOUNT_ID = "fake-account";
process.env.R2_ACCESS_KEY_ID = "fake-access-key";
process.env.R2_SECRET_ACCESS_KEY = "fake-secret-key";
process.env.R2_LICENSE_BUCKET = "fake-bucket";
process.env.LICENSE_STORAGE_SECRET = crypto.randomBytes(32).toString("hex");

// --- the fake R2: objects in memory, an ETag per write, the S3 conditions on PutObject ---
const store = new Map();
const log = [];
let mode = "normal"; // "normal" · "no-condition-support" (answers 501 to a conditional write) · "always-412"
let beforePut = null; // one-shot: runs just before the next write lands (another instance writing in between)
const failure = (name, status) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });
class GetObjectCommand {
  constructor(input) {
    this.input = input;
    this.kind = "get";
  }
}
class PutObjectCommand {
  constructor(input) {
    this.input = input;
    this.kind = "put";
  }
}
class S3Client {
  async send(command) {
    const { Key, Body, IfMatch, IfNoneMatch } = command.input;
    if (command.kind === "get") {
      log.push({ op: "get", Key });
      const object = store.get(Key);
      if (!object) throw failure("NoSuchKey", 404);
      return { Body: { transformToString: async () => object.body }, ETag: object.etag };
    }
    if (beforePut) {
      const hook = beforePut;
      beforePut = null;
      await hook();
    }
    log.push({ op: "put", Key, IfMatch, IfNoneMatch });
    const conditional = IfMatch !== undefined || IfNoneMatch !== undefined;
    if (conditional && mode === "no-condition-support") throw failure("NotImplemented", 501);
    if (conditional && mode === "always-412") throw failure("PreconditionFailed", 412);
    const current = store.get(Key);
    if (IfMatch !== undefined && (!current || current.etag !== IfMatch)) throw failure("PreconditionFailed", 412);
    if (IfNoneMatch === "*" && current) throw failure("PreconditionFailed", 412);
    const etag = `"${crypto.createHash("md5").update(String(Body)).digest("hex")}"`;
    store.set(Key, { body: String(Body), etag });
    return { ETag: etag };
  }
}
const FAKE_S3 = { S3Client, GetObjectCommand, PutObjectCommand };

// --- one "server instance" = its own copy of every module (so its own write queue), the fake R2 shared ---
const ts = require(path.join(REPO, "node_modules/typescript"));
function resolveSpec(spec, fromDir) {
  let p;
  if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
  else if (spec.startsWith(".")) p = path.join(fromDir, spec);
  else return null;
  for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  return p;
}
function instance() {
  const cache = new Map();
  const load = (file) => {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
    let text = fs.readFileSync(file, "utf8");
    if (BREAK === "no-condition" && file === path.join(REPO, "src/lib/passoffProgress.ts")) {
      const changed = text.replace('etag ? { IfMatch: etag } : { IfNoneMatch: "*" }', "{}");
      if (changed === text) {
        console.error("깨기 no-condition 가 적용되지 않음 — passoffProgress.ts 글이 바뀌었으면 이 파일을 고칠 것");
        process.exit(2);
      }
      text = changed;
    }
    const out = ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
      fileName: file,
    }).outputText;
    const m = { exports: {} };
    cache.set(file, m);
    const dir = path.dirname(file);
    const req = (spec) => {
      if (spec === "server-only") return {};
      if (spec === "@aws-sdk/client-s3") return FAKE_S3;
      const r = resolveSpec(spec, dir);
      if (r) return load(r);
      return Module.createRequire(path.join(REPO, "package.json"))(spec);
    };
    new Function("require", "module", "exports", "__filename", "__dirname", out)(req, m, m.exports, file, dir);
    return m.exports;
  };
  return load(path.join(REPO, "src/lib/passoffProgress.ts"));
}

process.chdir(REPO); // content.ts reads process.cwd()/content
const dataFile = path.join(REPO, "data", "passoff-progress.json");
const dataBefore = fs.existsSync(dataFile) ? fs.statSync(dataFile).mtimeMs : null;
const A = instance();
const B = instance();
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const [t1] = index.groups.map((g) => g.lessons);

const results = [];
const check = (name, ok, note) => results.push({ name, ok: Boolean(ok), note });
const code = (plan) => `KIG-${plan}-${crypto.randomBytes(8).toString("hex").toUpperCase()}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
const done = (id) => [{ lessonId: id, completed: true, clientUpdatedAt: Date.now() }];
const puts = (from) => log.slice(from).filter((x) => x.op === "put");

(async () => {
  // R1 · R2 — the first write: both instances find no object
  const key = code("STU1Y");
  let mark = log.length;
  beforePut = () => B.updatePassoffProgress(key, done(t1[1]));
  await A.updatePassoffProgress(key, done(t1[0]));
  let rec = await A.getPassoffProgress(key);
  const firstPuts = puts(mark);
  check(`R1a 처음 쓰기가 겹침: 인스턴스 A(${t1[0]}) · B(${t1[1]}) 둘 다 남음`, rec.lessons[t1[0]]?.completed && rec.lessons[t1[1]]?.completed, Object.keys(rec.lessons).join(" "));
  check(
    "R2a 처음 쓰기는 If-None-Match \"*\" — 겹친 A 는 412 뒤 다시 읽고 B 의 ETag 로 If-Match",
    firstPuts.length === 3 && firstPuts[0].IfNoneMatch === "*" && firstPuts[1].IfNoneMatch === "*" && typeof firstPuts[2].IfMatch === "string",
    firstPuts.map((p) => (p.IfMatch ? `If-Match ${p.IfMatch.slice(0, 9)}…` : p.IfNoneMatch ? `If-None-Match ${p.IfNoneMatch}` : "조건 없음")).join(" → "),
  );

  // R1 · R2 — a later write: both instances read the same version
  mark = log.length;
  const etagBefore = store.get([...store.keys()][0]).etag;
  beforePut = () => B.updatePassoffProgress(key, done(t1[2]));
  await A.updatePassoffProgress(key, [{ mapRefillTopic: 1 }]);
  rec = await B.getPassoffProgress(key);
  const laterPuts = puts(mark);
  check(`R1b 그다음 쓰기가 겹침: A(구성도 1) · B(${t1[2]}) 둘 다 남음 · TOPIC 2 열림`, rec.lessons[t1[2]]?.completed && rec.mapRefills["1"] && rec.unlockedThrough === 2,
    `레슨 ${Object.keys(rec.lessons).length} · 구성도 ${Object.keys(rec.mapRefills).join(",") || "없음"} · unlockedThrough ${rec.unlockedThrough}`);
  check("R2b 그다음 쓰기는 읽은 때의 ETag 로 If-Match(겹친 A 는 한 번 더)", laterPuts.length === 3 && laterPuts[0].IfMatch === etagBefore && laterPuts[1].IfMatch === etagBefore && laterPuts[2].IfMatch && laterPuts[2].IfMatch !== etagBefore,
    laterPuts.map((p) => (p.IfMatch ? `If-Match ${p.IfMatch.slice(0, 9)}…` : "조건 없음")).join(" → "));

  // R3 a store that refuses the condition itself
  mode = "no-condition-support";
  const key3 = code("1Y");
  mark = log.length;
  await A.updatePassoffProgress(key3, done(t1[0]));
  mode = "normal";
  const rec3 = await A.getPassoffProgress(key3);
  const p3 = puts(mark);
  check("R3 조건을 안 받는 저장소(501) → 조건 없이 한 번 더 써서 남음", rec3.lessons[t1[0]]?.completed && p3.length === 2 && p3[0].IfNoneMatch === "*" && !p3[1].IfMatch && !p3[1].IfNoneMatch,
    `쓰기 ${p3.length} · ${Object.keys(rec3.lessons).join(" ") || "안 남음"}`);

  // R4 a conflict every time
  mode = "always-412";
  const key4 = code("STU1M");
  mark = log.length;
  await A.updatePassoffProgress(key4, done(t1[0]));
  mode = "normal";
  const rec4 = await A.getPassoffProgress(key4);
  const p4 = puts(mark);
  const reads4 = log.slice(mark).filter((x) => x.op === "get").length;
  check("R4 계속 412 → 조건부 3번 뒤 조건 없는 쓰기 1번으로 끝(읽기 4 · 쓰기 4)", rec4.lessons[t1[0]]?.completed && p4.length === 4 && p4.slice(0, 3).every((p) => p.IfMatch || p.IfNoneMatch) && !p4[3].IfMatch && !p4[3].IfNoneMatch,
    `쓰기 ${p4.length} · 읽기 ${reads4 - 1}(+ 확인 읽기 1)`);

  // R5 nothing new — nothing written
  mark = log.length;
  await B.updatePassoffProgress(key, done(t1[0]));
  check("R5 이미 있는 완료를 다시 보내면 쓰기 0", puts(mark).length === 0, `쓰기 ${puts(mark).length}`);

  // R6 what is stored
  const bodies = [...store.values()].map((o) => o.body);
  const readable = bodies.filter((b) => /pg\d{2}-\d/.test(b) || b.includes(key) || b.includes("lessons"));
  const envelope = JSON.parse(bodies[0]);
  check("R6 저장된 몸은 암호문(레슨 id · 코드 · 칸 이름이 안 보임) · 다시 읽으면 같은 기록", readable.length === 0 && envelope.version === 1 && envelope.ciphertext && rec.lessons[t1[0]]?.completed,
    `객체 ${bodies.length} · 읽히는 몸 ${readable.length}`);
  const keys = [...store.keys()];
  check("R6b 객체 이름 private/progress/passoff-grammar/<sha256>.json(STUDENT 객체와 다른 곳)", keys.every((k) => /^private\/progress\/passoff-grammar\/[0-9a-f]{64}\.json$/.test(k)), keys[0]);

  // R7 the owner's reset and manual open
  mark = log.length;
  await A.resetPassoffProgress(key);
  const resetPut = puts(mark);
  const afterReset = await B.getPassoffProgress(key);
  mark = log.length;
  await B.setPassoffTopic(key, 3);
  const setPut = puts(mark);
  const afterSet = await A.getPassoffProgress(key);
  check("R7 초기화 = 조건 없는 쓰기 1 · 빈 기록 / 수동 해금 = 조건부 쓰기 · TOPIC 3",
    resetPut.length === 1 && !resetPut[0].IfMatch && !resetPut[0].IfNoneMatch && Object.keys(afterReset.lessons).length === 0 && afterReset.unlockedThrough === 1 &&
      setPut.length === 1 && typeof setPut[0].IfMatch === "string" && afterSet.unlockedThrough === 3,
    `초기화 쓰기 ${resetPut.length} · 수동 해금 쓰기 ${setPut.length}(${setPut[0] && setPut[0].IfMatch ? "If-Match" : "조건 없음"}) · unlockedThrough ${afterSet.unlockedThrough}`);

  // R8
  const dataAfter = fs.existsSync(dataFile) ? fs.statSync(dataFile).mtimeMs : null;
  check("R8 저장소 data/passoff-progress.json 에 쓴 것 없음(가짜 R2 로만)", dataAfter === dataBefore, dataAfter === dataBefore ? "그대로" : "바뀜");

  for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name}  — ${x.note}`);
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${failed ? "FAIL" : "PASS"} — 실패 ${failed} / ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
