#!/usr/bin/env node
/**
 * RE-016 — the allow list `src/proxy.ts` uses to tell a real lesson from a typo.
 *
 * WHY A LIST AT ALL. `/[course]/[lesson]` reads the licence cookie, so Next
 * cannot prerender the route as a whole: it is dynamic and `dynamicParams =
 * false` has nothing to attach to. An unknown lesson therefore reaches the page,
 * `notFound()` is thrown after the shell has already been flushed, and Next
 * answers 404 with an EMPTY body — `<div hidden></div>` plus the flight payload
 * and not one visible character. A visitor sees white; a crawler and a
 * JS-disabled client see white forever. The proxy cannot render a page either,
 * but it can hand the request to the router as a path that matches NO route,
 * which is the one shape Next already renders server-side.
 *
 * THE LISTS ARE READ HERE, AT BUILD TIME. `content/` is never touched on a
 * request; the proxy imports the emitted JSON, which Next bundles with it.
 *
 * DRIFT IS THE DANGER, AND IT IS NOT THEORETICAL. A short list turns real
 * lessons into 404s, which is worse than the blank page it fixes — a previous
 * attempt at this bug did exactly that (see NEXT-SESSION.md §0-A). Three things
 * guard against it:
 *
 *   1. `prebuild` and `predev` regenerate this file, so it cannot go stale
 *      relative to `content/`. Vercel runs `npm run build`, which runs it.
 *   2. The assertions at the bottom ABORT the build if the result looks wrong.
 *      A build that fails is safe; a build that ships a truncated list is not.
 *   3. The slug lists are not copied from the app by hand — `src/lib/courses.ts`
 *      and `src/lib/tabs.ts` are transpiled and read directly, so a course added
 *      to the app cannot be missing here. `getAllLessonParams()` itself is
 *      mirrored rather than re-derived: it is `getCourses()` + every `lesson.id`
 *      in `content/courses/<slug>.json`, and nothing else.
 *
 *   node scripts/buildValidRoutes.mjs            # regenerate
 *   node scripts/buildValidRoutes.mjs --check    # exit 1 if the file is stale
 *
 * The emitted file has no timestamp on purpose: an unchanged `content/` must
 * produce a byte-identical file, so regenerating it never dirties the working
 * tree that other sessions are sharing.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_FILE = path.join(ROOT, "src", "lib", "generated", "validRoutes.json");
const CHECK = process.argv.includes("--check");

/**
 * `courses.ts` and `tabs.ts` each have exactly one import and it is type-only,
 * so they transpile to a module with no runtime dependencies. Anything that
 * gains a real import must not be loaded this way — the loader would silently
 * hand back `undefined` for it.
 */
function loadTsModule(relativePath) {
  const file = path.join(ROOT, relativePath);
  const req = createRequire(import.meta.url);
  const ts = req(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", js)(module, module.exports, req);
  return module.exports;
}

const { COURSES } = loadTsModule("src/lib/courses.ts");
const { TABS } = loadTsModule("src/lib/tabs.ts");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const courseIndex = (slug) => {
  const file = path.join(ROOT, "content", "courses", `${slug}.json`);
  return fs.existsSync(file) ? readJson(file) : null;
};

// --- mirror of getCourses() -------------------------------------------------
// A course is available when its index has at least one `main` lesson. Courses
// whose content was never extracted are dropped, exactly as the app drops them.
const courses = [];
for (const c of COURSES) {
  const index = courseIndex(c.slug);
  const mainCount = (index?.lessons ?? []).filter((l) => l.variant === "main").length;
  if (mainCount > 0) courses.push(c.slug);
}

// --- mirror of what `getLesson()` will actually serve ----------------------
// NOT `getAllLessonParams()`, and the difference is not academic.
//
// `getAllLessonParams()` enumerates `content/courses/<slug>.json`, which is the
// list `generateStaticParams` prerenders from. But `[course]/[lesson]` is a
// DYNAMIC route, so a request is served whenever `getLesson()` can find a file
// — and `getLesson()` never consults the index. It checks three things:
// the course is one of the seven, the id matches /^[a-z0-9-]+$/i, and
// `content/lessons/<course>/<id>.json` exists.
//
// The two sets are NOT the same, and the gap is exactly where this would have
// gone wrong: STUDENT has `s1`–`s5` on disk but not in its index, and all five
// answer 200 in production. An allow list built from the index alone would have
// rewritten them to 404 — the same "fixed the 404s, broke real lessons" failure
// this file exists to prevent. Measured against production before the proxy
// shipped: `/student/s1` -> 200, 307 chars of server-rendered text.
//
// So the list is every file `getLesson()` would find, and the id pattern is
// applied here for the same reason it is applied there: `ld/LD_001` exists on
// disk but the underscore is rejected, so it is correctly not servable and is
// correctly absent here (it answers 404 in production).
const ID_PATTERN = /^[a-z0-9-]+$/i;

const lessons = {};
let lessonCount = 0;
let droppedForPattern = [];
for (const slug of courses) {
  const dir = path.join(ROOT, "content", "lessons", slug);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -".json".length))
    : [];
  const ids = files.filter((id) => ID_PATTERN.test(id));
  droppedForPattern.push(...files.filter((id) => !ID_PATTERN.test(id)).map((id) => `${slug}/${id}`));
  ids.sort();
  lessons[slug] = ids;
  lessonCount += ids.length;
}

// --- static routes, scanned from the app directory --------------------------
// `/[course]/[lesson]` and `/t/[tab]` are not the only pages: `/admin/license`
// is one too, and it is a real page the owner uses. It is found by walking
// `src/app` rather than by writing it down here, so a static route added later
// cannot be missed and turned into a 404 by the proxy.
// Only routes whose every segment is a literal are emitted; dynamic ones are
// resolved by the content lists above.
//
// SINCE SEC-05 THE PROXY ALSO DENIES UNKNOWN ONE-SEGMENT PATHS, so a page this
// scan misses is a 404 at one or two segments. Three shapes are easy to miss and are
// handled on purpose:
//   - `(group)` and `@slot` folders do not add a URL segment, but the pages inside
//     them are real — `src/app/(legal)/terms/page.tsx` is `/terms`. The scan
//     used to skip these folders entirely.
//   - a page file may be .tsx, .ts, .jsx, .js or .mdx; a route handler (`route.ts`)
//     answers a URL too. Handlers below `api/`, `audio/` and `video/` are left
//     out: the proxy's matcher never sends those paths to it.
//   - Next also serves files under names this scan cannot spell out (a hashed icon
//     in a route group, `generateSitemaps`); `src/proxy.ts` lets those shapes
//     through by pattern instead.
//   - an icon or share image written as code (`opengraph-image.tsx`, `icon.tsx`)
//     answers at a path with no extension, so the matcher does send it.
const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const ROUTE_FILE = /^route\.(ts|js)$/;
const METADATA_ROUTE_FILE = /^(opengraph-image|twitter-image|icon|apple-icon)\.(tsx|ts|jsx|js)$/;
const NEVER_PROXIED = new Set(["api", "audio", "video"]);

function scanStaticRoutes() {
  const found = new Set();
  const walk = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // `_private` folders do not appear in the URL, and nothing under them is served.
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const literal = segments.every((s) => !s.includes("["));
      if (entry.isDirectory()) {
        const invisible = entry.name.startsWith("(") || entry.name.startsWith("@");
        walk(full, invisible ? segments : [...segments, entry.name]);
      } else if (!literal || segments.length === 0) {
        // `/` is always served; a dynamic segment is resolved by the lists above.
        if (literal && METADATA_ROUTE_FILE.test(entry.name)) found.add(entry.name.replace(/\.[^.]+$/, ""));
      } else if (PAGE_FILE.test(entry.name)) {
        found.add(segments.join("/"));
      } else if (ROUTE_FILE.test(entry.name) && !(NEVER_PROXIED.has(segments[0]) && segments.length > 1)) {
        // `src/app/api/route.ts` answers `/api` itself, which the matcher does send.
        found.add(segments.join("/"));
      } else if (METADATA_ROUTE_FILE.test(entry.name)) {
        found.add([...segments, entry.name.replace(/\.[^.]+$/, "")].join("/"));
      }
    }
  };
  walk(path.join(ROOT, "src", "app"), []);
  return [...found].sort();
}

const staticRoutes = scanStaticRoutes();

// --- files the app serves at one or two segments ----------------------------
// SINCE SEC-05 THE PROXY ALSO SEES PATHS WITH A DOT (`/index.html`, `/.env`,
// `/ld/d001.html`). Once every page renders per request, a mistyped one reaches
// `[course]` or `[course]/[lesson]`, calls `notFound()` and comes back as the blank
// 404, so the proxy sends it to the readable one instead. A real file must never
// be one of them. `config.matcher` already leaves out `_next/`, `api/`, `audio/`,
// `video/`, `images/` and the root files by name; this list is the rest, so a file
// added to `public/` or an icon added to `src/app` later is served, not 404'd.
//
// Only one- and two-segment paths are listed: the proxy lets deeper paths through.
function scanFiles() {
  const found = new Set();
  const publicDir = path.join(ROOT, "public");
  const walkPublic = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Never sent to the proxy (see `config.matcher`), and `public/audio` and
      // `public/video` exist only on some machines (.gitignore) — listing them
      // would make this file differ between a local build and Vercel's.
      if (segments.length === 0 && ["audio", "video", "images"].includes(entry.name)) continue;
      const next = [...segments, entry.name];
      if (next.length > 2) continue;
      if (entry.isDirectory()) walkPublic(path.join(dir, entry.name), next);
      else found.add(next.join("/"));
    }
  };
  if (fs.existsSync(publicDir)) walkPublic(publicDir, []);

  // Metadata files in `src/app` (root or a literal folder). Written as code, robots,
  // sitemap and manifest answer with an extension of their own; icons and share
  // images written as code answer with none and are in `staticRoutes` above.
  const CODE_EXT = { robots: "txt", sitemap: "xml", manifest: "webmanifest" };
  const STATIC_META = /^(favicon|icon\d*|apple-icon\d*|opengraph-image\d*|twitter-image\d*|robots|sitemap|manifest)\.[a-z0-9]+$/i;
  const walkApp = (dir, segments) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        const invisible = entry.name.startsWith("(") || entry.name.startsWith("@");
        if (!invisible && entry.name.includes("[")) continue;
        walkApp(path.join(dir, entry.name), invisible ? segments : [...segments, entry.name]);
        continue;
      }
      const [base, ext] = [entry.name.replace(/\.[^.]+$/, ""), entry.name.split(".").pop()];
      if (/^(ts|tsx|js|jsx)$/.test(ext)) {
        if (CODE_EXT[base]) found.add([...segments, `${base}.${CODE_EXT[base]}`].join("/"));
      } else if (STATIC_META.test(entry.name)) {
        found.add([...segments, entry.name].join("/"));
      }
    }
  };
  walkApp(path.join(ROOT, "src", "app"), []);
  return [...found].filter((f) => f.split("/").length <= 2).sort();
}

const files = scanFiles();

// --- mirror of getTabs() ----------------------------------------------------
// `getTabs()` maps TABS and never drops one; `t/[tab]/page.tsx` prerenders one
// page per tab slug. A tab whose courses are all missing still resolves, so the
// allow list is every tab slug.
const tabs = TABS.map((t) => t.slug);

const output = { courses, tabs, staticRoutes, files, lessonCount, lessons };

// --- assertions: a wrong list must fail the build, not ship -----------------
const problems = [];

if (staticRoutes.length === 0) {
  problems.push("the src/app scan found no static routes at all — the scan is broken");
}
for (const required of ["robots.txt", "sitemap.xml", "favicon.ico", "icon.svg"]) {
  if (!files.includes(required)) problems.push(`the file scan did not find /${required} — the scan is broken`);
}
if (courses.length !== COURSES.length) {  problems.push(
    `only ${courses.length}/${COURSES.length} courses have content: ` +
      `missing ${COURSES.map((c) => c.slug).filter((s) => !courses.includes(s)).join(", ")}`,
  );
}
// The floor is deliberately loose — it catches an empty or truncated read, not
// a small content edit. It was 1,742 lessons when this was written.
if (lessonCount < 1000) {
  problems.push(`only ${lessonCount} lesson params collected (expected > 1000)`);
}
for (const slug of courses) {
  if (lessons[slug].length === 0) problems.push(`course "${slug}" produced no lesson ids`);
  const dupes = lessons[slug].filter((id, i) => lessons[slug].indexOf(id) !== i);
  if (dupes.length) problems.push(`course "${slug}" has duplicate ids: ${[...new Set(dupes)].join(", ")}`);
}
// `getLesson()` switches on the course slug and returns null for anything not
// in its list, so a course that exists in `courses.ts` but not in that switch
// would be in this allow list and still 404. Fail instead of guessing.
const contentTs = fs.readFileSync(path.join(ROOT, "src", "lib", "content.ts"), "utf8");
const getLessonCases = [...contentTs.matchAll(/case "([a-z0-9-]+)":/g)].map((m) => m[1]);
for (const slug of courses) {
  if (!getLessonCases.includes(slug)) {
    problems.push(`course "${slug}" is not handled by getLesson() in src/lib/content.ts`);
  }
}

// The index and the files should agree on which ids exist; where they do not,
// the file wins (that is what gets served). Reported, not fatal — the proxy
// handles both cases correctly, and failing the build over a content
// inconsistency would block work that has nothing to do with this.
const indexOnly = courses.flatMap((slug) => {
  const indexIds = (courseIndex(slug)?.lessons ?? []).map((l) => l.id);
  return indexIds.filter((id) => !lessons[slug].includes(id)).map((id) => `${slug}/${id}`);
});

if (problems.length) {
  console.error("buildValidRoutes: refusing to write a list that looks wrong");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const json = JSON.stringify(output, null, 2) + "\n";
const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : null;

if (CHECK) {
  if (previous === json) {
    console.log(`buildValidRoutes: up to date (${lessonCount} lessons, ${courses.length} courses, ${tabs.length} tabs)`);
    process.exit(0);
  }
  console.error("buildValidRoutes: src/lib/generated/validRoutes.json is STALE — run: node scripts/buildValidRoutes.mjs");
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, json);
console.log(
  `buildValidRoutes: ${previous === json ? "unchanged" : "written"} — ` +
    `${lessonCount} lessons across ${courses.length} courses, ${tabs.length} tabs, ` +
    `${staticRoutes.length} static route(s)`,
);
for (const slug of courses) console.log(`  ${slug.padEnd(10)} ${String(lessons[slug].length).padStart(5)} ids`);
for (const route of staticRoutes) console.log(`  (static)   ${route}`);
console.log(`  (files)    ${files.join(", ")}`);
if (droppedForPattern.length) {
  console.log(
    `  not servable (id fails getLesson's pattern, so the page 404s too): ${droppedForPattern.join(", ")}`,
  );
}
if (indexOnly.length) {
  console.log(`  in the course index but no lesson file: ${indexOnly.join(", ")}`);
}
