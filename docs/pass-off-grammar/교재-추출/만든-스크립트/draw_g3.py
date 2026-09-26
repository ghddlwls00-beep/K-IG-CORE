import pymupdf, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
path = r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf"
start, end = int(sys.argv[1]), int(sys.argv[2])
doc = pymupdf.open(path)
for pno in range(start - 1, end):
    page = doc[pno]
    dr = page.get_drawings()
    # skip header bar / footer rule: report only drawings inside the body area
    body = []
    for d in dr:
        r = d["rect"]
        if r.y0 < 60 or r.y0 > 780:
            continue
        body.append(d)
    print(f"PAGE {pno+1}: total drawings={len(dr)} body={len(body)}")
    for d in body[:40]:
        r = d["rect"]
        kinds = "".join(it[0] for it in d["items"])
        print(f"   rect=({r.x0:.0f},{r.y0:.0f},{r.x1:.0f},{r.y1:.0f}) w={r.width:.0f} h={r.height:.0f} items={kinds[:20]} fill={d.get('fill')} color={d.get('color')}")
