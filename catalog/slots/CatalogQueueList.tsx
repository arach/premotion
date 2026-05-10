'use client';

import { useEffect, useRef } from 'react';
import { Film, Music2 } from 'lucide-react';
import { usePlayer, type Media } from '../PlayerContext';
import { useCatalog } from '../Provider';
import { formatDuration } from '@/lib/types';
import { resolveVideoSrc } from '@/lib/media';

const ACCENT = 'var(--hud-accent)';

/**
 * The queue list rendered inside the hudsonkit PlayerWidget for premotion.
 * Shows "Recently played" history (if any) or falls back to the full music
 * library. Clicking a row seeds the player queue with the visible list so
 * next/prev cycle through it.
 */
export function CatalogQueueList() {
  const { media, history, playMedia, logHistory } = usePlayer();
  const { data, videoId } = useCatalog();

  // When the URL points at a video, log a history entry so the player picks
  // it up even if the user navigated via the catalog grid rather than the
  // player itself.
  const prevVideoId = useRef<string | null>(null);
  useEffect(() => {
    if (videoId && videoId !== prevVideoId.current) {
      const video = data?.videos.find(v => v.id === videoId);
      if (video) logHistory({ kind: 'video', id: videoId, title: video.id });
    }
    prevVideoId.current = videoId;
  }, [videoId, data, logHistory]);

  const audioAssets = data?.audioAssets ?? [];
  const hasHistory = history.length > 0;
  const playable: Media[] = hasHistory
    ? history.flatMap<Media>(h => {
        if (h.kind === 'audio') {
          // The adapter materializes the AudioAsset onto each audio history
          // item (looking it up from current media or synthesizing). Trust it.
          return [{ kind: 'audio', asset: h.asset }];
        }
        const v = data?.videos.find(x => x.id === h.id);
        if (!v) return [];
        const src = resolveVideoSrc(v);
        return src ? [{ kind: 'video', video: v, src }] : [];
      })
    : audioAssets.map(a => ({ kind: 'audio', asset: a }));

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-3 pt-2 pb-1">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
          {hasHistory ? 'Recently played' : 'Music library'}
        </span>
      </div>
      {playable.map((item, i) => {
        if (item.kind === 'audio') {
          const isActive = media?.kind === 'audio' && media.asset.id === item.asset.id;
          return (
            <button
              key={item.asset.id + i}
              onClick={() => playMedia(item, { queue: playable, index: i })}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              style={{ color: isActive ? ACCENT : undefined }}
            >
              <Music2 size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
              <span className={`flex-1 text-[11px] truncate ${isActive ? '' : 'text-foreground/55'}`}>
                {item.asset.songTitle || item.asset.id}
              </span>
              {item.asset.duration > 0 && (
                <span className="text-[10px] font-mono tabular-nums shrink-0 text-muted-foreground/50">
                  {formatDuration(item.asset.duration)}
                </span>
              )}
            </button>
          );
        }
        const isActive = media?.kind === 'video' && media.video.id === item.video.id;
        return (
          <button
            key={item.video.id + i}
            onClick={() => playMedia(item, { queue: playable, index: i })}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
            style={{ color: isActive ? ACCENT : undefined }}
          >
            <Film size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className={`flex-1 text-[11px] truncate ${isActive ? '' : 'text-foreground/45'}`}>
              {item.video.id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
