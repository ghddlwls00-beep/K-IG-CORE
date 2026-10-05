#!/usr/bin/env node
/**
 * A2 — STUDENT '완료 취소' 가 다른 기기에서 되살아나지 않는가 (같은 이용권 · 두 기기).
 *
 * 진짜 ProgressProvider.tsx 를 React 로 그려(effect 까지 돎) 두 기기(저장소 따로)를 흉내 내고, 서버는 진짜
 * src/app/api/progress/student/route.ts 의 GET · POST(이용권 확인만 가짜 · 진도는 임시 폴더 data/ 에만)를 부른다.
 * LicenseProvider 는 가짜(이용권 있음 · 쪽을 열면 GET 해서 applyStudentProgress).
 *
 *   node test-a2.cjs [--client=head] [--server=head]
 *     --client=head  ProgressProvider.tsx 를 HEAD 판으로   --server=head  studentProgress.ts 를 HEAD 판으로
 * 시나리오 1(되살아남): A 완료 s1-2 → B 첫 쪽(서버 완료를 받아 적음) → A 완료 취소 → B 둘째 쪽 → 서버 s1-2 가 false 여야
 * 시나리오 2(진짜 옛 완료는 옮김): 이용권 없이 완료한 기기 C(s1-1) → 새 이용권으로 쪽 열기 → 서버 s1-1 true 여야
 * exit 0 = 두 시나리오 모두 기대대로
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "../../../../..");
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1];
const CLIENT_HEAD = arg("client") === "head";
const SERVER_HEAD = arg("server") === "head";

for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_LICENSE_BUCKET", "LICENSE_STORAGE_SECRET", "VERCEL"]) {
  if (process.env[k]) { console.error(`멈춤: ${k} 가 있음 — 진짜 저장소에 쓸 수 있음`); process.exit(2); }
}

const HEADDIR = fs.mkdtempSync(path.join(os.tmpdir(), "kig-a2-head-"));
const headFile = (rel) => {
  const out = path.join(HEADDIR, rel.replace(/[\\/]/g, "_"));
  fs.writeFileSync(out, execSync(`git show HEAD:${rel}`, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }));
  return out;
};
const PROVIDER = CLIENT_HEAD ? headFile("src/components/ProgressProvider.tsx") : path.join(REPO, "src/components/ProgressProvider.tsx");
const STUDENT_PROGRESS = SERVER_HEAD ? headFile("src/lib/studentProgress.ts") : path.join(REPO, "src/lib/studentProgress.ts");

const ts = require(path.join(REPO, "node_modules/typescript"));
const React = require(require.resolve("react", { paths: [REPO] }));
let SESSION = null;

// fake LicenseProvider: licence on · the page asks the server once on open (as LicenseProvider.refreshStudentProgress)
const LicenseCtx = React.createContext(null);
function FakeLicense({ children, licenseId }) {
  const [studentProgress, setStudentProgress] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/progress/student").then((r) => r.json()).then((d) => d.success && setStudentProgress(d.progress));
  }, []);
  const value = { hasActiveLicense: !!licenseId, licenseInfo: licenseId ? { licenseId } : null, studentProgress, applyStudentProgress: setStudentProgress, adultProgress: null, applyAdultProgress: () => {} };
  return React.createElement(LicenseCtx.Provider, { value }, children);
}
const fakeLicenseModule = { useLicense: () => React.useContext(LicenseCtx) };

const OVERRIDES = { "server-only": {}, "@/lib/licenseSession": { verifyLicenseSession: async () => SESSION }, "./LicenseProvider": fakeLicenseModule };
const cache = new Map();
function resolveSpec(spec, fromDir) {
  let p;
  if (spec === "@/lib/studentProgress") return STUDENT_PROGRESS;
  if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true, jsx: ts.JsxEmit.ReactJSX },
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

process.chdir(REPO);
const route = load(path.join(REPO, "src/app/api/progress/student/route.ts"));
const PP = load(PROVIDER);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kig-a2-"));
process.chdir(TMP);

// --- a browser, just enough for ProgressProvider (no DOM nodes are drawn) ---
class Store {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  key(i) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}
const listeners = {};
const doc = { nodeType: 9, addEventListener() {}, removeEventListener() {}, activeElement: null, body: null, defaultView: null };
global.window = global;
global.document = doc;
doc.defaultView = global;
global.addEventListener = (t, f) => ((listeners[t] ||= []).push(f));
global.removeEventListener = (t, f) => { listeners[t] = (listeners[t] || []).filter((x) => x !== f); };
global.dispatchEvent = () => true;
global.HTMLIFrameElement = class HTMLIFrameElement {};
global.HTMLElement = class HTMLElement {};
if (typeof global.CustomEvent === "undefined") global.CustomEvent = class CustomEvent { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
Object.defineProperty(global, "navigator", { value: { onLine: true, userAgent: "node" }, configurable: true });
const devices = {};
function useDevice(name) {
  devices[name] ||= new Store();
  // Object.keys(window.localStorage) must list the keys (ProgressProvider's marker scan): a Proxy over the store
  const store = devices[name];
  Object.defineProperty(global, "localStorage", { configurable: true, writable: true, value: new Proxy(store, {
    ownKeys: () => [...store.m.keys()],
    getOwnPropertyDescriptor: (t, k) => (store.m.has(k) ? { enumerable: true, configurable: true, value: store.m.get(k) } : undefined),
    get: (t, k) => (typeof t[k] === "function" ? t[k].bind(t) : t[k]),
  }) });
}
const posts = [];
global.fetch = async (url, init = {}) => {
  const method = (init.method || "GET").toUpperCase();
  const req = new Request(`http://local${url}`, { method, headers: init.headers, body: init.body });
  if (method === "POST") posts.push({ device: CURRENT, body: JSON.parse(init.body) });
  return method === "POST" ? route.POST(req) : route.GET(req);
};
let CURRENT = null;

const ReactDOMClient = require(require.resolve("react-dom/client", { paths: [REPO] }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let api = null;
function Probe() { api = PP.useProgress(); return null; }

async function openPage(device, licence, actions = async () => {}) {
  CURRENT = device;
  useDevice(device);
  SESSION = licence ? { payload: { key: licence.key, deviceId: `${licence.key}-${device}`, plan: "1Y" } } : null;
  const container = { nodeType: 1, ownerDocument: doc, addEventListener() {}, removeEventListener() {}, nodeName: "DIV", tagName: "DIV" };
  const root = ReactDOMClient.createRoot(container);
  root.render(React.createElement(FakeLicense, { licenseId: licence ? licence.id : null }, React.createElement(PP.ProgressProvider, null, React.createElement(Probe))));
  await sleep(400); // GET · effects · the old-completion POST
  await actions();
  await sleep(900); // the queue's 650 ms timer
  root.unmount();
  await sleep(50);
}
async function serverState(licence) {
  SESSION = { payload: { key: licence.key, deviceId: "check", plan: "1Y" } };
  const res = await route.GET(new Request("http://local/api/progress/student"));
  return (await res.json()).progress;
}

const results = [];
const check = (name, ok, note) => results.push({ name, ok: !!ok, note });

(async () => {
  // --- 시나리오 1: 같은 이용권 L · 기기 A · B ---
  const L = { key: "KIG-1Y-0000000000000001-FFFFFFFFFFFFFFFF", id: "lic-a2-1" };
  await openPage("A", L, async () => { api.toggleComplete("student", "s1-2"); });
  let s = await serverState(L);
  check("1-1 A 에서 s1-2 완료 → 서버 true", s.lessons["s1-2"]?.completed === true, JSON.stringify(s.lessons["s1-2"] || null));
  await openPage("B", L); // B 첫 쪽: 서버 완료를 받아 이 기기 저장소에 적음
  const bCopy = JSON.parse(devices.B.getItem("kig:progress:completed") || "{}");
  check("1-2 B 첫 쪽 뒤 B 저장소에 student:s1-2 (서버 사본)", bCopy["student:s1-2"] === true, JSON.stringify(bCopy));
  await openPage("A", L, async () => { if (api.isCompleted("student", "s1-2")) api.toggleComplete("student", "s1-2"); });
  s = await serverState(L);
  check("1-3 A 에서 완료 취소 → 서버 false", s.lessons["s1-2"]?.completed === false, JSON.stringify(s.lessons["s1-2"] || null));
  const before = posts.length;
  await openPage("B", L); // B 둘째 쪽 — 낡은 저장소(s1-2 완료 사본)를 가진 채
  const legacyPosts = posts.slice(before).filter((p) => p.device === "B" && Array.isArray(p.body.legacyCompletedLessonIds));
  s = await serverState(L);
  check("1-4 B 둘째 쪽 뒤 서버 s1-2 는 여전히 false(되살아나지 않음)", s.lessons["s1-2"]?.completed === false, `${JSON.stringify(s.lessons["s1-2"] || null)} · B 가 보낸 옛 완료 ${JSON.stringify(legacyPosts.map((p) => p.body.legacyCompletedLessonIds))}`);
  const bAfter = JSON.parse(devices.B.getItem("kig:progress:completed") || "{}");
  check("1-5 B 화면(저장소)도 s1-2 완료 아님", !bAfter["student:s1-2"], JSON.stringify(bAfter));

  // --- 시나리오 2: 진짜 옛 완료(이용권 없이 완료한 기기 C)는 그대로 옮겨짐 ---
  const M = { key: "KIG-1Y-0000000000000002-FFFFFFFFFFFFFFFF", id: "lic-a2-2" };
  await openPage("C", null, async () => { api.toggleComplete("student", "s1-1"); }); // 이용권 없음 — 이 기기에만
  await openPage("C", M); // 새 이용권으로 쪽 열기
  s = await serverState(M);
  check("2-1 이용권 없이 한 옛 완료 s1-1 → 새 이용권 서버로 옮겨짐", s.lessons["s1-1"]?.completed === true, JSON.stringify(s.lessons["s1-1"] || null));

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[client ${CLIENT_HEAD ? "HEAD(고치기 전)" : "고친 뒤"} · server ${SERVER_HEAD ? "HEAD(고치기 전)" : "고친 뒤"}] 실패 ${failed} / ${results.length}`);
  process.chdir(REPO);
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.rmSync(HEADDIR, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
