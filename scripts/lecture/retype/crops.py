# Per text line: a 3x crop of the original with each word box outlined and numbered — for the readers.
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
src, js, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(js, encoding="utf-8"))
os.makedirs(outdir, exist_ok=True)
img = Image.open(src).convert("RGB")
S = 3
f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
lines = {}
for w in data["words"]:
    lines.setdefault(w["line"], []).append(w)
for li, ws in sorted(lines.items()):
    y0 = max(0, min(w["y0"] for w in ws) - 6); y1 = min(data["H"], max(w["y1"] for w in ws) + 6)
    x0 = max(0, min(w["x0"] for w in ws) - 8); x1 = min(data["W"], max(w["x1"] for w in ws) + 8)
    c = img.crop((x0, y0, x1, y1)).resize(((x1 - x0) * S, (y1 - y0) * S), Image.LANCZOS)
    pad = Image.new("RGB", (c.width, c.height + 22), "white")
    pad.paste(c, (0, 22))
    d = ImageDraw.Draw(pad)
    for w in ws:
        d.rectangle([(w["x0"] - x0) * S, (w["y0"] - y0) * S + 22, (w["x1"] - x0) * S, (w["y1"] - y0) * S + 22], outline=(0, 120, 255))
        d.text(((w["x0"] - x0) * S + 2, 2), str(w["id"]), font=f, fill=(220, 0, 120))
    pad.save(os.path.join(outdir, f"line{li:02d}.png"))
print(len(lines))
