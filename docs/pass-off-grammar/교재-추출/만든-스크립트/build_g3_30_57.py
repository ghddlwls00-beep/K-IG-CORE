# -*- coding: utf-8 -*-
# Builds out/g3-p30-57.json (Pass-Off Grammar book 3, TOPIC 19 전치사 + TOPIC 20 접속사)
import json, os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "g3-p30-57.json")

# ---------------------------------------------------------------- STUDENT sources
# (current site text; "orig" = text in the initial import commit 3705523 when it differs)
STU = {
 "in7":   {"file": "s7-2", "textNow": "I want to learn to speak English fluently in the future because I know that English will be helpful in my future job."},
 "at7":   {"file": "s7-3", "textNow": "Some of my friends are really good at memorizing words and phrases."},
 "with6": {"file": "s6-3", "textNow": "Sometimes, he/she speaks with a regional accent!", "textOriginal": "Sometimes, He/She speaks with a funny accent!"},
 "of6":   {"file": "s6-3", "textNow": "He/She has a habit of touching his/her nose when he/she teaches."},
 "for8":  {"file": "s8-4", "textNow": "After I finish watching TV, I do a little review to prepare for school, write in my journal, and then go to bed.", "textOriginal": "After I finish watching T.V, I do a little review to prepare for school, write in my journal, and then go to bed."},
 "about9":{"file": "s9-3", "textNow": "When we eat, my father usually talks about his day, and we share our experiences."},
 "before5":{"file": "s5-3", "textNow": "At 8:30 in the morning, we meet before class with our teacher for the morning session.", "textOriginal": "At 8:30 in the morning, we meet before class with our teacher for morning session."},
 "after10":{"file": "s10-2", "textNow": "I want to stay in bed longer, and after a few minutes, I finally get out of bed."},
 "by5":   {"file": "s5-2", "textNow": "I can get to school more quickly by bicycle than I can on foot."},
 "rel4":  {"file": "s4-2", "textNow": "I have many relatives because my father and mother have many brothers and sisters."},
 "because3":{"file": "s3-2", "textNow": "Because of this, I have many friends."},
 "since13":{"file": "s13-1", "textNow": "When I was young, I learned to like history books and novels because I could read about the wisdom of many people.", "textOriginal": "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people."},
 "since17":{"file": "s17-4", "textNow": "Since the end of the war in 1953, the country has developed very quickly, especially during the 1970s.", "textOriginal": "Since the end of the war in 1953, the country began to develop very quickly, especially during the 1970’s."},
 "subj1": {"file": "s1-5", "textNow": "I study many different subjects at school, but my favorite subject is English."},
 "eve9":  {"file": "s9-3", "textNow": "What I Do in the Evening (나의 저녁 일과)", "note": "레슨 제목(문장 아님)"},
 "sun11": {"file": "s11-4", "textNow": "I like visiting my relatives on Sunday afternoons."},
 "week10":{"file": "s10-1~s10-5", "textNow": "Chapter 10. What Do I Do during the Week? (평일 일과)", "note": "10과 단원 제목"},
 "dept":  {"file": "s2-3", "textNow": "She worked at a department store for several years.", "textOriginal": "She had worked at a department store for several years.", "note": "책은 (1과)로 표기했지만 실제로는 2과"},
 "around1":{"file": "s1-3", "textNow": "I love to be around my friends, and they like to be around me."},
 "journal9":{"file": "s9-3", "textNow": "After that, I quickly write in my journal about my day."},
 "land20":{"file": "s20-1", "textNow": "The land of Korea is a peninsula located between China and Japan and is surrounded by three seas: the East Sea, the West Sea, and the South Sea."},
 "ruled17":{"file": "s17-3", "textNow": "Later, Korea was ruled by Japan from 1910 to 1945.", "textOriginal": "For a while, Korea was ruled by Japan."},
 "allow5":{"file": "s5-1", "textNow": "Before I go to school, my mother gives me my allowance."},
 "glad8": {"file": "s8-1", "textNow": "When I come home after school, my mother is always glad to see me."},
 "three17":{"file": "s17-2", "textNow": "After Gojoseon fell, the Korean Peninsula was divided into three kingdoms: Goguryeo, Baekje, and Silla.", "textOriginal": "After Gojoson fell, the Korean Peninsula was divided into three kingdoms: Goguryo, Baekje, and Shilla."},
 "best3": {"file": "s3-1", "textNow": "He/She is one of my best friends."},
 "learn3":{"file": "s3-3", "textNow": "So I can learn a lot from him/her."},
 "proud3":{"file": "s3-3", "textNow": "He/She is my friend, and I am proud of him/her."},
 "hist13":{"file": "s13-2", "textNow": "He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself."},
 "visit4":{"file": "s4-3", "textNow": "Some of my aunts and uncles live near my house so I often go and visit them, or they come and visit me."},
 "noisy5":{"file": "s5-3", "textNow": "While the teacher is conducting the morning session, the students are very noisy so the teacher has to shout at us to get us to quiet down."},
 "chat10":{"file": "s10-4", "textNow": "Every night when I get home, I chat on the computer with my friends."},
 "walk5": {"file": "s5-2", "textNow": "As I am walking to school, I often see my friends, so we walk to school together."},
 "bday11":{"file": "s11-1", "textNow": "Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon."},
 "fri10": {"file": "s10-5", "textNow": "My favorite time is Friday night because it is the start of the weekend."},
 "comm16":{"file": "s16-2", "textNow": "Finally, if I go to another country, the people might not understand Korean, so I must learn to speak English well so that I can communicate with them comfortably."},
 "hard10":{"file": "s10-3", "textNow": "Even though it is hard work, I am happy to learn new things and spend time with my friends."},
}

def item(page, raw, en, ref=None, tag=None, bold=None, ul=None, label=None, focus=None,
         role=None, po=None, stu=None, note=None):
    d = {"page": page, "itemLabel": label, "en": en, "ko": None,
         "bold": bold or [], "underlined": ul or [], "tag": tag, "lessonRef": ref,
         "raw": raw, "focusInferred": focus or []}
    if role: d["role"] = role
    d["passOffRef"] = po
    if stu: d["studentSource"] = STU[stu]
    if note: d["note"] = note
    return d

# ============================================================== TOPIC 19 전치사
t19_po1 = [
 item(30, "in : I want to learn to speak English in the future. (7과)", "I want to learn to speak English in the future.", 7, label="in :", focus=["in"], stu="in7"),
 item(30, "at : Some of my friends are really good at memorizing words and phrases. (7과)", "Some of my friends are really good at memorizing words and phrases.", 7, label="at :", focus=["at"], stu="at7"),
 item(30, "with : He speaks with a funny accent! (6과)", "He speaks with a funny accent!", 6, label="with :", focus=["with"], stu="with6"),
 item(30, "of : He has a habit of touching his nose. (6과)", "He has a habit of touching his nose.", 6, label="of :", focus=["of"], stu="of6"),
 item(30, "for : I do a little interview to prepare for school. (8과)", "I do a little interview to prepare for school.", 8, label="for :", focus=["for"], stu="for8", note="STUDENT 8과 원문은 'a little review'. 'interview'는 오식(issues 참조)."),
 item(30, "about : When we eat, my father usually talks about his day. (9과)", "When we eat, my father usually talks about his day.", 9, label="about :", focus=["about"], stu="about9"),
 item(30, "in spite of : In spite of the rain, they enjoyed themselves", "In spite of the rain, they enjoyed themselves", None, label="in spite of :", focus=["In spite of"]),
 item(30, "before : We meet before class with our teacher for morning session. (5과)", "We meet before class with our teacher for morning session.", 5, label="before :", focus=["before"], stu="before5"),
 item(30, "after : After a few minutes , I finally get out of bed. (10과)", "After a few minutes , I finally get out of bed.", 10, label="after :", focus=["After"], stu="after10"),
 item(30, "by : I can get to school more quickly by bicycle than I can on foot. (5과)", "I can get to school more quickly by bicycle than I can on foot.", 5, label="by :", focus=["by"], stu="by5"),
 item(30, "without : Finally she could succeed without their help.", "Finally she could succeed without their help.", None, label="without :", focus=["without"]),
]
t19_po2 = [
 item(30, "Although it rained a lot, they enjoyed themselves.", "Although it rained a lot, they enjoyed themselves.", focus=["Although"], note="접속사(although)"),
 item(30, "= In spite of the rain, they enjoyed themselves. (= Despite)", "In spite of the rain, they enjoyed themselves.", tag="(= Despite)", focus=["In spite of"], role="paraphrase", note="앞 문장의 전치사 바꿔쓰기"),
 item(30, "I have many relatives because my father and have many brothers and sisters. (4과)", "I have many relatives because my father and have many brothers and sisters.", 4, focus=["because"], stu="rel4", note="'my mother'가 빠진 오식(p34 적용 문장에는 있음)"),
 item(30, "Because of this, I have many friends. (3과)", "Because of this, I have many friends.", 3, focus=["Because of"], stu="because3"),
 item(30, "Let’s wait until it stops raining.", "Let’s wait until it stops raining.", focus=["until"], note="접속사 until(뒤에 절)"),
 item(30, "I didn’t get up until half past ten.", "I didn’t get up until half past ten.", focus=["until"], note="전치사 until(뒤에 명사구)"),
 item(30, "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people. (13과)", "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people.", 13, focus=["Since"], stu="since13", note="인쇄상 두 줄. 접속사 since"),
 item(30, "Since the end of the war in 1953, the country began to develop very quickly. (17과)", "Since the end of the war in 1953, the country began to develop very quickly.", 17, focus=["Since"], stu="since17", note="전치사 since"),
]
t19_po3 = [
 item(31, "I study many different subjects at school. (1과)", "I study many different subjects at school.", 1, focus=["at"], stu="subj1"),
 item(31, "What do I do in the evening? (9과)", "What do I do in the evening?", 9, focus=["in"], stu="eve9"),
 item(31, "I like visiting my relatives on Sunday afternoons. (11과)", "I like visiting my relatives on Sunday afternoons.", 11, focus=["on"], stu="sun11"),
 item(31, "I can draw his face within my memory.", "I can draw his face within my memory.", focus=["within"]),
 item(31, "What do I do during the week? (10과)", "What do I do during the week?", 10, focus=["during"], stu="week10"),
 item(31, "She had worked at a department store for several years. (1과)", "She had worked at a department store for several years.", 1, focus=["at", "for"], stu="dept"),
 item(31, "The sun came through the window.", "The sun came through the window.", focus=["through"]),
 item(31, "I love to be around my friends. (1과)", "I love to be around my friends.", 1, focus=["around"], stu="around1"),
 item(31, "After that, I quickly write in my journal about my day. (9과)", "After that, I quickly write in my journal about my day.", 9, focus=["After", "in"], stu="journal9"),
 item(31, "I like to walk along the park with my dog.", "I like to walk along the park with my dog.", focus=["along"]),
 item(31, "The land of Korea is a peninsula located between China and Japan. (20과)", "The land of Korea is a peninsula located between China and Japan.", 20, focus=["between"], stu="land20"),
 item(31, "My house is a cottage among the trees.", "My house is a cottage among the trees.", focus=["among"]),
 item(31, "Her house is beside the river.", "Her house is beside the river.", focus=["beside"]),
 item(31, "For a while, Korea was ruled by Japan. (17과)", "For a while, Korea was ruled by Japan.", 17, focus=["by"], stu="ruled17"),
 item(31, "Before I go to school, my mother gives me my allowance. (5과)", "Before I go to school, my mother gives me my allowance.", 5, focus=["Before"], stu="allow5", note="before가 절을 이끄는 접속사 용법(issues 참조). TOPIC 19 적용·리뷰에는 없고 TOPIC 20 적용(p50)·리뷰(p57)에 나옴"),
 item(31, "The child hid behind the door.", "The child hid behind the door.", focus=["behind"]),
 item(31, "When I come home after school, my mother is always glad to see me. (8과)", "When I come home after school, my mother is always glad to see me.", 8, focus=["after"], stu="glad8", note="TOPIC 19 적용·리뷰에는 없고 TOPIC 20 적용(p48)·리뷰(p54)에 나옴"),
 item(31, "The Korean Peninsula was divided into three kingdoms. (17과)", "The Korean Peninsula was divided into three kingdoms.", 17, focus=["into"], stu="three17"),
 item(31, "A bridge over a river", "A bridge over a river", focus=["over"], note="문장이 아닌 명사구"),
 item(31, "He/She is one of my best friends. (3과)", "He/She is one of my best friends.", 3, focus=["of"], stu="best3"),
 item(31, "So I can learn a lot from him/her. (3과)", "So I can learn a lot from him/her.", 3, focus=["from"], stu="learn3"),
 item(31, "After a few minutes, I finally get out of bed. (10과)", "After a few minutes, I finally get out of bed.", 10, focus=["After"], stu="after10", note="(1) after 항목과 같은 문장(반복)"),
 item(31, "I mailed the letter today, so they receive it by Monday. (월요일까지는 받을 것임)", "I mailed the letter today, so they receive it by Monday.", tag="(월요일까지는 받을 것임)", focus=["by"]),
 item(31, "Fred will be away until Monday. (프레드가 월요일에는 돌아올 것임)", "Fred will be away until Monday.", tag="(프레드가 월요일에는 돌아올 것임)", focus=["until"]),
 item(31, "Jane’s car broke down on the way to the party. By the time she arrived, most of the other guest had left. (그 즈음에)", "Jane’s car broke down on the way to the party. By the time she arrived, most of the other guest had left.", tag="(그 즈음에)", focus=["on", "By the time"], note="인쇄상 두 줄, 두 문장이 한 항목. 적용 섹션(p37)에서는 두 항목으로 나뉨"),
]

# ---- Application (p32-37)
def a(page, raw, en, ref=None, ul=None, focus=None, **kw):
    return item(page, raw, en, ref, ul=ul, focus=focus if focus is not None else list(ul or []), **kw)

t19_app = [
 {"label": "in :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "in : I want to learn to speak English in the future. (7과)", "I want to learn to speak English in the future.", 7, ["in"], label="in :", po="passOff 1) item 1", stu="in7"),
   a(32, "I am going to go on holiday in February.", "I am going to go on holiday in February.", None, ["in"]),
   a(32, "Do you often go out in the evening?", "Do you often go out in the evening?", None, ["in"]),
 ]},
 {"label": "at :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "at : Some of my friends are really good at memorizing words and phrases. (7과)", "Some of my friends are really good at memorizing words and phrases.", 7, ["at"], label="at :", po="passOff 1) item 2", stu="at7"),
   a(32, "I start my daily routines at 7:00.", "I start my daily routines at 7:00.", None, ["at"]),
   a(32, "Are you busy at the moment?", "Are you busy at the moment?", None, ["at"]),
 ]},
 {"label": "with :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "with : He speaks with a funny accent! (6과)", "He speaks with a funny accent!", 6, ["with"], label="with :", po="passOff 1) item 3", stu="with6"),
   a(32, "I can help you with this book.", "I can help you with this book.", None, ["with"]),
   a(32, "She can give a lot of benefits to everyone with her wisdom.", "She can give a lot of benefits to everyone with her wisdom.", None, ["with"]),
 ]},
 {"label": "of :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "of : He has a habit of touching his nose. (6과)", "He has a habit of touching his nose.", 6, ["of"], label="of :", po="passOff 1) item 4", stu="of6"),
   a(32, "These palaces are called the house of David.", "These palaces are called the house of David.", None, ["of"]),
   a(32, "What are you afraid of?", "What are you afraid of?", None, ["of"]),
 ]},
 {"label": "for :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "for : I do a little interview to prepare for school. (8과)", "I do a little interview to prepare for school.", 8, ["for"], label="for :", po="passOff 1) item 5", stu="for8"),
   a(32, "I must succeed in my life for my family.", "I must succeed in my life for my family.", None, ["for"]),
   a(32, "I feel sorry for them. They are in a very difficult situation.", "I feel sorry for them. They are in a very difficult situation.", None, ["for"]),
 ]},
 {"label": "about :", "page": 32, "passOffGroup": "(1)", "items": [
   a(32, "about : When we eat, my father usually talks about his day. (9과)", "When we eat, my father usually talks about his day.", 9, ["about"], label="about :", po="passOff 1) item 6", stu="about9"),
   a(32, "I have to think about that.", "I have to think about that.", None, ["about"]),
   a(32, "There is something special about her.", "There is something special about her.", None, ["about"]),
   a(32, "He often wanders about the town.", "He often wanders about the town.", None, ["about"]),
 ]},
 {"label": None, "inferredLabel": "(1) 이어짐 — in spite of · before · after · by · without (라벨 미인쇄)", "page": 33, "passOffGroup": "(1)", "items": [
   a(33, "In spite of the rain, they enjoyed themselves.", "In spite of the rain, they enjoyed themselves.", None, ["In spite of"], po="passOff 1) item 7"),
   a(33, "In spite of the poverty, they got stronger.", "In spite of the poverty, they got stronger.", None, ["In spite of"]),
   a(33, "We meet before class with our teacher for morning session. (5과)", "We meet before class with our teacher for morning session.", 5, ["before"], po="passOff 1) item 8", stu="before5"),
   a(33, "He stood before the audience.", "He stood before the audience.", None, ["before"]),
   a(33, "She passes before our office every day.", "She passes before our office every day.", None, ["before"]),
   a(33, "After a few minutes , I finally get out of bed.(10과)", "After a few minutes , I finally get out of bed.", 10, ["After"], po="passOff 1) item 9", stu="after10"),
   a(33, "What time is it? It’s ten minutes after six.", "What time is it? It’s ten minutes after six.", None, ["after"]),
   a(33, "Would you follow after him?", "Would you follow after him?", None, ["after"]),
   a(33, "He was named after his grandfather.", "He was named after his grandfather.", None, ["after"]),
   a(33, "I can get to school more quickly by bicycle than I can on foot. (5과)", "I can get to school more quickly by bicycle than I can on foot.", 5, ["by"], po="passOff 1) item 10", stu="by5"),
   a(33, "Come and sit by me.", "Come and sit by me.", None, ["by"]),
   a(33, "He entered the living room by the backdoor.", "He entered the living room by the backdoor.", None, ["by"]),
   a(33, "Let’s begin the lesson by reviewing the last lesson.", "Let’s begin the lesson by reviewing the last lesson.", None, ["by"]),
   a(33, "Finally she could succeed without their help.", "Finally she could succeed without their help.", None, ["without"], po="passOff 1) item 11"),
   a(33, "He can read the newspaper without glasses.", "He can read the newspaper without glasses.", None, ["without"]),
   a(33, "Without competition, progress stops.", "Without competition, progress stops.", None, ["Without"]),
   a(33, "He left them without saying good-bye.", "He left them without saying good-bye.", None, ["without"]),
 ]},
 {"label": None, "inferredLabel": "(2) 전치사와 접속사비교 대응 — although/in spite of · because/because of · until · since (라벨 미인쇄)", "page": 34, "passOffGroup": "(2)", "items": [
   a(34, "Although it rained a lot, they enjoyed themselves.", "Although it rained a lot, they enjoyed themselves.", None, ["Although"], po="passOff 2) item 1"),
   a(34, "= In spite of the rain, they enjoyed themselves. (= Despite)", "In spite of the rain, they enjoyed themselves.", None, ["In spite of"], tag="(= Despite)", role="paraphrase", po="passOff 2) item 2"),
   a(34, "He is quite strong, although he is old.", "He is quite strong, although he is old.", None, ["although"]),
   a(34, "= He is quite strong in spite of being old.", "He is quite strong in spite of being old.", None, ["in spite of"], role="paraphrase"),
   a(34, "I have many relatives because my father and my mother have many brothers and sisters. (4과)", "I have many relatives because my father and my mother have many brothers and sisters.", 4, ["because"], po="passOff 2) item 3", stu="rel4"),
   a(34, "Because of this, I have many friends.(3과)", "Because of this, I have many friends.", 3, ["Because"], focus=["Because of"], po="passOff 2) item 4", stu="because3", note="밑줄은 'Because'에만(of 제외)"),
   a(34, "She couldn’t study well because she was ill.", "She couldn’t study well because she was ill.", None, ["because"]),
   a(34, "=She couldn’t study well because of her illness.", "She couldn’t study well because of her illness.", None, [], focus=["because of"], role="paraphrase", note="이 줄만 밑줄 없음"),
   a(34, "Let’s wait until it stops raining.", "Let’s wait until it stops raining.", None, ["until"], po="passOff 2) item 5"),
   a(34, "I didn’t get up until half past ten.", "I didn’t get up until half past ten.", None, ["until"], po="passOff 2) item 6"),
   a(34, "Until last year, they didn’t even own a car.", "Until last year, they didn’t even own a car.", None, ["Until"]),
   a(34, "It was not until she was 30 that she started to teach English.", "It was not until she was 30 that she started to teach English.", None, ["until"]),
   a(34, "=She didn’t start to teach English until 30.", "She didn’t start to teach English until 30.", None, ["until"], role="paraphrase"),
   a(34, "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people. (13과)", "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people.", 13, ["Since"], po="passOff 2) item 7", stu="since13", note="인쇄상 두 줄"),
   a(34, "She has learned a lot since she has been here.", "She has learned a lot since she has been here.", None, ["since"]),
   a(34, "Since the end of the war in 1953, the country began to develop very quickly. (17과)", "Since the end of the war in 1953, the country began to develop very quickly.", 17, ["Since"], po="passOff 2) item 8", stu="since17"),
   a(34, "It’s a long time since his death.", "It’s a long time since his death.", None, ["since"]),
 ]},
 {"label": None, "inferredLabel": "(3) 중요전치사들 대응 (라벨 미인쇄, p35-37)", "page": 35, "passOffGroup": "(3)", "items": [
   a(35, "I study many different subjects at school. (1과)", "I study many different subjects at school.", 1, ["at"], po="passOff 3) item 1", stu="subj1"),
   a(35, "Let’s start at Lesson 3.", "Let’s start at Lesson 3.", None, ["at"]),
   a(35, "We met at the library.", "We met at the library.", None, ["at"]),
   a(35, "She was annoyed at his rude manner.", "She was annoyed at his rude manner.", None, ["at"]),
   a(35, "Luckily I could buy the shop at a low price.", "Luckily I could buy the shop at a low price.", None, ["at"]),
   a(35, "What do I do in the evening? (9과)", "What do I do in the evening?", 9, ["in"], po="passOff 3) item 2", stu="eve9"),
   a(35, "There are many historic places in our town.", "There are many historic places in our town.", None, ["in"]),
   a(35, "In my opinion, there are two flaws in their theories.", "In my opinion, there are two flaws in their theories.", None, ["in"], note="밑줄은 두 번째 in(in their theories)에만"),
   a(35, "I will be back in a few days.", "I will be back in a few days.", None, ["in"]),
   a(35, "I like visiting my relatives on Sunday afternoons(11과)", "I like visiting my relatives on Sunday afternoons", 11, ["on"], po="passOff 3) item 3", stu="sun11"),
   a(35, "I watched the game on TV.", "I watched the game on TV.", None, ["on"]),
   a(35, "There are boats on the lake.", "There are boats on the lake.", None, ["on"]),
   a(35, "I swear on the Bible.", "I swear on the Bible.", None, ["on"]),
   a(35, "He is rude. He always hangs up on me.", "He is rude. He always hangs up on me.", None, ["on"]),
   a(35, "I can draw his face within my memory.", "I can draw his face within my memory.", None, ["within"], po="passOff 3) item 4"),
   a(35, "Boil the soup within 5 minutes.", "Boil the soup within 5 minutes.", None, ["within"]),
   a(35, "They wanted to live within their income.", "They wanted to live within their income.", None, ["within"]),
   a(36, "What do I do during the week? (10과)", "What do I do during the week?", 10, ["during"], po="passOff 3) item 5", stu="week10"),
   a(36, "They had helped people in need during life.", "They had helped people in need during life.", None, ["during"]),
   a(36, "She had worked at a department store for several years. (1과)", "She had worked at a department store for several years.", 1, ["at", "for"], po="passOff 3) item 6", stu="dept"),
   a(36, "The sun came through the window.", "The sun came through the window.", None, ["through"], po="passOff 3) item 7"),
   a(36, "Draw the line from A through B to C.", "Draw the line from A through B to C.", None, ["through"]),
   a(36, "We walked through the night.", "We walked through the night.", None, ["through"]),
   a(36, "I love to be around my friends. (1과)", "I love to be around my friends.", 1, ["around"], po="passOff 3) item 8", stu="around1"),
   a(36, "Don’t waste time in wandering around the town.", "Don’t waste time in wandering around the town.", None, ["around"]),
   a(36, "After that, I quickly write in my journal about my day (9과)", "After that, I quickly write in my journal about my day", 9, ["After", "in"], po="passOff 3) item 9", stu="journal9"),
   a(36, "I like to walk along the park with my dog.", "I like to walk along the park with my dog.", None, ["with"], focus=["along"], po="passOff 3) item 10", note="밑줄이 along이 아니라 with에 있음(issues 참조)"),
   a(36, "The land of Korea is a peninsula located between China and Japan(20과)", "The land of Korea is a peninsula located between China and Japan", 20, ["between"], po="passOff 3) item 11", stu="land20"),
   a(36, "My house is a cottage among the trees.", "My house is a cottage among the trees.", None, ["among"], po="passOff 3) item 12"),
   a(36, "Her house is beside the river.", "Her house is beside the river.", None, ["beside"], po="passOff 3) item 13"),
   a(36, "For a while, Korea was ruled by Japan.(17과)", "For a while, Korea was ruled by Japan.", 17, ["by"], po="passOff 3) item 14", stu="ruled17"),
   a(36, "The child hid behind the door.", "The child hid behind the door.", None, ["behind"], po="passOff 3) item 16"),
   a(36, "The Korean Peninsula was divided into three kingdoms.(17과)", "The Korean Peninsula was divided into three kingdoms.", 17, ["into"], po="passOff 3) item 18", stu="three17"),
   a(36, "She pours the milk into the glass.", "She pours the milk into the glass.", None, ["into"]),
   a(36, "Can you translate this into English?", "Can you translate this into English?", None, [], focus=["into"], note="밑줄 없음, 다른 줄보다 왼쪽으로 내어 인쇄됨"),
   a(37, "A bridge over a river.", "A bridge over a river.", None, ["over"], po="passOff 3) item 19"),
   a(37, "She is one of my best friends(3과)", "She is one of my best friends", 3, ["of"], po="passOff 3) item 20", stu="best3"),
   a(37, "So I can learn a lot from him/her.(3과)", "So I can learn a lot from him/her.", 3, ["from"], po="passOff 3) item 21", stu="learn3"),
   a(37, "After a few minutes, I finally get out of bed.(10과)", "After a few minutes, I finally get out of bed.", 10, ["After"], po="passOff 3) item 22", stu="after10"),
   a(37, "I mailed the letter today, so they receive it by Monday.", "I mailed the letter today, so they receive it by Monday.", None, ["so"], focus=["by"], po="passOff 3) item 23", note="밑줄이 by가 아니라 so에 있음(issues 참조). 패스오프의 한국어 주석은 적용 섹션에서 빠짐"),
   a(37, "Fred will be away until Monday.", "Fred will be away until Monday.", None, ["until"], po="passOff 3) item 24"),
   a(37, "Jane’s car broke down on the way to the party.", "Jane’s car broke down on the way to the party.", None, ["on"], po="passOff 3) item 25 (앞 문장)"),
   a(37, "By the time she arrived, most of the other guest had left.", "By the time she arrived, most of the other guest had left.", None, ["of"], focus=["By the time"], po="passOff 3) item 25 (뒤 문장)", note="밑줄이 By the time이 아니라 of에 있음(issues 참조)"),
 ]},
]

# ---- Review TOPIC 19: (page, prompt, (groupIndex, itemIndex))
t19_rev = [
 (38, "나는 미래에 영어 말하기를 배우기 원한다.", (1, 1)),
 (38, "나는 2월에 휴가를 갈 것이다.", (1, 2)),
 (38, "너는 저녁에 얼마나 자주 외출하니?", (1, 3)),
 (38, "내 친구들 중 몇몇은 단어와 구를 외우는 것을 정말 잘한다.", (2, 1)),
 (38, "나는 아침 7시에 일상생활을 시작한다.", (2, 2)),
 (38, "너는 지금 바쁘니?", (2, 3)),
 (38, "그는 재미있는 억양으로 말한다.", (3, 1)),
 (38, "제가 이 책으로 당신을 도울 수 있어요.", (3, 2)),
 (38, "그녀는 그녀의 지혜로 모두에게 많은 이익을 줄 수 있어요.", (3, 3)),
 (38, "그는 코를 만지는 습관을 가지고 있다.", (4, 1)),
 (38, "이 궁전들은 데이빗의 집이라 불린다.", (4, 2)),
 (39, "너는 무엇을 두려워하는가?", (4, 3)),
 (39, "나는 학교를 위해 준비한 작은 인터뷰를 한다.", (5, 1)),
 (39, "나는 인생에서 내 가족을 위해 반드시 성공해야만 한다.", (5, 2)),
 (39, "나는 그들에게 미안하다. 그들은 매우 다른 상황에 있다.", (5, 3)),
 (39, "우리가 먹을 때, 아버지는 보통 그의 하루에 대해 말씀하신다.", (6, 1)),
 (39, "나는 그것에 대해 생각해야 한다.", (6, 2)),
 (39, "그녀에게는 특별한 것이 있다.", (6, 3)),
 (39, "그는 자주 마을 근처를 돌아다닌다.", (6, 4)),
 (39, "비가 옴에도 불구하고, 그들은 자신을 즐겼다.", (7, 1)),
 (39, "가난에도 불구하고, 그들은 더 강해졌다.", (7, 2)),
 (39, "우리는 수업 전에 아침조회를 위해 선생님과 만난다.", (7, 3)),
 (39, "그는 청중 앞에 섰다.", (7, 4)),
 (40, "그는 매일 우리 사무실 앞을 지난다.", (7, 5)),
 (40, "몇 분 후에, 나는 마침내 침대에서 일어난다.", (7, 6)),
 (40, "몇 시니? 여섯 시 십분 (십분 지난 6시)", (7, 7)),
 (40, "당신들은 그를 따르겠습니까?", (7, 8)),
 (40, "그는 할아버지의 이름을 땄다.", (7, 9)),
 (40, "나는 걷는 것보다 자전거를 타면 더 빨리 학교에 도착할 수 있다.", (7, 10)),
 (40, "와서 내 옆에 앉아라.", (7, 11)),
 (40, "그는 후문을 통해서 거실로 들어 왔다.", (7, 12)),
 (40, "지난 과를 복습 함으로써 수업을 시작하자.", (7, 13)),
 (40, "마침내, 그녀는 다른 사람들의 도움 없이 성공할 수 있었다.", (7, 14)),
 (40, "그는 안경 없이 신문을 읽을 수 있다.", (7, 15)),
 (40, "경쟁이 없다면, 발전은 멈춘다.", (7, 16)),
 (41, "그는 작별인사 없이 그들을 떠났다.", (7, 17)),
 (41, "비가 많이 왔음에도 불구하고, 그들은 즐겼다.", (8, 1)),
 (41, "그는 비록 늙음에도 불구하고 상당히 강하다.", (8, 3)),
 (41, "나는 아버지와 어머니가 많은 남동생과 여동생을 가졌기 때문에 친척이 많다.", (8, 5)),
 (41, "이것 때문에 나는 친구가 많다.", (8, 6)),
 (41, "그녀는 아팠기 때문에 공부를 잘 할 수 없었다.", (8, 7)),
 (41, "비가 멈출 때까지 기다리자.", (8, 9)),
 (41, "나는 10시 반이 될 때까지 일어나지 못했다.", (8, 10)),
 (41, "작년까지, 그들은 자동차도 소유하지 못했다.", (8, 11)),
 (41, "그녀가 영어를 가르치기 시작한 것은 서른 살이 되어서였다.", (8, 12)),
 (41, "내가 어렸을 때 이후로, 나는 역사책과 소설책을 좋아하는 것을 알게 되었는데 왜냐하면, 내가 많은 사람들의 지혜에 관해 읽을 수 있어서였다.", (8, 14)),
 (42, "그녀는 이곳에 있어온 이래로, 많이 배웠다.", (8, 15)),
 (42, "1953년 전쟁이 끝난 후, 그 나라는 매우 빠르게 개발되기 시작되었다.", (8, 16)),
 (42, "그가 죽은 후에 긴 시간이 지났다.", (8, 17)),
 (42, "나는 학교에서 많은 다른 과목들을 공부한다.", (9, 1)),
 (42, "3과에서 시작하자.", (9, 2)),
 (42, "우리는 도서관에서 만났다.", (9, 3)),
 (42, "그녀는 그의 무례한 행동에 화가 났다.", (9, 4)),
 (42, "다행스럽게 나는 낮은 가격에 그 가게를 살수 있었다.", (9, 5)),
 (42, "나는 저녁에 무엇을 할까요?", (9, 6)),
 (42, "우리 마을에는 많은 역사적 장소가 있다.", (9, 7)),
 (42, "내 의견으로. 그들의 이론에는 두 결점이 있다.", (9, 8)),
 (42, "나는 며칠 안에 돌아올 거야.", (9, 9)),
 (43, "나는 내 친척들을 방문하기를 좋아해.", (9, 10)),
 (43, "나는 TV로 게임을 보았다.", (9, 11)),
 (43, "호수에는 배들이 있다.", (9, 12)),
 (43, "나는 성경에 대고 맹세한다.", (9, 13)),
 (43, "그는 무례해, 그는 항상 전화를 먼저 끊는다.", (9, 14)),
 (43, "나는 기억 안에서 그의 얼굴을 그릴 수 있다.", (9, 15)),
 (43, "5분 안에 그 수프를 끓여라.", (9, 16)),
 (43, "그들은 수입 내에서 살기를 원했다.", (9, 17)),
 (43, "주중에 나는 무엇을 할까요?", (9, 18)),
 (43, "그들은 평생 동안 가난한 사람들을 도왔었다.", (9, 19)),
 (43, "그녀는 몇 년 동안 백화점에서 일했었다.", (9, 20)),
 (43, "태양이 창문을 통해서 들어왔다.", (9, 21)),
 (44, "A로부터 B를 통과하여 C까지 선을 그어라.", (9, 22)),
 (44, "우리는 밤새 걸었다.", (9, 23)),
 (44, "나는 내 친구들과 가까이 지내기를 사랑한다.", (9, 24)),
 (44, "마을을 돌아다니느라 시간을 낭비하지 마라.", (9, 25)),
 (44, "그 후, 나는 내 하루에 관해 빨리 일기를 쓴다.", (9, 26)),
 (44, "나는 개와 함께 공원을 따라 걷기를 좋아한다.", (9, 27)),
 (44, "한국이라는 땅은 중국과 일본 사이에 위치한 반도이다.", (9, 28)),
 (44, "나의 집은 나무들 사이에 초가이다.", (9, 29)),
 (44, "그녀의 집은 강 옆에 있다.", (9, 30)),
 (44, "잠시 동안, 한국은 일본에 의해 지배 받았다.", (9, 31)),
 (44, "그 아이는 문 뒤로 숨었다.", (9, 32)),
 (44, "한반도는 3개의 왕국으로 나뉘어 졌다.", (9, 33)),
 (45, "그녀는 우유를 유리잔 안에 붓는다.", (9, 34)),
 (45, "너는 이것을 영어로 번역할 수 있니?", (9, 35)),
 (45, "강 위로 지나가는 다리", (9, 36)),
 (45, "그녀는 나의 가장 친한 친구 중의 하나이다.", (9, 37)),
 (45, "그래서 나는 그/그녀로부터 많이 배울 수 있다.", (9, 38)),
 (45, "몇 분 후에, 나는 마침내 자리에서 일어난다.", (9, 39)),
 (45, "나는 오늘 편지를 부쳤고,그들은 월요일까지 그것을 받는다.", (9, 40)),
 (45, "프레드는 월요일까지 돌아올 것이다.", (9, 41)),
 (45, "제인의 차가 파티로 가는 도중에 부서졌다.", (9, 42)),
 (45, "그녀가 도착할 즈음에, 다른 손님들의 대부분이 떠났다.", (9, 43)),
]
t19_rev_notes = {
 46: "인쇄상 두 줄에 걸친 한 문항",
 26: "괄호 속 '(십분 지난 6시)'가 after 사용 힌트",
 85: "문장이 아닌 명사구",
 25: "같은 영어 문장이 88번에도 나옴(한국어는 '자리에서')",
 88: "같은 영어 문장이 25번에도 나옴(한국어는 '침대에서')",
 13: "책 영어의 'interview'는 오식(원문 review). 정답은 수정 후 사용",
}

# ============================================================== TOPIC 20 접속사
t20_po1 = [
 item(46, "and : He is my friend and I am proud of him(3과)", "He is my friend and I am proud of him", 3, label="and :", ul=["and"], focus=["and"], stu="proud3"),
 item(46, "but : He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself.(13과)", "He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself.", 13, label="but :", ul=["but"], focus=["but"], stu="hist13", note="인쇄상 두 줄"),
 item(46, "or : I often go and visit them or they come and visit me .(4과)", "I often go and visit them or they come and visit me .", 4, label="or :", ul=["or"], focus=["or"], stu="visit4"),
 item(46, "so : The students are very noisy, so the teacher has to shout at us to get us to quiet down.(5과)", "The students are very noisy, so the teacher has to shout at us to get us to quiet down.", 5, label="so :", ul=["so"], focus=["so"], stu="noisy5"),
]
t20_po2 = [
 item(46, "when : when I get home, I chat on the computer with my friends(10과)", "when I get home, I chat on the computer with my friends", 10, label="when :", ul=["when"], focus=["when"], stu="chat10"),
 item(46, "Until (till) : I will wait here until you come back.", "I will wait here until you come back.", None, label="Until (till) :", ul=["until"], focus=["until"]),
 item(46, "As : As I am walking to school, I often see my friends.(5과)", "As I am walking to school, I often see my friends.", 5, label="As :", ul=["As"], focus=["As"], stu="walk5"),
 item(46, "As soon as : He went home as soon as he got the phone call.", "He went home as soon as he got the phone call.", None, label="As soon as :", ul=["as soon as"], focus=["as soon as"]),
 item(46, "Unless : Never a moment goes by unless I think of him.", "Never a moment goes by unless I think of him.", None, label="Unless :", ul=["unless"], focus=["unless"]),
 item(46, "If ~ not : Don’t tell Sue what I said if she doesn’t ask you. (=unless)", "Don’t tell Sue what I said if she doesn’t ask you.", None, tag="(=unless)", label="If ~ not :", ul=["if", "n’t"], focus=["if", "doesn’t"], note="밑줄은 if와 doesn’t의 n’t 부분"),
 item(46, "If : Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon. (11과)", "Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon.", 11, label="If :", ul=["if"], focus=["if"], stu="bday11", note="인쇄상 두 줄"),
 item(46, "As long as : You can use my car as long as you drive carefully. (=provided)", "You can use my car as long as you drive carefully.", None, tag="(=provided)", label="As long as :", ul=["as long as"], focus=["as long as"]),
 item(46, "Because : My favorite time is Friday night because it is the start of the weekend. (10과)", "My favorite time is Friday night because it is the start of the weekend.", 10, label="Because :", ul=["because"], focus=["because"], stu="fri10"),
 item(46, "So~ that : I must learn to speak English well so that I can communicate with them comfortably.(16과) = in order that", "I must learn to speak English well so that I can communicate with them comfortably.", 16, tag="= in order that", label="So~ that :", bold=["so that"], ul=["so that"], focus=["so that"], stu="comm16", note="인쇄상 두 줄. 'so that'은 굵게+밑줄"),
 item(46, "Lest ~ should : Be careful lest you should fall from the tree.", "Be careful lest you should fall from the tree.", None, label="Lest ~ should :", ul=["lest", "should"], focus=["lest", "should"]),
 item(46, "Though (Although) : Though it stopped raining, the wind was still blowing.", "Though it stopped raining, the wind was still blowing.", None, label="Though (Although) :", ul=["Though"], focus=["Though"]),
 item(46, "As if (even though) : Even though it is hard work, I am happy to learn new things and spend time with my friends.(10과)", "Even though it is hard work, I am happy to learn new things and spend time with my friends.", 10, label="As if (even though) :", ul=["Even though"], focus=["Even though"], stu="hard10", note="라벨 'As if'는 오류(issues 참조). 인쇄상 두 줄"),
]
def b(page, raw, en, ref=None, focus=None, **kw):
    return item(page, raw, en, ref, focus=focus, **kw)
t20_app = [
 {"label": None, "inferredLabel": "(1) 등위접속사 대응 — and · but · or · so (라벨·밑줄 미인쇄)", "page": 47, "passOffGroup": "(1)", "items": [
   b(47, "He is my friend and I am proud of him. (3과)", "He is my friend and I am proud of him.", 3, ["and"], po="passOff 1) item 1", stu="proud3"),
   b(47, "He likes to eat fish and chips", "He likes to eat fish and chips", None, ["and"]),
   b(47, "We’re waiting for hours and hours.", "We’re waiting for hours and hours.", None, ["and"]),
   b(47, "She picked up the kitten and put it in the box.", "She picked up the kitten and put it in the box.", None, ["and"]),
   b(47, "He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself. (13과)", "He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself.", 13, ["but"], po="passOff 1) item 2", stu="hist13", note="한 문장이 문항 간격의 두 줄로 나뉘어 인쇄됨"),
   b(47, "It’s an old car but it’s very nice.", "It’s an old car but it’s very nice.", None, ["but"]),
   b(47, "I’d like to, but I am so busy.", "I’d like to, but I am so busy.", None, ["but"]),
   b(47, "I often go and visit them or they come and visit me. (4과)", "I often go and visit them or they come and visit me.", 4, ["or"], po="passOff 1) item 3", stu="visit4"),
   b(47, "Shall we go out to the cinema or stay at home?", "Shall we go out to the cinema or stay at home?", None, ["or"]),
   b(47, "He doesn’t have a television or a radio.", "He doesn’t have a television or a radio.", None, ["or"]),
   b(47, "The girl was three or four years of age.", "The girl was three or four years of age.", None, ["or"]),
   b(47, "The students are very noisy, so the teacher has to shout at us to get us to quiet down. (5과)", "The students are very noisy, so the teacher has to shout at us to get us to quiet down.", 5, ["so"], po="passOff 1) item 4", stu="noisy5"),
   b(48, "She felt hungry, so she made herself sandwiches.", "She felt hungry, so she made herself sandwiches.", None, ["so"]),
   b(48, "There are no buses, so you will have to walk.", "There are no buses, so you will have to walk.", None, ["so"]),
 ]},
 {"label": None, "inferredLabel": "(2) 종속접속사 대응 — when · until · as · as soon as · unless · if ~ not · if · as long as · because · so that · lest ~ should · though · even though · before (라벨·밑줄 미인쇄)", "page": 48, "passOffGroup": "(2)", "items": [
   b(48, "When I get home, I chat on the computer with my friends. (10과)", "When I get home, I chat on the computer with my friends.", 10, ["When"], po="passOff 2) item 1", stu="chat10"),
   b(48, "They were penniless when they came to America.", "They were penniless when they came to America.", None, ["when"]),
   b(48, "There are times when I like chocolate.", "There are times when I like chocolate.", None, ["when"], note="여기서 when은 관계부사(times를 수식). 접속사 예로는 부적절할 수 있음"),
   b(48, "When I come home after school, my mother is always glad to see me.(8과)", "When I come home after school, my mother is always glad to see me.", 8, ["When"], po="passOff(TOPIC 19) 3) item 17", stu="glad8"),
   b(48, "I will wait here until you come back.", "I will wait here until you come back.", None, ["until"], po="passOff 2) item 2"),
   b(48, "She waited until he had finished speaking.", "She waited until he had finished speaking.", None, ["until"]),
   b(48, "Let’s wait until it stops raining.", "Let’s wait until it stops raining.", None, ["until"], note="TOPIC 19 (2)와 같은 문장"),
   b(48, "It was not until she was 30 that she started to teach English.", "It was not until she was 30 that she started to teach English.", None, ["until"], note="TOPIC 19 적용(p34)과 같은 문장"),
   b(48, "As I am walking to school, I often see my friends.(5과)", "As I am walking to school, I often see my friends.", 5, ["As"], po="passOff 2) item 3", stu="walk5"),
   b(48, "They want peace as much as we do.", "They want peace as much as we do.", None, ["as"]),
   b(48, "We’d better leave things as they are until the police arrive.", "We’d better leave things as they are until the police arrive.", None, ["as", "until"], note="리뷰 영작에 대응하는 한국어 없음"),
   b(48, "Robin, as you know, has been better nowadays.", "Robin, as you know, has been better nowadays.", None, ["as"], note="리뷰 영작에 대응하는 한국어 없음"),
   b(49, "As soon as she saw his face, she knew something was wrong.", "As soon as she saw his face, she knew something was wrong.", None, ["As soon as"]),
   b(49, "He went home as soon as he got the phone call.", "He went home as soon as he got the phone call.", None, ["as soon as"], po="passOff 2) item 4"),
   b(49, "He will not go to sleep unless you read books for him.", "He will not go to sleep unless you read books for him.", None, ["unless"]),
   b(49, "I can’t leave her unless she is safe.", "I can’t leave her unless she is safe.", None, ["unless"]),
   b(49, "Never a moment goes by unless I think of him.", "Never a moment goes by unless I think of him.", None, ["unless"], po="passOff 2) item 5"),
   b(49, "Don’t tell Sue what I said if she doesn’t ask you.", "Don’t tell Sue what I said if she doesn’t ask you.", None, ["if", "doesn’t"], po="passOff 2) item 6"),
   b(49, "Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon. (11과)", "Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon.", 11, ["if"], po="passOff 2) item 7", stu="bday11", note="인쇄상 두 줄"),
   b(49, "If they gave the students deep impression, they could change their lives.", "If they gave the students deep impression, they could change their lives.", None, ["If"]),
   b(49, "I wouldn’t worry about it if I were you.", "I wouldn’t worry about it if I were you.", None, ["if"]),
   b(49, "You can use my car as long as you drive carefully.", "You can use my car as long as you drive carefully.", None, ["as long as"], po="passOff 2) item 8"),
   b(49, "He could stay the palace as long as he wanted.", "He could stay the palace as long as he wanted.", None, ["as long as"]),
   b(49, "As long as we keep playing well, we will win the game.", "As long as we keep playing well, we will win the game.", None, ["As long as"]),
   b(49, "My favorite time is Friday night because it is the start of the weekend.(10과)", "My favorite time is Friday night because it is the start of the weekend.", 10, ["because"], po="passOff 2) item 9", stu="fri10"),
   b(49, "We didn’t enjoy the picnic because the weather was getting cold.", "We didn’t enjoy the picnic because the weather was getting cold.", None, ["because"]),
   b(50, "I must learn to speak English well so that I can communicate with them comfortably. (16과)", "I must learn to speak English well so that I can communicate with them comfortably.", 16, ["so that"], bold=["so that"], po="passOff 2) item 10", stu="comm16", note="TOPIC 20 적용 섹션에서 유일하게 강조(굵게)된 곳"),
   b(50, "Speak loudly so that I may hear you.", "Speak loudly so that I may hear you.", None, ["so that"]),
   b(50, "Give me strength that I may stand against them.", "Give me strength that I may stand against them.", None, ["that"]),
   b(50, "Be careful lest you should fall from the tree.", "Be careful lest you should fall from the tree.", None, ["lest", "should"], po="passOff 2) item 11"),
   b(50, "She gave you some advice lest you should make mistakes in his office.", "She gave you some advice lest you should make mistakes in his office.", None, ["lest", "should"]),
   b(50, "Though it stopped raining, the wind was still blowing.", "Though it stopped raining, the wind was still blowing.", None, ["Though"], po="passOff 2) item 12"),
   b(50, "Though she had no one to be friends, she could be satisfied with learning and growing herself.", "Though she had no one to be friends, she could be satisfied with learning and growing herself.", None, ["Though"]),
   b(50, "Jimmy went ahead with the experiment even though it was dangerous.", "Jimmy went ahead with the experiment even though it was dangerous.", None, ["even though"]),
   b(50, "Even though it is hard work, I am happy to learn new things and spend time with my friends. (10과)", "Even though it is hard work, I am happy to learn new things and spend time with my friends.", 10, ["Even though"], po="passOff 2) item 13", stu="hard10"),
   b(50, "Before I go to school, my mother gives me my allowance.(5과)", "Before I go to school, my mother gives me my allowance.", 5, ["Before"], po="passOff(TOPIC 19) 3) item 15", stu="allow5", note="TOPIC 20 패스오프에는 before 항목이 없음"),
   b(50, "I saw him a few days before he went abroad.", "I saw him a few days before he went abroad.", None, ["before"]),
   b(50, "You have to pass several tests before you get a license.", "You have to pass several tests before you get a license.", None, ["before"]),
 ]},
]

# ---- Review TOPIC 20, task 1 (identify & classify), prompts in English (printed bold)
t20_task1 = [
 (51, "He is my friend and I am proud of him.", "passOff 1) item 1", "and → 등위"),
 (51, "He lived during a difficult time of Korean history, but he always thought of Korea and Koreans before himself.", "passOff 1) item 2", "but → 등위 (※ 'Korea and Koreans'의 and도 명사를 잇는 등위접속사)"),
 (51, "I often go and visit them or they come and visit me.", "passOff 1) item 3", "or → 등위 (※ go and visit · come and visit의 and 두 개도 등위접속사)"),
 (51, "The students are very noisy, so the teacher has to shout at us to get us to quiet down.", "passOff 1) item 4", "so → 등위"),
 (51, "When I get home, I chat on the computer with my friends.", "passOff 2) item 1", "When → 종속"),
 (51, "I will wait here until you come back.", "passOff 2) item 2", "until → 종속"),
 (51, "As I am walking to school, I often see my friends.", "passOff 2) item 3", "As → 종속"),
 (51, "He went home as soon as he got the phone call.", "passOff 2) item 4", "as soon as → 종속"),
 (51, "Never a moment goes by unless I think of him.", "passOff 2) item 5", "unless → 종속"),
 (52, "Don’t tell Sue what I said if she doesn’t ask you.", "passOff 2) item 6", "if → 종속 (※ what은 관계대명사라 접속사 아님)"),
 (52, "Sometimes if there is a special day like a birthday party, we celebrate it on a Saturday afternoon.", "passOff 2) item 7", "if → 종속 (※ like는 전치사)"),
 (52, "You can use my car as long as you drive carefully.", "passOff 2) item 8", "as long as → 종속"),
 (52, "My favorite time is Friday night because it is the start of the weekend.", "passOff 2) item 9", "because → 종속"),
 (52, "I must learn to speak English well so that I can communicate with them comfortably.", "passOff 2) item 10", "so that → 종속"),
 (52, "Be careful lest you should fall from the tree.", "passOff 2) item 11", "lest (~ should) → 종속"),
 (52, "Though it stopped raining, the wind was still blowing.", "passOff 2) item 12", "Though → 종속"),
 (52, "Even though it is hard work, I am happy to learn new things and spend time with my friends.", "passOff 2) item 13", "Even though → 종속 (※ learn ... and spend의 and는 등위)"),
]
t20_task1_notes = {2: "인쇄상 두 줄", 11: "인쇄상 두 줄", 17: "인쇄상 두 줄"}

# ---- Review TOPIC 20, task 2 (ko -> en)
t20_task2 = [
 (53, "그는 나의 친구이고 나는 그를 존경스러워한다.", (1, 1)),
 (53, "그는 생선과 감자튀김 먹기를 좋아한다.", (1, 2)),
 (53, "우리는 몇 시간 동안 기다리고 있다.", (1, 3)),
 (53, "그녀는 고양이를 집어 들어서 상자 안에 넣는다.", (1, 4)),
 (53, "그는 한국 역사의 어려운 시간 동안 살았지만, 그는 항상 자신보다 한국과 한국 사람들을 생각했다.", (1, 5)),
 (53, "그것은 오래된 차이지만, 매우 좋다.", (1, 6)),
 (53, "나도 그러고 싶지만, 나는 너무 바쁘다.", (1, 7)),
 (53, "나는 자주 가서 그들을 방문하거나 그들이 와서 나를 방문한다.", (1, 8)),
 (53, "우리 영화관에 외출할까 아니면 집에 있을까?", (1, 9)),
 (53, "그는 TV나 라디오를 가지고 있지 않다.", (1, 10)),
 (53, "그 소녀는 서너 살 이었다.", (1, 11)),
 (54, "학생들이 매우 시끄러워서, 선생님은 우리가 조용해 지도록 시키기 위해서 우리에게 소리치셔야 한다.", (1, 12)),
 (54, "그녀는 배가 고파서, 스스로에게 샌드위치를 만들어 주었다.", (1, 13)),
 (54, "버스가 없어서, 너는 걸어야 할거야.", (1, 14)),
 (54, "내가 집에 도착할 때, 나는 친구들과 컴퓨터로 잡담한다.", (2, 1)),
 (54, "그들이 미국에 왔을 때, 그들은 무일푼이었다.", (2, 2)),
 (54, "내가 초콜릿을 좋아하던 시절이 있었다.", (2, 3)),
 (54, "내가 하교 후에 집에 도착했을 때, 나의 어머니는 항상 나를 보고 기뻐하셨다.", (2, 4)),
 (54, "나는 당신이 돌아올 때까지 기다릴 겁니다.", (2, 5)),
 (54, "그녀는 그가 말하기를 마쳤을 때까지 기다렸다.", (2, 6)),
 (54, "비가 멈출 때까지 기다립시다.", (2, 7)),
 (54, "그녀가 영어를 가르치기 시작한 것은 서른 살이 되어서였다.", (2, 8)),
 (55, "내가 학교로 걸어가는 동안, 나는 자주 내 친구들을 만난다.", (2, 9)),
 (55, "그들은 우리가 원하는 것만큼 평화를 원한다.", (2, 10)),
 (55, "그녀가 그의 얼굴을 보는 순간, 그녀는 무엇인가가 잘못되었다는 것을 알았다.", (2, 13)),
 (55, "그는 그 전화를 받자마자 집으로 갔다.", (2, 14)),
 (55, "그는 당신이 그를 위해 책을 읽어주지 않으면, 자러 가지 않을 겁니다.", (2, 15)),
 (55, "나는 그녀가 안전하지 않는다면, 그녀를 떠날 수 없어요.", (2, 16)),
 (55, "나는 당신을 생각하지 않고는 한 순간도 지나가지 않아요.", (2, 17)),
 (55, "만약 그녀가 당신에게 묻지 않는다면, 내가 말했던 것을 수에게 말하지 마세요.", (2, 18)),
 (55, "때때로 생일파티처럼 특별한 날이 있다면, 우리는 토요일 오후에 그것을 축하한다.", (2, 19)),
 (55, "만약, 그들이 학생들에게 깊은 감명을 준다면, 그들은 그 인생을 바꿀 수 있을 텐데.", (2, 20)),
 (55, "내가 너라면, 나는 걱정하지 않아.", (2, 21)),
 (55, "너는 주의 깊게 운전한다면, 내 차를 써도 돼.", (2, 22)),
 (56, "그는 원한다면, 얼마든지 궁전에 머물 수 있었다.", (2, 23)),
 (56, "우리가 잘 경기하는 한, 경기에서 승리할 거야.", (2, 24)),
 (56, "내가 가장 좋아하는 시간은 금요일 밤이다. 왜냐하면, 그것은 주말의 시작이기 때문이다.", (2, 25)),
 (56, "우리는 날씨가 추워졌기 때문에 소풍을 즐길 수 없었다.", (2, 26)),
 (56, "나는 그들과 편리하게 의사소통 할 수 있기 위해서 나는 영어를 잘 말하는 것을 배워야만 한다.", (2, 27)),
 (56, "내가 당신을 들을 수 있기 위해서 크게 말하세요.", (2, 28)),
 (56, "제가 그들과 맞설 수 있게 나에게 힘을 주세요.", (2, 29)),
 (56, "나무에서 떨어지지 않도록 조심하세요.", (2, 30)),
 (56, "그녀는 그의 사무실에서 당신이 실수하지 않도록 당신에게 조언을 주었다.", (2, 31)),
 (56, "비는 그쳤지만, 바람은 여전히 불었다.", (2, 32)),
 (56, "비록 그녀는 친구가 될 사람이 아무도 없었지만, 스스로 배우고 발전함에 만족할 수 있었다.", (2, 33)),
 (57, "지미는 그것이 위험했었지만, 그 실험을 먼저 했다.", (2, 34)),
 (57, "그것이 비록 힘든 일이었지만, 나는 내 친구들과 새로운 것을 배우고 친구들과 시간을 보내는 것이 행복하다.", (2, 35)),
 (57, "내가 학교에 가기 전에 나의 엄마는 내게 용돈을 준다.", (2, 36)),
 (57, "나는 그가 외국에 가기 며칠 전에 그를 보았다.", (2, 37)),
 (57, "너는 자격증을 얻기 전에 몇 가지 시험을 통과해야 한다.", (2, 38)),
]
t20_task2_notes = {
 12: "인쇄상 두 줄에 걸친 한 문항",
 47: "한 문장이 문항 간격으로 떨어진 두 줄('…나는 내 친구들과' / '새로운 것을 배우고 친구들과 …')로 인쇄되어 두 문항처럼 보임. '친구들과' 중복",
 17: "영어(현재: There are times when I like chocolate.)와 한국어(과거: 좋아하던 시절이 있었다)가 다름",
}

# ============================================================== assemble
def build_review_items(rows, app_groups, notes):
    out = []
    for n, (page, prompt, (gi, ii)) in enumerate(rows, 1):
        src = app_groups[gi - 1]["items"][ii - 1]
        d = {"n": str(n), "page": page, "prompt": prompt, "promptLang": "ko", "extraSlot": None,
             "answerFromBook": src["en"], "answerSource": f"application {gi}) item {ii}",
             "proposedAnswer": None, "extraSlotAnswer": None}
        if n in notes: d["note"] = notes[n]
        out.append(d)
    return out

def mark_review_refs(app_groups, rows, label):
    for n, (_, _, (gi, ii)) in enumerate(rows, 1):
        app_groups[gi - 1]["items"][ii - 1]["reviewRef"] = f"{label} item {n}"
    for g in app_groups:
        for it in g["items"]:
            it.setdefault("reviewRef", None)

def groups_from(label_rows):
    return label_rows

mark_review_refs(t19_app, t19_rev, "review 1)")
mark_review_refs(t20_app, t20_task2, "review 2)")

def app_groups_json(groups):
    out = []
    for g in groups:
        d = {"label": g["label"]}
        if g.get("inferredLabel"): d["inferredLabel"] = g["inferredLabel"]
        d["page"] = g["page"]; d["passOffGroup"] = g["passOffGroup"]; d["explanation"] = None
        d["items"] = g["items"]
        out.append(d)
    return out

topic19 = {
 "printedLabel": "TOPIC 19", "title": "전치사", "pages": [30, 45],
 "continuesFromPrevRange": False, "continuesIntoNextRange": False,
 "sections": [
  {"kind": "passOff", "heading": "1. Pass-Off Sentences", "page": 30, "groups": [
    {"label": "(1) 전치사", "page": 30, "explanation": None, "items": t19_po1},
    {"label": "(2) 전치사와 접속사비교", "page": 30, "explanation": None, "items": t19_po2},
    {"label": "(3) 중요전치사들", "page": 31, "explanation": None, "items": t19_po3},
  ]},
  {"kind": "application", "heading": "2. Application Sentences", "page": 32, "groups": app_groups_json(t19_app)},
  {"kind": "review", "heading": "Review", "page": 38, "tasks": [
    {"no": "1.", "page": 38, "instruction": "다음을 영작하시오.", "taskTypes": ["ko_to_en_compose"],
     "items": build_review_items(t19_rev, t19_app, t19_rev_notes)},
  ]},
 ],
}

task1_items = []
for n, (page, prompt, src, ans) in enumerate(t20_task1, 1):
    d = {"n": str(n), "page": page, "prompt": prompt, "promptLang": "en",
         "extraSlot": "접속사에 밑줄 긋고 종속접속사는 '종속', 등위접속사는 '등위'라고 쓰기",
         "answerFromBook": None, "answerSource": src, "proposedAnswer": None, "extraSlotAnswer": ans}
    if n in t20_task1_notes: d["note"] = t20_task1_notes[n]
    task1_items.append(d)

topic20 = {
 "printedLabel": "TOPIC 20", "title": "접속사", "pages": [46, 57],
 "continuesFromPrevRange": False, "continuesIntoNextRange": False,
 "sections": [
  {"kind": "passOff", "heading": "1. Pass-Off Sentences", "page": 46, "groups": [
    {"label": "(1) 등위접속사", "page": 46, "explanation": None, "items": t20_po1},
    {"label": "(2) 종속접속사", "page": 46, "explanation": None, "items": t20_po2},
  ]},
  {"kind": "application", "heading": "2. Application Sentences", "page": 47, "groups": app_groups_json(t20_app)},
  {"kind": "review", "heading": "Review", "page": 51, "tasks": [
    {"no": "1.", "page": 51, "instruction": "다음 문장을 보고 접속사에 밑줄을 긋고, 종속접속사는 종속, 등위접속사는 등위라고 적으시오.",
     "taskTypes": ["underline_conjunction", "classify_coordinating_subordinating"], "items": task1_items},
    {"no": "2.", "page": 53, "instruction": "다음을 보고 영작하시오.", "taskTypes": ["ko_to_en_compose"],
     "items": build_review_items(t20_task2, t20_app, t20_task2_notes)},
  ]},
 ],
}

# ============================================================== issues
I = []
def iss(page, where, text, typ, problem, fix, conf):
    I.append({"page": page, "where": where, "text": text, "type": typ, "problem": problem, "fix": fix, "confidence": conf})

# --- TOPIC 19 English / explanation
iss(30, "TOPIC 19 passOff 1) item 5 (for) · application 5) item 1 (p32)", "I do a little interview to prepare for school. (8과)", "english_grammar",
    "'interview'는 오식. STUDENT 8과(s8-4) 원문은 'I do a little review to prepare for school'(학교 준비로 간단히 복습한다). 'interview'로는 뜻이 통하지 않고 리뷰 한국어(p39)도 이 오식을 따라 틀림.",
    "I do a little review to prepare for school.", "high")
iss(30, "TOPIC 19 passOff 1) item 8 (before) · application 7) item 3 (p33)", "We meet before class with our teacher for morning session. (5과)", "english_grammar",
    "'morning session' 앞 관사 누락. 옛 STUDENT 원문을 그대로 옮긴 것이고, 현재 사이트 s5-3은 'for the morning session'으로 고쳐져 있음.",
    "We meet before class with our teacher for the morning session.", "high")
iss(30, "TOPIC 19 passOff 1) item 11 (without) · application 7) item 14 (p33)", "Finally she could succeed without their help.", "english_grammar",
    "과거에 실제로 한 번 해낸 일에는 긍정문 could를 쓰지 않음(was able to / managed to / 과거형).",
    "Finally, she was able to succeed without their help. (또는 In the end, she succeeded without their help.)", "medium")
iss(30, "TOPIC 19 passOff 2) item 3", "I have many relatives because my father and have many brothers and sisters. (4과)", "english_grammar",
    "'my father and' 뒤에 'my mother'가 빠져 문장이 성립하지 않음. 같은 문장의 p34 적용판과 STUDENT 4과(s4-2)에는 어머니가 있음.",
    "I have many relatives because my father and mother have many brothers and sisters.", "high")
iss(30, "TOPIC 19 passOff 2) item 7 · application 8) item 14 (p34)", "Since I was young, I learned to like history books and novels because I could read about the wisdom of many people. (13과)", "english_grammar",
    "since(~이래로)절과 주절의 단순과거 'learned'가 맞지 않음(since면 현재완료). 옛 STUDENT 13과 원문 그대로이며 현재 사이트 s13-1은 'When I was young, ...'으로 고쳐져 있음. 접속사 since의 대표 예문으로 틀린 시제를 가르치게 됨.",
    "Since I was young, I have loved history books and novels because I can read about the wisdom of many people. (13과 현재 문장을 쓰려면: When I was young, I learned to like ...)", "high")
iss(30, "TOPIC 19 passOff 2) item 8 · application 8) item 16 (p34)", "Since the end of the war in 1953, the country began to develop very quickly. (17과)", "english_grammar",
    "since + 과거 시점 뒤 주절에 단순과거 'began'은 시제 불일치. 옛 STUDENT 17과 원문 그대로이며 현재 사이트 s17-4는 'has developed very quickly'로 고쳐져 있음.",
    "Since the end of the war in 1953, the country has developed very quickly.", "high")
iss(30, "TOPIC 19 문장부호 여러 곳: passOff 1) item 7 (p30) · passOff 1) item 9 (p30)과 application 7) item 6 (p33) · application 9) items 10, 26, 28, 37 (p35-37)",
    "In spite of the rain, they enjoyed themselves / After a few minutes , I finally get out of bed. / I like visiting my relatives on Sunday afternoons(11과) / After that, I quickly write in my journal about my day (9과) / The land of Korea is a peninsula located between China and Japan(20과) / She is one of my best friends(3과)", "english_grammar",
    "마침표 누락, 쉼표 앞 공백('minutes ,'). 사소하지만 웹 문장 그대로 쓰면 정답 비교와 음성 클립 키(텍스트 해시)에 영향.",
    "문장 끝 마침표 추가, 'minutes ,' → 'minutes,'", "high")
iss(31, "TOPIC 19 passOff 3) item 6 · application 9) item 20 (p36)", "She had worked at a department store for several years. (1과)", "layout_or_extraction",
    "과 번호 오류: 이 문장은 STUDENT 1과가 아니라 2과(s2-3)에 있음.", "(2과)", "high")
iss(31, "TOPIC 19 passOff 3) item 6 · application 9) item 20 (p36) · review 1) item 69 (p43)", "She had worked at a department store for several years.", "english_unnatural",
    "기준이 되는 과거 시점 없이 단독으로 쓴 과거완료 'had worked'는 부자연스러움. 옛 STUDENT 원문 그대로이며 현재 사이트 s2-3은 'She worked ...'로 고쳐져 있음. 리뷰 한국어 '일했었다'도 이를 따름.",
    "She worked at a department store for several years. / 그녀는 몇 년 동안 백화점에서 일했다.", "medium")
iss(31, "TOPIC 19 passOff 3) item 4 · application 9) item 15 (p35) · review 1) item 64 (p43)", "I can draw his face within my memory.", "english_unnatural",
    "'within my memory'는 영어에서 쓰지 않는 표현(기억만으로 그리다 = from memory, 떠올리다 = picture ... in my mind). within의 예문으로 부적절.",
    "I can draw his face from memory. (within 예문이 필요하면: The station is within walking distance.)", "high")
iss(31, "TOPIC 19 passOff 3) item 10 · application 9) item 27 (p36)", "I like to walk along the park with my dog.", "english_unnatural",
    "along은 길·강·해변처럼 길게 이어진 곳에 쓰므로 'along the park'는 다소 어색함.",
    "I like to walk along the river with my dog. (또는 I like to walk in the park with my dog.)", "low")
iss(36, "TOPIC 19 application 9) item 27", "I like to walk along the park with my dog.", "grammar_explanation_wrong",
    "밑줄이 학습 대상 'along'이 아니라 'with'에 그어져 있음. 패스오프 (3) 목록 순서(around 다음, between 앞)로 보아 이 문장의 대상은 along이고 with는 이미 (1)에서 다룸.",
    "밑줄을 along으로 옮김", "medium")
iss(31, "TOPIC 19 passOff 3) item 14 · application 9) item 31 (p36) · review 1) item 80 (p44)", "For a while, Korea was ruled by Japan. (17과)", "english_unnatural",
    "문법은 맞지만 1910~1945년 35년간의 식민 지배를 'for a while(잠시 동안)'로 표현해 역사적 뉘앙스가 부적절. 옛 STUDENT 원문 그대로이며 현재 사이트 s17-3은 'Later, Korea was ruled by Japan from 1910 to 1945.'로 고쳐져 있음. 리뷰 한국어도 '잠시 동안'.",
    "For 35 years (1910–1945), Korea was ruled by Japan. / 35년 동안(1910~1945년) 한국은 일본의 지배를 받았다.", "medium")
iss(31, "TOPIC 19 passOff 3) item 15", "Before I go to school, my mother gives me my allowance. (5과)", "grammar_explanation_wrong",
    "'중요전치사들' 목록에 있지만 여기서 before는 절(I go to school)을 이끄는 종속접속사. 이 문장은 TOPIC 19 적용·리뷰에는 없고 TOPIC 20(접속사) 적용(p50)·리뷰(p57)에 다시 나옴.",
    "전치사 예문으로 바꾸기(Before class, my mother gives me my allowance.) 또는 접속사 단원에만 두기", "medium")
iss(31, "TOPIC 19 passOff 3) item 23 · application 9) item 40 (p37) · review 1) item 89 (p45)", "I mailed the letter today, so they receive it by Monday.", "english_grammar",
    "앞으로 일어날 일인데 현재형 'receive'를 써 어색함(will / should 필요).",
    "I mailed the letter today, so they should receive it by Monday.", "high")
iss(37, "TOPIC 19 application 9) item 40", "I mailed the letter today, so they receive it by Monday.", "grammar_explanation_wrong",
    "밑줄이 학습 대상 'by'가 아니라 접속사 'so'에 그어져 있음(패스오프 주석 '월요일까지는 받을 것임'의 핵심은 by).",
    "밑줄을 by로 옮김", "high")
iss(31, "TOPIC 19 passOff 3) item 25 · application 9) item 43 (p37)", "... By the time she arrived, most of the other guest had left.", "english_grammar",
    "'most of the other guest'는 복수 'guests'여야 함.",
    "By the time she arrived, most of the other guests had left.", "high")
iss(37, "TOPIC 19 application 9) item 43", "By the time she arrived, most of the other guest had left.", "grammar_explanation_wrong",
    "밑줄이 'By (the time)'이 아니라 'of'에 그어져 있음. 이 문장의 학습 대상은 by the time(패스오프 주석 '그 즈음에').",
    "밑줄을 By the time으로 옮김", "high")
iss(31, "TOPIC 19 passOff 3) item 25 주석", "(그 즈음에)", "grammar_explanation_wrong",
    "'by the time'은 '~할 무렵에는 이미'(그 시점 전에 끝남)라서 과거완료 had left와 짝을 이룸. '그 즈음에'만으로는 '이미'라는 핵심이 빠짐.",
    "(~했을 때는 이미)", "low")
iss(34, "TOPIC 19 application 8) items 6 · 8", "Because of this, I have many friends.(3과) / =She couldn’t study well because of her illness.", "grammar_explanation_wrong",
    "(2) 전치사·접속사 비교가 목적인데 'Because of'는 Because에만 밑줄이 있고(of 빠짐), '=... because of her illness' 줄은 밑줄이 아예 없어 because(접속사)와 because of(전치사)가 시각적으로 구별되지 않음.",
    "밑줄을 'Because of' 전체로, because of her illness에도 밑줄", "low")
iss(32, "TOPIC 19 application 3) item 3 · review 1) item 9 (p38)", "She can give a lot of benefits to everyone with her wisdom.", "english_unnatural",
    "'give a lot of benefits to everyone'은 어색한 직역 영어.",
    "She can do a lot of good for everyone with her wisdom. (또는 She can benefit everyone greatly with her wisdom.)", "medium")
iss(32, "TOPIC 19 application 4) item 2 · review 1) item 11 (p38)", "These palaces are called the house of David.", "english_unnatural",
    "복수 주어(These palaces)에 단수 보어(the house of David)라 의미가 어색하고, 고유명칭이면 대문자(the House of David). 한국어 '데이빗'도 성경 맥락이면 '다윗'.",
    "This palace is called the House of David.", "medium")
iss(32, "TOPIC 19 application 2) item 2", "I start my daily routines at 7:00.", "english_unnatural",
    "'daily routine'은 보통 단수로 씀.", "I start my daily routine at 7:00.", "low")
iss(33, "TOPIC 19 application 7) item 2", "In spite of the poverty, they got stronger.", "english_unnatural",
    "특정한 가난을 가리키지 않으면 'the poverty'보다 'their poverty'가 자연스러움.",
    "In spite of their poverty, they grew stronger.", "low")
iss(33, "TOPIC 19 application 7) item 5", "She passes before our office every day.", "english_unnatural",
    "'pass before'(~앞을 지나가다)는 현대 영어에서 거의 쓰지 않음(by / past). 장소의 before는 'stood before the audience' 같은 격식체에만 자연스러움.",
    "She passes by our office every day. (또는 She walks past our office every day.)", "medium")
iss(33, "TOPIC 19 application 7) item 8", "Would you follow after him?", "english_unnatural",
    "'follow after'는 고어·성경투 중복 표현(follow 자체가 '뒤따르다').",
    "Would you go after him? (after 유지) / Would you follow him?", "medium")
iss(33, "TOPIC 19 application 7) item 12", "He entered the living room by the backdoor.", "english_grammar",
    "건물의 뒷문은 두 단어 'back door'(한 단어 backdoor는 주로 형용사·비유 '뒷거래' 등).",
    "He entered the living room by the back door.", "medium")
iss(34, "TOPIC 19 application 8) item 13", "=She didn’t start to teach English until 30.", "english_grammar",
    "'until 30'만으로는 나이를 뜻하지 못함.",
    "She didn’t start to teach English until she was 30. (또는 until the age of 30)", "high")
iss(35, "TOPIC 19 application 9) item 5 · review 1) item 54 (p42)", "Luckily I could buy the shop at a low price.", "english_grammar",
    "과거에 실제로 해낸 일에는 긍정문 could 대신 was able to / managed to.",
    "Luckily, I was able to buy the shop at a low price.", "medium")
iss(35, "TOPIC 19 application 9) item 16", "Boil the soup within 5 minutes.", "english_unnatural",
    "요리 지시는 보통 'for 5 minutes'이고 'within 5 minutes'(5분 이내에 끓여라)는 상황이 어색함.",
    "Finish the soup within 5 minutes. (또는 Please reply within 5 minutes.)", "low")
iss(36, "TOPIC 19 application 9) item 19 · review 1) item 68 (p43)", "They had helped people in need during life.", "english_grammar",
    "'during life'는 관사·소유격 없이 쓰지 않음(during their lives / lifetime). 기준 시점 없는 과거완료 'had helped'도 부자연스러움.",
    "They helped people in need during their lifetime.", "high")
iss(36, "TOPIC 19 application 9) item 25", "Don’t waste time in wandering around the town.", "english_grammar",
    "현대 영어는 'waste time -ing'(in 없이)가 표준.",
    "Don’t waste time wandering around the town.", "medium")
iss(36, "TOPIC 19 application 9) item 22", "Draw the line from A through B to C.", "english_unnatural",
    "처음 긋는 선이므로 'a line'이 자연스러움('draw the line'은 '선을 긋다=한계를 정하다' 관용구와 겹침).",
    "Draw a line from A through B to C.", "low")

# --- TOPIC 19 review Korean
iss(38, "TOPIC 19 review 1) item 3", "너는 저녁에 얼마나 자주 외출하니?", "translation_mismatch",
    "영어는 'Do you often go out in the evening?'(자주 나가니? 예/아니오 질문)인데 한국어는 '얼마나 자주'(How often ...?)라 학생이 다른 문장을 쓰게 됨.",
    "너는 저녁에 자주 외출하니?", "high")
iss(38, "TOPIC 19 review 1) item 8", "제가 이 책으로 당신을 도울 수 있어요.", "translation_mismatch",
    "'help you with this book'은 '이 책(에 관한 일)을 도와주다'인데 '이 책으로'는 '이 책을 이용해서'로 읽혀 with의 용법이 달라짐.",
    "제가 이 책(공부)을 도와 드릴 수 있어요.", "medium")
iss(39, "TOPIC 19 review 1) item 13", "나는 학교를 위해 준비한 작은 인터뷰를 한다.", "translation_mismatch",
    "영어 오식 'interview'(원래 review)를 그대로 옮겼고, 'to prepare for school'(학교 갈 준비를 하려고)을 '학교를 위해 준비한'으로 잘못 옮김.",
    "나는 학교 수업 준비로 간단히 복습을 한다. (→ I do a little review to prepare for school.)", "high")
iss(39, "TOPIC 19 review 1) item 15", "나는 그들에게 미안하다. 그들은 매우 다른 상황에 있다.", "translation_mismatch",
    "'feel sorry for'는 '안됐다/불쌍하다'(미안하다 아님), 'difficult'는 '어려운'(다른 아님). 두 곳 모두 오역.",
    "나는 그들이 안됐다. 그들은 매우 어려운 상황에 있다.", "high")
iss(39, "TOPIC 19 review 1) item 19", "그는 자주 마을 근처를 돌아다닌다.", "translation_mismatch",
    "'wander about the town'은 '마을 여기저기(안)를 돌아다니다'. '근처'는 마을 주변으로 읽힘.",
    "그는 자주 마을 여기저기를 돌아다닌다.", "low")
iss(39, "TOPIC 19 review 1) item 20", "비가 옴에도 불구하고, 그들은 자신을 즐겼다.", "translation_mismatch",
    "'enjoyed themselves'를 '자신을 즐겼다'로 직역한 어색한 한국어.",
    "비가 왔는데도 그들은 즐거운 시간을 보냈다.", "low")
iss(40, "TOPIC 19 review 1) item 24", "그는 매일 우리 사무실 앞을 지난다.", "translation_mismatch",
    "영어 문장의 주어는 She인데 한국어는 '그는'.",
    "그녀는 매일 우리 사무실 앞을 지나간다.", "high")
iss(41, "TOPIC 19 review 1) item 39", "나는 아버지와 어머니가 많은 남동생과 여동생을 가졌기 때문에 친척이 많다.", "translation_mismatch",
    "'brothers and sisters'는 '형제자매'(나이 무관)인데 '남동생과 여동생'으로 옮김.",
    "아버지와 어머니 두 분 다 형제자매가 많으셔서 나는 친척이 많다.", "high")
iss(41, "TOPIC 19 review 1) item 43", "나는 10시 반이 될 때까지 일어나지 못했다.", "translation_mismatch",
    "'didn’t get up'은 '일어나지 않았다'(못했다 아님). not ~ until은 '~이 되어서야 ~했다'가 자연스러움.",
    "나는 10시 반이 되어서야 일어났다.", "low")
iss(41, "TOPIC 19 review 1) item 46", "내가 어렸을 때 이후로, 나는 역사책과 소설책을 좋아하는 것을 알게 되었는데 왜냐하면, 내가 많은 사람들의 지혜에 관해 읽을 수 있어서였다.", "translation_mismatch",
    "'learned to like'는 '좋아하게 되었다'(좋아하는 것을 알게 되었다 아님). 영어 문장의 시제 오류와 함께 고쳐야 함.",
    "어렸을 때부터 나는 역사책과 소설을 좋아하게 되었는데, 많은 사람들의 지혜에 대해 읽을 수 있었기 때문이다.", "medium")
iss(42, "TOPIC 19 review 1) item 48", "1953년 전쟁이 끝난 후, 그 나라는 매우 빠르게 개발되기 시작되었다.", "korean_typo",
    "'개발되기 시작되었다'는 이중 피동으로 어색하고 '발전'이 맞는 말. since(~이래로)를 '끝난 후'로 옮김.",
    "1953년 전쟁이 끝난 이래로 그 나라는 매우 빠르게 발전해 왔다.", "medium")
iss(42, "TOPIC 19 review 1) items 55 · 67 (p43)", "나는 저녁에 무엇을 할까요? / 주중에 나는 무엇을 할까요?", "translation_mismatch",
    "'What do I do ...?'는 일과를 묻는 '나는 ~에 무엇을 하나요?'인데 '할까요?'는 제안·의향(What shall I do?)으로 읽힘.",
    "나는 저녁에 무엇을 하나요? / 나는 주중에 무엇을 하나요?", "low")
iss(42, "TOPIC 19 review 1) item 57", "내 의견으로. 그들의 이론에는 두 결점이 있다.", "korean_typo",
    "쉼표 자리에 마침표가 찍혀 문장이 끊기고 '두 결점'도 어색함.",
    "내 의견으로는, 그들의 이론에는 두 가지 결점이 있다.", "high")
iss(42, "TOPIC 19 review 1) item 58", "나는 며칠 안에 돌아올 거야.", "translation_mismatch",
    "'in a few days'는 '며칠 후에'. '며칠 안에'는 within의 뜻이라 같은 단원에서 가르치는 in/within 구별을 흐림.",
    "나는 며칠 후에 돌아올 거야.", "medium")
iss(43, "TOPIC 19 review 1) item 59", "나는 내 친척들을 방문하기를 좋아해.", "translation_mismatch",
    "영어의 'on Sunday afternoons'가 빠져 이 문항의 학습 대상인 전치사 on을 쓸 자리가 없음.",
    "나는 일요일 오후마다 친척들을 방문하는 것을 좋아해.", "high")
iss(43, "TOPIC 19 review 1) item 60", "나는 TV로 게임을 보았다.", "translation_mismatch",
    "'the game'은 운동 경기. '게임'은 비디오게임으로 읽힘.", "나는 TV로 그 경기를 보았다.", "low")
iss(43, "TOPIC 19 review 1) item 63", "그는 무례해, 그는 항상 전화를 먼저 끊는다.", "translation_mismatch",
    "'hang up on me'는 '(말하는 중에) 내 전화를 일방적으로 끊다'. '먼저 끊는다'는 on me의 뉘앙스가 빠짐. 영어는 두 문장인데 한국어는 쉼표로 이어짐.",
    "그는 무례해. 그는 항상 내 전화를 일방적으로 끊어 버린다.", "low")
iss(44, "TOPIC 19 review 1) item 78", "나의 집은 나무들 사이에 초가이다.", "translation_mismatch",
    "'있는'이 빠져 문장이 성립하지 않고, 'cottage'는 '작은 시골집'이지 '초가'가 아님.",
    "나의 집은 나무들 사이에 있는 작은 시골집이다.", "medium")
iss(45, "TOPIC 19 review 1) item 90", "프레드는 월요일까지 돌아올 것이다.", "translation_mismatch",
    "영어 'Fred will be away until Monday'는 '월요일까지 (계속) 자리를 비운다'. 한국어 '월요일까지 돌아올 것이다'는 by의 뜻이라, 이 단원이 가르치는 by/until 구별을 정반대로 가르침(패스오프 주석 '월요일에는 돌아올 것임'과도 어긋남).",
    "프레드는 월요일까지 (계속) 자리를 비울 것이다.", "high")
iss(45, "TOPIC 19 review 1) item 91", "제인의 차가 파티로 가는 도중에 부서졌다.", "translation_mismatch",
    "'broke down'은 '고장 났다'(부서졌다 아님).", "제인의 차가 파티에 가는 도중에 고장 났다.", "high")
iss(45, "TOPIC 19 review 1) item 92", "그녀가 도착할 즈음에, 다른 손님들의 대부분이 떠났다.", "translation_mismatch",
    "과거완료 had left(이미 떠나고 없었다)와 by the time(~했을 때는 이미)의 뜻이 살지 않음.",
    "그녀가 도착했을 때는 다른 손님들 대부분이 이미 떠나고 없었다.", "low")
iss(45, "TOPIC 19 review 1) items 25 (p40) · 88 (p45)", "몇 분 후에, 나는 마침내 침대에서 일어난다. / 몇 분 후에, 나는 마침내 자리에서 일어난다.", "answer_ambiguous",
    "같은 영어 문장(After a few minutes, I finally get out of bed.)이 한 리뷰에 두 번 나오고 한국어가 서로 다름('자리에서'는 앉은 자리로도 읽힘).",
    "한 번만 내거나 둘 다 '잠자리에서 일어난다'로 통일", "medium")
iss(40, "TOPIC 19 review 1) items 31, 32 (p40) · 54 (p42) · 82 (p44) · 89 (p45)", "들어 왔다 / 복습 함으로써 / 살수 있었다 / 나뉘어 졌다 / 부쳤고,그들은", "korean_typo",
    "띄어쓰기·문장부호 오류(31번 '후문'은 집이면 '뒷문'이 자연스러움).",
    "들어왔다 / 복습함으로써 / 살 수 있었다 / 나뉘었다 / 부쳤고, 그들은", "high")

# --- TOPIC 20
iss(46, "TOPIC 20 passOff 2) item 13 라벨", "As if (even though) : Even though it is hard work, ...", "grammar_explanation_wrong",
    "라벨이 틀림: 'as if'(마치 ~인 것처럼)는 'even though'(비록 ~이지만)와 뜻이 다름. 예문은 even though를 쓰고 있어 라벨만 잘못됨(even if를 의도한 것으로 보임).",
    "Even though (Even if) :", "high")
iss(46, "TOPIC 20 passOff 2) item 5 · application 2) item 17 (p49) · review 1) item 9 (p51)", "Never a moment goes by unless I think of him.", "english_unnatural",
    "unless를 쓴 이 문장은 원어민이 쓰지 않는 어색한 표현(관용 표현은 'Not a moment goes by when I don’t think of him'). unless의 대표 예문으로 부적절.",
    "unless 예문: I won’t go unless you come with me. / 원래 뜻: Not a moment goes by when I don’t think of him.", "medium")
iss(46, "TOPIC 20 문장부호: passOff 1) items 1 · 3, passOff 2) item 1 (p46) · application 1) item 2 (p47)",
    "He is my friend and I am proud of him(3과) / I often go and visit them or they come and visit me .(4과) / when I get home, I chat on the computer with my friends(10과) / He likes to eat fish and chips", "english_grammar",
    "마침표 누락, 마침표 앞 공백, 문장 첫 글자 소문자(when).",
    "He is my friend and I am proud of him. / ... visit me. / When I get home, I chat on the computer with my friends. / He likes to eat fish and chips.", "high")
iss(46, "TOPIC 20 passOff 2) item 11 · application 2) items 30–31 (p50)", "Be careful lest you should fall from the tree.", "english_unnatural",
    "문법은 맞지만 'lest ~ should'는 현대 영어에서 거의 쓰지 않는 문어·고어체. 가르칠 때 '시험용 문어체'임을 알려야 함.",
    "Be careful so that you don’t fall from the tree. (또는 Be careful not to fall from the tree.)", "low")
iss(47, "TOPIC 20 application 1) item 3 · review 2) item 3 (p53)", "We’re waiting for hours and hours.", "english_grammar",
    "몇 시간째 기다리는 중이라는 뜻은 현재완료진행형이 필요.", "We’ve been waiting for hours and hours.", "high")
iss(48, "TOPIC 20 application 1) item 13", "She felt hungry, so she made herself sandwiches.", "english_unnatural",
    "관사 없이 'sandwiches'는 어색함.", "She felt hungry, so she made herself a sandwich.", "low")
iss(48, "TOPIC 20 application 2) item 3 · review 2) item 17 (p54)", "There are times when I like chocolate. / 내가 초콜릿을 좋아하던 시절이 있었다.", "translation_mismatch",
    "영어는 '(가끔) 초콜릿이 좋을 때가 있다'(현재), 한국어는 'There was a time when I liked chocolate'(과거). 한국어대로 쓰면 책 영어와 다름. 또 여기서 when은 관계부사라 접속사 예로도 애매함.",
    "영어를 'There was a time when I liked chocolate.'로 바꾸거나 한국어를 '나는 가끔 초콜릿이 당길 때가 있다.'로", "high")
iss(48, "TOPIC 20 application 2) item 12", "Robin, as you know, has been better nowadays.", "english_unnatural",
    "'nowadays'와 현재완료 'has been better'의 결합이 어색함.", "Robin, as you know, is much better these days.", "medium")
iss(49, "TOPIC 20 application 2) item 15 · review 2) item 27 (p55)", "He will not go to sleep unless you read books for him.", "english_unnatural",
    "'read books for him'은 '그를 대신해 책을 읽다'로 읽힘. 아이에게 읽어 주는 것은 read to him.",
    "He won’t go to sleep unless you read to him. (또는 read him a story)", "medium")
iss(49, "TOPIC 20 application 2) item 20 · review 2) item 32 (p55)", "If they gave the students deep impression, they could change their lives.", "english_grammar",
    "'impression'은 가산명사라 관사가 필요하고, '깊은 인상을 주다'는 make a deep impression on.",
    "If they made a deep impression on the students, they could change their lives.", "high")
iss(49, "TOPIC 20 application 2) item 23 · review 2) item 35 (p56)", "He could stay the palace as long as he wanted.", "english_grammar",
    "stay는 자동사라 장소 앞에 전치사가 필요.", "He could stay in the palace as long as he wanted.", "high")
iss(50, "TOPIC 20 application 2) item 29", "Give me strength that I may stand against them.", "english_unnatural",
    "'so' 없이 쓴 'that I may'는 성경·고어체.", "Give me strength so that I can stand against them.", "low")
iss(50, "TOPIC 20 application 2) item 33 · review 2) item 45 (p56)", "Though she had no one to be friends, she could be satisfied with learning and growing herself.", "english_grammar",
    "'no one to be friends'는 with가 빠졌고, 'growing herself'는 '자기 자신을 키우다'로 읽힘. 'could be satisfied'도 어색.",
    "Though she had no one to be friends with, she was able to find satisfaction in learning and growing on her own.", "high")
iss(51, "TOPIC 20 review 1) items 2 · 3 · 10 · 17 (p51-52)", "... thought of Korea and Koreans ... / I often go and visit them or they come and visit me. / Don’t tell Sue what I said if ... / ... learn new things and spend time ...", "answer_ambiguous",
    "한 문장에 접속사가 둘 이상(but+and, or+and×2, Even though+and) 있어 어디에 밑줄을 그을지 정해져 있지 않고, what(관계대명사)을 접속사로 착각할 여지도 있음. 책에 정답이 없음.",
    "문항마다 '목표 접속사 1개' 또는 '모든 접속사'를 명시하고 정답표 제공(이 파일의 extraSlotAnswer)", "medium")
iss(53, "TOPIC 20 review 2) item 1", "그는 나의 친구이고 나는 그를 존경스러워한다.", "translation_mismatch",
    "'proud of'는 '자랑스러워하다'(존경하다 아님). '존경스러워한다'도 비표준 표현.",
    "그는 내 친구이고 나는 그가 자랑스럽다.", "medium")
iss(53, "TOPIC 20 review 2) item 4", "그녀는 고양이를 집어 들어서 상자 안에 넣는다.", "translation_mismatch",
    "영어는 과거(picked up, put), 한국어는 현재 '넣는다'. kitten은 새끼 고양이.",
    "그녀는 새끼 고양이를 집어 들어서 상자 안에 넣었다.", "medium")
iss(54, "TOPIC 20 review 2) item 18", "내가 하교 후에 집에 도착했을 때, 나의 어머니는 항상 나를 보고 기뻐하셨다.", "translation_mismatch",
    "영어(8과)는 현재 습관(When I come home ..., my mother is always glad ...)인데 한국어는 과거.",
    "내가 학교를 마치고 집에 오면, 어머니는 항상 나를 반가워하신다.", "medium")
iss(54, "TOPIC 20 review 2) item 20", "그녀는 그가 말하기를 마쳤을 때까지 기다렸다.", "translation_mismatch",
    "'마쳤을 때까지'는 어색한 직역.", "그녀는 그가 말을 마칠 때까지 기다렸다.", "low")
iss(55, "TOPIC 20 review 2) item 28", "나는 그녀가 안전하지 않는다면, 그녀를 떠날 수 없어요.", "korean_typo",
    "형용사 '안전하다'의 부정은 '안전하지 않다면'('않는다면'은 틀림).",
    "그녀가 안전하지 않다면, 나는 그녀를 떠날 수 없어요.", "high")
iss(55, "TOPIC 20 review 2) item 29", "나는 당신을 생각하지 않고는 한 순간도 지나가지 않아요.", "translation_mismatch",
    "영어는 him(그)인데 한국어는 '당신'. '나는 ... 한 순간도 지나가지 않아요'는 주어가 맞지 않는 비문.",
    "그를 생각하지 않고 지나가는 순간은 한 순간도 없다.", "high")
iss(55, "TOPIC 20 review 2) items 32 · 33", "만약, 그들이 학생들에게 깊은 감명을 준다면, 그들은 그 인생을 바꿀 수 있을 텐데. / 내가 너라면, 나는 걱정하지 않아.", "translation_mismatch",
    "가정법 뉘앙스가 약함('그 인생'은 누구의 인생인지 불분명, 'I wouldn’t worry'는 '걱정하지 않을 거야').",
    "만약 그들이 학생들에게 깊은 감명을 준다면 학생들의 인생을 바꿀 수 있을 텐데. / 내가 너라면 걱정하지 않을 거야.", "low")
iss(56, "TOPIC 20 review 2) item 39", "나는 그들과 편리하게 의사소통 할 수 있기 위해서 나는 영어를 잘 말하는 것을 배워야만 한다.", "translation_mismatch",
    "'comfortably'는 '편하게/불편 없이'(편리하게 아님). '나는'이 두 번 나오고 '의사소통 할'은 띄어쓰기 오류.",
    "그들과 편하게 의사소통할 수 있도록 나는 영어를 잘 말하는 법을 배워야 한다.", "medium")
iss(56, "TOPIC 20 review 2) item 40", "내가 당신을 들을 수 있기 위해서 크게 말하세요.", "translation_mismatch",
    "'당신을 들을 수'는 비문에 가까운 직역.", "내가 (당신 말을) 들을 수 있도록 크게 말하세요.", "low")
iss(57, "TOPIC 20 review 2) item 46", "지미는 그것이 위험했었지만, 그 실험을 먼저 했다.", "translation_mismatch",
    "'went ahead with'는 '(위험·반대에도) 강행했다'. '먼저 했다'는 오역.",
    "지미는 그 실험이 위험했는데도 강행했다.", "high")
iss(57, "TOPIC 20 review 2) item 47", "그것이 비록 힘든 일이었지만, 나는 내 친구들과 / 새로운 것을 배우고 친구들과 시간을 보내는 것이 행복하다.", "layout_or_extraction",
    "한 문장이 문항 간격으로 떨어진 두 줄에 인쇄되어 두 문항처럼 보이고 '친구들과'가 중복됨. 시제도 영어(is)와 달리 과거('일이었지만').",
    "비록 힘든 일이지만, 나는 새로운 것을 배우고 친구들과 시간을 보내는 것이 행복하다. (한 문항으로)", "high")
iss(53, "TOPIC 20 review 2) items 9 · 11 (p53) · 12 · 14 (p54)", "우리 영화관에 외출할까 아니면 집에 있을까? / 서너 살 이었다 / 조용해 지도록 / 할거야", "korean_typo",
    "띄어쓰기 오류와 어색한 표현.",
    "우리 영화 보러 나갈까, 아니면 집에 있을까? / 서너 살이었다 / 조용해지도록 / 할 거야", "high")
iss(57, "TOPIC 20 review 2) item 50", "너는 자격증을 얻기 전에 몇 가지 시험을 통과해야 한다.", "translation_mismatch",
    "'license'는 '면허(증)'. 자격증은 certificate/qualification.",
    "너는 면허를 따기 전에 몇 가지 시험을 통과해야 한다.", "low")

doc = {
 "book": "g3",
 "pageRange": [30, 57],
 "frontMatter": {
   "introText": None,
   "notes": "범위 안에 표지·특징/학습법·구성도·목차 페이지 없음. p30은 TOPIC 19(전치사), p46은 TOPIC 20(접속사) 시작 페이지이고 p57이 책의 마지막 페이지(PDF 57쪽, 뒤표지 없음). 모든 페이지에 머리띠 'The Revolution of English Education', 바닥 'Pass-Off English 패스오프 잉글리쉬' 로고, 대각선 'Pass-Off English' 워터마크(텍스트 레이어에 'Pass-Off English'로 섞여 나옴). 강조 방식: 패스오프 섹션은 라벨(in :, and : …)만 굵게이고 TOPIC 20 패스오프는 초점 단어에 밑줄(‘so that’은 굵게+밑줄). TOPIC 19 적용 섹션(p32-37)은 초점 전치사에 밑줄(굵게 아님), TOPIC 20 적용 섹션(p47-50)은 표시 없음(‘so that’ 한 곳만 굵게). 밑줄은 PDF 선 그림에서 좌표로 추출해 이미지로 확인했고 'underlined' 필드에 기록(스키마의 'bold'는 실제 굵은 글자만). 리뷰 프롬프트(한국어·영어)는 전부 굵게 인쇄. 리뷰 문항 번호는 책에 없어 순서대로 매김. 적용 섹션 그룹은 p32의 in/at/with/of/for/about만 라벨이 인쇄되어 있고 나머지는 라벨 없이 이어지는 목록이라 label=null + inferredLabel(추정)로 묶음. focusInferred는 추출자의 추정 초점어. studentSource는 현재 사이트 STUDENT 파일 문장(textOriginal은 최초 가져오기 커밋 3705523의 문장이 다를 때만)."
 },
 "topics": [topic19, topic20],
 "issues": I,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)

# ------------------------------------------------ counts for self-check
def cnt_items(sec):
    return sum(len(g["items"]) for g in sec["groups"])
for t in doc["topics"]:
    po = [s for s in t["sections"] if s["kind"] == "passOff"][0]
    ap = [s for s in t["sections"] if s["kind"] == "application"][0]
    rv = [s for s in t["sections"] if s["kind"] == "review"][0]
    per_page = {}
    for s in (po, ap):
        for g in s["groups"]:
            for it in g["items"]:
                per_page.setdefault(it["page"], 0); per_page[it["page"]] += 1
    rv_page = {}
    for tk in rv["tasks"]:
        for it in tk["items"]:
            rv_page.setdefault(it["page"], 0); rv_page[it["page"]] += 1
    refs = sum(1 for s in (po,) for g in s["groups"] for it in g["items"] if it["lessonRef"])
    refs_app = sum(1 for g in ap["groups"] for it in g["items"] if it["lessonRef"])
    no_rev = [it["en"] for g in ap["groups"] for it in g["items"] if it["reviewRef"] is None]
    print(t["printedLabel"], "passOff", cnt_items(po), "application", cnt_items(ap),
          "review", [len(tk["items"]) for tk in rv["tasks"]], "lessonRefs passOff", refs, "app", refs_app)
    print("  items per page", dict(sorted(per_page.items())), "review per page", dict(sorted(rv_page.items())))
    print("  app items without review prompt:", no_rev)
print("issues", len(I), "high", sum(1 for x in I if x["confidence"] == "high"),
      {k: sum(1 for x in I if x["type"] == k) for k in sorted(set(x["type"] for x in I))})
