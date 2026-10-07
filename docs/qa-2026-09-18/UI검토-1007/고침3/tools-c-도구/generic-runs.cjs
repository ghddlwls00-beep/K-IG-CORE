// tools-c (2026-10-08 고침3): the drive-generic runs of the break test, one after another (one browser at a time) through run.cjs.
//   node generic-runs.cjs pass|break|repass
const { spawnSync } = require("child_process");
const path = require("path");
const RUN = path.join(__dirname, "run.cjs");
const G = "docs/qa-2026-09-18/scripts/drive-generic.cjs";
const base = (course, ids, vps, suffix) => ["node", G, "--course", course, "--ids", ids, "--viewports", vps, "--suffix", suffix, "--clone", "toolsc-gen", "--port", "9984", "--persist-every", "1", "--redo"];
const SETS = {
  pass: [
    ["gen-ld-pass", false, base("ld", "d001,d001-1", "desktop", "-toolsc-pass")],
    ["gen-grammar1-pass", false, base("grammar1", "gh1-006", "desktop", "-toolsc-pass")],
    ["gen-grammar2-pass", false, base("grammar2", "gh2-007,gh2-007-1", "desktop", "-toolsc-pass")],
    ["gen-phonics-pass", false, base("phonics", "mv1-01", "desktop", "-toolsc-pass")],
    ["gen-student-pass", false, base("student", "s1-1", "desktop", "-toolsc-pass")],
    ["gen-adult-pass", false, base("adult", "a1-2", "desktop,small", "-toolsc-pass")],
  ],
  break: [
    ["gen-ld-break-app", true, base("ld", "d001", "desktop", "-toolsc-break-app")],
    ["gen-grammar1-break-app", true, base("grammar1", "gh1-006", "desktop", "-toolsc-break-app")],
    ["gen-ld-break-neighbours", false, [...base("ld", "d001-1", "desktop", "-toolsc-break-neighbours"), "--break=neighbours-old"]],
    ["gen-grammar2-break-neighbours", false, [...base("grammar2", "gh2-007-1", "desktop", "-toolsc-break-neighbours"), "--break=neighbours-old"]],
    ["gen-adult-break-badge", false, [...base("adult", "a1-2", "small", "-toolsc-break-badge"), "--break=badge-innertext"]],
  ],
};
SETS.repass = SETS.pass.map(([n, b, cmd]) => [n.replace("-pass", "-repass"), b, cmd.map((x) => (x === "-toolsc-pass" ? "-toolsc-repass" : x))]);
const which = process.argv[2];
if (!SETS[which]) { console.error("pass|break|repass"); process.exit(2); }
for (const [name, brk, cmd] of SETS[which]) {
  const r = spawnSync(process.execPath, [RUN, name, ...(brk ? ["--break-app"] : []), "--", ...cmd], { stdio: "inherit" });
  console.log(`${name}: exit ${r.status}`);
}
