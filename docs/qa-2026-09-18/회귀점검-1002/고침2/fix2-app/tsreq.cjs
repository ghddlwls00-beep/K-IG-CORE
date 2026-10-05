// Tiny TS loader for scratch checks: require("<repo>/src/...ts") transpiled; "@/x" → src/x.
// BEFORE=1: files changed in this fix are read from git HEAD (the state before the fix) — for the break test.
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const ts = require(path.join(REPO, "node_modules/typescript"));
const BEFORE = process.env.BEFORE === "1";

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith("@/")) request = path.join(REPO, "src", request.slice(2));
  if ((request.startsWith(".") || path.isAbsolute(request)) && parent && parent.filename) {
    const base = path.isAbsolute(request) ? request : path.resolve(path.dirname(parent.filename), request);
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
      if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext;
    }
  }
  return origResolve.call(this, request, parent, ...rest);
};

function sourceOf(file) {
  if (BEFORE) {
    const rel = path.relative(REPO, file).split(path.sep).join("/");
    try {
      return execFileSync("git", ["show", `HEAD:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 });
    } catch {
      throw new Error(`BEFORE: ${rel} 은 HEAD 에 없음`);
    }
  }
  return fs.readFileSync(file, "utf8");
}
for (const ext of [".ts", ".tsx"]) {
  require.extensions[ext] = function (module, filename) {
    const out = ts.transpileModule(sourceOf(filename), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    module._compile(out, filename);
  };
}
module.exports = { REPO, BEFORE, load: (p) => require(path.join(REPO, p)) };
