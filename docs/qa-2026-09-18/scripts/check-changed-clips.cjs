#!/usr/bin/env node
/**
 * 4·5단계 마지막 확인 — 고친 영어 문장마다, 앱과 같은 키 계산(src/lib/unifiedSpeech.ts unifiedSpeechKey)으로
 * 클립 파일이 실제로 있는지 본다. 명령서: "고친 영어 문장 전부에 대해 … '클립이 없는 문장: N건' 을 보고".
 *
 * 대상 = ld-en-changes.cjs 가 커밋된 판과 비교해 뽑은 "영어가 바뀐 문장"(LISTENING 대본 + READING readingSentences)
 *      + 그 LISTENING 문장에서 STEP 3 연음 클리닉이 소리 내는 조각(generateLiaisonPoints — 앱이 부르는 그 함수)
 *      + GRAMMAR 의 바뀐 영어 모범 답안, STUDENT 의 바뀐 영어 문장과 한국어 줄(STUDENT 는 한국어도 소리 냄)
 *      + (6단계에서 넓힘) READING 핵심 어휘 낱말 — ReadingLearningView playWordAudio(kw.word), kw 는 강의 파일의
 *        readingVocabulary[].word(14개일 때). 커밋된 판에 없던 낱말만.
 *      + (6단계에서 넓힘) VOCA 단어판 낱말 — PhonicsLearningView speakText(vocaSpeechForm(word)) 가 말하는 꼴.
 *        wordgrid rows 에서 커밋된 판에 없던 낱말만(예: cooky → cookie, labour → labo(u)r 는 'labor' 로 말함).
 *        VOCA 한국어 뜻 · searchWord · 어원 풀이는 소리 내지 않아 뺌(6-0633 · 6-0605 기록).
 * 확인하는 곳 = public/audio/azure-ava/v1/<키>.mp3 (생성기가 쓰는 곳). R2 에 올리는 것은 소유자가 한다.
 * 운영 주소로 확인하는 방법은 넣지 않았다: 미디어 문지기가 이용권 없는 요청에 파일이 있든 없든 403 을
 * 먼저 돌려주므로(mediaAccess.ts), 운영의 403 은 "있음" 의 증거가 못 된다.
 *
 *   node check-changed-clips.cjs
 * 하나라도 없으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { unifiedSpeechKey, normalizeUnifiedSpeechText } = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const { generateLiaisonPoints } = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));

const changes = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, "ld-en-changes.cjs"), "--json"], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 }));

const targets = [];
for (const c of changes.en) {
  targets.push({ where: `${c.id} n=${c.n}`, text: c.to });
  if (/^d\d+/.test(c.id)) {
    for (const card of generateLiaisonPoints(String(c.to)) || []) if (card && card.original) targets.push({ where: `${c.id} n=${c.n} 연음 조각`, text: card.original });
  }
}

/**
 * 2026-09-23 소유자 결정으로 GRAMMAR 모범 답안(#30·#39·#46)과 STUDENT 문장(#48~50)도 바뀌었다.
 *   GRAMMAR : 영어 문항만 소리를 낸다(GrammarLearningView playEnglish) — 앞 번호를 뗀 글.
 *   STUDENT : 영어 문장과 한국어 줄을 **둘 다** 소리 낸다(StudentLearningView toggleSentence — item.text · koParas).
 * 커밋된 판(HEAD)과 문항 번호·순서로 비교해 바뀐 것만 넣는다.
 */
const clean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const changedFiles = execFileSync("git", ["diff", "--name-only", "--", "content/lessons/grammar1", "content/lessons/grammar2", "content/lessons/student"], { cwd: REPO, encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);
let grammarChanged = 0, studentChanged = 0;
for (const f of changedFiles) {
  const now = JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8"));
  const was = JSON.parse(execFileSync("git", ["show", `HEAD:${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 }));
  const items = (d) => (d.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
  const wasItems = new Map(items(was).map((it) => [String(it.n), it.text]));
  for (const it of items(now)) {
    if (wasItems.get(String(it.n)) === it.text) continue;
    if (/student\//.test(f)) { targets.push({ where: `${path.basename(f, ".json")} EN${it.n}`, text: it.text }); studentChanged++; }
    else if (!/[가-힣]/.test(it.text)) { targets.push({ where: `${path.basename(f, ".json")} #${it.n}`, text: clean(it.text) }); grammarChanged++; }
  }
  if (/student\//.test(f)) {
    const paras = (d) => (d.blocks || []).filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text);
    const wasKo = paras(was);
    paras(now).forEach((t, i) => { if (wasKo[i] !== t) { targets.push({ where: `${path.basename(f, ".json")} KO${i + 1}`, text: t }); studentChanged++; } });
  }
}

/**
 * 6단계에서 넓힘 — READING 핵심 어휘 낱말과 VOCA 단어판 낱말. 둘 다 "커밋된 판에 없던 글" 만 넣는다(자리 이동은 클립과 무관).
 * 같은 글이 여러 파일에 있으면(prNNN · prNNN-1) 한 번만 센다 — 같은 글 = 같은 클립.
 */
const { vocaSpeechForm } = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const gitShow = (f) => { try { return JSON.parse(execFileSync("git", ["show", `HEAD:${f}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 }).replace(/^﻿/, "")); } catch { return null; } };
const seenNew = new Set();
let readingWords = 0, vocaWords = 0;
for (const f of execFileSync("git", ["diff", "--name-only", "--", "content/lessons/reading"], { cwd: REPO, encoding: "utf8" }).trim().split(/\r?\n/).filter((x) => /\/pr\d+(-1)?\.json$/.test(x))) {
  const words = (d) => ((d && d.readingVocabulary) || []).map((v) => v && v.word).filter(Boolean);
  const was = new Set(words(gitShow(f)));
  for (const w of words(JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")))) {
    if (was.has(w) || seenNew.has(`r:${w}`)) continue;
    seenNew.add(`r:${w}`);
    targets.push({ where: `${path.basename(f, ".json")} 낱말`, text: w });
    readingWords++;
  }
}
for (const f of execFileSync("git", ["diff", "--name-only", "--", "content/lessons/phonics"], { cwd: REPO, encoding: "utf8" }).trim().split(/\r?\n/).filter((x) => x.endsWith(".json"))) {
  const gridWords = (d) => ((d && d.blocks) || []).filter((b) => b.type === "wordgrid").flatMap((b) => (b.rows || []).flat()).filter((w) => typeof w === "string" && w.trim());
  const was = new Set(gridWords(gitShow(f)));
  for (const w of gridWords(JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")))) {
    const spoken = vocaSpeechForm(w);
    if (was.has(w) || seenNew.has(`v:${spoken}`)) continue;
    seenNew.add(`v:${spoken}`);
    targets.push({ where: `${path.basename(f, ".json")} 단어 ${w}`, text: spoken });
    vocaWords++;
  }
}

/**
 * 있는 곳: 로컬 public/audio(새로 만든 것 — 소유자가 R2 에 올려야 함) 또는 R2 버킷(이미 올라가 있음).
 * 버킷 목록은 generate-azure-ava.mjs 의 listUploadedKeys 와 같은 방식으로 읽기만 한다(ListObjectsV2).
 * 자격 증명이 없으면 로컬만 보고, 그렇다고 크게 알린다. 실행: node --env-file=.env.local check-changed-clips.cjs
 */
async function bucketKeys() {
  const keys = new Set();
  const e = (n) => (process.env[n] || "").trim();
  if (!e("R2_ACCOUNT_ID") || !e("R2_ACCESS_KEY_ID") || !e("R2_SECRET_ACCESS_KEY") || !e("R2_BUCKET_NAME")) {
    console.warn("경고: R2 자격 증명이 없어 로컬 파일만 본다 — 이미 R2 에 있는 클립도 '없음' 으로 나올 수 있다 (node --env-file=.env.local 로 실행)");
    return null;
  }
  const { S3Client, ListObjectsV2Command } = require(path.join(REPO, "node_modules", "@aws-sdk", "client-s3"));
  const s3 = new S3Client({ region: "auto", endpoint: `https://${e("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e("R2_ACCESS_KEY_ID"), secretAccessKey: e("R2_SECRET_ACCESS_KEY") } });
  const prefix = "audio/azure-ava/v1/";
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: e("R2_BUCKET_NAME"), Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents || []) { const name = o.Key.slice(prefix.length); if (name.endsWith(".mp3")) keys.add(name.slice(0, -4)); }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

(async () => {
  const inBucket = await bucketKeys();
  let missing = 0, local = 0, bucket = 0;
  for (const t of targets) {
    const key = unifiedSpeechKey(t.text);
    const isLocal = fs.existsSync(path.join(REPO, "public/audio/azure-ava/v1", `${key}.mp3`));
    const isBucket = Boolean(inBucket && inBucket.has(key));
    const where = isBucket ? "R2 에 있음" : isLocal ? "로컬(올려야 함)" : "없음";
    if (!isLocal && !isBucket) missing++;
    else if (isBucket) bucket++;
    else local++;
    console.log(`${where.padEnd(10)} ${t.where.padEnd(22)} ${key}  ${JSON.stringify(normalizeUnifiedSpeechText(t.text).slice(0, 60))}`);
  }
  const sentences = changes.en.length;
  const liaison = targets.length - sentences - grammarChanged - studentChanged - readingWords - vocaWords;
  console.log(`\nLISTENING·READING 영어 ${sentences}개 + 연음 조각 ${liaison}개 + GRAMMAR 모범 답안 ${grammarChanged}개 + STUDENT 영어·한국어 ${studentChanged}개 + READING 낱말 ${readingWords}개 + VOCA 단어판 ${vocaWords}개 = 확인 ${targets.length}개`);
  console.log(`  R2 에 이미 있음 ${bucket} · 로컬에만 있음(업로드 필요) ${local} · 클립이 없는 것: ${missing}건${inBucket ? ` (버킷 ${inBucket.size}개 확인)` : " (로컬만 봄)"}`);
  process.exit(missing ? 1 : 0);
})();
