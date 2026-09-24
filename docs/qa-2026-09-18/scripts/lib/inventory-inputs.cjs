/**
 * out/audio-inventory.json 을 만든 '재료' 의 지문 — 7단계 7-1 i.
 * audio-check.cjs 는 이 목록을 기준으로 삼는데, 목록이 내용보다 오래되면(6단계 배포 뒤 9/22 목록 그대로 돌려 가짜 FAIL 8) 틀린 경보를 낸다.
 * 목록을 만들 때 재료 파일의 내용 해시를 함께 적고, 검사 전에 다시 계산해 다르면 멈추게 한다(날짜가 아니라 내용으로 — git 으로 받은 파일은 날짜가 바뀌므로).
 * 재료: 강의 파일 전부 · content 의 대본 · 사전 · 과정 목록 · READING 문장 · 카드 · 무료 소리 키 · 주소 목록 · 이용권(무료 강의 번호) ·
 *       소리 키를 정하는 코드(unifiedSpeech · vocaSpeech) · 검사가 '소리 내는 글' 을 정하는 규칙(expectations.cjs · audio-inventory.cjs).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const REPO = path.resolve(__dirname, "../../../..");
const walk = (rel) => {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).flatMap((f) => walk(path.join(rel, f)));
};
const INPUTS = [
  "content/lessons", "content/courses", "content/ld_english_scripts.json", "content/voca_dictionary.json",
  "src/lib/readingSentences.json", "src/lib/readingVocabulary.json", "src/lib/generated/freeSpeechKeys.json",
  "src/lib/generated/validRoutes.json", "src/lib/license.ts", "src/lib/unifiedSpeech.ts", "src/lib/vocaSpeech.ts",
  "docs/qa-2026-09-18/scripts/lib/expectations.cjs", "docs/qa-2026-09-18/scripts/audio-inventory.cjs",
];
function inputsFingerprint() {
  const files = INPUTS.flatMap(walk).map((f) => f.replace(/\\/g, "/")).filter((f) => /\.(json|ts|cjs)$/.test(f)).sort();
  const h = crypto.createHash("sha256");
  for (const f of files) { h.update(f); h.update("\0"); h.update(fs.readFileSync(path.join(REPO, f))); h.update("\0"); }
  return { fingerprint: h.digest("hex").slice(0, 24), files: files.length };
}
module.exports = { inputsFingerprint, INPUTS };
