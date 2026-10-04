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
// 회귀 점검 1002 (2026-10-04): '소리 내는 글' 의 한 정의(scripts/lib/spoken-texts.cjs — 7-2 뒤로 expectations.cjs 가 이것을 씀)와
// 그것이 부르는 src 함수(lessonSpeechForm · lessonAudioText · listeningUtils), PASS-OFF 무료 체험이 떼어 둔 유료 문항(content/private ·
// passoffSupplement)이 빠져 있었다 — ADULT 의 덩어리 · 낱말을 spoken-texts.cjs 에 더해도(10/2) 목록이 낡았다고 알아채지 못했다.
const INPUTS = [
  "content/lessons", "content/courses", "content/ld_english_scripts.json", "content/voca_dictionary.json", "content/private",
  "src/lib/readingSentences.json", "src/lib/readingVocabulary.json", "src/lib/generated/freeSpeechKeys.json",
  "src/lib/generated/validRoutes.json", "src/lib/license.ts", "src/lib/unifiedSpeech.ts", "src/lib/vocaSpeech.ts",
  "src/lib/lessonSpeechForm.ts", "src/lib/lessonAudioText.ts", "src/lib/listeningUtils.ts", "src/lib/passoffSupplement.ts",
  "scripts/lib/spoken-texts.cjs",
  "docs/qa-2026-09-18/scripts/lib/expectations.cjs", "docs/qa-2026-09-18/scripts/audio-inventory.cjs",
];
/** overrides: { "<repo 상대 경로>": "<메모리 안 내용>" } — 깨기 시험(audio-check --break=stale-spoken)용, 파일은 그대로 */
function inputsFingerprint(overrides = {}) {
  const files = INPUTS.flatMap(walk).map((f) => f.replace(/\\/g, "/")).filter((f) => /\.(json|ts|cjs)$/.test(f)).sort();
  const h = crypto.createHash("sha256");
  for (const f of files) { h.update(f); h.update("\0"); h.update(f in overrides ? Buffer.from(overrides[f]) : fs.readFileSync(path.join(REPO, f))); h.update("\0"); }
  return { fingerprint: h.digest("hex").slice(0, 24), files: files.length };
}
module.exports = { inputsFingerprint, INPUTS };
