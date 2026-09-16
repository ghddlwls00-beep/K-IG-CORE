#!/usr/bin/env node
/**
 * SEC-02 — the media gate's DECISIONS, without a server or a licence.
 *
 * `verify-speech-gate.cjs` proves the anonymous side against a running server.
 * The licensed side cannot be proved that way from a checkout: a licence
 * session needs the private licence bucket, which a local `.env.local` does
 * not carry. This loads the real `src/lib/mediaAccess.ts` and replaces ONLY
 * `verifyLicenseSessionToken` with a stub, so every branch of the rule is
 * exercised as shipped — in particular that narrowing the free list did not
 * take a paying user's clips away.
 *
 *   node verify-speech-gate-rules.cjs
 *
 * EXIT 0 = every decision as expected.
 */

const fs = require("fs");
const path = require("path");
const Module = require("module");
const { loadTs, REPO } = require("../tsload.cjs");

const ts = require(path.join(REPO, "node_modules/typescript"));
const { unifiedSpeechKey } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const license = loadTs(path.join(REPO, "src/lib/license.ts"));
const freeList = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/freeSpeechKeys.json"), "utf8"));

const SESSIONS = {
  "life-token": { payload: { plan: "LIFE", key: "K", deviceId: "D" } },
  "student-token": { payload: { plan: "STU1Y", key: "K", deviceId: "D" } },
};

const file = path.join(REPO, "src/lib/mediaAccess.ts");
const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
}).outputText;
const mod = { exports: {} };
const req = (spec) => {
  if (spec === "./license") return license;
  if (spec === "./licenseSession") {
    return {
      LICENSE_SESSION_COOKIE_NAME: "kig_license_session",
      verifyLicenseSessionToken: async (token) => SESSIONS[token] ?? null,
    };
  }
  if (spec === "./generated/freeSpeechKeys.json") return freeList;
  return Module.createRequire(file)(spec);
};
new Function("require", "module", "exports", js)(req, mod, mod.exports);
const { resolveMediaAccess } = mod.exports;

const lockedSentence = "In spite of their continued efforts, factories and cars are still producing too much dirty smoke of putting too chemicals into the air.";
const freeKey = freeList.keys[0];
const lockedStudent = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student/s20-5.json"), "utf8"));
const lockedStudentSentence = lockedStudent.blocks.find((b) => b.type === "sentences").items[0].text;
const lockedKey = unifiedSpeechKey(lockedStudentSentence);

const cases = [
  ["free clip, anonymous", `audio/azure-ava/v1/${freeKey}.mp3`, undefined, true, "unified-speech"],
  ["free clip, licensed", `audio/azure-ava/v1/${freeKey}.mp3`, "life-token", true, "unified-speech"],
  ["locked clip (s20-5), anonymous", `audio/azure-ava/v1/${lockedKey}.mp3`, undefined, false, "locked"],
  ["locked clip (s20-5), invalid token", `audio/azure-ava/v1/${lockedKey}.mp3`, "forged", false, "locked"],
  ["locked clip (s20-5), LIFE licence", `audio/azure-ava/v1/${lockedKey}.mp3`, "life-token", true, "licensed"],
  ["locked clip (s20-5), STUDENT licence", `audio/azure-ava/v1/${lockedKey}.mp3`, "student-token", true, "licensed"],
  ["free-lesson sentence (pr002 #2) is free", `audio/azure-ava/v1/${unifiedSpeechKey(lockedSentence)}.mp3`, undefined, true, "unified-speech"],
  ["unknown key, anonymous", "audio/azure-ava/v1/0-0000000000000000.mp3", undefined, false, "locked"],
  // Regressions: the course-folder rules must be untouched.
  ["course audio free lesson", "audio/ld/d001.mp3", undefined, true, "free-preview"],
  ["course audio locked lesson", "audio/ld/d150.mp3", undefined, false, "locked"],
  ["course audio locked, LIFE", "audio/ld/d150.mp3", "life-token", true, "licensed"],
  ["course audio grammar, STUDENT licence", "audio/grammar1/gh1-010.mp3", "student-token", false, "locked"],
  ["retired folder", "audio/adults/am01.mp3", "life-token", false, "unclaimed"],
];

(async () => {
  let pass = 0;
  for (const [label, key, token, allowed, reason] of cases) {
    const got = await resolveMediaAccess(key, token);
    const ok = got.allowed === allowed && got.reason === reason;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label} -> ${got.allowed ? "allow" : "deny"} (${got.reason})`);
    if (!ok) console.log(`        expected ${allowed ? "allow" : "deny"} (${reason})`);
    if (ok) pass++;
  }
  console.log(`\n${pass}/${cases.length} decisions as expected`);
  process.exitCode = pass === cases.length ? 0 : 1;
})();
