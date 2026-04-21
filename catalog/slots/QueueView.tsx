'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle2, Loader2, FileVideo, MessageSquare, Play, Zap, XCircle, RefreshCw } from 'lucide-react';
import { useCatalog } from '../Provider';

interface CompositionJob {
  compositionId: string;
  jobId: string;
  kind: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  prompt: string;
  inputs: { clips?: string[]; [key: string]: unknown } | null;
  params: { name?: string; [key: string]: unknown } | null;
  agentState: string | null;
  progress: number | null;
  lastMessage: string | null;
  heartbeatAt: string | null;
  result: { outputUrls: string[]; metadata?: Record<string, unknown> } | null;
  error: { message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function QueueView() {
  const { setView } = useCatalog();
  const [jobs, setJobs] = useState<CompositionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompositionJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs`);
      if (!res.ok) {
        // Fallback: try getting jobs from a known composition (API might not have /jobs list endpoint)
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // API might not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh]);

  // Update selected job from latest data
  useEffect(() => {
    if (selected) {
      const updated = jobs.find(j => j.jobId === selected.jobId);
      if (updated) setSelected(updated);
    }
  }, [jobs, selected?.jobId]);

  if (selected) {
    return (
      <JobDetail
        job={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 py-5 border-b border-white/[0.04] flex items-center">
        <div className="flex-1">
          <h1 className="text-[16px] font-medium text-white/90">Queue</h1>
          <p className="text-[11px] text-white/30 font-mono mt-1">
            {jobs.length} composition{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-white/20 hover:text-white/50 transition-colors p-1.5"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        {loading && (
          <div className="flex items-center justify-center h-32 text-white/20 text-[11px] font-mono uppercase tracking-wider">
            Loading…
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="px-6 py-12">
            <div className="text-white/15 text-[12px] font-mono mb-3">No compositions queued</div>
            <button
              onClick={() => setView('new')}
              className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 hover:text-cyan-300 px-3 py-1.5 border border-cyan-400/15 rounded-sm transition-colors"
            >
              Create one
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="flex flex-col gap-1 p-4">
            {jobs.map(job => (
              <div
                key={job.jobId}
                className="flex items-center gap-3 px-4 py-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <button onClick={() => setSelected(job)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <StatusIcon status={job.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white/70 truncate">
                      {job.params?.name || job.compositionId}
                    </div>
                    <div className="text-[10px] font-mono text-white/25 mt-0.5 truncate">
                      {job.kind} · {job.inputs?.clips?.length ?? 0} clip{(job.inputs?.clips?.length ?? 0) !== 1 ? 's' : ''} · {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
                {job.status === 'running' && (
                  <div className="shrink-0 flex items-center gap-2">
                    {job.progress != null && (
                      <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400/60 transition-all" style={{ width: `${job.progress}%` }} />
                      </div>
                    )}
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70">
                      <Loader2 size={10} className="inline animate-spin mr-1" />
                      {job.agentState ?? 'Running'}
                    </span>
                  </div>
                )}
                {job.status === 'queued' && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-white/30">
                    Queued
                  </span>
                )}
                {job.status === 'completed' && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-emerald-400/60">
                    Done
                  </span>
                )}
                {job.status === 'failed' && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-red-400/60">
                    Failed
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobDetail({ job, onBack }: { job: CompositionJob; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-[14px] font-medium text-white/90 flex-1 truncate">
          {job.params?.name || job.compositionId}
        </h1>
        <span className={`text-[9px] font-mono uppercase tracking-wider ${statusColor(job.status)}`}>
          {job.status}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        <div className="px-6 py-8 flex flex-col gap-6">
          {/* Progress */}
          {job.status === 'running' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/70">
                  {job.agentState ?? 'Processing'}
                </span>
                <span className="text-[10px] font-mono text-white/30">
                  {job.progress ?? 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-amber-400/60 transition-all" style={{ width: `${job.progress ?? 0}%` }} />
              </div>
              {job.lastMessage && (
                <div className="text-[11px] font-mono text-white/30 mt-2">{job.lastMessage}</div>
              )}
            </div>
          )}

          {/* Result */}
          {job.status === 'completed' && job.result && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-400/50 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={10} />
                Output
              </div>
              <div className="flex flex-col gap-1">
                {job.result.outputUrls.map((url, i) => (
                  <div key={i} className="px-3 py-2 bg-white/[0.02] rounded-sm text-[12px] font-mono text-white/50 truncate">
                    {url}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {job.status === 'failed' && job.error && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-red-400/50 mb-2 flex items-center gap-1.5">
                <XCircle size={10} />
                Error
              </div>
              <div className="px-3 py-2 bg-red-400/[0.04] border border-red-400/10 rounded-sm text-[12px] font-mono text-red-300/70">
                {job.error.message}
              </div>
            </div>
          )}

          {/* Sources */}
          {job.inputs?.clips && job.inputs.clips.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2 flex items-center gap-1.5">
                <FileVideo size={10} />
                Sources · {job.inputs.clips.length}
              </div>
              <div className="flex flex-col gap-1">
                {job.inputs.clips.map((s, i) => (
                  <div key={i} className="px-3 py-2 bg-white/[0.02] rounded-sm text-[12px] font-mono text-white/50 truncate">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2 flex items-center gap-1.5">
              <MessageSquare size={10} />
              Instructions
            </div>
            <div className="px-3 py-3 bg-white/[0.02] rounded-sm text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap">
              {job.prompt}
            </div>
          </div>

          {/* Meta */}
          <div className="text-[10px] font-mono text-white/20 flex flex-col gap-1">
            <div>Job: {job.jobId}</div>
            <div>Composition: {job.compositionId}</div>
            <div>Kind: {job.kind}</div>
            <div>Created {new Date(job.createdAt).toLocaleString()}</div>
            {job.heartbeatAt && <div>Last heartbeat {new Date(job.heartbeatAt).toLocaleString()}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-400/70 shrink-0" />;
    case 'running':
      return <Loader2 size={14} className="text-amber-400/70 shrink-0 animate-spin" />;
    case 'failed':
      return <XCircle size={14} className="text-red-400/70 shrink-0" />;
    default:
      return <Clock size={14} className="text-white/25 shrink-0" />;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-400/70';
    case 'running': return 'text-amber-400/70';
    case 'failed': return 'text-red-400/60';
    default: return 'text-white/30';
  }
}
