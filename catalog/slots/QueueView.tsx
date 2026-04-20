'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle2, Loader2, FileVideo, MessageSquare, Play, Zap } from 'lucide-react';
import { useCatalog } from '../Provider';

interface QueueJob {
  id: string;
  name: string;
  sources: string[];
  prompt: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  createdAt: string;
}

export function QueueView() {
  const { setView } = useCatalog();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueJob | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/queue')
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startProcessing = useCallback(async (job: QueueJob) => {
    try {
      const res = await fetch('/api/queue/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id }),
      });
      if (res.ok) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' } : j));
        if (selected?.id === job.id) setSelected({ ...job, status: 'processing' });
      }
    } catch (err) {
      console.error('Failed to start processing:', err);
    }
  }, [selected]);

  if (selected) {
    return (
      <JobDetail
        job={selected}
        onBack={() => setSelected(null)}
        onProcess={() => startProcessing(selected)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 py-5 border-b border-white/[0.04]">
        <h1 className="text-[16px] font-medium text-white/90">Queue</h1>
        <p className="text-[11px] text-white/30 font-mono mt-1">
          {jobs.length} project{jobs.length !== 1 ? 's' : ''} queued
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        {loading && (
          <div className="flex items-center justify-center h-32 text-white/20 text-[11px] font-mono uppercase tracking-wider">
            Loading…
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="px-6 py-12">
            <div className="text-white/15 text-[12px] font-mono mb-3">No projects queued</div>
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
                key={job.id}
                className="flex items-center gap-3 px-4 py-3 rounded-sm bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <button onClick={() => setSelected(job)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <StatusIcon status={job.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white/70 truncate">{job.name}</div>
                    <div className="text-[10px] font-mono text-white/25 mt-0.5 truncate">
                      {job.sources.length} source{job.sources.length !== 1 ? 's' : ''} · {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
                {job.status === 'queued' && (
                  <button
                    onClick={() => startProcessing(job)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-emerald-400/[0.08] border border-emerald-400/20 text-emerald-300/90 hover:bg-emerald-400/[0.12] hover:text-emerald-200 transition-all text-[9px] font-mono uppercase tracking-wider"
                  >
                    <Play size={10} />
                    Process
                  </button>
                )}
                {job.status === 'processing' && (
                  <span className="shrink-0 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-amber-400/70">
                    <Loader2 size={10} className="animate-spin" />
                    Running
                  </span>
                )}
                {job.status === 'done' && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-emerald-400/60">
                    Done
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

function JobDetail({ job, onBack, onProcess }: { job: QueueJob; onBack: () => void; onProcess: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-[14px] font-medium text-white/90 flex-1">{job.name}</h1>
        <span className={`text-[9px] font-mono uppercase tracking-wider ${statusColor(job.status)}`}>
          {job.status}
        </span>
        {job.status === 'queued' && (
          <button
            onClick={onProcess}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-400/[0.08] border border-emerald-400/20 text-emerald-300/90 hover:bg-emerald-400/[0.12] hover:text-emerald-200 transition-all text-[10px] font-mono uppercase tracking-wider"
          >
            <Zap size={11} />
            Process
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        <div className="px-6 py-8 flex flex-col gap-6">
          {/* Sources */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2 flex items-center gap-1.5">
              <FileVideo size={10} />
              Sources · {job.sources.length}
            </div>
            <div className="flex flex-col gap-1">
              {job.sources.map((s, i) => (
                <div key={i} className="px-3 py-2 bg-white/[0.02] rounded-sm text-[12px] font-mono text-white/50 truncate">
                  {s}
                </div>
              ))}
            </div>
          </div>

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
          <div className="text-[10px] font-mono text-white/20">
            Created {new Date(job.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={14} className="text-emerald-400/70 shrink-0" />;
    case 'processing':
      return <Loader2 size={14} className="text-amber-400/70 shrink-0 animate-spin" />;
    case 'failed':
      return <Clock size={14} className="text-red-400/70 shrink-0" />;
    default:
      return <Clock size={14} className="text-white/25 shrink-0" />;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'done': return 'text-emerald-400/70';
    case 'processing': return 'text-amber-400/70';
    case 'failed': return 'text-red-400/60';
    default: return 'text-white/30';
  }
}
