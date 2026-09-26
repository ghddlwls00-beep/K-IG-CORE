import pymupdf, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
path = r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재2.pdf"
start, end = int(sys.argv[1]), int(sys.argv[2])
doc = pymupdf.open(path)
for pno in range(start - 1, end):
    page = doc[pno]
    print(f"===== PAGE {pno+1} =====")
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b.get("type") != 0:
            print(f"  [image block bbox={[round(x) for x in b['bbox']]}]")
            continue
        for l in b["lines"]:
            parts = []
            for s in l["spans"]:
                t = s["text"]
                if not t.strip():
                    parts.append(t)
                    continue
                bold = ("Bold" in s["font"]) or (s["flags"] & 16)
                tag = "B" if bold else ""
                parts.append(f"<{tag}{s['font']}|{round(s['size'],1)}>{t}")
            y = round(l["bbox"][1])
            x = round(l["bbox"][0])
            print(f"  y={y:4d} x={x:4d} " + "".join(parts))
