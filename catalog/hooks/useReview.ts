'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatTime } from '@/lib/types';
import type { ReviewNote, ReviewNoteKind, ReviewRect, Video } from '@/lib/types';
import { createNoteId, exportNotesAsPrompt, loadNotes, saveNotes } from '../reviewNotes';

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): ReviewRect {
  const x = clamp01(Math.min(a.x, b.x));
  const y = clamp01(Math.min(a.y, b.y));
  const w = Math.max(0, Math.min(1 - x, Math.abs(b.x - a.x)));
  const h = Math.max(0, Math.min(1 - y, Math.abs(b.y - a.y)));
  return { x, y, w, h };
}

export interface Composing {
  editId?: string;
  time: number;
  rect?: ReviewRect;
  kind: ReviewNoteKind;
  comment: string;
}

export function useReview(video: Video | null, active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [composing, setComposing] = useState<Composing | null>(null);
  const [drawing, setDrawing] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (!video) { setNotes([]); return; }
    setNotes(loadNotes(video.id));
  }, [video?.id]);

  useEffect(() => {
    if (!video) return;
    saveNotes(video.id, notes);
  }, [video?.id, notes]);

  useEffect(() => {
    if (!active) {
      setComposing(null);
      setDrawing(null);
      setPlaying(false);
      setLoadError(false);
      videoRef.current?.pause();
    }
  }, [active]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setLoadError(true);
    const onLoaded = () => {
      setLoadError(false);
      if (!Number.isNaN(el.duration) && Number.isFinite(el.duration)) setVideoDuration(el.duration);
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
  }, [video?.id]);

  const duration = videoDuration || video?.duration || 0;

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || duration || 0, t));
  }, [duration]);

  const step = useCallback((dir: number) => {
    if (!video) return;
    const delta = 1 / (video.fps || 30);
    seek((videoRef.current?.currentTime ?? currentTime) + dir * delta);
  }, [currentTime, seek, video]);

  const startCompose = useCallback(() => {
    if (!video) return;
    videoRef.current?.pause();
    setComposing({ time: videoRef.current?.currentTime ?? currentTime, kind: 'feedback', comment: '' });
    setDrawing(null);
  }, [video, currentTime]);

  const cancelCompose = useCallback(() => { setComposing(null); setDrawing(null); }, []);

  const saveCompose = useCallback(() => {
    if (!composing) return;
    if (composing.kind === 'zoom' && !composing.rect) return;
    const comment = composing.comment.trim();
    if (!comment && !composing.rect) return;
    if (composing.editId) {
      const editId = composing.editId;
      setNotes(prev => prev.map(n => n.id === editId ? { ...n, time: composing.time, kind: composing.kind, rect: composing.rect, comment } : n));
    } else {
      setNotes(prev => [...prev, { id: createNoteId(), time: composing.time, kind: composing.kind, rect: composing.rect, comment, createdAt: new Date().toISOString() }]);
    }
    setComposing(null);
    setDrawing(null);
  }, [composing]);

  const editNote = useCallback((n: ReviewNote) => {
    videoRef.current?.pause();
    seek(n.time);
    setComposing({ editId: n.id, time: n.time, rect: n.rect, kind: n.kind, comment: n.comment });
    setDrawing(null);
  }, [seek]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (composing?.editId === id) cancelCompose();
  }, [composing?.editId, cancelCompose]);

  const getCanvasPoint = (e: React.PointerEvent) => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (!composing) return;
    const p = getCanvasPoint(e);
    if (!p) return;
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    setDrawing({ start: p, end: p });
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = getCanvasPoint(e);
    if (!p) return;
    setDrawing(d => (d ? { ...d, end: p } : d));
  };

  const onCanvasPointerUp = () => {
    if (!drawing || !composing) { setDrawing(null); return; }
    const rect = normalizeRect(drawing.start, drawing.end);
    if (rect.w < 0.01 || rect.h < 0.01) { setDrawing(null); return; }
    setComposing(c => (c ? { ...c, rect } : c));
    setDrawing(null);
  };

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => a.time - b.time), [notes]);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const visibleNoteRects = useMemo(
    () => sortedNotes
      .map((n, i) => ({ n, index: i + 1 }))
      .filter(({ n }) => n.rect && n.id !== composing?.editId && Math.abs(n.time - currentTime) < 1.5),
    [sortedNotes, currentTime, composing?.editId],
  );

  const previewRect = drawing ? normalizeRect(drawing.start, drawing.end) : null;

  const handleCopy = async () => {
    if (!video) return;
    const text = exportNotesAsPrompt(video, notes);
    try { await navigator.clipboard.writeText(text); setCopyState('copied'); setTimeout(() => setCopyState('idle'), 1500); } catch {}
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

  return {
    videoRef, canvasRef,
    currentTime, duration, playing, loadError, progress,
    notes, sortedNotes, composing, drawing, copyState,
    visibleNoteRects, previewRect,
    togglePlay, seek, step,
    startCompose, cancelCompose, saveCompose,
    setComposing, editNote, deleteNote,
    onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp,
    handleCopy, handleDownload,
  };
}
