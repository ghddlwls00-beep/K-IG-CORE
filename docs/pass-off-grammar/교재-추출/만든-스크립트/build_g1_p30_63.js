'use strict';
// Builds out/g1-p30-63.json from a hand transcription of g1 PDF pages 30-63
// (page images read one by one; text layer used for exact characters).
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'out');
const OUT = path.join(OUT_DIR, 'g1-p30-63.json');

// ---------- helpers ----------
function parseRaw(raw) {
  let s = raw.replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  let lessonRef = null;
  const tags = [];
  for (;;) {
    const m = s.match(/\s*\(([^()]*)\)\s*$/);
    if (!m) break;
    const inner = m[1];
    const lm = inner.match(/^\s*(\d+)\s*과\s*$/);
    if (lm) lessonRef = Number(lm[1]);
    else tags.unshift('(' + inner + ')');
    s = s.slice(0, m.index).trim();
  }
  return { en: s, tag: tags.length ? tags.join(' ') : null, lessonRef };
}
function I(page, raw, bold, extra) {
  const p = parseRaw(raw);
  return Object.assign({ page, en: p.en, ko: null, bold: bold || [], tag: p.tag, lessonRef: p.lessonRef, raw }, extra || {});
}
function G(label, items, extra) {
  return Object.assign({ label, explanation: null }, extra || {}, { items });
}
function S(kind, heading, page, groups, extra) {
  return Object.assign({ kind, heading, page }, extra || {}, { groups });
}
function T(heading, page, table, extra) {
  return Object.assign({ kind: 'table', heading, page, parentHeading: '1. Pass-Off Sentences' }, extra || {}, { table });
}
function RV(page, tasks) { return { kind: 'review', heading: 'Review', page, tasks }; }
function TK(no, page, instruction, taskTypes, items, extra) {
  return Object.assign({ no, page, instruction, taskTypes }, extra || {}, { printedItemNumbers: false, items });
}
function R(page, prompt, ref, o) {
  o = o || {};
  const r = {
    n: null, page, prompt, promptLang: o.lang || 'ko', raw: o.raw || prompt, hint: o.hint || null,
    extraSlot: o.extraSlot === undefined ? '__default__' : o.extraSlot,
    answerFromBook: null, answerSource: 'none',
    proposedAnswer: o.proposed || null, correctedAnswer: o.corrected || null,
    extraSlotAnswer: o.slot || null, note: o.note || null,
  };
  if (o.bold) r.bold = o.bold;
  if (o.lessonRef) r.lessonRef = o.lessonRef;
  Object.defineProperty(r, '_ref', { value: ref, enumerable: false });
  Object.defineProperty(r, '_qref', { value: o.qref || null, enumerable: false });
  return r;
}
function X(page, where, text, type, problem, fix, confidence, severity) {
  return { page, where, text, type, problem, fix, confidence, severity };
}

// ======================================================================
// TOPIC 4  문장의 종류  (p30-36)
// ======================================================================
const t4 = {
  printedLabel: 'TOPIC 4', title: '문장의 종류', pages: [30, 36],
  continuesFromPrevRange: false, continuesIntoNextRange: false,
  sections: [
    S('passOff', '1. Pass-Off Sentences', 30, [
      G('(1) 문장의 종류', [
        I(30, 'I am 11 years old. (단문)'),
        I(30, 'I clean my room and then I go jogging with my dog.(중문)'),
        I(30, 'I think he likes the color blue because he always wears a blue tie. (복문)'),
        I(30, 'I have a wide variety of friends(서술문)'),
        I(30, 'Study hard. Be happy. (명령문)'),
        I(30, 'May you have a happy new year. (기원문)'),
        I(30, 'Long live the king! (기원문)'),
        I(30, 'How cold it is! (감탄문)'),
        I(30, 'What a good boy he is! (감탄문)'),
      ]),
      G('(2) 부정문', [
        I(30, 'Our country’s soccer players are not one of the best team. (be동사)', ['are not'], { appVariant: 'application (2) 부정문[라벨 없음·추론] item 1 (teams)' }),
        I(30, 'He does not like to talk to new people. (일반동사)', ['does not']),
        I(30, 'We can’t be together at suppertime.(조동사)', ['can’t']),
        I(30, 'There is not a cake on the plate.( there is 구문의 부정)', ['is not']),
        I(30, 'He never lost his confidence.( never 사용)', ['neve'], { note: '굵게 인쇄된 부분이 neve까지이고 r는 보통 글씨' }),
        I(30, 'Nothing was important but you.( no+ 명사)', ['Nothing']),
        I(30, 'I can’t figure out my homework. (cannot 축약형)', ['can’t']),
        I(30, 'My mother doesn’t allow us to watch a lot of TV. (does not의 축약형)', ['doesn’t']),
        I(30, 'He isn’t a student. (is not의 축약형)', ['isn’t']),
      ]),
    ]),
    S('application', '2. Application Sentences', 31, [
      G(null, [
        I(31, 'I am 11 years old. (1과)'),
        I(31, 'We are very close to one another. (1과)'),
        I(31, 'I know him very well.'),
        I(31, 'I clean my room and then I go jogging with my dog. (9과)'),
        I(31, 'Sarah went to the party last week, but Paul stayed at his house.'),
        I(31, 'Do you want some more salad, or do you want some dessert?'),
        I(31, 'I think he likes the color blue because he always wears a blue tie. (6과)'),
        I(31, 'When she arrived at London, she didn’t have any friends.'),
        I(31, 'He went on talking though he was terribly tired.'),
        I(31, 'I have a wide variety of friends. (7과)'),
        I(31, 'Sometimes in the spring and the fall, I ride my bike to school. (5과)'),
        I(31, 'Study hard. Be happy.'),
        I(31, 'Sit down.'),
        I(31, 'Don’t smoke.'),
        I(31, 'Please call back.'),
        I(32, 'Get more exercise.'),
        I(32, 'May you have a happy new year.'),
        I(32, 'Long live the king!'),
        I(32, 'How cold it is!'),
        I(32, 'What a good boy he is!'),
        I(32, 'God bless you!'),
      ], { inferredSubPoint: '(1) 문장의 종류' }),
      G(null, [
        I(32, 'Our country’s soccer players are not one of the best teams. (15과)', ['are not']),
        I(32, 'He does not like to talk to new people. (3과)', ['does not']),
        I(32, 'We can’t be together at suppertime. (8과)', ['can’t']),
        I(32, 'There is not a cake on the plate.', ['is not']),
        I(32, 'He never lost his confidence.(15과)', ['neve'], { note: '굵게 인쇄된 부분이 neve까지' }),
        I(32, 'Nothing was important but you.', ['Nothing']),
        I(32, 'I can’t figure out my homework. (8과)', ['can’t']),
        I(32, 'My mother doesn’t allow us to watch a lot of TV. (8과)', ['doesn’t']),
      ], { inferredSubPoint: '(2) 부정문' }),
    ], { note: 'Application에는 소제목이 인쇄되어 있지 않다. 문장 순서가 Pass-Off (1)(2) 순서와 같아 inferredSubPoint로 묶었다. (1)은 단문3·중문3·복문3·서술문2·명령문5·기원문2·감탄문2·기원문1 순으로 배열되어 있다(태그는 인쇄 안 됨).' }),
    RV(33, [
      TK('1.', 33, '다음 내용을 보고 영작하고 단문, 중문, 복문, 서술문, 명령문, 기원문, 감탄문 중에 선택하여 그 종류를 쓰시오.',
        ['ko_to_en_compose', 'classify_sentence_type'], [
          R(33, '나는 11살이다.', ['app', 1, 1], { slot: '단문 (서술문도 가능)' }),
          R(33, '우리는 서로서로 매우 가깝다.', ['app', 1, 2], { slot: '단문 (서술문도 가능)' }),
          R(33, '나는 그를 매우 잘 안다.', ['app', 1, 3], { slot: '단문 (서술문도 가능)' }),
          R(33, '나는 내 방을 청소하고 나의 개와 함께 조깅을 간다.', ['app', 1, 4], { slot: '중문' }),
          R(33, '사라는 파티에 갔지만, 폴은 그의 집에 머물러 있었다.', ['app', 1, 5], { slot: '중문', note: '영어의 last week가 한국어에 없음 — last week 없이 쓴 답도 정답 처리' }),
          R(33, '당신은 샐러드를 좀 더 드시겠습니까, 또는 약간의 디저트를 드시겠습니까?', ['app', 1, 6], { slot: '중문 (기능상 의문문이지만 보기에 의문문이 없음)' }),
          R(33, '나는 그가 항상 파란색 타이를 매기 때문에 파란색을 좋아한다고 생각한다.', ['app', 1, 7], { slot: '복문' }),
          R(34, '그녀가 런던에 도착했을 때, 그녀는 친구가 한 명도 없었다.', ['app', 1, 8], { slot: '복문', corrected: 'When she arrived in London, she didn’t have any friends.' }),
          R(34, '그는 비록 끔찍하게 피곤했지만 계속 말을 했다.', ['app', 1, 9], { slot: '복문' }),
          R(34, '나는 많은 다양한 친구들이 있다.', ['app', 1, 10], { slot: '서술문 (단문도 가능)' }),
          R(34, '때때로 봄과 가을에, 나는 학교까지 자전거를 타고 간다.', ['app', 1, 11], { slot: '서술문 (단문도 가능)' }),
          R(34, '공부 열심히 해. 행복해.', ['app', 1, 12], { slot: '명령문' }),
          R(34, '앉거라.', ['app', 1, 13], { slot: '명령문' }),
          R(34, '담배 피우지 마라.', ['app', 1, 14], { slot: '명령문' }),
          R(34, '다시 전화해 주세요.', ['app', 1, 15], { slot: '명령문' }),
          R(35, '좀 더 운동을 해라.', ['app', 1, 16], { slot: '명령문' }),
          R(35, '행복한 새해를 맞이하시길', ['app', 1, 17], { slot: '기원문' }),
          R(35, '왕이여 장수하소서!', ['app', 1, 18], { slot: '기원문' }),
          R(35, '얼마나 추운지!', ['app', 1, 19], { slot: '감탄문' }),
          R(35, '참 착한 소년이구나!', ['app', 1, 20], { slot: '감탄문' }),
          R(35, '하나님께서 그대를 축복하시길!', ['app', 1, 21], { slot: '기원문' }),
        ], {
          defaultExtraSlot: '( ) 안에 문장의 종류 쓰기 — 단문·중문·복문·서술문·명령문·기원문·감탄문 중 하나',
          slotAnswerNote: '책에 정답 없음. extraSlotAnswer는 Application 배열 순서(단문3·중문3·복문3·서술문2·명령문5·기원문2·감탄문2·기원문1)에 따른 의도된 답이다. 명령문·기원문·감탄문 문장은 구조상 모두 단문이기도 하고, 단문 3개는 기능상 서술문이기도 하다(책이 구조 기준과 기능 기준을 섞음).',
        }),
      TK('2.', 36, '다음 내용을 보고 부정어(not, never, nothing 등)을 사용하여 영작하시오.',
        ['ko_to_en_compose', 'use_negation'], [
          R(36, '우리나라 축구 선수들은 최고의 팀들 중의 하나가 아니다.', ['app', 2, 1], { corrected: 'Our national soccer team is not one of the best teams in the world.', note: '책의 영어는 주어(선수들)와 보어(팀)가 맞지 않음' }),
          R(36, '그는 낯선 사람들과 말하는 것을 좋아하지 않는다.', ['app', 2, 2], { note: 'doesn’t like to talk to strangers 등도 정답 처리' }),
          R(36, '우리는 저녁시간에 함께 할 수 없다.', ['app', 2, 3]),
          R(36, '접시에는 케이크가 없다.', ['app', 2, 4], { note: 'There is no cake on the plate. / There isn’t a cake on the plate.도 정답(더 자연스러움)' }),
          R(36, '그는 결코 그의 자신감을 잃지 않았다.', ['app', 2, 5]),
          R(36, '아무것도 당신을 제외하고는 중요하지 않아요.', ['app', 2, 6], { note: '한국어가 현재형이라 Nothing is important but you.도 정답 처리' }),
          R(36, '나는 숙제를 이해할 수가 없어.', ['app', 2, 7]),
          R(36, '어머니는 우리가 TV를 많이 보는 것을 허락하지 않으신다.', ['app', 2, 8]),
        ], { instructionBold: ['부정어(not, never, nothing 등)'] }),
    ]),
  ],
};

// ======================================================================
// TOPIC 5  의문문  (p37-41)
// ======================================================================
const t5 = {
  printedLabel: 'TOPIC 5', title: '의문문', printedTitle: '의 문 문', pages: [37, 41],
  continuesFromPrevRange: false, continuesIntoNextRange: false,
  sections: [
    S('passOff', '1. Pass-Off Sentences', 37, [
      G('(1) 의문문 만들기', [
        I(37, 'Is this a desk?(be동사)', ['Is this'], { note: '?(be동사)도 굵게 인쇄' }),
        I(37, 'Do you like to be around your friends? (1과)', ['Do you like']),
        I(37, 'Can he play the guitar well? (4과)', ['Can he play']),
        I(37, 'Are there four people in your family? (2과)', ['Are there']),
        I(37, 'How was your day? (8과)', ['How was your day']),
        I(37, 'Who is my best friend? (3과)', ['Who is']),
      ]),
      G('(2) 의문문의 대답', [
        I(37, 'Yes, it is.', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 1' }),
        I(37, 'Yes, I do.', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 2' }),
        I(37, 'No, he can’t', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 3' }),
        I(37, 'Yes, there are.', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 4' }),
        I(37, 'It was fun, mom.', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 5' }),
        I(37, 'My best friend is 대한.', [], { role: 'answer', answerTo: 'passOff (1) 의문문 만들기 item 6', note: '영어 문장 안에 한글 이름이 인쇄됨' }),
      ]),
      G('(3) 부가의문문', [
        I(37, 'It is a long way, isn’t it ?', ['isn’t it']),
        I(37, 'Yes, it is. / No, it isn’t.', [], { role: 'answer', answerTo: 'passOff (3) 부가의문문 item 1' }),
        I(37, 'He likes candy, doesn’t he?', ['doesn’t he']),
        I(37, 'Yes, he does / No, he doesn’t', [], { role: 'answer', answerTo: 'passOff (3) 부가의문문 item 3' }),
        I(37, 'He can’t speak French, can he ?', ['can he']),
        I(37, 'Yes, he can / No, he can’t.', [], { role: 'answer', answerTo: 'passOff (3) 부가의문문 item 5' }),
      ]),
      G('(4) 부정의문문', [
        I(37, 'Isn’t this a hat ?', ['Isn’t']),
        I(37, 'Is there not a cake ?', ['Is', 'not']),
        I(37, 'Can’t you swim ?', ['Can’t']),
      ]),
    ]),
    S('application', '2. Application Sentences', 38, [
      G('(1) 의문문', [
        I(38, 'Are you from Spain?', ['Are you']),
        I(38, 'Is Jane a teacher?', ['Is Jane']),
        I(38, 'Is that your house?', ['Is that']),
        I(38, 'Are those apples green?', ['Are those apples']),
        I(38, 'Is this window closed?', ['Is this window']),
        I(38, 'Is your dog sick?', ['Is your dog']),
        I(38, 'Are you all students?', ['Are you']),
        I(38, 'Is Jack a computer programmer?', ['Is Jack']),
        I(38, 'Do you like to be around your friends? (1과)', ['Do you like']),
        I(38, 'Does your father have a dog?', ['Does your father have']),
        I(38, 'Do Emma and Jill go to the movies every Saturday?', ['Do Emma and Jill go']),
        I(38, 'Do we have enough money?', ['Do we have']),
        I(38, 'Does she understand me well?', ['Does she understand']),
        I(38, 'Does it snow a lot in France?', ['Does it snow']),
        I(38, 'Can he play the guitar well? (4과)', ['Can he play']),
        I(38, 'Can they win the soccer game?', ['Can they win']),
        I(38, 'Can you speak five languages?', ['Can you speak']),
        I(38, 'Are there four people in your family? (2과)', ['Are there']),
        I(38, 'Is there a letter from Seoul?', ['Is there']),
        I(38, 'How was your day? (8과)', ['How was your day']),
        I(38, 'Who is my best friend? (3과)', ['Who is my best friend']),
      ]),
      G('(2) 부가의문문', [
        I(39, 'It is a long way, isn’t it?', ['isn’t it']),
        I(39, 'He likes candy, doesn’t he?', ['doesn’t he']),
        I(39, 'He can’t speak French, can he?', ['can he']),
        I(39, 'He’s wearing a brown sweater, isn’t he?', ['isn’t he']),
        I(39, 'You like her a lot, don’t you?', ['don’t you']),
        I(39, 'We aren’t ready for the next exam, are we?', ['are we']),
        I(39, 'She didn’t have dinner, did she?', ['did she']),
        I(39, 'You won’t be back before noon, will you?', ['will you']),
      ]),
      G('(3) 부정의문문', [
        I(39, 'Isn’t this a hat?', ['Isn’t']),
        I(39, 'Is there not a cake?', ['Is', 'not']),
        I(39, 'Can’t you swim?', ['Can’t']),
        I(39, 'Don’t you understand both sides of an issue?', ['Don’t']),
        I(39, 'Can’t you make an intelligent choice?', ['Can’t']),
        I(39, 'Doesn’t he have his fault?', ['Doesn’t']),
        I(39, 'Isn’t it unfair that Homer’s poems are chosen for the exams?', ['Isn’t']),
      ]),
    ], { note: 'Application 소제목 번호가 Pass-Off와 다르다: Pass-Off (1) 의문문 만들기 (2) 의문문의 대답 (3) 부가의문문 (4) 부정의문문 → Application (1) 의문문 (2) 부가의문문 (3) 부정의문문. 의문문의 대답은 Application에 없다.' }),
    RV(40, [
      TK('1.', 40, '다음 질문을 보고 yes나 no로 대답하시오.', ['en_question_short_answer'], [
        R(40, 'Are you from Spain?', ['none'], { lang: 'en', raw: 'Are you from Spain? (yes)', hint: '(yes)', bold: ['Are you'], qref: ['app', 1, 1], proposed: 'Yes, I am.', note: 'you를 복수로 보면 Yes, we are.도 가능' }),
        R(40, 'Is Jane a teacher?', ['none'], { lang: 'en', raw: 'Is Jane a teacher? (no)', hint: '(no)', bold: ['Is Jane'], qref: ['app', 1, 2], proposed: 'No, she isn’t.', note: '(no)가 굵게 인쇄됨. No, she’s not. / No, she is not.도 정답' }),
        R(40, 'Is that your house?', ['none'], { lang: 'en', raw: 'Is that your house? (no)', hint: '(no)', bold: ['Is that'], qref: ['app', 1, 3], proposed: 'No, it isn’t.', note: 'No, it’s not.도 정답' }),
        R(40, 'Are those apples green', ['none'], { lang: 'en', raw: 'Are those apples green (yes)', hint: '(yes)', bold: ['Are those apples'], qref: ['app', 1, 4], proposed: 'Yes, they are.', note: '인쇄본에 물음표 누락' }),
        R(40, 'Is this window closed?', ['none'], { lang: 'en', raw: 'Is this window closed? (no)', hint: '(no)', bold: ['Is this window'], qref: ['app', 1, 5], proposed: 'No, it isn’t.' }),
        R(40, 'Is your dog sick?', ['none'], { lang: 'en', raw: 'Is your dog sick? (yes)', hint: '(yes)', bold: ['Is your dog'], qref: ['app', 1, 6], proposed: 'Yes, it is.', note: 'Yes, he is. / Yes, she is.도 정답' }),
        R(40, 'Are you all students?', ['none'], { lang: 'en', raw: 'Are you all students? (yes)', hint: '(yes)', bold: ['Are you'], qref: ['app', 1, 7], proposed: 'Yes, we are.' }),
        R(40, 'Is Jack a computer programmer?', ['none'], { lang: 'en', raw: 'Is Jack a computer programmer? (no)', hint: '(no)', bold: ['Is Jack'], qref: ['app', 1, 8], proposed: 'No, he isn’t.' }),
        R(40, 'Do you like to be around your friends?', ['pass', 2, 2], { lang: 'en', raw: 'Do you like to be around your friends? (1과) (yes)', hint: '(yes)', bold: ['Do you like'], lessonRef: 1, qref: ['app', 1, 9] }),
        R(40, 'Does your father have a dog?', ['none'], { lang: 'en', raw: 'Does your father have a dog? (no)', hint: '(no)', bold: ['Does your father have'], qref: ['app', 1, 10], proposed: 'No, he doesn’t.' }),
        R(40, 'Do Emma and Jill go to the movies every Saturday?', ['none'], { lang: 'en', raw: 'Do Emma and Jill go to the movies every Saturday? (yes)', hint: '(yes)', bold: ['Do Emma and Jill go'], qref: ['app', 1, 11], proposed: 'Yes, they do.' }),
        R(40, 'Do we have enough money?', ['none'], { lang: 'en', raw: 'Do we have enough money? (no)', hint: '(no)', bold: ['Do we have'], qref: ['app', 1, 12], proposed: 'No, we don’t.', note: 'No, you don’t.도 정답' }),
        R(40, 'Does she understand me well?', ['none'], { lang: 'en', raw: 'Does she understand me well? (no)', hint: '(no)', bold: ['Does she understand'], qref: ['app', 1, 13], proposed: 'No, she doesn’t.' }),
        R(40, 'Does it snow a lot in France?', ['none'], { lang: 'en', raw: 'Does it snow a lot in France? (yes)', hint: '(yes)', bold: ['Does it snow'], qref: ['app', 1, 14], proposed: 'Yes, it does.' }),
        R(40, 'Can he play the guitar well?', ['none'], { lang: 'en', raw: 'Can he play the guitar well? (4과) (yes)', hint: '(yes)', bold: ['Can he play'], lessonRef: 4, qref: ['app', 1, 15], proposed: 'Yes, he can.', note: 'Pass-Off (2)에 인쇄된 답은 No, he can’t이지만 이 문항의 단서는 (yes)' }),
        R(40, 'Can they win the soccer game?', ['none'], { lang: 'en', raw: 'Can they win the soccer game? (yes)', hint: '(yes)', bold: ['Can they win'], qref: ['app', 1, 16], proposed: 'Yes, they can.' }),
        R(40, 'Can you speak five languages?', ['none'], { lang: 'en', raw: 'Can you speak five languages? (no)', hint: '(no)', bold: ['Can you speak'], qref: ['app', 1, 17], proposed: 'No, I can’t.' }),
        R(40, 'Are there four people in your family?', ['none'], { lang: 'en', raw: 'Are there four people in your family? (2과) (no)', hint: '(no)', bold: ['Are there'], lessonRef: 2, qref: ['app', 1, 18], proposed: 'No, there aren’t.', note: 'Pass-Off (2)의 답은 Yes, there are.(반대 단서)' }),
        R(40, 'Is there a letter from Seoul?', ['none'], { lang: 'en', raw: 'Is there a letter from Seoul? (yes)', hint: '(yes)', bold: ['Is there'], qref: ['app', 1, 19], proposed: 'Yes, there is.' }),
      ], { defaultExtraSlot: null, note: '영어 질문을 주고 괄호 단서(yes/no)에 맞춰 단답을 쓰는 과제. 질문은 Application (1) 1~19번과 같고, How was your day?와 Who is my best friend?는 빠졌다. 책에 단답 정답은 없다.' }),
      TK('2.', 41, '다음을 보고 영어로 작문하시오.', ['ko_to_en_compose', 'tag_question'], [
        R(41, '그것은 긴 길이야, 그렇지?', ['app', 2, 1]),
        R(41, '그는 사탕을 좋아해, 그렇지?', ['app', 2, 2]),
        R(41, '그는 프랑스어를 말할 수 없어, 그렇지?', ['app', 2, 3]),
        R(41, '그는 갈색 스웨터를 입고 있어, 그렇지?', ['app', 2, 4]),
        R(41, '너는 그녀를 많이 좋아해, 그렇지?', ['app', 2, 5]),
        R(41, '우리는 다음 시험에 준비되어 있지 않아, 그렇지?', ['app', 2, 6]),
        R(41, '그녀는 저녁을 먹지 않았어, 그렇지?', ['app', 2, 7]),
        R(41, '너는 정오 전에 돌아 오지 않을 거야, 그렇지?', ['app', 2, 8]),
      ]),
      TK('3.', 41, '다음을 보고 영어로 부정의문문으로 영작하시오.', ['ko_to_en_compose', 'negative_question'], [
        R(41, '이것은 모자가 아니냐 ?', ['app', 3, 1]),
        R(41, '케이크가 없니?', ['app', 3, 2], { corrected: 'Isn’t there a cake?', note: '책의 Is there not a cake?도 정답 처리' }),
        R(41, '너는 수영할 수 없니 ?', ['app', 3, 3]),
        R(41, '너는 그 문제의 양면을 이해하지 않니 ?', ['app', 3, 4]),
        R(41, '너는 지성적인 선택을 할 수 없니 ?', ['app', 3, 5]),
        R(41, '그는 결점이 없니 ?', ['app', 3, 6], { corrected: 'Doesn’t he have his faults?' }),
        R(41, '그 시험에 호머의 시가 선택된 것은 부당하지 않니 ?', ['app', 3, 7]),
      ]),
    ]),
  ],
};

// ======================================================================
// TOPIC 6  명사  (p42-47)
// ======================================================================
const t6 = {
  printedLabel: 'TOPIC 6', title: '명사', printedTitle: '명  사', pages: [42, 47],
  continuesFromPrevRange: false, continuesIntoNextRange: false,
  sections: [
    S('passOff', '1. Pass-Off Sentences', 42, [
      G('(1) 명사의 종류와 성격', [
        I(42, 'She is a pianist.(보통명사)', ['a pianist']),
        I(42, 'They are students.(보통명사)', ['students']),
        I(42, 'My family is always happy. (집합명사)', ['family']),
        I(42, 'Two families lived happily together. (집합명사)', ['families']),
        I(42, 'Lunar New Year’s,  Buddha’s Birthday,  Chu-seok,  Soungni-san. (고유명사)', ['Lunar New Year’s', 'Buddha’s Birthday', 'Chu-seok', 'Soungni-san'], { note: '문장이 아니라 고유명사 목록(명절 3개 + 산 이름 1개)', appVariant: 'application (1) 명사의 종류와 성격[라벨 없음·추론] item 8 (명절 3개가 Korea has many traditional days; … 문장 안에 들어감, Soungni-san은 빠짐)' }),
        I(42, 'There is much paper, water and meat. (물질명사)', ['paper, water', 'meat']),
        I(42, 'I want to live in kindness, truth and happiness.(추상명사)', ['kindness', 'happiness'], { note: 'truth는 굵게 인쇄되지 않음' }),
      ]),
    ], { note: '(2) 명사의 복수형, (3) 계절·달·요일·기수와 서수는 같은 Pass-Off Sentences 아래에 인쇄된 목록이라 아래 table 섹션으로 분리했다.' }),
    T('(2) 명사의 복수형', 42, {
      title: '(2) 명사의 복수형',
      columns: ['번호', '규칙(인쇄된 표기)', '예(인쇄된 그대로)'],
      rows: [
        ['1)', '–s', 'books, cups, cats, pens'],
        ['2)', '-es', 'buzzes, buses, brushes, watches'],
        ['3)', '자음+ y(-ies)', 'babies, flies, cities'],
        ['4)', '모음 +y(-s)', 'days, boys'],
        ['5)', '–f/ -fe (-ves)', 'leaf – leaves / knife – knives / wife - wives'],
        ['6)', 'roof', 'roofs , handkerchiefs, safes'],
        ['7)', 'o + es', 'heroes, potatoes , volcanoes'],
        ['8)', 'o+ -s', 'pianos, photos'],
        ['9)', '–en', 'ox – oxen / child – children'],
        ['10)', '변형', 'man - men / foot – feet / tooth – teeth / mouse – mice'],
        ['11)', '단수=복수', 'deer, sheep, Chinese , Japanese'],
      ],
    }, { subPoint: '(2)', boldNote: '규칙 표기(두 번째 열)가 굵게 인쇄됨', explanation: null }),
    T('(3) 계절, 달, 요일, 기수와 서수', 43, {
      title: '(3) 계절, 달, 요일, 기수와 서수',
      columns: ['번호', '항목', '내용(인쇄된 그대로, 줄바꿈은 공백으로 이음)'],
      rows: [
        ['1)', '4계절', 'spring, summer, autumn, winter (4계절은 소문자로 나타냄)'],
        ['2)', '달', 'January, February, March, April, May, June, July, August, September, October, November, December'],
        ['3)', '요일', 'There are seven days in a week. Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'],
        ['4)', '기수와 서수 — 기수', 'one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred, thousand, million, billion'],
        ['4)', '기수와 서수 — 서수', 'first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth eleventh, twelfth, thirteenth, fourteenth, fifteenth, sixteenth, seventeenth, eighteenth, nineteenth, twentieth, thirtieth, fortieth, fiftieth, sixtieth, seventieth, eightieth, ninetieth, hundredth, thousandth'],
      ],
    }, { subPoint: '(3)', boldNote: '쪽 전체가 굵게 인쇄됨', explanation: '(4계절은 소문자로 나타냄)', note: '영어 문장은 요일 칸의 There are seven days in a week. 하나뿐. 기수 31개, 서수 29개 단어. 이 소단원은 Application·Review에 연습 문항이 없다.' }),
    S('application', '2. Application Sentences', 44, [
      G(null, [
        I(44, 'She is a pianist.', ['a pianist']),
        I(44, 'Dolphins look like a small whale and they have large brains.', ['Dolphins', 'a', 'whale', 'brains'], { note: '관사 a도 굵게 인쇄' }),
        I(44, 'They are students.', ['students']),
        I(44, 'The concert was successful.', ['The concert']),
        I(44, 'Penguins are birds.', ['Penguins', 'birds']),
        I(44, 'My family is always happy. (2과)', ['family']),
        I(44, 'Two families lived happily together.', ['families']),
        I(44, 'Korea has many traditional days; Lunar New Year’s,\nBuddha’s Birthday, Chu-seok, (18과)', ['Korea', 'Lunar New Year’s', 'Buddha’s Birthday, Chu-seok'], { note: '두 줄에 걸쳐 인쇄되고 쉼표로 끝나는 미완성 문장' }),
        I(44, 'Mr. Hillman was a crazy man.', ['Mr. Hillman', 'man']),
        I(44, 'There is much paper, water and meat.', ['paper, water', 'meat']),
        I(44, 'Will you give me a glass of water?', ['water'], { note: 'glass는 명사지만 굵게 인쇄되지 않음' }),
        I(44, 'Everyday he wants to eat some meat.', ['meat']),
        I(44, 'I want to live in kindness, truth and happiness.', ['kindness, truth and happiness']),
      ], { inferredSubPoint: '(1) 명사의 종류와 성격' }),
      G(null, [
        I(45, 'There are books, cups, and pens on the table.', ['books, cups, and pens', 'table']),
        I(45, 'Here come two buses.', ['buses']),
        I(45, 'She has three luxurious watches with gem.', ['watches', 'gem']),
        I(45, 'He has five babies in his home.', ['babies', 'home']),
        I(45, 'Boys, be ambitious!', ['Boys']),
        I(45, 'He gathered the leaves of the tree.', ['leaves', 'tree']),
        I(45, 'In Saudi, one man can have many wives.', ['Saudi', 'man', 'wives']),
        I(45, 'Don’t worry! Our company has excellent safes.', ['company', 'safes']),
        I(45, 'Are they heroes? Or just liars?', ['heroes', 'liars']),
        I(45, 'I don’t like to take photos.', ['photos']),
        I(45, 'His farm has many oxen.', ['oxen'], { note: 'farm은 명사지만 굵게 인쇄되지 않음' }),
        I(45, 'Can you touch your feet with your hands?', ['feet', 'hands']),
        I(45, 'At first, there was only one mouse and two months later,\nthere were a lot of mice in that restaurant.', ['mouse', 'months', 'mice', 'restaurant'], { note: '두 줄에 걸쳐 인쇄된 한 문장' }),
      ], { inferredSubPoint: '(2) 명사의 복수형' }),
    ], { note: 'Application에는 소제목이 인쇄되어 있지 않다. p44는 (1) 명사의 종류와 성격, p45는 (2) 복수형 규칙 1)~10) 순서(books→buses·watches→babies→boys→leaves·wives→safes→heroes→photos→oxen→feet→mice)를 따른다. 굵은 글씨는 명사 표시지만 불완전하다.' }),
    RV(46, [
      TK('1.', 46, '다음을 보고 영작하고 명사에는 동그라미를 치세요.', ['ko_to_en_compose', 'circle_nouns'], [
        R(46, '그녀는 피아니스트이다.', ['app', 1, 1], { slot: 'pianist' }),
        R(46, '돌고래는 작은 고래같이 생겼고 큰 두뇌를 가지고 있다.', ['app', 1, 2], { slot: 'Dolphins, whale, brains', corrected: 'Dolphins look like small whales, and they have large brains.' }),
        R(46, '그들은 학생들이다.', ['app', 1, 3], { slot: 'students' }),
        R(46, '그 콘서트는 성공적이다.', ['app', 1, 4], { slot: 'concert', note: '한국어가 현재형이라 The concert is successful.도 정답 처리' }),
        R(46, '펭귄은 새이다.', ['app', 1, 5], { slot: 'Penguins, birds' }),
        R(46, '나의 가족은 항상 행복하다.', ['app', 1, 6], { slot: 'family' }),
        R(46, '두 가족이 함께 행복하게 살았다.', ['app', 1, 7], { slot: 'families' }),
        R(46, '한국은 많은 전통 휴일들이 있다: 음력 설, 석가탄신일, 추석이다.', ['app', 1, 8], { slot: 'Korea, days(holidays), Lunar New Year’s, Buddha’s Birthday, Chu-seok (고유명사는 구 전체)', corrected: 'Korea has many traditional holidays: Lunar New Year’s Day, Buddha’s Birthday and Chuseok.' }),
        R(46, '힐만씨는 미친 사람이다.', ['app', 1, 9], { slot: 'Mr. Hillman, man', note: '한국어가 현재형이라 is도 정답 처리' }),
        R(46, '많은 종이와 물과 고기가 있다.', ['app', 1, 10], { slot: 'paper, water, meat' }),
        R(46, '제게 물 한잔을 주시겠어요?', ['app', 1, 11], { slot: 'glass, water', note: '책은 water만 굵게 표시 — glass도 명사' }),
        R(46, '매일 그는 약간의 고기를 먹기 원한다.', ['app', 1, 12], { slot: 'meat (Every day로 바르게 쓰면 day도 명사)', corrected: 'Every day he wants to eat some meat.' }),
        R(47, '나는 친절, 진실 그리고 행복 속에서 살기를 원한다.', ['app', 1, 13], { slot: 'kindness, truth, happiness' }),
        R(47, '책, 컵 그리고 펜이 책상 위에 있다.', ['app', 2, 1], { slot: 'books, cups, pens, table', note: '한국어 책상(desk)과 영어 table이 다름 — desk로 쓴 답도 정답 처리' }),
        R(47, '두 대의 버스가 온다.', ['app', 2, 2], { slot: 'buses', note: 'Two buses are coming.도 정답 처리' }),
        R(47, '그녀는 보석이 박힌 화려한 시계가 세 개 있다.', ['app', 2, 3], { slot: 'watches, gems', corrected: 'She has three luxurious watches with gems.' }),
        R(47, '그는 그의 집에 다섯 명의 아기가 있다.', ['app', 2, 4], { slot: 'babies, home' }),
        R(47, '소년들이여, 야망을 가져라.', ['app', 2, 5], { slot: 'Boys' }),
        R(47, '그는 나무의 이파리들을 모았다.', ['app', 2, 6], { slot: 'leaves, tree' }),
        R(47, '사우디에서, 한 남자는 많은 아내를 가질 수 있다.', ['app', 2, 7], { slot: 'Saudi (Arabia), man, wives', corrected: 'In Saudi Arabia, one man can have many wives.', note: '내용 자체의 부정확·민감성은 issues 참조' }),
        R(47, '걱정하지마! 우리 회사는 훌륭한 금고들이 있어.', ['app', 2, 8], { slot: 'company, safes' }),
        R(47, '그들은 영웅들인가, 아니면 그저 거짓말쟁이들인가?', ['app', 2, 9], { slot: 'heroes, liars' }),
        R(47, '나는 사진 찍기를 싫어한다.', ['app', 2, 10], { slot: 'photos', note: 'I don’t like taking photos(pictures).도 정답 처리' }),
        R(47, '그의 농장에는 많은 황소들이 있다.', ['app', 2, 11], { slot: 'farm, oxen', note: '책은 oxen만 굵게 표시 — farm도 명사' }),
        R(47, '너는 손으로 발을 잡을 수 있니?', ['app', 2, 12], { slot: 'feet, hands' }),
        R(47, '처음에는, 단지 한 마리의 쥐만 있었는데, 두 달 후에, 저 식당에는 많은 쥐들이 있게 되었어.', ['app', 2, 13], { slot: 'mouse, months, mice, restaurant (At first의 first, a lot of의 lot은 판단이 갈림)' }),
      ], { defaultExtraSlot: '영작한 문장의 명사에 동그라미', slotAnswerNote: '책에 명사 정답표 없음. 굵은 글씨는 불완전(glass·farm 누락, 관사 a 굵게)하므로 extraSlotAnswer는 직접 판정한 명사 목록이다.' }),
    ]),
  ],
};

// ======================================================================
// TOPIC 7  대명사  (p48-57)
// ======================================================================
const t7 = {
  printedLabel: 'TOPIC 7', title: '대명사', printedTitle: '대 명 사', pages: [48, 57],
  continuesFromPrevRange: false, continuesIntoNextRange: false,
  sections: [
    T('(1) 인칭 / 소유 / 복합 인칭 대명사', 48, {
      title: '(1) 인칭 / 소유 / 복합 인칭 대명사',
      columns: ['구분', '1인칭', '2인칭', '3인칭'],
      rows: [
        ['인칭 대명사', 'I , we', 'you', 'he, she, it, they'],
        ['소유대명사', 'mine', 'yours', 'his, hers, theirs'],
        ['복합 인칭 대명사', 'myself , ourselves', 'yourself , yourselves', 'himself, herself , themselves'],
      ],
    }, {
      subPoint: '(1)',
      rawLines: ['인칭 대명사 : 1인칭 : I , we', '2인칭 : you', '3인칭 : he, she, it, they', '소유대명사 :  1인칭 : mine   /  2인칭 : yours  / 3인칭 : his, hers, theirs', '복합 인칭 대명사 : 1인칭 – myself , ourselves', '2인칭- yourself , yourselves', '3인칭- himself, herself , themselves'],
      explanation: null,
      note: '예문 없이 목록만 인쇄됨. 소유대명사 ours, 재귀대명사 itself가 빠져 있음(issues 참조).',
    }),
    S('passOff', '1. Pass-Off Sentences', 48, [
      G('(2) 대명사 it', [
        I(48, 'I have a cat. I like it very much.', ['it']),
        I(48, 'I feel like I study too much, and it is too hard.', ['it']),
        I(48, 'It is a great way to talk to my friends about what we did during the day. (가주어)', ['It']),
        I(48, 'It was the window that I broke yesterday. (it ~ that 강조구문)', ['It']),
        I(48, 'It rains. / It is fine today / what time is it? (비 인칭 주어)', ['It', 'It', 'it'], { note: '한 줄에 세 문장', appVariant: 'application (2) 대명사 it[라벨 없음·추론] items 10·11·12 (세 문장으로 나뉨)' }),
        I(48, 'It usually takes me 15minutes to walk to school.', ['It']),
      ]),
      G('(3) 의문대명사와 지시 대명사 / 의문대명사', [
        I(48, 'Who is my best friend?', ['Who']),
        I(48, 'Whose book is this?', ['Whose']),
        I(48, 'Whom do you like most?', ['Whom']),
        I(48, 'Which is yours?', ['Which']),
        I(48, 'What is he?', ['What']),
        I(48, 'What is this?', ['What']),
      ], { printedSubLabel: '의문대명사' }),
      G('(3) 의문대명사와 지시 대명사 / 지시대명사', [
        I(49, 'This is the story about how the nation of Korea was founded.', ['This']),
        I(49, 'During this time, our teacher calls roll.', ['this']),
        I(49, 'These are the books about our history.', ['These']),
        I(49, 'Students will be able to talk about their friends at these academies.', ['these']),
        I(49, 'That is the house I wanted to buy.', ['That'], { appVariant: 'application (3) 지시대명사[라벨 없음·추론] item 8 (want)' }),
        I(49, 'Students should be able to describe why they feel that way.', ['that']),
        I(49, 'Those are caps that I put yesterday.', ['Those'], { appVariant: 'application (3) 지시대명사[라벨 없음·추론] item 10 (put on)' }),
        I(49, 'Why do you think he likes those colors?', ['those']),
      ], { printedSubLabel: '지시대명사' }),
      G('(4) 부정대명사와 부정형용사', [
        I(49, 'One should obey his parents.', ['One']),
        I(49, 'Everyone will enjoy this party.', ['Everyone']),
        I(49, 'Someone has painted the floor.', ['Someone']),
        I(49, 'Anyone would be here.', ['Anyone']),
        I(49, 'No one knows the day when he will die.', ['No one']),
        I(49, 'Other people are singing and dancing.', ['Other']),
        I(49, 'Another solution will be given to us.', ['Another']),
        I(49, 'If there is any, I will borrow them to you.', ['any']),
        I(49, 'There is no way to go outside.', ['no way']),
        I(49, 'None knows it.', ['None']),
        I(49, 'Each has a desk.', ['Each']),
        I(49, 'Either of them is wrong.', ['Either of them']),
        I(49, 'Neither of them is wrong.', ['Neither of them']),
        I(49, 'I have to study all weekend long.', ['all']),
        I(49, 'I have to do homework from both the academies and school.', ['both', 'and']),
      ]),
    ], { note: '(1)은 목록이라 앞의 table 섹션으로 분리했다. 이 섹션은 같은 1. Pass-Off Sentences 제목 아래의 (2)~(4)이다.' }),
    S('application', '2. Application Sentences', 50, [
      G(null, [
        I(50, 'The bible was mine.', ['mine']),
        I(50, 'New machine has been used for our business.', ['our']),
        I(50, 'The purse is yours.', ['yours']),
        I(50, 'Everyone knows that the company is hers, not theirs.', ['hers', 'theirs']),
        I(50, 'I know the truth by myself.', ['myself']),
        I(50, 'We have to go through this trouble ourselves.', ['ourselves']),
        I(50, 'Knowing yourself is really important in happy life.', ['yourself']),
        I(50, 'Nobody could save them but themselves.', ['themselves']),
      ], { inferredSubPoint: '(1) 인칭 / 소유 / 복합 인칭 대명사' }),
      G(null, [
        I(50, 'I have a cat. I like it very much.', ['it']),
        I(50, 'Vivaldi didn’t know about it.', ['it']),
        I(50, 'I feel like I study too much, and it is too hard. (10과)', ['it']),
        I(50, 'It’s a dog and its hair is gray.', ['It’s', 'its']),
        I(50, 'It is a great way to talk to my friends about what we did during the day. (10과)', ['It']),
        I(51, 'It appeared that James had a mental problem.', ['It']),
        I(51, 'Scientific advances make it possible for us to control many diseases.', ['it']),
        I(51, 'It was the window that I broke yesterday.', ['It']),
        I(51, 'It is the exceptionally rapid growth of computer that has changed every aspect of our lives.', ['It', 'that']),
        I(51, 'It rains.', ['It']),
        I(51, 'It is fine today.', ['It']),
        I(51, 'What time is it?', ['it']),
        I(51, 'It usually takes me 15minutes to walk to school. (5과)', ['It']),
      ], { inferredSubPoint: '(2) 대명사 it' }),
      G(null, [
        I(51, 'Who is my best friend? (3과)', ['Who']),
        I(51, 'Whose book is this?', ['Whose book']),
        I(51, 'Whom do you like most?', ['Whom']),
        I(51, 'Which is yours?', ['Which']),
        I(51, 'What is he?', ['What']),
        I(51, 'What is this?', ['What']),
        I(52, 'What is the purpose of the school education?', ['What']),
        I(52, 'Where can you find her in this city?', ['Where']),
      ], { inferredSubPoint: '(3) 의문대명사' }),
      G(null, [
        I(52, 'This is the story about how the nation of Korea was founded. (17과)', ['This']),
        I(52, 'During this time, our teacher calls roll.(5과)', ['this']),
        I(52, 'This is the well of Abraham.', ['This']),
        I(52, 'These are the books about our history.', ['These']),
        I(52, 'Students will be able to talk about their friends at these academies. (7과)', ['these']),
        I(52, 'He had nothing to do with these corruption cases.', ['these']),
        I(52, 'That is a cloud.', ['That']),
        I(52, 'That is the house I want to buy.', ['That']),
        I(52, 'Students should be able to describe why they feel that way. (15과)', ['that']),
        I(52, 'Those are caps that I put on yesterday.', ['Those']),
        I(52, 'Those hate listening to long messages on answering machine.', ['Those']),
        I(52, 'Why do you think he likes those colors?(6과)', ['those']),
      ], { inferredSubPoint: '(3) 지시대명사' }),
      G(null, [
        I(52, 'One should obey his parents.', ['One']),
        I(53, 'Everyone will enjoy this party.', ['Everyone']),
        I(53, 'Someone has painted the floor.', ['Someone']),
        I(53, 'Anyone would be here.', ['Anyone']),
        I(53, 'No one knows the day when he will die.', ['No one']),
        I(53, 'Other people are singing and dancing.', ['Other']),
        I(53, 'Another solution will be given to us.', ['Another']),
        I(53, 'If there is any, I will borrow them to you.', ['any']),
        I(53, 'There is no way to go outside.', ['no']),
        I(53, 'None knows it.', ['None']),
        I(53, 'Each has a desk.', ['Each']),
        I(53, 'Either of them is wrong.', ['Either of']),
        I(53, 'Neither of them is wrong.', ['Neither of']),
        I(53, 'I have to study all weekend long.(11과)', ['all']),
        I(53, 'I have to do homework from both the academies and school. (10과)', ['both', 'and']),
      ], { inferredSubPoint: '(4) 부정대명사와 부정형용사' }),
    ], { note: 'Application에는 소제목이 인쇄되어 있지 않다. 순서가 Pass-Off (1)~(4)를 따르므로 inferredSubPoint로 묶었다.' }),
    RV(54, [
      TK('1.', 54, '다음을 보고 영작하세요.', ['ko_to_en_compose'], [
        R(54, '그 성경책은 내 것이었어.', ['app', 1, 1], { corrected: 'The Bible was mine.' }),
        R(54, '새 기계가 우리의 사업을 위해 사용되어져 왔어.', ['app', 1, 2], { corrected: 'A new machine has been used for our business.' }),
        R(54, '그 지갑은 너의 것이야.', ['app', 1, 3]),
        R(54, '그 회사가 그녀의 것이지 그들의 것이 아니라는 것을 모두가 알아', ['app', 1, 4]),
        R(54, '나는 내 스스로 진실을 안다.', ['app', 1, 5], { corrected: 'I know the truth myself.', note: '책의 by myself는 뜻이 어긋남. 문장을 바꾼다면 I found out the truth by myself.(한국어: 나는 혼자 힘으로 진실을 알아냈다.)' }),
        R(54, '우리는 이 난관을 우리 스스로 극복해야 한다.', ['app', 1, 6], { note: 'We have to overcome this difficulty ourselves.도 정답 처리' }),
        R(54, '네 자신을 아는 것은 행복한 삶을 위해 정말 중요하다.', ['app', 1, 7], { corrected: 'Knowing yourself is really important for a happy life.' }),
        R(54, '그들 자신 이외에는 아무도 그들을 구원할 수 없었다.', ['app', 1, 8]),
      ], { focus: '소유대명사·재귀대명사(복합 인칭 대명사)' }),
      TK('2.', 55, '다음을 it을 사용하여 영작하세요.', ['ko_to_en_compose', 'use_it'], [
        R(55, '나는 고양이가 한 마리 있는데 그것을 매우 좋아한다.', ['app', 2, 1]),
        R(55, '비발디는 그것에 대해 몰랐다.', ['app', 2, 2]),
        R(55, '나는 너무 많이 공부하는 것 같고, 그게 너무 힘들다.', ['app', 2, 3]),
        R(55, '그것은 개이고 그것의 털은 회색이다.', ['app', 2, 4]),
        R(55, '우리가 하루 동안 행했던 것에 대해 친구들과 이야기하기에 그것은 훌륭한 방법이다.', ['app', 2, 5]),
        R(55, '제임스 는 정신적인 문제가 있는 것으로 보인다.', ['app', 2, 6], { note: '한국어가 현재형이라 It appears that James has a mental problem.도 정답 처리' }),
        R(55, '과학적 진보는 우리가 수많은 질병을 다스리는 것을 가능하게 만든다.', ['app', 2, 7]),
        R(55, '어제 내가 깨뜨린 것은 유리창이다.', ['app', 2, 8], { note: 'It is the window that I broke yesterday.도 정답 처리' }),
        R(55, '우리 삶의 모든 양상을 변화시켜 온 것은 유별나게 급속한 컴퓨터의 성장이다.', ['app', 2, 9], { corrected: 'It is the exceptionally rapid growth of computers that has changed every aspect of our lives.' }),
        R(55, '비가 온다.', ['app', 2, 10], { note: 'It’s raining.도 정답 처리(더 자연스러움)' }),
        R(55, '오늘은 맑은 날이다.', ['app', 2, 11], { note: 'It’s sunny(clear) today.도 정답 처리' }),
        R(55, '몇 시입니까?', ['app', 2, 12]),
        R(55, '학교까지 걸어가는 데는 나에게는 15분 걸린다.', ['app', 2, 13], { corrected: 'It usually takes me 15 minutes to walk to school.', note: '한국어에 usually가 없어 It takes me 15 minutes to walk to school.도 정답 처리' }),
      ]),
      TK('3.', 56, '다음을 보고 영작하세요.', ['ko_to_en_compose'], [
        R(56, '누가 나의 가장 친한 친구이니?', ['app', 3, 1]),
        R(56, '그의 직업은 무엇이니?', ['app', 3, 5], { corrected: 'What does he do?', note: '책 답 What is he?는 현대 영어에서 어색. What is his job?도 정답 처리' }),
        R(56, '이것은 무엇이니?', ['app', 3, 6]),
        R(56, '학교 교육의 목적은 무엇인가?', ['app', 3, 7], { corrected: 'What is the purpose of school education?' }),
        R(56, '이 도시에서 어디서 그녀를 찾을 수 있을까?', ['app', 3, 8]),
        R(56, '이것은 한국이 어떻게 설립되었는가에 대한 이야기이다.', ['app', 4, 1]),
        R(56, '이 시간 동안, 우리 선생님은 출석을 부르신다.', ['app', 4, 2]),
        R(56, '이것은 아브라함의 우물이다.', ['app', 4, 3], { note: 'This is Abraham’s well.도 정답 처리' }),
        R(56, '이것들은 우리 역사에 관한 책들이다.', ['app', 4, 4]),
        R(56, '학생들은 이 학원들에서 친구들과 이야기 할 수 있을 것이다.', ['app', 4, 5], { note: '한국어는 친구들과(with) 이야기, 책 영어는 친구들에 대해(about) 이야기 — 한국어대로면 Students will be able to talk with their friends at these academies.' }),
        R(56, '그는 이 부패 사건들과 무관했다.', ['app', 4, 6]),
        R(56, '저것은 구름이다.', ['app', 4, 7]),
        R(56, '저것은 내가 사고 싶은 집이다.', ['app', 4, 8]),
        R(56, '학생들은 왜 그들이 그렇게 느끼는지 설명 할 수 있어야 한다.', ['app', 4, 9]),
        R(56, '그것들은 내가 어제 썼던 모자들이다.', ['app', 4, 10], { note: '한국어 그것들은 → 영어 They are ~도 가능하지만 이 단원 목표는 Those' }),
        R(56, '그 사람들은 전화응답기의 긴 메시지를 듣기 싫어한다.', ['app', 4, 11], { corrected: 'Those people hate listening to long messages on answering machines.' }),
      ], { focus: '의문대명사·지시대명사', note: 'Application (3)의 Whose book is this? / Whom do you like most? / Which is yours? / Why do you think he likes those colors? 4문장은 Review에 없어 한국어가 어디에도 없다.' }),
      TK('4.', 57, '다음을 보고 영작하세요.', ['ko_to_en_compose'], [
        R(57, '사람은 그 부모님의 말씀에 순종해야 한다.', ['app', 5, 1], { note: 'One should obey one’s parents.도 정답 처리(현대 표준)' }),
        R(57, '모두가 이 파티를 즐길 것이다.', ['app', 5, 2]),
        R(57, '누군가가 마루를 칠했다.', ['app', 5, 3]),
        R(57, '누구라도 이곳에 있을 거야.', ['app', 5, 4], { note: '영어·한국어 모두 뜻이 불분명 — 문장 교체 권장(예: Anyone can come here. / 누구든지 여기 올 수 있어.)' }),
        R(57, '아무도 그가 죽게 될 날짜를 모른다.', ['app', 5, 5]),
        R(57, '다른 사람들은 노래하고 춤춘다.', ['app', 5, 6], { note: '한국어가 단순현재라 Other people sing and dance.도 정답 처리' }),
        R(57, '또 다른 해결책이 우리에게 주어질 것이다.', ['app', 5, 7]),
        R(57, '조금이라도 있다면, 내가 네게 그것들을 빌려 줄 거야.', ['app', 5, 8], { corrected: 'If there are any, I will lend them to you.' }),
        R(57, '밖으로 나가는 길이 없어.', ['app', 5, 9]),
        R(57, '아무도 모른다.', ['app', 5, 10], { corrected: 'No one knows it.', note: '한국어에 it(그것을)이 없어 No one knows.도 정답 처리' }),
        R(57, '각 사람이 책상을 가진다.', ['app', 5, 11], { note: 'Each of us has a desk. / Each person has a desk.도 정답 처리' }),
        R(57, '그들 중 한쪽은 틀린 거야.', ['app', 5, 12]),
        R(57, '그들 둘 다 틀린 거야.', ['app', 5, 13], { note: '한국어와 책 영어의 뜻이 정반대. 한국어를 그들 둘 다 틀리지 않았어.로 고쳐야 책 답과 맞는다. 한국어 그대로면 정답은 Both of them are wrong.' }),
        R(57, '나는 주말 내내 공부해야 한다.', ['app', 5, 14]),
        R(57, '나는 학원과 학교 두 곳에서의 숙제를 해야만 한다.', ['app', 5, 15]),
      ], { focus: '부정대명사·부정형용사' }),
    ]),
  ],
};

// ======================================================================
// TOPIC 8  관계대명사  (p58-63)
// ======================================================================
const t8 = {
  printedLabel: 'TOPIC 8', title: '관계대명사', printedTitle: '관계 대명사', pages: [58, 63],
  continuesFromPrevRange: false, continuesIntoNextRange: false,
  sections: [
    S('passOff', '1. Pass-Off Sentences', 58, [
      G('(1) who / whose / whom / which / of which', [
        I(58, 'He loves the girl who follows him.', ['who']),
        I(58, 'He loves the girl whose father is humble and honest.', ['whose']),
        I(58, 'The person whom I admire the most is Hiddink.', ['whom']),
        I(58, 'Most people make Song-Pyun which is a Korean traditional rice cake.', ['which']),
        I(58, 'She has a bird of which color is beautiful. (= whose)', ['of which']),
        I(58, 'I have a dog which my son likes.', ['which']),
      ]),
      G('(2) that', [
        I(58, 'I can reflect on things that did not go well.', ['that']),
        I(58, 'I start thinking about the fun things that I have planned for the upcoming weekend.', ['that']),
        I(58, 'This is the first letter that he sent.', ['that']),
        I(58, 'He is my friend that I love.', ['that'], { appVariant: 'application (2) that[라벨 없음·추론] item 5 (have loved)' }),
        I(58, 'He is the very man that I want to see', ['that']),
        I(58, 'It is all knowledge that I have.', ['that']),
        I(58, 'I can do anything that man can do.', ['that']),
        I(58, 'There’s nothing that I like better.', ['that']),
      ]),
      G('(3) what', [
        I(58, 'I don’t know who did it.', ['who did it']),
        I(58, 'I don’t know which is his.', ['which is his']),
        I(58, 'I asked him what he wanted.', ['what he wanted']),
        I(58, 'I knew what he wanted.', ['what he wanted']),
      ]),
    ]),
    S('application', '2. Application Sentences', 59, [
      G(null, [
        I(59, 'He loves the girl who follows him.', ['who']),
        I(59, 'A hairdresser is someone who designs persons’ hair.', ['who']),
        I(59, 'The man who was injured in the accident is now in hospital.', ['who']),
        I(59, 'He loves the girl whose father is humble and honest.', ['whose']),
        I(59, 'What is the name of the man whose car you borrowed?', ['whose']),
        I(59, 'I met the boy whose mother interprets foreign books.', ['whose']),
        I(59, 'The person whom I admire the most is Hiddink. (15과)', ['whom']),
        I(59, 'The man whom I saw last Sunday was a famous singer.', ['whom']),
        I(59, 'Most people make Song-Pyun which is a Korean traditional rice cake. (18과)', ['which']),
        I(59, 'The bed which I slept in last night was not convenient.', ['which']),
        I(59, 'She has a bird of which color is beautiful. (= whose)', ['of which']),
        I(59, 'I didn’t like the food, most of which was tasteless.', ['of which']),
        I(59, 'The woman to whom he was talking was his wife.', ['to whom']),
        I(59, 'I have a dog which my son likes.', ['which']),
      ], { inferredSubPoint: '(1) who / whose / whom / which / of which' }),
      G(null, [
        I(59, 'I can reflect on things that did not go well. (10과)', ['that']),
        I(59, 'I start thinking about the fun things that I have planned for the upcoming weekend. (10과)', ['that']),
        I(59, 'Have you found the key that you lost?', ['that']),
        I(60, 'This is the first letter that he sent.', ['that']),
        I(60, 'He is my friend that I have loved.', ['that']),
        I(60, 'He is the very man that I want to see.', ['that']),
        I(60, 'Do you know anyone that speaks French or German?', ['that']),
        I(60, 'It is all knowledge that I have.', ['that']),
        I(60, 'There is someone (who) wants you on the phone.', ['(who)']),
        I(60, 'He is not the man (that) he used to be.', ['(that)']),
        I(60, 'I can do anything that man can do.', ['that']),
        I(60, 'There’s nothing that I like better.', ['that']),
      ], { inferredSubPoint: '(2) that' }),
      G(null, [
        I(60, 'I don’t know who did it.', ['who did it']),
        I(60, 'I don’t know which is his.', ['which is his']),
        I(60, 'I asked him what he wanted.', ['what he wanted']),
        I(60, 'I knew what he wanted.', ['what he wanted']),
        I(60, 'What I would like is a piano.', ['What I would like']),
        I(60, 'That’ not what I meant to say.', ['what I meant to say']),
        I(60, 'I’ll do what you want me to do.', ['what you want me to do']),
        I(60, 'Invest us what money you have.', ['what money you have']),
        I(60, 'He is not what he was.', ['what he was']),
      ], { inferredSubPoint: '(3) what' }),
    ], { note: 'Application에는 소제목이 인쇄되어 있지 않다. 순서가 Pass-Off (1)~(3)을 따르므로 inferredSubPoint로 묶었다(Review 1·2·3 지시문도 같은 구분).' }),
    RV(61, [
      TK('1.', 61, '다음을 관계 대명사 who / whose/ whom /which / of which를 이용하여 영작하세요.', ['ko_to_en_compose', 'relative_pronoun_given'], [
        R(61, '그는 그를 따르는 소녀를 사랑한다.', ['app', 1, 1], { hint: '(who)', raw: '그는 그를 따르는 소녀를 사랑한다. (who)' }),
        R(61, '미용사는 사람의 머리를 디자인하는 사람이다.', ['app', 1, 2], { hint: '(who)', raw: '미용사는 사람의 머리를 디자인하는 사람이다. (who)', corrected: 'A hairdresser is someone who styles people’s hair.' }),
        R(61, '그 사고에서 다쳤던 그 남자는 지금 병원에 있다.', ['app', 1, 3], { hint: '(who)', raw: '그 사고에서 다쳤던 그 남자는 지금 병원에 있다. (who)', note: '미국식 in the hospital도 정답 처리' }),
        R(61, '그는 아버지가 겸손하고 정직한 소녀를 사랑한다.', ['app', 1, 4], { hint: '(whose)', raw: '그는 아버지가 겸손하고 정직한 소녀를 사랑한다. (whose)' }),
        R(61, '네가 빌린 차주의 이름이 무엇이니?', ['app', 1, 5], { hint: '(whose)', raw: '네가 빌린 차주의 이름이 무엇이니? (whose)' }),
        R(61, '나는 어머니가 외국서적을 번역하는 소년을 만났다.', ['app', 1, 6], { hint: '(whose)', raw: '나는 어머니가 외국서적을 번역하는 소년을 만났다. (whose)', corrected: 'I met the boy whose mother translates foreign books.' }),
        R(61, '내가 가장 존경하는 사람은 히딩크이다.', ['app', 1, 7], { hint: '(whom)', raw: '내가 가장 존경하는 사람은 히딩크이다. (whom)' }),
        R(61, '지난 일요일에 내가 만난 사람은 유명한 가수였다.', ['app', 1, 8], { hint: '(whom)', raw: '지난 일요일에 내가 만난 사람은 유명한 가수였다.(whom)', note: '한국어 만난(met)과 책 영어 saw가 다름 — met도 정답 처리' }),
        R(61, '대부분의 사람들은 한국의 전통 떡인 송편을 만든다.', ['app', 1, 9], { hint: '(which)', raw: '대부분의 사람들은 한국의 전통 떡인 송편을 만든다. (which)', corrected: 'Most people make songpyeon, which is a traditional Korean rice cake.' }),
        R(61, '지난밤 내가 잤던 침대는 편하지 않았다.', ['app', 1, 10], { hint: '(which)', raw: '지난밤 내가 잤던 침대는 편하지 않았다. (which)', corrected: 'The bed which I slept in last night was not comfortable.' }),
        R(61, '그녀는 색깔이 아름다운 새를 가지고 있다.', ['app', 1, 11], { hint: '(of which)', raw: '그녀는 색깔이 아름다운 새를 가지고 있다. (of which)', corrected: 'She has a bird the color of which is beautiful.', note: '책 답은 비문. whose를 쓴 She has a bird whose color is beautiful.도 정답 처리' }),
        R(61, '나는 그 음식을 좋아하지 않았는데, 그 대부분은 맛이 없었다.', ['app', 1, 12], { hint: '(most of which)', raw: '나는 그 음식을 좋아하지 않았는데, 그 대부분은 맛이 없었다. (most of which)' }),
        R(61, '그가 말하고 있는 그 여자가 그의 아내이다.', ['app', 1, 13], { hint: '(to whom)', raw: '그가 말하고 있는 그 여자가 그의 아내이다. (to whom)', note: '한국어가 현재형이라 The woman to whom he is talking is his wife.도 정답 처리' }),
        R(61, '나는 내 아들이 좋아하는 개 한 마리를 가지고 있다.', ['app', 1, 14], { hint: '(which)', raw: '나는 내 아들이 좋아하는 개 한 마리를 가지고 있다. (which)' }),
      ], { note: '괄호 안 단어는 빈칸이 아니라 반드시 사용할 관계사 힌트(hint).' }),
      TK('2.', 62, '다음 문장은 관계 대명사 that을 이용하여 영작하세요.', ['ko_to_en_compose', 'relative_that'], [
        R(62, '나는 잘 진행되지 못한 것들에 대해 반성할 수 있다.', ['app', 2, 1]),
        R(62, '나는 다가오는 주말 동안 내가 준비했던 재미있는 것들에 대해 생각하기 시작한다.', ['app', 2, 2]),
        R(62, '너는 잃어버렸던 키를 찾았니?', ['app', 2, 3]),
        R(62, '이것은 그가 보냈던 첫 번째 편지이다.', ['app', 2, 4]),
        R(62, '그는 내가 사랑했던 나의 친구이다.', ['app', 2, 5], { note: 'He is the friend that I (have) loved.도 정답 처리' }),
        R(62, '그는 내가 만나고 싶은 바로 그 사람이다.', ['app', 2, 6]),
        R(62, '너는 불어나 독일어를 말하는 누군가를 아니?', ['app', 2, 7]),
        R(62, '이것은 내가 가진 지식의 전부이다.', ['app', 2, 8], { corrected: 'This is all the knowledge that I have.' }),
        R(62, '전화로 당신을 원하는 누군가가 있네요.', ['app', 2, 9], { hint: '(who)', raw: '전화로 당신을 원하는 누군가가 있네요. (who)', corrected: 'There is someone who wants you on the phone.', note: 'that 과제인데 (who) 힌트가 붙어 있음. that으로 쓴 답도 정답 처리' }),
        R(62, '그는 예전의 그가 아니다.', ['app', 2, 10], { note: 'Review 3 item 9와 같은 한국어 — He is not what he was.도 정답 처리' }),
        R(62, '나는 사람이 할 수 있는 일은 무엇이라도 한다.', ['app', 2, 11], { corrected: 'I can do anything that a person can do.' }),
        R(62, '내가 더 좋아하는 것은 없다.', ['app', 2, 12]),
      ]),
      TK('3.', 63, '복합 관계 대명사를 사용하여 문장을 영작하시오.', ['ko_to_en_compose', 'relative_what'], [
        R(63, '나는 누가 그것을 했는지 모른다.', ['app', 3, 1], { note: 'who는 관계대명사가 아니라 간접의문문의 의문사' }),
        R(63, '나는 어느 것이 그의 것인지 모른다.', ['app', 3, 2], { note: 'which는 간접의문문의 의문사' }),
        R(63, '나는 그가 원하는 것이 무엇인지 그에게 물었다.', ['app', 3, 3], { note: 'what은 간접의문문의 의문사(묻다)' }),
        R(63, '나는 그가 원하는 것을 알았다.', ['app', 3, 4]),
        R(63, '내가 좋아하는 것은 피아노이다.', ['app', 3, 5], { note: '한국어(좋아하는)와 책 영어(would like = 원하는)가 다름 — 한국어대로면 What I like is the piano.' }),
        R(63, '그것은 내가 말하려고 한 것이 아니다.', ['app', 3, 6], { corrected: 'That’s not what I meant to say.' }),
        R(63, '나는 당신이 내가 하기를 원하는 것을 할겁니다.', ['app', 3, 7]),
        R(63, '당신이 가진 모든 돈을 우리에게 투자하시오.', ['app', 3, 8], { corrected: 'Invest what money you have in us.', note: 'Invest all the money you have in us.도 정답 처리' }),
        R(63, '그는 예전의 그가 아니다.', ['app', 3, 9], { note: 'Review 2 item 10과 같은 한국어 — He is not the man (that) he used to be.도 정답 처리' }),
      ], { note: '지시문의 복합 관계 대명사는 잘못된 용어(issues 참조).' }),
    ]),
  ],
};

const topics = [t4, t5, t6, t7, t8];

// ---------- resolve cross references ----------
function groupKey(g) { return g.label ? g.label : g.inferredSubPoint + '[라벨 없음·추론]'; }
function shortKey(g) { return g.label ? g.label.replace(/^\(3\) 의문대명사와 지시 대명사 \/ /, '(3) ') : g.inferredSubPoint; }
const normKey = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'가-힣 ]/g, ' ').replace(/\s+/g, ' ').trim();

for (const t of topics) {
  const pass = t.sections.find(s => s.kind === 'passOff');
  const app = t.sections.find(s => s.kind === 'application');
  for (const s of t.sections) {
    if (s.kind !== 'review') continue;
    for (const task of s.tasks) {
      const def = task.defaultExtraSlot === undefined ? null : task.defaultExtraSlot;
      const tno = task.no.replace(/\.$/, '');
      task.items.forEach((r, idx) => {
        r.n = String(idx + 1);
        if (r.extraSlot === '__default__') r.extraSlot = def;
        const resolve = (ref) => {
          if (!ref || ref[0] === 'none') return null;
          const sec = ref[0] === 'app' ? app : pass;
          const g = sec.groups[ref[1] - 1];
          if (!g) throw new Error(`bad group ref ${t.printedLabel} ${JSON.stringify(ref)}`);
          const it = g.items[ref[2] - 1];
          if (!it) throw new Error(`bad item ref ${t.printedLabel} ${JSON.stringify(ref)}`);
          return { it, src: `${ref[0] === 'app' ? 'application' : 'passOff'} ${groupKey(g)} item ${ref[2]}` };
        };
        const a = resolve(r._ref);
        if (a) {
          r.answerFromBook = a.it.en;
          r.answerSource = a.src;
          if (r.proposedAnswer) throw new Error('proposed with book answer ' + r.prompt);
          if (ref0(r._ref) === 'app') a.it.reviewRef = (a.it.reviewRef ? a.it.reviewRef + '; ' : '') + `Review ${tno} item ${r.n}`;
        } else if (!r.proposedAnswer) {
          throw new Error('no answer at all: ' + r.prompt);
        }
        const q = resolve(r._qref);
        if (q) {
          r.questionSource = q.src;
          q.it.reviewRef = (q.it.reviewRef ? q.it.reviewRef + '; ' : '') + `Review ${tno} item ${r.n} (질문으로 사용)`;
        }
      });
      delete task.defaultExtraSlot;
    }
  }
  // application items without review
  for (const g of app.groups) for (const it of g.items) if (!('reviewRef' in it)) it.reviewRef = null;
  // pass-off -> application exact match
  const appIndex = [];
  app.groups.forEach(g => g.items.forEach((it, k) => appIndex.push({ key: normKey(it.en), src: `application ${groupKey(g)} item ${k + 1}` })));
  for (const s of t.sections) {
    if (s.kind !== 'passOff') continue;
    for (const g of s.groups) for (const it of g.items) {
      const hit = appIndex.find(a => a.key === normKey(it.en));
      it.appRef = hit ? hit.src : null;
    }
  }
}
function ref0(ref) { return ref ? ref[0] : null; }

// ---------- issues ----------
const issues = [
  X(30, 'passOff (1) 문장의 종류 전체 + Review 1 지시문(p33)', 'I am 11 years old. (단문) / I have a wide variety of friends(서술문) / Study hard. Be happy. (명령문)', 'grammar_explanation_wrong',
    '문장 구조 기준(단문·중문·복문)과 문장 기능 기준(서술문·명령문·기원문·감탄문)을 한 목록에 섞었다. I am 11 years old.는 단문이면서 서술문이고, 명령문·기원문·감탄문 예문도 모두 구조상 단문이다. 기능 기준에는 의문문이 빠져 있어 Do you want some more salad, or do you want some dessert? 같은 문장은 기능상 들어갈 칸이 없다. 그래서 Review 1(7개 중 하나를 쓰기)의 정답이 하나로 정해지지 않는다.',
    '두 기준을 나눠 가르친다: ① 구조 — 단문/중문/복문, ② 종류 — 평서문(서술문)/의문문/명령문/감탄문/기원문. Review 1은 두 칸(구조, 종류)으로 나누거나 복수 정답을 허용한다.', 'high', 'high'),
  X(30, 'passOff (2) 부정문 item 1', 'Our country’s soccer players are not one of the best team. (be동사)', 'english_grammar',
    'one of the best 뒤에는 복수명사가 오므로 team은 teams여야 한다. 또 주어가 선수들(players)인데 보어가 팀들 중 하나라 주어와 보어가 맞지 않는다. STUDENT s15-1 원문은 At that time, our national soccer team was not one of the best teams in the world.(과거 한 시점의 사실)이다.',
    'Our national soccer team is not one of the best teams. (원문대로 과거 사실로 쓰려면 At that time, our national soccer team was not one of the best teams in the world.)', 'high', 'high'),
  X(30, 'passOff (2) 부정문 item 5 + application (2) item 5(p32)', 'He never lost his confidence.( never 사용)', 'layout_or_extraction',
    '굵은 글씨가 neve까지만 적용되고 마지막 r는 보통 글씨다(p30, p32 모두).', 'never 전체를 강조 표시한다.', 'high', 'low'),
  X(30, 'passOff (1) item 4', 'I have a wide variety of friends(서술문)', 'english_grammar',
    '문장 끝 마침표가 빠졌다(Application p31에는 있음).', 'I have a wide variety of friends. (서술문)', 'high', 'low'),
  X(31, 'application (1) 문장의 종류[추론] item 2', 'We are very close to one another. (1과)', 'layout_or_extraction',
    '과 번호 오류. 이 문장은 STUDENT 1과(s1-*)에는 없고 s2-6(2과) My family is always happy, and we are very close to one another, …에서 왔다.', '(2과)', 'high', 'medium'),
  X(31, 'application (1) 문장의 종류[추론] item 8 + Review 1 item 8(p34)', 'When she arrived at London, she didn’t have any friends.', 'english_grammar',
    '도시·나라에 도착할 때는 arrive in을 쓴다(arrive at은 역·건물 같은 지점).', 'When she arrived in London, she didn’t have any friends.', 'high', 'high'),
  X(32, 'application (2) 부정문[추론] item 1 + Review 2 item 1(p36)', 'Our country’s soccer players are not one of the best teams. (15과) / 우리나라 축구 선수들은 최고의 팀들 중의 하나가 아니다.', 'english_grammar',
    '주어(선수들)와 보어(팀들 중 하나)가 맞지 않는다. STUDENT s15-1은 At that time, our national soccer team was not one of the best teams in the world.로 과거 한 시점의 사실인데, 현재형으로 바꾸면서 한국 대표팀에 대한 현재 평가처럼 읽힌다. 한국어 Review 문장도 같은 문제를 가진다.',
    'Our national soccer team is not one of the best teams in the world. / 한국어: 우리나라 축구 대표팀은 세계 최고의 팀 중 하나가 아니다.', 'high', 'high'),
  X(32, 'passOff (2) item 4 + application (2) item 4 + Review 2 item 4(p36)', 'There is not a cake on the plate.', 'english_unnatural',
    '틀린 문장은 아니지만 is not a는 강조 어감이고, 보통은 There is no cake / There isn’t a cake를 쓴다. 한국어 접시에는 케이크가 없다.의 자연스러운 번역은 There is no cake on the plate.이다.',
    'There isn’t a cake on the plate. (또는 There is no cake on the plate.) — 웹 채점에서는 세 형태 모두 정답', 'medium', 'low'),
  X(32, 'application (2) item 6 + Review 2 item 6(p36)', 'Nothing was important but you. / 아무것도 당신을 제외하고는 중요하지 않아요.', 'translation_mismatch',
    '영어는 과거(was), 한국어는 현재(않아요)다. 한국어 어순도 어색하다.', '한국어를 당신 말고는 아무것도 중요하지 않았어요.로 고치거나 영어를 Nothing is important but you.로 맞춘다.', 'high', 'medium'),
  X(33, 'Review 1 item 5', '사라는 파티에 갔지만, 폴은 그의 집에 머물러 있었다.', 'translation_mismatch',
    '영어 문장의 last week(지난주)가 한국어에 없다.', '사라는 지난주에 파티에 갔지만, 폴은 집에 있었다.', 'high', 'low'),
  X(34, 'Review 1 item 10', '나는 많은 다양한 친구들이 있다.', 'translation_mismatch',
    '많은 다양한은 겹말이라 어색하다(a wide variety of = 아주 다양한).', '나는 아주 다양한 친구들이 있다.', 'medium', 'low'),
  X(34, 'Review 1 item 12 앞', ']', 'layout_or_extraction',
    '공부 열심히 해. 행복해. 앞에 작은 세로 획이 찍혀 있고 텍스트 층에서는 ]로 추출된다. 내용과 무관한 인쇄 잡티다.', '웹 이관 시 제거', 'high', 'low'),
  X(34, 'Review 1 item 12', '공부 열심히 해. 행복해.', 'translation_mismatch',
    '행복해.는 나는 행복해(서술)로도 읽혀 명령문 Be happy.의 뜻이 드러나지 않는다.', '공부 열심히 해. 행복하렴.', 'medium', 'low'),
  X(35, 'Review 1 item 17', '행복한 새해를 맞이하시길', 'korean_typo', '문장 끝 문장부호가 없다.', '행복한 새해를 맞이하시길!', 'high', 'low'),
  X(35, 'Review 1 item 19', '얼마나 추운지!', 'translation_mismatch', '말이 끝나지 않은 어색한 감탄 표현이다.', '정말 춥구나! (또는 얼마나 추운지 몰라!)', 'medium', 'low'),
  X(36, 'Review 2 지시문', '다음 내용을 보고 부정어(not, never, nothing 등)을 사용하여 영작하시오.', 'korean_typo',
    '괄호 앞 부정어에 붙는 조사는 를이다.', '다음 내용을 보고 부정어(not, never, nothing 등)를 사용하여 영작하시오.', 'high', 'low'),
  X(36, 'Review 2 item 3', '우리는 저녁시간에 함께 할 수 없다.', 'korean_typo',
    '함께하다는 한 단어, 저녁 시간은 띄어 쓴다.', '우리는 저녁 시간에 함께할 수 없다.', 'medium', 'low'),
  X(37, 'passOff (1) item 6 + (2) item 6', 'Who is my best friend? (3과) / My best friend is 대한.', 'english_unnatural',
    '묻고 답하기 짝으로 제시했는데 질문이 내 가장 친한 친구는 누구지?가 되어 대화가 성립하지 않는다(STUDENT s3-2에서는 자기소개 글의 소제목 역할). 답의 이름이 한글 대한으로 인쇄되어 영어 음성(TTS)과 입력에 쓸 수 없다.',
    'Who is your best friend? — My best friend is Daehan.', 'high', 'medium'),
  X(37, 'passOff (2) item 3, (3) items 4·6', 'No, he can’t / Yes, he does / No, he doesn’t', 'english_grammar',
    '문장 끝 마침표가 빠졌다.', 'No, he can’t. / Yes, he does. / No, he doesn’t.', 'high', 'low'),
  X(37, 'passOff (3) items 1·5, (4) items 1~3 + Review 3 items 1·3~7(p41)', 'isn’t it ? / can he ? / Isn’t this a hat ? / Is there not a cake ? / Can’t you swim ? / 아니냐 ? / 없니 ?', 'layout_or_extraction',
    '물음표 앞에 공백이 들어가 있다(영어·한국어 모두 물음표는 앞말에 붙여 쓴다).', 'isn’t it? / can he? / Isn’t this a hat? / 아니냐? / 없니?', 'high', 'low'),
  X(37, 'passOff (4) item 2 + application (3) item 2 + Review 3 item 2(p41)', 'Is there not a cake?', 'english_unnatural',
    'Is there not …?은 딱딱한 문어체로 회화에서는 거의 쓰지 않는다. 한국어 케이크가 없니?의 자연스러운 부정의문문은 Isn’t there a cake?이다.',
    'Isn’t there a cake? (원문 형태도 정답으로 허용)', 'high', 'medium'),
  X(39, 'application (3) item 6 + Review 3 item 6(p41)', 'Doesn’t he have his fault?', 'english_unnatural',
    '사람에게 결점이 있다는 뜻의 관용 표현은 복수 faults를 쓴다(have one’s faults).', 'Doesn’t he have his faults? (또는 Doesn’t he have any faults?)', 'high', 'medium'),
  X(40, 'Review 1 item 4', 'Are those apples green (yes)', 'english_grammar', '의문문인데 물음표가 빠졌다.', 'Are those apples green? (yes)', 'high', 'low'),
  X(40, 'Review 1 전체', '다음 질문을 보고 yes나 no로 대답하시오.', 'answer_missing',
    'yes/no 단답(Yes, I am. / No, she isn’t. 등)의 정답이 책 어디에도 없다. Do you like to be around your friends?의 답 Yes, I do.만 Pass-Off (2)에 있다. Can he play the guitar well?은 Pass-Off (2)에 No, he can’t로 나오지만 Review 단서는 (yes)라 답이 다르다.',
    '문항별 모범 단답을 새로 만든다(이 JSON의 proposedAnswer). 축약·비축약(isn’t / is not / ’s not) 변형을 모두 정답으로 둔다.', 'high', 'medium'),
  X(40, 'Review 1 item 2', 'Is Jane a teacher? (no)', 'layout_or_extraction',
    '이 문항의 단서 (no)만 굵게 인쇄됐다(나머지 18문항은 보통 글씨).', '다른 문항과 같은 글씨로 통일', 'high', 'low'),
  X(40, 'Review 1 items 6·12', 'Is your dog sick? (yes) / Do we have enough money? (no)', 'answer_ambiguous',
    '개를 가리키는 대명사(it/he/she)와 질문의 we에 대한 답(we/you)이 둘 이상 가능하다.', 'Yes, it is.(he/she 허용) / No, we don’t.(No, you don’t. 허용)', 'high', 'low'),
  X(41, 'Review 2 item 8', '너는 정오 전에 돌아 오지 않을 거야, 그렇지?', 'korean_typo',
    '돌아오다는 한 단어라 붙여 쓴다.', '너는 정오 전에 돌아오지 않을 거야, 그렇지?', 'high', 'low'),
  X(41, 'Review 3 item 5', '너는 지성적인 선택을 할 수 없니 ?', 'translation_mismatch',
    'intelligent choice를 지성적인 선택으로 직역해 어색하다.', '너는 현명한 선택을 할 수 없니?', 'medium', 'low'),
  X(42, 'passOff (1) item 5 + application (1) item 8(p44) + Review 1 item 8(p46)', 'Lunar New Year’s,  Buddha’s Birthday,  Chu-seok,  Soungni-san.', 'english_unnatural',
    '한국 고유명사의 로마자 표기가 비표준이다: 추석은 Chuseok(STUDENT s18-3도 Chuseok), 속리산은 Songnisan. Lunar New Year’s만으로는 명절 이름이 덜 갖춰졌다(STUDENT s18-2: Seollal, Lunar New Year’s Day).',
    'Lunar New Year’s Day (Seollal), Buddha’s Birthday, Chuseok, Songnisan', 'high', 'medium'),
  X(42, 'passOff (1) item 7', 'I want to live in kindness, truth and happiness.(추상명사)', 'layout_or_extraction',
    '추상명사 세 개 중 truth만 굵게 표시되지 않았다(p44 Application에서는 셋 다 굵게).', 'truth도 굵게', 'high', 'low'),
  X(42, 'table (2) 명사의 복수형 row 6)', 'roof : roofs , handkerchiefs, safes', 'grammar_explanation_wrong',
    '규칙 이름 자리에 예시 단어 roof만 적혀 있어 무엇을 설명하는지 알 수 없다. 내용은 5)의 예외(-f/-fe로 끝나도 -s만 붙이는 명사)다.', '5)의 예외 — -f/-fe + s : roofs, handkerchiefs, safes', 'high', 'medium'),
  X(42, 'table (2) rows 2)·7)·8)', '-es : buzzes, buses, brushes, watches / o + es / o+ -s', 'grammar_explanation_wrong',
    '-es를 붙이는 조건(-s, -x, -z, -ch, -sh로 끝나는 명사)이 없다. 7)(o+es)과 8)(o+s)도 어떤 단어가 어느 쪽인지 기준 없이 예만 있다.',
    '-s, -x, -z, -ch, -sh로 끝나면 -es : buses, boxes, buzzes, brushes, watches (o로 끝나는 말은 단어별로 외우도록 안내)', 'high', 'low'),
  X(42, 'table (2) row 11)', '단수=복수 : deer, sheep, Chinese , Japanese', 'english_unnatural',
    '사람을 가리키는 a Chinese / a Japanese 같은 명사 용법은 현대 영어에서 어색하거나 결례로 받아들여진다(Chinese people, a Japanese person 권장).', 'deer, sheep, fish, series (국적어는 the Chinese / Japanese people처럼 따로 설명)', 'medium', 'low'),
  X(43, 'table (3) 4) 기수와 서수', 'nineteen / twenty … , tenth / eleventh … , one hundred, thousand, million, billion', 'layout_or_extraction',
    '줄바꿈 자리에서 쉼표가 빠졌고(nineteen 뒤, tenth 뒤), one hundred와 thousand의 표기가 일관되지 않다(one thousand).', '…, nineteen, twenty, … / …, tenth, eleventh, … / one hundred, one thousand, one million, one billion', 'high', 'low'),
  X(44, 'application (1) 명사의 종류와 성격[추론] item 2 + Review 1 item 2(p46)', 'Dolphins look like a small whale and they have large brains.', 'english_unnatural',
    '복수 주어 Dolphins와 단수 a small whale이 어긋난다. 명사 표시(굵게)가 관사 a에도 적용됐다.', 'Dolphins look like small whales, and they have large brains.', 'high', 'medium'),
  X(44, 'application (1) item 4 + Review 1 item 4(p46)', 'The concert was successful. / 그 콘서트는 성공적이다.', 'translation_mismatch',
    '영어는 과거, 한국어는 현재다.', '그 콘서트는 성공적이었다.', 'high', 'low'),
  X(44, 'application (1) item 8 + Review 1 item 8(p46)', 'Korea has many traditional days; Lunar New Year’s, Buddha’s Birthday, Chu-seok, (18과)', 'english_grammar',
    '문장이 쉼표로 끝나 미완성이고, 목록 앞에는 세미콜론이 아니라 콜론을 쓴다. traditional days보다 traditional holidays가 맞다(한국어도 전통 휴일들). STUDENT s18-1 원문은 We celebrate Seollal, Liberation Day, Children’s Day, Buddha’s Birthday, Chuseok, and many more.',
    'Korea has many traditional holidays: Seollal (Lunar New Year’s Day), Buddha’s Birthday and Chuseok.', 'high', 'high'),
  X(44, 'application (1) item 9 + Review 1 item 9(p46)', 'Mr. Hillman was a crazy man. / 힐만씨는 미친 사람이다.', 'translation_mismatch',
    '영어는 과거, 한국어는 현재다. 힐만씨는 힐만 씨로 띄어 쓴다.', '힐만 씨는 미친 사람이었다.', 'high', 'low'),
  X(44, 'application (1) item 12 + Review 1 item 12(p46)', 'Everyday he wants to eat some meat.', 'english_grammar',
    '매일이라는 부사는 두 단어 every day다(everyday는 일상적인이라는 형용사).', 'Every day he wants to eat some meat.', 'high', 'high'),
  X(44, 'application (1)(2) 굵은 글씨 ↔ Review 1 명사에 동그라미(p46-47)', 'Will you give me a glass of water? / His farm has many oxen. / Dolphins look like a small whale …', 'answer_ambiguous',
    'Review 1은 명사에 동그라미를 치라고 하지만 책의 굵은 글씨는 명사 정답표로 쓸 수 없다: glass, farm은 명사인데 굵지 않고 관사 a는 굵다. At first의 first, a lot of의 lot처럼 명사로 볼지 판단이 갈리는 단어도 있다.',
    '문항별 명사 정답 목록을 따로 만든다(이 JSON의 extraSlotAnswer). 판단이 갈리는 단어는 표시해도 안 해도 정답 처리.', 'high', 'medium'),
  X(45, 'application (2) 명사의 복수형[추론] item 3 + Review 1 item 16(p47)', 'She has three luxurious watches with gem.', 'english_grammar',
    'gem은 셀 수 있는 명사라 관사 없는 단수로 쓸 수 없다.', 'She has three luxurious watches with gems. (또는 three luxurious jeweled watches)', 'high', 'high'),
  X(45, 'application (2) item 7 + Review 1 item 20(p47)', 'In Saudi, one man can have many wives.', 'english_unnatural',
    '나라 이름은 Saudi Arabia다. 내용도 부정확하고(이슬람 법상 최대 4명), 특정 문화에 대한 고정관념을 줄 수 있어 어린 학습자용 예문으로 부적절할 수 있다.',
    'In Saudi Arabia, a man can have up to four wives. — 또는 wife–wives를 보여 주는 다른 예문으로 교체(예: The two men came with their wives.)', 'high', 'medium'),
  X(45, 'application (2) item 4 + Review 1 item 17(p47)', 'He has five babies in his home. / 그는 그의 집에 다섯 명의 아기가 있다.', 'english_unnatural',
    '그가 집에 아기를 다섯 명 가지고 있다는 상황이 어색하고 한국어도 부자연스럽다.', 'There are five babies in his home. / 그의 집에는 아기가 다섯 명 있다.', 'medium', 'low'),
  X(46, 'Review 1 item 8', '한국은 많은 전통 휴일들이 있다: 음력 설, 석가탄신일, 추석이다.', 'dated_fact',
    '석가탄신일은 2017년에 공휴일 공식 명칭이 부처님오신날로 바뀌었다(2012년 발행 당시에는 맞는 표기). 음력 설은 보통 설날이라 하고, …있다: …추석이다.는 문장이 어색하다.',
    '한국에는 설날, 부처님오신날, 추석 같은 전통 명절이 많다.', 'high', 'low'),
  X(46, 'Review 1 items 9·11', '힐만씨는 … / 제게 물 한잔을 주시겠어요?', 'korean_typo',
    '띄어쓰기: 힐만 씨, 물 한 잔.', '힐만 씨는 … / 제게 물 한 잔 주시겠어요?', 'high', 'low'),
  X(47, 'Review 1 item 14', '책, 컵 그리고 펜이 책상 위에 있다.', 'translation_mismatch',
    '영어는 table(탁자)인데 한국어는 책상(desk)이다.', '책, 컵, 그리고 펜이 탁자 위에 있다.', 'high', 'low'),
  X(47, 'Review 1 item 21', '걱정하지마! 우리 회사는 훌륭한 금고들이 있어.', 'korean_typo',
    '걱정하지 마로 띄어 쓴다. 우리 회사는 … 있어보다 우리 회사에는 … 있어가 자연스럽다.', '걱정하지 마! 우리 회사에는 훌륭한 금고들이 있어.', 'high', 'low'),
  X(47, 'Review 1 item 25', '너는 손으로 발을 잡을 수 있니?', 'translation_mismatch',
    '영어는 touch(닿다·만지다)인데 한국어는 잡다다.', '너는 손으로 발을 만질(발끝에 닿을) 수 있니?', 'high', 'low'),
  X(48, 'table (1) 소유대명사 1인칭', '소유대명사 :  1인칭 : mine   /  2인칭 : yours  / 3인칭 : his, hers, theirs', 'grammar_explanation_wrong',
    '1인칭 복수 소유대명사 ours가 빠졌다(3인칭은 복수 theirs까지 적었는데 1인칭만 단수뿐).', '1인칭 : mine, ours / 2인칭 : yours / 3인칭 : his, hers, theirs', 'high', 'high'),
  X(48, 'table (1) 복합 인칭 대명사 3인칭', '3인칭- himself, herself , themselves', 'grammar_explanation_wrong',
    'itself가 빠졌다. 또 현재 학교 문법에서는 재귀대명사라는 용어를 주로 쓴다.', '3인칭 – himself, herself, itself, themselves (재귀대명사)', 'high', 'medium'),
  X(48, 'passOff (2) 대명사 it item 3 (+ application (2) item 5, Review 2 item 5)', 'It is a great way to talk to my friends about what we did during the day. (가주어)', 'grammar_explanation_wrong',
    '이 It은 가주어가 아니다. STUDENT s10-4 원문에서 바로 앞 문장 Every night when I get home, I chat on the computer with my friends.의 채팅을 받는 대명사이고, to talk는 way를 꾸미는 형용사적 용법이다. 가주어라면 진주어 to부정사를 It 자리에 넣어도 뜻이 통해야 하는데 이 문장은 그렇지 않다.',
    '태그를 (앞 내용을 받는 it)으로 고치고, 가주어 예문은 따로 둔다: It is fun to talk to my friends about what we did during the day. (가주어 It, 진주어 to talk …)', 'high', 'high'),
  X(48, 'passOff (2) item 5', 'It rains. / It is fine today / what time is it? (비 인칭 주어)', 'english_grammar',
    '한 줄에 세 문장을 넣으면서 두 번째 문장 끝 마침표가 없고 세 번째 문장 첫 글자 what이 소문자다. 한국어 비 인칭은 비인칭으로 붙여 쓴다.', 'It rains. / It is fine today. / What time is it? (비인칭 주어)', 'high', 'low'),
  X(48, 'passOff (2) item 6 + application (2) item 13(p51) + Review 2 item 13(p55)', 'It usually takes me 15minutes to walk to school.', 'english_grammar',
    '숫자와 단위 사이 띄어쓰기가 빠졌다. STUDENT s5-2 원문은 15 minutes.', 'It usually takes me 15 minutes to walk to school.', 'high', 'medium'),
  X(48, 'passOff (3) 의문대명사 item 5 + application (3) item 5 + Review 3 item 2(p56)', 'What is he? / 그의 직업은 무엇이니?', 'english_unnatural',
    '직업을 묻는 말로 What is he?는 현대 영어에서 모호하거나 무례하게 들린다(사람의 정체·국적 등을 묻는 느낌).', 'What does he do? (What is his job?도 허용)', 'high', 'medium'),
  X(48, 'passOff (3) 의문대명사 item 2 + application (3) item 2', 'Whose book is this?', 'grammar_explanation_wrong',
    '명사 book 앞의 whose는 명사를 꾸미는 의문형용사(의문한정사)다. 학교 문법에서 who의 소유격으로 설명하기도 하지만, 의문대명사 예문으로는 Whose is this book?이 정확하다.', 'Whose is this book? (또는 whose를 의문형용사로 구분 표시)', 'medium', 'low'),
  X(49, 'passOff (3) 지시대명사 items 2·4·6·8 (+ application 같은 문장)', 'During this time … / … at these academies. / … feel that way. / … those colors?', 'grammar_explanation_wrong',
    '명사 앞에서 꾸미는 this/these/that/those는 지시형용사(지시한정사)이지 지시대명사가 아니다. 같은 쪽 (4)는 부정대명사와 부정형용사로 구분했는데 (3)은 구분 없이 모두 지시대명사로 묶었다.', '소제목을 지시대명사와 지시형용사로 바꾸고 두 쓰임을 나눠 표시', 'high', 'medium'),
  X(49, 'passOff (3) 지시대명사 item 5', 'That is the house I wanted to buy.', 'translation_mismatch',
    'Application(p52)과 Review 한국어(내가 사고 싶은 집)는 현재 want인데 Pass-Off만 wanted다.', 'That is the house I want to buy.', 'high', 'low'),
  X(49, 'passOff (3) 지시대명사 item 7', 'Those are caps that I put yesterday.', 'english_grammar',
    '모자를 쓰다는 put on이다(Application p52에는 put on으로 인쇄).', 'Those are caps that I put on yesterday.', 'high', 'high'),
  X(49, 'passOff (4) item 8 + application (4) item 8(p53) + Review 4 item 8(p57)', 'If there is any, I will borrow them to you.', 'english_grammar',
    'borrow는 빌리다, 남에게 빌려주다는 lend다. 또 any를 복수 them으로 받으므로 there are가 맞다.', 'If there are any, I will lend them to you.', 'high', 'high'),
  X(49, 'passOff (4) item 4 + application (4) item 4 + Review 4 item 4(p57)', 'Anyone would be here. / 누구라도 이곳에 있을 거야.', 'english_unnatural',
    '영어·한국어 모두 무슨 뜻인지 분명하지 않다. anyone의 쓰임을 보여 주는 예문으로 부적절하다.', 'Anyone can come here. / 누구든지 여기 올 수 있어.', 'high', 'medium'),
  X(49, 'passOff (4) item 10 + application (4) item 10 + Review 4 item 10(p57)', 'None knows it. / 아무도 모른다.', 'english_unnatural',
    '사람을 뜻하는 단독 주어 None은 고어·문어체다. 한국어에는 it(그것을)도 빠졌다.', 'No one knows it. (None of us knows it.) / 아무도 그것을 모른다.', 'high', 'medium'),
  X(49, 'passOff (4) item 11 + application (4) item 11', 'Each has a desk.', 'english_unnatural',
    '문맥 없는 단독 주어 Each는 어색하다.', 'Each of us has a desk. (또는 Each student has a desk.)', 'medium', 'low'),
  X(49, 'passOff (4) item 1 + application (4) item 1 + Review 4 item 1(p57)', 'One should obey his parents. / 사람은 그 부모님의 말씀에 순종해야 한다.', 'english_unnatural',
    '일반 주어 one은 현대 영어에서 one’s로 받는 것이 표준이다(his는 옛 용법·성별 편향). 한국어 그 부모님도 어색하다.', 'One should obey one’s parents. / 사람은 자기 부모님 말씀에 순종해야 한다.', 'medium', 'low'),
  X(49, 'passOff (4) item 15 + application (4) item 15', 'I have to do homework from both the academies and school.', 'grammar_explanation_wrong',
    'both A and B는 상관접속사 구문이라 부정대명사/부정형용사의 예로 보기 어렵다(굵게 표시도 both와 and 둘 다).', '부정형용사 both 예문으로 바꾼다(예: Both academies give me homework.).', 'medium', 'low'),
  X(50, 'application (1) 인칭/소유/복합[추론] item 1 + Review 1 item 1(p54)', 'The bible was mine.', 'english_grammar', '경전 이름 Bible은 대문자로 쓴다.', 'The Bible was mine.', 'high', 'low'),
  X(50, 'application (1) item 2 + Review 1 item 2(p54)', 'New machine has been used for our business.', 'english_grammar',
    '셀 수 있는 단수명사 machine 앞에 관사가 없다. 또 굵게 표시된 our는 소유격(소유형용사)이라 이 묶음이 다루는 소유대명사(mine, yours …)가 아니다.',
    'A new machine has been used for our business. (소유대명사 예문이 필요하면: This new machine is ours.)', 'high', 'high'),
  X(50, 'application (1) item 5 + Review 1 item 5(p54)', 'I know the truth by myself. / 나는 내 스스로 진실을 안다.', 'english_unnatural',
    'by myself는 혼자서, 남의 도움 없이라서 진실을 안다와 어울리지 않는다.', 'I know the truth myself.(강조 용법) 또는 I found out the truth by myself.(한국어: 나는 혼자 힘으로 진실을 알아냈다.)', 'high', 'medium'),
  X(50, 'application (1) item 7 + Review 1 item 7(p54)', 'Knowing yourself is really important in happy life.', 'english_grammar',
    'happy life 앞 관사가 없고, 한국어 행복한 삶을 위해에 맞는 전치사는 for다.', 'Knowing yourself is really important for a happy life.', 'high', 'high'),
  X(51, 'application (2) 대명사 it[추론] item 6 + Review 2 item 6(p55)', 'It appeared that James had a mental problem. / 제임스 는 정신적인 문제가 있는 것으로 보인다.', 'translation_mismatch',
    '영어는 과거(appeared, had), 한국어는 현재다. 제임스 는은 띄어쓰기 오류다.', '제임스는 정신적인 문제가 있는 것처럼 보였다.', 'high', 'medium'),
  X(51, 'application (2) item 9 + Review 2 item 9(p55)', 'It is the exceptionally rapid growth of computer that has changed every aspect of our lives.', 'english_grammar',
    'computer는 셀 수 있는 명사라 관사 없는 단수로 쓸 수 없다.', 'It is the exceptionally rapid growth of computers (computer technology) that has changed every aspect of our lives.', 'high', 'high'),
  X(52, 'application (3) 의문대명사[추론] item 7 + Review 3 item 4(p56)', 'What is the purpose of the school education?', 'english_grammar',
    '일반적인 의미의 school education 앞에는 the를 쓰지 않는다.', 'What is the purpose of school education?', 'high', 'medium'),
  X(52, 'application (3) 의문대명사[추론] item 8 + Review 3 item 5(p56)', 'Where can you find her in this city?', 'grammar_explanation_wrong',
    'where는 의문부사이지 의문대명사가 아니다(의문대명사 묶음에 들어 있음).', '의문부사로 따로 표시하거나 의문대명사 예문으로 교체(예: Which of these cities do you like?)', 'high', 'low'),
  X(52, 'application (3) 지시대명사[추론] item 11 + Review 3 item 16(p56)', 'Those hate listening to long messages on answering machine.', 'english_grammar',
    '사람을 가리키는 those는 those who …처럼 꾸밈말이 있어야 하고 단독 주어로 쓸 수 없다. answering machine에도 관사나 복수형이 필요하다. 전화응답기는 2012년 무렵의 기술이다.',
    'Those people hate listening to long messages on answering machines. (또는 Those who are busy hate …)', 'high', 'high'),
  X(52, 'application (3) 지시대명사[추론] item 5 + Review 3 item 10(p56)', 'Students will be able to talk about their friends at these academies. / 학생들은 이 학원들에서 친구들과 이야기 할 수 있을 것이다.', 'translation_mismatch',
    '영어는 친구들에 대해(talk about) 이야기하는 것인데 한국어는 친구들과 이야기하는 것이다. 이야기 할도 이야기할로 붙여 쓴다.', '학생들은 이 학원들에서 사귄 친구들에 대해 이야기할 수 있을 것이다.', 'high', 'medium'),
  X(52, 'application (3) 지시대명사[추론] items 5·9·12 의 (N과)', 'Students will be able to … (7과) / Students should be able to describe why they feel that way. (15과) / Why do you think he likes those colors?(6과)', 'layout_or_extraction',
    '세 문장은 현재 STUDENT 레슨 JSON(content/lessons/student)과 원본 랩자료(랩자료모음) 어디에서도 찾지 못했다. 교사용 학습목표나 토론 질문 문구로 보이며, 웹에서 (N과) 링크를 걸 원문 문장이 없다.', '링크 없이 두거나 원본 교사용 자료로 출처를 확인', 'medium', 'low'),
  X(52, 'application (3) 지시대명사[추론] item 10 + Review 3 item 15(p56)', 'Those are caps that I put on yesterday. / 그것들은 내가 어제 썼던 모자들이다.', 'translation_mismatch',
    'Those는 저것들이다(그것들은 they/them).', '저것들은 내가 어제 썼던 모자들이다.', 'medium', 'low'),
  X(53, 'application (4) 부정대명사[추론] item 15', 'I have to do homework from both the academies and school. (10과)', 'layout_or_extraction',
    '과 번호 오류. 이 문장은 STUDENT s8-2(8과) I get very tired quickly because I have to do homework from both the academies and school.에 있고 10과에는 없다.', '(8과)', 'high', 'medium'),
  X(53, 'application (4) item 13 + Review 4 item 13(p57)', 'Neither of them is wrong. / 그들 둘 다 틀린 거야.', 'translation_mismatch',
    '뜻이 정반대다. Neither of them is wrong.은 둘 다 틀리지 않았다인데 한국어는 둘 다 틀렸다다. 이대로면 학생은 Both of them are wrong.을 쓰게 되어 neither 연습이 되지 않는다.', '한국어를 그들 둘 다 틀리지 않았어.로 고친다.', 'high', 'high'),
  X(54, 'Review 1 items 4·7', '…모두가 알아 / 네 자신을 아는 것은 …', 'korean_typo',
    '4번은 마침표가 없고, 7번 네 자신은 표준어로 너 자신이다.', '…모두가 알아. / 너 자신을 아는 것은 …', 'high', 'low'),
  X(54, 'Review 1 item 6', '우리는 이 난관을 우리 스스로 극복해야 한다.', 'translation_mismatch',
    '영어 go through는 겪다, 헤쳐 나가다로 극복하다(overcome)와 뉘앙스가 조금 다르다.', '우리는 이 어려움을 우리 스스로 헤쳐 나가야 한다.', 'low', 'low'),
  X(55, 'Review 2 item 13', '학교까지 걸어가는 데는 나에게는 15분 걸린다.', 'translation_mismatch',
    '영어의 usually(보통)가 빠졌고 나에게는이 어색하다.', '나는 학교까지 걸어가는 데 보통 15분이 걸린다.', 'high', 'low'),
  X(56, 'Review 3 item 14', '학생들은 왜 그들이 그렇게 느끼는지 설명 할 수 있어야 한다.', 'korean_typo',
    '설명할로 붙여 쓴다.', '학생들은 왜 그렇게 느끼는지 설명할 수 있어야 한다.', 'high', 'low'),
  X(57, 'Review 4 item 6', '다른 사람들은 노래하고 춤춘다.', 'translation_mismatch',
    '영어는 진행형(are singing and dancing)이다.', '다른 사람들은 노래하고 춤추고 있다.', 'high', 'low'),
  X(57, 'Review 4 item 8', '조금이라도 있다면, 내가 네게 그것들을 빌려 줄 거야.', 'korean_typo',
    '빌려주다는 한 단어라 빌려줄로 붙여 쓴다.', '조금이라도 있다면, 내가 네게 그것들을 빌려줄게.', 'medium', 'low'),
  X(58, 'passOff (1) item 4 + application (1) item 9(p59) + Review 1 item 9(p61)', 'Most people make Song-Pyun which is a Korean traditional rice cake.', 'english_grammar',
    '송편이라는 하나뿐인 대상을 덧붙여 설명하므로 계속적 용법(쉼표 + which)이어야 한다. 형용사 순서는 traditional Korean, 표기는 songpyeon이 표준이다. STUDENT s18-3 원문: … make songpyeon, which is a traditional Korean rice cake.',
    'Most people make songpyeon, which is a traditional Korean rice cake.', 'high', 'high'),
  X(58, 'passOff (1) item 5 + application (1) item 11(p59) + Review 1 item 11(p61)', 'She has a bird of which color is beautiful. (= whose)', 'english_grammar',
    'of which는 the color of which 또는 of which the color 형태로만 쓸 수 있어 지금 문장은 비문이다. (= whose) 설명도 이 형태로는 성립하지 않는다.',
    'She has a bird the color of which is beautiful. (= She has a bird whose color is beautiful.)', 'high', 'high'),
  X(58, 'passOff (2) item 4 + application (2) item 5(p60) + Review 2 item 5(p62)', 'He is my friend that I love. / He is my friend that I have loved.', 'english_unnatural',
    '이미 특정된 my friend 뒤에 제한적 관계절을 붙이면 어색하고, 사람 선행사에는 who(m)가 더 자연스럽다. Pass-Off(love)와 Application(have loved) 문장도 서로 다르다.',
    'He is the friend that I love. (또는 He is a friend that I have loved for years.)', 'high', 'medium'),
  X(58, 'passOff (2) item 5', 'He is the very man that I want to see', 'english_grammar', '마침표가 빠졌다(Application p60에는 있음).', 'He is the very man that I want to see.', 'high', 'low'),
  X(58, 'passOff (2) item 6 + application (2) item 8(p60) + Review 2 item 8(p62)', 'It is all knowledge that I have. / 이것은 내가 가진 지식의 전부이다.', 'english_grammar',
    '내가 가진 지식 전부는 all the knowledge다. 한국어 이것은에 맞추면 주어도 This다.', 'This is all the knowledge that I have.', 'high', 'medium'),
  X(58, 'passOff (2) item 7 + application (2) item 11(p60) + Review 2 item 11(p62)', 'I can do anything that man can do. / 나는 사람이 할 수 있는 일은 무엇이라도 한다.', 'english_unnatural',
    '관사 없는 man(인간 일반)은 고어체다. 한국어는 can(할 수 있다)을 빠뜨렸다.', 'I can do anything that a person can do. / 나는 사람이 할 수 있는 일이라면 무엇이든 할 수 있다.', 'high', 'medium'),
  X(58, 'passOff (3) what 소제목 + Review 3 지시문(p63)', '(3) what / I don’t know who did it. / I don’t know which is his. / I asked him what he wanted. / 3. 복합 관계 대명사를 사용하여 문장을 영작하시오.', 'grammar_explanation_wrong',
    '① 복합관계대명사는 whoever·whatever·whichever를 가리키는 용어이고, what은 선행사를 포함하는 관계대명사다. ② who did it, which is his, (asked him) what he wanted는 관계대명사절이 아니라 의문사가 이끄는 간접의문문(명사절)이다. 관계대명사 단원 안에서 둘을 구분 없이 섞었다.',
    '소제목을 (3) 관계대명사 what과 (4) 간접의문문(의문사 + 주어 + 동사)으로 나누고, Review 3 지시문을 관계대명사 what 또는 의문사를 사용하여 영작하시오.로 고친다.', 'high', 'high'),
  X(59, 'application (1) who/whose/whom/which/of which[추론] item 2 + Review 1 item 2(p61)', 'A hairdresser is someone who designs persons’ hair.', 'english_grammar',
    'persons’는 거의 쓰지 않는 형태로 people’s가 맞다. 머리를 디자인하다도 styles/cuts가 자연스럽다.', 'A hairdresser is someone who styles people’s hair.', 'high', 'high'),
  X(59, 'application (1) item 6 + Review 1 item 6(p61)', 'I met the boy whose mother interprets foreign books.', 'english_unnatural',
    '책을 옮기는 것은 translate(번역)이고 interpret는 통역이다. Review 한국어도 번역하는이다.', 'I met the boy whose mother translates foreign books.', 'high', 'high'),
  X(59, 'application (1) item 10 + Review 1 item 10(p61)', 'The bed which I slept in last night was not convenient.', 'english_unnatural',
    'convenient는 편리한이다. 잠자리가 편하다는 comfortable이다.', 'The bed which I slept in last night was not comfortable.', 'high', 'high'),
  X(59, 'application (1) item 13 + Review 1 item 13(p61)', 'The woman to whom he was talking was his wife. / 그가 말하고 있는 그 여자가 그의 아내이다.', 'translation_mismatch',
    '영어는 과거(was talking, was), 한국어는 현재다.', '그가 이야기하고 있던 그 여자는 그의 아내였다.', 'high', 'low'),
  X(59, 'application (1) item 8 + Review 1 item 8(p61)', 'The man whom I saw last Sunday was a famous singer. / 지난 일요일에 내가 만난 사람은 유명한 가수였다.', 'translation_mismatch',
    '영어는 saw(보았다), 한국어는 만난(met)이다.', '지난 일요일에 내가 본 남자는 유명한 가수였다.', 'medium', 'low'),
  X(61, 'Review 1 item 5', '네가 빌린 차주의 이름이 무엇이니? (whose)', 'translation_mismatch',
    '네가 빌린 차주는 빌린 차의 주인인지 분명하지 않아 whose 구조가 잘 드러나지 않는다.', '네가 차를 빌린 그 남자의 이름은 뭐니?', 'medium', 'low'),
  X(60, 'application (2) that[추론] item 9 + Review 2 item 9(p62)', 'There is someone (who) wants you on the phone.', 'grammar_explanation_wrong',
    '괄호는 생략 가능으로 읽히는데 주격 관계대명사는 표준 영어에서 생략할 수 없다(there is 구문의 구어적 생략을 규칙처럼 보여 줌). 또 that을 이용하라는 과제(Review 2)에 (who) 힌트가 섞여 지시가 충돌한다.',
    'There is someone who (= that) wants you on the phone. — 자연스러운 표현은 There’s someone on the phone for you.', 'high', 'medium'),
  X(60, 'application (3) what[추론] item 6 + Review 3 item 6(p63)', 'That’ not what I meant to say.', 'english_grammar', 'That’s의 s가 빠졌다.', 'That’s not what I meant to say.', 'high', 'high'),
  X(60, 'application (3) item 8 + Review 3 item 8(p63)', 'Invest us what money you have.', 'english_grammar',
    'invest는 사람 목적어를 바로 받지 못한다(invest A in B). what money는 있는 돈 전부라는 관계형용사 용법으로 수준도 높다.', 'Invest what money you have in us. (= Invest all the money you have in us.)', 'high', 'high'),
  X(60, 'application (3) item 5 + Review 3 item 5(p63)', 'What I would like is a piano. / 내가 좋아하는 것은 피아노이다.', 'translation_mismatch',
    'would like는 원하다, 갖고 싶다이지 좋아하다(like)가 아니다.', '한국어를 내가 갖고 싶은 것은 피아노이다.로 고친다.', 'high', 'medium'),
  X(62, 'Review 2 지시문', '다음 문장은 관계 대명사 that을 이용하여 영작하세요.', 'korean_typo',
    '목적격 조사가 틀렸다(문장은 → 문장을). 관계 대명사도 관계대명사로 붙여 쓴다.', '다음 문장을 관계대명사 that을 이용하여 영작하세요.', 'high', 'low'),
  X(62, 'Review 2 item 2', '나는 다가오는 주말 동안 내가 준비했던 재미있는 것들에 대해 생각하기 시작한다.', 'translation_mismatch',
    '영어는 다가오는 주말을 위해 계획해 둔(planned for the upcoming weekend)인데 한국어는 주말 동안 … 준비했던으로 뜻이 달라진다.', '나는 다가오는 주말을 위해 계획해 둔 재미있는 일들을 생각하기 시작한다.', 'high', 'low'),
  X(62, 'Review 2 item 3', '너는 잃어버렸던 키를 찾았니?', 'translation_mismatch',
    '키는 신장과 헷갈리므로 열쇠가 분명하다.', '너는 잃어버린 열쇠를 찾았니?', 'medium', 'low'),
  X(62, 'Review 2 item 10 + Review 3 item 9(p63)', '그는 예전의 그가 아니다.', 'answer_ambiguous',
    '같은 한국어 문장이 두 과제에 나오는데 책의 답이 다르다(He is not the man (that) he used to be. / He is not what he was.). 과제 지시로만 구분된다.',
    '웹에서는 두 답을 모두 정답으로 받거나, 문항마다 사용할 문법(that / what)을 표시한다.', 'high', 'medium'),
  X(63, 'Review 3 item 7', '나는 당신이 내가 하기를 원하는 것을 할겁니다.', 'korean_typo', '할 겁니다로 띄어 쓴다.', '나는 당신이 내가 하기를 원하는 것을 할 겁니다.', 'high', 'low'),
];

// ---------- stats + self-check ----------
const perPage = {};
const bump = (p, k, n = 1) => { perPage[p] = perPage[p] || { en: 0, koPrompt: 0, enPrompt: 0, tableRows: 0 }; perPage[p][k] += n; };
const topicStats = [];
let reviewItems = 0, linked = 0, proposed = 0, corrected = 0, slotAns = 0, lessonRefItems = 0;
for (const t of topics) {
  let pass = 0, appN = 0, rTasks = 0, rItems = 0, tables = 0;
  for (const s of t.sections) {
    if (s.kind === 'passOff' || s.kind === 'application') {
      for (const g of s.groups) for (const it of g.items) {
        bump(it.page, 'en');
        if (s.kind === 'passOff') pass++; else appN++;
        if (it.lessonRef) lessonRefItems++;
      }
    } else if (s.kind === 'table') {
      tables++;
      bump(s.page, 'tableRows', s.table.rows.length);
    } else if (s.kind === 'review') {
      for (const task of s.tasks) {
        rTasks++;
        for (const r of task.items) {
          rItems++;
          bump(r.page, r.promptLang === 'en' ? 'enPrompt' : 'koPrompt');
          if (r.answerFromBook) linked++;
          if (r.proposedAnswer) proposed++;
          if (r.correctedAnswer) corrected++;
          if (r.extraSlotAnswer) slotAns++;
        }
      }
    }
  }
  reviewItems += rItems;
  topicStats.push({ topic: t.printedLabel, title: t.title, passOffSentences: pass, applicationSentences: appN, reviewTasks: rTasks, reviewItems: rItems, tables });
}

const doc = {
  book: 'g1',
  pageRange: [30, 63],
  frontMatter: {
    introText: null,
    notes: '범위(p30-63)에 표지·특징/학습법·연결고리 구성도·목차 쪽은 없다. 모든 쪽 머리에 The Revolution of English Education, 바닥에 쪽번호와 Pass-Off English 패스오프 잉글리쉬 로고, 본문 위에 Pass-Off English 워터마크가 있다. p63이 1권 마지막 쪽이며 TOPIC 8 Review 3으로 끝난다(정답지·뒤표지 없음).',
  },
  conventions: {
    en: '인쇄된 영어 그대로(오타 포함). 문장 끝의 (N과)는 lessonRef, 그 밖의 끝 괄호(단문, be동사, 가주어, = whose 등)는 tag로 분리. 연속 공백만 한 칸으로 줄임. 두 줄로 인쇄된 문장은 raw에 \\n으로 보존.',
    raw: '인쇄된 줄 그대로(텍스트 층 기준, 이미지로 확인).',
    bold: '굵게 인쇄된 단어 구간. 앞뒤 문장부호와 물음표만 굵은 구간은 생략.',
    ko: '책은 Pass-Off·Application 영어 옆에 한국어를 인쇄하지 않으므로 항상 null. 한국어는 Review 문항(prompt)에 있고 reviewRef/answerSource로 연결됨.',
    inferredSubPoint: 'Application에 소제목이 인쇄되지 않은 경우(label=null) 문장 순서로 추론한 Pass-Off 소제목.',
    reviewRef: 'Application 문장을 번역·출제한 Review 문항. null이면 이 문장의 한국어가 책 어디에도 없음.',
    appRef: 'Pass-Off 문장과 같은 문장이 있는 Application 위치(대소문자·문장부호 무시 일치). appVariant는 조금 다른 변형.',
    answerSource: 'passOff|application + 소제목(추론이면 [라벨 없음·추론]) + item 번호(1부터).',
    correctedAnswer: 'answerFromBook이 있지만 그 영어에 오류가 있을 때의 교정안(issues와 연결). 웹 정답으로는 교정안을, 원문은 허용 답으로 쓰는 것을 권장.',
    hint: 'Review 문항 끝 괄호의 단서(yes/no, 사용할 관계사). 빈칸이 아님.',
    n: 'Review 문항 번호는 책에 인쇄되지 않아 과제 안에서 1부터 매김(printedItemNumbers=false).',
    severity: 'issues의 추가 필드. 학습자에게 미치는 영향(high/medium/low). confidence는 문제라고 판단한 확신도.',
  },
  topics,
  issues,
  stats: {
    topics: topicStats,
    reviewItems, linkedToBookSentence: linked, needsNewAnswer: proposed, correctedAnswers: corrected, extraSlotAnswers: slotAns,
    itemsWithLessonRef: lessonRefItems,
    issues: issues.length,
    issuesHighConfidence: issues.filter(i => i.confidence === 'high').length,
    issuesHighSeverity: issues.filter(i => i.severity === 'high').length,
    issuesByType: issues.reduce((a, i) => (a[i.type] = (a[i.type] || 0) + 1, a), {}),
    perPage,
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8');

// console self-check
console.log('topics:'); for (const s of topicStats) console.log(' ', JSON.stringify(s));
console.log('reviewItems', reviewItems, 'linked', linked, 'proposed', proposed, 'corrected', corrected, 'slotAns', slotAns, 'lessonRefItems', lessonRefItems);
console.log('issues', issues.length, 'highConf', doc.stats.issuesHighConfidence, 'highSev', doc.stats.issuesHighSeverity);
console.log('byType', JSON.stringify(doc.stats.issuesByType));
console.log('perPage:'); for (const p of Object.keys(perPage).sort((a, b) => a - b)) console.log(' ', p, JSON.stringify(perPage[p]));
// application items lacking Korean anywhere
for (const t of topics) {
  const app = t.sections.find(s => s.kind === 'application');
  const miss = [];
  app.groups.forEach(g => g.items.forEach((it, k) => { if (!it.reviewRef) miss.push(`${groupKey(g)} #${k + 1}: ${it.en}`); }));
  if (miss.length) console.log('NO REVIEW', t.printedLabel, miss);
  const pass = t.sections.find(s => s.kind === 'passOff');
  const pmiss = [];
  pass.groups.forEach(g => g.items.forEach((it, k) => { if (!it.appRef) pmiss.push(`${groupKey(g)} #${k + 1}: ${it.en}${it.appVariant ? ' [variant: ' + it.appVariant + ']' : ''}`); }));
  if (pmiss.length) console.log('PASS-OFF NOT IN APP', t.printedLabel, pmiss);
}
console.log('wrote', OUT);
