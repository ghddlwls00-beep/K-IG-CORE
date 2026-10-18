# The teacher's pen over a page (old and new side by side), as the site draws it: page at (80, 20) of the pen's window.
import sys, json
from PIL import Image, ImageDraw
pen_json, page_no, old_png, new_png, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
pen = json.load(open(pen_json, encoding="utf-8"))
COL = {0x43: (194, 54, 47), 0x33: (36, 86, 164), 0x23: (46, 122, 76), 0x13: (42, 42, 42), 0x03: (232, 185, 58)}
S = 2
def draw(img):
    img = img.convert("RGB").resize((827 * S, 1169 * S), Image.LANCZOS)
    d = ImageDraw.Draw(img, "RGBA")
    for s in pen["strokes"]:
        t0, page, p, x, y, *rest = s
        if page != page_no:
            continue
        pts = [(x, y)]
        for i in range(0, len(rest) - 2, 3):
            x += rest[i + 1]; y += rest[i + 2]
            pts.append((x, y))
        pts = [((px - 80) * S, (py - 20) * S) for px, py in pts]
        c = COL.get(p, (42, 42, 42))
        if p == 0x03:
            d.line(pts, fill=c + (110,), width=26)
        else:
            d.line(pts, fill=c + (255,), width=4)
    return img
a, b = draw(Image.open(old_png)), draw(Image.open(new_png))
both = Image.new("RGB", (a.width * 2 + 20, a.height), "white")
both.paste(a, (0, 0)); both.paste(b, (a.width + 20, 0))
both.save(out)
