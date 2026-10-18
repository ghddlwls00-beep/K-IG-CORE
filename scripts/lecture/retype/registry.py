# Every distinct printed textbook page used by a lecture: book, page, one source copy, the lecture folders holding it.
import os, json, hashlib
M = r"C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\hopeful-joliot-c445c0\.lecture-media\audio\lecture"
OUT = os.path.join(os.path.dirname(__file__), "registry.json")
def book_of(lid, h):
    if lid.startswith("lm"): return "middle"
    if lid.startswith("lh"): return "high"
    if lid.startswith("la"): return "alpha"
    if lid.startswith("lb"): return "skeleton"
    return "structure"  # ls (ls003's pages are the 3-page skeleton book — told apart below by content hash)
pages = {}
for lid in sorted(os.listdir(M)):
    for f in sorted(os.listdir(os.path.join(M, lid))):
        if not f.endswith(".jpg"): continue
        p = os.path.join(M, lid, f)
        h = hashlib.sha1(open(p, "rb").read()).hexdigest()[:16]
        e = pages.setdefault(h, {"hash": h, "book": book_of(lid, h), "page": int(f[1:4]), "src": p, "uses": []})
        e["uses"].append(f"{lid}/{f}")
        if lid.startswith("lb"): e["book"] = "skeleton"
by = {}
for e in pages.values(): by[e["book"]] = by.get(e["book"], 0) + 1
json.dump(sorted(pages.values(), key=lambda e: (e["book"], e["page"])), open(OUT, "w", encoding="utf-8"), indent=0)
print(by, "files", sum(len(e["uses"]) for e in pages.values()))
