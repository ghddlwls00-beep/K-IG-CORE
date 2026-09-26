import subprocess, json, sys, io, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
REPO = r"C:\Users\ghddl\.gemini\antigravity\scratch\K-IG-CORE\.claude\worktrees\korean-market-analysis-39e7fc"
checks = [
    ("s7-2", "learn to speak English"),
    ("s7-3", "good at memorizing"),
    ("s6-3", "accent"),
    ("s6-3", "habit of touching"),
    ("s8-4", "prepare for school"),
    ("s9-3", "talks about his day"),
    ("s5-3", "before class"),
    ("s10-2", "get out of bed"),
    ("s5-2", "by bicycle"),
    ("s4-2", "many relatives"),
    ("s3-2", "Because of this"),
    ("s13-1", "history books"),
    ("s17-4", "1953"),
    ("s1-5", "different subjects"),
    ("s11-4", "Sunday afternoons"),
    ("s2-3", "department store"),
    ("s1-3", "around my friends"),
    ("s9-3", "in my journal"),
    ("s20-1", "between China and Japan"),
    ("s17-3", "ruled by Japan"),
    ("s5-1", "allowance"),
    ("s8-1", "glad to see me"),
    ("s17-2", "three kingdoms"),
    ("s3-1", "best friends"),
    ("s3-3", "learn a lot from"),
    ("s3-3", "proud of"),
    ("s13-2", "difficult time of Korean history"),
    ("s4-3", "come and visit me"),
    ("s5-3", "quiet down"),
    ("s10-4", "chat on the computer"),
    ("s5-2", "walking to school"),
    ("s11-1", "special day like"),
    ("s10-5", "Friday night"),
    ("s16-2", "communicate with them"),
    ("s10-3", "hard work"),
]

def texts(src, key):
    out = []
    try:
        data = json.loads(src)
    except Exception as e:
        return ["<parse error %s>" % e]
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("text", "english") and isinstance(v, str) and key.lower() in v.lower() and re.search(r"[A-Za-z]", v):
                    out.append(v)
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    # dedupe keep order
    seen = []
    for t in out:
        if t not in seen:
            seen.append(t)
    return seen

for f, key in checks:
    path = f"content/lessons/student/{f}.json"
    cur = open(os.path.join(REPO, path), encoding="utf-8").read()
    orig = subprocess.run(["git", "show", f"3705523:{path}"], cwd=REPO, capture_output=True).stdout.decode("utf-8", "replace")
    ct = texts(cur, key)
    ot = texts(orig, key)
    print(f"## {f} [{key}]")
    for t in ot[:2]:
        print("  ORIG:", t)
    for t in ct[:2]:
        print("  NOW :", t)
