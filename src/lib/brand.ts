/**
 * The company name, in one place.
 *
 * 2026-10-12 (owner): the company was renamed from 'K-IG 교육' to '홍세일 | 음절연구소'. Every
 * place a learner or a search engine reads the name — the header mark, the home page, the
 * browser-tab titles, the share cards, the icon label, the licence wording — takes it from
 * here, so the next change is one line.
 *
 * NOT renamed, on purpose:
 *   - licence codes still start with `KIG-` (`src/lib/license.ts` · `serverLicense.ts`): codes
 *     already issued to customers must keep working, and the prefix is part of what is signed;
 *   - the `kig:` browser-storage keys: renaming them would drop every learner's saved progress,
 *     theme and bookmarks on this device;
 *   - the original textbook's own strings inside `content/` ('::: K-IG 교육 … :::',
 *     '[ K-IG 교육 Reading 001 ]'): no screen shows them, and the views recognise the old
 *     textbook chrome by that very string (`t.includes("K-IG")`) in order to drop it.
 */

/** The founder's name — the quieter half of the mark. */
export const BRAND_PERSON = "홍세일";

/** The institute's name — the half the eye should land on. */
export const BRAND_LAB = "음절연구소";

/** The full company name as written: '홍세일 | 음절연구소'. */
export const BRAND_NAME = `${BRAND_PERSON} | ${BRAND_LAB}`;

/** One line about what the site is — browser tab on the home page, share cards. */
export const BRAND_TAGLINE = "영어 학습 8개 과정";

/** The home page's browser-tab title and the share-card title. */
export const SITE_TITLE = `${BRAND_NAME} · ${BRAND_TAGLINE}`;

/** The share-card / search-result description of the whole site. */
export const SITE_DESCRIPTION = `${BRAND_NAME}의 영어 학습 8개 과정: STUDENT 회화, ADULT 성인 회화, PASS-OFF GRAMMAR 문법, VOCA 어휘, 영문법 1·2, LISTENING, READING.`;

/** Used when a course or section has no description of its own, so a share card is never blank. */
export const FALLBACK_DESCRIPTION = `${BRAND_NAME} — 회화, 문법, 어휘, 리스닝, 리딩을 한 곳에서.`;

/** The closing words of a lesson page's description: '… — 1-1 · Greeting. 홍세일 | 음절연구소.' */
export const LESSON_DESCRIPTION_SUFFIX = `${BRAND_NAME}.`;
