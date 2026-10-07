/**
 * Professional Curriculum Presentation Formatter.
 *
 * Converts legacy crude file codes (e.g. "[ gh1-006 ]", "d001", "po01-01", "[ Page 006 ]")
 * into clean, elegant, user-centric commercial curriculum titles and subtitles.
 *
 * Preserves 100% of underlying file IDs, links, and backend audio bindings.
 */

export interface LessonPresentation {
  title: string;
  subtitle: string;
  badge?: string;
  code: string;
  /**
   * UI검토-1007 4장 8: the lesson's own words without its number, where the title starts with one (STUDENT · ADULT
   * '1-1 · Greeting (인사)' → 'Greeting (인사)') — a list row draws `code` in its own column beside it. Else the title.
   */
  name?: string;
}

/*
 * UI검토-1007 4장 8 (사장님 2026-10-07 23:01): a section's name on the screen is ONE Korean form — '1장 · 자기소개' — with no
 * English head (Chapter · TOPIC · Section · Series · Stage) and no second language beside it. Each course says its section in
 * its own Korean unit (3장 18번: 장 · 대주제 · 강의 · 과정 · 이용권 코드): STUDENT · ADULT '1장 · 자기소개', PASS-OFF GRAMMAR
 * '대주제 1 · 인칭', GRAMMAR I '제 1단계 · 기본 문장 구조 훈련', GRAMMAR II '제 7과 ~ 제 14과 · 핵심 패턴 영작', LISTENING
 * '001~050회 · 실전 듣기', READING '001~040회 · 원문 독해', VOCA '중등 단어 1단계'. Made HERE only — the course list (group
 * heads), the lesson head (STUDENT · ADULT chapter line · GRAMMAR I stage line), the lock screens, the search results and the
 * PASS-OFF topic words all take it from these functions. The data (content/ — 'Chapter 1. 자기소개 (Self-introduction)',
 * 'TOPIC 1. 인칭', '[ 001번 - 050번 ]') is unchanged.
 */

/** 'Self-introduction (자기소개)' · '자기소개 (Self-introduction)' · '나의 미래 꿈 (교사) (My Future Dream Job (Teacher))' → the Korean half */
export function koreanHalf(text: string): string {
  const t = text.trim();
  if (!t.endsWith(")")) return t;
  let depth = 0;
  let open = -1;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ")") depth++;
    else if (t[i] === "(") {
      depth--;
      if (depth === 0) { open = i; break; }
    }
  }
  if (open <= 0) return t;
  const outer = t.slice(0, open).trim();
  const inner = t.slice(open + 1, -1).trim();
  const hangul = /[가-힣]/;
  if (hangul.test(outer)) return outer;
  if (hangul.test(inner)) return inner;
  return t;
}

/** STUDENT · ADULT: 'Chapter 1. Self-introduction (자기소개)' (a lesson's label) or 'Chapter 1. 자기소개 (Self-introduction)' (a group's title) → '1장 · 자기소개' */
export function chapterName(rawLabel: string, chapter?: number): string {
  const clean = cleanBrackets(rawLabel);
  const m = clean.match(/^Chapter\s*(\d+)\s*[.:]?\s*(.*)$/i);
  const n = m ? Number(m[1]) : chapter;
  const words = m ? koreanHalf(m[2]) : koreanHalf(clean);
  if (!n) return words;
  return words ? `${n}장 · ${words}` : `${n}장`;
}

/** PASS-OFF GRAMMAR: a topic by its number — '대주제 3' (no English 'TOPIC') */
export function passoffTopicName(topic: number): string {
  return `대주제 ${topic}`;
}

/**
 * '대주제 2를' · '대주제 3을' — the particle as the number is read in Korean (일 · 이 · 삼 …: 1 · 3 · 6 · 7 · 8 · 0 end in a
 * consonant). The same rule as passoffUnlock.ts topicWithParticle, with the Korean head.
 */
export function passoffTopicWithParticle(topic: number, particle: "을/를" | "이/가" | "은/는"): string {
  const [afterConsonant, afterVowel] = particle.split("/");
  const lastDigit = Math.abs(Math.trunc(topic)) % 10;
  return `${passoffTopicName(topic)}${[1, 3, 6, 7, 8, 0].includes(lastDigit) ? afterConsonant : afterVowel}`;
}

/** GRAMMAR I's six stages — one name each for the list head and the lesson's stage line */
const G1_STAGE_NAMES = [
  "기본 문장 구조 훈련",
  "어순 및 시제 훈련",
  // 이름을 내용대로 — 답 199개 중 조동사 · 수동태 0(6-1372, 소유자 결정 2026-09-23)
  "진행형 · 부가의문문 & 기초 문형 복습",
  "의문사 & 부정구문 훈련",
  "접속사 & 복문 확장 훈련",
  "실전 고급 복합 구문",
];
const g1StageName = (stage: number) => `제 ${stage}단계 · ${G1_STAGE_NAMES[stage - 1] ?? "기초 영작"}`;

/** VOCA's sections — the list head and the lessons' line */
const vocaSectionName = (level: string | number) => `중등 단어 ${Number(level) || level}단계`;
const VOCA_HIGH_SECTION = "고등 심화 단어";

const G1_EVEN_PRIMARY_IDS = [
  "gh1-006", "gh1-008", "gh1-010", "gh1-012", "gh1-014", "gh1-016",
  "gh1-020", "gh1-022", "gh1-024", "gh1-026", "gh1-028", "gh1-030",
  "gh1-032", "gh1-034", "gh1-036", "gh1-038", "gh1-040", "gh1-042",
  "gh1-044", "gh1-046", "gh1-050", "gh1-052", "gh1-054",
  "gh1-056", "gh1-058", "gh1-060", "gh1-062", "gh1-064", "gh1-066",
  "gh1-068", "gh1-072", "gh1-074", "gh1-076", "gh1-078",
  "gh1-080", "gh1-082", "gh1-084", "gh1-088", "gh1-090", "gh1-092",
  "gh1-094", "gh1-096", "gh1-098", "gh1-100", "gh1-102", "gh1-106", "gh1-108",
  "gh1-110", "gh1-112", "gh1-116", "gh1-118", "gh1-120", "gh1-122",
];

function cleanBrackets(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/^\[\s*/, "")
    .replace(/\s*\]$/, "")
    .replace(/^:::\s*/, "")
    .replace(/\s*:::$/, "")
    .trim();
}

/**
 * Cleanly formats group and stage headings across courses.
 */
export function formatGroupTitle(courseSlug: string, rawLabel: string): string {
  const clean = cleanBrackets(rawLabel);

  // UI검토-1007 4장 8: every head below is one Korean form, '<번호 · 단위> · <이름>' — no 'Stage' · 'Section' · 'Series'
  if (courseSlug === "grammar1") {
    const m = clean.match(/^제\s*(\d+)\s*단계$/);
    return m ? g1StageName(Number(m[1])) : clean;
  }

  if (courseSlug === "grammar2") {
    return clean.replace(/^(\d+)과\s*-\s*(\d+)과$/, "제 $1과 ~ 제 $2과 · 핵심 패턴 영작");
  }

  if (courseSlug === "ld") {
    const m = clean.match(/(\d+)번\s*-\s*(\d+)번/);
    return m ? `${m[1]}~${m[2]}회 · 실전 듣기` : clean;
  }

  if (courseSlug === "reading") {
    const m = clean.match(/(\d+)~(\d+)번/);
    return m ? `${m[1]}~${m[2]}회 · 원문 독해` : clean;
  }

  if (courseSlug === "phonics") {
    const m = clean.match(/^중등\s*0*(\d+)$/);
    if (m) return vocaSectionName(m[1]);
    return clean.includes("고등") ? VOCA_HIGH_SECTION : clean;
  }

  // STUDENT · ADULT: 'Chapter 1. 자기소개 (Self-introduction)' → '1장 · 자기소개'
  if (courseSlug === "student" || courseSlug === "adult") {
    return chapterName(clean);
  }

  if (courseSlug === "cnn") {
    if (clean === "CNN1-60") return "Part 1 · 실전 뉴스 리스닝 (001 ~ 060)";
    if (clean === "CNN61-120") return "Part 2 · 실전 뉴스 리스닝 (061 ~ 120)";
    return clean;
  }

  // PASS-OFF GRAMMAR: one section per textbook topic — the data's "TOPIC 2. 동사의 현재형" is shown '대주제 2 · 동사의 현재형'
  if (courseSlug === "passoff-grammar") {
    const m = clean.match(/^(?:TOPIC\s*)?(\d+)\s*[.:]?\s*(.*)$/i);
    if (!m) return clean;
    return m[2] ? `${passoffTopicName(Number(m[1]))} · ${m[2]}` : passoffTopicName(Number(m[1]));
  }

  return clean;
}

/**
 * Returns a polished, professional title, subtitle, badge, and clean code for any lesson.
 */
export function formatLessonPresentation(
  courseSlug: string,
  lesson: {
    id: string;
    label?: string | null;
    menuLabel?: string | null;
    title?: string | null;
    unit?: number | null;
    variant?: string;
  },
): LessonPresentation {
  const id = lesson.id;
  const rawLabel = cleanBrackets(lesson.menuLabel || lesson.label || "");

  // 1. Grammar 1: 53 sequential lectures
  if (courseSlug === "grammar1") {
    const baseId = id.split("-").slice(0, 2).join("-");
    const idx = G1_EVEN_PRIMARY_IDS.indexOf(baseId);
    const lectureNum = idx >= 0 ? String(idx + 1).padStart(2, "0") : String(lesson.unit || id);

    const m = id.match(/^gh1-(\d+)/);
    const num = m ? parseInt(m[1], 10) : 0;
    // An English answer page (odd number) belongs to the stage of its Korean question page, the even
    // number before it — the course index groups stages by those. By their own numbers gh1-017 · 043 ·
    // 055 · 079 · 109 showed the next stage while their question pages showed this one (6-1372).
    const stageBase = num % 2 === 1 ? num - 1 : num;
    const stageNum = stageBase <= 16 ? 1 : stageBase <= 42 ? 2 : stageBase <= 54 ? 3 : stageBase <= 78 ? 4 : stageBase <= 108 ? 5 : 6;
    // gh1-116 ~ 123 은 2002년 뉴스 방송으로 만든 문장이라 인물 · 사건이 그때 기준(파월 국무장관 · 무바라크 대통령 …).
    // 이 화면은 instruction · paragraph 를 그리지 않아 부제목에 적음(6-1516, 소유자 결정 2026-09-23).
    const newsNote = num >= 116 && num <= 123 ? " · 2002년 뉴스 방송 기반 문장입니다" : "";

    return {
      title: `${lectureNum}강 · 기초 영작 훈련`,
      // UI검토-1007 4장 8: the list head's own words ('제 1단계 · 기본 문장 구조 훈련') — it read '제 1단계 (기본 문장 구조)' here
      subtitle: `${g1StageName(stageNum)}${newsNote}`,
      badge: "🎙️ 마이크 채점",
      code: `Lesson ${lectureNum}`,
    };
  }

  // 2. Grammar 2: Pattern Composition
  if (courseSlug === "grammar2") {
    const m = id.match(/^gh2-(\d+)/);
    const lessonNum = m ? String(parseInt(m[1], 10)).padStart(2, "0") : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    // gh2-044 4번은 1996년 미국 대선(클린턴 · 돌)을 지금 일처럼 적은 뉴스 문장 — gh1-116 ~ 123 과 같은 방식으로 부제목에 적음
    // (9/18 감사 6-1602 · 관문 15 전수 읽기, 소유자 결정 2026-09-24).
    const newsNote = lessonNum === "44" ? " · 4번은 1996년 미국 대선 무렵 뉴스로 만든 문장입니다" : "";
    return {
      // UI검토-1007 44번: '제 7과' like the list's section heads ('제 7과 ~ 제 12과') — it read '제 07과' here
      title: `제 ${Number(lessonNum) || lessonNum}과 · 패턴 영작 훈련`,
      subtitle: `${isKoreanScript ? "한국어 대조 스크립트" : "English Model Pattern"}${newsNote}`,
      badge: "🎙️ 마이크 채점",
      code: `Lesson ${lessonNum}`,
    };
  }

  // 3. Listen & Dictate (수능/토익 실전 듣기)
  if (courseSlug === "ld") {
    const m = id.match(/^d(\d+)/);
    const roundNum = m ? m[1] : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    return {
      title: `${roundNum}회 · 실전 듣기 평가`,
      subtitle: isKoreanScript ? "한국어 번역 및 어순 대조" : "수능/토익 딕테이션 훈련",
      badge: "🔊 음성 듣기",
      code: `Round ${roundNum}`,
    };
  }

  // 4. Reading (원문 리딩)
  if (courseSlug === "reading") {
    const m = id.match(/^pr(\d+)/);
    const roundNum = m ? m[1] : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    return {
      title: `${roundNum}회 · 원문 독해 & 리스닝`,
      subtitle: isKoreanScript ? "우리말 해석 & 구문 해설" : `Passage ${roundNum} · 음성 듣기`,
      badge: "📖 직독직해",
      code: `Passage ${roundNum}`,
    };
  }

  // 5. VOCA (중등단어 MV & 고등단어 HV)
  if (courseSlug === "phonics") {
    if (id.startsWith("hv")) {
      const num = id.replace("hv-", "").replace("hv", "");
      return {
        title: `고등 단어 · ${num}회`,
        // UI검토-1007 4장 8: the list head's words — 'High School Advanced Vocabulary' · '… Series N' were English heads
        subtitle: VOCA_HIGH_SECTION,
        badge: "🎙️ 발음 채점",
        code: `HV-${num}`,
      };
    }
    const m = id.match(/^mv(\d+)-(\d+)/);
    if (m) {
      return {
        title: `중등 단어 ${m[1]}단계 · ${m[2]}회`,
        subtitle: vocaSectionName(m[1]),
        badge: "🎙️ 발음 채점",
        code: `MV${m[1]}-${m[2]}`,
      };
    }
    return {
      title: `단어 훈련 · ${rawLabel || id}`,
      subtitle: "단어 훈련",
      badge: "🎙️ 발음 채점",
      code: id,
    };
  }

  // 6. Basics (Student Drills)
  if (courseSlug === "basics") {
    if (id.startsWith("po")) {
      const parts = id.replace("po", "").split("-");
      const unit = parts[0] || "01";
      const lessonNum = parts[1] || "01";
      return {
        title: `Unit ${unit} · 기본 문장 훈련 ${lessonNum}`,
        subtitle: "Foundational Sentence Drill",
        badge: "🔊 음성 듣기",
        code: `Unit ${unit}-${lessonNum}`,
      };
    }
    if (id.startsWith("qa")) {
      const parts = id.replace("qa", "").split("-");
      const unit = parts[0] || "01";
      const lessonNum = parts[1] || "01";
      return {
        title: `Unit ${unit} · 질문과 대답 ${lessonNum}`,
        subtitle: "Spoken Q&A Interaction",
        badge: "🔊 음성 듣기",
        code: `QA ${unit}-${lessonNum}`,
      };
    }
  }

  // 7. Middle (Men's drills)
  if (courseSlug === "middle") {
    const parts = id.replace("p", "").split("-");
    const unit = parts[0] || "01";
    const lessonNum = parts[1] || "01";
    return {
      title: `Unit ${unit} · 중등 실전 문장 ${lessonNum}`,
      subtitle: "Middle-School Spoken Drills",
      badge: "🔊 음성 듣기",
      code: `P ${unit}-${lessonNum}`,
    };
  }

  // 8. Adults Men & Women
  if (courseSlug === "adults-m" || courseSlug === "adults-w" || courseSlug === "adults") {
    const isMen = courseSlug === "adults-m" || id.startsWith("am");
    const cleanId = id.replace(/^(am|aw)/, "");
    const parts = cleanId.split("-");
    const unit = parts[0] || "01";
    const lessonNum = parts[1] || "01";
    return {
      title: `Unit ${unit} · ${isMen ? "남성" : "여성"} 비즈니스 ${lessonNum}`,
      subtitle: isMen ? "Men's Spoken Track" : "Women's Spoken Track",
      badge: "💼 비즈니스 회화",
      code: `Unit ${unit}-${lessonNum}`,
    };
  }

  // 9. Student Conversation (실전 학생 회화)
  // 9-1. ADULT (2026-10-02) — "a7-2", presented exactly as STUDENT's lessons
  // UI검토-1007 4장 8 · 3장 16 · 18: one form everywhere — the title is '1-1 · Greeting (인사말)' (its chapter-lesson number,
  // then its own words; it was 'Part 1 · …', the same in every chapter, and the end bar · list buttons put 'Ch 1-1 ·' before
  // it themselves), the chapter line '1장 · 자기소개' (it was the lesson file's 'Chapter 1. Self-introduction (자기소개)'),
  // the code '1-1'. The lesson's own words (lesson.title) are unchanged.
  if (courseSlug === "student" || courseSlug === "adult") {
    const parts = id.replace(/^[sa]/, "").split("-");
    const chapter = parts[0] || "1";
    const part = parts[1] || "1";
    const code = `${chapter}-${part}`;
    const lessonTitle = lesson.title || rawLabel || code;
    return {
      title: `${code} · ${lessonTitle}`,
      subtitle: lesson.label ? chapterName(lesson.label, Number(chapter)) : `${Number(chapter)}장`,
      badge: "🎙️ 실전 회화",
      code,
      name: lessonTitle,
    };
  }

  // 9-2. PASS-OFF GRAMMAR — "pg02-1" is the second topic's first link on the textbook's structure map.
  // The title is the link's own words (D1), the topic goes underneath as STUDENT's chapter does — '대주제 2 · 동사의 현재형'.
  if (courseSlug === "passoff-grammar") {
    const m = id.match(/^pg(\d+)-(\d+)/);
    const topic = m ? Number(m[1]) : lesson.unit ?? 0;
    const link = m ? Number(m[2]) : 0;
    return {
      title: lesson.title || rawLabel || id,
      subtitle: lesson.label ? formatGroupTitle(courseSlug, lesson.label) : passoffTopicName(topic),
      badge: "문법 설명 · 영작",
      code: `${topic}-${link}`,
    };
  }

  // 10. Dialogue tracks (man, woman)
  if (["man", "woman"].includes(courseSlug)) {
    const prefix = courseSlug === "man" ? "m" : "w";
    const cleanId = id.replace(new RegExp(`^${prefix}`), "");
    const parts = cleanId.split("-");
    const chapter = parts[0] || "1";
    const track = parts[1] || "1";
    const roleName = courseSlug === "man" ? "남성 실전 회화" : "여성 실전 회화";
    return {
      title: `Chapter ${chapter} · ${roleName} ${track}`,
      subtitle: rawLabel && !rawLabel.includes(id) ? rawLabel : "Interactive Spoken Dialogue",
      badge: "🎙️ 실전 회화",
      code: `Ch ${chapter}-${track}`,
    };
  }

  // 10. CNN Listening
  if (courseSlug === "cnn") {
    const m = id.match(/(\d+)/);
    const num = m ? m[1] : id;
    return {
      title: `CNN 뉴스 ${num}회`,
      subtitle: rawLabel || "World News Listening",
      badge: "📺 뉴스 비디오",
      code: `CNN ${num}`,
    };
  }

  // 11. Chinese
  if (courseSlug === "chinese") {
    const parts = id.replace("c", "").split("-");
    const lessonNum = parts[0] || "1";
    const subNum = parts[1] || "1";
    return {
      title: `제 ${lessonNum}과 · 실전 중국어 회화 ${subNum}`,
      subtitle: rawLabel || "Chinese Conversation & Pinyin",
      badge: "🇨🇳 한/중 대조",
      code: `Lesson ${lessonNum}-${subNum}`,
    };
  }

  // Default fallback
  return {
    title: rawLabel || id,
    subtitle: courseSlug.toUpperCase(),
    badge: undefined,
    code: id,
  };
}
