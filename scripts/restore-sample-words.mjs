#!/usr/bin/env node
/**
 * STUDENT — the sample words the original textbook had, back in place of "(…)" placeholders (2026-10-02, 사장님 "원래 낱말로
 * 되살리기" · "이렇게 오류 있는거 다 찾아서 변경해").
 *
 * The 9/17 audit fix (f3f6cb6, finding S-29 "Hangul inside English; placeholders for the learner's own details") and 6단계
 * (86d9ac9) turned the textbook's sample details into placeholders — "I live at 한국Apartment." became "I live in (apartment
 * name) Apartments.", the Korean "한국아파트" became "(아파트 이름) 아파트". A placeholder is placed by the app in the Step 2 tiles,
 * so the word was never assembled, and the owner asked where the original word went. Each sentence below gets back the word the
 * original Korean line had (docs/qa-2026-09-18/student-original-exceptions.json "original"); Korean words are written in Hangul
 * inside the English as everywhere since 2026-10-02 (src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES). The words are '내 정보'
 * blanks in Step 3 (src/lib/studentBlanks.ts EXTRA_BLANKS — the learner can still say their own), and tiles in Step 2.
 * Left as a placeholder: s9-1 #3 "(dog’s name)" only — the original had no sample word there either (English "(dog’s name)",
 * Korean "○○라는 이름의 개" — both as now, so no exception for that sentence).
 * s6-2 #3 "(age)" was left too on 10/02 with the reason "the original had no sample word there", which was wrong: only the
 * English said "(age)" — the Korean line said "약 30세" (student-original-exceptions.json s6-2). Put back as "30" on 2026-10-05
 * (회귀 점검 1002 F73, 사장님 '30으로 되살림').
 *
 *   node scripts/restore-sample-words.mjs          # write (only a sentence that still reads `from`)
 *   node scripts/restore-sample-words.mjs --check  # exit 1 unless every sentence reads `to`
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

/** lesson → sentence number (1-based) → { en: [from, to], ko: [from, to] } */
export const RESTORE = {
  "student/s1-2": {
    2: { en: ["I live in (apartment name) Apartments.", "I live in 한국 Apartments."], ko: ["나는 (아파트 이름) 아파트에 삽니다.", "나는 한국아파트에 삽니다."] },
    3: { en: ["I am a 4th grade student at (school name) Elementary School.", "I am a 4th grade student at 한국 Elementary School."], ko: ["나는 (학교 이름) 초등학교 4학년입니다.", "나는 한국 초등학교 4학년입니다."] },
    4: { en: ["I am (10) years old.", "I am 11 years old."], ko: ["나는 (10)살입니다.", "나는 11살입니다."] },
  },
  "student/s2-2": {
    2: { en: ["There are (4) people in my family: my father, my mother, my sister, and myself.", "There are 4 people in my family: my father, my mother, my sister, and myself."], ko: ["저의 가족은 (4)명입니다. 저의 아버지, 어머니, 여동생 그리고 저입니다.", "저의 가족은 4명입니다. 저의 아버지, 어머니, 여동생 그리고 저입니다."] },
  },
  "student/s2-5": {
    1: { en: ["My sister attends (School Name) Elementary School.", "My sister attends 한국 Elementary School."], ko: ["나의 여동생은 (학교 이름) 초등학교에 다닙니다.", "나의 여동생은 한국 초등학교에 다닙니다."] },
  },
  "student/s3-2": {
    3: { en: ["Their names are (names).", "Their names are 대한 and 민국."], ko: ["그들의 이름은 (이름들)입니다.", "그들의 이름은 대한과 민국입니다."] },
    5: { en: ["My best friend is (name), and I have known him/her for 3 years.", "My best friend is 대한, and I have known him/her for 3 years."], ko: ["나의 가장 친한 친구는 (이름)이고 나는 그를/그녀를 3년 동안 알아 왔습니다.", "나의 가장 친한 친구는 대한이고 나는 그를/그녀를 3년 동안 알아 왔습니다."] },
  },
  "student/s4-3": {
    1: { en: ["First of all, my father has (two) brothers and (two) sisters.", "First of all, my father has two brothers and two sisters."], ko: ["나의 아버지는 (두) 명의 남자형제와 (두) 명의 여자형제가 있으십니다.", "나의 아버지는 두 명의 남자형제와 두 명의 여자형제가 있으십니다."] },
    2: { en: ["My mother also has (two) brothers and (two) sisters.", "My mother also has two brothers and two sisters."], ko: ["나의 어머니 또한 (두) 명의 남자형제와 (두) 명의 여자형제가 있으십니다.", "나의 어머니 또한 두 명의 남자형제와 두 명의 여자형제가 있으십니다."] },
  },
  "student/s4-4": {
    2: { en: ["She has (two) older brothers and (two) older sisters.", "She has two older brothers and two older sisters."], ko: ["그분은 오빠가 (2)명 있고, 언니가 (2)명 있으십니다.", "그분은 오빠가 2명 있고, 언니가 2명 있으십니다."] },
  },
  "student/s4-5": {
    1: { en: ["My favorite relative is my oldest uncle, (uncle’s name).", "My favorite relative is my oldest uncle, 길동."], ko: ["내가 가장 좋아하는 친척은 나의 큰아버지 (삼촌 이름)입니다.", "내가 가장 좋아하는 친척은 나의 큰아버지 길동입니다."] },
  },
  "student/s6-1": {
    6: { en: ["I attend the English Club, and my brother/sister is in the (Club’s Name) Club.", "I attend the English Club, and my brother/sister is in the 태권도 Club."], ko: ["나는 영어 클럽에 가고 나의 남동생/여동생은 (클럽 이름) 클럽에 갑니다.", "나는 영어 클럽에 가고 나의 남동생/여동생은 태권도 클럽에 갑니다."] },
  },
  "student/s6-2": {
    2: { en: ["My teacher’s name is Mr./Ms. (Surname).", "My teacher’s name is Mr./Ms. 홍."], ko: ["나의 선생님 성함은 (성) 선생님이십니다.", "나의 선생님 성함은 홍 선생님이십니다."] },
    // 2026-10-05 (회귀 점검 1002 F73 · 사장님 '30으로 되살림'): the original Korean line said "그는/그녀는 약 30세 입니다." — the
    // English kept "(age)", so the 10/02 pass left it; "그분은" stays (7단계 G14, 2026-09-23)
    3: { en: ["He/She is about (age) years old.", "He/She is about 30 years old."], ko: ["그분은 약 (나이)세이십니다.", "그분은 약 30세이십니다."] },
  },
  "student/s6-3": {
    1: { en: ["My teacher is from (Name).", "My teacher is from 강원도."], ko: ["나의 선생님은 (지역) 출신이십니다.", "나의 선생님은 강원도 출신이십니다."] },
  },
  "student/s8-3": {
    4: { en: ["My favorite food is (불고기).", "My favorite food is 불고기."], ko: ["내가 가장 좋아하는 음식은 (불고기)입니다.", "내가 가장 좋아하는 음식은 불고기입니다."] },
  },
  "student/s9-3": {
    5: { en: ["My favorite TV shows are (TV show name) and (TV show name).", "My favorite TV shows are Miracle and Fantastic."], ko: ["내가 가장 좋아하는 TV 쇼들은 (TV 쇼 이름)과 (TV 쇼 이름)입니다.", "내가 가장 좋아하는 TV 쇼들은 미러클과 판타스틱입니다."] },
  },
  "student/s16-1": {
    1: { en: ["I have seen on TV and read about many successful people such as Bill Gates, (name) and (name).", "I have seen on TV and read about many successful people such as Bill Gates and Einstein."], ko: ["나는 빌 게이츠, (이름), (이름)과 같은 많은 성공한 사람들에 대해 TV에서 보았고 책에서 읽었습니다.", "나는 빌 게이츠, 아인슈타인과 같은 많은 성공한 사람들에 대해 TV에서 보았고 책에서 읽었습니다."] },
  },
};

// run only as a command — docs/qa-2026-09-18/scripts/update-exceptions-sample-words.mjs imports RESTORE
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();
function main() {
const problems = [];
let changed = 0;
for (const [page, sentences] of Object.entries(RESTORE)) {
  const [course, id] = page.split("/");
  const file = path.join(ROOT, "content", "lessons", course, `${id}.json`);
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const indent = (raw.split("\n")[1] || "").match(/^ */)[0].length || 2;
  const lesson = JSON.parse(raw);
  const items = lesson.blocks.find((b) => b.type === "sentences").items;
  const ko = lesson.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko");
  for (const [n, { en, ko: k }] of Object.entries(sentences)) {
    const i = Number(n) - 1;
    for (const [target, field, [from, to], label] of [[items[i], "text", en, "en"], [ko[i], "text", k, "ko"]]) {
      const now = target?.[field];
      if (now === to) continue;
      if (CHECK) problems.push(`${page} #${n} ${label}: "${now}" — expected "${to}"`);
      else if (now !== from) problems.push(`${page} #${n} ${label}: neither the old nor the new text — "${now}"`);
      else {
        target[field] = to;
        changed++;
      }
    }
  }
  if (!CHECK) fs.writeFileSync(file, JSON.stringify(lesson, null, indent) + (raw.endsWith("\n") ? "\n" : ""), "utf8");
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(CHECK ? `sample words in place — ${Object.values(RESTORE).reduce((n, s) => n + Object.keys(s).length, 0)} sentences` : `changed ${changed} lines`);
}
