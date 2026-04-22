'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCatalog } from '../Provider';
import { formatDuration } from '@/lib/types';
import type { Video } from '@/lib/types';
import { Eye, FileVideo, Search } from 'lucide-react';

type AssetFilter = 'all' | 'analyzed' | 'needs-analysis';

const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv'];

export function AssetsView() {
  const { data, openVideo, deleteVideo, sort, setSort, search, setSearch } = useCatalog();
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');

  const sourceVideos = useMemo(() => {
    const vids = (data?.videos ?? []).filter(v => v.stage === 'source' || !v.stage);

    let filtered = vids;
    if (assetFilter === 'analyzed') {
      filtered = vids.filter(v => v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed');
    } else if (assetFilter === 'needs-analysis') {
      filtered = vids.filter(v => !v.analysisStatus || v.analysisStatus === 'none' || v.analysisStatus === 'frames-only');
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(v =>
        v.id.toLowerCase().includes(q) ||
        v.filename?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.app?.toLowerCase().includes(q) ||
        v.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered];
    switch (sort) {
      case 'oldest': sorted.sort((a, b) => new Date(a.capturedAt ?? 0).getTime() - new Date(b.capturedAt ?? 0).getTime()); break;
      case 'longest': sorted.sort((a, b) => b.duration - a.duration); break;
      case 'shortest': sorted.sort((a, b) => a.duration - b.duration); break;
      case 'largest': sorted.sort((a, b) => b.sizeMB - a.sizeMB); break;
      case 'smallest': sorted.sort((a, b) => a.sizeMB - b.sizeMB); break;
      case 'name': sorted.sort((a, b) => a.id.localeCompare(b.id)); break;
      default: sorted.sort((a, b) => new Date(b.capturedAt ?? 0).getTime() - new Date(a.capturedAt ?? 0).getTime()); break;
    }
    return sorted;
  }, [data, assetFilter, search, sort]);

  const allSource = useMemo(() => (data?.videos ?? []).filter(v => v.stage === 'source' || !v.stage), [data]);
  const analyzedCount = useMemo(() => allSource.filter(v => v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed').length, [allSource]);
  const needsCount = useMemo(() => allSource.length - analyzedCount, [allSource, analyzedCount]);

  const analyzed = sourceVideos.filter(v => v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed');
  const unanalyzed = sourceVideos.filter(v => !v.analysisStatus || v.analysisStatus === 'none' || v.analysisStatus === 'frames-only');

  return (
    <div className="px-6 py-5">
      {/* Stats */}
      <div className="flex items-center gap-6 pb-5 mb-5 border-b border-white/[0.04]">
        <Stat label="Assets" value={allSource.length} />
        <Stat label="Analyzed" value={analyzedCount} />
        <Stat label="Needs Analysis" value={needsCount} />
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-sm p-0.5">
          <FilterPill label="All" count={allSource.length} active={assetFilter === 'all'} onClick={() => setAssetFilter('all')} />
          <FilterPill label="Analyzed" count={analyzedCount} active={assetFilter === 'analyzed'} onClick={() => setAssetFilter('analyzed')} />
          <FilterPill label="Needs Analysis" count={needsCount} active={assetFilter === 'needs-analysis'} onClick={() => setAssetFilter('needs-analysis')} />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25">Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-white/60 outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="longest">Longest</option>
            <option value="shortest">Shortest</option>
            <option value="largest">Largest</option>
            <option value="smallest">Smallest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <DropZone />

      {/* Asset grid */}
      {sourceVideos.length === 0 ? (
        <div className="py-16 text-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
          No assets match the current filter
        </div>
      ) : assetFilter === 'all' ? (
        <>
          {analyzed.length > 0 && (
            <Bucket label={`${analyzed.length} analyzed`}>
              {analyzed.map(v => <AssetCard key={v.id} video={v} onOpen={openVideo} onDelete={deleteVideo} />)}
            </Bucket>
          )}
          {unanalyzed.length > 0 && (
            <Bucket label={`${unanalyzed.length} needs analysis`} dim>
              {unanalyzed.map(v => <AssetCard key={v.id} video={v} onOpen={openVideo} onDelete={deleteVideo} dim />)}
            </Bucket>
          )}
        </>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {sourceVideos.map(v => <AssetCard key={v.id} video={v} onOpen={openVideo} onDelete={deleteVideo} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[22px] font-mono tabular-nums text-white/80">{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mt-0.5">{label}</span>
    </div>
  );
}

function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-sm text-[10px] font-mono transition-colors ${
        active
          ? 'bg-white/[0.08] text-white/80'
          : 'text-white/35 hover:text-white/55 hover:bg-white/[0.03]'
      }`}
    >
      {label} <span className={active ? 'text-white/50' : 'text-white/20'}>{count}</span>
    </button>
  );
}

function Bucket({ label, children, dim }: { label: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <>
      <div className={`text-[10px] font-mono uppercase tracking-[0.15em] ${dim ? 'text-white/20' : 'text-white/35'} mb-2 mt-6 first:mt-0`}>
        {label}
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {children}
      </div>
    </>
  );
}

function AssetCard({ video, onOpen, onDelete, dim }: { video: Video; onOpen: (id: string) => void; onDelete: (id: string) => Promise<void>; dim?: boolean }) {
  const isAnalyzed = video.analysisStatus === 'complete' || video.analysisStatus === 'analyzed';
  const statusColor = isAnalyzed ? 'bg-emerald-400/60' : video.analysisStatus === 'frames-only' ? 'bg-amber-400/50' : 'bg-white/10';
  const statusLabel = isAnalyzed ? 'Analyzed' : video.analysisStatus === 'frames-only' ? 'Partial' : 'Unanalyzed';

  return (
    <div
      className={`group relative flex flex-col text-left p-3 rounded-sm border border-white/[0.04] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.035] transition-colors cursor-pointer ${dim ? 'opacity-60' : ''}`}
      onClick={() => onOpen(video.id)}
    >
      <button
        onClick={e => { e.stopPropagation(); onDelete(video.id); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-[11px] p-1"
        title="Delete asset"
      >
        x
      </button>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {video.app && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60">{video.app}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono uppercase tracking-wider ${isAnalyzed ? 'text-emerald-400/60' : 'text-white/25'}`}>
            {statusLabel}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        </div>
      </div>

      <div className="text-[12px] text-white/80 group-hover:text-white transition-colors truncate">{video.id}</div>
      {video.description && <div className="text-[11px] text-white/40 mt-1 line-clamp-2">{video.description}</div>}

      <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-white/30">
        <span>{formatDuration(video.duration)}</span>
        <span>{video.resolution}</span>
        <span>{video.sizeMB.toFixed(1)} MB</span>
        {video.frameCount != null && video.frameCount > 0 && <span>{video.frameCount} frames</span>}
        {video.scenes?.length > 0 && <span>{video.scenes.length} scenes</span>}
      </div>

      {video.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {video.tags.slice(0, 4).map(t => (
            <span key={t} className="text-[9px] font-mono text-white/30 px-1.5 py-0.5 rounded-sm bg-white/[0.03]">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DropZone() {
  const [over, setOver] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; status: 'pending' | 'done' | 'error'; msg?: string }[]>([]);

  const ingest = useCallback(async (files: FileList) => {
    const valid = Array.from(files).filter(f =>
      VIDEO_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    if (!valid.length) return;

    const entries = valid.map(f => ({ name: f.name, status: 'pending' as const }));
    setUploads(prev => [...prev, ...entries]);

    for (const file of valid) {
      try {
        const filePath = (file as any).path as string | undefined;
        let res: Response;
        if (filePath) {
          res = await fetch('/api/catalog/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath }),
          });
        } else {
          const form = new FormData();
          form.append('file', file);
          res = await fetch('/api/catalog/ingest', { method: 'POST', body: form });
        }
        const data = await res.json();
        setUploads(prev =>
          prev.map(u => u.name === file.name ? { name: file.name, status: res.ok ? 'done' : 'error', msg: data.error } : u)
        );
      } catch (err: any) {
        setUploads(prev =>
          prev.map(u => u.name === file.name ? { name: file.name, status: 'error', msg: err.message } : u)
        );
      }
    }
  }, []);

  return (
    <div className="mb-4">
      <div
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); ingest(e.dataTransfer.files); }}
        className={`border border-dashed rounded-sm px-4 py-3 text-center transition-colors cursor-default ${
          over
            ? 'border-cyan-400/40 bg-cyan-400/[0.04] text-cyan-300/60'
            : 'border-white/[0.08] text-white/20 hover:border-white/[0.15] hover:text-white/30'
        }`}
      >
        <span className="text-[11px] font-mono">Drop videos here to ingest</span>
      </div>
      {uploads.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {uploads.map(u => (
            <div key={u.name} className="flex items-center gap-2 text-[10px] font-mono">
              <span className={u.status === 'done' ? 'text-emerald-400/70' : u.status === 'error' ? 'text-red-400/70' : 'text-white/30 animate-pulse'}>
                {u.status === 'done' ? '✓' : u.status === 'error' ? '✗' : '…'}
              </span>
              <span className="text-white/50 truncate">{u.name}</span>
              {u.msg && <span className="text-red-400/50">{u.msg}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
