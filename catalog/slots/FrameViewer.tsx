'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCatalog } from '../Provider';
import { formatDuration, formatTime } from '@/lib/types';
import type { VisionTag } from '@/lib/types';

export function FrameViewer() {
  const { selectedVideo, frameIndex, openFrame, closeFrame } = useCatalog();
  const filmstripRef = useRef<HTMLDivElement>(null);

  const video = selectedVideo;
  const frames = video?.frames ?? [];
  const total = frames.length;

  const safeIndex = useMemo(() => {
    if (frameIndex == null) return 0;
    if (total === 0) return 0;
    return Math.max(0, Math.min(total - 1, frameIndex));
  }, [frameIndex, total]);

  const tagMap = useMemo(() => {
    const map: Record<string, VisionTag> = {};
    video?.visionTags?.forEach(t => {
      map[t.frameFile] = t;
    });
    return map;
  }, [video?.visionTags]);

  const scenes = video?.edl?.scenes ?? video?.scenes ?? [];

  const currentFrame = frames[safeIndex];
  const tag = currentFrame ? tagMap[currentFrame] : undefined;
  const frameTime = tag?.time ?? null;
  const src =
    video?.storyboardDir && currentFrame
      ? `/demos/${video.storyboardDir}/${currentFrame}`
      : '';

  const currentScene = useMemo(() => {
    if (frameTime == null) return null;
    return (
      scenes.find(s => {
        const start = s.start ?? s.time ?? 0;
        const end = s.end ?? Infinity;
        return frameTime >= start && frameTime < end;
      }) ?? null
    );
  }, [scenes, frameTime]);

  const currentTranscript = useMemo(() => {
    if (frameTime == null || !video?.transcript?.segments) return [];
    return video.transcript.segments.filter(
      seg => frameTime >= seg.start && frameTime <= seg.end + 0.5,
    );
  }, [video?.transcript, frameTime]);

  const currentHighlights = useMemo(() => {
    if (frameTime == null || !video?.edl?.highlights) return [];
    return video.edl.highlights.filter(h => Math.abs(h.time - frameTime) < 3);
  }, [video?.edl?.highlights, frameTime]);

  const progress =
    video?.duration && frameTime != null
      ? (frameTime / video.duration) * 100
      : 0;

  const go = useCallback(
    (dir: number) => {
      if (total === 0) return;
      const next = Math.max(0, Math.min(total - 1, safeIndex + dir));
      if (next !== safeIndex) openFrame(next);
    },
    [total, safeIndex, openFrame],
  );

  const jumpTo = useCallback(
    (idx: number) => {
      if (total === 0) return;
      const next = Math.max(0, Math.min(total - 1, idx));
      if (next !== safeIndex) openFrame(next);
    },
    [total, safeIndex, openFrame],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFrame();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jumpTo(total - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeFrame, go, jumpTo, total]);

  useEffect(() => {
    const thumb = filmstripRef.current?.children[safeIndex] as
      | HTMLElement
      | undefined;
    thumb?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [safeIndex]);

  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [currentFrame]);

  if (!video || frameIndex == null || total === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-neutral-950/98 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] shrink-0">
        <button
          onClick={closeFrame}
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to {video.id}
        </button>
        <div className="text-[11px] font-mono text-white/40 tabular-nums">
          {safeIndex + 1} / {total}
        </div>
        <div className="flex items-center gap-3 ml-auto text-[10px] font-mono uppercase tracking-wider text-white/40">
          {frameTime != null && (
            <span className="tabular-nums text-cyan-300/70">
              {formatTime(frameTime)}
            </span>
          )}
          <span>{formatDuration(video.duration)}</span>
          <span>{video.resolution}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Main image pane */}
        <div className="relative flex-1 flex items-center justify-center min-w-0 bg-black/30">
          <button
            onClick={() => go(-1)}
            disabled={safeIndex === 0}
            className="absolute left-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] disabled:opacity-20 disabled:pointer-events-none transition-colors"
            aria-label="Previous frame"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="relative flex items-center justify-center w-full h-full p-6">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentFrame}
                src={src}
                alt={currentFrame}
                onError={() => setImgError(true)}
                className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 w-[min(720px,80%)] aspect-video rounded-sm border border-dashed border-white/[0.08] bg-white/[0.015]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/30">
                  Frame preview unavailable
                </div>
                <div className="text-[10px] font-mono text-white/20">
                  {currentFrame}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => go(1)}
            disabled={safeIndex === total - 1}
            className="absolute right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] disabled:opacity-20 disabled:pointer-events-none transition-colors"
            aria-label="Next frame"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right panel */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-l border-white/[0.04] px-4 py-4 flex flex-col gap-5">
          {tag?.description && (
            <PanelSection label="Description">
              <div className="text-[12px] text-white/70 leading-relaxed">
                {tag.description}
              </div>
            </PanelSection>
          )}

          {tag?.contentType && (
            <PanelSection label="Content Type">
              <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-cyan-300/80 bg-cyan-400/10 border border-cyan-400/15 px-2 py-0.5 rounded-sm">
                {tag.contentType}
              </span>
            </PanelSection>
          )}

          {tag?.tags && tag.tags.length > 0 && (
            <PanelSection label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tag.tags.map(t => (
                  <span
                    key={t}
                    className="text-[10px] font-mono text-white/55 px-1.5 py-0.5 rounded-sm bg-white/[0.04] border border-white/[0.04]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </PanelSection>
          )}

          {currentScene && (
            <PanelSection
              label={`Scene${currentScene.index != null ? ` ${currentScene.index}` : ''}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono text-white/35 tabular-nums">
                  {formatTime(currentScene.start ?? currentScene.time ?? 0)}
                  {currentScene.end != null &&
                    ` → ${formatTime(currentScene.end)}`}
                </span>
                {currentScene.activity && (
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                      currentScene.activity === 'active'
                        ? 'text-emerald-300/80 bg-emerald-400/10'
                        : currentScene.activity === 'transition'
                          ? 'text-amber-300/80 bg-amber-400/10'
                          : 'text-white/40 bg-white/[0.03]'
                    }`}
                  >
                    {currentScene.activity}
                  </span>
                )}
              </div>
              {currentScene.description && (
                <div className="text-[12px] text-white/60 leading-relaxed">
                  {currentScene.description}
                </div>
              )}
            </PanelSection>
          )}

          {currentHighlights.length > 0 && (
            <PanelSection label="Highlights">
              <div className="flex flex-col gap-1.5">
                {currentHighlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-2 text-[11px]"
                  >
                    <span className="text-[10px] font-mono text-amber-300/70 tabular-nums shrink-0">
                      {formatTime(h.time)}
                    </span>
                    <span className="text-white/60">{h.reason}</span>
                  </div>
                ))}
              </div>
            </PanelSection>
          )}

          {currentTranscript.length > 0 && (
            <PanelSection label="Transcript">
              <div className="flex flex-col gap-1.5">
                {currentTranscript.map(seg => (
                  <div
                    key={seg.id}
                    className="flex items-baseline gap-2 text-[11px]"
                  >
                    <span className="text-[10px] font-mono text-white/30 tabular-nums shrink-0">
                      {formatTime(seg.start)}
                    </span>
                    <span className="text-white/65 leading-snug">
                      {seg.text}
                    </span>
                  </div>
                ))}
              </div>
            </PanelSection>
          )}

          {!tag?.description &&
            !currentScene &&
            currentTranscript.length === 0 &&
            currentHighlights.length === 0 && (
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/20 py-6 text-center">
                No annotations for this frame
              </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.04] bg-black/40">
        {/* Timeline */}
        <div className="relative h-1.5 bg-white/[0.04] mx-4 mt-3 rounded-full overflow-visible">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-400/60 rounded-full transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
          {scenes.map((s, i) => {
            const start = s.start ?? s.time ?? 0;
            const pct = video.duration ? (start / video.duration) * 100 : 0;
            return (
              <div
                key={i}
                className="absolute top-[-2px] bottom-[-2px] w-px bg-white/30"
                style={{ left: `${pct}%` }}
                title={s.description}
              />
            );
          })}
        </div>

        {/* Filmstrip */}
        <div
          ref={filmstripRef}
          className="flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-thin"
          style={{ scrollbarWidth: 'thin' }}
        >
          {frames.map((f, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={f}
                onClick={() => jumpTo(i)}
                className={`shrink-0 w-20 h-12 rounded-sm overflow-hidden border transition-all ${
                  active
                    ? 'border-cyan-400/60 ring-1 ring-cyan-400/40'
                    : 'border-white/[0.06] opacity-50 hover:opacity-90'
                }`}
                aria-label={`Frame ${i + 1}`}
              >
                <ThumbImage
                  src={
                    video.storyboardDir
                      ? `/demos/${video.storyboardDir}/${f}`
                      : ''
                  }
                  label={String(i + 1)}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/30 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function ThumbImage({ src, label }: { src: string; label: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white/[0.02] text-[9px] font-mono text-white/25">
        {label}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  );
}
