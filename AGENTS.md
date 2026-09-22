# K-IG-CORE — 에이전트 지침

상업 출시를 준비 중인 한국인 대상 영어 학습 플랫폼입니다.
**운영 중인 사이트가 있습니다**: https://k-ig-core.vercel.app — `main` 에 푸시하면 바로 배포됩니다.

## 🔴 시작하기 전에 반드시 읽을 것

**`docs/qa-2026-09-15/NEXT-SESSION.md` 의 §0-Z 가 현재 작업 지시입니다.**
무엇을 할지는 거기에 있습니다. 이 파일은 "어떻게" 에 해당합니다.
같은 저장소에서 다른 AI 가 함께 일합니다. §0-Z 의 "직전 세션들이 끝낸 것" 표를
먼저 보고, 이미 된 일을 다시 하지 마세요.

## 절대 하지 말 것

- **`git add -A` · `git add .` 금지.** 파일을 하나하나 이름으로 지정해서 add 하세요.
  이 저장소는 두 AI 가 동시에 씁니다. 전체 스테이징은 남의 작업 중인 파일을
  같이 커밋해 버립니다.
- **`git stash` 금지.** 이 저장소에서 `fatal: unable to read tree` 가 난 이력이 있습니다.
- **`.env.local` · `.vercel/` 의 값을 출력·캡처·커밋하지 마세요.** 한 번 노출된 적이 있습니다.
- **CNN · GVA 과정은 폐지되었습니다.** 고치지도, 검수하지도, 음성을 만들지도 마세요.
- **UI 문구에 음성 출처를 쓰지 마세요.** "원어민 음성" 도 "AI 음성" 도 안 됩니다.
  기능만 설명하세요 ("문장 듣기" 처럼).
- **`content/lessons/student/` 의 괄호를 대안 정답으로 분리하지 마세요.**
  거긴 빈칸 자리표시자입니다. `apply-kig006.cjs` 의 `EXCLUDED_COURSES` 로 막혀
  있으니 플래그로 풀지 마세요.
- **소유자 몫은 손대지 마세요.** §0-Z 맨 아래 "소유자 몫" 목록 (법적 문서, 결제 수단,
  교재 자체 결함 판정 등) 은 사람이 결정할 일입니다.

## 🔴 통째로 읽으면 안 되는 파일들

`docs/qa-2026-09-15/` 안에는 **한 파일이 수십만 토큰인 감사 기록**이 있습니다.
문서가 이름을 부른다고 해서 `cat` 하거나 통째로 읽지 마세요. **세션이 그 자리에서 죽습니다.**

| 파일 | 대략 |
|---|---|
| `evidence/kig006-exposure.json` | **82만 토큰** ☠️ |
| `scripts/out/speech-inventory.json` | 78만 토큰 ☠️ |
| `scripts/out/prod-crawl.json` | 57만 토큰 ☠️ |
| `evidence/ld-*.md` · `ld-transcripts.json` | 각 13만~19만 토큰 |
| `evidence/textbook-defects.json` | 9.8만 토큰 |
| `evidence/archive-comparison.json` | 7.4만 토큰 |

10만 자가 넘는 파일이 15개, 합쳐서 약 360만 토큰입니다. 전부 **기록**이지 지시가
아닙니다. 필요하면 이렇게 보세요:

```bash
node -e "const j=require('./docs/qa-2026-09-15/evidence/textbook-defects.json'); console.log(Object.keys(j).length)"
```

읽어도 안전한 것은 `AGENTS.md`, `NEXT-SESSION.md`, 그리고 `kig006-decisions.json`
`ld-english-fixes.json` `ld-korean-fixes.json` (각 2천~8천 토큰) 정도입니다.

## 🔴 텍스트를 바꾸면 음성이 깨집니다

음성 클립의 키가 **텍스트의 해시**입니다 (`unifiedSpeechKey(text)`).
영어 문장을 한 글자라도 바꾸면 그 문장의 클립은 **없는 것이 됩니다.**

그러므로 텍스트 변경과 클립 재생성은 **같은 작업 안에서** 끝내야 합니다.

```bash
node scripts/generate-azure-ava.mjs --dry-run   # pending 이 0 이어야 합니다
```

한글 뜻만 바꾸는 경우는 해당 없습니다 — 음성은 영어만 읽습니다.

**판단 기준은 "알파벳이 섞였나"가 아니라 "앱이 그 문장을 실제로 재생하나" 입니다.**
2026-09-22 에 LISTENING 의 죽은 한글 사본 2,518 블록을 지우면서 "영어는 하나도 없었다"
고 보고했지만, 실제로는 **353 블록에 알파벳이 있었습니다** — `Dr.William N.Green은
어린이들의 치과의사다` 처럼 한글 문장 속 고유명사였습니다. 클립은 하나도 끊기지
않았는데, 그 이유는 알파벳이 없어서가 아니라 **LISTENING 이 한국어를 재생하지 않기**
때문입니다 (`LdLearningView` 의 재생 호출 8곳이 전부 `.en` 또는 연음 preset).
그러니 "이 문장을 `speakText` / `playSentenceQueue` 에 넘기는 코드가 있는가" 를
확인하고, 고친 뒤 `node docs/qa-2026-09-18/scripts/check-completeness.cjs` 의
missing-clip 이 **늘지 않았는지** 보세요.

**클립을 만들어도 그것만으로는 운영에 반영되지 않습니다.** `public/audio` 는
`.gitignore` 에 들어 있어서(`.gitignore:57`) 생성된 mp3 는 커밋되지 않습니다.
R2 에 따로 올려야 합니다.

### 배포 순서 — 반드시 이 순서로

1. `node scripts/generate-azure-ava.mjs` — 클립 생성 (로컬)
2. `node scripts/upload-azure-ava-r2.mjs` — **클립을 R2 에 먼저 올립니다**
3. 그다음 `main` 에 푸시 (Vercel 이 자동 배포)

반대로 하면 새 문장이 먼저 화면에 나오고 그 문장의 클립은 아직 없는 상태가 되어,
그 사이에 접속한 학습자는 **눌러도 소리가 안 나는 버튼**을 만납니다. 클립을 먼저
올려 두면 반대 상황(아직 아무도 요청하지 않는 클립이 잠깐 존재)뿐이라 무해합니다.

## 검증 규칙 — 전부 실제로 난 실패에서 나온 것입니다

- **상태 코드가 아니라 렌더링된 텍스트로 판정하세요.** `<body>` 에서 `<script>` 를
  지우고 태그를 걷어낸 뒤 남은 글자 수를 보세요. 404 수정이 "5개 경로 통과" 로
  보고됐지만 서버가 보낸 HTML 은 비어 있었습니다.
- **개수가 아니라 내용을 보세요.** `gh1-033` 이 "우리가 망가뜨림" 으로 분류된 건
  항목 수가 23 vs 25 였기 때문인데, 실제로는 교재가 두 문항을 한 줄에 쓴 것이었습니다.
- **TS 함수 시그니처를 바꾸면 `.cjs` / `.mjs` 호출부를 grep 하세요.** 타입 검사가
  못 잡습니다. `getCollocation` 인자 변경이 음성 수집기를 **에러 없이 0개** 로
  만든 적이 있습니다. 조용히 실패하는 쪽이 더 위험합니다.
- **표본으로 일반화하지 마세요.** 이 저장소의 데이터 문제는 레슨마다 다릅니다.
  8개를 보고 276개를 판단하면 반드시 틀립니다.
- 커밋 전에 `npx tsc --noEmit` 과 `npx next build`.
- 보고할 때는 운영에서 실제로 잰 숫자를 쓰세요.

## 새 레슨을 추가하거나 id 를 바꾸면

```bash
node scripts/buildValidRoutes.mjs
```

`src/lib/generated/validRoutes.json` 을 반드시 다시 만드세요 — proxy 가 이걸 읽습니다.
`prebuild` 가 해 주지만 **`npx next build` 는 `prebuild` 를 돌리지 않습니다.**
`s19-3` 을 복원했을 때 이 목록이 낡아서 새 레슨이 통째로 404 였습니다.

---

## 프로젝트 기본 정보

- **원격 저장소**: https://github.com/ghddlwls00-beep/K-IG-CORE
- **스택**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vercel
- **패키지 매니저**: `pnpm`
- **저장소**: Cloudflare R2 — `k-iglab` (미디어), `k-ig-license-private` (라이선스·진도)
- **음성**: Azure Speech, `en-US-AvaMultilingualNeural`

## 운영 중인 과정

| 과정 | slug | 데이터 |
|---|---|---|
| VOCA 어휘 | `phonics` | `content/voca_dictionary.json` (3,877 표제어) |
| GRAMMAR I | `grammar1` | `content/lessons/grammar1/` |
| GRAMMAR II | `grammar2` | `content/lessons/grammar2/` |
| LISTENING | `ld` | `content/lessons/ld/` · `content/ld_english_scripts.json` |
| READING | `reading` | `content/lessons/reading/` |
| STUDENT | `student` | `content/lessons/student/` — 괄호는 **빈칸**입니다 |

**CNN · GVA 는 폐지되었습니다.** 데이터는 남아 있지만 작업 대상이 아닙니다.

### 데이터에 대해 알아야 할 것

교재 원본(2009·2012년판) 과의 대조가 끝났고, `content/` 쓰기 금지는 해제되었습니다.
다만 **교재에 원래 없어서 생성된 데이터**가 있습니다. 여기는 "원본대로" 가 통하지 않으니
고칠 때 근거를 따로 대야 합니다:

- VOCA 의 한글 뜻 — 교재에 아예 없었습니다. 526건은 교정했고 507건은 미검수입니다.
- LISTENING 의 영어 스크립트 — 교재에는 한글 대본만 있었습니다.
  지금 본문은 **녹음이 실제로 말하는 문장**으로 맞춰져 있습니다 (일치율 99.9%).
- READING 어휘 카드의 뜻 — 교재 지문에 나오는 건 3분의 1뿐이었습니다.

대조 결과는 `docs/qa-2026-09-15/evidence/` 에 있습니다.

## 자율성

§0-Z 에 적힌 일은 묻지 말고 진행하세요. 다만 **되돌리기 어려운 일**
(데이터 대량 삭제, 비밀키 변경, 결제·법적 문구) 과 위 "소유자 몫" 은
사람에게 확인받고 하세요.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
