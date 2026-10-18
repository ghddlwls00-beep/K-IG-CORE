# Render every page that has page.read.json; checks per page; writes the finished JPGs to the retype folder
# (.lecture-media/retype/<book>-<NNN>.jpg — paid, private) and a review montage per 4 pages.
import os, json, subprocess, sys, re
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(HERE, "..", "fontdl", "package", "dist", "public", "static")
RETYPE = r"C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\hopeful-joliot-c445c0\.lecture-media\retype"
os.makedirs(RETYPE, exist_ok=True)
BODY = {"structure": (126, 1058), "alpha": (30, 1104), "middle": (104, 1128), "high": (104, 1128)}
only = sys.argv[1:]
def one(key):
    d = os.path.join(HERE, "pages", key)
    if not os.path.exists(os.path.join(d, "page.read.json")):
        return (key, "NO READ")
    return work(key, d)
def work(key, d):
    rows = []
    _work(key, d, rows)
    return rows[0]
def _work(key, d, rows):
    data = json.load(open(os.path.join(d, "page.json"), encoding="utf-8"))
    try:
        read = json.load(open(os.path.join(d, "page.read.json"), encoding="utf-8"))["boxes"]
    except Exception as e:
        rows.append((key, f"BAD READ JSON {e}"))
        return
    ids = {b["id"] for b in read}
    missing = [w["id"] for w in data["words"] if w["id"] not in ids]
    misprints = [b for b in read if b.get("printed")]
    unsure = [b["id"] for b in read if b.get("unsure")]
    book = key.split("-")[0]
    top, bottom = BODY[book]
    r = subprocess.run([sys.executable, os.path.join(HERE, "render.py"), os.path.join(d, "page.jpg"), os.path.join(d, "page.json"), os.path.join(d, "page.read.json"), os.path.join(d, "new.png"), str(top), str(bottom), FD], capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        rows.append((key, "RENDER FAILED " + r.stderr[-300:]))
        return
    centred = len(re.findall("centred", r.stdout))
    misplaced = len(re.findall("MISPLACED", r.stdout))
    copied = re.search(r"copied (\d+)", r.stdout)
    Image.open(os.path.join(d, "new.png")).convert("RGB").save(os.path.join(RETYPE, key + ".jpg"), quality=90)
    json.dump({"missing": missing, "misprints": [{"id": b["id"], "printed": b["printed"], "text": b["text"]} for b in misprints], "unsure": unsure, "centred": centred, "copied": int(copied.group(1)) if copied else 0, "misplaced": misplaced}, open(os.path.join(d, "check.json"), "w", encoding="utf-8"), ensure_ascii=False)
    rows.append((key, f"missing {len(missing)} · misprints {len(misprints)} · unsure {len(unsure)} · centred {centred} · copied {copied.group(1) if copied else 0} · misplaced {misplaced}"))
if __name__ == "__main__":
    from concurrent.futures import ThreadPoolExecutor
    keys = [k for k in sorted(os.listdir(os.path.join(HERE, "pages"))) if not only or k in only]
    with ThreadPoolExecutor(6) as ex:
        out = list(ex.map(one, keys))
    for k, s in out:
        print(k, s)
