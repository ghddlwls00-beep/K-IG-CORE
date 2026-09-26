import pymupdf, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
path = r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재 1.pdf"
doc = pymupdf.open(path)
out = []
for pno in range(4, 23):  # pages 5..23
    page = doc[pno]
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for l in b["lines"]:
            spans = []
            for s in l["spans"]:
                bold = bool(("Bold" in s["font"]) or (s["flags"] & 16))
                spans.append([s["text"], bold])
            text = "".join(x[0] for x in spans)
            if text.strip():
                out.append({"page": pno + 1, "text": text, "spans": spans})
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)
print("lines", len(out))
