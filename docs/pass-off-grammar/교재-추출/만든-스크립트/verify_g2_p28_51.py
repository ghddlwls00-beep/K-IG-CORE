# -*- coding: utf-8 -*-
# Verifies that every printed string in out/g2-p28-51.json occurs on its page in the PDF text layer (g2.txt).
import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE = r"C:\Users\ghddl\AppData\Local\Temp\claude\C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE--claude-worktrees-korean-market-analysis-39e7fc\5adf4ccb-9cea-421f-9195-b5f31b723c7f\scratchpad\pdf"
txt = open(BASE + r"\g2.txt", encoding="utf-8").read()
pages = {}
parts = re.split(r"={5} g2 PAGE (\d+) ={5}", txt)
for i in range(1, len(parts), 2):
    pages[int(parts[i])] = re.sub(r"\s+", " ", parts[i + 1])
assert all(p in pages for p in range(28, 52)), sorted(pages)[:5]

def ws(s):
    return re.sub(r"\s+", " ", s).strip()

def on_page(s, p):
    return ws(s) in pages[p]

def anywhere(s):
    return any(ws(s) in pages[p] for p in range(28, 52))

doc = json.load(open(BASE + r"\out\g2-p28-51.json", encoding="utf-8"))
fails, checked = [], 0

def check(cond, what):
    global checked
    checked += 1
    if not cond:
        fails.append(what)

for t in doc["topics"]:
    for sec in t["sections"]:
        check(on_page(sec["heading"], sec["page"]), f"heading {sec['heading']} p{sec['page']}")
        if sec["kind"] in ("passOff", "application"):
            for g in sec["groups"]:
                if g["label"]:
                    check(on_page(g["label"], g["items"][0]["page"]), f"label {g['label']}")
                for it in g["items"]:
                    check(on_page(it["raw"], it["page"]), f"raw p{it['page']}: {it['raw']}")
                    check(it["raw"].startswith(it["en"]), f"en not prefix of raw: {it['en']}")
                    if it["ko"] is not None:
                        check(anywhere(it["ko"]), f"ko not found: {it['ko']}")
        else:
            for task in sec["tasks"]:
                check(on_page(task["instruction"], task["page"]), f"instruction p{task['page']}: {task['instruction']}")
                for it in task["items"]:
                    if it["prompt"] is not None:
                        pr = it["prompt"].replace("____", "").strip()
                        check(on_page(pr, it["page"]), f"prompt p{it['page']}: {it['prompt']}")
                    if it.get("box"):
                        check(on_page(it["box"], it["page"]), f"box {it['box']}")
                    if it["answerFromBook"] is not None:
                        check(anywhere(it["answerFromBook"]), f"answer not in book: {it['answerFromBook']}")

# issues: the quoted text must be printed somewhere in range (multi-part quotes split on ' / ')
for i in doc["issues"]:
    parts = [p for p in re.split(r" / |…| — ", i["text"]) if p.strip()]
    for part in parts:
        part = part.replace("____ (5칸)", "").replace("____ (2칸)", "").strip()
        if part.startswith("(3) 진행형"):
            part = "(3) 진행형"
        check(anywhere(part), f"issue text not in book (p{i['page']}): {part}")

print(f"checked {checked} strings, {len(fails)} failures")
for f in fails:
    print("  FAIL", f)

# deliberate-break test: the check must reject strings that are not printed
bad = ["I have just had lunch.", "비행기가 11시 30분에 시카고로 떠날 예정이다.", "Nick reads the Bible for an hour every day."]
caught = [b for b in bad if not anywhere(b)]
print("deliberate-break test:", "PASS (all 3 wrong strings rejected)" if len(caught) == 3 else f"FAIL {caught}")
