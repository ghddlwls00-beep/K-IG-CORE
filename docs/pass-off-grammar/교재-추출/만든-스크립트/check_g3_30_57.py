# -*- coding: utf-8 -*-
# Two-way check of out/g3-p30-57.json against the PDF text layer (pages 30-57).
import json, re, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out", "g3-p30-57.json")
doc = json.load(open(SRC, encoding="utf-8"))
txt = open(os.path.join(HERE, "g3.txt"), encoding="utf-8").read()

pages = {}
cur = None
for line in txt.splitlines():
    m = re.match(r"===== g3 PAGE (\d+) =====", line)
    if m:
        cur = int(m.group(1)); pages[cur] = []; continue
    if cur is not None:
        pages[cur].append(line)

norm = lambda s: re.sub(r"\s+", " ", s).strip()
page_text = {p: norm(" ".join(ls)) for p, ls in pages.items()}

# strings extracted per page
extracted = {}
def add(p, s):
    if s: extracted.setdefault(p, []).append(s)
fail = 0
for t in doc["topics"]:
    for s in t["sections"]:
        if s["kind"] in ("passOff", "application"):
            for g in s["groups"]:
                if g.get("label"): add(g["page"], g["label"])
                for it in g["items"]:
                    add(it["page"], it["raw"])
                    # en must be inside raw
                    if norm(it["en"]) not in norm(it["raw"]):
                        print("EN NOT IN RAW", it["page"], it["en"]); fail += 1
        elif s["kind"] == "review":
            add(s["page"], s["heading"])
            for tk in s["tasks"]:
                add(tk["page"], tk["no"] + " " + tk["instruction"])
                for it in tk["items"]:
                    add(it["page"], it["prompt"])

# direction 1: every extracted string occurs in the page text layer
def squash(s):  # ignore all whitespace for the containment test
    return re.sub(r"\s+", "", s)
for p, lst in sorted(extracted.items()):
    pt = squash(page_text[p])
    for s in lst:
        if squash(s) not in pt:
            # item 47 of p57 is printed as two lines with a duplicated word: check pieces
            print(f"NOT FOUND p{p}: {s}"); fail += 1

# direction 2: every text-layer line (minus furniture) is covered by some extracted string
furniture = {"The Revolution of English Education", "Pass-Off English", "1. Pass-Off Sentences",
             "2. Application Sentences", "Review", "TOPIC 19", "TOPIC 20", "전 치 사", "접 속 사"}
for p in range(30, 58):
    blob = squash(" ".join(extracted.get(p, [])))
    for ln in pages[p]:
        l = norm(ln)
        if not l or l in furniture or l == str(p):
            continue
        if squash(l) not in blob:
            print(f"UNCOVERED p{p}: {l}"); fail += 1

# review answerFromBook must equal an application 'en' of the same topic
for t in doc["topics"]:
    ens = set(it["en"] for s in t["sections"] if s["kind"] == "application" for g in s["groups"] for it in g["items"])
    for s in t["sections"]:
        if s["kind"] != "review": continue
        for tk in s["tasks"]:
            for it in tk["items"]:
                a = it["answerFromBook"]
                if a is not None and a not in ens:
                    print("ANSWER NOT AN APPLICATION SENTENCE", it["n"], a); fail += 1
                if a is None and it["proposedAnswer"] is None and it["extraSlotAnswer"] is None:
                    print("NO ANSWER AT ALL", t["printedLabel"], tk["no"], it["n"]); fail += 1
print("FAILURES:", fail)
