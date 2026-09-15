// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Loads the app's real TypeScript modules (pure libs) so the audit exercises
// exactly the code that ships, instead of a re-implementation.
const fs = require("fs");
const path = require("path");
const Module = require("module");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const ts = require(path.join(REPO, "node_modules/typescript"));
const cache = new Map();

function resolveSpec(spec, fromDir) {
  let p;
  if (spec.startsWith("@/")) p = path.join(REPO, "src", spec.slice(2));
  else if (spec.startsWith(".")) p = path.join(fromDir, spec);
  else return null;
  for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return p;
}

function loadTs(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const m = { exports: data };
    m.exports.default = data;
    cache.set(file, m);
    return data;
  }
  const src = fs.readFileSync(file, "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: file,
  }).outputText;
  const m = { exports: {} };
  cache.set(file, m);
  const dir = path.dirname(file);
  const req = (spec) => {
    if (spec === "server-only") return {};
    const r = resolveSpec(spec, dir);
    if (r) return loadTs(r);
    return Module.createRequire(path.join(REPO, "package.json"))(spec);
  };
  const fn = new Function("require", "module", "exports", "__filename", "__dirname", out);
  fn(req, m, m.exports, file, dir);
  return m.exports;
}

module.exports = { loadTs, REPO };
