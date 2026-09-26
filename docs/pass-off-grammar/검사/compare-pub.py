# Compare the text of the PDF editions with the text of the Publisher (.pub) sources converted by LibreOffice.
# Prints page counts, how many content lines differ in each direction, samples, and a probe of known PDF errors.
import pymupdf, re, sys, json, os, collections

sp = sys.argv[1]
pairs = {
    "g1": (r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재 1.pdf", os.path.join(sp, "pub", "pub1.pdf")),
    "g2": (r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재2.pdf", os.path.join(sp, "pub", "pub2.pdf")),
    "g3": (r"C:\Users\ghddl\Desktop\문법교재1~3\문법교재3.pdf", os.path.join(sp, "pub", "pub3.pdf")),
}

def norm(s):
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s

def lines_of(path):
    doc = pymupdf.open(path)
    out = []
    for i, page in enumerate(doc):
        for ln in page.get_text().splitlines():
            n = norm(ln)
            if len(re.findall(r"[a-z]{2,}|[가-힣]{2,}", n)) < 3:
                continue
            if "revolution of english education" in n or "pass-off english" == n:
                continue
            out.append((i + 1, n))
    return doc.page_count, out

probes = ["send send send", "show show show", "understand understand understand", "i have just have lunch",
          "she is best mother in the world", "strive stove", "bite bit bit", "hide hid hid", "age has turns his hair",
          "gave me hurt in my heart", "with her blond", "i am gong to go"]
report = {}
for key, (a, b) in pairs.items():
    na, la = lines_of(a)
    nb, lb = lines_of(b)
    sa = collections.Counter(x for _, x in la)
    sb = collections.Counter(x for _, x in lb)
    only_a = [x for x in sa if x not in sb]
    only_b = [x for x in sb if x not in sa]
    joined_a = " ".join(x for _, x in la)
    joined_b = " ".join(x for _, x in lb)
    squash = lambda s: re.sub(r"[^a-z가-힣 ]+", " ", s)
    ja, jb = re.sub(r"\s+", " ", squash(joined_a)), re.sub(r"\s+", " ", squash(joined_b))
    report[key] = {
        "pdfPages": na, "pubPages": nb, "pdfLines": len(la), "pubLines": len(lb),
        "linesOnlyInPdf": len(only_a), "linesOnlyInPub": len(only_b),
        "probes": {p: {"pdf": p in ja, "pub": p in jb} for p in probes},
        "sampleOnlyInPub": only_b[:12], "sampleOnlyInPdf": only_a[:12],
    }
print(json.dumps(report, ensure_ascii=False, indent=1))
