'use client';

import { ArrowLeft, Film, MessageSquarePlus } from 'lucide-react';
import { useCatalog } from '../Provider';
import { formatDuration, formatTime } from '@/lib/types';
import type { Video } from '@/lib/types';

export function VideoDetail({ video }: { video: Video }) {
  const { closeVideo, openFrame, openReview } = useCatalog();
  const hasFrames =
    !!video.frameCount &&
    video.frameCount > 0 &&
    !!video.frames &&
    video.frames.length > 0;
  const reviewable = !!video.videoUrl || video.stage === 'wip';

  return (
    <div className="px-6 py-5 max-w-4xl">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={closeVideo}
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to catalog
        </button>
        {hasFrames && (
          <button
            onClick={() => openFrame(0)}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-300/70 hover:text-cyan-200 bg-cyan-400/[0.06] hover:bg-cyan-400/10 border border-cyan-400/15 px-2 py-1 rounded-sm transition-colors"
          >
            <Film size={12} />
            View frames
          </button>
        )}
        {reviewable && (
          <button
            onClick={openReview}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-300/80 hover:text-emerald-200 bg-emerald-400/[0.06] hover:bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-sm transition-colors"
          >
            <MessageSquarePlus size={12} />
            Review
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h1 className="text-[20px] font-medium text-white/90 truncate">
          {video.id}
        </h1>
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 shrink-0">
          {video.app}
        </span>
      </div>

      {video.description && (
        <p className="text-[13px] text-white/50 leading-relaxed mb-5">
          {video.description}
        </p>
      )}

      <div className="grid grid-cols-4 gap-4 pb-5 mb-5 border-b border-white/[0.04]">
        <Meta label="Duration" value={formatDuration(video.duration)} />
        <Meta label="Resolution" value={video.resolution} />
        <Meta label="FPS" value={`${video.fps}`} />
        <Meta label="Size" value={`${video.sizeMB.toFixed(1)} MB`} />
        <Meta
          label="Status"
          value={video.analysisStatus.replace('-', ' ')}
          emphasis={
            video.analysisStatus === 'complete' ||
            video.analysisStatus === 'analyzed'
              ? 'good'
              : video.analysisStatus === 'none'
                ? 'bad'
                : 'neutral'
          }
        />
        <Meta
          label="Frames"
          value={video.frameCount ? `${video.frameCount}` : '—'}
        />
        <Meta label="Codec" value={video.codec} />
        {video.reelCandidate && <Meta label="Reel" value="✓" emphasis="good" />}
      </div>

      {video.tags?.length > 0 && (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {video.tags.map(t => (
              <span
                key={t}
                className="text-[10px] font-mono text-white/50 px-2 py-0.5 rounded-sm bg-white/[0.04] border border-white/[0.04]"
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {video.scenes && video.scenes.length > 0 && (
        <Section label={`Scenes (${video.scenes.length})`}>
          <div className="flex flex-col gap-1.5">
            {video.scenes.map((s, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 text-[12px] py-1.5 px-3 rounded-sm bg-white/[0.015]"
              >
                <span className="text-[10px] font-mono text-white/30 tabular-nums w-20 shrink-0">
                  {formatTime(s.start ?? s.time ?? 0)}
                  {s.end != null && ` → ${formatTime(s.end)}`}
                </span>
                {s.activity && (
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0 ${
                      s.activity === 'active'
                        ? 'text-emerald-300/80 bg-emerald-400/10'
                        : 'text-white/30 bg-white/[0.02]'
                    }`}
                  >
                    {s.activity}
                  </span>
                )}
                <span className="text-white/60">{s.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {video.transcript && video.transcript.segments.length > 0 && (
        <Section label="Transcript">
          <div className="flex flex-col gap-1">
            {video.transcript.segments.map(seg => (
              <div
                key={seg.id}
                className="flex items-baseline gap-3 text-[12px] py-1"
              >
                <span className="text-[10px] font-mono text-white/25 tabular-nums w-14 shrink-0">
                  {formatTime(seg.start)}
                </span>
                <span className="text-white/60">{seg.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {video.frameCount == null && !video.transcript && !video.scenes?.length && (
        <div className="py-8 text-center text-white/20 text-[11px] font-mono uppercase tracking-wider">
          No analysis data yet
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: 'good' | 'bad' | 'neutral';
}) {
  const color =
    emphasis === 'good'
      ? 'text-emerald-300/80'
      : emphasis === 'bad'
        ? 'text-red-300/70'
        : 'text-white/80';
  return (
    <div className="flex flex-col">
      <span className={`text-[13px] ${color} truncate`}>{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mt-0.5">
        {label}
      </span>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
