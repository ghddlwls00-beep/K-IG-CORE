import pymupdf, os, sys, json
sp = sys.argv[1]
files = {
 "g1": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재 1.pdf",
 "g2": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재2.pdf",
 "g3": r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf",
}
summary = {}
for key, path in files.items():
    doc = pymupdf.open(path)
    n = doc.page_count
    meta = doc.metadata
    chars = []
    with open(os.path.join(sp, "pdf", f"{key}.txt"), "w", encoding="utf-8") as f:
        for i, page in enumerate(doc):
            t = page.get_text()
            chars.append(len(t))
            f.write(f"\n\n===== {key} PAGE {i+1} =====\n")
            f.write(t)
    imgs = [len(p.get_images()) for p in doc]
    summary[key] = {"pages": n, "meta": meta, "chars_per_page": chars, "images_per_page": imgs, "size": [doc[0].rect.width, doc[0].rect.height]}
print(json.dumps(summary, ensure_ascii=False, indent=1))
