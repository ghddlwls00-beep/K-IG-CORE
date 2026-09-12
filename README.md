# K-IG 핵심 어학 마스터 (K-IG-CORE)

K-IG 교육의 핵심 과정과 GVA 영어독해 직강을 웹에서 학습할 수 있도록 구축한 독립 플랫폼입니다.

- **VOCA**: 중등·고등 필수 3,877 어휘 매트릭스, 1:1 한국어 뜻 연동 및 AI 발음 클리닉
- **GRAMMAR I & II**: 핵심 및 심화 영작 연습, 1:1 모범 답안 및 해설 완역 대조
- **수능영어 듣기 (LD)**: 실전 수능형 리스닝, 영문-한글 1:1 스크립트 대조 및 받아쓰기(Dictation) 훈련
- **READING**: 원어민 내레이션 리딩 본문 및 문장별 직독직해 심층 분석
- **CNN 뉴스**: CNN 실전 보도 비디오, 1:1 보도 대본 완역 대조, 시사 어휘 연음 디코딩

**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · AI Web Speech Recognition
**Data:** 로컬 JSON 데이터 (3,877 단어 매트릭스, 1:1 스크립트 번역 데이터 완비)


---

## Getting started

Requires Node 20+ and pnpm (`npm install -g pnpm` if you don't have it).

```bash
pnpm install
```

Then extract the content from the legacy archive (see below), and:

```bash
pnpm run dev     # http://localhost:3000
```

Other commands: `pnpm run build`, `pnpm run start`, `pnpm run lint`.

Two settings exist so `pnpm install` doesn't stop and take the build down with
it. `pnpm-workspace.yaml` approves the postinstall scripts for `unrs-resolver`
and `sharp` — pnpm 11 blocks build scripts by default and exits non-zero. And
Next is pinned to **16.3.2** rather than the newest patch, because pnpm 11
rejects packages published within the last day as a supply-chain precaution;
pinning an established release avoids fighting that policy.

Until the extractor has run, the home page will show an empty state — the app
reads content from `content/`, which is produced entirely by the extractor.

---

## Extracting the legacy content

The extractor walks the original archive folder, parses every lesson page, and
writes one JSON file per lesson. Run it **on the machine that holds the
archive** — it reads several gigabytes of audio and never needs to upload it
anywhere.

```bash
# Windows (from the project folder)
pnpm run extract -- --src "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"

# or equivalently
node scripts/extract.mjs --src "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"
```

Useful flags:

| Flag | Effect |
| --- | --- |
| `--course ld` | Only process one course |
| `--no-media` | Parse pages but don't copy MP3s (fast, for testing) |
| `--dry-run` | Parse and report, write nothing |
| `--limit 50` | Stop after N pages |

It prints a per-course summary and a list of warnings (missing audio, missing
or unparseable SWFs, unrecognized filenames) — that list is the QA worklist.

### Audio

Two different jobs, both handled by the same run:

- **Drill courses** keep their audio as MP3s in a `sounds/` folder, so those are
  copied straight into `public/audio/<course>/`.
- **Flash courses** (Man / Woman / Student) hide their audio *inside* the `.swf`
  files. `scripts/swf-audio.mjs` parses the movie and pulls the sound out of the
  `DefineSound` and `SoundStreamBlock` tags. Flash stored these as ordinary MP3
  frames or raw PCM, so the audio is written out **without re-encoding** — the
  bytes are identical to what the original lesson played. Raw PCM gets a WAV
  header; MP3 is passed through untouched.

A single lesson movie usually yields several tracks: one full narration plus the
individual sentence clips from the movie's timeline. All of them are kept and
shown as separate players, longest first. Clips under 8 KB are treated as button
click sounds and dropped.

Cover and menu movies legitimately contain no audio; the summary line reports
how many of those it saw so a zero-audio SWF doesn't look like a failure.

### What it produces

```
content/
  courses/<course>.json         # lesson index for one course
  lessons/<course>/<id>.json    # one file per lesson
public/
  audio/<course>/*.mp3          # copied from the archive's sounds/ folders
```

Both are generated and neither should be edited by hand — but they are treated
differently by version control, for a measured reason.

`content/` **is committed**: it is text, diffs properly, and gzips by ~88%
(112KB of sample lessons compress to 13KB). A clone therefore builds a working
site without needing the original archive.

`public/audio` and `public/video` **are not committed**. MP3 and H.264 are
already compressed, so there is nothing left to squeeze — measured on this
archive:

| file | gzip | xz |
| --- | --- | --- |
| `m1-1-1.mp3` (237KB) | −3.1% | −2.8% |
| `c1-1.mp3` (97KB) | −1.9% | −1.9% |
| `cnn037.mp4` (1.1MB) | −3.9% | −4.0% |

Roughly 2GB of media stays roughly 2GB, permanently, in a history that clones in
full. Compressing before commit does not change that, and decompressing on the
way out would break HTTP range requests — which is exactly what audio seeking
and video scrubbing depend on. So the media goes to a Cloudflare R2 bucket instead.

---

## Media hosting

```bash
pnpm run upload-media          # uploads public/audio and public/video to R2
pnpm run upload-media -- --dry-run
```

1. Create an R2 bucket in the Cloudflare dashboard (**R2 Object Storage →
   Create bucket**), or `npx wrangler r2 bucket create <name>`.
2. Put `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (needs "Workers R2
   Storage: Edit") and `R2_BUCKET_NAME` in `.env.local` — see `.env.example`
   for where to find each one.
3. Run the upload. It skips files already there, so an interrupted run resumes,
   and it uploads in parallel (`--concurrency N`, default 8).
4. Make the bucket's contents servable over HTTP — either enable its r2.dev
   URL (`npx wrangler r2 bucket dev-url enable <name>`) or bind a custom
   domain to it — and set that URL as `NEXT_PUBLIC_MEDIA_URL`, both in
   `.env.local` and in your deployment's project environment variables, then
   redeploy.

`src/lib/media.ts` resolves every media reference through that variable. Leave it
unset and the app serves from `public/` exactly as before, so local development
needs no storage account. See `.env.example`.

Cloudflare R2 has no egress fees, unlike most object storage — worth knowing
since audio/video streaming is almost entirely bandwidth.

---

## How the archive maps to the app

The taxonomy comes from how the archive is already organized on disk. Folder
names and filename prefixes are load-bearing; see `src/lib/courses.ts`.

| Course | Folder | Pages | Content |
| --- | --- | --- | --- |
| `ld` | `LD` | 556 | Exam listening & dictation, `d001`–`d276` |
| `reading` | `reading` | 515 | Reading passages, `pr001`–`pr256` |
| `basics` | `basics` | 468 | Sentence drills (`po`) + Q&A (`qa`) |
| `middle` | `middle` | 233 | Middle-school drills, 25 units |
| `adults` | `adults` | 207 | Adult conversation, men's + women's tracks |
| `phonics` | `phonics` | 201 | Pronunciation, 4 series |
| `grammar1` | `grammar1` | 195 | English composition exercises |
| `grammar2` | `grammar2` | 91 | Second-level composition |
| `man` / `woman` / `student` | `Man` etc. | 263 | Flash conversation lessons |
| `cnn` | `CNN` | 120 | `.wmv` video clips — needs transcoding |
| `gva` | Downloads `중등영어독해(1~200)` | 200 | GVA 독해 교재 이미지 + 실제 강의 MP3 스트리밍 |

**Excluded:** `GVA 2000 Pro/` Windows installers and the legacy `css/`, `images/`,
`scripts/`, `objects/` and `sources/` folders. GVA `.gdb` archives are not committed;
`scripts/process-and-upload-gva.mjs` extracts browser-playable assets and uploads
them to Cloudflare R2.

### Page pairs

Most lessons exist as two files: `d001.htm` (the English drill) and `d001-1.htm`
(its Korean script, for reverse translation). The extractor keeps both, marks
them `main` and `script`, and the app links them to each other.

Careful: a trailing `-N` means something different per course. In `Man`,
`m1-1` is *unit 1, part 1*, not a script page. Each course declares its own
`numbering` scheme in `src/lib/courses.ts`.

### Encoding

The archive mixes UTF-8 and EUC-KR, sometimes within one folder, and the `meta`
charset tag is not always right. The extractor decodes UTF-8 strictly and falls
back to EUC-KR when that throws, which is reliable in a way that trusting the
tag is not. Each lesson records which encoding it came from.

---

## The legacy information architecture, restored

The original was a frameset: a ten-tab bar in a permanent top frame, content
below. `src/lib/tabs.ts` reproduces that bar exactly, including two things that
are easy to get wrong.

**The tab labels are in the images, and the filenames lie.** `MEN.jpg` links to
`middle/`, `STUDENT.jpg` to `basics/`, `VOCA.jpg` to `phonics/`. The labels
below were read off the images themselves:

| Tab | Folder(s) |
| --- | --- |
| VOCA | `phonics` |
| STUDENTS | `basics` + `Student` |
| MEN | `middle` + `Man` |
| WOMEN | `adults` + `Woman` |
| GRAMMAR I / II | `grammar1`, `grammar2` |
| Listen/Dictate | `LD` |
| READING | `reading` |
| CNN | `CNN` — archive only |
| GVA 독해 | `gva` — 200강 웹 스트리밍 |

**Three tabs hold two kinds of material.** Their framesets prove it:

```
basics/index.htm  -> top: menu.htm  bottom: ../Student/shome.html
middle/index.htm  -> top: menu.htm  bottom: ../Man/mhome.html
adults/index.htm  -> top: menu.htm  bottom: ../Woman/whome.html
```

Opening STUDENTS landed you on the Student conversation lessons with the basics
drill menu above. So drills and conversation are one tab here, not two courses.

### Lesson grouping

Most courses navigated by `<select>` dropdowns — LD alone has 557 options. Each
dropdown is a group whose first option is its own hand-written label
("[ 001번 - 050번 ]", "[ 제 1 단계 ]"), and each lesson option carries a label
too ("[ 7과 영어 ]" / "[ 7과 한글 ]"). Those are preserved verbatim and used as
the lesson titles, because they say things filenames cannot. `basics`, `middle`
and `adults` had no dropdowns, so they fall back to series and unit.

### GVA

GVA 독해 001–200은 원래 `GVA2000_Student.exe`가 읽는 전용 `.gdb` 아카이브입니다.
현재 앱은 원본을 저장소나 브라우저에 노출하지 않고, 아카이브 안의 교재 JPEG와
MPEG 오디오 프레임을 검증·재구성해 Cloudflare R2에서 스트리밍합니다. 1~2강은
무료 체험이며 3~200강은 VIP 올패스 이용권으로 열립니다.

---

## Coverage audit

Every affordance in the old site is a link, a `<select>` option, or a frameset
target — all machine-readable. Rather than trusting anyone's memory of what the
old app could do, enumerate them and check each has a home here:

```bash
node scripts/audit.mjs --src "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"
```

Anything printed under **GAPS** is something the original could reach and this
rebuild currently cannot. Run it after every extraction.

---

## Structure

```
scripts/extract.mjs        legacy HTML -> JSON pipeline
scripts/swf-audio.mjs      pulls audio out of Flash .swf files
scripts/legacy-menu.mjs    recovers the dropdown navigation from menu.htm
scripts/audit.mjs          reports legacy destinations with no home here
scripts/upload-media.mjs   pushes audio and video to Cloudflare R2
src/lib/types.ts           content model
src/lib/courses.ts         course taxonomy
src/lib/content.ts         build-time JSON reader
src/lib/media.ts           resolves media to public/ or the R2 bucket
src/lib/tabs.ts            the legacy ten-tab navigation
src/components/            TabBar, AudioPlayer, LessonBody, DictationPanel
src/app/                   routes: /, /t/[tab], /[course], /[course]/[lesson]
```

### Design

Monochrome by intent: no accent colour anywhere, with rank carried by weight,
size and spacing so that dense drill pages stay calm. Every interactive surface
animates on hover and focus, driven by shared `--dur` / `--ease` tokens declared
once in `globals.css` so a new control cannot ship without motion. Reduced-motion
preferences disable all of it.

Every lesson page is statically generated at build time, so the deployed site is
static files with no server-side data access.

## What replaced what

| Legacy | Now |
| --- | --- |
| `<embed src="*.mp3">` plugin player | `<audio>` with seek, replay and speed control |
| Flash `.swf` lessons | Audio parsed out of the SWFs, played as normal `<audio>` |
| `<frameset>` navigation | App Router routes with prev/next and script links |
| `mailto:` answer form | Answers kept in the student's own browser |
| Table layout + `<font>` tags | Tailwind components |

## Not done yet

- **CNN video.** 120 `.wmv` files need transcoding to MP4 before they can ship.
- **QA pass.** The extractor's warning list needs working through against the
  original pages, particularly for mixed-encoding text.
