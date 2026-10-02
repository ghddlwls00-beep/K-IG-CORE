#!/usr/bin/env node
/**
 * ADULT — the lessons, made from the owner's PPTs (2026-10-02, 사장님 "student 다음에 adult 섹션 … 학습법은 student랑 완전히 똑같이
 * … 각 ppt의 본문만"). Reads docs/adult/ppt-본문.json (the PPTs' English and 한글 번역 slides, paired by number — the 핵심 어휘 and
 * 청크 끊어읽기 slides are not used) and writes content/lessons/adult/a<chapter>-<part>.json + content/courses/adult.json.
 *
 *   node scripts/build-adult-content.mjs          # write
 *   node scripts/build-adult-content.mjs --check  # exit 1 if the files on disk differ from what this would write
 *
 * One lesson per ▎ sub-unit of a PPT, exactly as STUDENT is one lesson per sub-unit of a chapter. Owner decisions (2026-10-02):
 *   · 6과 남성용 / 여성용 differ only in the Saturday sub-unit (3 sentences), so 6-1 is the men's Saturday, 6-2 the women's, and
 *     the three shared sub-units follow ("토요일만 두 강의로").
 *   · 1과: the Hangul names inside English sentences are written in romanization as in STUDENT s1-2 (Hong Gil Dong · Seoul · Busan
 *     · Hanguk) and are '내 정보' blanks (src/lib/studentBlanks.ts). The Korean lines keep the Hangul.
 *   · 7~10과 are the old text of STUDENT 17~20장. They take STUDENT's audited sentences (facts, English and Revised Romanization —
 *     content/lessons/student/s17-1 … s20-5) one for one; the Korean line is the PPT's where the meaning did not change and is
 *     rewritten where it did ("STUDENT 처럼 고치기"). The PPT's sentence count and sub-units stay: 9과 Food keeps "I like them both."
 *     as its own sentence, where STUDENT joined it to the one before.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "adult", "ppt-본문.json");
const LESSON_DIR = path.join(ROOT, "content", "lessons", "adult");
const INDEX_FILE = path.join(ROOT, "content", "courses", "adult.json");
const CHECK = process.argv.includes("--check");

const ppt = JSON.parse(fs.readFileSync(SRC, "utf8")).files;

/** Chapter order, title (English · Korean) and the PPT file(s) it comes from. */
const CHAPTERS = [
  { file: "1과.pptx", en: "Self-Introduction", ko: "자기소개" },
  { file: "2과.pptx", en: "Family Introduction", ko: "가족 소개" },
  { file: "3과.pptx", en: "Friend Introduction", ko: "친구 소개" },
  { file: "4과.pptx", en: "Relative Introduction", ko: "친척 소개" },
  { file: "5과.pptx", en: "My Day", ko: "나의 하루" },
  { file: "6과(남성용).pptx", women: "6과(여성용).pptx", en: "My Weekend", ko: "나의 주말" },
  { file: "7과.pptx", en: "History", ko: "역사", student: 17 },
  { file: "8과.pptx", en: "Traditional Holidays", ko: "전통 명절", student: 18 },
  { file: "9과.pptx", en: "Culture", ko: "문화", student: 19 },
  { file: "10과.pptx", en: "Famous Places", ko: "유명한 장소", student: 20 },
  { file: "11과.pptx", en: "Democracy in Korea", ko: "한국의 민주주의" },
  { file: "12과.pptx", en: "Education in Korea", ko: "한국의 교육" },
];

/** Sub-unit titles: the PPT's ▎ header, with title case and STUDENT's romanization ("Chu-seok" → "Chuseok"). */
const TITLE_FIX = {
  "Helping hand (봉사활동)": "Helping Hand (봉사활동)",
  "How Korea was Founded (한국의 건국)": "How Korea Was Founded (한국의 건국)",
  "The Kingdoms are Divided (삼국의 분열과 통일)": "The Kingdoms Are Divided (삼국의 분열과 통일)",
  "Independence / Civil War (독립과 한국전쟁)": "Independence & the Korean War (독립과 한국전쟁)",
  "Chu-seok (추석)": "Chuseok (추석)",
  "Korean Culture is Unique (한국 문화의 독특함)": "Korean Culture Is Unique (한국 문화의 독특함)",
  "Gyeong-Ju (경주)": "Gyeongju (경주)",
};

/** 1과 — romanized as STUDENT s1-2 (the '내 정보' blanks are src/lib/studentBlanks.ts EXTRA_BLANKS "a1-2"). */
const CH1_EN = {
  4: "My name is Hong Gil Dong, but you can call me Mrs. Hong.",
  5: "I was born in Seoul, but now I live in Busan.",
  6: "I live at Busan apartment with my husband and 2 children.",
  7: "I graduated from Busan Women's High School in 1980 in Busan.",
  9: "I studied English at Hanguk University.",
};

/**
 * 7~10과 — the Korean line where STUDENT's fix changed what the English says (sentence number in the PPT → Korean). Every other
 * Korean line is the PPT's.
 */
const KO_FIX = {
  "7과.pptx": {
    2: "전설에 따르면 우리나라의 역사는 4,000여 년 전에 시작되었습니다.",
    9: "훗날 신라가 다른 두 왕국을 정복하고 한반도의 대부분을 통일했습니다.",
    10: "신라는 8세기에 가장 강성했습니다.",
    12: "신라 이후에는 고려와 조선 왕조가 약 1,000년 동안 한국을 다스렸습니다.",
    13: "그 뒤 1910년부터 1945년까지 한국은 일본의 지배를 받았습니다.",
    16: "1950년, 북쪽 군대가 남쪽을 침략하면서 한국전쟁이 일어났습니다.",
    17: "1953년 전쟁이 끝난 뒤에도 한반도는 북한과 남한으로 나뉜 채 남았습니다.",
    18: "1953년 전쟁이 끝난 이후 나라는 매우 빠르게 발전해 왔는데, 특히 1970년대에 그러했습니다.",
    19: "그때부터 지금까지 나라는 계속 성장해 왔습니다.",
  },
  "8과.pptx": {
    1: "우리나라에는 공휴일이 많습니다.",
    2: "공휴일은 가족들이 함께 모여 축하할 수 있는 특별한 시간입니다.",
    3: "우리는 설날, 광복절, 어린이날, 부처님 오신 날, 추석 등 많은 날을 기념합니다.",
    5: "첫 번째 큰 명절은 음력 새해 첫날인 설날입니다.",
  },
  "9과.pptx": {
    17: "그러나 1443년 세종대왕이 한국 고유의 문자를 만들었고, 이 문자는 1446년에 반포되었습니다.",
    18: "이 문자 체계가 바로 한글입니다.",
  },
  "10과.pptx": {
    5: "가 볼 만한 아주 흥미로운 곳 하나는 한국민속촌으로, 수도 서울에서 멀지 않은 경기도 용인(수원 근처)에 있습니다.",
    9: "경주는 신라 왕국의 옛 수도입니다.",
    18: "한라산은 남한에서 가장 높은 산으로, 높이가 거의 2,000미터(약 6,400피트)에 이릅니다.",
  },
};

/** STUDENT's audited English of chapter `ch`, in order — split where the PPT has two sentences for one of STUDENT's. */
function studentEnglish(ch) {
  const out = [];
  for (let part = 1; ; part++) {
    const file = path.join(ROOT, "content", "lessons", "student", `s${ch}-${part}.json`);
    if (!fs.existsSync(file)) break;
    const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of lesson.blocks.find((b) => b.type === "sentences").items) {
      // s19-3 #4 holds two of the PPT's sentences
      if (item.text.endsWith(" I like them both.")) out.push(item.text.slice(0, -" I like them both.".length), "I like them both.");
      else out.push(item.text);
    }
  }
  return out;
}

const lessons = [];
const groups = [];
let order = 0;

CHAPTERS.forEach((chapter, ci) => {
  const unit = ci + 1;
  const label = `Chapter ${unit}. ${chapter.en} (${chapter.ko})`;
  const source = ppt[chapter.file];
  if (!source) throw new Error(`no PPT ${chapter.file}`);
  let sections = source.sections.map((s) => ({ header: s.header, sentences: s.sentences.map((x) => ({ ...x })) }));

  if (chapter.student) {
    const english = studentEnglish(chapter.student);
    const all = sections.flatMap((s) => s.sentences);
    if (english.length !== all.length) throw new Error(`${chapter.file}: ${all.length} sentences, STUDENT ${chapter.student}장 ${english.length}`);
    all.forEach((s, i) => {
      s.en = english[i];
      if (KO_FIX[chapter.file]?.[s.n]) s.ko = KO_FIX[chapter.file][s.n];
    });
  }
  if (unit === 1) for (const s of sections.flatMap((x) => x.sentences)) if (CH1_EN[s.n]) s.en = CH1_EN[s.n];

  if (chapter.women) {
    const women = ppt[chapter.women].sections[0];
    if (women.header !== sections[0].header) throw new Error("6과: the women's first sub-unit is not Saturday");
    sections = [
      { ...sections[0], title: "Saturday — Men's Version (토요일 · 남성용)" },
      { header: women.header, title: "Saturday — Women's Version (토요일 · 여성용)", sentences: women.sentences.map((x) => ({ ...x })) },
      ...sections.slice(1),
    ];
  }

  const ids = [];
  sections.forEach((section, si) => {
    const part = si + 1;
    const id = `a${unit}-${part}`;
    const title = section.title ?? TITLE_FIX[section.header] ?? section.header;
    for (const s of section.sentences) {
      if (/[가-힣]/.test(s.en)) throw new Error(`${id}: Hangul left in the English "${s.en}"`);
      if (!s.ko || !/[가-힣]/.test(s.ko)) throw new Error(`${id}: no Korean line for "${s.en}"`);
    }
    order += 1;
    const enTitle = title.replace(/\s*\([^()]*\)\s*$/, "");
    const lesson = {
      id,
      course: "adult",
      series: "a",
      variant: "main",
      pairId: null,
      title,
      label,
      menuLabel: `${unit}-${part}. ${enTitle}`,
      unit,
      part,
      order,
      audio: [],
      video: [],
      blocks: [
        { type: "instruction", text: `${label} - ${title}` },
        { type: "sentences", items: section.sentences.map((s, k) => ({ n: String(k + 1), text: s.en })) },
        ...section.sentences.map((s) => ({ type: "paragraph", text: s.ko, lang: "ko" })),
      ],
      legacyPath: `docs/adult/ppt-본문.json#${chapter.file}`,
      legacyEncoding: "utf-8",
    };
    lessons.push(lesson);
    ids.push(id);
  });
  // as STUDENT's index: the course list names a chapter Korean first, and the group has no `label`
  groups.push({ title: `Chapter ${unit}. ${chapter.ko} (${chapter.en})`, lessons: ids });
});

const index = {
  course: "adult",
  tab: "adult",
  lessonCount: lessons.length,
  groups,
  lessons: lessons.map((l) => ({
    id: l.id,
    title: l.title,
    label: l.label,
    series: l.series,
    variant: l.variant,
    unit: l.unit,
    part: l.part,
    order: l.order,
    hasAudio: false,
    menuLabel: l.menuLabel,
  })),
};

const files = new Map(lessons.map((l) => [path.join(LESSON_DIR, `${l.id}.json`), JSON.stringify(l, null, 2) + "\n"]));
files.set(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");

if (CHECK) {
  // git on Windows checks these out with CRLF — compare the text, not the line endings
  const onDisk = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const differ = [...files].filter(([file, text]) => !fs.existsSync(file) || onDisk(file) !== text).map(([f]) => path.relative(ROOT, f));
  const extra = fs.existsSync(LESSON_DIR)
    ? fs.readdirSync(LESSON_DIR).map((f) => path.join(LESSON_DIR, f)).filter((f) => !files.has(f)).map((f) => path.relative(ROOT, f))
    : [];
  if (differ.length || extra.length) {
    console.error(`ADULT content differs: ${[...differ, ...extra.map((f) => `${f} (extra)`)].join(", ")}`);
    process.exit(1);
  }
  console.log(`ADULT content OK — ${lessons.length} lessons in ${groups.length} chapters`);
} else {
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  for (const [file, text] of files) fs.writeFileSync(file, text, "utf8");
  const sentences = lessons.reduce((n, l) => n + l.blocks.find((b) => b.type === "sentences").items.length, 0);
  console.log(`wrote ${lessons.length} lessons (${sentences} sentences) in ${groups.length} chapters + content/courses/adult.json`);
}
