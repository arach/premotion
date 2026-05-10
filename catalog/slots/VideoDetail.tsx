'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Braces,
  Clock,
  Film,
  Images,
  Info,
  Loader2,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { useCatalog } from '../Provider';
import { useReviewContext } from '../ReviewContext';
import { usePlayer } from '../PlayerContext';
import { exportNotesAsPrompt } from '../reviewNotes';
import { resolveVideoSrc } from '@/lib/media';
import { formatDuration, formatTime } from '@/lib/types';
import type { CompositionEngine, FrameOverlay, ReviewNoteKind, ReviewRect, Video, VisionTag } from '@/lib/types';

function aspectRatio(res?: string): string {
  if (!res) return '16 / 9';
  const [w, h] = res.split('x').map(Number);
  if (!w || !h) return '16 / 9';
  return `${w} / ${h}`;
}

export function VideoDetail({ video }: { video: Video }) {
  const { closeVideo, openFrame, projectVideo, projectId, videoId, closeProjectInput, setView, reviewOpen } = useCatalog();
  const review = useReviewContext();
  const player = usePlayer();
  const stageRef = useRef<HTMLDivElement>(null);
  const [revising, setRevising] = useState(false);

  // Load this video into the shared player (paused). Skip if already loaded.
  useEffect(() => {
    const m = player.media;
    const alreadyLoaded = m?.kind === 'video' && m.video.id === video.id;
    if (!alreadyLoaded) {
      const src = resolveVideoSrc(video);
      if (src) player.loadMedia({ kind: 'video', video, src });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  // Adopt the shared <video> element into the detail page's stage.
  // Yields to ReviewPlayer (priority 100) when its modal is open.
  useEffect(() => {
    if (reviewOpen) return;
    return player.attachStage(stageRef.current, { priority: 50, controls: true });
  }, [player.attachStage, reviewOpen]);
  const [revisionEngine, setRevisionEngine] = useState<CompositionEngine>('remotion');
  const [generalDraft, setGeneralDraft] = useState('');
  const [generalOpen, setGeneralOpen] = useState(false);
  const [jsonModal, setJsonModal] = useState<{ title: string; value: unknown } | null>(null);
  const generalNotes = review.notes.filter(n => n.time == null);
  const hasFrames =
    !!video.frameCount &&
    video.frameCount > 0 &&
    !!video.frames &&
    video.frames.length > 0;
  const hasAnalysisPane =
    video.stage === 'source' ||
    hasFrames ||
    (!!video.analysisStatus && video.analysisStatus !== 'none');

  const src = resolveVideoSrc(video);
  const isComposing = !!review.composing;
  const isViewingInput = projectId != null && videoId !== projectId;
  const isFinal = video.stage === 'final';
  const compositionId = isFinal ? inferCompositionId(video) : null;
  const canRevise = isFinal && compositionId && review.notes.length > 0;

  const submitRevision = async () => {
    if (!compositionId || review.notes.length === 0) return;
    setRevising(true);
    try {
      let originalSource = '';
      const sourcePath = `.compositions/${compositionId}/Composition.tsx`;
      try {
        const res = await fetch(`/api/source?path=${encodeURIComponent(sourcePath)}`);
        if (res.ok) {
          const data = await res.json();
          originalSource = data.content ?? '';
        }
      } catch {}

      const reviewText = exportNotesAsPrompt(video, review.notes);
      const revisionId = `${compositionId}-rev-${Date.now().toString(36)}`;

      const res = await fetch(`/api/compositions/${encodeURIComponent(revisionId)}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'revise-brief',
          engine: revisionEngine,
          prompt: `Synthesize a revision brief for "${compositionId}" from the reviewer's notes.`,
          inputs: {
            sourceCompositionId: compositionId,
            originalSource,
            reviewNotes: reviewText,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Revision submit failed:', err);
        return;
      }

      setView('queue');
    } finally {
      setRevising(false);
    }
  };

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
          {isFinal && (
            <div className="flex items-center border border-white/[0.08] rounded-sm overflow-hidden">
              {(['remotion', 'hyperframes'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => setRevisionEngine(e)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                    revisionEngine === e
                      ? 'bg-cyan-400/[0.1] text-cyan-300/80'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/[0.04]'
                  }`}
                >
                  {e === 'remotion' ? 'Remotion' : 'Hyperframes'}
                </button>
              ))}
            </div>
          )}
          {canRevise && (
            <button
              onClick={submitRevision}
              disabled={revising}
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber-300/70 hover:text-amber-200 bg-amber-400/[0.06] hover:bg-amber-400/10 border border-amber-400/15 px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
            >
              {revising ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
              Revise ({review.notes.length})
            </button>
          )}
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

      {isFinal && (
        <div className="shrink-0 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setGeneralOpen(o => !o)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
            >
              <Plus size={10} />
              {generalOpen ? 'Cancel' : 'General comment'}
              {generalNotes.length > 0 && (
                <span className="text-white/25">· {generalNotes.length}</span>
              )}
            </button>
            {generalNotes.slice(0, 3).map(n => (
              <span
                key={n.id}
                className="text-[10px] font-mono text-white/45 bg-white/[0.04] px-2 py-0.5 rounded-sm truncate max-w-[280px]"
                title={n.comment}
              >
                {n.comment}
              </span>
            ))}
            {generalNotes.length > 3 && (
              <span className="text-[10px] font-mono text-white/25">+{generalNotes.length - 3} more</span>
            )}
          </div>
          {generalOpen && (
            <div className="mt-2 flex items-start gap-2">
              <textarea
                value={generalDraft}
                onChange={e => setGeneralDraft(e.target.value)}
                placeholder="High-level feedback"
                rows={2}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-sm px-2.5 py-1.5 text-[12px] text-white/80 font-mono placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors resize-y"
                autoFocus
              />
              <button
                onClick={() => {
                  review.addGeneralNote(generalDraft);
                  setGeneralDraft('');
                  setGeneralOpen(false);
                }}
                disabled={!generalDraft.trim()}
                className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/80 hover:text-cyan-200 bg-cyan-400/[0.08] hover:bg-cyan-400/[0.14] border border-cyan-400/25 px-2.5 py-1.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}

      {/* Player */}
      <div
        className={
          hasAnalysisPane
            ? 'flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_380px]'
            : 'flex-1 min-h-0 flex flex-col'
        }
      >
        <div className="flex-1 min-h-0 flex flex-col">
        {src ? (
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
                <div ref={stageRef} className="absolute inset-0 bg-black" />
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

        {!hasAnalysisPane && (
          <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 overflow-y-auto max-h-[40%]">
            <VideoMetadata video={video} />
          </div>
        )}
        </div>

        {hasAnalysisPane && (
          <AnalysisPane
            video={video}
            onOpenFrame={openFrame}
            onSeek={review.seek}
            onShowJson={setJsonModal}
          />
        )}
      </div>

      {jsonModal && (
        <JsonModal
          title={jsonModal.title}
          value={jsonModal.value}
          onClose={() => setJsonModal(null)}
        />
      )}
    </div>
  );
}

function inferCompositionId(video: Video): string | null {
  if (video.composition) return video.composition;
  if (!video.videoUrl) return null;
  const filename = video.videoUrl.split('/').pop();
  if (!filename) return null;
  return filename.replace(/\.mp4$/i, '');
}

function VideoMetadata({ video }: { video: Video }) {
  return (
    <>
      {video.description && (
        <p className="text-[11px] text-white/45 leading-relaxed mb-3">{video.description}</p>
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
      {video.transcript && video.transcript.segments.length > 0 && (
        <section>
          <SectionTitle label="Transcript" count={video.transcript.segments.length} />
          <div className="flex flex-col gap-0.5">
            {video.transcript.segments.map(seg => (
              <div key={seg.id} className="flex items-baseline gap-2 text-[11px] py-0.5">
                <span className="text-[9px] font-mono text-white/20 tabular-nums w-12 shrink-0">{formatTime(seg.start)}</span>
                <span className="text-white/50">{seg.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function AnalysisPane({
  video,
  onOpenFrame,
  onSeek,
  onShowJson,
}: {
  video: Video;
  onOpenFrame: (idx: number) => void;
  onSeek: (time: number) => void;
  onShowJson: (modal: { title: string; value: unknown }) => void;
}) {
  const scenes = video.edl?.scenes ?? video.scenes ?? [];
  const frames = video.frames ?? [];
  const stats = video.edl?.stats;
  const hasFrames = frames.length > 0 && !!video.storyboardDir;
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const selectedIndex = frames.length
    ? Math.max(0, Math.min(frames.length - 1, selectedFrameIndex))
    : 0;
  const selectedFrame = frames[selectedIndex];
  const selectedOverlays = selectedFrame ? video.frameOverlays?.[selectedFrame] ?? [] : [];
  const selectedTag = selectedFrame
    ? video.visionTags?.find(t => t.frameFile === selectedFrame)
    : undefined;
  const selectedTime = frameTimeForIndex(video, selectedIndex);
  const selectedScene = (video.edl?.scenes ?? video.scenes ?? [])[selectedIndex];
  const selectedSrc = video.storyboardDir && selectedFrame
    ? `/demos/${video.storyboardDir}/${selectedFrame}`
    : '';
  const status = video.analysisStatus || 'none';
  const statusClass =
    status === 'complete'
      ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20'
      : status === 'frames-only'
        ? 'text-amber-300 bg-amber-400/10 border-amber-400/20'
        : 'text-white/35 bg-white/[0.03] border-white/[0.08]';

  return (
    <aside className="min-h-0 border-l border-white/[0.06] bg-[#08090a] flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/25">Source Detail</div>
            <div className="text-[13px] font-medium text-white/85 truncate max-w-[260px]">{video.filename}</div>
          </div>
          <span className={`shrink-0 rounded-sm border px-2 py-1 text-[9px] font-mono uppercase tracking-wider ${statusClass}`}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={<Clock size={12} />} label="Duration" value={formatDuration(video.duration)} />
          <MiniStat icon={<Images size={12} />} label="Frames" value={String(video.frameCount ?? frames.length)} />
          <MiniStat icon={<Film size={12} />} label="Scenes" value={String(scenes.length)} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        <section>
          <SectionTitle label="Overview" icon={<Info size={11} />} />
          <VideoMetadata video={video} />
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/35">
            <DataPill label="Resolution" value={video.resolution} />
            <DataPill label="FPS" value={`${video.fps}`} />
            <DataPill label="Codec" value={video.codec} />
            <DataPill label="Size" value={`${video.sizeMB.toFixed(1)} MB`} />
          </div>
        </section>

        {stats && (
          <section>
            <SectionTitle label="Analysis Stats" />
            <div className="grid grid-cols-2 gap-2">
              <DataPill label="Active" value={formatDuration(stats.activeTime)} />
              <DataPill label="Idle" value={formatDuration(stats.idleTime)} />
              <DataPill label="Transition" value={formatDuration(stats.transitionTime)} />
              <DataPill label="Tokens" value={stats.estimatedTokens.toLocaleString()} />
            </div>
          </section>
        )}

        {hasFrames && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <SectionTitle label="Storyboard" count={frames.length} icon={<Images size={11} />} />
              <button
                onClick={() => onOpenFrame(selectedIndex)}
                className="text-[9px] font-mono uppercase tracking-wider text-cyan-300/70 hover:text-cyan-200"
              >
                Open Viewer
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {frames.map((frame, index) => {
                const active = index === selectedIndex;
                return (
                <button
                  key={frame}
                  onClick={() => {
                    setSelectedFrameIndex(index);
                    const time = frameTimeForIndex(video, index);
                    if (time != null) onSeek(time);
                  }}
                  className={`group relative aspect-video overflow-hidden rounded-sm border bg-white/[0.02] hover:border-cyan-300/40 ${
                    active ? 'border-cyan-300/60 ring-1 ring-cyan-300/30' : 'border-white/[0.06]'
                  }`}
                  title={`Seek to ${formatTime(frameTimeForIndex(video, index))}`}
                >
                  <img
                    src={`/demos/${video.storyboardDir}/${frame}`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1 left-1 rounded-sm bg-black/75 px-1 py-0.5 text-[8px] font-mono text-white/65">
                    {formatTime(frameTimeForIndex(video, index))}
                  </span>
                </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedFrame && (
          <FrameAnalysisCard
            frame={selectedFrame}
            src={selectedSrc}
            time={selectedTime}
            scene={selectedScene}
            tag={selectedTag}
            overlays={selectedOverlays}
            onOpenRaw={() => onShowJson({
              title: `${selectedTag?.provider || 'Vision'} response — ${selectedFrame}`,
              value: {
                frameFile: selectedFrame,
                time: selectedTime,
                parsed: selectedTag ?? null,
                rawResponse: selectedTag?.rawResponse ?? null,
                rawText: selectedTag?.rawText ?? null,
              },
            })}
          />
        )}

        {scenes.length > 0 && (
          <section>
            <SectionTitle label="Scenes" count={scenes.length} />
            <div className="flex flex-col gap-1.5">
              {scenes.map((scene, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const time = scene.start ?? scene.time ?? 0;
                    setSelectedFrameIndex(frameIndexForTime(video, time));
                    onSeek(time);
                  }}
                  className="rounded-sm border border-white/[0.04] bg-white/[0.018] px-2 py-2 text-left hover:border-cyan-300/20 hover:bg-cyan-300/[0.025]"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="w-16 shrink-0 font-mono text-[9px] tabular-nums text-white/30">
                      {formatTime(scene.start ?? scene.time ?? 0)}
                      {scene.end != null && ` -> ${formatTime(scene.end)}`}
                    </span>
                    {scene.activity && (
                      <span className={`rounded-sm px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider ${
                        scene.activity === 'active'
                          ? 'bg-emerald-400/10 text-emerald-300/80'
                          : 'bg-white/[0.03] text-white/30'
                      }`}>
                        {scene.activity}
                      </span>
                    )}
                    {scene.frameKind && (
                      <span className="rounded-sm bg-white/[0.03] px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider text-white/28">
                        {scene.frameKind.replace('-', ' ')}
                      </span>
                    )}
                    {scene.motionArea && (
                      <span className="rounded-sm bg-amber-400/10 px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider text-amber-300/60">
                        {scene.motionArea}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] leading-relaxed text-white/52">{scene.description}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onShowJson({ title: 'EDL JSON', value: video.edl ?? null })}
          className="flex items-center justify-center gap-1.5 rounded-sm border border-white/[0.08] bg-white/[0.025] px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-white/45 hover:border-white/[0.16] hover:text-white/70"
        >
          <Braces size={11} />
          EDL JSON
        </button>
        <button
          onClick={() => onShowJson({ title: 'Asset JSON', value: video })}
          className="flex items-center justify-center gap-1.5 rounded-sm border border-white/[0.08] bg-white/[0.025] px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-white/45 hover:border-white/[0.16] hover:text-white/70"
        >
          <Braces size={11} />
          Asset JSON
        </button>
      </div>
    </aside>
  );
}

function FrameAnalysisCard({
  frame,
  src,
  time,
  scene,
  tag,
  overlays,
  onOpenRaw,
}: {
  frame: string;
  src: string;
  time: number | null;
  scene?: Video['scenes'][number];
  tag?: VisionTag;
  overlays: FrameOverlay[];
  onOpenRaw: () => void;
}) {
  const provider = tag?.provider || 'MiniMax';
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-2">
        <SectionTitle label="Frame Inspector" icon={<Images size={11} />} />
        <span className="text-[9px] font-mono text-white/25 tabular-nums">{formatTime(time)}</span>
      </div>
      <div className="overflow-hidden rounded-sm border border-white/[0.06] bg-black/35">
        {src ? (
          <div className="relative">
            <img src={src} alt={frame} className="w-full aspect-video object-cover" loading="lazy" />
            <FrameOverlayBoxes overlays={overlays} />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center text-[10px] font-mono uppercase tracking-wider text-white/25">
            Screenshot unavailable
          </div>
        )}
        <div className="space-y-2 border-t border-white/[0.06] p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-sm bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-cyan-300/75">
              {provider}
            </span>
            {tag?.model && (
              <span className="rounded-sm bg-white/[0.035] px-1.5 py-0.5 text-[8px] font-mono text-white/35">
                {tag.model}
              </span>
            )}
            <span className="rounded-sm bg-white/[0.035] px-1.5 py-0.5 text-[8px] font-mono text-white/35">
              {frame}
            </span>
            {scene?.frameKind && (
              <span className="rounded-sm bg-white/[0.035] px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-white/35">
                {scene.frameKind.replace('-', ' ')}
              </span>
            )}
            {scene?.motionArea && (
              <span className="rounded-sm bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-amber-300/70">
                {scene.motionArea}
              </span>
            )}
            {tag?.contentType && (
              <span className="rounded-sm bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-emerald-300/70">
                {tag.contentType}
              </span>
            )}
          </div>

          {overlays.length > 0 && (
            <div className="space-y-1.5">
              {overlays.map((overlay, index) => (
                <FrameOverlayLegend key={`${overlay.provider}-${overlay.label}-${index}`} overlay={overlay} />
              ))}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-white/62">
            {tag?.description || scene?.description || 'No MiniMax frame analysis has been saved for this screenshot yet.'}
          </p>

          {tag?.tags && tag.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tag.tags.map(t => (
                <span key={t} className="rounded-sm bg-white/[0.035] px-1.5 py-0.5 text-[9px] font-mono text-white/42">
                  {t}
                </span>
              ))}
            </div>
          )}

          {scene?.quadrants && (
            <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-white/35">
              <DataPill label="TL" value={formatDiff(scene.quadrants.topLeft)} />
              <DataPill label="TR" value={formatDiff(scene.quadrants.topRight)} />
              <DataPill label="BL" value={formatDiff(scene.quadrants.bottomLeft)} />
              <DataPill label="BR" value={formatDiff(scene.quadrants.bottomRight)} />
            </div>
          )}

          {tag?.error && (
            <div className="rounded-sm border border-red-400/15 bg-red-400/[0.05] p-2 text-[10px] text-red-200/70">
              {tag.error}
            </div>
          )}

          <button
            onClick={onOpenRaw}
            disabled={!tag}
            className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-white/[0.08] bg-white/[0.025] px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-white/45 hover:border-white/[0.16] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Braces size={11} />
            Raw {provider} JSON
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ label, count, icon }: { label: string; count?: number; icon?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-white/28">
      {icon}
      <span>{label}</span>
      {count != null && <span className="text-white/18">({count})</span>}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-white/[0.06] bg-white/[0.025] px-2 py-2">
      <div className="mb-1 flex items-center gap-1 text-white/25">
        {icon}
        <span className="text-[8px] font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[12px] font-mono text-white/72">{value}</div>
    </div>
  );
}

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-white/[0.04] bg-white/[0.018] px-2 py-1.5">
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/20">{label}</div>
      <div className="text-[10px] font-mono text-white/55 truncate">{value}</div>
    </div>
  );
}

function FrameOverlayBoxes({ overlays }: { overlays: FrameOverlay[] }) {
  if (overlays.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {overlays.map((overlay, index) => {
        const color = overlayColor(overlay.provider);
        return (
          <div
            key={`${overlay.provider}-${overlay.label}-${index}`}
            className="absolute rounded-sm border shadow-[0_0_0_1px_rgba(0,0,0,0.7)]"
            style={{
              left: `${overlay.rect.x * 100}%`,
              top: `${overlay.rect.y * 100}%`,
              width: `${overlay.rect.w * 100}%`,
              height: `${overlay.rect.h * 100}%`,
              borderColor: color,
              backgroundColor: `${color}22`,
            }}
          />
        );
      })}
    </div>
  );
}

function FrameOverlayLegend({ overlay }: { overlay: FrameOverlay }) {
  const color = overlayColor(overlay.provider);
  return (
    <div className="rounded-sm border border-white/[0.05] bg-white/[0.018] px-2 py-1.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[9px] font-mono uppercase tracking-wider text-white/55">{overlay.provider}</span>
        <span className="text-[9px] font-mono text-white/35">{overlay.label}</span>
        {overlay.confidence && <span className="ml-auto text-[8px] font-mono uppercase tracking-wider text-white/25">{overlay.confidence}</span>}
      </div>
      {overlay.note && <div className="text-[9px] leading-relaxed text-white/35">{overlay.note}</div>}
    </div>
  );
}

function overlayColor(provider: string): string {
  const normalized = provider.toLowerCase();
  if (normalized.includes('moon')) return '#22d3ee';
  if (normalized.includes('mini')) return '#f59e0b';
  return '#a78bfa';
}

function formatDiff(value: number | undefined): string {
  if (value == null) return '--';
  return `${(value * 100).toFixed(2)}%`;
}

function frameTimeForIndex(video: Video, index: number): number | null {
  const frame = video.frames?.[index];
  const tag = frame ? video.visionTags?.find(t => t.frameFile === frame) : null;
  if (tag?.time != null) return tag.time;
  const scene = (video.edl?.scenes ?? video.scenes ?? [])[index];
  return scene?.start ?? scene?.time ?? null;
}

function frameIndexForTime(video: Video, time: number): number {
  const frames = video.frames ?? [];
  if (frames.length === 0) return 0;
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < frames.length; i++) {
    const frameTime = frameTimeForIndex(video, i);
    if (frameTime == null) continue;
    const distance = Math.abs(frameTime - time);
    if (distance < bestDistance) {
      bestIndex = i;
      bestDistance = distance;
    }
  }
  return bestIndex;
}

function JsonModal({ title, value, onClose }: { title: string; value: unknown; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-white/[0.12] bg-[#090a0c] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/60">
            <Braces size={13} />
            {title}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-white/45 hover:text-white/75"
          >
            <X size={15} />
            Close
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-white/62">
          {JSON.stringify(value, null, 2)}
        </pre>
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
