'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle2, Loader2, FileVideo, MessageSquare, Zap, XCircle, RefreshCw, FolderOpen, ChevronRight, Play, FileCode, Braces, Database, Images, ExternalLink, RotateCcw, X } from 'lucide-react';
import { useCatalog } from '../Provider';
import type { Video } from '@/lib/types';

interface ActivityEntry {
  stage: string;
  message: string;
  detail?: string;
  timestamp: string;
}

interface CompositionJob {
  compositionId: string;
  jobId: string;
  kind: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  prompt: string;
  inputs: { clips?: (string | { src: string; [key: string]: unknown })[]; [key: string]: unknown } | null;
  params: { name?: string; [key: string]: unknown } | null;
  agentState: string | null;
  progress: number | null;
  lastMessage: string | null;
  heartbeatAt: string | null;
  result: { outputUrls: string[]; metadata?: Record<string, unknown> } | null;
  error: { message: string } | null;
  activity: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

interface JsonModalState {
  title: string;
  data: unknown;
}

interface SourceAssetMatch {
  src: string;
  video: Video | null;
}

interface RevisionBriefView {
  intent: string;
  plannedChanges: string[];
  questions: string[];
  sourceCompositionId?: string;
}

// ── Helpers ────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function metaNumber(meta: Record<string, unknown> | undefined, key: string): number | null {
  const value = meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function sourcePath(source: string | { src: string; [key: string]: unknown }): string {
  return typeof source === 'string' ? source : source.src;
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

function slugifyPath(path: string): string {
  return basename(path)
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function matchSourceAssets(
  clips: (string | { src: string; [key: string]: unknown })[] | undefined,
  videos: Video[],
): SourceAssetMatch[] {
  return (clips ?? []).map((clip) => {
    const src = sourcePath(clip).replace(/^\/+/, '');
    const file = basename(src);
    const sourceSlug = slugifyPath(src);
    const video = videos.find((v) => (
      v.demosPath === src ||
      v.videoUrl === src ||
      v.filename === file ||
      slugifyPath(v.filename) === sourceSlug ||
      slugifyPath(v.demosPath ?? '') === sourceSlug ||
      slugifyPath(v.videoUrl ?? '') === sourceSlug
    )) ?? null;

    return { src, video };
  });
}

function compactJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

async function retryJobRequest(jobId: string): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Retry failed (${res.status})`);
  }
}

// ── Queue list ─────────────────────────────────────────────────

export function QueueView() {
  const { setView, refreshCatalog } = useCatalog();
  const [jobs, setJobs] = useState<CompositionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompositionJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedSeenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs`);
      if (!res.ok) { setLoading(false); return; }
      const data = (await res.json()) as CompositionJob[];
      const list = Array.isArray(data) ? data : [];
      setJobs(list);

      const seen = completedSeenRef.current;
      let sawNewCompletion = false;
      for (const job of list) {
        if (job.status === 'completed' && !seen.has(job.jobId)) {
          seen.add(job.jobId);
          if (seededRef.current) sawNewCompletion = true;
        }
      }
      seededRef.current = true;
      if (sawNewCompletion) refreshCatalog();
    } catch {
    } finally {
      setLoading(false);
    }
  }, [refreshCatalog]);

  const handleRetry = useCallback(async (jobId: string) => {
    await retryJobRequest(jobId);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh]);

  useEffect(() => {
    if (selected) {
      const updated = jobs.find(j => j.jobId === selected.jobId);
      if (updated) setSelected(updated);
    }
  }, [jobs, selected?.jobId]);

  if (selected) {
    return <JobDetail job={selected} onBack={() => setSelected(null)} onRetry={handleRetry} />;
  }

  const running = jobs.filter(j => j.status === 'running').length;
  const queued = jobs.filter(j => j.status === 'queued').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-white/[0.06] flex items-center">
        <div className="flex-1">
          <h1 className="text-[16px] font-medium text-white/90">Queue</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-white/45 font-mono">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
            {running > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400/80">
                <Loader2 size={9} className="animate-spin" />
                {running} running
              </span>
            )}
            {queued > 0 && (
              <span className="text-[10px] font-mono text-white/40">
                {queued} queued
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          className="text-white/30 hover:text-white/60 transition-colors p-2 rounded-sm hover:bg-white/[0.04]"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        {loading && (
          <div className="flex items-center justify-center h-32 text-white/30 text-[11px] font-mono uppercase tracking-wider">
            Loading…
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
              <FolderOpen size={18} className="text-white/25" />
            </div>
            <div className="text-white/40 text-[12px] font-mono">No compositions yet</div>
            <button
              onClick={() => setView('new')}
              className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 hover:text-cyan-300 px-3 py-1.5 border border-cyan-400/25 rounded-sm transition-colors"
            >
              Create one
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="flex flex-col gap-1.5 p-4">
            {jobs.map(job => {
              const jobMeta = job.result?.metadata as Record<string, unknown> | undefined;
              const title = metaString(jobMeta, 'title') || job.params?.name || job.compositionId;
              const durationSec = metaNumber(jobMeta, 'durationSec');
              const clipCount = metaNumber(jobMeta, 'clipCount');
              const width = metaNumber(jobMeta, 'width');
              const height = metaNumber(jobMeta, 'height');
              const isRunning = job.status === 'running';
              const isFailed = job.status === 'failed';
              const isCompleted = job.status === 'completed';

              return (
                <button
                  key={job.jobId}
                  onClick={() => setSelected(job)}
                  className={`group flex items-start gap-3 px-4 py-3.5 rounded text-left transition-all border ${
                    isRunning
                      ? 'bg-amber-400/[0.03] border-amber-400/[0.12] hover:border-amber-400/25'
                      : isFailed
                      ? 'bg-red-400/[0.02] border-red-400/[0.08] hover:border-red-400/15'
                      : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="mt-0.5">
                    <StatusIcon status={job.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-white/85 truncate font-medium">{title}</span>
                      <ChevronRight size={11} className="text-white/15 shrink-0 group-hover:text-white/35 transition-colors" />
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1 flex items-center gap-1.5">
                      <span className="uppercase">{job.kind}</span>
                      <span className="text-white/20">·</span>
                      <span>{job.inputs?.clips?.length ?? 0} clip{(job.inputs?.clips?.length ?? 0) !== 1 ? 's' : ''}</span>
                      <span className="text-white/20">·</span>
                      <span>{relativeTime(job.createdAt)}</span>
                    </div>

                    {isRunning && (
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400/60 rounded-full transition-all duration-500" style={{ width: `${job.progress ?? 0}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-amber-400/70 truncate">
                          {job.agentState ?? 'Running'}
                        </span>
                      </div>
                    )}

                    {isCompleted && jobMeta && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {durationSec != null && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400/[0.08] text-[9px] font-mono text-emerald-400/80 font-medium">
                            {formatDuration(durationSec)}
                          </span>
                        )}
                        {clipCount != null && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-white/50">
                            {clipCount} clips
                          </span>
                        )}
                        {width != null && height != null && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-white/50">
                            {width}×{height}
                          </span>
                        )}
                      </div>
                    )}

                    {isFailed && job.error && (
                      <div className="text-[10px] font-mono text-red-400/70 mt-1.5 truncate">
                        {job.error.message}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 mt-1">
                    {isCompleted && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/70">Done</span>
                    )}
                    {job.status === 'queued' && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Queued</span>
                    )}
                    {isRunning && (
                      <span className="text-[9px] font-mono text-amber-400/70">{job.progress ?? 0}%</span>
                    )}
                    {isFailed && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-red-400/60">Failed</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Job detail ─────────────────────────────────────────────────

function JobDetail({
  job,
  onBack,
  onRetry,
}: {
  job: CompositionJob;
  onBack: () => void;
  onRetry: (jobId: string) => Promise<void> | void;
}) {
  const { openFile, openVideo, setView, data } = useCatalog();
  const [jsonModal, setJsonModal] = useState<JsonModalState | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [brief, setBrief] = useState<RevisionBriefView | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const meta = job.result?.metadata as Record<string, unknown> | undefined;
  const title = metaString(meta, 'title') || job.params?.name || job.compositionId;
  const description = metaString(meta, 'description');
  const durationSec = metaNumber(meta, 'durationSec');
  const width = metaNumber(meta, 'width');
  const height = metaNumber(meta, 'height');
  const fps = metaNumber(meta, 'fps');
  const clipCount = metaNumber(meta, 'clipCount');
  const audioTrackCount = metaNumber(meta, 'audioTrackCount') ?? 0;
  const introStyle = metaString(meta, 'introStyle');
  const compositionDirMeta = metaString(meta, 'compositionDir');

  const totalElapsed = job.activity && job.activity.length >= 2
    ? ((new Date(job.activity[job.activity.length - 1].timestamp).getTime() - new Date(job.activity[0].timestamp).getTime()) / 1000)
    : null;

  const compositionDir = compositionDirMeta || `.compositions/${job.compositionId}`;
  const tsxPath = `${compositionDir}/Composition.tsx`;
  const planPath = `${compositionDir}/composition.json`;
  const videoPath = metaString(meta, 'videoPath');
  const catalogVideo = videoPath && data?.videos
    ? data.videos.find(v => v.demosPath === videoPath || v.filename === `${job.compositionId}.mp4`)
    : null;
  const sourceAssets = matchSourceAssets(job.inputs?.clips, data?.videos ?? []);
  const isBriefJob = job.kind === 'revise-brief';
  const briefPath = metaString(meta, 'briefPath') || `${compositionDir}/revision-brief.json`;
  const sourceCompositionId = metaString(meta, 'sourceCompositionId') || brief?.sourceCompositionId;

  const openJson = (title: string, data: unknown) => setJsonModal({ title, data });
  const openJsonFile = async (path: string, title: string) => {
    try {
      const res = await fetch(`/api/source?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(`Could not read ${path}`);
      const body = await res.json();
      const content = body.content ?? '';
      try {
        setJsonModal({ title, data: JSON.parse(content) });
      } catch {
        setJsonModal({ title, data: { path, content } });
      }
    } catch (err) {
      setJsonModal({ title: 'Read failed', data: { path, error: err instanceof Error ? err.message : String(err) } });
    }
  };

  useEffect(() => {
    if (!isBriefJob || job.status !== 'completed') return;
    let cancelled = false;
    setBriefLoading(true);
    fetch(`/api/source?path=${encodeURIComponent(briefPath)}`)
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (cancelled || !body?.content) return;
        try {
          const parsed = JSON.parse(body.content);
          setBrief({
            intent: typeof parsed.intent === 'string' ? parsed.intent : '',
            plannedChanges: Array.isArray(parsed.plannedChanges) ? parsed.plannedChanges : [],
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            sourceCompositionId: typeof parsed.sourceCompositionId === 'string' ? parsed.sourceCompositionId : undefined,
          });
        } catch (err) {
          console.error('Failed to parse revision brief:', err);
        }
      })
      .catch(err => console.error('Failed to load revision brief:', err))
      .finally(() => { if (!cancelled) setBriefLoading(false); });
    return () => { cancelled = true; };
  }, [isBriefJob, job.status, briefPath]);

  const submitRegenerate = useCallback(async () => {
    if (!brief || !sourceCompositionId) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const sourcePath = `.compositions/${sourceCompositionId}/Composition.tsx`;
      const sourceRes = await fetch(`/api/source?path=${encodeURIComponent(sourcePath)}`);
      if (!sourceRes.ok) throw new Error(`Could not read original TSX (${sourceRes.status})`);
      const { content: originalSource } = await sourceRes.json();

      let clips: string[] = [];
      let audio: string[] = [];
      let aspectRatio: string | undefined;
      try {
        const planRes = await fetch(`/api/source?path=${encodeURIComponent(`.compositions/${sourceCompositionId}/composition.json`)}`);
        if (planRes.ok) {
          const { content: planJson } = await planRes.json();
          const plan = JSON.parse(planJson);
          if (Array.isArray(plan.clips)) clips = plan.clips.map((c: { src?: string }) => c.src).filter(Boolean);
          if (Array.isArray(plan.audioTracks)) audio = plan.audioTracks.map((a: { src?: string }) => a.src).filter(Boolean);
          if (typeof plan.width === 'number' && typeof plan.height === 'number') {
            if (plan.width === plan.height) aspectRatio = '1:1';
            else if (plan.height > plan.width) aspectRatio = '9:16';
            else aspectRatio = '16:9';
          }
        }
      } catch (err) {
        console.warn('Could not preload original plan; LLM will derive clips from TSX', err);
      }

      const renderId = `${sourceCompositionId}-rev-${Date.now().toString(36)}`;
      const res = await fetch(`/api/compositions/${encodeURIComponent(renderId)}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'revise-render',
          prompt: `Apply the confirmed revision brief to "${sourceCompositionId}".`,
          inputs: {
            sourceCompositionId,
            originalSource,
            brief,
            clips,
            audio,
          },
          params: aspectRatio ? { aspectRatio } : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Regenerate failed (${res.status})`);
      onBack();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegenerating(false);
    }
  }, [brief, sourceCompositionId, onBack]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft size={14} />
          </button>
          <h1 className="text-[15px] font-medium text-white/90 flex-1 truncate">{title}</h1>
          <StatusBadge status={job.status} />
        </div>
        {/* Sub-header with quick stats */}
        <div className="flex items-center gap-3 mt-2 ml-[26px]">
          <span className="text-[10px] font-mono text-white/40 uppercase">{job.kind}</span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] font-mono text-white/40">{relativeTime(job.createdAt)}</span>
          {totalElapsed != null && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[10px] font-mono text-white/40">
                {totalElapsed < 1 ? `${Math.round(totalElapsed * 1000)}ms` : `${totalElapsed.toFixed(1)}s`} total
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        <div className="px-6 py-6 flex flex-col gap-7">

          {/* ── Running: progress bar ─────────────────────── */}
          {job.status === 'running' && (
            <div className="px-4 py-4 bg-amber-400/[0.03] border border-amber-400/[0.1] rounded">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-mono font-medium text-amber-300/80">
                  {job.agentState ?? 'Processing'}
                </span>
                <span className="text-[11px] font-mono text-white/50 tabular-nums">
                  {job.progress ?? 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-amber-400/60 rounded-full transition-all duration-500" style={{ width: `${job.progress ?? 0}%` }} />
              </div>
              {job.lastMessage && (
                <div className="text-[11px] font-mono text-white/50 mt-2.5">{job.lastMessage}</div>
              )}
            </div>
          )}

          {isBriefJob && job.status === 'completed' && (
            <div className="px-4 py-4 bg-cyan-400/[0.04] border border-cyan-400/[0.18] rounded">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-cyan-300/80">
                  Revision Brief
                </span>
                {sourceCompositionId && (
                  <span className="text-[10px] font-mono text-white/35 truncate max-w-[60%]" title={sourceCompositionId}>
                    of {sourceCompositionId}
                  </span>
                )}
              </div>

              {briefLoading && (
                <div className="text-[11px] font-mono text-white/40 flex items-center gap-2">
                  <Loader2 size={11} className="animate-spin" />
                  Loading brief…
                </div>
              )}

              {!briefLoading && !brief && (
                <div className="text-[11px] font-mono text-red-400/70">
                  Brief artifact missing at {briefPath}
                </div>
              )}

              {brief && (
                <>
                  {brief.intent && (
                    <div className="text-[12.5px] text-white/75 leading-relaxed mb-4 select-text border-l-2 border-cyan-400/30 pl-3">
                      {brief.intent}
                    </div>
                  )}

                  {brief.plannedChanges.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/35 mb-2">
                        Planned changes
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {brief.plannedChanges.map((change, i) => (
                          <li key={i} className="text-[12px] text-white/65 leading-snug pl-3 relative select-text before:content-['-'] before:absolute before:left-0 before:text-white/25">
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {brief.questions.length > 0 && (
                    <div className="mb-4 px-3 py-2.5 bg-amber-400/[0.06] border border-amber-400/25 rounded">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-300/80 mb-1.5">
                        Needs clarification ({brief.questions.length})
                      </div>
                      <ul className="flex flex-col gap-1">
                        {brief.questions.map((question, i) => (
                          <li key={i} className="text-[11.5px] text-amber-100/85 leading-snug select-text">
                            {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-cyan-400/[0.12]">
                    <button
                      onClick={submitRegenerate}
                      disabled={regenerating}
                      className="flex items-center gap-2 px-3 py-2 rounded bg-cyan-400/[0.12] hover:bg-cyan-400/[0.2] border border-cyan-400/30 hover:border-cyan-400/50 transition-all text-[11px] font-mono font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      {regenerating ? 'Queuing render…' : 'Regenerate composition'}
                    </button>
                    {regenError && (
                      <span className="text-[10px] font-mono text-red-400/70">{regenError}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Completed: summary + video link ──────────── */}
          {job.status === 'completed' && meta && !isBriefJob && (
            <div className="px-4 py-4 bg-emerald-400/[0.04] border border-emerald-400/[0.15] rounded">
              {description && (
                <div className="text-[12px] text-white/65 leading-relaxed mb-3 select-text">
                  {description}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {durationSec != null && (
                  <Tag color="emerald">{formatDuration(durationSec)}</Tag>
                )}
                {width != null && height != null && (
                  <Tag>{width}×{height}</Tag>
                )}
                {fps != null && (
                  <Tag>{fps}fps</Tag>
                )}
                {clipCount != null && (
                  <Tag>{clipCount} clip{clipCount !== 1 ? 's' : ''}</Tag>
                )}
                {audioTrackCount > 0 && (
                  <Tag>{audioTrackCount} audio</Tag>
                )}
                {introStyle && introStyle !== 'none' && (
                  <Tag color="cyan">{introStyle} intro</Tag>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-emerald-400/[0.1]">
                {catalogVideo ? (
                  <button
                    onClick={() => { openVideo(catalogVideo.id); setView(null); }}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-400/[0.12] hover:bg-emerald-400/[0.2] border border-emerald-400/30 hover:border-emerald-400/50 transition-all text-[11px] font-mono font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    <Play size={12} />
                    Watch Video
                  </button>
                ) : videoPath ? (
                  <span className="flex items-center gap-2 px-3 py-2 rounded bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/40">
                    <Loader2 size={12} className="animate-spin" />
                    Rendered — rebuilding catalog…
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-3 py-2 rounded bg-amber-400/[0.06] border border-amber-400/[0.12] text-[11px] font-mono text-amber-300/60">
                    <Clock size={12} />
                    Render pending
                  </span>
                )}
                <button
                  onClick={() => openFile(tsxPath)}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all text-[11px] font-mono text-white/60 hover:text-white/80"
                >
                  <FileCode size={12} />
                  Source
                </button>
              </div>
            </div>
          )}

          {/* ── Output files ──────────────────────────────── */}
          {job.status === 'completed' && job.result && (
            <Section icon={<FolderOpen size={10} />} label="Output" color="emerald">
              <div className="flex flex-col gap-1">
                {job.result.outputUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => openFile(url.replace('file://', ''))}
                    className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] font-mono text-white/60 truncate select-text text-left hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors"
                  >
                    {url.replace('file://', '')}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* ── One-place source analysis + structured data ── */}
          <Section icon={<Database size={10} />} label="Job Data">
            <div className="grid grid-cols-2 gap-2">
              <JsonChip label="Job JSON" onClick={() => openJson('Job JSON', job)} />
              <JsonChip label="Inputs" onClick={() => openJson('Inputs JSON', job.inputs ?? {})} />
              <JsonChip label="Params" onClick={() => openJson('Params JSON', job.params ?? {})} />
              <JsonChip label="Activity" onClick={() => openJson('Activity JSON', job.activity ?? [])} />
              {job.result && <JsonChip label="Result" onClick={() => openJson('Result JSON', job.result)} />}
              {meta && <JsonChip label="Metadata" onClick={() => openJson('Result Metadata JSON', meta)} />}
              {job.result?.outputUrls?.some(url => url.endsWith('/composition.json') || url.endsWith('composition.json')) && (
                <JsonChip label="Plan JSON" onClick={() => openJsonFile(planPath, 'Composition Plan JSON')} />
              )}
            </div>
          </Section>

          {sourceAssets.length > 0 && (
            <Section icon={<Images size={10} />} label={`Processed Source${sourceAssets.length !== 1 ? 's' : ''}`}>
              <div className="flex flex-col gap-2">
                {sourceAssets.map((asset, i) => (
                  <SourceAnalysisCard
                    key={`${asset.src}-${i}`}
                    match={asset}
                    onOpenAsset={(video) => { openVideo(video.id); setView(null); }}
                    onOpenJson={(label, value) => openJson(label, value)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Error ─────────────────────────────────────── */}
          {job.status === 'failed' && job.error && (
            <Section icon={<XCircle size={10} />} label="Error" color="red">
              <div className="px-3 py-2.5 bg-red-400/[0.05] border border-red-400/15 rounded text-[12px] font-mono text-red-300/80 select-text leading-relaxed">
                {job.error.message}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  disabled={retrying}
                  onClick={async () => {
                    setRetrying(true);
                    setRetryError(null);
                    try {
                      await onRetry(job.jobId);
                      onBack();
                    } catch (err) {
                      setRetryError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setRetrying(false);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-red-400/[0.08] hover:bg-red-400/[0.16] border border-red-400/30 hover:border-red-400/50 transition-all text-[11px] font-mono font-medium text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retrying ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  {retrying ? 'Queuing retry…' : 'Retry'}
                </button>
                {retryError && (
                  <span className="text-[10px] font-mono text-red-400/70">{retryError}</span>
                )}
              </div>
            </Section>
          )}

          {/* ── Activity timeline ─────────────────────────── */}
          {job.activity && job.activity.length > 0 && (
            <Section icon={<Zap size={10} />} label="Activity">
              <div className="flex flex-col relative ml-1">
                <div className="absolute left-[4px] top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-white/30 via-white/20 to-white/[0.08]" />

                {job.activity.map((entry, i) => {
                  const isError = entry.stage === 'error';
                  const isDone = entry.stage === 'done';
                  const isLlm = entry.stage === 'llm';
                  const isPlan = entry.stage === 'plan';
                  const isFiles = entry.stage === 'files';
                  const isInputs = entry.stage === 'inputs';
                  const isLast = i === job.activity.length - 1;

                  const elapsed = i > 0
                    ? ((new Date(entry.timestamp).getTime() - new Date(job.activity[i - 1].timestamp).getTime()) / 1000)
                    : 0;

                  const elapsedStr = elapsed > 0.5
                    ? (elapsed < 1 ? `${Math.round(elapsed * 1000)}ms` : `${elapsed.toFixed(1)}s`)
                    : null;

                  if (isDone) {
                    return (
                      <div key={i} className="relative pl-6 pt-4">
                        <div className="absolute left-0 top-[20px] w-[10px] h-[10px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] ring-2 ring-emerald-400/20" />
                        <button
                          type="button"
                          onClick={() => openJson(`Activity Event ${i + 1}`, entry)}
                          className="w-full px-4 py-3 bg-emerald-400/[0.08] border border-emerald-400/25 rounded flex items-center justify-between text-left hover:bg-emerald-400/[0.12] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-[12px] font-mono text-emerald-300 font-medium">{entry.message}</span>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-400/60 tabular-nums">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </button>
                      </div>
                    );
                  }

                  if (isError) {
                    return (
                      <div key={i} className="relative pl-6 pt-4">
                        <div className="absolute left-0 top-[20px] w-[10px] h-[10px] rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)] ring-2 ring-red-400/20" />
                        <button
                          type="button"
                          onClick={() => openJson(`Activity Event ${i + 1}`, entry)}
                          className="w-full px-4 py-3 bg-red-400/[0.08] border border-red-400/25 rounded text-left hover:bg-red-400/[0.12] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <XCircle size={14} className="text-red-400 shrink-0" />
                            <span className="text-[12px] font-mono text-red-300 select-text">{entry.message}</span>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  if (isPlan) {
                    return (
                      <div key={i} className="relative pl-6 py-3">
                        <div className="absolute left-[1px] top-[18px] w-[8px] h-[8px] rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.3)] ring-[1.5px] ring-cyan-400/25" />
                        <button
                          type="button"
                          onClick={() => openJson(`Activity Event ${i + 1}`, entry)}
                          className="w-full px-4 py-3.5 bg-cyan-400/[0.06] border border-cyan-400/20 rounded text-left hover:bg-cyan-400/[0.1] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">Plan</span>
                            <span className="text-[9px] font-mono text-white/40 tabular-nums">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            {elapsedStr && (
                              <span className="px-1.5 py-px rounded bg-cyan-400/10 text-[9px] font-mono text-cyan-400/70 tabular-nums">+{elapsedStr}</span>
                            )}
                          </div>
                          <div className="text-[12.5px] font-mono text-cyan-100/85 leading-relaxed">{entry.message}</div>
                          {entry.detail && (
                            <div className="text-[11px] font-mono text-white/60 mt-2.5 leading-relaxed select-text border-t border-cyan-400/15 pt-2.5">
                              {entry.detail}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  }

                  const dotColor = isLlm ? 'bg-violet-400 shadow-[0_0_4px_rgba(167,139,250,0.3)] ring-violet-400/25' :
                    isFiles ? 'bg-blue-400 ring-blue-400/25' :
                    isInputs ? 'bg-white/70 ring-white/20' :
                    'bg-white/60 ring-white/15';

                  const labelText = isLlm ? 'LLM' :
                    isFiles ? 'Output' :
                    isInputs ? 'Inputs' :
                    entry.stage;

                  const labelCls = isLlm ? 'text-violet-400' :
                    isFiles ? 'text-blue-400' :
                    'text-white/70';

                  return (
                    <div key={i} className={`flex gap-4 pl-6 relative py-3 ${!isLast ? 'border-b border-white/[0.06]' : ''}`}>
                      <div className={`absolute left-[1px] top-[16px] w-[8px] h-[8px] rounded-full ${dotColor} ring-[1.5px]`} />

                      <button
                        type="button"
                        onClick={() => openJson(`Activity Event ${i + 1}`, entry)}
                        className={`flex-1 min-w-0 text-left hover:bg-white/[0.04] transition-colors ${isLlm ? 'bg-violet-400/[0.04] -mx-2 px-3 py-2 rounded' : '-mx-2 px-2 py-1.5 rounded'}`}
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${labelCls}`}>
                            {labelText}
                          </span>
                          <span className="text-[9px] font-mono text-white/40 tabular-nums">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          {elapsedStr && (
                            <span className="px-1.5 py-px rounded bg-white/[0.08] text-[9px] font-mono text-white/50 tabular-nums">
                              +{elapsedStr}
                            </span>
                          )}
                        </div>
                        <div className={`text-[12px] font-mono leading-relaxed ${isLlm ? 'text-violet-200/85' : 'text-white/75'}`}>
                          {entry.message}
                        </div>
                        {entry.detail && (
                          <div className="text-[11px] font-mono text-white/55 mt-1.5 leading-relaxed select-text">
                            {entry.detail}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Sources ───────────────────────────────────── */}
          {job.inputs?.clips && job.inputs.clips.length > 0 && (
            <Section icon={<FileVideo size={10} />} label={`Sources · ${job.inputs.clips.length}`}>
              <div className="flex flex-col gap-1">
                {job.inputs.clips.map((s, i) => (
                  <div key={i} className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded text-[11px] font-mono text-white/55 truncate select-text">
                    {typeof s === 'string' ? s : s.src}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Prompt ────────────────────────────────────── */}
          <Section icon={<MessageSquare size={10} />} label="Instructions">
            <div className="px-3 py-3 bg-white/[0.02] border border-white/[0.06] rounded text-[12px] text-white/60 leading-relaxed whitespace-pre-wrap select-text">
              {job.prompt}
            </div>
          </Section>

          {/* ── Meta footer ───────────────────────────────── */}
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-mono">
              <MetaRow label="Job" value={job.jobId} />
              <MetaRow label="Composition" value={job.compositionId} />
              <MetaRow label="Kind" value={job.kind} />
              <MetaRow label="Created" value={new Date(job.createdAt).toLocaleString()} />
              {job.heartbeatAt && <MetaRow label="Heartbeat" value={new Date(job.heartbeatAt).toLocaleString()} />}
              {compositionDirMeta && <MetaRow label="Directory" value={compositionDirMeta} />}
            </div>
          </div>
        </div>
      </div>
      {jsonModal && (
        <JsonModal
          title={jsonModal.title}
          data={jsonModal.data}
          onClose={() => setJsonModal(null)}
        />
      )}
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────

function JsonChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-[10px] font-mono text-white/55 hover:text-white/80"
    >
      <Braces size={11} className="text-cyan-400/55" />
      {label}
    </button>
  );
}

function SourceAnalysisCard({
  match,
  onOpenAsset,
  onOpenJson,
}: {
  match: SourceAssetMatch;
  onOpenAsset: (video: Video) => void;
  onOpenJson: (label: string, value: unknown) => void;
}) {
  const { src, video } = match;
  const frames = video?.frames ?? [];
  const scenes = video?.scenes ?? [];
  const hasFrames = !!video?.storyboardDir && frames.length > 0;
  const analyzed = video?.analysisStatus === 'complete' || video?.analysisStatus === 'analyzed' || video?.analysisStatus === 'frames-only';
  const status = video ? video.analysisStatus : 'missing';
  const stats = video?.edl?.stats;

  const statusClass = analyzed
    ? 'bg-emerald-400/[0.1] text-emerald-300/80 border-emerald-400/25'
    : video
      ? 'bg-amber-400/[0.08] text-amber-300/75 border-amber-400/20'
      : 'bg-red-400/[0.08] text-red-300/75 border-red-400/20';

  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-3 border-b border-white/[0.05]">
        <FileVideo size={13} className="text-white/35 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-white/65 truncate select-text">{src}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${statusClass}`}>
              {status}
            </span>
            {video && <span className="text-[9px] font-mono text-white/35">{formatDuration(Math.round(video.duration))}</span>}
            {video && <span className="text-[9px] font-mono text-white/35">{video.resolution}</span>}
            {hasFrames && <span className="text-[9px] font-mono text-white/35">{frames.length} frames</span>}
            {scenes.length > 0 && <span className="text-[9px] font-mono text-white/35">{scenes.length} scenes</span>}
          </div>
        </div>
      </div>

      {hasFrames ? (
        <div className="p-3">
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {frames.slice(0, 8).map((frame, i) => (
              <button
                key={frame}
                type="button"
                onClick={() => video && onOpenAsset(video)}
                className="relative aspect-video overflow-hidden rounded-sm border border-white/[0.06] bg-black hover:border-cyan-400/35 transition-colors"
                title={scenes[i]?.description ?? frame}
              >
                <img
                  src={`/demos/${video!.storyboardDir}/${frame}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-1 bottom-1 rounded bg-black/70 px-1 py-px text-[8px] font-mono text-white/60">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <MiniStat label="Active" value={formatDuration(stats.activeTime)} />
              <MiniStat label="Idle" value={formatDuration(stats.idleTime)} />
              <MiniStat label="Dead" value={String(video?.edl?.deadTime?.length ?? 0)} />
            </div>
          )}

          {scenes.length > 0 && (
            <div className="max-h-36 overflow-y-auto frame-scrollbar rounded bg-black/20 border border-white/[0.04]">
              {scenes.slice(0, 8).map((scene, i) => (
                <div key={i} className="px-2.5 py-1.5 border-b border-white/[0.04] last:border-b-0 flex gap-2">
                  <span className="w-10 shrink-0 text-[9px] font-mono text-white/25 tabular-nums">
                    {Math.round(scene.start ?? scene.time ?? 0)}s
                  </span>
                  <span className="text-[10px] text-white/50 leading-snug">{scene.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-3 text-[11px] text-white/42 leading-relaxed">
          {video
            ? 'This source is in the catalog, but it does not have extracted storyboard frames yet.'
            : 'This source path is not currently matched to a catalog asset.'}
        </div>
      )}

      <div className="px-3 py-2 border-t border-white/[0.05] flex flex-wrap gap-1.5">
        {video && (
          <button
            type="button"
            onClick={() => onOpenAsset(video)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-mono text-white/55 hover:text-white/80 transition-colors"
          >
            <ExternalLink size={10} />
            Open Asset
          </button>
        )}
        {video && (
          <button
            type="button"
            onClick={() => onOpenJson('Source Asset JSON', video)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-mono text-white/55 hover:text-white/80 transition-colors"
          >
            <Braces size={10} />
            Asset JSON
          </button>
        )}
        {video?.edl && (
          <button
            type="button"
            onClick={() => onOpenJson('Source EDL JSON', video.edl)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-mono text-white/55 hover:text-white/80 transition-colors"
          >
            <Braces size={10} />
            EDL JSON
          </button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/[0.025] border border-white/[0.05] px-2 py-1.5">
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/25">{label}</div>
      <div className="text-[11px] font-mono text-white/65">{value}</div>
    </div>
  );
}

function JsonModal({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-4xl max-h-[82vh] rounded border border-white/[0.12] bg-[#0b0b0b] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Braces size={14} className="text-cyan-400/70" />
          <div className="flex-1 min-w-0 text-[12px] font-mono uppercase tracking-wider text-white/70 truncate">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <pre className="max-h-[72vh] overflow-auto frame-scrollbar p-4 text-[11px] leading-relaxed font-mono text-white/65 whitespace-pre-wrap">
          {compactJson(data)}
        </pre>
      </div>
    </div>
  );
}

function Section({ icon, label, color, children }: {
  icon: React.ReactNode;
  label: string;
  color?: 'emerald' | 'red';
  children: React.ReactNode;
}) {
  const labelColor = color === 'emerald' ? 'text-emerald-400/70' :
    color === 'red' ? 'text-red-400/70' :
    'text-white/40';
  return (
    <div>
      <div className={`text-[10px] font-mono uppercase tracking-[0.15em] ${labelColor} mb-2.5 flex items-center gap-1.5`}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Tag({ color, children }: { color?: 'emerald' | 'cyan'; children: React.ReactNode }) {
  const cls = color === 'emerald' ? 'bg-emerald-400/[0.1] text-emerald-400/80' :
    color === 'cyan' ? 'bg-cyan-400/[0.1] text-cyan-400/70' :
    'bg-white/[0.07] text-white/55';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${cls}`}>
      {children}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-white/35 uppercase tracking-wider text-[9px]">{label}</span>
      <span className="text-white/50 select-text truncate">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'bg-emerald-400/[0.12] text-emerald-400/80 border-emerald-400/25' :
    status === 'running' ? 'bg-amber-400/[0.12] text-amber-400/80 border-amber-400/25' :
    status === 'failed' ? 'bg-red-400/[0.12] text-red-400/80 border-red-400/25' :
    'bg-white/[0.05] text-white/50 border-white/[0.1]';
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-400/80 shrink-0" />;
    case 'running':
      return <Loader2 size={14} className="text-amber-400/80 shrink-0 animate-spin" />;
    case 'failed':
      return <XCircle size={14} className="text-red-400/80 shrink-0" />;
    default:
      return <Clock size={14} className="text-white/40 shrink-0" />;
  }
}
