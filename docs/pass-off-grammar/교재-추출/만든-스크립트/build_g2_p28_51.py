# -*- coding: utf-8 -*-
# Builds out/g2-p28-51.json (book g2, PDF pages 28-51: TOPIC 11 시제, TOPIC 12 완료와 진행).
# Every printed string below was copied from the PDF text layer (g2.txt) and checked against the page images.
import json, re, sys, io, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

OUT = r"C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE--claude-worktrees-korean-market-analysis-39e7fc\5adf4ccb-9cea-421f-9195-b5f31b723c7f\scratchpad\pdf\out\g2-p28-51.json"

TAIL = re.compile(r"\s*(\([^()]*\))\s*$")

def split_raw(raw):
    """Return (en, tag, lessonRef) from an exact printed line."""
    m = TAIL.search(raw)
    if m and re.search(r"[가-힣]", m.group(1)):
        inner = m.group(1)
        lm = re.fullmatch(r"\((\d+)과\)", inner)
        en = raw[:m.start()]
        if lm:
            return en, None, int(lm.group(1))
        return en, inner, None
    return raw, None, None

def norm(s):
    s = s.lower().replace("cancelled", "canceled").replace("’", "'")
    s = re.sub(r"\s+", " ", s).strip()
    return s.rstrip(". ")

# STUDENT course originals (grep of content/lessons/student, 2026-09-26)
STUDENT = {
    "I live in Seoul.": ("s1-2", "My name is Hong Gil Dong, and I live in Seoul."),
    "I have been studying English for three years so far.": ("s1-5", "I have been studying English for 3 years so far."),
    "My sister attends 한국elementary school.": ("s2-5", "My sister attends (School Name) Elementary School."),
    "She likes all kinds of animals.": ("s2-6", "My sister likes all kinds of animals."),
    "She had worked at a department store for several years.": ("s2-3", "She worked at a department store for several years."),
    "He has worked there for ten years.": ("s2-3", "He has worked there for almost ten years."),
    "He doesn’t like to talk to new people.": ("s3-2", "He/She likes to hang out and play with friends, but he/she does not like to talk to new people."),
    "His dream will come true.": ("s3-4", "He/She is a truly smart person, and I am sure that his/her dream will come true."),
    "He loves children and makes learning fun.": ("s6-2", "He/She loves children and makes learning fun."),
    "He teaches us very well.": ("s7-3", "He teaches us very well, and his class activities are always fun."),
    "I get up at six o’clock every morning.": ("s9-1", "I get up at six o’clock every morning."),
    "When I grow up, I plan on going abroad to study English in another country.": ("s16-3", "When I grow up, I plan on going abroad to study English in another country so that I can listen and speak like a native speaker of English."),
    "He became the founder of Korea.": ("s17-1", "He became the founder of Korea."),
    "They fought against the Japanese rule.": ("s17-3", "Many Koreans did not like being under the power of Japan, so they fought against Japanese rule."),
    "A civil war broke out in 1950 when armies from the North invaded the South.": ("s17-3", "The Korean War broke out in 1950 when armies from the North invaded the South."),
}
STUDENT_N = {norm(k): {"lesson": v[0], "text": v[1]} for k, v in STUDENT.items()}

def mk_item(no, page, raw, ko=None, koSource=None):
    en, tag, ref = split_raw(raw)
    return {"no": no, "page": page, "en": en, "ko": ko, "koSource": koSource, "bold": [],
            "tag": tag, "lessonRef": ref, "raw": raw, "studentSource": STUDENT_N.get(norm(en))}

# ---------------------------------------------------------------- TOPIC 11 data
T11_PASSOFF = [
    ("(1) 12시제", 28, [
        "I live in Seoul. (현재)",
        "My sister attends 한국elementary school. (현재)",
        "We are studying English, now. (현재진행)",
        "Jane has finished cleaning the room just now. (현재완료)",
        "I have been studying English for three years so far. (현재완료진행)",
        "He became the founder of Korea. (과거)",
        "They fought against the Japanese rule. (과거)",
        "He was watering the garden then. (과거진행)",
        "She had worked at a department store for several years. (과거 완료)",
        "He had been having a military service for two years when I met him. (과거완료진행)",
        "His dream will come true. (미래)",
        "Do as I tell you, you shall live. (미래)",
        "If I visit LA again, I will have been there twice. (미래완료)",
        "We will have been living here twenty-six years next year. (미래완료진행)",
    ]),
    ("(2) 현재와 과거", 28, [
        "Here he comes.",
        "I get up at six o’clock every morning. (9과)",
        "The earth moves round the sun.",
        "When I grow up, I plan on going abroad to study English in another country. (16과)",
        "A civil war broke out in 1950 when armies from the North invaded the South. (17과)",
    ]),
    ("(3) 3인칭 단수현재동사", 29, [
        "He loves children and makes learning fun. (6과)",
        "He teaches us very well. (7과)",
        "He doesn’t like to talk to new people. (3과)",
    ]),
    ("(4) 미래시제 대용", 29, [
        "He is playing tennis on Monday afternoon.",
        "The plane leaves Chicago at 11:30.",
        "What time do you finish work tomorrow?",
        "Tom is getting married next month.",
        "Are you going to watch TV tonight?",
        "She will find a lot of change.",
        "I’ll call you back when I get home from work.",
        "I’m going to read a lot of books while I’m on vacation.",
        "Wait here till I come back.",
        "Hurry up! If we don’t hurry, we’ll be late.",
        "I am gong to go around, and you should show me your paper.",
        "Mr. Jung is due to make a speech tonight.",
        "Joseph is about to send him when the mayor comes.",
        "Our plane leaves in ten minutes.",
        "Emma will call him when I meet her.",
        "If it rains tomorrow, our picnic will be canceled.",
    ]),
    ("(5) 시제 일치", 30, [
        "I know that he will do it. (주절이 현재일 때)",
        "I know that he does it.",
        "I know that he did it.",
        "I know that he has done it",
        "I know that he had done it.",
        "I know that he will have been doing it.",
        "I knew that he did it. (주절이 과거일 때)",
        "I knew that he had done it",
        "I knew that he had been doing it.",
    ]),
]

# Application sentences, no printed sub-point labels; (page, raw)
T11_APP = [
    (31, "I live in Seoul.(1과)"),
    (31, "My sister attends 한국elementary school.(2과)"),
    (31, "They play the piano."),
    (31, "She likes all kinds of animals.(2과)"),
    (31, "We are studying English, now."),
    (31, "Jane has finished cleaning the room just now."),
    (31, "I have been studying English for three years so far. (1과)"),
    (31, "He became the founder of Korea.(17과)"),
    (31, "They fought against the Japanese rule.(17과)"),
    (31, "He was watering the garden then."),
    (31, "She had worked at a department store for several years.(2과)"),
    (31, "He had been having a military service for two years when I met him."),
    (31, "His dream will come true(4과)"),
    (31, "Do as I tell you, you shall live."),
    (31, "If I visit LA again, I will have been there twice."),
    (31, "We will have been living here twenty-six years next year."),
    (31, "Here he comes."),
    (32, "I get up at six o’clock every morning. (9과)"),
    (32, "The earth moves round the sun."),
    (32, "When I grow up, I plan on going abroad to study English in another country. (16과)"),
    (32, "A civil war broke out in 1950 when armies from the North invaded the South. (17과)"),
    (32, "Bill always drinks coke."),
    (32, "My father has a talent for music."),
    (32, "God created all things on earth."),
    (32, "He was often late at the party."),
    (32, "I never heard him laugh."),
    (32, "He loves children and makes learning fun. (6과)"),
    (32, "He teaches us very well. (7과)"),
    (32, "He doesn’t like to talk to new people.. (3과)"),
    (32, "She walks to school with my brother everyday."),
    (32, "Nick reads Bible for an hour everyday."),
    (32, "Ted eats lunch at the hospital with his mother."),
    (32, "He listens to music a lot."),
    (32, "Lilly wears a red blouse today."),
    (33, "In summer, it rains a lot."),
    (33, "This is my dog and it barks a lot."),
    (33, "I am gong to go around, and you should show me your paper."),
    (33, "He is playing tennis on Monday afternoon."),
    (33, "The plane leaves Chicago at 11:30."),
    (33, "What time do you finish work tomorrow?"),
    (33, "Tom is getting married next month."),
    (33, "Are you going to watch TV tonight?"),
    (33, "She will find a lot of change."),
    (33, "I’ll call you back when I get home from work."),
    (33, "I’m going to read a lot of books while I’m on vacation."),
    (33, "Wait here till I come back."),
    (33, "Hurry up! If we don’t hurry, we’ll be late."),
    (33, "Mr. Jung is due to make a speech tonight."),
    (33, "Joseph was about to send him when the mayor came."),
    (33, "Our plane leaves in ten minutes."),
    (33, "Emma will call him when I meet her."),
    (33, "If it rains tomorrow, our picnic will be cancelled."),
]
T11_APP_GROUPS = [("(1) 12시제", 1, 16), ("(2) 현재와 과거", 17, 26),
                  ("(3) 3인칭 단수현재동사", 27, 36), ("(4) 미래시제 대용", 37, 52)]

# Review 4 (영작) Korean prompts, same order as Application (page, text)
T11_R4 = [
    (39, "나는 서울에서 살고 있다."),
    (39, "내 누이는 한국 초등학교에 다닌다."),
    (39, "그들은 피아노를 친다."),
    (39, "그녀는 모든 종류의 동물을 좋아한다."),
    (39, "우리는 지금 영어 공부를 하는 중이다."),
    (39, "제인은 막 그 방 청소를 끝냈다."),
    (39, "나는 지금까지 3년간 영어를 공부해 오고 있다."),
    (39, "그는 한국의 창립자가 되었다."),
    (39, "그들은 일본의 지배에 맞서 싸워왔다."),
    (39, "그는 그때 정원에 물을 주고 있었다."),
    (39, "그녀는 수 년 동안 백화점에서 일했었다."),
    (40, "그는 내가 그를 만났을 때, 2년 동안 군 복무 중이었다."),
    (40, "그의 꿈은 실현될 것이다."),
    (40, "내가 말한 대로 하라, 그러면 네가 살 것이다."),
    (40, "만약 내가 다시 LA를 방문한다면, 나는 그곳에 두 번째 방문이 될 것이다."),
    (40, "우리는 내년이 되면 여기서 26년간 살아오는 것이다."),
    (40, "여기로 그가 온다."),
    (40, "나는 매일 아침 6시에 일어난다."),
    (40, "지구는 태양 주변을 움직인다."),
    (40, "내가 성인이 될 때, 나는 다른 나라로 영어를 공부하러 가는 계획을 세울 것이다."),
    (40, "북쪽에서의 군대들이 남한을 침략했던 1950년대에 전쟁이 발발했다."),
    (40, "빌은 항상 콜라를 마신다."),
    (40, "저의 아버지는 음악에 재능이 있으시다."),
    (41, "신은 지구상의 모든 것을 창조하셨다."),
    (41, "그는 파티에 자주 늦었다."),
    (41, "나는 그가 웃는 것을 결코 들어본 적이 없었다."),
    (41, "그는 아이들을 사랑하고 학습을 재미있게 만든다."),
    (41, "그는 우리를 매우 잘 가르친다."),
    (41, "그는 낯선 사람들과 말하는 것을 좋아하지 않는다."),
    (41, "그녀는 매일 남동생과 함께 학교로 걸어간다."),
    (41, "닉은 매일 한 시간씩 성경을 읽는다."),
    (41, "테드는 어머니와 함께 병원에서 점심을 먹는다."),
    (41, "그는 음악을 많이 듣는다."),
    (42, "릴리는 오늘 빨간 블라우스를 입는다."),
    (42, "여름에는 비가 많이 내린다."),
    (42, "이것은 나의 개이고 그것은 많이 짓는다."),
    (42, "내가 돌아다니면, 너희들은 나에게 자신의 종이를 보여줘야 해."),
    (42, "그는 월요일 오후에 테니스를 치는 중이다."),
    (42, "비행가 11시 30분에 시카고로 떠날 예정이다."),
    (42, "너는 내일 몇 시에 일을 마치니?"),
    (42, "톰은 다음 달에 결혼할 예정이다."),
    (42, "너는 오늘밤에 TV를 볼 예정이니?"),
    (42, "그녀는 많은 변화를 발견할 것이다."),
    (43, "직장에서 집에 도착할 때 내가 네게 전화할게."),
    (43, "나는 내가 휴가를 보낼 때 많은 책을 읽을 예정이다."),
    (43, "내가 돌아올 때 여기서 기다릴게."),
    (43, "서둘러! 만약 우리가 서둘지 않는다면, 늦을 거야."),
    (43, "정선생님은 오늘 밤에 연설하기로 되어 있다."),
    (43, "조셉은 시장이 올 때, 그를 막 보내려 했다."),
    (43, "우리의 비행기는 떠날 예정이다."),
    (43, "엠마는 내가 그녀를 만날 때 그에게 전화할 것이다."),
    (43, "만약, 내일 비가 온다면, 소풍은 취소될 것이다."),
]
# corrected English answers for Review 4 (only where the printed answer is wrong); key = item number
T11_R4_FIX = {
    2: "My sister attends Hanguk Elementary School.",
    5: "We are studying English now.",
    6: "Jane has just finished cleaning the room.",
    9: "They fought against Japanese rule.",
    12: "He had been doing his military service for two years when I met him.",
    13: "His dream will come true.",
    14: "Do as I tell you, and you shall live.",
    16: "We will have been living here for twenty-six years by next year.",
    22: "Bill always drinks Coke.",
    25: "He was often late for parties.",
    29: "He doesn’t like to talk to new people.",
    30: "She walks to school with my brother every day.",
    31: "Nick reads the Bible for an hour every day.",
    34: "Lilly is wearing a red blouse today.",
    37: "I am going to go around, and you should show me your paper.",
}

# Review 1: English prompts -> (Review 4 item, Pass-Off (1) item) ; tense = printed tag
T11_R1 = [
    (34, "I live in Seoul.", 1, 1),
    (34, "My sister attends 한국elementary school.", 2, 2),
    (34, "We are studying English, now.", 5, 3),
    (34, "Jane has finished cleaning the room just now.", 6, 4),
    (34, "I have been studying English for three years so far.", 7, 5),
    (34, "He became the founder of Korea.", 8, 6),
    (34, "They fought against the Japanese rule.", 9, 7),
    (35, "He was watering the garden then.", 10, 8),
    (35, "She had worked at a department store for several years.", 11, 9),
    (35, "He had been having a military service for two years when I met him.", 12, 10),
    (35, "His dream will come true.", 13, 11),
    (35, "Do as I tell you, you shall live.", 14, 12),
    (35, "If I visit LA again, I will have been there twice.", 15, 13),
    (35, "We will have been living here twenty-six years next year.", 16, 14),
]
T11_R1_FIX = {  # corrected Korean answers
    6: "그는 한국의 건국자가 되었다.",
    7: "그들은 일본의 지배에 맞서 싸웠다.",
    9: "그녀는 수년 동안 백화점에서 일했었다.",
    13: "내가 LA를 다시 방문하면, 그곳에 두 번 가 본 것이 된다.",
    14: "내년이면 우리는 여기서 26년째 살고 있는 셈이 된다.",
}

# Review 3: English prompts -> Review 4 item (None = no matching Korean), Pass-Off (4) item
T11_R3 = [
    (37, "He is playing tennis on Monday afternoon.", 38),
    (37, "The plane leaves Chicago at 11:30.", 39),
    (37, "What time do you finish work tomorrow?", 40),
    (37, "Tom is getting married next month.", 41),
    (37, "Are you going to watch TV tonight?", 42),
    (37, "She will find a lot of change.", 43),
    (37, "I’ll call you back when I get home from work.", 44),
    (38, "I’m going to read a lot of books while I’m on vacation.", 45),
    (38, "Wait here till I come back.", 46),
    (38, "Hurry up! If we don’t hurry, we’ll be late.", 47),
    (38, "I am gong to go around, and you should show me your paper.", 37),
    (38, "Mr. Jung is due to make a speech tonight.", 48),
    (38, "Joseph is about to send him when the mayor comes.", None),
    (38, "Our plane leaves in ten minutes.", 50),
    (38, "Emma will call him when I meet her.", 51),
    (38, "If it rains tomorrow, our picnic will be canceled.", 52),
]
T11_R3_FIX = {
    1: "그는 월요일 오후에 테니스를 칠 예정이다.",
    2: "비행기는 11시 30분에 시카고를 떠난다.",
    5: "너는 오늘 밤에 TV를 볼 예정이니?",
    7: "퇴근해서 집에 도착하면 다시 전화할게.",
    9: "내가 돌아올 때까지 여기서 기다려.",
    11: "내가 돌아다닐 테니, 너희는 각자 과제물을 나에게 보여 줘야 해.",
    12: "정 선생님은 오늘 밤에 연설하기로 되어 있다.",
    14: "우리 비행기는 10분 후에 떠난다.",
    16: "만약 내일 비가 온다면, 소풍은 취소될 것이다.",
}

# ---------------------------------------------------------------- TOPIC 12 data
T12_PASSOFF = [
    ("(1) 현재 완료", 44, [
        "I have just have lunch.",
        "He has lost his key.",
        "Have you been to Seoul?",
        "He has worked there for ten years. (2과)",
    ]),
    ("(2) 과거 완료와 미래 완료", 44, [
        "Mary didn’t want to go to the movies because she had already seen the film.",
        "He had torn the tie when I got there.",
        "She had worked at a department store for several years. (2과)",
        "He had been sick for two days when the doctor came.",
        "He will have arrived there before it gets dark",
        "He will have bought a new house in a few years.",
        "I shall have met him twice if I meet him again.",
        "He will have been absent for a month tomorrow.",
    ]),
    ("(3) 진행형", 44, [
        "Bob is working this week.",
        "I was looking for something.",
        "He will be painting the house tomorrow morning.",
        "I have known him for 3years so far.",
        "The sun was shining, but the ground was wet. It had been raining.",
        "He will have been working for six days by tomorrow.",
    ]),
]
T12_APP = [
    (45, "I have just have lunch."),
    (45, "He has lost his key."),
    (45, "Have you been to Seoul?"),
    (45, "He has worked there for ten years. (2과)"),
    (45, "I have visited Japan three times."),
    (45, "Jill has seen the rainbow."),
    (45, "Have you met Tina before?"),
    (45, "How long have you lived in Korea?"),
    (45, "He has lived a whole life as a timeserver."),
    (45, "He has had a bad cold since Monday."),
    (45, "Mary didn’t want to go to the movies because she had already seen the film."),
    (45, "We had lived in London before we moved to America."),
    (45, "He had torn the tie when I got there."),
    (45, "I realized that I had left my umbrella on the cab."),
    (45, "She had worked at a department store for several years. (2과)"),
    (45, "He had been sick for two days when the doctor came."),
    (46, "He will have arrived there before it gets dark."),
    (46, "She will have finished the job by two o’clock."),
    (46, "He will have bought a new house in a few years."),
    (46, "We expect you will have arrived at our party by noon."),
    (46, "I shall have met him twice if I meet him again."),
    (46, "He will have been absent for a month tomorrow."),
    (46, "Bob is working this week."),
    (46, "Calm down. You are speaking so loudly."),
    (46, "We were walking in the park when the show was over."),
    (46, "I was looking for something."),
    (46, "He will be painting the house tomorrow morning."),
    (46, "At this time next month, I will be traveling in Je-Ju."),
    (46, "I have known him for 3years so far."),
    (46, "The sun was shining, but the ground was wet. It had been raining."),
    (46, "She had been talking to her friend on the phone when I got home."),
    (46, "He will have been working for six days by tomorrow."),
]
T12_APP_GROUPS = [("(1) 현재 완료", 1, 10), ("(2) 과거 완료와 미래 완료", 11, 22), ("(3) 진행형", 23, 32)]

T12_R3 = [
    (49, "나는 막 점심을 먹었다."),
    (49, "그는 열쇠를 잃어버렸다."),
    (49, "너는 서울에 가 본적이 있니?"),
    (49, "그는 그곳에서 10년간 일해 오고 있다."),
    (49, "나는 일본에 세 번 방문했다."),
    (49, "질은 무지개를 본 적이 있다."),
    (49, "너는 전에 티나를 본 적이 있니?"),
    (49, "얼마나 오랫동안 한국에서 살았나요?"),
    (49, "그는 평생을 기회주의자로 살아왔다."),
    (49, "그는 월요일 이후에 독감에 걸려 있다."),
    (49, "메리는 이미 그 영화를 보았기 때문에 영화관에 가기를 원하지 않았다."),
    (50, "우리는 미국에 이사오기 전에 런던에서 살았다."),
    (50, "그는 내가 그곳에 도착했을 때 끈을 찢었었다."),
    (50, "나는 택시에 우산을 두고 내렸다는 것을 깨달았다."),
    (50, "그녀는 수 년 동안 백화점에서 일해 왔었다."),
    (50, "그는 의사가 도착했을 때, 이틀 동안 아팠었다."),
    (50, "그는 어둡기 전에 도착해 있을 거야."),
    (50, "그녀는 2시까지 그 일을 마쳐 놓을 거야."),
    (50, "그는 몇 년 안에 새 집을 사 버릴 거야."),
    (50, "우리는 네가 정오까지 우리의 파티에 도착할거라고 기대해."),
    (50, "만약 내가 그를 다시 만난다면, 나는 그를 두 번 만나게 되는 것이다."),
    (50, "그는 내일이면 한달 간 결석을 한 것이 될 것이다."),
    (51, "밥은 이번 주에 일하고 있는 중이다."),
    (51, "진정해. 너는 너무 크게 말하고 있어."),
    (51, "우리는 쇼가 끝났을 때, 주차장에서 걷고 있었다."),
    (51, "나는 무언가를 찾는 중이었다."),
    (51, "그는 내일 아침까지 그 집을 칠하고 있을 것이다."),
    (51, "다음달 이맘때에, 나는 제주에 여행하고 있을 거야."),
    (51, "나는 지금까지 그를 3년간 알아왔어."),
    (51, "태양은 빛났지만, 땅은 젖었어. 비가 오고 있었을 거야."),
    (51, "그녀는 내가 집에 도착했을 때, 전화 상으로 그녀의 친구와 이야기를 하고 있었다."),
    (51, "그는 내일까지 6일간 일해 온 것이 될 것이다."),
]
T12_R3_FIX = {
    1: "I have just had lunch.",
    6: "Jill has seen a rainbow.",
    9: "He has lived his whole life as a timeserver.",
    14: "I realized that I had left my umbrella in the cab.",
    28: "At this time next month, I will be traveling in Jeju.",
    29: "I have known him for 3 years so far.",
}
# Review 2: English prompts -> Review 3 item ; tense name (not printed in the book)
T12_R2 = [
    (47, "Have you been to Seoul?", 3, "현재완료 (경험)"),
    (47, "He has worked there for ten years.(2과)", 4, "현재완료 (계속)"),
    (47, "Mary didn’t want to go to the movies because she had already seen the film.", 11, "과거완료 (had already seen: 완료·경험) — 주절 didn’t want는 과거"),
    (47, "She had worked at a department store for several years.(2과)", 15, "과거완료 (계속)"),
    (48, "He had been sick for two days when the doctor came.", 16, "과거완료 (계속) — had been sick은 be동사의 과거완료이지 진행형이 아님"),
    (48, "He will have arrived there before it gets dark", 17, "미래완료 (완료) — before절 gets는 현재형이 미래를 대신"),
    (48, "I shall have met him twice if I meet him again.", 21, "미래완료 (경험) — if절 meet은 현재형이 미래를 대신"),
    (48, "Bob is working this week.", 23, "현재진행"),
    (48, "I was looking for something.", 26, "과거진행"),
    (48, "He will be painting the house tomorrow morning.", 27, "미래진행"),
    (48, "I have known him for 3years so far.", 29, "현재완료 (계속) — '(3) 진행형'에 실려 있지만 진행형이 아님(know는 상태동사)"),
    (48, "The sun was shining, but the ground was wet. It had been raining", 30, "과거완료진행 (It had been raining) — 앞 문장은 과거진행(was shining)·과거(was wet)"),
    (48, "He will have been working for six days by tomorrow.", 32, "미래완료진행"),
]
T12_R2_FIX = {
    1: "너는 서울에 가 본 적이 있니?",
    4: "그녀는 수년 동안 백화점에서 일해 왔었다.",
    10: "그는 내일 아침에 그 집을 칠하고 있을 것이다.",
    12: "해가 비치고 있었지만 땅은 젖어 있었다. (그때까지) 비가 내리고 있었던 것이다.",
}

# ---------------------------------------------------------------- builders
def build_passoff(spec, app_items, notes):
    groups = []
    app_by_norm = {}
    for a in app_items:
        app_by_norm.setdefault(norm(a["en"]), a)
    for label, page, raws in spec:
        items = []
        for i, raw in enumerate(raws, 1):
            # page for multi-page groups: all groups here sit on one page
            it = mk_item(i, page, raw)
            a = app_by_norm.get(norm(it["en"]))
            if a is not None:
                it["ko"], it["koSource"] = a["ko"], a["koSource"]
                it["sameAsApplication"] = a["no"]
            else:
                it["sameAsApplication"] = None
            items.append(it)
        groups.append({"label": label, "labelPrinted": True, "inferredLabel": None,
                       "explanation": None, "items": items})
    return {"kind": "passOff", "heading": "1. Pass-Off Sentences", "page": spec[0][1],
            "notes": notes, "groups": groups}

def build_app(app_rows, groups_spec, ko_rows, ko_task_label, first_page, notes):
    items = []
    for n, (page, raw) in enumerate(app_rows, 1):
        kpage, ktext = ko_rows[n - 1]
        items.append(mk_item(n, page, raw, ko=ktext, koSource=f"{ko_task_label} item {n} (p{kpage})"))
    groups = []
    for label, a, b in groups_spec:
        groups.append({"label": None, "labelPrinted": False, "inferredLabel": label,
                       "explanation": None, "items": items[a - 1:b]})
    assert sum(len(g["items"]) for g in groups) == len(items)
    return {"kind": "application", "heading": "2. Application Sentences", "page": first_page,
            "notes": notes, "groups": groups}, items

def review_item(n, page, prompt, lang, extraSlot=None, answer=None, source="none",
                proposed=None, extraAns=None, corrected=None, **extra):
    d = {"n": str(n), "page": page, "prompt": prompt, "promptLang": lang, "extraSlot": extraSlot,
         "answerFromBook": answer, "answerSource": source, "proposedAnswer": proposed,
         "extraSlotAnswer": extraAns, "correctedAnswer": corrected}
    d.update(extra)
    return d

# ---------------------------------------------------------------- TOPIC 11 assembly
t11_app_sec, t11_app = build_app(
    T11_APP, T11_APP_GROUPS, T11_R4, "review 4.", 31,
    "Application에는 소단원 제목이 인쇄되어 있지 않음. groups는 Pass-Off 소단원 순서에 맞춰 추출자가 나눈 것(labelPrinted=false, inferredLabel). "
    "52문장 = Pass-Off 47문장 중 (1)~(4)의 38문장(Joseph 문장은 과거형 'was about to … came'으로 바뀜, (5) 시제 일치 9문장은 빠짐) + 새 문장 14개. "
    "문장 안 굵은 글씨 없음. ko는 책의 Review 4번(한→영 영작)에 인쇄된 한국어 문제문을 같은 순서로 붙인 것(koSource).")
t11_passoff_sec = build_passoff(
    T11_PASSOFF, t11_app,
    "설명문 없음. (1) 12시제의 각 문장 뒤 시제 태그는 굵게 인쇄(Seoul./school./twice. 세 줄은 태그 앞 마침표까지 굵음). "
    "영어 문장 안에는 굵은 단어가 없음(PDF 글꼴 정보로 확인) → bold는 모두 []. (1)에는 과 표시가 없고 같은 문장이 Application에서 (N과)를 달고 나옴. "
    "(5)의 '(주절이 현재일 때)'는 1~6번, '(주절이 과거일 때)'는 7~9번 묶음 표시인데 첫 문장 뒤에만 인쇄됨. "
    "ko/koSource는 같은 문장이 Application에 있을 때 그 한국어(Review 4번)를 옮긴 것; (5) 9문장과 (4) 13번(Joseph, 현재형)은 한국어가 책에 없음.")

r1_items = []
for n, (page, prompt, k, p) in enumerate(T11_R1, 1):
    tag = T11_PASSOFF[0][2][p - 1]
    tense = split_raw(tag)[1].strip("()")
    r1_items.append(review_item(
        n, page, prompt, "en", extraSlot="( ) 해당되는 시제 이름",
        answer=T11_R4[k - 1][1],
        source=f"review 4. item {k} (책에 인쇄된 한국어 문제문 = 이 문장의 번역); 영어 원문 passOff (1) item {p} / application item {k}",
        extraAns=tense, corrected=T11_R1_FIX.get(n)))

r2_specs = [
    ("I know that ____", "I know that he does it.", "I know that he will do it.", 1),
    ("I know that ____", "I know that he does it.", "I know that he did it.", 3),
    ("I know that ____", "I know that he does it.", "I know that he has done it", 4),
    ("I know that ____", "I know that he does it.", "I know that he had done it.", 5),
    ("I know that ____", "I know that he does it.", "I know that he will have been doing it.", 6),
    ("I knew that he ____", "I knew that he did it.", "I knew that he had done it", 8),
    ("I knew that he ____", "I knew that he did it.", "I knew that he had been doing it.", 9),
]
r2_items = []
for n, (prompt, box, ans, p) in enumerate(r2_specs, 1):
    r2_items.append(review_item(
        n, 36, prompt, "en", answer=ans,
        source=f"passOff (5) item {p} (빈칸 순서는 책에 정해져 있지 않음 — 예문 순서대로 배정)",
        box=box))

r3_items = []
for n, (page, prompt, k) in enumerate(T11_R3, 1):
    if k is None:
        r3_items.append(review_item(
            n, page, prompt, "en", answer=None,
            source="none (책의 가장 가까운 한국어 review 4. item 49 '조셉은 시장이 올 때, 그를 막 보내려 했다.'는 과거형 Application 문장 'Joseph was about to send him when the mayor came.'의 번역이라 이 현재형 문장과 시제가 맞지 않음); 영어 원문 passOff (4) item 13",
            proposed="시장이 올 때 조셉은 막 그를 보내려는 참이다."))
    else:
        r3_items.append(review_item(
            n, page, prompt, "en", answer=T11_R4[k - 1][1],
            source=f"review 4. item {k} (책에 인쇄된 한국어 문제문 = 이 문장의 번역); 영어 원문 passOff (4) item {n} / application item {k}",
            corrected=T11_R3_FIX.get(n)))

r4_items = []
po_lookup = {}
for label, page, raws in T11_PASSOFF:
    for i, raw in enumerate(raws, 1):
        po_lookup.setdefault(norm(split_raw(raw)[0]), f"{label.split(' ')[0]} item {i}")
for n, (page, ko) in enumerate(T11_R4, 1):
    a = t11_app[n - 1]
    po = po_lookup.get(norm(a["en"]))
    src = f"application item {n} (p{a['page']})" + (f" = passOff {po}" if po else " (Application에만 있는 문장)")
    r4_items.append(review_item(n, page, ko, "ko", answer=a["en"], source=src,
                                corrected=T11_R4_FIX.get(n)))

t11_review = {
    "kind": "review", "heading": "Review", "page": 34,
    "notes": "Review 문항 문장은 모두 굵게 인쇄. 문항 번호는 인쇄되어 있지 않아 n은 추출자가 붙인 순번. "
             "영→한 과제(1·3번)의 answerFromBook은 같은 Review 4번에 인쇄된 한국어 문제문(책 속 번역)이고, 4번(한→영)의 answerFromBook은 Application 영어 문장이다. "
             "그래서 1·3번과 4번은 서로의 답을 보여 준다. correctedAnswer는 책의 답이 틀렸을 때만 넣은 고친 답(추출자 작성)이고, 이유는 issues에 있다.",
    "tasks": [
        {"no": "1.", "page": 34, "instruction": "다음 문장을 보고 한국말로 해석한 후 해당되는 시제를 적어보세요.",
         "taskTypes": ["en_to_ko_translate", "name_tense"],
         "notes": "번호가 '1.다음'처럼 붙어 인쇄됨. 각 문장 아래 해석용 긴 밑줄과 오른쪽 괄호 ( ). 14문장 = Pass-Off (1) 12시제 14문장과 같은 순서. extraSlotAnswer는 Pass-Off (1)의 굵은 태그 그대로(9번 태그는 '과거 완료'로 띄어 인쇄).",
         "items": r1_items},
        {"no": "2.", "page": 36, "instruction": "다음 네모 안에 있는 문장의 종속절을 이용하여 빈 칸에 올 수 있는 시제들로 문장을 영작하시오.",
         "taskTypes": ["tense_transform_compose", "fill_blank"],
         "notes": "네모 박스 2개(굵게): 'I know that he does it.' 아래 빈칸 5줄('I know that ____'), 'I knew that he did it.' 아래 빈칸 2줄('I knew that he ____'). 밑줄 길이는 '____'로 통일해 적음. box = 해당 네모 문장. 순서 무관·다른 정답 가능(issues 참조).",
         "items": r2_items},
        {"no": "3.", "page": 37, "instruction": "다음의 문장들을 시제에 주의하여 해석하시오.",
         "taskTypes": ["en_to_ko_translate"],
         "notes": "각 문장 아래 해석용 밑줄 한 줄. 16문장 = Pass-Off (4) 미래시제 대용 16문장과 같은 순서(13번 Joseph 문장은 Pass-Off의 현재형).",
         "items": r3_items},
        {"no": "4.", "page": 39, "instruction": "다음의 문장들을 영작하시오.",
         "taskTypes": ["ko_to_en_compose"],
         "notes": "한국어 52문장 = Application 52문장의 번역, 같은 순서. 번호·답 쓰는 줄 없이 빈 공간만 있음.",
         "items": r4_items},
    ],
}

# ---------------------------------------------------------------- TOPIC 12 assembly
t12_app_sec, t12_app = build_app(
    T12_APP, T12_APP_GROUPS, T12_R3, "review 3.", 45,
    "Application에는 소단원 제목이 인쇄되어 있지 않음. groups는 Pass-Off 소단원 순서에 맞춰 추출자가 나눈 것. "
    "32문장 = Pass-Off 18문장 전부 + 새 문장 14개. 문장 안 굵은 글씨 없음. ko는 Review 3번(영작)의 한국어 문제문(koSource).")
t12_passoff_sec = build_passoff(
    T12_PASSOFF, t12_app,
    "설명문·시제 태그 없음(TOPIC 11과 다름). 소단원 제목 3개만 굵게. 영어 문장 안 굵은 글씨 없음 → bold는 모두 []. "
    "ko/koSource는 같은 문장의 Application 한국어(Review 3번)를 옮긴 것.")

t12_r1 = [review_item(1, 47, None, None, extraSlot="빈 공간에 공식 6개(완료 3 + 진행 3) 쓰기",
                      answer=None, source="none (책에 공식이 인쇄되어 있지 않음)",
                      proposed="현재완료: have/has + p.p. / 과거완료: had + p.p. / 미래완료: will have + p.p. / 현재진행: am/is/are + ~ing / 과거진행: was/were + ~ing / 미래진행: will be + ~ing")]
t12_r2 = []
po12 = {}
for label, page, raws in T12_PASSOFF:
    for i, raw in enumerate(raws, 1):
        po12.setdefault(norm(split_raw(raw)[0]), f"{label.split(' ')[0]} item {i}")
for n, (page, prompt, k, tense) in enumerate(T12_R2, 1):
    a = t12_app[k - 1]
    t12_r2.append(review_item(
        n, page, prompt, "en", extraSlot="시제의 이름 (답 쓰는 괄호·줄이 인쇄되어 있지 않음)",
        answer=T12_R3[k - 1][1],
        source=f"review 3. item {k} (책에 인쇄된 한국어 문제문 = 이 문장의 번역); 영어 원문 passOff {po12[norm(split_raw(prompt)[0])]} / application item {k}",
        extraAns=tense, corrected=T12_R2_FIX.get(n)))
t12_r3 = []
for n, (page, ko) in enumerate(T12_R3, 1):
    a = t12_app[n - 1]
    po = po12.get(norm(a["en"]))
    src = f"application item {n} (p{a['page']})" + (f" = passOff {po}" if po else " (Application에만 있는 문장)")
    t12_r3.append(review_item(n, page, ko, "ko", answer=a["en"], source=src, corrected=T12_R3_FIX.get(n)))

t12_review = {
    "kind": "review", "heading": "Review", "page": 47,
    "notes": "Review 문항 문장은 모두 굵게 인쇄(지시문은 보통체). n은 추출자가 붙인 순번. 2번(영→한)의 answerFromBook은 3번에 인쇄된 한국어 문제문, 3번(한→영)의 answerFromBook은 Application 영어 문장.",
    "tasks": [
        {"no": "1.", "page": 47, "instruction": "완료시제 3가지와 진행시제 3가지의 공식을 적어보세요.",
         "taskTypes": ["write_formula"],
         "notes": "지시문 아래 큰 빈 공간만 있음(줄·칸 없음). 개별 문항이 인쇄되어 있지 않아 item 1개로 기록, prompt=null.",
         "items": t12_r1},
        {"no": "2.", "page": 47, "instruction": "다음을 해석하고 시제의 이름을 적으시오.",
         "taskTypes": ["en_to_ko_translate", "name_tense"],
         "notes": "13문장 = Pass-Off 18문장 중 (1) 1·2번, (2) 2·6·8번을 뺀 나머지, 같은 순서. 답 쓰는 밑줄·괄호 없이 빈 공간만 있음. "
                  "시제 이름 정답은 책에 없음(이 토픽 예문에는 시제 태그가 없음) → extraSlotAnswer는 추출자가 작성. 2·4번 문장에는 '(2과)'가 붙어 인쇄됨.",
         "items": t12_r2},
        {"no": "3.", "page": 49, "instruction": "다음 문장들을 영작하시오.",
         "taskTypes": ["ko_to_en_compose"],
         "notes": "한국어 32문장 = Application 32문장의 번역, 같은 순서. 첫 문항 앞에만 '(1)'이 인쇄되고 나머지는 번호 없음(prompt에는 '(1)'을 빼고 적음).",
         "items": t12_r3},
    ],
}

# ---------------------------------------------------------------- issues
def iss(page, where, text, typ, problem, fix, conf):
    return {"page": page, "where": where, "text": text, "type": typ, "problem": problem, "fix": fix, "confidence": conf}

ISSUES = [
    # ---- TOPIC 11 English / explanation
    iss(28, "TOPIC 11 passOff (1) 소단원 제목", "(1) 12시제", "grammar_explanation_wrong",
        "'12시제'라는 제목 아래 14문장이 있지만 시제는 11가지뿐이다(현재·현재진행·현재완료·현재완료진행·과거·과거진행·과거완료·과거완료진행·미래·미래완료·미래완료진행). 미래진행 예문이 빠졌고 현재·과거·미래는 2문장씩 겹친다. 12시제 표도 없다.",
        "미래진행 예문 추가: 'He will be watering the garden at this time tomorrow. (미래진행)' (또는 TOPIC 12의 'He will be painting the house tomorrow morning.')", "high"),
    iss(28, "TOPIC 11 passOff (1) item 4 · application item 6 (p31) · review 1. item 4 (p34)",
        "Jane has finished cleaning the room just now.", "english_grammar",
        "just now(방금 전)는 과거 시점을 가리키는 부사라 현재완료와 함께 쓰지 않는다(학교 문법의 대표 오답 유형). 그런데 현재완료의 모범 예문으로 실려 있어 틀린 규칙을 외우게 된다.",
        "Jane has just finished cleaning the room. (한국어 '제인은 막 그 방 청소를 끝냈다.'는 그대로 맞음)", "high"),
    iss(28, "TOPIC 11 passOff (1) item 2 · application item 2 (p31) · review 1. item 2 (p34)",
        "My sister attends 한국elementary school.", "english_grammar",
        "영어 문장 속에 한글 '한국'이 섞여 있고 학교 이름이 소문자다. STUDENT s2-5 원문은 'My sister attends (School Name) Elementary School.'로, 학교 이름 자리에 '한국'을 넣은 것이다. 이대로는 음성(TTS)으로 읽을 수 없다.",
        "My sister attends Hanguk Elementary School.", "high"),
    iss(28, "TOPIC 11 passOff (1) item 10 · application item 12 (p31) · review 1. item 10 (p35)",
        "He had been having a military service for two years when I met him.", "english_unnatural",
        "'have a military service'는 쓰지 않는 표현이다(군 복무는 do one's military service / serve in the military).",
        "He had been doing his military service for two years when I met him.", "high"),
    iss(28, "TOPIC 11 passOff (1) item 12 · application item 14 (p31) · review 1. item 12 (p35)",
        "Do as I tell you, you shall live.", "english_grammar",
        "명령문과 결과절을 쉼표만으로 이은 comma splice다('명령문, and …' 구문이어야 한다). 또 2인칭 you shall은 말하는 사람의 의지·약속을 나타내는 고어체라 단순 '미래' 예문으로는 알맞지 않다.",
        "Do as I tell you, and you shall live. (단순미래 예문으로 쓰려면 'Do as I tell you, and you will live.')", "medium"),
    iss(28, "TOPIC 11 passOff (1) item 9 · application item 11 (p31) · review 1. item 9 (p35) / TOPIC 12 passOff (2) item 3 (p44) · application item 15 (p45) · review 2. item 4 (p47)",
        "She had worked at a department store for several years.", "english_unnatural",
        "기준이 되는 과거 시점 없이 과거완료만 홀로 쓰여 부자연스럽다. STUDENT s2-3 원문은 단순과거 'She worked at a department store for several years.'(사이트 번역 '그분은 몇 년 동안 백화점에서 일하셨습니다.')인데, 책이 과거완료 예문으로 바꾸면서 기준 시점을 빠뜨렸다.",
        "She had worked at a department store for several years before she got married. (기준 시점 추가 — 또는 원문대로 단순과거로 두고 과거완료 예문은 따로)", "medium"),
    iss(28, "TOPIC 11 passOff (1) item 7 · application item 9 (p31) · review 1. item 7 (p34)",
        "They fought against the Japanese rule.", "english_unnatural",
        "'Japanese rule'(일제의 지배) 앞의 the는 불필요하다. STUDENT s17-3 원문도 '…so they fought against Japanese rule.'",
        "They fought against Japanese rule.", "low"),
    iss(28, "TOPIC 11 passOff (1) item 14 · application item 16 (p31) · review 1. item 14 (p35)",
        "We will have been living here twenty-six years next year.", "english_unnatural",
        "기간 앞의 for가 빠졌고, 미래완료진행의 기준 시점은 'by next year'가 더 분명하다.",
        "We will have been living here for twenty-six years by next year.", "low"),
    iss(28, "TOPIC 11 passOff (1) item 3 · application item 5 (p31) · review 1. item 3 (p34)",
        "We are studying English, now.", "english_unnatural",
        "now 앞의 쉼표는 불필요하다.", "We are studying English now.", "low"),
    iss(28, "TOPIC 11 passOff (1) item 9 태그", "(과거 완료)", "korean_typo",
        "다른 태그는 모두 붙여 썼는데('현재완료', '과거완료진행') 이 태그만 띄어 써 표기가 일관되지 않다.",
        "(과거완료)", "low"),
    iss(28, "TOPIC 11 passOff (2) item 4 · application item 20 (p32)",
        "When I grow up, I plan on going abroad to study English in another country.", "english_unnatural",
        "abroad와 in another country가 같은 뜻으로 겹친다. STUDENT s16-3 원문(…so that I can listen and speak like a native speaker of English.)을 줄인 문장이며 원문에도 같은 겹침이 있다.",
        "When I grow up, I plan on going abroad to study English. (원문 영어를 바꾸면 사이트 음성 클립도 다시 만들어야 함)", "low"),
    iss(29, "TOPIC 11 passOff (4) item 11 · application item 37 (p33) · review 3. item 11 (p38)",
        "I am gong to go around, and you should show me your paper.", "english_grammar",
        "gong은 going의 오타다.", "I am going to go around, and you should show me your paper.", "high"),
    iss(29, "TOPIC 11 passOff (4) item 13 (p29) · review 3. item 13 (p38) ↔ application item 49 (p33)",
        "Joseph is about to send him when the mayor comes.", "english_unnatural",
        "'be about to ~ when …'은 '막 ~하려던 참에 …했다'는 과거 서술 구문이라 현재형은 어색하다. 같은 문장이 Application(p33)에서는 'Joseph was about to send him when the mayor came.'이고 영작 문제(p43)의 한국어도 과거형('막 보내려 했다')이어서 책 안에서 서로 다르다.",
        "Joseph was about to send him when the mayor came. (세 곳을 이 과거형 하나로 통일)", "medium"),
    iss(29, "TOPIC 11 passOff (4) item 6 · application item 43 (p33) · review 3. item 6 (p37)",
        "She will find a lot of change.", "grammar_explanation_wrong",
        "'미래시제 대용' 소단원 예문인데 대용 표현(현재진행·현재·be going to·be due to·be about to·시간/조건절의 현재형)이 없는 단순 will 미래다. 'change'는 '잔돈'으로도 읽혀 뜻도 모호하다.",
        "She will find a lot of changes when she comes back. (when절 현재형이 미래를 대신하는 예)", "low"),
    iss(29, "TOPIC 11 passOff (4) item 15 · application item 51 (p33) · review 3. item 15 (p38)",
        "Emma will call him when I meet her.", "english_unnatural",
        "문법은 맞지만 '내가 에마를 만날 때 에마가 그에게 전화한다'는 상황이 어색하다.",
        "I will call him when I meet Emma.", "low"),
    iss(33, "TOPIC 11 application item 52 (p33) ↔ passOff (4) item 16 (p29) · review 3. item 16 (p38)",
        "If it rains tomorrow, our picnic will be cancelled.", "english_unnatural",
        "같은 문장이 p29·p38은 canceled(미국식), p33은 cancelled(영국식)로 철자가 다르다. 둘 다 맞는 철자지만 한 교재 안에서는 통일해야 하고, 자동 채점은 두 철자를 모두 받아야 한다.",
        "If it rains tomorrow, our picnic will be canceled. (채점은 두 철자 모두 허용)", "low"),
    iss(30, "TOPIC 11 passOff (5) item 4 · item 8", "I know that he has done it / I knew that he had done it", "english_grammar",
        "두 문장 끝에 마침표가 없다.", "I know that he has done it. / I knew that he had done it.", "low"),
    iss(30, "TOPIC 11 passOff (5) 시제 일치 전체", "(5) 시제 일치", "grammar_explanation_wrong",
        "설명 없이 예문만 있고, 시제 일치의 핵심인 '주절이 과거면 will→would, 현재→과거, 과거·현재완료→과거완료' 가운데 would·was ~ing 예문이 없다. 반면 현재 주절 목록의 'I know that he had done it.'과 'I know that he will have been doing it.'은 기준 시점이 없어 홀로 쓰면 어색하다. 시제 일치의 예외(변하지 않는 진리·역사적 사실)도 다루지 않는다.",
        "주절 과거 예문 추가: 'I knew that he would do it.', 'I knew that he was doing it.' / 현재 주절 예문에 시점 추가: 'I know that he had done it before he left.', 'I know that he will have been doing it for ten years by then.'", "medium"),
    iss(31, "TOPIC 11 application item 13", "His dream will come true(4과)", "layout_or_extraction",
        "마침표가 빠졌고 과 표시도 틀렸다. 이 문장은 STUDENT s3-4('…I am sure that his/her dream will come true.')에 있어 3과이며, 4과(s4-*)에는 'dream'이 나오는 문장이 없다.",
        "His dream will come true.(3과)", "medium"),
    iss(32, "TOPIC 11 application item 29", "He doesn’t like to talk to new people.. (3과)", "english_grammar",
        "마침표가 두 번 찍혀 있다.", "He doesn’t like to talk to new people. (3과)", "low"),
    iss(32, "TOPIC 11 application item 30 · review 4. item 30 (p41)", "She walks to school with my brother everyday.", "english_grammar",
        "everyday는 형용사(일상의)이고 '매일'이라는 부사는 every day로 띄어 쓴다. 한국어 문제문 '그녀는 매일 남동생과 함께…'는 my(내)가 빠져 누구의 동생인지 모호하다.",
        "She walks to school with my brother every day. / 그녀는 매일 내 남동생과 함께 학교에 걸어간다.", "high"),
    iss(32, "TOPIC 11 application item 31 · review 4. item 31 (p41)", "Nick reads Bible for an hour everyday.", "english_grammar",
        "성경은 정관사를 붙여 the Bible이고, everyday는 every day로 띄어야 한다.",
        "Nick reads the Bible for an hour every day.", "high"),
    iss(32, "TOPIC 11 application item 34 · review 4. item 34 (p42)", "Lilly wears a red blouse today.", "english_unnatural",
        "today(오늘 하루의 일시적 상태)와 함께라면 현재진행형이 자연스럽다. 3인칭 단수 현재 예문으로 쓰려면 today 대신 습관을 나타내는 말이 필요하다. 한국어 '오늘 빨간 블라우스를 입는다'도 같은 문제.",
        "Lilly is wearing a red blouse today. / 릴리는 오늘 빨간 블라우스를 입고 있다. (단순현재를 살리려면 'Lilly often wears a red blouse.')", "high"),
    iss(32, "TOPIC 11 application item 25 · review 4. item 25 (p41)", "He was often late at the party.", "english_unnatural",
        "often(자주)과 the party(특정한 한 번의 파티)가 맞지 않고, '~에 늦다'는 late for다.",
        "He was often late for parties.", "medium"),
    iss(32, "TOPIC 11 application item 22", "Bill always drinks coke.", "english_unnatural",
        "상표명 Coke는 대문자로 쓴다(소문자 coke는 다른 뜻도 있다).", "Bill always drinks Coke.", "low"),
    # ---- TOPIC 11 Korean prompts / translations
    iss(36, "TOPIC 11 review 2. 지시문", "빈 칸에 올 수 있는 시제들로", "korean_typo",
        "'빈칸'은 한 단어다.", "빈칸에 올 수 있는 시제들로", "low"),
    iss(36, "TOPIC 11 review 2. items 1~7", "I know that ____ (5칸) / I knew that he ____ (2칸)", "answer_ambiguous",
        "빈칸 순서가 정해져 있지 않고, 책 예문(p30) 말고도 맞는 답이 많다(현재 주절: he is doing it, he has been doing it, he will be doing it 등 / 과거 주절: he would do it, he was doing it, he would have done it 등). 책이 기대하는 답은 p30 예문뿐이다.",
        "웹에서는 칸마다 목표 시제를 지정하거나(예: '현재완료로'), 순서 무관 + 허용 답안 목록으로 채점", "medium"),
    iss(39, "TOPIC 11 review 4. item 8 (+ review 1. item 6의 답)", "그는 한국의 창립자가 되었다.", "translation_mismatch",
        "'창립자'는 회사·단체에 쓰는 말이고 나라에는 '건국자/시조'가 맞다. 사이트 STUDENT s17-1 번역도 '그는 한국의 건국자가 되었습니다.'",
        "그는 한국의 건국자가 되었다.", "medium"),
    iss(39, "TOPIC 11 review 4. item 9 (+ review 1. item 7의 답)", "그들은 일본의 지배에 맞서 싸워왔다.", "translation_mismatch",
        "영어는 단순과거(fought, 책 태그도 '과거')인데 '싸워왔다'는 현재완료(진행)처럼 읽혀, 시제 단원에서 시제가 어긋난다.",
        "그들은 일본의 지배에 맞서 싸웠다.", "high"),
    iss(39, "TOPIC 11 review 4. item 11 (p39) · TOPIC 12 review 3. item 15 (p50)", "그녀는 수 년 동안 백화점에서 일했었다.", "korean_typo",
        "'수년'(數年)은 한 단어라 붙여 쓴다.",
        "그녀는 수년 동안 백화점에서 일했었다. / 그녀는 수년 동안 백화점에서 일해 왔었다.", "low"),
    iss(40, "TOPIC 11 review 4. item 15 (+ review 1. item 13의 답)", "만약 내가 다시 LA를 방문한다면, 나는 그곳에 두 번째 방문이 될 것이다.", "translation_mismatch",
        "'나는 … 방문이 될 것이다'는 주어와 서술어가 맞지 않는 비문이다. 영어 'I will have been there twice'의 '두 번 가 본 셈이 된다'는 뜻도 살지 않는다.",
        "내가 LA를 다시 방문하면, 그곳에 두 번 가 본 것이 된다.", "medium"),
    iss(40, "TOPIC 11 review 4. item 16 (+ review 1. item 14의 답)", "우리는 내년이 되면 여기서 26년간 살아오는 것이다.", "translation_mismatch",
        "어색한 직역이다.", "내년이면 우리는 여기서 26년째 살고 있는 셈이 된다.", "low"),
    iss(40, "TOPIC 11 review 4. item 17", "여기로 그가 온다.", "translation_mismatch",
        "'Here he comes.'는 '저기 그가 온다/그가 이리로 오고 있다'는 관용 표현이라 '여기로 그가 온다'는 어색하다.",
        "저기 그가 온다.", "low"),
    iss(40, "TOPIC 11 review 4. item 19", "지구는 태양 주변을 움직인다.", "translation_mismatch",
        "'moves round the sun'은 '태양 주위를 돈다'가 자연스럽다.", "지구는 태양 주위를 돈다.", "low"),
    iss(40, "TOPIC 11 review 4. item 20", "내가 성인이 될 때, 나는 다른 나라로 영어를 공부하러 가는 계획을 세울 것이다.", "translation_mismatch",
        "영어 'I plan on going…'은 현재(지금 계획하고 있다)인데 한국어는 '계획을 세울 것이다'(미래)로 시제가 바뀌었다. 'When I grow up'(시간 부사절의 현재형이 미래를 대신)이라는 요점도 흐려진다.",
        "나는 커서 영어를 공부하러 다른 나라로 유학 갈 계획이다.", "high"),
    iss(40, "TOPIC 11 review 4. item 21 (+ passOff (2) item 5 · application item 21)", "북쪽에서의 군대들이 남한을 침략했던 1950년대에 전쟁이 발발했다.", "translation_mismatch",
        "'in 1950'을 '1950년대'(1950s)로 잘못 옮겼고 '북쪽에서의 군대들'은 어색하다. 영어도 STUDENT s17-3 원문 'The Korean War broke out in 1950…'을 'A civil war'로 바꿔 놓았다.",
        "1950년 북한군이 남한을 침략하면서 전쟁이 일어났다. (영어도 원문대로 'The Korean War broke out in 1950 when armies from the North invaded the South.' 권장)", "high"),
    iss(40, "TOPIC 11 review 4. item 23", "저의 아버지는 음악에 재능이 있으시다.", "korean_typo",
        "겸양 표현 '저의'와 해라체 '있으시다'가 섞여 말투가 맞지 않는다.", "우리 아버지는 음악에 재능이 있으시다.", "low"),
    iss(42, "TOPIC 11 review 4. item 36", "이것은 나의 개이고 그것은 많이 짓는다.", "korean_typo",
        "'짓는다'(만들다)는 오타이고, 개가 소리를 내는 것은 '짖는다'이다. '이것은 나의 개이고 그것은'도 어색하다.",
        "이 개는 우리 개인데 많이 짖는다.", "high"),
    iss(42, "TOPIC 11 review 4. item 37 (+ review 3. item 11의 답)", "내가 돌아다니면, 너희들은 나에게 자신의 종이를 보여줘야 해.", "translation_mismatch",
        "'your paper'는 '과제물/답안지'이고 '종이'는 어색하다. be going to의 '~할 테니' 뜻도 살리는 편이 좋다.",
        "내가 돌아다닐 테니, 너희는 각자 과제물을 나에게 보여 줘야 해.", "low"),
    iss(42, "TOPIC 11 review 4. item 38 (+ review 3. item 1의 답)", "그는 월요일 오후에 테니스를 치는 중이다.", "translation_mismatch",
        "'미래시제 대용' 예문(현재진행형으로 정해진 미래 일정)인데 '치는 중이다'(지금 진행 중)로 옮겨 단원의 요점과 반대로 가르친다.",
        "그는 월요일 오후에 테니스를 칠 예정이다.", "high"),
    iss(42, "TOPIC 11 review 4. item 39 (+ review 3. item 2의 답)", "비행가 11시 30분에 시카고로 떠날 예정이다.", "translation_mismatch",
        "'비행가'는 '비행기가'의 오타이고, 'leaves Chicago'는 '시카고를 떠난다(시카고에서 출발)'인데 '시카고로'(시카고를 향해)로 뜻이 바뀌었다.",
        "비행기는 11시 30분에 시카고를 떠난다.", "high"),
    iss(42, "TOPIC 11 review 4. item 42 (+ review 3. item 5의 답)", "너는 오늘밤에 TV를 볼 예정이니?", "korean_typo",
        "'오늘 밤'은 띄어 쓴다.", "너는 오늘 밤에 TV를 볼 예정이니?", "low"),
    iss(43, "TOPIC 11 review 4. item 44 (+ review 3. item 7의 답)", "직장에서 집에 도착할 때 내가 네게 전화할게.", "translation_mismatch",
        "'call you back'의 '다시(회신)'가 빠졌고 '직장에서 집에 도착할 때'가 어색하다.",
        "퇴근해서 집에 도착하면 다시 전화할게.", "low"),
    iss(43, "TOPIC 11 review 4. item 46 (+ review 3. item 9의 답)", "내가 돌아올 때 여기서 기다릴게.", "translation_mismatch",
        "'Wait here till I come back.'은 상대에게 '내가 돌아올 때까지 여기서 기다려'라고 하는 명령인데, 한국어는 '내가 기다릴게'로 주어와 뜻이 바뀌었고 till(~까지)도 빠졌다.",
        "내가 돌아올 때까지 여기서 기다려.", "high"),
    iss(43, "TOPIC 11 review 4. item 48 (+ review 3. item 12의 답)", "정선생님은 오늘 밤에 연설하기로 되어 있다.", "korean_typo",
        "성과 호칭은 띄어 쓴다('정 선생님'). Mr.는 '선생님'보다 '씨'가 정확하다.",
        "정 선생님은 오늘 밤에 연설하기로 되어 있다.", "low"),
    iss(43, "TOPIC 11 review 4. item 49", "조셉은 시장이 올 때, 그를 막 보내려 했다.", "translation_mismatch",
        "Application 영어는 'when the mayor came'(과거)이라 '시장이 왔을 때'가 맞다.",
        "시장이 왔을 때 조셉은 막 그를 보내려던 참이었다.", "low"),
    iss(43, "TOPIC 11 review 4. item 50 (+ review 3. item 14의 답)", "우리의 비행기는 떠날 예정이다.", "translation_mismatch",
        "'in ten minutes'(10분 후에)가 빠졌다.", "우리 비행기는 10분 후에 떠난다.", "high"),
    iss(43, "TOPIC 11 review 4. item 52 (+ review 3. item 16의 답)", "만약, 내일 비가 온다면, 소풍은 취소될 것이다.", "korean_typo",
        "'만약' 뒤 쉼표는 불필요하다.", "만약 내일 비가 온다면, 소풍은 취소될 것이다.", "low"),
    # ---- TOPIC 12 English / explanation
    iss(44, "TOPIC 12 passOff (1) item 1 · application item 1 (p45)", "I have just have lunch.", "english_grammar",
        "현재완료는 have + 과거분사인데 두 번째 have가 원형이다(had의 오타). 현재완료 단원의 첫 문장이라 영향이 크다.",
        "I have just had lunch.", "high"),
    iss(44, "TOPIC 12 passOff (2) item 5 (p44) · review 2. item 6 (p48)", "He will have arrived there before it gets dark", "english_grammar",
        "마침표가 없다(Application p46에는 있다).", "He will have arrived there before it gets dark.", "low"),
    iss(44, "TOPIC 12 passOff (3) item 4 · application item 29 (p46) · review 2. item 11 (p48)", "I have known him for 3years so far.", "english_grammar",
        "'3years'는 띄어 써야 한다.", "I have known him for 3 years so far.", "high"),
    iss(44, "TOPIC 12 passOff (3) item 4", "(3) 진행형 — I have known him for 3years so far.", "grammar_explanation_wrong",
        "'(3) 진행형' 소단원에 진행형이 아닌 현재완료 문장이 들어 있다. 순서상 현재완료진행 자리인데, know는 상태동사라 진행형을 쓰지 않는다는 설명이 없어 학생이 이 문장을 '현재완료진행'으로 오해하기 쉽다.",
        "현재완료진행 예문으로 바꾸고('I have been learning English for 3 years so far.'), 'know는 상태동사라 진행형 대신 현재완료'라는 설명을 따로 붙임", "medium"),
    iss(48, "TOPIC 12 review 2. item 12 (p48) ↔ passOff (3) item 5 (p44)", "The sun was shining, but the ground was wet. It had been raining", "english_grammar",
        "Review 쪽 문장 끝 마침표가 없다(p44·p46에는 있다).",
        "The sun was shining, but the ground was wet. It had been raining.", "low"),
    iss(44, "TOPIC 12 passOff (2) item 2 · application item 13 (p45) · review 3. item 13 (p50)", "He had torn the tie when I got there.", "translation_mismatch",
        "tie는 '넥타이'인데 한국어 문제문(p50)은 '끈'이다. 영어도 'his tie'와 already를 쓰면 '도착했을 때 이미 찢어져 있었다'는 과거완료 뜻이 분명해진다.",
        "He had already torn his tie when I got there. / 내가 그곳에 도착했을 때 그는 이미 넥타이를 찢어 놓은 상태였다.", "medium"),
    iss(45, "TOPIC 12 application item 6 · review 3. item 6 (p49)", "Jill has seen the rainbow.", "english_unnatural",
        "경험('무지개를 본 적이 있다')이면 특정한 무지개를 가리키는 the보다 a가 자연스럽다.",
        "Jill has seen a rainbow.", "low"),
    iss(45, "TOPIC 12 application item 9 · review 3. item 9 (p49)", "He has lived a whole life as a timeserver.", "english_unnatural",
        "'a whole life'가 아니라 'his whole life'가 맞다. timeserver(기회주의자)는 드문 단어라 학습자 수준에 맞지 않는다(보통 opportunist).",
        "He has lived his whole life as a timeserver. (쉬운 단어로: …as an opportunist.)", "medium"),
    iss(45, "TOPIC 12 application item 14 · review 3. item 14 (p50)", "I realized that I had left my umbrella on the cab.", "english_grammar",
        "택시(cab/taxi) 안에 두고 내린 것은 in the cab이다(bus·train은 on).",
        "I realized that I had left my umbrella in the cab.", "medium"),
    iss(46, "TOPIC 12 application item 28 · review 3. item 28 (p51)", "At this time next month, I will be traveling in Je-Ju.", "english_unnatural",
        "'Je-Ju'는 표준 로마자 표기가 아니다(공식 표기 'Jeju'이고 사이트 STUDENT s20-5도 'Jeju'). 한국어 문제문의 '다음달', '제주에 여행하고'도 '다음 달', '제주를 여행하고'가 맞다.",
        "At this time next month, I will be traveling in Jeju. / 다음 달 이맘때 나는 제주를 여행하고 있을 거야.", "medium"),
    # ---- TOPIC 12 Korean prompts / translations
    iss(49, "TOPIC 12 review 3. item 3 (+ review 2. item 1의 답)", "너는 서울에 가 본적이 있니?", "korean_typo",
        "'본 적'의 '적'은 의존명사라 띄어 쓴다.", "너는 서울에 가 본 적이 있니?", "low"),
    iss(49, "TOPIC 12 review 3. item 5", "나는 일본에 세 번 방문했다.", "translation_mismatch",
        "현재완료 '경험'을 살리려면 '~한 적이 있다'가 좋고, '방문하다'는 '일본을'이 자연스럽다.",
        "나는 일본을 세 번 방문한 적이 있다.", "low"),
    iss(49, "TOPIC 12 review 3. item 7", "너는 전에 티나를 본 적이 있니?", "translation_mismatch",
        "met은 '보다'가 아니라 '만나다'.", "너는 전에 티나를 만난 적이 있니?", "low"),
    iss(49, "TOPIC 12 review 3. item 8", "얼마나 오랫동안 한국에서 살았나요?", "translation_mismatch",
        "현재완료 '계속'(지금도 살고 있음)인데 '살았나요'는 끝난 과거로 읽힌다.",
        "한국에서 산 지 얼마나 되었나요?", "low"),
    iss(49, "TOPIC 12 review 3. item 10", "그는 월요일 이후에 독감에 걸려 있다.", "translation_mismatch",
        "'since Monday'는 '월요일부터'이고, 'a bad cold'는 '심한 감기'이지 '독감'(flu)이 아니다.",
        "그는 월요일부터 심한 감기에 걸려 있다.", "medium"),
    iss(50, "TOPIC 12 review 3. item 12", "우리는 미국에 이사오기 전에 런던에서 살았다.", "korean_typo",
        "'이사 오다'는 띄어 쓴다.", "우리는 미국으로 이사 오기 전에 런던에서 살았다.", "low"),
    iss(50, "TOPIC 12 review 3. item 19", "그는 몇 년 안에 새 집을 사 버릴 거야.", "translation_mismatch",
        "'사 버리다'는 아쉬움·완결의 어감이 섞여 어색하다. 미래완료 뜻은 '샀을 거야/사 두었을 거야'.",
        "그는 몇 년 안에 새 집을 샀을 거야.", "low"),
    iss(50, "TOPIC 12 review 3. item 20", "우리는 네가 정오까지 우리의 파티에 도착할거라고 기대해.", "korean_typo",
        "'할 거라고'는 띄어 쓴다. 미래완료 뜻을 살리면 '도착해 있을 거라고'.",
        "우리는 네가 정오까지 우리 파티에 도착해 있을 거라고 기대해.", "low"),
    iss(50, "TOPIC 12 review 3. item 22", "그는 내일이면 한달 간 결석을 한 것이 될 것이다.", "korean_typo",
        "'한 달간'으로 띄어 쓴다('간'은 접미사).", "그는 내일이면 한 달간 결석한 것이 된다.", "low"),
    iss(51, "TOPIC 12 review 3. item 25", "우리는 쇼가 끝났을 때, 주차장에서 걷고 있었다.", "translation_mismatch",
        "park는 '공원'인데 '주차장'(parking lot)으로 잘못 옮겼다.",
        "쇼가 끝났을 때 우리는 공원에서 걷고 있었다.", "high"),
    iss(51, "TOPIC 12 review 3. item 27 (+ review 2. item 10의 답)", "그는 내일 아침까지 그 집을 칠하고 있을 것이다.", "translation_mismatch",
        "'tomorrow morning'은 '내일 아침에'인데 '내일 아침까지'(until)로 뜻이 바뀌었다.",
        "그는 내일 아침에 그 집을 칠하고 있을 것이다.", "high"),
    iss(51, "TOPIC 12 review 3. item 30 (+ review 2. item 12의 답)", "태양은 빛났지만, 땅은 젖었어. 비가 오고 있었을 거야.", "translation_mismatch",
        "'was shining'(과거진행)과 'It had been raining'(사실 서술: 그때까지 비가 오고 있었다)을 '빛났지만', '오고 있었을 거야'(추측)로 옮겨 시제와 뜻이 달라졌다.",
        "해가 비치고 있었지만 땅은 젖어 있었다. (그때까지) 비가 내리고 있었던 것이다.", "medium"),
    iss(51, "TOPIC 12 review 3. item 31", "그녀는 내가 집에 도착했을 때, 전화 상으로 그녀의 친구와 이야기를 하고 있었다.", "korean_typo",
        "'전화상'은 붙여 쓰며 '전화로'가 더 자연스럽다. 과거완료진행(그때까지 계속 통화하고 있었다)의 뜻도 약하다.",
        "내가 집에 도착했을 때, 그녀는 (그때까지) 친구와 전화로 이야기하고 있었다.", "low"),
    # ---- TOPIC 12 answer keys
    iss(47, "TOPIC 12 review 1.", "1. 완료시제 3가지와 진행시제 3가지의 공식을 적어보세요.", "answer_missing",
        "공식(have/has + p.p. 등)이 이 토픽 어디에도 인쇄되어 있지 않아 학생이 예문에서 스스로 찾아야 하고 정답도 없다. 완료진행(have been ~ing 등)은 예문으로 배웠는데 묻지 않는다.",
        "정답: 현재완료 have/has + p.p. · 과거완료 had + p.p. · 미래완료 will have + p.p. / 현재진행 am/is/are + ~ing · 과거진행 was/were + ~ing · 미래진행 will be + ~ing (웹에서는 공식 표를 먼저 보여 주거나 빈칸형으로)", "medium"),
    iss(47, "TOPIC 12 review 2. (13문항)", "2. 다음을 해석하고 시제의 이름을 적으시오.", "answer_missing",
        "TOPIC 11과 달리 이 토픽 예문에는 시제 이름 태그가 없어 시제 이름 정답이 책에 없다(소단원 제목 '과거 완료와 미래 완료', '진행형'으로 일부만 짐작 가능). 답을 쓸 괄호나 줄도 인쇄되어 있지 않다.",
        "시제 이름 정답을 새로 작성(이 JSON의 extraSlotAnswer), 웹에서는 드롭다운 선택형으로", "medium"),
    iss(47, "TOPIC 12 review 2. item 3 · item 5 · item 11 · item 12",
        "Mary didn’t want…had already seen the film. / He had been sick… / I have known him… / The sun was shining… It had been raining", "answer_ambiguous",
        "한 문장에 시제가 둘 이상 있어(3번: 과거+과거완료, 12번: 과거진행·과거·과거완료진행) 어느 시제 이름을 써야 하는지 정해져 있지 않다. 5번 'had been sick'은 과거완료진행으로, 11번은 '(3) 진행형'에 실려 있어 현재완료진행으로 잘못 답하기 쉽다.",
        "웹에서는 시제를 물을 동사에 밑줄/강조를 넣어 대상 동사를 하나로 지정", "medium"),
    iss(49, "TOPIC 12 review 3. 번호", "(1) 나는 막 점심을 먹었다.", "layout_or_extraction",
        "첫 문항에만 '(1)'이 붙고 나머지 31문항은 번호가 없다(TOPIC 11 review 4는 52문항 모두 번호 없음).",
        "모든 문항에 1~32 번호를 붙임", "low"),
]

# confidence = how sure the problem is real; severity = learning impact (extra field). Order = ISSUES order.
SEV = "HHHHMMLLLL" + "LHMLLLLMML" + "HHHMLLMMHL" + "MLLLHHLHLH" + "HLLHLLHLHL" + "MMLMLMMMLL" + "LLMLLLLHHM" + "LMMML"
CONF = "HHHHHMMLMH" + "MHHMLHHMHH" + "HHHMLHHHHH" + "HMMMHHMHMH" + "HHMHHMHMHH" + "HHHHLMHHHM" + "MMHHMHHHHH" + "MHHHH"
assert len(SEV) == len(CONF) == len(ISSUES), (len(SEV), len(CONF), len(ISSUES))
LV = {"H": "high", "M": "medium", "L": "low"}
for i, (s, c) in enumerate(zip(SEV, CONF)):
    ISSUES[i]["confidence"] = LV[c]
    ISSUES[i]["severity"] = LV[s]
    print(f"  issue {i+1:2d} conf={LV[c]:6s} sev={LV[s]:6s} p{ISSUES[i]['page']} {ISSUES[i]['text'][:50]}")

# ---------------------------------------------------------------- final document
doc = {
    "book": "g2",
    "pageRange": [28, 51],
    "frontMatter": {
        "introText": None,
        "notes": "범위 안에 표지·특징/학습법·연결고리 구성도·목차 쪽은 없음. 모든 쪽 위에 회색 띠 'The Revolution of English Education', 배경에 사선 워터마크 'Pass-Off English', 아래에 쪽 번호와 'Pass-Off English 패스오프 잉글리쉬' 로고. "
                 "토픽 시작 쪽(p28, p44)은 화살표 모양 'TOPIC 11/12' 배너 + 제목('시   제'는 글자 사이를 띄어 인쇄) + '1. Pass-Off Sentences' 탭.",
    },
    "extractionNotes": "스키마 외 추가 필드: items.no(섹션 안 순번), items.koSource(ko를 가져온 Review 위치), items.studentSource(같은 문장이 있는 STUDENT 레슨과 원문), "
                       "passOff items.sameAsApplication(같은 문장의 Application 순번), groups.labelPrinted/inferredLabel(Application은 소제목 미인쇄라 추출자가 추정), "
                       "sections/tasks.notes, review items.correctedAnswer(책의 답이 틀릴 때만 고친 답), review items.box(TOPIC 11 review 2의 네모 문장). "
                       "bold는 영어 문장 안의 굵은 단어 목록인데 이 범위에는 하나도 없음(PDF 글꼴 정보 확인). 영어·한국어 문자열은 PDF 텍스트층에서 그대로 복사(’ 곡선 아포스트로피 유지), 오타도 그대로 두고 issues에 기록. "
                       "issues.confidence는 '실제 문제라는 확신의 정도'(심각도 아님), issues.severity(추가 필드)는 학습에 미치는 영향의 크기. "
                       "이 추출과 검사는 같은 에이전트가 했음(독립 검수 아님).",
    "topics": [
        {"printedLabel": "TOPIC 11", "title": "시제", "pages": [28, 43],
         "continuesFromPrevRange": False, "continuesIntoNextRange": False,
         "sections": [t11_passoff_sec, t11_app_sec, t11_review]},
        {"printedLabel": "TOPIC 12", "title": "완료와 진행", "pages": [44, 51],
         "continuesFromPrevRange": False, "continuesIntoNextRange": False,
         "sections": [t12_passoff_sec, t12_app_sec, t12_review]},
    ],
    "issues": ISSUES,
}

# ---------------------------------------------------------------- self-checks
def walk_counts():
    en_by_page = collections.Counter()
    ko_by_page = collections.Counter()
    stats = {}
    for t in doc["topics"]:
        s = {"passOff": 0, "application": 0, "reviewTasks": 0, "reviewItems": 0}
        for sec in t["sections"]:
            if sec["kind"] in ("passOff", "application"):
                for g in sec["groups"]:
                    for it in g["items"]:
                        s[sec["kind"]] += 1
                        en_by_page[it["page"]] += 1
            elif sec["kind"] == "review":
                s["reviewTasks"] += len(sec["tasks"])
                for task in sec["tasks"]:
                    for it in task["items"]:
                        s["reviewItems"] += 1
                        if it["promptLang"] == "en":
                            en_by_page[it["page"]] += 1
                        elif it["promptLang"] == "ko":
                            ko_by_page[it["page"]] += 1
        stats[t["printedLabel"]] = s
    return en_by_page, ko_by_page, stats

en_by_page, ko_by_page, stats = walk_counts()
# expected counts per page, counted by eye on the page images
EXP_EN = {28: 19, 29: 19, 30: 9, 31: 17, 32: 17, 33: 18, 34: 7, 35: 7, 36: 7, 37: 7, 38: 9,
          44: 18, 45: 16, 46: 16, 47: 4, 48: 9}
EXP_KO = {39: 11, 40: 12, 41: 10, 42: 10, 43: 9, 49: 11, 50: 11, 51: 10}
ok = True
for p in range(28, 52):
    e, k = en_by_page.get(p, 0), ko_by_page.get(p, 0)
    ee, kk = EXP_EN.get(p, 0), EXP_KO.get(p, 0)
    flag = "" if (e == ee and k == kk) else "  <-- MISMATCH"
    if flag:
        ok = False
    print(f"p{p}: en {e}/{ee}  ko {k}/{kk}{flag}")
print(stats)

# every review answer must be traceable
linked = sum(1 for t in doc["topics"] for sec in t["sections"] if sec["kind"] == "review"
             for task in sec["tasks"] for it in task["items"] if it["answerFromBook"] is not None)
need_new = sum(1 for t in doc["topics"] for sec in t["sections"] if sec["kind"] == "review"
               for task in sec["tasks"] for it in task["items"] if it["answerFromBook"] is None)
corrected = sum(1 for t in doc["topics"] for sec in t["sections"] if sec["kind"] == "review"
                for task in sec["tasks"] for it in task["items"] if it["correctedAnswer"] is not None)
print("review items linked:", linked, "needNew:", need_new, "corrected:", corrected)

# pass-off items that did not find an Application twin (expected: T11 (5) x9 + Joseph)
for t in doc["topics"]:
    for sec in t["sections"]:
        if sec["kind"] == "passOff":
            for g in sec["groups"]:
                for it in g["items"]:
                    if it["sameAsApplication"] is None:
                        print("no application twin:", t["printedLabel"], g["label"], it["no"], it["en"])

# Korean prompt / English answer alignment spot checks
assert T11_R4[36][1].startswith("내가 돌아다니면") and t11_app[36]["en"].startswith("I am gong")
assert T11_R4[48][1].startswith("조셉은") and t11_app[48]["en"].startswith("Joseph was")
assert T12_R3[24][1].startswith("우리는 쇼가") and t12_app[24]["en"].startswith("We were walking")
assert len(T11_R4) == len(T11_APP) == 52 and len(T12_R3) == len(T12_APP) == 32

sev = collections.Counter(i["confidence"] for i in ISSUES)
typ = collections.Counter(i["type"] for i in ISSUES)
print("issues:", len(ISSUES), dict(sev), dict(typ))

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)
print("wrote", OUT, "OK" if ok else "WITH PAGE-COUNT MISMATCH")
