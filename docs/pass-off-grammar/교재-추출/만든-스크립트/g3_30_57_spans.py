import pymupdf, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
doc = pymupdf.open(r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf")
start, end = int(sys.argv[1]), int(sys.argv[2])

for pno in range(start, end + 1):
    page = doc[pno - 1]
    print(f"===== PAGE {pno} =====")
    d = page.get_text("dict")
    # underline candidates: thin horizontal drawings
    ul = []
    for dr in page.get_drawings():
        for it in dr["items"]:
            if it[0] == "l":
                p1, p2 = it[1], it[2]
                if abs(p1.y - p2.y) < 1.0 and abs(p2.x - p1.x) > 3:
                    ul.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif it[0] == "re":
                r = it[1]
                if r.height < 2.0 and r.width > 3:
                    ul.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
    words = page.get_text("words")
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for ln in b["lines"]:
            parts = []
            for sp in ln["spans"]:
                t = sp["text"]
                if not t.strip():
                    parts.append(t)
                    continue
                bold = ("Bold" in sp["font"]) or (sp["flags"] & 16)
                parts.append(("[B]" + t + "[/B]") if bold else t)
            txt = "".join(parts)
            if txt.strip():
                y = round(ln["bbox"][1], 1)
                print(f"y={y:6} | {txt}")
    # map underlines to words
    if ul:
        hits = []
        for (x0, x1, y) in ul:
            ws = [w for w in words if abs(w[3] - y) < 4.5 and w[0] < x1 - 0.5 and w[2] > x0 + 0.5]
            hits.append((round(y, 1), round(x0, 1), round(x1, 1), " ".join(w[4] for w in ws)))
        hits.sort()
        for h in hits:
            print(f"   UL y={h[0]} x={h[1]}-{h[2]} -> {h[3]!r}")
