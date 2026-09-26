// Builds out/g1-p1-29.json for Pass-Off Grammar book g1, PDF pages 1-29.
// Sentence items: S(page, en, bold, tag, lessonRef, raw, studentMatch, analysisNote)
// Review items reference sentence items so answerFromBook is copied, not retyped.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'out', 'g1-p1-29.json');

function S(page, en, bold, tag, lessonRef, raw, studentMatch, analysisNote) {
  return { page, en: en.replace(/ {2,}/g, ' '), ko: null, bold: bold && bold.length ? bold : [], tag: tag || null, lessonRef: lessonRef == null ? null : lessonRef, raw, studentMatch: studentMatch || null, analysisNote: analysisNote || null };
}
function G(label, items) { return { label, explanation: null, items }; }

// ---------------------------------------------------------------- TOPIC 1
const t1po = [
  G('1) 1인칭', [
    S(5, 'I have a nice family.', ['I'], '(단수)', 2, 'I have a nice family. (단수)', 's2-2#1: I have a nice family.', 'I = 1인칭 단수 주격'),
    S(5, 'We are free for the day.', ['We'], '(복수)', 11, 'We are free for the day. (복수)', 's11-1#3: Once we come home for lunch, we are free for the day.', 'We = 1인칭 복수 주격 (STUDENT 11과 문장의 뒷절만 떼어 냄)'),
  ]),
  G('2) 2인칭', [
    S(5, 'You are a student.', ['You'], '(단수)', null, 'You are a student. (단수)', null, 'You = 2인칭 단수'),
    S(5, 'You are my classmates.', ['You'], '(복수)', null, 'You are my classmates. (복수)', null, 'You = 2인칭 복수 (my = 1인칭 소유격도 들어 있음)'),
  ]),
  G('3) 3인칭', [
    S(5, 'He is 대한.', ['He'], '(단수)', 3, 'He is 대한. (단수)', null, 'He = 3인칭 단수 (대한 = 사람 이름, 한글로 인쇄). STUDENT에 같은 문장 없음 — 3과(친구 소개) 주제로 만든 문장'),
    S(5, 'She is best mother in the world.', ['She'], '(단수)', 2, 'She is best mother in the world. (단수)', 's2-3#6: She is the best mother in the world.', 'She = 3인칭 단수'),
    S(5, 'It makes me happy.', ['It'], '(단수)', 1, 'It makes me happy. (단수)', 's1-6#2: When I help others, it makes me happy.', 'It = 3인칭 단수 (me = 1인칭 목적격도 들어 있음)'),
    S(5, 'They love each other.', ['They'], '(복수)', 2, 'They love each other. (복수)', 's2-4#2: My parents love each other.', 'They = 3인칭 복수 (원문 주어 My parents를 대명사로 바꿈)'),
  ]),
];
const t1ap = [
  G('1) 1인칭 단수 I 와 복수 We', [
    S(5, 'I have a nice family.', ['I'], null, 2, 'I have a nice family.(2 과)', 's2-2#1: I have a nice family.', 'I = 1인칭 단수'),
    S(5, 'I often see my friends.', ['I'], null, 5, 'I often see my friends.(5 과)', 's5-2#7: As I am walking to school, I often see my friends, so we walk to school together.', 'I = 1인칭 단수 (my도 1인칭 소유격)'),
    S(5, 'I like to study and make friends.', ['I'], null, 5, 'I like to study and make friends.(5 과)', 's5-5#5: At school, I like to study and make friends.', 'I = 1인칭 단수'),
    S(5, 'I go home and have dinner with my family.', ['I'], null, 9, 'I go home and have dinner with my family.(9 과)', 's9-3#1: After finishing classes at the academies, I go home and have dinner with my family.', 'I = 1인칭 단수 (my도 1인칭 소유격)'),
    S(5, 'Sometimes I watch TV, or listen to music  before I go to bed.', ['I', 'I'], null, 10, 'Sometimes I watch TV, or listen to music  before I go to bed. (10 과)', 's10-4#6: Sometimes I watch TV or listen to music before I go to bed.', 'I 두 번 = 1인칭 단수'),
    S(5, 'My family and I are Christians.', ['I'], null, 11, 'My family and I are Christians.(11 과)', 's11-3#2: My family and I are Christians.', 'I = 1인칭 단수 (주어 My family and I는 복수라 are; My도 1인칭 소유격)'),
    S(5, 'We are free for the day.', ['We'], null, 11, 'We are free for the day.(11 과)', 's11-1#3: Once we come home for lunch, we are free for the day.', 'We = 1인칭 복수'),
    S(5, 'We are very close to one another .', ['We'], null, 2, 'We are very close to one another .(2 과)', 's2-6#5: My family is always happy, and we are very close to one another, which helps me really understand the importance of family.', 'We = 1인칭 복수'),
    S(5, 'We are good friends.', ['We'], null, null, 'We are good friends.', null, 'We = 1인칭 복수'),
    S(5, 'We have a lot of chances to take a picture.', ['We'], null, null, 'We have a lot of chances to take a picture.', null, 'We = 1인칭 복수'),
    S(5, 'By the way, where do we go?', ['we'], null, null, 'By the way, where do we go?', null, 'we = 1인칭 복수'),
    S(5, 'We’ll pay $20,000 for the car.', ['We'], null, null, 'We’ll pay $20,000 for the car.', null, 'We = 1인칭 복수 (We’ll = We will)'),
  ]),
  G('2) 2인칭 단수 you 와 복수 you:', [
    S(6, 'You are a student.', ['You'], null, null, 'You are a student.', null, 'You = 2인칭 단수'),
    S(6, 'You are my classmates.', ['You'], null, null, 'You are my classmates.', null, 'You = 2인칭 복수'),
    S(6, 'Are you ready for this class, everyone?', ['you'], null, null, 'Are you ready for this class, everyone?', null, 'you = 2인칭 복수 (everyone에게 말함)'),
    S(6, 'Do you like cold weather?', ['you'], null, null, 'Do you like cold weather?', null, 'you = 2인칭 (단수·복수 모두 가능)'),
    S(6, 'Why do you make this model air plane?', ['you'], null, null, 'Why do you make this model air plane?', null, 'you = 2인칭'),
    S(6, 'How do you commute everyday?', ['you'], null, null, 'How do you commute everyday?', null, 'you = 2인칭'),
    S(6, 'You are great workers in our farm!', ['You'], null, null, 'You are great workers in our farm!', null, 'You = 2인칭 복수 (workers)'),
  ]),
  G('3) 3인칭 단수 he/ she/ it 과 복수 they', [
    S(6, 'He is 대한.', ['He'], null, 3, 'He is 대한.(3과)', null, 'He = 3인칭 단수'),
    S(6, 'She is best mother in the world.', ['She'], null, 2, 'She is best mother in the world.(2과)', 's2-3#6: She is the best mother in the world.', 'She = 3인칭 단수'),
    S(6, 'It makes me happy.', ['It'], null, 1, 'It makes me happy.(1과)', 's1-6#2: When I help others, it makes me happy.', 'It = 3인칭 단수'),
    S(6, 'They love each other.', ['They'], null, 2, 'They love each other.(2과)', 's2-4#2: My parents love each other.', 'They = 3인칭 복수'),
    S(6, 'He gets up early every morning.', ['He'], null, null, 'He gets up early every morning.', null, 'He = 3인칭 단수 (gets: 3인칭 단수 현재 -s)'),
    S(6, 'He will come here with my brother.', ['He'], null, null, 'He will come here with my brother.', null, 'He = 3인칭 단수'),
    S(6, 'She goes skiing every Saturday in winter', ['She'], null, null, 'She goes skiing every Saturday in winter', null, 'She = 3인칭 단수 (goes: -es)'),
    S(6, 'They can speak Chinese.', ['They'], null, null, 'They can speak Chinese.', null, 'They = 3인칭 복수'),
    S(6, 'She is in my class.', ['She'], null, null, 'She is in my class.', null, 'She = 3인칭 단수'),
    S(6, 'He gave me hurt in my heart, but it was not serious.', ['He', 'it'], null, null, 'He gave me hurt in my heart,\nbut it was not serious.', null, 'He, it = 3인칭 단수 (책에서 두 줄로 나뉘어 인쇄됨)'),
    S(6, 'He bought the book although it was too expensive.', ['He', 'it'], null, null, 'He bought the book although it was too expensive.', null, 'He, it = 3인칭 단수 (it = the book)'),
    S(6, 'It was cold, so I shut the door.', ['It'], null, null, 'It was cold, so I shut the door.', null, 'It = 날씨를 나타내는 비인칭 주어(3인칭 단수 형태). I는 1인칭(굵게 아님)'),
    S(6, 'They are too young to have jobs.', ['They'], null, null, 'They are too young to have jobs.', null, 'They = 3인칭 복수'),
  ]),
];

// ---------------------------------------------------------------- TOPIC 2
const t2po = [
  G('1) be 동사의 현재형 : am / is / are', [
    S(10, 'I am eleven years old.', ['am'], null, 1, 'I am eleven years old.', 's1-2#4: I am (10) years old.', 'am (주어 I)'),
    S(10, 'You are a girl.', ['are'], null, null, 'You are a girl.', null, 'are (주어 You)'),
    S(10, 'He is a truly smart person.', ['is'], null, 3, 'He is a truly smart person.', 's3-4#2: He/She is a truly smart person, and I am sure that his/her dream will come true.', 'is (주어 He)'),
    S(10, 'It is the start of the weekend.', ['is'], null, 10, 'It is the start of the weekend.', 's10-5#1: My favorite time is Friday night because it is the start of the weekend.', 'is (주어 It)'),
  ]),
  G('2) 일반동사의 현재형: 일반동사와 have', [
    S(10, 'My sister likes all kinds of animals.', ['likes'], null, 2, 'My sister likes all kinds of animals.', 's2-6#1: My sister likes all kinds of animals.', 'likes ← like (3인칭 단수 -s)'),
    S(10, 'She also loves to listen to music.', ['loves'], null, 2, 'She also loves to listen to music.', 's2-6#3: She also loves to listen to music and talk to her friends on the phone.', 'loves ← love (3인칭 단수 -s)'),
    S(10, 'She has two brothers and two sisters.', ['has'], null, 4, 'She has two brothers and two sisters.', 's4-3#2: My mother also has (two) brothers and (two) sisters. (비슷: s4-4#2 She has (two) older brothers and (two) older sisters.)', 'has ← have (3인칭 단수 불규칙)'),
    S(10, 'I have many friends.', ['have'], null, 1, 'I have many friends.', 's3-2#2: Because of this, I have many friends. (책 표시 1과의 원문은 s1-3#2 I have a lot of friends.)', 'have (주어 I — 원형 그대로)'),
  ]),
];
const t2ap = [
  G('1) be동사의 현재형', [
    S(10, 'I am eleven years old.', ['I am'], null, 1, 'I am eleven years old.(1과)', 's1-2#4: I am (10) years old.', 'I am'),
    S(10, 'You are a girl.', ['You are'], null, null, 'You are a girl.', null, 'You are'),
    S(10, 'He is a truly smart person.', ['He is'], null, 3, 'He is a truly smart person.(3과)', 's3-4#2: He/She is a truly smart person, and I am sure that his/her dream will come true.', 'He is'),
    S(10, 'It is the start of the weekend', ['It is'], null, 10, 'It is the start of the weekend(10과)', 's10-5#1: My favorite time is Friday night because it is the start of the weekend.', 'It is'),
    S(10, 'I am too busy to climb a tree.', ['I am'], null, null, 'I am too busy to climb a tree.', null, 'I am (too ~ to …)'),
    S(10, 'Are you busy on weekends?', ['Are you'], null, null, 'Are you busy on weekends?', null, 'Are you ~? (be동사 의문문)'),
    S(10, 'Is he your English teacher?', ['Is he'], null, null, 'Is he your English teacher?', null, 'Is he ~? (be동사 의문문)'),
    S(10, 'She is tired today.', ['She is'], null, null, 'She is tired today.', null, 'She is'),
    S(10, 'Is it rainy outside?', ['Is it'], null, null, 'Is it rainy outside?', null, 'Is it ~? (날씨의 비인칭 it)'),
    S(10, 'We are all 14 years old.', ['We are'], null, null, 'We are all 14 years old.', null, 'We are'),
    S(10, 'They are pleased to find her.', ['They are'], null, null, 'They are pleased to find her.', null, 'They are'),
  ]),
  G('2) 일반동사의 현재형', [
    S(11, 'My sister likes all kinds of animals.', ['likes'], null, 2, 'My sister likes all kinds of animals. (2과)', 's2-6#1: My sister likes all kinds of animals.', 'likes ← like'),
    S(11, 'She also loves to listen to music.', ['loves'], null, 2, 'She also loves to listen to music. (2과)', 's2-6#3: She also loves to listen to music and talk to her friends on the phone.', 'loves ← love'),
    S(11, 'She has two brothers and two sisters.', ['has'], null, 4, 'She has two brothers and two sisters. (4과)', 's4-3#2: My mother also has (two) brothers and (two) sisters. (비슷: s4-4#2 She has (two) older brothers and (two) older sisters.)', 'has ← have'),
    S(11, 'I have many friends.', ['have'], null, 1, 'I have many friends.(1과)', 's3-2#2: Because of this, I have many friends. (책 표시 1과의 원문은 s1-3#2 I have a lot of friends.)', 'have ← have'),
    S(11, 'The child hopes to be a general.', ['hopes'], null, null, 'The child hopes to be a general.', null, 'hopes ← hope'),
    S(11, 'She enjoys the movies.', ['enjoys'], null, null, 'She enjoys the movies.', null, 'enjoys ← enjoy'),
    S(11, 'Jamie eats lunch at the school.', ['eats'], null, null, 'Jamie eats lunch at the school.', null, 'eats ← eat'),
    S(11, 'Rita reads the newspaper everyday.', ['reads'], null, null, 'Rita reads the newspaper everyday.', null, 'reads ← read'),
    S(11, 'I never drink coffee.', ['drink'], null, null, 'I never drink coffee.', null, 'drink ← drink (주어 I라 -s 없음)'),
    S(11, 'Rice grows in Britain.', ['grows'], null, null, 'Rice grows in Britain.', null, 'grows ← grow'),
    S(11, 'Liz wants to pay for the meal.', ['wants'], null, null, 'Liz wants to pay for the meal.', null, 'wants ← want'),
    S(11, 'He goes to the cinema a lot.', ['goes'], null, null, 'He goes to the cinema a lot.', null, 'goes ← go (-es)'),
    S(11, 'She mixes the milk and ice.', ['mixes'], null, null, 'She mixes the milk and ice.', null, 'mixes ← mix (-es)'),
    S(11, 'He does his homework in my room.', ['does'], null, null, 'He does his homework in my room.', null, 'does ← do (-es)'),
    S(11, 'Jane kisses Cheetah on the nose.', ['kisses'], null, null, 'Jane kisses Cheetah on the nose.', null, 'kisses ← kiss (-es)'),
  ]),
];

// ---------------------------------------------------------------- TOPIC 3
const F1 = '1형식 (S+V)';
const t3po = [
  G('1) 문장의 5형식', [
    S(15, 'Flowers bloom.', [], null, null, 'Flowers bloom.', null, '1형식 S+V: Flowers(S) bloom(V)'),
    S(15, 'There are many jobs in the world.', [], null, 14, 'There are many jobs in the world. (14과)', 's14-1#1: There are many jobs in the world, and it is very hard to choose only one.', '1형식 There+V+S: are(V) many jobs(S) — 학교문법 기준'),
    S(15, 'My father is the second son.', [], null, 4, 'My father is the second son. (4과)', 's4-3#3: My father is the second son.', '2형식 S+V+C: My father(S) is(V) the second son(C)'),
    S(15, 'I want to become a teacher for several reasons.', [], null, 14, 'I want to become a teacher for several reasons. (14과)', 's14-2#1: I want to become a teacher for several reasons.', '3형식 S+V+O: I(S) want(V) to become a teacher(O)'),
    S(15, 'He always gives me candy.', [], null, 4, 'He always gives me candy. (4과)', 's4-6#5: He always gives me candy when I visit him.', '4형식 S+V+IO+DO: He(S) gives(V) me(IO) candy(DO)'),
    S(15, 'I want her to be a good pianist.', [], null, 2, 'I want her to be a good pianist. (2과)', 's2-5#3: I want her to be a good pianist.', '5형식 S+V+O+OC: I(S) want(V) her(O) to be a good pianist(OC)'),
  ]),
  G('2) 8 품사', [
    S(15, 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter.', ['be a fire fighter, police officer, teacher, doctor, interpreter'], '명사:', 3, 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter. (3과)', 's3-4#1: He/She sometimes tells me that he/she wants to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and that he/she wants to serve the community.', '명사 (굵은 범위에 동사 be·관사 a가 섞여 있음)'),
    S(15, 'My mother is a housewife. She is best mother in the world.', ['She'], '대명사:', 2, 'My mother is a housewife. She is best mother in the world. 2과)', 's2-3#4 + s2-3#6: My mother is a housewife. / She is the best mother in the world.', '대명사'),
    S(15, 'He can play all kinds of sports.', ['play'], '동사:', 4, 'He can play all kinds of sports. (4과)', 's4-6#3: He can play all kinds of sports, and he can play the piano and guitar pretty well.', '동사'),
    S(15, 'His dream will come true.', ['come true'], '동사:', 3, 'His dream will come true. (3과)', 's3-4#2: He/She is a truly smart person, and I am sure that his/her dream will come true.', '동사 (come true 전체는 동사구; true 자체는 형용사)'),
    S(15, 'I ride my bike to school.', ['ride'], '동사:', 5, 'I ride my bike to school. (5과)', 's5-2#3: Sometimes in the spring and the fall, I ride my bike to school.', '동사'),
    S(15, 'He could take care of the baby.', ['take care of'], '동사:', null, 'He could take care of the baby.', null, '동사 (구동사)'),
    S(15, 'I am very outgoing.', ['outgoing'], '형용사:', 3, 'I am very outgoing.(3과)', 's3-2#1: I am very outgoing, so I like to do many things with other people.', '형용사'),
    S(15, 'He can play the piano and guitar pretty well.', ['pretty well'], '부사:', 4, 'He can play the piano and guitar pretty well. (4과)', 's4-6#3: He can play all kinds of sports, and he can play the piano and guitar pretty well.', '부사'),
    S(15, 'He is also a very generous and kind person.', ['very'], '부사:', 4, 'He is also a very generous and kind person. (4과)', 's4-6#4: He is also a very generous and kind person.', '부사'),
    S(15, 'She is good at studying all kinds of subjects.', ['at'], '전치사:', 2, 'She is good at studying all kinds of subjects. (2과)', 's2-5#2: She is good at playing the piano, and she is good at studying all kinds of subjects.', '전치사'),
    S(15, 'Oh, how wonderful my life is!', ['Oh', '!'], '감탄사:', null, 'Oh, how wonderful my life is!', null, '감탄사'),
    S(15, 'He likes to hang out and play with friends.', ['and'], '접속사:', 3, 'He likes to hang out and play with friends. (3과)', 's3-2#9: He/She likes to hang out and play with friends, but he/she does not like to talk to new people.', '접속사 (등위)'),
    S(15, 'But he does not like to talk to new people.', ['But'], '접속사:', 3, 'But he does not like to talk to new people. (3과)', 's3-2#9: He/She likes to hang out and play with friends, but he/she does not like to talk to new people.', '접속사 (등위)'),
    S(15, 'When he speaks, he sounds like a native English speaker.', ['When'], '접속사:', 7, 'When he speaks, he sounds like a native English speaker. (7과)', 's7-3#8: When he speaks, he sounds like a native English speaker.', '접속사 (종속)'),
  ]),
  G('3) 구', [
    S(16, 'To choose one is hard.', ['To choose one'], '명사구 :', null, '명사구 : To choose one is hard.', 's14-1#1 (변형): There are many jobs in the world, and it is very hard to choose only one.', '명사구 (to부정사구 주어)'),
    S(16, 'She is a girl with her blond.', ['with her blond'], '형용사구:', null, '형용사구: She is a girl with her blond.', null, '형용사구 (전치사구가 a girl 수식)'),
    S(16, 'She gave birth to a son and named him 단군', ['gave birth to'], '동사구 :', 17, '동사구 : She gave birth to a son and named him 단군 (17과)', 's17-1#5: She gave birth to a son and named him Dangun.', '동사구 (구동사 give birth to)'),
    S(16, 'The students are very friendly to each other.', ['to each other'], '부사구:', 5, '부사구: The students are very friendly to each other. ( 5과)', 's5-5#1: Usually in class, the students are very friendly to each other.', '부사구 (전치사구가 형용사 friendly 수식)'),
    S(16, 'In spite of the lack of confidence in him, he never lost his confidence.', ['In spite of'], '전치사구:', 15, '전치사구: In spite of the lack of confidence in him, he never lost his confidence. (15과)', 's15-3#1: In spite of the lack of confidence in him by many Korean people, he never lost his confidence.', '구전치사 in spite of (책 용어: 전치사구)'),
    S(16, 'Even after I come home, I study for a couple more hours.', ['Even after'], '접속사구:', 8, '접속사구: Even after I come home, I study for a couple more hours. (8과)', 's10-3#3: Even after I come home, I study for a couple more hours before going to sleep. (책 표시 8과는 오류 — 실제 10과)', '책 용어: 접속사구 (even은 부사, after가 접속사)'),
    S(16, 'Oh, my goodness! What happened?', ['Oh, my goodness!'], '감탄사구:', null, '감탄사구: Oh, my goodness! What happened?', null, '감탄사구 (관용 감탄 표현)'),
  ]),
];
const t3ap = [
  G('1) 문장의 5형식', [
    S(16, 'Flowers bloom.', [], null, null, 'Flowers bloom.', null, '1형식'),
    S(16, 'There are many jobs in the world.', [], null, 14, 'There are many jobs in the world.(14과)', 's14-1#1: There are many jobs in the world, and it is very hard to choose only one.', '1형식 (There+be+S)'),
    S(16, 'My father is the second son.', [], null, 4, 'My father is the second son.(4과)', 's4-3#3: My father is the second son.', '2형식'),
    S(16, 'I want to become a teacher for several reasons.', [], null, 14, 'I want to become a teacher for several reasons.(14과)', 's14-2#1: I want to become a teacher for several reasons.', '3형식 (to부정사 목적어)'),
    S(16, 'He always gives me candy.', [], null, 4, 'He always gives me candy.(4과)', 's4-6#5: He always gives me candy when I visit him.', '4형식'),
    S(16, 'I want her to be a good pianist.', [], null, 2, 'I want her to be a good pianist.(2과)', 's2-5#3: I want her to be a good pianist.', '5형식'),
    S(16, 'A leaf falls.', [], null, null, 'A leaf falls.', null, '1형식 (추정 — 책에 형식 표시 없음)'),
    S(16, 'Here he comes.', [], null, null, 'Here he comes.', null, '1형식 (Here로 시작, 대명사 주어라 he comes 어순)'),
    S(16, 'There are some gifts for you.', [], null, null, 'There are some gifts for you.', null, '1형식 (There+be+S)'),
    S(17, 'My brain doesn’t work today.', [], null, null, 'My brain doesn’t work today.', null, '1형식 (work = 작동하다, 자동사)'),
    S(17, 'This medicine will do.', [], null, null, 'This medicine will do.', null, '1형식 (do = 충분하다/효과가 있다, 자동사)'),
    S(17, 'It is Monday today.', [], null, null, 'It is Monday today.', null, '2형식 (비인칭 it + be + 보어)'),
    S(17, 'I ’ll be late.', [], null, null, 'I ’ll be late.', null, '2형식 (be + 형용사 보어)'),
    S(17, 'Life is sometimes unfair.', [], null, null, 'Life is sometimes unfair.', null, '2형식'),
    S(17, 'Tina kept calm all afternoon.', [], null, null, 'Tina kept calm all afternoon.', null, '2형식 (keep + 형용사 보어)'),
    S(17, 'Overweight is becoming more common.', [], null, null, 'Overweight is becoming more common.', null, '2형식 (become + 형용사 보어, 진행형)'),
    S(17, 'I enjoy singing.', [], null, null, 'I enjoy singing.', null, '3형식 (동명사 목적어)'),
    S(17, 'They admit his proposals.', [], null, null, 'They admit his proposals.', null, '3형식'),
    S(17, 'He tried to avoid seeing us.', [], null, null, 'He tried to avoid seeing us.', null, '3형식 (to부정사 목적어, 그 안에 동명사 목적어)'),
    S(17, 'Do you want to play tennis?', [], null, null, 'Do you want to play tennis?', null, '3형식 (to부정사 목적어)'),
    S(17, 'Sarah quits her first job and decides to go abroad.', [], null, null, 'Sarah quits her first job and decides to go abroad.', null, '3형식 (quits + 명사 목적어 / decides + to부정사 목적어)'),
    S(17, 'My mother bought me a pen.', [], null, null, 'My mother bought me a pen.', null, '4형식 (IO me, DO a pen)'),
    S(17, 'Will you make me a chicken soup?', [], null, null, 'Will you make me a chicken soup?', null, '4형식 (IO me, DO soup)'),
    S(17, 'We expected Jim to be late.', [], null, null, 'We expected Jim to be late.', null, '5형식 (expect + O + to부정사)'),
    S(17, 'Let him do what he wants.', [], null, null, 'Let him do what he wants.', null, '5형식 (사역동사 let + O + 원형)'),
    S(17, 'He made me smile and play outside.', [], null, null, 'He made me smile and play outside.', null, '5형식 (사역동사 make + O + 원형)'),
    S(17, 'My father allowed me to marry her.', [], null, null, 'My father allowed me to marry her.', null, '5형식 (allow + O + to부정사)'),
  ]),
  G('2) 8품사', [
    S(18, 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter.', ['be a fire fighter, police officer, teacher, doctor, interpreter'], null, 3, 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter. (3과)', 's3-4#1: He/She sometimes tells me that he/she wants to be a police officer, a firefighter, a teacher, a doctor, or an interpreter, and that he/she wants to serve the community.', '명사'),
    S(18, 'My mother is a housewife. She is best mother In the world.', ['She'], null, 2, 'My mother is a housewife. She is best mother In the world. (2과)', 's2-3#4 + s2-3#6: My mother is a housewife. / She is the best mother in the world.', '대명사'),
    S(18, 'He can play all kinds of sports.', ['play'], null, 4, 'He can play all kinds of sports. (4과)', 's4-6#3: He can play all kinds of sports, and he can play the piano and guitar pretty well.', '동사'),
    S(18, 'His dream will come true.', ['come true'], null, 3, 'His dream will come true. (3과)', 's3-4#2: He/She is a truly smart person, and I am sure that his/her dream will come true.', '동사 (come true)'),
    S(18, 'I ride my bike to school.', ['ride'], null, 5, 'I ride my bike to school. (5과)', 's5-2#3: Sometimes in the spring and the fall, I ride my bike to school.', '동사'),
    S(18, 'He could take care of the baby.', ['take care of'], null, null, 'He could take care of the baby.', null, '동사 (구동사)'),
    S(18, 'I am very outgoing.', ['outgoing'], null, 3, 'I am very outgoing. (3과)', 's3-2#1: I am very outgoing, so I like to do many things with other people.', '형용사'),
    S(18, 'He can play the piano and guitar pretty well.', ['pretty well'], null, 4, 'He can play the piano and guitar pretty well. (4과)', 's4-6#3: He can play all kinds of sports, and he can play the piano and guitar pretty well.', '부사'),
    S(18, 'He is also a very generous and kind person.', ['very'], null, 4, 'He is also a very generous and kind person. (4과)', 's4-6#4: He is also a very generous and kind person.', '부사'),
    S(18, 'She is good at studying all kinds of subjects.', ['at'], null, 2, 'She is good at studying all kinds of subjects. (2과)', 's2-5#2: She is good at playing the piano, and she is good at studying all kinds of subjects.', '전치사'),
    S(18, 'Oh, how wonderful my life is!', ['Oh', '!'], null, null, 'Oh, how wonderful my life is!', null, '감탄사'),
    S(18, 'He likes to hang out and play with friends.', ['and'], null, 3, 'He likes to hang out and play with friends. (3과)', 's3-2#9: He/She likes to hang out and play with friends, but he/she does not like to talk to new people.', '접속사'),
    S(18, 'But he does not like to talk to new people.', ['But'], null, 3, 'But he does not like to talk to new people. (3과)', 's3-2#9: He/She likes to hang out and play with friends, but he/she does not like to talk to new people.', '접속사'),
    S(18, 'When he speaks, he sounds like a native English speaker.', ['When'], null, 7, 'When he speaks, he sounds like a native English speaker.(7과)', 's7-3#8: When he speaks, he sounds like a native English speaker.', '접속사'),
    S(18, 'I love France; food, city, freedom, cheese and people.', ['France; food, city, freedom, cheese', 'people'], null, null, 'I love France; food, city, freedom, cheese and people.', null, '명사 (추정 — 책 배열 순서: 명사→대명사→동사→형용사→부사→전치사→감탄사)'),
    S(19, 'Bees like honey. They eat it everyday.', ['They', 'it'], null, null, 'Bees like honey. They eat it everyday.', null, '대명사 (추정)'),
    S(19, 'Bob waited for Tom but he didn’t come.', ['he'], null, null, 'Bob waited for Tom but he didn’t come.', null, '대명사 (추정)'),
    S(19, 'I want to live in the city, not in the country.', ['want', 'live'], null, null, 'I want to live in the city, not in the country.', null, '동사 (추정)'),
    S(19, 'They arranged to meet us.', ['arranged', 'meet'], null, null, 'They arranged to meet us.', null, '동사 (추정)'),
    S(19, 'She will have a clean, new, bright, convenient house.', ['clean, new, bright, convenient'], null, null, 'She will have a clean, new, bright, convenient house.', null, '형용사 (추정)'),
    S(19, 'Hold the rope tight, or you‘re going to fall.', ['tight'], null, null, 'Hold the rope tight, or you‘re going to fall.', null, '부사 (추정 — hold tight; 목적격보어 형용사로도 분석 가능)'),
    S(19, 'I am awfully hungry.', ['awfully'], null, null, 'I am awfully hungry.', null, '부사 (추정)'),
    S(19, 'You’re entirely in the right.', ['entirely'], null, null, 'You’re entirely in the right.', null, '부사 (추정)'),
    S(19, 'I really love my mother and father.', ['really'], null, 2, 'I really love my mother and father. (2과)', 's2-3#7: I really love my mother and father.', '부사 (추정)'),
    S(19, 'My father is usually on time.', ['on'], null, null, 'My father is usually on time.', null, '전치사 (추정)'),
    S(19, 'I can’t remember anything about her.', ['about'], null, null, 'I can’t remember anything about her.', null, '전치사 (추정)'),
    S(19, 'You could hear the noise from the next street.', ['from'], null, null, 'You could hear the noise from the next street.', null, '전치사 (추정)'),
    S(19, 'What a nice dress!', ['What a nice dress!'], null, null, 'What a nice dress!', null, '감탄사 자리(추정) — 실제로는 감탄문, what은 한정사'),
    S(19, 'Hurrah! I made it!', ['Hurrah!'], null, null, 'Hurrah! I made it!', null, '감탄사 (추정)'),
  ]),
  G('3) 구', [
    S(20, 'To choose one is hard.', ['To choose one'], null, null, 'To choose one is hard.', 's14-1#1 (변형): There are many jobs in the world, and it is very hard to choose only one.', '명사구'),
    S(20, 'She is a girl with her blond.', ['with her blond'], null, null, 'She is a girl with her blond.', null, '형용사구'),
    S(20, 'She gave birth to a son and named him 단군', ['gave birth to'], null, 17, 'She gave birth to a son and named him 단군(17과)', 's17-1#5: She gave birth to a son and named him Dangun.', '동사구'),
    S(20, 'The students are very friendly to each other.', ['to each other'], null, 5, 'The students are very friendly to each other.( 5과)', 's5-5#1: Usually in class, the students are very friendly to each other.', '부사구'),
    S(20, 'In spite of the lack of confidence in him, he never lost his confidence.', ['In spite of'], null, 15, 'In spite of the lack of confidence in him, he never lost his confidence.(15과)', 's15-3#1: In spite of the lack of confidence in him by many Korean people, he never lost his confidence.', '전치사구 (구전치사)'),
    S(20, 'Even after I come home, I study for a couple more hours.', ['Even after'], null, 8, 'Even after I come home, I study for a couple more hours.(8과)', 's10-3#3: Even after I come home, I study for a couple more hours before going to sleep. (책 표시 8과는 오류 — 실제 10과)', '접속사구'),
    S(20, 'Oh, my goodness! What happened?', ['Oh, my goodness!'], null, null, 'Oh, my goodness! What happened?', null, '감탄사구'),
    S(20, 'My job is to take care of children.', ['to take care of children'], null, null, 'My job is to take care of children.', null, '명사구 (to부정사구 보어) — 추정'),
    S(20, 'I’ll do the shopping when I finished washing dishes.', ['washing dishes'], null, null, 'I’ll do the shopping when I finished washing dishes.', null, '명사구 (동명사구 목적어) — 추정'),
    S(20, 'To be a teacher for somebody is really meaningful.', ['To be a teacher'], null, null, 'To be a teacher for somebody is really meaningful.', null, '명사구 (to부정사구 주어) — 추정'),
    S(20, 'I have a family to help me.', ['to help me'], null, null, 'I have a family to help me.', null, '형용사구 (to부정사구가 a family 수식) — 추정'),
    S(20, 'I like the hat with blue ribbons.', ['with blue ribbons'], null, null, 'I like the hat with blue ribbons.', null, '형용사구 (전치사구가 the hat 수식) — 추정'),
    S(20, 'Did she have the apple in the basket?', ['in the basket'], null, null, 'Did she have the apple in the basket?', null, '형용사구 (the apple 수식; 장소 부사구로도 읽힘) — 추정'),
    S(20, 'He does nothing but grumble.', ['does nothing but'], null, null, 'He does nothing but grumble.', null, '동사구 (do nothing but + 원형) — 추정'),
    S(20, 'Why not ask James to help you?', ['Why not'], null, null, 'Why not ask James to help you?', null, '부사구 (Why not + 원형: ~하는 게 어때?) — 추정'),
    S(20, 'Joshua has finished it by the time you come back.', ['by the time'], null, null, 'Joshua has finished it by the time you come back.', null, '접속사구 (by the time) — 추정'),
    S(20, 'As soon as he heard the news, he hurried to the house.', ['As soon as'], null, null, 'As soon as he heard the news, he hurried to the house.', null, '접속사구 (as soon as) — 추정'),
    S(20, 'Take your umbrella in case it should rain.', ['in case'], null, null, 'Take your umbrella in case it should rain.', null, '접속사구 (in case) — 추정'),
  ]),
];

// ---------------------------------------------------------------- review helpers
function ref(sec, groups, g, i) {
  const item = groups[g - 1].items[i - 1];
  if (!item) throw new Error('bad ref ' + sec + ' ' + g + ' ' + i);
  return { en: item.en, src: `${sec} ${g}) item ${i}` };
}
// R(n, page, prompt, source|null, extraSlotAnswer, answerNote, opts)
function R(n, page, prompt, source, extraSlot, extraSlotAnswer, answerNote, opts = {}) {
  const o = {
    n: String(n).replace(/\)$/, ''), page, prompt, promptLang: opts.lang || 'ko',
    extraSlot: extraSlot || null,
    answerFromBook: source && !opts.noAnswerSentence ? source.en : null,
    answerSource: source ? source.src : 'none',
    proposedAnswer: opts.proposed || null,
    extraSlotAnswer: extraSlotAnswer || null,
  };
  if (opts.bold) o.bold = opts.bold;
  o.answerNote = answerNote || null;
  return o;
}
const A1 = (g, i) => ref('application', t1ap, g, i);
const P1 = (g, i) => ref('passOff', t1po, g, i);
const A2 = (g, i) => ref('application', t2ap, g, i);
const P2 = (g, i) => ref('passOff', t2po, g, i);
const A3 = (g, i) => ref('application', t3ap, g, i);
const P3 = (g, i) => ref('passOff', t3po, g, i);

// ---------------------------------------------------------------- TOPIC 1 review
const X1 = '영작한 문장의 인칭대명사에 밑줄 + 괄호 ( )에 몇 인칭인지';
const t1review = {
  kind: 'review', heading: 'Review', page: 7,
  tasks: [
    {
      no: null, page: 7, numberedInBook: true,
      instruction: '1) 다음의 내용을 보고 영작하고 영작한 문장 안에 쓰인 인칭대명사를 찾아 줄을 긋고 몇 인칭인지 괄호 안에 쓰세요.',
      taskTypes: ['ko_to_en_compose', 'underline_personal_pronoun', 'identify_person'],
      items: [
        R(1, 7, '나는 좋은 가족이 있습니다.', P1(1, 1), X1, '1인칭 (밑줄: I · 단수)', null),
        R(2, 7, '우리는 그 날 동안 자유롭다.', P1(1, 2), X1, '1인칭 (밑줄: We · 복수)', null),
        R(3, 7, '당신은 학생이다.', P1(2, 1), X1, '2인칭 (밑줄: You · 단수)', null),
        R(4, 7, '여러분들은 나의 학급친구들이다.', P1(2, 2), X1, '2인칭 (밑줄: You · 복수) — 문장 속 my도 1인칭 소유격 인칭대명사라 1인칭도 답이 될 수 있음', '인칭대명사가 두 개(You, my) — 채점 시 둘 다 고려'),
        R(5, 7, '그는 대한이다.', P1(3, 1), X1, '3인칭 (밑줄: He · 단수)', '웹에서는 He is Daehan. 으로 로마자 표기 권장'),
        R(6, 7, '그녀는 세상에서 제일 좋은 어머니이다.', P1(3, 2), X1, '3인칭 (밑줄: She · 단수)', '책 영어는 the가 빠짐 — 올바른 답: She is the best mother in the world.'),
        R(7, 7, '그것은 나를 행복하게 만든다.', P1(3, 3), X1, '3인칭 (밑줄: It · 단수) — 문장 속 me도 1인칭 목적격 인칭대명사라 1인칭도 답이 될 수 있음', '인칭대명사가 두 개(It, me) — 채점 시 둘 다 고려'),
        R(8, 7, '그들은 서로 사랑한다.', P1(3, 4), X1, '3인칭 (밑줄: They · 복수)', null),
      ],
    },
    {
      no: null, page: 8, numberedInBook: false,
      instruction: '2) 다음을 보고 영작을 해보시오.',
      taskTypes: ['ko_to_en_compose'],
      items: [
        R(1, 8, '나는 자주 내 친구들을 만나요.', A1(1, 2), null, null, null),
        R(2, 8, '나는 공부하기와 친구 사귀기를 좋아해요', A1(1, 3), null, null, null),
        R(3, 8, '나는 집으로 가서 가족과 저녁을 먹어요.', A1(1, 4), null, null, null),
        R(4, 8, '때때로 나는 TV 를 보거나 음악을 들어요. 내가 잠자리에 들기 전에', A1(1, 5), null, null, '책 영어의 쉼표·겹공백은 오류 — 권장: Sometimes I watch TV or listen to music before I go to bed.'),
        R(5, 8, '내 가족과 나는 기독교인들이다.', A1(1, 6), null, null, null),
        R(6, 8, '우리는 서로서로 매우 가깝다.', A1(1, 8), null, null, '인쇄된 마침표 앞 공백 제외: We are very close to one another.'),
        R(7, 8, '우리는 좋은 친구들이다.', A1(1, 9), null, null, null),
        R(8, 8, '우리는 사진을 찍을 많은 기회가 있을 거야.', A1(1, 10), null, null, '한글은 미래형(있을 거야) — We will have a lot of chances to take pictures.도 정답 처리 필요'),
        R(9, 8, '그건 그렇고, 우리는 어디로 가지?', A1(1, 11), null, null, 'By the way, where are we going?도 자연스러운 답'),
        R(10, 8, '우리는 20000달러를 주고 그 차를 살 거야.', A1(1, 12), null, null, 'We will pay $20,000 for the car.도 정답'),
        R(11, 8, '여러분들, 모두 수업 받을 준비가 되었나요, ?', A1(2, 3), null, null, null),
        R(12, 9, '너는 추운 날씨를 좋아하니?', A1(2, 4), null, null, null),
        R(13, 9, '왜 너는 이 모형 비행기를 만들었니?', A1(2, 5), null, null, '책 영어 오류(air plane, 한글과 시제 불일치) — 한글에 맞는 답: Why did you make this model airplane?'),
        R(14, 9, '당신은 어떻게 매일 출 퇴근하십니까?', A1(2, 6), null, null, 'everyday → every day: How do you commute every day?'),
        R(15, 9, '여러분들은 우리 농장에서 훌륭한 일군들입니다!', A1(2, 7), null, null, 'in our farm → on our farm: You are great workers on our farm!'),
        R(16, 9, '그는 매일 일찍 일어난다.', A1(3, 5), null, null, '한글 “매일”만 보면 He gets up early every day.도 가능'),
        R(17, 9, '그는 나의 남동생과 올 거야.', A1(3, 6), null, null, '한글에 “여기”가 없어 He will come with my brother.도 가능'),
        R(18, 9, '그녀는 겨울에 매주 토요일마다 스키 타러 간다.', A1(3, 7), null, null, '책 영어에 마침표 없음: She goes skiing every Saturday in winter.'),
        R(19, 9, '그들은 중국말을 할 수 있다.', A1(3, 8), null, null, null),
        R(20, 9, '그녀는 내 수업에 들어와 있다.', A1(3, 9), null, null, '한글이 어색 — 뜻은 “그녀는 우리 반이다”'),
        R(21, 9, '그는 내 마음에 상처를 줬지만 그것은 심각하지 않았다.', A1(3, 10), null, null, '책 영어 비문 — 권장: He hurt my feelings, but it was not serious.'),
        R(22, 9, '그는 그 책이 너무 비쌌지만 그것을 샀다.', A1(3, 11), null, null, '권장: He bought the book although it was very expensive.'),
        R(23, 9, '날씨가 너무 추워서 그래서 나는 문을 닫았다.', A1(3, 12), null, null, 'It was very cold, so I shut the door.도 정답'),
        R(24, 9, '그들은 직업을 가지기엔 너무 어렸다.', A1(3, 13), null, null, '한글은 과거(어렸다) — They were too young to have jobs.도 정답 처리 필요'),
      ],
    },
  ],
};
// the printed task numbers go into "no"; instruction keeps only the text after the number
t1review.tasks[0].no = '1)'; t1review.tasks[0].instruction = '다음의 내용을 보고 영작하고 영작한 문장 안에 쓰인 인칭대명사를 찾아 줄을 긋고 몇 인칭인지 괄호 안에 쓰세요.';
t1review.tasks[1].no = '2)'; t1review.tasks[1].instruction = '다음을 보고 영작을 해보시오.';

// ---------------------------------------------------------------- TOPIC 2 review
const t2review = {
  kind: 'review', heading: 'Review', page: 12,
  tasks: [
    {
      no: '1.', page: 12, numberedInBook: true,
      instruction: '다음 내용을 보고 영작하고 문장에 쓰인 be동사에 동그라미를 하세요.',
      taskTypes: ['ko_to_en_compose', 'circle_be_verb'],
      items: [
        R('1)', 12, '나는 11살입니다.', P2(1, 1), '영작한 문장의 be동사에 동그라미', 'am', 'I am 11 years old.도 정답'),
        R('2)', 12, '당신은 소녀입니다.', P2(1, 2), '영작한 문장의 be동사에 동그라미', 'are', null),
        R('3)', 12, '그는 진실로 똑똑한 사람입니다.', P2(1, 3), '영작한 문장의 be동사에 동그라미', 'is', null),
        R('4)', 12, '그것은 그 주의 시작입니다.', P2(1, 4), '영작한 문장의 be동사에 동그라미', 'is', '한글 “그 주의 시작”은 오역 — 책 영어는 the start of the weekend(주말의 시작)'),
      ],
    },
    {
      no: '2.', page: 12, numberedInBook: true,
      instruction: '다음 내용을 보고 영작하고 일반동사를 찾아 동사의 원형을 괄호 안에 쓰세요.',
      taskTypes: ['ko_to_en_compose', 'find_verb_write_base_form'],
      items: [
        R('1)', 12, '나의 여동생은 모든 종류의 동물을 좋아한다.', P2(2, 1), '괄호 ( )에 일반동사의 원형', 'like', null),
        R('2)', 12, '그녀는 또한 음악듣기를 좋아한다.', P2(2, 2), '괄호 ( )에 일반동사의 원형', 'love (to부정사 안의 listen도 일반동사 — 둘 다 인정 권장)', null),
        R('3)', 12, '그녀는 두 명의 남동생과 두 명의 여동생이 있다.', P2(2, 3), '괄호 ( )에 일반동사의 원형', 'have', '한글 “남동생·여동생”은 오역 — She has two younger brothers and two younger sisters.로 써도 한글에는 맞음'),
        R('4)', 12, '나는 친구들이 많다.', P2(2, 4), '괄호 ( )에 일반동사의 원형', 'have', 'I have a lot of friends.도 정답 (STUDENT 1과 원문)'),
      ],
    },
    {
      no: '3.', page: 13, numberedInBook: true,
      instruction: '다음을 보고 영작하세요.',
      taskTypes: ['ko_to_en_compose'],
      items: [
        R('1)', 13, '나는 나무를 타기에는 너무 바빠.', A2(1, 5), null, null, null),
        R('2)', 13, '너는 주말마다 바쁘니?', A2(1, 6), null, null, null),
        R('3)', 13, '그가 너의 영어 선생님이시니?', A2(1, 7), null, null, null),
        R('4)', 13, '그녀는 오늘 피곤하다.', A2(1, 8), null, null, null),
        R('5)', 13, '밖에 비가 오니?', A2(1, 9), null, null, 'Is it raining outside?도 정답'),
        R('6)', 13, '우리는 모두 14살이다.', A2(1, 10), null, null, null),
        R('7)', 13, '그들은 그녀를 찾아서 기쁘다.', A2(1, 11), null, null, null),
        R('8)', 13, '그 아이는 장군이 되기를 원한다.', A2(2, 5), null, null, '한글 “원한다”로는 The child wants to be a general.도 정답 처리 필요'),
        R('9)', 13, '그녀는 영화를 즐긴다.', A2(2, 6), null, null, 'She enjoys movies.도 정답'),
        R('10)', 14, '제이미는 학교에서 점심을 먹는다.', A2(2, 7), null, null, '권장: Jamie eats lunch at school.'),
        R('11)', 14, '리타는 매일 신문을 읽는다.', A2(2, 8), null, null, 'everyday → every day'),
        R('12)', 14, '나는 절대 커피를 마시지 않는다.', A2(2, 9), null, null, null),
        R('13)', 14, '라이스는 영국에서 성장하고 있다.', A2(2, 10), null, null, '한글 오역(Rice를 사람 이름 “라이스”로) + 영어도 사실과 다름 — 문장 교체 권장 (예: Rice grows in Korea. / 벼는 한국에서 자란다.)'),
        R('14)', 14, '리즈는 식사값을 내기를 원한다.', A2(2, 11), null, null, null),
        R('15)', 14, '그는 영화를 많이 보러 간다.', A2(2, 12), null, null, 'He goes to the movies a lot.도 정답'),
        R('16)', 14, '그녀는 우유와 얼음을 섞는다.', A2(2, 13), null, null, null),
        R('17)', 14, '그는 내방에서 숙제를 한다.', A2(2, 14), null, null, null),
        R('18)', 14, '제인은 치타의 코에 키스한다.', A2(2, 15), null, null, null),
      ],
    },
  ],
};

// ---------------------------------------------------------------- TOPIC 3 review
const PS = '굵게 쓰인 단어(들)의 품사 (답칸 인쇄 없음)';
const pos = (n, page, prompt, gi, bold, answer, note) => R(n, page, prompt, A3(2, gi), PS, answer, note, { lang: 'en', bold, noAnswerSentence: true });
const t3review = {
  kind: 'review', heading: 'Review', page: 21,
  tasks: [
    {
      no: '1.', page: 21, numberedInBook: true,
      instruction: '다음 내용을 보고 영작하고 몇 형식인지 괄호 안에 쓰세요.',
      taskTypes: ['ko_to_en_compose', 'identify_sentence_pattern'],
      items: [
        R('1)', 21, '꽃들이 핀다.', P3(1, 1), '괄호 ( )에 몇 형식인지', '1형식', null),
        R('2)', 21, '세상에는 많은 직업들이 있다.', P3(1, 2), '괄호 ( )에 몇 형식인지', '1형식 (There+be+주어 — 학교문법 기준)', null),
        R('3)', 21, '그는 항상 나에게 사탕을 준다.', P3(1, 5), '괄호 ( )에 몇 형식인지', '4형식', null),
        R('4)', 21, '나는 그녀가 훌륭한 피아니스트가 되기를 원한다.', P3(1, 6), '괄호 ( )에 몇 형식인지', '5형식', 'I want her to be a great pianist.도 정답'),
        R('5)', 21, '나의 아버지는 둘째 아들이다.', P3(1, 3), '괄호 ( )에 몇 형식인지', '2형식', null),
        R('6)', 21, '나는 몇 가지 이유로 선생님이 되기를 원한다.', P3(1, 4), '괄호 ( )에 몇 형식인지', '3형식', null),
      ],
    },
    {
      no: '2.', page: 22, numberedInBook: true,
      instruction: '다음 문장을 보고 굵게 쓰여진 단어의 품사를 적어 보시오.',
      taskTypes: ['identify_part_of_speech'],
      items: [
        pos('1)', 22, 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter. (3과)', 1, ['be a fire fighter, police officer, teacher, doctor, interpreter'], '명사', '굵은 범위에 be(동사)·a(관사)가 섞여 있음 — 명사는 fire fighter, police officer, teacher, doctor, interpreter'),
        pos('2)', 22, 'My mother is a housewife. She is best mother in the world. (2과)', 2, ['She'], '대명사', null),
        pos('3)', 22, 'He can play all kinds of sports. (4과)', 3, ['play'], '동사', null),
        pos('4)', 22, 'His dream will come true. (3과)', 4, ['come true'], '동사 (come true = 동사구; true 자체는 형용사)', null),
        pos('5)', 22, 'I ride my bike to school. (5과)', 5, ['ride'], '동사', null),
        pos('6)', 22, 'He could take care of the baby.', 6, ['take care of'], '동사 (구동사)', null),
        pos('7)', 22, 'I am very outgoing. (3과)', 7, ['outgoing'], '형용사', null),
        pos('8)', 22, 'He can play the piano and guitar pretty well. (4과)', 8, ['pretty well'], '부사', null),
        pos('9)', 22, 'He is also a very generous and kind person. (4과)', 9, ['very'], '부사', null),
        pos('10)', 22, 'She is good at studying all kinds of subjects. (2과)', 10, ['at'], '전치사', null),
        pos('11)', 22, 'Oh, how wonderful my life is!', 11, ['Oh', '!'], '감탄사', null),
        pos('12)', 22, 'He likes to hang out and play with friends. (3과)', 12, ['and'], '접속사', null),
        pos('13)', 22, 'But he does not like to talk to new people. (3과)', 13, ['But'], '접속사', null),
        pos('14)', 22, 'When he speaks, he sounds like a native English speaker. (7과)', 14, ['When'], '접속사', null),
        pos('15)', 23, 'I love France; food, city, freedom, cheese and people.', 15, ['France; food, city, freedom, cheese', 'people'], '명사', null),
        pos('16)', 23, 'Bees like honey. They eat it everyday.', 16, ['They', 'it'], '대명사', null),
        pos('17)', 23, 'Bob waited for Tom but he didn’t come.', 17, ['he'], '대명사', null),
        pos('18)', 23, 'I want to live in the city, not in the country.', 18, ['want', 'live'], '동사', null),
        pos('19)', 23, 'They arranged to meet us.', 19, ['arranged', 'meet'], '동사', null),
        pos('20)', 23, 'She will have a clean, new, bright, convenient house.', 20, ['clean, new, bright, convenient'], '형용사', null),
        pos('21)', 23, 'Hold the rope tight, or you‘re going to fall.', 21, ['tight'], '부사 (hold ~ tight; 목적격보어 형용사로 보는 견해도 있음)', '정답이 갈리는 문항 — 둘 다 인정 권장'),
        pos('22)', 23, 'I am awfully hungry.', 22, ['awfully'], '부사', null),
        pos('23)', 23, 'You’re entirely in the right.', 23, ['entirely'], '부사', null),
        pos('24)', 23, 'I really love my mother and father.(2과)', 24, ['really'], '부사', null),
        pos('25)', 23, 'My father is usually on time.', 25, ['on'], '전치사', null),
        pos('26)', 23, 'I can’t remember anything about her.', 26, ['about'], '전치사', null),
        pos('27)', 23, 'You could hear the noise from the next street.', 27, ['from'], '전치사', null),
        pos('28)', 23, 'What a nice dress!', 28, ['What a nice dress!'], '감탄사 (책 배열상 의도) — 엄밀히는 감탄문이고 what은 한정사', '문장 전체가 굵게 인쇄 — 품사 하나로 답할 수 없는 문항'),
        pos('29)', 23, 'Hurrah! I made it!', 29, ['Hurrah!'], '감탄사', null),
      ],
    },
    {
      no: '3.', page: 24, numberedInBook: true,
      instruction: '다음을 영어로 영작하세요.',
      taskTypes: ['ko_to_en_compose'],
      items: [
        R('1)', 24, '꽃들은 핀다.', A3(1, 1), null, null, null),
        R('2)', 24, '이 세상에는 많은 직업들이 있다.', A3(1, 2), null, null, null),
        R('3)', 24, '나의 아버지는 둘째 아드님이시다.', A3(1, 3), null, null, null),
        R('4)', 24, '나는 몇 가지 이유로 선생님이 되고 싶다.', A3(1, 4), null, null, null),
        R('5)', 24, '그는 항상 나에게 사탕을 준다.', A3(1, 5), null, null, null),
        R('6)', 24, '나는 그녀가 좋은 피아니스트가 되기를 원한다.', A3(1, 6), null, null, null),
        R('7)', 24, '잎이 떨어진다.', A3(1, 7), null, null, 'Leaves fall.도 가능'),
        R('8)', 24, '여기에 그가 온다.', A3(1, 8), null, null, '관용 표현 — 한글만 보면 He comes here.로 쓰기 쉬움(뜻·구조가 다름)'),
        R('9)', 24, '당신을 위한 약간의 선물이 있다.', A3(1, 9), null, null, null),
        R('10)', 24, '오늘 내 머리가 돌아가지 않는다.', A3(1, 10), null, null, 'My brain isn’t working today.도 가능'),
        R('11)', 24, '이 약은 효과가 있을 거야.', A3(1, 11), null, null, 'This medicine will work.도 정답 처리 권장'),
        R('12)', 24, '오늘은 월요일이야.', A3(1, 12), null, null, 'Today is Monday.도 정답'),
        R('13)', 25, '나는 늦을 거야.', A3(1, 13), null, null, '인쇄된 공백 제외: I’ll be late.'),
        R('14)', 25, '삶은 때때로 공평하지 않다.', A3(1, 14), null, null, null),
        R('15)', 25, '티나는 오후 내내 차분하다.', A3(1, 15), null, null, '한글은 현재형 — 책 정답은 과거 kept (한글만 보면 Tina keeps calm …)'),
        R('16)', 25, '비만(과체중)이 점점 보편화되어 가고 있다.', A3(1, 16), null, null, '권장: Obesity is becoming more common.'),
        R('17)', 25, '나는 노래하기를 즐긴다.', A3(1, 17), null, null, null),
        R('18)', 25, '그들은 그의 제안을 받아들인다.', A3(1, 18), null, null, '책 영어 오류 — 올바른 답: They accept his proposals.'),
        R('19)', 25, '그는 우리를 만나기를 피하려고 노력한다.', A3(1, 19), null, null, '한글은 현재형 — 책 정답은 과거 tried'),
        R('20)', 25, '너는 테니스 치고 싶니?', A3(1, 20), null, null, null),
        R('21)', 25, '사라는 그녀의 첫 직업을 그만두고 외국으로 가기로 결심한다.', A3(1, 21), null, null, null),
        R('22)', 25, '나의 어머니는 나에게 펜을 사 주셨다.', A3(1, 22), null, null, 'My mother bought a pen for me.(3형식)도 정답이지만 4형식 연습 문장'),
        R('23)', 25, '나에게 닭고기 수프를 만들어 주겠니?', A3(1, 23), null, null, '권장: Will you make me some chicken soup?'),
        R('24)', 25, '우리는 짐이 늦는다고 생각했다.', A3(1, 24), null, null, 'We thought Jim would be late.도 가능 (5형식 연습 문장)'),
        R('25)', 25, '그가 원하는 것 하도록 두어라.', A3(1, 25), null, null, null),
        R('26)', 26, '그는 내가 미소 짓고 밖에서 놀게 만들었다', A3(1, 26), null, null, null),
        R('27)', 26, '아버지는 내가 그녀와 결혼하는 것을 허락했다.', A3(1, 27), null, null, null),
        R('28)', 26, '그는 소방관, 경찰관, 선생님, 의사, 통역관이 되고 싶다.', A3(2, 1), null, null, '권장: He wants to be a firefighter, a police officer, a teacher, a doctor, or an interpreter.'),
        R('29)', 26, '내 어머니는 주부 이시다. 그녀는 세상에서 제일 좋은 엄마이다.', A3(2, 2), null, null, '책 영어 오류(the 누락, In 대문자) — 올바른 답: My mother is a housewife. She is the best mother in the world.'),
        R('30)', 26, '그는 모든 종류의 스포츠를 할 수 있다.', A3(2, 3), null, null, null),
        R('31)', 26, '그의 꿈은 실현될 것이다.', A3(2, 4), null, null, null),
        R('32)', 26, '나는 자전거를 타고 학교에 간다.', A3(2, 5), null, null, 'I go to school by bike.도 정답'),
        R('33)', 26, '그는 그 아이를 돌 볼 수 있었다.', A3(2, 6), null, null, 'He could take care of the child.도 가능'),
        R('34)', 26, '나는 매우 외향적이다.', A3(2, 7), null, null, null),
        R('35)', 26, '그는 피아노와 기타를 잘 연주할 수 있다.', A3(2, 8), null, null, null),
        R('36)', 26, '그는 또한 매우 관대하고 친절한 사람이다.', A3(2, 9), null, null, null),
        R('37)', 26, '그녀는 모든 과목을 공부하는 것을 잘한다.', A3(2, 10), null, null, null),
        R('38)', 26, '아, 얼마나 나의 인생이 멋진가!', A3(2, 11), null, null, null),
        R('39)', 27, '그는 돌아다니고 친구들과 함께 놀기를 좋아한다.', A3(2, 12), null, null, null),
        R('40)', 27, '그러나 그는 낯선 사람들과 이야기하기를 좋아하지 않는다.', A3(2, 13), null, null, null),
        R('41)', 27, '그가 말할 때, 그는 외국인처럼 들린다.', A3(2, 14), null, null, '한글 “외국인처럼”은 오역 — 정답은 a native English speaker'),
        R('42)', 27, '나는 프랑스가 좋아: 음식, 도시, 자유,치즈 그리고 사람들이.', A3(2, 15), null, null, '권장: I love France: its food, cities, freedom, cheese and people.'),
        R('43)', 27, '벌은 꿀을 좋아한다. 그것들은 그것을 매일 먹는다.', A3(2, 16), null, null, 'everyday → every day'),
        R('44)', 27, '밥은 톰을 기다렸지만, 그는 오지 않았다.', A3(2, 17), null, null, null),
        R('45)', 27, '나는 도시에서 살고 싶어, 시골에서는 아니야.', A3(2, 18), null, null, null),
        R('46)', 27, '그들은 우리를 만나려고 계획했다.', A3(2, 19), null, null, 'They planned to meet us.도 가능'),
        R('47)', 27, '그녀는 깨끗하고 새롭고, 화사하고, 편리한 집을 가질거야.', A3(2, 20), null, null, 'She will have a clean, new, bright and convenient house.도 정답'),
        R('48)', 27, '그 로프를 꽉 잡아, 그렇지 않으면 너는 떨어질 거야.', A3(2, 21), null, null, '인쇄된 you‘re의 따옴표 글자 교정: you’re'),
        R('49)', 27, '나는 매우 배가 고파.', A3(2, 22), null, null, 'I am very hungry.도 정답'),
        R('50)', 27, '당신 말이 전적으로 옳아요.', A3(2, 23), null, null, 'You’re completely right.도 정답 처리 권장'),
        R('51)', 27, '나는 정말로 엄마와 아빠를 사랑한다.', A3(2, 24), null, null, 'I really love my mom and dad.도 정답'),
        R('52)', 28, '나의 아버지는 항상 시간을 잘 지키신다.', A3(2, 25), null, null, '한글 “항상”을 보면 always로 쓰게 됨 — 책 정답은 usually'),
        R('53)', 28, '나는 그녀에 대한 어떤 것도 기억이 안 난다.', A3(2, 26), null, null, null),
        R('54)', 28, '너는 다음 거리에서 그 소음을 들을 수 있었어.', A3(2, 27), null, null, null),
        R('55)', 28, '참 예쁜 옷이구나!', A3(2, 28), null, null, 'What a pretty dress!도 정답'),
        R('56)', 28, '야호, 내가 드디어 해 냈어.', A3(2, 29), null, null, null),
        R('57)', 28, '하나를 선택하는 것은 어려워.', A3(3, 1), null, null, 'It is hard to choose one.도 정답 (다만 명사구 주어 연습 문장)'),
        R('58)', 28, '그녀는 금발의 소녀이다.', A3(3, 2), null, null, '책 영어 비문 — 올바른 답: She is a girl with blond hair.'),
        R('59)', 28, '그녀는 아들을 낳았고 그를 단군이라 이름 지었다.', A3(3, 3), null, null, '로마자 표기: She gave birth to a son and named him Dangun.'),
        R('60)', 28, '그 학생들은 서로서로 매우 친하다.', A3(3, 4), null, null, null),
        R('61)', 28, '그에 대한 자신감이 없음에도 불구하고, 그는 결코 자신감을 잃지 않았다.', A3(3, 5), null, null, '한글 오역 — STUDENT 15과 원문: In spite of the lack of confidence in him by many Korean people, he never lost his confidence.'),
        R('62)', 28, '내가 집으로 돌아온 이후에도, 나는 몇 시간 더 공부한다.', A3(3, 6), null, null, null),
        R('63)', 28, '세상에! 무슨 일이야?', A3(3, 7), null, null, null),
        R('64)', 29, '나의 직업은 아이들을 돌보는 일이다.', A3(3, 8), null, null, null),
        R('65)', 29, '내가 설거지를 끝낸 후에 쇼핑을 할거야.', A3(3, 9), null, null, '책 영어 시제 오류 — 올바른 답: I’ll do the shopping when I have finished washing the dishes.'),
        R('66)', 29, '누군가를 위한 스승이 된다는 것을 의미가 있다.', A3(3, 10), null, null, null),
        R('67)', 29, '나는 나를 도와줄 가족이 있다.', A3(3, 11), null, null, null),
        R('68)', 29, '나는 파란 리본을 가진 그 모자가 좋다.', A3(3, 12), null, null, null),
        R('69)', 29, '그녀는 바구니 안의 사과를 먹었니?', A3(3, 13), null, null, 'Did she eat the apple in the basket?도 정답'),
        R('70)', 29, '그는 투덜거리는 것 이외에는 아무것도 않는다.', A3(3, 14), null, null, null),
        R('71)', 29, '제임스에게 당신을 도와달라고 부탁하시지 그래요?', A3(3, 15), null, null, 'Why don’t you ask James to help you?도 정답'),
        R('72)', 29, '조슈아는 네가 돌아왔을 때까지 그것을 마쳤다.', A3(3, 16), null, null, '책 영어 시제 오류 — 올바른 답: Joshua will have finished it by the time you come back.'),
        R('73)', 29, '그가 그 소식을 듣자마자, 그는 집으로 서둘러 갔다.', A3(3, 17), null, null, null),
        R('74)', 29, '비가 올 경우를 대비해서 우산을 챙겨 가거라.', A3(3, 18), null, null, 'Take your umbrella in case it rains.도 정답'),
      ],
    },
  ],
};

// ---------------------------------------------------------------- issues
const I = (page, where, text, type, problem, fix, confidence) => ({ page, where, text, type, problem, fix, confidence });
const issues = [
  // front matter
  I(2, 'frontMatter 특징 2. (Pass-Off Sentences 와 Application Sentences)', 'Sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다.', 'korean_typo', '문단 제목은 “Pass-Off Sentences 와 Application Sentences”인데 본문 첫머리에 “Pass-Off”가 빠져 무엇을 가리키는지 불분명함. “문법 설명에 앞서 … 문법내용을 설명한다”도 말이 겹침.', 'Pass-Off Sentences에서는 문법 설명에 앞서 상황 예문이나 표로 문법 내용을 보여 준다.', 'medium'),
  I(2, 'frontMatter 특징 1.·2.·3., 학습법 2.', 'Pass-Off Grammar는 전체 문법이 대주제 20개와 연결고리 70개로 이루어져 있다.', 'layout_or_extraction', '3쪽 연결고리 구성도의 소주제 동그라미를 세면 67개(Part 1: 29, Part 2: 23, Part 3: 15)이고 대주제는 20개로 맞음. 2쪽에 네 번 나오는 “70개”(연결고리·소주제)와 3개가 다름 — 웹 메뉴를 어느 쪽 기준으로 만들지 정해야 함.', '“연결고리 67개”로 고치거나 구성도에 빠진 소주제를 추가', 'high'),
  I(2, 'frontMatter 특징·학습법 여러 곳', '형성 시켜준다 / 소주제70개 / 전시간에 / 70개의 문법 소주제 별로 / 각 소 주제별로 / Pass Off English를', 'korean_typo', '띄어쓰기·표기 오류.', '형성시켜 준다 / 소주제 70개 / 전 시간에 / 70개의 문법 소주제별로 / 각 소주제별로 / Pass-Off English를', 'high'),
  I(3, 'frontMatter 연결고리 구성도(3쪽)·목차(4쪽) — 동사의 현재형', 'Be동사의 현재형 · 일반동사의 현재형 · Have/Has', 'layout_or_extraction', '구성도와 목차는 동사의 현재형 소주제를 3개(Have/Has 별도)로 보여 주지만 본문(10~14쪽)은 “2) 일반동사의 현재형: 일반동사와 have”로 합쳐 소주제가 2개뿐. Have/Has만 다루는 예문·Review가 없음.', '본문에 “3) Have/Has” 소주제를 따로 두거나(has·have 예문 2개를 옮김), 구성도에서 Have/Has를 일반동사 안으로 합침 — 과정 구조 문제라 사장님 결정 필요', 'high'),
  // topic 1
  I(5, 'TOPIC 1 passOff 3) item 2; application 3) item 2 (6쪽); TOPIC 3 passOff 2) 대명사 (15쪽); TOPIC 3 application 2) item 2 (18쪽); TOPIC 3 review 2. 2) (22쪽)', 'She is best mother in the world.', 'english_grammar', '최상급 best 앞에 the가 빠짐. STUDENT 2과 원문(s2-3)도 “She is the best mother in the world.”', 'She is the best mother in the world.', 'high'),
  I(5, 'TOPIC 1 passOff 3) item 1; application 3) item 1 (6쪽)', 'He is 대한.', 'english_unnatural', '영어 문장 안에 한글 이름이 그대로 인쇄됨 — 웹에서 영작 채점(학생은 로마자로 입력)과 영어 음성 합성이 모두 어긋남.', 'He is Daehan. (이름은 한국어 발음으로 읽히게 처리)', 'medium'),
  I(5, 'TOPIC 1 application 1) item 5', 'Sometimes I watch TV, or listen to music  before I go to bed. (10 과)', 'english_grammar', '주어 하나에 동사 두 개(watch, listen)를 or로 잇는데 쉼표가 들어가고 music 뒤 공백이 두 칸. STUDENT 10과 원문(s10-4)은 쉼표 없음.', 'Sometimes I watch TV or listen to music before I go to bed.', 'medium'),
  I(5, 'TOPIC 1 application 1) item 8', 'We are very close to one another .(2 과)', 'layout_or_extraction', '마침표 앞에 공백.', 'We are very close to one another. (2과)', 'high'),
  I(5, 'TOPIC 1 application 1) item 11', 'By the way, where do we go?', 'english_unnatural', '지금 가는/갈 목적지를 묻는 말로는 현재진행형이 더 자연스러움(where do we go?는 “어디로 가야 하지?”에 가까움).', 'By the way, where are we going?', 'low'),
  I(6, 'TOPIC 1 application 2) item 5', 'Why do you make this model air plane?', 'english_grammar', 'airplane은 한 단어. 지금 만들고 있는 모형을 두고 묻는 말로 현재형 do you make도 어색함.', 'Why are you making this model airplane? (9쪽 한글 “만들었니”에 맞추면 Why did you make this model airplane?)', 'high'),
  I(6, 'TOPIC 1 application 2) item 6', 'How do you commute everyday?', 'english_grammar', '부사 “매일”은 every day(두 단어). everyday는 형용사(일상의).', 'How do you commute every day?', 'high'),
  I(6, 'TOPIC 1 application 2) item 7', 'You are great workers in our farm!', 'english_grammar', '농장에서 일한다고 할 때는 on the farm이 관용 표현.', 'You are great workers on our farm!', 'medium'),
  I(6, 'TOPIC 1 application 3) item 7', 'She goes skiing every Saturday in winter', 'english_grammar', '문장 끝 마침표 누락.', 'She goes skiing every Saturday in winter.', 'high'),
  I(6, 'TOPIC 1 application 3) item 10', 'He gave me hurt in my heart, but it was not serious.', 'english_unnatural', 'hurt를 명사로 써서 give me hurt in my heart라고 하지 않음 — 한국어 직역투 비문.', 'He hurt my feelings, but it was not serious.', 'high'),
  I(6, 'TOPIC 1 application 3) item 11', 'He bought the book although it was too expensive.', 'english_unnatural', 'too expensive는 “너무 비싸서 살 수 없는” 뜻을 품어 although … bought와 논리가 어긋남.', 'He bought the book although it was very expensive.', 'low'),
  I(6, 'TOPIC 1 application 3) item 12', 'It was cold, so I shut the door.', 'grammar_explanation_wrong', '3인칭 대명사 it(그것) 예문 묶음에 날씨를 나타내는 비인칭 주어 it이 설명 없이 섞임. 이 책은 “대명사 it”을 48쪽에서 따로 가르침.', '“그것”을 가리키는 it 예문(예: It is my favorite book.)으로 바꾸거나 “비인칭 it” 표시 추가', 'low'),
  I(6, 'TOPIC 1 application 3) 전체(6쪽), TOPIC 2 application 1) 전체(10쪽)', 'He is 대한.(3과) … They are too young to have jobs. / I am eleven years old.(1과) … They are pleased to find her.', 'layout_or_extraction', 'PDF 안에 같은 글상자가 두 겹으로 겹쳐 있어 텍스트 레이어에서 이 문장들이 두 번씩 나옴(화면에서는 글자가 약간 진하게 보임). 자동 추출하면 문장 수가 두 배로 잡힘.', '추출·웹 변환 때 중복 제거 (종이책 내용은 한 번)', 'high'),
  I(7, 'TOPIC 1 review 1) items 4, 7', '4. 여러분들은 나의 학급친구들이다. / 7. 그것은 나를 행복하게 만든다.', 'answer_ambiguous', '영작한 문장(You are my classmates. / It makes me happy.)에 인칭대명사가 두 개씩 있음 — my(1인칭 소유격), me(1인칭 목적격). “인칭대명사를 찾아 줄을 긋고 몇 인칭인지” 쓰라는 지시로는 답이 하나로 정해지지 않음.', '지시문을 “주어로 쓰인 인칭대명사”로 좁히거나, 두 답(You-2인칭·my-1인칭 / It-3인칭·me-1인칭)을 모두 정답 처리', 'high'),
  I(7, 'TOPIC 1 review 1) item 2', '우리는 그 날 동안 자유롭다.', 'korean_typo', '특정한 날을 가리키는 “그날”은 한 단어.', '우리는 그날 하루 자유롭다.', 'low'),
  I(8, 'TOPIC 1 review 2) item 2 (번호 없음)', '나는 공부하기와 친구 사귀기를 좋아해요', 'korean_typo', '문장 끝 마침표 누락.', '나는 공부하기와 친구 사귀기를 좋아해요.', 'high'),
  I(8, 'TOPIC 1 review 2) item 4 (번호 없음)', '때때로 나는 TV 를 보거나 음악을 들어요. 내가 잠자리에 들기 전에', 'korean_typo', '한 문장을 마침표로 끊어 “내가 잠자리에 들기 전에”가 조각 문장으로 남음. “TV 를” 띄어쓰기.', '때때로 나는 잠자리에 들기 전에 TV를 보거나 음악을 들어요.', 'high'),
  I(8, 'TOPIC 1 review 2) item 8 (번호 없음)', '우리는 사진을 찍을 많은 기회가 있을 거야.', 'translation_mismatch', '한글은 미래(있을 거야)인데 짝이 되는 영어 “We have a lot of chances to take a picture.”는 현재형. 학생이 will have로 쓰면 책 문장과 달라짐.', '한글을 “우리는 사진을 찍을 기회가 많아.”로 고치거나 영어를 “We will have a lot of chances to take pictures.”로', 'medium'),
  I(8, 'TOPIC 1 review 2) item 10 (번호 없음)', '우리는 20000달러를 주고 그 차를 살 거야.', 'korean_typo', '큰 금액은 “2만 달러” 또는 “20,000달러”로 적는 것이 표준.', '우리는 2만 달러를 주고 그 차를 살 거야.', 'low'),
  I(8, 'TOPIC 1 review 2) item 11 (번호 없음)', '여러분들, 모두 수업 받을 준비가 되었나요, ?', 'korean_typo', '물음표 앞에 쉼표와 공백이 남음.', '여러분, 모두 수업 받을 준비가 되었나요?', 'high'),
  I(9, 'TOPIC 1 review 2) item 13 (번호 없음)', '왜 너는 이 모형 비행기를 만들었니?', 'translation_mismatch', '한글은 과거(만들었니)인데 영어 “Why do you make this model air plane?”는 현재형.', '영어를 “Why did you make this model airplane?”로 맞추거나 한글을 “왜 너는 이 모형 비행기를 만들고 있니?”(Why are you making …)로', 'high'),
  I(9, 'TOPIC 1 review 2) item 14 (번호 없음)', '당신은 어떻게 매일 출 퇴근하십니까?', 'korean_typo', '“출퇴근”은 한 단어.', '당신은 매일 어떻게 출퇴근하십니까?', 'high'),
  I(9, 'TOPIC 1 review 2) item 15 (번호 없음)', '여러분들은 우리 농장에서 훌륭한 일군들입니다!', 'korean_typo', '“일군”은 비표준어 — 표준어는 “일꾼”.', '여러분은 우리 농장의 훌륭한 일꾼들입니다!', 'high'),
  I(9, 'TOPIC 1 review 2) item 16 (번호 없음)', '그는 매일 일찍 일어난다.', 'translation_mismatch', '영어는 every morning(매일 아침)인데 한글은 “매일”만 있음 — every day로 써도 틀린 답이 아님.', '그는 매일 아침 일찍 일어난다.', 'low'),
  I(9, 'TOPIC 1 review 2) item 20 (번호 없음)', '그녀는 내 수업에 들어와 있다.', 'translation_mismatch', '“She is in my class.”는 “그녀는 우리 반이다/나와 같은 반이다”라는 뜻. 한글 문장은 뜻이 어색하고 다른 영작을 부름.', '그녀는 우리 반이다.', 'medium'),
  I(9, 'TOPIC 1 review 2) item 23 (번호 없음)', '날씨가 너무 추워서 그래서 나는 문을 닫았다.', 'korean_typo', '“-서”와 “그래서”가 겹침. “너무”는 영어(It was cold)에 없음.', '날씨가 추워서 나는 문을 닫았다.', 'medium'),
  I(9, 'TOPIC 1 review 2) item 24 (번호 없음)', '그들은 직업을 가지기엔 너무 어렸다.', 'translation_mismatch', '한글은 과거(어렸다)인데 영어 “They are too young to have jobs.”는 현재.', '그들은 직업을 가지기엔 너무 어리다.', 'medium'),
  // topic 2
  I(10, 'TOPIC 2 application 1) item 4', 'It is the start of the weekend(10과)', 'english_grammar', '문장 끝 마침표 누락(Pass-Off 쪽에는 있음).', 'It is the start of the weekend. (10과)', 'high'),
  I(10, 'TOPIC 2 application 1) item 5', 'I am too busy to climb a tree.', 'english_unnatural', '문법은 맞지만 “나무 타기엔 너무 바쁘다”는 상황이 어색한 예문.', 'I am too busy to go out today. (예시)', 'low'),
  I(11, 'TOPIC 2 passOff 2) item 4; application 2) item 4', 'I have many friends.(1과)', 'layout_or_extraction', 'STUDENT 1과(s1-3)의 문장은 “I have a lot of friends.”이고, “I have many friends.”는 3과(s3-2 “Because of this, I have many friends.”)와 11과(s11-3)에 있음 — 과 번호가 원문과 어긋남.', '(3과)로 고치거나 1과 원문 “I have a lot of friends.”를 씀', 'medium'),
  I(11, 'TOPIC 2 application 2) item 7', 'Jamie eats lunch at the school.', 'english_unnatural', '학생이 학교에서 점심을 먹는다는 뜻이면 관사 없는 at school이 자연스러움(at the school은 특정 건물).', 'Jamie eats lunch at school.', 'low'),
  I(11, 'TOPIC 2 application 2) item 8', 'Rita reads the newspaper everyday.', 'english_grammar', '부사 “매일”은 every day(두 단어).', 'Rita reads the newspaper every day.', 'high'),
  I(11, 'TOPIC 2 application 2) item 10', 'Rice grows in Britain.', 'english_unnatural', '사실과 다른 예문 — 영국은 벼를 기르는 나라가 아님(외국 문법서의 원래 예문은 부정문 “Rice doesn’t grow in Britain.”으로 보임). 긍정문으로 바꾸면서 틀린 사실이 됨.', 'Rice grows in Korea. (3인칭 단수 -s 연습 유지)', 'medium'),
  I(12, 'TOPIC 2 review 1. item 4)', '4) 그것은 그 주의 시작입니다.', 'translation_mismatch', '“the start of the weekend”는 “주말의 시작”. “그 주의 시작”은 the start of the week로 영작하게 만듦. STUDENT 10과 한글(s10-5)도 “주말의 시작”.', '4) 그것은 주말의 시작입니다.', 'high'),
  I(12, 'TOPIC 2 review 1. item 3)', '3) 그는 진실로 똑똑한 사람입니다.', 'korean_typo', '“진실로”는 어색한 직역 — truly는 “정말”.', '3) 그는 정말 똑똑한 사람입니다.', 'low'),
  I(12, 'TOPIC 2 review 2. item 2)', '2) 그녀는 또한 음악듣기를 좋아한다.', 'answer_ambiguous', '영작 문장 She also loves to listen to music.에는 일반동사가 두 개(loves, to부정사 안의 listen). “일반동사를 찾아 원형을 쓰라”는 지시로는 love만인지 listen까지인지 모호. “음악듣기”도 띄어 써야 함.', '정답을 “love (listen)”로 둘 다 인정하거나 지시를 “문장의 동사”로 좁힘; 한글은 “음악 듣기”', 'medium'),
  I(12, 'TOPIC 2 review 2. item 3)', '3) 그녀는 두 명의 남동생과 두 명의 여동생이 있다.', 'translation_mismatch', 'brothers/sisters는 형·동생을 가리지 않음. STUDENT 4과 원문은 어머니의 형제(s4-3 “남자형제/여자형제”, s4-4 “오빠/언니”) — “남동생·여동생”은 틀린 정보.', '3) 그녀는 남자 형제가 두 명, 여자 형제가 두 명 있다.', 'medium'),
  I(13, 'TOPIC 2 review 3. item 5)', '5) 밖에 비가 오니?', 'answer_ambiguous', '책 문장은 “Is it rainy outside?”지만 “Is it raining outside?”가 더 흔한 답 — 웹 자동 채점이면 둘 다 인정해야 함.', '정답: Is it rainy outside? / Is it raining outside? 모두 인정', 'low'),
  I(13, 'TOPIC 2 review 3. item 8)', '8) 그 아이는 장군이 되기를 원한다.', 'translation_mismatch', '영어는 hopes(바란다)인데 한글 “원한다”는 wants를 부름.', '8) 그 아이는 장군이 되기를 바란다.', 'low'),
  I(14, 'TOPIC 2 review 3. item 13)', '13) 라이스는 영국에서 성장하고 있다.', 'translation_mismatch', 'Rice(쌀·벼)를 사람 이름 “라이스”로 옮기고 grows를 “성장하고 있다”(진행)로 옮김 — 영어 문장과 뜻이 전혀 다름.', '13) 벼는 한국에서 자란다. (영어 수정안 Rice grows in Korea.에 맞춤)', 'high'),
  I(14, 'TOPIC 2 review 3. items 14)~18)', '14)리즈는 … / 17)그는 내방에서 숙제를 한다.', 'korean_typo', '“내 방”은 띄어 씀. 14)~18)은 번호 뒤 공백도 없음.', '17) 그는 내 방에서 숙제를 한다.', 'high'),
  // topic 3
  I(15, 'TOPIC 3 passOff 1) 문장의 5형식 (application 1) 전체, review 1. 전체)', 'Flowers bloom. … I want her to be a good pianist. (2과)', 'answer_missing', '5형식을 다루면서 각 문장이 몇 형식인지, 무엇이 주어·동사·목적어·보어인지 표시가 전혀 없음. Review 1은 “몇 형식인지” 쓰라고 하지만 정답이 책 어디에도 없음. There are ~ 문장은 학교문법에서 1형식으로 보지만 설명이 없으면 교사마다 갈릴 수 있음.', '문장마다 형식과 S/V/O/C 표시 추가 (예: Flowers(S) bloom(V). — 1형식). 이 추출 파일의 analysisNote·extraSlotAnswer 참고', 'high'),
  I(15, 'TOPIC 3 passOff 2) 명사; application 2) item 1 (18쪽); review 2. 1) (22쪽)', 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter. (3과)', 'grammar_explanation_wrong', '명사 예문인데 굵은 글씨가 “be a fire fighter, …”로 동사 be와 관사 a까지 포함 — 품사를 적는 문제에서 be도 명사인 것처럼 보임.', '굵은 글씨를 명사(firefighter, police officer, teacher, doctor, interpreter)에만', 'high'),
  I(15, 'TOPIC 3 passOff 2) 명사 (같은 문장 18쪽·22쪽)', 'He wants to be a fire fighter, police officer, teacher, doctor, interpreter.', 'english_grammar', '나열 마지막 앞에 or가 없고 관사가 첫 항목에만 있음; firefighter는 한 단어. STUDENT 3과 원문(s3-4)은 “a police officer, a firefighter, a teacher, a doctor, or an interpreter”.', 'He wants to be a firefighter, a police officer, a teacher, a doctor, or an interpreter.', 'high'),
  I(15, 'TOPIC 3 passOff 2) 대명사', 'My mother is a housewife. She is best mother in the world. 2과)', 'layout_or_extraction', '과 표시의 여는 괄호 누락.', '… (2과)', 'high'),
  I(15, 'TOPIC 3 passOff 2) 동사 (application 2) item 4, review 2. 4))', 'His dream will come true. (3과)', 'grammar_explanation_wrong', '동사 예문에서 “come true”를 통째로 굵게 함 — true는 형용사(보어)라 품사를 물으면 혼란.', '굵은 글씨를 come만 하거나 “come true = 동사구(실현되다)”라고 설명', 'medium'),
  I(15, 'TOPIC 3 passOff 2) 동사 (application 2) item 6, review 2. 6))', 'He could take care of the baby.', 'answer_ambiguous', '“take care of”는 동사+명사+전치사로 된 구동사 — 품사 하나로 답하기 모호.', '정답을 “동사(구동사)”로 명시하거나 굵은 글씨를 take만', 'low'),
  I(16, 'TOPIC 3 passOff 3) 형용사구; application 3) item 2 (20쪽)', 'She is a girl with her blond.', 'english_grammar', 'blond는 형용사라 뒤에 명사가 필요 — “with her blond”는 비문.', 'She is a girl with blond hair.', 'high'),
  I(16, 'TOPIC 3 passOff 3) 동사구; application 3) item 3 (20쪽)', 'She gave birth to a son and named him 단군 (17과)', 'english_unnatural', '영어 문장 속 한글 이름 + 마침표 누락. STUDENT 17과 원문(s17-1)은 “… named him Dangun.”', 'She gave birth to a son and named him Dangun. (17과)', 'high'),
  I(16, 'TOPIC 3 passOff 3) 전치사구; application 3) item 5 (20쪽)', 'In spite of the lack of confidence in him, he never lost his confidence. (15과)', 'english_unnatural', 'STUDENT 15과 원문(s15-3)의 “by many Korean people”을 빼서 누구의 신뢰가 부족했는지 사라짐 — confidence가 두 번 다른 뜻(남의 신뢰/자신감)으로 나와 혼란.', 'In spite of the lack of confidence in him by many Korean people, he never lost his confidence.', 'medium'),
  I(16, 'TOPIC 3 passOff 3) 접속사구; application 3) item 6 (20쪽)', 'Even after I come home, I study for a couple more hours. (8과)', 'layout_or_extraction', '과 번호 오류 — 이 문장은 STUDENT 10과(s10-3 “Even after I come home, I study for a couple more hours before going to sleep.”)에 있고 8과에는 없음.', '(10과)', 'high'),
  I(16, 'TOPIC 3 passOff 3) 구 (라벨 전체)', '동사구 : She gave birth to … / 전치사구: In spite of … / 접속사구: Even after … / 감탄사구: Oh, my goodness!', 'grammar_explanation_wrong', '“구”의 두 뜻이 섞임: 명사구·형용사구·부사구는 “그 품사 역할을 하는 구”인데, 동사구·전치사구·접속사구는 “여러 단어로 된 동사/전치사/접속사(구동사·구전치사·구접속사)”로 씀. 학교문법의 “전치사구”는 보통 “전치사+목적어”(in spite of the lack of confidence in him) 전체. 또 “Even after”는 부사 even + 접속사 after라 구접속사가 아님.', '라벨을 “구동사(gave birth to)·구전치사(in spite of)·구접속사(as soon as, in case 등)”로 바꾸고 접속사구 예문을 as soon as류로 교체하거나 설명 한 줄 추가', 'medium'),
  I(17, 'TOPIC 3 application 1) item 13', 'I ’ll be late.', 'layout_or_extraction', 'I와 ’ll 사이에 공백.', 'I’ll be late.', 'high'),
  I(17, 'TOPIC 3 application 1) item 16', 'Overweight is becoming more common.', 'english_unnatural', 'overweight는 주로 형용사 — 명사 주어로는 obesity나 being overweight가 자연스러움.', 'Obesity is becoming more common.', 'medium'),
  I(17, 'TOPIC 3 application 1) item 18', 'They admit his proposals.', 'english_unnatural', 'admit는 “(사실·잘못을) 인정하다” — 제안을 받아들이는 것은 accept. 25쪽 한글 18) “받아들인다”와도 어긋남.', 'They accept his proposals.', 'high'),
  I(17, 'TOPIC 3 application 1) item 23', 'Will you make me a chicken soup?', 'english_grammar', 'soup는 보통 셀 수 없는 명사 — a chicken soup는 어색.', 'Will you make me some chicken soup?', 'medium'),
  I(18, 'TOPIC 3 application 2) item 2', 'My mother is a housewife. She is best mother In the world. (2과)', 'layout_or_extraction', '문장 중간 “In” 대문자 오타 (the 누락은 위 별도 항목).', 'My mother is a housewife. She is the best mother in the world. (2과)', 'high'),
  I(18, 'TOPIC 3 application 2) item 15; review 2. 15) (23쪽)', 'I love France; food, city, freedom, cheese and people.', 'english_grammar', '목록을 소개할 때는 세미콜론이 아니라 콜론; city는 복수(cities)가 자연스러움.', 'I love France: its food, cities, freedom, cheese and people.', 'medium'),
  I(19, 'TOPIC 3 application 2) item 16; review 2. 16) (23쪽)', 'Bees like honey. They eat it everyday.', 'english_grammar', '부사 “매일”은 every day.', 'Bees like honey. They eat it every day.', 'high'),
  I(19, 'TOPIC 3 application 2) item 20', 'She will have a clean, new, bright, convenient house.', 'english_unnatural', '형용사 네 개를 쉼표로만 나열 — 마지막 앞에 and를 넣는 것이 자연스러움.', 'She will have a clean, new, bright and convenient house.', 'low'),
  I(19, 'TOPIC 3 application 2) item 21; review 2. 21) (23쪽)', 'Hold the rope tight, or you‘re going to fall.', 'answer_ambiguous', 'tight는 “꽉”이라는 부사로도, 목적격보어 형용사로도 분석됨 — 책에 정답이 없어 품사 문제로 모호. you‘re의 아포스트로피가 여는 따옴표(‘) 글자.', '정답을 “부사”로 명시(사전: hold tight = adv.)하거나 모호하지 않은 예문(He runs fast.)으로 교체; you’re로 교정', 'medium'),
  I(19, 'TOPIC 3 application 2) item 28; review 2. 28) (23쪽)', 'What a nice dress!', 'grammar_explanation_wrong', '문장 전체를 굵게 해 감탄사 예문 자리에 둠 — “What a nice dress!”는 감탄문이고 what은 감탄사가 아님(명사를 꾸미는 한정사). 품사를 적는 문제에서 맞는 답이 없음.', 'Wow! What a nice dress!로 바꾸고 Wow만 굵게 (감탄사)', 'medium'),
  I(20, 'TOPIC 3 application 3) item 9', 'I’ll do the shopping when I finished washing dishes.', 'english_grammar', '미래 문장의 시간 부사절에 과거형 finished — 시제 오류.', 'I’ll do the shopping when I have finished washing the dishes.', 'high'),
  I(20, 'TOPIC 3 application 3) item 13', 'Did she have the apple in the basket?', 'answer_ambiguous', 'in the basket이 the apple을 꾸미는 형용사구인지 장소 부사구인지 문장만으로는 갈림 — 구 종류 표시도 없음.', 'I like the apple in the basket.처럼 형용사구로만 읽히는 예문 사용', 'low'),
  I(20, 'TOPIC 3 application 3) item 16', 'Joshua has finished it by the time you come back.', 'english_grammar', 'by the time you come back(미래 시점)과 현재완료가 맞지 않음 — 미래완료가 필요.', 'Joshua will have finished it by the time you come back.', 'high'),
  I(20, 'TOPIC 3 application 2) items 15~29, application 3) items 8~18, review 2. 전체 (22~23쪽)', '(Application 추가 문장에 품사·구 종류 표시 없음) / 2. 다음 문장을 보고 굵게 쓰여진 단어의 품사를 적어 보시오.', 'answer_missing', 'Pass-Off 쪽은 “명사:”, “형용사구:”처럼 종류를 적었지만 Application 추가 문장에는 표시가 없음. Review 2(품사 29문항)의 정답도 책에 없음.', '문장마다 품사/구 종류 표시와 정답표 추가 (이 추출 파일의 analysisNote·extraSlotAnswer 참고)', 'high'),
  I(24, 'TOPIC 3 review 3. 3)', '3) 나의 아버지는 둘째 아드님이시다.', 'korean_typo', '“아드님”은 남의 아들을 높이는 말 — 아버지가 둘째 아들이라는 뜻으로는 어색. STUDENT 4과 한글(s4-3)은 “둘째 아들이십니다”.', '3) 나의 아버지는 둘째 아들이시다.', 'medium'),
  I(24, 'TOPIC 3 review 3. 8), 10), 11), 50)(27쪽)', '8) 여기에 그가 온다. / 10) 오늘 내 머리가 돌아가지 않는다. / 11) 이 약은 효과가 있을 거야. / 50) 당신 말이 전적으로 옳아요.', 'answer_ambiguous', '책 정답이 관용 표현(Here he comes. / My brain doesn’t work today. / This medicine will do. / You’re entirely in the right.)이라 한글만 보고는 다른 자연스러운 답(He comes here. / This medicine will work. / You’re completely right.)이 나옴 — 채점 기준 필요.', '웹에서는 대표 정답 + 인정 답 목록을 두거나 어순 배열형으로 출제', 'medium'),
  I(25, 'TOPIC 3 review 3. 15)', '15) 티나는 오후 내내 차분하다.', 'translation_mismatch', '영어 “Tina kept calm all afternoon.”은 과거(kept). 한글이 현재형이라 keeps calm으로 영작하게 됨.', '15) 티나는 오후 내내 침착함을 유지했다.', 'medium'),
  I(25, 'TOPIC 3 review 3. 19)', '19) 그는 우리를 만나기를 피하려고 노력한다.', 'translation_mismatch', '영어 “He tried to avoid seeing us.”는 과거(tried).', '19) 그는 우리를 만나는 것을 피하려고 애썼다.', 'medium'),
  I(25, 'TOPIC 3 review 3. 24)', '24) 우리는 짐이 늦는다고 생각했다.', 'translation_mismatch', 'expected는 “예상했다”이고 앞으로의 일(늦을 것) — “늦는다고 생각했다”는 We thought Jim was late로 영작될 수 있음.', '24) 우리는 짐이 늦을 거라고 예상했다.', 'low'),
  I(25, 'TOPIC 3 review 3. 25)', '25) 그가 원하는 것 하도록 두어라.', 'korean_typo', '목적격 조사 “을” 누락.', '25) 그가 원하는 것을 하도록 두어라.', 'high'),
  I(26, 'TOPIC 3 review 3. 26)', '26) 그는 내가 미소 짓고 밖에서 놀게 만들었다', 'korean_typo', '마침표 누락.', '26) 그는 내가 미소 짓고 밖에서 놀게 만들었다.', 'high'),
  I(26, 'TOPIC 3 review 3. 29), 33)', '29) 내 어머니는 주부 이시다. … / 33) 그는 그 아이를 돌 볼 수 있었다.', 'korean_typo', '띄어쓰기: “주부이시다”, “돌볼”. 33)의 “그 아이”는 영어 the baby(그 아기)와 약간 다름.', '29) 내 어머니는 주부이시다. 그녀는 세상에서 제일 좋은 엄마이다. / 33) 그는 그 아기를 돌볼 수 있었다.', 'high'),
  I(27, 'TOPIC 3 review 3. 39)', '39) 그는 돌아다니고 친구들과 함께 놀기를 좋아한다.', 'translation_mismatch', 'hang out은 “어울려 놀다”이지 “돌아다니다”가 아님. STUDENT 3과 한글(s3-2)은 “친구들과 어울려 놀기를 좋아하지만”.', '39) 그는 친구들과 어울려 놀기를 좋아한다.', 'medium'),
  I(27, 'TOPIC 3 review 3. 41)', '41) 그가 말할 때, 그는 외국인처럼 들린다.', 'translation_mismatch', '“a native English speaker”는 “영어 원어민”. “외국인처럼”은 뜻이 다름(STUDENT 7과 한글 s7-3: “영어 원어민 같습니다”).', '41) 그가 말할 때, 그는 영어 원어민처럼 들린다.', 'high'),
  I(27, 'TOPIC 3 review 3. 42), 47)', '42) 나는 프랑스가 좋아: 음식, 도시, 자유,치즈 그리고 사람들이. / 47) … 편리한 집을 가질거야.', 'korean_typo', '띄어쓰기: “자유, 치즈”, “가질 거야”.', '42) … 자유, 치즈 그리고 사람들이. / 47) 그녀는 깨끗하고, 새롭고, 화사하고, 편리한 집을 가질 거야.', 'high'),
  I(28, 'TOPIC 3 review 3. 52)', '52) 나의 아버지는 항상 시간을 잘 지키신다.', 'translation_mismatch', '영어는 usually(대개). “항상”은 always로 영작하게 만듦.', '52) 나의 아버지는 대개 시간을 잘 지키신다.', 'high'),
  I(28, 'TOPIC 3 review 3. 54)', '54) 너는 다음 거리에서 그 소음을 들을 수 있었어.', 'translation_mismatch', 'the next street는 “옆 거리”; 여기 you는 “(누구든) 들을 수 있었다”는 일반 주어. “다음 거리”는 직역투.', '54) 옆 거리에서도 그 소음을 들을 수 있었어.', 'low'),
  I(28, 'TOPIC 3 review 3. 56)', '56) 야호, 내가 드디어 해 냈어.', 'korean_typo', '“해냈어”는 한 단어; “드디어”는 영어(I made it!)에 없음.', '56) 야호! 내가 해냈어!', 'medium'),
  I(28, 'TOPIC 3 review 3. 61)', '61) 그에 대한 자신감이 없음에도 불구하고, 그는 결코 자신감을 잃지 않았다.', 'translation_mismatch', 'confidence in him은 “그에 대한 (남들의) 신뢰”인데 “자신감”으로 옮겨 앞뒤가 모순되는 문장이 됨.', '61) (많은 사람들이) 그를 믿지 않았음에도 불구하고, 그는 결코 자신감을 잃지 않았다.', 'high'),
  I(29, 'TOPIC 3 review 3. 65)', '65) 내가 설거지를 끝낸 후에 쇼핑을 할거야.', 'korean_typo', '“할 거야” 띄어쓰기.', '65) 내가 설거지를 끝낸 후에 쇼핑을 할 거야.', 'high'),
  I(29, 'TOPIC 3 review 3. 66)', '66) 누군가를 위한 스승이 된다는 것을 의미가 있다.', 'korean_typo', '조사 오류 “것을” → “것은”(비문). 영어의 really(정말)도 빠짐.', '66) 누군가의 스승이 된다는 것은 정말 의미가 있다.', 'high'),
  I(29, 'TOPIC 3 review 3. 68)', '68) 나는 파란 리본을 가진 그 모자가 좋다.', 'korean_typo', 'with의 직역 “가진”이 어색 — 모자에는 리본이 “달린”.', '68) 나는 파란 리본이 달린 그 모자가 좋다.', 'low'),
  I(29, 'TOPIC 3 review 3. 70)', '70) 그는 투덜거리는 것 이외에는 아무것도 않는다.', 'korean_typo', '서술어 “하지” 누락 — 비문.', '70) 그는 투덜거리는 것 이외에는 아무것도 하지 않는다.', 'high'),
  I(29, 'TOPIC 3 review 3. 72)', '72) 조슈아는 네가 돌아왔을 때까지 그것을 마쳤다.', 'translation_mismatch', '한글 자체가 비문(“돌아왔을 때까지 … 마쳤다”)이고, 미래 시점까지의 완료를 뜻하는 영어와도 맞지 않음.', '72) 네가 돌아올 때쯤이면 조슈아는 그것을 끝냈을 거야. (영어: Joshua will have finished it by the time you come back.)', 'high'),
];

// ---------------------------------------------------------------- assemble
const introText = [
  '특 징',
  '1. Pass-Off Grammar 란?',
  'Pass-Off English의 문법서이다.',
  'Pass-Off English는 말하기가 우선적으로 이루어져야 하는 영어 교육이다. 그러나 speaking, listening, writing, vocabulary, grammar가 따로 구성되어 있지 않고 복합적으로 1년간 학습함으로써, Pass-Off English 학습자는 문법을 공부하기 전에 먼저 자신의 머릿속에 많은 영어 문장으로 그 지식의 근간을 형성 시켜준다. Pass-Off Grammar는 전체 문법이 대주제 20개와 연결고리 70개로 이루어져 있다. 각 문법에 대한 예문들은 Pass-Off English의 문장들로 구성되어 있으므로, 이 책을 시작하기 전에 Pass-Off English의 560여 문장에 대한 학습이 선행되면 문법학습은 매우 쉽고 빠르게 일어난다.',
  '2. Pass-Off  Sentences 와 Application Sentences',
  'Sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다. 이 때 사용되는 예문이 Pass-Off  English 의 예문이므로 선행학습자는 문법을 매우 쉽게 이해할 수 있다.',
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

const frontNotes = [
  '1쪽 표지: “Pass-Off English Grammar 1”, 부제 “Techniques of Language Acquisition”(T·L·A 강조), Pass-Off English 방패 로고. 모든 쪽 머리말 “The Revolution of English Education”, 꼬리말 “Pass-Off English 패스오프 잉글리쉬” 로고, 가운데 “Pass-Off English” 워터마크.',
  '2쪽 특징·학습법(introText에 전문). 줄바꿈에서 끊긴 “연결 / 고리”는 “연결고리”로 이음. 핵심 방침: Pass-Off 예문 암기 → 교사 설명 → Application 해석 후 한글 보고 바로 영어로 말하기 → Review 자가 채점·재학습 → 구성도를 그려 가며 70개 연결고리 암기(완전학습).',
  '3쪽 연결고리 구성도: Part 1(분홍) 8개 대주제 — 인칭(1·2·3인칭), 동사의 현재형(Be동사의 현재형·일반동사의 현재형·Have/Has), 문장의 기초(문장의 5형식·8품사·구), 문장의 종류(단문·중문·복문·서술문/명령문/기원문·감탄문), 의문문(의문문 만들기·의문문의 대답형·부가의문문·부정의문문), 명사(명사의 종류 성격·명사의 복수형·기수,서수 계절,달), 대명사(인칭,소유 복합인칭·대명사 it·의문대명사 지시대명사·부정대명사 부정형용사), 관계대명사(Who·Which·That·What). Part 2(초록) 7개 — 형용사(용법과 종류·비교급·최상급·관사), 동사(동사의 종류·불규칙 종류·ed와 -ing), 시제(12시제 현재와 과거·3인칭 단수 동사 현재 동사·미래·시제 일치), 완료와 진행(현재 완료·과거 완료 미래 완료·진행형·Going Being), 준동사(부정사·분사·동명사·관용 표현), 태(능동태·수동태), 화법(직접·간접). Part 3(파랑) 5개 — 가정법(가정법 과거·가정법의 과거완료,미래·I wish 가정법), 조동사(1·2·3), 부사(부사의 종류·부사의 형태 부사의 용법·주의할 부사들,도치·부사의 위치 비교급,최상급), 전치사(종류/목적어 부사의 위치·전치사,접속사 부사의 비교·중요 전치사들), 접속사(등위·종속). 소주제 동그라미 수: 29+23+15 = 67 (본문은 “70개”라고 함). 대주제 20개는 일치.',
  '4쪽 Part 1 목차: 인칭 5 · 동사의 현재형 10 · 문장의 기초 15 · 문장의 종류 30 · 의문문 37 · 명사 42 · 대명사 48 · 관계대명사 58 (구성도와 같은 소주제 동그라미). 구성도·목차의 “Have/Has” 소주제는 본문(10~14쪽)에 따로 없음.',
  '추출 규칙: 이 범위의 본문에는 문법 설명 문단이 없어 groups[].explanation은 모두 null(설명은 소주제 제목에만 있음). lessonRef는 그 줄에 인쇄된 (N과)만 적음 — TOPIC 1·2의 Pass-Off 줄에는 (N과)가 없어 null이고, 같은 문장의 Application 줄(appRef)에 있음. 8품사·구 Pass-Off의 “명사:”, “명사구 :” 같은 종류 라벨은 tag에 넣음.',
  '추가 필드(스키마 밖): conventions 참조 — studentMatch, analysisNote, appRef, reviewRef, correctedAnswer, answerNote, printedItemNumbers(TOPIC 1 Review 2)는 번호가 인쇄되지 않아 n은 추출자가 붙인 순번), review items[].bold, issues[].severity, stats.',
  '사이트 STUDENT 과정 문장 항목 수는 414개(content/lessons/student, sentences 블록 기준) — 2쪽의 “560여 문장”과 다름(원래 교재 문장 수 기준일 수 있음).',
].join('\n');

const topics = [
  {
    printedLabel: 'TOPIC 1', title: '인칭', pages: [5, 9], continuesFromPrevRange: false, continuesIntoNextRange: false,
    sections: [
      { kind: 'passOff', heading: '1. Pass-Off Sentences', page: 5, groups: t1po },
      { kind: 'application', heading: '2. Application Sentences', page: 5, groups: t1ap },
      t1review,
    ],
  },
  {
    printedLabel: 'TOPIC 2', title: '동사의 현재형', pages: [10, 14], continuesFromPrevRange: false, continuesIntoNextRange: false,
    sections: [
      { kind: 'passOff', heading: '1. Pass-Off Sentences', page: 10, groups: t2po },
      { kind: 'application', heading: '2. Application Sentences', page: 10, groups: t2ap },
      t2review,
    ],
  },
  {
    printedLabel: 'TOPIC 3', title: '문장의 기초', pages: [15, 29], continuesFromPrevRange: false, continuesIntoNextRange: false,
    sections: [
      { kind: 'passOff', heading: '1. Pass-Off Sentences', page: 15, groups: t3po },
      { kind: 'application', heading: '2. Application Sentences', page: 16, groups: t3ap },
      t3review,
    ],
  },
];

// ---------------------------------------------------------------- post-processing
const sentenceItems = () => topics.flatMap(t => t.sections.filter(s => s.groups).flatMap(s => s.groups.flatMap(g => g.items)));
// 1) lessonRef = the (N과) printed on that very line; the hand-entered value must agree where printed
let lrMismatch = 0;
for (const it of sentenceItems()) {
  const m = it.raw.match(/(\d+)\s*과\)/);
  const printed = m ? +m[1] : null;
  if (printed !== null && it.lessonRef !== printed) { lrMismatch++; console.log('lessonRef mismatch', it.raw, it.lessonRef); }
  it.lessonRef = printed;
}
if (lrMismatch) throw new Error('lessonRef mismatches: ' + lrMismatch);
// 2) appRef (Pass-Off -> identical Application line) and reviewRef (Korean-prompt review items that translate the sentence)
const key = s => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
for (const t of topics) {
  const po = t.sections.find(s => s.kind === 'passOff');
  const ap = t.sections.find(s => s.kind === 'application');
  const rv = t.sections.find(s => s.kind === 'review');
  for (const g of po.groups) for (const it of g.items) {
    it.appRef = null;
    ap.groups.forEach((ag, agi) => ag.items.forEach((a, ai) => { if (!it.appRef && key(a.en) === key(it.en)) { it.appRef = `application ${agi + 1}) item ${ai + 1}`; it._twin = a; } }));
    if (!it.appRef) throw new Error('no application twin for pass-off item ' + it.en);
  }
  const resolve = src => { const m = src.match(/^(passOff|application) (\d+)\) item (\d+)$/); if (!m) return null; return (m[1] === 'passOff' ? po : ap).groups[+m[2] - 1].items[+m[3] - 1]; };
  for (const k of rv.tasks) {
    k.printedItemNumbers = k.numberedInBook; delete k.numberedInBook;
    for (const r of k.items) {
      if (r.promptLang !== 'ko') continue;
      const target = resolve(r.answerSource);
      if (!target) continue;
      (target._rr = target._rr || []).push(`review ${k.no} ${r.n} (p${r.page})`);
    }
  }
  for (const g of po.groups) for (const it of g.items) {
    const u = [...(it._rr || []), ...(it._twin._rr || [])];
    it._rr = u; it._twin._rr = u;
  }
  for (const s of [po, ap]) for (const g of s.groups) for (const it of g.items) { it.reviewRef = it._rr && it._rr.length ? it._rr : null; delete it._rr; delete it._twin; }
}
// 3) correctedAnswer: the book's English answer contains an error (see issues); null otherwise
const corrected = {
  'TOPIC 1|1)|5': 'He is Daehan.',
  'TOPIC 1|1)|6': 'She is the best mother in the world.',
  'TOPIC 1|2)|4': 'Sometimes I watch TV or listen to music before I go to bed.',
  'TOPIC 1|2)|6': 'We are very close to one another.',
  'TOPIC 1|2)|13': 'Why did you make this model airplane?',
  'TOPIC 1|2)|14': 'How do you commute every day?',
  'TOPIC 1|2)|15': 'You are great workers on our farm!',
  'TOPIC 1|2)|18': 'She goes skiing every Saturday in winter.',
  'TOPIC 1|2)|21': 'He hurt my feelings, but it was not serious.',
  'TOPIC 2|3.|11': 'Rita reads the newspaper every day.',
  'TOPIC 2|3.|13': 'Rice grows in Korea.',
  'TOPIC 3|3.|13': 'I’ll be late.',
  'TOPIC 3|3.|16': 'Obesity is becoming more common.',
  'TOPIC 3|3.|18': 'They accept his proposals.',
  'TOPIC 3|3.|23': 'Will you make me some chicken soup?',
  'TOPIC 3|3.|28': 'He wants to be a firefighter, a police officer, a teacher, a doctor, or an interpreter.',
  'TOPIC 3|3.|29': 'My mother is a housewife. She is the best mother in the world.',
  'TOPIC 3|3.|42': 'I love France: its food, cities, freedom, cheese and people.',
  'TOPIC 3|3.|43': 'Bees like honey. They eat it every day.',
  'TOPIC 3|3.|48': 'Hold the rope tight, or you’re going to fall.',
  'TOPIC 3|3.|58': 'She is a girl with blond hair.',
  'TOPIC 3|3.|59': 'She gave birth to a son and named him Dangun.',
  'TOPIC 3|3.|61': 'In spite of the lack of confidence in him by many Korean people, he never lost his confidence.',
  'TOPIC 3|3.|65': 'I’ll do the shopping when I have finished washing the dishes.',
  'TOPIC 3|3.|72': 'Joshua will have finished it by the time you come back.',
};
const usedCorr = new Set();
for (const t of topics) for (const k of t.sections.find(s => s.kind === 'review').tasks) for (const r of k.items) {
  const kk = `${t.printedLabel}|${k.no}|${r.n}`;
  const c = corrected[kk] || null;
  if (c) { usedCorr.add(kk); if (!r.answerFromBook) throw new Error('correctedAnswer without answerFromBook ' + kk); }
  // keep key order: put correctedAnswer right after proposedAnswer
  const entries = Object.entries(r); const out = {};
  for (const [a, b] of entries) { out[a] = b; if (a === 'proposedAnswer') out.correctedAnswer = c; }
  Object.keys(r).forEach(x => delete r[x]); Object.assign(r, out);
}
for (const kk of Object.keys(corrected)) if (!usedCorr.has(kk)) throw new Error('unused correctedAnswer key ' + kk);
// 4) severity (impact on learners) — every issue must match exactly one rule, every rule used once
const sev = [
  [2, 'korean_typo', 'Sentences에서는', 'low'], [2, 'layout_or_extraction', '연결고리 70개', 'medium'], [2, 'korean_typo', '형성 시켜준다', 'low'], [3, 'layout_or_extraction', 'Have/Has', 'medium'],
  [5, 'english_grammar', 'She is best mother', 'high'], [5, 'english_unnatural', 'He is 대한', 'medium'], [5, 'english_grammar', 'Sometimes I watch TV', 'low'], [5, 'layout_or_extraction', 'one another .', 'low'], [5, 'english_unnatural', 'where do we go', 'low'],
  [6, 'english_grammar', 'air plane', 'medium'], [6, 'english_grammar', 'commute everyday', 'medium'], [6, 'english_grammar', 'in our farm', 'medium'], [6, 'english_grammar', 'every Saturday in winter', 'low'], [6, 'english_unnatural', 'gave me hurt', 'high'], [6, 'english_unnatural', 'too expensive', 'low'], [6, 'grammar_explanation_wrong', 'It was cold', 'low'], [6, 'layout_or_extraction', 'He is 대한.(3과)', 'low'],
  [7, 'answer_ambiguous', '학급친구들', 'medium'], [7, 'korean_typo', '그 날 동안', 'low'],
  [8, 'korean_typo', '친구 사귀기를 좋아해요', 'low'], [8, 'korean_typo', 'TV 를', 'medium'], [8, 'translation_mismatch', '기회가 있을 거야', 'medium'], [8, 'korean_typo', '20000달러', 'low'], [8, 'korean_typo', '되었나요, ?', 'low'],
  [9, 'translation_mismatch', '만들었니', 'medium'], [9, 'korean_typo', '출 퇴근', 'low'], [9, 'korean_typo', '일군', 'low'], [9, 'translation_mismatch', '매일 일찍', 'low'], [9, 'translation_mismatch', '내 수업에', 'medium'], [9, 'korean_typo', '추워서 그래서', 'low'], [9, 'translation_mismatch', '너무 어렸다', 'medium'],
  [10, 'english_grammar', 'weekend(10과)', 'low'], [10, 'english_unnatural', 'climb a tree', 'low'],
  [11, 'layout_or_extraction', 'I have many friends', 'low'], [11, 'english_unnatural', 'at the school', 'low'], [11, 'english_grammar', 'newspaper everyday', 'medium'], [11, 'english_unnatural', 'Rice grows', 'medium'],
  [12, 'translation_mismatch', '그 주의 시작', 'high'], [12, 'korean_typo', '진실로', 'low'], [12, 'answer_ambiguous', '음악듣기', 'medium'], [12, 'translation_mismatch', '남동생과', 'medium'],
  [13, 'answer_ambiguous', '비가 오니', 'low'], [13, 'translation_mismatch', '장군이', 'low'],
  [14, 'translation_mismatch', '라이스', 'high'], [14, 'korean_typo', '내방에서', 'low'],
  [15, 'answer_missing', 'Flowers bloom', 'high'], [15, 'grammar_explanation_wrong', 'interpreter. (3과)', 'high'], [15, 'english_grammar', 'interpreter.', 'medium'], [15, 'layout_or_extraction', '2과)', 'low'], [15, 'grammar_explanation_wrong', 'come true', 'medium'], [15, 'answer_ambiguous', 'take care of', 'low'],
  [16, 'english_grammar', 'with her blond', 'high'], [16, 'english_unnatural', '단군', 'medium'], [16, 'english_unnatural', 'In spite of', 'medium'], [16, 'layout_or_extraction', 'Even after', 'medium'], [16, 'grammar_explanation_wrong', '동사구', 'medium'],
  [17, 'layout_or_extraction', 'I ’ll', 'low'], [17, 'english_unnatural', 'Overweight', 'medium'], [17, 'english_unnatural', 'admit', 'high'], [17, 'english_grammar', 'chicken soup', 'medium'],
  [18, 'layout_or_extraction', 'In the world', 'low'], [18, 'english_grammar', 'France;', 'medium'],
  [19, 'english_grammar', 'everyday', 'medium'], [19, 'english_unnatural', 'convenient house', 'low'], [19, 'answer_ambiguous', 'tight', 'medium'], [19, 'grammar_explanation_wrong', 'What a nice dress', 'medium'],
  [20, 'english_grammar', 'when I finished', 'high'], [20, 'answer_ambiguous', 'in the basket', 'low'], [20, 'english_grammar', 'Joshua', 'high'], [20, 'answer_missing', '품사', 'high'],
  [24, 'korean_typo', '아드님', 'low'], [24, 'answer_ambiguous', '여기에 그가 온다', 'medium'],
  [25, 'translation_mismatch', '티나', 'medium'], [25, 'translation_mismatch', '노력한다', 'medium'], [25, 'translation_mismatch', '늦는다고', 'low'], [25, 'korean_typo', '원하는 것 하도록', 'low'],
  [26, 'korean_typo', '놀게 만들었다', 'low'], [26, 'korean_typo', '주부 이시다', 'low'],
  [27, 'translation_mismatch', '돌아다니고', 'medium'], [27, 'translation_mismatch', '외국인처럼', 'high'], [27, 'korean_typo', '자유,치즈', 'low'],
  [28, 'translation_mismatch', '항상 시간을', 'medium'], [28, 'translation_mismatch', '다음 거리', 'low'], [28, 'korean_typo', '해 냈어', 'low'], [28, 'translation_mismatch', '자신감이 없음에도', 'high'],
  [29, 'korean_typo', '할거야', 'low'], [29, 'korean_typo', '것을 의미가', 'medium'], [29, 'korean_typo', '리본을 가진', 'low'], [29, 'korean_typo', '아무것도 않는다', 'medium'], [29, 'translation_mismatch', '조슈아', 'high'],
];
const sevUsed = new Array(sev.length).fill(0);
for (const iss of issues) {
  const idx = sev.findIndex((r, i) => !sevUsed[i] && r[0] === iss.page && r[1] === iss.type && iss.text.includes(r[2]));
  if (idx < 0) throw new Error('no severity rule for issue p' + iss.page + ' ' + iss.type + ' ' + iss.text);
  sevUsed[idx]++; iss.severity = sev[idx][3];
}
if (sevUsed.some(x => x !== 1)) throw new Error('severity rules not used exactly once: ' + sev.filter((r, i) => sevUsed[i] !== 1).map(r => r.join('/')).join('; '));

const conventions = {
  en: '인쇄된 영어 그대로(오타 포함). 문장 끝 (N과)와 (단수)·(복수) 같은 괄호, 8품사·구 Pass-Off의 종류 라벨은 뺌. 연속 공백만 한 칸으로 줄임.',
  raw: '인쇄된 줄 그대로(텍스트 층 기준, 이미지로 확인). 두 줄로 인쇄된 문장은 \\n으로 보존. 종류 라벨(“명사구 :” 등)이 같은 줄에 있으면 포함.',
  bold: '굵게 인쇄된 구간(PDF 글꼴 정보로 204개 모두 대조). 같은 단어가 두 번 굵으면 두 번 적음.',
  tag: '(단수)/(복수) 표시 또는 8품사·구 Pass-Off의 종류 라벨(“명사:”, “명사구 :”).',
  lessonRef: '그 줄에 인쇄된 (N과)만. Pass-Off 줄에 표시가 없으면 null — 같은 문장의 Application 줄은 appRef로 찾음.',
  studentMatch: 'content/lessons/student에서 찾은 원문 “레슨#문장번호: 원문”(추출자가 대조). 책의 (N과)가 틀린 경우도 실제 위치를 적음.',
  analysisNote: '추출자 분석(인칭·be동사·원형·형식·품사·구 종류). “추정”은 책에 표시가 없어 배열 순서로 판단한 것.',
  appRef: 'Pass-Off 문장과 같은 문장이 있는 Application 위치(대소문자·문장부호 무시 일치).',
  reviewRef: '이 문장을 한국어로 출제한 Review 문항(“review 과제번호 문항번호 (쪽)”). Pass-Off와 Application 쌍은 같은 목록을 공유. 이 범위의 모든 문장에 최소 1개 있음.',
  answerSource: 'passOff|application + 소제목 번호 + item 번호(1부터).',
  correctedAnswer: 'answerFromBook이 있지만 그 영어에 오류가 있을 때의 교정안(issues와 연결). 웹 정답으로는 교정안을, 원문은 허용 답으로 쓰는 것을 권장.',
  answerNote: '다른 정답 후보·한글과의 어긋남 등 채점 메모.',
  printedItemNumbers: '책에 문항 번호가 인쇄됐는지. false면 n은 과제 안에서 1부터 매긴 순번(TOPIC 1 Review 2)).',
  reviewBold: 'Review 품사 문제(TOPIC 3 Review 2.)는 items[].bold에 굵은 구간을 적음.',
  severity: 'issues의 추가 필드. 학습자에게 미치는 영향(high/medium/low). confidence는 문제라고 판단한 확신도.',
};
const allReview = topics.flatMap(t => t.sections.find(s => s.kind === 'review').tasks.flatMap(k => k.items));
const perPage = {};
for (const it of sentenceItems()) { perPage[it.page] = perPage[it.page] || { en: 0, koPrompt: 0, enPrompt: 0, tableRows: 0 }; perPage[it.page].en++; }
for (const r of allReview) { perPage[r.page] = perPage[r.page] || { en: 0, koPrompt: 0, enPrompt: 0, tableRows: 0 }; perPage[r.page][r.promptLang === 'ko' ? 'koPrompt' : 'enPrompt']++; }
const issuesByType = {}; for (const i of issues) issuesByType[i.type] = (issuesByType[i.type] || 0) + 1;
const stats = {
  topics: topics.map(t => ({
    topic: t.printedLabel, title: t.title,
    passOffSentences: t.sections.find(s => s.kind === 'passOff').groups.reduce((a, g) => a + g.items.length, 0),
    applicationSentences: t.sections.find(s => s.kind === 'application').groups.reduce((a, g) => a + g.items.length, 0),
    reviewTasks: t.sections.find(s => s.kind === 'review').tasks.length,
    reviewItems: t.sections.find(s => s.kind === 'review').tasks.reduce((a, k) => a + k.items.length, 0),
    tables: 0,
  })),
  reviewItems: allReview.length,
  linkedToBookSentence: allReview.filter(r => r.answerFromBook).length,
  needsNewAnswer: allReview.filter(r => !r.answerFromBook).length,
  correctedAnswers: allReview.filter(r => r.correctedAnswer).length,
  extraSlotAnswers: allReview.filter(r => r.extraSlotAnswer).length,
  itemsWithLessonRef: sentenceItems().filter(i => i.lessonRef != null).length,
  sentencesWithoutKoreanInBook: sentenceItems().filter(i => !i.reviewRef).length,
  issues: issues.length,
  issuesHighConfidence: issues.filter(i => i.confidence === 'high').length,
  issuesHighSeverity: issues.filter(i => i.severity === 'high').length,
  issuesByType,
  perPage,
};

const doc = {
  book: 'g1', pageRange: [1, 29],
  frontMatter: { introText, notes: frontNotes },
  conventions,
  topics,
  issues,
  stats,
};
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8');
console.log('stats', JSON.stringify({ ...stats, topics: undefined, perPage: undefined }));

// ---------------------------------------------------------------- counts for self-check
const count = (secs, kind) => secs.filter(s => s.kind === kind).reduce((a, s) => a + s.groups.reduce((b, g) => b + g.items.length, 0), 0);
for (const t of topics) {
  const rv = t.sections.find(s => s.kind === 'review');
  const perTask = rv.tasks.map(k => `${k.no}:${k.items.length}`).join(' ');
  const perGroupPO = t.sections.find(s => s.kind === 'passOff').groups.map(g => g.items.length).join('+');
  const perGroupAP = t.sections.find(s => s.kind === 'application').groups.map(g => g.items.length).join('+');
  console.log(t.printedLabel, t.title, 'PO', count(t.sections, 'passOff'), `(${perGroupPO})`, 'APP', count(t.sections, 'application'), `(${perGroupAP})`, 'REVIEW', rv.tasks.reduce((a, k) => a + k.items.length, 0), `[${perTask}]`);
}
const all = topics.flatMap(t => t.sections.find(s => s.kind === 'review').tasks.flatMap(k => k.items));
console.log('review items', all.length, 'answerFromBook', all.filter(x => x.answerFromBook).length, 'noAnswerSentence', all.filter(x => !x.answerFromBook).length, 'withExtraSlotAnswer', all.filter(x => x.extraSlotAnswer).length, 'answerNotes', all.filter(x => x.answerNote).length);
const byType = {}; const byConf = {};
for (const i of issues) { byType[i.type] = (byType[i.type] || 0) + 1; byConf[i.confidence] = (byConf[i.confidence] || 0) + 1; }
console.log('issues', issues.length, JSON.stringify(byType), JSON.stringify(byConf));
const perTopic = { front: 0, T1: 0, T2: 0, T3: 0 };
for (const i of issues) { if (i.page <= 4) perTopic.front++; else if (i.page <= 9) perTopic.T1++; else if (i.page <= 14) perTopic.T2++; else perTopic.T3++; }
console.log('issues by range', JSON.stringify(perTopic));
const refs = topics.flatMap(t => t.sections.filter(s => s.groups).flatMap(s => s.groups.flatMap(g => g.items)));
console.log('sentence items', refs.length, 'printed lessonRef in raw', refs.filter(x => /과\)/.test(x.raw)).length, 'studentMatch', refs.filter(x => x.studentMatch).length);
