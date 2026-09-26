import pymupdf, os, sys
sp = sys.argv[1]
files = {
 "g1": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재 1.pdf",
 "g2": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재2.pdf",
 "g3": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf",
}
for key, path in files.items():
    out = os.path.join(sp, "pdf", key)
    os.makedirs(out, exist_ok=True)
    doc = pymupdf.open(path)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=110)
        pix.save(os.path.join(out, f"p{i+1:03d}.png"))
    print(key, doc.page_count)
