import type { Tab } from "./types";

/**
 * The legacy top navigation, restored exactly.
 *
 * Every course folder's `menu.htm` renders the same ten-tab bar as a row of
 * images. The image *filenames* do not match their destinations — `MEN.jpg`
 * links to `middle/`, `STUDENT.jpg` to `basics/`, `VOCA.jpg` to `phonics/` —
 * so the labels below were read off the images themselves, not inferred from
 * the filename or the folder name. Order matches the original bar, left to
 * right.
 *
 * Three of these tabs are populations rather than single courses. Their
 * framesets prove it:
 *
 *   basics/index.htm  -> top: menu.htm  bottom: ../Student/shome.html
 *   middle/index.htm  -> top: menu.htm  bottom: ../Man/mhome.html
 *   adults/index.htm  -> top: menu.htm  bottom: ../Woman/whome.html
 *
 * That is, opening the STUDENTS tab landed you on the Student conversation
 * lessons, with the basics drills reachable from the same menu bar. The two
 * modalities were one destination, so they are one tab here too.
 */
export const TABS: Tab[] = [
  {
    slug: "voca",
    label: "VOCA",
    legacyImage: "VOCA.jpg",
    legacyIndex: "phonics/index.htm",
    courses: ["phonics"],
    blurb: "중등·고등 필수 3,877 어휘 매트릭스, 1:1 한국어 뜻 연동 및 발음 클리닉.",
  },
  {
    slug: "grammar1",
    label: "GRAMMAR I",
    legacyImage: "grammar1.gif",
    legacyIndex: "grammar1/index.htm",
    courses: ["grammar1"],
    blurb: "핵심 영작 연습: 한국어 프롬프트와 정답 모범 영작 대조 훈련.",
  },
  {
    slug: "grammar2",
    label: "GRAMMAR II",
    legacyImage: "grammar2.gif",
    legacyIndex: "grammar2/index.htm",
    courses: ["grammar2"],
    blurb: "심화 구문 영작 및 1:1 문제-해설 완역 대조 훈련.",
  },
  {
    slug: "ld",
    label: "수능영어 듣기",
    legacyImage: "LD.gif",
    legacyIndex: "LD/index.htm",
    courses: ["ld"],
    blurb: "수능 및 실전형 듣기 평가: 영문 스크립트와 한글 대본 1:1 연동 및 받아쓰기 시험.",
  },
  {
    slug: "reading",
    label: "READING",
    legacyImage: "reading.gif",
    legacyIndex: "reading/index.htm",
    courses: ["reading"],
    blurb: "원어민 내레이션 리딩 본문과 문장별 직독직해 심층 분석 뷰어.",
  },
  {
    slug: "cnn",
    label: "CNN 뉴스",
    legacyImage: "CNN.jpg",
    legacyIndex: "CNN/index.htm",
    courses: ["cnn"],
    blurb: "CNN 실전 보도 영상, 1:1 보도 대본 완역 대조, 시사 어휘 및 연음 디코딩.",
  },
];

export const TAB_BY_SLUG = new Map(TABS.map((t) => [t.slug, t]));

/** The tab a given course belongs to. */
export function tabForCourse(courseSlug: string): Tab | null {
  return TABS.find((t) => t.courses.includes(courseSlug)) ?? null;
}
