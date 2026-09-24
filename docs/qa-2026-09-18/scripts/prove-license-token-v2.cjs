#!/usr/bin/env node
/**
 * 7단계 7-4 b · BUG-018 (PRIV-01) 로컬 증명 — 브라우저가 이용권 코드를 갖지 않아도 등록 · 확인 · 해제 · 세션 복원 · 진도가 되는가,
 * 토큰 · 쿠키 · 응답 어디에도 코드가 읽히게 남지 않는가, 예전 토큰(v1)을 가진 학습자가 끊기지 않고 새 토큰으로 넘어가는가.
 *
 * 운영 · R2 에 닿지 않는다: 버리는 비밀값(LICENSE_SALT · LICENSE_SECRET), R2 환경변수 없음(deviceStorage 가 로컬 JSON 으로),
 * process.cwd() 를 임시 폴더로 — 저장소에 아무것도 쓰지 않음. 앱의 **실제** API 처리 함수(src/app/api/license/*\/route.ts ·
 * progress/student)를 Request 로 부른다. 이용권 코드는 이 시험이 만든 가짜 코드(generateLicenseKey)뿐.
 *
 * 깨기: 같은 '토큰에 코드가 읽히나' 검사를 옛 판(BUG-018 바로 전 커밋 b4fc941) serverLicense.ts 의 토큰에 대면 읽혀야 한다(검사가 실패를 잡는지).
 *   node docs/qa-2026-09-18/scripts/prove-license-token-v2.cjs        기대대로면 exit 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kig-bug018-"));
process.chdir(tmp);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET"]) delete process.env[k];
process.env.LICENSE_SALT = crypto.randomBytes(24).toString("hex");
process.env.LICENSE_SECRET = crypto.randomBytes(24).toString("hex");
process.env.NODE_ENV = "development";

const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const lic = loadTs(path.join(REPO, "src/lib/serverLicense.ts"));
const dev = loadTs(path.join(REPO, "src/lib/deviceStorage.ts"));
const ses = loadTs(path.join(REPO, "src/lib/licenseSession.ts"));
const route = (p) => loadTs(path.join(REPO, "src/app/api", p, "route.ts"));
const R = { activate: route("license/activate").POST, verify: route("license/verify").POST, session: route("license/session").GET, deactivate: route("license/deactivate").POST, progressGet: route("progress/student").GET };

async function call(fn, { body, cookie } = {}) {
  const headers = { "content-type": "application/json", "user-agent": "bug018-proof" };
  if (cookie) headers.cookie = cookie;
  const req = new Request("http://localhost/api/x", { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  const res = await fn(req);
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const sessionCookie = (setCookie.find((c) => c.startsWith("kig_license_session=")) || "").split(";")[0].slice("kig_license_session=".length);
  return { status: res.status, json, text, sessionCookie: sessionCookie ? decodeURIComponent(sessionCookie) : null };
}
const wire = (token) => { try { return JSON.parse(Buffer.from(String(token).split(".")[0], "base64url").toString("utf8")); } catch { return null; } };
/** 코드가 읽히나: 토큰 payload 를 base64 로 풀었을 때 · 응답 글 · 쿠키에 코드의 nonce 나 checksum 이 그대로 있으면 읽힘 */
const codeReadableIn = (text, key) => { const [, , nonce, sum] = key.split("-"); const s = String(text || ""); return s.includes(key) || s.includes(nonce) || s.includes(sum); };
const decoded = (token) => Buffer.from(String(token).split(".")[0], "base64url").toString("utf8");
/** 예전(v1) 토큰 — 바뀌기 전 issueLicenseToken 과 같은 모양(서명은 같은 비밀값) */
function v1Token(key, plan, deviceId, expiresAt) {
  const b64 = Buffer.from(JSON.stringify({ key, plan, deviceId, expiresAt, iat: Date.now() })).toString("base64url");
  return `${b64}.${crypto.createHmac("sha256", process.env.LICENSE_SECRET).update(b64).digest("base64url")}`;
}

const rows = [];
let wrong = 0;
const expect = (name, ok, detail = "") => { rows.push(`${ok ? "기대대로" : "!! 기대와 다름"} · ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) wrong++; };

(async () => {
  const key = lic.generateLicenseKey("1Y");
  const A = "dev_A_0123456789", B = "dev_B_0123456789", C = "dev_C_0123456789";

  // 1 새 기기 등록 — 새 토큰에 코드가 읽히지 않음
  const a1 = await call(R.activate, { body: { key, deviceId: A, deviceName: "시험 A" } });
  const tA = a1.json && a1.json.licenseToken;
  expect("1 등록(기기 A) 200 · 토큰 받음", a1.status === 200 && !!tA, `status ${a1.status}`);
  expect("1 새 토큰(v2): 풀어도 코드가 안 읽힘 · v:2 · kc 있음", !!tA && !codeReadableIn(decoded(tA), key) && wire(tA).v === 2 && !!wire(tA).kc && wire(tA).key === undefined, `payload 칸 ${tA ? Object.keys(wire(tA)).join(",") : "-"}`);
  expect("1 응답 글 · 세션 쿠키에 코드 없음(가린 코드 · id 는 있음)", !codeReadableIn(a1.text.replace(tA, ""), key) && !codeReadableIn(decoded(a1.sessionCookie || ""), key) && /^KIG-1Y-[0-9A-F]{4}…[0-9A-F]{4}$/.test(a1.json.maskedKey) && /^id-[0-9a-f]{16}$/.test(a1.json.licenseId), `maskedKey ${a1.json && a1.json.maskedKey} · licenseId ${a1.json && a1.json.licenseId}`);

  // 2 확인 — 토큰만(코드 없이)
  const v1 = await call(R.verify, { body: { deviceId: A, token: tA } });
  expect("2 확인(토큰만) 200 valid · 새 토큰 안 만듦(같은 토큰 유지)", v1.status === 200 && v1.json.valid === true && v1.json.licenseToken === undefined && v1.sessionCookie === tA, `status ${v1.status}`);
  const other = lic.generateLicenseKey("1Y");
  const v2 = await call(R.verify, { body: { deviceId: A, token: tA, key: other } });
  expect("2 확인에 다른 코드를 같이 보내면 403", v2.status === 403, `status ${v2.status}`);
  const v3 = await call(R.verify, { body: { deviceId: B, token: tA } });
  expect("2 다른 기기 ID 로 확인하면 403", v3.status === 403, `status ${v3.status}`);
  const bad = tA.slice(0, 10) + (tA[10] === "A" ? "B" : "A") + tA.slice(11);
  const v4 = await call(R.verify, { body: { deviceId: A, token: bad } });
  expect("2 변조한 토큰 403", v4.status === 403, `status ${v4.status}`);

  // 3 두 번째 기기 · 세 번째 거부(2대 제한)
  const b1 = await call(R.activate, { body: { key, deviceId: B, deviceName: "시험 B" } });
  expect("3 두 번째 기기(B) 등록 200", b1.status === 200, `status ${b1.status}`);
  const c1 = await call(R.activate, { body: { key, deviceId: C, deviceName: "시험 C" } });
  expect("3 세 번째 기기(C) 거부 403(2대 제한)", c1.status === 403, `status ${c1.status} · ${c1.json && c1.json.error}`);
  const tB = b1.json.licenseToken;

  // 4 세션 복원 — 코드를 돌려주지 않음
  const s1 = await call(R.session, { cookie: `kig_license_session=${encodeURIComponent(tB)}; kig_device=${B}` });
  expect("4 세션 복원(쿠키 v2) valid · 응답에 코드 없음 · key 칸 없음 · 가린 코드 있음", s1.json.valid === true && s1.json.key === undefined && !codeReadableIn(s1.text.replace(tB, ""), key) && !!s1.json.maskedKey, `칸 ${Object.keys(s1.json || {}).join(",")}`);

  // 5 예전 사용자 전환 — v1 토큰(코드 읽힘) + 코드 → 새 토큰
  const old = v1Token(key, "1Y", A, a1.json.expiresAt);
  expect("5 (대조) v1 토큰은 풀면 코드가 읽힘", codeReadableIn(decoded(old), key));
  const m1 = await call(R.verify, { body: { deviceId: A, token: old, key } });
  expect("5 v1 토큰 + 코드로 확인 200 → 새 토큰(v2) 줌 · 쿠키도 새 토큰", m1.status === 200 && !!m1.json.licenseToken && wire(m1.json.licenseToken).v === 2 && !codeReadableIn(decoded(m1.json.licenseToken), key) && m1.sessionCookie === m1.json.licenseToken, `status ${m1.status}`);
  const m2 = await call(R.verify, { body: { deviceId: A, token: old } });
  expect("5 v1 토큰만(코드 없이)으로도 200 → 새 토큰", m2.status === 200 && !!m2.json.licenseToken && wire(m2.json.licenseToken).v === 2, `status ${m2.status}`);
  const m3 = await call(R.session, { cookie: `kig_license_session=${encodeURIComponent(old)}; kig_device=${A}` });
  expect("5 쿠키에 v1 토큰이 남은 채 세션 복원 → 새 토큰(응답 · 쿠키)", m3.json.valid === true && wire(m3.json.token).v === 2 && m3.sessionCookie === m3.json.token && !codeReadableIn(m3.text.replace(m3.json.token, ""), key), `valid ${m3.json && m3.json.valid}`);

  // 6 수업 · 미디어 문지기(쿠키 확인)와 진도
  const g = await ses.verifyLicenseSessionToken(tB);
  expect("6 수업 문지기(verifyLicenseSessionToken)가 v2 토큰으로 열림 · 서버 안에서는 코드를 앎", !!g && g.payload.key === key && g.legacy === false);
  const gOld = await ses.verifyLicenseSessionToken(old);
  expect("6 v1 토큰도 문지기 통과(끊기지 않음) · legacy 표시", !!gOld && gOld.legacy === true);
  const p = await call(R.progressGet, { cookie: `kig_license_session=${encodeURIComponent(tB)}` });
  expect("6 진도(GET /api/progress/student) v2 쿠키로 200", p.status === 200 && p.json && p.json.success === true, `status ${p.status}`);

  // 7 해제 — 토큰만
  const d1 = await call(R.deactivate, { body: { deviceId: A, token: tB } });
  expect("7 다른 기기 토큰으로 해제 403", d1.status === 403, `status ${d1.status}`);
  const d2 = await call(R.deactivate, { body: { deviceId: A, token: tA } });
  expect("7 해제(토큰만, 기기 A) 200 · 쿠키 지움", d2.status === 200 && d2.json.success === true, `status ${d2.status}`);
  const v5 = await call(R.verify, { body: { deviceId: A, token: tA } });
  expect("7 해제한 기기 A 확인 403", v5.status === 403, `status ${v5.status}`);
  const c2 = await call(R.activate, { body: { key, deviceId: C, deviceName: "시험 C" } });
  expect("7 자리가 비어 기기 C 등록 200", c2.status === 200, `status ${c2.status}`);

  // 8 환불 차단 · 관리자 초기화
  await dev.revokeLicenseKey(key, "시험 환불");
  const r1 = await call(R.verify, { body: { deviceId: B, token: tB } });
  expect("8 환불 차단된 코드 — 확인 403", r1.status === 403 && r1.json.revoked === true, `status ${r1.status}`);
  const r2 = await call(R.activate, { body: { key, deviceId: "dev_D_0123456789", deviceName: "시험 D" } });
  expect("8 환불 차단된 코드 — 새 등록 거부", r2.status === 403, `status ${r2.status}`);
  const key2 = lic.generateLicenseKey("LIFE");
  const e1 = await call(R.activate, { body: { key: key2, deviceId: A, deviceName: "시험 A" } });
  await dev.resetAllDevicesForKey(key2);
  const e2 = await call(R.verify, { body: { deviceId: A, token: e1.json.licenseToken } });
  expect("8 관리자 기기 초기화 뒤 — 옛 기기 확인 403", e2.status === 403, `status ${e2.status}`);

  // 깨기 — 옛 판 serverLicense.ts 의 토큰에 같은 검사: 코드가 읽혀야.
  // 옛 판 = BUG-018 커밋(0524168) 바로 전 b4fc941 로 고정 — 전에는 `HEAD:` 였는데, BUG-018 이 커밋된 뒤로는 HEAD 가 새 판이라
  // 이 깨기가 늘 실패했다(24/25 · 3차 점검이 찾음 2026-09-24).
  const OLD_REV = "b4fc941";
  const oldDir = path.join(tmp, "old-src");
  fs.mkdirSync(oldDir, { recursive: true });
  for (const f of ["serverLicense.ts", "license.ts"]) fs.writeFileSync(path.join(oldDir, f), execFileSync("git", ["show", `${OLD_REV}:src/lib/${f}`], { cwd: REPO, encoding: "utf8" }));
  const oldLic = loadTs(path.join(oldDir, "serverLicense.ts"));
  const oldTok = oldLic.issueLicenseToken(key, "1Y", A, null);
  expect("깨기: 옛 판 issueLicenseToken 의 토큰은 풀면 코드가 읽힘(검사가 실패를 잡음)", codeReadableIn(decoded(oldTok), key));

  for (const r of rows) console.log(r);
  console.log(`\n기대와 다름 ${wrong} · 시험 ${rows.length} (임시 폴더 ${tmp} — 끝나면 지움)`);
  process.chdir(REPO);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(wrong ? 1 : 0);
})().catch((e) => { console.error(e); try { process.chdir(REPO); fs.rmSync(tmp, { recursive: true, force: true }); } catch {} process.exit(2); });
