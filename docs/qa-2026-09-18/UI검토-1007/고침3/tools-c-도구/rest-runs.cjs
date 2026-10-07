// tools-c (2026-10-08 고침3): the other tools' break-test runs through run.cjs, one browser at a time.
//   node rest-runs.cjs pass|break|repass
const { spawnSync } = require("child_process");
const path = require("path");
const RUN = path.join(__dirname, "run.cjs");
const S = "docs/qa-2026-09-18/scripts/";
const T = "docs/qa-2026-09-18/UI검토-1007/고침3/tools-c-도구/";
const passoff = (suffix, extra = []) => ["node", S + "drive-passoff.cjs", "--ids", "pg01-1", "--viewports", "desktop", "--suffix", suffix, "--port", "9980", "--clone", "toolsc-po", "--redo", ...extra];
const common = (out, extra = []) => ["node", S + "drive-common.cjs", "--only", "A", "--port", "9980", "--out", out, ...extra];
const c0926 = (tag) => ["node", S + "drive-common-0926.cjs", "--only", "D", "--free", "--port", "9980", "--tag", tag];
const top = (tag) => ["node", S + "check-top-player.cjs", "--ids", "/grammar1/gh1-006,/grammar2/gh2-007", "--port", "9980", "--tag", tag];
const titles = (tag, extra = []) => ["node", S + "check-student-titles-live.cjs", "--pages", "/student", "--viewports", "desktop", "--port", "9980", "--clone", "toolsc-titles", "--tag", tag, ...extra];
const SETS = {
  pass: [
    ["passoff-pass", false, passoff("-toolsc-pass")],
    ["common-A-pass", false, common("common-toolsc-pass.jsonl")],
    ["c0926-D-pass", false, c0926("-toolsc-pass")],
    ["topplayer-pass", false, top("toolsc-pass")],
    ["titles-pass", false, titles("toolsc-pass")],
    ["voca0927-pass", false, ["node", S + "check-voca-0927.cjs", "--port", "9980"]],
  ],
  break: [
    ["passoff-break-app", true, passoff("-toolsc-break-app")],
    ["common-A-break-group", false, common("common-toolsc-break-group.jsonl", ["--break=group-old"])],
    ["c0926-D-break-app", true, c0926("-toolsc-break-app")],
    ["topplayer-break-app", true, top("toolsc")],
    ["titles-break-raw", false, titles("toolsc-break-raw", ["--break=raw-labels"])],
    ["voca0927-break-app", true, ["node", S + "check-voca-0927.cjs", "--port", "9980"]],
  ],
  repass: [
    ["passoff-repass", false, passoff("-toolsc-repass")],
    ["common-A-repass", false, common("common-toolsc-repass.jsonl")],
    ["c0926-D-repass", false, c0926("-toolsc-repass")],
    ["topplayer-repass", false, top("toolsc-repass")],
    ["titles-repass", false, titles("toolsc-repass")],
    ["voca0927-repass", false, ["node", S + "check-voca-0927.cjs", "--port", "9980"]],
    ["student0927-repass", false, ["node", S + "check-student-0927.cjs", "--port", "9980"]],
    ["gap-P-repass", false, ["node", S + "gap-checks-0926.cjs", "--only", "P", "--port", "9980", "--tag", "toolsc-repass"]],
    ["reading-repass", false, ["node", S + "drive-reading.cjs", "--ids", "pr001,pr001-1", "--viewports", "desktop,mobile", "--suffix", "-toolsc-repass", "--clone", "toolsc-rd", "--port", "9981", "--no-resume"]],
    ["questions-repass", false, ["node", S + "check-lesson-questions-0928.cjs", "--clone", "toolsc-q", "--port", "9982"]],
    ["libprobe-repass", false, ["node", T + "lib-probe.cjs", "--port", "9983"]],
  ],
};
const which = process.argv[2];
if (!SETS[which]) { console.error("pass|break|repass"); process.exit(2); }
for (const [name, brk, cmd] of SETS[which]) {
  const r = spawnSync(process.execPath, [RUN, name, ...(brk ? ["--break-app"] : []), "--", ...cmd], { stdio: "inherit" });
  console.log(`${name}: exit ${r.status}`);
}
