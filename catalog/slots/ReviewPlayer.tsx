'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCatalog } from '../Provider';
import { formatTime } from '@/lib/types';
import type {
  ReviewNote,
  ReviewNoteKind,
  ReviewRect,
  Video,
} from '@/lib/types';
import {
  createNoteId,
  exportNotesAsPrompt,
  loadNotes,
  saveNotes,
} from '../reviewNotes';

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

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): ReviewRect {
  const x = clamp01(Math.min(a.x, b.x));
  const y = clamp01(Math.min(a.y, b.y));
  const w = Math.max(0, Math.min(1 - x, Math.abs(b.x - a.x)));
  const h = Math.max(0, Math.min(1 - y, Math.abs(b.y - a.y)));
  return { x, y, w, h };
}

interface Composing {
  editId?: string;
  time: number;
  rect?: ReviewRect;
  kind: ReviewNoteKind;
  comment: string;
}

export function ReviewPlayer() {
  const { selectedVideo, reviewOpen, closeReview } = useCatalog();
  const video = selectedVideo;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [notes, setNotes] = useState<ReviewNote[]>([]);

  const [composing, setComposing] = useState<Composing | null>(null);
  const [drawing, setDrawing] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  // Load notes on video change
  useEffect(() => {
    if (!video) {
      setNotes([]);
      return;
    }
    setNotes(loadNotes(video.id));
  }, [video?.id]);

  // Persist notes
  useEffect(() => {
    if (!video) return;
    saveNotes(video.id, notes);
  }, [video?.id, notes]);

  // Reset transient state when player closes
  useEffect(() => {
    if (!reviewOpen) {
      setComposing(null);
      setDrawing(null);
      setPlaying(false);
      setLoadError(false);
      videoRef.current?.pause();
    }
  }, [reviewOpen]);

  // Wire video element events
  useEffect(() => {
    if (!reviewOpen) return;
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setLoadError(true);
    const onLoaded = () => {
      setLoadError(false);
      if (!Number.isNaN(el.duration) && Number.isFinite(el.duration)) {
        setVideoDuration(el.duration);
      }
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('error', onError);
    el.addEventListener('loadedmetadata', onLoaded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('error', onError);
      el.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [reviewOpen, video?.id]);

  const duration = videoDuration || video?.duration || 0;

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const seek = useCallback(
    (t: number) => {
      const el = videoRef.current;
      if (!el) return;
      const dur = el.duration || duration || 0;
      el.currentTime = Math.max(0, Math.min(dur, t));
    },
    [duration],
  );

  const step = useCallback(
    (dir: number) => {
      if (!video) return;
      const delta = 1 / (video.fps || 30);
      seek((videoRef.current?.currentTime ?? currentTime) + dir * delta);
    },
    [currentTime, seek, video],
  );

  const startCompose = useCallback(() => {
    if (!video) return;
    videoRef.current?.pause();
    setComposing({
      time: videoRef.current?.currentTime ?? currentTime,
      kind: 'feedback',
      comment: '',
    });
    setDrawing(null);
  }, [video, currentTime]);

  const cancelCompose = useCallback(() => {
    setComposing(null);
    setDrawing(null);
  }, []);

  const saveCompose = useCallback(() => {
    if (!composing) return;
    if (composing.kind === 'zoom' && !composing.rect) return;
    const comment = composing.comment.trim();
    if (!comment && !composing.rect) return;
    if (composing.editId) {
      const editId = composing.editId;
      setNotes(prev =>
        prev.map(n =>
          n.id === editId
            ? {
                ...n,
                time: composing.time,
                kind: composing.kind,
                rect: composing.rect,
                comment,
              }
            : n,
        ),
      );
    } else {
      const newNote: ReviewNote = {
        id: createNoteId(),
        time: composing.time,
        kind: composing.kind,
        rect: composing.rect,
        comment,
        createdAt: new Date().toISOString(),
      };
      setNotes(prev => [...prev, newNote]);
    }
    setComposing(null);
    setDrawing(null);
  }, [composing]);

  const editNote = useCallback(
    (n: ReviewNote) => {
      videoRef.current?.pause();
      seek(n.time);
      setComposing({
        editId: n.id,
        time: n.time,
        rect: n.rect,
        kind: n.kind,
        comment: n.comment,
      });
      setDrawing(null);
    },
    [seek],
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (composing?.editId === id) cancelCompose();
    },
    [composing?.editId, cancelCompose],
  );

  // --- Drawing ---
  const getCanvasPoint = (e: React.PointerEvent) => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (!composing) return;
    const p = getCanvasPoint(e);
    if (!p) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    setDrawing({ start: p, end: p });
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = getCanvasPoint(e);
    if (!p) return;
    setDrawing(d => (d ? { ...d, end: p } : d));
  };

  const onCanvasPointerUp = () => {
    if (!drawing || !composing) {
      setDrawing(null);
      return;
    }
    const rect = normalizeRect(drawing.start, drawing.end);
    if (rect.w < 0.01 || rect.h < 0.01) {
      setDrawing(null);
      return;
    }
    setComposing(c => (c ? { ...c, rect } : c));
    setDrawing(null);
  };

  // --- Keyboard ---
  useEffect(() => {
    if (!reviewOpen) return;
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const typing =
        tgt?.tagName === 'INPUT' ||
        tgt?.tagName === 'TEXTAREA' ||
        tgt?.isContentEditable;
      if (typing) {
        if (e.key === 'Escape') cancelCompose();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (composing) cancelCompose();
        else closeReview();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (!composing) startCompose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) seek(currentTime - 5);
        else step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) seek(currentTime + 5);
        else step(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    reviewOpen,
    composing,
    cancelCompose,
    closeReview,
    togglePlay,
    startCompose,
    step,
    seek,
    currentTime,
  ]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.time - b.time),
    [notes],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const visibleNoteRects = useMemo(
    () =>
      sortedNotes
        .map((n, i) => ({ n, index: i + 1 }))
        .filter(
          ({ n }) =>
            n.rect &&
            n.id !== composing?.editId &&
            Math.abs(n.time - currentTime) < 1.5,
        ),
    [sortedNotes, currentTime, composing?.editId],
  );

  const previewRect = drawing
    ? normalizeRect(drawing.start, drawing.end)
    : null;

  const handleCopy = async () => {
    if (!video) return;
    const text = exportNotesAsPrompt(video, notes);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!video) return;
    const text = exportNotesAsPrompt(video, notes);
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.id}-review.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!video || !reviewOpen) return null;
  if (typeof document === 'undefined') return null;

  const src = resolveSrc(video);

  return createPortal(
    <div className="fixed inset-0 z-[210] flex flex-col bg-neutral-950/98 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] shrink-0">
        <button
          onClick={closeReview}
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to {video.id}
        </button>
        <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/70">
          Review
        </div>
        {video.composition && (
          <div className="text-[10px] font-mono text-white/30">
            composition:{' '}
            <span className="text-cyan-300/70">{video.composition}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-white/30">
          <span>N note</span>
          <span>Space play</span>
          <span>← → step</span>
          <span>⇧← ⇧→ 5s</span>
          <span>Esc close</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 flex items-center justify-center min-w-0 bg-black/60 p-4 overflow-hidden">
          <div
            className="relative shadow-2xl"
            style={{
              aspectRatio: aspectRatio(video.resolution),
              maxWidth: '100%',
              maxHeight: '100%',
              height: '100%',
            }}
          >
            {!loadError ? (
              <video
                ref={videoRef}
                src={src}
                className="absolute inset-0 w-full h-full bg-black"
                playsInline
                preload="metadata"
                onClick={togglePlay}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/[0.08] rounded-sm gap-1">
                <div className="text-[12px] font-mono uppercase tracking-wider text-white/50">
                  Video not available
                </div>
                <div className="text-[10px] font-mono text-white/35">
                  Expected at{' '}
                  <span className="text-white/60">{src}</span>
                </div>
                <div className="text-[10px] font-mono text-white/25 mt-2">
                  Drop the file at public{src} and refresh.
                </div>
              </div>
            )}

            <div
              ref={canvasRef}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={onCanvasPointerUp}
              className={`absolute inset-0 ${
                composing ? 'cursor-crosshair' : 'pointer-events-none'
              }`}
            >
              {visibleNoteRects.map(({ n, index }) => (
                <NoteRect
                  key={n.id}
                  rect={n.rect!}
                  kind={n.kind}
                  label={String(index)}
                  dim
                />
              ))}

              {composing?.rect && !drawing && (
                <NoteRect
                  rect={composing.rect}
                  kind={composing.kind}
                  active
                />
              )}

              {previewRect && (
                <NoteRect
                  rect={previewRect}
                  kind={composing?.kind ?? 'feedback'}
                  active
                />
              )}
            </div>
          </div>

          {composing && !composing.rect && !drawing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 border border-white/10 rounded-sm px-3 py-2 text-[11px] text-white/70 shadow-lg">
              <span>Drag on video to select an area</span>
              {composing.kind === 'feedback' && (
                <span className="text-white/30">
                  · or leave as whole-frame
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[320px] shrink-0 border-l border-white/[0.04] bg-black/30 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/40">
              Notes ({notes.length})
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleCopy}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white disabled:opacity-30 disabled:pointer-events-none bg-white/[0.04] border border-white/[0.05] px-2 py-1 rounded-sm transition-colors"
                title="Copy as prompt"
              >
                {copyState === 'copied' ? (
                  <Check size={10} />
                ) : (
                  <Copy size={10} />
                )}
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white disabled:opacity-30 disabled:pointer-events-none bg-white/[0.04] border border-white/[0.05] px-2 py-1 rounded-sm transition-colors"
                title="Download as .md"
              >
                <Download size={10} />
                .md
              </button>
            </div>
          </div>

          {composing && (
            <ComposeForm
              composing={composing}
              onChange={patch =>
                setComposing(c => (c ? { ...c, ...patch } : c))
              }
              onSave={saveCompose}
              onCancel={cancelCompose}
              onClearRect={() =>
                setComposing(c => (c ? { ...c, rect: undefined } : c))
              }
            />
          )}

          {!composing && (
            <div className="px-4 py-3 shrink-0 border-b border-white/[0.04]">
              <button
                onClick={startCompose}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-300/80 hover:text-cyan-200 bg-cyan-400/[0.06] hover:bg-cyan-400/10 border border-cyan-400/20 px-3 py-2 rounded-sm transition-colors"
              >
                <Plus size={12} />
                Add note at {formatTime(currentTime)}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {sortedNotes.length === 0 && !composing && (
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/20 py-8 text-center">
                No notes yet
              </div>
            )}
            {sortedNotes.map((n, i) => (
              <NoteRow
                key={n.id}
                index={i + 1}
                note={n}
                active={Math.abs(n.time - currentTime) < 0.5}
                editing={composing?.editId === n.id}
                onSeek={() => seek(n.time)}
                onEdit={() => editNote(n)}
                onDelete={() => deleteNote(n.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.04] bg-black/40">
        <div
          className="relative h-2 mx-4 mt-3 bg-white/[0.05] rounded-full cursor-pointer"
          onClick={e => {
            if (duration <= 0) return;
            const r = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            seek(pct * duration);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-cyan-400/50 rounded-full"
            style={{ width: `${progress}%` }}
          />
          {video.scenes?.map((s, i) => {
            const start = s.start ?? s.time ?? 0;
            const pct = duration > 0 ? (start / duration) * 100 : 0;
            return (
              <div
                key={`scene-${i}`}
                className="absolute top-[-2px] bottom-[-2px] w-px bg-white/20"
                style={{ left: `${pct}%` }}
                title={s.description}
              />
            );
          })}
          {sortedNotes.map(n => {
            const pct = duration > 0 ? (n.time / duration) * 100 : 0;
            const color = n.kind === 'zoom' ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div
                key={`mark-${n.id}`}
                className={`absolute -top-1.5 -bottom-1.5 w-[3px] rounded-sm ${color}`}
                style={{ left: `calc(${pct}% - 1.5px)` }}
                title={`${formatTime(n.time)} — ${n.comment || n.kind}`}
              />
            );
          })}
          <div
            className="absolute -top-1 -bottom-1 w-[2px] bg-white"
            style={{ left: `calc(${progress}% - 1px)` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="text-[11px] font-mono text-white/70 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="text-[10px] font-mono text-white/25 ml-auto">
            {video.resolution} · {video.fps}fps
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

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
      ? active
        ? 'border-amber-400 bg-amber-400/10'
        : 'border-amber-400/50 bg-amber-400/[0.04]'
      : active
        ? 'border-emerald-400 bg-emerald-400/10'
        : 'border-emerald-400/50 bg-emerald-400/[0.04]';
  const badgeBg =
    kind === 'zoom' ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black';
  return (
    <div
      className={`absolute border-2 rounded-sm pointer-events-none ${color} ${
        dim ? 'opacity-60' : ''
      }`}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
    >
      {label && (
        <span
          className={`absolute -top-2.5 -left-2.5 w-5 h-5 flex items-center justify-center text-[10px] font-mono font-medium rounded-full shadow-md ${badgeBg}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function ComposeForm({
  composing,
  onChange,
  onSave,
  onCancel,
  onClearRect,
}: {
  composing: Composing;
  onChange: (patch: Partial<Composing>) => void;
  onSave: () => void;
  onCancel: () => void;
  onClearRect: () => void;
}) {
  const zoomNeedsRect = composing.kind === 'zoom' && !composing.rect;
  const canSave =
    !zoomNeedsRect &&
    (composing.comment.trim().length > 0 || !!composing.rect);
  return (
    <div className="px-4 py-3 border-b border-white/[0.04] bg-cyan-400/[0.02] shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/90">
          {composing.editId ? 'Edit note' : 'New note'}
        </span>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          {formatTime(composing.time)}
        </span>
        {composing.rect ? (
          <button
            onClick={onClearRect}
            className="ml-auto flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
            title="Clear area"
          >
            <X size={10} />
            Clear rect
          </button>
        ) : (
          <span className="ml-auto text-[9px] font-mono uppercase tracking-wider text-white/30">
            drag on video to add rect
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-2">
        <KindPill
          kind="feedback"
          active={composing.kind === 'feedback'}
          onClick={() => onChange({ kind: 'feedback' })}
        />
        <KindPill
          kind="zoom"
          active={composing.kind === 'zoom'}
          onClick={() => onChange({ kind: 'zoom' })}
        />
      </div>

      <textarea
        autoFocus
        value={composing.comment}
        onChange={e => onChange({ comment: e.target.value })}
        placeholder={
          composing.kind === 'zoom'
            ? 'Why zoom here? (optional context)'
            : 'What needs to change?'
        }
        onKeyDown={e => {
          if (
            e.key === 'Enter' &&
            (e.metaKey || e.ctrlKey) &&
            canSave
          ) {
            e.preventDefault();
            onSave();
          }
        }}
        rows={3}
        className="w-full text-[12px] bg-black/40 border border-white/[0.06] rounded-sm px-2 py-1.5 text-white/85 placeholder:text-white/25 resize-none focus:outline-none focus:border-cyan-400/40"
      />

      {zoomNeedsRect && (
        <div className="text-[10px] font-mono text-amber-300/70 mt-1.5">
          Zoom requires an area. Drag on the video to select one.
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onSave}
          disabled={!canSave}
          className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 hover:text-cyan-200 disabled:opacity-30 disabled:pointer-events-none bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-sm transition-colors"
        >
          <Check size={11} />
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto text-[9px] font-mono text-white/25">
          ⌘↵ save · esc cancel
        </span>
      </div>
    </div>
  );
}

function KindPill({
  kind,
  active,
  onClick,
}: {
  kind: ReviewNoteKind;
  active: boolean;
  onClick: () => void;
}) {
  const classes =
    kind === 'zoom'
      ? active
        ? 'bg-amber-400/15 text-amber-200 border-amber-400/30'
        : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/70'
      : active
        ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30'
        : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/70';
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${classes}`}
    >
      {kind}
    </button>
  );
}

function NoteRow({
  index,
  note,
  active,
  editing,
  onSeek,
  onEdit,
  onDelete,
}: {
  index: number;
  note: ReviewNote;
  active: boolean;
  editing: boolean;
  onSeek: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge =
    note.kind === 'zoom'
      ? 'bg-amber-400/20 text-amber-200'
      : 'bg-emerald-400/20 text-emerald-200';
  return (
    <div
      className={`group px-4 py-2.5 border-b border-white/[0.03] cursor-pointer transition-colors ${
        editing
          ? 'bg-cyan-400/[0.05]'
          : active
            ? 'bg-white/[0.04]'
            : 'hover:bg-white/[0.02]'
      }`}
      onClick={onSeek}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] font-mono text-white/30 tabular-nums w-4 text-right">
          {index}
        </span>
        <span className="text-[10px] font-mono text-white/60 tabular-nums">
          {formatTime(note.time)}
        </span>
        <span
          className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${badge}`}
        >
          {note.kind}
        </span>
        {note.rect && (
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
            rect
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/80"
          >
            Edit
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white/40 hover:text-red-300 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <div className="text-[12px] text-white/70 leading-snug pl-6 line-clamp-3">
        {note.comment || (
          <span className="text-white/30 italic">(no comment)</span>
        )}
      </div>
    </div>
  );
}
