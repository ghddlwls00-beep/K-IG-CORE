// Builds out/g2-p1-27.json (book g2, PDF pages 1-27) and fails loudly on mismatches with the text layer.
const fs = require('fs');
const path = require('path');
const SP = 'C:\\Users\\ghddl\\AppData\\Local\\Temp\\claude\\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE--claude-worktrees-korean-market-analysis-39e7fc\\5adf4ccb-9cea-421f-9195-b5f31b723c7f\\scratchpad\\pdf';
const OUT = path.join(SP, 'out', 'g2-p1-27.json');
const TXT = fs.readFileSync(path.join(SP, 'g2.txt'), 'utf8');

// ---------- text layer helpers ----------
function pageLines(n) {
  const a = TXT.indexOf(`===== g2 PAGE ${n} =====`);
  const b = TXT.indexOf(`===== g2 PAGE ${n + 1} =====`);
  if (a < 0) throw new Error('no page ' + n);
  return TXT.slice(a, b < 0 ? undefined : b).split(/\r?\n/).slice(1).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
const HEADER = new Set(['The Revolution of English Education', 'Pass-Off English']);
const errors = [];
function mustBeLine(page, raw, what) {
  const lines = pageLines(page);
  const norm = raw.replace(/\s+/g, ' ').trim();
  if (!lines.includes(norm)) errors.push(`[text-layer] p${page} ${what}: not found as a line: ${JSON.stringify(raw)}`);
}

// ---------- item helpers ----------
function it(page, raw, bold, extra = {}) {
  // raw = exact printed line. Pull lesson ref "(N과)" and tags "(=...)" out of en.
  let en = raw;
  let lessonRef = null;
  const m = en.match(/\s*\((\d+)과\)\s*$/);
  if (m) { lessonRef = Number(m[1]); en = en.slice(0, m.index); }
  let tag = null;
  const t = en.match(/\s*(\(=\/?=?[^)]*\))\s*$/);
  if (t) { tag = t[1]; en = en.slice(0, t.index); }
  en = en.trim();
  for (const b of bold) if (!en.includes(b)) errors.push(`[bold] p${page} bold ${JSON.stringify(b)} not in ${JSON.stringify(en)}`);
  return { page, en, ko: null, bold, tag, lessonRef, raw, ...extra };
}

// =====================================================================
// TOPIC 9 형용사
// =====================================================================
const adjPO = [
  { label: '(1) 한정적 용법과 서술적 용법', page: 5, items: [
    it(5, 'It’s a nice day.', ['nice'], { analysisNote: '한정적 용법 — 명사 day 앞에서 꾸밈' }),
    it(5, 'The weather is nice today.', ['nice'], { analysisNote: '서술적 용법 — be동사 뒤 보어' }),
    it(5, 'What book is this? Which book is yours?', ['What', 'Which'], { analysisNote: '의문형용사 what/which + 명사(한정적)' }),
    it(5, 'You look tired. It sounds interesting.', ['tired', 'interesting'], { analysisNote: '감각·상태동사(look, sound) + 형용사 보어(서술적)' }),
    it(5, 'Jane’s job is boring.', ['boring'], { analysisNote: '-ing 형용사: 감정을 일으키는 쪽(일이 지루함을 줌)' }),
    it(5, 'Jane is bored.', ['bored'], { analysisNote: '-ed 형용사: 감정을 느끼는 쪽(제인이 지루해함)' }),
    it(5, 'It is an exciting time to learn.', ['exciting'], { analysisNote: '-ing 형용사, 한정적' }),
    it(5, 'We were excited to watch the baseball game.', ['excited'], { analysisNote: '-ed 형용사, 서술적 + to부정사(감정의 원인)' }),
  ]},
  { label: '(2) 비교급', page: 5, items: [
    it(5, 'It’s cheaper than that one.', ['cheaper than'], { analysisNote: '-er than' }),
    it(5, 'The exam was easier than we expected.', ['easier than'], { analysisNote: '자음+y → -ier than' }),
    it(5, 'I know him well-probably better than anybody else does.', ['better than'], { analysisNote: 'well의 비교급 better (불규칙). 하이픈은 줄표(—) 자리 — issues 참조' }),
    it(5, 'She is more talented than me.', ['more talented than'], { analysisNote: '다음절 형용사 more ~ than', studentMatch: 's2-5#4: She is more talented than me. (같은 문장)' }),
    it(5, 'The warmer the weather, the better I feel.', ['The warmer', 'the better'], { analysisNote: 'the + 비교급, the + 비교급 (~할수록 더 ~하다)' }),
  ]},
  { label: '(3) 최상급', page: 6, items: [
    it(6, 'Yesterday was the hottest day of the year.', ['the hottest'], { analysisNote: 'the + -est + of 기간' }),
    it(6, 'It was the most boring movie I’ve ever seen.', ['the most boring'], { analysisNote: 'the most ~ + (that) I have ever p.p.' }),
    it(6, 'That church is the oldest building in the town.(=/=eldest)', ['the oldest'], { analysisNote: 'old의 최상급 oldest(나이·오래됨 일반). (=/=eldest)는 여기서 eldest를 쓸 수 없다는 메모(≠)' }),
    it(6, 'My grandmother lives with my mother’s eldest brother. (=oldest)', ['eldest'], { analysisNote: 'eldest는 가족 서열에만 씀(여기서는 oldest와 같음)', studentMatch: 's4-4#4: Because my grandfather passed away several years ago, my grandmother lives with my mother’s eldest brother. (뒷부분만 가져옴)' }),
    it(6, 'What was the happiest day of your life?', ['the happiest'], { analysisNote: '자음+y → the -iest' }),
  ]},
  { label: '(4) 관사 (a / the)', page: 6, items: [
    it(6, 'I had a sandwich and an apple for lunch.', ['a', 'an'], { analysisNote: '처음 말하는 셀 수 있는 명사 a/an (모음 소리 앞 an)' }),
    it(6, 'The sandwich wasn’t very good, but the apple was delicious.', ['The', 'the'], { analysisNote: '앞에서 말한 것을 다시 가리킬 때 the' }),
    it(6, 'The earth goes around the sun.', ['The', 'the sun'], { analysisNote: '하나뿐인 것 the' }),
    it(6, 'Your sweater is the same color as mine.', ['the same'], { analysisNote: 'the same ~ as' }),
    it(6, 'What did you have for breakfast?', ['for breakfast'], { analysisNote: '식사 이름 앞 무관사' }),
    it(6, 'Claudia is at school and her mother wants to see her teacher at the school.', ['at school', 'at the school'], { analysisNote: 'at school(본래 목적: 수업 중) vs at the school(건물·장소)' }),
    it(6, 'He took me by the hand.', ['by the hand'], { analysisNote: '동사 + 사람 + by the + 신체 부위' }),
    it(6, 'The brick hit John in the face.', ['in the face'], { analysisNote: '동사 + 사람 + in the + 신체 부위' }),
    it(6, 'He is hired by the day.', ['by the day'], { analysisNote: 'by the + 단위(하루 단위로)' }),
    it(6, 'We can buy strawberry by the pound.', ['by the pound'], { analysisNote: 'by the + 단위(파운드 단위로). strawberry → strawberries (issues 참조)' }),
    it(6, 'The only person who can do this is Zeus.', ['The only'], { analysisNote: 'the only + 명사', note: '바탕체로 인쇄, 강조는 굵은 글꼴 교체로 표시(확대 확인)' }),
    it(6, 'Who’s going to do the cooking?', ['do the cooking'], { analysisNote: 'do the + -ing(집안일)', note: '바탕체로 인쇄, 강조는 굵은 글꼴 교체로 표시(확대 확인)' }),
    it(6, 'Who’s going to do the shopping?', ['do the shopping'], { analysisNote: 'do the + -ing(집안일)', note: '바탕체로 인쇄, 강조는 굵은 글꼴 교체로 표시(확대 확인)' }),
  ]},
];

// Application (p7-9): 59 lines, no printed sub-headings.
const adjApp = [
  // (1)
  [7, 'It’s a nice day.', ['nice'], 1],
  [7, 'The weather is nice today.', ['nice'], 1],
  [7, 'She has a big cat.', ['big'], 1],
  [7, 'Have a wonderful day!', ['wonderful'], 1],
  [7, 'Danny is a tall, young, interesting person.', ['tall, young, interesting'], 1],
  [7, 'The rabbit has long black ears.', ['long black'], 1],
  [7, 'I have an old, round, wooden table.', ['old, round, wooden'], 1],
  [7, 'What book is this?', ['What'], 1],
  [7, 'Which book is yours?', ['Which'], 1],
  [7, 'You look tired.', ['tired'], 1],
  [7, 'It sounds interesting.', ['interesting'], 1],
  [7, 'Jinna is diligent.', ['diligent'], 1],
  [7, 'These fish are alive.', ['alive'], 1],
  [7, 'The kids are afraid of the dark.', ['afraid'], 1],
  [7, 'He is fast asleep.', ['asleep'], 1],
  [7, 'You can see a shining face on the mirror.', ['shining'], 1],
  [7, 'Are you satisfied?', ['satisfied'], 1],
  [7, 'Jane’s job is boring.', ['boring'], 1],
  [7, 'Jane is bored.', ['bored'], 1],
  [8, 'It is an exciting time to learn.', ['exciting'], 1],
  [8, 'We were excited to watch the baseball game.', ['excited'], 1],
  [8, 'He stood astonished at the sight of the huge robot.', ['astonished'], 1],
  // (2)
  [8, 'Peter is older than John.', ['older than'], 2],
  [8, 'It’s cheaper than that one.', ['cheaper than'], 2],
  [8, 'The exam was easier than we expected.', ['easier than'], 2],
  [8, 'Rachael is prettier than Leah.', ['prettier than'], 2],
  [8, 'You are fatter than her.', ['fatter than'], 2],
  [8, 'Unfortunately her illness was more serious than we thought at first.', ['more serious than'], 2],
  [8, 'My room is smaller than my brother’s.', ['smaller than'], 2],
  [8, 'I know him well-probably better than anybody else does.', ['better than'], 2],
  [8, 'She is more talented than me. (2과)', ['more talented than'], 2],
  [8, 'The warmer the weather, the better I feel.', ['The warmer', 'the better'], 2],
  // (3)
  [8, 'Yesterday was the hottest day of the year.', ['the hottest'], 3],
  [8, 'Which is the taller of the two?', ['taller'], 3],
  [8, 'It was the most boring movie I’ve ever seen.', ['the most boring'], 3],
  [8, 'That church is the oldest building in the town.(=/=eldest)', ['the oldest'], 3],
  [8, 'My grandmother lives with my mother’s eldest brother. (=oldest) (4과)', ['eldest'], 3],
  [8, 'What was the happiest day of your life?', ['the happiest'], 3],
  [8, 'It was the most beautiful summer of their lives.', ['the most beautiful'], 3],
  [9, 'The wisest man may sometimes make a mistake.', ['The wisest'], 3],
  [9, 'You must make the most of your chance.', ['the most'], 3],
  // (4)
  [9, 'I had a sandwich and an apple for lunch.', ['a', 'an'], 4],
  [9, 'The sandwich wasn’t very good, but the apple was delicious.', ['The', 'the'], 4],
  [9, 'My uncle is a pilot.', ['a'], 4],
  [9, 'I study English for an hour every evening.', ['an'], 4],
  [9, 'It’s a scientific novel book and the book is very thick.', ['a', 'the'], 4],
  [9, 'Look at the sky. The rainbow is over there.', ['the', 'The'], 4],
  [9, 'The earth goes around the sun.', ['The', 'the sun'], 4],
  [9, 'He can play the guitar and he can play all kinds of sports, too.', ['the', 'play all kinds of sports'], 4],
  [9, 'Your sweater is the same color as mine.', ['the same'], 4],
  [9, 'What did you have for breakfast?', ['for breakfast'], 4],
  [9, 'Claudia is at school and her mother wants to see her teacher at the school.', ['at school', 'at the school'], 4],
  [9, 'He took me by the hand.', ['by the hand'], 4],
  [9, 'The brick hit John in the face.', ['in the face'], 4],
  [9, 'He is hired by the day.', ['by the day'], 4],
  [9, 'We can buy strawberry by the pound.', ['by the pound'], 4],
  [9, 'The only person who can do this is Zeus.', ['The only'], 4],
  [9, 'Who’s going to do the cooking?', ['do the cooking'], 4],
  [9, 'Who’s going to do the shopping?', ['do the shopping'], 4],
];
const adjAppNotes = {
  3: '한정적', 4: '한정적(감탄·인사)', 5: '형용사 여러 개 나열 — 순서 issues 참조', 6: '크기 → 색 순서', 7: '나이 → 모양 → 재료 순서',
  8: '의문형용사', 9: '의문형용사', 12: '서술적', 13: 'alive: 서술적 용법만 가능(한정적은 a live fish)', 14: 'afraid: 서술적 용법만 가능',
  15: 'asleep: 서술적 용법만 가능, fast = 깊이', 16: '현재분사형 형용사(한정적). on → in the mirror (issues 참조)', 17: '과거분사형 형용사(느끼는 쪽)',
  22: '과거분사 astonished가 stand의 보어처럼 쓰임(~한 채로 서 있다)', 23: '-er than', 26: '자음+y → -ier', 27: '단모음+단자음 → 자음 겹침 fatter',
  28: 'more ~ than', 29: 'small → smaller, 소유대명사 brother’s', 34: 'the + 비교급 + of the two — 비교급인데 최상급 문장들 사이에 인쇄됨',
  39: 'the most + 다음절 형용사', 40: '최상급이 양보 의미(가장 현명한 사람조차)', 41: 'make the most of: ~을 최대한 이용하다',
  44: '직업 앞 a', 45: '모음 소리 앞 an(hour의 h 묵음)', 46: '처음 a, 다시 말할 때 the — 표현 issues 참조', 47: '관사 선택 issues 참조',
  49: '악기 앞 the, 운동 이름 앞 무관사',
};
const adjAppGroupNames = { 1: '(1) 한정적 용법과 서술적 용법', 2: '(2) 비교급', 3: '(3) 최상급', 4: '(4) 관사 (a / the)' };

// Review (p10-14)
const adjRev = [
  { no: '1.', page: 10, rawInstruction: '1. 다음 문장을 읽어보고 형용사에 밑줄을 그으시오.', taskTypes: ['underline_adjective'],
    // [page, prompt, appNo, answer tokens, optional tokens (articles), note]
    items: [
      [10, 'It’s a nice day.', 1, ['nice'], ['a'], '한정적 — day를 꾸밈'],
      [10, 'The weather is nice today.', 2, ['nice'], ['The'], '서술적 — is의 보어 (today는 부사)'],
      [10, 'She has a big cat.', 3, ['big'], ['a'], '한정적'],
      [10, 'Have a wonderful day!', 4, ['wonderful'], ['a'], '한정적'],
      [10, 'Danny is a tall, young, interesting person.', 5, ['tall', 'young', 'interesting'], ['a'], '한정적 — 세 개 모두'],
      [10, 'The rabbit has long black ears.', 6, ['long', 'black'], ['The'], '한정적 — 두 개 모두'],
      [10, 'I have an old, round, wooden table.', 7, ['old', 'round', 'wooden'], ['an'], '한정적 — 세 개 모두'],
      [10, 'What book is this?', 8, ['What'], [], '의문형용사 — book을 꾸밈 (this는 대명사)'],
      [10, 'Which book is yours?', 9, ['Which'], [], '의문형용사 — book을 꾸밈 (yours는 소유대명사)'],
      [10, 'You look tired.', 10, ['tired'], [], '서술적 — look의 보어'],
      [10, 'It sounds interesting.', 11, ['interesting'], [], '서술적 — sounds의 보어'],
      [10, 'Jinna is diligent.', 12, ['diligent'], [], '서술적'],
    ]},
  { no: '2.', page: 11, rawInstruction: '2. 다음 문장을 영작하시오.', taskTypes: ['ko_to_en_compose'],
    items: [
      [11, '이 물고기들은 살아있다.', 13],
      [11, '그 아이들은 어두운 것을 무서워한다.', 14],
      [11, '그는 빠르게 잠이 든다.', 15],
      [11, '너는 거울에서 빛나는 얼굴을 볼 수 있어.', 16],
      [11, '만족하십니까?', 17],
      [11, '제인의 직업은 지겹다.', 18],
      [11, '제인은 지겨워한다.', 19],
      [11, '그것은 배우기에 재미있는 시간이다.', 20],
      [11, '우리는 야구 경기보는 것에 신이 났다.', 21],
      [11, '그는 거대한 로봇을 보고 놀라서 서 있었다.', 22],
      [11, '그것은 저것보다 더 싸다.', 24],
      [12, '그 시험은 우리가 예상한 것보다 더 쉬웠다.', 25],
      [12, '레이첼은 레아보다 더 예쁘다.', 26],
      [12, '너는 그녀보다 더 뚱뚱해.', 27],
      [12, '불행하게도, 그녀의 병은 우리가 처음 생각했던 것보다 훨씬 더 심각했다.', 28],
      [12, '나의 방은 내 남동생 것보다 더 작다.', 29],
      [12, '나는 그를 잘 안다- 아마 누구보다도 더 잘 안다.', 30],
      [12, '그녀는 나보다 더 재능이 있다.', 31],
      [12, '날씨가 더 따뜻할수록, 나는 더 나아지는 것 같다.', 32],
      [12, '어제는 일 년 중에 가장 더운 날이었다.', 33],
      [12, '둘 중에서 누가 더 크니?', 34],
    ]},
  { no: '3.', page: 13, rawInstruction: '3. 최상급을 이용하여 다음을 영작하시오.', taskTypes: ['ko_to_en_compose', 'use_superlative'],
    items: [
      [13, '그것은 내가 본 영화 중에 가장 지겨운 영화였다.', 35],
      [13, '저 교회는 그 마을에서 가장 오래된 건물이다.', 36],
      [13, '나의 할머니는 나의 어머니의 큰 아버지와 함께 산다.', 37],
      [13, '네 인생에서 가장 행복한 날은 어떤 날이니?', 38],
      [13, '그것은 그들 인생에서 가장 행복한 여름이었다.', 39],
      [13, '비록 가장 현명한 사람일지라도 가끔은 실수한다.', 40],
      [13, '너는 네 기회를 최대한 이용해야 한다.', 41],
    ]},
  { no: '4.', page: 13, rawInstruction: '4. 다음의 내용을 보고 a나 the를 이용하여 영작하시오.', taskTypes: ['ko_to_en_compose', 'use_article'],
    items: [
      [13, '나의 삼촌은 파일럿이다.', 44],
      [13, '나는 매일 저녁 영어를 한 시간 동안 공부한다.', 45],
      [13, '이것은 과학 소설책이고 그 책은 매우 두껍다.', 46],
      [14, '하늘을 봐라. 무지개가 저기에 있어.', 47],
      [14, '지구는 태양 주위를 돈다.', 48],
      [14, '그는 기타를 연주할 수 있고 그는 모든 종류의 스포츠도 할 수 있다.', 49],
      [14, '네 스웨터는 나의 것과 같은 색깔이야.', 50],
      [14, '너는 아침으로 무엇을 먹었니?', 51],
      [14, '클라우디아는 수업 중이고 그녀의 엄마는 학교에서 그녀의 선생님을 뵙기를 원한다.', 52],
      [14, '그는 손으로 나를 잡았다.', 53],
      [14, '그 벽돌이 존의 얼굴을 쳤다.', 54],
      [14, '그는 일용직으로 고용된다.', 55],
      [14, '우리는 딸기를 파운드당으로 살수 있다.', 56],
      [14, '그것을 할 수 있는 유일한 사람은 제우스이다.', 57],
      [14, '누가 요리를 할거야?', 58],
      [14, '누가 쇼핑을 할거야?', 59],
    ]},
];
// Corrected answers / accepted alternatives for adjective review items, keyed by application number.
const adjFix = {
  15: { answerNote: '영어 정답은 맞지만 한글 프롬프트가 틀림(빠르게 잠이 든다 → 깊이 잠들어 있다). 프롬프트를 그대로 두면 He falls asleep quickly.도 한글 뜻으로는 맞는 답 — issues 참조' },
  16: { correctedAnswer: 'You can see a shining face in the mirror.' },
  28: { answerNote: '한글의 "훨씬"을 살리면 Unfortunately, her illness was much more serious than we thought at first.도 정답' },
  30: { correctedAnswer: 'I know him well — probably better than anybody else does.' },
  32: { answerNote: 'The warmer it is, the better I feel.도 정답' },
  34: { answerNote: '한글이 "누가"라서 Who is taller? / Who is the taller of the two? / Which of the two is taller?도 정답' },
  37: { answerNote: '한글 프롬프트가 틀림("어머니의 큰 아버지" = 어머니의 큰아버지). 정답 문장은 책 영어대로 두되 프롬프트 수정 필요 — issues 참조' },
  38: { answerNote: '한글 시제가 현재라 What is the happiest day of your life?도 뜻으로는 맞음' },
  39: { answerNote: '한글은 "가장 행복한 여름" — It was the happiest summer of their lives.도 정답으로 인정하거나 한글을 "가장 아름다운"으로 고칠 것' },
  40: { answerNote: 'Even the wisest man sometimes makes mistakes.도 정답' },
  46: { correctedAnswer: 'This is a science fiction book, and the book is very thick.' },
  47: { correctedAnswer: 'Look at the sky. There’s a rainbow over there.', answerNote: '관사 문항: 처음 말하는 무지개는 a. 책 정답(The rainbow)은 이미 둘 다 아는 무지개일 때만 자연스러움' },
  53: { answerNote: '한글 프롬프트("손으로 나를 잡았다")로는 He grabbed me with his hand.가 나오기 쉬움 — 프롬프트를 "내 손을 잡았다"로 고칠 것' },
  56: { correctedAnswer: 'We can buy strawberries by the pound.' },
};
const adjFocus = {
  44: 'a — 직업 앞 부정관사', 45: 'an — 모음 소리(h 묵음) 앞', 46: 'a … the — 처음 언급 a, 다시 언급 the', 47: 'the sky(하나뿐) / 무지개는 a가 자연스러움',
  48: 'The earth, the sun — 하나뿐인 것', 49: 'the guitar(악기) / sports(무관사)', 50: 'the same ~ as', 51: 'for breakfast — 식사 무관사',
  52: 'at school(무관사, 수업 중) vs at the school(건물)', 53: 'by the hand', 54: 'in the face', 55: 'by the day', 56: 'by the pound',
  57: 'the only', 58: 'do the cooking', 59: 'do the shopping',
};

// =====================================================================
// TOPIC 10 동사
// =====================================================================
const verbPO = [
  it(15, 'There are many jobs in the world.', [], { analysisNote: '1형식 (There + be + 주어) — 학교문법 기준', studentMatch: 's14-1#1: There are many jobs in the world, and it is very hard to choose only one. (앞 절만)' }),
  it(15, 'The cookie smells good.', [], { analysisNote: '2형식 (감각동사 smell + 형용사 보어)' }),
  it(15, 'I want to become an interpreter.', [], { analysisNote: '3형식 (want + to부정사 목적어)', studentMatch: 's16-2#1: There are many reasons why I want to become an interpreter. (why절 부분만)' }),
  it(15, 'He always gives me candy when I visit him.', [], { analysisNote: '4형식 (give + 간접목적어 me + 직접목적어 candy)', studentMatch: 's4-6#5: He always gives me candy when I visit him. (같은 문장)' }),
  it(15, 'They also tell me that I need to love children and serve them.', [], { analysisNote: '4형식 (tell + 간접목적어 me + 직접목적어 that절)', studentMatch: 's14-3#3: They also tell me that I need to love children and serve others. (책은 others → them으로 바꿈 — issues 참조)' }),
  it(15, 'I want to be able to help others learn and grow, too.', [], { analysisNote: '문장 전체는 3형식(want + to부정사 목적어). help others learn(help + 목적어 + 원형부정사)은 5형식 구조 — 5형식 예문으로 둔 것으로 보임(issues 참조)', studentMatch: 's14-2#4: I want to be able to help others learn and grow, too. (같은 문장)' }),
];
const verbApp = [
  [19, 'There are many jobs in the world(14과)', '1형식', '1형식 (There + be + 주어) — 학교문법 기준. 마침표 누락'],
  [19, 'The cat jumped out of the window.', '1형식', '1형식 (주어 + 동사 + 부사구)'],
  [19, 'Mom is out in the garage.', '1형식', '1형식 (be = 있다 + 부사(구))'],
  [19, 'He stayed in bed.', '1형식', '1형식 (stay = 머무르다 + 부사구)'],
  [19, 'Is there a bank next to the office?', '1형식', '1형식 (There + be + 주어, 의문문)'],
  [19, 'The cookie smells good.', '2형식', '2형식 (감각동사 + 형용사 보어)'],
  [19, 'You must keep quiet during working with them.', '2형식', '2형식 (keep + 형용사 보어 quiet). during working은 문법 오류(→ while working)'],
  [19, 'It is getting warmer and warmer.', '2형식', '2형식 (get + 형용사 보어, 비교급 and 비교급)'],
  [19, 'He grew older after the great success of his business.', '2형식', '2형식 (grow + 형용사 보어)'],
  [19, 'I want to become an interpreter.(16과)', '3형식', '3형식 (want + to부정사 목적어) — become an interpreter만 보면 2형식으로 착각하기 쉬움'],
  [19, 'I bought a new computer.', '3형식', '3형식'],
  [19, 'Tom sold his car last week.', '3형식', '3형식'],
  [19, 'Can you explain the situation?', '3형식', '3형식 (explain은 4형식으로 못 씀: explain me the situation ✕)'],
  [19, 'I informed him of her success.', '3형식', '3형식 (inform A of B — 4형식처럼 보이지만 of 전치사구)'],
  [19, 'They robbed the lady of her bag.', '3형식', '3형식 (rob A of B)'],
  [20, 'Tim helped me with my report.', '3형식', '3형식 (help A with B)'],
  [20, 'He owed his success to his father.', '3형식', '3형식 (owe A to B: A는 B 덕분이다)'],
  [20, 'He always gives me candy when I visit him(4과)', '4형식', '4형식 (give + IO + DO). 마침표 누락'],
  [20, 'He bought his wife an expensive car.', '4형식', '4형식 (buy + IO + DO; 3형식 전환 시 for)'],
  [20, 'Will you teach me how to go to Seoul?', '4형식', '4형식 (teach + IO + DO how to …) — 표현은 tell me how to get to가 자연스러움'],
  [20, 'I can make you an amazing steak.', '4형식', '4형식 (make + IO + DO; 3형식 전환 시 for)'],
  [20, 'They ask him a lot of questions.', '4형식', '4형식 (ask + IO + DO; 3형식 전환 시 of)'],
  [20, 'They also tell me that I need to love children and serve them.(14과)', '4형식', '4형식 (tell + IO + that절 DO)'],
  [20, 'I want to be able to help others learn and grow, too.(14과)', '3형식', '문장 전체 3형식(want + to부정사 목적어). 책은 5형식 예문 무리 맨 앞에 둠 — help others learn이 5형식 구조'],
  [20, 'His gift made his wife happy.', '5형식', '5형식 (make + O + 형용사 보어)'],
  [20, 'Age has turns his hair gray.', '5형식', '5형식 (turn + O + 형용사 보어). has turns는 오류(→ has turned)'],
  [20, 'We will call the girl Bobby.', '5형식', '5형식 (call + O + 명사 보어)'],
  [20, 'She thought him innocent.', '5형식', '5형식 (think + O + 형용사 보어, 격식체). She thought (that) he was innocent.는 3형식'],
  [20, 'He believes his daughter beautiful.', '5형식', '5형식 의도(believe + O + 형용사) — 어색함; He believes his daughter to be beautiful.'],
];
const verbAppStudent = {
  1: 's14-1#1: There are many jobs in the world, and it is very hard to choose only one. (앞 절만)',
  10: 's16-2#1: There are many reasons why I want to become an interpreter. (why절 부분만)',
  18: 's4-6#5: He always gives me candy when I visit him. (같은 문장)',
  23: 's14-3#3: They also tell me that I need to love children and serve others. (책은 others → them)',
  24: 's14-2#4: I want to be able to help others learn and grow, too. (같은 문장)',
};
const verbRev1 = [
  [21, '세상에는 많은 직업들이 있다.'],
  [21, '그 고양이가 창문 밖으로 뛰어나왔다.'],
  [21, '엄마는 차고로 나가셨다.'],
  [21, '그는 침대에 있었다.'],
  [21, '그 사무실 옆에 은행이 있나요?'],
  [21, '그 과자는 냄새가 좋다'],
  [21, '너는 그들과 함께 일하는 동안은 조용히 해야 한다.'],
  [21, '날씨가 점점 따뜻해지고 있다.'],
  [21, '그의 사업이 크게 성공한 후, 그는 나이가 들어갔다.'],
  [21, '나는 통역가가 되고 싶다.'],
  [22, '나는 새 컴퓨터를 샀다.'],
  [22, '톰은 지난 주에 그의 차를 팔았다.'],
  [22, '너는 그 상황을 설명할 수 있니?'],
  [22, '나는 그에게 그녀의 성공을 알렸다.'],
  [22, '그들은 그 숙녀에게서 가방을 빼앗았다.'],
  [22, '팀은 내가 리포트를 하는 것을 도왔다.'],
  [22, '그는 그의 성공을 아버지의 덕으로 돌렸다.'],
  [22, '내가 그를 방문할 때, 그는 항상 내게 사탕을 준다.'],
  [22, '그는 아내에게 비싼 차를 사 주었다.'],
  [22, '나에게 서울로 가는 방법을 가르쳐 주실래요?'],
  [23, '나는 너에게 너무 맛있는 스테이크를 만들어 줄게.'],
  [23, '그들은 그에게 많은 질문들을 물었다.'],
  [23, '그들은 또한 내가 아이들을 사랑하고 그들에게 봉사해야 한다고 말한다.'],
  [23, '나는 다른 사람들이 배우고 자라는 것을 도울 수 있기를 원한다.'],
  [23, '그의 선물은 그의 아내를 행복하게 만들었다.'],
  [23, '세월은 그의 머리카락을 회색으로 변하게 했다.'],
  [23, '우리는 그 소녀를 바비라고 부를 것이다.'],
  [23, '그녀는 그가 결백하다고 생각했다.'],
  [23, '그는 그의 딸이 아름답다고 믿는다.'],
];
const verbFix = {
  1: { answerOverride: 'There are many jobs in the world.', answerSourceNote: 'Pass-Off (1) item 1(15쪽, 마침표 있음)을 정답으로 씀 — Application(19쪽)은 마침표 누락' },
  3: { answerNote: '한글("나가셨다")대로 Mom went out to the garage.도 정답(역시 1형식)' },
  4: { answerNote: 'He was in bed.도 정답(1형식)' },
  7: { correctedAnswer: 'You must keep quiet while working with them.', answerNote: 'while you are working with them도 정답' },
  10: { slotNote: '2형식으로 답하기 쉬움 — want의 목적어가 to부정사이므로 3형식' },
  16: { answerNote: '한글("내가 리포트를 하는 것을 도왔다")로는 Tim helped me (to) write my report.(5형식)가 나오기 쉬움 — 형식 답이 학생 영어에 따라 달라짐', slotNote: '책 문장 기준 3형식; Tim helped me write my report.로 썼다면 5형식', slotAccept: ['3형식', '5형식'] },
  18: { answerOverride: 'He always gives me candy when I visit him.', answerSourceNote: 'Pass-Off (1) item 4(15쪽, 마침표 있음)를 정답으로 씀 — Application(20쪽)은 마침표 누락', answerNote: 'When I visit him, he always gives me candy.도 정답' },
  20: { correctedAnswer: 'Can you tell me how to get to Seoul?', answerNote: 'Could you tell me the way to Seoul?도 정답(3형식이 됨 — 형식 판정 주의)' },
  21: { answerNote: '한글("만들어 줄게")대로 I will make you a delicious steak.도 정답(4형식)' },
  22: { correctedAnswer: 'They asked him a lot of questions.', answerNote: '한글이 과거("물었다")라 과거형이 맞음; 책 영어(They ask …)를 살리려면 한글을 "질문을 한다"로 고쳐야 함' },
  23: { answerNote: 'STUDENT s14-3 원문은 … and serve others. — 원문대로 쓴 답도 정답 처리 권장' },
  24: { slotNote: '문장 전체 기준 3형식(want + to부정사 목적어). 책 배열상 5형식을 의도한 것으로 보임(help others learn) — 두 답 모두 인정 권장', slotAccept: ['3형식', '5형식'], answerNote: '한글에 "또한(too)"이 빠짐 — too 없는 답도 정답' },
  26: { correctedAnswer: 'Age has turned his hair gray.' },
  28: { answerNote: 'She thought (that) he was innocent.도 뜻으로는 정답이지만 이 경우 3형식', slotNote: '책 문장(She thought him innocent.) 기준 5형식; that절로 쓰면 3형식', slotAccept: ['5형식', '3형식'] },
  29: { correctedAnswer: 'He believes his daughter to be beautiful.', answerNote: 'He believes (that) his daughter is beautiful.도 뜻으로는 정답이지만 이 경우 3형식', slotNote: '책 의도 5형식(believe + O + 보어); that절로 쓰면 3형식', slotAccept: ['5형식', '3형식'] },
};

// ---------- irregular verb table (p15-18) parsed from the text layer ----------
function tableRowsFromPage(n) {
  let lines = pageLines(n).filter(l => !HEADER.has(l) && l !== String(n));
  if (n === 15) {
    const a = lines.indexOf('과거분사');
    const b = lines.findIndex(l => l.startsWith('(2)불규칙동사의 변화'));
    lines = lines.slice(a + 1, b);
  }
  if (lines.length % 4 !== 0) errors.push(`[table] p${n} line count ${lines.length} not a multiple of 4`);
  const rows = [];
  for (let i = 0; i < lines.length; i += 4) {
    const r = lines.slice(i, i + 4);
    if (!/[가-힣]/.test(r[0]) || !/^[a-z]/.test(r[1])) errors.push(`[table] p${n} odd row ${JSON.stringify(r)}`);
    rows.push(r);
  }
  return rows;
}
const tableRows = [], tableRowPages = [];
const expectTable = { 15: 17, 16: 34, 17: 33, 18: 30 };
for (const p of [15, 16, 17, 18]) {
  const rs = tableRowsFromPage(p);
  if (rs.length !== expectTable[p]) errors.push(`[table] p${p} rows ${rs.length} != expected ${expectTable[p]} (counted on image)`);
  rs.forEach(r => { tableRows.push(r); tableRowPages.push(p); });
}

// Correct forms (for grading) keyed by table row index (0-based) via present form + meaning.
const accept = {
  'arise': [['arose'], ['arisen']], 'am/is': [['was'], ['been']], 'are': [['were'], ['been']],
  'bear': [['bore'], ['borne', 'born']], 'beat': [['beat'], ['beaten', 'beat']], 'become': [['became'], ['become']],
  'begin': [['began'], ['begun']], 'bend': [['bent'], ['bent']], 'bind': [['bound'], ['bound']], 'bite': [['bit'], ['bitten']],
  'bless': [['blessed', 'blest'], ['blessed', 'blest']], 'blow': [['blew'], ['blown']], 'break': [['broke'], ['broken']],
  'bring': [['brought'], ['brought']], 'build': [['built'], ['built']], 'burn': [['burnt', 'burned'], ['burnt', 'burned']],
  'buy': [['bought'], ['bought']], 'cast': [['cast'], ['cast']], 'catch': [['caught'], ['caught']], 'choose': [['chose'], ['chosen']],
  'come': [['came'], ['come']], 'cost': [['cost'], ['cost']], 'cut': [['cut'], ['cut']], 'do (does)': [['did'], ['done']],
  'draw': [['drew'], ['drawn']], 'dream': [['dreamt', 'dreamed'], ['dreamt', 'dreamed']], 'drink': [['drank'], ['drunk']],
  'drive': [['drove'], ['driven']], 'eat': [['ate'], ['eaten']], 'fall': [['fell'], ['fallen']], 'feed': [['fed'], ['fed']],
  'feel': [['felt'], ['felt']], 'find': [['found'], ['found']], 'flee': [['fled'], ['fled']], 'fly': [['flew'], ['flown']],
  'forbid': [['forbade', 'forbad'], ['forbidden']], 'forsake': [['forsook'], ['forsaken']], 'freeze': [['froze'], ['frozen']],
  'get': [['got'], ['got', 'gotten']], 'give': [['gave'], ['given']], 'go': [['went'], ['gone']], 'grow': [['grew'], ['grown']],
  'hang': [['hung'], ['hung']], 'have (has)': [['had'], ['had']], 'hear': [['heard'], ['heard']], 'hide': [['hid'], ['hidden']],
  'hit': [['hit'], ['hit']], 'hold': [['held'], ['held']], 'hurt': [['hurt'], ['hurt']], 'keep': [['kept'], ['kept']],
  'know': [['knew'], ['known']], 'lay': [['laid'], ['laid']], 'lead': [['led'], ['led']], 'lend': [['lent'], ['lent']],
  'let': [['let'], ['let']], 'leave': [['left'], ['left']], 'lie': [['lay'], ['lain']], 'lose': [['lost'], ['lost']],
  'light': [['lit', 'lighted'], ['lit', 'lighted']], 'make': [['made'], ['made']], 'mean': [['meant'], ['meant']], 'meet': [['met'], ['met']],
  'mistake': [['mistook'], ['mistaken']], 'overcome': [['overcame'], ['overcome']], 'overeat': [['overate'], ['overeaten']],
  'pay': [['paid'], ['paid']], 'put': [['put'], ['put']], 'prove': [['proved'], ['proven', 'proved']], 'quit': [['quit', 'quitted'], ['quit', 'quitted']],
  'read': [['read'], ['read']], 'ride': [['rode'], ['ridden']], 'ring': [['rang'], ['rung']], 'rise': [['rose'], ['risen']],
  'run': [['ran'], ['run']], 'say': [['said'], ['said']], 'see': [['saw'], ['seen']], 'seek': [['sought'], ['sought']],
  'sell': [['sold'], ['sold']], 'send': [['sent'], ['sent']], 'set': [['set'], ['set']], 'shake': [['shook'], ['shaken']],
  'shine': [['shone', 'shined'], ['shone', 'shined']], 'shoot': [['shot'], ['shot']], 'show': [['showed'], ['shown', 'showed']],
  'shut': [['shut'], ['shut']], 'sing': [['sang'], ['sung']], 'sink': [['sank', 'sunk'], ['sunk']], 'sit': [['sat'], ['sat']],
  'sleep': [['slept'], ['slept']], 'smell': [['smelt', 'smelled'], ['smelt', 'smelled']], 'speak': [['spoke'], ['spoken']],
  'spend': [['spent'], ['spent']], 'spring': [['sprang', 'sprung'], ['sprung']], 'spread': [['spread'], ['spread']],
  'stand': [['stood'], ['stood']], 'steal': [['stole'], ['stolen']], 'strike': [['struck'], ['struck', 'stricken']],
  'strive': [['strove', 'strived'], ['striven', 'strived']], 'sweep': [['swept'], ['swept']], 'swim': [['swam'], ['swum']],
  'take': [['took'], ['taken']], 'teach': [['taught'], ['taught']], 'tear': [['tore'], ['torn']], 'tell': [['told'], ['told']],
  'think': [['thought'], ['thought']], 'throw': [['threw'], ['thrown']], 'understand': [['understood'], ['understood']],
  'upset': [['upset'], ['upset']], 'wake': [['woke', 'waked'], ['woken', 'waked']], 'weep': [['wept'], ['wept']], 'win': [['won'], ['won']],
  'withdraw': [['withdrew'], ['withdrawn']], 'write': [['wrote'], ['written']],
};
const verbRowNotes = {
  'bear': 'born은 "태어나다"(be born) 수동에서만; 참다·나르다·(능동)낳다의 과거분사는 borne',
  'bite': '책의 과거분사 bit는 고어/비표준 — bitten',
  'hide': '책의 과거분사 hid는 고어/비표준 — hidden',
  'send': '책은 send–send–send로 잘못 인쇄 — sent–sent',
  'show': '책은 show–show–show로 잘못 인쇄 — showed–shown(showed)',
  'strive': '책의 과거형 stove는 오타(stove = 난로) — strove',
  'understand': '책은 understand–understand–understand로 잘못 인쇄 — understood–understood',
  'lie': '뜻이 "눕다"일 때 lay–lain; "거짓말하다"는 lied–lied',
  'hang': '"교수형에 처하다"는 hanged–hanged',
  'get': '미국식 과거분사 gotten',
  'read': '과거·과거분사 발음 [red]',
  'lend': '책의 뜻 "빌리다"는 틀림 — lend는 빌려주다(빌리다는 borrow)',
  'mistake': '책의 뜻 "실수하다"는 부정확 — 동사 mistake는 잘못 알다·오해하다',
  'upset': '책의 뜻 "화내다"는 부정확 — 동사 upset은 속상하게 하다',
};
const tableWrong = new Set(['bear', 'bite', 'hide', 'send', 'show', 'strive', 'understand']);

// ---------- review 2 verb list (p24-27) parsed from text layer ----------
const expectRev = { 24: 29, 25: 29, 26: 27, 27: 25 };
const revVerbs = [];
for (const p of [24, 25, 26, 27]) {
  const lines = pageLines(p).filter(l => !HEADER.has(l) && l !== String(p) && !l.startsWith('2.다음') && !['현 재', '과 거', '과거 분사'].includes(l));
  if (lines.length !== expectRev[p]) errors.push(`[review2] p${p} verbs ${lines.length} != expected ${expectRev[p]}`);
  lines.forEach(v => revVerbs.push([p, v]));
}

// row / review-number helpers (computed, not hand-typed)
function tRow(v, nth = 0) { const ks = tableRows.map((r, k) => r[1] === v ? k : -1).filter(k => k >= 0); if (ks[nth] === undefined) { errors.push('[tRow] ' + v); return 0; } return ks[nth] + 1; }
function tPage(v, nth = 0) { return tableRowPages[tRow(v, nth) - 1]; }
function rNo(v, nth = 0) { const ks = revVerbs.map(([, x], k) => x === v ? k : -1).filter(k => k >= 0); if (ks[nth] === undefined) { errors.push('[rNo] ' + v); return 0; } return ks[nth] + 1; }
function rPage(v, nth = 0) { return revVerbs[rNo(v, nth) - 1][0]; }
const tw = (v, nth = 0) => `(2) 표 row ${tRow(v, nth)} ${v}(${tPage(v, nth)}쪽) + Review 2. #${rNo(v, nth)}(${rPage(v, nth)}쪽)`;

// =====================================================================
// Assemble topics
// =====================================================================
function checkAll() {
  // pass-off lines
  for (const g of adjPO) for (const x of g.items) mustBeLine(x.page, x.raw, 'adj passOff');
  for (const [p, raw] of adjApp) mustBeLine(p, raw, 'adj application');
  for (const t of adjRev) { mustBeLine(t.page, t.rawInstruction, 'adj review instruction'); for (const [p, pr] of t.items) mustBeLine(p, pr, 'adj review prompt'); }
  for (const x of verbPO) mustBeLine(x.page, x.raw, 'verb passOff');
  for (const [p, raw] of verbApp) mustBeLine(p, raw, 'verb application');
  for (const [p, pr] of verbRev1) mustBeLine(p, pr, 'verb review1 prompt');
  mustBeLine(21, '1.다음 문장을 보고 영작한 후에 몇 형식 문장인지 괄호 안에 쓰시오.', 'verb review1 instruction');
  mustBeLine(24, '2.다음 동사들의 과거형과 과거 완료형을 쓰시오.', 'verb review2 instruction');
  mustBeLine(15, '(1)동사의 종류', 'verb heading');
  mustBeLine(15, '(2)불규칙동사의 변화(현재-과거-과거완료)', 'verb table heading');
  for (const g of adjPO) mustBeLine(g.page, g.label, 'adj group label');
}
checkAll();

// Build adjective application items
const adjAppItems = adjApp.map(([p, raw, bold, g], i) => {
  const x = it(p, raw, bold);
  x.appNo = i + 1;
  x.inferredSubPoint = adjAppGroupNames[g];
  if (adjAppNotes[i + 1]) x.analysisNote = adjAppNotes[i + 1];
  return x;
});
// student matches for application
adjAppItems[30].studentMatch = 's2-5#4: She is more talented than me. (같은 문장)';
adjAppItems[36].studentMatch = 's4-4#4: Because my grandfather passed away several years ago, my grandmother lives with my mother’s eldest brother. (뒷부분만)';
adjAppItems[48].studentMatch = 's4-6#3: He can play all kinds of sports, and he can play the piano and guitar pretty well. (두 절 순서를 바꾸고 줄여 고쳐 씀, 과 표시 없음)';

// passOff <-> application cross refs (exact en match, or split lines)
function findApp(en) { return adjAppItems.filter(a => a.en === en).map(a => a.appNo); }
for (const g of adjPO) for (const x of g.items) {
  let nums = findApp(x.en);
  if (!nums.length) { // split two-sentence lines
    const parts = x.en.split(/(?<=[?.!])\s+/);
    nums = parts.flatMap(findApp);
    if (nums.length !== parts.length) errors.push(`[xref] passOff not found in application: ${x.en}`);
  }
  x.appRef = nums.map(n => `application #${n}`).join(', ');
  for (const n of nums) { const a = adjAppItems[n - 1]; if (!a.analysisNote && x.analysisNote) a.analysisNote = x.analysisNote; }
}
// STUDENT Korean for matched sentences (content/lessons/student, paragraph blocks aligned with sentences)
const studentKo = {
  adj: { 31: 's2-5#4: 그녀는 나보다 재능이 많습니다.', 37: 's4-4#4: 외할아버지께서 몇 년 전에 돌아가셨기 때문에 외할머니는 큰외삼촌과 함께 살고 계십니다.', 49: 's4-6#3: 그분은 모든 종류의 스포츠를 하실 수 있고, 피아노와 기타도 꽤 잘 치십니다.' },
  verb: { 1: 's14-1#1: 세계에는 많은 직업들이 있고 그중 하나만을 선택하기란 매우 어렵습니다.', 10: 's16-2#1: 내가 통역사가 되고 싶은 이유는 많이 있습니다.', 18: 's4-6#5: 내가 그분을 방문할 때 그분은 항상 나에게 캔디를 주십니다.', 23: 's14-3#3: 그분들은 또한 나에게 아이들을 사랑하고 다른 사람들에게 봉사해야 한다고 말씀하십니다.', 24: 's14-2#4: 나 또한 다른 사람들을 배우고 성장할 수 있게 도울 수 있기를 원합니다.' },
};
for (const [n, k] of Object.entries(studentKo.adj)) adjAppItems[n - 1].studentKo = k;

// Review mapping (adj)
const reviewOfApp = {};
const adjTasks = adjRev.map(t => {
  const m = t.rawInstruction.match(/^(\d+\.)\s*(.*)$/);
  const task = { no: m[1], page: t.page, instruction: m[2], rawInstruction: t.rawInstruction, taskTypes: t.taskTypes, numberedInBook: true, printedItemNumbers: false, items: [] };
  t.items.forEach((row, idx) => {
    const n = String(idx + 1);
    const [p, prompt, appNo] = row;
    const a = adjAppItems[appNo - 1];
    const grp = a.inferredSubPoint;
    const within = adjAppItems.filter(z => z.inferredSubPoint === grp).findIndex(z => z.appNo === appNo) + 1;
    const src = `application ${grp.slice(0, 3)}[라벨 없음·추론] item ${within} (application #${appNo})`;
    reviewOfApp[appNo] = `Review ${task.no} #${n}`;
    if (t.no === '1.') {
      const [, , , tokens, optional, note] = row;
      for (const w of [...tokens, ...optional]) if (!new RegExp(`\\b${w}\\b`).test(prompt)) errors.push(`[underline] token ${w} not in ${prompt}`);
      const boldWords = a.bold.flatMap(b => b.split(/[ ,]+/)).filter(Boolean);
      if (JSON.stringify(boldWords) !== JSON.stringify(tokens)) errors.push(`[underline] tokens ${tokens} != application bold ${boldWords} (${prompt})`);
      task.items.push({ n, page: p, prompt, promptLang: 'en', extraSlot: '형용사에 밑줄', answerFromBook: null,
        answerSource: `${src} — 제시문 자체가 이 문장(Application 굵은 글씨가 형용사 표시)`, proposedAnswer: null, correctedAnswer: null,
        extraSlotAnswer: tokens.join(', '), underlineTokens: tokens, optionalTokens: optional, extraSlotNote: note,
        answerNote: null, sourceRef: { section: 'application', group: grp, appNo } });
      if (prompt !== a.en) errors.push(`[review1 adj] prompt != application en: ${prompt} / ${a.en}`);
    } else {
      const fix = adjFix[appNo] || {};
      task.items.push({ n, page: p, prompt, promptLang: 'ko', extraSlot: null, answerFromBook: a.en,
        answerSource: src, proposedAnswer: null, correctedAnswer: fix.correctedAnswer || null, extraSlotAnswer: null,
        focus: t.no === '4.' ? (adjFocus[appNo] || null) : (a.bold.length ? a.bold.join(' / ') : null),
        answerNote: fix.answerNote || null, sourceRef: { section: 'application', group: grp, appNo } });
      a.koFromReview = `Review ${task.no} #${n}: ${prompt}`;
    }
  });
  return task;
});
adjAppItems.forEach(a => { a.reviewRef = reviewOfApp[a.appNo] || null; if (!a.koFromReview) a.koFromReview = null; });
adjTasks[0].slotAnswerNote = '책에 정답 없음. 정답은 Application(7쪽) 굵은 글씨 기준. 관사 a/an은 이 책이 형용사 단원 (4)로 다루지만 굵게 표시하지 않았으므로 필수 정답에서 빼고, 표시해도 오답 처리하지 않기를 권장(issues 참조).';
adjTasks[3].instructionNote = '지시문은 "a나 the를 이용하여"이지만 16문항 중 여러 개는 무관사(for breakfast, at school, sports)가 핵심 — issues 참조';
for (const g of adjPO) for (const x of g.items) {
  const refs = x.appRef.split(', ').map(s => Number(s.replace('application #', ''))).map(n => reviewOfApp[n]).filter(Boolean);
  x.reviewRef = refs.length ? refs.join(', ') : null;
}

// Group application items (label null, inferred)
const adjAppGroups = [1, 2, 3, 4].map(g => ({ label: null, explanation: null, inferredSubPoint: adjAppGroupNames[g],
  items: adjAppItems.filter(a => a.inferredSubPoint === adjAppGroupNames[g]).map(a => { const c = { ...a }; delete c.inferredSubPoint; return c; }) }));

// Verb application items
const verbAppItems = verbApp.map(([p, raw, pat, note], i) => {
  const x = it(p, raw, []);
  x.appNo = i + 1;
  x.analysisNote = note;
  x.sentencePattern = pat;
  if (verbAppStudent[i + 1]) x.studentMatch = verbAppStudent[i + 1];
  if (studentKo.verb[i + 1]) x.studentKo = studentKo.verb[i + 1];
  return x;
});
verbPO.forEach(x => { const a = verbAppItems.find(z => z.en.replace(/\.$/, '') === x.en.replace(/\.$/, '')); if (a && a.studentKo) x.studentKo = a.studentKo; });
adjPO.forEach(g => g.items.forEach(x => { const a = adjAppItems.find(z => z.en === x.en); if (a && a.studentKo) x.studentKo = a.studentKo; }));
verbPO.forEach(x => {
  const n = verbAppItems.findIndex(a => a.en.replace(/\.$/, '') === x.en.replace(/\.$/, '')) + 1;
  if (!n) errors.push('[xref] verb passOff not in application: ' + x.en);
  x.appRef = `application #${n}`;
  x.reviewRef = `Review 1. #${n}`;
});
if (verbRev1.length !== verbAppItems.length) errors.push('[review1 verb] count mismatch');
const verbTask1 = { no: '1.', page: 21, instruction: '다음 문장을 보고 영작한 후에 몇 형식 문장인지 괄호 안에 쓰시오.', rawInstruction: '1.다음 문장을 보고 영작한 후에 몇 형식 문장인지 괄호 안에 쓰시오.',
  taskTypes: ['ko_to_en_compose', 'identify_sentence_pattern'], numberedInBook: true, printedItemNumbers: false,
  slotAnswerNote: '괄호가 인쇄되어 있지 않음(29문항 모두). 형식 정답은 책에 없으며 이 파일의 extraSlotAnswer는 책 영어 문장 기준으로 추출자가 판정한 값(학교문법 5형식, There+be = 1형식). 학생이 다른 구조로 영작하면 형식이 달라지는 문항 있음(#16, #24, #28, #29).',
  items: verbRev1.map(([p, prompt], i) => {
    const a = verbAppItems[i];
    const fix = verbFix[i + 1] || {};
    a.koFromReview = `Review 1. #${i + 1}: ${prompt}`;
    a.reviewRef = `Review 1. #${i + 1}`;
    return { n: String(i + 1), page: p, prompt, promptLang: 'ko', extraSlot: '괄호 ( )에 몇 형식인지 (괄호는 인쇄되지 않음)',
      answerFromBook: fix.answerOverride || a.en,
      answerSource: `application (1)[라벨 없음·추론] item ${i + 1}` + (fix.answerSourceNote ? ` — ${fix.answerSourceNote}` : '') ,
      proposedAnswer: null, correctedAnswer: fix.correctedAnswer || null,
      extraSlotAnswer: a.sentencePattern,
      extraSlotAccept: fix.slotAccept || [a.sentencePattern],
      extraSlotNote: fix.slotNote || null,
      answerNote: fix.answerNote || null, sourceRef: { section: 'application', group: '(1)동사의 종류', appNo: i + 1 } };
  }) };

// Verb review 2 (table)
let dupLay = 0;
const verbTask2 = { no: '2.', page: 24, instruction: '다음 동사들의 과거형과 과거 완료형을 쓰시오.', rawInstruction: '2.다음 동사들의 과거형과 과거 완료형을 쓰시오.',
  taskTypes: ['write_past_and_past_participle'], numberedInBook: true, printedItemNumbers: false,
  printedColumns: ['현 재', '과 거', '과거 분사'], pages: [24, 27],
  slotAnswerNote: '지시문은 "과거 완료형"이지만 표 머리글은 "과거 분사" — 과거분사가 맞음. 정답은 15~18쪽 표(answerFromBook, 인쇄 그대로)이며 표가 틀린 7행은 correctedAnswer, 채점용 복수 정답은 accept. 표의 arise·forsake·overcome·overeat 4개는 복습 표에 없음.',
  items: revVerbs.map(([p, v], i) => {
    let idx;
    if (v === 'lay') { idx = tableRows.map((r, k) => r[1] === 'lay' ? k : -1).filter(k => k >= 0)[dupLay++]; }
    else idx = tableRows.findIndex(r => r[1] === v);
    if (idx < 0 || idx === undefined) { errors.push('[review2] verb not in table: ' + v); return null; }
    const r = tableRows[idx];
    const acc = accept[v];
    if (!acc) errors.push('[accept] missing ' + v);
    const wrong = tableWrong.has(v);
    return { n: String(i + 1), page: p, prompt: v, promptLang: 'en', extraSlot: '과거 · 과거분사 칸 채우기',
      answerFromBook: `${r[2]} / ${r[3]}`, answerSource: `table (2)불규칙동사의 변화 row ${idx + 1} (p${tableRowPages[idx]}, 뜻: ${r[0]})`,
      proposedAnswer: null, correctedAnswer: wrong ? `${acc[0][0]} / ${acc[1][0]}` : null, extraSlotAnswer: null,
      accept: { past: acc[0], pastParticiple: acc[1] }, answerNote: verbRowNotes[v] || null,
      sourceRef: { section: 'table', row: idx + 1 } };
  }).filter(Boolean) };

const verbTableSection = { kind: 'table', heading: '(2)불규칙동사의 변화(현재-과거-과거완료)', page: 15, pages: [15, 18],
  parentHeading: '1. Pass-Off Sentences', subPoint: '(2)', explanation: null,
  boldNote: '머리글 행(동사의 뜻/현재/과거/과거분사)만 굵게 인쇄',
  note: '제목은 "과거완료"라고 했지만 표의 세 번째 열 머리글은 "과거분사"(과거분사가 맞음). lay가 두 번(놓다/눕히다). 변화형이 틀린 행 7개(bear, bite, hide, send, show, strive, understand)는 rowCorrections, 뜻 칸이 틀리거나 부정확한 행(lend 빌리다, mistake 실수하다, upset 화내다, let·take·hang·withdraw)은 issues 참조. rows는 인쇄 그대로.',
  table: { title: '(2)불규칙동사의 변화(현재-과거-과거완료)', columns: ['동사의 뜻', '현재', '과거', '과거분사'], rows: tableRows },
  rowPages: tableRowPages,
  rowCorrections: tableRows.map((r, k) => tableWrong.has(r[1]) ? { row: k + 1, page: tableRowPages[k], printed: r.join(' | '), corrected: `${r[0]} | ${r[1]} | ${accept[r[1]][0].join(' / ')} | ${accept[r[1]][1].join(' / ')}`, note: verbRowNotes[r[1]] } : null).filter(Boolean),
};

// Mark which table verbs are missing from review
verbTableSection.notInReview = tableRows.filter(r => !revVerbs.some(([, v]) => v === r[1])).map(r => r[1]);

// =====================================================================
// Front matter
// =====================================================================
const introText = [
  '특 징',
  '1. Pass-Off Grammar 란?',
  'Pass-Off English의 문법서이다.',
  'Pass-Off English는 말하기가 우선적으로 이루어져야 하는 영어 교육이다. 그러나 speaking, listening, writing, vocabulary, grammar가 따로 구성되어 있지 않고 복합적으로 1년간 학습함으로써, Pass-Off English 학습자는 문법을 공부하기 전에 먼저 자신의 머릿속에 많은 영어 문장으로 그 지식의 근간을 형성 시켜준다. Pass-Off Grammar는 전체 문법이 대주제 20개와 연결고리 70개로 이루어져 있다. 각 문법에 대한 예문들은 TLA English의 문장들로 구성되어 있으므로, 이 책을 시작하기 전에 Pass-Off English의 560여 문장에 대한 학습이 선행되면 문법학습은 매우 쉽고 빠르게 일어난다.',
  '2. Pass-Off Sentences와 Application Sentences',
  'sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다. 이 때 사용되는 예문이 Pass-Off English 의 예문이므로 선행학습자는 문법을 매우 쉽게 이해할 수 있다.',
  'Application sentences는 대주제 20개와 소주제70개의 내용들에 관한 응용 문장들을 많이 접할 수 있게 하였다.',
  '3. Review',
  '전시간에 배웠던 문법사항에 대해 학습자 스스로 메모하여 내용을 정리하게 하였다.',
  '문법은 어떤 학문보다 자신만의 조직적인 지식의 틀이 머릿속에 잘 짜여있어야 하므로 70개의 연결고리를 하나씩 암기하여 그 틀을 짜 볼 수 있게 하였다.',
  '학습법',
  '1. Pass-Off Grammar는 학습대상을 Pass Off English를 마치거나 영어의 문법 기초가 필요한 초급자들을 학습의 대상으로 한다.',
  '2. Pass-Off sentences는 문법 예문으로 이를 반드시 암기해야 하며 70개의 문법 소주제 별로 교사의 문법 설명과 해당 문장을 외울 수 있어야 한다.',
  '3. Application Sentences는 교사의 문법 설명과 완전하게 이해된 Pass-Off Sentences를 기초하여 보다 많은 문법 적용과 확장을 할 수 있도록 해석해야 하며 한글 번역을 보고 영어로 문장을 바로 말할 수 있도록 심화하는 학습도 권장한다.',
  '4. Review 는 Pass-Off English의 기초 문장에 대한 test와 application sentence의 활용을 스스로 확인할 수 있게 하였다. 그러나 채점 후 틀린 문항은 반드시 다시 학습하여서 보충하기를 권한다.',
  '5. 문법 진도가 나아갈수록 소주제와 대주제를 그려 가면서 각 소 주제별로 문법 내용과 문장을 정리하고 암기하여 다 적을 수 있어야만 한다. 따라서 하나의 소주제 학습이 끝났다고 진도를 빠르게 진행하는 것에 초점을 두지 말고 소주제 하나하나의 완전학습에 만전을 기하기를 명심하시기를 바란다.',
].join('\n');
// verify intro text against text layer (whitespace-insensitive, except the joined "연결고리")
{
  // "특 징" / "학습법" are heading boxes that the text layer emits together at the top; compare without them.
  const flat = s => s.replace(/\s+/g, '');
  const skip = new Set(['2', '특 징', '학습법']);
  const p2 = flat(pageLines(2).filter(l => !HEADER.has(l) && !skip.has(l)).join(''));
  const mine = flat(introText.split('\n').filter(l => !skip.has(l)).join(''));
  if (p2 !== mine) {
    let k = 0; while (k < Math.min(p2.length, mine.length) && p2[k] === mine[k]) k++;
    errors.push(`[intro] mismatch at ${k}: layer="${p2.slice(k - 20, k + 30)}" mine="${mine.slice(k - 20, k + 30)}"`);
  }
}

const frontNotes = [
  '1쪽 표지: "Pass-Off English Grammar 2", 부제 "Techniques of Language Acquisition"(T·L·A 강조), Pass-Off English 방패 로고. 모든 쪽 머리말 "The Revolution of English Education", 꼬리말 "Pass-Off English 패스오프 잉글리쉬" 로고, 가운데 "Pass-Off English" 워터마크.',
  '2쪽 특징·학습법(introText에 전문, 줄바꿈으로 끊긴 "연결 / 고리"는 "연결고리"로 이음). 1권 2쪽과 글자 단위로 비교하면 세 줄만 다름: ① "예문들은 TLA English의 문장들로"(1권: Pass-Off English의 문장들로) ② "Pass-Off Sentences와"(1권: "Sentences 와") ③ 문단 첫 단어가 소문자 "sentences에서는"(1권: "Sentences에서는").',
  '주장 검증: 2쪽은 예문이 Pass-Off(TLA) English 문장이라고 하지만 이 범위(TOPIC 9·10)의 Application 88줄 중 STUDENT 과정(content/lessons/student) 문장과 같거나 거기서 줄인 것은 8줄뿐(형용사 3/59, 동사 5/29). 나머지 80줄 중 79줄은 content/lessons 전체 3,027개 파일에서 같은 문장·그 문장을 포함한 문장을 찾지 못함(What did you have for breakfast? 1줄만 기초1 grammar1/gh1-081에 있음).',
  '3쪽 연결고리 구성도: 1권 3쪽과 텍스트가 완전히 같음(131줄 일치). 소주제 동그라미 29+23+15 = 67개(본문은 "70개").',
  '4쪽 Part 2 목차: 형용사 5(용법과 종류·형용사의 비교급·형용사의 최상급·관사) · 동사 15(동사의 종류·불규칙 종류·ed와 –ing) · 시제 28(12 시제 현재와 과거·3인칭 단수 동사 현재 동사·미래·시제 일치) · 완료와 진행 44(현재 완료·과거 완료 미래 완료·진행형·Going Being) · 준동사 52(부정사·분사·동명사·관용 표현) · 태 62(능동태·수동태) · 화법 67(직접 화법·간접 화법). 텍스트 레이어는 쪽수 순서가 "5 15 28 44 62 52 67"로 뒤섞여 나오지만 그림은 위 순서.',
  '구성도·목차의 동사 소주제 "ed와 –ing"는 본문(15~27쪽)에 없음 — issues 참조. 2권 텍스트 전체에서 "ed와"는 3·4쪽에만 나옴.',
  '추출 규칙: 이 범위 본문에는 문법 설명 문단이 없어 groups[].explanation은 모두 null(설명은 소주제 제목뿐). Application은 소주제 제목이 인쇄되지 않아 label=null, inferredSubPoint에 추론한 소주제를 적음. lessonRef는 그 줄에 인쇄된 (N과)만. "(=/=eldest)", "(=oldest)" 메모는 tag에 넣음. en은 인쇄 그대로(오류 포함), 고친 문장은 issues와 review items의 correctedAnswer에만.',
];

// =====================================================================
// Issues
// =====================================================================
const issues = [
  // ---- front matter ----
  { page: 2, where: '특징 2. 첫 문장', text: 'sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다.', type: 'korean_typo',
    problem: '문단이 소문자 "sentences에서는"으로 시작해 무엇을 가리키는지 불분명하다. 1권 같은 쪽은 "Sentences에서는"이며, 문맥상 앞에 "Pass-Off"가 빠진 것으로 보인다.',
    fix: 'Pass-Off Sentences에서는 문법 설명에 앞서 상황 예문이나 표로 문법 내용을 설명한다.', confidence: 'medium', severity: 'low' },
  { page: 2, where: '특징·학습법 여러 곳', text: '형성 시켜준다 / Pass Off English를 마치거나 / 학습대상을 … 학습의 대상으로 한다 / 각 소 주제별로 / Review 는 / Pass-Off English 의 예문이므로', type: 'korean_typo',
    problem: '띄어쓰기·표기 오류와 목적어 중복: "형성 시켜준다"→"형성시켜 준다", "Pass Off English"(하이픈 빠짐), "학습대상을 … 학습의 대상으로 한다"(같은 말 두 번), "소 주제별로"→"소주제별로", "Review 는"→"Review는", "Pass-Off English 의"→"Pass-Off English의".',
    fix: '…근간을 형성시켜 준다. / Pass-Off Grammar는 Pass-Off English를 마쳤거나 영어 문법 기초가 필요한 초급자를 학습 대상으로 한다. / 각 소주제별로 / Review는 / Pass-Off English의 예문이므로', confidence: 'high', severity: 'low' },
  { page: 4, where: '연결고리 구성도(3쪽)·목차(4쪽)의 동사 줄 ↔ TOPIC 10 본문(15~27쪽)', text: '동 사 — 동사의 종류 · 불규칙 종류 · ed와 –ing', type: 'layout_or_extraction',
    problem: '구성도와 목차는 동사 단원 소주제를 3개(동사의 종류, 불규칙 종류, ed와 –ing)로 적었지만 본문에는 (1)동사의 종류와 (2)불규칙동사의 변화만 있고 "ed와 –ing" 부분이 2권 어디에도 없다(텍스트 전체 검색에서 3·4쪽에만 나옴). -ing/-ed 형용사(boring/bored, exciting/excited)는 TOPIC 9 형용사 (1)(5쪽)에서만 다루고, 규칙동사 -ed 과거형·-ing형 만드는 규칙은 책에 없다. 목차를 보고 찾는 학생·교사는 해당 내용을 찾을 수 없다.',
    fix: '"ed와 –ing" 소주제를 새로 만들거나(규칙동사의 -ed 과거·과거분사 만들기, -ing형 만들기, 분사형 형용사 -ing/-ed 대비), 목차에서 형용사 (1)로 연결해 표시한다.', confidence: 'high', severity: 'medium' },

  // ---- TOPIC 9 형용사 ----
  { page: 6, where: 'passOff (4) item 10 + application #56(9쪽) + Review 4. #13(14쪽) 정답', text: 'We can buy strawberry by the pound.', type: 'english_grammar',
    problem: 'strawberry는 셀 수 있는 명사라 단수 무관사로 쓸 수 없다. 딸기를 (파운드 단위로) 산다는 뜻이면 복수형이어야 한다.', fix: 'We can buy strawberries by the pound.', confidence: 'high', severity: 'high' },
  { page: 7, where: 'application #16 + Review 2. #4(11쪽) 정답', text: 'You can see a shining face on the mirror.', type: 'english_grammar',
    problem: '거울에 비친 모습은 in the mirror로 말한다. on the mirror는 거울 표면 위에 무언가가 붙어 있는 경우(얼룩, 스티커)다.', fix: 'You can see a shining face in the mirror.', confidence: 'high', severity: 'high' },
  { page: 9, where: 'application #46 + Review 4. #3(13쪽)', text: 'It’s a scientific novel book and the book is very thick. / 이것은 과학 소설책이고 그 책은 매우 두껍다.', type: 'english_unnatural',
    problem: '"scientific novel book"은 영어에서 쓰지 않는 말이다(과학 소설은 science fiction (novel), novel과 book이 겹침). 한글 "이것은"과 영어 It’s도 어긋난다.', fix: 'This is a science fiction book, and the book is very thick. (a/the 연습 의도 유지)', confidence: 'high', severity: 'medium' },
  { page: 9, where: 'application #47 + Review 4. #4(14쪽)', text: 'Look at the sky. The rainbow is over there.', type: 'english_unnatural',
    problem: '처음 말하는 무지개는 a로 소개하는 것이 자연스럽다(There’s a rainbow over there.). 관사 연습 문항인데 the를 정답으로 두면 "처음 언급 a, 다시 언급 the"(바로 위 sandwich/apple 예문의 규칙)와 어긋난다. The rainbow는 둘 다 이미 아는 무지개일 때만 맞다.',
    fix: 'Look at the sky. There’s a rainbow over there.', confidence: 'medium', severity: 'medium' },
  { page: 5, where: 'passOff (2) item 3 + application #30(8쪽) + Review 2. #17(12쪽)', text: 'I know him well-probably better than anybody else does. / 나는 그를 잘 안다- 아마 누구보다도 더 잘 안다.', type: 'english_grammar',
    problem: '두 부분을 잇는 줄표(—) 자리에 하이픈(-)을 붙여 써서 well-probably가 한 단어처럼 보인다. 한글 프롬프트도 "안다- 아마"로 같은 문제.', fix: 'I know him well — probably better than anybody else does. / 나는 그를 잘 안다. 아마 누구보다도 더 잘 알 것이다.', confidence: 'high', severity: 'low' },
  { page: 7, where: 'application #5 + Review 1. #5(10쪽)', text: 'Danny is a tall, young, interesting person.', type: 'english_unnatural',
    problem: '형용사 여러 개의 일반 순서는 의견(interesting) → 크기(tall) → 나이(young)다. 바로 아래 long black ears(크기→색), an old, round, wooden table(나이→모양→재료)은 순서 규칙을 따르는데 이 문장만 어긋나, 학생이 순서 규칙을 잘못 익힐 수 있다.',
    fix: 'Danny is an interesting, tall, young person. (또는 Danny is a tall, young and interesting person.)', confidence: 'medium', severity: 'low' },
  { page: 11, where: 'Review 2. #3 ↔ application #15', text: '그는 빠르게 잠이 든다. ↔ He is fast asleep.', type: 'translation_mismatch',
    problem: 'fast asleep은 "깊이 잠들어 있다"(상태)이지 "빨리 잠든다"가 아니다. 이 한글로는 학생이 He falls asleep quickly.라고 쓰게 되고, 서술적 형용사 asleep을 연습하는 목적이 사라진다.', fix: '그는 깊이 잠들어 있다.', confidence: 'high', severity: 'high' },
  { page: 13, where: 'Review 3. #3 ↔ application #37', text: '나의 할머니는 나의 어머니의 큰 아버지와 함께 산다. ↔ My grandmother lives with my mother’s eldest brother.', type: 'translation_mismatch',
    problem: '"큰아버지"는 아버지의 형이다. my mother’s eldest brother는 큰외삼촌(어머니의 큰오빠)이다. 이 한글대로면 "어머니의 큰아버지"(외할아버지의 형)가 되어 뜻이 완전히 달라진다. STUDENT s4-4 한글도 "외할머니는 큰외삼촌과 함께 살고 계십니다."',
    fix: '나의 외할머니는 큰외삼촌(어머니의 큰오빠)과 함께 사신다.', confidence: 'high', severity: 'high' },
  { page: 13, where: 'Review 3. #5 ↔ application #39', text: '그것은 그들 인생에서 가장 행복한 여름이었다. ↔ It was the most beautiful summer of their lives.', type: 'translation_mismatch',
    problem: '영어는 beautiful(아름다운), 한글은 "행복한". 이 한글대로면 정답은 the happiest summer가 되어 책 영어 문장과 다르다.', fix: '그것은 그들 인생에서 가장 아름다운 여름이었다. (또는 정답에 It was the happiest summer of their lives.도 인정)', confidence: 'high', severity: 'high' },
  { page: 14, where: 'Review 4. #10 ↔ application #53', text: '그는 손으로 나를 잡았다. ↔ He took me by the hand.', type: 'translation_mismatch',
    problem: 'take + 사람 + by the hand는 "(누구)의 손을 잡다"이다. "손으로 나를 잡았다"는 He grabbed me with his hand.로 영작하게 만들어 "by the + 신체 부위" 연습 목적이 사라진다.', fix: '그는 내 손을 잡았다.', confidence: 'high', severity: 'medium' },
  { page: 14, where: 'Review 4. #13', text: '우리는 딸기를 파운드당으로 살수 있다.', type: 'korean_typo',
    problem: '"살수"는 "살 수"(의존명사 띄어쓰기). "파운드당으로"는 어색하다.', fix: '우리는 딸기를 파운드 단위로 살 수 있다.', confidence: 'high', severity: 'low' },
  { page: 14, where: 'Review 4. #15, #16', text: '누가 요리를 할거야? / 누가 쇼핑을 할거야?', type: 'korean_typo',
    problem: '"할거야"는 "할 거야"(의존명사 "거" 띄어쓰기).', fix: '누가 요리를 할 거야? / 누가 쇼핑을 할 거야?', confidence: 'high', severity: 'low' },
  { page: 11, where: 'Review 2. #9', text: '우리는 야구 경기보는 것에 신이 났다.', type: 'korean_typo',
    problem: '"경기보는"은 "경기 보는"으로 띄어 써야 하고, 조사 "를"이 빠져 어색하다.', fix: '우리는 야구 경기를 보게 되어 신이 났다.', confidence: 'medium', severity: 'low' },
  { page: 12, where: 'Review 2. #15 ↔ application #28', text: '불행하게도, 그녀의 병은 우리가 처음 생각했던 것보다 훨씬 더 심각했다. ↔ Unfortunately her illness was more serious than we thought at first.', type: 'translation_mismatch',
    problem: '한글의 "훨씬"(much)이 영어에 없다. 영어는 문장 앞 부사 Unfortunately 뒤에 쉼표를 두는 것이 보통이다.', fix: 'Unfortunately, her illness was much more serious than we thought at first. (또는 한글에서 "훨씬" 삭제)', confidence: 'medium', severity: 'low' },
  { page: 12, where: 'Review 2. #19 ↔ application #32', text: '날씨가 더 따뜻할수록, 나는 더 나아지는 것 같다. ↔ The warmer the weather, the better I feel.', type: 'translation_mismatch',
    problem: 'feel better는 "기분이 더 좋다"이다. "더 나아지는 것 같다"는 병이 낫는 느낌이라 학생이 I seem to get better로 쓰기 쉽다.', fix: '날씨가 따뜻할수록 나는 기분이 더 좋다.', confidence: 'medium', severity: 'low' },
  { page: 12, where: 'Review 2. #21 ↔ application #34(8쪽)', text: '둘 중에서 누가 더 크니? ↔ Which is the taller of the two?', type: 'answer_ambiguous',
    problem: '한글은 "누가"(사람)인데 책 정답은 Which이고, Which is the taller of the two?는 딱딱한 표현이다. Who is taller? / Which of the two is taller? / Who is the taller of the two? 모두 맞다. 또 이 문장은 비교급(the + 비교급 + of the two)인데 Application에서는 최상급 문장들 사이(8쪽)에 인쇄되어 있다.',
    fix: '정답 인정 목록: Which is the taller of the two? / Which of the two is taller? / Who is taller? / Who is the taller of the two?', confidence: 'medium', severity: 'medium' },
  { page: 13, where: 'Review 3. #4 ↔ application #38', text: '네 인생에서 가장 행복한 날은 어떤 날이니? ↔ What was the happiest day of your life?', type: 'translation_mismatch',
    problem: '한글은 현재형(날이니), 영어는 과거형(was)이다.', fix: '네 인생에서 가장 행복했던 날은 언제였니?', confidence: 'medium', severity: 'low' },
  { page: 13, where: 'Review 4. 지시문', text: '4. 다음의 내용을 보고 a나 the를 이용하여 영작하시오.', type: 'grammar_explanation_wrong',
    problem: '16문항 중 여러 개는 관사를 쓰지 않는 것(무관사)이 핵심이다: for breakfast(#8), at school(#9 앞부분), all kinds of sports(#6). "a나 the를 이용하여"라고 하면 학생이 for the breakfast, at the school처럼 쓰도록 유도한다. 책의 Pass-Off (4)도 이 무관사 부분을 굵게 표시했다.',
    fix: '4. 관사(a/an/the)를 써야 할 곳과 쓰지 말아야 할 곳에 주의하여 영작하시오.', confidence: 'medium', severity: 'medium' },
  { page: 10, where: 'Review 1. 전체(형용사에 밑줄)', text: '1. 다음 문장을 읽어보고 형용사에 밑줄을 그으시오.', type: 'answer_ambiguous',
    problem: '관사 a/an을 형용사로 볼지 기준이 없다. 이 책은 관사를 형용사 단원의 소주제 (4)로 다루지만 Application 굵은 글씨(정답 역할)에서는 관사를 표시하지 않았다. 책에 정답이 없어 "a"에 밑줄 친 학생의 답을 판정할 수 없다.',
    fix: '정답은 굵은 글씨 기준(nice, nice, big, wonderful, tall·young·interesting, long·black, old·round·wooden, What, Which, tired, interesting, diligent)으로 하고, a/an에 밑줄을 쳐도 오답 처리하지 않는다고 명시한다.', confidence: 'medium', severity: 'low' },
  { page: 6, where: 'passOff (4) item 11~13', text: 'The only person who can do this is Zeus. / Who’s going to do the cooking? / Who’s going to do the shopping?', type: 'layout_or_extraction',
    problem: '이 세 줄만 다른 글꼴(바탕체)로 인쇄되었고 강조도 굵은 글씨가 아니라 글꼴을 바꿔 표시되어 있다(확대해서 확인; 9쪽 Application에서는 정상 굵은 글씨). 다른 자료에서 붙여 넣은 흔적으로, PDF 텍스트에는 굵게 정보가 없다.',
    fix: '웹에서는 다른 줄과 같은 강조(굵게: The only / do the cooking / do the shopping)로 통일한다.', confidence: 'high', severity: 'low' },
  { page: 6, where: 'passOff (3) item 3~4 + application #36~37(8쪽)', text: 'That church is the oldest building in the town.(=/=eldest) / My grandmother lives with my mother’s eldest brother. (=oldest)', type: 'layout_or_extraction',
    problem: '"≠"를 "=/="로 적은 메모이고, 마침표와 괄호 사이 공백도 없다(town.(=/=eldest)). eldest는 가족 서열에만 쓴다는 설명이 없어 학생 혼자서는 메모의 뜻을 알기 어렵다.',
    fix: 'That church is the oldest building in the town. (eldest ✕ — eldest는 가족 간 서열에만) / … my mother’s eldest brother. (= oldest)', confidence: 'high', severity: 'low' },
  { page: 12, where: 'Review 2.(영작) #20 ↔ Review 3.(최상급) 경계', text: '어제는 일 년 중에 가장 더운 날이었다.', type: 'layout_or_extraction',
    problem: '책의 Pass-Off는 이 문장을 (3) 최상급에 넣었는데, Review에서는 "최상급을 이용하여" 과제(3.)가 아니라 일반 영작 과제(2.)의 끝에 있다. Review 과제 경계가 소주제 경계와 한 문장씩 어긋나 있어 소주제별로 나눠 웹에 올릴 때 주의해야 한다.',
    fix: '웹에서는 소주제 기준으로 (3) 최상급 연습에 넣는다(sourceRef의 appNo #33 참조).', confidence: 'high', severity: 'low' },

  // ---- TOPIC 10 동사 ----
  { page: 15, where: '(2) 표 제목 + Review 2. 지시문(24쪽)', text: '(2)불규칙동사의 변화(현재-과거-과거완료) / 2.다음 동사들의 과거형과 과거 완료형을 쓰시오.', type: 'grammar_explanation_wrong',
    problem: '세 번째 형태는 과거분사(past participle)이지 과거완료(had + p.p., 시제 이름)가 아니다. 표 머리글은 "과거분사"로 맞게 적혀 있어 제목·지시문과 표가 서로 다르다. 과거완료는 TOPIC 12(완료와 진행)에서 따로 배우는 시제라 학생이 두 개념을 혼동한다.',
    fix: '(2)불규칙동사의 변화(현재-과거-과거분사) / 2. 다음 동사들의 과거형과 과거분사형을 쓰시오.', confidence: 'high', severity: 'high' },
  { page: tPage('bite'), where: tw('bite'), text: '물다 | bite | bit | bit', type: 'english_grammar',
    problem: 'bite의 과거분사는 bitten이다(bit는 고어·비표준).', fix: 'bite – bit – bitten', confidence: 'high', severity: 'high' },
  { page: tPage('hide'), where: tw('hide'), text: '숨다 | hide | hid | hid', type: 'english_grammar',
    problem: 'hide의 과거분사는 hidden이다(hid는 고어·비표준).', fix: 'hide – hid – hidden', confidence: 'high', severity: 'high' },
  { page: tPage('send'), where: tw('send'), text: '보내다 | send | send | send', type: 'english_grammar',
    problem: 'send의 과거·과거분사는 sent다. 표가 원형을 세 번 적었다.', fix: 'send – sent – sent', confidence: 'high', severity: 'high' },
  { page: tPage('show'), where: tw('show'), text: '보여주다 | show | show | show', type: 'english_grammar',
    problem: 'show의 과거는 showed, 과거분사는 shown(showed도 가능)이다. 표가 원형을 세 번 적었다.', fix: 'show – showed – shown', confidence: 'high', severity: 'high' },
  { page: tPage('strive'), where: tw('strive'), text: '노력하다, 애쓰다 | strive | stove | striven', type: 'english_grammar',
    problem: '과거형 오타: stove(난로)가 아니라 strove다(strived도 쓰임).', fix: 'strive – strove – striven', confidence: 'high', severity: 'high' },
  { page: tPage('understand'), where: tw('understand'), text: '이해하다 | understand | understand | understand', type: 'english_grammar',
    problem: 'understand의 과거·과거분사는 understood다. 표가 원형을 세 번 적었다.', fix: 'understand – understood – understood', confidence: 'high', severity: 'high' },
  { page: tPage('bear'), where: tw('bear'), text: '낳다, 참다 | bear | bore | born', type: 'grammar_explanation_wrong',
    problem: '"참다·나르다"와 능동의 "낳다"의 과거분사는 borne이다(I have borne the pain. / She has borne three children.). born은 "태어나다"(be born) 수동형에서만 쓴다. 뜻 칸에 "참다"를 적어 놓고 born만 제시하면 틀린 형태를 외우게 된다.',
    fix: '낳다, 참다 | bear | bore | borne (태어나다: be born)', confidence: 'high', severity: 'medium' },
  { page: tPage('mistake'), where: tw('mistake'), text: '실수하다 | mistake | mistook | mistaken', type: 'grammar_explanation_wrong',
    problem: '동사 mistake는 "(A를 B로) 잘못 알다, 오해하다"(mistake A for B)이다. "실수하다"는 make a mistake로 말한다. 뜻을 잘못 외우면 I mistook.처럼 쓰게 된다.', fix: '잘못 알다, 오해하다 | mistake | mistook | mistaken', confidence: 'high', severity: 'medium' },
  { page: tPage('upset'), where: tw('upset'), text: '화내다 | upset | upset | upset', type: 'grammar_explanation_wrong',
    problem: '동사 upset은 "(남을) 속상하게 하다, 뒤엎다"인 타동사다. "화내다"는 get angry / get upset이다. 뜻을 잘못 외우면 He upset at me.처럼 쓰게 된다.', fix: '속상하게 하다, 뒤엎다 | upset | upset | upset', confidence: 'high', severity: 'medium' },
  { page: tPage('lend'), where: tw('lend'), text: '빌리다 | lend | lent | lent', type: 'grammar_explanation_wrong',
    problem: 'lend는 "빌려주다"(lend A to B)이고 "빌리다"는 borrow다. 한국 학생이 가장 많이 틀리는 짝(lend/borrow)을 거꾸로 가르치게 된다.', fix: '빌려주다 | lend | lent | lent (빌리다: borrow – borrowed – borrowed)', confidence: 'high', severity: 'medium' },
  { page: tPage('let'), where: `(2) 표 뜻 칸: row ${tRow('let')} let(${tPage('let')}쪽), row ${tRow('take')} take(${tPage('take')}쪽), row ${tRow('hang')} hang(${tPage('hang')}쪽), row ${tRow('withdraw')} withdraw(${tPage('withdraw')}쪽)`, text: '시키다 | let / 가지다 | take / 매달리다 | hang / 움츠리다, 뒤로 빼다 | withdraw', type: 'grammar_explanation_wrong',
    problem: '뜻 풀이가 대표 의미와 어긋나거나 좁다: let은 "~하게 두다, 허락하다"(강제로 "시키다"는 make/have), take는 "잡다, 가져가다, 데려가다"("가지다"는 have), hang은 "걸다, 매달다"(교수형이면 hang–hanged–hanged), withdraw는 주로 "물러나다, 철회하다, (돈을) 인출하다".',
    fix: '~하게 두다(허락하다) | let / 잡다, 가져가다 | take / 걸다, 매달다 | hang / 물러나다, 철회하다, 인출하다 | withdraw', confidence: 'medium', severity: 'low' },
  { page: tPage('lay'), where: `(2) 표 row ${tRow('lay', 0)} lay(놓다)·row ${tRow('lay', 1)} lay(눕히다)(${tPage('lay')}쪽) + Review 2. #${rNo('lay', 0)}, #${rNo('lay', 1)}(${rPage('lay')}쪽)`, text: '놓다 | lay | laid | laid … 눕히다 | lay | laid | laid', type: 'layout_or_extraction',
    problem: '같은 동사 lay를 두 줄로 나눠 적었다(놓다/눕히다는 lay 한 동사의 두 뜻). lie(눕다)–lay(눕히다) 대비를 보이려는 의도로 보이지만, 복습 표에는 뜻 칸이 없어 같은 단어가 이유 없이 두 번 나온다.', fix: 'lay는 한 줄(놓다, 눕히다)로 합치고 lie(눕다: lay–lain) · lie(거짓말하다: lied–lied) · lay(놓다: laid–laid) 대비 표를 따로 둔다.', confidence: 'high', severity: 'low' },
  { page: rPage('lie'), where: `Review 2. #${rNo('lie')} lie (표 row ${tRow('lie')}은 뜻 "눕다")`, text: 'lie', type: 'answer_ambiguous',
    problem: '복습 표에 뜻이 없어 lie가 "눕다"(lay–lain)인지 "거짓말하다"(lied–lied)인지 알 수 없다. 둘 다 맞는 답이다.', fix: '복습 표에 뜻 칸을 넣거나(lie 눕다), 정답에 lied–lied도 인정한다.', confidence: 'high', severity: 'medium' },
  { page: 24, where: 'Review 2. 여러 행(24~27쪽): bear, beat, bless, burn, dream, forbid, get, light, prove, quit, shine, show, sink, smell, spring, strike, strive, wake', text: '예: burn | burnt (burned) … / get | got | got', type: 'answer_ambiguous',
    problem: '두 가지 이상이 맞는 동사들이 있는데(burnt/burned, dreamt/dreamed, smelt/smelled, lit/lighted, proved/proven, got/gotten, sank/sunk, shone/shined …) 책 표는 일부만 괄호로 함께 적고 나머지는 한 형태만 적어 채점 기준이 없다. 한 형태만 정답으로 두면 맞게 쓴 학생을 틀렸다고 채점하게 된다.',
    fix: '웹 채점에 복수 정답 목록을 쓴다(이 파일 Review 2 items의 accept 필드).', confidence: 'high', severity: 'low' },
  { page: 21, where: 'Review 1. 지시문(29문항 전체)', text: '1.다음 문장을 보고 영작한 후에 몇 형식 문장인지 괄호 안에 쓰시오.', type: 'layout_or_extraction',
    problem: '"괄호 안에 쓰시오"라고 했지만 21~23쪽 29문항 어디에도 괄호가 인쇄되어 있지 않다.', fix: '각 문항 끝에 (   )형식 칸을 넣는다(웹: 1~5형식 선택 버튼).', confidence: 'high', severity: 'low' },
  { page: 19, where: 'application #7 + Review 1. #7(21쪽) 정답', text: 'You must keep quiet during working with them.', type: 'english_grammar',
    problem: 'during은 전치사라 뒤에 명사가 온다(during the meeting). "~하는 동안"을 동사로 말하려면 while을 써야 한다.', fix: 'You must keep quiet while working with them. (또는 while you are working with them)', confidence: 'high', severity: 'high' },
  { page: 20, where: 'application #20 + Review 1. #20(22쪽)', text: 'Will you teach me how to go to Seoul?', type: 'english_unnatural',
    problem: '길을 알려 달라고 할 때 teach는 쓰지 않는다(teach는 기술·과목을 가르칠 때). "가는 길"은 how to get to가 자연스럽다. 한글 "가르쳐 주실래요?"를 그대로 옮긴 표현이다. tell도 4형식 동사라 예문 역할은 그대로 유지된다.',
    fix: 'Can you tell me how to get to Seoul?', confidence: 'high', severity: 'medium' },
  { page: 20, where: 'application #22 + Review 1. #22(23쪽)', text: 'They ask him a lot of questions. ↔ 그들은 그에게 많은 질문들을 물었다.', type: 'translation_mismatch',
    problem: '영어는 현재형(ask), 한글은 과거형(물었다)이다. "질문들을 물었다"는 겹말이다.', fix: '영어를 They asked him a lot of questions.로 고치거나, 한글을 "그들은 그에게 많은 질문을 한다."로 고친다.', confidence: 'high', severity: 'medium' },
  { page: 20, where: 'application #26 + Review 1. #26(23쪽) 정답', text: 'Age has turns his hair gray.', type: 'english_grammar',
    problem: '현재완료는 has + 과거분사다. has turns는 틀린 형태다.', fix: 'Age has turned his hair gray.', confidence: 'high', severity: 'high' },
  { page: 20, where: 'application #29 + Review 1. #29(23쪽) 정답', text: 'He believes his daughter beautiful.', type: 'english_unnatural',
    problem: 'believe + 목적어 + 형용사는 매우 어색하다(think/consider와 달리 believe는 보통 to be나 that절을 씀). 5형식 예문으로 두려면 to be를 넣어야 한다.', fix: 'He believes his daughter to be beautiful. (일상 영어: He believes (that) his daughter is beautiful. — 이 경우 3형식)', confidence: 'medium', severity: 'medium' },
  { page: 19, where: 'application #1(19쪽), #18(20쪽)', text: 'There are many jobs in the world(14과) / He always gives me candy when I visit him(4과)', type: 'english_grammar',
    problem: '문장 끝 마침표가 빠졌다(15쪽 Pass-Off의 같은 문장에는 마침표가 있음).', fix: 'There are many jobs in the world. (14과) / He always gives me candy when I visit him. (4과)', confidence: 'high', severity: 'low' },
  { page: 15, where: 'passOff (1) item 5 + application #23(20쪽) + Review 1. #23(23쪽)', text: 'They also tell me that I need to love children and serve them.(14과)', type: 'english_unnatural',
    problem: 'STUDENT s14-3 원문은 "…love children and serve others."(다른 사람들에게 봉사)이다. 책이 others를 them으로 바꿔 "아이들을 사랑하고 아이들에게 봉사하라"로 뜻이 바뀌었고, serve children은 영어로도 어색하다. 14과에서 원문을 외운 학생은 헷갈리고, 원문 음성 클립도 다시 쓸 수 없다.',
    fix: 'They also tell me that I need to love children and serve others. (14과) / 한글: 그분들은 또한 내가 아이들을 사랑하고 다른 사람들에게 봉사해야 한다고 말씀하신다.', confidence: 'medium', severity: 'low' },
  { page: 23, where: 'Review 1. #24 ↔ application #24(20쪽), passOff (1) item 6', text: '나는 다른 사람들이 배우고 자라는 것을 도울 수 있기를 원한다. ↔ I want to be able to help others learn and grow, too.', type: 'answer_ambiguous',
    problem: '몇 형식인지 답이 갈린다. 문장 전체는 I want + to부정사(목적어) = 3형식인데, 책은 이 문장을 5형식 예문들(made his wife happy, call the girl Bobby …) 맨 앞에 두어 help others learn(help + 목적어 + 원형부정사)을 5형식으로 의도한 것으로 보인다. 또 한글에 too(또한)가 빠졌다.',
    fix: '형식 정답을 "3형식(문장 전체) — to부정사 안의 help others learn은 5형식 구조"로 해설하거나, 5형식 예문이 필요하면 I help others learn and grow.처럼 바꾼다. 한글: 나 또한 다른 사람들이 배우고 성장하도록 도울 수 있기를 원한다.', confidence: 'high', severity: 'medium' },
  { page: 23, where: 'Review 1. #28, #29(23쪽), #16(22쪽)', text: '그녀는 그가 결백하다고 생각했다. / 그는 그의 딸이 아름답다고 믿는다. / 팀은 내가 리포트를 하는 것을 도왔다.', type: 'answer_ambiguous',
    problem: '한글 "~라고 생각했다/믿는다"는 that절(She thought (that) he was innocent. = 3형식)로, "내가 리포트를 하는 것을 도왔다"는 Tim helped me write my report.(5형식)로 쓰게 만든다. 학생이 쓴 영어에 따라 형식 답이 달라져 정답이 하나로 정해지지 않는다(책 문장 기준: #28 5형식, #29 5형식, #16 3형식).',
    fix: '형식은 책 문장을 보여 준 뒤 묻거나(웹: 모범 답 확인 후 형식 선택), 학생이 쓴 구조에 맞는 형식을 모두 인정한다.', confidence: 'medium', severity: 'medium' },
  { page: 21, where: 'Review 1. #10 ↔ application #10', text: '나는 통역가가 되고 싶다. ↔ I want to become an interpreter.', type: 'answer_ambiguous',
    problem: 'want의 목적어가 to부정사인 3형식이지만 become an interpreter(2형식 구조)만 보고 2형식이라 답하기 쉽다. 책 배열도 2형식 문장들 바로 뒤, 3형식 문장들 바로 앞이라 경계에 있다. (1권 문장의 5형식에서도 I want to become a teacher …를 3형식 예문으로 씀.)',
    fix: '정답을 3형식으로 명시하고 해설에 "want + to부정사 = 목적어"를 적는다.', confidence: 'medium', severity: 'low' },
  { page: 21, where: 'Review 1. #3 ↔ application #3', text: '엄마는 차고로 나가셨다. ↔ Mom is out in the garage.', type: 'translation_mismatch',
    problem: '영어는 "차고에 나가 있다"(현재 상태), 한글은 "나가셨다"(과거 동작)이다.', fix: '엄마는 차고에 나가 계신다. (정답에 Mom went out to the garage.도 인정 — 둘 다 1형식)', confidence: 'medium', severity: 'low' },
  { page: 21, where: 'Review 1. #6(21쪽), #12(22쪽)', text: '그 과자는 냄새가 좋다 / 톰은 지난 주에 그의 차를 팔았다.', type: 'korean_typo',
    problem: '#6은 마침표 누락. #12의 "지난주"는 한 단어로 붙여 쓴다.', fix: '그 과자는 냄새가 좋다. / 톰은 지난주에 그의 차를 팔았다.', confidence: 'high', severity: 'low' },
  { page: 23, where: 'Review 1. #21 ↔ application #21', text: '나는 너에게 너무 맛있는 스테이크를 만들어 줄게. ↔ I can make you an amazing steak.', type: 'translation_mismatch',
    problem: '영어는 can(만들어 줄 수 있다), 한글은 "만들어 줄게"(will). 학생은 I will make you …로 쓰게 된다.', fix: '나는 너에게 끝내주는 스테이크를 만들어 줄 수 있어. (또는 정답에 I will make you a delicious steak.도 인정)', confidence: 'medium', severity: 'low' },
];

// Prefix each issue location with its topic (both topics have a "Review 2").
for (const x of issues) {
  const topic = x.page <= 4 ? '앞부분(1~4쪽)' : x.page <= 14 ? 'TOPIC 9 형용사' : 'TOPIC 10 동사';
  x.topic = topic;
  x.where = `${topic} · ${x.where}`;
  for (const k of ['page', 'where', 'text', 'type', 'problem', 'fix', 'confidence', 'severity']) if (x[k] === undefined || x[k] === null || x[k] === '') errors.push(`[issue] missing ${k}: ${JSON.stringify(x).slice(0, 80)}`);
  if (!['english_grammar', 'english_unnatural', 'korean_typo', 'translation_mismatch', 'answer_missing', 'answer_ambiguous', 'grammar_explanation_wrong', 'layout_or_extraction', 'dated_fact'].includes(x.type)) errors.push('[issue] bad type ' + x.type);
}

// =====================================================================
// Final assembly
// =====================================================================
const topics = [
  { printedLabel: 'TOPIC 9', title: '형용사', pages: [5, 14], continuesFromPrevRange: false, continuesIntoNextRange: false,
    printedTitle: '형 용 사',
    sections: [
      { kind: 'passOff', heading: '1. Pass-Off Sentences', page: 5, groups: adjPO.map(g => ({ label: g.label, explanation: null, items: g.items })) },
      { kind: 'application', heading: '2. Application Sentences', page: 7, pages: [7, 9],
        note: '소주제 제목이 인쇄되지 않은 59줄 목록. inferredSubPoint는 Pass-Off 순서·굵은 글씨·Review 과제 경계로 추론. Pass-Off 31줄(두 문장짜리 2줄 포함 33문장)은 모두 이 목록에 다시 나옴. #23(Peter is older than John.), #42·#43(sandwich/apple 두 문장)은 Review에 한글이 없음.',
        groups: adjAppGroups },
      { kind: 'review', heading: 'Review', page: 10, pages: [10, 14], tasks: adjTasks },
    ] },
  { printedLabel: 'TOPIC 10', title: '동사', pages: [15, 27], continuesFromPrevRange: false, continuesIntoNextRange: false,
    printedTitle: '동  사',
    sections: [
      { kind: 'passOff', heading: '1. Pass-Off Sentences', page: 15, groups: [{ label: '(1)동사의 종류', explanation: null, items: verbPO,
        boldNote: '이 단원 문장에는 굵은 글씨가 전혀 없음(형용사 단원과 다름). 5형식 표시도 인쇄되지 않음 — analysisNote의 형식은 추출자 판정' }] },
      verbTableSection,
      { kind: 'application', heading: '2. Application Sentences', page: 19, pages: [19, 20],
        note: '소주제 제목·굵은 글씨·형식 표시가 인쇄되지 않은 29줄. 배열 순서가 1형식(#1~5) → 2형식(#6~9) → 3형식(#10~17) → 4형식(#18~23) → 5형식(#24~29)으로 보임(sentencePattern은 추출자 판정, #24는 책 의도와 문법 판정이 다름). 표 (2)에 대한 Application 문장은 없음.',
        groups: [{ label: null, explanation: null, inferredSubPoint: '(1)동사의 종류', items: verbAppItems }] },
      { kind: 'review', heading: 'Review', page: 21, pages: [21, 27], tasks: [verbTask1, verbTask2] },
    ] },
];

// stats
const allReview = topics.flatMap(t => t.sections.filter(s => s.kind === 'review').flatMap(s => s.tasks.flatMap(k => k.items)));
const stats = {
  passOffLines: { '형용사': adjPO.reduce((a, g) => a + g.items.length, 0), '동사': verbPO.length },
  applicationLines: { '형용사': adjAppItems.length, '동사': verbAppItems.length },
  tableRows: { '동사 (2)불규칙동사의 변화': tableRows.length },
  reviewTasks: { '형용사': adjTasks.length, '동사': 2 },
  reviewItems: { '형용사': adjTasks.reduce((a, k) => a + k.items.length, 0), '동사': verbTask1.items.length + verbTask2.items.length },
  reviewItemsByType: {
    underline_adjective: adjTasks[0].items.length,
    ko_to_en_compose: adjTasks.slice(1).reduce((a, k) => a + k.items.length, 0) + verbTask1.items.length,
    write_past_and_past_participle: verbTask2.items.length,
  },
  reviewItemsWithBookAnswer: allReview.filter(i => i.answerFromBook).length,
  reviewItemsWithCorrectedAnswer: allReview.filter(i => i.correctedAnswer).length,
  reviewItemsWithProposedAnswer: allReview.filter(i => i.proposedAnswer).length,
  applicationWithoutKorean: adjAppItems.filter(a => !a.koFromReview).map(a => `형용사 application #${a.appNo}: ${a.en}`),
  studentCourseMatches: 8,
  perPage: {},
};
// per-page counts for self-check
for (let p = 5; p <= 27; p++) {
  const en = [...adjPO.flatMap(g => g.items), ...adjAppItems, ...verbPO, ...verbAppItems].filter(x => x.page === p).length;
  const rv = allReview.filter(x => x.page === p).length;
  const tr = tableRowPages.filter(x => x === p).length;
  stats.perPage[p] = { sentenceLines: en, reviewItems: rv, tableRows: tr };
}

const out = {
  book: 'g2', pageRange: [1, 27],
  frontMatter: { introText, notes: frontNotes.join('\n') },
  topics,
  issues,
  conventions: '스키마 밖 추가 필드: items[].studentMatch(STUDENT 과정 원문 대조, 파일#문장번호), analysisNote(문법 분석·형식), appNo(Application 안 순번), appRef/reviewRef(교차 참조), koFromReview(이 영어 문장을 옮긴 Review 한글), sentencePattern(동사 Application 형식 판정); groups[].inferredSubPoint(인쇄 안 된 소주제 추론); tasks[].rawInstruction·numberedInBook·printedItemNumbers(문항 번호는 인쇄되지 않아 n은 추출자 순번)·slotAnswerNote; review items[].correctedAnswer(책 정답 문장이 틀렸을 때 고친 정답)·answerNote(함께 인정할 답·주의)·focus(문항이 연습하는 표현)·accept(동사 변화표 채점용 복수 정답)·sourceRef; table section의 rowPages·rowCorrections·notInReview; issues[].severity.',
  stats,
};

if (errors.length) { console.error('ERRORS (' + errors.length + '):\n' + errors.join('\n')); process.exit(1); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log('wrote', OUT);
console.log(JSON.stringify(stats, null, 1));
