'use strict';
// Builds out/g2-p52-71.json (Pass-Off Grammar book 2, PDF pages 52-71: 준동사 · 태 · 화법).
// Every printed line is taken verbatim from the pymupdf span dump (spans_g2_p52_71.txt);
// annotations (answers, issues) are added by hand below. Reads repo lesson JSON read-only.
const fs = require('fs');
const path = require('path');

const SP = String.raw`C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE--claude-worktrees-korean-market-analysis-39e7fc\5adf4ccb-9cea-421f-9195-b5f31b723c7f\scratchpad\pdf`;
const REPO = String.raw`C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\korean-market-analysis-39e7fc`;
const OUT = path.join(SP, 'out', 'g2-p52-71.json');

// ---------- 1. parse span dump ----------
const dumpText = fs.readFileSync(path.join(SP, 'spans_g2_p52_71.txt'), 'utf8').replace(/^\uFEFF/, '');
const PAGES = {};
(function parse() {
  let cur = null;
  for (const line of dumpText.split(/\r?\n/)) {
    let m = line.match(/^===== PAGE (\d+) =====/);
    if (m) { cur = Number(m[1]); PAGES[cur] = []; continue; }
    m = line.match(/^\s+y=\s*(\d+) x=\s*(\d+) ?(.*)$/);
    if (!m || cur === null) continue;
    const rest = m[3];
    // tag = optional 'B'(bold)/'I'(italic) prefix + font name. Font 'Batang' also starts with B, so decide
    // bold by the font name: every bold span on these pages uses a '*Bold' font (BMalgunGothicBold, BTahoma-Bold).
    const re = /<([^|<>]+)\|([\d.]+)>/g;
    const pieces = [];
    let last = 0; let tag = null; let mm;
    while ((mm = re.exec(rest))) {
      if (mm.index > last) pieces.push({ bold: !!(tag && tag.bold), font: tag && tag.font, text: rest.slice(last, mm.index) });
      const full = mm[1];
      const bold = full.includes('Bold');
      tag = { bold, font: bold && full.startsWith('B') ? full.slice(1) : full };
      last = re.lastIndex;
    }
    if (last < rest.length) pieces.push({ bold: !!(tag && tag.bold), font: tag && tag.font, text: rest.slice(last) });
    const text = pieces.map((p) => p.text).join('').trim();
    PAGES[cur].push({ page: cur, y: Number(m[1]), x: Number(m[2]), text, pieces, used: false });
  }
})();
for (let p = 52; p <= 71; p++) if (!PAGES[p]) throw new Error('missing page ' + p);

function isBoiler(l) {
  if (!l.text) return true;
  if (l.text === 'The Revolution of English Education') return true; // running head
  if (l.text === 'Pass-Off English') return true; // watermark
  if (/^\d{2}$/.test(l.text) && l.pieces.some((p) => p.font === 'Batang')) return true; // page number
  return false;
}

function L(page, spec) {
  const o = typeof spec === 'string' ? { s: spec } : spec;
  const cand = PAGES[page].filter((l) => (o.exact ? l.text === o.s : l.text.includes(o.s)));
  let idx = o.occ;
  if (idx === undefined) {
    if (cand.length !== 1) throw new Error(`L(${page}, ${JSON.stringify(o)}) matched ${cand.length} lines`);
    idx = 0;
  } else if (cand.length <= idx) throw new Error(`L(${page}, ${JSON.stringify(o)}) only ${cand.length}`);
  const l = cand[idx];
  if (l.used) throw new Error(`line used twice: p${page} ${l.text}`);
  l.used = true;
  return l;
}
const E = (s, occ) => ({ s, exact: true, occ });
const O = (s, occ) => ({ s, occ });

function deriveEn(texts) {
  let s = texts.map((t) => t.trim()).join(' ');
  s = s.replace(/^=>\s*/, '').replace(/^-\s+/, '');
  let lessonRef = null; let tag = null; let m;
  m = s.match(/\s*\((\d+)과\)\s*$/);
  if (m) { lessonRef = Number(m[1]); s = s.slice(0, m.index); }
  m = s.match(/\s*(\([^()]*[가-힣][^()]*\))\s*$/);
  if (m) { tag = m[1]; s = s.slice(0, m.index); }
  s = s.replace(/ {2,}/g, ' ').trim();
  return { en: s, lessonRef, tag };
}

function S(p, l, extra) { return { p, l: Array.isArray(l) ? l : [l], extra: extra || {} }; }
function mkItem(spec, ref) {
  const ls = spec.l.map((x) => L(spec.p, x));
  const texts = ls.map((l) => l.text);
  const d = deriveEn(texts);
  const it = { page: spec.p, en: d.en, ko: null, bold: [], tag: d.tag, lessonRef: d.lessonRef, raw: texts.join('\n') };
  Object.assign(it, spec.extra);
  it.ref = ref;
  return it;
}
function mkGroup(label, specs, refBase, opts) {
  const items = specs.map((sp, i) => mkItem(sp, `${refBase} item ${i + 1}`));
  items.forEach((it) => {
    if (it.transformOf) {
      it.role = 'transformed';
      it.transformOfRef = items[it.transformOf - 1].ref;
      items[it.transformOf - 1].role = 'original';
    }
  });
  return { label, explanation: null, ...(opts || {}), items };
}
function taskHead(page, spec) {
  const t = L(page, spec).text;
  const m = t.match(/^(\d+\.)\s*(.*)$/);
  return { no: m[1], instruction: m[2], instructionRaw: t };
}
function boldSegs(l) {
  const segs = []; let cur = '';
  for (const p of l.pieces) {
    if (p.bold) cur += p.text; else { if (cur.trim()) segs.push(cur); cur = ''; }
  }
  if (cur.trim()) segs.push(cur);
  return segs.map((s) => s.trim().replace(/\.+$/, '').trim()).filter(Boolean);
}
function mkRI(task, n, p, lspecs, lang) {
  const ls = (Array.isArray(lspecs) ? lspecs : [lspecs]).map((x) => L(p, x));
  const texts = ls.map((l) => l.text);
  let prompt = texts.map((t) => t.trim()).join(' ').replace(/ {2,}/g, ' ');
  let hint = null;
  const m = prompt.match(/\s*(\([^()]*[가-힣][^()]*\))\s*$/);
  if (lang === 'en' && m) { hint = m[1]; prompt = prompt.slice(0, m.index); }
  return { n: String(n), page: p, prompt, promptLang: lang, raw: texts.join('\n'), hint, _lines: ls, _task: task };
}
function answer(ri, src, o) {
  o = o || {};
  ri.extraSlot = o.extraSlot === undefined ? null : o.extraSlot;
  ri.answerFromBook = src ? src.en : null;
  ri.answerSource = src ? src.ref : 'none';
  ri.altAnswersFromBook = o.alt ? o.alt.map((a) => a.en) : null;
  ri.altAnswerSources = o.alt ? o.alt.map((a) => a.ref) : null;
  ri.proposedAnswer = o.proposed === undefined ? null : o.proposed;
  ri.correctedAnswer = o.corrected === undefined ? null : o.corrected;
  ri.acceptAlso = o.acceptAlso === undefined ? null : o.acceptAlso;
  ri.extraSlotAnswer = o.extraSlotAnswer === undefined ? null : o.extraSlotAnswer;
  ri.koFromBook = o.koFromBook === undefined ? null : o.koFromBook;
  ri.note = o.note === undefined ? null : o.note;
  if (o.correctedAlt) ri.correctedAltAnswers = o.correctedAlt;
  const tag = `${ri._task} item ${ri.n} (p${ri.page})`;
  if (src) (src.reviewRefs = src.reviewRefs || []).push(tag);
  if (o.alt) for (const a of o.alt) (a.reviewRefs = a.reviewRefs || []).push(tag + ' [별해]');
  if (o.link) for (const a of o.link) (a.reviewRefs = a.reviewRefs || []).push(tag);
}

// ====================================================================================
// TOPIC 13 준동사 (p52-61)
// ====================================================================================
const T13 = {
  printedLabel: L(52, E('TOPIC 13')).text, title: '준동사', printedTitle: L(52, E('준 동 사')).text,
  pages: [52, 61], continuesFromPrevRange: false, continuesIntoNextRange: false, sections: [],
};
const t13po = { kind: 'passOff', heading: L(52, E('1. Pass-Off Sentences')).text, page: 52, groups: [] };
t13po.groups.push(mkGroup(L(52, E('(1) 부정사')).text, [
  S(52, 'To be an honest man'), S(52, 'So now I want to become'), S(52, E('To live is to fight')), S(52, 'He seems to be honest'),
  S(52, 'There are so many fun things'), S(52, 'I have no house'), S(52, 'I must have a lot of patience'), S(52, 'I am happy to learn'),
  S(52, 'He cannot be honest'), S(52, 'You will be happy'), S(52, 'I hope to grow up'), S(52, 'My mother doesn’t allow'),
  S(52, 'I want to be able to help'),
], 'passOff (1) 부정사'));
t13po.groups.push(mkGroup(L(52, E('(2) 분사')).text, [
  S(52, 'While the teacher is conducting'), S(52, '=>While the teacher conducting', { transformOf: 1 }),
  S(52, 'As I am walking'), S(52, '=>Walking to school', { transformOf: 3 }),
  S(52, 'Barking dogs'), S(52, 'He is a wounded soldier'), S(52, 'I saw a soldier wounded'), S(52, 'He often goes shopping'),
], 'passOff (2) 분사'));
t13po.groups.push(mkGroup(L(53, E('3) 동명사')).text, [
  S(53, 'Getting ready for school'), S(53, ['My hobbies include', 'and participating in sports']), S(53, 'Seeing is believing'),
  S(53, 'I saw him running away'), S(53, 'She is excellent at teaching'),
], 'passOff 3) 동명사'));
t13po.groups.push(mkGroup(L(53, E('(4) 관용표현')).text, [
  S(53, 'Generally speaking'), S(53, 'Strictly speaking'), S(53, 'Taking his age'), S(53, 'Judging from'),
  S(53, 'I could not help laughing'), S(53, 'It’s no use crying'), S(53, 'The novel is worth'), S(53, 'My son is busy'),
  S(53, 'It goes without saying'), S(53, 'I feel like swimming'),
], 'passOff (4) 관용표현'));
T13.sections.push(t13po);

const INF = '[라벨 없음·추론]';
const t13app = { kind: 'application', heading: L(54, E('2. Application Sentences')).text, page: 54,
  note: `Application 쪽(p54-56)에는 소제목이 인쇄되지 않았다. label=null이고 inferredLabel은 문장 순서와 Pass-Off 소제목으로 추론한 것이다.`, groups: [] };
t13app.groups.push(mkGroup(null, [
  S(54, 'To be an honest man'), S(54, 'To drink too much coffee'), S(54, 'cabbage sandwiches'), S(54, 'Kira needs'),
  S(54, 'So now I want to become'), S(54, 'To live is to fight'), S(54, 'happy to see you again'), S(54, 'ready to win the test'),
  S(54, 'He seems to be honest'), S(54, 'There are so many fun things'), S(54, 'I have no house'), S(54, 'I must have a lot of patience'),
  S(54, 'I am happy to learn'), S(54, 'He cannot be honest'), S(54, 'You will be happy'), S(54, 'I hope to grow up'),
  S(54, 'My mother doesn’t allow'), S(54, 'David invited me'), S(54, 'Mary asks me'),
  S(55, 'Mike is old enough'), S(55, 'It’s too cold'), S(55, 'The music was too loud'), S(55, 'It was nice of you'),
  S(55, 'I want to be able to help'), S(55, 'He let his students'), S(55, 'They made me tell'), S(55, 'He saw his sister'),
], `application (1) 부정사${INF}`, { inferredLabel: '(1) 부정사' }));
t13app.groups.push(mkGroup(null, [
  S(55, ['While the teacher is conducting', E('the students are very noisy. (5과)')]),
  S(55, ['=>While the teacher conducting', E('the students are very noisy.')], { transformOf: 1 }),
  S(55, 'As I am walking'), S(55, '=>Walking to school', { transformOf: 3 }),
  S(55, 'Barking dogs'), S(55, 'Lobby is'), S(55, 'burning house'), S(55, 'She sat singing'),
  S(55, 'He is a wounded soldier'), S(55, 'I saw a soldier wounded'), S(56, 'He often goes shopping'),
], `application (2) 분사${INF}`, { inferredLabel: '(2) 분사' }));
t13app.groups.push(mkGroup(null, [
  S(56, 'Getting ready for school'), S(56, ['My hobbies include', 'watching movies and participating']), S(56, 'Seeing is believing'),
  S(56, 'I saw him running away'), S(56, 'She is excellent at teaching'),
], `application (3) 동명사${INF}`, { inferredLabel: '(3) 동명사' }));
t13app.groups.push(mkGroup(null, [
  S(56, 'Generally speaking'), S(56, 'Strictly speaking'), S(56, 'Taking his age'), S(56, 'Judging from'),
  S(56, 'I could not help laughing'), S(56, 'It’s no use crying'), S(56, 'The novel is worth'), S(56, 'My son is busy'),
  S(56, 'It goes without saying'), S(56, 'I feel like swimming'),
], `application (4) 관용표현${INF}`, { inferredLabel: '(4) 관용표현' }));
T13.sections.push(t13app);
const A13 = (g, i) => t13app.groups[g - 1].items[i - 1];
const P13 = (g, i) => t13po.groups[g - 1].items[i - 1];

// ---- Review (p57-61)
const t13rv = { kind: 'review', heading: L(57, E('Review')).text, page: 57, tasks: [] };

// Task 1 (p57): translate bold parts
{
  const h = taskHead(57, '다음 문장을 보고 굵게');
  const task = { no: h.no, page: 57, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['translate_bold_en_to_ko', 'infinitive_usage'], printedItemNumbers: false,
    note: `정답은 굵은 부분의 한국어 해석이다. 책에는 정답이 없다. proposedAnswer=굵은 부분 해석(제안), proposedFullKo=문장 전체 해석(제안), grammarPoint=그 to부정사의 용법(제안, 책에 인쇄 안 됨). Pass-Off (1) 부정사 13문장 중 11번(I hope to grow up … )만 빠져 있다.`,
    items: [] };
  const specs = ['To be an honest man', 'So now I want', 'To live is', 'He seems to', 'There are so many', 'I have no', 'I must have',
    'I am happy', 'He cannot be honest', 'You will be happy', 'My mother doesn’t allow', 'I want to be able'];
  const srcIdx = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13];
  const appIdx = [1, 5, 6, 9, 10, 11, 12, 13, 14, 15, 17, 24];
  const P = [
    ['정직한 사람이 되는 것(은)', '정직한 사람이 되는 것은 언제나 중요하다.', '명사적 용법(주어)'],
    ['선생님이 되기를(되는 것을)', '그래서 이제 나는 선생님이 되고 싶다.', '명사적 용법(목적어)'],
    ['사는 것(은) / 싸우는 것(이다)', '사는 것은 싸우는 것이다.', '명사적 용법(주어·보어)'],
    ['~인 것 같다(~처럼 보인다)', '그는 정직한 것 같다.', 'seem + to부정사(~인 것 같다)'],
    ['할 만한 재미있는 것들이 아주 많은 / 가 볼 만한 아름다운 곳들이 많은', '그곳에는 할 만한 재미있는 것들이 아주 많고, 가 볼 만한 아름다운 곳들도 많다.', '형용사적 용법(명사 뒤에서 꾸밈)'],
    ['살 집', '나는 살 집이 없다.', '형용사적 용법(전치사를 동반한 to부정사)'],
    ['그들을 가르치기 위해서', '그들을 가르치기 위해서 나는 인내심이 많아야 한다.', '부사적 용법(목적: in order to)'],
    ['새로운 것들을 배워서', '나는 새로운 것들을 배워서 행복하다.', '부사적 용법(감정의 원인)'],
    ['그런 일을 하다니 정직할 리가 없다', '그런 일을 하다니 그는 정직할 리가 없다.', '부사적 용법(판단의 근거)'],
    ['내 충고를 따른다면', '너는 내 충고를 따른다면 행복할 거야.', '부사적 용법(조건) — 책 Review 3 item 1의 한국어 해석 기준'],
    ['TV를 많이 보는 것을(보도록)', '나의 어머니는 우리가 TV를 많이 보는 것을 허락하지 않으신다.', '목적격 보어(allow + 목적어 + to부정사)'],
    ['다른 사람들이 배우고 성장하도록 돕는 것', '나도 다른 사람들이 배우고 성장하도록 도울 수 있기를 원한다.', 'be able to + help + 목적어 + 원형부정사'],
  ];
  specs.forEach((sp, i) => {
    const ri = mkRI('Review 1.', i + 1, 57, sp, 'en');
    ri.bold = boldSegs(ri._lines[0]);
    answer(ri, null, { proposed: P[i][0], link: [P13(1, srcIdx[i])] });
    ri.answerSource = P13(1, srcIdx[i]).ref;
    ri.alsoIn = A13(1, appIdx[i]).ref;
    ri.proposedFullKo = P[i][1];
    ri.grammarPoint = P[i][2];
    task.items.push(ri);
  });
  t13rv.tasks.push(task);
}

// Task 2 (p58): fill blanks (idioms)
{
  const h = taskHead(58, '다음 문장에서 빈 칸에');
  const task = { no: h.no, page: 58, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['fill_blank_from_ko', 'participle_gerund_idiom'], printedItemNumbers: false,
    note: `각 문항은 한국어 문장(prompt) 한 줄 + 빈칸이 있는 영어 틀(frame) 한 줄이다. 쪽 왼쪽 아래 마지막 문항 밑에 떨어진 마침표 '.' 한 개가 따로 인쇄되어 있다(strayMark).`,
    items: [] };
  const pairs = [
    ['일반적으로 말해서', ', he is a kind of hero.'], ['엄격하게 말해서', ', he was not a good student.'],
    ['그의 나이를 고려한다면', ', he did it very well.'], ['일기 예보로 판단하건대', ', we’ll have a heavy rain tonight.'],
    ['나는 그녀가 잘못된 보고서를', 'I could '], ['쏟아진 우유를', 'It’s _'], ['그 소설은 읽을 가치가', 'The novel is_'], ['나의 아들은 수학을', 'My son is _'],
  ];
  const slot = ['Generally speaking', 'Strictly speaking', 'Taking his age into consideration', 'Judging from the weather forecast',
    'not help laughing', 'no use crying', 'worth reading', 'busy studying'];
  const acc = [null, null, ['Considering his age'], ['Judging by the weather forecast'], ['not help but laugh', 'not but laugh'],
    ['no good crying'], ['worthy of being read'], null];
  pairs.forEach(([ko, fr], i) => {
    const kl = L(58, ko); const fl = L(58, fr);
    const ri = { n: String(i + 1), page: 58, prompt: kl.text, promptLang: 'ko', frame: fl.text, raw: `${kl.text}\n${fl.text}`, hint: null, _task: 'Review 2.' };
    answer(ri, P13(4, i + 1), { extraSlot: '빈칸(밑줄)에 들어갈 영어 표현', extraSlotAnswer: slot[i], acceptAlso: acc[i] ? acc[i].map((a) => `(빈칸) ${a}`) : null, link: [A13(4, i + 1)] });
    ri.alsoIn = A13(4, i + 1).ref;
    for (const s of [P13(4, i + 1), A13(4, i + 1)]) { s.koFromReview = kl.text; s.koFromReviewSource = `Review 2. item ${i + 1} (p58)`; }
    task.items.push(ri);
  });
  task.strayMark = L(58, E('.')).text;
  t13rv.tasks.push(task);
}

// Task 3 (p59-61): Korean -> English
{
  const h = taskHead(59, '다음을 보고 영작하시오');
  const task = { no: h.no, page: 59, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['ko_to_en_compose'], printedItemNumbers: false,
    note: `한국어 프롬프트는 Application (1) item 15부터 (4) item 10까지를 순서대로 번역한 것이다(=> 변환문 2개와 (4) 관용표현 1~8은 건너뜀; 관용표현 1~8은 Review 2가 다룸). 29개 한국어 줄 전부가 Application 문장과 짝지어진다.`,
    items: [] };
  const specs = [
    [59, '너는 내 충고를'], [59, '나는 이 순신'], [59, '나의 어머니는 우리가'], [59, '데이빗은'], [59, '메리는'], [59, '마이크는'],
    [59, '아이들이 학교로'], [59, '전화 받기에'], [59, '당신이 그렇게'], [59, '나는 다른 사람들이'],
    [60, '그는 그의 학생들이'], [60, '그들은 내가'], [60, '그는 그의 누이가'], [60, '선생님이 아침 조회를'], [60, '학교로 걸어갈 때'],
    [60, '짖는 개는'], [60, '로비는'], [60, '우리는 그 사진에서'], [60, '그녀는 즐겁게'], [60, '그는 부상당한 병사다'],
    [61, '나는 전쟁터에서'], [61, '그는 엄마와 함께'], [61, '등교 준비는'], [61, ['내 취미는', '영화보기 그리고']], [61, '보는 것이 믿는'],
    [61, '나는 그가 도망가는'], [61, '그녀는 우리가 알아야'], [61, '부보다 건강이'], [61, '나는 강에서'],
  ];
  const src = [[1, 15], [1, 16], [1, 17], [1, 18], [1, 19], [1, 20], [1, 21], [1, 22], [1, 23], [1, 24], [1, 25], [1, 26], [1, 27],
    [2, 1], [2, 3], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 9], [4, 10]];
  const extra = {
    1: { acceptAlso: ['You will be happy if you follow my advice.'], note: `책은 to부정사 '조건' 용법으로 번역했다. 원어민은 be happy to를 '기꺼이 ~하다'로 읽으므로 조건 뜻의 자연스러운 영어(if절)도 정답 처리(issues 참조).` },
    2: { corrected: 'I hope to grow up to be as brave and confident as Admiral Yi Sun-sin.', acceptAlso: ['I hope to grow up to be as brave and confident as General Soon-shin Lee.'], note: `사이트 STUDENT s13-3은 Admiral Yi Sun-sin 표기(issues 참조).` },
    5: { corrected: 'Mary asked me to be the captain of the team.', note: `한국어는 과거(부탁했다), 책 영어는 현재(asks).` },
    8: { acceptAlso: ['The music was too loud for me to answer the phone.', 'The music is too loud to answer the phone.'], note: `한국어는 현재형(시끄럽다), 책 영어는 과거형(was).` },
    10: { corrected: 'I want to be able to help others learn and grow, too.', acceptAlso: ['I want to be able to help others learn and grow.'], note: `책 영어 other는 others의 오류, 한국어에는 too(나도)가 없다.` },
    14: { corrected: 'While the teacher is conducting the morning session, the students are very noisy.', note: `책 영어 conducting for morning session은 오류(STUDENT s5-3: conducting the morning session).` },
    15: { alt: [A13(2, 4)], note: `책에 부사절 문장과 분사구문 문장이 모두 인쇄되어 있어 둘 다 정답.` },
    17: { acceptAlso: ['Robby is a really interesting person.'], note: `Lobby는 이름으로 어색(issues 참조).` },
    21: { corrected: 'I saw a soldier wounded on the battlefield.' },
    24: { acceptAlso: ['My hobbies include reading books, listening to music, hiking, watching movies, and participating in sports.'], note: `STUDENT s1-4 원문은 movies 뒤에 쉼표가 있다.` },
    26: { note: `running은 동명사가 아니라 지각동사 목적격 보어로 쓰인 현재분사다(issues 참조).` },
  };
  specs.forEach(([p, sp], i) => {
    const ri = mkRI('Review 3.', i + 1, p, sp, 'ko');
    const s = A13(src[i][0], src[i][1]);
    const ex = extra[i + 1] || {};
    answer(ri, s, ex);
    for (const k of [s, ...(ex.alt || [])]) { k.koFromReview = ri.prompt; k.koFromReviewSource = `Review 3. item ${i + 1} (p${p})`; }
    task.items.push(ri);
  });
  t13rv.tasks.push(task);
}
T13.sections.push(t13rv);
// Korean for Review-1 items that the book prints in Review 3
{
  const r1 = t13rv.tasks[0].items; const r3 = t13rv.tasks[2].items;
  r1[9].koFromBook = r3[0].prompt; r1[9].koFromBookSource = 'Review 3. item 1 (p59)';
  r1[10].koFromBook = r3[2].prompt; r1[10].koFromBookSource = 'Review 3. item 3 (p59)';
  r1[11].koFromBook = r3[9].prompt; r1[11].koFromBookSource = 'Review 3. item 10 (p59)';
}

// ====================================================================================
// TOPIC 14 태 (p62-66)
// ====================================================================================
const T14 = {
  printedLabel: L(62, E('TOPIC 14')).text, title: '태', printedTitle: L(62, E('태')).text,
  pages: [62, 66], continuesFromPrevRange: false, continuesIntoNextRange: false, sections: [],
};
const t14po = { kind: 'passOff', heading: L(62, E('1. Pass-Off Sentences')).text, page: 62,
  note: `능동태 7문장 목록 다음에 수동태 7문장 목록이 따로 인쇄되어 있고, 같은 순서끼리 짝(pairWith)이다.`, groups: [] };
t14po.groups.push(mkGroup(L(62, E('능동태')).text, [
  S(62, 'We make butter'), S(62, 'Some one cleans'), S(62, 'People never invite'), S(62, 'How do they make'),
  S(62, 'They have painted'), S(62, 'They are building'), S(62, E('I saw him run')),
], 'passOff 능동태'));
t14po.groups.push(mkGroup(L(62, E('수동태')).text, [
  S(62, 'Butter is made'), S(62, 'These rooms are cleaned'), S(62, 'I am never invited'), S(62, 'How is butter made'),
  S(62, 'The door has been'), S(62, 'Some houses are being'), S(62, 'He was seen to run'),
], 'passOff 수동태'));
t14po.groups[0].items.forEach((it, i) => { it.pairWith = t14po.groups[1].items[i].ref; t14po.groups[1].items[i].pairWith = it.ref; });
T14.sections.push(t14po);

const t14app = { kind: 'application', heading: L(63, E('2. Application Sentences')).text, page: 63,
  note: `쪽 전체가 괘선이 있는 2열 표다(머리행: 능동태 | 수동태). 같은 행끼리 짝이다. 13·14행, 15·16행은 왼쪽 능동태 문장이 같고 오른쪽에 다른 주어의 수동태가 온다(4형식 수동태 두 가지).`, groups: [] };
const hdrL = L(63, E('능동태')).text; const hdrR = L(63, E('수동태')).text;
const t14L = mkGroup(hdrL, [
  S(63, 'He painted the floor'), S(63, 'Jacob doesn’t draw'), S(63, 'She wrote the letter'), S(63, 'We make butter'),
  S(63, 'Cavin can use'), S(63, 'Mr. White didn’t write'), S(63, 'People speak English'), S(63, 'Some one cleans'),
  S(63, 'People never invite'), S(63, 'How do they make'), S(63, 'They have painted'), S(63, 'They are building'),
  S(63, O('My uncle gave me', 0)), S(63, O('My uncle gave me', 1)), S(63, O('He promised her', 0)), S(63, O('He promised her', 1)),
  S(63, 'My mother made me'), S(63, 'I saw him run'), S(63, 'They called him'), S(63, 'The news made me'),
], 'application 능동태(표 왼쪽 열)', { column: 'left' });
const t14R = mkGroup(hdrR, [
  S(63, 'The floor was painted'), S(63, 'This picture isn’t drawn'), S(63, 'The letter was written'), S(63, 'Butter is made'),
  S(63, 'This room can be used'), S(63, 'These books were not'), S(63, 'English is spoken'), S(63, 'These rooms are cleaned'),
  S(63, 'I am never invited'), S(63, 'How is butter made'), S(63, 'The door has been'), S(63, 'Some houses are being'),
  S(63, 'I was given this game'), S(63, 'This game player was given'), S(63, 'She was promised'), S(63, 'A new car was promised'),
  S(63, 'Chicken soup was made'), S(63, 'He was seen to run'), S(63, 'He was called Jack'), S(63, 'I was made happy'),
], 'application 수동태(표 오른쪽 열)', { column: 'right' });
t14L.items.forEach((it, i) => { it.row = i + 1; t14R.items[i].row = i + 1; it.pairWith = t14R.items[i].ref; t14R.items[i].pairWith = it.ref; });
t14app.groups.push(t14L, t14R);
t14app.table = { title: '2. Application Sentences 능동태·수동태 대조표 (p63)', ruled: true, columns: [hdrL, hdrR],
  rows: t14L.items.map((it, i) => [it.en, t14R.items[i].en]) };
T14.sections.push(t14app);
const RL = (r) => t14L.items[r - 1]; const RR = (r) => t14R.items[r - 1];

const t14rv = { kind: 'review', heading: L(64, E('Review')).text, page: 64, tasks: [] };
{
  const h = taskHead(64, '다음 문장을 보고 수동태나');
  const task = { no: h.no, page: 64, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['active_to_passive', 'passive_to_active', 'choose_direction'], printedItemNumbers: false,
    note: `1~4번은 능동태(→수동태), 5~8번은 수동태(→능동태)다. 방향 표시가 없어 학생이 스스로 판단해야 한다(extraSlot). 모든 문항이 Pass-Off 7쌍/Application 표에 있다.`,
    items: [] };
  const specs = ['We make butter', 'Some one cleans', 'They are building', 'I saw him run', 'I am never invited', 'How is butter made', 'The door has been', 'Some houses are being'];
  const ans = [RR(4), RR(8), RR(12), RR(18), RL(9), RL(10), RL(11), RL(12)];
  const ex = {
    2: { corrected: 'These rooms are cleaned every day.' },
    4: { note: `by me는 실제로는 흔히 생략하지만 변환 연습의 정답은 책대로 둔다(issues 참조).` },
    5: { acceptAlso: ['They never invite me to parties.', 'Nobody ever invites me to parties.'], note: `행위자가 없는 수동태 → 능동태: 일반 주어(People/They)를 학생이 정해야 한다.` },
    6: { acceptAlso: ['How do people make butter?', 'How do you make butter?'] },
    7: { acceptAlso: ['Someone has painted the door.', 'Somebody has painted the door.'] },
    8: { acceptAlso: ['People are building some houses near the river.'] },
  };
  specs.forEach((sp, i) => {
    const ri = mkRI('Review 1.', i + 1, 64, sp, 'en');
    const o = Object.assign({ extraSlot: '바꿀 방향을 스스로 판단(능동태→수동태 또는 수동태→능동태)', extraSlotAnswer: i < 4 ? '수동태로' : '능동태로' }, ex[i + 1] || {});
    answer(ri, ans[i], o);
    task.items.push(ri);
  });
  t14rv.tasks.push(task);
}
{
  const h = taskHead(65, '다음 문장들을 수동태로');
  const task = { no: h.no, page: 65, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['active_to_passive', 'double_object_passive', 'perception_causative_passive'], printedItemNumbers: false,
    note: `Application 표 왼쪽 열 20문장 전부를 같은 순서로 묻는다(p65 9문항, p66 11문항). 13~17번은 괄호 안에 수동태 주어가 지정되어 있다(hint).`,
    items: [] };
  const specs = [[65, 'He painted the floor'], [65, 'Jacob doesn’t draw'], [65, 'She wrote the letter'], [65, 'We make butter'], [65, 'Cavin can use'],
    [65, 'Mr. White didn’t write'], [65, 'People speak English'], [65, 'Some one cleans'], [65, 'People never invite'],
    [66, 'How do they make'], [66, 'They have painted'], [66, 'They are building'], [66, '(me를 주어로)'], [66, '(this game player를 주어로)'],
    [66, '(her을 주어로)'], [66, '(a new car를 주어로)'], [66, '(chicken soup을 주어로)'], [66, 'I saw him run'], [66, 'They called him'], [66, 'The news made me']];
  const ex = {
    2: { acceptAlso: ['This picture is not drawn by Jacob.'], note: `문제 문장의 현재 시제가 어색하다(issues 참조). 과거로 고치면 정답은 This picture wasn’t drawn by Jacob.` },
    6: { acceptAlso: ['These books weren’t written by Mr. White.'] },
    8: { corrected: 'These rooms are cleaned every day.' },
    11: { acceptAlso: ['The door has been painted by them.'] },
    12: { acceptAlso: ['Some houses are being built near the river by them.'] },
    13: { corrected: 'I was given this game player by my uncle.' },
    16: { corrected: 'A new car was promised to her by him.', note: `책 정답은 to me로 틀렸다(issues 참조).` },
    17: { corrected: 'Chicken soup was made for me by my mother.' },
    18: { acceptAlso: ['He was seen to run.'] },
    19: { acceptAlso: ['He was called Jack.'] },
  };
  specs.forEach(([p, sp], i) => {
    const ri = mkRI('Review 2.', i + 1, p, sp, 'en');
    answer(ri, RR(i + 1), ex[i + 1] || {});
    task.items.push(ri);
  });
  t14rv.tasks.push(task);
}
T14.sections.push(t14rv);

// ====================================================================================
// TOPIC 15 화법 (p67-71)
// ====================================================================================
const T15 = {
  printedLabel: L(67, E('TOPIC 15')).text, title: '화법', printedTitle: L(67, E('화  법')).text,
  pages: [67, 71], continuesFromPrevRange: false, continuesIntoNextRange: false, sections: [],
};
const t15po = { kind: 'passOff', heading: L(67, E('1. Pass-Off Sentences')).text, page: 67,
  note: `각 직접화법 문장(role=original) 아래에 '=>'로 간접화법 문장(role=transformed, 이탤릭 인쇄)이 1~2개 붙는다.`, groups: [] };
t15po.groups.push(mkGroup(L(67, '(1) 평서문과').text, [
  S(67, 'Rick says, “I’ll'), S(67, '=> Rick says that', { transformOf: 1 }),
  S(67, ['He says “ I want', 'And I want to serve']), S(67, ['=> He tells me that', 'Interpreter and he wants'], { transformOf: 3 }),
  S(67, 'Tom said “ Jim'), S(67, '=>Tom said that', { transformOf: 5 }),
], 'passOff (1) 평서문과 의문문 화법전환'));
t15po.groups.push(mkGroup(L(67, '(2) 의문문의').text, [
  S(67, 'He said to me ,”Is'), S(67, '=> He asked me if', { transformOf: 1 }),
  S(67, 'He said to me, “ What'), S(67, '=> He asked me what I', { transformOf: 3 }),
  S(67, '“ What shall I do'), S(67, '=> She asked me what she', { transformOf: 5 }),
], 'passOff (2) 의문문의 화법전환'));
t15po.groups.push(mkGroup(L(68, '(3) 명령문의').text, [
  S(68, '“ Stay in bed'), S(68, '=> The doctor told me', { transformOf: 1 }),
  S(68, '“Please don’t tell'), S(68, '=> Ann asked me', { transformOf: 3 }),
  S(68, 'Bill said, “Let’s'), S(68, '=> Bill suggested going', { transformOf: 5 }), S(68, '=> Bill suggested that', { transformOf: 5 }),
  S(68, 'He said to me “You’d'), S(68, '=> He advised me', { transformOf: 8 }),
  S(68, 'She asked to us'), S(68, '=> She asked us to be', { transformOf: 10 }),
], 'passOff (3) 명령문의 화법전환'));
t15po.groups.push(mkGroup(L(68, '(4) 감탄').text, [
  S(68, 'He said, “What a great'), S(68, '=> He said that it was', { transformOf: 1 }), S(68, '=> He cried out', { transformOf: 1 }),
  S(68, '“How deep your love'), S(68, '=> She told me how', { transformOf: 4 }), S(68, '=> She told me that', { transformOf: 4 }),
  S(68, 'Phillip said'), S(68, '=> Phillip cried', { transformOf: 7 }),
  S(68, 'He cried “Gosh'), S(68, '=> He cried with regret', { transformOf: 9 }),
  S(68, 'She said, “God bless'), S(68, '=> She prayed that', { transformOf: 11 }), S(68, '=> She prayed for', { transformOf: 11 }),
  S(68, 'He said, “May you'), S(68, '=> He expressed', { transformOf: 14 }),
], 'passOff (4) 감탄/기원문의 화법전환'));
T15.sections.push(t15po);

const t15app = { kind: 'application', heading: L(69, E('2. Application Sentences')).text, page: 69,
  note: `쪽이 두 열로 배치되어 있다(왼쪽 직접화법, 오른쪽 '- '로 시작하는 간접화법). 머리행·괘선은 없다. 같은 행끼리 짝이다. 답이 두 개인 문장은 왼쪽 직접화법을 두 번 인쇄했다(9·10, 13·14, 15·16, 17·18, 21·22행). 17·18행 Kenedy 문장은 Pass-Off에 없는 새 문장이다.`, groups: [] };
const t15L = mkGroup(null, [
  S(69, 'Rick says, “I’ll'), S(69, ['He says, ”I want', E('fire fighter, teacher, doctor, interpreter', 0), 'and I want to serve']),
  S(69, 'Tom said “Jim'), S(69, 'He said to me, “Is'), S(69, 'He said to me, “What'), S(69, '“What shall I do'),
  S(69, ['“Stay in bed', E('said to me.')]), S(69, ['“Please don’t tell', E('Ann said to me.')]),
  S(69, O('Bill said, “Let’s', 0)), S(69, O('Bill said, “Let’s', 1)), S(69, ['He said to me “You’d', E('late for church.”')]),
  S(69, 'She asked to us'), S(69, O('He said, “What a great', 0)), S(69, O('He said, “What a great', 1)),
  S(69, O('“How deep your love', 0)), S(69, O('“How deep your love', 1)), S(69, O('Kenedy said', 0)), S(69, O('Kenedy said', 1)),
  S(69, 'Phillip said'), S(69, 'He cried “Gosh'), S(69, O('She said, “God bless', 0)), S(69, O('She said, “God bless', 1)),
  S(69, 'He said, “May you'),
], `application 직접화법(왼쪽 열)${INF}`, { inferredLabel: '직접화법 (왼쪽 열)', column: 'left' });
const t15R = mkGroup(null, [
  S(69, '- Rick says that'), S(69, ['- He tells me that', E('fire fighter, teacher, doctor, interpreter', 1), 'and he wants to serve']),
  S(69, '- Tom said that'), S(69, '- He asked me if'), S(69, '- He asked me what'), S(69, '- She asked me what'), S(69, '- The doctor told'),
  S(69, ['- Ann asked me not', E('happened.')]), S(69, '- Bill suggested going'), S(69, '- Bill suggested that'), S(69, '- He advised me'),
  S(69, '- She asked us to be'), S(69, '- He said that it was'), S(69, '- He cried out'), S(69, '- She told me how'), S(69, '- She told me that'),
  S(69, '- Kenedy told me that I'), S(69, '- Kenedy told me that how'), S(69, '- Phillip cried'), S(69, '- He cried with regret'),
  S(69, '- She prayed that'), S(69, '- She prayed for'), S(69, '- He expressed'),
], `application 간접화법(오른쪽 열)${INF}`, { inferredLabel: '간접화법 (오른쪽 열)', column: 'right' });
const SUB15 = ['(1)', '(1)', '(1)', '(2)', '(2)', '(2)', '(3)', '(3)', '(3)', '(3)', '(3)', '(3)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)', '(4)'];
t15L.items.forEach((it, i) => {
  const r = t15R.items[i];
  it.row = i + 1; r.row = i + 1; it.pairWith = r.ref; r.pairWith = it.ref;
  it.inferredSubPoint = SUB15[i]; r.inferredSubPoint = SUB15[i];
});
t15app.groups.push(t15L, t15R);
t15app.table = { title: '2. Application Sentences 직접화법→간접화법 두 열 배치 (p69, 머리행·괘선 없음)', ruled: false,
  columns: ['직접화법 (왼쪽 열, 머리행 인쇄 안 됨)', '간접화법 (오른쪽 열, 머리행 인쇄 안 됨)'],
  rows: t15L.items.map((it, i) => [it.en, t15R.items[i].en]) };
T15.sections.push(t15app);
const DR = (r) => t15R.items[r - 1];

const t15rv = { kind: 'review', heading: L(70, E('Review')).text, page: 70, tasks: [] };
{
  const h = taskHead(70, '다음 문장을 간접화법으로');
  const task = { no: h.no, page: 70, instruction: h.instruction, instructionRaw: h.instructionRaw,
    taskTypes: ['direct_to_indirect_speech'], printedItemNumbers: false,
    note: `Application의 서로 다른 직접화법 18문장을 한 번씩 묻는다(순서는 조금 섞임). 정답은 Application 오른쪽 열. that 생략(Rick says he’ll be back soon.)과 축약/비축약 차이는 웹 채점에서 허용해야 한다.`,
    items: [] };
  const specs = [[70, 'Rick says, “I’ll'], [70, ['He says, ”I want', 'and I want to serve']], [70, 'He said to me, “What'], [70, '“What shall I do'],
    [70, '“Stay in bed'], [70, 'Tom said, “ Jim'], [70, '“Please don’t tell'], [70, 'Bill said'], [70, 'He said to me “You’d'], [70, 'He said to me ,”Is'],
    [71, 'She asked to us'], [71, 'He said, “What a great'], [71, '“How deep your'], [71, 'Kenedy said'], [71, 'Phillip said'], [71, 'He cried “Gosh'],
    [71, 'She said, “God bless'], [71, 'He said, “May you']];
  const ans = [1, 2, 5, 6, 7, 3, 8, 9, 11, 4, 12, 13, 15, 17, 19, 20, 21, 23];
  const alt = { 8: [10], 12: [14], 13: [16], 14: [18], 17: [22] };
  const ex = {
    2: { corrected: 'He says that he wants to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and that he wants to serve the community.',
      acceptAlso: ['He tells me that he wants to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and that he wants to serve the community.'],
      note: `책 정답은 듣는 사람이 없는 문장을 He tells me로 바꾸었고 나열에 관사·or가 없다(issues 참조). acceptAlso는 STUDENT s3-4 형태.` },
    5: { corrected: 'The doctor told me to stay in bed for a few days.', note: `책 정답은 for a few days를 빠뜨렸다.` },
    8: { acceptAlso: ['Bill suggested that we go to the movies.', 'Bill suggested that we should go to the movies.'] },
    11: { note: `문제 문장 She asked to us … 자체가 비문이다(issues 참조). 정답 She asked us to be quiet.는 맞다.` },
    12: { corrected: 'He exclaimed what a great movie it was.', acceptAlso: ['He exclaimed that it was a really great movie.', 'He said that it was a really great movie.'], note: `책 정답 very great movie는 어색하다(issues 참조).` },
    13: { acceptAlso: ['She exclaimed how deep my love was.'], note: `듣는 사람이 '나'라고 가정한 답이다(issues 참조).` },
    14: { acceptAlso: ['Kenedy told me how stupid I was.', 'Kenedy exclaimed how stupid I was.'], correctedAlt: ['Kenedy told me how stupid I was.'], note: `책의 두 번째 답 Kenedy told me that how stupid I was..는 비문이다(issues 참조). correctedAltAnswers가 그 교정안.` },
    16: { note: `Gosh!를 '후회'로 옮기는 근거가 약하다(issues 참조).` },
    18: { acceptAlso: ['He expressed his wish that I might succeed.', 'He prayed that I might succeed.'], note: `듣는 사람이 정해지지 않아 you를 I/we 중 무엇으로 바꿀지 정답이 하나로 정해지지 않는다(issues 참조).` },
  };
  specs.forEach(([p, sp], i) => {
    const ri = mkRI('Review 1.', i + 1, p, sp, 'en');
    const o = Object.assign({}, ex[i + 1] || {});
    if (alt[i + 1]) o.alt = alt[i + 1].map(DR);
    answer(ri, DR(ans[i]), o);
    ri.directSource = t15L.items[ans[i] - 1].ref;
    task.items.push(ri);
  });
  t15rv.tasks.push(task);
}
T15.sections.push(t15rv);

// ====================================================================================
// Cross links: passOff -> application, STUDENT source sentences
// ====================================================================================
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const VARIANT = {
  'passOff (2) 분사 item 7': `application (2) 분사${INF} item 10`,
  'passOff 3) 동명사 item 1': `application (3) 동명사${INF} item 1`,
  'passOff 3) 동명사 item 2': `application (3) 동명사${INF} item 2`,
};
for (const T of [T13, T14, T15]) {
  const po = T.sections.find((s) => s.kind === 'passOff');
  const app = T.sections.find((s) => s.kind === 'application');
  const appItems = app.groups.flatMap((g) => g.items);
  for (const it of po.groups.flatMap((g) => g.items)) {
    const hits = appItems.filter((a) => norm(a.en) === norm(it.en));
    if (hits.length) {
      it.appRef = hits[0].ref;
      if (hits.length > 1) it.appRefsAll = hits.map((h) => h.ref);
    } else if (VARIANT[it.ref]) {
      it.appRef = null;
      it.appVariant = VARIANT[it.ref];
      it.appVariantText = appItems.find((a) => a.ref === VARIANT[it.ref]).en;
    } else {
      it.appRef = null;
    }
    // review refs & Korean via application twin
    const twin = appItems.find((a) => a.ref === (it.appRef || it.appVariant));
    if (twin) {
      if (twin.koFromReview && !it.koFromReview) { it.koFromReview = twin.koFromReview; it.koFromReviewSource = twin.koFromReviewSource; }
      if (twin.reviewRefs) it.reviewRefs = Array.from(new Set([...(it.reviewRefs || []), ...twin.reviewRefs]));
    }
  }
  appItems.forEach((a, i) => { a.globalN = i + 1; });
}

// STUDENT course sources (read-only lookup)
const STUDENT_MAP = [
  { key: 'So now I want to become a teacher', lesson: 's6-4' },
  { key: 'so many fun things to do there', lesson: 's20-5' },
  { key: 'patience in order to teach them', lesson: 's14-3' },
  { key: 'happy to learn new things', lesson: 's10-3' },
  { key: 'brave and confident as', lesson: 's13-3', skey: 'brave and confident' },
  { key: 'allow us to watch a lot of TV', lesson: 's8-4' },
  { key: 'help other learn and grow', lesson: 's14-2', skey: 'help others learn and grow' },
  { key: 'While the teacher is conducting', lesson: 's5-3', skey: 'conducting the morning session' },
  { key: 'As I am walking to school', lesson: 's5-2' },
  { key: 'goes shopping with my mother', lesson: 's2-4' },
  { key: 'Getting ready for school is', lesson: 's5-1', skey: 'Getting ready for school is the hardest' },
  { key: 'My hobbies include', lesson: 's1-4' },
  { key: 'excellent at teaching exactly', lesson: 's14-2' },
  { key: 'tells me that he wants to be a police officer', lesson: 's3-4', skey: 'wants to be a police officer' },
];
const lessonCache = {};
function studentLookup(m) {
  if (!lessonCache[m.lesson]) lessonCache[m.lesson] = JSON.parse(fs.readFileSync(path.join(REPO, 'content', 'lessons', 'student', `${m.lesson}.json`), 'utf8'));
  const j = lessonCache[m.lesson];
  const sent = j.blocks.find((b) => b.type === 'sentences');
  const idx = sent.items.findIndex((x) => x.text.includes(m.skey || m.key));
  if (idx < 0) throw new Error('STUDENT sentence not found ' + JSON.stringify(m));
  const ko = j.blocks.filter((b) => b.type === 'paragraph' && b.lang === 'ko');
  return { lesson: m.lesson, chapter: Number(m.lesson.split('-')[0].slice(1)), n: sent.items[idx].n, en: sent.items[idx].text,
    ko: ko.length === sent.items.length ? ko[idx].text : null };
}
for (const T of [T13, T15]) {
  for (const sec of T.sections.filter((s) => s.groups)) {
    for (const it of sec.groups.flatMap((g) => g.items)) {
      if (it.role === 'transformed' && !it.en.includes('tells me that')) continue;
      const m = STUDENT_MAP.find((x) => it.en.includes(x.key));
      if (!m) continue;
      it.studentSource = studentLookup(m);
      if (it.lessonRef !== null && it.lessonRef !== it.studentSource.chapter) it.lessonRefMismatch = `책은 (${it.lessonRef}과), 실제 문장은 ${it.studentSource.chapter}과 ${m.lesson}`;
    }
  }
}

// ====================================================================================
// Issues
// ====================================================================================
const ISSUES = [
  // ---- TOPIC 13 준동사
  { page: 52, where: 'passOff (1) 부정사 item 13 · application (1) item 24(p55) · Review 1 item 12(p57) · Review 3 item 10 정답', text: 'I want to be able to help other learn and grow, too.', type: 'english_grammar',
    problem: `other는 여기서 '다른 사람들'이라는 대명사이므로 복수형 others여야 한다. STUDENT s14-2 원문도 help others learn and grow다. 같은 오류가 네 곳에 인쇄되어 학생이 틀린 문장을 외우게 된다.`,
    fix: 'I want to be able to help others learn and grow, too.', confidence: 'high', severity: 'high' },
  { page: 55, where: 'application (1) item 24 lessonRef', text: 'I want to be able to help other learn and grow , too. (6과)', type: 'layout_or_extraction',
    problem: `과 번호가 틀렸다. 이 문장은 6과가 아니라 14과(STUDENT s14-2 4번 문장)에 있다. grow 뒤 쉼표 앞에 공백도 들어가 있다.`,
    fix: 'I want to be able to help others learn and grow, too. (14과)', confidence: 'high', severity: 'medium' },
  { page: 54, where: 'application (1) item 12 lessonRef', text: 'I must have a lot of patience in order to teach them. (16과)', type: 'layout_or_extraction',
    problem: `과 번호가 틀렸다. 이 문장은 16과가 아니라 14과 STUDENT s14-3 4번 문장(I think teaching children is fun and rewarding, and that I must have a lot of patience in order to teach them.)의 뒷부분이다.`,
    fix: '(14과)', confidence: 'high', severity: 'medium' },
  { page: 52, where: 'passOff (2) 분사 item 1 · application (2) item 1(p55) · Review 3 item 14 정답', text: 'While the teacher is conducting for morning session, the students are very noisy.', type: 'english_grammar',
    problem: `conduct(진행하다)는 타동사라 for가 필요 없고, 특정한 아침 조회이므로 관사 the가 필요하다. STUDENT s5-3과 옛 MIDDLE 원문 모두 conducting the morning session이다.`,
    fix: 'While the teacher is conducting the morning session, the students are very noisy.', confidence: 'high', severity: 'high' },
  { page: 52, where: 'passOff (2) 분사 item 2 · application (2) item 2(p55)', text: '=>While the teacher conducting for morning session, the students are very noisy.', type: 'grammar_explanation_wrong',
    problem: `분사구문 전환 예시가 틀렸다. 부사절 주어(the teacher)와 주절 주어(the students)가 다르므로 주어를 남기는 독립분사구문이 되어야 하고, 이때 접속사 While은 빼고 is를 분사로 바꾼다. 'While + 주어 + -ing' 형태는 비문이다. 바로 아래 Walking to school 예(주어가 같은 경우)와 대비해 가르쳐야 할 핵심 차이를 거꾸로 보여 준다.`,
    fix: 'The teacher conducting the morning session, the students are very noisy. (주어가 다르면 주어를 남기는 독립분사구문)', confidence: 'high', severity: 'high' },
  { page: 52, where: 'passOff (2) 분사 item 7 · application (2) item 10(p55) · Review 3 item 21 정답', text: 'I saw a soldier wounded on the battle filed.', type: 'english_grammar',
    problem: `p52의 filed는 field의 오타다. p55 Application은 battle field로 되어 있으나 표준 표기는 한 단어 battlefield다.`,
    fix: 'I saw a soldier wounded on the battlefield.', confidence: 'high', severity: 'medium' },
  { page: 53, where: 'passOff 3) 동명사 item 1', text: 'Getting ready for school is hardest part of my day.', type: 'english_grammar',
    problem: `최상급 hardest 앞에 the가 빠졌다. p56 Application과 STUDENT s5-1 원문은 the hardest part다.`,
    fix: 'Getting ready for school is the hardest part of my day.', confidence: 'high', severity: 'high' },
  { page: 53, where: 'passOff 3) 동명사 item 2 ↔ application (3) item 2(p56) ↔ Review 3 item 24(p61)', text: 'My hobbies include reading books, listening to music, watching movies', type: 'translation_mismatch',
    problem: `Pass-Off 판에는 hiking이 빠져 있다. Application 판(p56), STUDENT s1-4 원문, Review 한국어(등산하기)에는 모두 있다. 같은 문장이 두 모양으로 인쇄되어 있다.`,
    fix: 'My hobbies include reading books, listening to music, hiking, watching movies, and participating in sports.', confidence: 'high', severity: 'low' },
  { page: 53, where: 'passOff 소제목', text: '3) 동명사', type: 'layout_or_extraction',
    problem: `다른 소제목은 (1) (2) (4)인데 이것만 여는 괄호가 빠졌다.`, fix: '(3) 동명사', confidence: 'high', severity: 'low' },
  { page: 53, where: 'passOff 3) 동명사 item 4 · application (3) item 4(p56) · Review 3 item 26', text: 'I saw him running away.', type: 'grammar_explanation_wrong',
    problem: `동명사 묶음에 들어 있지만 running은 지각동사 see의 목적격 보어로 쓰인 현재분사다(see + 목적어 + -ing). 동명사 예문으로 가르치면 분사와 동명사를 구별하는 핵심을 거꾸로 배운다.`,
    fix: '(2) 분사로 옮긴다. 동명사 자리에는 예: Running away is not the answer.', confidence: 'high', severity: 'high' },
  { page: 52, where: 'passOff (2) 분사 item 8 · application (2) item 11(p56)', text: 'He often goes shopping with my mother.', type: 'grammar_explanation_wrong',
    problem: `분사 묶음에 들어 있다. go -ing(~하러 가다)는 문법서에 따라 분사로도 동명사로도 보지만, 국내 학교 문법은 보통 '동명사 관용표현'으로 가르친다. 분류 근거가 없어서 다른 교재와 충돌한다.`,
    fix: '(4) 관용표현(go -ing: ~하러 가다)으로 옮기거나 분류 설명을 붙인다.', confidence: 'low', severity: 'low' },
  { page: 52, where: 'passOff (1) 부정사 item 11 · application (1) item 16(p54) · Review 3 item 2(p59)', text: 'I hope to grow up to be as brave and confident as General Soon-shin Lee.', type: 'english_unnatural',
    problem: `이순신은 수군 지휘관이라 영어로는 Admiral이 맞고, 표준 로마자 표기는 Yi Sun-sin이다. 사이트 STUDENT s13-3은 이미 One day, I hope to grow up to be as brave and confident as Admiral Yi Sun-sin.으로 되어 있어 책과 사이트가 다르다.`,
    fix: 'I hope to grow up to be as brave and confident as Admiral Yi Sun-sin.', confidence: 'high', severity: 'medium' },
  { page: 52, where: 'passOff (1) 부정사 item 3', text: 'To live is to fight', type: 'english_grammar',
    problem: `문장 끝 마침표가 빠졌다(p54 Application에는 있다).`, fix: 'To live is to fight.', confidence: 'high', severity: 'low' },
  { page: 54, where: 'application (1) item 8', text: 'Are you ready to win the test?', type: 'english_unnatural',
    problem: `시험(test)은 win하는 대상이 아니다(win은 경기·대회). 시험은 take(치르다)나 pass(통과하다)를 쓴다. Review에도 없어 한국어 번역도 책에 없다.`,
    fix: 'Are you ready to take the test?', confidence: 'high', severity: 'medium' },
  { page: 54, where: 'application (1) item 4', text: 'Kira needs to listen to more computer lessons.', type: 'english_unnatural',
    problem: `수업(lessons)은 보통 listen to가 아니라 take한다. Review에도 없어 한국어 번역이 책에 없다.`,
    fix: 'Kira needs to take more computer lessons.', confidence: 'medium', severity: 'low' },
  { page: 54, where: 'application (1) item 19 ↔ Review 3 item 5(p59)', text: 'Mary asks me to be a captain of the team.', type: 'translation_mismatch',
    problem: `Review 한국어는 '메리는 내가 그 팀의 대장이 되어달라고 부탁했다.'(과거)인데 영어는 현재형 asks다. 한 팀의 주장은 한 명이므로 a captain보다 the captain이 자연스럽다.`,
    fix: 'Mary asked me to be the captain of the team.', confidence: 'high', severity: 'medium' },
  { page: 54, where: 'application (1) item 15 · passOff (1) item 10(p52) · Review 1 item 10(p57) · Review 3 item 1(p59)', text: 'You will be happy to follow my advice.', type: 'english_unnatural',
    problem: `책은 to부정사의 '조건' 용법으로 '너는 내 충고를 따른다면 행복할 거야'라고 번역하지만, 원어민은 be happy to를 '기꺼이 ~하다'로 읽어 '너는 기꺼이 내 충고를 따를 것이다'로 이해한다. 조건 용법 예문으로는 오해를 부른다.`,
    fix: '조건 뜻: You will be happy if you follow my advice. (조건 용법 예문이 필요하면 To hear him speak, you would think he was American. 같은 전형 예문으로 교체)', confidence: 'medium', severity: 'medium' },
  { page: 52, where: 'passOff (1) 부정사 item 9 · application (1) item 14(p54) · Review 1 item 9(p57)', text: 'He cannot be honest to do such a thing.', type: 'english_unnatural',
    problem: `국내 문법서의 '판단의 근거' 전형 예문이지만 원어민에게는 부자연스럽게 들린다. 판단의 근거 용법은 must be ~ to 형태가 자연스럽다.`,
    fix: 'He must be dishonest to do such a thing. (또는 He can’t be honest if he did such a thing.)', confidence: 'low', severity: 'low' },
  { page: 55, where: 'application (1) item 22 ↔ Review 3 item 8(p59)', text: 'The music was too loud to answer the phone.', type: 'translation_mismatch',
    problem: `Review 한국어 '전화 받기에 그 음악은 너무 시끄럽다.'는 현재형, 영어는 과거형 was다. to answer의 의미상 주어가 없어 음악이 전화를 받는 것처럼 읽힐 수도 있다.`,
    fix: '영어: The music was too loud for me to answer the phone. / 한국어: 음악이 너무 시끄러워서 나는 전화를 받을 수 없었다.', confidence: 'medium', severity: 'low' },
  { page: 55, where: 'application (2) item 6 ↔ Review 3 item 17(p60)', text: 'Lobby is a really interesting person.', type: 'english_unnatural',
    problem: `lobby는 건물 현관을 뜻하는 일반명사라 사람 이름으로 어색하다. 한국어 '로비'에 맞는 이름은 Robby(Robbie)다.`,
    fix: 'Robby is a really interesting person.', confidence: 'medium', severity: 'low' },
  { page: 57, where: 'Review 1 item 4 굵은 글씨 범위', text: 'He seems to be honest.', type: 'layout_or_extraction',
    problem: `굵은 글씨가 seems to까지만 걸려 있다(be honest는 보통 글씨). 굵은 부분만 해석하는 과제인데 seems to만 따로 해석할 수 없고, 해석 단위는 seems to be honest(정직한 것 같다)다.`,
    fix: 'seems to be honest 전체를 굵게 표시한다.', confidence: 'medium', severity: 'low' },
  { page: 57, where: 'Review 1 전체(12문항)', text: '1. 다음 문장을 보고 굵게 쓰여진 부분의 해석을 적어보세요.', type: 'answer_missing',
    problem: `정답이 한국어 해석인데 책에 정답이 없다. 12문항 중 3문항(item 10·11·12)만 Review 3의 한국어로 뜻을 확인할 수 있고, 나머지 9문항은 책 어디에도 한국어가 없다.`,
    fix: '이 파일의 proposedAnswer(굵은 부분 해석)와 proposedFullKo(문장 전체 해석)를 정답으로 쓴다.', confidence: 'high', severity: 'medium' },
  { page: 58, where: 'Review 2 item 8 · 쪽 왼쪽 아래', text: '나의 아들은 수학을 공부하느라고 바쁘다', type: 'korean_typo',
    problem: `문장 끝 마침표가 빠졌고, 쪽 왼쪽 아래(마지막 밑줄 칸 아래)에 떨어진 마침표 하나가 따로 인쇄되어 있다.`,
    fix: '나의 아들은 수학을 공부하느라고 바쁘다.', confidence: 'high', severity: 'low' },
  { page: 58, where: 'Review 2 item 6', text: '쏟아진 우유를 두고 울어도 소용 없다.', type: 'korean_typo',
    problem: `'소용없다'는 한 단어(형용사)라 붙여 쓴다.`, fix: '쏟아진 우유를 두고 울어도 소용없다.', confidence: 'high', severity: 'low' },
  { page: 58, where: 'Review 2 item 4', text: '일기 예보로 판단하건대, 오늘 밤에 비가 많이 올 것이다.', type: 'korean_typo',
    problem: `'일기예보'는 한 단어로 붙여 쓴다.`, fix: '일기예보로 판단하건대, 오늘 밤에 비가 많이 올 것이다.', confidence: 'medium', severity: 'low' },
  { page: 58, where: 'Review 2 item 3 · 4 · 5 · 6 · 7 빈칸', text: 'I could ________________________________________when she announced the wrong reports.', type: 'answer_ambiguous',
    problem: `빈칸 정답이 하나가 아니다. item 5는 not help laughing 외에 not help but laugh·not but laugh도 맞고, item 3은 Considering his age, item 4는 Judging by the weather forecast, item 6은 no good crying, item 7은 worthy of being read도 가능하다. 책은 정답을 인쇄하지 않았다.`,
    fix: '웹 채점에 허용 답 목록을 둔다(이 파일 acceptAlso).', confidence: 'medium', severity: 'low' },
  { page: 59, where: 'Review 3 item 2', text: '나는 이 순신 장군만큼 용감하고 자신감 있도록 자라기를 소망한다.', type: 'korean_typo',
    problem: `사람 이름 '이순신'을 띄어 썼다. '자신감 있도록 자라기를'도 어색하다.`,
    fix: '나는 이순신 장군처럼 용감하고 자신감 있는 사람으로 자라기를 바란다.', confidence: 'high', severity: 'low' },
  { page: 59, where: 'Review 3 item 3', text: '나의 어머니는 우리가 많은 TV를 보는 것을 허락하지 않으신다.', type: 'translation_mismatch',
    problem: `'많은 TV'는 'TV 여러 대'로 읽힌다. a lot of TV는 'TV를 많이'라는 뜻이다.`,
    fix: '나의 어머니는 우리가 TV를 많이 보는 것을 허락하지 않으신다.', confidence: 'high', severity: 'low' },
  { page: 59, where: 'Review 3 item 4', text: '데이빗은 내가 그의 집으로 오도록 초대했다.', type: 'korean_typo',
    problem: `외래어 표기법상 David는 '데이비드'로 적는다.`, fix: '데이비드는 나를 자기 집에 오라고 초대했다.', confidence: 'medium', severity: 'low' },
  { page: 59, where: 'Review 3 item 10', text: '나는 다른 사람들이 배우고 성장하도록 도울 수 있기를 원한다.', type: 'translation_mismatch',
    problem: `정답 영어 끝의 too(나도, 또한)가 한국어에 없다. 웹 채점에서 too가 있든 없든 정답 처리해야 한다.`,
    fix: '나도 다른 사람들이 배우고 성장하도록 도울 수 있기를 원한다.', confidence: 'medium', severity: 'low' },
  { page: 60, where: 'Review 3 item 18', text: '우리는 그 사진에서 불 타는 집을 볼 수 있다.', type: 'korean_typo',
    problem: `'불타다'는 한 단어라 붙여 쓴다.`, fix: '우리는 그 사진에서 불타는 집을 볼 수 있다.', confidence: 'high', severity: 'low' },
  { page: 60, where: 'Review 3 item 19', text: '그녀는 즐겁게 노래를 부르면서 앉았다.', type: 'translation_mismatch',
    problem: `She sat singing merrily.는 '노래를 부르며 앉아 있었다'(상태)라는 뜻이다. '앉았다'는 앉는 동작으로 읽혀, 분사가 주격 보어로 쓰인 뜻이 전달되지 않는다.`,
    fix: '그녀는 즐겁게 노래를 부르며 앉아 있었다.', confidence: 'medium', severity: 'low' },
  { page: 60, where: 'Review 3 item 15', text: '학교로 걸어갈 때, 나는 내 친구들을 자주 만난다.', type: 'answer_ambiguous',
    problem: `책에 정답 후보가 두 개 인쇄되어 있다: As I am walking to school, I often see my friends.와 분사구문 Walking to school, I often see my friends. 둘 다 맞다.`,
    fix: '두 문장 모두 정답으로 허용한다.', confidence: 'high', severity: 'low' },
  { page: 61, where: 'Review 3 item 23', text: '등교 준비는 나의 날의 가장 힘든 부분이다.', type: 'translation_mismatch',
    problem: `'나의 날의'는 my day를 직역한 어색한 한국어다.`, fix: '등교 준비는 내 하루 중 가장 힘든 일이다.', confidence: 'medium', severity: 'low' },
  { page: 61, where: 'Review 3 item 24', text: '내 취미는 책 읽기, 음악듣기, 등산하기,', type: 'korean_typo',
    problem: `'책 읽기'는 띄었는데 '음악듣기'·'영화보기'는 붙여 써서 일관성이 없다(명사구라 띄어 쓴다).`,
    fix: '내 취미는 책 읽기, 음악 듣기, 등산하기, 영화 보기 그리고 스포츠에 참가하기이다.', confidence: 'medium', severity: 'low' },
  { page: 61, where: 'Review 3 item 27', text: '그녀는 우리가 알아야 할 것을 정확하게 가르쳐 주는 것이 훌륭하다.', type: 'translation_mismatch',
    problem: `be excellent at -ing는 '~을 아주 잘한다'는 뜻인데 '~하는 것이 훌륭하다'는 어색하고 뜻이 흐려진다.`,
    fix: '그녀는 우리가 알아야 할 것을 정확하게 가르치는 데 뛰어나다.', confidence: 'medium', severity: 'low' },
  // ---- TOPIC 14 태
  { page: 62, where: 'passOff 능동태 item 2 · 수동태 item 2 · application row 8 양쪽(p63) · Review 1 item 2(p64) · Review 2 item 8(p65)', text: 'Some one cleans these rooms everyday.', type: 'english_grammar',
    problem: `'누군가'는 한 단어 someone이다. everyday는 '일상적인'이라는 형용사이고 '매일'이라는 부사로는 두 단어 every day를 써야 한다. 수동태 These rooms are cleaned everyday.도 같다. 이 한 쌍이 여섯 곳에 반복 인쇄된다.`,
    fix: 'Someone cleans these rooms every day. → These rooms are cleaned every day.', confidence: 'high', severity: 'high' },
  { page: 62, where: 'passOff 능동태 item 7', text: 'I saw him run', type: 'english_grammar',
    problem: `문장 끝 마침표가 빠졌다(p63 표에는 있다).`, fix: 'I saw him run.', confidence: 'high', severity: 'low' },
  { page: 63, where: 'application row 16 수동태 · Review 2 item 16 정답(p66)', text: 'A new car was promised to me by him.', type: 'english_grammar',
    problem: `능동태 He promised her a new car.의 간접목적어는 her인데 수동태에서 to me로 바뀌었다. 정답 자체가 틀렸다.`,
    fix: 'A new car was promised to her by him.', confidence: 'high', severity: 'high' },
  { page: 63, where: 'application row 13 수동태 · Review 2 item 13 정답', text: 'I was given this game player by my uncle..', type: 'english_grammar',
    problem: `마침표가 두 개 찍혀 있다.`, fix: 'I was given this game player by my uncle.', confidence: 'high', severity: 'low' },
  { page: 63, where: 'application row 17 수동태 · Review 2 item 17 정답(p66)', text: 'Chicken soup was made for me by Mom.', type: 'grammar_explanation_wrong',
    problem: `능동태 주어 My mother가 수동태에서 Mom으로 바뀌었다. 태 전환 연습에서는 행위자를 원문 그대로 옮겨야 하고, 학생이 by my mother라고 쓰면 오답처럼 보인다.`,
    fix: 'Chicken soup was made for me by my mother.', confidence: 'medium', severity: 'low' },
  { page: 63, where: 'application row 2 양쪽 · Review 2 item 2(p65)', text: 'Jacob doesn’t draw this picture.', type: 'english_unnatural',
    problem: `특정한 그림 한 장(this picture)에 현재 시제(습관)를 쓰면 어색하다. 과거가 자연스럽다.`,
    fix: 'Jacob didn’t draw this picture. → This picture wasn’t drawn by Jacob.', confidence: 'medium', severity: 'low' },
  { page: 62, where: 'passOff 수동태 item 7 · application row 18·19·20 수동태(p63) · Review 1 item 4 · Review 2 item 18~20 정답', text: 'He was seen to run by me.', type: 'english_unnatural',
    problem: `변환 규칙(지각동사 수동태에서 원형부정사 → to부정사)은 맞지만 by me·by them처럼 뻔한 행위자는 실제로 거의 쓰지 않는다. I was made happy by the news.도 문법상 가능하나 원어민은 거의 쓰지 않는다. 시험용 변환 연습이라는 점을 밝혀야 한다.`,
    fix: 'He was seen to run (by me). / He was called Jack (by them). — 괄호 속 행위자는 생략 가능하다고 설명한다.', confidence: 'low', severity: 'low' },
  { page: 64, where: 'Review 1 item 5~8 (수동태 → 능동태)', text: 'I am never invited to parties.', type: 'answer_ambiguous',
    problem: `행위자(by ~)가 없는 수동태를 능동태로 바꿀 때 주어를 학생이 정해야 해서 정답이 여러 개다(People / They never invite me to parties. 등). 책의 짝 문장은 하나만 보여 준다.`,
    fix: 'People, They, Someone 같은 일반 주어를 모두 정답으로 허용한다.', confidence: 'high', severity: 'low' },
  { page: 66, where: 'Review 2 item 15 조건 괄호', text: 'He promised her a new car. (her을 주어로)', type: 'korean_typo',
    problem: `her는 [허]로 읽혀 모음으로 끝나므로 조사는 '를'이 자연스럽다.`, fix: '(her를 주어로)', confidence: 'low', severity: 'low' },
  { page: 63, where: 'application row 5 · Review 2 item 5', text: 'Cavin can use this room.', type: 'english_unnatural',
    problem: `Cavin은 매우 드문 이름이라 Kevin·Gavin·Calvin의 오타일 수 있다.`, fix: 'Kevin can use this room. → This room can be used by Kevin.', confidence: 'low', severity: 'low' },
  // ---- TOPIC 15 화법
  { page: 67, where: 'passOff 소제목 (1)', text: '(1) 평서문과 의문문 화법전환', type: 'grammar_explanation_wrong',
    problem: `(1)에는 평서문 세 문장만 있고 의문문은 바로 다음 (2) 의문문의 화법전환에서 다룬다. 소제목이 내용과 다르다.`,
    fix: '(1) 평서문의 화법전환', confidence: 'high', severity: 'low' },
  { page: 67, where: 'passOff (1) item 3 · application 왼쪽 row 2(p69) · Review item 2(p70)', text: 'He says “ I want to be a police officer, fire fighter, teacher, doctor, interpreter.', type: 'english_grammar',
    problem: `p67: says 뒤 쉼표가 없고 여는 따옴표 뒤에 공백이 있으며, 두 번째 문장 And I want to serve the community. 뒤에 닫는 따옴표가 없다. p69·p70: 여는 따옴표가 닫는 모양(”)이다. 모든 판에서 직업 나열에 관사와 or가 없다(STUDENT s3-4: a police officer, a firefighter, a teacher, a doctor, or an interpreter). fire fighter는 한 단어 firefighter가 표준이다.`,
    fix: 'He says, “I want to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and I want to serve the community.”', confidence: 'high', severity: 'medium' },
  { page: 67, where: 'passOff (1) item 4 · application 오른쪽 row 2(p69) · Review item 2 정답', text: 'Interpreter and he wants to serve the community.(3과)', type: 'grammar_explanation_wrong',
    problem: `직접화법 He says “…”에는 듣는 사람(to me)이 없는데 간접화법이 He tells me로 바뀌었다(says는 says 그대로가 원칙). p67은 문장 중간의 Interpreter를 대문자로 썼다. 두 번째 절은 and that he wants로 that을 되풀이해야 전달 내용임이 분명하다. STUDENT s3-4 원문은 He/She sometimes tells me that … or an interpreter, and that he/she wants to serve the community.다.`,
    fix: 'He says that he wants to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and that he wants to serve the community.', confidence: 'high', severity: 'medium' },
  { page: 67, where: 'passOff (1) item 5 · (2) item 1 · (3) item 8 · (4) item 9 및 application·Review의 같은 문장', text: 'Tom said “ Jim is sick.”', type: 'english_grammar',
    problem: `전달동사 뒤 인용문 앞 쉼표가 빠졌다: Tom said “…”(p67·p69), He said to me “You’d better…”(p68·p69·p70), He cried “Gosh!…”(p68·p69·p71). He said to me ,”Is your mother in?”(p67·p70)는 쉼표 앞에 공백이 있고 여는 따옴표가 닫는 모양이다. “ Jim, “ What, “ Stay처럼 여는 따옴표 뒤에 공백이 있는 곳도 많다.`,
    fix: 'Tom said, “Jim is sick.” / He said to me, “You’d better not be late for church.” / He cried, “Gosh! The plane has taken off.” / He said to me, “Is your mother in?”', confidence: 'high', severity: 'low' },
  { page: 68, where: 'passOff (3) item 10 · application 왼쪽 row 12(p69) · Review item 11(p71)', text: 'She asked to us “Would you be quiet, please?”', type: 'english_grammar',
    problem: `ask는 전치사 to 없이 목적어를 바로 받는다(ask us). 직접화법 전달부는 said to us가 자연스럽다.`,
    fix: 'She said to us, “Would you be quiet, please?”', confidence: 'high', severity: 'high' },
  { page: 68, where: 'passOff (3) item 2 · application 오른쪽 row 7(p69) · Review item 5 정답', text: '=> The doctor told me to stay in bed.', type: 'grammar_explanation_wrong',
    problem: `직접화법의 for a few days가 간접화법에서 사라졌다. 화법 전환은 내용을 빠뜨리면 안 되므로 정답이 불완전하다.`,
    fix: 'The doctor told me to stay in bed for a few days.', confidence: 'high', severity: 'medium' },
  { page: 68, where: 'passOff (4) item 1 · application 왼쪽 row 13·14(p69) · Review item 12(p71)', text: 'He said, “What a great movie it is!', type: 'english_grammar',
    problem: `닫는 따옴표가 없다(네 곳 모두).`, fix: 'He said, “What a great movie it is!”', confidence: 'high', severity: 'medium' },
  { page: 68, where: 'passOff (4) item 2 · application 오른쪽 row 13(p69) · Review item 12 정답', text: '=> He said that it was a very great movie.', type: 'english_unnatural',
    problem: `great(대단한)는 very와 잘 어울리지 않는 강조 형용사이고, 감탄의 느낌을 살리려면 전달동사를 exclaimed로 바꾸는 것이 보통이다.`,
    fix: 'He exclaimed that it was a really great movie. (또는 He said that it was a very good movie.)', confidence: 'medium', severity: 'low' },
  { page: 69, where: 'application 오른쪽 row 18 · Review item 14 두 번째 정답', text: '- Kenedy told me that how stupid I was..', type: 'english_grammar',
    problem: `that과 how(감탄의 의문사)를 한 절에 겹쳐 쓸 수 없다. 마침표도 두 개다.`, fix: 'Kenedy told me how stupid I was.', confidence: 'high', severity: 'high' },
  { page: 69, where: 'application row 17·18 양쪽 · Review item 14(p71)', text: 'Kenedy said, “How stupid you are!”', type: 'english_unnatural',
    problem: `Kenedy는 드문 철자이고 보통 Kennedy로 쓴다.`, fix: 'Kennedy said, “How stupid you are!”', confidence: 'low', severity: 'low' },
  { page: 68, where: 'passOff (4) item 14·15 · application row 23(p69) · Review item 18 정답', text: '=> He expressed  his wish that we might succeed.', type: 'answer_ambiguous',
    problem: `직접화법 He said, “May you succeed.”에 듣는 사람이 없는데 you가 we로 바뀌었다. you는 듣는 사람이므로 나에게 말했다면 I, 우리에게 말했다면 we가 된다. 듣는 사람이 없어 정답을 하나로 정할 수 없다. p68은 expressed와 his 사이가 두 칸이다.`,
    fix: '문제를 He said to me, “May you succeed.”로 바꾸고 정답을 He expressed his wish that I might succeed. (또는 He prayed that I might succeed.)로 한다.', confidence: 'medium', severity: 'medium' },
  { page: 68, where: 'passOff (4) item 4~6 · application row 15·16 · Review item 13', text: '“How deep your love is!” she exclaimed.', type: 'answer_ambiguous',
    problem: `듣는 사람이 없는 문장인데 정답은 She told me how deep my love was.로 '나에게 말했다'를 가정하고 your를 my로 바꾼다. 가정을 밝히지 않으면 다른 인칭으로 쓴 답을 틀렸다고 할 근거가 없다.`,
    fix: '문제를 “How deep your love is!” she exclaimed to me.로 바꾸거나 She exclaimed how deep my love was.도 정답으로 허용한다.', confidence: 'medium', severity: 'low' },
  { page: 68, where: 'passOff (4) item 9·10 · application row 20 · Review item 16', text: '=> He cried with regret that the plane had taken off.', type: 'grammar_explanation_wrong',
    problem: `Gosh!는 놀람을 나타내는 감탄사라 '후회(with regret)'로 옮기는 근거가 약하다. 후회를 가르치려면 Alas!나 Oh no! 같은 감탄사가 맞다.`,
    fix: 'He cried, “Oh no! The plane has taken off.” → He cried with regret that the plane had taken off.', confidence: 'low', severity: 'low' },
];
// verify issue texts exist verbatim in the dump
const allLines = Object.values(PAGES).flat().map((l) => l.text);
const issueTextMisses = [];
ISSUES.forEach((iss, i) => {
  iss.id = `g2-p52-71-${String(i + 1).padStart(3, '0')}`;
  if (!allLines.some((t) => t.includes(iss.text))) issueTextMisses.push(`${iss.id}: ${iss.text}`);
});

// ====================================================================================
// Completeness checks + stats
// ====================================================================================
const unused = [];
for (let p = 52; p <= 71; p++) for (const l of PAGES[p]) if (!l.used && !isBoiler(l)) unused.push(`p${p} y=${l.y}: ${l.text}`);

const topics = [T13, T14, T15];
const perPage = {};
for (let p = 52; p <= 71; p++) perPage[p] = { en: 0, koPrompt: 0, enPrompt: 0, tableRows: 0, printedLines: PAGES[p].filter((l) => !isBoiler(l)).length };
const topicStats = [];
let reviewItems = 0; let linked = 0; let needsNew = 0; let corrected = 0; let slotAns = 0; let withLessonRef = 0;
for (const T of topics) {
  let po = 0; let app = 0; let tasks = 0; let ri = 0; let tables = 0;
  for (const sec of T.sections) {
    if (sec.groups) for (const it of sec.groups.flatMap((g) => g.items)) {
      perPage[it.page].en += 1;
      if (sec.kind === 'passOff') po += 1; else app += 1;
      if (it.lessonRef !== null) withLessonRef += 1;
    }
    if (sec.table) { if (sec.table.ruled) tables += 1; perPage[sec.page].tableRows += sec.table.rows.length; }
    if (sec.tasks) for (const t of sec.tasks) {
      tasks += 1;
      for (const x of t.items) {
        ri += 1; reviewItems += 1;
        if (x.promptLang === 'ko') perPage[x.page].koPrompt += 1; else perPage[x.page].enPrompt += 1;
        if (x.answerFromBook !== null) linked += 1;
        if (x.proposedAnswer !== null) needsNew += 1;
        if (x.correctedAnswer !== null) corrected += 1;
        if (x.extraSlotAnswer !== null) slotAns += 1;
      }
    }
  }
  topicStats.push({ topic: T.printedLabel, title: T.title, pages: T.pages, passOffSentences: po, applicationSentences: app, reviewTasks: tasks, reviewItems: ri, tables });
}
const expected = [[36, 53, 3, 49], [14, 40, 2, 28], [38, 46, 1, 18]];
topicStats.forEach((s, i) => {
  const e = expected[i];
  if (s.passOffSentences !== e[0] || s.applicationSentences !== e[1] || s.reviewTasks !== e[2] || s.reviewItems !== e[3]) {
    throw new Error(`count mismatch ${s.topic}: ${JSON.stringify(s)} expected ${e}`);
  }
});

// sentences with no Korean anywhere in the book
const noKo = [];
for (const T of topics) for (const sec of T.sections.filter((s) => s.groups)) for (const it of sec.groups.flatMap((g) => g.items)) {
  if (!it.koFromReview) noKo.push(it.ref);
}
const byType = {};
for (const iss of ISSUES) byType[iss.type] = (byType[iss.type] || 0) + 1;

// strip internals
for (const T of topics) for (const sec of T.sections) if (sec.tasks) for (const t of sec.tasks) for (const x of t.items) { delete x._lines; delete x._task; }

const out = {
  book: 'g2',
  pageRange: [52, 71],
  frontMatter: {
    introText: null,
    notes: `범위(p52-71)에는 표지·특징/학습법·연결고리 구성도·목차 쪽이 없다. 모든 쪽 머리띠에 The Revolution of English Education, 바닥에 쪽번호와 Pass-Off English 패스오프 잉글리쉬 로고, 본문에 Pass-Off English 워터마크가 있다. PDF는 71쪽이며 p71이 2권의 마지막 쪽이다(TOPIC 15 Review로 끝남, 정답지·뒤표지 없음). 세 토픽 모두 설명 문단이 전혀 없고 소제목, '=>' 변환 예시, p54의 괄호 꼬리표 하나, p66의 주어 지정 괄호만 있다.`,
  },
  conventions: {
    en: `인쇄된 영어 그대로(오타 포함). 앞머리의 '=>'(Pass-Off 변환문)와 '- '(p69 오른쪽 열)는 떼어 냄. 끝의 (N과)는 lessonRef, 한글이 든 끝 괄호는 tag(Review에서는 hint)로 분리. 두 칸 이상 공백만 한 칸으로 줄임. 여러 줄로 인쇄된 문장은 한 칸 공백으로 이어 붙임.`,
    raw: `텍스트 층(pymupdf span)의 인쇄 줄 그대로. 여러 줄이면 \\n으로 구분. 쪽 이미지(110dpi)와 확대 이미지로 대조함.`,
    bold: `Pass-Off·Application 문장(p52-56, p62-63, p67-69)에는 굵은 글씨가 전혀 없어 bold=[]. p57 Review 1만 문장 일부가 굵다(bold에 기록, 구간 끝 마침표는 뺌). p59-61·p64-66·p70-71 Review 프롬프트는 줄 전체가 굵은 서식이라 bold로 기록하지 않음. p67-69의 '=>' 변환문은 이탤릭(모양만, 폰트 정보에는 없음).`,
    ko: `책은 Pass-Off·Application 영어 옆에 한국어를 인쇄하지 않으므로 ko는 항상 null. koFromReview는 그 문장을 번역한 Review 한국어 프롬프트(준동사 Review 3에만 있음).`,
    ref: `항목 위치 이름. 예: 'passOff (1) 부정사 item 3', 'application (2) 분사[라벨 없음·추론] item 1', 'application 수동태(표 오른쪽 열) item 16'(= 표 16행). answerSource·appRef·pairWith·transformOfRef가 이 이름을 쓴다.`,
    role: `분사·화법 묶음에서 원문(original)과 '=>' 변환문(transformed). transformOf는 같은 묶음 안 원문의 번호(1부터).`,
    appRef: `같은 문장이 있는 Application 위치(대소문자·문장부호 무시 일치). 다르게 인쇄된 경우 appVariant/appVariantText.`,
    reviewRefs: `그 문장을 정답(또는 문제)으로 쓰는 Review 문항. 없으면 Review에서 다루지 않는 문장.`,
    studentSource: `사이트 STUDENT 과 원문(content/lessons/student/sN-M.json)과 그 과의 한국어 번역. lessonRefMismatch는 책의 (N과)가 실제 과와 다를 때.`,
    reviewItem: `n은 책에 인쇄되지 않아 과제 안에서 1부터 매김(printedItemNumbers=false). answerFromBook=책에 인쇄된 정답 영어(원문 그대로), altAnswersFromBook=책에 인쇄된 두 번째 정답, correctedAnswer=책 정답에 오류가 있을 때의 교정안(웹 정답은 교정안 권장), acceptAlso=함께 허용할 답, proposedAnswer=책에 정답이 없을 때의 제안(여기서는 Review 1의 한국어 해석), extraSlotAnswer=빈칸·방향 같은 추가 칸의 답.`,
    severity: `issues의 추가 필드. 학습자에게 미치는 영향(high/medium/low). confidence는 문제라고 판단한 확신도.`,
    selfReview: `이 파일은 한 에이전트가 추출하고 스스로 점검했다(독립 검수 아님). 기계 점검: 20쪽의 모든 인쇄 줄(머리띠·쪽번호·워터마크 제외)이 항목에 한 번씩 쓰였는지, 토픽별 문장·문항 수, issues.text가 인쇄 줄에 그대로 있는지.`,
  },
  topics,
  issues: ISSUES,
  stats: {
    topics: topicStats,
    reviewItems, linkedToBookSentence: linked, needsNewAnswer: needsNew, correctedAnswers: corrected, extraSlotAnswers: slotAns,
    itemsWithLessonRef: withLessonRef,
    issues: ISSUES.length,
    issuesHighConfidence: ISSUES.filter((x) => x.confidence === 'high').length,
    issuesHighSeverity: ISSUES.filter((x) => x.severity === 'high').length,
    issuesByType: byType,
    sentencesWithoutKoreanInBook: { count: noKo.length, refs: noKo },
    perPage,
  },
};

// no empty strings anywhere (absent values must be null)
const empties = [];
(function scan(v, trail) {
  if (typeof v === 'string') { if (v.trim() === '') empties.push(trail); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => scan(x, `${trail}[${i}]`)); return; }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) scan(v[k], `${trail}.${k}`);
})(out, '$');
if (empties.length) throw new Error('empty strings at: ' + empties.join(', '));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('wrote', OUT);
console.log('unused lines:', unused.length ? unused : 'none');
console.log('issue text misses:', issueTextMisses.length ? issueTextMisses : 'none');
console.log(JSON.stringify(out.stats.topics));
console.log('review', reviewItems, 'linked', linked, 'needsNew', needsNew, 'corrected', corrected, 'slot', slotAns, 'lessonRef', withLessonRef);
console.log('issues', ISSUES.length, 'highConf', out.stats.issuesHighConfidence, 'highSev', out.stats.issuesHighSeverity, JSON.stringify(byType));
console.log('noKo', noKo.length);
for (let p = 52; p <= 71; p++) console.log(p, JSON.stringify(perPage[p]));
