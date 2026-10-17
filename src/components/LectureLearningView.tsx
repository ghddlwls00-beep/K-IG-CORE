"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { LectureData } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { clearLessonGate, setLessonGate } from "@/lib/lessonGate";
import { useProgress } from "@/components/ProgressProvider";
import {
  buildLectureTimeline,
  lecturePageAt,
  lectureSegmentsAt,
  type LecturePenFile,
  type LectureTimeline,
} from "@/lib/lecturePen";

/**
 * LECTURE (2026-10-17, docs/lecture/README.md) — one GVA reading lecture: the textbook page, and over it the teacher's pen
 * notes drawn in their original timing. One screen, no steps; the end bar (LessonEndBar) closes the page as in every course.
 *
 * WHAT IS SHOWN AT TIME T: the page the lecture had open at T (pen.json `pageEvents` — lecture 57 turns to 59 · 60 · 58 and
 * back) and every pen segment of THAT page reached by T, so a stroke is drawn part-way while it is being written. A segment's
 * time is its time unit × unitSec. While playing only the newly reached segments are added each frame (nothing is redrawn
 * sixty times a second); going back on the bar, a page turn or a resize redraws the page from the start up to T.
 *
 * THE CLOCK: the lecture has no voice today (사장님 — "음성은 안 들어갈거야", an AI voice per lecture later), so the time is
 * this view's own (performance.now() since play × speed). The day a lesson file has `lecture.audio.src`, that <audio> element
 * becomes the clock instead — play, pause, seek and speed act on it and the pen follows its currentTime (the code path below
 * is ready; no lesson has a voice yet, so it has not run against a real file).
 *
 * Opening a lecture starts at 0:00 on the empty page, paused — nothing plays by itself (메모리 규칙: no autoplay).
 * Completion: once the lecture has reached its end — played through, or the bar moved to the end — '이 강의 학습 완료' opens
 * (lessonGate); until then the end bar says why.
 *
 * Paid data: only this lecture's two kinds of path reach the browser (from the lesson file, after the server's gate); the
 * image and pen bytes come from /audio/lecture/… which checks the licence (mediaAccess.ts), never from public/.
 */

/**
 * The stage, in the pen's pixels (the GVA window — see PAGE_X): wide enough for the notes beside the page in every lecture
 * (pen.json canvas.w is 840–1020 over the 200, measured 2026-10-17) and as tall as the page placed 20px down (1190). One size for every lecture, so the page
 * keeps its place while the pen file loads and does not jump when it arrives. A wider file (none today) is scaled to fit.
 */
const STAGE_W = 1020;
const STAGE_H = 1190;
const PAGE_W = 827;
const PAGE_H = 1169;
/**
 * Where the page sits in the pen's coordinates. The pen was recorded in the GVA player's window, not on the page: every
 * PageNN.htm in the .gdb shows the page as `<body topmargin="20"><center><img …></center>` — 20px down and centred. Measured
 * 2026-10-17 by moving the teacher's underlines under the ink of the text line above them: the best fit is 80px right and 20px
 * down on every lecture tried (27 of them, ±2px — the window was ~987px wide). Drawn at (0, 0) the notes sat 80px right of and
 * 20px under the words they mark (사장님: "86강 보면 뭔가 어색한 느낌", 2026-10-17). So the page image goes here, and the
 * pen stays in its own numbers.
 */
const PAGE_X = 80;
const PAGE_Y = 20;

/**
 * Pen colours. These are the textbook's ink, not interface colours: they are drawn on the white page image (which is white in
 * dark mode too), so they stay outside the design tokens (docs/디자인-규칙.md §4 is about the interface). The five pen codes
 * of the .gdb files and their colours are the owner's (docs/lecture/README.md 2장 · 5장 — 사장님 '그 색으로 해', 2026-10-17),
 * the same values as scripts/lecture/render-pen.mjs `PEN`. Widths are in page pixels.
 */
const PEN_STYLE: Record<number, { color: string; width: number; highlighter?: true }> = {
  0x43: { color: "#C2362F", width: 2.2 }, // crimson — the main pen (~90% of strokes)
  0x33: { color: "#2456A4", width: 2.2 }, // ink blue
  0x23: { color: "#2E7A4C", width: 2.2 }, // forest green
  0x13: { color: "#2A2A2A", width: 2.2 }, // charcoal
  0x03: { color: "#E8B93A", width: 13, highlighter: true }, // warm gold highlighter — its own layer, see HIGHLIGHT_OPACITY
};
const UNKNOWN_PEN = { color: "#2A2A2A", width: 2.2 };
/** the highlighter layer's opacity: drawn opaque on its own canvas, so crossing strokes do not darken where they overlap */
const HIGHLIGHT_OPACITY = 0.42;

/** the smallest the page is drawn (stage scale): below this a phone pans the page instead of shrinking it further */
const MIN_SCALE = 0.62;
/** how long following the pen waits after the learner scrolls the page window themselves */
const FOLLOW_HOLD_MS = 4000;

const SPEEDS = [1, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

const GATE_REASON = "강의를 끝까지 재생하면 완료할 수 있어요.";
/** within this many seconds of the end counts as the end (the bar moves in 1-second steps) */
const END_SLACK = 0.05;

type LoadState = "loading" | "ready" | "error";

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function LectureLearningView({
  lessonKey,
  lecture,
}: {
  /** "lecture/<id>" */
  lessonKey: string;
  lecture: LectureData;
}) {
  const [course, lessonId] = lessonKey.split("/");
  const duration = lecture.durationSec;
  const firstPage = lecture.pages[0]?.page ?? 0;
  const audioSrc = lecture.audio?.src ?? null;

  const { isCompleted } = useProgress();
  const completed = isCompleted(course, lessonId);

  const [load, setLoad] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [page, setPage] = useState(firstPage);
  const [reachedEnd, setReachedEnd] = useState(false);

  const timelineRef = useRef<LectureTimeline | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const markRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const frameRef = useRef(0);
  /** the internal clock: `base` seconds at performance.now() = `startedAt`, moving at `rate` while `running` */
  const clockRef = useRef({ base: 0, startedAt: 0, running: false, rate: 1 as number });
  /** what the canvases hold: this page, segments 0 … drawn − 1 of the timeline (those of other pages skipped) */
  const drawnRef = useRef({ page: -1, drawn: 0 });
  const scaleRef = useRef(1);
  const shownTimeRef = useRef(0);

  // ------------------------------------------------------------------ load the pen file
  useEffect(() => {
    const controller = new AbortController();
    timelineRef.current = null;
    fetch(mediaUrl(lecture.pen.src), { credentials: "same-origin", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`pen ${response.status}`);
        return response.json() as Promise<LecturePenFile>;
      })
      .then((file) => {
        timelineRef.current = buildLectureTimeline(file);
        drawnRef.current = { page: -1, drawn: 0 };
        // a page image that already failed keeps the error line (its '다시 시도' asks for both again)
        setLoad((previous) => (previous === "error" ? previous : "ready"));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("[lecture] pen file failed", error);
        setLoad("error");
      });
    return () => controller.abort();
  }, [lecture.pen.src, attempt]);

  // ------------------------------------------------------------------ drawing
  const contexts = useCallback(() => {
    const ink = inkRef.current?.getContext("2d") ?? null;
    const mark = markRef.current?.getContext("2d") ?? null;
    return ink && mark ? { ink, mark } : null;
  }, []);

  /** draws segments [from, to) of the timeline that belong to `onPage`, one path per run of the same stroke */
  const drawSegments = useCallback((from: number, to: number, onPage: number) => {
    const timeline = timelineRef.current;
    const ctx = contexts();
    if (!timeline || !ctx) return;
    let k = from;
    while (k < to) {
      const s = timeline.segStroke[k];
      const stroke = timeline.strokes[s];
      if (stroke.page !== onPage) {
        k++;
        continue;
      }
      const style = PEN_STYLE[stroke.pen] ?? UNKNOWN_PEN;
      const g = style.highlighter ? ctx.mark : ctx.ink;
      g.strokeStyle = style.color;
      g.lineWidth = style.width;
      g.beginPath();
      const p0 = timeline.segPoint[k] - 1;
      g.moveTo(stroke.x[p0], stroke.y[p0]);
      // the run: following segments of the same stroke, point after point
      let p = timeline.segPoint[k];
      let moved = stroke.x[p] !== stroke.x[p0] || stroke.y[p] !== stroke.y[p0];
      g.lineTo(stroke.x[p], stroke.y[p]);
      k++;
      while (k < to && timeline.segStroke[k] === s && timeline.segPoint[k] === p + 1) {
        p = timeline.segPoint[k];
        if (stroke.x[p] !== stroke.x[p0] || stroke.y[p] !== stroke.y[p0]) moved = true;
        g.lineTo(stroke.x[p], stroke.y[p]);
        k++;
      }
      if (moved) {
        g.stroke();
      } else {
        // a dot (a full stop, the dot of an 'i' — 53 strokes in 41 lectures never move): a canvas draws no cap on a
        // zero-length line, so it vanished while render-pen.mjs's SVG showed it (확인-기록 2026-10-17). Drawn as the
        // round cap would be.
        g.beginPath();
        g.arc(stroke.x[p0], stroke.y[p0], style.width / 2, 0, Math.PI * 2);
        g.fillStyle = style.color;
        g.fill();
      }
    }
  }, [contexts]);

  const clearCanvases = useCallback(() => {
    const ctx = contexts();
    if (!ctx) return;
    for (const g of [ctx.ink, ctx.mark]) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, g.canvas.width, g.canvas.height);
      g.restore();
    }
  }, [contexts]);

  /** the screen at `seconds`: the page then open, and its segments reached by then — only what is new when it can */
  const renderAt = useCallback((seconds: number, forceRedraw = false) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const units = seconds / timeline.unitSec;
    const pageNow = lecturePageAt(timeline, units, firstPage);
    const reach = lectureSegmentsAt(timeline, units);
    const drawn = drawnRef.current;
    if (forceRedraw || pageNow !== drawn.page || reach < drawn.drawn) {
      clearCanvases();
      drawSegments(0, reach, pageNow);
    } else if (reach > drawn.drawn) {
      drawSegments(drawn.drawn, reach, pageNow);
    }
    drawnRef.current = { page: pageNow, drawn: reach };
    // the latest point on the open page — the viewport follows it (none yet: the top of the page)
    penPointRef.current = null;
    for (let k = reach - 1; k >= 0; k--) {
      const stroke = timeline.strokes[timeline.segStroke[k]];
      if (stroke.page !== pageNow) continue;
      const p = timeline.segPoint[k];
      penPointRef.current = { x: stroke.x[p], y: stroke.y[p] };
      break;
    }
    setPage(pageNow);
  }, [clearCanvases, drawSegments, firstPage]);

  /*
   * The size of the page on screen (사장님 2026-10-17, second answer). Fitting the whole page into the window made it far too
   * small to read ("너무 작은데? 데스크탑에서는 아예 보이지가 않는데?" — on a 1366 × 650 window the text came out ~5px). So the
   * page is shown at a readable size — the stage as wide as the frame, but never above its own size (scale 1) nor below
   * MIN_SCALE — inside a window of the page (the viewport) as tall as the screen allows, and that window FOLLOWS THE PEN while
   * the lecture plays: the place the teacher is writing is kept in view, as the original GVA player scrolled its page. The
   * learner can scroll the window too; following waits a few seconds after they do.
   */
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const w = viewport.clientWidth;
      if (w) setScale(Math.min(1, Math.max(MIN_SCALE, w / STAGE_W)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  /** the last point drawn, in page pixels — what the viewport follows */
  const penPointRef = useRef<{ x: number; y: number } | null>(null);
  /** following waits until this time (performance.now()) after the learner scrolled the viewport themselves */
  const followHoldRef = useRef(0);
  /** our own scrolls, which must not count as the learner's */
  const ownScrollUntilRef = useRef(0);
  const lastFollowRef = useRef(0);

  const follow = useCallback((immediate: boolean) => {
    const viewport = viewportRef.current;
    const point = penPointRef.current;
    const k = scaleRef.current;
    if (!viewport) return;
    const now = performance.now();
    if (!immediate && (now < followHoldRef.current || now - lastFollowRef.current < 250)) return;
    lastFollowRef.current = now;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    let left = viewport.scrollLeft;
    let top = viewport.scrollTop;
    if (!point) {
      left = 0;
      top = 0;
    } else {
      const px = point.x * k;
      const py = point.y * k;
      // keep the pen inside the middle of the window: move only when it nears an edge, then bring it to a third from the top
      if (py < top + vh * 0.15 || py > top + vh * 0.8) top = py - vh * 0.35;
      if (px < left + vw * 0.1 || px > left + vw * 0.9) left = px - vw * 0.5;
    }
    left = Math.max(0, Math.min(left, viewport.scrollWidth - vw));
    top = Math.max(0, Math.min(top, viewport.scrollHeight - vh));
    if (Math.abs(left - viewport.scrollLeft) < 2 && Math.abs(top - viewport.scrollTop) < 2) return;
    ownScrollUntilRef.current = now + 900;
    viewport.scrollTo({ left, top, behavior: immediate ? "auto" : "smooth" });
  }, []);

  // the learner's own scrolling (wheel, touch, keys, the scroll bar) holds following for a while
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const hold = () => {
      followHoldRef.current = performance.now() + FOLLOW_HOLD_MS;
    };
    const onScroll = () => {
      if (performance.now() > ownScrollUntilRef.current) hold();
    };
    viewport.addEventListener("wheel", hold, { passive: true });
    viewport.addEventListener("touchstart", hold, { passive: true });
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("wheel", hold);
      viewport.removeEventListener("touchstart", hold);
      viewport.removeEventListener("scroll", onScroll);
    };
  }, []);

  // the canvases follow the stage's size on screen, at the screen's pixel density (sharp lines on a high-density screen)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || load !== "ready") return;
    const fit = () => {
      const cssW = stage.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const scale = cssW / STAGE_W;
      scaleRef.current = scale;
      for (const canvas of [inkRef.current, markRef.current]) {
        if (!canvas) continue;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round((cssW * STAGE_H * dpr) / STAGE_W);
        const g = canvas.getContext("2d");
        if (!g) continue;
        g.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
        g.lineCap = "round";
        g.lineJoin = "round";
      }
      renderAt(currentSeconds(), true);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
    // currentSeconds reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, renderAt]);

  // ------------------------------------------------------------------ the clock
  function currentSeconds(): number {
    const audio = audioRef.current;
    if (audioSrc && audio) return Math.min(duration, audio.currentTime);
    const c = clockRef.current;
    const t = c.running ? c.base + ((performance.now() - c.startedAt) / 1000) * c.rate : c.base;
    return Math.min(duration, Math.max(0, t));
  }

  const showTime = useCallback((seconds: number) => {
    // the numbers and the bar move in quarter seconds; the pen is drawn every frame
    if (Math.abs(seconds - shownTimeRef.current) >= 0.25 || seconds === 0 || seconds >= duration) {
      shownTimeRef.current = seconds;
      setTime(seconds);
    }
  }, [duration]);

  const stopLoop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    const c = clockRef.current;
    c.base = currentSeconds();
    c.running = false;
    audioRef.current?.pause();
    stopLoop();
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopLoop]);

  const markEnd = useCallback(() => {
    setReachedEnd(true);
  }, []);

  const tick = useCallback(() => {
    const seconds = currentSeconds();
    renderAt(seconds);
    follow(false);
    showTime(seconds);
    if (seconds >= duration - END_SLACK) {
      pause();
      shownTimeRef.current = duration;
      setTime(duration);
      markEnd();
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, follow, markEnd, pause, renderAt, showTime]);

  const seek = useCallback((seconds: number) => {
    const target = Math.min(duration, Math.max(0, seconds));
    const c = clockRef.current;
    c.base = target;
    c.startedAt = performance.now();
    const audio = audioRef.current;
    if (audioSrc && audio) audio.currentTime = target;
    renderAt(target);
    // a jump on the bar takes the page window to where the pen is then, at once (and the learner's hold is over)
    followHoldRef.current = 0;
    follow(true);
    shownTimeRef.current = target;
    setTime(target);
    if (target >= duration - END_SLACK) {
      // moved to the end: the lecture counts as played through (사장님 2026-10-17 '끝으로 건너뛰어도 됨')
      pause();
      markEnd();
    }
  }, [audioSrc, duration, follow, markEnd, pause, renderAt]);

  const play = useCallback(() => {
    if (load !== "ready") return;
    if (currentSeconds() >= duration - END_SLACK) seek(0); // at the end, play starts over
    const c = clockRef.current;
    c.base = currentSeconds();
    c.startedAt = performance.now();
    c.running = true;
    const audio = audioRef.current;
    if (audioSrc && audio) {
      audio.playbackRate = c.rate;
      void audio.play().catch(() => {
        // the browser refused (no gesture): stay paused, the button reads '재생' again
        c.running = false;
        setPlaying(false);
        stopLoop();
      });
    }
    setPlaying(true);
    stopLoop();
    frameRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc, duration, load, seek, stopLoop, tick]);

  const restart = useCallback(() => {
    const wasPlaying = clockRef.current.running;
    seek(0);
    if (wasPlaying) play();
  }, [play, seek]);

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    const c = clockRef.current;
    c.base = currentSeconds();
    c.startedAt = performance.now();
    c.rate = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
    setSpeed(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  // leaving the lecture stops its clock and its voice
  useEffect(() => () => {
    stopLoop();
    audioRef.current?.pause();
  }, [stopLoop]);

  // ------------------------------------------------------------------ completion gate (LessonEndBar)
  useEffect(() => {
    setLessonGate(course, lessonId, { ready: reachedEnd || completed, reason: GATE_REASON });
  }, [course, lessonId, reachedEnd, completed]);
  useEffect(() => () => clearLessonGate(course, lessonId), [course, lessonId]);

  // ------------------------------------------------------------------ keyboard on the bar
  const onBarKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const step: Record<string, number> = {
      ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -30, PageUp: 30,
    };
    if (event.key in step) {
      event.preventDefault();
      seek(currentSeconds() + step[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      seek(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seek(duration);
    }
  };

  const ready = load === "ready";
  const speedText = `${speed}×`;

  return (
    // wider than the lesson column on a wide screen (up to 1040px — the page at its own size), centred on it; the column's
    // width on a phone. Margins, not a transform, so the page image is not resampled.
    <div
      className="flex flex-col gap-3"
      style={{ width: "min(calc(100vw - 2rem), 1040px)", marginLeft: "calc(50% - min(50vw - 1rem, 520px))" }}
      data-lecture-view=""
      data-lecture-state={load}
      data-lecture-playing={playing ? "1" : "0"}
    >
      {audioSrc ? (
        // the lecture's voice, when one is added (lesson file `lecture.audio.src`) — then it is the clock (see the top)
        <audio
          ref={audioRef}
          src={mediaUrl(audioSrc)}
          preload="metadata"
          playsInline
          onPause={() => {
            if (clockRef.current.running && audioRef.current && !audioRef.current.ended) pause();
          }}
        />
      ) : null}

      {/* one row: play · the bar with the time · speed · 처음부터 — stays under the header while the page is scrolled */}
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 flex items-center gap-1 border-b border-line bg-surface/95 px-4 py-1.5 backdrop-blur sm:mx-0 sm:gap-1.5 sm:rounded-card sm:border sm:px-3">
        <button
          type="button"
          onClick={playing ? pause : play}
          disabled={!ready}
          aria-label={playing ? "일시정지" : "재생"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-default disabled:opacity-40"
        >
          {playing ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5">
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        {/* the bar: a drawn track (fill + knob) under a see-through range input the full 44px tall — by finger, mouse or keys
            (← → 5초 · PageUp/PageDown 30초 · Home/End). The focus ring is drawn on the track's box. */}
        <div className="relative flex h-11 min-w-[40px] flex-1 items-center rounded-control px-1.5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-[var(--primary)]">
          <span aria-hidden className="relative block h-1.5 w-full rounded-full bg-track">
            <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${duration ? (Math.min(duration, time) / duration) * 100 : 0}%` }} />
            <span
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ${ready ? "" : "opacity-40"}`}
              style={{ left: `${duration ? (Math.min(duration, time) / duration) * 100 : 0}%` }}
            />
          </span>
          {/* max is the length rounded UP to a whole second: with step 1 a range input can only hold whole seconds, so with
              max = 457.9 (lm001 — 181 of the 200 lengths are not whole) the bar dragged to its end stopped at 457, short of
              the end, and '이 강의 학습 완료' stayed off (확인-기록 2026-10-17). seek() clamps 458 to the real length. */}
          <input
            type="range"
            min={0}
            max={Math.ceil(duration)}
            step={1}
            value={Math.min(duration, time)}
            disabled={!ready}
            onChange={(event) => seek(Number(event.target.value))}
            onKeyDown={onBarKey}
            aria-label="재생 위치"
            aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
            className="absolute inset-0 h-11 w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>

        <span className="shrink-0 px-1 text-caption tabular-nums text-ink-soft" data-lecture-time="">
          {fmt(time)} / {fmt(duration)}
        </span>

        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`빠르기 ${speedText} — 누르면 바뀜`}
          title="빠르기 1× · 1.5× · 2×"
          className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-control px-1.5 text-label font-medium tabular-nums text-ink transition-colors cursor-pointer hover:bg-sunken"
        >
          {speedText}
        </button>

        <button
          type="button"
          onClick={restart}
          disabled={!ready}
          className="flex h-11 shrink-0 items-center justify-center rounded-control px-2 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink disabled:cursor-default disabled:opacity-40"
        >
          처음부터
        </button>
      </div>

      {/*
        The page window (viewport): as tall as the screen below the header and the play row, scrolling the page inside it —
        it follows the pen while the lecture plays (see `follow`). The stage inside: the textbook page at its own size in the
        stage (827 × 1169 of 1020 × 1170), the highlighter layer over it, the pen layer on top — drawn at `scale` (the window's
        width, between MIN_SCALE and 1), so a phone pans a readable page rather than shrinking it to a stamp.
      */}
      <div
        ref={viewportRef}
        className="relative w-full overflow-auto overscroll-contain rounded-card border border-line bg-white"
        style={{ maxHeight: "calc(100svh - var(--header-h, 56px) - 84px)" }}
        data-lecture-viewport=""
      >
      <div
        ref={stageRef}
        className="relative overflow-hidden bg-white"
        style={
          scale === null
            ? { width: "100%", aspectRatio: `${STAGE_W} / ${STAGE_H}` }
            : { width: `${Math.round(STAGE_W * scale)}px`, height: `${Math.round(STAGE_H * scale)}px` }
        }
      >
        {lecture.pages.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // a new attempt ('다시 시도') asks for the images again too
            key={`${p.page}-${attempt}`}
            src={mediaUrl(p.src)}
            alt={p.page === page ? `교재 ${p.page}쪽` : ""}
            aria-hidden={p.page === page ? undefined : true}
            decoding="async"
            draggable={false}
            onError={() => setLoad("error")}
            className={`absolute select-none ${p.page === page ? "" : "invisible"}`}
            style={{
              left: `${(PAGE_X / STAGE_W) * 100}%`,
              top: `${(PAGE_Y / STAGE_H) * 100}%`,
              width: `${(PAGE_W / STAGE_W) * 100}%`,
              height: `${(PAGE_H / STAGE_H) * 100}%`,
            }}
          />
        ))}
        <canvas
          ref={markRef}
          aria-hidden
          className="absolute inset-0 h-full w-full mix-blend-multiply"
          style={{ opacity: HIGHLIGHT_OPACITY }}
        />
        <canvas ref={inkRef} aria-hidden className="absolute inset-0 h-full w-full" />

        {load === "loading" ? (
          <p className="absolute inset-x-0 top-1/3 text-center text-label text-ink-soft" role="status">
            강의를 불러오는 중이에요…
          </p>
        ) : null}
        {load === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/90 px-6 text-center" role="alert">
            <p className="text-label text-ink">강의를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => {
                setLoad("loading");
                setAttempt((n) => n + 1);
              }}
              className="flex min-h-11 items-center justify-center rounded-control border border-line bg-raised px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
            >
              다시 시도
            </button>
          </div>
        ) : null}
      </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {reachedEnd ? "강의를 끝까지 재생했어요." : ""}
      </p>
    </div>
  );
}
