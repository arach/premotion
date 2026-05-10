'use client';

import { useState } from 'react';
import { CornerDownRight, ListPlus } from 'lucide-react';
import { useCatalog } from '../Provider';
import { usePlayer } from '../PlayerContext';
import { formatDuration } from '@/lib/types';
import { resolveVideoSrc } from '@/lib/media';
import type { CuratedSnippet, Video } from '@/lib/types';

export function CatalogGrid() {
  const {
    filter,
    filteredVideos,
    filteredSnippets,
    snippetCategory,
    setSnippetCategory,
    snippetCategoryCounts,
    snippets,
    counts,
    openVideo,
    sort,
    setSort,
    deleteVideo,
    setView,
  } = useCatalog();

  const isCurated = filter === 'curated';

  return (
    <div className="px-6 py-5">
      <StatsRow counts={counts} onNew={() => setView('new')} />

      {!isCurated && (
        <div className="flex items-center gap-2 mb-4">
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
      )}

      {isCurated ? (
        <CuratedSection
          snippets={filteredSnippets}
          allSnippets={snippets}
          categoryFilter={snippetCategory}
          onCategoryFilter={setSnippetCategory}
          categoryCounts={snippetCategoryCounts}
        />
      ) : (
        <VideoGrid videos={filteredVideos} onOpen={openVideo} onDelete={deleteVideo} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------
function StatsRow({
  counts,
  onNew,
}: {
  counts: {
    total: number;
    source: number;
    wip: number;
    final: number;
    analyzed: number;
    transcribed: number;
    reel: number;
    curated: number;
  };
  onNew: () => void;
}) {
  const items = [
    { label: 'Videos', value: counts.final },
    { label: 'Curated', value: counts.curated },
  ];
  return (
    <div className="flex items-center gap-6 pb-5 mb-5 border-b border-white/[0.04]">
      {items.map(i => (
        <div key={i.label} className="flex flex-col">
          <span className="text-[22px] font-mono tabular-nums text-white/80">
            {i.value}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mt-0.5">
            {i.label}
          </span>
        </div>
      ))}
      <div className="flex-1" />
      <button
        onClick={onNew}
        className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-cyan-400/[0.08] border border-cyan-400/20 text-cyan-300/90 hover:bg-cyan-400/[0.12] hover:text-cyan-200 transition-all text-[11px] font-mono uppercase tracking-wider"
      >
        + New
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video grid with indexed/unprocessed buckets
// ---------------------------------------------------------------------------
function VideoGrid({
  videos,
  onOpen,
  onDelete,
}: {
  videos: Video[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const finals = videos.filter(v => v.stage === 'final');

  if (finals.length === 0) {
    return (
      <div className="py-16 text-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
        No finished videos yet
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
      {finals.map(v => (
        <VideoCard key={v.id} video={v} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}


function VideoCard({
  video,
  onOpen,
  onDelete,
}: {
  video: Video;
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const statusColor =
    video.analysisStatus === 'complete' || video.analysisStatus === 'analyzed'
      ? 'bg-emerald-400/60'
      : video.analysisStatus === 'frames-only'
        ? 'bg-amber-400/50'
        : 'bg-white/10';
  const previewSrc = resolveVideoSrc(video);
  const [previewError, setPreviewError] = useState(false);
  const { insertNext, addToQueue } = usePlayer();
  const asMedia = previewSrc ? { kind: 'video' as const, video, src: previewSrc } : null;
  const setPreviewFrame = (el: HTMLVideoElement) => {
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const frameTime = Math.min(
      Math.max(el.duration * 0.2, 1),
      8,
      Math.max(0, el.duration - 0.5),
    );
    if (Math.abs(el.currentTime - frameTime) > 0.05) {
      el.currentTime = frameTime;
    }
  };

  return (
    <div
      className="group relative flex flex-col text-left p-3 rounded-sm border border-white/[0.04] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.035] transition-colors cursor-pointer"
      onClick={() => onOpen(video.id)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        {asMedia && (
          <>
            <button
              onClick={e => { e.stopPropagation(); insertNext(asMedia); }}
              className="p-1 rounded text-white/25 hover:text-cyan-300 hover:bg-white/[0.05] transition-colors"
              title="Play next"
            >
              <CornerDownRight size={12} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); addToQueue(asMedia); }}
              className="p-1 rounded text-white/25 hover:text-cyan-300 hover:bg-white/[0.05] transition-colors"
              title="Add to queue"
            >
              <ListPlus size={12} />
            </button>
          </>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(video.id); }}
          className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-white/[0.05] transition-colors text-[11px]"
          title="Delete video"
        >
          x
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60">
            {video.app}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {video.reelCandidate && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70">
              Reel
            </span>
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        </div>
      </div>

      <div className="relative mb-3 aspect-video overflow-hidden rounded-sm bg-black border border-white/[0.05]">
        {previewSrc && !previewError ? (
          <video
            src={previewSrc}
            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity duration-200 group-hover:opacity-100"
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={e => setPreviewFrame(e.currentTarget)}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.play().catch(() => undefined);
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.pause();
              setPreviewFrame(el);
            }}
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-white/25">
            Preview unavailable
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/65 to-transparent" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-black/65 px-1.5 py-0.5 text-[9px] font-mono text-white/55">
          {formatDuration(video.duration)}
        </span>
      </div>

      <div className="text-[12px] text-white/80 group-hover:text-white transition-colors truncate">
        {video.id}
      </div>
      {video.description && (
        <div className="text-[11px] text-white/40 mt-1 line-clamp-2">
          {video.description}
        </div>
      )}
      <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-white/30">
        <span>{formatDuration(video.duration)}</span>
        <span>{video.resolution}</span>
        <span>{video.sizeMB.toFixed(1)} MB</span>
        {video.frameCount != null && video.frameCount > 0 && (
          <span>{video.frameCount} frames</span>
        )}
      </div>
      {video.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {video.tags.slice(0, 4).map(t => (
            <span
              key={t}
              className="text-[9px] font-mono text-white/30 px-1.5 py-0.5 rounded-sm bg-white/[0.03]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Curated snippets section
// ---------------------------------------------------------------------------
function CuratedSection({
  snippets,
  allSnippets,
  categoryFilter,
  onCategoryFilter,
  categoryCounts,
}: {
  snippets: CuratedSnippet[];
  allSnippets: CuratedSnippet[];
  categoryFilter: string;
  onCategoryFilter: (c: string) => void;
  categoryCounts: Record<string, number>;
}) {
  const categories = ['all', 'capture', 'read', 'listen', 'explore'];
  const fiveStarCount = allSnippets.filter(s => s.rating === 5).length;
  const fourStarCount = allSnippets.filter(s => s.rating === 4).length;

  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[14px] text-white/80 font-medium">
            Curated Snippets
          </div>
          <div className="text-[11px] text-white/35 mt-0.5">
            Best moments — {fiveStarCount} top-rated · {fourStarCount} strong ·{' '}
            {allSnippets.length} total
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => onCategoryFilter(c)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-colors ${
              categoryFilter === c
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20'
                : 'text-white/40 hover:text-white/60 border border-white/[0.04] hover:border-white/[0.08]'
            }`}
          >
            {c}
            <span className="ml-1.5 text-white/30 tabular-nums">
              {c === 'all' ? allSnippets.length : (categoryCounts[c] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {snippets.length === 0 ? (
        <div className="py-16 text-center text-white/20 text-[12px] font-mono tracking-wider uppercase">
          No snippets match the current filter
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {snippets.map(s => (
            <SnippetCard key={s.id} snippet={s} />
          ))}
        </div>
      )}
    </>
  );
}

function SnippetCard({ snippet }: { snippet: CuratedSnippet }) {
  return (
    <div className="flex flex-col p-3 rounded-sm border border-white/[0.04] bg-white/[0.015]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60">
          {snippet.category}
        </span>
        <span className="text-[10px] font-mono text-amber-400/70 tabular-nums">
          {'★'.repeat(snippet.rating)}
        </span>
      </div>
      <div className="text-[11px] text-white/60 leading-snug">
        {snippet.description}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-white/30">
        <span>{snippet.source}</span>
        <span className="tabular-nums">
          @{Math.floor(snippet.timestamp)}s
        </span>
      </div>
      {snippet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {snippet.tags.slice(0, 3).map(t => (
            <span
              key={t}
              className="text-[9px] font-mono text-white/30 px-1.5 py-0.5 rounded-sm bg-white/[0.03]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
