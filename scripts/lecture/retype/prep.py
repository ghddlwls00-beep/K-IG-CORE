# For every distinct printed page: a work folder pages/<book>-<NNN>/ with page.jpg, the analysis (page.json,
# page-boxes.png) and the per-line crops (lines/) for the readers. The two sample pages are copied from their finished work.
import os, json, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
reg = json.load(open(os.path.join(HERE, "registry.json"), encoding="utf-8"))
BODY = {"structure": (126, 1058), "alpha": (30, 1104), "middle": (104, 1128), "high": (104, 1128)}
jobs = []
for e in reg:
    if e["book"] == "skeleton":
        continue
    key = f"{e['book']}-{e['page']:03d}"
    d = os.path.join(HERE, "pages", key)
    os.makedirs(d, exist_ok=True)
    shutil.copyfile(e["src"], os.path.join(d, "page.jpg"))
    top, bottom = BODY[e["book"]]
    if not os.path.exists(os.path.join(d, "page.json")):
        subprocess.run([sys.executable, os.path.join(HERE, "analyze.py"), os.path.join(d, "page.jpg"), os.path.join(d, "page"), str(top), str(bottom)], check=True, capture_output=True)
        subprocess.run([sys.executable, os.path.join(HERE, "crops.py"), os.path.join(d, "page.jpg"), os.path.join(d, "page.json"), os.path.join(d, "lines")], check=True, capture_output=True)
    sample = {"structure-001": "s01", "structure-012": "s12"}.get(key)
    if sample and not os.path.exists(os.path.join(d, "page.read.json")):
        for ext in (".json", ".read.json"):
            shutil.copyfile(os.path.join(HERE, sample + ext), os.path.join(d, "page" + ext))
    words = len(json.load(open(os.path.join(d, "page.json"), encoding="utf-8"))["words"])
    jobs.append({"key": key, "book": e["book"], "words": words, "done": os.path.exists(os.path.join(d, "page.read.json"))})
json.dump(jobs, open(os.path.join(HERE, "jobs.json"), "w", encoding="utf-8"), indent=0)
from collections import Counter
print(Counter(j["book"] for j in jobs), "words", sum(j["words"] for j in jobs), "already read", sum(j["done"] for j in jobs))
