'use client';

import {
  ArrowLeft,
  Film,
  MessageSquarePlus,
} from 'lucide-react';
import { useCatalog } from '../Provider';
import { useReviewContext } from '../ReviewContext';
import { formatDuration, formatTime } from '@/lib/types';
import type { ReviewNoteKind, ReviewRect, Video } from '@/lib/types';

function aspectRatio(res?: string): string {
  if (!res) return '16 / 9';
  const [w, h] = res.split('x').map(Number);
  if (!w || !h) return '16 / 9';
  return `${w} / ${h}`;
}

function resolveSrc(video: Video): string {
  if (video.videoUrl) return video.videoUrl;
  return `/wip/${video.filename}`;
}

export function VideoDetail({ video }: { video: Video }) {
  const { closeVideo, openFrame, projectVideo, projectId, videoId, closeProjectInput } = useCatalog();
  const review = useReviewContext();
  const hasFrames =
    !!video.frameCount &&
    video.frameCount > 0 &&
    !!video.frames &&
    video.frames.length > 0;

  const src = resolveSrc(video);
  const isComposing = !!review.composing;
  const isViewingInput = projectId != null && videoId !== projectId;

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={isViewingInput ? closeProjectInput : closeVideo}
            className="text-white/30 hover:text-white/60 transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
          </button>
          {isViewingInput && projectVideo && (
            <span className="text-[10px] font-mono text-white/25 shrink-0 truncate max-w-[80px]">
              {projectVideo.id} ›
            </span>
          )}
          <h1 className="text-[14px] font-medium text-white/90 truncate">{video.id}</h1>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 shrink-0">{video.app}</span>
          {video.stage && video.stage !== 'source' && (
            <span className={`text-[9px] font-mono uppercase tracking-wider shrink-0 ${
              video.stage === 'final' ? 'text-emerald-400/60' : 'text-amber-400/50'
            }`}>
              {video.stage}
            </span>
          )}
          {isViewingInput && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/20 shrink-0">input</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasFrames && (
            <button
              onClick={() => openFrame(0)}
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300/70 hover:text-cyan-200 bg-cyan-400/[0.06] hover:bg-cyan-400/10 border border-cyan-400/15 px-2 py-1 rounded-sm transition-colors"
            >
              <Film size={10} />
              Frames
            </button>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 min-h-0 flex flex-col">
        {video.videoUrl || video.stage === 'wip' ? (
          <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative">
            <div
              className="relative h-full"
              style={{
                aspectRatio: aspectRatio(video.resolution),
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              {!review.loadError ? (
                <video
                  ref={review.videoRef}
                  src={src}
                  className="absolute inset-0 w-full h-full bg-black"
                  playsInline
                  preload="metadata"
                  controls
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/[0.08] rounded-sm gap-1">
                  <div className="text-[12px] font-mono uppercase tracking-wider text-white/50">Video not available</div>
                  <div className="text-[10px] font-mono text-white/35">Expected at <span className="text-white/60">{src}</span></div>
                </div>
              )}

              {/* Annotation canvas — active when composing */}
              {isComposing && (
                <div
                  ref={review.canvasRef}
                  onPointerDown={review.onCanvasPointerDown}
                  onPointerMove={review.onCanvasPointerMove}
                  onPointerUp={review.onCanvasPointerUp}
                  onPointerCancel={review.onCanvasPointerUp}
                  className="absolute inset-0 cursor-crosshair"
                >
                  {review.visibleNoteRects.map(({ n, index }) => (
                    <NoteRect key={n.id} rect={n.rect!} kind={n.kind} label={String(index)} dim />
                  ))}
                  {review.composing?.rect && !review.drawing && (
                    <NoteRect rect={review.composing.rect} kind={review.composing.kind} active />
                  )}
                  {review.previewRect && (
                    <NoteRect rect={review.previewRect} kind={review.composing?.kind ?? 'feedback'} active />
                  )}
                </div>
              )}

              {/* Passive rect display when not composing */}
              {!isComposing && review.visibleNoteRects.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {review.visibleNoteRects.map(({ n, index }) => (
                    <NoteRect key={n.id} rect={n.rect!} kind={n.kind} label={String(index)} dim />
                  ))}
                </div>
              )}

              {/* Floating toolbar — top right of video */}
              {!isComposing && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={review.startCompose}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-black/70 backdrop-blur-sm border border-white/[0.1] text-white/70 hover:text-white hover:bg-black/80 hover:border-white/[0.2] transition-all shadow-lg"
                    title={`Add note at ${formatTime(review.currentTime)}`}
                  >
                    <MessageSquarePlus size={12} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">Note</span>
                  </button>
                </div>
              )}

              {/* Composing indicator — top right */}
              {isComposing && (
                <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-cyan-900/70 backdrop-blur-sm border border-cyan-400/20 shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/90">
                    {review.composing?.rect ? 'Area selected' : 'Draw area or save'}
                  </span>
                </div>
              )}

              {/* Draw hint */}
              {isComposing && !review.composing?.rect && !review.drawing && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 border border-white/10 rounded-sm px-3 py-2 text-[11px] text-white/70 shadow-lg pointer-events-none">
                  <span>Drag to mark an area</span>
                  {review.composing?.kind === 'feedback' && (
                    <span className="text-white/30">· or skip for whole-frame</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-black/50 flex items-center justify-center">
            <span className="text-white/15 text-[12px] font-mono uppercase tracking-wider">No video file</span>
          </div>
        )}

        {/* Note markers timeline */}
        {review.sortedNotes.length > 0 && review.duration > 0 && (
          <div className="shrink-0 bg-black/60 px-4 py-1.5 border-t border-white/[0.04]">
            <div
              className="relative h-3 bg-white/[0.03] rounded-full cursor-pointer"
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - r.left) / r.width;
                review.seek(pct * review.duration);
              }}
            >
              {/* Playhead position */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/[0.04] rounded-full"
                style={{ width: `${review.progress}%` }}
              />
              {/* Note markers */}
              {review.sortedNotes.map(n => {
                const pct = (n.time / review.duration) * 100;
                const color = n.kind === 'zoom' ? 'bg-amber-400' : 'bg-emerald-400';
                const isActive = Math.abs(n.time - review.currentTime) < 0.5;
                return (
                  <div
                    key={n.id}
                    className={`absolute top-0.5 bottom-0.5 w-[5px] rounded-full ${color} transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}
                    style={{ left: `calc(${pct}% - 2.5px)` }}
                    title={`${formatTime(n.time)} — ${n.comment || n.kind}`}
                  />
                );
              })}
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white/70 rounded-full"
                style={{ left: `calc(${review.progress}% - 1px)` }}
              />
            </div>
          </div>
        )}

        {/* Metadata below player */}
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 overflow-y-auto max-h-[40%]">
          {video.description && (
            <p className="text-[11px] text-white/40 leading-relaxed mb-3">{video.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-white/40 mb-3">
            <span>{formatDuration(video.duration)}</span>
            <span>{video.resolution}</span>
            <span>{video.fps} fps</span>
            <span>{video.sizeMB.toFixed(1)} MB</span>
            <span>{video.codec}</span>
            {video.reelCandidate && <span className="text-amber-400/70">Reel</span>}
          </div>
          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {video.tags.map(t => (
                <span key={t} className="text-[9px] font-mono text-white/40 px-1.5 py-0.5 rounded-sm bg-white/[0.03]">{t}</span>
              ))}
            </div>
          )}
          {video.scenes && video.scenes.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1.5">Scenes ({video.scenes.length})</div>
              <div className="flex flex-col gap-1">
                {video.scenes.map((s, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-[11px] py-1 px-2 rounded-sm bg-white/[0.015]">
                    <span className="text-[9px] font-mono text-white/25 tabular-nums w-16 shrink-0">
                      {formatTime(s.start ?? s.time ?? 0)}
                      {s.end != null && ` → ${formatTime(s.end)}`}
                    </span>
                    {s.activity && (
                      <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-sm shrink-0 ${
                        s.activity === 'active' ? 'text-emerald-300/80 bg-emerald-400/10' : 'text-white/25 bg-white/[0.02]'
                      }`}>{s.activity}</span>
                    )}
                    <span className="text-white/50 text-[10px]">{s.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {video.transcript && video.transcript.segments.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1.5">Transcript</div>
              <div className="flex flex-col gap-0.5">
                {video.transcript.segments.map(seg => (
                  <div key={seg.id} className="flex items-baseline gap-2 text-[11px] py-0.5">
                    <span className="text-[9px] font-mono text-white/20 tabular-nums w-12 shrink-0">{formatTime(seg.start)}</span>
                    <span className="text-white/50">{seg.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteRect
// ---------------------------------------------------------------------------

function NoteRect({
  rect,
  kind,
  label,
  active = false,
  dim = false,
}: {
  rect: ReviewRect;
  kind: ReviewNoteKind;
  label?: string;
  active?: boolean;
  dim?: boolean;
}) {
  const color =
    kind === 'zoom'
      ? active ? 'border-amber-400 bg-amber-400/10' : 'border-amber-400/50 bg-amber-400/[0.04]'
      : active ? 'border-emerald-400 bg-emerald-400/10' : 'border-emerald-400/50 bg-emerald-400/[0.04]';
  const badgeBg = kind === 'zoom' ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black';
  return (
    <div
      className={`absolute border-2 rounded-sm pointer-events-none ${color} ${dim ? 'opacity-60' : ''}`}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
    >
      {label && (
        <span className={`absolute -top-2.5 -left-2.5 w-5 h-5 flex items-center justify-center text-[10px] font-mono font-medium rounded-full shadow-md ${badgeBg}`}>
          {label}
        </span>
      )}
    </div>
  );
}
