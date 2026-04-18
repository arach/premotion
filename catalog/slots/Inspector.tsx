'use client';

import { useCatalog } from '../Provider';
import { formatDuration, formatTime } from '@/lib/types';

export function CatalogInspector() {
  const { selectedVideo, filter, counts, filteredVideos } = useCatalog();

  if (!selectedVideo) {
    return (
      <div className="flex flex-col h-full p-4 text-[11px] font-mono text-white/30">
        <div className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-2">
          Overview
        </div>
        <Row label="Filter" value={filter} />
        <Row label="Showing" value={`${filteredVideos.length} / ${counts.total}`} />
        <div className="mt-4 text-[9px] uppercase tracking-[0.15em] text-white/25 mb-2">
          Health
        </div>
        <Row
          label="Analysis"
          value={`${Math.round((counts.analyzed / Math.max(counts.total, 1)) * 100)}%`}
        />
        <Row
          label="Transcribed"
          value={`${Math.round((counts.transcribed / Math.max(counts.total, 1)) * 100)}%`}
        />
        <Row
          label="Reel Ready"
          value={`${Math.round((counts.reel / Math.max(counts.total, 1)) * 100)}%`}
        />
      </div>
    );
  }

  const v = selectedVideo;
  return (
    <div className="flex flex-col h-full overflow-y-auto frame-scrollbar p-4 text-[11px]">
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
        Video
      </div>
      <Row label="App" value={v.app} />
      <Row label="Duration" value={formatDuration(v.duration)} />
      <Row label="Resolution" value={v.resolution} />
      <Row label="FPS" value={`${v.fps}`} />
      <Row label="Size" value={`${v.sizeMB.toFixed(1)} MB`} />
      <Row label="Codec" value={v.codec} />
      <Row label="Captured" value={v.capturedAt?.slice(0, 10) ?? '—'} />

      <div className="mt-4 text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
        Status
      </div>
      <Row label="Analysis" value={v.analysisStatus.replace('-', ' ')} />
      <Row
        label="Frames"
        value={v.frameCount != null ? `${v.frameCount}` : '—'}
      />
      <Row label="Reel" value={v.reelCandidate ? '✓' : '—'} />

      {v.tags?.length > 0 && (
        <>
          <div className="mt-4 text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {v.tags.map(t => (
              <span
                key={t}
                className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded-sm bg-white/[0.03]"
              >
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {v.transcript && v.transcript.segments.length > 0 && (
        <>
          <div className="mt-4 text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
            Transcript · {v.transcript.segments.length}
          </div>
          <div className="flex flex-col gap-1">
            {v.transcript.segments.slice(0, 6).map(seg => (
              <div key={seg.id} className="flex items-baseline gap-2 text-[10px]">
                <span className="font-mono text-white/25 tabular-nums w-10 shrink-0">
                  {formatTime(seg.start)}
                </span>
                <span className="text-white/50 leading-snug">{seg.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">
        {label}
      </span>
      <span className="text-[11px] text-white/70 font-mono truncate ml-2">
        {value}
      </span>
    </div>
  );
}
