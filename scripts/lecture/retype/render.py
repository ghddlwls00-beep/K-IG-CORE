# Re-set a textbook page (사장님 2026-10-20 "촌스러운 티 싹다 없애 · 교재 틀도 없애"): a clean white page at 2x; the old frame
# (borders, red rules, 3D boxes, icon frames) left out; gray shading → a soft tint panel; underlines and bracket lines
# redrawn crisp; every word set in Pretendard with its INK BOX exactly where the old word's ink box was (the pen marks
# the page by position, so nothing may move). Anything inked that is neither a word nor a line is copied as it was.
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

src, js, readjs, out = sys.argv[1:5]
TOP, BOTTOM = int(sys.argv[5]), int(sys.argv[6])
FONT_DIR = sys.argv[7]
REG, BOLD = f"{FONT_DIR}/Pretendard-Medium.otf", f"{FONT_DIR}/Pretendard-Bold.otf"
S = 2
INK_RGB = (24, 24, 27)
TINT = (243, 241, 236)

data = json.load(open(js, encoding="utf-8"))
read = {b["id"]: b for b in json.load(open(readjs, encoding="utf-8"))["boxes"]}
orig = Image.open(src).convert("RGB")
a = np.asarray(orig).astype(np.int16)
g = a.mean(axis=2)
H, W = g.shape
ink = g < 150

canvas = Image.new("RGB", (W * S, H * S), "white")
d = ImageDraw.Draw(canvas)
covered = np.zeros_like(ink)

# 1. shading → soft tint panels (rounded)
for sh in data["shades"]:
    # (a light gray — 216 — is the chapter-title box's 3D side, part of the old frame; content panels are ~192)
    if sh["y1"] < TOP or sh["y0"] > BOTTOM or sh["gray"] > 205:
        continue
    d.rounded_rectangle([sh["x0"] * S, sh["y0"] * S, sh["x1"] * S, sh["y1"] * S], radius=10, fill=TINT)

# 2. boxes drawn around content (two long lines joined by two side lines — 알파오메가's example sentences) → a soft
#    tint panel like the shading; their lines are not drawn
rects = []
for i, t in enumerate(data["hlines"]):
    for b_ in data["hlines"][i + 1:]:
        if abs(t["x0"] - b_["x0"]) <= 3 and abs(t["x1"] - b_["x1"]) <= 3 and 20 < b_["y0"] - t["y0"] < 400 and TOP <= t["y0"] <= BOTTOM:
            sides = [v for v in data["vlines"] if abs(v["y0"] - t["y0"]) <= 3 and abs(v["y1"] - b_["y1"]) <= 3 and (abs(v["x0"] - t["x0"]) <= 3 or abs(v["x1"] - t["x1"]) <= 3)]
            if len(sides) >= 2:
                rects.append((t, b_))
                d.rounded_rectangle([t["x0"] * S, t["y0"] * S, t["x1"] * S, b_["y1"] * S], radius=12, fill=TINT)
in_rect = lambda l: any(l is t or l is b_ for t, b_ in rects)
# 3. lines: the frame goes (vertical lines, red or very long horizontal ones, anything outside the body); a long colored
#    rule in the body (알파오메가's dotted green line under a chapter title) becomes a thin quiet rule; content lines stay
for l in data["vlines"]:
    covered[l["y0"]:l["y1"], max(0, l["x0"] - 1):l["x1"] + 1] = True
for l in data["hlines"]:
    covered[max(0, l["y0"] - 1):l["y1"] + 1, l["x0"]:l["x1"]] = True
    if in_rect(l):
        continue
    r, gg, b = l["color"]
    long_ = l["x1"] - l["x0"] > 300
    inside = TOP <= l["y0"] <= BOTTOM
    colored = max(r, gg, b) - min(r, gg, b) > 25
    if long_ and inside and colored and not (r > gg + 40):
        d.rectangle([l["x0"] * S, l["y0"] * S, l["x1"] * S, l["y0"] * S + 1], fill=(222, 219, 211))
        continue
    # (the chapter-title box's lines are ~370 px; the longest content line — a clause bracket — under 220)
    frame = (r > gg + 40) or long_ or not inside
    if not frame:
        d.rectangle([l["x0"] * S, l["y0"] * S, l["x1"] * S, l["y0"] * S + max(2, (l["y1"] - l["y0"]) * S) - 1], fill=INK_RGB)

# 3. words
fonts = {}
def font(path, size):
    k = (path, size)
    if k not in fonts:
        fonts[k] = ImageFont.truetype(path, size)
    return fonts[k]
from fontTools.ttLib import TTFont
CMAP = {}
def has(path, ch):
    if path not in CMAP:
        CMAP[path] = set(TTFont(path).getBestCmap())
    return ord(ch) in CMAP[path]
FALLBACK = {REG: ["C:/Windows/Fonts/malgun.ttf", "C:/Windows/Fonts/seguisym.ttf"], BOLD: ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/seguisym.ttf"]}
def pick(path, ch):
    if has(path, ch):
        return path
    for fb in FALLBACK[path]:
        if has(fb, ch):
            return fb
    return path
def render(path, size, text, extra=0.0):
    """The word drawn letter by letter on its baseline (a letter Pretendard lacks — ㉠ ☞ from Malgun Gothic, ⇩ ⇨ from
    Segoe UI Symbol); returns the picture, its ink box and the baseline's y in it."""
    im = Image.new("L", (int(size * (len(text) + 2) + max(0, extra) * len(text)), size * 3), 0)
    dd = ImageDraw.Draw(im)
    x, base = size // 2, size * 2
    for ch in text:
        f = font(pick(path, ch), size)
        dd.text((x, base), ch, font=f, fill=255, anchor="ls")
        x += f.getlength(ch) + extra
    arr = np.asarray(im) > 60
    ys, xs = np.where(arr)
    if not len(xs):
        return im, (0, 0, 1, 1), base
    return im, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), base
def ink_box(path, size, text):
    im, box, _ = render(path, size, text)
    return im, box

report = []
pending = []
for w in data["words"]:
    r = read.get(w["id"])
    x0, y0, x1, y1 = w["x0"], w["y0"], w["x1"], w["y1"]
    covered[y0:y1, x0:x1] = True
    if w.get("split"):
        continue  # a box over several rows — its rows' own boxes (split.py) are set instead
    if not r or r.get("kind") == "graphic":
        desc = (r or {}).get("text", "").lower()
        if "icon" in desc:
            # the old '01' icon frame → a small dark badge with the number; ink after the frame (a heading digit) kept
            cols = np.where(ink[y0:y1, x0:x1].any(axis=0))[0]
            gaps = [i for i in range(1, len(cols)) if cols[i] - cols[i - 1] > 3]
            icon_x1 = x0 + (cols[gaps[0] - 1] + 1 if gaps else cols[-1] + 1)
            digits = "".join(ch for ch in desc.split("8 ")[0] if ch.isdigit())[:2] or "01"
            bh = (y1 - y0) * S
            d.rounded_rectangle([x0 * S, y0 * S + bh * 0.1, icon_x1 * S, y1 * S - bh * 0.1], radius=7, fill=INK_RGB)
            f = font(BOLD, int(bh * 0.46))
            tb = d.textbbox((0, 0), digits, font=f)
            d.text(((x0 + icon_x1) * S / 2 - (tb[2] - tb[0]) / 2 - tb[0], (y0 + y1) * S / 2 - (tb[3] - tb[1]) / 2 - tb[1]), digits, font=f, fill="white")
            if gaps and r.get("extra"):
                # the rest of the box is text (the heading's '8'): set like any word, at its ink box
                rx0 = x0 + cols[gaps[0]]
                rows = np.where(ink[y0:y1, rx0:x1].any(axis=1))[0]
                pending.append({"w": w, "text": r["extra"], "path": BOLD, "t": (rx0, y0 + rows[0], x1, y0 + rows[-1] + 1)})
            elif gaps:  # otherwise kept as printed
                covered[y0:y1, icon_x1:x1] = False
        elif not any(k in desc for k in ("bevel", "edge", "frame", "box")):
            covered[y0:y1, x0:x1] = False  # an arrow or a drawn mark: kept as printed (step 4 copies it)
        continue
    text = r["text"]
    if "\n" in text:
        # a box the reader saw as several printed lines (rows touching each other — 알파오메가 48 · 64쪽 notes): cut it at
        # its emptiest rows into as many lines, each set on its own
        parts = text.split("\n")
        prof = ink[y0:y1, x0:x1].sum(axis=1).astype(float)
        cuts = []
        for k in range(1, len(parts)):
            c0 = int(len(prof) * k / len(parts))
            lo, hi = max(1, c0 - len(prof) // (2 * len(parts))), min(len(prof) - 1, c0 + len(prof) // (2 * len(parts)))
            cuts.append(lo + int(np.argmin(prof[lo:hi])))
        edges = [0] + cuts + [len(prof)]
        for k, part in enumerate(parts):
            sub_ = ink[y0 + edges[k]:y0 + edges[k + 1], x0:x1]
            rr, cc = np.where(sub_.any(axis=1))[0], np.where(sub_.any(axis=0))[0]
            if not len(rr) or not part.strip():
                continue
            pending.append({"w": {**w, "line": (w["line"], "nl", k)}, "text": part.strip(), "path": BOLD if r.get("bold") else REG, "t": (x0 + cc[0], y0 + edges[k] + rr[0], x0 + cc[-1] + 1, y0 + edges[k] + rr[-1] + 1)})
        continue
    # an underline inside the box (a thin row near the bottom with a long ink run — maybe under only part of the box):
    # measured apart and redrawn as a crisp line over exactly its old span
    sub = ink[y0:y1, x0:x1]
    def longest(row):
        best = (0, 0, 0); run = 0
        for i, v in enumerate(list(row) + [False]):
            if v: run += 1
            else:
                if run > best[0]: best = (run, i - run, i)
                run = 0
        return best
    urows = []
    # only where the readers saw an underline: a bold Hangul ㅡ stroke near a word's foot looked like one (알파오메가
    # '[A] 의미단위' came out tiny with a line under it)
    # (and, without the flag, a line running under nearly the whole box at its very foot — a clause bracket's line
    # through a word box, 문장구조론 14쪽 '{ 절 부사 (v) (s) }')
    bottom_n = longest(sub[-1])[0] if sub.shape[0] else 0
    strong = bottom_n >= 0.85 * sub.shape[1] and sub.shape[1] >= 10
    for yy in (range(sub.shape[0] - 1, max(-1, int(sub.shape[0] * 0.72)), -1) if (r.get("under") or strong) else []):  # the foot only: a Hangul ㅜ bar mid-word is no underline
        n, a0, a1 = longest(sub[yy])
        if n >= max(10, (0.35 if r.get("under") else 0.85) * sub.shape[1]):
            urows.append((yy, a0, a1))
        elif urows:
            break
    if urows and len(urows) <= 3:
        top = min(u[0] for u in urows)
        ux0, ux1 = min(u[1] for u in urows), max(u[2] for u in urows)
        d.rectangle([(x0 + ux0) * S, (y0 + top) * S, (x0 + ux1) * S, (y0 + top + len(urows)) * S - 1], fill=INK_RGB)
        rows = np.where(sub[:top].any(axis=1))[0]
        ty0, ty1b = y0 + rows[0], y0 + rows[-1] + 1
    else:
        ty0, ty1b = y0, y1
    cols = np.where(ink[ty0:ty1b, x0:x1].any(axis=0))[0]
    tx0, tx1 = x0 + cols[0], x0 + cols[-1] + 1
    path = BOLD if r.get("bold") else REG
    # the word's own colour when it was printed in one (알파오메가's green chapter titles, a blue 목차): the median of its
    # ink, a little deeper; black text stays the page's ink
    px_ = a[ty0:ty1b, tx0:tx1][ink[ty0:ty1b, tx0:tx1]]
    med = np.median(px_, axis=0) if len(px_) else np.array([0, 0, 0])
    color = INK_RGB if med.max() - med.min() < 16 else tuple(int(v * 0.85) for v in med)
    pending.append({"w": w, "text": text, "path": path, "t": (tx0, ty0, tx1, ty1b), "color": color})

# per line ONE size (the old type had one size per line): each word's own ink-height match, the line's median wins —
# a word matched alone ('그', 'I', 'depends') came out too big or small
def own_size(p):
    tx0, ty0, tx1, ty1b = p["t"]
    size = max(8, int((ty1b - ty0) * S * 1.25))
    for _ in range(3):
        _, (bx0, by0, bx1, by1) = ink_box(p["path"], size, p["text"])
        size = max(8, int(round(size * (ty1b - ty0) * S / max(1, by1 - by0))))
    return size
by_line = {}
# a band of the page can hold several printed rows (a table whose cell spans rows: 문장구조론 14쪽): words are grouped by
# their own vertical centre — a word more than 0.6 of a word's height off its group's centre starts another row
for p in pending:
    by_line.setdefault(p["w"]["line"], []).append(p)
rows_ = {}
for line, ps in by_line.items():
    hs = sorted(p["t"][3] - p["t"][1] for p in ps)
    hmed = hs[len(hs) // 2] or 1
    groups = []
    for p in sorted(ps, key=lambda q: (q["t"][1] + q["t"][3]) / 2):
        cy = (p["t"][1] + p["t"][3]) / 2
        if groups and abs(cy - groups[-1][0]) <= 0.6 * hmed:
            g_ = groups[-1]; g_[1].append(p); g_[0] = sum((q["t"][1] + q["t"][3]) / 2 for q in g_[1]) / len(g_[1])
        else:
            groups.append([cy, [p]])
    for gi, (_, gps) in enumerate(groups):
        rows_[(line, gi)] = gps
by_line = rows_
line_sizes = {}
for line, ps in by_line.items():
    # words with Hangul or at least 3 letters say most about the size
    good = [own_size(p) for p in ps if len(p["text"].strip("{}()[].,:;!?'\"-")) >= 2]
    sizes = sorted(good or [own_size(p) for p in ps])
    line_sizes[line] = sizes[len(sizes) // 2]
# ONE body size for the page (the old page had one body size; measured lines scatter ±10 %): a line within 15 % of the
# page's median takes the median; a heading or small print keeps its own
page_size = sorted(line_sizes.values())[len(line_sizes) // 2] if line_sizes else 0
# a line whose OLD letters were as tall as the page's body letters is body text, whatever its words' shapes made the
# size estimate say (table cells set larger, 문장구조론 14쪽)
def med_h(ps_):
    hs_ = sorted(p["t"][3] - p["t"][1] for p in ps_ if len(p["text"].strip("{}()[].,:;!?'\"-_")) >= 2) or sorted(p["t"][3] - p["t"][1] for p in ps_)
    return hs_[len(hs_) // 2]
page_h = med_h([p for ps_ in by_line.values() for p in ps_]) if by_line else 0
for line, ps in by_line.items():
    body_like = page_h and abs(med_h(ps) - page_h) <= 0.2 * page_h
    line_size = page_size if (abs(line_sizes[line] - page_size) <= 0.15 * page_size or body_like) else line_sizes[line]
    # bounds: a line is never set far above or below the body size unless its old letters really were (a heading,
    # small print) — a table cell's box with a grid-line remnant came out 1.4×, a bracketed clause line 0.6×
    if page_h and line_size != page_size:
        oh = med_h(ps) / page_h
        if 0.75 <= oh <= 1.4 and not all("Bold" in p["path"] for p in ps):
            line_size = int(min(max(line_size, page_size * 0.85), page_size * 1.15))
    if os.environ.get("RDEBUG"): print("line", line, "own", line_sizes[line], "page", page_size, "used", line_size)
    # each word drawn at the line's size; where its baseline must be so its ink bottom lands on the old ink bottom —
    # the line's BASELINE is the median of those (a word with a descender, a comma or a bracket says the same as one
    # without: the new letters have the same shapes below the line)
    drawn = []
    for p in ps:
        im, (bx0, by0, bx1, by1), base = render(p["path"], line_size, p["text"])
        drawn.append((p, im, (bx0, by0, bx1, by1), base))
    ests = sorted(p["t"][3] * S - (by1 - base) for p, im, (bx0, by0, bx1, by1), base in drawn)
    base_line = ests[len(ests) // 2]
    for p, im, (bx0, by0, bx1, by1), base in drawn:
        tx0, ty0, tx1, ty1b = p["t"]
        text = p["text"]
        want_w = (tx1 - tx0) * S
        sx = want_w / max(1, bx1 - bx0)
        # (Hangul only: the old Korean type was letter-spaced; an English word spread out read "I t", "D o")
        if sx > 1.18 and len(text) > 1 and any("\uac00" <= ch <= "\ud7a3" for ch in text):
            # the old type was letter-spaced: spread the letters over the old width instead of stretching them
            extra = (want_w - (bx1 - bx0)) / (len(text) - 1)
            im, (bx0, by0, bx1, by1), base = render(p["path"], line_size, text, extra)
            sx = want_w / max(1, bx1 - bx0)
        glyph = im.crop((bx0, by0, bx1, by1))
        old_h = (ty1b - ty0) * S
        if glyph.height > 1.6 * old_h + 4:
            # far taller than the word it replaces (a row the grouping got wrong): its own size and its own ink bottom
            own = own_size(p)
            im, (bx0, by0, bx1, by1), base = render(p["path"], own, text)
            glyph = im.crop((bx0, by0, bx1, by1))
            sx = want_w / max(1, glyph.width)
            report.append(f"id {p['w']['id']} '{text}' was {round(glyph.height / max(1, old_h), 1)}× tall → own size")
            base = by1; by0_ = by0
            py_own = ty1b * S - glyph.height
        else:
            py_own = None
        sxc = max(0.85, min(1.15, sx))
        glyph = glyph.resize((max(1, round(glyph.width * sxc)), glyph.height), Image.LANCZOS)
        # left edge on the old left edge (centred when it could not be fitted); baseline on the line's baseline
        px = tx0 * S if abs(sx - sxc) < 1e-6 else round((tx0 + tx1) * S / 2 - glyph.width / 2)
        py = base_line - (base - by0) if py_own is None else py_own
        canvas.paste(p.get("color", INK_RGB), (px, int(round(py))), glyph)
        # placement check: the new ink must sit on the old ink (a vertical miss of more than half a word's height is
        # reported — the page is then looked at)
        if abs((py + glyph.height / 2) - (ty0 + ty1b) * S / 2) > 0.5 * max(old_h, 1) + 4:
            report.append(f"MISPLACED id {p['w']['id']} '{text}'")
        if abs(sx - sxc) > 1e-6:
            report.append(f"id {p['w']['id']} '{text}' width {sx:.2f}× → centred")

# 4. whatever is inked and not a word or a line (an arrow, a hand-drawn mark) is copied as it was, crisp
rest = ink & ~np.asarray(Image.fromarray(covered.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))).astype(bool)
rest[:TOP] = False
rest[BOTTOM:] = False
# only real marks (an arrow, a drawn bracket): specks left over from the old type's edges are dropped
from scipy import ndimage
lab, n = ndimage.label(rest)
if n:
    sizes = ndimage.sum(rest, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 25])
    rest = rest & keep
ys, xs = np.where(rest)
if len(ys):
    mask = Image.fromarray((rest * 255).astype(np.uint8)).resize((W * S, H * S), Image.LANCZOS)
    canvas.paste(INK_RGB, (0, 0), mask)
    report.append(f"copied {len(ys)} inked pixels that are not words or lines")
canvas.save(out)
print("\n".join(report) or "ok")
