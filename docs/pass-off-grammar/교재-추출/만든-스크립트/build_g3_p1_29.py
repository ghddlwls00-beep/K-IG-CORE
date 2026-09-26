# -*- coding: utf-8 -*-
# Builds g3-p1-29.json from the PDF itself (exact characters), then attaches
# hand-written answer keys and issues. Every issue "text" is verified against the page.
import pymupdf, json, re, sys, io, difflib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PDF = r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf"
OUT = r"C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE--claude-worktrees-korean-market-analysis-39e7fc\5adf4ccb-9cea-421f-9195-b5f31b723c7f\scratchpad\pdf\out\g3-p1-29.json"
doc = pymupdf.open(PDF)

# ---------------------------------------------------------------- page reading
def lines_of(pno):
    page = doc[pno - 1]
    d = page.get_text("dict")
    res = []
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for l in b["lines"]:
            spans = l["spans"]
            text = "".join(s["text"] for s in spans)
            if not text.strip():
                continue
            main = next(s for s in spans if s["text"].strip())
            bold_spans = [s["text"].strip() for s in spans
                          if s["text"].strip() and ("Bold" in s["font"] or s["flags"] & 16)]
            res.append(dict(y=round(l["bbox"][1]), x=round(l["bbox"][0]), text=text,
                            font=main["font"], size=round(main["size"]), bold_spans=bold_spans))
    res.sort(key=lambda r: (r["y"], r["x"]))
    return res

def classify(r):
    f, s = r["font"], r["size"]
    if f == "Batang": return "pagenum"
    if f == "Tahoma-Bold" and s in (10, 55): return "chrome"
    if f == "Tahoma-Bold" and s == 20: return "topic_label"
    if f == "HYwulB": return "topic_title"
    if f == "Tahoma-Bold" and s == 15: return "section"
    if f == "Tahoma-Bold" and s == 18: return "review"
    if f == "MalgunGothicBold" and s == 12: return "group"
    if f == "MalgunGothicRegular" and s == 12: return "task"
    if f == "MalgunGothicRegular" and s == 11: return "item"
    if f == "MalgunGothicBold" and s == 11: return "prompt"
    return "unknown"

# first line of a sentence that the book wraps onto a second line (checked on the images)
JOIN = {(5, 397), (6, 490), (8, 549)}

def parse_item(p, raw, r):
    en, tag, ref = raw, None, None
    m = re.search(r"\s*\((\d+)과\)\s*$", en)
    if m:
        ref = int(m.group(1)); en = en[:m.start()]
    m = re.match(r"^(\*[^:]+:)\s*(.*)$", en)
    if m:
        tag, en = m.group(1), m.group(2)
    m = re.match(r"^(Cf\.\))\s*(.*)$", en)
    if m:
        tag, en = m.group(1), m.group(2)
    m = re.search(r"\s*(\(=[^)]*\)|\([가-힣 ]+\))\s*$", en)
    if m:
        tag = m.group(1); en = en[:m.start()]
    return dict(page=p, en=en.rstrip(), ko=None, bold=r["bold_spans"], tag=tag, lessonRef=ref, raw=raw)

topics = []
cur_topic = cur_section = cur_group = cur_task = None
page_counts = {}
for p in range(5, 30):
    L = lines_of(p)
    labels = [r for r in L if classify(r) == "topic_label"]
    titles = [r for r in L if classify(r) == "topic_title"]
    if labels:
        m = re.search(r"TOPIC\s+(\d+)", labels[0]["text"])
        cur_topic = dict(printedLabel=f"TOPIC {m.group(1)}",
                         title=re.sub(r"\s+", "", titles[0]["text"]),
                         printedTitle=titles[0]["text"].strip(),
                         pages=[p, p], continuesFromPrevRange=False, continuesIntoNextRange=False,
                         sections=[])
        topics.append(cur_topic); cur_section = None
    cur_topic["pages"][1] = p
    cnt = dict(item=0, prompt=0, group=0, task=0)
    i = 0
    while i < len(L):
        r = L[i]; c = classify(r); text = r["text"].strip()
        if (p, r["y"]) in JOIN:
            text = text + " " + L[i + 1]["text"].strip(); i += 1
        if c in ("pagenum", "chrome", "topic_label", "topic_title"):
            pass
        elif c == "section":
            kind = "passOff" if "Pass-Off" in text else "application"
            cur_section = dict(kind=kind, heading=text, page=p, groups=[])
            cur_topic["sections"].append(cur_section)
            if kind == "application":
                cur_group = dict(label=None, explanation=None, items=[])
                cur_section["groups"].append(cur_group)
        elif c == "group":
            cur_group = dict(label=text, explanation=None, items=[])
            cur_section["groups"].append(cur_group); cnt["group"] += 1
        elif c == "item":
            cur_group["items"].append(parse_item(p, text, r)); cnt["item"] += 1
        elif c == "review":
            cur_section = dict(kind="review", heading=text, page=p, tasks=[])
            cur_topic["sections"].append(cur_section)
        elif c == "task":
            m = re.match(r"^(\(\d+\)|\d+\.)\s*(.*)$", text)
            cur_task = dict(no=m.group(1), page=p, instruction=m.group(2), taskTypes=[], items=[])
            cur_section["tasks"].append(cur_task); cnt["task"] += 1
        elif c == "prompt":
            cur_task["items"].append(dict(page=p, prompt=text)); cnt["prompt"] += 1
        else:
            raise SystemExit(f"unknown line p{p}: {r}")
        i += 1
    page_counts[p] = cnt

def sec(t, kind):
    return next(s for s in t["sections"] if s["kind"] == kind)

T = {t["printedLabel"]: t for t in topics}
assert list(T) == ["TOPIC 16", "TOPIC 17", "TOPIC 18"], list(T)

# ---------------------------------------------------------------- TOPIC 18 task 2: prompt + '=' slots
t18rev = sec(T["TOPIC 18"], "review")
task2 = t18rev["tasks"][1]
assert task2["no"] == "2."
newitems, cur = [], None
for it in task2["items"]:
    if it["prompt"].startswith("="):
        cur["slots"].append(re.sub(r"\s+", " ", it["prompt"]))
    else:
        cur = dict(page=it["page"], prompt=it["prompt"], slots=[]); newitems.append(cur)
assert [len(x["slots"]) for x in newitems] == [1, 1, 1, 1, 2, 1], [len(x["slots"]) for x in newitems]
flat = []
for k, x in enumerate(newitems, 1):
    for j, s in enumerate(x["slots"]):
        n = str(k) if len(x["slots"]) == 1 else f"{k}{'ab'[j]}"
        flat.append(dict(page=x["page"], prompt=x["prompt"], n=n, printedSlot=s))
task2["items"] = flat

# ---------------------------------------------------------------- helpers for sources
def po_groups(t): return sec(t, "passOff")["groups"]
def app_items(t): return sec(t, "application")["groups"][0]["items"]

def norm(s):
    s = s.replace("’", "'").replace("‘", "'")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([.,?!])", r"\1", s)
    return s.lower()

def split_part(en, part):
    if part is None:
        return en
    return [x.strip() for x in en.split("=")][part]

def resolve(t, spec):
    """spec: ('app', k[, part]) | ('po', g, i[, part]) | ('same', g, i)"""
    kind = spec[0]
    if kind == "app":
        k = spec[1]; part = spec[2] if len(spec) > 2 else None
        it = app_items(t)[k - 1]
        src = f"application item {k}" + (f" ('=' 기준 {part + 1}번째 부분)" if part is not None else "")
        return split_part(it["en"], part), src, dict(section="application", group=None, item=k, part=part)
    g, i = spec[1], spec[2]
    part = spec[3] if (kind == "po" and len(spec) > 3) else None
    grp = po_groups(t)[g - 1]; it = grp["items"][i - 1]
    dup = [k for k, a in enumerate(app_items(t), 1) if norm(a["en"]) == norm(it["en"])]
    src = f"passOff group#{g} '{grp['label']}' item {i}"
    if part is not None:
        src += f" ('=' 기준 {part + 1}번째 부분)"
    if kind == "same":
        src += " — 제시문 자체가 이 문장"
    if dup:
        src += f"; application item {dup[0]}에도 같은 줄"
    ans = None if kind == "same" else split_part(it["en"], part)
    return ans, src, dict(section="passOff", group=g, item=i, part=part)

# ---------------------------------------------------------------- answer keys
# each entry: (spec, extraSlot, extraSlotAnswer, answerFix, promptFix)
def plain(spec, answerFix=None, promptFix=None):
    return (spec, None, None, answerFix, promptFix)

KEYS = {}
# TOPIC 16 (1): 22 Korean prompts == application items 1..22 in order
k16 = [plain(("app", n)) for n in range(1, 23)]
fix16 = {
    1: (None, "(네가) 운동을 한다면 기분이 더 좋아질 텐데."),
    2: (None, "제가 당신 전화를 써도 괜찮을까요? (Would you mind if ~ 구문으로)"),
    3: ("If I knew the answer, I would tell you.", "만약 내가 답을 안다면 너에게 말해 줄 텐데."),
    4: (None, "눈이 오지 않는다면 우리는 등산할 수 있을 텐데."),
    6: ("If I didn’t want to buy this camera, I wouldn’t buy it.", None),
    8: ("If I really want to become a great interpreter, I need to work hard at improving my English from now on.", None),
    11: (None, "만약 내가 새였다면, 나는 너에게 날아갔을 텐데."),
    12: ("If I had known you were in the hospital, I would have gone to see you.", "만약 네가 병원에 입원했다는 걸 알았더라면, 나는 너를 보러 갔을 텐데."),
    14: (None, "만약 그들이 그 전쟁에서 이겼다면, 세계 역사가 바뀌었을지도 모른다."),
    15: (None, "비가 그치면 좋겠다."),
    16: (None, "읽을 거리가 있으면 좋을 텐데."),
    17: ("I wish our apartment were more convenient.", "우리 아파트가 좀 더 편리하면 좋을 텐데."),
    18: (None, "정 선생님이 편찮으셨다는 걸 알았더라면 좋았을 텐데. (그랬다면) 나는 그를 만나러 갔을 텐데."),
    19: (None, "날씨가 더 따뜻했더라면 좋았을 텐데."),
    20: (None, "만약 그가 의사의 충고를 받아들였다면, 그는 (지금) 살아 있을지도 모른다."),
    21: ("If she had not bought the building, she would have a lot of money now.", "만약 그녀가 그 건물을 사지 않았다면, 그녀는 지금 돈이 많을 텐데."),
    22: (None, "만약 내가 그들에게 의지하지 않았다면, 나는 지금 더 독립적일 텐데."),
}
for n, (af, pf) in fix16.items():
    s = k16[n - 1]; k16[n - 1] = (s[0], s[1], s[2], af, pf)
KEYS[("TOPIC 16", "(1)")] = (["ko_to_en_compose"], k16)

# TOPIC 17 1.: English Pass-Off sentences, underline the modal and write its meaning
UL17 = "조동사에 밑줄 긋기 + 그 의미 쓰기"
k17a = [
    (("same", 1, 1), UL17, "can — 능력: ~할 수 있다", None, None),
    (("same", 1, 2), UL17, "Can — 능력(의문문): ~할 수 있니?", None, None),
    (("same", 1, 3), UL17, "be able to — 능력: ~할 수 있다(= can). want to는 조동사가 아님", None, None),
    (("same", 2, 1), UL17, "may — 추측: ~일지도 모른다", None, None),
    (("same", 2, 2), UL17, "may have been — 과거에 대한 추측: ~였을지도 모른다", None, None),
    (("same", 2, 3), UL17, "might have left — 과거에 대한 (약한) 추측: ~했을지도 모른다", None, None),
    (("same", 2, 4), UL17, "may as well — ~하는 편이 낫다(권유)", None, None),
    (("same", 3, 1), UL17, "should — 의무·충고: ~해야 한다 / ~하는 게 좋다 (= ought to)", None, None),
    (("same", 3, 2), UL17, "shouldn’t have eaten — 과거에 대한 후회: ~하지 말았어야 했는데", None, None),
    (("same", 3, 3), UL17, "used to — 과거의 습관: (예전에) ~하곤 했다", None, None),
    (("same", 3, 5), UL17, "had better — 강한 충고: ~하는 게 낫다(안 그러면 곤란하다)", None, None),
]
KEYS[("TOPIC 17", "1.")] = (["underline_modal", "write_meaning"], k17a)

# TOPIC 17 2.: 36 Korean prompts == application items 1..12, 14..37 (item 13 'James may be at school.' skipped)
apps17 = list(range(1, 13)) + list(range(14, 38))
k17b = [plain(("app", n)) for n in apps17]
fix17 = {  # keyed by review n
    1: ("He can fix cars and play soccer very well.", "그는 자동차 수리와 축구를 매우 잘할 수 있다."),
    14: (None, "너는 그것을 가게에 두고 왔을지도 몰라."),
    35: (None, "그녀는 좀 쉬는 게 좋겠다."),
    2: ("I can’t speak Chinese, but someday I’ll learn it.", None),
    3: (None, "너는 외국어를 할 줄 아니?"),
    6: (None, "나는 언젠가 그가 하는 것만큼 영어를 잘 말할 수 있으면 좋겠다."),
    7: (None, "지난 주말에 나는 그녀를 만날 수 없었다."),
    8: (None, "나는 언젠가 행복하게 살 수 있을 것이다."),
    9: (None, "나는 내 꿈을 이루고 많은 아이들이 배우고 성장하도록 도울 수 있을 것이다."),
    10: (None, "그는 (아마) 사무실에 있을지도 몰라."),
    12: (None, "제가 TV를 켜도 돼요? 네, 돼요."),
    13: (None, "그녀는 잠들어 있었을지도 몰라."),
    16: (None, "네가 혼란스러워하는 것도 당연하다."),
    17: ("Wherever you may go, I’ll never forget what you have done for me.", None),
    25: ("Carter used to stay up late.", "카터는 예전에 밤늦게까지 자지 않곤 했다."),
    26: (None, "그녀는 어렸을 때 개를 키웠었다."),
    28: ("The taxi driver is used to danger.", None),
    30: (None, "제니는 일찍 일어나는 데 익숙하지 않았다."),
    32: (None, "너는 집에 오는 게 좋겠다!"),
    33: (None, "너는 지금 떠나지 않는 게 좋겠다."),
    34: ("He had better spend his time wisely.", "그는 시간을 현명하게 쓰는 게 좋겠다."),
    36: (None, "너는 마지막 기차를 놓치지 않는 게 좋겠다."),
}
for n, (af, pf) in fix17.items():
    s = k17b[n - 1]; k17b[n - 1] = (s[0], s[1], s[2], af, pf)
KEYS[("TOPIC 17", "2.")] = (["ko_to_en_compose"], k17b)

# TOPIC 18 1.: English Pass-Off sentences, underline the adverbs
UL18 = "부사를 찾아 밑줄"
k18a = [
    (("same", 1, 1), UL18, "fairly (형용사 large를 꾸밈)", None, None),
    (("same", 1, 2), UL18, "more slowly (slowly는 speak를, more는 slowly를 꾸밈)", None, None),
    (("same", 1, 3), UL18, "truly (형용사 smart를 꾸밈) — 함정: sure, true는 형용사", None, None),
    (("same", 1, 4), UL18, "vaguely (동사 remember를 꾸밈)", None, None),
    (("same", 1, 5), UL18, "Usually (문장 전체), very (형용사 friendly를 꾸밈) — 함정: friendly는 -ly로 끝나도 형용사; in class는 부사구", None, None),
    (("same", 1, 6), UL18, "awfully (형용사 hungry를 꾸밈)", None, None),
    (("same", 3, 1), UL18, "merrily (동사 sing을 꾸밈)", None, None),
    (("same", 3, 2), UL18, "very (형용사 beautiful을 꾸밈)", None, None),
    (("same", 3, 3), UL18, "Perhaps (문장 전체를 꾸밈)", None, None),
    (("same", 3, 4), UL18, "Even (명사 Homer를 꾸밈), sometimes (빈도부사, 동사 nods를 꾸밈)", None, None),
    (("same", 3, 5), UL18, "Only (대명사 you를 꾸밈)", None, None),
    (("same", 3, 6), UL18, "now (시간 부사)", None, None),
]
KEYS[("TOPIC 18", "1.")] = (["underline_adverb"], k18a)

# TOPIC 18 2.: English prompt + '=' slot(s)
k18b = [
    (("po", 2, 1, 1), "'=' 다음 줄에 같은 뜻 문장 전체 쓰기 (밑줄 없음)", None, None, None),
    (("po", 2, 2, 1), "'=' 다음 줄에 같은 뜻 문장 전체 쓰기 (밑줄 없음)", None, None, None),
    (("po", 2, 3, 1), "'=' 다음 줄에 같은 뜻 문장 전체 쓰기 (밑줄 없음)", None, None, None),
    (("po", 4, 5, 1), "'= So' 뒤 밑줄 칸 채우기", "am I", None, None),
    (("po", 4, 6, 1), "'= Nei' 뒤 밑줄 칸 — 단어 중간(Nei-ther)부터 이어 쓰기", "ther am I (→ Neither am I)", None, None),
    (("po", 4, 6, 2), "'= Nor' 뒤 밑줄 칸 채우기", "am I", None, None),
    (("po", 4, 7, 1), "'= So' 뒤 밑줄 칸 채우기 (오른쪽에 '(정말 그렇다)' 풀이 인쇄)", "it was.", None, None),
]
KEYS[("TOPIC 18", "2.")] = (["rewrite_same_meaning", "complete_sentence_starter"], k18b)

# TOPIC 18 3.: 52 Korean prompts
apps18 = [("app", n) for n in range(1, 13)] + [("app", 13, 1), ("app", 14, 1), ("app", 15, 1)] \
    + [("app", n) for n in range(16, 33)] + [("app", n) for n in (34, 35, 36, 37, 41, 42)] \
    + [("app", n) for n in range(43, 57)]
k18c = [plain(s) for s in apps18]
fix18 = {
    7: (None, "그 회의는 준비가 엉망이었다."),
    9: (None, "보통 수업 시간에 학생들은 서로에게 매우 친절하다."),
    12: (None, "앨리스와 조는 매우 행복한 결혼 생활을 하고 있다."),
    15: (None, "나는 오늘 아침에 늦게 일어났다."),
    21: (None, "그녀는 내게 거의 말을 하지 않았다."),
    24: (None, "그 차(茶)는 마시기에 너무 뜨거웠다."),
    26: (None, "그 강은 수영할 수 있을 만큼 깨끗하지 않았다."),
    29: (None, "비가 많이 왔지만, 그들은 휴가를 즐겼다."),
    35: (None, "나는 그들을 정말 오랫동안 못 봤다. (such a long time)"),
    36: ("I haven’t seen them for so long.", "나는 그들을 그렇게 오래 못 봤다. (so long)"),
    37: (None, "나는 꽤 행복한 사람이다."),
    38: (None, "그들은 꽤 열심히 공부하고 있다."),
    42: ("How long will it take to get from your house to your school?", None),
    49: ("Where is the fire station?", None),
    50: (None, "너는 언제 떠나니?"),
    52: ("When did you graduate from university?", None),
}
for n, (af, pf) in fix18.items():
    s = k18c[n - 1]; k18c[n - 1] = (s[0], s[1], s[2], af, pf)
KEYS[("TOPIC 18", "3.")] = (["ko_to_en_compose"], k18c)

# attach keys
for t in topics:
    for task in sec(t, "review")["tasks"]:
        types, keys = KEYS[(t["printedLabel"], task["no"])]
        assert len(keys) == len(task["items"]), (t["printedLabel"], task["no"], len(keys), len(task["items"]))
        task["taskTypes"] = types
        out = []
        for n0, (it, (spec, slot, slotAns, aFix, pFix)) in enumerate(zip(task["items"], keys), 1):
            ans, src, ref = resolve(t, spec)
            lang = "ko" if re.search(r"[가-힣]", re.sub(r"\([^)]*\)", "", it["prompt"])) else "en"
            out.append(dict(
                n=it.get("n", str(n0)), page=it["page"], prompt=it["prompt"], promptLang=lang,
                extraSlot=(slot if "printedSlot" not in it else f"인쇄 '{it['printedSlot']}' — {slot}"),
                answerFromBook=ans, answerSource=src, proposedAnswer=None,
                extraSlotAnswer=slotAns, sourceRef=ref, answerFix=aFix, promptFix=pFix))
        task["items"] = out

# ---------------------------------------------------------------- per-item extras: impliedGroup, koFromReview, inApplication
IMPLIED = {
    "TOPIC 16": [(1, 7, "group#1 (1) 가정법 과거"), (8, 8, "group#2 (2) 가정법 현재"),
                 (9, 14, "group#3 (3) 가정법 과거완료"), (15, 19, "group#4 (4) I wish가정법"),
                 (20, 22, "(소주제 표시 없음) 혼합가정법 — group#3 과거완료의 확장")],
    "TOPIC 17": [(1, 9, "group#1 (1) 조동사 can"), (10, 18, "group#2 (2) 조동사 may"),
                 (19, 21, "(소주제 표시 없음) must"),
                 (22, 23, "group#3 (3) should"), (24, 28, "group#3 (3) used to"),
                 (29, 32, "group#3 (3) be used to / get used to"), (33, 37, "group#3 (3) had better")],
    "TOPIC 18": [(1, 12, "group#1 (1) –ly 부사"), (13, 16, "group#2 (2) 형용사와 형태가 같은 부사"),
                 (17, 31, "group#3 (2) 부사의 여러 가지 용법"), (32, 40, "group#4 (3) 주의해야 할 부사들"),
                 (41, 42, "group#5 (4) 비교급과 최상급 / 위치"), (43, 56, "group#6 (5) 의문부사")],
}
for t in topics:
    apps = app_items(t)
    ranges = IMPLIED[t["printedLabel"]]
    assert ranges[-1][1] == len(apps), (t["printedLabel"], len(apps))
    for k, a in enumerate(apps, 1):
        a["impliedGroup"] = next(lbl for s, e, lbl in ranges if s <= k <= e)
    # Korean prompts that translate each application item (or one '=' part of it)
    ko_by_app = {}
    for task in sec(t, "review")["tasks"]:
        for it in task["items"]:
            if it["promptLang"] == "ko" and it["sourceRef"]["section"] == "application":
                ko_by_app.setdefault(it["sourceRef"]["item"], []).append(
                    (it["sourceRef"]["part"], f"Review {task['no']} #{it['n']}: {it['prompt']}"))
    for k, a in enumerate(apps, 1):
        lst = ko_by_app.get(k)
        a["koFromReview"] = None if not lst else " / ".join(
            (f"['=' {p + 1}번째 부분만] " if p is not None else "") + s for p, s in lst)
    for g in po_groups(t):
        for it in g["items"]:
            dup = [k for k, a in enumerate(apps, 1) if norm(a["en"]) == norm(it["en"])]
            it["inApplication"] = dup[0] if dup else None
            it["koFromReview"] = apps[dup[0] - 1]["koFromReview"] if dup else None

# group explanation for TOPIC 17 group#3 (formulas printed in front of the examples)
g3 = po_groups(T["TOPIC 17"])[2]
g3["explanation"] = " | ".join(it["tag"] for it in g3["items"] if it["tag"] and it["tag"].startswith("*"))

# ---------------------------------------------------------------- crossRef per topic
for t in topics:
    apps = app_items(t)
    notin, near = [], []
    for gi, g in enumerate(po_groups(t), 1):
        for ii, it in enumerate(g["items"], 1):
            if it["inApplication"] is None:
                best = max(((difflib.SequenceMatcher(None, norm(it["en"]), norm(a["en"])).ratio(), k)
                            for k, a in enumerate(apps, 1)), default=(0, None))
                note = f" (application item {best[1]}과 거의 같음, 유사도 {best[0]:.2f})" if best[0] >= 0.85 else ""
                notin.append(f"group#{gi} item {ii}: {it['en']}{note}")
    not_reviewed = [f"application item {k}: {a['en']}" for k, a in enumerate(apps, 1) if a["koFromReview"] is None]
    partial = [f"application item {k}: {a['en']}" for k, a in enumerate(apps, 1)
               if a["koFromReview"] and "=" in a["en"] and "번째 부분만" in a["koFromReview"]]
    # unique sentences (passOff + application) with no Korean prompt anywhere; near-duplicate variants listed apart
    no_ko, variants, seen = [], [], {}
    for gi, g in enumerate(po_groups(t), 1):
        for ii, it in enumerate(g["items"], 1):
            if it["koFromReview"] is not None:
                continue
            best = max(((difflib.SequenceMatcher(None, norm(it["en"]), norm(a["en"])).ratio(), k)
                        for k, a in enumerate(apps, 1)), default=(0, None))
            if it["inApplication"] is None and best[0] >= 0.85 and apps[best[1] - 1]["koFromReview"]:
                variants.append(f"passOff group#{gi} item {ii}: {it['en']} — application item {best[1]}의 변형(그쪽 한국어: {apps[best[1] - 1]['koFromReview']})")
                continue
            where = f"passOff group#{gi} item {ii}" + (f" = application item {it['inApplication']}" if it["inApplication"] else "")
            seen[norm(it["en"])] = True
            no_ko.append(f"{it['en']} [{where}]")
    for k, a in enumerate(apps, 1):
        if a["koFromReview"] is None and norm(a["en"]) not in seen:
            no_ko.append(f"{a['en']} [application item {k}]")
    t["crossRef"] = dict(
        passOffCount=sum(len(g["items"]) for g in po_groups(t)),
        applicationCount=len(apps),
        passOffNotInApplicationVerbatim=notin,
        applicationWithoutKoreanPrompt=not_reviewed,
        applicationOnlyPartlyTranslated=partial,
        sentencesWithNoKoreanAnywhere=no_ko,
        nearDuplicateVariantsWithKoreanOnTwin=variants,
    )

# ---------------------------------------------------------------- issues
ISSUES = [
 # ---- front matter
 dict(page=2, where="특징 2. (Pass-Off Sentences와 Application Sentences) 첫 줄",
      text="sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다.",
      type="korean_typo",
      problem="문장 첫머리의 'Pass-Off'가 인쇄에서 빠져 'sentences에서는'으로 시작함(제목은 'Pass-Off Sentences와 Application Sentences').",
      fix="Pass-Off Sentences에서는 문법 설명에 앞서 상황 예문이나 표로 문법 내용을 설명한다.", confidence="high"),
 dict(page=2, where="특징 1. / 3., 학습법 2. ('연결고리 70개')",
      text="대주제 20개와 연결고리 70개로 이루어져 있다.",
      type="layout_or_extraction",
      problem="p3 연결고리 구성도의 소주제 말풍선을 세면 67개(Part 1 29개, Part 2 23개, Part 3 15개)로 '70개'와 맞지 않음. 한 말풍선에 두 항목이 든 경우(예: '과거 완료 / 미래 완료', '부사의 형태 / 부사의 용법')가 있어 세는 방법에 따라 달라짐. 대주제 20개(8+7+5)는 맞음.",
      fix="웹에 소주제 수를 적을 때는 실제 말풍선 수(67) 또는 항목을 쪼갠 기준을 정해 표기", confidence="medium"),
 dict(page=2, where="학습법 1.",
      text="학습대상을 Pass Off English를 마치거나 영어의 문법 기초가 필요한 초급자들을 학습의 대상으로 한다.",
      type="korean_typo",
      problem="'Pass Off'에 하이픈 누락, '학습대상을 … 학습의 대상으로 한다'로 같은 말이 겹침.",
      fix="Pass-Off Grammar는 Pass-Off English를 마쳤거나 영어 문법 기초가 필요한 초급자를 학습 대상으로 한다.", confidence="medium"),
 dict(page=2, where="특징 1. 외 띄어쓰기",
      text="형성 시켜준다",
      type="korean_typo",
      problem="띄어쓰기: '형성 시켜준다'→'형성시켜 준다', '소주제70개'→'소주제 70개', '각 소 주제별로'→'각 소주제별로', '짜여있어야'→'짜여 있어야', '이 때'→'이때'.",
      fix="형성시켜 준다 / 소주제 70개 / 각 소주제별로 / 짜여 있어야 / 이때", confidence="low"),
 dict(page=4, where="목차(p4)·구성도(p3) 가정법 두 번째 말풍선 vs 본문 p5",
      text="가정법의 과거완료 미 래",
      type="layout_or_extraction",
      problem="목차·구성도는 가정법 소주제를 '가정법 과거 / 가정법 과거완료·미래 / I wish 가정법'으로 안내하지만, 본문 p5에는 가정법 미래(If + should / were to) 예문이 하나도 없고 목차에 없는 '(2) 가정법 현재'가 들어가 있음.",
      fix="본문에 가정법 미래 소주제와 예문(예: If it should rain tomorrow, I would stay home. / If I were to be born again, I would be a doctor.)을 넣거나, 목차를 본문에 맞게 고침", confidence="high"),
 # ---- TOPIC 16
 dict(page=5, where="TOPIC 16 passOff group#1 '(1) 가정법 과거' item 3; application item 3; Review (1) #3",
      text="If you knew the answer, I would tell you.",
      type="english_unnatural",
      problem="문법은 맞지만 논리가 뒤집혀 있음: 네가 이미 답을 안다면 내가 너에게 말해 줄 이유가 없음. 가정법 과거의 전형 예문은 'If I knew the answer, I would tell you.'(내가 답을 안다면 말해 줄 텐데 = 사실은 모름). Review 한국어 제시문 '만약 네가 답을 안다면 내가 네게 말 할 텐데.'도 같은 논리 오류를 옮겼고 '말 할'은 '말할'로 붙여 써야 함.",
      fix="If I knew the answer, I would tell you. / 제시문: 만약 내가 답을 안다면 너에게 말해 줄 텐데.", confidence="high"),
 dict(page=5, where="TOPIC 16 passOff group#3 '(3) 가정법 과거완료' item 1",
      text="If I had known English, I should have been happy.",
      type="english_unnatural",
      problem="주절의 'I should have been'은 1인칭에서 would 대신 쓰던 옛 영국식 용법이라 요즘 학습자에게는 '~했어야 했다(의무)'로 읽힘. 같은 문장이 Application(p6)에서는 'could have been'으로 인쇄되고 Review 한국어('행복할 수 있었을 텐데')도 could에 맞춰져 있어 책 안에서 서로 다름.",
      fix="If I had known English, I could have been happy.", confidence="medium"),
 dict(page=5, where="TOPIC 16 passOff group#3 '(3) 가정법 과거완료' item 3",
      text="He could have done that if he head tried.",
      type="english_grammar",
      problem="오타: head → had (Application p7에는 had로 바르게 인쇄됨).",
      fix="He could have done that if he had tried.", confidence="high"),
 dict(page=5, where="TOPIC 16 passOff group#2 제목",
      text="(2) 가정법 현재",
      type="grammar_explanation_wrong",
      problem="'If I really want …, I need to …'는 현재·미래의 실제 조건을 말하는 직설법 조건문(1차 조건문)이지 사실과 반대를 말하는 가정법이 아님. '가정법 현재'는 옛 참고서식 명칭이고, 가정법 과거와 나란히 두면 '가정법 = 사실의 반대'라는 핵심 개념이 흐려짐.",
      fix="(2) 조건문(직설법): If + 현재, 현재/미래 — 가정법과 비교용이라고 밝힘", confidence="medium"),
 dict(page=5, where="TOPIC 16 passOff group#2 item 1; application item 8; Review (1) #8 정답",
      text="at improving English from now on.(16과)",
      type="english_unnatural",
      problem="STUDENT s16-3 원문은 'improving my English'인데 책에서 my가 빠짐. 'improving English'는 '영어라는 언어 자체를 개선한다'로 읽혀 어색함.",
      fix="If I really want to become a great interpreter, I need to work hard at improving my English from now on.", confidence="high"),
 dict(page=5, where="TOPIC 16 passOff group#4 제목",
      text="(4) I wish가정법",
      type="korean_typo", problem="띄어쓰기 누락.", fix="(4) I wish 가정법", confidence="low"),
 dict(page=6, where="TOPIC 16 application item 6; Review (1) #6 정답",
      text="If I didn’t want to buy this camera, I wouldn’t buy.",
      type="english_grammar",
      problem="타동사 buy의 목적어(it)가 빠짐. 또 '사고 싶지 않다면 안 살 것'이라는 같은 말 반복이라 가정법 예문으로서 뜻이 약함.",
      fix="If I didn’t want to buy this camera, I wouldn’t buy it. (더 나은 예: If I didn’t need this camera, I wouldn’t buy it.)", confidence="high"),
 dict(page=7, where="TOPIC 16 application item 12; Review (1) #12 정답",
      text="If I had known you were in hospital, I would have gone to you.",
      type="english_unnatural",
      problem="'gone to you'는 어색함 — 병문안은 'gone to see you / visited you'. ('in hospital'은 영국식, 미국식은 'in the hospital'로 둘 다 가능.)",
      fix="If I had known you were in the hospital, I would have gone to see you.", confidence="medium"),
 dict(page=7, where="TOPIC 16 application item 17; Review (1) #17 정답",
      text="I wish our apartment was more convenient.",
      type="english_grammar",
      problem="가정법을 가르치는 문장인데 학교 문법·시험에서 요구하는 형태는 were. 구어에서는 was도 쓰이지만 이 단원의 모범 답으로는 부적절함(웹 채점은 둘 다 정답 처리 권장).",
      fix="I wish our apartment were more convenient.", confidence="medium"),
 dict(page=7, where="TOPIC 16 application item 21; Review (1) #21 정답",
      text="If she had not bought the building, she had a lot of money now.",
      type="english_grammar",
      problem="혼합가정법 주절에 조동사가 빠짐. 과거 조건 → 현재 결과이므로 'would have'.",
      fix="If she had not bought the building, she would have a lot of money now.", confidence="high"),
 dict(page=8, where="TOPIC 16 Review (1) #1",
      text="만약 당신이 운동한다면, 당신은 더 좋게 느낄 거야.",
      type="translation_mismatch",
      problem="'~거야'는 will(실제 조건)로 읽혀 가정법 과거(would)가 드러나지 않고, '더 좋게 느낄'은 직역투. 학생이 'If you get exercise, you will feel better.'라고 써도 틀렸다고 할 근거가 없음.",
      fix="(네가) 운동을 한다면 기분이 더 좋아질 텐데.", confidence="medium"),
 dict(page=8, where="TOPIC 16 Review (1) #2",
      text="내가 너의 전화기를 써도 되겠니?",
      type="answer_ambiguous",
      problem="제시문만 보면 'Can/May I use your phone?'이 가장 자연스러운 답이라 목표 구문 'Would you mind if I used your phone?'을 끌어낼 수 없음.",
      fix="제가 당신 전화를 써도 괜찮을까요? (Would you mind if ~ 구문으로) — 구문 힌트를 붙이거나 두 답을 모두 인정", confidence="medium"),
 dict(page=8, where="TOPIC 16 Review (1) #4",
      text="만약 눈이 오지 않는다면, 우리는 등산 할 수 있을 텐데.",
      type="korean_typo", problem="띄어쓰기: '등산 할' → '등산할'.",
      fix="눈이 오지 않는다면 우리는 등산할 수 있을 텐데.", confidence="low"),
 dict(page=9, where="TOPIC 16 Review (1) #11",
      text="만약, 내가 새였다면, 나는 네게 날라갔을 텐데.",
      type="korean_typo",
      problem="'날라갔을'은 틀린 말(날다+가다 → 날아가다). '만약,' 뒤 쉼표도 불필요.",
      fix="만약 내가 새였다면, 나는 너에게 날아갔을 텐데.", confidence="high"),
 dict(page=9, where="TOPIC 16 Review (1) #14",
      text="만약 그들이 전쟁에서 이겼다면, 세계역사는 바뀌었을 것이다.",
      type="translation_mismatch",
      problem="might의 '~했을지도 모른다'가 빠지고 '바뀌었을 것이다'(would)로 옮김. '세계역사'는 '세계 역사'로 띄어 씀.",
      fix="만약 그들이 그 전쟁에서 이겼다면, 세계 역사가 바뀌었을지도 모른다.", confidence="low"),
 dict(page=9, where="TOPIC 16 Review (1) #15",
      text="나는 비가 그치기를 원한다.",
      type="translation_mismatch",
      problem="'I wish + would'는 '~하면 좋겠다'(지금 이루어지지 않는 바람)인데 '원한다'(want)로 옮겨, 학생이 'I want the rain to stop.'이라고 써도 제시문과 맞음. (#16, #17도 같은 문제로 따로 적음)",
      fix="비가 그치면 좋겠다.", confidence="medium"),
 dict(page=9, where="TOPIC 16 Review (1) #16",
      text="나는 읽을 무언가가 있기를 원한다.",
      type="translation_mismatch",
      problem="I wish I had ~(현재 사실과 반대되는 바람)를 '있기를 원한다'(want)로 옮겨 'I want something to read.'가 답이 될 수 있음.",
      fix="읽을 거리가 있으면 좋을 텐데.", confidence="medium"),
 dict(page=9, where="TOPIC 16 Review (1) #17",
      text="나는 우리 아파트가 조금 더 편리하기를 원한다.",
      type="translation_mismatch",
      problem="I wish + 과거(현재 사실과 반대)를 '편리하기를 원한다'(want)로 옮김.",
      fix="우리 아파트가 좀 더 편리하면 좋을 텐데.", confidence="medium"),
 dict(page=9, where="TOPIC 16 Review (1) #18",
      text="나는 내가 정선생님이 아팠다는 것을 알기를 원한다(그랬다면,)나는 그를 만나러 갔을 텐데.",
      type="translation_mismatch",
      problem="'I wish I had known'은 과거 일에 대한 후회('알았더라면 좋았을 텐데')인데 '알기를 원한다'(앞으로의 바람)로 옮김. '정선생님'→'정 선생님', '(그랬다면,)나는' 띄어쓰기도 틀림.",
      fix="정 선생님이 편찮으셨다는 걸 알았더라면 좋았을 텐데. (그랬다면) 나는 그를 만나러 갔을 텐데.", confidence="high"),
 dict(page=9, where="TOPIC 16 Review (1) #19",
      text="나는 날씨가 더 따듯하기를 바란다.",
      type="translation_mismatch",
      problem="'I wish it had been warmer'는 과거('더 따뜻했더라면 좋았을 텐데')인데 현재 바람으로 옮겨 학생이 'I wish it were warmer.'를 쓰게 됨. ('따듯하다'는 표준어라 맞춤법 오류는 아님.)",
      fix="날씨가 더 따뜻했더라면 좋았을 텐데.", confidence="high"),
 dict(page=9, where="TOPIC 16 Review (1) #20",
      text="만약 그가 의사의 충고를 받아들였다면, 그는 살아 있었을지도 모른다.",
      type="translation_mismatch",
      problem="영어는 혼합가정법(과거 조건 → 현재 결과 'might be alive')인데 한국어는 '살아 있었을지도'(과거)로 옮겨 학생이 'might have been alive'를 쓰게 됨.",
      fix="만약 그가 의사의 충고를 받아들였다면, 그는 (지금) 살아 있을지도 모른다.", confidence="medium"),
 dict(page=9, where="TOPIC 16 Review (1) #21",
      text="만약 그녀가 그 건물을 사지 않았다면, 그녀는 많은 돈을 가졌을 텐데.",
      type="translation_mismatch",
      problem="혼합가정법의 '지금' 결과인데 '가졌을 텐데'(과거)로 옮겼고 '많은 돈을 가졌을'은 직역투. (영어 쪽 오류는 application item 21 항목 참조)",
      fix="만약 그녀가 그 건물을 사지 않았다면, 그녀는 지금 돈이 많을 텐데.", confidence="medium"),
 dict(page=9, where="TOPIC 16 Review (1) #22",
      text="만약 내가 그들을 의지하지 않았다면, 나는 더 독립적이 되었을 텐데.",
      type="translation_mismatch",
      problem="조사 오류 '그들을 의지하지' → '그들에게 의지하지'. 영어 'would be'는 현재 결과인데 '되었을 텐데'(과거)로 옮김.",
      fix="만약 내가 그들에게 의지하지 않았다면, 나는 지금 더 독립적일 텐데.", confidence="medium"),
 # ---- TOPIC 17
 dict(page=10, where="TOPIC 17 passOff group#1 item 1; application item 1; Review 1. #1, 2. #1 정답",
      text="He can fix cars and play soccer very well(4과)",
      type="english_grammar",
      problem="문장 끝 마침표 누락(STUDENT s4-6 원문: '…very well.'). 세 곳 모두 같음.",
      fix="He can fix cars and play soccer very well.", confidence="low"),
 dict(page=10, where="TOPIC 17 passOff group#3 제목",
      text="(3)should / ought to / used to / had better",
      type="layout_or_extraction",
      problem="'(3)' 뒤 띄어쓰기 누락. 제목에 must가 없는데 Application에 must 예문 3개(She must call her parents at once. / You must not park here. / He must have been asleep.)가 소주제 없이 나옴.",
      fix="(3) must / should / ought to / used to / had better", confidence="medium"),
 dict(page=10, where="TOPIC 17 passOff group#3 item 4; application item 29; Review 2. #28 정답",
      text="The taxi driver is used to a danger",
      type="english_grammar",
      problem="'위험(한 상황) 일반'을 뜻하는 danger는 셀 수 없는 명사라 a를 붙이지 않음. p10에는 마침표 앞 공백('danger .')도 있음.",
      fix="The taxi driver is used to danger.", confidence="high"),
 dict(page=10, where="TOPIC 17 passOff group#3 item 4 앞 공식",
      text="*be used to ~ing:",
      type="grammar_explanation_wrong",
      problem="공식은 'be used to ~ing'인데 바로 뒤 예문은 동명사가 아닌 명사(danger)를 씀 → 'be used to + 명사/동명사'라고 해야 맞음. 또 be used to는 조동사가 아니라 형용사 구문이므로 조동사 used to와 '비교'용이라는 표시가 필요함.",
      fix="*be used to + 명사/동명사(~ing): ~에 익숙하다 (조동사 used to와 비교)", confidence="medium"),
 dict(page=11, where="TOPIC 17 application item 2; Review 2. #2 정답",
      text="I can’t speak Chinese, but someday, I ’ll learn.",
      type="english_grammar",
      problem="'I ’ll' 사이 공백(오타). learn 뒤 목적어 it이 있어야 자연스러움.",
      fix="I can’t speak Chinese, but someday I’ll learn it.", confidence="high"),
 dict(page=15, where="TOPIC 17 Review 2. #7 (application item 7 'Last weekend I wasn’t able to see her.')",
      text="지난주에 나는 그녀를 볼 수 없었다.",
      type="translation_mismatch",
      problem="영어는 Last weekend(지난 주말)인데 한국어는 '지난주' — 제시문대로 쓰면 'Last week'가 정답이 됨. see her는 '만나다'가 자연스러움.",
      fix="지난 주말에 나는 그녀를 만날 수 없었다.", confidence="high"),
 dict(page=15, where="TOPIC 17 Review 2. #8 (application item 8)",
      text="나는 언젠가 행복하게 살수 있기를 바란다.",
      type="translation_mismatch",
      problem="영어는 'I will be able to live happily someday.'(~할 수 있을 것이다)인데 한국어는 '바란다'(hope)라 학생이 'I hope to …'를 쓰게 됨. '살수' → '살 수'.",
      fix="나는 언젠가 행복하게 살 수 있을 것이다.", confidence="medium"),
 dict(page=15, where="TOPIC 17 Review 2. #9 (application item 9)",
      text="나는 내 꿈을 성취하고 많은 아이들이 배우고 자라도록 도울수 있기를 원한다.",
      type="translation_mismatch",
      problem="영어는 will be able to(~할 수 있을 것이다)인데 '원한다'(want)로 옮겨 학생이 'I want to be able to …'를 쓰게 됨. '도울수' → '도울 수'. (STUDENT s14-3 원문: 'I know that one day I will be able to …')",
      fix="나는 내 꿈을 이루고 많은 아이들이 배우고 성장하도록 도울 수 있을 것이다.", confidence="medium"),
 dict(page=15, where="TOPIC 17 Review 2. #6",
      text="나는 언젠가는 그가 하는 것 만큼 영어를 잘 말수 있기를 바란다.",
      type="korean_typo",
      problem="'것 만큼' → '것만큼'(조사는 붙여 씀), '말수' → '말할 수'.",
      fix="나는 언젠가 그가 하는 것만큼 영어를 잘 말할 수 있으면 좋겠다.", confidence="medium"),
 dict(page=15, where="TOPIC 17 Review 2. #3",
      text="너는 다른 외국어를 말할 수 있니?",
      type="translation_mismatch",
      problem="영어('Can you speak any foreign language?')에 없는 '다른'(other)이 들어가 학생이 'any other foreign language'를 쓰게 됨.",
      fix="너는 외국어를 할 줄 아니?", confidence="low"),
 dict(page=15, where="TOPIC 17 Review 2. #10",
      text="그는 그의 사무실에 있을 거야.",
      type="translation_mismatch",
      problem="may(추측, ~일지도 모른다)를 '있을 거야'(will/아마)로 옮겨 조동사 뜻이 흐려짐. 과제 1에서 may를 '추측'으로 쓰게 하면서 제시문은 확신에 가까움.",
      fix="그는 (아마) 사무실에 있을지도 몰라.", confidence="low"),
 dict(page=15, where="TOPIC 17 Review 2. #12",
      text="제가 TV를 켜도 되요? 그래요. 됩니다.",
      type="korean_typo",
      problem="'되요'는 틀린 표기('돼요'). '그래요. 됩니다.'도 어색함.",
      fix="제가 TV를 켜도 돼요? 네, 돼요.", confidence="high"),
 dict(page=12, where="TOPIC 17 application item 18; Review 2. #17 정답",
      text="Wherever you may go, I’ll never forget what you do to me.",
      type="english_unnatural",
      problem="'what you do to me'는 현재형이고 '나에게 (나쁜) 짓을 하다'로 읽힘. 한국어 제시문 '네가 내게 한 일'(과거, 고마운 일)과도 맞지 않음.",
      fix="Wherever you may go, I’ll never forget what you have done for me.", confidence="medium"),
 dict(page=16, where="TOPIC 17 Review 2. #16",
      text="네가 혼돈스러워 하는 것은 당연하다.",
      type="korean_typo",
      problem="confused는 '혼란스러워하다'가 자연스러움('혼돈'은 chaos). '-어하다'는 붙여 씀.",
      fix="네가 혼란스러워하는 것도 당연하다.", confidence="low"),
 dict(page=16, where="TOPIC 17 Review 2. #13",
      text="그녀는 잠이 들었을 거야.",
      type="translation_mismatch",
      problem="may have been(과거 추측 '~였을지도 모른다')을 '잠이 들었을 거야'로 옮겨 확신 정도가 달라지고, #20 '그는 잠이 들었음에 틀림없다'(must have)와 구분이 약함.",
      fix="그녀는 잠들어 있었을지도 몰라.", confidence="low"),
 dict(page=13, where="TOPIC 17 application item 26; Review 2. #25",
      text="Carter used to stay up.",
      type="english_unnatural",
      problem="stay up은 보통 late와 함께 써야 '밤늦게까지 안 자다' 뜻이 분명함. 한국어 제시문 '카터는 종종 (밤에) 자지 않고 있었다.'의 '종종'은 영어에 없음.",
      fix="Carter used to stay up late. / 제시문: 카터는 예전에 밤늦게까지 자지 않곤 했다.", confidence="medium"),
 dict(page=13, where="TOPIC 17 application item 35; Review 2. #34",
      text="He had better spend time wisely.",
      type="english_unnatural",
      problem="'spend his time wisely'가 자연스러움. 한국어 제시문의 '더'는 영어에 없음.",
      fix="He had better spend his time wisely.", confidence="low"),
 dict(page=17, where="TOPIC 17 Review 2. #30 (application item 31)",
      text="제니는 일찍 일어나는 일에 익숙지 않다.",
      type="translation_mismatch",
      problem="영어는 과거(Jenny wasn’t used to getting up early.)인데 한국어는 현재라 학생이 isn’t를 쓰게 됨.",
      fix="제니는 일찍 일어나는 데 익숙하지 않았다.", confidence="medium"),
 dict(page=17, where="TOPIC 17 Review 2. #32 (application item 33)",
      text="너는 일찍 집에 오는 것이 낫다.",
      type="translation_mismatch",
      problem="영어 'You had better come home!'에 없는 '일찍'이 들어 있음.",
      fix="너는 집에 오는 게 좋겠다! (또는 영어를 'You had better come home early.'로)", confidence="medium"),
 dict(page=17, where="TOPIC 17 Review 2. #33 (application item 34)",
      text="너는 지금 떠나는 것이 낫다.",
      type="translation_mismatch",
      problem="영어는 부정('You’d better not leave now.' 지금 떠나지 않는 게 좋겠다)인데 한국어는 긍정 — 정반대 뜻.",
      fix="너는 지금 떠나지 않는 게 좋겠다.", confidence="high"),
 dict(page=17, where="TOPIC 17 Review 2. #34 (application item 35)",
      text="드는 시간을 더 현명하게 쓰는 것이 낫다.",
      type="korean_typo",
      problem="'드는'은 '그는'의 오타.",
      fix="그는 시간을 현명하게 쓰는 게 좋겠다.", confidence="high"),
 dict(page=17, where="TOPIC 17 Review 2. #36",
      text="너는 마지막 기차를 놓치지 않는 것이 낫다",
      type="korean_typo", problem="마침표 누락.",
      fix="너는 마지막 기차를 놓치지 않는 게 좋겠다.", confidence="low"),
 dict(page=17, where="TOPIC 17 Review 2. #26",
      text="그녀는 그녀가 어렸을 때, 개를 가졌었다.",
      type="translation_mismatch",
      problem="직역투('그녀는 그녀가', '개를 가졌었다').",
      fix="그녀는 어렸을 때 개를 키웠었다.", confidence="low"),
 dict(page=15, where="TOPIC 17 Review 2. #1",
      text="그는 자동차 수리와 축구도 매우 잘 할 수 있다.",
      type="korean_typo",
      problem="'잘하다'(능숙하게 하다)는 한 단어라 '잘할 수'로 붙여 씀. '축구도'의 '도'는 어색함.",
      fix="그는 자동차 수리와 축구를 매우 잘할 수 있다.", confidence="low"),
 dict(page=16, where="TOPIC 17 Review 2. #14 (application item 15)",
      text="너는 가게에서 그것을 두었을지도 몰라.",
      type="translation_mismatch",
      problem="left it in the store는 '가게에 두고 왔다'인데 '가게에서 … 두었을지도'는 어색함.",
      fix="너는 그것을 가게에 두고 왔을지도 몰라.", confidence="low"),
 dict(page=17, where="TOPIC 17 Review 2. #35 (application item 36)",
      text="그녀는 휴식을 가지는 것이 낫다.",
      type="translation_mismatch",
      problem="'휴식을 가지는'은 영어 have a rest의 직역투.",
      fix="그녀는 좀 쉬는 게 좋겠다.", confidence="low"),
 dict(page=14, where="TOPIC 17 Review 1. #3",
      text="I want to be able to speak English as well as he does someday. (7과)",
      type="answer_ambiguous",
      problem="이 문장에는 진짜 조동사(can/may 등)가 없고 조동사 상당어구 be able to(= can)만 있음. '조동사에 줄을 긋고'라는 지시에 학생이 want to를 긋거나 아무것도 못 그을 수 있어 정답 기준이 필요함.",
      fix="정답: be able to (= can, 능력). 지시문을 '조동사(또는 조동사 역할을 하는 표현)'로", confidence="medium"),
 dict(page=10, where="TOPIC 17 passOff group#3 item 2; application item 23; Review 1. #9, 2. #22",
      text="I shouldn’t have eaten too much chocolate.",
      type="english_unnatural",
      problem="'too much'는 이미 '지나치게'라서 shouldn’t have와 뜻이 겹침; 보통 'so much'를 씀(틀린 문장은 아님).",
      fix="I shouldn’t have eaten so much chocolate.", confidence="low"),
 # ---- TOPIC 18
 dict(page=18, where="TOPIC 18 passOff group#3 제목",
      text="(2) 부사의 여러 가지 용법",
      type="layout_or_extraction",
      problem="소주제 번호 (2)가 두 번 나옴 → 뒤의 (3)(4)(5)도 하나씩 밀려야 함.",
      fix="(3) 부사의 여러 가지 용법 → 이어서 (4) 주의해야 할 부사들, (5) 비교급과 최상급 / 위치, (6) 의문부사", confidence="high"),
 dict(page=18, where="TOPIC 18 passOff group#2 item 4",
      text="Cf.) The early bird can catch the worms.",
      type="english_unnatural",
      problem="속담 원형은 'The early bird catches the worm.'(can·복수 worms 없음).",
      fix="Cf.) The early bird catches the worm.", confidence="high"),
 dict(page=18, where="TOPIC 18 passOff group#2 items 1–3; application items 13–15; Review 2. #1–3",
      text="Sue’s job is very hard = Sue works very hard.",
      type="grammar_explanation_wrong",
      problem="'='로 이었지만 뜻이 같지 않음: '일이 힘들다'(형용사 hard) ≠ '열심히 일한다'(부사 hard), 'I was late.'(늦었다) ≠ 'I got up late this morning.'(늦게 일어났다). 같은 형태가 형용사·부사로 쓰인다는 대비인데 Review 2가 '뜻이 같아지도록 영작하시오'라고 해 정답 근거가 없음. (Ben is a fast runner = Ben can run fast.는 거의 같은 뜻, 정확히는 Ben runs fast.)",
      fix="'=' 대신 '형용사 ↔ 부사'로 표시하고 Review 2 지시문을 '같은 단어를 부사로 써서 문장을 만드시오'로 바꿈. 뜻이 같은 짝이 필요하면: Sue is a very hard worker. = Sue works very hard. / I was late for school. = I got to school late.", confidence="high"),
 dict(page=19, where="TOPIC 18 passOff group#4 item 4",
      text="She hardly ate anything, she was really sad.",
      type="english_grammar",
      problem="쉼표만으로 두 문장을 이음(comma splice). Application p22에는 and가 들어가 서로 다름. 뜻으로는 because가 자연스러움.",
      fix="She hardly ate anything because she was really sad. (또는 …, and she was really sad.)", confidence="medium"),
 dict(page=19, where="TOPIC 18 passOff group#4 item 6; application item 39; Review 2. #5a·5b",
      text="I am not happy = Neither am I =Nor am I",
      type="grammar_explanation_wrong",
      problem="Neither am I / Nor am I는 'I am not happy, either.'(나도 행복하지 않아)와 같은 뜻이지 'I am not happy'와 같지 않음. 바로 위 'I am happy, too = So am I'와 짝을 맞추려면 either가 필요. '=Nor' 띄어쓰기도 틀림.",
      fix="I am not happy, either. = Neither am I. = Nor am I.", confidence="high"),
 dict(page=19, where="TOPIC 18 passOff group#4 item 7; application item 40; Review 2. #6",
      text="It was cold yesterday. = So it was. (정말 그렇다)",
      type="translation_mismatch",
      problem="So it was.는 과거이므로 풀이도 '정말 그랬다'가 맞음.",
      fix="It was cold yesterday. = So it was. (정말 그랬다)", confidence="low"),
 dict(page=19, where="TOPIC 18 passOff group#5 제목",
      text="(4) 비교급과 최상급 / 위치",
      type="grammar_explanation_wrong",
      problem="제목은 비교급·최상급·위치인데 예문 두 개(I am a pretty happy person. / They are studying pretty hard.)는 정도부사 pretty(꽤)일 뿐 비교급·최상급 부사가 하나도 없고, 위치 설명도 없음.",
      fix="비교급·최상급 부사 예문 추가(예: He runs faster than I do. / She sings (the) best in our class.) 또는 제목을 '(4) 정도부사 pretty와 부사의 위치'로", confidence="medium"),
 dict(page=22, where="TOPIC 18 application item 37; Review 3. #36 정답",
      text="I haven’t seen them for so long time.",
      type="english_grammar",
      problem="'so long time'은 비문(so 뒤에는 'so long' 또는 'so long a time').",
      fix="I haven’t seen them for so long.", confidence="high"),
 dict(page=28, where="TOPIC 18 Review 3. #35·#36 (application items 36·37)",
      text="나는 매우 긴 시간 동안 그들을 보지 못했다.",
      type="answer_ambiguous",
      problem="#35 '그렇게 긴 시간 동안'(such a long time)과 #36 '매우 긴 시간 동안'(so long)은 사실상 같은 뜻이라 어느 쪽에 such/so를 써야 할지 알 수 없고, '매우'는 very를 부름. 영어는 현재완료인데 제시문은 단순 과거.",
      fix="#35 나는 그들을 정말 오랫동안 못 봤다. (such a long time) / #36 나는 그들을 그렇게 오래 못 봤다. (so long) — 또는 두 답을 모두 인정", confidence="medium"),
 dict(page=23, where="TOPIC 18 application item 46; Review 3. #42 정답",
      text="How long will it take from your house and to your school?",
      type="english_grammar",
      problem="from A to B 사이에 and가 들어간 비문. take 뒤에 to get이 있어야 자연스러움.",
      fix="How long will it take to get from your house to your school?", confidence="high"),
 dict(page=23, where="TOPIC 18 application item 53; Review 3. #49 정답",
      text="Where is a fire station?",
      type="english_unnatural",
      problem="특정 소방서를 묻는 말은 the, 근처에 있는지 묻는 말은 'Is there a fire station near here?'. 'Where is a …?'는 어색함.",
      fix="Where is the fire station? (또는 Where is the nearest fire station?)", confidence="medium"),
 dict(page=23, where="TOPIC 18 application item 56; Review 3. #52 정답",
      text="When did you graduate from your university?",
      type="english_unnatural",
      problem="'graduate from university/college'가 관용 표현; your를 붙이면 어색함.",
      fix="When did you graduate from university?", confidence="medium"),
 dict(page=22, where="TOPIC 18 application items 29·30",
      text="Although it rained a lot, they enjoyed their holidays.",
      type="grammar_explanation_wrong",
      problem="although·unless(item 30 'You can’t go in unless you are a member.')는 부사가 아니라 종속접속사(부사절을 이끔). 부사 단원에 설명 없이 들어가 학생이 부사로 오해할 수 있음.",
      fix="'부사절(접속사 although/unless가 이끄는 절)'이라고 표시하거나 TOPIC 20 접속사로 옮김", confidence="low"),
 dict(page=21, where="TOPIC 18 application item 15",
      text="I  was late. = I got up late this morning.",
      type="layout_or_extraction",
      problem="'I'와 'was' 사이에 공백 두 칸(인쇄 오타).",
      fix="I was late. = I got up late this morning.", confidence="low"),
 dict(page=26, where="TOPIC 18 Review 3. #12 (application item 12)",
      text="앨리스와 조는 매우 행복하게 결혼했다.",
      type="translation_mismatch",
      problem="영어 'are very happily married'는 현재 상태(행복한 결혼 생활을 하고 있다)인데 한국어는 과거 사건('결혼했다')이라 학생이 'got married very happily'를 쓰게 됨.",
      fix="앨리스와 조는 매우 행복한 결혼 생활을 하고 있다.", confidence="medium"),
 dict(page=26, where="TOPIC 18 Review 3. #7",
      text="그 회의는 나쁘게 조직되어 있었다.",
      type="translation_mismatch",
      problem="직역투. badly organized는 '준비·진행이 엉망이었다'.",
      fix="그 회의는 준비가 엉망이었다.", confidence="low"),
 dict(page=26, where="TOPIC 18 Review 3. #9",
      text="보통 학급에서, 학생들은 서로 서로에게 매우 친절하다.",
      type="translation_mismatch",
      problem="in class는 '수업 시간에'; '서로 서로에게'는 겹말.",
      fix="보통 수업 시간에 학생들은 서로에게 매우 친절하다.", confidence="low"),
 dict(page=27, where="TOPIC 18 Review 3. #15",
      text="나는 오늘아침에 늦게 일어났다.",
      type="korean_typo", problem="띄어쓰기: '오늘아침' → '오늘 아침'.",
      fix="나는 오늘 아침에 늦게 일어났다.", confidence="low"),
 dict(page=27, where="TOPIC 18 Review 3. #21 (application item 21)",
      text="그녀는 내게 거의 말하지 않는다.",
      type="translation_mismatch",
      problem="영어는 과거(She hardly spoke to me.)인데 한국어는 현재.",
      fix="그녀는 내게 거의 말을 하지 않았다.", confidence="medium"),
 dict(page=27, where="TOPIC 18 Review 3. #24 (application item 24)",
      text="그 차가 마시기에 너무 뜨겁군.",
      type="translation_mismatch",
      problem="영어는 과거(The tea was too hot to drink.)인데 한국어는 현재 감탄이고, '차'가 tea/car로 헷갈릴 수 있음.",
      fix="그 차(茶)는 마시기에 너무 뜨거웠다.", confidence="low"),
 dict(page=28, where="TOPIC 18 Review 3. #26 (application item 26)",
      text="그 강은 안에서 수영할 만큼 충분히 깨끗해.",
      type="translation_mismatch",
      problem="영어는 부정·과거(The river wasn’t clean enough to swim in.)인데 한국어는 긍정·현재 — 정반대 뜻. '안에서'도 어색함.",
      fix="그 강은 수영할 수 있을 만큼 깨끗하지 않았다.", confidence="high"),
 dict(page=28, where="TOPIC 18 Review 3. #29 (application item 29)",
      text="비록 비가 많이 내렸더라도, 그들은 그 휴일은 즐겼다.",
      type="translation_mismatch",
      problem="although는 사실(비가 많이 왔다)이라 '내렸지만'이 맞고, holidays는 '휴가', '그 휴일은'의 조사 '은'도 어색함.",
      fix="비가 많이 왔지만, 그들은 휴가를 즐겼다.", confidence="low"),
 dict(page=28, where="TOPIC 18 Review 3. #37·#38 (application items 41·42)",
      text="나는 매우 행복한 사람이다.",
      type="translation_mismatch",
      problem="목표 부사는 pretty(꽤)인데 제시문은 '매우'(very)라 학생이 very를 쓰게 되어 이 소주제를 연습하지 못함. #38 '그들은 매우 열심히 공부하고 있다.'도 같음.",
      fix="나는 꽤 행복한 사람이다. / 그들은 꽤 열심히 공부하고 있다.", confidence="medium"),
 dict(page=29, where="TOPIC 18 Review 3. #50 (application item 54)",
      text="언제 너는 갈 거니?",
      type="translation_mismatch",
      problem="going away는 '(여행·이사 등으로) 떠나다'인데 '갈 거니'는 목적지 없이 모호함.",
      fix="너는 언제 떠나니?", confidence="low"),
 dict(page=24, where="TOPIC 18 Review 1. #5",
      text="Usually in class, the students are very friendly to each other. (5과)",
      type="answer_ambiguous",
      problem="정답은 Usually, very. friendly는 -ly로 끝나지만 형용사(함정)이고, in class는 부사구라 줄을 그을지 기준이 없음.",
      fix="정답: Usually, very (부사구 in class의 인정 여부를 정해 둘 것)", confidence="low"),
]

def pagetext(p):
    page = doc[p - 1]
    a = re.sub(r"\s+", " ", page.get_text())
    b = re.sub(r"\s+", " ", " ".join(r["text"] for r in lines_of(p)))
    return a + " || " + b

for iss in ISSUES:
    t = re.sub(r"\s+", " ", iss["text"]).strip()
    assert t in pagetext(iss["page"]), ("issue text not on page", iss["page"], iss["text"])

# ---------------------------------------------------------------- front matter
INTRO = """특징
1. Pass-Off Grammar 란?
Pass-Off English의 문법서이다.
Pass-Off English는 말하기가 우선적으로 이루어져야 하는 영어 교육이다. 그러나 speaking, listening, writing, vocabulary, grammar가 따로 구성되어 있지 않고 복합적으로 1년간 학습함으로써, Pass-Off English 학습자는 문법을 공부하기 전에 먼저 자신의 머릿속에 많은 영어 문장으로 그 지식의 근간을 형성 시켜준다. Pass-Off Grammar는 전체 문법이 대주제 20개와 연결고리 70개로 이루어져 있다. 각 문법에 대한 예문들은 TLA English의 문장들로 구성되어 있으므로, 이 책을 시작하기 전에 Pass-Off English의 560여 문장에 대한 학습이 선행되면 문법학습은 매우 쉽고 빠르게 일어난다.
2. Pass-Off Sentences와 Application Sentences
sentences에서는 문법 설명에 앞서 상황예문이나 표로 문법내용을 설명한다. 이 때 사용되는 예문이 Pass-Off English 의 예문이므로 선행학습자는 문법을 매우 쉽게 이해할 수 있다.
Application sentences는 대주제 20개와 소주제70개의 내용들에 관한 응용 문장들을 많이 접할 수 있게 하였다.
3. Review
전시간에 배웠던 문법사항에 대해 학습자 스스로 메모하여 내용을 정리하게 하였다.
문법은 어떤 학문보다 자신만의 조직적인 지식의 틀이 머릿속에 잘 짜여있어야 하므로 70개의 연결고리를 하나씩 암기하여 그 틀을 짜 볼 수 있게 하였다.
학습법
1. Pass-Off Grammar는 학습대상을 Pass Off English를 마치거나 영어의 문법 기초가 필요한 초급자들을 학습의 대상으로 한다.
2. Pass-Off sentences는 문법 예문으로 이를 반드시 암기해야 하며 70개의 문법 소주제 별로 교사의 문법 설명과 해당 문장을 외울 수 있어야 한다.
3. Application Sentences는 교사의 문법 설명과 완전하게 이해된 Pass-Off Sentences를 기초하여 보다 많은 문법 적용과 확장을 할 수 있도록 해석해야 하며 한글 번역을 보고 영어로 문장을 바로 말할 수 있도록 심화하는 학습도 권장한다.
4. Review 는 Pass-Off English의 기초 문장에 대한 test와 application sentence의 활용을 스스로 확인할 수 있게 하였다. 그러나 채점 후 틀린 문항은 반드시 다시 학습하여서 보충하기를 권한다.
5. 문법 진도가 나아갈수록 소주제와 대주제를 그려 가면서 각 소 주제별로 문법 내용과 문장을 정리하고 암기하여 다 적을 수 있어야만 한다. 따라서 하나의 소주제 학습이 끝났다고 진도를 빠르게 진행하는 것에 초점을 두지 말고 소주제 하나하나의 완전학습에 만전을 기하기를 명심하시기를 바란다."""
p2flat = re.sub(r"\s+", "", doc[1].get_text())
for para in INTRO.split("\n"):
    assert re.sub(r"\s+", "", para) in p2flat, ("intro paragraph not on p2", para)

FM_NOTES = ("p1 표지: 'Pass-Off English / Grammar 3', 방패 모양 Pass-Off English 로고, 'Techniques of Language Acquisition'(TLA). "
            "p2 특징·학습법(introText, 세 권 공통으로 보임). "
            "p3 'Pass-Off Grammar 연결고리 구성도': 세 권 전체(Part 1~3)의 대주제 20개와 소주제 말풍선을 한 장에 그린 그림 — "
            "말풍선을 세면 67개(Part 1 29, Part 2 23, Part 3 15)로 본문의 '연결고리 70개'와 다름. Part 3: 가정법(가정법 과거 / 가정법의 과거완료,미래 / I wish 가정법), "
            "조동사(조동사 1 / 2 / 3), 부사(부사의 종류 / 부사의 형태·부사의 용법 / 주의할 부사들,도치 / 부사의 위치·비교급,최상급), "
            "전치사(종류/목적어·부사의 위치 / 전치사,접속사·부사의 비교 / 중요 전치사들), 접속사(등위접속사 / 종속접속사). "
            "p4 'Pass-Off Grammar Part 3 목차': 가정법 5 · 조동사 10 · 부사 18 · 전치사 30 · 접속사 46 (본문 쪽수와 일치). "
            "목차의 '가정법의 과거완료 미래' 중 '가정법 미래'는 본문에 없고, 본문의 '(2) 가정법 현재'와 부사 '(5) 의문부사'는 목차에 없음. "
            "토픽 번호는 1권(TOPIC 1~8)·2권(9~15)에 이어 TOPIC 16부터 시작. 모든 본문 쪽에 머리띠 'The Revolution of English Education', "
            "대각선 워터마크 'Pass-Off English', 바닥글 로고 'Pass-Off English 패스오프 잉글리쉬'와 쪽 번호가 있음.")

CONVENTIONS = [
    "n: Review 문항 번호는 책에 인쇄되어 있지 않아 과제마다 1부터 붙인 순번임. TOPIC 18 과제 2의 5a·5b는 제시문 한 줄(I am not happy)에 빈칸이 두 개(= Nei / = Nor)라 나눈 것.",
    "bold: 이 범위의 Pass-Off·Application 예문에는 굵은 글씨가 전혀 없음(PDF 글꼴 정보로 확인). 그래서 모든 예문의 bold는 빈 배열 []. Review 제시문은 줄 전체가 굵은 글씨라 따로 적지 않음.",
    "en: 인쇄된 영어 그대로(곡선 따옴표 ’, 공백 두 칸, 마침표 앞 공백까지). '(N과)'는 lessonRef, '(=ought to)'·'*used to + 동원:'·'Cf.)'·'(정말 그렇다)'는 tag로 떼어 냄. raw는 인쇄된 줄 전체(두 줄에 걸친 문장은 공백 하나로 이음).",
    "Application에는 소주제 머리글이 인쇄되어 있지 않아 group 하나(label null)에 모두 넣고, 항목마다 impliedGroup(위치로 본 소속 소주제, 추정값)을 붙임.",
    "추가 필드: passOff 항목 inApplication(같은 문장이 있는 application 번호), 모든 예문 koFromReview(이 문장을 번역한 Review 한국어 제시문; 없으면 null), Review 항목 sourceRef(기계용 출처), answerFix(책 영어 정답이 틀렸거나 어색할 때의 수정본), promptFix(한국어/영어 제시문 수정본), 토픽 crossRef(중복·번역 누락 목록), 토픽 printedTitle(글자 사이 띄운 원래 제목).",
    "밑줄 과제(TOPIC 17 과제 1, TOPIC 18 과제 1)는 제시문이 곧 책의 영어 문장이라 answerFromBook은 null, 출처는 answerSource/sourceRef에, 정답(밑줄 칠 말과 뜻)은 extraSlotAnswer에 적음. proposedAnswer는 영작 정답이 책에 없을 때만 쓰는데, 이 범위의 영작·바꿔쓰기 문항은 모두 책 문장과 연결되어 null.",
    "answerSource의 group#N은 인쇄 순서대로 센 소주제 번호(TOPIC 18은 '(2)'가 두 번 인쇄되어 인쇄 번호와 group#가 다름). application item N은 Application 목록의 1부터 센 순번.",
]

result = dict(
    book="g3", pageRange=[1, 29],
    frontMatter=dict(introText=INTRO, notes=FM_NOTES),
    conventions=CONVENTIONS,
    topics=topics,
    issues=ISSUES,
)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- report
print("page counts (lines by class):")
for p, c in page_counts.items():
    print(f"  p{p}: {c}")
for t in topics:
    po = sum(len(g["items"]) for g in po_groups(t))
    ap = len(app_items(t))
    rv = sec(t, "review")
    print(t["printedLabel"], t["title"], t["pages"], "passOff", po, "app", ap,
          "tasks", [(x["no"], len(x["items"])) for x in rv["tasks"]])
    for k, v in t["crossRef"].items():
        print("   ", k, v)
from collections import Counter
print("issues:", len(ISSUES), Counter(i["confidence"] for i in ISSUES), Counter(i["type"] for i in ISSUES))
nfix = sum(1 for t in topics for x in sec(t, "review")["tasks"] for it in x["items"] if it["answerFix"])
npf = sum(1 for t in topics for x in sec(t, "review")["tasks"] for it in x["items"] if it["promptFix"])
print("answerFix", nfix, "promptFix", npf)
