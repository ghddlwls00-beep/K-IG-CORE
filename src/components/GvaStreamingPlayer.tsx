"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GvaLesson } from "@/lib/gva";

interface GvaStreamingPlayerProps {
  lesson: GvaLesson;
  allLessons: GvaLesson[];
  prevLesson: GvaLesson | null;
  nextLesson: GvaLesson | null;
  initialStrokes?: StrokeTuple[];
}

const SPEED_OPTIONS = [0.8, 1.0, 1.2, 1.5, 2.0];

function formatTime(sec: number) {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Color map: 1=red, 2=blue, 3=green, 4=yellow, etc.
function getStrokeColor(col: number): string {
  switch (col) {
    case 1:
      return "#ef4444"; // Vivid Red
    case 2:
      return "#2563eb"; // Vivid Blue
    case 3:
      return "#16a34a"; // Green
    case 4:
      return "#eab308"; // Yellow / Highlighter
    default:
      return "#ef4444";
  }
}

// Stroke tuple: [t, col, x1, y1, x2, y2]
type StrokeTuple = [number, number, number, number, number, number];

export function GvaStreamingPlayer({
  lesson,
  allLessons,
  prevLesson,
  nextLesson,
  initialStrokes,
}: GvaStreamingPlayerProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Modal canvas refs
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lesson.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [autoNext, setAutoNext] = useState(true);
  const [isFullscreenZoom, setIsFullscreenZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [strokesLoaded, setStrokesLoaded] = useState(
    Boolean(initialStrokes && initialStrokes.length > 0)
  );

  const strokesRef = useRef<StrokeTuple[]>(initialStrokes || []);
  const lastRenderedDeciRef = useRef<number>(-1);
  const animationFrameRef = useRef<number | null>(null);

  // Setup canvas resolution to match image container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Redraw all strokes up to target time
  const redrawCanvasUpTo = useCallback((sec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    // Reset transform & clear
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const targetDeci = Math.floor(sec * 10);
    const strokes = strokesRef.current;
    if (!strokes || strokes.length === 0) return;

    ctx.lineWidth = Math.max(2, w * 0.0032);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let currentColor = "";
    ctx.beginPath();

    for (let i = 0; i < strokes.length; i++) {
      const [t, col, x1, y1, x2, y2] = strokes[i];
      if (t > targetDeci) break;

      const colorStr = getStrokeColor(col);
      if (colorStr !== currentColor) {
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = colorStr;
        currentColor = colorStr;
      }

      ctx.moveTo(x1 * w, y1 * h);
      ctx.lineTo(x2 * w, y2 * h);
    }
    ctx.stroke();

    lastRenderedDeciRef.current = targetDeci;
  }, []);

  // 1. Fetch strokes data if not provided
  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0) {
      strokesRef.current = initialStrokes;
      setStrokesLoaded(true);
      lastRenderedDeciRef.current = -1;
      resizeCanvas();
      redrawCanvasUpTo(currentTime);
      return;
    }

    let active = true;
    strokesRef.current = [];
    lastRenderedDeciRef.current = -1;
    setStrokesLoaded(false);

    const strokeUrl = `/gva-strokes/${lesson.id}.json`;
    fetch(strokeUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StrokeTuple[]) => {
        if (active) {
          strokesRef.current = data;
          setStrokesLoaded(true);
          resizeCanvas();
          redrawCanvasUpTo(currentTime);
        }
      })
      .catch((err) => {
        console.error("Failed to load stroke data:", err);
      });

    return () => {
      active = false;
    };
  }, [lesson.id, initialStrokes, resizeCanvas, redrawCanvasUpTo, currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);


  // Append new incremental strokes during playback (for silky smooth 60fps)
  const drawIncrementalStrokes = useCallback((fromDeci: number, toDeci: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const strokes = strokesRef.current;
    if (!strokes || strokes.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = Math.max(2, w * 0.0032);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let currentColor = "";
    ctx.beginPath();

    for (let i = 0; i < strokes.length; i++) {
      const [t, col, x1, y1, x2, y2] = strokes[i];
      if (t <= fromDeci) continue;
      if (t > toDeci) break;

      const colorStr = getStrokeColor(col);
      if (colorStr !== currentColor) {
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = colorStr;
        currentColor = colorStr;
      }

      ctx.moveTo(x1 * w, y1 * h);
      ctx.lineTo(x2 * w, y2 * h);
    }
    ctx.stroke();
  }, []);

  // Animation frame loop synchronized with audio playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const loop = () => {
      const audio = audioRef.current;
      if (audio) {
        const cur = audio.currentTime;
        const currentDeci = Math.floor(cur * 10);
        const lastDeci = lastRenderedDeciRef.current;

        if (currentDeci < lastDeci) {
          // Seek backwards
          redrawCanvasUpTo(cur);
        } else if (currentDeci > lastDeci) {
          // Normal playback progress
          drawIncrementalStrokes(lastDeci, currentDeci);
          lastRenderedDeciRef.current = currentDeci;
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, redrawCanvasUpTo, drawIncrementalStrokes]);

  // Handle window resize and image load
  useEffect(() => {
    const handleResize = () => {
      resizeCanvas();
      redrawCanvasUpTo(currentTime);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeCanvas, redrawCanvasUpTo, currentTime]);

  const handleImageLoad = () => {
    resizeCanvas();
    redrawCanvasUpTo(currentTime);
  };

  // Handle audio events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (autoNext && nextLesson) {
      router.push(`/gva/${nextLesson.number}`);
    }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Playback failed:", err);
          setIsLoading(false);
        });
    }
  }, [isPlaying]);

  const seekRelative = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const target = Math.max(
        0,
        Math.min(audioRef.current.duration || duration, audioRef.current.currentTime + seconds)
      );
      audioRef.current.currentTime = target;
      setCurrentTime(target);
      redrawCanvasUpTo(target);
    },
    [duration, redrawCanvasUpTo]
  );

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    redrawCanvasUpTo(val);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekRelative(10);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekRelative]);

  // Lock body scroll when zoom or list drawer is open
  useEffect(() => {
    if (isFullscreenZoom || isListOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreenZoom, isListOpen]);

  return (
    <div className="min-h-screen bg-surface text-ink pb-24 lg:pb-12">
      {/* Audio element - Pure streaming from R2 with clean headers */}
      <audio
        ref={audioRef}
        src={lesson.audioUrl}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Top Header Navigation */}
      <nav className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/gva"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 font-mono text-[12px] font-medium text-ink hover:bg-sunken transition-colors"
            >
              <span>←</span>
              <span className="hidden xs:inline">전체 200강 목록</span>
              <span className="xs:hidden">목록</span>
            </Link>

            <span className="h-4 w-px bg-line" />

            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                  lesson.level === "middle"
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {lesson.levelLabel}
              </span>
              <h1 className="text-[14px] sm:text-[16px] font-bold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {lesson.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick lecture selector modal button */}
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 font-mono text-[12px] font-medium text-ink hover:bg-sunken transition-colors cursor-pointer"
            >
              <span>{lesson.number} / 200강</span>
              <span className="text-[10px] text-ink-soft">▼</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Interactive Slide + Canvas Pen Board (lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-raised shadow-md group">
              {/* Slide image header banner */}
              <div className="flex items-center justify-between border-b border-line bg-surface/80 px-4 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[12px] text-ink-soft">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    지문 {lesson.passageNumber}번 본문 강의
                    {strokesRef.current.length > 0 && (
                      <span className="ml-1 text-primary font-bold">
                        · 실시간 판서 연동 ({strokesRef.current.length}개 필기)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreenZoom(true);
                    setZoomLevel(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-sunken transition-colors cursor-pointer"
                  title="크게 보기 / 확대"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  <span>크게 보기</span>
                </button>
              </div>

              {/* Layered Slide & Real-time Canvas */}
              <div
                ref={containerRef}
                className="relative flex items-center justify-center bg-zinc-950/5 min-h-[360px] sm:min-h-[480px]"
              >
                <div className="relative inline-block w-full max-w-full">
                  <img
                    ref={imgRef}
                    src={lesson.slideUrl}
                    alt={lesson.title}
                    className="w-full h-auto object-contain select-none block"
                    onLoad={handleImageLoad}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </div>
              </div>

              {/* Live Status indicator */}
              <div className="p-2.5 flex items-center justify-between bg-raised/50 border-t border-line text-[11px] text-ink-soft">
                <span>
                  선생님의 육성 설명에 맞춰 화면에 빨간색/파란색 밑줄과 판서가 실시간으로 동기화됩니다.
                </span>
                <span className="font-mono text-primary font-semibold">
                  {isPlaying ? "● 판서 진행중" : "일시정지"}
                </span>
              </div>
            </div>

            {/* Previous / Next Lecture Navigation Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {prevLesson ? (
                <Link
                  href={`/gva/${prevLesson.number}`}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-raised transition-colors"
                >
                  <span>◀</span>
                  <span className="hidden sm:inline">이전:</span>
                  <span className="font-bold">{prevLesson.number}강</span>
                </Link>
              ) : (
                <span className="rounded-xl border border-line/40 bg-surface/40 px-4 py-2.5 text-[13px] text-ink-faint">
                  첫 번째 강의
                </span>
              )}

              <span className="font-mono text-[12px] font-semibold text-ink-soft">
                {lesson.number} / 200강
              </span>

              {nextLesson ? (
                <Link
                  href={`/gva/${nextLesson.number}`}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-raised transition-colors"
                >
                  <span className="hidden sm:inline">다음:</span>
                  <span className="font-bold">{nextLesson.number}강</span>
                  <span>▶</span>
                </Link>
              ) : (
                <span className="rounded-xl border border-line/40 bg-surface/40 px-4 py-2.5 text-[13px] text-ink-faint">
                  마지막 강의
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Audio Streaming Controller (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sticky top-20">
            <div className="rounded-2xl border border-line bg-raised p-5 shadow-md flex flex-col gap-5">
              {/* Lecture Title & Instructor Info */}
              <div className="flex flex-col gap-1 border-b border-line pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-primary tracking-widest uppercase">
                    K-IG 직강 스트리밍
                  </span>
                  <span className="font-mono text-[12px] text-ink-soft">
                    {lesson.durationFormatted}
                  </span>
                </div>
                <h2 className="text-[18px] font-bold tracking-tight text-ink">
                  {lesson.title}
                </h2>
                <p className="text-[13px] text-ink-soft">
                  강광진 선생님의 육성 직독직해 + 실시간 판서 강의
                </p>
              </div>

              {/* Progress Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-2 rounded-lg bg-line appearance-none cursor-pointer accent-primary"
                    aria-label="재생 위치 탐색"
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[12px] text-ink-soft">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Playback Controls */}
              <div className="flex items-center justify-center gap-4 py-1">
                {/* -10s */}
                <button
                  type="button"
                  onClick={() => seekRelative(-10)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface hover:bg-sunken text-ink transition-colors cursor-pointer"
                  title="10초 뒤로"
                  aria-label="10초 뒤로"
                >
                  <span className="font-mono text-[11px] font-bold">-10s</span>
                </button>

                {/* Big Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-surface hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
                  aria-label={isPlaying ? "일시정지" : "재생"}
                >
                  {isLoading ? (
                    <span className="inline-block h-6 w-6 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1.5" />
                      <rect x="14" y="4" width="4" height="16" rx="1.5" />
                    </svg>
                  ) : (
                    <svg className="h-7 w-7 fill-current translate-x-0.5" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                {/* +10s */}
                <button
                  type="button"
                  onClick={() => seekRelative(10)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface hover:bg-sunken text-ink transition-colors cursor-pointer"
                  title="10초 앞으로"
                  aria-label="10초 앞으로"
                >
                  <span className="font-mono text-[11px] font-bold">+10s</span>
                </button>
              </div>

              {/* Speed Rate Buttons */}
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <span className="font-mono text-[11px] text-ink-soft">재생 속도 (배속)</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={`rounded-lg py-1.5 font-mono text-[12px] font-semibold transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? "bg-ink text-surface"
                          : "border border-line bg-surface text-ink hover:bg-sunken"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto next toggle */}
              <div className="flex items-center justify-between border-t border-line pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoNext}
                    onChange={(e) => setAutoNext(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-primary focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[12.5px] font-medium text-ink">
                    강의 종료 시 다음 강 자동 재생
                  </span>
                </label>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-line bg-surface p-4 text-[12px] text-ink-soft space-y-1">
              <div className="font-semibold text-ink">키보드 단축키</div>
              <div>• 스페이스바(Space): 재생 / 일시정지</div>
              <div>• 좌우 방향키(← / →): 10초 뒤로 / 앞으로 이동</div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Zoom Lightbox Modal */}
      {isFullscreenZoom && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[14px]">{lesson.title}</span>
              <span className="text-[12px] text-white/60">교재 슬라이드 확대 모드</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] hover:bg-white/20 cursor-pointer"
              >
                축소 (-)
              </button>
              <span className="font-mono text-[12px] text-white/70">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] hover:bg-white/20 cursor-pointer"
              >
                확대 (+)
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenZoom(false)}
                className="rounded-lg bg-white/20 px-3 py-1 text-[13px] font-bold text-white hover:bg-white/30 cursor-pointer"
              >
                닫기 ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
              className="relative max-h-[90vh] max-w-full transition-transform duration-150"
            >
              <img
                src={lesson.slideUrl}
                alt={lesson.title}
                className="max-h-[90vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Lecture Selector Drawer */}
      {isListOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsListOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[340px] max-w-[88vw] flex-col border-l border-line bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-bold text-[14px]">전체 200강 바로가기</span>
              <button
                type="button"
                onClick={() => setIsListOpen(false)}
                className="rounded-md p-1 text-ink-soft hover:bg-raised cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              {allLessons.map((item) => {
                const isActive = item.number === lesson.number;
                return (
                  <Link
                    key={item.id}
                    href={`/gva/${item.number}`}
                    onClick={() => setIsListOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] transition-colors ${
                      isActive
                        ? "bg-ink text-surface font-bold"
                        : "text-ink hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] opacity-70">
                        {String(item.number).padStart(3, "0")}
                      </span>
                      <span>{item.title}</span>
                    </div>
                    <span className="font-mono text-[11px] opacity-60">
                      {item.durationFormatted}
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
