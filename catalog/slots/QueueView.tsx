'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle2, Loader2, FileVideo, MessageSquare, Zap, XCircle, RefreshCw, FolderOpen, ChevronRight, Play, FileCode } from 'lucide-react';
import { useCatalog } from '../Provider';

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

// ── Queue list ─────────────────────────────────────────────────

export function QueueView() {
  const { setView } = useCatalog();
  const [jobs, setJobs] = useState<CompositionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompositionJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

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
    return <JobDetail job={selected} onBack={() => setSelected(null)} />;
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
              const title = (jobMeta?.title as string) || job.params?.name || job.compositionId;
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
                        {jobMeta.durationSec && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400/[0.08] text-[9px] font-mono text-emerald-400/80 font-medium">
                            {formatDuration(jobMeta.durationSec as number)}
                          </span>
                        )}
                        {jobMeta.clipCount != null && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-white/50">
                            {jobMeta.clipCount as number} clips
                          </span>
                        )}
                        {jobMeta.width && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-white/50">
                            {jobMeta.width as number}×{jobMeta.height as number}
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

function JobDetail({ job, onBack }: { job: CompositionJob; onBack: () => void }) {
  const { openFile, openVideo, setView, data } = useCatalog();
  const meta = job.result?.metadata as Record<string, unknown> | undefined;
  const title = (meta?.title as string) || job.params?.name || job.compositionId;

  const totalElapsed = job.activity && job.activity.length >= 2
    ? ((new Date(job.activity[job.activity.length - 1].timestamp).getTime() - new Date(job.activity[0].timestamp).getTime()) / 1000)
    : null;

  const compositionDir = (meta?.compositionDir as string) || `.compositions/${job.compositionId}`;
  const tsxPath = `${compositionDir}/Composition.tsx`;
  const videoPath = meta?.videoPath as string | undefined;
  const catalogVideo = videoPath && data?.videos
    ? data.videos.find(v => v.demosPath === videoPath || v.filename === `${job.compositionId}.mp4`)
    : null;

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

          {/* ── Completed: summary + video link ──────────── */}
          {job.status === 'completed' && meta && (
            <div className="px-4 py-4 bg-emerald-400/[0.04] border border-emerald-400/[0.15] rounded">
              {meta.description && (
                <div className="text-[12px] text-white/65 leading-relaxed mb-3 select-text">
                  {meta.description as string}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {meta.durationSec && (
                  <Tag color="emerald">{formatDuration(meta.durationSec as number)}</Tag>
                )}
                {meta.width && (
                  <Tag>{meta.width as number}×{meta.height as number}</Tag>
                )}
                {meta.fps && (
                  <Tag>{meta.fps as number}fps</Tag>
                )}
                {meta.clipCount != null && (
                  <Tag>{meta.clipCount as number} clip{(meta.clipCount as number) !== 1 ? 's' : ''}</Tag>
                )}
                {(meta.audioTrackCount as number) > 0 && (
                  <Tag>{meta.audioTrackCount as number} audio</Tag>
                )}
                {meta.introStyle && meta.introStyle !== 'none' && (
                  <Tag color="cyan">{meta.introStyle as string} intro</Tag>
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

          {/* ── Error ─────────────────────────────────────── */}
          {job.status === 'failed' && job.error && (
            <Section icon={<XCircle size={10} />} label="Error" color="red">
              <div className="px-3 py-2.5 bg-red-400/[0.05] border border-red-400/15 rounded text-[12px] font-mono text-red-300/80 select-text leading-relaxed">
                {job.error.message}
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
                        <div className="px-4 py-3 bg-emerald-400/[0.08] border border-emerald-400/25 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-[12px] font-mono text-emerald-300 font-medium">{entry.message}</span>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-400/60 tabular-nums">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (isError) {
                    return (
                      <div key={i} className="relative pl-6 pt-4">
                        <div className="absolute left-0 top-[20px] w-[10px] h-[10px] rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)] ring-2 ring-red-400/20" />
                        <div className="px-4 py-3 bg-red-400/[0.08] border border-red-400/25 rounded">
                          <div className="flex items-center gap-2.5">
                            <XCircle size={14} className="text-red-400 shrink-0" />
                            <span className="text-[12px] font-mono text-red-300 select-text">{entry.message}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isPlan) {
                    return (
                      <div key={i} className="relative pl-6 py-3">
                        <div className="absolute left-[1px] top-[18px] w-[8px] h-[8px] rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.3)] ring-[1.5px] ring-cyan-400/25" />
                        <div className="px-4 py-3.5 bg-cyan-400/[0.06] border border-cyan-400/20 rounded">
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
                        </div>
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

                      <div className={`flex-1 min-w-0 ${isLlm ? 'bg-violet-400/[0.04] -mx-2 px-3 py-2 rounded' : ''}`}>
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
                      </div>
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
              {meta?.compositionDir && <MetaRow label="Directory" value={meta.compositionDir as string} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────

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
