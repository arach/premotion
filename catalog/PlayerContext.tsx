'use client';

import { useCallback, useMemo, type ReactNode } from 'react';
import {
  PlayerProvider as HudsonPlayerProvider,
  PlayerWidget as HudsonPlayerWidget,
  usePlayer as useHudsonPlayer,
  type MediaItem,
  type PlayMediaOpts as HudsonPlayMediaOpts,
} from 'hudsonkit/player';
import type { AudioAsset, Video } from '@/lib/types';
import { resolveVideoSrc } from '@/lib/media';
import { useCatalog } from './Provider';
import { CatalogQueueList } from './slots/CatalogQueueList';

// ---------------------------------------------------------------------------
// Premotion-shape Media — a discriminated union so callers can pattern-match
// on `media.asset.songTitle` / `media.video.id` directly. Maps to hudsonkit's
// flat MediaItem<AudioAsset | Video> at the boundary.
// ---------------------------------------------------------------------------

export type Media =
  | { kind: 'audio'; asset: AudioAsset }
  | { kind: 'video'; video: Video; src: string };

export type HistoryItem =
  | { kind: 'audio'; asset: AudioAsset }
  | { kind: 'video'; id: string; title: string };

export interface PlayMediaOpts {
  queue?: Media[];
  index?: number;
  autoplay?: boolean;
}

type PremotionMeta = AudioAsset | Video;

function toMediaItem(m: Media): MediaItem<PremotionMeta> {
  if (m.kind === 'audio') {
    return {
      kind: 'audio',
      id: m.asset.id,
      src: `/${m.asset.path}`,
      title: m.asset.songTitle || m.asset.id,
      artist: m.asset.app || 'Premotion',
      duration: m.asset.duration,
      artwork: [{ src: '/brand/premotion-logo.svg', sizes: 'any', type: 'image/svg+xml' }],
      meta: m.asset,
    };
  }
  const frame = m.video.storyboardDir && m.video.frames?.[0] ? m.video.frames[0] : null;
  const ext = frame?.split('.').pop()?.toLowerCase();
  return {
    kind: 'video',
    id: m.video.id,
    src: m.src,
    title: m.video.id,
    artist: m.video.app || 'Premotion',
    duration: m.video.duration,
    artwork: frame && m.video.storyboardDir
      ? [{
          src: `/demos/${m.video.storyboardDir}/${frame}`,
          sizes: '512x512',
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
        }]
      : [{ src: '/brand/premotion-logo.svg', sizes: 'any', type: 'image/svg+xml' }],
    meta: m.video,
  };
}

function fromMediaItem(item: MediaItem<PremotionMeta> | null): Media | null {
  if (!item || !item.meta) return null;
  if (item.kind === 'audio') return { kind: 'audio', asset: item.meta as AudioAsset };
  return { kind: 'video', video: item.meta as Video, src: item.src };
}

function toHudsonOpts(opts?: PlayMediaOpts): HudsonPlayMediaOpts | undefined {
  if (!opts) return undefined;
  return {
    queue: opts.queue?.map(toMediaItem),
    index: opts.index,
    autoplay: opts.autoplay,
  };
}

// ---------------------------------------------------------------------------
// Provider — wraps hudsonkit's PlayerProvider with the premotion-specific
// catalog wiring: queue rehydration via catalog data + key-capture deferral
// when ReviewPlayer's modal owns input.
// ---------------------------------------------------------------------------

function PlayerProviderInner({ children }: { children: ReactNode }) {
  const { data, reviewOpen } = useCatalog();

  const resolveItem = useCallback((kind: 'audio' | 'video', id: string): MediaItem<PremotionMeta> | null => {
    if (kind === 'audio') {
      const asset = data?.audioAssets?.find(a => a.id === id);
      return asset ? toMediaItem({ kind: 'audio', asset }) : null;
    }
    const video = data?.videos.find(v => v.id === id);
    if (!video) return null;
    const src = resolveVideoSrc(video);
    return src ? toMediaItem({ kind: 'video', video, src }) : null;
  }, [data]);

  // ReviewPlayer's modal owns input when open. shouldCaptureKeys reads from
  // the reviewOpen ref captured by closure on each render.
  const shouldCaptureKeys = useCallback(() => !reviewOpen, [reviewOpen]);

  return (
    <HudsonPlayerProvider
      appName="Premotion"
      persistenceKey="premotion:player"
      resolveItem={resolveItem}
      shouldCaptureKeys={shouldCaptureKeys}
    >
      {children}
      <HudsonPlayerWidget heightKey="premotion.playerH">
        <CatalogQueueList />
      </HudsonPlayerWidget>
    </HudsonPlayerProvider>
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  return <PlayerProviderInner>{children}</PlayerProviderInner>;
}

// ---------------------------------------------------------------------------
// usePlayer — re-exports hudsonkit's state plus premotion-shape conveniences:
// Media discriminated union, `track` audio shortcut, playTrack/playVideo.
// ---------------------------------------------------------------------------

export function usePlayer() {
  const hudson = useHudsonPlayer();

  const media = useMemo<Media | null>(
    () => fromMediaItem(hudson.media as MediaItem<PremotionMeta> | null),
    [hudson.media],
  );
  const track: AudioAsset | null = media?.kind === 'audio' ? media.asset : null;

  const playMedia = useCallback((m: Media, opts?: PlayMediaOpts) => {
    hudson.playMedia(toMediaItem(m), toHudsonOpts(opts));
  }, [hudson]);

  const playTrack = useCallback((asset: AudioAsset, opts?: PlayMediaOpts) => {
    playMedia({ kind: 'audio', asset }, opts);
  }, [playMedia]);

  const playVideo = useCallback((video: Video, opts?: PlayMediaOpts) => {
    const src = resolveVideoSrc(video);
    if (!src) return;
    playMedia({ kind: 'video', video, src }, opts);
  }, [playMedia]);

  const insertNext = useCallback((m: Media) => hudson.insertNext(toMediaItem(m)), [hudson]);
  const addToQueue = useCallback((m: Media) => hudson.addToQueue(toMediaItem(m)), [hudson]);
  const loadMedia = useCallback((m: Media) => hudson.loadMedia(toMediaItem(m)), [hudson]);

  // History items in premotion shape. Audio entries need the full AudioAsset
  // for downstream UI (volume, songTitle, etc.) — look it up in catalog data.
  const { data: catalogData } = useCatalog();
  const history = useMemo<HistoryItem[]>(
    () => hudson.history.flatMap<HistoryItem>(h => {
      if (h.kind === 'audio') {
        const asset = catalogData?.audioAssets?.find(a => a.id === h.id);
        return asset ? [{ kind: 'audio', asset }] : [];
      }
      return [{ kind: 'video', id: h.id, title: h.title }];
    }),
    [hudson.history, catalogData],
  );

  const queue = useMemo<Media[]>(
    () => (hudson.queue as MediaItem<PremotionMeta>[]).map(it => fromMediaItem(it)!).filter(Boolean),
    [hudson.queue],
  );

  return {
    ...hudson,
    media,
    track,
    history,
    queue,
    playMedia,
    playTrack,
    playVideo,
    insertNext,
    addToQueue,
    loadMedia,
  };
}

// Convenient logVideo wrapper preserved for the existing call site in
// PlayerWidget.tsx. The hudsonkit equivalent is logHistory.
export type { MediaItem } from 'hudsonkit/player';
