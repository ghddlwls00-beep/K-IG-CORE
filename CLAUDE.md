# K-IG-CORE

작업 지침은 **[`AGENTS.md`](AGENTS.md)** 하나에 모여 있습니다. 먼저 읽으세요.
지침을 고칠 일이 있으면 이 파일이 아니라 `AGENTS.md` 를 고치세요 — 여기는 안내판입니다.

지금 할 일은 **[`docs/qa-2026-09-15/NEXT-SESSION.md`](docs/qa-2026-09-15/NEXT-SESSION.md) 의 §0-Z** 에 있습니다.

가장 자주 사고가 났던 세 가지만 미리 옮겨 둡니다:

- **`git add -A` · `git add .` · `git stash` 금지.** 파일을 이름으로 지정해서 add 하세요.
  이 저장소는 AI 두 개가 같이 씁니다.
- **영어 텍스트를 바꾸면 그 문장의 음성 클립이 사라집니다** (클립 키가 텍스트 해시).
  같은 작업 안에서 `node scripts/generate-azure-ava.mjs` 로 다시 만드세요.
- **CNN · GVA 는 폐지된 과정입니다.** 손대지 마세요.
