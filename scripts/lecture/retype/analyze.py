# Analyse a textbook page: graphics (long horizontal / vertical lines, gray shading) vs text; text lines and words with
# their ink boxes. Writes <out>.json and <out>-boxes.png (2x, every word boxed and numbered) for the reader.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
TOP, BOTTOM = int(sys.argv[3]) if len(sys.argv) > 3 else 0, int(sys.argv[4]) if len(sys.argv) > 4 else 1169
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
g = rgb.mean(axis=2)
H, W = g.shape
ink = g < 150

# --- graphics: horizontal runs >= 40 px that are thin (<= 3 px), vertical runs >= 40 px
def runs_1d(a):
    d = np.diff(np.concatenate([[0], a.astype(np.int8), [0]]))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
hmask = np.zeros_like(ink)
hlines = []
for y in range(H):
    for x0, x1 in runs_1d(ink[y]):
        if x1 - x0 >= 40:
            hmask[y, x0:x1] = True
# thin only: a horizontal run that is part of a thick dark block (glyph rows) is not a line
lab, n = ndimage.label(hmask)
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    h = sl[0].stop - sl[0].start
    if h > 4:
        hmask[lab == i] = False
    else:
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        col = rgb[y0:y1, x0:x1].reshape(-1, 3)
        dark = col[(col.mean(axis=1) < 150)]
        hlines.append({"x0": int(x0), "x1": int(x1), "y0": int(y0), "y1": int(y1), "color": [int(v) for v in np.median(dark, axis=0)]})
vmask = np.zeros_like(ink)
vlines = []
for x in range(W):
    for y0, y1 in runs_1d(ink[:, x]):
        if y1 - y0 >= 40:
            vmask[y0:y1, x] = True
lab, n = ndimage.label(vmask)
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    if sl[1].stop - sl[1].start > 4:
        vmask[lab == i] = False
    else:
        vlines.append({"x0": int(sl[1].start), "x1": int(sl[1].stop), "y0": int(sl[0].start), "y1": int(sl[0].stop)})
graphics = hmask | vmask
text = ink & ~graphics

# --- gray shading: mid-gray pixels in large rectangles
gray = (g > 160) & (g < 225) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 12)
lab, n = ndimage.label(ndimage.binary_closing(gray, iterations=3))
shades = []
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if h >= 14 and w >= 80:
        shades.append({"x0": int(sl[1].start), "x1": int(sl[1].stop), "y0": int(sl[0].start), "y1": int(sl[0].stop), "gray": int(np.median(g[sl][gray[sl]]))})

# --- text lines: rows with text ink (between TOP and BOTTOM), bands separated by >= 2 empty rows
rows = text[:, :].sum(axis=1)
rows[:TOP] = 0
rows[BOTTOM:] = 0
bands = []
y = 0
while y < H:
    if rows[y] > 0:
        y0 = y
        while y < H and (rows[y] > 0 or (y + 1 < H and rows[y + 1] > 0)):
            y += 1
        if y - y0 >= 4:
            bands.append((y0, y))
    y += 1
# --- words: column gaps >= 5 px within a band (gap size relative to band height for small text)
words = []
for li, (y0, y1) in enumerate(bands):
    cols = text[y0:y1].any(axis=0)
    gapmin = max(4, round((y1 - y0) * 0.38))
    xs = np.where(cols)[0]
    if not len(xs):
        continue
    start = prev = xs[0]
    for x in list(xs[1:]) + [None]:
        if x is None or x - prev > gapmin:
            sub = text[y0:y1, start:prev + 1]
            ry = np.where(sub.any(axis=1))[0]
            words.append({"id": len(words), "line": li, "x0": int(start), "x1": int(prev + 1), "y0": int(y0 + ry[0]), "y1": int(y0 + ry[-1] + 1)})
            if x is not None:
                start = x
        if x is not None:
            prev = x

json.dump({"W": W, "H": H, "bands": bands, "words": words, "hlines": hlines, "vlines": vlines, "shades": shades}, open(out + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
# boxes picture for the reader (2x)
S = 2
pic = Image.open(src).convert("RGB").resize((W * S, H * S), Image.LANCZOS)
d = ImageDraw.Draw(pic)
f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 13)
for w in words:
    d.rectangle([w["x0"] * S - 1, w["y0"] * S - 1, w["x1"] * S + 1, w["y1"] * S + 1], outline=(0, 120, 255))
    d.text((w["x0"] * S, w["y0"] * S - 14), str(w["id"]), font=f, fill=(220, 0, 120))
for l in hlines:
    d.line([l["x0"] * S, l["y0"] * S, l["x1"] * S, l["y0"] * S], fill=(0, 200, 0), width=1)
pic.save(out + "-boxes.png")
print(f"bands {len(bands)} · words {len(words)} · hlines {len(hlines)} · vlines {len(vlines)} · shades {len(shades)}")
