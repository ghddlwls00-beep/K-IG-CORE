# A word box that spans several printed rows (a table cell spanning rows put several rows into one band): split it into
# its rows and words; the new boxes get new ids and a crop each for the reader; the old box is marked "split".
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
d = sys.argv[1]
data = json.load(open(os.path.join(d, "page.json"), encoding="utf-8"))
img = Image.open(os.path.join(d, "page.jpg")).convert("RGB")
g = np.asarray(img).astype(np.int16).mean(axis=2)
ink = g < 150
hs = sorted(w["y1"] - w["y0"] for w in data["words"])
med = hs[len(hs) // 2]
nid = max(w["id"] for w in data["words"]) + 1
new = []
for w in data["words"]:
    if w.get("split") or w["y1"] - w["y0"] <= 2.0 * med + 3:
        continue
    sub = ink[w["y0"]:w["y1"], w["x0"]:w["x1"]]
    rows = sub.any(axis=1)
    bands, y = [], 0
    while y < len(rows):
        if rows[y]:
            y0 = y
            while y < len(rows) and (rows[y] or (y + 1 < len(rows) and rows[y + 1])):
                y += 1
            if y - y0 >= 3:
                bands.append((y0, y))
        y += 1
    for (b0, b1) in bands:
        cols = sub[b0:b1].any(axis=0)
        xs = np.where(cols)[0]
        gap = max(4, round((b1 - b0) * 0.38))
        start = prev = xs[0]
        for x in list(xs[1:]) + [None]:
            if x is None or x - prev > gap:
                rr = np.where(sub[b0:b1, start:prev + 1].any(axis=1))[0]
                new.append({"id": nid, "line": w["line"], "x0": int(w["x0"] + start), "x1": int(w["x0"] + prev + 1), "y0": int(w["y0"] + b0 + rr[0]), "y1": int(w["y0"] + b0 + rr[-1] + 1), "from": w["id"]})
                nid += 1
                if x is not None:
                    start = x
            if x is not None:
                prev = x
    w["split"] = True
data["words"].extend(new)
json.dump(data, open(os.path.join(d, "page.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
# crops for the reader: each new box at 4x with its id
os.makedirs(os.path.join(d, "split"), exist_ok=True)
f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
for w in new:
    x0, y0, x1, y1 = max(0, w["x0"] - 30), max(0, w["y0"] - 8), min(img.width, w["x1"] + 30), min(img.height, w["y1"] + 8)
    c = img.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.LANCZOS)
    pad = Image.new("RGB", (c.width, c.height + 22), "white"); pad.paste(c, (0, 22))
    dd = ImageDraw.Draw(pad)
    dd.rectangle([(w["x0"] - x0) * 4, (w["y0"] - y0) * 4 + 22, (w["x1"] - x0) * 4, (w["y1"] - y0) * 4 + 22], outline=(0, 120, 255))
    dd.text((4, 2), f"id {w['id']}", font=f, fill=(220, 0, 120))
    pad.save(os.path.join(d, "split", f"box{w['id']}.png"))
print(os.path.basename(d), "split", sum(1 for w in data["words"] if w.get("split")), "into", len(new))
